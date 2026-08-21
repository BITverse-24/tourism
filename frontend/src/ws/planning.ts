/**
 * frontend/src/ws/planning.ts
 *
 * Frontend WebSocket planning & lifecycle specialist.
 * Implements the WEBSOCKET_CONTRACT.md planning section for the MVP flow:
 *   profile.confirm -> planning -> agent.lifecycle + planning.status
 *   profile.request_changes -> discovery
 *
 * Contract refs:
 *  - WEBSOCKET_CONTRACT.md  (sections: profile.confirm, profile.request_changes,
 *    agent.lifecycle legacy event, planning.status)
 *  - AGENT_ARCHITECTURE.md (Planning Controller owns workflow state; Agent 3
 *    invoked only after Agent 2 + evaluation services produce one selected result)
 *  - TRAVELER_PROFILE_SCHEMA.md (blocking unknowns)
 *
 * Write boundary: this module lives inside frontend/ and must not import backend code.
 * It is pure transport / validation / state-mapping for the frontend renderer.
 */

// ---------------------------------------------------------------------------
// Constants — exact contract values (unknowns ignored for forward compat)
// ---------------------------------------------------------------------------

/**
 * @deprecated Lifecycle rail removed — kept for backwards compat only.
 * Consultation no longer depends on lifecycle keys to open; backend may
 * omit agent.lifecycle events entirely. Do not gate navigation on these.
 */
export const LIFECYCLE_KEYS = [
  "discovery",
  "constraint_preference",
  "experience_designer",
  "cost_optimization",
  "optimization",
  "narrative_explanation",
] as const;

export type LifecycleKey = (typeof LIFECYCLE_KEYS)[number];

// Removed lifecycle keys — retained only for diagnostic handling (do not re-add to LIFECYCLE_KEYS)
export const REMOVED_LIFECYCLE_KEYS = [
  "mobility_logistics",
  "local_intelligence",
  "simulation_risk",
  "continuous_replanning",
] as const;
export type RemovedLifecycleKey = (typeof REMOVED_LIFECYCLE_KEYS)[number];

export const LIFECYCLE_STATUSES = [
  "started",
  "progressed",
  "completed",
  "failed",
] as const;

export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];

export const PLANNING_PHASES = [
  "profile_validation",
  "destination_design",
  "experience_selection",
  "mobility",
  "cost",
  "simulation",
  "optimization",
  "decision_required",
  "explanation",
  "replanning",
] as const;

export type PlanningPhase = (typeof PLANNING_PHASES)[number];

export const PLANNING_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
] as const;

export type PlanningStatus = (typeof PLANNING_STATUSES)[number];

// Simplified: lifecycle rail removed. All phases map to null so no stage
// hint is required to succeed; rail will be removed entirely. Kept as
// Record for backwards compat; values are intentionally all null.
export const PHASE_TO_LIFECYCLE_HINT: Record<PlanningPhase, LifecycleKey | null> = {
  profile_validation: null,
  destination_design: null,
  experience_selection: null,
  mobility: null,
  cost: null,
  simulation: null,
  optimization: null,
  decision_required: null,
  explanation: null,
  replanning: null,
};

// ---------------------------------------------------------------------------
// Payload types (exact contract shapes)
// ---------------------------------------------------------------------------

export interface ProfileConfirmPayload {
  profile_revision: number;
}

export interface ProfileRequestChangesPayload {
  topics: string[];
  free_text?: string;
}

export interface AgentLifecyclePayload {
  agent: LifecycleKey;
  stage: string;
  status: LifecycleStatus;
  progress?: number; // 0..100 integer, optional
  summary: string; // safe, traveler-readable
}

export interface PlanningStatusPayload {
  phase: PlanningPhase;
  status: PlanningStatus;
  message?: string; // safe summary
  progress?: number; // 0..100
}

// Server ack shapes relevant to planning
export type RejectionCode =
  | "invalid_envelope"
  | "unsupported_message_type"
  | "session_not_found"
  | "session_expired"
  | "invalid_workflow_state"
  | "question_not_current"
  | "invalid_selection"
  | "free_text_not_allowed"
  | "profile_not_ready"
  | "profile_revision_conflict"
  | "invalid_replan_request"
  | "run_cancelled"
  | "command_id_conflict";

