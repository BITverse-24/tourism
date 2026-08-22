/**
 * WsProvider — session lifecycle provider for WEBSOCKET_CONTRACT.md
 *
 * Implements:
 *  - session.start with fresh command_id / message_id / occurred_at via WsProvider
 *  - stored session_id (localStorage) vs null for new session
 *  - session.ready → navigate per workflow_state / has_recovery_state
 *  - session.expired → offer new session (clear + restart)
 *  - session.superseded → close old connection
 *  - workflow_state drives routing (exposed via context)
 *  - SINGLE shared client: all consumers via getSharedWsClient()/WsContext
 *  - wsFailedAtStart tracking: mock fallback only when WS fails at start
 */
import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { WsClient, genCommandId } from './client'
import { createWsClient } from './index'
import { buildWsUrl } from './transport'
import { wsLogger } from './logger'

export const SESSION_STORAGE_KEY = 'voyager_session_id'

function getStoredSessionId(): string | null {
  try {
    const v = typeof window !== 'undefined' ? window.localStorage.getItem(SESSION_STORAGE_KEY) : null
    return v && v.trim().length > 0 ? v : null
  } catch {
    return null
  }
}
function setStoredSessionId(id: string | null) {
  try {
    if (typeof window === 'undefined') return
    if (id) window.localStorage.setItem(SESSION_STORAGE_KEY, id)
    else window.localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch { /* ignore */ }
}

export type WorkflowState = 'discovery' | 'profile_review' | 'planning' | 'decision_required' | 'plan_ready' | 'cancelled' | 'expired' | 'replanning' | string

export function workflowStateToPath(state: WorkflowState): string {
  switch (state) {
    case 'discovery': return '/discovery'
    case 'profile_review': return '/profile-review'
    case 'planning': return '/consultation'
    case 'decision_required': return '/consultation'
    case 'plan_ready': return '/trip-overview'
    case 'cancelled': return '/'
    case 'expired': return '/'
    default: return '/discovery'
  }
}

export interface WsContextValue {
  client: WsClient
  connected: boolean
  wsFailedAtStart: boolean
  allowMock: boolean
  sessionId: string | null
  runId: string | null
  workflowState: WorkflowState | null
  hasRecoveryState: boolean
  isExpired: boolean
  isSuperseded: boolean
  replacementRunId: string | null
  sendSessionStart: (initialIntent?: string | null) => void
  startNewSession: () => void
  disconnect: () => void
}

export const WsContext = createContext<WsContextValue | null>(null)

export function useWs(): WsContextValue {
  const ctx = useContext(WsContext)
  if (!ctx) throw new Error('useWs must be used within WsProvider')
  return ctx
}
export function useWsOptional(): WsContextValue | null {
  return useContext(WsContext)
}

export function resolveWsUrl(): string {
  const env: Record<string, string | undefined> = (import.meta as unknown as { env?: Record<string, string> }).env ?? {}
  const explicit = env.VITE_WS_URL ?? env.WS_URL
  if (explicit) return buildWsUrl(explicit)
  return buildWsUrl('ws://localhost:8000/ws')
}

// Single shared client owned by WsProvider — all consumers import via this module
let sharedClient: WsClient | null = null
export function getSharedWsClient(): WsClient {
  if (!sharedClient) sharedClient = createWsClient({ url: resolveWsUrl() })
  return sharedClient
}

export function WsProvider({ children }: { children: React.ReactNode }) {
  const wsUrl = useMemo(() => resolveWsUrl(), [])
  const clientRef = useRef<WsClient | null>(null)
  if (!clientRef.current) {
    clientRef.current = getSharedWsClient()
  }
  const client = clientRef.current!

  const [connected, setConnected] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(() => getStoredSessionId())
  const [runId, setRunId] = useState<string | null>(null)
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null)
  const [hasRecoveryState, setHasRecoveryState] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const [isSuperseded, setIsSuperseded] = useState(false)
  const [replacementRunId, setReplacementRunId] = useState<string | null>(null)
  const [wsFailedAtStart, setWsFailedAtStart] = useState(false)
  const hasEverConnectedRef = useRef(false)
  const allowMock = wsFailedAtStart && !connected

  // Subscribe to client events
  useEffect(() => {
    const unsub = client.subscribe((env) => {
      const type = (env as unknown as { type: string }).type
      const payload = (env as unknown as { payload: Record<string, unknown> }).payload ?? {}
      wsLogger.envelope("↓", env)
      wsLogger.debug(`WsProvider handling ${type}`, payload)
      if (type === 'session.ready') {
        const sid = payload.session_id as string | undefined
        const rid = payload.run_id as string | undefined
        const wf = payload.workflow_state as string | undefined
        const hasRecovery = payload.has_recovery_state as boolean | undefined
        if (sid) {
          setSessionId(sid)
          setStoredSessionId(sid)
        }
        if (rid) setRunId(rid)
        if (wf) setWorkflowState(wf as WorkflowState)
        setHasRecoveryState(!!hasRecovery)
        setIsExpired(false)
        setIsSuperseded(false)
        setReplacementRunId(null)
        setConnected(client.getConnectionState() === 'open')
        hasEverConnectedRef.current = true
        setWsFailedAtStart(false)
      } else if (type === 'workflow.state' || type === 'workflow_state') {
        const wf = (payload as Record<string, unknown>).workflow_state as string | undefined
        if (wf) setWorkflowState(wf as WorkflowState)
      } else if (type === 'command.accepted' || type === 'command.rejected') {
        const wf = (payload as Record<string, unknown>).workflow_state as string | undefined
        // Optimistic: if server ack already says planning, move immediately — don't wait for workflow.state sequencing
        if (wf === 'planning' || wf === 'decision_required') setWorkflowState(wf as WorkflowState)
      } else if (type === 'session.expired') {
        setIsExpired(true)
        setWorkflowState('expired')
        setConnected(false)
      } else if (type === 'session.superseded') {
        setIsSuperseded(true)
        const rep = (payload as Record<string, unknown>).replacement_run_id as string | undefined
        if (rep) setReplacementRunId(rep)
        try { client.disconnect() } catch {}
        setConnected(false)
      }
    })
    // also track connection state via onStateChange
    const onState = () => {
      const isOpen = client.getConnectionState() === 'open'
      setConnected(isOpen)
      if (isOpen) {
        hasEverConnectedRef.current = true
        setWsFailedAtStart(false)
      } else {
        const cs = client.getConnectionState()
        if (!hasEverConnectedRef.current && cs === 'closed') {
          setWsFailedAtStart(true)
        }
      }
      const snap = client.snapshot()
      if (snap.sessionId) setSessionId(snap.sessionId)
      if (snap.runId) setRunId(snap.runId)
      if (snap.workflowState) setWorkflowState(snap.workflowState as WorkflowState)
      setHasRecoveryState(!!snap.hasRecoveryState)
    }
    const prevOnStateChange = (client as unknown as { opts?: { onStateChange?: (s: unknown)=>void } }).opts?.onStateChange
    ;(client as unknown as { opts: Record<string, unknown> }).opts = {
      ...(client as unknown as { opts: Record<string, unknown> }).opts,
      onStateChange: (s: unknown) => {
        if (typeof prevOnStateChange === 'function') (prevOnStateChange as (v: unknown)=>void)(s)
        onState()
      },
    }
    const fallbackTimer = window.setTimeout(() => {
      if (!hasEverConnectedRef.current) {
        const cs = client.getConnectionState()
        if (cs === 'closed' || cs === 'idle') {
          setWsFailedAtStart(true)
          setConnected(false)
        }
      }
    }, 1500)
    return () => { unsub(); window.clearTimeout(fallbackTimer) }
  }, [client])

  const sendSessionStart = useCallback((initialIntent?: string | null) => {
    const stored = getStoredSessionId()
    const command_id = genCommandId()

    if (client.getConnectionState() !== 'open') {
      try { client.connect(wsUrl) } catch {}
    }

    try {
      const payload: Record<string, unknown> = { session_id: stored ?? null }
      if (initialIntent && initialIntent.trim().length > 0) {
        payload.initial_intent = initialIntent.trim().slice(0, 2000)
      }
      // Reuse WsClient's at-least-once path so we don't bypass its registry/retry.
      // sendCommand handles build, register, sendRaw, pendingRetries and scheduleRetry.
      client.sendCommand('session.start', payload, command_id)
      wsLogger.debug("sendSessionStart", { stored, command_id, hasIntent: !!payload.initial_intent })
    } catch (e) {
      wsLogger.error("sendSessionStart failed", e)
    }
  }, [client, wsUrl])

  const startNewSession = useCallback(() => {
    setStoredSessionId(null)
    setSessionId(null)
    setRunId(null)
    setIsExpired(false)
    setIsSuperseded(false)
    setWorkflowState(null)
    setHasRecoveryState(false)
    setReplacementRunId(null)
    setWsFailedAtStart(false)
    hasEverConnectedRef.current = false
    const command_id = genCommandId()
    if (client.getConnectionState() !== 'open') {
      try { client.connect(wsUrl) } catch {}
    }
    try {
      client.sendSessionStart(null, command_id)
    } catch {}
  }, [client, wsUrl])

  const disconnect = useCallback(() => {
    try { client.disconnect() } catch {}
    setConnected(false)
  }, [client])

  const value = useMemo<WsContextValue>(() => ({
    client, connected, wsFailedAtStart, allowMock, sessionId, runId, workflowState, hasRecoveryState, isExpired, isSuperseded, replacementRunId, sendSessionStart, startNewSession, disconnect,
  }), [client, connected, wsFailedAtStart, allowMock, sessionId, runId, workflowState, hasRecoveryState, isExpired, isSuperseded, replacementRunId, sendSessionStart, startNewSession, disconnect])

  return <WsContext.Provider value={value}>{children}</WsContext.Provider>
}
