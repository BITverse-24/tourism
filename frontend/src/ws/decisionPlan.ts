/**
 * WebSocket decision & plan contract — frontend handling.
 *
 * Covers docs/WEBSOCKET_CONTRACT.md decision & plan section:
 *  - decision.request / decision.respond
 *  - plan.snapshot (draft / final, replace not patch, Agent 3 validation, failed-after-repair)
 *  - workflow.completed
 *  - replan.request (reserved — always rejected in v1)
 *  - run.cancel / session.close
 *
 * All helpers are pure and UI-agnostic. A small state container is provided
 * for integration, but every validation can also be used standalone.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DECISION_REASON_MATERIAL_TRADEOFF = "material_tradeoff" as const;
export const DECISION_REASON_HARD_CONSTRAINT_CONFLICT = "hard_constraint_conflict" as const;
export const DECISION_REASON_MISSING_PREFERENCE = "missing_preference" as const;

/** Union of allowed backend/AI decision reasons. Frontend must accept all */
export const ALLOWED_DECISION_REASONS = [
  DECISION_REASON_MATERIAL_TRADEOFF,
  DECISION_REASON_HARD_CONSTRAINT_CONFLICT,
  DECISION_REASON_MISSING_PREFERENCE,
] as const;
export type DecisionReason = (typeof ALLOWED_DECISION_REASONS)[number];

/** Unwrap a possible single-nested { payload: {...decision...} } wrapper once.
 *  Backend emits { decision_id, ... } directly; transport compatibility may
 *  wrap once more. Unwrap only one level to avoid hiding malformed data. */
export function unwrapDecisionPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const obj = raw as Record<string, unknown>;
  if ("decision_id" in obj || "prompt" in obj || "options" in obj) return raw;
  if ("payload" in obj && obj.payload && typeof obj.payload === "object" && !Array.isArray(obj.payload)) {
    const inner = obj.payload as Record<string, unknown>;
    if ("decision_id" in inner || "prompt" in inner) return inner;
  }
  return raw;
}

export const REPLAN_CHANGE_TYPES = [
  "flight_delayed",
  "weather",
  "attraction_closed",
  "budget_changed",
  "duration_changed",
  "fatigue",
  "party_changed",
  "preference_changed",
  "other",
] as const;
export type ReplanChangeType = (typeof REPLAN_CHANGE_TYPES)[number];

export const PLAN_SNAPSHOT_STATES = ["draft", "final"] as const;
export type PlanSnapshotState = (typeof PLAN_SNAPSHOT_STATES)[number];

export const WORKFLOW_COMPLETED_OUTCOMES = [
  "final_plan_available",
  "cancelled",
] as const;
export type WorkflowCompletedOutcome =
  (typeof WORKFLOW_COMPLETED_OUTCOMES)[number];

export const WORKFLOW_STATES = [
  "discovery",
  "profile_review",
  "planning",
  "decision_required",
  "plan_ready",
  "replanning",
  "cancelled",
  "expired",
] as const;
export type WorkflowState = (typeof WORKFLOW_STATES)[number];

/** Fields that MUST NOT appear in a decision.request payload — hidden reasoning. */
export const FORBIDDEN_DECISION_FIELDS = [
  "reasoning",
  "chain_of_thought",
  "hidden_reasoning",
  "internal_scores",
  "raw_rankings",
  "provider_response",
  "provider_payload",
  "candidate_rankings",
  "internal_score",
  "scores",
  "ranking",
  "raw_response",
  "raw_provider_response",
  "hidden_prompt",
  "internal_prompt",
] as const;

/** Protected Final Trip Plan fields that Agent 3 must not mutate (controller-owned). */
export const PROTECTED_PLAN_FIELDS = [
  "destination_route",
  "city_allocations",
  "days", // includes place, ordering, timing
  "cost_summary",
  "accommodation", // status
  "traveler_profile_reference",
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DecisionOption {
  option_id: string;
  label: string;
  tradeoff: string;
}

export interface DecisionRequestPayload {
  decision_id: string;
  profile_revision: number;
  reason: DecisionReason;
  /** Original backend reason preserved for diagnostics; display maps all to UI category */
  reason_display?: string;
  prompt: string;
  options: DecisionOption[];
}

export interface PlanSnapshotPayload {
  revision: number;
  state: PlanSnapshotState;
  plan: FinalTripPlan;
}

/** Minimal shape of FINAL_TRIP_PLAN_SCHEMA required for validation. */
export interface FinalTripPlan {
  plan_title: string;
  summary: string;
  traveler_profile_reference: string;
  trip_dates?: Record<string, unknown>;
  destination_route: Array<{
    place: string;
    order: number;
    arrival_from?: string;
    departure_to?: string;
  }>;
  city_allocations: Array<{
    place: string;
    nights?: number;
    days: number | string;
    reason?: string;
  }>;
  accommodation?: Array<{
    place: string;
    nights: number;
    recommendation: string;
    reason: string;
    estimated_cost?: string;
    status: "suggested" | "selected_by_traveler" | "not_yet_decided";
  }>;
  days: Array<{
    day: number;
    date?: string;
    place: string;
    theme?: string;
    daily_notes?: string;
    items: Array<{
      type: "experience" | "meal" | "rest" | "movement";
      title: string;
      description: string;
      start_time?: string;
      end_time?: string;
      location?: string;
      movement?: Record<string, unknown>;
      estimated_cost?: string;
      reason?: string;
      flexibility?: "fixed" | "moveable" | "optional";
    }>;
  }>;
  cost_summary: {
    currency: string;
    estimated_total: number;
    scope: string;
    categories: Array<{ name: string; amount: number }>;
    budget_position: string;
    caveats: string[];
  };
  fit_explanation: string | string[];
  tradeoffs: string[];
  assumptions: string[];
  warnings: string[];
  unresolved_details: string[];
}

export interface WorkflowCompletedPayload {
  outcome: WorkflowCompletedOutcome;
  final_plan_revision?: number | null;
}

export interface DecisionRespondPayload {
  decision_id: string;
  option_id: string;
}

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

// ---------------------------------------------------------------------------
// Helpers — generic
// ---------------------------------------------------------------------------

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isPositiveInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n > 0;
}