export interface CommandAck {
  command_id: string;
  accepted: boolean;
  deduplicated?: boolean;
  workflow_state?: string;
  code?: RejectionCode;
  message?: string;
  retryable?: boolean;
  recovery?: Record<string, unknown>;
}

// Generic WebSocket envelope
export interface WsEnvelope<T = unknown> {
  message_id: string;
  kind: "command" | "ack" | "event" | "error";
  type: string;
  session_id?: string;
  run_id?: string;
  command_id?: string;
  sequence?: number;
  occurred_at: string;
  payload: T;
}

// Session snapshot for validation context
export type ProfileSnapshotState = "draft" | "ready" | "confirmed";

export interface PlanningSessionState {
  session_id?: string;
  run_id?: string;
  workflow_state: string; // discovery | profile_review | planning | decision_required | plan_ready ...
  latest_profile_revision: number | null;
  latest_profile_state: ProfileSnapshotState | null;
  blocking_unknowns: string[]; // topics with impact=blocking, empty means no blocking
  confirmed_profile_revision: number | null;
  // diagnostics hook: record ignored unknown event types
  onDiagnostics?: (info: { type: string; payload: unknown }) => void;
}

// ---------------------------------------------------------------------------
// Safe summary utilities
// Contract: "The summary must be safe for a traveler to read. It must not
// contain chain-of-thought, hidden prompts, raw provider responses, internal
// scores, or unreviewed personal data." and same for planning.status message.
// Frontend must treat these as opaque safe strings and never render raw patches
// or scores if they somehow appear.
// ---------------------------------------------------------------------------

const UNSAFE_TOKEN_RE = /(chain-?of-?thought|hidden prompt|raw provider|internal score|candidate ranking|provider payload)/i;

export function isSafeSummary(summary: unknown): boolean {
  if (typeof summary !== "string") return false;
  const t = summary.trim();
  if (t.length === 0) return false;
  if (t.length > 2000) return false; // generous ceiling; UI should truncate but not reject
  if (UNSAFE_TOKEN_RE.test(t)) return false;
  return true;
}

export function sanitizeSummary(summary: string): string {
  // Frontend never tries to "fix" an unsafe summary — it replaces with safe fallback
  // and preserves diagnostics.
  if (!isSafeSummary(summary)) {
    // strip the unsafe tokens and return a generic traveler-safe line
    return "Continuing with your preferences — refining the next step.";
  }
  return summary.trim();
}

export function isSafeMessage(message: unknown): boolean {
  return isSafeSummary(message);
}

export function sanitizeMessage(message: string): string {
  return sanitizeSummary(message);
}

// ---------------------------------------------------------------------------
// profile.confirm — validation & envelope building
// Contract: rejected if revision is not latest ready, if blocking unknowns
// remain, or if workflow is not in profile_review. On success server records
// confirmed_profile_revision and starts planning through Planning Controller.
// ---------------------------------------------------------------------------

export interface ValidateConfirmArgs {
  workflow_state: string;
  latest_profile_revision: number | null;
  latest_profile_state: ProfileSnapshotState | null;
  blocking_unknowns: string[];
  requested_revision: unknown;
}

export interface ValidationResult {
  valid: boolean;
  code?: RejectionCode;
  message?: string;
  retryable?: boolean;
}

/**
 * Validate a profile.confirm request purely on frontend-known state.
 * The server remains authoritative; this prevents obviously invalid sends and
 * provides immediate, contract-aligned rejection messages.
 */
export function validateProfileConfirm(args: ValidateConfirmArgs): ValidationResult {
  const { workflow_state, latest_profile_revision, latest_profile_state, blocking_unknowns, requested_revision } = args;

  if (workflow_state !== "profile_review") {
    return {
      valid: false,
      code: "invalid_workflow_state",
      message: "Profile can only be confirmed while reviewing the profile.",
      retryable: false,
    };
  }

  if (requested_revision === null || requested_revision === undefined) {
    return {
      valid: false,
      code: "invalid_envelope",
      message: "profile_revision is required.",
      retryable: false,
    };
  }

  if (typeof requested_revision !== "number" || !Number.isInteger(requested_revision) || requested_revision <= 0) {
    return {
      valid: false,
      code: "invalid_envelope",
      message: "profile_revision must be a positive integer.",
      retryable: false,
    };
  }

  if (latest_profile_revision === null || latest_profile_revision === undefined) {
    return {
      valid: false,
      code: "profile_not_ready",
      message: "No ready profile is available yet.",
      retryable: false,
    };
  }

  if (latest_profile_state !== "ready") {
    return {
      valid: false,
      code: "profile_not_ready",
      message: "The latest profile is not ready for confirmation.",
      retryable: false,
    };
  }

  if (requested_revision !== latest_profile_revision) {
    return {
      valid: false,
      code: "profile_revision_conflict",
      message: `The profile was updated (latest revision ${latest_profile_revision}). Please review the latest before confirming.`,
      retryable: true,
    };
  }

  if (blocking_unknowns.length > 0) {
    return {
      valid: false,
      code: "profile_not_ready",
      message: `Profile has blocking unknowns (${blocking_unknowns.join(", ")}) and cannot be confirmed yet.`,
      retryable: false,
    };
  }

  return { valid: true };
}

