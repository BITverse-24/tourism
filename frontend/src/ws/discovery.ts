/**
 * frontend/src/ws/discovery.ts
 *
 * WebSocket discovery & profile client contract — frontend implementation.
 *
 * Implements docs/WEBSOCKET_CONTRACT.md discovery flow as a pure,
 * server-authoritative, forward-only module. No HTTP, no local heuristics
 * for completion.
 *
 * Server is authoritative for:
 *  - when discovery is complete (profile.ready / profile.snapshot state)
 *  - validation of every answer (client pre-validates only for UX, never overrides)
 *  - workflow state transitions
 *
 * Frontend must:
 *  - render server-provided question schemas verbatim, never inferring rules from prompt/labels
 *  - enforce free_text_mode "only_if_no_option" mutually-exclusive rule client-side
 *  - send discovery.answer with idempotency via stable command_id
 *  - treat snapshots as complete replacements ordered by revision
 */

export type SelectionMode = "single" | "multiple";
export type FreeTextMode = "disabled" | "optional" | "only_if_no_option" | "required";
export type ProfileSnapshotState = "draft" | "ready" | "confirmed";

// ---------------------------------------------------------------------------
// Question schema (docs/WEBSOCKET_CONTRACT.md § Discovery question schema)
// ---------------------------------------------------------------------------

export interface DiscoveryOption {
  option_id: string;
  label: string;
  description?: string;
}

export interface DiscoveryQuestion {
  question_id: string;
  prompt: string;
  selection_mode: SelectionMode;
  required: boolean;
  options: DiscoveryOption[];
  free_text_mode: FreeTextMode;
  free_text_placeholder?: string;
}

// Raw payload as received on wire — unknown fields must be ignored
export type RawDiscoveryQuestion = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Answer command (docs/WEBSOCKET_CONTRACT.md § discovery.answer)
// ---------------------------------------------------------------------------

export interface DiscoveryAnswerPayload {
  question_id: string;
  selected_option_ids: string[];
  free_text: string;
}

export interface DiscoveryAnswerCommand {
  question_id: string;
  selected_option_ids: string[];
  free_text: string;
  command_id: string;
}

// ---------------------------------------------------------------------------
// Profile contracts (docs/WEBSOCKET_CONTRACT.md § profile.snapshot / profile.ready)
// ---------------------------------------------------------------------------

export interface ProfileSnapshot {
  revision: number;
  state: ProfileSnapshotState;
  profile: Record<string, unknown>; // Traveler Profile per TRAVELER_PROFILE_SCHEMA.md
  /** sequence of the envelope that delivered this snapshot, for ordering */
  sequence?: number;
}

