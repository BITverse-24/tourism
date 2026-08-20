/**
 * WebSocket transport — strictly follows docs/WEBSOCKET_CONTRACT.md
 *
 * Contract:
 * - Endpoint WS /ws
 * - Frame format UTF-8 JSON text frames
 * - Heartbeats native WebSocket ping/pong; no application heartbeat message
 * - Manages WebSocket connection with correct URL construction
 * - JSON parsing/serialization and envelope validation (invalid_envelope error)
 */

import {
  Envelope,
  EnvelopeError,
  parseEnvelope,
  serializeEnvelope,
  validateEnvelope,
  shouldIgnoreEnvelope,
  recordDiagnostic,
  isIso8601Utc,
} from './envelope';

// ---------------------------------------------------------------------------
// URL construction
// ---------------------------------------------------------------------------

/**
 * Build the WebSocket URL for endpoint WS /ws
 *
 * - If baseUrl is an absolute ws:// or wss:// URL, ensure path is /ws
 * - If baseUrl is http:// or https://, convert to ws/wss and set path /ws
 * - If baseUrl is relative or undefined, use window.location origin when available
 * - Always returns a URL ending with /ws
 * - Native ping/pong — no app heartbeat query param is added
 */
export function buildWsUrl(baseUrl?: string): string {
  // Helper to ensure pathname is /ws and remove trailing slash duplicates
  const ensureWsPath = (url: URL): string => {
    // Preserve search? Contract does not define query params; keep existing search if present
    // but ensure pathname is exactly /ws
    url.pathname = '/ws';
    // Remove trailing slash duplication already handled by setting pathname
    return url.toString();
  };

  // Case 1: baseUrl provided
  if (baseUrl && typeof baseUrl === 'string' && baseUrl.trim().length > 0) {
    const trimmed = baseUrl.trim();

    // Already ws:// or wss://
    if (/^wss?:\/\//i.test(trimmed)) {
      try {
        const u = new URL(trimmed);
        return ensureWsPath(u);
      } catch {
        // If URL parsing fails, fallback to string manipulation
        const withoutPath = trimmed.replace(/\/+$/, '').replace(/\/ws\/?$/i, '');
        return withoutPath.replace(/\/+$/, '') + '/ws';
      }
    }

    // http:// or https:// -> convert to ws/wss
    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const u = new URL(trimmed);
        u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
        return ensureWsPath(u);
      } catch {
        const withoutPath = trimmed.replace(/\/+$/, '').replace(/\/ws\/?$/i, '');
        const isHttps = /^https:/i.test(trimmed);
        // best effort: replace protocol
        const wsBase = withoutPath.replace(/^https?:\/\//i, isHttps ? 'wss://' : 'ws://');
        return wsBase + '/ws';
      }
    }

    // Protocol-relative //host/...
    if (trimmed.startsWith('//')) {
      const proto =
        typeof window !== 'undefined' && window.location && window.location.protocol === 'https:'
          ? 'wss:'
          : 'ws:';
      try {
        const u = new URL(proto + trimmed);
        return ensureWsPath(u);
      } catch {
        return proto + '//' + trimmed.replace(/^\/+/, '').replace(/\/ws\/?$/i, '') + '/ws';
      }
    }

    // Relative path like /ws or /api or ws? Try to resolve against window.location
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      try {
        const base = new URL(trimmed, window.location.origin);
        // If trimmed already points to ws path, ensure it
        if (trimmed === '/ws' || trimmed.endsWith('/ws')) {
          base.pathname = '/ws';
          base.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          return base.toString();
        }
        // For any other relative base (e.g. /api, /), use origin + /ws
        const originUrl = new URL(window.location.origin);
        originUrl.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return ensureWsPath(originUrl);
      } catch {
        // fallback
      }
    }

    // If trimmed is just /ws, return it with current host if possible, else as-is
    if (trimmed === '/ws' || trimmed === 'ws' || trimmed === '/ws/') {
      if (typeof window !== 'undefined' && window.location && window.location.host) {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${proto}//${window.location.host}/ws`;
      }
      return '/ws';
    }

    // Fallback: treat as host string
    // e.g. "example.com" or "example.com:4000"
    if (!trimmed.includes('://') && !trimmed.startsWith('/')) {
      const proto =
        typeof window !== 'undefined' && window.location && window.location.protocol === 'https:'
          ? 'wss:'
          : 'ws:';
      try {
        const u = new URL(`${proto}//${trimmed}`);
        return ensureWsPath(u);
      } catch {
        return `${proto}//${trimmed.replace(/\/+$/, '').replace(/\/ws\/?$/i, '')}/ws`;
      }
    }

    // Last resort: return as-is with /ws appended
    if (trimmed.endsWith('/ws')) return trimmed;
    return trimmed.replace(/\/+$/, '') + '/ws';
  }

  // Case 2: no baseUrl — use window.location if available
  if (typeof window !== 'undefined' && window.location && window.location.host) {
    const isSecure = window.location.protocol === 'https:';
    const proto = isSecure ? 'wss:' : 'ws:';
    try {
      const u = new URL(window.location.origin);
      u.protocol = proto;
      return ensureWsPath(u);
    } catch {
      return `${proto}//${window.location.host}/ws`;
    }
  }

  // Node / test fallback — no window
  // Use localhost as sensible default for tests
  return 'ws://localhost/ws';
}