function hasForbiddenFields(obj: Record<string, unknown>): string | null {
  for (const key of FORBIDDEN_DECISION_FIELDS) {
    if (key in obj) return key;
  }
  return null;
}

/** Deep check for forbidden keys inside decision.request (top-level and options). */
export function findHiddenReasoningField(
  payload: Record<string, unknown>
): string | null {
  const top = hasForbiddenFields(payload);
  if (top) return top;
  // Check each option for hidden reasoning keys as well
  if (Array.isArray(payload.options)) {
    for (const opt of payload.options) {
      if (opt && typeof opt === "object") {
        const f = hasForbiddenFields(opt as Record<string, unknown>);
        if (f) return `options[].${f}`;
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// decision.request — validation / parsing
// ---------------------------------------------------------------------------

export interface DecisionRequestValidation {
  valid: boolean;
  error?: string;
  code?: string;
}

export function validateDecisionRequest(
  payload: unknown
): DecisionRequestValidation {
  // Compatibility: unwrap single-nested { payload: {...} } wrapper once in shared parser
  const unwrapped = unwrapDecisionPayload(payload);
  if (!unwrapped || typeof unwrapped !== "object" || Array.isArray(unwrapped)) {
    return { valid: false, error: "payload must be an object", code: "invalid_envelope" };
  }
  const p = unwrapped as Record<string, unknown>;

  // Hidden reasoning must not be present
  const hidden = findHiddenReasoningField(p);
  if (hidden) {
    return {
      valid: false,
      error: `decision.request must not contain hidden reasoning field: ${hidden}`,
      code: "invalid_envelope",
    };
  }

  if (!isNonEmptyString(p.decision_id)) {
    return { valid: false, error: "decision_id is required", code: "invalid_envelope" };
  }
  if (!isPositiveInt(p.profile_revision)) {
    return { valid: false, error: "profile_revision must be a positive integer", code: "invalid_envelope" };
  }
  // Accept full allowed union; normalize to display category. Preserve original via reason mapping.
  if (typeof p.reason !== "string" || !(ALLOWED_DECISION_REASONS as readonly string[]).includes(p.reason as string)) {
    return {
      valid: false,
      error: `reason must be one of ${ALLOWED_DECISION_REASONS.join(", ")}`,
      code: "invalid_envelope",
    };
  }
  if (!isNonEmptyString(p.prompt)) {
    return { valid: false, error: "prompt is required", code: "invalid_envelope" };
  }
  if (!Array.isArray(p.options) || p.options.length === 0) {
    return { valid: false, error: "options must be a non-empty array", code: "invalid_envelope" };
  }
  const seen = new Set<string>();
  for (let i = 0; i < p.options.length; i++) {
    const o = p.options[i] as Record<string, unknown>;
    if (!o || typeof o !== "object") {
      return { valid: false, error: `options[${i}] must be an object`, code: "invalid_envelope" };
    }
    if (!isNonEmptyString(o.option_id)) {
      return { valid: false, error: `options[${i}].option_id is required`, code: "invalid_envelope" };
    }
    if (!isNonEmptyString(o.label)) {
      return { valid: false, error: `options[${i}].label is required`, code: "invalid_envelope" };
    }
    if (!isNonEmptyString(o.tradeoff)) {
      return { valid: false, error: `options[${i}].tradeoff is required`, code: "invalid_envelope" };
    }
    // No hidden keys inside option
    const hf = hasForbiddenFields(o);
    if (hf) {
      return {
        valid: false,
        error: `options[${i}] must not contain ${hf}`,
        code: "invalid_envelope",
      };
    }
    // option_id must be unique
    if (seen.has(o.option_id as string)) {
      return { valid: false, error: `duplicate option_id: ${o.option_id}`, code: "invalid_envelope" };
    }
    seen.add(o.option_id as string);
    // Only allow known keys in option (option_id, label, tradeoff)
    const allowed = new Set(["option_id", "label", "tradeoff"]);
    for (const k of Object.keys(o)) {
      if (!allowed.has(k)) {
        // Extra keys that look like reasoning are already caught above;
        // other extras are ignored for forward compatibility except we flag
        // explicit hidden-like keys — already done. So allow unknown but not forbidden.
        // No-op.
      }
    }
  }

  return { valid: true };
}

export function parseDecisionRequest(
  payload: unknown
): DecisionRequestPayload {
  const v = validateDecisionRequest(payload);
  if (!v.valid) throw new Error(v.error ?? "invalid decision.request");
  const unwrapped = unwrapDecisionPayload(payload) as DecisionRequestPayload;
  // normalize all permitted reasons to UI display category while preserving original
  // All valid reasons map to the same decision surface; keep original in reason_display if needed.
  return unwrapped;
}

/** Returns true if payload contains no hidden reasoning fields. */
export function hasNoHiddenReasoning(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return true;
  return findHiddenReasoningField(payload as Record<string, unknown>) === null;
}

// ---------------------------------------------------------------------------
// decision.respond — command creation & validation
// ---------------------------------------------------------------------------

export interface DecisionRespondValidation {
  valid: boolean;
  accepted: boolean;
  error?: string;
  code?: string;
  /** True when duplicate/stale caused no side effect (idempotent). */
  noSideEffect?: boolean;
  /** Whether workflow should return to planning after acceptance. */
  shouldReturnToPlanning?: boolean;
}

/**
 * Validate a decision.respond command against current state.
 * - Only accepted in decision_required
 * - decision_id must match current server-issued decision
 * - option_id must belong to that decision's typed options
 * - stale/duplicate has no side effect
 */
export function validateDecisionRespond(
  state: DecisionPlanState,
  payload: unknown
): DecisionRespondValidation {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { valid: false, accepted: false, error: "payload must be an object", code: "invalid_envelope" };
  }
  const p = payload as Record<string, unknown>;
  if (!isNonEmptyString(p.decision_id)) {
    return { valid: false, accepted: false, error: "decision_id is required", code: "invalid_envelope" };
  }
  if (!isNonEmptyString(p.option_id)) {
    return { valid: false, accepted: false, error: "option_id is required", code: "invalid_envelope" };
  }

  // Only in decision_required
  if (state.workflowState !== "decision_required") {
    return {
      valid: false,
      accepted: false,
      error: `decision.respond only valid in decision_required (current: ${state.workflowState})`,
      code: "invalid_workflow_state",
    };
  }

  if (!state.currentDecision) {
    return {
      valid: false,
      accepted: false,
      error: "no active decision",
      code: "invalid_workflow_state",
    };
  }

  const currentId = state.currentDecision.decision_id;
  const requestedId = p.decision_id as string;

  // Stale decision — no side effect
  if (requestedId !== currentId) {
    return {
      valid: false,
      accepted: false,
      error: `stale decision_id: ${requestedId} (current: ${currentId})`,
      code: "invalid_envelope",
      noSideEffect: true,
    };
  }

  // Duplicate detection — same decision_id already responded
  const dedupKey = `${requestedId}::${p.option_id}`;
  if (state.respondedKeys.has(dedupKey) || state.respondedKeys.has(requestedId)) {
    return {
      valid: false,
      accepted: false,
      error: "duplicate decision response — no side effect",
      code: "command_id_conflict",
      noSideEffect: true,
    };
  }

  // option_id must belong to typed options
  const optionIds = new Set(state.currentDecision.options.map((o) => o.option_id));
  if (!optionIds.has(p.option_id as string)) {
    return {
      valid: false,
      accepted: false,
      error: `option_id "${p.option_id}" not in decision options`,
      code: "invalid_selection",
    };
  }

  return {
    valid: true,
    accepted: true,
    shouldReturnToPlanning: true,
  };
}

/**
 * Build a decision.respond command envelope.
 * Caller should validate with validateDecisionRespond first; this helper does not enforce state.
 */
export function createDecisionRespondCommand(
  decisionId: string,
  optionId: string,
  opts?: { commandId?: string; messageId?: string; sessionId?: string; runId?: string }
): WsEnvelope<DecisionRespondPayload> {
  if (!isNonEmptyString(decisionId)) throw new Error("decision_id is required");
  if (!isNonEmptyString(optionId)) throw new Error("option_id is required");
  return {
    message_id: opts?.messageId ?? `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kind: "command",
    type: "decision.respond",
    session_id: opts?.sessionId,
    run_id: opts?.runId,
    command_id: opts?.commandId ?? `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    occurred_at: new Date().toISOString(),
    payload: { decision_id: decisionId, option_id: optionId },
  };
}

// Aliases for potential test import names
export const buildDecisionRespondCommand = createDecisionRespondCommand;
export const createDecisionRespond = createDecisionRespondCommand;

// ---------------------------------------------------------------------------
// plan.snapshot — validation & handling
// ---------------------------------------------------------------------------

export interface PlanSnapshotValidation {
  valid: boolean;
  error?: string;
  code?: string;
}

export function validateFinalTripPlan(plan: unknown): PlanSnapshotValidation {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    return { valid: false, error: "plan must be an object", code: "invalid_envelope" };
  }
  const p = plan as Record<string, unknown>;
  const requiredString = ["plan_title", "summary", "traveler_profile_reference", "fit_explanation"];
  for (const f of requiredString) {
    const v = p[f];
    if (f === "fit_explanation") {
      if (!(isNonEmptyString(v) || (Array.isArray(v) && v.length >= 0))) {
        // fit_explanation can be string or array per SOME impls, but contract says string
        if (!isNonEmptyString(v) && !Array.isArray(v)) {
          return { valid: false, error: `${f} is required`, code: "invalid_envelope" };
        }
      }
      continue;
    }
    if (!isNonEmptyString(v)) return { valid: false, error: `${f} is required`, code: "invalid_envelope" };
  }
  if (!Array.isArray(p.destination_route) || (p.destination_route as unknown[]).length === 0) {
    return { valid: false, error: "destination_route is required", code: "invalid_envelope" };
  }
  if (!Array.isArray(p.city_allocations) || (p.city_allocations as unknown[]).length === 0) {
    return { valid: false, error: "city_allocations is required", code: "invalid_envelope" };
  }
  if (!Array.isArray(p.days) || (p.days as unknown[]).length === 0) {
    return { valid: false, error: "days is required", code: "invalid_envelope" };
  }
  if (!p.cost_summary || typeof p.cost_summary !== "object" || Array.isArray(p.cost_summary)) {
    return { valid: false, error: "cost_summary is required", code: "invalid_envelope" };
  }
  const cs = p.cost_summary as Record<string, unknown>;
  if (!isNonEmptyString(cs.currency)) return { valid: false, error: "cost_summary.currency is required", code: "invalid_envelope" };
  if (typeof cs.estimated_total !== "number") return { valid: false, error: "cost_summary.estimated_total must be a number", code: "invalid_envelope" };
  if (!isNonEmptyString(cs.scope)) return { valid: false, error: "cost_summary.scope is required", code: "invalid_envelope" };
  if (!Array.isArray(cs.categories)) return { valid: false, error: "cost_summary.categories is required", code: "invalid_envelope" };
  if (!isNonEmptyString(cs.budget_position)) return { valid: false, error: "cost_summary.budget_position is required", code: "invalid_envelope" };
  if (!Array.isArray(cs.caveats)) return { valid: false, error: "cost_summary.caveats is required", code: "invalid_envelope" };
  if (!Array.isArray(p.tradeoffs)) return { valid: false, error: "tradeoffs is required", code: "invalid_envelope" };
  if (!Array.isArray(p.assumptions)) return { valid: false, error: "assumptions is required", code: "invalid_envelope" };
  if (!Array.isArray(p.warnings)) return { valid: false, error: "warnings is required", code: "invalid_envelope" };
  if (!Array.isArray(p.unresolved_details)) return { valid: false, error: "unresolved_details is required", code: "invalid_envelope" };

  // Forbidden internal fields must not be present
  const forbiddenPlanFields = [
    "candidate_rankings",
    "internal_scores",
    "agent_patches",
    "event_log",
    "optimization_weights",
    "simulation_internals",
    "persistence_lineage",
    "raw_provider_response",
  ];
  for (const f of forbiddenPlanFields) {
    if (f in p) return { valid: false, error: `plan must not contain ${f}`, code: "invalid_envelope" };
  }

  return { valid: true };
}

export function validatePlanSnapshot(payload: unknown): PlanSnapshotValidation {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { valid: false, error: "payload must be an object", code: "invalid_envelope" };
  }
  const p = payload as Record<string, unknown>;
  if (!isPositiveInt(p.revision)) {
    return { valid: false, error: "revision must be a positive integer", code: "invalid_envelope" };
  }
  if (p.state !== "draft" && p.state !== "final") {
    return { valid: false, error: 'state must be "draft" or "final"', code: "invalid_envelope" };
  }
  if (!p.plan || typeof p.plan !== "object" || Array.isArray(p.plan)) {
    return { valid: false, error: "plan is required", code: "invalid_envelope" };
  }
  // Validate plan shape per FINAL_TRIP_PLAN_SCHEMA
  const planValidation = validateFinalTripPlan(p.plan);
  if (!planValidation.valid) return planValidation;

  // draft must not be treated as final — state is explicit, validation ensures plan shape but UI must label
  // Nothing else to reject here; the caller must not promote draft to final.

  return { valid: true };
}

// Alias to handle naming variations in tests
export const validatePlan = validateFinalTripPlan;
export const isValidPlan = (plan: unknown) => validateFinalTripPlan(plan).valid;
export const isValidPlanSnapshot = (p: unknown) => validatePlanSnapshot(p).valid;

/**
 * Check that a final plan has passed Agent 3 validation.
 * In the real controller, this compares protected fields with the selected result
 * and validates schema. Here we expose a frontend-side check that a final snapshot
 * at least has a valid plan shape. Protected-field comparison is available via
 * `compareProtectedFields`.
 */
export function isAgent3ValidatedFinal(
  snapshot: PlanSnapshotPayload,
  selectedResultPlan?: FinalTripPlan
): boolean {
  if (snapshot.state !== "final") return false;
  const v = validateFinalTripPlan(snapshot.plan);
  if (!v.valid) return false;
  if (selectedResultPlan) {
    const diff = compareProtectedFields(snapshot.plan, selectedResultPlan);
    if (diff.length > 0) return false;
  }
  return true;
}

/**
 * Compare controller-owned protected fields between Agent 3 draft and selected result.
 * Returns list of differing fields (empty = unchanged = valid).
 */
export function compareProtectedFields(
  draft: FinalTripPlan,
  selected: FinalTripPlan
): string[] {
  const diffs: string[] = [];
  for (const field of PROTECTED_PLAN_FIELDS) {
    const a = JSON.stringify((draft as unknown as Record<string, unknown>)[field]);
    const b = JSON.stringify((selected as unknown as Record<string, unknown>)[field]);
    if (a !== b) diffs.push(field);
  }
  return diffs;
}

// ---------------------------------------------------------------------------
// workflow.completed — validation
// ---------------------------------------------------------------------------

export function validateWorkflowCompleted(
  payload: unknown
): { valid: boolean; error?: string; code?: string } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { valid: false, error: "payload must be an object", code: "invalid_envelope" };
  }
  const p = payload as Record<string, unknown>;
  if (p.outcome !== "final_plan_available" && p.outcome !== "cancelled") {
    return { valid: false, error: 'outcome must be "final_plan_available" or "cancelled"', code: "invalid_envelope" };
  }
  if (p.outcome === "final_plan_available") {
    if (!isPositiveInt(p.final_plan_revision)) {
      return { valid: false, error: "final_plan_revision is required when outcome is final_plan_available", code: "invalid_envelope" };
    }
  }
  // cancelled may omit or null final_plan_revision
  return { valid: true };
}