export interface ProfileReady {
  profile_revision: number;
  blocking_unknowns: string[];
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ValidationCode =
  | "invalid_selection"
  | "free_text_not_allowed"
  | "free_text_required"
  | "mutual_exclusion"
  | "selection_required"
  | "too_many_selections"
  | "invalid_option_id"
  | "question_mismatch";

export interface ValidationResult {
  valid: boolean;
  code?: ValidationCode;
  message?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isNonEmptyString(v: unknown): boolean {
  return isString(v) && v.trim().length > 0;
}

function hasText(v: string): boolean {
  return v.trim().length > 0;
}

export function generateCommandId(): string {
  try {
    const c = globalThis.crypto as unknown as { randomUUID?: () => string } | undefined;
    if (c?.randomUUID) return c.randomUUID();
  } catch {
    // fall through
  }
  return `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function generateMessageId(): string {
  try {
    const c = globalThis.crypto as unknown as { randomUUID?: () => string } | undefined;
    if (c?.randomUUID) return c.randomUUID();
  } catch {
    // fall through
  }
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Schema parsing — strict, unknown fields ignored, server values respected
// ---------------------------------------------------------------------------

const VALID_SELECTION_MODES: SelectionMode[] = ["single", "multiple"];
const VALID_FREE_TEXT_MODES: FreeTextMode[] = ["disabled", "optional", "only_if_no_option", "required"];
const VALID_SNAPSHOT_STATES: ProfileSnapshotState[] = ["draft", "ready", "confirmed"];

export function parseDiscoveryQuestion(raw: unknown): DiscoveryQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const question_id = r["question_id"];
  const prompt = r["prompt"];
  const selection_mode = r["selection_mode"];
  const required = r["required"];
  const options = r["options"];
  const free_text_mode = r["free_text_mode"];

  if (!isString(question_id) || question_id.trim() === "") return null;
  if (!isString(prompt) || prompt.trim() === "") return null;
  if (!VALID_SELECTION_MODES.includes(selection_mode as SelectionMode)) return null;
  if (typeof required !== "boolean") return null;
  if (!VALID_FREE_TEXT_MODES.includes(free_text_mode as FreeTextMode)) return null;
  if (!Array.isArray(options)) return null;

  const parsedOptions: DiscoveryOption[] = [];
  for (const o of options) {
    if (!o || typeof o !== "object") return null;
    const oo = o as Record<string, unknown>;
    if (!isString(oo["option_id"]) || (oo["option_id"] as string).trim() === "") return null;
    if (!isString(oo["label"]) || (oo["label"] as string).trim() === "") return null;
    const opt: DiscoveryOption = {
      option_id: oo["option_id"] as string,
      label: oo["label"] as string,
    };
    if (oo["description"] != null) {
      if (!isString(oo["description"])) return null;
      opt.description = oo["description"] as string;
    }
    parsedOptions.push(opt);
  }

  const q: DiscoveryQuestion = {
    question_id: question_id as string,
    prompt: prompt as string,
    selection_mode: selection_mode as SelectionMode,
    required: required as boolean,
    options: parsedOptions,
    free_text_mode: free_text_mode as FreeTextMode,
  };
  const placeholder = r["free_text_placeholder"];
  if (isString(placeholder)) q.free_text_placeholder = placeholder;

  // Unknown fields are intentionally ignored — forward compatibility
  return q;
}

export function parseProfileSnapshot(raw: unknown): ProfileSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const revision = r["revision"];
  const state = r["state"];
  const profile = r["profile"];
  if (typeof revision !== "number" || !Number.isInteger(revision) || revision < 0) return null;
  if (!VALID_SNAPSHOT_STATES.includes(state as ProfileSnapshotState)) return null;
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return null;
  const snap: ProfileSnapshot = {
    revision: revision as number,
    state: state as ProfileSnapshotState,
    profile: profile as Record<string, unknown>,
  };
  if (typeof r["sequence"] === "number") snap.sequence = r["sequence"] as number;
  return snap;
}

export function parseProfileReady(raw: unknown): ProfileReady | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const rev = r["profile_revision"];
  const blocking = r["blocking_unknowns"];
  if (typeof rev !== "number" || !Number.isInteger(rev) || rev < 0) return null;
  if (!Array.isArray(blocking)) return null;
  if (!blocking.every(isString)) return null;
  return {
    profile_revision: rev as number,
    blocking_unknowns: blocking as string[],
  };
}

// ---------------------------------------------------------------------------
// Selection / free-text validation — mirrors contract, no prompt inference
// ---------------------------------------------------------------------------

/**
 * Validate an answer against the provided question schema.
 * Frontend must not infer rules from prompt/labels — only these fields.
 *
 * Rules (WEBSOCKET_CONTRACT.md):
 *  - selected_option_ids is array; may be empty only when free_text_mode permits text-only
 *  - single: at most one option; multiple: one or more unless question permits none (required=false)
 *  - free_text_mode only_if_no_option: must not submit both options and free_text
 *  - free_text_mode disabled: free_text must be empty
 *  - free_text_mode required: free_text must be non-empty (when required=true, text alone satisfies)
 *  - server is final validator; this function is for pre-submit UX gating only
 */
export function validateAnswer(
  question: DiscoveryQuestion,
  selected_option_ids: string[],
  free_text: string,
): ValidationResult {
  const text = free_text ?? "";
  const hasSelection = selected_option_ids.length > 0;
  const hasTextVal = hasText(text);

  // Option IDs must belong to question
  const validIds = new Set(question.options.map((o) => o.option_id));
  for (const id of selected_option_ids) {
    if (!validIds.has(id)) {
      return {
        valid: false,
        code: "invalid_option_id",
        message: `Unknown option_id "${id}" for question "${question.question_id}".`,
      };
    }
  }

  // selection_mode enforcement
  if (question.selection_mode === "single" && selected_option_ids.length > 1) {
    return {
      valid: false,
      code: "too_many_selections",
      message: "This question accepts at most one option.",
    };
  }

  // free_text_mode: disabled — text must be empty
  if (question.free_text_mode === "disabled" && hasTextVal) {
    return {
      valid: false,
      code: "free_text_not_allowed",
      message: "Free text is not allowed for this question.",
    };
  }

  // free_text_mode: only_if_no_option — mutual exclusion
  if (question.free_text_mode === "only_if_no_option") {
    if (hasSelection && hasTextVal) {
      return {
        valid: false,
        code: "mutual_exclusion",
        message: "Select an option or write a note — not both.",
      };
    }
    if (question.required) {
      if (!hasSelection && !hasTextVal) {
        return {
          valid: false,
          code: "selection_required",
          message: "An answer is required.",
        };
      }
    }
    // when not required, empty is allowed; otherwise one side must be present — already checked
    return { valid: true };
  }

  // free_text_mode: required — text must be non-empty
  if (question.free_text_mode === "required") {
    if (!hasTextVal) {
      return {
        valid: false,
        code: "free_text_required",
        message: "Please add a note to continue.",
      };
    }
    // text present satisfies; selection still bounded by selection_mode but otherwise optional
    return { valid: true };
  }

  // free_text_mode: optional  (and disabled already returned if text present)
  // required flag determines whether empty is allowed
  if (question.free_text_mode === "optional" || question.free_text_mode === "disabled") {
    if (question.required) {
      if (!hasSelection && !hasTextVal) {
        // For disabled, hasTextVal is already false here, so this means selection required
        // For optional, need at least one of selection or text
        if (question.free_text_mode === "disabled") {
          return {
            valid: false,
            code: "selection_required",
            message: "Please select an option to continue.",
          };
        }
        return {
          valid: false,
          code: "selection_required",
          message: "Please select an option or add a note.",
        };
      }
      // If required and selection empty but text present -> allowed for optional
      // If required and selection present but text empty -> allowed
    }
    // not required -> always valid after prior checks
    return { valid: true };
  }

  // fallback — should be unreachable
  return { valid: true };
}

/** Convenience: true if validateAnswer would pass */
export function isAnswerValid(
  question: DiscoveryQuestion,
  selected_option_ids: string[],
  free_text: string,
): boolean {
  return validateAnswer(question, selected_option_ids, free_text).valid;
}

// ---------------------------------------------------------------------------
// discovery.answer command building with idempotency
// ---------------------------------------------------------------------------

export interface Envelope {
  message_id: string;
  kind: "command";
  type: "discovery.answer";
  session_id?: string;
  run_id?: string;
  command_id: string;
  occurred_at: string;
  payload: DiscoveryAnswerPayload;
}

export interface BuildAnswerOptions {
  session_id?: string;
  run_id?: string;
  command_id?: string;
  message_id?: string;
  occurred_at?: string;
}

/**
 * Build a discovery.answer envelope. Caller must have validated via validateAnswer.
 * - free_text is always normalized to string (empty string when disabled or absent)
 * - selected_option_ids is always an ordered array (caller order preserved)
 * - command_id is generated if not supplied; reuse same command_id for idempotent retry
 * - message_id and occurred_at are auto-generated if not supplied
 */
export function buildDiscoveryAnswer(
  question: DiscoveryQuestion,
  selected_option_ids: string[],
  free_text: string,
  opts: BuildAnswerOptions = {},
): Envelope {
  const text = free_text ?? "";
  const normalizedText = question.free_text_mode === "disabled" ? "" : text;
  // Defensive: also normalize only_if_no_option mutual exclusion (caller's responsibility,
  // but we ensure we never submit both if caller bypassed validateAnswer)
  let ids = [...selected_option_ids];
  let ft = normalizedText;
  if (question.free_text_mode === "only_if_no_option" && ids.length > 0 && hasText(ft)) {
    // Prefer options over text? Contract says must not submit both — we drop text and let
    // validateAnswer surface the error in real flow. For envelope building we drop text
    // to avoid protocol violation, but validation should have blocked this.
    ft = "";
  }
  const command_id = opts.command_id ?? generateCommandId();
  const envelope: Envelope = {
    message_id: opts.message_id ?? generateMessageId(),
    kind: "command",
    type: "discovery.answer",
    command_id,
    occurred_at: opts.occurred_at ?? new Date().toISOString(),
    payload: {
      question_id: question.question_id,
      selected_option_ids: ids,
      free_text: ft,
    },
  };
  if (opts.session_id) envelope.session_id = opts.session_id;
  if (opts.run_id) envelope.run_id = opts.run_id;
  return envelope;
}

// ---------------------------------------------------------------------------
// Forward-only discovery state manager (server-authoritative)
// ---------------------------------------------------------------------------

export type DiscoveryEventType = "question" | "profile_snapshot" | "profile_ready";

export interface DiscoveryStateSnapshot {
  currentQuestion: DiscoveryQuestion | null;
  currentQuestionSequence: number | null;
  profileSnapshot: ProfileSnapshot | null;
  profileReady: ProfileReady | null;
  isDiscoveryComplete: boolean; // derived only from server signals, never local heuristic
  pendingCommands: Map<string, Envelope>;
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

export type DiscoveryManagerListener = (state: Readonly<DiscoveryStateSnapshot>) => void;

/**
 * DiscoveryManager — forward-only, server-authoritative.
 *
 * - Tracks currentQuestion (only one active at a time, forward-only)
 * - Tracks profileSnapshot (replaced only when revision is newer; sequence-ordered)
 * - Tracks profileReady (emitted by server when discovery is complete)
 * - Does NOT infer completion from question count or local heuristics
 * - Manages pending commands for idempotency: duplicate command_id with same payload
 *   is idempotent; same command_id with different payload is a conflict
 * - Caller sends envelopes via transport and feeds acks/events back via methods
 */
export class DiscoveryManager {
  private state: DiscoveryStateSnapshot = {
    currentQuestion: null,
    currentQuestionSequence: null,
    profileSnapshot: null,
    profileReady: null,
    isDiscoveryComplete: false,
    pendingCommands: new Map(),
  };

  private listeners = new Set<DiscoveryManagerListener>();
  private lastSequence: number | null = null;
  private commandPayloads = new Map<string, string>(); // command_id -> JSON(payload)

  // -- subscriptions --

  subscribe(listener: DiscoveryManagerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const l of this.listeners) l(this.getState());
  }

  getState(): Readonly<DiscoveryStateSnapshot> {
    // shallow copy with new Map reference so consumers can detect changes
    return {
      currentQuestion: this.state.currentQuestion,
      currentQuestionSequence: this.state.currentQuestionSequence,
      profileSnapshot: this.state.profileSnapshot,
      profileReady: this.state.profileReady,
      isDiscoveryComplete: this.state.isDiscoveryComplete,
      pendingCommands: new Map(this.state.pendingCommands),
    };
  }

  // -- question handling (forward-only) --

  /**
   * Handle incoming discovery.question event payload.
   * Replaces currentQuestion. Forward-only: prior answers cannot be edited.
   * Respects sequence ordering: older sequences are ignored.
   */
  handleQuestion(payload: unknown, sequence?: number): DiscoveryQuestion | null {
    const q = parseDiscoveryQuestion(payload);
    if (!q) return null;
    if (sequence != null) {
      if (this.lastSequence != null && sequence < this.lastSequence) return null;
      this.lastSequence = sequence;
      this.state.currentQuestionSequence = sequence;
    }
    this.state.currentQuestion = q;
    // A new question means discovery is still active — but do not clear profileReady
    // if server already declared readiness; discovery is forward-only, server controls state.
    this.emit();
    return q;
  }

  /** Envelope-aware variant: extracts payload/sequence from full envelope */
  handleQuestionEnvelope(envelope: Record<string, unknown>): DiscoveryQuestion | null {
    const payload = (envelope as Record<string, unknown>)["payload"];
    const seq = (envelope as Record<string, unknown>)["sequence"];
    return this.handleQuestion(payload, typeof seq === "number" ? (seq as number) : undefined);
  }

  getCurrentQuestion(): DiscoveryQuestion | null {
    return this.state.currentQuestion;
  }

  // -- profile snapshot handling --

  /**
   * Handle profile.snapshot event. Replaces snapshot only when revision is newer.
   * Sequence ordering is respected when available.
   */
  handleProfileSnapshot(payload: unknown, sequence?: number): ProfileSnapshot | null {
    const snap = parseProfileSnapshot(payload);
    if (!snap) return null;
    if (sequence != null) {
      if (this.lastSequence != null && sequence < this.lastSequence) return null;
      this.lastSequence = sequence;
    }
    const cur = this.state.profileSnapshot;
    if (cur && snap.revision <= cur.revision) return null; // only newer revisions
    this.state.profileSnapshot = snap;
    if (sequence != null) snap.sequence = sequence;
    // isDiscoveryComplete remains server-driven; a ready snapshot alone does not imply completion
    this.emit();
    return snap;
  }

  handleProfileSnapshotEnvelope(envelope: Record<string, unknown>): ProfileSnapshot | null {
    const payload = (envelope as Record<string, unknown>)["payload"];
    const seq = (envelope as Record<string, unknown>)["sequence"];
    return this.handleProfileSnapshot(payload, typeof seq === "number" ? (seq as number) : undefined);
  }

  // -- profile.ready handling --

  /**
   * Handle profile.ready event. Server declares discovery complete.
   * No local heuristic: this is the only signal that discovery is done.
   */
  handleProfileReady(payload: unknown, sequence?: number): ProfileReady | null {
    const ready = parseProfileReady(payload);
    if (!ready) return null;
    if (sequence != null) {
      if (this.lastSequence != null && sequence < this.lastSequence) return null;
      this.lastSequence = sequence;
    }
    this.state.profileReady = ready;
    this.state.isDiscoveryComplete = true;
    this.emit();
    return ready;
  }

  handleProfileReadyEnvelope(envelope: Record<string, unknown>): ProfileReady | null {
    const payload = (envelope as Record<string, unknown>)["payload"];
    const seq = (envelope as Record<string, unknown>)["sequence"];
    return this.handleProfileReady(payload, typeof seq === "number" ? (seq as number) : undefined);
  }

  /** Whether the current profile is ready and has no blocking unknowns */
  canConfirmProfile(): boolean {
    const snap = this.state.profileSnapshot;
    const ready = this.state.profileReady;
    if (!snap || !ready) return false;
    if (snap.revision !== ready.profile_revision) return false;
    if (snap.state !== "ready") return false;
    return ready.blocking_unknowns.length === 0;
  }

  // -- answer submission with idempotency --

  /**
   * Prepare a discovery.answer envelope for the current question.
   * Validates via validateAnswer before building. Returns null if invalid.
   * Registers command_id for deduplication tracking.
   */
  prepareAnswer(
    selected_option_ids: string[],
    free_text: string,
    opts: BuildAnswerOptions = {},
  ): { envelope: Envelope; validation: ValidationResult } | null {
    const q = this.state.currentQuestion;
    if (!q) {
      return null;
    }
    const validation = validateAnswer(q, selected_option_ids, free_text);
    if (!validation.valid) {
      return { envelope: null as unknown as Envelope, validation };
    }
    const envelope = buildDiscoveryAnswer(q, selected_option_ids, free_text, opts);
    // Track payload for idempotency conflict detection
    const payloadKey = JSON.stringify(envelope.payload);
    const existing = this.commandPayloads.get(envelope.command_id);
    if (existing != null && existing !== payloadKey) {
      // command_id conflict — same id, different payload (contract: command_id_conflict)
      return {
        envelope,
        validation: {
          valid: false,
          code: "question_mismatch",
          message: "command_id reused with different payload.",
        },
      };
    }
    this.commandPayloads.set(envelope.command_id, payloadKey);
    this.state.pendingCommands.set(envelope.command_id, envelope);
    this.emit();
    return { envelope, validation };
  }

  /** Build envelope for explicit retry with same command_id (idempotent) */
  buildRetry(command_id: string): Envelope | null {
    return this.state.pendingCommands.get(command_id) ?? null;
  }

  // -- ack handling --

  /**
   * Handle server ack for a command.
   * - accepted+deduplicated: original result held, no state transition
   * - accepted: command accepted, keep pending until next question/snapshot arrives
   * - rejected: surface code/message, keep text for correction
   */
  handleAck(ack: AckPayload): AckPayload {
    if (ack.accepted) {
      // On deduplicated, do not re-advance state; caller should hold position
      if (!ack.deduplicated) {
        // keep pending until next server event confirms progress
      }
    } else {
      // rejected — keep pending for possible retry after correction
      // question_not_current recovery: caller should wait for next discovery.question
    }
    this.emit();
    return ack;
  }

  /** Mark command as completed (after server confirms via next question/snapshot) */
  completeCommand(command_id: string): void {
    this.state.pendingCommands.delete(command_id);
    this.emit();
  }

  /** Reset for reconnect: new run from latest recovery state — server will re-emit */
  resetForReconnect(): void {
    // Do not clear profileSnapshot — recovery state survives reconnect per contract
    // Clear current question until server re-emits it; clear pendingCommands
    this.state.currentQuestion = null;
    this.state.currentQuestionSequence = null;
    this.state.pendingCommands.clear();
    // isDiscoveryComplete and profileReady are preserved until server re-declares
    this.lastSequence = null;
    this.emit();
  }

  /** Full reset (session expired / closed) */
  resetAll(): void {
    this.state = {
      currentQuestion: null,
      currentQuestionSequence: null,
      profileSnapshot: null,
      profileReady: null,
      isDiscoveryComplete: false,
      pendingCommands: new Map(),
    };
    this.commandPayloads.clear();
    this.lastSequence = null;
    this.emit();
  }
}

// ---------------------------------------------------------------------------
// Standalone helpers for non-class usage (e.g., tests, simple screens)
// ---------------------------------------------------------------------------

/**
 * Validate and build a discovery.answer envelope in one call.
 * Returns { valid, envelope?, error? } without needing a manager instance.
 */
export function createDiscoveryAnswer(
  question: DiscoveryQuestion,
  selected_option_ids: string[],
  free_text: string,
  opts: BuildAnswerOptions = {},
): { valid: boolean; envelope?: Envelope; validation: ValidationResult } {
  const validation = validateAnswer(question, selected_option_ids, free_text);
  if (!validation.valid) return { valid: false, validation };
  const envelope = buildDiscoveryAnswer(question, selected_option_ids, free_text, opts);
  return { valid: true, envelope, validation };
}

/** Type guard for discovery.question envelope */
export function isDiscoveryQuestionEnvelope(msg: Record<string, unknown>): boolean {
  return msg["type"] === "discovery.question" && msg["kind"] === "event";
}

/** Type guard for profile.snapshot envelope */
export function isProfileSnapshotEnvelope(msg: Record<string, unknown>): boolean {
  return msg["type"] === "profile.snapshot" && msg["kind"] === "event";
}

/** Type guard for profile.ready envelope */
export function isProfileReadyEnvelope(msg: Record<string, unknown>): boolean {
  return msg["type"] === "profile.ready" && msg["kind"] === "event";
}

// ---------------------------------------------------------------------------
// Default export: DiscoveryManager factory (convenience)
// ---------------------------------------------------------------------------

export function createDiscoveryManager(): DiscoveryManager {
  return new DiscoveryManager();
}

export default DiscoveryManager;