export function buildProfileConfirmEnvelope(params: {
  profile_revision: number;
  session_id: string;
  run_id?: string;
  command_id?: string;
  message_id?: string;
}): WsEnvelope<ProfileConfirmPayload> {
  const { profile_revision, session_id, run_id, command_id, message_id } = params;
  const cid = command_id ?? `cmd_${Math.random().toString(36).slice(2, 10)}`;
  const mid = message_id ?? `msg_${Math.random().toString(36).slice(2, 10)}`;
  return {
    message_id: mid,
    kind: "command",
    type: "profile.confirm",
    session_id,
    run_id: run_id ?? "",
    command_id: cid,
    occurred_at: new Date().toISOString(),
    payload: { profile_revision },
  };
}

/**
 * Apply a successful profile.confirm acknowledgement to local session state.
 * The server records confirmed_profile_revision and starts planning through
 * the in-process Planning Controller. The Controller invokes Agent 3 only
 * after Agent 2 and the available evaluation services have produced one
 * selected result. Planning status and agent.lifecycle events follow.
 */
export function applyProfileConfirmAccepted(
  state: PlanningSessionState,
  payload: { profile_revision: number }
): PlanningSessionState {
  return {
    ...state,
    confirmed_profile_revision: payload.profile_revision,
    workflow_state: "planning",
  };
}

export function interpretProfileConfirmRejected(
  ack: CommandAck
): { code: RejectionCode | undefined; userMessage: string } {
  switch (ack.code) {
    case "profile_revision_conflict":
      return {
        code: ack.code,
        userMessage: ack.message ?? "This profile was just updated — please review the latest before confirming.",
      };
    case "profile_not_ready":
      return {
        code: ack.code,
        userMessage: ack.message ?? "The profile is not ready to confirm — please resolve the open questions first.",
      };
    case "invalid_workflow_state":
      return {
        code: ack.code,
        userMessage: ack.message ?? "You can confirm the profile only while it is under review.",
      };
    default:
      return {
        code: ack.code as RejectionCode,
        userMessage: ack.message ?? "Could not confirm the profile. Please try again.",
      };
  }
}

// ---------------------------------------------------------------------------
// profile.request_changes — validation & envelope building
// Contract: backend returns workflow to discovery, asks targeted questions,
// and emits a revised profile snapshot when ready. Direct JSON field edits
// are not supported.
// ---------------------------------------------------------------------------

export function validateProfileRequestChanges(payload: unknown): ValidationResult {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { valid: false, code: "invalid_envelope", message: "payload must be an object" };
  }
  const p = payload as Record<string, unknown>;
  const topics = p.topics;
  const free_text = p.free_text;

  if (!Array.isArray(topics)) {
    return { valid: false, code: "invalid_envelope", message: "topics must be an array of strings" };
  }
  for (const t of topics) {
    if (typeof t !== "string" || t.trim().length === 0) {
      return { valid: false, code: "invalid_envelope", message: "each topic must be a non-empty string" };
    }
  }
  // Empty topics is allowed only when free_text carries intent; otherwise require at least one signal
  if (topics.length === 0 && (typeof free_text !== "string" || free_text.trim().length === 0)) {
    return {
      valid: false,
      code: "invalid_envelope",
      message: "Provide at least one topic or a note describing the change.",
    };
  }
  if (free_text !== undefined && free_text !== null && typeof free_text !== "string") {
    return { valid: false, code: "invalid_envelope", message: "free_text must be a string when provided" };
  }
  // Cap free_text for transport sanity (server also validates)
  if (typeof free_text === "string" && free_text.length > 5000) {
    return { valid: false, code: "invalid_envelope", message: "free_text is too long" };
  }
  return { valid: true };
}