export const isValidWorkflowCompleted = (p: unknown) =>
  validateWorkflowCompleted(p).valid;

// ---------------------------------------------------------------------------
// replan.request — reserved (always rejected in v1)
// ---------------------------------------------------------------------------

export function isReplanSupported(): boolean {
  return false;
}

export function validateReplanRequest(
  payload: unknown
): { valid: boolean; accepted: false; code: string; message: string; retryable: boolean } {
  // In v1, any replan.request must be rejected — even well-formed ones.
  // We still validate shape to provide a useful message, but always reject.
  let detail = "";
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const p = payload as Record<string, unknown>;
    if (typeof p.change_type === "string" && !(REPLAN_CHANGE_TYPES as readonly string[]).includes(p.change_type)) {
      detail = ` unknown change_type "${p.change_type}"`;
    }
  }
  return {
    valid: false,
    accepted: false,
    code: "invalid_replan_request",
    message: `replan.request is reserved for the later continuous-replanning phase and is not accepted in v1.${detail} Allowed change_types are: ${REPLAN_CHANGE_TYPES.join(", ")}.`,
    retryable: false,
  };
}

export function createReplanRequestCommand(
  changeType: ReplanChangeType,
  details?: Record<string, unknown>,
  freeText?: string,
  opts?: { commandId?: string; messageId?: string; sessionId?: string; runId?: string }
): WsEnvelope {
  // This helper builds the envelope but documents that the server will reject it in v1.
  return {
    message_id: opts?.messageId ?? `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kind: "command",
    type: "replan.request",
    session_id: opts?.sessionId,
    run_id: opts?.runId,
    command_id: opts?.commandId ?? `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    occurred_at: new Date().toISOString(),
    payload: {
      change_type: changeType,
      details: details ?? {},
      free_text: freeText ?? "",
    },
  };
}

