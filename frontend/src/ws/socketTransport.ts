/**
 * Socket.IO transport adapter for voyager frontend
 * Backend is socket.io Server at path /ws (not raw WebSocket on /ws)
 * Frontend was using native WebSocket to ws://localhost:8000/ws -> now uses socket.io-client
 * Minimal change: keep envelope JSON shape, just map send/recv through socket.io events
 */
import { io, type Socket } from 'socket.io-client'
import { buildWsUrl } from './transport'
import type { Envelope } from './client'
import { wsLogger } from './logger'

export type SocketState = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

export interface SocketTransportOptions {
  url?: string
  onEnvelope?: (env: Envelope, raw: string) => void
  onOpen?: () => void
  onClose?: (reason: string) => void
  onError?: (err: Error) => void
}

function wsUrlToHttpUrl(wsUrl: string): string {
  try {
    const u = new URL(wsUrl)
    if (u.protocol === 'ws:') u.protocol = 'http:'
    else if (u.protocol === 'wss:') u.protocol = 'https:'
    // keep pathname /ws for path, but socket.io path is /ws so we need base URL without path for io()
    // socket.io client path option will handle /ws
    return `${u.protocol}//${u.host}`
  } catch {
    return wsUrl.replace(/^ws/, 'http')
  }
}

function extractPath(wsUrl: string): string {
  try {
    const u = new URL(wsUrl)
    return u.pathname || '/ws'
  } catch {
    return '/ws'
  }
}

export class SocketTransport {
  private socket: Socket | null = null
  private url: string
  private wsPath: string
  private httpBase: string
  private state: SocketState = 'idle'
  private pending: string[] = [] // not used, WsClient handles pendingRetries
  private opts: SocketTransportOptions

  constructor(opts: SocketTransportOptions = {}) {
    this.opts = opts
    const raw = opts.url ? buildWsUrl(opts.url) : buildWsUrl('ws://localhost:8000/ws')
    this.url = raw
    this.httpBase = wsUrlToHttpUrl(raw)
    this.wsPath = extractPath(raw)
  }

  getState(): SocketState { return this.state }
  getUrl(): string { return this.url }
  isConnected(): boolean { return this.state === 'open' && !!this.socket?.connected }

  connect(): Socket {
    if (this.socket && this.socket.connected) return this.socket
    if (this.socket && (this.state === 'connecting')) return this.socket

    this.state = 'connecting'
    const socket = io(this.httpBase, {
      path: this.wsPath,
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: true,
    })

    // Single event-ingress mechanism via onAny to avoid duplicate delivery.
    // Backend emits dynamic envelope event names; onAny handles all including
    // forward-compatible types. Explicit per-event listeners are not registered
    // to prevent duplicate handleRawMessage invocations.
    // If onAny is unavailable, fall back to explicit listeners (mutually exclusive).
    // @ts-ignore
    const hasOnAny = typeof (socket as any).onAny === 'function'
    if (hasOnAny) {
      ;(socket as any).onAny((event: string, ...args: unknown[]) => {
        const data = args[0]
        wsLogger.debug(`onAny ${event}`, data)
        // data is already envelope object from backend socket.emit(event, envelope)
        if (data && typeof data === 'object') {
          try {
            const raw = JSON.stringify(data)
            wsLogger.envelope("↓", data)
            this.opts.onEnvelope?.(data as Envelope, raw)
          } catch {}
        } else if (typeof data === 'string') {
          try {
            const parsed = JSON.parse(data)
            wsLogger.envelope("↓", parsed)
            this.opts.onEnvelope?.(parsed as Envelope, data)
          } catch {}
        }
      })
    } else {
      // Fallback when onAny not available — explicit listeners only
      const knownEvents = [
        'command.accepted', 'command.rejected',
        'session.ready', 'session.expired', 'session.superseded',
        'discovery.question','profile.snapshot','profile.ready',
        'agent.lifecycle','planning.status','decision.request','plan.snapshot','workflow.completed','workflow.state',
        'error'
      ]
      for (const ev of knownEvents) {
        socket.on(ev, (data: unknown) => {
          if (data && typeof data === 'object') {
            try { const raw = JSON.stringify(data); wsLogger.envelope("↓", data); this.opts.onEnvelope?.(data as Envelope, raw) } catch {}
          } else if (typeof data === 'string') {
            try { const parsed = JSON.parse(data); wsLogger.envelope("↓", parsed); this.opts.onEnvelope?.(parsed as Envelope, data) } catch {}
          }
        })
      }
    }

    socket.on('connect', () => {
      this.state = 'open'
      wsLogger.info(`socket connected ${this.url}`)
      this.opts.onOpen?.()
    })
    socket.on('disconnect', (reason: string) => {
      this.state = 'closed'
      wsLogger.warn(`socket disconnected`, reason)
      this.opts.onClose?.(reason)
    })
    socket.on('connect_error', (err: Error) => {
      this.state = 'error'
      wsLogger.error(`connect_error`, err.message)
      this.opts.onError?.(err)
      // socket.io will retry automatically per default
      setTimeout(() => { this.state = 'closed' }, 0)
    })

    this.socket = socket
    return socket
  }

  sendEnvelope(env: Envelope): void {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected — call connect() first')
    }
    wsLogger.envelope("↑", env)
    // Backend handlers listen on socket.on(envelope.type, data) where type is like "session.start"
    // So emit on that channel with envelope as payload
    this.socket.emit(env.type, env)
  }

  disconnect(): void {
    try {
      // Remove listeners to avoid old listeners persisting across reconnects
      if (this.socket) {
        try { this.socket.removeAllListeners() } catch {}
        // @ts-ignore onAny cleanup
        try { (this.socket as any).offAny?.() } catch {}
        this.socket.disconnect()
      }
    } catch {}
    this.socket = null
    this.state = 'closed'
  }
}