export function buildProfileRequestChangesEnvelope(params: {
  topics: string[];
  free_text?: string;
  session_id: string;
  run_id?: string;
  command_id?: string;
  message_id?: string;
}): WsEnvelope<ProfileRequestChangesPayload> {
  const { topics, free_text, session_id, run_id, command_id, message_id } = params;
  const cid = command_id ?? `cmd_${Math.random().toString(36).slice(2, 10)}`;
  const mid = message_id ?? `msg_${Math.random().toString(36).slice(2, 10)}`;
  return {
    message_id: mid,
    kind: "command",
    type: "profile.request_changes",
    session_id,
    run_id: run_id ?? "",
    command_id: cid,
    occurred_at: new Date().toISOString(),
    payload: {
      topics: topics.map((t) => t.trim()).filter(Boolean),
      ...(typeof free_text === "string" && free_text.trim().length > 0 ? { free_text: free_text.trim() } : {}),
    },
  };
}

export function applyProfileRequestChangesAccepted(state: PlanningSessionState): PlanningSessionState {
  // Contract: backend returns workflow to discovery; frontend should expect
  // discovery.question and revised profile.snapshot.
  return { ...state, workflow_state: "discovery" };
}

// ---------------------------------------------------------------------------
// agent.lifecycle — legacy event name
// Payload: agent/stage/status/progress/summary
// statuses: started/progressed/completed/failed
// keys: discovery/constraint_preference/experience_designer/
//       cost_optimization/optimization/narrative_explanation
//       (removed: mobility_logistics, local_intelligence, simulation_risk, continuous_replanning — diagnostic only)
// ---------------------------------------------------------------------------

/** @deprecated Accept any non-empty string — unknown keys no longer block consultation */
export function isLifecycleKey(v: unknown): v is LifecycleKey {
  return typeof v === "string" && (v as string).trim().length > 0;
}

export function isLifecycleStatus(v: unknown): v is LifecycleStatus {
  return typeof v === "string" && (LIFECYCLE_STATUSES as readonly string[]).includes(v);
}

export function validateAgentLifecyclePayload(payload: unknown): ValidationResult & { sanitized?: AgentLifecyclePayload } {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { valid: false, code: "invalid_envelope", message: "agent.lifecycle payload must be an object" };
  }
  const p = payload as Record<string, unknown>;
  const { agent, stage, status, progress, summary } = p;

  if (!isLifecycleKey(agent)) {
    return { valid: false, code: "invalid_envelope", message: `Unknown agent lifecycle key: ${String(agent)}` };
  }
  if (typeof stage !== "string" || stage.trim().length === 0) {
    return { valid: false, code: "invalid_envelope", message: "stage must be a non-empty string" };
  }
  if (!isLifecycleStatus(status)) {
    return { valid: false, code: "invalid_envelope", message: `Invalid lifecycle status: ${String(status)}` };
  }
  if (progress !== undefined && progress !== null) {
    if (typeof progress !== "number" || !Number.isInteger(progress) || progress < 0 || progress > 100) {
      return { valid: false, code: "invalid_envelope", message: "progress must be an integer 0..100 when provided" };
    }
  }
  if (typeof summary !== "string" || summary.trim().length === 0) {
    return { valid: false, code: "invalid_envelope", message: "summary must be a non-empty safe string" };
  }
  if (!isSafeSummary(summary)) {
    // Do not reject the event — sanitize and keep it; server should never emit unsafe but frontend is defensive
    const sanitized: AgentLifecyclePayload = {
      agent: agent as LifecycleKey,
      stage: (stage as string).trim(),
      status: status as LifecycleStatus,
      ...(typeof progress === "number" ? { progress: progress as number } : {}),
      summary: sanitizeSummary(summary as string),
    };
    return { valid: true, sanitized };
  }
  const sanitized: AgentLifecyclePayload = {
    agent: agent as LifecycleKey,
    stage: (stage as string).trim(),
    status: status as LifecycleStatus,
    ...(typeof progress === "number" ? { progress: progress as number } : {}),
    summary: (summary as string).trim(),
  };
  return { valid: true, sanitized };
}

// ---------------------------------------------------------------------------
// planning.status
// Payload: phase/profile_validation/destination_design/experience_selection/
//         mobility/cost/simulation/optimization/decision_required/explanation/replanning
//         status queued/running/completed/failed, message/progress
// ---------------------------------------------------------------------------