// Aliases for test compatibility — all point to same implementation
export const getWsUrl = buildWsUrl;
export const createWsUrl = buildWsUrl;
export const buildWebSocketUrl = buildWsUrl;
export const toWsUrl = buildWsUrl;
export const getWebSocketUrl = buildWsUrl;

// ---------------------------------------------------------------------------
// Transport types
// ---------------------------------------------------------------------------

export type TransportState = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

export interface TransportOptions {
  /** Absolute or relative base URL; if omitted, derived from window.location */
  url?: string;
  baseUrl?: string;
  /** Explicit ws URL — takes precedence over url/baseUrl */
  wsUrl?: string;
  /** Protocols passed to WebSocket constructor */
  protocols?: string | string[];
  /** Called for each valid envelope received (unknown server events already filtered) */
  onMessage?: (envelope: Envelope, raw: string) => void;
  /** Called when envelope validation fails or JSON parse fails (invalid_envelope) */
  onEnvelopeError?: (error: EnvelopeError & { raw?: unknown; details?: string }, rawText?: string) => void;
  /** Generic error */
  onError?: (ev: Event | Error) => void;
  onOpen?: (ev: Event) => void;
  onClose?: (ev: CloseEvent) => void;
  /** Called when unknown server event type is ignored (diagnostic) */
  onUnknownEvent?: (envelope: Envelope) => void;
  /** Enable verbose diagnostics */
  debug?: boolean;
}

export interface SendOptions {
  session_id?: string;
  run_id?: string;
  command_id?: string;
  message_id?: string;
}

// ---------------------------------------------------------------------------
// WebSocket Transport class
// ---------------------------------------------------------------------------

export class Transport {
  private ws: WebSocket | null = null;
  private url: string;
  private options: TransportOptions;
  private state: TransportState = 'idle';
  private pendingQueue: string[] = [];

  constructor(options: TransportOptions = {}) {
    this.options = options;
    const explicit = options.wsUrl ?? options.url ?? options.baseUrl;
    this.url = buildWsUrl(explicit);
  }

  getState(): TransportState {
    return this.state;
  }

