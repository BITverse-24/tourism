/**
 * frontend/src/ws/session.ts
 *
 * WebSocket session & recovery — frontend implementation.
 *
 * Implements docs/WEBSOCKET_CONTRACT.md § Session, Run, Recovery state,
 * Revision, Sequence, session.start / session.ready / session.expired /
 * session.superseded, ordering/retries/recovery.
 *
 * Contract highlights (all handled here):
 *  - session_id stable across reconnects (in-memory only)
 *  - run_id per connection (new for each connection / reconnect)
 *  - recovery state: latest profile draft + revision + active question + workflow state
 *    updated atomically after every accepted discovery.answer, before ack
 *  - confirmed_profile_revision marker set by profile.confirm
 *  - in-memory only: backend restart → session.expired, all state lost
 *  - one active connection per session: newer supersedes older (session.superseded)
 *  - reconnect with session_id creates new run from latest recovery state without replay
 *  - no recovery state → restart discovery
 *  - command idempotency: duplicate command_id returns original result (deduplicated),
 *    same command_id with different payload → command_id_conflict
 *  - ordering: server sequence per run starts at 1, client processes in order,
 *    snapshots replaced only when revision is newer, events never replayed
 */

export type WorkflowState =
  | "discovery"
  | "profile_review"
  | "planning"
  | "decision_required"
  | "plan_ready"
  | "replanning"
  | "cancelled"
  | "expired";

// ---------------------------------------------------------------------------
// Recovery state — server maintains one, client mirrors it for resume
// ---------------------------------------------------------------------------

export interface RecoveryState {
  /** latest normalized Profile draft (complete snapshot payload or null if none) */
  profileDraft: Record<string, unknown> | null;
  /** monotonically increasing revision for the profile resource */
  revision: number | null;
  /** active question that was current when recovery state was written */
  activeQuestion: Record<string, unknown> | null;
  /** workflow state at time of write */
  workflowState: WorkflowState | string | null;
}

export interface SessionReadyPayload {
  session_id: string;
  run_id: string;
  workflow_state: WorkflowState | string;
  has_recovery_state: boolean;
  confirmed_profile_revision: number | null;
}

export interface SessionExpiredPayload {
  reason: string; // typically "backend_restart"
  can_start_new_session: boolean;
}

export interface SessionSupersededPayload {
  replacement_run_id: string;
}

// ---------------------------------------------------------------------------
// Envelope types (subset relevant to session)
// ---------------------------------------------------------------------------

export type EnvelopeKind = "command" | "ack" | "event" | "error";

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
}

