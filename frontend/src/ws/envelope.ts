/**
 * WebSocket envelope — strictly follows docs/WEBSOCKET_CONTRACT.md
 *
 * Every frame is UTF-8 JSON text with this envelope shape:
 * {
 *   message_id: string (required)
 *   kind: 'command'|'ack'|'event'|'error' (required)
 *   type: string dot-delimited (required)
 *   session_id?: string (conditional)
 *   run_id?: string (conditional)
 *   command_id?: string (conditional)
 *   sequence?: number (server messages after run exists)
 *   occurred_at: ISO8601 UTC string (required)
 *   payload: object (required)
 *   ...unknown fields ignored
 * }
 *
 * Contract invariants implemented:
 * - Unknown fields ignored for forward compatibility
 * - Unknown server event types safely ignored after diagnostics
 * - Unknown command types rejected with unsupported_message_type
 * - Frame format UTF-8 JSON text
 */

export type EnvelopeKind = 'command' | 'ack' | 'event' | 'error';

export interface Envelope {
  message_id: string;
  kind: EnvelopeKind;
  type: string;
  session_id?: string;
  run_id?: string;
  command_id?: string;
  sequence?: number;
  occurred_at: string;
  payload: Record<string, unknown>;
  // index signature intentionally omitted from strong type to encourage
  // ignoring unknown fields, but parsed raw may contain extras
}

export interface EnvelopeError {
  code: string;
  message: string;
  retryable?: boolean;
}

export interface ValidationSuccess {
  valid: true;
  envelope: Envelope;
  // true when kind is event/error/ack but type is not in known list
  isUnknownServerEvent?: boolean;
  // true when kind is command but type unknown — caller should treat as unsupported_message_type
  isUnsupportedCommand?: boolean;
}