  getUrl(): string {
    return this.url;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  isConnecting(): boolean {
    return this.state === 'connecting' || (this.ws !== null && this.ws.readyState === WebSocket.CONNECTING);
  }

  connect(): WebSocket {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return this.ws;
    }

    this.state = 'connecting';

    const ws =
      this.options.protocols !== undefined
        ? new WebSocket(this.url, this.options.protocols)
        : new WebSocket(this.url);

    // Native ping/pong is handled by the browser engine; no app heartbeat
    // Ensure binaryType is not used — we only use UTF-8 text frames

    ws.addEventListener('open', (ev) => {
      this.state = 'open';
      // Flush any queued messages serialized while connecting
      if (this.pendingQueue.length > 0) {
        for (const msg of this.pendingQueue) {
          try {
            ws.send(msg);
          } catch {
            // if send fails, will be retried or dropped; error will surface via onerror
          }
        }
        this.pendingQueue.length = 0;
      }
      if (this.options.onOpen) this.options.onOpen(ev);
    });

    ws.addEventListener('message', (ev) => {
      this.handleRawMessage(typeof ev.data === 'string' ? ev.data : String(ev.data));
    });

    ws.addEventListener('error', (ev) => {
      this.state = 'error';
      if (this.options.onError) this.options.onError(ev as Event);
    });

    ws.addEventListener('close', (ev) => {
      this.state = 'closed';
      if (this.options.onClose) this.options.onClose(ev as CloseEvent);
    });

    this.ws = ws;
    return ws;
  }

