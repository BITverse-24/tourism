/**
 * Forward-compatibility helpers — unknown fields/types must not break connection.
 * Contract: unknown fields must be ignored, unknown server event types must not
 * break the connection; clients must safely ignore unknown server event types
 * after recording them for diagnostics.
 */

const diagnostics: string[] = []
let diagnosticListener: ((entry: string) => void) | null = null

export function recordUnknownEventType(type: string, kind: string, messageId?: string): void {
  const entry = `unknown server ${kind} type ignored: ${type}${messageId ? ` (${messageId})` : ''}`
  if (!diagnostics.includes(entry)) diagnostics.push(entry)
  // also push compact form for counting
  const compact = `${kind}:${type}`
  if (!diagnostics.includes(compact)) diagnostics.push(compact)
  try {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('[ws:compat] ' + entry)
    }
  } catch {}
  diagnosticListener?.(entry)
}

export function getCompatDiagnostics(): string[] {
  return [...diagnostics]
}

export function clearCompatDiagnostics(): void {
  diagnostics.length = 0
}

export function onCompatDiagnostic(fn: (entry: string) => void): () => void {
  diagnosticListener = fn
  return () => {
    if (diagnosticListener === fn) diagnosticListener = null
  }
}

/**
 * Returns true if envelope should be ignored (unknown server event type).
 * Known types are listed per contract; everything else is forward-compat ignored.
 */
const KNOWN_SERVER_TYPES = new Set([
  'session.ready',
  'discovery.question',
  'profile.snapshot',
  'profile.ready',
  'agent.lifecycle',
  'planning.status',
  'decision.request',
  'plan.snapshot',
  'workflow.completed',
  'session.expired',
  'session.superseded',
  'command.accepted',
  'command.rejected',
])

export function isKnownServerType(type: string): boolean {
  return KNOWN_SERVER_TYPES.has(type)
}

export function shouldIgnoreUnknownEvent(kind: string, type: string): boolean {
  if (kind === 'event' || kind === 'ack') {
    if (!isKnownServerType(type)) return true
  }
  return false
}

/**
 * Process an envelope and decide if it should be handled or ignored.
 * Call this before dispatching to domain handlers; if ignored, the caller
 * should record the diagnostic and return without side effects.
 */
export function checkAndRecordUnknown(env: { kind: string; type: string; message_id?: string }): boolean {
  if (shouldIgnoreUnknownEvent(env.kind, env.type)) {
    recordUnknownEventType(env.type, env.kind, env.message_id)
    return true // should ignore
  }
  return false
}