export function isPlanningPhase(v: unknown): v is PlanningPhase {
  return typeof v === "string" && (PLANNING_PHASES as readonly string[]).includes(v);
}

export function isPlanningStatus(v: unknown): v is PlanningStatus {
  return typeof v === "string" && (PLANNING_STATUSES as readonly string[]).includes(v);
}

export function validatePlanningStatusPayload(payload: unknown): ValidationResult & { sanitized?: PlanningStatusPayload } {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { valid: false, code: "invalid_envelope", message: "planning.status payload must be an object" };
  }
  const p = payload as Record<string, unknown>;
  const { phase, status, message, progress } = p;

  if (!isPlanningPhase(phase)) {
    return { valid: false, code: "invalid_envelope", message: `Unknown planning phase: ${String(phase)}` };
  }
  if (!isPlanningStatus(status)) {
    return { valid: false, code: "invalid_envelope", message: `Invalid planning status: ${String(status)}` };
  }
  if (message !== undefined && message !== null && typeof message !== "string") {
    return { valid: false, code: "invalid_envelope", message: "message must be a string when provided" };
  }
  if (typeof message === "string" && message.length > 0 && !isSafeMessage(message)) {
    const sanitized: PlanningStatusPayload = {
      phase: phase as PlanningPhase,
      status: status as PlanningStatus,
      ...(typeof progress === "number" ? { progress: progress as number } : {}),
      message: sanitizeMessage(message),
    };
    if (progress !== undefined && progress !== null) {
      if (typeof progress !== "number" || !Number.isInteger(progress) || progress < 0 || progress > 100) {
        return { valid: false, code: "invalid_envelope", message: "progress must be an integer 0..100 when provided" };
      }
    }
    return { valid: true, sanitized };
  }
  if (progress !== undefined && progress !== null) {
    if (typeof progress !== "number" || !Number.isInteger(progress) || progress < 0 || progress > 100) {
      return { valid: false, code: "invalid_envelope", message: "progress must be an integer 0..100 when provided" };
    }
  }
  const sanitized: PlanningStatusPayload = {
    phase: phase as PlanningPhase,
    status: status as PlanningStatus,
    ...(typeof message === "string" && message.trim().length > 0 ? { message: message.trim() } : {}),
    ...(typeof progress === "number" ? { progress: progress as number } : {}),
  };
  // Provide fallback safe message when none supplied but UI expects one
  if (!sanitized.message) {
    sanitized.message = defaultMessageForPhase(sanitized.phase, sanitized.status);
  } else {
    sanitized.message = sanitizeMessage(sanitized.message);
  }
  return { valid: true, sanitized };
}

function defaultMessageForPhase(phase: PlanningPhase, status: PlanningStatus): string {
  const map: Record<string, string> = {
    profile_validation: "Validating your profile before planning.",
    destination_design: "Choosing the best places for your journey.",
    experience_selection: "Selecting experiences aligned with your preferences.",
    mobility: "Checking routes and timing with care.", // fallback: collapsed to cost_optimization
    cost: "Balancing cost and comfort.",
    simulation: "Testing the plan for ease and resilience.", // fallback: collapsed to optimization
    optimization: "Balancing walking load, cost, and attraction fit.",
    decision_required: "A choice is needed to continue.",
    explanation: "Writing your journey in plain words.",
    replanning: "Standing by for future adjustments.", // reserved: collapsed (no stage)
  };
  const base = map[phase] ?? "Refining the journey so time feels well spent.";
  if (status === "failed") return "This check will be retried — your plan is still being shaped.";
  if (status === "queued") return `${base} (queued)`;
  return base;
}

// ---------------------------------------------------------------------------
// Lifecycle + planning.status store — ready to wire into Consultation / rail
// ---------------------------------------------------------------------------

export type StageUiStatus = "queued" | "started" | "progressed" | "completed" | "failed";

export interface StageUiState {
  key: LifecycleKey;
  label: string;
  status: StageUiStatus;
  summary?: string;
  progress?: number;
  phase?: PlanningPhase;
  phaseStatus?: PlanningStatus;
}

const LIFECYCLE_LABELS: Record<LifecycleKey, string> = {
  discovery: "Discovery",
  constraint_preference: "Constraint & Preference",
  experience_designer: "Attraction & Experience Designer",
  cost_optimization: "Cost Optimization",
  optimization: "Optimization",
  narrative_explanation: "Narrative & Explanation",
};