export interface ValidationFailure {
  valid: false;
  code: string; // invalid_envelope | unsupported_message_type
  message: string;
  retryable?: boolean;
  details?: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

export interface ParseResult {
  envelope?: Envelope;
  error?: EnvelopeError & { details?: string };
  raw?: unknown;
  // diagnostics flag
  isUnknownServerEvent?: boolean;
  isUnsupportedCommand?: boolean;
  valid: boolean;
}

// ---------------------------------------------------------------------------
// Known types per WEBSOCKET_CONTRACT.md
// ---------------------------------------------------------------------------

export const VALID_KINDS: readonly EnvelopeKind[] = ['command', 'ack', 'event', 'error'] as const;

export const KNOWN_COMMAND_TYPES: readonly string[] = [
  'session.start',
  'discovery.answer',
  'profile.confirm',
  'profile.request_changes',
  'decision.respond',
  'run.cancel',
  'session.close',
  // reserved — not accepted in v1 but listed for completeness
  // 'replan.request' is intentionally NOT included as valid v1 command
] as const;

export const KNOWN_ACK_TYPES: readonly string[] = [
  'command.accepted',
  'command.rejected',
] as const;

export const KNOWN_EVENT_TYPES: readonly string[] = [
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
  // also allow ack types as event? no — keep separate
] as const;

export const KNOWN_ERROR_CODES: readonly string[] = [
  'invalid_envelope',
  'unsupported_message_type',
  'session_not_found',
  'session_expired',
  'invalid_workflow_state',
  'question_not_current',
  'invalid_selection',
  'free_text_not_allowed',
  'profile_not_ready',
  'profile_revision_conflict',
  'invalid_replan_request',
  'run_cancelled',
  'command_id_conflict',
] as const;

// Union of all server-originated types the client may receive
export const KNOWN_SERVER_TYPES: readonly string[] = [
  ...KNOWN_ACK_TYPES,
  ...KNOWN_EVENT_TYPES,
  // error kind uses code inside payload, but type may be generic
] as const;

// ---------------------------------------------------------------------------
// Diagnostics for unknown server event types
// Contract: clients must safely ignore unknown server event types after
// recording them for diagnostics.
// ---------------------------------------------------------------------------

const diagnosticsLog: string[] = [];

export function getDiagnostics(): string[] {
  return [...diagnosticsLog];
}

export function clearDiagnostics(): void {
  diagnosticsLog.length = 0;
}

export function recordDiagnostic(message: string): void {
  diagnosticsLog.push(message);
  // Also console.warn for visibility during development; guard for non-browser
  try {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('[ws:diagnostic] ' + message);
    }
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ISO8601_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

export function isIso8601Utc(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (!ISO8601_UTC_RE.test(value)) return false;
  const ms = Date.parse(value);
  return !Number.isNaN(ms);
}

export function nowIso8601Utc(): string {
  return new Date().toISOString();
}

export function isKnownCommandType(type: string): boolean {
  return (KNOWN_COMMAND_TYPES as readonly string[]).includes(type);
}

export function isKnownServerEventType(type: string): boolean {
  // Check against known server types; also allow 'command.accepted/rejected' which are acks
  return (KNOWN_SERVER_TYPES as readonly string[]).includes(type);
}

export function isKnownAckType(type: string): boolean {
  return (KNOWN_ACK_TYPES as readonly string[]).includes(type);
}

export function isKnownEventType(type: string): boolean {
  return (KNOWN_EVENT_TYPES as readonly string[]).includes(type);
}

// Backwards compat aliases
export const isUnknownServerEventType = (type: string): boolean => !isKnownServerEventType(type);
export const isUnsupportedCommandType = (type: string): boolean => !isKnownCommandType(type);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

// Generate a message_id — uses crypto.randomUUID when available
export function generateMessageId(): string {
  try {
    const c: unknown = typeof crypto !== 'undefined' ? (crypto as { randomUUID?: () => string }) : null;
    if (c && typeof (c as { randomUUID?: unknown }).randomUUID === 'function') {
      return (c as { randomUUID: () => string }).randomUUID();
    }
  } catch {
    // fall through
  }
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function generateCommandId(): string {
  try {
    const c: unknown = typeof crypto !== 'undefined' ? (crypto as { randomUUID?: () => string }) : null;
    if (c && typeof (c as { randomUUID?: unknown }).randomUUID === 'function') {
      return (c as { randomUUID: () => string }).randomUUID();
    }
  } catch {
    // fall through
  }
  return `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Core validation — unknown fields are ignored
// ---------------------------------------------------------------------------

export function validateEnvelope(raw: unknown): ValidationResult {
  // Must be a plain object
  if (!isPlainObject(raw)) {
    return {
      valid: false,
      code: 'invalid_envelope',
      message: 'envelope must be an object',
      retryable: false,
    };
  }

  const obj = raw as Record<string, unknown>;

  // message_id — required
  if (!isNonEmptyString(obj['message_id'])) {
    return { valid: false, code: 'invalid_envelope', message: 'message_id is required and must be a non-empty string', retryable: false };
  }

  // kind — required, one of command|ack|event|error
  if (!isNonEmptyString(obj['kind']) || !(VALID_KINDS as readonly string[]).includes(obj['kind'] as string)) {
    return { valid: false, code: 'invalid_envelope', message: 'kind must be one of command, ack, event, error', retryable: false };
  }
  const kind = obj['kind'] as EnvelopeKind;

  // type — required
  if (!isNonEmptyString(obj['type'])) {
    return { valid: false, code: 'invalid_envelope', message: 'type is required and must be a non-empty string', retryable: false };
  }
  const type = obj['type'] as string;

  // occurred_at — required ISO8601 UTC
  if (!isNonEmptyString(obj['occurred_at']) || !isIso8601Utc(obj['occurred_at'])) {
    return { valid: false, code: 'invalid_envelope', message: 'occurred_at is required and must be ISO8601 UTC (e.g. 2026-08-16T12:00:00Z)', retryable: false };
  }

  // payload — required, must be object (not null, not array)
  if (!isPlainObject(obj['payload'])) {
    return { valid: false, code: 'invalid_envelope', message: 'payload is required and must be an object', retryable: false };
  }

  // Optional fields validation when present

  // session_id — if present must be non-empty string or null? Contract says omitted on first session.start. Allow string only when present.
  if ('session_id' in obj && obj['session_id'] !== undefined && obj['session_id'] !== null) {
    if (!isNonEmptyString(obj['session_id'])) {
      return { valid: false, code: 'invalid_envelope', message: 'session_id must be a non-empty string when present', retryable: false };
    }
  }

  // run_id — same
  if ('run_id' in obj && obj['run_id'] !== undefined && obj['run_id'] !== null) {
    if (!isNonEmptyString(obj['run_id'])) {
      return { valid: false, code: 'invalid_envelope', message: 'run_id must be a non-empty string when present', retryable: false };
    }
  }

  // command_id — if present must be non-empty string
  if ('command_id' in obj && obj['command_id'] !== undefined && obj['command_id'] !== null) {
    if (!isNonEmptyString(obj['command_id'])) {
      return { valid: false, code: 'invalid_envelope', message: 'command_id must be a non-empty string when present', retryable: false };
    }
  }

  // sequence — server messages only, must be positive integer when present
  if ('sequence' in obj && obj['sequence'] !== undefined && obj['sequence'] !== null) {
    const seq = obj['sequence'];
    if (typeof seq !== 'number' || !Number.isInteger(seq) || seq < 1) {
      return { valid: false, code: 'invalid_envelope', message: 'sequence must be a positive integer when present', retryable: false };
    }
  }

  // Kind-specific structural validation

  // command must have command_id
  if (kind === 'command') {
    if (!isNonEmptyString(obj['command_id'])) {
      return { valid: false, code: 'invalid_envelope', message: 'command_id is required for command messages', retryable: false };
    }
    // sequence must NOT be present on client commands
    if ('sequence' in obj && obj['sequence'] !== undefined && obj['sequence'] !== null) {
      return { valid: false, code: 'invalid_envelope', message: 'sequence must not be present on command messages', retryable: false };
    }
    // Unknown command type — reject with unsupported_message_type per contract
    if (!isKnownCommandType(type)) {
      return {
        valid: false,
        code: 'unsupported_message_type',
        message: `unsupported command type: ${type}`,
        retryable: false,
      };
    }
  }

  // ack must have command_id and sequence (after run exists, server requires it)
  if (kind === 'ack') {
    if (!isNonEmptyString(obj['command_id'])) {
      return { valid: false, code: 'invalid_envelope', message: 'command_id is required for ack messages', retryable: false };
    }
    // sequence required for ack when run_id present or generally for server messages
    // Contract: Required on server ack, event, error after run exists. Enforce when present validation for strict phase,
    // but we require it for ack/event/error regardless to satisfy "flawless" validation.
    if (obj['sequence'] === undefined || obj['sequence'] === null) {
      // Allow missing sequence only if run_id missing (pre-run). Otherwise require.
      const hasRun = isNonEmptyString(obj['run_id']);
      if (hasRun) {
        return { valid: false, code: 'invalid_envelope', message: 'sequence is required for ack messages after run exists', retryable: false };
      }
    }
    // ack type should be known; but allow unknown — will be treated as diagnostic ignore for future compat?
    // For ack, unknown type is still valid envelope but should be noted.
  }

  // event — sequence required after run exists; command_id optional
  if (kind === 'event') {
    if (obj['sequence'] === undefined || obj['sequence'] === null) {
      const hasRun = isNonEmptyString(obj['run_id']);
      if (hasRun) {
        return { valid: false, code: 'invalid_envelope', message: 'sequence is required for event messages after run exists', retryable: false };
      }
    }
    // Unknown server event types must be safely ignored after diagnostics — still valid envelope
    if (!isKnownServerEventType(type) && !isKnownEventType(type) && !isKnownAckType(type)) {
      // Valid envelope, but flag for caller to ignore
      const envelope = buildNormalizedEnvelope(obj);
      recordDiagnostic(`unknown server event type ignored: ${type} (kind=${kind}, message_id=${envelope.message_id})`);
      return { valid: true, envelope, isUnknownServerEvent: true };
    }
  }

  // error — sequence required after run exists; payload should contain code/message
  if (kind === 'error') {
    if (obj['sequence'] === undefined || obj['sequence'] === null) {
      const hasRun = isNonEmptyString(obj['run_id']);
      if (hasRun) {
        return { valid: false, code: 'invalid_envelope', message: 'sequence is required for error messages after run exists', retryable: false };
      }
    }
    // error payload must contain code
    const payload = obj['payload'] as Record<string, unknown>;
    if (!isNonEmptyString(payload['code'])) {
      // Not strictly envelope shape error, but contract says errors must include code
      // Still consider envelope valid, but note missing code as invalid_envelope for strictness?
      // We'll allow but prefer to flag as invalid_envelope if code missing
      // For strict compliance, require code in error payload
      // However envelope itself is valid — error type still requires this. Enforce.
      return { valid: false, code: 'invalid_envelope', message: 'error payload must include code', retryable: false };
    }
  }

  // For event with known type, or ack/error with valid shape, return normalized envelope
  const envelope = buildNormalizedEnvelope(obj);

  // For ack with unknown type — flag as diagnostic but still valid
  if (kind === 'ack' && !isKnownAckType(type) && !isKnownServerEventType(type)) {
    recordDiagnostic(`unknown server ${kind} type ignored: ${type} (message_id=${envelope.message_id})`);
    return { valid: true, envelope, isUnknownServerEvent: true };
  }

  return { valid: true, envelope };
}

function buildNormalizedEnvelope(obj: Record<string, unknown>): Envelope {
  const env: Envelope = {
    message_id: obj['message_id'] as string,
    kind: obj['kind'] as EnvelopeKind,
    type: obj['type'] as string,
    occurred_at: obj['occurred_at'] as string,
    payload: obj['payload'] as Record<string, unknown>,
  };
  if (isNonEmptyString(obj['session_id'])) env.session_id = obj['session_id'] as string;
  if (isNonEmptyString(obj['run_id'])) env.run_id = obj['run_id'] as string;
  if (isNonEmptyString(obj['command_id'])) env.command_id = obj['command_id'] as string;
  if (typeof obj['sequence'] === 'number' && Number.isInteger(obj['sequence']) && (obj['sequence'] as number) >= 1) {
    env.sequence = obj['sequence'] as number;
  }
  return env;
}

// ---------------------------------------------------------------------------
// JSON frame helpers — UTF-8 JSON text
// ---------------------------------------------------------------------------

export function parseEnvelope(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return {
      valid: false,
      error: {
        code: 'invalid_envelope',
        message: 'invalid JSON',
        retryable: false,
        details: e instanceof Error ? e.message : String(e),
      },
      raw: text,
    };
  }

  const result = validateEnvelope(raw);
  if (!result.valid) {
    return {
      valid: false,
      error: {
        code: result.code,
        message: result.message,
        retryable: result.retryable ?? false,
        details: result.details,
      },
      raw,
      isUnsupportedCommand: result.code === 'unsupported_message_type',
    };
  }

  return {
    valid: true,
    envelope: result.envelope,
    raw,
    isUnknownServerEvent: result.isUnknownServerEvent,
    isUnsupportedCommand: result.isUnsupportedCommand,
  };
}

// Alias for convenience / test compatibility
export const parse = parseEnvelope;
export const validate = validateEnvelope;
export const isValidEnvelope = (raw: unknown): boolean => validateEnvelope(raw).valid;

export function serializeEnvelope(envelope: Envelope): string {
  // Re-validate before serializing to ensure we never emit invalid envelope
  const check = validateEnvelope(envelope as unknown as Record<string, unknown>);
  if (!check.valid) {
    throw new Error(`Cannot serialize invalid envelope: ${check.code} — ${check.message}`);
  }
  return JSON.stringify(envelope);
}

// Aliases
export const stringify = serializeEnvelope;
export const serialize = serializeEnvelope;
export const toJson = serializeEnvelope;
export const fromJson = parseEnvelope;

// ---------------------------------------------------------------------------
// Factory helpers for creating client command envelopes
// ---------------------------------------------------------------------------

export interface CreateCommandOptions {
  message_id?: string;
  session_id?: string | null;
  run_id?: string | null;
  command_id?: string;
  occurred_at?: string;
}

export function createEnvelope(
  kind: EnvelopeKind,
  type: string,
  payload: Record<string, unknown>,
  opts: CreateCommandOptions & { sequence?: number } = {}
): Envelope {
  const envelope: Envelope = {
    message_id: opts.message_id ?? generateMessageId(),
    kind,
    type,
    occurred_at: opts.occurred_at ?? nowIso8601Utc(),
    payload: payload ?? {},
  };
  if (opts.session_id) envelope.session_id = opts.session_id;
  if (opts.run_id) envelope.run_id = opts.run_id;
  if (opts.command_id) envelope.command_id = opts.command_id;
  if (typeof opts.sequence === 'number') envelope.sequence = opts.sequence;
  // Strip null/undefined that may have been passed explicitly
  return envelope;
}

export function createCommandEnvelope(
  type: string,
  payload: Record<string, unknown>,
  opts: CreateCommandOptions = {}
): Envelope {
  return createEnvelope('command', type, payload, {
    message_id: opts.message_id ?? generateMessageId(),
    session_id: opts.session_id ?? undefined,
    run_id: opts.run_id ?? undefined,
    command_id: opts.command_id ?? generateCommandId(),
    occurred_at: opts.occurred_at ?? nowIso8601Utc(),
  });
}

// Specific typed helpers

export function createSessionStartEnvelope(
  payload: Record<string, unknown> = { session_id: null },
  opts: CreateCommandOptions = {}
): Envelope {
  return createCommandEnvelope('session.start', payload, opts);
}

export function createDiscoveryAnswerEnvelope(
  payload: { question_id: string; selected_option_ids: string[]; free_text: string },
  opts: CreateCommandOptions = {}
): Envelope {
  return createCommandEnvelope('discovery.answer', payload as unknown as Record<string, unknown>, opts);
}

export function createProfileConfirmEnvelope(
  payload: { profile_revision: number },
  opts: CreateCommandOptions = {}
): Envelope {
  return createCommandEnvelope('profile.confirm', payload as unknown as Record<string, unknown>, opts);
}

export function createErrorEnvelope(
  code: string,
  message: string,
  opts: {
    message_id?: string;
    type?: string;
    session_id?: string;
    run_id?: string;
    command_id?: string;
    sequence?: number;
    occurred_at?: string;
    retryable?: boolean;
    payloadExtra?: Record<string, unknown>;
  } = {}
): Envelope {
  const payload: Record<string, unknown> = {
    code,
    message,
    retryable: opts.retryable ?? false,
    ...(opts.payloadExtra ?? {}),
  };
  return createEnvelope('error', opts.type ?? 'error', payload, {
    message_id: opts.message_id ?? generateMessageId(),
    session_id: opts.session_id,
    run_id: opts.run_id,
    command_id: opts.command_id,
    occurred_at: opts.occurred_at ?? nowIso8601Utc(),
    sequence: opts.sequence,
  });
}

// ---------------------------------------------------------------------------
// Convenience: check if envelope should be ignored (unknown server event)
// ---------------------------------------------------------------------------

export function shouldIgnoreEnvelope(envelope: Envelope): boolean {
  if (envelope.kind === 'event' && !isKnownEventType(envelope.type) && !isKnownServerEventType(envelope.type)) {
    return true;
  }
  if (envelope.kind === 'ack' && !isKnownAckType(envelope.type) && !isKnownServerEventType(envelope.type)) {
    // ack unknown — also ignore
    return true;
  }
  return false;
}

// Re-export for test compat
export const KNOWN_TYPES = {
  commands: KNOWN_COMMAND_TYPES,
  events: KNOWN_EVENT_TYPES,
  acks: KNOWN_ACK_TYPES,
  server: KNOWN_SERVER_TYPES,
};