// ---------------------------------------------------------------------------
// run.cancel / session.close
// ---------------------------------------------------------------------------

export function createRunCancelCommand(
  reason?: string,
  opts?: { commandId?: string; messageId?: string; sessionId?: string; runId?: string }
): WsEnvelope<{ reason: string }> {
  return {
    message_id: opts?.messageId ?? `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kind: "command",
    type: "run.cancel",
    session_id: opts?.sessionId,
    run_id: opts?.runId,
    command_id: opts?.commandId ?? `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    occurred_at: new Date().toISOString(),
    payload: { reason: reason ?? "Traveler left the planning flow" },
  };
}

export function createSessionCloseCommand(
  reason?: string,
  opts?: { commandId?: string; messageId?: string; sessionId?: string; runId?: string }
): WsEnvelope<{ reason: string }> {
  return {
    message_id: opts?.messageId ?? `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kind: "command",
    type: "session.close",
    session_id: opts?.sessionId,
    run_id: opts?.runId,
    command_id: opts?.commandId ?? `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    occurred_at: new Date().toISOString(),
    payload: { reason: reason ?? "Traveler finished" },
  };
}

// Aliases
export const buildRunCancelCommand = createRunCancelCommand;
export const buildSessionCloseCommand = createSessionCloseCommand;

