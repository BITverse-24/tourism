/**
 * Centralized error rendering — single source for command.rejected vs invalid_envelope.
 *
 * Contract (docs/WEBSOCKET_CONTRACT.md § Error handling):
 *  - Envelope validation errors that cannot be associated with a command use
 *    kind:error with stable code (invalid_envelope).
 *  - Command-specific validation errors use kind:ack type:command.rejected.
 *  - Errors must include { code, message, retryable }.
 *  - Messages must NOT include stack traces, secrets, internal prompts, provider
 *    credentials, or raw third-party error bodies.
 *  - command.rejected additionally carries workflow_state + recovery.current_question_id
 *    when relevant (question_not_current, invalid_workflow_state).
 *  - Forward-compat: unknown fields ignored, unknown event types ignored after diagnostic.
 *
 * This module centralizes:
 *  - sanitization (strip stack/secrets, truncate, safe defaults)
 *  - distinction helper isInvalidEnvelope vs isCommandRejected
 *  - extraction of code/retryable/recovery.current_question_id
 *  - user-facing display string generation
 */

export type ErrorKind = 'invalid_envelope' | 'command_rejected' | 'error'

export interface SanitizedError {
  /** High-level kind for rendering */
  kind: ErrorKind
  /** Stable contract code, e.g. invalid_envelope, question_not_current */
  code: string
  /** Sanitized human-readable message */
  message: string
  /** Whether retry may succeed */
  retryable: boolean
  /** Workflow state when code is command.rejected */
  workflowState?: string
  /** Recovery hint: current active question */
  recoveryQuestionId?: string | null
  /** Original raw envelope type for diagnostics */
  rawType?: string
  /** Original kind */
  rawKind?: string
}

const SECRET_KEY_RE = /(secret|password|token|api[_-]?key|credential|provider|authorization|cookie|private)/i
const STACK_LINE_RE = /at\s+.*\(.*:\d+:\d+\)/g
const STACK_LABEL_RE = /stack\s*:/gi

/** Strip stack traces and truncate to safe length */
export function sanitizeMessage(raw: unknown): string {
  let msg = typeof raw === 'string' ? raw : String(raw ?? '')
  msg = msg.replace(STACK_LINE_RE, '')
  msg = msg.replace(STACK_LABEL_RE, '')
  msg = msg.replace(/https?:\/\/\S+/g, '[url]')
  // collapse whitespace
  msg = msg.replace(/\s+/g, ' ').trim()
  if (msg.length > 500) msg = msg.slice(0, 500).trim()
  return msg || 'An error occurred'
}

/** Remove secret/stack keys from a payload copy */
export function sanitizePayload<T extends Record<string, unknown>>(payload: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(payload)) {
    if (k === 'stack' || k === 'stackTrace' || k === 'stack_trace' || k === 'stacktrace') continue
    if (SECRET_KEY_RE.test(k)) continue
    if (typeof v === 'string' && STACK_LINE_RE.test(v)) {
      out[k] = sanitizeMessage(v)
      continue
    }
    out[k] = v
  }
  return out as T
}

/** Minimal envelope shape needed for error rendering */
export interface ErrorEnvelope {
  kind: string
  type: string
  message_id?: string
  sequence?: number
  payload: Record<string, unknown>
  session_id?: string
  run_id?: string
  command_id?: string
}

export function isInvalidEnvelope(env: ErrorEnvelope): boolean {
  return env.kind === 'error'
}

export function isCommandRejected(env: ErrorEnvelope): boolean {
  return env.kind === 'ack' && env.type === 'command.rejected'
}

export function getErrorKind(env: ErrorEnvelope): ErrorKind {
  if (isCommandRejected(env)) return 'command_rejected'
  if (isInvalidEnvelope(env)) return 'invalid_envelope'
  // fallback — treat any ack with accepted:false similarly
  const p = env.payload as Record<string, unknown>
  if (p && p.accepted === false) return 'command_rejected'
  return 'error'
}