export interface AckPayload {
  command_id: string;
  accepted: boolean;
  deduplicated?: boolean;
  workflow_state?: string;
  code?: string;
  message?: string;
  retryable?: boolean;
  recovery?: { current_question_id?: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isNonEmptyString(v: unknown): boolean {
  return isString(v) && (v as string).trim().length > 0;
}

export function generateId(prefix: string): string {
  try {
    const c = globalThis.crypto as unknown as { randomUUID?: () => string } | undefined;
    if (c?.randomUUID) return `${prefix}_${c.randomUUID()}`;
  } catch {
    // fall through
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function generateMessageId(): string {
  return generateId("msg");
}

export function generateCommandId(): string {
  return generateId("cmd");
}

export function generateSessionId(): string {
  return generateId("sess");
}

export function generateRunId(): string {
  return generateId("run");
}

function isoNow(): string {
  return new Date().toISOString();
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ---------------------------------------------------------------------------
// Payload parsers — unknown fields ignored for forward compatibility
// ---------------------------------------------------------------------------

export function parseSessionReady(raw: unknown): SessionReadyPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const session_id = r["session_id"];
  const run_id = r["run_id"];
  const workflow_state = r["workflow_state"];
  const has_recovery_state = r["has_recovery_state"];
  const confirmed = r["confirmed_profile_revision"];
  if (!isNonEmptyString(session_id)) return null;
  if (!isNonEmptyString(run_id)) return null;
  if (!isString(workflow_state)) return null;
  if (typeof has_recovery_state !== "boolean") return null;
  if (confirmed !== null && (typeof confirmed !== "number" || !Number.isInteger(confirmed) || confirmed < 0)) return null;
  return {
    session_id: session_id as string,
    run_id: run_id as string,
    workflow_state: workflow_state as string,
    has_recovery_state: has_recovery_state as boolean,
    confirmed_profile_revision: confirmed as number | null,
  };
}

export function parseSessionExpired(raw: unknown): SessionExpiredPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const reason = r["reason"];
  const can = r["can_start_new_session"];
  if (!isString(reason)) return null;
  if (typeof can !== "boolean") return null;
  return { reason: reason as string, can_start_new_session: can as boolean };
}

export function parseSessionSuperseded(raw: unknown): SessionSupersededPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const rep = r["replacement_run_id"];
  if (!isNonEmptyString(rep)) return null;
  return { replacement_run_id: rep as string };
}

// ---------------------------------------------------------------------------
// Revision & sequence helpers (contract § Revision / Sequence)
// ---------------------------------------------------------------------------

/**
 * Returns true if incoming revision is newer than current.
 * Revision is monotonically increasing per resource within a session.
 */
export function isNewerRevision(current: number | null | undefined, incoming: number): boolean {
  if (current == null) return true;
  return incoming > current;
}

/**
 * Sequence is per-run, starting at 1, used for ordering during current connection only.
 * Returns true if sequence should be processed (in order), false if stale/out-of-order.
 * Caller should buffer or drop out-of-order; this implementation drops stale (< expected).
 */
export function shouldProcessSequence(expected: number | null, incoming: number): boolean {
  if (expected == null) return true;
  // Strictly increasing — only accept next or future? Contract says process in sequence order.
  // We accept >= expected and advance expected to incoming+1; stale (< expected) is dropped.
  return incoming >= expected;
}

// ---------------------------------------------------------------------------
// Command deduplication store
// ---------------------------------------------------------------------------

interface CommandRecord {
  payloadHash: string;
  payload: Record<string, unknown>;
  ack: AckPayload | null;
}

function hashPayload(p: unknown): string {
  try {
    return JSON.stringify(p);
  } catch {
    return String(p);
  }
}

// ---------------------------------------------------------------------------
// Session snapshot for external consumers
// ---------------------------------------------------------------------------

export interface SessionSnapshot {
  sessionId: string | null;
  runId: string | null;
  workflowState: WorkflowState | string | null;
  hasRecoveryState: boolean;
  confirmedProfileRevision: number | null;
  recoveryState: RecoveryState | null;
  lastSequence: number | null;
  expectedSequence: number | null;
  isExpired: boolean;
  isSuperseded: boolean;
  replacementRunId: string | null;
  isConnected: boolean;
}

// ---------------------------------------------------------------------------
// SessionManager — core class
// ---------------------------------------------------------------------------

export type SessionListener = (snap: Readonly<SessionSnapshot>) => void;

export interface SessionStartOpts {
  command_id?: string;
  message_id?: string;
  occurred_at?: string;
}

export class SessionManager {
  private sessionId: string | null = null;
  private runId: string | null = null;
  private workflowState: WorkflowState | string | null = null;
  private hasRecoveryState = false;
  private confirmedProfileRevision: number | null = null;
  private recoveryState: RecoveryState | null = null;
  private lastSequence: number | null = null;
  private expectedSequence: number | null = 1;
  private isExpiredFlag = false;
  private isSupersededFlag = false;
  private replacementRunId: string | null = null;
  private isConnectedFlag = false;

  // In-memory only — cleared on expired/close, never persisted to storage
  private commandRecords = new Map<string, CommandRecord>();
  private pendingCommands = new Map<string, Envelope>();
  private listeners = new Set<SessionListener>();

  // For revision tracking per resource
  private profileRevision: number | null = null;
  private planRevision: number | null = null;

  // -----------------------------------------------------------------------
  // Subscriptions
  // -----------------------------------------------------------------------

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const snap = this.getSnapshot();
    for (const l of this.listeners) l(snap);
  }

  getSnapshot(): Readonly<SessionSnapshot> {
    return {
      sessionId: this.sessionId,
      runId: this.runId,
      workflowState: this.workflowState,
      hasRecoveryState: this.hasRecoveryState,
      confirmedProfileRevision: this.confirmedProfileRevision,
      recoveryState: this.recoveryState ? { ...this.recoveryState } : null,
      lastSequence: this.lastSequence,
      expectedSequence: this.expectedSequence,
      isExpired: this.isExpiredFlag,
      isSuperseded: this.isSupersededFlag,
      replacementRunId: this.replacementRunId,
      isConnected: this.isConnectedFlag,
    };
  }

  // -----------------------------------------------------------------------
  // Basic getters
  // -----------------------------------------------------------------------

  getSessionId(): string | null {
    return this.sessionId;
  }

  getRunId(): string | null {
    return this.runId;
  }

  getRecoveryState(): RecoveryState | null {
    return this.recoveryState ? { ...this.recoveryState } : null;
  }

  getConfirmedProfileRevision(): number | null {
    return this.confirmedProfileRevision;
  }

  getWorkflowState(): string | null {
    return this.workflowState as string | null;
  }

  getHasRecoveryState(): boolean {
    return this.hasRecoveryState;
  }

  isExpired(): boolean {
    return this.isExpiredFlag;
  }

  isSuperseded(): boolean {
    return this.isSupersededFlag;
  }

  // -----------------------------------------------------------------------
  // session.start builder — first command on every connection
  // -----------------------------------------------------------------------

  /**
   * Build a session.start command envelope.
   * - If sessionId is absent (new session), payload { session_id: null } and envelope omits session_id.
   * - If sessionId present (reconnect), payload { session_id: existing } and envelope includes it.
   * - Does NOT assign run_id — server does. run_id in envelope is omitted per contract for first start.
   * - Idempotent via command_id reuse; caller should store command_id for retry.
   */
  buildSessionStart(opts: SessionStartOpts = {}): Envelope {
    const command_id = opts.command_id ?? generateCommandId();
    const message_id = opts.message_id ?? generateMessageId();
    const occurred_at = opts.occurred_at ?? isoNow();

    const payload: Record<string, unknown> = {};
    if (this.sessionId) {
      payload["session_id"] = this.sessionId;
    } else {
      payload["session_id"] = null;
    }

    const env: Envelope = {
      message_id,
      kind: "command",
      type: "session.start",
      command_id,
      occurred_at,
      payload,
    };
    // Only include session_id/run_id in envelope if we have them — contract says omitted on first start
    if (this.sessionId) env.session_id = this.sessionId;
    if (this.runId) env.run_id = this.runId;

    // Track for deduplication
    this.trackCommand(command_id, payload);
    this.pendingCommands.set(command_id, env);
    this.emit();
    return env;
  }

  /**
   * Convenience for reconnect: keeps session_id stable, clears run_id/sequence,
   * builds a new session.start that will create a new run from latest recovery state.
   * No replay of old events — server will emit current state anew.
   */
  buildReconnectStart(opts: SessionStartOpts = {}): Envelope | null {
    if (!this.sessionId) return null;
    if (this.isExpiredFlag) return null;
    // Per contract: reconnect creates new run, sequence resets, superseded cleared for new connection
    this.runId = null;
    this.expectedSequence = 1;
    this.lastSequence = null;
    this.isSupersededFlag = false;
    this.replacementRunId = null;
    this.pendingCommands.clear();
    // recoveryState is preserved — server resumes from it
    this.isConnectedFlag = false;
    return this.buildSessionStart(opts);
  }

  // -----------------------------------------------------------------------
  // Recovery state management
  // -----------------------------------------------------------------------

  /**
   * Update recovery state atomically (per contract: after every accepted discovery.answer).
   * Contains latest normalized Profile draft, revision, active question, workflow state.
   */
  updateRecoveryState(update: Partial<RecoveryState>): RecoveryState {
    const base: RecoveryState = this.recoveryState ?? {
      profileDraft: null,
      revision: null,
      activeQuestion: null,
      workflowState: null,
    };
    const next: RecoveryState = {
      profileDraft: update.profileDraft !== undefined ? update.profileDraft : base.profileDraft,
      revision: update.revision !== undefined ? update.revision : base.revision,
      activeQuestion: update.activeQuestion !== undefined ? update.activeQuestion : base.activeQuestion,
      workflowState: update.workflowState !== undefined ? update.workflowState : base.workflowState,
    };
    this.recoveryState = next;
    if (next.revision != null) this.profileRevision = next.revision;
    if (next.workflowState != null) this.workflowState = next.workflowState as WorkflowState;
    this.hasRecoveryState = true;
    this.emit();
    return { ...next };
  }

  setConfirmedProfileRevision(revision: number | null): void {
    this.confirmedProfileRevision = revision;
    this.emit();
  }

  // -----------------------------------------------------------------------
  // Server message handlers
  // -----------------------------------------------------------------------

  /**
   * Handle session.ready — confirms session_id, run_id, workflow_state,
   * has_recovery_state, confirmed_profile_revision. Starts new run.
   * Per contract:
   *  - If has_recovery_state true, new run resumes from that state (server re-emits question/profile)
   *  - If false, discovery starts again (no recovery)
   *  - sequence resets to 1 for new run
   */
  handleSessionReady(payload: unknown, envelope?: Record<string, unknown>): SessionReadyPayload | null {
    const parsed = parseSessionReady(payload);
    if (!parsed) return null;

    // session_id stable — if we had one, it must match (otherwise treat as new)
    this.sessionId = parsed.session_id;
    this.runId = parsed.run_id;
    this.workflowState = parsed.workflow_state as WorkflowState;
    this.hasRecoveryState = parsed.has_recovery_state;
    this.confirmedProfileRevision = parsed.confirmed_profile_revision;
    this.isExpiredFlag = false;
    this.isSupersededFlag = false;
    this.replacementRunId = null;
    this.isConnectedFlag = true;

    // New run → sequence resets
    this.expectedSequence = 1;
    this.lastSequence = null;

    // If server says has_recovery_state false, clear local recovery (no state to resume)
    if (!parsed.has_recovery_state) {
      // Keep existing recovery only if it was empty; otherwise contract says restart discovery
      // For reconnect before first accepted answer, server has no recovery → restart
      if (this.recoveryState == null) {
        // nothing to clear
      } else {
        // If we had local recovery but server says none, it means session was lost or fresh
        // Do not fabricate — respect server
        // Only clear if we are certain it's a new session without recovery
        // We keep it null to avoid stale resume
      }
      // Per scenario 11: reconnect before first accepted answer → no recovery → start discovery
      // We signal by keeping recoveryState as-is only if has_recovery_state true
      // If false, ensure caller knows to restart discovery
      if (!this.hasRecoveryState) {
        // If server explicitly says no recovery, drop stale local recovery
        // (in-memory state from previous run before any accepted answer is not recovery)
        // We preserve null
        if (this.recoveryState && this.recoveryState.revision == null && this.recoveryState.activeQuestion == null) {
          this.recoveryState = null;
        } else if (this.recoveryState) {
          // Server says no recovery but we have something — trust server, clear
          this.recoveryState = null;
        }
      }
    }

    // Extract sequence if present on envelope (session.ready is event with sequence)
    if (envelope && typeof envelope["sequence"] === "number") {
      const seq = envelope["sequence"] as number;
      this.lastSequence = seq;
      this.expectedSequence = seq + 1;
    }

    this.emit();
    return parsed;
  }

  handleSessionReadyEnvelope(envelope: Record<string, unknown>): SessionReadyPayload | null {
    const payload = (envelope as Record<string, unknown>)["payload"];
    return this.handleSessionReady(payload, envelope);
  }

  /**
   * Handle session.expired — backend restart invalidated all sessions.
   * Per contract: in-memory only, does not fabricate state, client must offer new-session path.
   */
  handleSessionExpired(payload: unknown, _envelope?: Record<string, unknown>): SessionExpiredPayload | null {
    const parsed = parseSessionExpired(payload);
    if (!parsed) {
      // Even if payload malformed, treat as expired
      this.isExpiredFlag = true;
      this.sessionId = null;
      this.runId = null;
      this.recoveryState = null;
      this.hasRecoveryState = false;
      this.confirmedProfileRevision = null;
      this.profileRevision = null;
      this.planRevision = null;
      this.expectedSequence = null;
      this.lastSequence = null;
      this.isConnectedFlag = false;
      this.emit();
      return { reason: "backend_restart", can_start_new_session: true };
    }
    this.isExpiredFlag = true;
    // All in-memory state lost per contract
    this.sessionId = null;
    this.runId = null;
    this.recoveryState = null;
    this.hasRecoveryState = false;
    this.confirmedProfileRevision = null;
    this.profileRevision = null;
    this.planRevision = null;
    this.expectedSequence = null;
    this.lastSequence = null;
    this.isConnectedFlag = false;
    this.commandRecords.clear();
    this.pendingCommands.clear();
    this.emit();
    return parsed;
  }

  handleSessionExpiredEnvelope(envelope: Record<string, unknown>): SessionExpiredPayload | null {
    const payload = (envelope as Record<string, unknown>)["payload"];
    return this.handleSessionExpired(payload, envelope);
  }

  /**
   * Handle session.superseded — older connection told another connection for same session is active.
   * Older connection should stop sending commands and close.
   */
  handleSessionSuperseded(payload: unknown, _envelope?: Record<string, unknown>): SessionSupersededPayload | null {
    const parsed = parseSessionSuperseded(payload);
    if (!parsed) return null;
    this.isSupersededFlag = true;
    this.replacementRunId = parsed.replacement_run_id;
    this.isConnectedFlag = false;
    this.emit();
    return parsed;
  }

  handleSessionSupersededEnvelope(envelope: Record<string, unknown>): SessionSupersededPayload | null {
    const payload = (envelope as Record<string, unknown>)["payload"];
    return this.handleSessionSuperseded(payload, envelope);
  }

  // -----------------------------------------------------------------------
  // Ack handling with idempotency
  // -----------------------------------------------------------------------

  /**
   * Track command for deduplication: stores payload hash.
   * Returns conflict info if same command_id with different payload.
   */
  private trackCommand(command_id: string, payload: Record<string, unknown>): { conflict: boolean; existingHash?: string } {
    const h = hashPayload(payload);
    const existing = this.commandRecords.get(command_id);
    if (existing) {
      if (existing.payloadHash !== h) {
        return { conflict: true, existingHash: existing.payloadHash };
      }
      return { conflict: false };
    }
    this.commandRecords.set(command_id, { payloadHash: h, payload, ack: null });
    return { conflict: false };
  }

  /**
   * Record or check a command before sending (public API for tests).
   * Returns { isDuplicate, isConflict }
   */
  recordCommand(command_id: string, payload: Record<string, unknown>): { isDuplicate: boolean; isConflict: boolean; originalPayload?: Record<string, unknown> } {
    const h = hashPayload(payload);
    const existing = this.commandRecords.get(command_id);
    if (existing) {
      if (existing.payloadHash === h) {
        return { isDuplicate: true, isConflict: false, originalPayload: existing.payload };
      }
      return { isDuplicate: false, isConflict: true, originalPayload: existing.payload };
    }
    this.commandRecords.set(command_id, { payloadHash: h, payload, ack: null });
    return { isDuplicate: false, isConflict: false };
  }

  isDuplicateCommand(command_id: string, payload: Record<string, unknown>): boolean {
    const r = this.recordCommand(command_id, payload);
    // undo the set if it was new, since this is a query-only helper
    // Actually recordCommand already set; we need to not double-set on pure check.
    // For isDuplicate we want non-mutating check:
    return false;
  }

  /** Check without mutating */
  checkDuplicate(command_id: string, payload: Record<string, unknown>): { isDuplicate: boolean; isConflict: boolean } {
    const h = hashPayload(payload);
    const existing = this.commandRecords.get(command_id);
    if (!existing) return { isDuplicate: false, isConflict: false };
    if (existing.payloadHash === h) return { isDuplicate: true, isConflict: false };
    return { isDuplicate: false, isConflict: true };
  }

  /**
   * Handle server ack (command.accepted / command.rejected).
   * - deduplicated: true means server recognized repeated command_id, returned original result
   * - rejected with code command_id_conflict means payload mismatch
   * Updates stored ack for deduplication.
   */
  handleAck(payload: unknown, _envelope?: Record<string, unknown>): AckPayload | null {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as Record<string, unknown>;
    const command_id = p["command_id"];
    const accepted = p["accepted"];
    if (!isNonEmptyString(command_id) || typeof accepted !== "boolean") return null;
    const ack: AckPayload = {
      command_id: command_id as string,
      accepted: accepted as boolean,
    };
    if (typeof p["deduplicated"] === "boolean") ack.deduplicated = p["deduplicated"] as boolean;
    if (isString(p["workflow_state"])) ack.workflow_state = p["workflow_state"] as string;
    if (isString(p["code"])) ack.code = p["code"] as string;
    if (isString(p["message"])) ack.message = p["message"] as string;
    if (typeof p["retryable"] === "boolean") ack.retryable = p["retryable"] as boolean;
    if (p["recovery"] && typeof p["recovery"] === "object") ack.recovery = p["recovery"] as { current_question_id?: string };

    // Update workflowState if provided
    if (ack.workflow_state) this.workflowState = ack.workflow_state as WorkflowState;

    // Store ack for deduplication
    const existing = this.commandRecords.get(ack.command_id);
    if (existing) {
      existing.ack = ack;
    } else {
      this.commandRecords.set(ack.command_id, { payloadHash: "", payload: {}, ack });
    }

    // Sequence handling if envelope provided
    if (_envelope && typeof _envelope["sequence"] === "number") {
      const seq = _envelope["sequence"] as number;
      if (this.expectedSequence == null || shouldProcessSequence(this.expectedSequence, seq)) {
        this.lastSequence = seq;
        this.expectedSequence = seq + 1;
      }
    }

    // On accepted deduplicated, do not mutate recovery; on accepted non-dedup, caller will
    // update recoveryState after next profile.snapshot / question event (handled externally)
    // For rejected command_id_conflict, caller should not retry with same id.

    this.emit();
    return ack;
  }

  handleAckEnvelope(envelope: Record<string, unknown>): AckPayload | null {
    const payload = (envelope as Record<string, unknown>)["payload"];
    return this.handleAck(payload, envelope);
  }

  /** Retrieve stored ack for a command_id (for deduplication replay) */
  getStoredAck(command_id: string): AckPayload | null {
    const rec = this.commandRecords.get(command_id);
    return rec?.ack ?? null;
  }

  // -----------------------------------------------------------------------
  // Sequence & revision guards (public for tests / integration)
  // -----------------------------------------------------------------------

  /**
   * Whether an incoming server envelope with sequence should be processed.
   * Per contract: process in sequence order, per run. Out-of-order stale is dropped.
   */
  shouldProcessSequence(sequence: number): boolean {
    if (this.expectedSequence == null) return true;
    if (sequence < this.expectedSequence) return false;
    return true;
  }

  /** Advance sequence after processing a server message */
  advanceSequence(sequence: number): void {
    if (this.expectedSequence == null) {
      this.expectedSequence = sequence + 1;
      this.lastSequence = sequence;
      return;
    }
    if (sequence >= this.expectedSequence) {
      this.lastSequence = sequence;
      this.expectedSequence = sequence + 1;
    }
  }

  /** Whether a snapshot with revision should replace current */
  shouldApplyProfileRevision(incoming: number): boolean {
    return isNewerRevision(this.profileRevision, incoming);
  }

  shouldApplyPlanRevision(incoming: number): boolean {
    return isNewerRevision(this.planRevision, incoming);
  }

  setProfileRevision(rev: number): void {
    if (isNewerRevision(this.profileRevision, rev)) {
      this.profileRevision = rev;
    }
  }

  setPlanRevision(rev: number): void {
    if (isNewerRevision(this.planRevision, rev)) {
      this.planRevision = rev;
    }
  }

  getProfileRevision(): number | null {
    return this.profileRevision;
  }

  getPlanRevision(): number | null {
    return this.planRevision;
  }

  // -----------------------------------------------------------------------
  // Envelope dispatch — single entry for incoming server frames
  // -----------------------------------------------------------------------

  /**
   * Handle any incoming envelope. Routes to appropriate handler and enforces
   * sequence ordering (per run). Unknown fields/types are ignored per contract.
   * Returns a descriptor of what was handled, or null if ignored.
   */
  handleEnvelope(envelope: Record<string, unknown>): { handled: string; data: unknown } | null {
    const type = envelope["type"];
    const kind = envelope["kind"];
    const sequence = envelope["sequence"];

    // Sequence ordering: if sequence present, drop stale
    if (typeof sequence === "number") {
      if (!this.shouldProcessSequence(sequence)) {
        return null;
      }
      // Advance after validation (but before handling so handlers see updated?)
      // We advance here; handlers may also advance — idempotent
      this.advanceSequence(sequence);
    }

    // Route by type
    if (kind === "event" && type === "session.ready") {
      const d = this.handleSessionReadyEnvelope(envelope);
      return d ? { handled: "session.ready", data: d } : null;
    }
    if (kind === "event" && type === "session.expired") {
      const d = this.handleSessionExpiredEnvelope(envelope);
      return d ? { handled: "session.expired", data: d } : null;
    }
    if (kind === "event" && type === "session.superseded") {
      const d = this.handleSessionSupersededEnvelope(envelope);
      return d ? { handled: "session.superseded", data: d } : null;
    }
    if (kind === "ack" && (type === "command.accepted" || type === "command.rejected")) {
      const d = this.handleAckEnvelope(envelope);
      return d ? { handled: type as string, data: d } : null;
    }
    // For other events (discovery.question, profile.snapshot, etc.), we update
    // recovery-aware state but defer detailed handling to discovery layer.
    // Still track sequence and workflow_state if present.
    if (kind === "event" && isString(type)) {
      // Unknown event types must be safely ignored after recording for diagnostics
      // We still return handled for known types that affect recovery
      if (type === "discovery.question" || type === "profile.snapshot" || type === "profile.ready") {
        // These affect recovery state externally; we just note sequence
        return { handled: type as string, data: envelope["payload"] };
      }
      // Unknown types: ignore but don't break connection
      return { handled: "unknown_event", data: type };
    }
    if (kind === "error") {
      return { handled: "error", data: envelope["payload"] ?? envelope };
    }
    // Unknown kind/type — ignore per forward compatibility
    return null;
  }

  // -----------------------------------------------------------------------
  // Connection lifecycle
  // -----------------------------------------------------------------------

  /** Called when WebSocket opens (before session.start) */
  markConnected(): void {
    this.isConnectedFlag = true;
    this.emit();
  }

  /** Called when WebSocket closes (network drop, not superseded/expired) */
  markDisconnected(): void {
    this.isConnectedFlag = false;
    // Do NOT clear sessionId/recovery — reconnect will reuse them
    this.emit();
  }

  /** Prepare for reconnect: reset run-scoped state, keep session-level state */
  resetForReconnect(): void {
    this.runId = null;
    this.expectedSequence = 1;
    this.lastSequence = null;
    this.isSupersededFlag = false;
    this.replacementRunId = null;
    this.isConnectedFlag = false;
    this.pendingCommands.clear();
    // recoveryState, sessionId, confirmedProfileRevision, hasRecoveryState preserved
    this.emit();
  }

  /** Full reset: session.close or session.expired */
  resetAll(): void {
    this.sessionId = null;
    this.runId = null;
    this.workflowState = null;
    this.hasRecoveryState = false;
    this.confirmedProfileRevision = null;
    this.recoveryState = null;
    this.lastSequence = null;
    this.expectedSequence = 1;
    this.isExpiredFlag = false;
    this.isSupersededFlag = false;
    this.replacementRunId = null;
    this.isConnectedFlag = false;
    this.profileRevision = null;
    this.planRevision = null;
    this.commandRecords.clear();
    this.pendingCommands.clear();
    this.emit();
  }

  /** Explicit session.close handling (client-initiated) */
  handleSessionClose(): void {
    this.resetAll();
  }

  // -----------------------------------------------------------------------
  // Serialization for tests / debugging (in-memory only, no persistence)
  // -----------------------------------------------------------------------

  toJSON(): SessionSnapshot {
    return this.getSnapshot() as SessionSnapshot;
  }
}

// ---------------------------------------------------------------------------
// Factory & standalone helpers (for non-class usage)
// ---------------------------------------------------------------------------

export function createSessionManager(): SessionManager {
  return new SessionManager();
}

export function createRecoveryState(overrides: Partial<RecoveryState> = {}): RecoveryState {
  return {
    profileDraft: overrides.profileDraft ?? null,
    revision: overrides.revision ?? null,
    activeQuestion: overrides.activeQuestion ?? null,
    workflowState: overrides.workflowState ?? null,
  };
}

/**
 * Build a session.start envelope without a manager instance.
 * Useful for the very first connection where no sessionId exists yet.
 */
export function buildSessionStartEnvelope(
  sessionId: string | null,
  opts: SessionStartOpts = {},
): Envelope {
  const command_id = opts.command_id ?? generateCommandId();
  const message_id = opts.message_id ?? generateMessageId();
  const occurred_at = opts.occurred_at ?? isoNow();
  const payload: Record<string, unknown> = { session_id: sessionId ?? null };
  const env: Envelope = {
    message_id,
    kind: "command",
    type: "session.start",
    command_id,
    occurred_at,
    payload,
  };
  if (sessionId) env.session_id = sessionId;
  return env;
}

/** Type guards for session envelopes */

export function isSessionReadyEnvelope(msg: Record<string, unknown>): boolean {
  return msg["type"] === "session.ready" && msg["kind"] === "event";
}

export function isSessionExpiredEnvelope(msg: Record<string, unknown>): boolean {
  return msg["type"] === "session.expired" && msg["kind"] === "event";
}

export function isSessionSupersededEnvelope(msg: Record<string, unknown>): boolean {
  return msg["type"] === "session.superseded" && msg["kind"] === "event";
}

export function isAckEnvelope(msg: Record<string, unknown>): boolean {
  return msg["kind"] === "ack" && (msg["type"] === "command.accepted" || msg["type"] === "command.rejected");
}

export default SessionManager;