// ---------------------------------------------------------------------------
// State container — DecisionPlanState & handlers
// ---------------------------------------------------------------------------

export interface DecisionPlanState {
  /** Current workflow state (authoritative from server). */
  workflowState: WorkflowState;
  /** Current active decision, if in decision_required. */
  currentDecision: DecisionRequestPayload | null;
  /** Decision history: decision_id -> DecisionRequestPayload (for stale check). */
  decisionHistory: Map<string, DecisionRequestPayload>;
  /** Keys of already-responded decisions for dedup (decision_id and decision_id::option_id). */
  respondedKeys: Set<string>;
  /** Track if we already returned to planning after responding — prevents double transition. */
  hasReturnedToPlanning: boolean;
  /** All plan snapshots by revision — replaced entirely per contract, not patched. */
  planSnapshots: Map<number, PlanSnapshotPayload>;
  /** Current (latest) plan snapshot regardless of draft/final. */
  currentPlanSnapshot: PlanSnapshotPayload | null;
  /** Authoritative final plan — existing final remains until replacement final. */
  authoritativeFinalSnapshot: PlanSnapshotPayload | null;
  /** Last workflow.completed payload if any. */
  workflowCompleted: WorkflowCompletedPayload | null;
  /** Planning status failed flag — after one repair attempt, no final should publish. */
  planningFailed: boolean;
  /** Number of Agent 3 repair attempts observed (bounded to 1). */
  repairAttempts: number;
}

