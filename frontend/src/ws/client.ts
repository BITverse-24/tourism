/**
 * Unified WebSocket client orchestrating the contract ordering / retries / error handling.
 * Implements docs/WEBSOCKET_CONTRACT.md sections:
 *  - Ordering / retries / recovery
 *  - Error handling
 *  - Compatibility
 *  - Contract invariants
 *  - Acceptance scenarios
 *
 * Design goals:
 *  - Sequence ordering per run starting at 1, buffer out-of-order, drop stale duplicates
 *  - Snapshot replacement only when revision is newer (strictly increasing)
 *  - command_id unique per run, duplicate returns original without side-effect,
 *    command_id_conflict when same id different payload
 *  - At-least-once safe handling, no replay after disconnect, new run from latest recovery state
 *  - invalid workflow state rejected with workflow_state + recovery info
 *  - invalid_envelope vs command.rejected distinction, stable codes, retryable flag
 *  - Errors never include stack traces / secrets
 *  - Forward compatibility: unknown fields ignored, unknown event types safely ignored
 *  - Integrates with other ws/*.ts modules via optional dynamic imports (see index.ts)
 */

// ---------------------------------------------------------------------------
// Stable contract constants
// ---------------------------------------------------------------------------

export const STABLE_REJECTION_CODES = [
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

export type StableCode = typeof STABLE_REJECTION_CODES[number];

export const RETRYABLE_CODES: ReadonlySet<StableCode> = new Set<StableCode>([
  'question_not_current',
  'invalid_workflow_state',
  'run_cancelled',
  // transient infrastructure
  'session_not_found',
]);

// Non-retryable by default include invalid_envelope, unsupported_message_type, invalid_selection, etc.
// Server may override via retryable flag on payload; we trust server flag when present.

export const KNOWN_KINDS = ['command', 'ack', 'event', 'error'] as const;
export const KNOWN_ACK_TYPES = ['command.accepted', 'command.rejected'] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Kind = 'command' | 'ack' | 'event' | 'error';
export type WorkflowState =
  | 'discovery'
  | 'profile_review'
  | 'planning'
  | 'decision_required'
  | 'plan_ready'
  | 'cancelled'
  | 'expired'
  | 'replanning';

export interface Envelope {
  message_id: string;
  kind: Kind;
  type: string;
  session_id?: string | null;
  run_id?: string | null;
  command_id?: string | null;
  sequence?: number | null;
  occurred_at: string;
  payload: Record<string, unknown>;
  // forward-compat: unknown fields are allowed, we keep them but ignore
  [k: string]: unknown;
}

export interface AckAcceptedPayload {
  command_id: string;
  accepted: true;
  deduplicated: boolean;
  workflow_state: WorkflowState;
}

export interface AckRejectedPayload {
  command_id: string;
  accepted: false;
  code: StableCode | string;
  message: string;
  retryable: boolean;
  workflow_state: WorkflowState;
  recovery?: Record<string, unknown> | null;
}

export interface ErrorPayload {
  code: StableCode | string;
  message: string;
  retryable: boolean;
}

export interface RecoveryState {
  profile_draft?: Record<string, unknown> | null;
  profile_revision?: number | null;
  active_question_id?: string | null;
  current_question_id?: string | null;
  discovery_workflow_state?: WorkflowState | null;
  workflow_state?: WorkflowState | null;
  confirmed_profile_revision?: number | null;
  has_recovery_state?: boolean;
}

export interface SnapshotMeta {
  revision: number;
  state?: string;
}

// ---------------------------------------------------------------------------
// Error sanitization — never leak stacks / secrets
// ---------------------------------------------------------------------------

const SECRET_KEYS = ['secret', 'password', 'token', 'api_key', 'apikey', 'credential', 'provider', 'stack'];

export function sanitizeMessage(raw: unknown): string {
  if (typeof raw !== 'string') raw = String(raw ?? '');
  let msg = String(raw);
  // strip things that look like stack traces
  msg = msg.replace(/at\s+.*\(.*:\d+:\d+\)/g, '');
  msg = msg.replace(/stack\s*:/gi, '');
  // truncate
  if (msg.length > 500) msg = msg.slice(0, 500);
  return msg.trim() || 'An error occurred';
}

export function sanitizeErrorPayload(code: string, message: string, retryable: boolean, extra?: Record<string, unknown>): ErrorPayload & Record<string, unknown> {
  const safe: Record<string, unknown> = {
    code,
    message: sanitizeMessage(message),
    retryable: !!retryable,
  };
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (SECRET_KEYS.some(sk => k.toLowerCase().includes(sk))) continue;
      if (k === 'stack' || k === 'stackTrace' || k === 'stack_trace') continue;
      safe[k] = v;
    }
  }
  return safe as ErrorPayload & Record<string, unknown>;
}

export function createInvalidEnvelopeError(message = 'invalid envelope', retryable = false): Envelope {
  return {
    message_id: genMessageId(),
    kind: 'error',
    type: 'error',
    occurred_at: new Date().toISOString(),
    payload: sanitizeErrorPayload('invalid_envelope', message, retryable),
  };
}

export function createCommandRejected(
  commandId: string,
  code: StableCode | string,
  message: string,
  workflowState: WorkflowState,
  retryable: boolean,
  recovery?: Record<string, unknown> | null,
): Envelope {
  const payload: AckRejectedPayload = {
    command_id: commandId,
    accepted: false,
    code,
    message: sanitizeMessage(message),
    retryable,
    workflow_state: workflowState,
    ...(recovery ? { recovery } : {}),
  };
  return {
    message_id: genMessageId(),
    kind: 'ack',
    type: 'command.rejected',
    command_id: commandId,
    occurred_at: new Date().toISOString(),
    payload: payload as unknown as Record<string, unknown>,
  };
}