/** Simplified: consultation does not gate on lifecycle stages. Returns empty rail. */
export function createInitialStages(): StageUiState[] {
  return [];
}

/** Map lifecycle agent key + status onto UI stage status */
function mapLifecycleStatusToUi(s: LifecycleStatus): StageUiStatus {
  // contract is 1:1 for lifecycle
  return s as StageUiStatus;
}

/** Map planning.status onto the most relevant stage for the rail */
function stageForPlanningPhase(phase: PlanningPhase): LifecycleKey | null {
  return PHASE_TO_LIFECYCLE_HINT[phase] ?? null;
}

export interface PlanningStoreOptions {
  onStagesChanged?: (stages: StageUiState[]) => void;
  onPlanningStatusChanged?: (latest: PlanningStatusPayload | null, history: PlanningStatusPayload[]) => void;
  onLifecycleEvent?: (event: AgentLifecyclePayload) => void;
  onDiagnostics?: (info: { type: string; payload: unknown; reason: string }) => void;
}

export class PlanningLifecycleStore {
  stages: StageUiState[];
  planningHistory: PlanningStatusPayload[] = [];
  latestPlanningStatus: PlanningStatusPayload | null = null;
  latestLifecycleByKey: Map<LifecycleKey, AgentLifecyclePayload> = new Map();
  private opts: PlanningStoreOptions;

  constructor(opts: PlanningStoreOptions = {}) {
    this.opts = opts;
    this.stages = createInitialStages();
  }

  /** Handle a raw WS envelope — returns true if consumed */
  handleEnvelope(envelope: WsEnvelope): boolean {
    const { kind, type, payload } = envelope;

    // Server guarantees ordered sequence per run; this store does not reorder.
    // Unknown server event types must be safely ignored after diagnostics.
    if (kind === "event") {
      if (type === "agent.lifecycle") {
        this.handleAgentLifecycle(payload);
        return true;
      }
      if (type === "planning.status") {
        this.handlePlanningStatus(payload);
        return true;
      }
      // Known but not owned by this module — let other handlers own them
      const ownedUnknowns = new Set(["discovery.question", "profile.snapshot", "profile.ready", "plan.snapshot", "decision.request", "session.ready", "workflow.completed", "session.expired", "session.superseded"]);
      if (!ownedUnknowns.has(type)) {
        // Unknown event type: record for diagnostics, do not break connection
        this.opts.onDiagnostics?.({ type, payload, reason: "unknown_event_type_ignored" });
      }
      return false;
    }

    if (kind === "ack" && (type === "command.accepted" || type === "command.rejected")) {
      // Planning acks are surfaced via callbacks elsewhere; store watches for workflow_state hints
      if (payload && typeof payload === "object") {
        const p = payload as Record<string, unknown>;
        // Some acks carry workflow_state; consumers may use it to drive navigation
        void p.workflow_state;
      }
      return false;
    }

    return false;
  }

  handleAgentLifecycle(rawPayload: unknown): ValidationResult {
    // Simplified: lifecycle rail removed. Never block consultation.
    // Record diagnostic for observability and return valid true regardless of payload shape.
    this.opts.onDiagnostics?.({
      type: "agent.lifecycle",
      payload: rawPayload,
      reason: "lifecycle event received (no-op, rail removed)",
    });
    return { valid: true };
  }

  handlePlanningStatus(rawPayload: unknown): ValidationResult {
    const res = validatePlanningStatusPayload(rawPayload);
    if (!res.valid || !res.sanitized) return res;

    const payload = res.sanitized;

    // Always update planning message/history — never gate on stage hint (rail removed).
    this.latestPlanningStatus = payload;
    this.planningHistory.push(payload);
    this.opts.onPlanningStatusChanged?.(this.latestPlanningStatus, [...this.planningHistory]);
    return { valid: true };
  }

  /** Snapshot for rendering Consultation rail */
  getStages(): StageUiState[] {
    return [...this.stages];
  }

  reset(): void {
    this.stages = createInitialStages();
    this.planningHistory = [];
    this.latestPlanningStatus = null;
    this.latestLifecycleByKey.clear();
    this.opts.onStagesChanged?.([...this.stages]);
    this.opts.onPlanningStatusChanged?.(null, []);
  }
}