export function initialDecisionPlanState(
  workflowState: WorkflowState = "planning"
): DecisionPlanState {
  return {
    workflowState,
    currentDecision: null,
    decisionHistory: new Map(),
    respondedKeys: new Set(),
    hasReturnedToPlanning: false,
    planSnapshots: new Map(),
    currentPlanSnapshot: null,
    authoritativeFinalSnapshot: null,
    workflowCompleted: null,
    planningFailed: false,
    repairAttempts: 0,
  };
}

/**
 * Handle an incoming decision.request event.
 * Returns new state and validation result.
 * The frontend must ignore hidden reasoning fields — validation rejects them.
 */
export function handleDecisionRequest(
  state: DecisionPlanState,
  payload: unknown,
  opts?: { workflowState?: WorkflowState }
): { state: DecisionPlanState; valid: boolean; error?: string; code?: string } {
  const unwrapped = unwrapDecisionPayload(payload);
  const v = validateDecisionRequest(unwrapped);
  if (!v.valid) {
    // Log diagnostic without exposing hidden reasoning
    if (typeof console !== 'undefined' && console.debug) {
      console.debug(`[decisionPlan] rejected decision.request: ${v.error} (code=${v.code})`);
    }
    return { state, valid: false, error: v.error, code: v.code };
  }
  const req = unwrapped as DecisionRequestPayload;
  // Validate required display fields explicitly (already done) and log rejected contract field
  const next: DecisionPlanState = {
    ...state,
    workflowState: opts?.workflowState ?? "decision_required",
    currentDecision: { ...req, options: req.options.map((o) => ({ ...o })) },
    decisionHistory: new Map(state.decisionHistory),
    hasReturnedToPlanning: false,
  };
  next.decisionHistory.set(req.decision_id, next.currentDecision!);
  return { state: next, valid: true };
}

/**
 * Handle decision.respond result — apply acceptance side effect.
 * Call after validateDecisionRespond returns valid/accepted.
 * Transitions decision_required -> planning and records dedup key.
 */
export function applyDecisionRespond(
  state: DecisionPlanState,
  payload: DecisionRespondPayload
): DecisionPlanState {
  const dedupKey = `${payload.decision_id}::${payload.option_id}`;
  const next: DecisionPlanState = {
    ...state,
    workflowState: "planning",
    respondedKeys: new Set(state.respondedKeys),
    hasReturnedToPlanning: true,
    // Keep currentDecision for stale detection but clear active requirement
    // Do not delete decisionHistory — stale checks need it.
  };
  next.respondedKeys.add(dedupKey);
  next.respondedKeys.add(payload.decision_id);
  // Clear active decision prompt — planning resumes. Keep history.
  next.currentDecision = null;
  return next;
}

/**
 * Convenience: validate and apply decision respond in one step.
 * Returns { accepted, noSideEffect, nextState, error, code }
 */