// ---------------------------------------------------------------------------
// ID / hash helpers
// ---------------------------------------------------------------------------

export function genMessageId(): string {
  try {
    // @ts-ignore
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return `msg_${crypto.randomUUID()}`;
  } catch {}
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function genCommandId(): string {
  try {
    // @ts-ignore
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return `cmd_${crypto.randomUUID()}`;
  } catch {}
  return `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function genRunId(): string {
  try {
    // @ts-ignore
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return `run_${crypto.randomUUID()}`;
  } catch {}
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function stableStringify(obj: unknown): string {
  if (obj === null || obj === undefined) return '';
  if (typeof obj !== 'object') return String(obj);
  try {
    // deterministic JSON — sort keys
    return JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort());
  } catch {
    return String(obj);
  }
}

function payloadHash(payload: Record<string, unknown>): string {
  return stableStringify(payload);
}

// ---------------------------------------------------------------------------
// Envelope validation — invalid_envelope vs command.rejected
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  code?: StableCode | string;
  message?: string;
  retryable?: boolean;
  isEnvelopeError?: boolean; // true => kind:error, false => ack:command.rejected
}

/**
 * Validate envelope shape.
 * Envelope errors that cannot be associated with a command => kind:error / invalid_envelope
 * Command-specific validation => kind:ack / command.rejected
 */
export function validateEnvelope(env: unknown): ValidationResult {
  if (!env || typeof env !== 'object') {
    return { valid: false, code: 'invalid_envelope', message: 'payload must be an object', retryable: false, isEnvelopeError: true };
  }
  const e = env as Record<string, unknown>;
  if (typeof e.message_id !== 'string' || !e.message_id) {
    return { valid: false, code: 'invalid_envelope', message: 'message_id is required', retryable: false, isEnvelopeError: true };
  }
  if (typeof e.kind !== 'string' || !(KNOWN_KINDS as readonly string[]).includes(e.kind as string)) {
    return { valid: false, code: 'invalid_envelope', message: 'kind must be one of command, ack, event, error', retryable: false, isEnvelopeError: true };
  }
  if (typeof e.type !== 'string' || !e.type) {
    return { valid: false, code: 'invalid_envelope', message: 'type is required', retryable: false, isEnvelopeError: true };
  }
  if (typeof e.occurred_at !== 'string' || !e.occurred_at) {
    return { valid: false, code: 'invalid_envelope', message: 'occurred_at is required', retryable: false, isEnvelopeError: true };
  }
  if (e.payload !== undefined && (typeof e.payload !== 'object' || e.payload === null || Array.isArray(e.payload))) {
    return { valid: false, code: 'invalid_envelope', message: 'payload must be an object', retryable: false, isEnvelopeError: true };
  }
  // command-specific
  if (e.kind === 'command') {
    if (typeof e.command_id !== 'string' || !e.command_id) {
      return { valid: false, code: 'invalid_envelope', message: 'command_id is required for commands', retryable: false, isEnvelopeError: false };
    }
    // unknown message type => unsupported_message_type (command.rejected, not envelope error)
    // caller will handle via _isKnownCommandType
  }
  // server messages after run should have sequence
  if ((e.kind === 'ack' || e.kind === 'event' || e.kind === 'error') && e.run_id && e.sequence != null) {
    if (typeof e.sequence !== 'number' || !Number.isInteger(e.sequence) || (e.sequence as number) < 1) {
      return { valid: false, code: 'invalid_envelope', message: 'sequence must be integer >=1', retryable: false, isEnvelopeError: true };
    }
  }
  return { valid: true };
}

const KNOWN_COMMAND_TYPES = [
  'session.start',
  'discovery.answer',
  'profile.confirm',
  'profile.request_changes',
  'decision.respond',
  'replan.request',
  'run.cancel',
  'session.close',
] as const;

export function isKnownCommandType(t: string): boolean {
  return (KNOWN_COMMAND_TYPES as readonly string[]).includes(t);
}

// ---------------------------------------------------------------------------
// Sequence ordering per run — starts at 1, buffer out-of-order
// ---------------------------------------------------------------------------

export class SequenceManager {
  private expected = 1;
  private seen = new Set<number>();
  private buffer = new Map<number, Envelope>();
  private runId: string | null = null;

  reset(runId: string | null): void {
    this.runId = runId;
    this.expected = 1;
    this.seen.clear();
    this.buffer.clear();
  }

  getRunId(): string | null { return this.runId; }
  getExpected(): number { return this.expected; }

  /**
   * Offer an envelope with sequence. Returns list of envelopes ready to process in order.
   * - Duplicate sequence => ignored
   * - Stale (< expected) => ignored
   * - Gap => buffered until gap fills
   * - No sequence => returned immediately (e.g., pre-run messages)
   */
  offer(env: Envelope): Envelope[] {
    const seq = env.sequence as number | undefined;
    if (seq == null) {
      // No sequence — process immediately (e.g., session.ready before run, or error without sequence)
      return [env];
    }
    if (!Number.isInteger(seq) || seq < 1) return [];
    if (this.seen.has(seq)) return [];
    if (seq < this.expected) return [];
    this.seen.add(seq);
    if (seq === this.expected) {
      const out: Envelope[] = [env];
      this.expected++;
      // drain buffer contiguously
      while (this.buffer.has(this.expected)) {
        const nxt = this.buffer.get(this.expected)!;
        this.buffer.delete(this.expected);
        out.push(nxt);
        this.expected++;
      }
      return out;
    }
    // future — buffer
    this.buffer.set(seq, env);
    return [];
  }

  /**
   * Whether we have buffered gaps — indicates out-of-order arrival.
   */
  hasPending(): boolean { return this.buffer.size > 0; }

  getBufferedSequences(): number[] {
    return [...this.buffer.keys()].sort((a, b) => a - b);
  }

  getBufferSize(): number { return this.buffer.size; }

  /**
   * Flush buffered envelopes in sequence order when a cold-start gap
   * is deemed unrecoverable (e.g., server started at seq > 1 or
   * seq 1 was lost before subscription). Advances expected to
   * one past the highest flushed sequence.
   */
  flushWithGap(): Envelope[] {
    if (this.buffer.size === 0) return [];
    const seqs = [...this.buffer.keys()].sort((a, b) => a - b);
    const out: Envelope[] = [];
    for (const s of seqs) {
      const env = this.buffer.get(s)!;
      this.buffer.delete(s);
      out.push(env);
    }
    const max = seqs[seqs.length - 1];
    this.expected = max + 1;
    return out;
  }
}

// ---------------------------------------------------------------------------
// Snapshot revision handling — replace when revision newer, or same-rev promote
// ---------------------------------------------------------------------------

/** Rank for same-revision profile/plan state promotion. */
const SNAPSHOT_STATE_RANK: Record<string, number> = {
  draft: 0,
  ready: 1,
  confirmed: 2,
  final: 2,
};

export class SnapshotStore<T extends { revision: number }> {
  private currentRevision = 0;
  private current: T | null = null;
  private readonly name: string;

  constructor(name: string) { this.name = name; }

  get(): T | null { return this.current; }
  getRevision(): number { return this.currentRevision; }

  /**
   * Attempt to apply snapshot. Returns true if applied, false if ignored (stale).
   * Same revision is accepted only when state promotes (draft → ready → confirmed).
   */
  apply(snapshot: T): boolean {
    const rev = (snapshot as { revision?: unknown }).revision;
    if (typeof rev !== 'number' || !Number.isInteger(rev) || rev < 0) return false;
    if (rev > this.currentRevision) {
      this.currentRevision = rev;
      this.current = snapshot;
      return true;
    }
    if (rev === this.currentRevision && this.current) {
      const prevState = (this.current as { state?: string }).state;
      const nextState = (snapshot as { state?: string }).state;
      const prevRank = SNAPSHOT_STATE_RANK[prevState ?? ''] ?? -1;
      const nextRank = SNAPSHOT_STATE_RANK[nextState ?? ''] ?? -1;
      if (nextRank > prevRank) {
        this.current = snapshot;
        return true;
      }
    }
    return false;
  }

  reset(): void {
    this.currentRevision = 0;
    this.current = null;
  }
}

// ---------------------------------------------------------------------------
// Command registry — unique per run, duplicate handling, conflict detection
// ---------------------------------------------------------------------------

export interface RegisteredCommand {
  command_id: string;
  type: string;
  payload: Record<string, unknown>;
  hash: string;
  sentAt: string;
  ack?: Envelope | null;
}

export class CommandRegistry {
  private map = new Map<string, RegisteredCommand>();
  private runId: string | null = null;

  reset(runId: string | null): void {
    this.runId = runId;
    this.map.clear();
  }

  getRunId(): string | null { return this.runId; }

  /**
   * Register a new command. Validates uniqueness rules.
   * - If command_id unseen => store and return { ok: true, deduplicated: false }
   * - If same id same payload => return { ok: true, deduplicated: true, original: entry }
   * - If same id different payload => return { ok: false, conflict: true }
   */
  register(commandId: string, type: string, payload: Record<string, unknown>): { ok: boolean; deduplicated?: boolean; conflict?: boolean; entry?: RegisteredCommand } {
    const hash = payloadHash(payload);
    const existing = this.map.get(commandId);
    if (!existing) {
      const entry: RegisteredCommand = { command_id: commandId, type, payload, hash, sentAt: new Date().toISOString(), ack: null };
      this.map.set(commandId, entry);
      return { ok: true, deduplicated: false, entry };
    }
    if (existing.hash === hash && existing.type === type) {
      return { ok: true, deduplicated: true, entry: existing };
    }
    return { ok: false, conflict: true, entry: existing };
  }

  setAck(commandId: string, ack: Envelope): void {
    const e = this.map.get(commandId);
    if (e) e.ack = ack;
  }

  get(commandId: string): RegisteredCommand | undefined { return this.map.get(commandId); }
  has(commandId: string): boolean { return this.map.has(commandId); }
  count(): number { return this.map.size; }
}

// ---------------------------------------------------------------------------
// Retry / at-least-once helpers
// ---------------------------------------------------------------------------

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  baseDelayMs: 300,
  maxDelayMs: 5000,
};

export function isRetryableCode(code: string): boolean {
  return RETRYABLE_CODES.has(code as StableCode);
}

export function getRetryDelay(attempt: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): number {
  const exp = policy.baseDelayMs * Math.pow(2, attempt);
  return Math.min(exp, policy.maxDelayMs);
}

// ---------------------------------------------------------------------------
// Main client
// ---------------------------------------------------------------------------

export type WsClientOptions = {
  url?: string;
  retryPolicy?: RetryPolicy;
  createSocket?: (url: string) => WebSocket;
  onStateChange?: (state: ClientStateSnapshot) => void;
  onError?: (err: Envelope) => void;
  onEvent?: (env: Envelope) => void;
  onAck?: (env: Envelope) => void;
};

export type ClientStateSnapshot = {
  sessionId: string | null;
  runId: string | null;
  workflowState: WorkflowState;
  expectedSequence: number;
  profileRevision: number;
  planRevision: number;
  recoveryState: RecoveryState | null;
  connected: boolean;
  hasRecoveryState: boolean;
};

export type ConnectionState = 'idle' | 'connecting' | 'open' | 'closed';

import { SocketTransport } from './socketTransport'

export class WsClient {
  // identity
  private sessionId: string | null = null;
  private runId: string | null = null;
  private workflowState: WorkflowState = 'discovery';
  private recoveryState: RecoveryState | null = null;

  // ordering / snapshots
  private seq = new SequenceManager();
  private profileStore = new SnapshotStore<{ revision: number; state?: string; profile?: unknown }>('profile');
  private planStore = new SnapshotStore<{ revision: number; state?: string; plan?: unknown }>('plan');
  /** Last profile.ready payload — retained so late subscribers (e.g. ProfileReview) can hydrate. */
  private profileReady: { profile_revision: number; blocking_unknowns: string[] } | null = null;

  // commands
  private commands = new CommandRegistry();

  // connection
  private ws: WebSocket | null = null;
  private sio: SocketTransport | null = null;
  private connState: ConnectionState = 'idle';
  private url: string;
  private retryPolicy: RetryPolicy;
  private createSocket?: (url: string) => WebSocket;
  private opts: WsClientOptions;
  private useSocketIO = true

  // pending acks for at-least-once retries
  private pendingRetries = new Map<string, { envelope: Envelope; attempts: number; timer: ReturnType<typeof setTimeout> | null }>();

  // diagnostics — forward compat unknown event types are recorded here without breaking
  private diagnostics: { unknownEventTypes: string[]; unknownFields: string[] } = { unknownEventTypes: [], unknownFields: [] };

  // listeners
  private listeners = new Set<(env: Envelope) => void>();

  // cold-start sequence gap handling — backend may start at seq > 1 (e.g., 4/5) for a new run;
  // strict buffering would deadlock discovery. Fast-forward after a short grace.
  private seqGapTimer: ReturnType<typeof setTimeout> | null = null;
  private seqGapGraceMs = 500;
  private runStartAt: number | null = null;

  constructor(opts: WsClientOptions = {}) {
    this.url = opts.url ?? 'ws://localhost:8000/ws';
    this.retryPolicy = opts.retryPolicy ?? DEFAULT_RETRY_POLICY;
    this.createSocket = opts.createSocket;
    this.opts = opts;
  }

  // -- state getters ---------------------------------------------------------

  getSessionId(): string | null { return this.sessionId; }
  getRunId(): string | null { return this.runId; }
  getWorkflowState(): WorkflowState { return this.workflowState; }
  getRecoveryState(): RecoveryState | null { return this.recoveryState; }
  getProfileSnapshot(): { revision: number; state?: string; profile?: unknown } | null { return this.profileStore.get(); }
  getProfileReady(): { profile_revision: number; blocking_unknowns: string[] } | null {
    return this.profileReady ? { ...this.profileReady, blocking_unknowns: [...this.profileReady.blocking_unknowns] } : null;
  }
  getPlanSnapshot(): { revision: number; state?: string; plan?: unknown } | null { return this.planStore.get(); }
  getConnectionState(): ConnectionState { return this.connState; }
  getDiagnostics() { return { ...this.diagnostics, unknownEventTypes: [...this.diagnostics.unknownEventTypes] }; }

  snapshot(): ClientStateSnapshot {
    return {
      sessionId: this.sessionId,
      runId: this.runId,
      workflowState: this.workflowState,
      expectedSequence: this.seq.getExpected(),
      profileRevision: this.profileStore.getRevision(),
      planRevision: this.planStore.getRevision(),
      recoveryState: this.recoveryState,
      connected: this.connState === 'open',
      hasRecoveryState: !!this.recoveryState?.has_recovery_state,
    };
  }

  private emitState(): void {
    this.opts.onStateChange?.(this.snapshot());
  }

  // -- run lifecycle ---------------------------------------------------------

  /**
   * Start or resume a run. Called on initial connect or after reconnect.
   * - New run => sequence resets to 1, command registry resets per run (ids unique per run)
   * - Snapshots are NOT cleared on reconnect — we keep latest revision and only replace if newer
   * - No replay of missed events — caller must rely on recovery state from server
   */
  startRun(runId: string, sessionId: string | null = this.sessionId, recovery?: RecoveryState | null): void {
    // new run boundary
    this.runId = runId;
    this.sessionId = sessionId;
    this.seq.reset(runId);
    this.commands.reset(runId);
    // clear at-least-once timers from previous run — no replay after disconnect
    for (const [, pending] of this.pendingRetries) {
      if (pending.timer) clearTimeout(pending.timer);
    }
    this.pendingRetries.clear();
    if (recovery !== undefined) this.recoveryState = recovery;
    // reset cold-start gap tracking for this run
    if (this.seqGapTimer) { clearTimeout(this.seqGapTimer); this.seqGapTimer = null; }
    this.runStartAt = Date.now();
    this.emitState();
  }

  private scheduleSequenceGapFlush(): void {
    if (this.seqGapTimer) return;
    if (!this.seq.hasPending()) return;
    if (this.seq.getExpected() !== 1) return;
    // only fast-forward cold-start gaps (first message seq > 1)
    const buffered = this.seq.getBufferedSequences();
    if (buffered.length === 0) return;
    const smallest = buffered[0];
    if (smallest <= 1) return;
    this.seqGapTimer = setTimeout(() => {
      this.seqGapTimer = null;
      this.flushSequenceGap();
    }, this.seqGapGraceMs);
  }

  private flushSequenceGap(): void {
    if (!this.seq.hasPending()) return;
    if (this.seq.getExpected() !== 1) return;
    const flushed = this.seq.flushWithGap();
    if (flushed.length === 0) return;
    // diagnostic so backend contract drift is visible
    try {
      // wsLogger not imported here to avoid cycle; use console.debug and store diagnostic
      const label = flushed.map(e => `${e.type}#${e.sequence}`).join(', ');
      // record for getDiagnostics()
      this.diagnostics.unknownFields.push(`sequence gap fast-forward 1 -> ${this.seq.getExpected()}, flushed: ${label}`);
      if (typeof console !== 'undefined' && typeof console.debug === 'function') {
        console.debug(`[WsClient] sequence gap fast-forward expected 1 -> ${this.seq.getExpected()}, flushed ${flushed.length}: ${label}`);
      }
    } catch { /* ignore */ }
    for (const env of flushed) {
      if (env.kind === 'ack') this.handleAck(env);
      else if (env.kind === 'error') this.handleError(env);
      else if (env.kind === 'event') this.handleEvent(env);
      else {
        // forward unknown kinds still via listeners
        for (const l of this.listeners) l(env);
      }
    }
  }

  /** Called when server sends session.ready — authoritative */
  handleSessionReady(payload: Record<string, unknown>): void {
    const sid = payload.session_id as string | undefined;
    const rid = payload.run_id as string | undefined;
    const wf = payload.workflow_state as WorkflowState | undefined;
    const hasRecovery = payload.has_recovery_state as boolean | undefined;
    const confirmedRev = payload.confirmed_profile_revision as number | null | undefined;
    if (sid) this.sessionId = sid;
    if (rid) {
      const isNewRun = rid !== this.runId;
      if (isNewRun) this.startRun(rid, sid ?? this.sessionId, { has_recovery_state: !!hasRecovery, confirmed_profile_revision: confirmedRev ?? null });
      else {
        this.runId = rid;
        this.seq.reset(rid); // ensure sequence starts at 1 even if session.ready is first message
        if (this.seqGapTimer) { clearTimeout(this.seqGapTimer); this.seqGapTimer = null; }
        this.runStartAt = Date.now();
      }
    }
    // also cancel any pending gap flush — session.ready indicates server is authoritative for sequence start
    if (this.seqGapTimer && this.seq.getExpected() !== 1) {
      clearTimeout(this.seqGapTimer);
      this.seqGapTimer = null;
    }
    if (wf) this.workflowState = wf;
    if (payload.hasOwnProperty('has_recovery_state') || payload.hasOwnProperty('confirmed_profile_revision')) {
      this.recoveryState = {
        ...(this.recoveryState ?? {}),
        has_recovery_state: !!hasRecovery,
        confirmed_profile_revision: (confirmedRev as number | null) ?? this.recoveryState?.confirmed_profile_revision ?? null,
      };
    }
    if (hasRecovery === false) {
      // reconnect before first accepted answer — no recovery state, discovery starts fresh
      // snapshots remain at 0, workflow stays discovery
    }
    this.emitState();
  }

  handleSessionExpired(payload: Record<string, unknown>): void {
    this.workflowState = 'expired';
    this.recoveryState = null;
    this.sessionId = null;
    // snapshots become stale — reset revision tracking but keep last snapshot for UI teardown? contract says invalidate.
    this.profileStore.reset();
    this.planStore.reset();
    this.profileReady = null;
    this.emitState();
    // surface via error listener with session_expired (retryable false, can_start_new_session true)
    void payload; // payload contains reason, can_start_new_session — caller can read via event
  }

  handleSessionSuperseded(payload: Record<string, unknown>): void {
    // older connection should stop sending commands and close
    this.connState = 'closed';
    try { this.ws?.close(); } catch {}
    this.ws = null;
    void payload;
    this.emitState();
  }

  // -- command sending -------------------------------------------------------

  /**
   * Build a command envelope with unique command_id per run.
   * Enforces uniqueness: if caller reuses command_id with different payload, caller should handle
   * command_id_conflict. We generate a fresh id if none supplied.
   */
  buildCommand(type: string, payload: Record<string, unknown>, commandId?: string): Envelope {
    const cid = commandId ?? genCommandId();
    const env: Envelope = {
      message_id: genMessageId(),
      kind: 'command',
      type,
      session_id: this.sessionId ?? undefined,
      run_id: this.runId ?? undefined,
      command_id: cid,
      occurred_at: new Date().toISOString(),
      payload,
    };
    return env;
  }

  /**
   * Send a command over the socket with at-least-once tracking.
   * - Validates command type — unknown type will be rejected by server as unsupported_message_type
   * - Tracks command_id uniqueness per run, detects conflict locally before send
   * - Queues for retry if send fails and command is retryable / at-least-once
   */
  sendCommand(type: string, payload: Record<string, unknown>, commandId?: string): { envelope: Envelope; deduplicated: boolean; conflict?: boolean } {
    const env = this.buildCommand(type, payload, commandId);
    const cid = env.command_id as string;

    // local conflict detection before sending
    const reg = this.commands.register(cid, type, payload);
    if (!reg.ok && reg.conflict) {
      // surface command_id_conflict immediately without sending
      const err = createCommandRejected(cid, 'command_id_conflict', 'command_id reused with different payload', this.workflowState, false);
      this.opts.onAck?.(err);
      return { envelope: env, deduplicated: false, conflict: true };
    }
    const deduplicated = !!reg.deduplicated;
    if (deduplicated) {
      // at-least-once safe: return original result without side effect
      const original = reg.entry;
      if (original?.ack) {
        // replay original ack
        this.handleAck(original.ack);
      }
      return { envelope: env, deduplicated: true };
    }

    // actually send if connected; otherwise buffer for when connection opens
    this.sendRaw(env);
    // track for at-least-once retry until ack
    this.pendingRetries.set(cid, { envelope: env, attempts: 0, timer: null });
    this.scheduleRetry(cid);
    return { envelope: env, deduplicated: false };
  }

  // convenience wrappers matching contract commands
  sendSessionStart(sessionId?: string | null, commandId?: string): ReturnType<WsClient['sendCommand']> {
    if (sessionId !== undefined) this.sessionId = sessionId;
    return this.sendCommand('session.start', { session_id: sessionId ?? null }, commandId);
  }
  sendDiscoveryAnswer(args: { question_id: string; selected_option_ids: string[]; free_text: string }, commandId?: string) {
    return this.sendCommand('discovery.answer', args as unknown as Record<string, unknown>, commandId);
  }
  sendProfileConfirm(profileRevision: number, commandId?: string) {
    return this.sendCommand('profile.confirm', { profile_revision: profileRevision }, commandId);
  }
  sendDecisionRespond(decisionId: string, optionId: string, commandId?: string) {
    return this.sendCommand('decision.respond', { decision_id: decisionId, option_id: optionId }, commandId);
  }
  sendRunCancel(reason?: string, commandId?: string) {
    return this.sendCommand('run.cancel', { reason: reason ?? '' }, commandId);
  }

  // -- raw send / retry ------------------------------------------------------

  private sendRaw(env: Envelope): void {
    if (this.useSocketIO && this.sio) {
      if (this.sio.isConnected()) {
        try { this.sio.sendEnvelope(env) } catch { /* will retry */ }
      }
      return
    }
    if (this.ws && this.ws.readyState === 1) { // OPEN
      try { this.ws.send(JSON.stringify(env)); } catch { /* will retry */ }
    } else {
      // not connected — will be sent on open via flushPending (only for current run, no replay of old run)
      // we already have it in pendingRetries
    }
  }

  private scheduleRetry(commandId: string): void {
    const pending = this.pendingRetries.get(commandId);
    if (!pending) return;
    if (pending.attempts >= this.retryPolicy.maxRetries) return;
    const delay = getRetryDelay(pending.attempts, this.retryPolicy);
    pending.timer = setTimeout(() => {
      const cur = this.pendingRetries.get(commandId);
      if (!cur) return;
      // only retry if ack not yet received
      const reg = this.commands.get(commandId);
      if (reg?.ack) { this.pendingRetries.delete(commandId); return; }
      cur.attempts++;
      this.sendRaw(cur.envelope);
      this.scheduleRetry(commandId);
    }, delay);
  }

  private flushPending(): void {
    for (const [, pending] of this.pendingRetries) {
      this.sendRaw(pending.envelope);
    }
  }

  // -- connection handling — no replay after disconnect, new run from recovery state
  // ---------------------------------------------------------------------------

  connect(url?: string): void {
    const target = url ?? this.url;
    this.url = target;
    this.connState = 'connecting';
    this.emitState();
    if (this.useSocketIO) {
      try {
        this.sio = new SocketTransport({
          url: target,
          onEnvelope: (env, raw) => this.handleRawMessage(raw),
          onOpen: () => { this.connState = 'open'; this.emitState(); this.flushPending() },
          onClose: () => { this.connState = 'closed'; for (const [, p] of this.pendingRetries) if (p.timer) clearTimeout(p.timer); if (this.seqGapTimer) { clearTimeout(this.seqGapTimer); this.seqGapTimer = null; } this.emitState() },
          onError: () => {
            const err = sanitizeErrorPayload('invalid_envelope', 'websocket error', false);
            this.opts.onError?.({ message_id: genMessageId(), kind: 'error', type: 'error', occurred_at: new Date().toISOString(), payload: err as unknown as Record<string, unknown> } as Envelope)
          },
        })
        this.sio.connect()
      } catch (e) {
        const err = createInvalidEnvelopeError(sanitizeMessage(String(e)), false);
        this.opts.onError?.(err);
        this.connState = 'closed';
        this.emitState();
      }
      return
    }
    const factory = this.createSocket ?? ((u: string) => new WebSocket(u));
    try {
      this.ws = factory(target);
    } catch (e) {
      const err = createInvalidEnvelopeError(sanitizeMessage(String(e)), false);
      this.opts.onError?.(err);
      this.connState = 'closed';
      this.emitState();
      return;
    }
    this.ws.onopen = () => {
      this.connState = 'open';
      this.emitState();
      this.flushPending();
      // per contract: client must send session.start as first command on every connection
      // we do not auto-send here if already have session — caller decides, but we flush pending which may include session.start
    };
    this.ws.onmessage = (ev: MessageEvent) => {
      this.handleRawMessage(typeof ev.data === 'string' ? ev.data : String(ev.data));
    };
    this.ws.onclose = () => {
      this.connState = 'closed';
      // do NOT replay missed events — clear sequence buffer, keep recovery state
      // sequence will reset on next startRun
      for (const [, p] of this.pendingRetries) if (p.timer) clearTimeout(p.timer);
      if (this.seqGapTimer) { clearTimeout(this.seqGapTimer); this.seqGapTimer = null; }
      this.emitState();
    };
    this.ws.onerror = () => {
      // surface as invalid_envelope-style error without stack
      const err = sanitizeErrorPayload('invalid_envelope', 'websocket error', false);
      this.opts.onError?.({ message_id: genMessageId(), kind: 'error', type: 'error', occurred_at: new Date().toISOString(), payload: err as unknown as Record<string, unknown> } as Envelope);
    };
  }

  disconnect(): void {
    for (const [, p] of this.pendingRetries) if (p.timer) clearTimeout(p.timer);
    this.pendingRetries.clear();
    if (this.seqGapTimer) { clearTimeout(this.seqGapTimer); this.seqGapTimer = null; }
    try { this.ws?.close(); } catch {}
    try { this.sio?.disconnect(); } catch {}
    this.ws = null;
    this.sio = null;
    this.connState = 'closed';
    this.emitState();
  }

  // -- message ingress — ordering, snapshot, errors, forward compat --------
  // ---------------------------------------------------------------------------

  /**
   * Entry point for raw JSON string from WebSocket.
   * Handles envelope validation, invalid_envelope vs command.rejected, forward compat, ordering.
   */
  handleRawMessage(raw: string): void {
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch {
      const err = createInvalidEnvelopeError('invalid JSON envelope', false);
      this.opts.onError?.(err);
      return;
    }
    const v = validateEnvelope(parsed);
    if (!v.valid) {
      if (v.isEnvelopeError) {
        const err: Envelope = {
          message_id: genMessageId(),
          kind: 'error',
          type: 'error',
          occurred_at: new Date().toISOString(),
          payload: sanitizeErrorPayload(v.code ?? 'invalid_envelope', v.message ?? 'invalid envelope', !!v.retryable) as unknown as Record<string, unknown>,
        };
        this.opts.onError?.(err);
      } else {
        // command-specific validation error => command.rejected
        const p = parsed as Record<string, unknown>;
        const cid = (p.command_id as string) ?? 'unknown';
        const ack = createCommandRejected(cid, (v.code ?? 'invalid_envelope') as string, v.message ?? 'invalid envelope', this.workflowState, !!v.retryable);
        this.handleAck(ack);
      }
      return;
    }
    const env = parsed as Envelope;
    // forward compat: unknown fields are already ignored (we don't validate them)
    // unknown message type handling for commands sent by client is done server-side; for server events we handle below

    // Track unknown event types for diagnostics but do not break connection
    if (env.kind === 'event' && isUnknownServerEventType(env.type)) {
      if (!this.diagnostics.unknownEventTypes.includes(env.type)) this.diagnostics.unknownEventTypes.push(env.type);
      // safely ignore after recording — do not throw
      // still respect ordering (sequence) — we treat unknown events as ordered messages that are ignored in processing
    }

    // update ids from server
    if (env.session_id) this.sessionId = env.session_id as string;
    // run_id handling: if server indicates new run, reset sequence/command tracking
    if (env.run_id && env.run_id !== this.runId) {
      // new run from latest recovery state — reset sequence, keep snapshots (only replace when newer)
      this.startRun(env.run_id as string, (env.session_id as string) ?? this.sessionId, this.recoveryState);
    }

    // route by kind
    if (env.kind === 'ack') {
      // ack messages are ordered per run as well — apply sequence ordering
      const ordered = this.seq.offer(env);
      for (const o of ordered) this.handleAck(o);
      if (ordered.length > 0) {
        if (this.seqGapTimer) { clearTimeout(this.seqGapTimer); this.seqGapTimer = null; }
      } else if (this.seq.hasPending()) {
        this.scheduleSequenceGapFlush();
      }
      return;
    }
    if (env.kind === 'error') {
      const ordered = this.seq.offer(env);
      for (const o of ordered) this.handleError(o);
      if (ordered.length > 0) {
        if (this.seqGapTimer) { clearTimeout(this.seqGapTimer); this.seqGapTimer = null; }
      } else if (this.seq.hasPending()) {
        this.scheduleSequenceGapFlush();
      }
      return;
    }
    if (env.kind === 'event') {
      const ordered = this.seq.offer(env);
      for (const o of ordered) this.handleEvent(o);
      if (ordered.length > 0) {
        if (this.seqGapTimer) { clearTimeout(this.seqGapTimer); this.seqGapTimer = null; }
      } else if (this.seq.hasPending()) {
        this.scheduleSequenceGapFlush();
      }
      return;
    }
    if (env.kind === 'command') {
      // client should not receive commands from server in this contract — treat as invalid_envelope-ish but don't crash
      // forward compat: ignore
      return;
    }
  }

  private handleAck(env: Envelope): void {
    const payload = env.payload as unknown as AckRejectedPayload | AckAcceptedPayload;
    const cid = env.command_id ?? (payload as AckRejectedPayload).command_id;
    if (cid) {
      // record ack for deduplication / at-least-once
      this.commands.setAck(cid as string, env);
      // clear pending retry
      const pending = this.pendingRetries.get(cid as string);
      if (pending) {
        if (pending.timer) clearTimeout(pending.timer);
        this.pendingRetries.delete(cid as string);
      }
    }
    const accepted = (payload as AckAcceptedPayload).accepted;
    if (accepted === true) {
      const p = payload as AckAcceptedPayload;
      if (p.workflow_state) this.workflowState = p.workflow_state;
      // deduplicated true => server recognized duplicate, no side effect already accounted for
    } else if (accepted === false) {
      const p = payload as AckRejectedPayload;
      if (p.workflow_state) this.workflowState = p.workflow_state;
      // invalid workflow state => update recovery info if present
      if (p.code === 'invalid_workflow_state' && p.recovery) {
        this.recoveryState = { ...(this.recoveryState ?? {}), ...(p.recovery as RecoveryState) };
      }
      if (p.code === 'question_not_current' && p.recovery) {
        this.recoveryState = { ...(this.recoveryState ?? {}), ...(p.recovery as RecoveryState) };
      }
      if (p.code === 'command_id_conflict') {
        // do not clear command — caller must use new id with new payload
      }
      // ensure retryable flag is boolean and error never includes stack
      p.message = sanitizeMessage(p.message);
      // do not include stack/secrets — already sanitized
    }
    this.opts.onAck?.(env);
    this.emitState();
    for (const l of this.listeners) l(env);
  }

  private handleError(env: Envelope): void {
    const payload = env.payload as unknown as ErrorPayload;
    // sanitize
    if (payload && typeof payload.message === 'string') payload.message = sanitizeMessage(payload.message);
    // ensure retryable boolean
    if (payload && typeof payload.retryable !== 'boolean') (payload as unknown as Record<string, unknown>).retryable = false;
    // strip stack / secrets from payload if server erroneously sent them
    if (payload) {
      const p = payload as unknown as Record<string, unknown>;
      delete p.stack;
      delete p.stackTrace;
      delete p.stack_trace;
      for (const k of Object.keys(p)) if (SECRET_KEYS.some(sk => k.toLowerCase().includes(sk))) delete p[k];
    }
    if (payload?.code === 'session_expired') this.handleSessionExpired(payload as unknown as Record<string, unknown>);
    this.opts.onError?.(env);
    this.emitState();
    for (const l of this.listeners) l(env);
  }

  private handleEvent(env: Envelope): void {
    const t = env.type;

    // session lifecycle
    if (t === 'session.ready') {
      this.handleSessionReady(env.payload as Record<string, unknown>);
      this.opts.onEvent?.(env);
      for (const l of this.listeners) l(env);
      return;
    }
    if (t === 'session.expired') {
      this.handleSessionExpired(env.payload as Record<string, unknown>);
      this.opts.onEvent?.(env);
      for (const l of this.listeners) l(env);
      return;
    }
    if (t === 'session.superseded') {
      this.handleSessionSuperseded(env.payload as Record<string, unknown>);
      this.opts.onEvent?.(env);
      for (const l of this.listeners) l(env);
      return;
    }

    // snapshot handling — replace when revision newer (or same-rev state promote)
    if (t === 'profile.snapshot') {
      const snap = env.payload as unknown as { revision: number; state?: string; profile?: unknown };
      if (snap && typeof snap.revision === 'number') {
        const applied = this.profileStore.apply(snap as { revision: number; state?: string });
        if (!applied) {
          // stale revision — ignore per contract: replace only when revision newer / state promotes
          return;
        }
        // Newer draft invalidates a prior ready marker until profile.ready re-fires
        if (
          snap.state === 'draft'
          && this.profileReady
          && snap.revision >= this.profileReady.profile_revision
        ) {
          this.profileReady = null;
        }
        // also update recovery state
        this.recoveryState = { ...(this.recoveryState ?? {}), profile_revision: snap.revision };
      }
      this.opts.onEvent?.(env);
      for (const l of this.listeners) l(env);
      this.emitState();
      return;
    }
    if (t === 'plan.snapshot') {
      const snap = env.payload as unknown as { revision: number; state?: string; plan?: unknown };
      if (snap && typeof snap.revision === 'number') {
        const applied = this.planStore.apply(snap as { revision: number; state?: string });
        if (!applied) return;
      }
      this.opts.onEvent?.(env);
      for (const l of this.listeners) l(env);
      this.emitState();
      return;
    }

    // workflow events — forward compat: unknown types already recorded, known types update state
    if (t === 'discovery.question') {
      // single active question
      const qid = (env.payload as Record<string, unknown>).question_id as string | undefined;
      if (qid) this.recoveryState = { ...(this.recoveryState ?? {}), current_question_id: qid, active_question_id: qid };
    }
    if (t === 'profile.ready') {
      const payload = env.payload as Record<string, unknown>;
      const rev = payload.profile_revision as number | undefined;
      const blocking = payload.blocking_unknowns;
      if (typeof rev === 'number') {
        this.recoveryState = { ...(this.recoveryState ?? {}), profile_revision: rev };
        const unknowns = Array.isArray(blocking) && blocking.every((x) => typeof x === 'string')
          ? (blocking as string[])
          : [];
        this.profileReady = { profile_revision: rev, blocking_unknowns: unknowns };
      }
      this.workflowState = 'profile_review';
    }
    if (t === 'decision.request') {
      this.workflowState = 'decision_required';
    }
    if (t === 'workflow.completed') {
      const outcome = (env.payload as Record<string, unknown>).outcome as string | undefined;
      if (outcome === 'cancelled') this.workflowState = 'cancelled';
      else if (outcome === 'final_plan_available') this.workflowState = 'plan_ready';
    }
    // agent.lifecycle, planning.status etc. do not change workflowState necessarily — keep as is

    // forward compat: unknown fields in payload are ignored; unknown event types safely ignored after diagnostics
    this.opts.onEvent?.(env);
    for (const l of this.listeners) l(env);
    this.emitState();
  }

  // -- public helpers for testing / integration --------------------------------

  /** Process a server envelope object directly (bypasses JSON parse). Useful for unit tests. */
  handleEnvelope(env: Envelope): void {
    this.handleRawMessage(JSON.stringify(env));
  }

  /** Subscribe to all server messages that passed ordering/filtering. Returns unsubscribe. */
  subscribe(fn: (env: Envelope) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Expose sequence manager for tests */
  getSequenceManager(): SequenceManager { return this.seq; }
  /** Expose command registry for tests */
  getCommandRegistry(): CommandRegistry { return this.commands; }
  /** Expose snapshot stores for tests */
  getProfileStore(): SnapshotStore<{ revision: number; state?: string }> { return this.profileStore; }
  getPlanStore(): SnapshotStore<{ revision: number; state?: string }> { return this.planStore; }
}

// ---------------------------------------------------------------------------
// Forward compat helpers — isolated for index.ts re-export
// ---------------------------------------------------------------------------

const KNOWN_SERVER_EVENT_TYPES = [
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
] as const;

export function isUnknownServerEventType(t: string): boolean {
  return !(KNOWN_SERVER_EVENT_TYPES as readonly string[]).includes(t);
}

export function isStableCode(code: string): boolean {
  return (STABLE_REJECTION_CODES as readonly string[]).includes(code);
}

/** Sanitize any error envelope payload to ensure no stack/secrets leak — public for other ws modules. */
export function sanitizeErrorEnvelope(env: Envelope): Envelope {
  const p = env.payload as Record<string, unknown>;
  if (!p) return env;
  const copy = { ...p };
  delete copy.stack;
  delete copy.stackTrace;
  delete copy.stack_trace;
  for (const k of Object.keys(copy)) if (SECRET_KEYS.some(sk => k.toLowerCase().includes(sk))) delete copy[k];
  if (typeof copy.message === 'string') copy.message = sanitizeMessage(copy.message);
  return { ...env, payload: copy };
}