// ---------------------------------------------------------------------------
// Convenience: single-entry handler for UI wiring
// ---------------------------------------------------------------------------

export interface CreatePlanningHandlersOptions extends PlanningStoreOptions {
  sessionState: PlanningSessionState;
  onSessionStateChanged?: (next: PlanningSessionState) => void;
  onConfirmSuccess?: (next: PlanningSessionState) => void;
  onConfirmRejected?: (ack: CommandAck) => void;
  onRequestChangesSuccess?: (next: PlanningSessionState) => void;
}

export function createPlanningWsHandlers(opts: CreatePlanningHandlersOptions) {
  const store = new PlanningLifecycleStore({
    onStagesChanged: opts.onStagesChanged,
    onPlanningStatusChanged: opts.onPlanningStatusChanged,
    onLifecycleEvent: opts.onLifecycleEvent,
    onDiagnostics: opts.onDiagnostics,
  });

  function handleEnvelope(envelope: WsEnvelope): boolean {
    // Let store handle lifecycle/status first
    const consumed = store.handleEnvelope(envelope);
    // Profile ack handling is envelope-kind ack with type command.accepted/rejected
    // The caller should route acks to confirm/requestChanges flows; we expose helpers.
    return consumed;
  }

  function confirmProfile(requested_revision: number): ValidationResult & { envelope?: WsEnvelope<ProfileConfirmPayload> } {
    const v = validateProfileConfirm({
      workflow_state: opts.sessionState.workflow_state,
      latest_profile_revision: opts.sessionState.latest_profile_revision,
      latest_profile_state: opts.sessionState.latest_profile_state,
      blocking_unknowns: opts.sessionState.blocking_unknowns,
      requested_revision,
    });
    if (!v.valid) return v;
    if (!opts.sessionState.session_id) {
      return { valid: false, code: "session_not_found", message: "No active session." };
    }
    const envelope = buildProfileConfirmEnvelope({
      profile_revision: requested_revision,
      session_id: opts.sessionState.session_id,
      run_id: opts.sessionState.run_id,
    });
    return { valid: true, envelope };
  }

  function handleConfirmAck(ack: CommandAck, requested_revision: number): void {
    if (ack.accepted) {
      const next = applyProfileConfirmAccepted(opts.sessionState, { profile_revision: requested_revision });
      opts.onSessionStateChanged?.(next);
      opts.onConfirmSuccess?.(next);
    } else {
      opts.onConfirmRejected?.(ack);
    }
  }

  function requestChanges(topics: string[], free_text?: string): ValidationResult & { envelope?: WsEnvelope<ProfileRequestChangesPayload> } {
    const v = validateProfileRequestChanges({ topics, free_text });
    if (!v.valid) return v;
    if (!opts.sessionState.session_id) {
      return { valid: false, code: "session_not_found", message: "No active session." };
    }
    const envelope = buildProfileRequestChangesEnvelope({
      topics,
      free_text,
      session_id: opts.sessionState.session_id,
      run_id: opts.sessionState.run_id,
    });
    return { valid: true, envelope };
  }

  function handleRequestChangesAck(ack: CommandAck): void {
    if (ack.accepted) {
      const next = applyProfileRequestChangesAccepted(opts.sessionState);
      opts.onSessionStateChanged?.(next);
      opts.onRequestChangesSuccess?.(next);
    }
  }

  return {
    store,
    handleEnvelope,
    confirmProfile,
    handleConfirmAck,
    requestChanges,
    handleRequestChangesAck,
    // re-export validators for direct UI use
    validateProfileConfirm: (rev: unknown) =>
      validateProfileConfirm({
        workflow_state: opts.sessionState.workflow_state,
        latest_profile_revision: opts.sessionState.latest_profile_revision,
        latest_profile_state: opts.sessionState.latest_profile_state,
        blocking_unknowns: opts.sessionState.blocking_unknowns,
        requested_revision: rev,
      }),
    validateAgentLifecyclePayload,
    validatePlanningStatusPayload,
  };
}

// ---------------------------------------------------------------------------
// Helpers for tests / diagnostics — stable string catalog for safe fallbacks
// ---------------------------------------------------------------------------

export const SAFE_FALLBACK_SUMMARY = "Continuing with your preferences — refining the next step.";
export const SAFE_FALLBACK_MESSAGE = "Refining the journey so time feels well spent.";