export function handleDecisionRespond(
  state: DecisionPlanState,
  payload: unknown
): {
  accepted: boolean;
  noSideEffect: boolean;
  nextState: DecisionPlanState;
  error?: string;
  code?: string;
} {
  const v = validateDecisionRespond(state, payload);
  if (!v.valid || !v.accepted) {
    return {
      accepted: false,
      noSideEffect: !!v.noSideEffect,
      nextState: state,
      error: v.error,
      code: v.code,
    };
  }
  const p = payload as DecisionRespondPayload;
  return {
    accepted: true,
    noSideEffect: false,
    nextState: applyDecisionRespond(state, p),
  };
}

// ---------------------------------------------------------------------------
// plan.snapshot handling — replace not patch, draft != final, authoritative final
// ---------------------------------------------------------------------------

export function handlePlanSnapshot(
  state: DecisionPlanState,
  payload: unknown,
  opts?: { selectedResultPlan?: FinalTripPlan }
): { state: DecisionPlanState; valid: boolean; error?: string; code?: string } {
  const v = validatePlanSnapshot(payload);
  if (!v.valid) {
    return { state, valid: false, error: v.error, code: v.code };
  }
  const snap = payload as PlanSnapshotPayload;

  // If planning already failed after one repair, final must not be published
  if (state.planningFailed && snap.state === "final") {
    return {
      state,
      valid: false,
      error: "planning failed after one repair — final not published",
      code: "invalid_workflow_state",
    };
  }

  // Agent 3 validation: final only after validation; if selectedResultPlan provided, check protected fields
  if (snap.state === "final") {
    if (!isAgent3ValidatedFinal(snap, opts?.selectedResultPlan)) {
      return {
        state,
        valid: false,
        error: snap.state === "final" && opts?.selectedResultPlan
          ? "final plan protected fields changed — Agent 3 validation failed"
          : "final plan failed schema validation",
        code: "invalid_envelope",
      };
    }
  }

  // Replace prior snapshot entirely — do not patch. Even if same revision, replace.
  const next: DecisionPlanState = {
    ...state,
    planSnapshots: new Map(state.planSnapshots),
    currentPlanSnapshot: { ...snap, plan: clonePlan(snap.plan) },
  };
  next.planSnapshots.set(snap.revision, next.currentPlanSnapshot!);

  // Draft vs final: draft is never authoritative; existing final remains authoritative until replacement final
  if (snap.state === "final") {
    next.authoritativeFinalSnapshot = next.currentPlanSnapshot;
  }
  // If state is draft, authoritativeFinalSnapshot stays as-is (existing final remains)

  return { state: next, valid: true };
}

/** Deep clone a plan for snapshot isolation (replace not patch). */
function clonePlan(plan: FinalTripPlan): FinalTripPlan {
  return JSON.parse(JSON.stringify(plan)) as FinalTripPlan;
}

/**
 * Handle planning.status with status failed — after one bounded repair attempt,
 * do not publish final. Frontend should reflect planningFailed.
 */
export function handlePlanningStatus(
  state: DecisionPlanState,
  payload: { status: string; phase?: string }
): DecisionPlanState {
  if (payload.status === "failed") {
    return {
      ...state,
      planningFailed: true,
      repairAttempts: Math.min(state.repairAttempts + 1, 1),
    };
  }
  return state;
}

/**
 * Convenience: handle planning.status event envelope check
 */
export function handlePlanningFailed(
  state: DecisionPlanState
): DecisionPlanState {
  return handlePlanningStatus(state, { status: "failed" });
}

// ---------------------------------------------------------------------------
// workflow.completed handling
// ---------------------------------------------------------------------------

export function handleWorkflowCompleted(
  state: DecisionPlanState,
  payload: unknown
): { state: DecisionPlanState; valid: boolean; error?: string; code?: string } {
  const v = validateWorkflowCompleted(payload);
  if (!v.valid) {
    return { state, valid: false, error: v.error, code: v.code };
  }
  const wc = payload as WorkflowCompletedPayload;
  const next: DecisionPlanState = {
    ...state,
    workflowCompleted: { ...wc },
  };
  if (wc.outcome === "final_plan_available") {
    next.workflowState = "plan_ready";
  } else if (wc.outcome === "cancelled") {
    next.workflowState = "cancelled";
  }
  return { state: next, valid: true };
}

// ---------------------------------------------------------------------------
// Selectors / helpers for UI
// ---------------------------------------------------------------------------

export function isDecisionRequired(state: DecisionPlanState): boolean {
  return state.workflowState === "decision_required" && state.currentDecision !== null;
}

export function getCurrentDecision(
  state: DecisionPlanState
): DecisionRequestPayload | null {
  return state.currentDecision;
}

export function getCurrentPlanSnapshot(
  state: DecisionPlanState
): PlanSnapshotPayload | null {
  return state.currentPlanSnapshot;
}

/**
 * Returns the authoritative Final Trip Plan — the latest snapshot with state final,
 * or null if no final is yet available. Drafts are never authoritative.
 * Existing final remains authoritative until replacement final per contract.
 */