  disconnect(code?: number, reason?: string): void {
    if (this.ws) {
      try {
        this.ws.close(code, reason);
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.state = 'closed';
    this.pendingQueue.length = 0;
  }

  close(code?: number, reason?: string): void {
    this.disconnect(code, reason);
  }

  /**
   * Handle a raw incoming text frame — JSON parse + envelope validation
   * Public for testing and for environments that deliver frames externally.
   */
  handleRawMessage(rawText: string): void {
    // Frame format must be UTF-8 JSON text — rawText is already a string
    // Validate that it is valid JSON first
    const parsed = parseEnvelope(rawText);

    if (!parsed.valid) {
      const err: EnvelopeError & { raw?: unknown; details?: string } = {
        code: parsed.error?.code ?? 'invalid_envelope',
        message: parsed.error?.message ?? 'invalid_envelope',
        retryable: parsed.error?.retryable ?? false,
        raw: parsed.raw,
        details: parsed.error?.details,
      };
      if (this.options.debug) {
        try {
          console.warn('[ws] invalid_envelope', err, rawText);
        } catch {
          // ignore
        }
      }
      if (this.options.onEnvelopeError) {
        this.options.onEnvelopeError(err, rawText);
      } else if (this.options.onError) {
        this.options.onError(new Error(`${err.code}: ${err.message}`));
      }
      return;
    }

    const envelope = parsed.envelope as Envelope;

    // Unknown server event types: safely ignored after diagnostics
    if (parsed.isUnknownServerEvent || shouldIgnoreEnvelope(envelope)) {
      recordDiagnostic(`transport ignored unknown server event: ${envelope.type} (${envelope.message_id})`);
      if (this.options.onUnknownEvent) {
        this.options.onUnknownEvent(envelope);
      }
      // Do not forward to onMessage — silently ignored per contract
      return;
    }

    // Valid envelope — forward to consumer
    if (this.options.onMessage) {
      this.options.onMessage(envelope, rawText);
    }
  }

  /**
   * Send a pre-built envelope — validates, serializes to UTF-8 JSON text, and sends.
   * Queues if still connecting.
   */
  send(envelope: Envelope): void {
    // Validate before sending
    const check = validateEnvelope(envelope as unknown as Record<string, unknown>);
    if (!check.valid) {
      throw new Error(`Cannot send invalid envelope: ${check.code} — ${check.message}`);
    }
    const text = serializeEnvelope(envelope);
    this.sendRaw(text);
  }

  /**
   * Send a raw JSON text frame — queues if connecting, throws if closed with no socket
   */
  sendRaw(text: string): void {
    if (!this.ws) {
      throw new Error('WebSocket not connected — call connect() first');
    }
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(text);
      return;
    }
    if (this.ws.readyState === WebSocket.CONNECTING) {
      this.pendingQueue.push(text);
      return;
    }
    throw new Error(`WebSocket not open (readyState=${this.ws.readyState})`);
  }

  /**
   * Convenience: create and send a command envelope
   */
  sendCommand(
    type: string,
    payload: Record<string, unknown>,
    opts: SendOptions = {}
  ): Envelope {
    const env: Envelope = {
      message_id: opts.message_id ?? generateId(),
      kind: 'command',
      type,
      occurred_at: new Date().toISOString(),
      payload,
    };
    if (opts.session_id) env.session_id = opts.session_id;
    if (opts.run_id) env.run_id = opts.run_id;
    if (opts.command_id) env.command_id = opts.command_id;
    else env.command_id = generateId('cmd');

    // Validate command type is known — will throw if unsupported? Instead we serialize via envelope validation
    // which will flag unsupported_message_type; but send() would throw. We want to allow sending only valid commands.
    // So check here and throw with that code for caller to handle? Contract says unknown command types rejected with unsupported_message_type (server side).
    // Client should not send unknown commands. We still allow it but validation will catch it.
    this.send(env);
    return env;
  }

  /**
   * Update handlers after construction
   */
  setHandlers(handlers: Pick<TransportOptions, 'onMessage' | 'onEnvelopeError' | 'onError' | 'onOpen' | 'onClose' | 'onUnknownEvent'>): void {
    Object.assign(this.options, handlers);
  }
}

// Aliases for compatibility
export const WsTransport = Transport;
export const WebSocketTransport = Transport;
export const WSTransport = Transport;

// ---------------------------------------------------------------------------
// Functional helpers — for tests that use plain functions instead of class
// ---------------------------------------------------------------------------

export function createTransport(options: TransportOptions = {}): Transport {
  return new Transport(options);
}

export function connectTransport(options: TransportOptions = {}): Transport {
  const t = new Transport(options);
  t.connect();
  return t;
}

/**
 * Parse and validate a single raw frame outside of a Transport instance.
 * Returns the envelope or an invalid_envelope error — mirrors server behavior.
 */
export function handleFrame(rawText: string): { envelope?: Envelope; error?: EnvelopeError; ignored?: boolean } {
  const parsed = parseEnvelope(rawText);
  if (!parsed.valid) {
    return {
      error: {
        code: parsed.error?.code ?? 'invalid_envelope',
        message: parsed.error?.message ?? 'invalid envelope',
        retryable: parsed.error?.retryable ?? false,
      },
    };
  }
  const env = parsed.envelope as Envelope;
  if (parsed.isUnknownServerEvent || shouldIgnoreEnvelope(env)) {
    return { envelope: env, ignored: true };
  }
  return { envelope: env };
}

/**
 * Serialize an envelope to UTF-8 JSON text frame — alias for serializeEnvelope
 */
export function toFrame(envelope: Envelope): string {
  return serializeEnvelope(envelope);
}

export function fromFrame(text: string): ReturnType<typeof parseEnvelope> {
  return parseEnvelope(text);
}

// ---------------------------------------------------------------------------
// Internal ID helper — mirrors envelope's but local to transport for no circular issues
// ---------------------------------------------------------------------------

function generateId(prefix: string = 'msg'): string {
  try {
    const c: unknown = typeof crypto !== 'undefined' ? (crypto as { randomUUID?: () => string }) : null;
    if (c && typeof (c as { randomUUID?: unknown }).randomUUID === 'function') {
      return (c as { randomUUID: () => string }).randomUUID();
    }
  } catch {
    // ignore
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// Re-export envelope utilities for convenience
export { parseEnvelope, serializeEnvelope, validateEnvelope, shouldIgnoreEnvelope, isIso8601Utc, recordDiagnostic } from './envelope';