/**
 * Extract SanitizedError from any error-related envelope.
 * Handles both:
 *  - kind:error { code, message, retryable }  (invalid_envelope etc.)
 *  - kind:ack type:command.rejected { code, message, retryable, workflow_state, recovery }
 */
export function toDisplayError(env: ErrorEnvelope): SanitizedError | null {
  if (!env || !env.payload || typeof env.payload !== 'object') return null
  const p = env.payload as Record<string, unknown>
  const kind = getErrorKind(env)

  // code is required per contract; fallback to invalid_envelope
  const rawCode = typeof p.code === 'string' && p.code ? p.code : 'invalid_envelope'
  const code = String(rawCode).trim() || 'invalid_envelope'
  const message = sanitizeMessage(p.message ?? p.error ?? 'An error occurred')
  const retryable = p.retryable === true

  let workflowState: string | undefined
  if (typeof p.workflow_state === 'string') workflowState = p.workflow_state
  else if (typeof p.workflowState === 'string') workflowState = p.workflowState as string

  let recoveryQuestionId: string | null | undefined
  const recovery = p.recovery as Record<string, unknown> | undefined
  if (recovery && typeof recovery === 'object') {
    const qid = recovery.current_question_id ?? recovery.active_question_id ?? recovery.question_id
    if (typeof qid === 'string' && qid.trim()) recoveryQuestionId = qid
    else if (qid == null) recoveryQuestionId = null
  }

  // sanitize workflowState message as well
  return {
    kind,
    code,
    message,
    retryable,
    workflowState,
    recoveryQuestionId,
    rawType: env.type,
    rawKind: env.kind,
  }
}

/** Whether error is retryable (server flag is authoritative, fallback to code set) */
const RETRYABLE_CODES = new Set([
  'question_not_current',
  'invalid_workflow_state',
  'run_cancelled',
  'session_not_found',
])

export function isRetryable(err: SanitizedError): boolean {
  if (typeof err.retryable === 'boolean') return err.retryable
  return RETRYABLE_CODES.has(err.code)
}

/** User-facing label for code */
export function codeLabel(code: string): string {
  const map: Record<string, string> = {
    invalid_envelope: 'Invalid message',
    unsupported_message_type: 'Unsupported message',
    session_not_found: 'Session not found',
    session_expired: 'Session expired',
    invalid_workflow_state: 'Not allowed right now',
    question_not_current: 'Question out of date',
    invalid_selection: 'Invalid selection',
    free_text_not_allowed: 'Text not allowed',
    profile_not_ready: 'Profile not ready',
    profile_revision_conflict: 'Profile updated',
    invalid_replan_request: 'Replanning not available',
    run_cancelled: 'Run cancelled',
    command_id_conflict: 'Duplicate command',
  }
  return map[code] ?? code.replace(/_/g, ' ')
}

/** Compose banner text: code + message + retry hint + recovery */
export function formatBannerText(err: SanitizedError): string {
  const label = codeLabel(err.code)
  let s = err.message ? `${label}: ${err.message}` : label
  if (err.recoveryQuestionId) {
    s += ` (current question: ${err.recoveryQuestionId})`
  }
  if (err.workflowState) {
    s += ` [${err.workflowState}]`
  }
  if (err.retryable) s += ' — you can try again.'
  return s
}

/** For logging — sanitize without exposing secrets */
export function sanitizeForLog(env: ErrorEnvelope): ErrorEnvelope {
  const p = sanitizePayload(env.payload as Record<string, unknown>)
  if (typeof p.message === 'string') p.message = sanitizeMessage(p.message as string)
  return { ...env, payload: p }
}

/** Check if payload contains leaked secrets/stack */
export function hasLeakedSecrets(payload: Record<string, unknown>): boolean {
  for (const k of Object.keys(payload)) {
    if (k === 'stack' || k === 'stackTrace' || k === 'stack_trace') return true
    if (SECRET_KEY_RE.test(k)) return true
  }
  for (const v of Object.values(payload)) {
    if (typeof v === 'string' && STACK_LINE_RE.test(v)) return true
  }
  return false
}