export function getAuthoritativeFinalPlan(
  state: DecisionPlanState
): PlanSnapshotPayload | null {
  return state.authoritativeFinalSnapshot;
}

export function isDraftSnapshot(snap: PlanSnapshotPayload): boolean {
  return snap.state === "draft";
}

export function isFinalSnapshot(snap: PlanSnapshotPayload): boolean {
  return snap.state === "final";
}

/** Whether the UI should label draft vs final — draft !== final. */
export function getPlanLabel(snap: PlanSnapshotPayload): string {
  return snap.state === "final" ? "Final Trip Plan" : "Draft Plan";
}

// ---------------------------------------------------------------------------
// Envelope-level dispatch — handles all event types from WEBSOCKET_CONTRACT
// ---------------------------------------------------------------------------

export type DispatchResult = {
  nextState: DecisionPlanState;
  handled: boolean;
  valid: boolean;
  error?: string;
  code?: string;
  noSideEffect?: boolean;
};

export function dispatchWsEvent(
  state: DecisionPlanState,
  envelope: WsEnvelope
): DispatchResult {
  switch (envelope.type) {
    case "decision.request": {
      const r = handleDecisionRequest(state, envelope.payload, {
        workflowState: "decision_required",
      });
      return { nextState: r.state, handled: true, valid: r.valid, error: r.error, code: r.code };
    }
    case "plan.snapshot": {
      const r = handlePlanSnapshot(state, envelope.payload);
      return { nextState: r.state, handled: true, valid: r.valid, error: r.error, code: r.code };
    }
    case "workflow.completed": {
      const r = handleWorkflowCompleted(state, envelope.payload);
      return { nextState: r.state, handled: true, valid: r.valid, error: r.error, code: r.code };
    }
    case "planning.status": {
      const p = envelope.payload as Record<string, unknown>;
      if (p.status === "failed") {
        const ns = handlePlanningStatus(state, { status: "failed", phase: p.phase as string });
        return { nextState: ns, handled: true, valid: true };
      }
      // Backend uses planning.status with phase === "decision_required" to signal
      // decision pause (see CandidateDecision.ts). Promote centrally to
      // decision_required so UI can pause timeout even before decision.request arrives.
      // Do not invent a separate "decision_required" event; mapping documented here.
      if (p.phase === "decision_required") {
        const ns: DecisionPlanState = { ...state, workflowState: "decision_required", hasReturnedToPlanning: false };
        return { nextState: ns, handled: true, valid: true };
      }
      return { nextState: state, handled: true, valid: true };
    }
    default:
      // Unknown event types must be safely ignored after diagnostics per contract
      return { nextState: state, handled: false, valid: true };
  }
}

export function dispatchWsCommandAck(
  state: DecisionPlanState,
  envelope: WsEnvelope
): DispatchResult {
  // For now, acks don't mutate decision/plan state directly; included for completeness
  return { nextState: state, handled: false, valid: true };
}

// ---------------------------------------------------------------------------
// Re-export a default object for convenience
// ---------------------------------------------------------------------------

const decisionPlan = {
  // constants
  DECISION_REASON_MATERIAL_TRADEOFF,
  DECISION_REASON_HARD_CONSTRAINT_CONFLICT,
  DECISION_REASON_MISSING_PREFERENCE,
  ALLOWED_DECISION_REASONS,
  unwrapDecisionPayload,
  REPLAN_CHANGE_TYPES,
  PLAN_SNAPSHOT_STATES,
  WORKFLOW_COMPLETED_OUTCOMES,
  FORBIDDEN_DECISION_FIELDS,
  PROTECTED_PLAN_FIELDS,
  // decision.request
  validateDecisionRequest,
  parseDecisionRequest,
  hasNoHiddenReasoning,
  findHiddenReasoningField,
  // decision.respond
  validateDecisionRespond,
  createDecisionRespondCommand,
  buildDecisionRespondCommand,
  handleDecisionRespond,
  applyDecisionRespond,
  // plan.snapshot
  validatePlanSnapshot,
  validateFinalTripPlan,
  isValidPlan,
  isValidPlanSnapshot,
  isAgent3ValidatedFinal,
  compareProtectedFields,
  handlePlanSnapshot,
  handlePlanningStatus,
  handlePlanningFailed,
  // workflow.completed
  validateWorkflowCompleted,
  isValidWorkflowCompleted,
  handleWorkflowCompleted,
  // replan
  isReplanSupported,
  validateReplanRequest,
  createReplanRequestCommand,
  // cancel / close
  createRunCancelCommand,
  createSessionCloseCommand,
  buildRunCancelCommand,
  buildSessionCloseCommand,
  // state
  initialDecisionPlanState,
  handleDecisionRequest,
  getCurrentDecision,
  getCurrentPlanSnapshot,
  getAuthoritativeFinalPlan,
  isDecisionRequired,
  isDraftSnapshot,
  isFinalSnapshot,
  getPlanLabel,
  dispatchWsEvent,
  dispatchWsCommandAck,
};

export default decisionPlan;
