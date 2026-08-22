/**
 * Voyager Agent 2 — simplified.
 * Input: { profile, session_id, run_budget } only.
 * Agent discovers cities/attractions via tools; backend owns CSV/SQLite query.
 */

import "dotenv/config";
import OpenAI from "openai";
import { FinalTripPlan } from "./narrative";

const REASONING_EFFORT = 'high'
// --- profile types (inlined so clone with only ai/ still compiles) ---
export type PreferenceStrength = "must_have" | "strong" | "nice_to_have" | "not_interested" | "unknown";
export type InferenceConfidence = "high" | "medium" | "low";
export type QuestionSelectionMode = "single" | "multiple";
export type FreeTextMode = "disabled" | "optional" | "only_if_no_option" | "required";
export interface Budget { amount: number | null; currency: string | null; scope: string | null; type: "target" | "ceiling" | "flexible" | "unknown"; }
export interface TripContext { destination_request: string | null; resolved_destination: string | null; start_date: string | null; end_date: string | null; duration_days: number | null; date_flexibility: "fixed" | "somewhat_flexible" | "highly_flexible" | "unknown"; party_size: number | null; party_notes: string | null; budget: Budget | null; }
export interface PurposeAndPriorities { primary_purpose: string | null; secondary_purposes: string[]; priorities: string[]; success_definition: string | null; }
export interface Preference { category: string; strength: PreferenceStrength; notes: string | null; source: "stated" | "inferred" | "defaulted"; confidence: InferenceConfidence | null; }
export interface TravelStyle { pace: "slow" | "balanced" | "fast" | "unknown"; energy_pattern: "morning" | "afternoon" | "evening" | "consistent" | "unknown"; walking_tolerance: "low" | "medium" | "high" | "unknown"; crowd_tolerance: "low" | "medium" | "high" | "unknown"; comfort_preference: "comfort_first" | "balanced" | "exploration_first" | "unknown"; spontaneity: "structured" | "some_flexibility" | "spontaneous" | "unknown"; }
export interface HardConstraints { must_visit: string[]; avoid: string[]; dietary_requirements: string[]; accessibility_requirements: string[]; accommodation_requirements: string[]; maximum_daily_travel: string | null; maximum_hotel_changes: number | null; budget_ceiling: Budget | null; }
export interface ProfileUnknown { topic: string; impact: "blocking" | "material" | "minor"; description: string; }
export interface ProfileAssumption { topic: string; value: string; reason: string; user_confirmation_needed: boolean; }
export interface TravelerProfile { profile_id: string; trip_context: TripContext; purpose_and_priorities: PurposeAndPriorities; preferences: Preference[]; travel_style: TravelStyle; hard_constraints: HardConstraints; unknowns: ProfileUnknown[]; assumptions: ProfileAssumption[]; }
export interface QuestionOption { option_id: string; label: string; description: string; }
export interface DiscoveryQuestion { question_id: string; prompt: string; selection_mode: QuestionSelectionMode; required: boolean; options: QuestionOption[]; free_text_mode: FreeTextMode; free_text_placeholder: string | null; }
export interface UserAnswer { question_id: string; question: DiscoveryQuestion; selected_option_ids: string[]; free_text: string | null; }
export interface DiscoveryInput { profile: TravelerProfile | null; answer: UserAnswer | null; }
export interface DiscoveryResult { profile: TravelerProfile; finished: boolean; next_question: DiscoveryQuestion | null; completion_reason: string | null; }

// --- ask_user_decision ---
export const MAX_TRADEOFF_CALLS = 3;
export const MAX_DECISION_CALLS = MAX_TRADEOFF_CALLS;
export const ALLOWED_DECISION_REASONS = ["material_tradeoff", "hard_constraint_conflict", "missing_preference"] as const;
export type DecisionReason = (typeof ALLOWED_DECISION_REASONS)[number];
export interface AskUserDecisionOption { option_id: string; label: string; tradeoff: string; }
export interface AskUserDecisionRequest { reason: DecisionReason; prompt: string; options: AskUserDecisionOption[]; session_id?: string; profile_revision?: number; }
export type AskUserDecisionResolver = (request: AskUserDecisionRequest) => Promise<string>;
export interface LegacyAskUserTradeoffRequest { attraction_id_a: string; attraction_id_b: string; question: string; tradeoff_a: string; tradeoff_b: string; session_id?: string; }
export type AskUserTradeoffRequest = AskUserDecisionRequest | LegacyAskUserTradeoffRequest;
export type AskUserTradeoffResolver = (request: any) => Promise<string>;
export interface TradeoffHistoryEntry { reason: DecisionReason; prompt: string; options: AskUserDecisionOption[]; choice: string; question?: string; attraction_id_a?: string; attraction_id_b?: string; tradeoff_a?: string; tradeoff_b?: string; }
export function buildAskUserDecisionToolSchema(): unknown {
    return {
        type: "function",
        function: {
            name: "ask_user_decision",
            description: "Pause planning and ask the traveler to resolve a material tradeoff, hard-constraint conflict, or missing preference. Use only when the decision materially changes the itinerary. Provide 2-3 options each with a stable option_id, traveler-safe label, and plain-language tradeoff.",
            strict: true,
            parameters: {
                type: "object",
                additionalProperties: false,
                properties: {
                    reason: { type: "string", enum: [...ALLOWED_DECISION_REASONS], description: "Why the decision is needed" },
                    prompt: { type: "string", description: "Traveler-facing question" },
                    options: { type: "array", minItems: 2, maxItems: 3, items: { type: "object", additionalProperties: false, properties: { option_id: { type: "string" }, label: { type: "string" }, tradeoff: { type: "string" } }, required: ["option_id", "label", "tradeoff"] } },
                },
                required: ["reason", "prompt", "options"],
            },
        },
    };
}
export function buildAskUserTradeoffToolSchema(): unknown { return buildAskUserDecisionToolSchema(); }
export function isNeitherChoice(choice: string): boolean {
    const c = choice.trim().toLowerCase();
    return c === "neither" || c === "neither option" || c === "neither one" || c === "skip both" || c === "none";
}
function getDecisionResolver(state: { options: { askUserTradeoff?: AskUserDecisionResolver; askUserDecision?: AskUserDecisionResolver } }): AskUserDecisionResolver | undefined {
    return (state.options as any).askUserDecision ?? (state.options as any).askUserTradeoff;
}
async function executeAskUserDecisionTool(
    state: { known_attractions: Map<string, { attraction_id: string; city_id: string; name: string }>; tradeoff_history: TradeoffHistoryEntry[]; tradeoff_calls: number; options: { askUserTradeoff?: AskUserDecisionResolver; askUserDecision?: AskUserDecisionResolver }; deadline: number | null; input: CandidateDesignInput; },
    rawArguments: string,
): Promise<string> {
    const resolver = getDecisionResolver(state);
    if (!resolver) return JSON.stringify({ error: { code: "tradeoff_not_configured", message: "ask_user_decision requires options.askUserDecision resolver." } });
    if (state.tradeoff_calls >= MAX_TRADEOFF_CALLS) return JSON.stringify({ error: { code: "tradeoff_budget_exhausted", message: `At most ${MAX_TRADEOFF_CALLS} tradeoff questions allowed.` } });
    let args: Record<string, unknown>;
    try { const parsed: unknown = JSON.parse(rawArguments); if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("args must be object"); args = parsed as Record<string, unknown>; } catch { return JSON.stringify({ error: { code: "invalid_arguments", message: "Tool arguments must be valid JSON object arguments." } }); }
    const isLegacy = "attraction_id_a" in args || "attraction_id_b" in args || "question" in args;
    if (isLegacy) {
        const aId = typeof args.attraction_id_a === "string" && args.attraction_id_a.trim() ? args.attraction_id_a.trim() : "";
        const bId = typeof args.attraction_id_b === "string" && args.attraction_id_b.trim() ? args.attraction_id_b.trim() : "";
        const question = typeof args.question === "string" && args.question.trim() ? args.question.trim() : "";
        const tradeoffA = typeof args.tradeoff_a === "string" && args.tradeoff_a.trim() ? args.tradeoff_a.trim() : "";
        const tradeoffB = typeof args.tradeoff_b === "string" && args.tradeoff_b.trim() ? args.tradeoff_b.trim() : "";
        if (!aId || !bId || !question || !tradeoffA || !tradeoffB) return JSON.stringify({ error: { code: "invalid_arguments", message: "attraction_id_a, attraction_id_b, question, tradeoff_a, tradeoff_b must be non-empty" } });
        if (aId === bId) return JSON.stringify({ error: { code: "invalid_tradeoff_pair", message: "attraction IDs must be distinct" } });
        const a = state.known_attractions.get(aId); const b = state.known_attractions.get(bId);
        if (!a || !b) return JSON.stringify({ error: { code: "unknown_attraction", message: "Both attractions must be retrieved first via query_attractions/get_attractions_by_ids before asking." } });
        const qLower = question.toLowerCase(); if (!(qLower.includes(a.name.toLowerCase()) || qLower.includes(aId.toLowerCase())) || !(qLower.includes(b.name.toLowerCase()) || qLower.includes(bId.toLowerCase()))) return JSON.stringify({ error: { code: "invalid_question", message: `Question must include both attraction names: ${a.name} and ${b.name}.` } });
        try {
            const sid = state.input.session_id;
            const profRev = state.input.profile_revision;
            const genericReq: AskUserDecisionRequest = { reason: "material_tradeoff", prompt: question, options: [{ option_id: aId, label: a.name, tradeoff: tradeoffA }, { option_id: bId, label: b.name, tradeoff: tradeoffB }], session_id: sid, ...(profRev !== undefined ? { profile_revision: profRev } : {}) };
            const legacyReq: any = { attraction_id_a: aId, attraction_id_b: bId, question, tradeoff_a: tradeoffA, tradeoff_b: tradeoffB, session_id: sid, ...(profRev !== undefined ? { profile_revision: profRev } : {}) };
            let choiceRaw: string;
            if (state.deadline === null) {
                choiceRaw = await resolver(legacyReq);
            } else {
                const remaining = state.deadline - Date.now(); if (remaining <= 0) throw new Error("ask_user_decision exceeded the run timeout");
                let timer: ReturnType<typeof setTimeout> | undefined; const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("ask_user_decision exceeded the run timeout")), remaining); });
                choiceRaw = await Promise.race([resolver(legacyReq), timeout]).finally(() => { if (timer) clearTimeout(timer); });
            }
            const choice = typeof choiceRaw === "string" ? choiceRaw.trim() : String(choiceRaw ?? "").trim(); if (!choice) return JSON.stringify({ error: { code: "invalid_choice", message: "User reply was empty." } });
            state.tradeoff_history.push({ reason: "material_tradeoff", prompt: question, options: genericReq.options, choice, question, attraction_id_a: aId, attraction_id_b: bId, tradeoff_a: tradeoffA, tradeoff_b: tradeoffB });
            (state as { tradeoff_calls: number }).tradeoff_calls += 1;
            return JSON.stringify({ choice, reason: "material_tradeoff", prompt: question, options: genericReq.options, question, attraction_id_a: aId, attraction_id_b: bId, tradeoff_a: tradeoffA, tradeoff_b: tradeoffB, tradeoff_calls_used: state.tradeoff_calls, tradeoff_calls_remaining: MAX_TRADEOFF_CALLS - state.tradeoff_calls });
        } catch (error) { if (error instanceof Error && error.message.includes("exceeded the run timeout")) throw error; return JSON.stringify({ error: { code: "tradeoff_failed", message: "Tradeoff resolver failed without exposing details." } }); }
    }
    const expected = new Set(["reason", "prompt", "options"]);
    for (const k of Object.keys(args)) if (!expected.has(k)) return JSON.stringify({ error: { code: "invalid_arguments", message: `ask_user_decision contains unsupported field ${k}` } });
    const reason = typeof args.reason === "string" && args.reason.trim() ? args.reason.trim() : "";
    if (!(ALLOWED_DECISION_REASONS as readonly string[]).includes(reason)) return JSON.stringify({ error: { code: "invalid_arguments", message: `reason must be one of ${ALLOWED_DECISION_REASONS.join(", ")}` } });
    const prompt = typeof args.prompt === "string" && args.prompt.trim() ? args.prompt.trim() : ""; if (!prompt) return JSON.stringify({ error: { code: "invalid_arguments", message: "prompt must be a non-empty string" } });
    const rawOptions = args.options; if (!Array.isArray(rawOptions) || rawOptions.length < 2 || rawOptions.length > 3) return JSON.stringify({ error: { code: "invalid_arguments", message: "options must be an array of 2-3 items" } });
    const options: AskUserDecisionOption[] = []; const seen = new Set<string>();
    for (let i = 0; i < rawOptions.length; i++) {
        const o = rawOptions[i] as Record<string, unknown>; if (typeof o !== "object" || o === null || Array.isArray(o)) return JSON.stringify({ error: { code: "invalid_arguments", message: `options[${i}] must be an object` } });
        const ok = new Set(["option_id", "label", "tradeoff"]); for (const kk of Object.keys(o)) if (!ok.has(kk)) return JSON.stringify({ error: { code: "invalid_arguments", message: `options[${i}] contains unsupported field ${kk}` } });
        const option_id = typeof o.option_id === "string" && o.option_id.trim() ? o.option_id.trim() : ""; const label = typeof o.label === "string" && o.label.trim() ? o.label.trim() : ""; const tradeoff = typeof o.tradeoff === "string" && o.tradeoff.trim() ? o.tradeoff.trim() : "";
        if (!option_id || !label || !tradeoff) return JSON.stringify({ error: { code: "invalid_arguments", message: `options[${i}] option_id, label, tradeoff must be non-empty` } });
        if (seen.has(option_id)) return JSON.stringify({ error: { code: "invalid_arguments", message: `duplicate option_id: ${option_id}` } }); seen.add(option_id);
        options.push({ option_id, label, tradeoff });
    }
    try {
        const sid = state.input.session_id;
        const profRev2 = state.input.profile_revision;
        let choiceRaw: string;
        if (state.deadline === null) {
            choiceRaw = await resolver({ reason: reason as DecisionReason, prompt, options, session_id: sid, ...(profRev2 !== undefined ? { profile_revision: profRev2 } : {}) });
        } else {
            const remaining = state.deadline - Date.now(); if (remaining <= 0) throw new Error("ask_user_decision exceeded the run timeout");
            let timer: ReturnType<typeof setTimeout> | undefined; const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("ask_user_decision exceeded the run timeout")), remaining); });
            choiceRaw = await Promise.race([resolver({ reason: reason as DecisionReason, prompt, options, session_id: sid, ...(profRev2 !== undefined ? { profile_revision: profRev2 } : {}) }), timeout]).finally(() => { if (timer) clearTimeout(timer); });
        }
        const choice = typeof choiceRaw === "string" ? choiceRaw.trim() : String(choiceRaw ?? "").trim(); if (!choice) return JSON.stringify({ error: { code: "invalid_choice", message: "User reply was empty." } });
        state.tradeoff_history.push({ reason: reason as DecisionReason, prompt, options, choice });
        (state as { tradeoff_calls: number }).tradeoff_calls += 1;
        return JSON.stringify({ choice, reason, prompt, options, tradeoff_calls_used: state.tradeoff_calls, tradeoff_calls_remaining: MAX_TRADEOFF_CALLS - state.tradeoff_calls });
    } catch (error) { if (error instanceof Error && error.message.includes("exceeded the run timeout")) throw error; return JSON.stringify({ error: { code: "tradeoff_failed", message: "Tradeoff resolver failed without exposing details." } }); }
}
async function executeAskUserTradeoffTool(state: Parameters<typeof executeAskUserDecisionTool>[0], rawArguments: string): Promise<string> { return executeAskUserDecisionTool(state, rawArguments); }

// --- simplified input/output ---
export interface RunBudget { max_candidates: number; max_tool_calls: number; max_rows_per_tool_call: number; timeout_ms: number; }

export interface Replan {
    replan_reason: string,
    previous_plan: FinalTripPlan,
}

export interface CandidateDesignInput {
    profile: TravelerProfile;
    session_id: string;
    run_budget: RunBudget;
    replan?: Replan
    profile_revision?: number;
}

export interface CityRecord {
    city_id: string;
    city_name: string;
    state?: string;
    region?: string;
    climate_type?: string;
    destination_type?: string[];
    tourism_popularity?: string;
    recommended_days_min?: number;
    recommended_days_max?: number;
    source?: string[];
    [key: string]: unknown;
}

export interface AttractionRecord {
    attraction_id: string;
    city_id: string;
    name: string;
    description?: string;
    attraction_type?: string;
    best_for?: string[];
    best_time_of_day?: string[];
    visit_duration_min?: number;
    visit_duration_typical?: number;
    visit_duration_max?: number;
    crowd_level?: string;
    accessibility_level?: string;
    adventure_level?: string;
    indoor_outdoor?: string;
    source?: string[];
    [key: string]: unknown;
}

// tools — no guardrail / revision params, backend handles CSV/SQLite internally
export interface SearchCitiesInput { region: string | null; destination_types: string[]; climate_types: string[]; tourism_popularity: string | null; }
export interface SearchCitiesResult { cities: CityRecord[]; next_cursor: string | null; }
export interface GetCityInput { city_id: string; }
export interface GetCityResult { city: CityRecord; }
export interface QueryAttractionsInput { query: string }
export interface QueryAttractionsResult { attractions: AttractionRecord[]; query_id: string; next_cursor: string | null; }
export interface GetAttractionsByIdsInput { city_id: string; attraction_ids: string[]; }
export interface GetAttractionsByIdsResult { attractions: AttractionRecord[]; }

export interface CandidateDesignTools {
    searchCities(input: SearchCitiesInput): Promise<SearchCitiesResult>;
    getCity(input: GetCityInput): Promise<GetCityResult>;
    queryAttractions(input: QueryAttractionsInput): Promise<QueryAttractionsResult>;
    getAttractionsByIds(input: GetAttractionsByIdsInput): Promise<GetAttractionsByIdsResult>;
}

export interface RouteStop { city_id: string; city_name?: string | null; order: number; days: number; reason?: string; evidence_refs?: string[]; }
export interface RouteCandidate { route_id: string; stops: RouteStop[]; assumptions: string[]; tradeoffs: string[]; unresolved_details: string[]; }
export interface VisitApproach { mode: string; timing_preference: string; duration_minutes: number; pace: string; focus: string[]; rationale: string; tradeoffs: string[]; }
export interface SoftConflict { topic: string; explanation: string; alternative_attraction_id: string | null; evidence_refs: string[]; }
export type CandidateDayItemType = "experience" | "meal" | "rest";
export interface CandidateDayItem { type: CandidateDayItemType; attraction_id: string | null; city_id: string | null; title: string; description: string; visit_approach: VisitApproach | null; evidence_refs: string[]; soft_conflicts: SoftConflict[]; }
export interface CandidateDay { city_id: string; day_number: number; items: CandidateDayItem[]; }
export interface CandidateBundle {
    candidate_id: string;
    profile_revision: number;
    dataset_revisions: { city: string; attraction: string; };
    route: RouteCandidate;
    days: CandidateDay[];
    assumptions: string[];
    tradeoffs: string[];
    unresolved_details: string[];
}
export interface CandidateDesignResult {
    mode: "itinerary";
    profile_revision: number;
    dataset_revisions: { city: string; attraction: string; };
    candidates: CandidateBundle[];
    operational: { tool_calls: number; retrieved_rows: number; };
}
export interface FetchRequestInit { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal; }
export interface FetchResponse { ok: boolean; status: number; text(): Promise<string>; }
export type Fetcher = (input: string, init?: FetchRequestInit) => Promise<FetchResponse>;
export interface CandidateDesignOptions {
    tools: CandidateDesignTools;
    api_key?: string;
    model?: string;
    reasoning_effort?: "low" | "medium" | "high";
    api_url?: string;
    timeout_ms?: number;
    fetcher?: Fetcher;
    askUserDecision?: AskUserDecisionResolver;
    /** @deprecated use askUserDecision */
    askUserTradeoff?: AskUserTradeoffResolver;
    onProgress?: (payload: { phase: string; status: string; progress: number; message: string }) => Promise<void>;
}

export class CandidateDesignConfigurationError extends Error { constructor(message: string) { super(message); this.name = "CandidateDesignConfigurationError"; } }
export class CandidateDesignApiError extends Error { readonly status: number; constructor(message: string, status: number) { super(message); this.name = "CandidateDesignApiError"; this.status = status; } }
export class CandidateDesignToolError extends Error { readonly code: string; constructor(message: string, code = "tool_error") { super(message); this.name = "CandidateDesignToolError"; this.code = code; } }
export class CandidateDesignResponseError extends Error { readonly validation_errors: string[]; constructor(message: string, validation_errors: string[] = []) { super(message); this.name = "CandidateDesignResponseError"; this.validation_errors = validation_errors; } }
export class CandidateDesignTimeoutError extends Error { constructor(message: string) { super(message); this.name = "CandidateDesignTimeoutError"; } }

const DEFAULT_MODEL = "muse-spark-1.2-contributor";
const FIXED_MODEL = "muse-spark-1.2-contributor";
const META_BASE_URL = "https://api.meta.ai/v1";
const DEFAULT_TIMEOUT_MS = 30_000;
const PER_MODEL_CALL_TIMEOUT_MS = 60_000;

// const stringOrNullSchema = {
//     anyOf: [{ type: "string" }, { type: "null" }] } as const;

const VISIT_APPROACH_SCHEMA = {
    type: "object", additionalProperties: false,
    properties: { mode: { type: "string" }, timing_preference: { type: "string" }, duration_minutes: { type: "integer" }, pace: { type: "string" }, focus: { type: "array", items: { type: "string" } }, rationale: { type: "string" }, tradeoffs: { type: "array", items: { type: "string" } } },
    required: ["mode", "timing_preference", "duration_minutes", "pace", "focus", "rationale", "tradeoffs"],
} as const;
const SOFT_CONFLICT_SCHEMA = {
    type: "object", additionalProperties: false,
    // properties: { topic: { type: "string" }, explanation: { type: "string" }, alternative_attraction_id: stringOrNullSchema, evidence_refs: { type: "array", items: { type: "string" } } },
    properties: { topic: { type: "string" }, explanation: { type: "string" }, alternative_attraction_id: "string", evidence_refs: { type: "array", items: { type: "string" } } },
    // required: ["topic", "explanation", "alternative_attraction_id", "evidence_refs"],
    required: ["topic", "explanation", "alternative_attraction_id", "evidence_refs"],
} as const;
const DAY_ITEM_SCHEMA = {
    type: "object", additionalProperties: false,
    properties: {
        type: { type: "string", enum: ["experience", "meal", "rest"] },
        // attraction_id: stringOrNullSchema, city_id: stringOrNullSchema, title: { type: "string" }, description: { type: "string" },
        attraction_id: "string", city_id: "string", title: { type: "string" }, description: { type: "string" },
        visit_approach: { type: ["object", "null"], additionalProperties: false, properties: VISIT_APPROACH_SCHEMA.properties, required: VISIT_APPROACH_SCHEMA.required },
        evidence_refs: { type: "array", items: { type: "string" } }, soft_conflicts: { type: "array", items: SOFT_CONFLICT_SCHEMA },
    },
    required: ["type", "attraction_id", "city_id", "title", "description", "visit_approach", "evidence_refs", "soft_conflicts"],
} as const;

export const CANDIDATE_DESIGN_RESPONSE_SCHEMA = {
    type: "object", additionalProperties: false,
    properties: {
        candidates: {
            type: "array", items: {
                type: "object", additionalProperties: false,
                properties: {
                    candidate_id: { type: "string" },
                    profile_revision: { type: "integer" },
                    dataset_revisions: { type: "object", additionalProperties: false, properties: { city: { type: "string" }, attraction: { type: "string" } }, required: ["city", "attraction"] },
                    route: {
                        type: "object", additionalProperties: false,
                        properties: {
                            route_id: { type: "string" },
                            stops: { type: "array", items: { type: "object", additionalProperties: false, properties: { city_id: { type: "string" }, city_name: "string", order: { type: "integer" }, days: { type: "integer" }, reason: { type: "string" }, evidence_refs: { type: "array", items: { type: "string" } } }, required: ["city_id", "city_name", "order", "days", "reason", "evidence_refs"] } },
                            // stops: { type: "array", items: { type: "object", additionalProperties: false, properties: { city_id: { type: "string" }, city_name: stringOrNullSchema, order: { type: "integer" }, days: { type: "integer" }, reason: { type: "string" }, evidence_refs: { type: "array", items: { type: "string" } } }, required: ["city_id", "city_name", "order", "days", "reason", "evidence_refs"] } },
                            assumptions: { type: "array", items: { type: "string" } }, tradeoffs: { type: "array", items: { type: "string" } }, unresolved_details: { type: "array", items: { type: "string" } },
                        }, required: ["route_id", "stops", "assumptions", "tradeoffs", "unresolved_details"],
                    },
                    days: { type: "array", items: { type: "object", additionalProperties: false, properties: { city_id: { type: "string" }, day_number: { type: "integer" }, items: { type: "array", items: DAY_ITEM_SCHEMA } }, required: ["city_id", "day_number", "items"] } },
                    assumptions: { type: "array", items: { type: "string" } }, tradeoffs: { type: "array", items: { type: "string" } }, unresolved_details: { type: "array", items: { type: "string" } },
                }, required: ["candidate_id", "profile_revision", "dataset_revisions", "route", "days", "assumptions", "tradeoffs", "unresolved_details"],
            },
        },
    }, required: ["candidates"],
} as const;

type ChatMessage = Record<string, unknown>;
interface ToolCall { id: string; type: "function"; function: { name: string; arguments: string }; }
interface ModelMessage {
    content: string | null;
    tool_calls: ToolCall[];
}
interface RunState {
    input: CandidateDesignInput;
    options: CandidateDesignOptions;
    deadline: number | null;
    tool_calls: number;
    retrieved_rows: number;
    known_cities: Map<string, CityRecord>;
    known_attractions: Map<string, AttractionRecord>;
    tradeoff_history: TradeoffHistoryEntry[];
    tradeoff_calls: number;
    progressEmitted: Set<string>;
}

async function callProgress(state: RunState, payload: { phase: string; status: string; progress: number; message: string }): Promise<void> {
    if (!state.options.onProgress) return;
    const dedupKey = `${payload.phase}:${payload.progress}`;
    if (state.progressEmitted.has(dedupKey)) return;
    state.progressEmitted.add(dedupKey);
    try { await state.options.onProgress(payload); } catch { /* ignore */ }
}

const PROMPT_PLUG_FIRST_RUN = `
You are Agent 2, the Itinerary Design Agent for Voyager.

You receive only the Traveler Profile. You must discover cities and attractions via retrieval tools — never invent places, restaurants, prices, or opening hours. Stable city_id and attraction_id are the only valid identifiers.`

const PROMPT_PLUG_REPLAN = `
You are Agent 2, the Itinerary Design Agent for Voyager.

The user is currently requesting to re-plan their final trip plan
You are given their current trip plan, their Traveler Profile and the reason they need to re-plan the current plan
Design a new itenerary candidate based on their reason
You must discover cities and attractions via retrieval tools — never invent places, restaurants, prices, or opening hours. Stable city_id and attraction_id are the only valid identifiers.
`

const SYSTEM_PROMPT = `

Rules:
- Ask the user for ATLEAST ONE decision when there are two conflicting options for itenerary item with their tradeoffs
- Return exactly one JSON object matching the supplied schema. Never return markdown or commentary.
- Use only city and attraction records returned by tools.
- Do not invent places, restaurants, providers, prices, fares, distances, travel durations, opening-hour guarantees, bookings, or feasibility decisions.
- Evidence references must contain the stable ID of the place decision they support.
- Meal and rest slots must stay generic. A meal may describe flexible timing or dietary needs but must not name a venue or provider.
- Generate a visit approach for every experience. Duration is a proposal based on retrieved duration fields, not a guarantee.
- Produce ONE itinerary bundle that covers the full trip (route + days). Route days are final allocations matching profile.trip_context.duration_days when present.
- Soft conflicts may remain. If you include one, expose it on the experience item, explain why it may still fit, and reference a known alternative when practical.

Tools:
- search_cities: find known cities (filter by region/destination_types/climate_types/tourism_popularity)
- get_city: load one authoritative city record by city_id
- query_attractions: send in sql query to query attractions db within an explicitly selected city_id, schema for sql query is given below
- get_attractions_by_ids: hydrate exact attraction IDs within a city
- ask_user_decision: ask user to decide on one out of 2-3 options

Tool-use stopping rules:
- Do not repeat the same tool call unless the previous result was empty or insufficient.
- After search_cities returns one or more suitable cities, select the best matching city or cities from those results and continue to the next planning step.
- Do not repeatedly refine search_cities queries merely to search for a "better" result.
- Prefer using already retrieved records before making another search.
- A search_cities result containing suitable cities is sufficient evidence to proceed to get_city or query_attractions.
- Before every tool call, check whether information already retrieved is sufficient.
- Stop calling tools and produce the final JSON as soon as you have enough retrieved evidence to construct the itinerary.
- Tool calls are expensive and strictly limited. Never use a tool just to reconfirm or slightly refine previously retrieved information.


Decision tool (when available):
- Use ask_user_decision only when a material tradeoff, hard-constraint conflict, or missing preference materially changes the plan (e.g. comfort vs coverage, crowd vs intimacy). Max 3 per run.
- Provide reason (material_tradeoff | hard_constraint_conflict | missing_preference), a traveler-facing prompt, and 2-3 options each with option_id, label, and tradeoff.

The final JSON contains the final itinerary bundle (candidates array holds the final choice).

return JSON schema:
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CandidateDesignResult",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "mode",
    "profile_revision",
    "dataset_revisions",
    "candidates",
    "operational"
  ],
  "properties": {
    "mode": {
      "const": "itinerary"
    },
    "profile_revision": {
      "type": "integer"
    },
    "dataset_revisions": {
      "$ref": "#/$defs/DatasetRevisions"
    },
    "candidates": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/CandidateBundle"
      }
    },
    "operational": {
      "$ref": "#/$defs/Operational"
    }
  },
  "$defs": {
    "DatasetRevisions": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "city",
        "attraction"
      ],
      "properties": {
        "city": {
          "type": "string"
        },
        "attraction": {
          "type": "string"
        }
      }
    },
    "Operational": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "tool_calls",
        "retrieved_rows"
      ],
      "properties": {
        "tool_calls": {
          "type": "integer"
        },
        "retrieved_rows": {
          "type": "integer"
        }
      }
    },
    "CandidateBundle": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "candidate_id",
        "profile_revision",
        "dataset_revisions",
        "route",
        "days",
        "assumptions",
        "tradeoffs",
        "unresolved_details"
      ],
      "properties": {
        "candidate_id": {
          "type": "string"
        },
        "profile_revision": {
          "type": "integer"
        },
        "dataset_revisions": {
          "$ref": "#/$defs/DatasetRevisions"
        },
        "route": {
          "$ref": "#/$defs/RouteCandidate"
        },
        "days": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/CandidateDay"
          }
        },
        "assumptions": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "tradeoffs": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "unresolved_details": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      }
    },
    "RouteCandidate": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "route_id",
        "stops",
        "assumptions",
        "tradeoffs",
        "unresolved_details"
      ],
      "properties": {
        "route_id": {
          "type": "string"
        },
        "stops": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/RouteStop"
          }
        },
        "assumptions": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "tradeoffs": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "unresolved_details": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      }
    },
    "CandidateDay": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "city_id",
        "day_number",
        "items"
      ],
      "properties": {
        "city_id": {
          "type": "string"
        },
        "day_number": {
          "type": "integer"
        },
        "items": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/CandidateDayItem"
          }
        }
      }
    },
    "CandidateDayItem": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "type",
        "attraction_id",
        "city_id",
        "title",
        "description",
        "visit_approach",
        "evidence_refs",
        "soft_conflicts"
      ],
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "experience",
            "meal",
            "rest"
          ]
        },
        "attraction_id": {
          "type": [
            "string",
            "null"
          ]
        },
        "city_id": {
          "type": [
            "string",
            "null"
          ]
        },
        "title": {
          "type": "string"
        },
        "description": {
          "type": "string"
        },
        "visit_approach": {
          "anyOf": [
            {
              "$ref": "#/$defs/VisitApproach"
            },
            {
              "type": "null"
            }
          ]
        },
        "evidence_refs": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "soft_conflicts": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/SoftConflict"
          }
        }
      }
    },
    "VisitApproach": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "mode",
        "timing_preference",
        "duration_minutes",
        "pace",
        "focus",
        "rationale",
        "tradeoffs"
      ],
      "properties": {
        "mode": {
          "type": "string"
        },
        "timing_preference": {
          "type": "string"
        },
        "duration_minutes": {
          "type": "integer"
        },
        "pace": {
          "type": "string"
        },
        "focus": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "rationale": {
          "type": "string"
        },
        "tradeoffs": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      }
    },
    "SoftConflict": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "topic",
        "explanation",
        "alternative_attraction_id",
        "evidence_refs"
      ],
      "properties": {
        "topic": {
          "type": "string"
        },
        "explanation": {
          "type": "string"
        },
        "alternative_attraction_id": {
          "type": [
            "string",
            "null"
          ]
        },
        "evidence_refs": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      }
    },
    "RouteStop": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "city_id",
        "order",
        "days"
      ],
      "properties": {
        "city_id": {
          "type": "string"
        },
        "city_name": {
          "type": [
            "string",
            "null"
          ]
        },
        "order": {
          "type": "integer"
        },
        "days": {
          "type": "integer"
        },
        "reason": {
          "type": "string"
        },
        "evidence_refs": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      }
    }
  }
}


When reading or creating city records from the CSV, treat the following fields as controlled values. Search the CSV for the exact existing value before assigning a value. Do not create synonyms, variants, abbreviations, new categories, or city-specific values when a controlled value already exists.

In the CSV, fields will have one of the following values:

region:
- North India
- South India
- East India
- West India
- Northeast India
- Central India

climate_type:
- Tropical
- Arid
- Semi-Arid
- Temperate
- Mediterranean
- Subtropical
- Alpine

destination_type:
- Heritage
- Beach
- Mountain
- Nature
- Wildlife
- Adventure
- Religious
- Cultural
- Urban
- Wellness
- Nightlife
- Food
- Shopping
- Music
- Multiple values are allowed.

tourism_popularity:
- Very High
- High
- Moderate
- Low
- Very Low

For fields with controlled values, always search the CSV for the allowed value before deciding or inserting a value. Match the value exactly, including capitalization, spacing, hyphenation, and spelling.

Do not introduce values such as:
- "North" when the controlled value is "North India"
- "Sub-tropical" when the controlled value is "Subtropical"
- "Highly Popular" when the controlled value is "Very High"
- "Beach Destination" when the controlled value is "Beach"

Fields that are not controlled enumerations must still follow their field-specific constraints:
- city_id: string in 'city_state' format, lowercase, spaces replaced with underscores.
- city_name: recognized official English city name.
- state: official Indian state or union territory name.
- latitude: number in decimal degrees.
- longitude: number in decimal degrees.
- elevation_m: number representing elevation in metres.
- primary_airport: official airport name.
- primary_airport_iata: official three-letter IATA code.
- primary_railway_station: official railway station name.
- primary_railway_station_code: official railway station code when reliably available; otherwise empty/null where permitted.
- recommended_days_min: integer.
- recommended_days_max: integer and must be greater than or equal to 'recommended_days_min'.

For 'destination_type', each individual array value must come from the controlled list above. Never add a value outside that list.

attraction table schema for query_attraction tool call usage
CREATE TABLE attraction (
    attraction_id TEXT PRIMARY KEY
        -- CHECK (
        --     length(attraction_id) > 0
        --     AND attraction_id NOT GLOB '*[^a-z0-9_]*'
        --     AND attraction_id NOT GLOB '_*'
        --     AND attraction_id NOT LIKE '%\_' ESCAPE '\'
        -- )
        ,

    city_id TEXT NOT NULL,

    name TEXT NOT NULL
        CHECK (length(trim(name)) > 0),

    alternate_names TEXT
        CHECK (
            alternate_names IS NULL
            OR (
                json_valid(alternate_names)
                AND json_type(alternate_names) = 'array'
            )
        ),

    attraction_type TEXT NOT NULL,

    subtypes TEXT
        CHECK (
            subtypes IS NULL
            OR (
                json_valid(subtypes)
                AND json_type(subtypes) = 'array'
            )
        ),

    description TEXT NOT NULL
        CHECK (length(trim(description)) > 0),

    significance TEXT NOT NULL
        CHECK (
            json_valid(significance)
            AND json_type(significance) = 'array'
            AND json_array_length(significance) > 0
        ),

    location_area TEXT NOT NULL
        CHECK (length(trim(location_area)) > 0),

    latitude REAL NOT NULL
        CHECK (latitude BETWEEN -90 AND 90),

    longitude REAL NOT NULL
        CHECK (longitude BETWEEN -180 AND 180),

    visit_duration_min INTEGER NOT NULL
        CHECK (visit_duration_min > 0),

    visit_duration_typical INTEGER NOT NULL
        CHECK (
            visit_duration_typical > 0
            AND visit_duration_typical >= visit_duration_min
        ),

    visit_duration_max INTEGER
        CHECK (
            visit_duration_max IS NULL
            OR (
                visit_duration_max >= visit_duration_typical
                AND visit_duration_max >= visit_duration_min
            )
        ),

    best_time_of_day TEXT
        CHECK (
            best_time_of_day IS NULL
            OR (
                json_valid(best_time_of_day)
                AND json_type(best_time_of_day) = 'array'
            )
        ),

    best_months TEXT
        CHECK (
            best_months IS NULL
            OR (
                json_valid(best_months)
                AND json_type(best_months) = 'array'
            )
        ),

    avoid_months TEXT
        CHECK (
            avoid_months IS NULL
            OR (
                json_valid(avoid_months)
                AND json_type(avoid_months) = 'array'
            )
        )
        ,

    crowd_level TEXT NOT NULL
        -- CHECK (crowd_level IN (
        --     'Very_Low', 'Low', 'Moderate', 'High', 'Very_High'
        -- ))
        ,

    tourism_level TEXT NOT NULL
        -- CHECK (tourism_level IN (
        --     'Major_Tourist',
        --     'Popular',
        --     'Moderately_Touristed',
        --     'Local',
        --     'Niche'
        -- ))
        ,

    hidden_gem INTEGER NOT NULL
        CHECK (hidden_gem IN (0, 1)),

    discovery_category TEXT NOT NULL
        -- CHECK (discovery_category IN (
        --     'Must_See',
        --     'Popular',
        --     'Local_Favorite',
        --     'Hidden_Gem',
        --     'Offbeat',
        --     'Seasonal',
        --     'Special_Interest',
        --     'Worth_Detour'
        -- ))
        ,

    local_authenticity TEXT NOT NULL
        -- CHECK (local_authenticity IN (
        --     'Very_High', 'High', 'Moderate', 'Low', 'Very_Low'
        -- ))
        ,

    photography_value TEXT NOT NULL
        -- CHECK (photography_value IN (
        --     'Very_High', 'High', 'Moderate', 'Low', 'Very_Low'
        -- ))
        ,

    indoor_outdoor TEXT NOT NULL
        -- CHECK (indoor_outdoor IN ('Indoor', 'Outdoor', 'Mixed'))
        ,

    adventure_level TEXT NOT NULL
        -- CHECK (adventure_level IN (
        --     'None', 'Low', 'Moderate', 'High', 'Extreme'
        -- ))
        ,

    accessibility_level TEXT NOT NULL
        -- CHECK (accessibility_level IN (
        --     'Very_Easy',
        --     'Easy',
        --     'Moderate',
        --     'Difficult',
        --     'Very_Difficult'
        -- ))
        ,

    family_suitability TEXT NOT NULL
        -- CHECK (family_suitability IN (
        --     'Excellent', 'Very_Good', 'Good', 'Moderate', 'Poor', 'Unsuitable'
        -- ))
        ,

    elderly_suitability TEXT NOT NULL
        -- CHECK (elderly_suitability IN (
        --     'Excellent', 'Very_Good', 'Good', 'Moderate', 'Poor', 'Unsuitable'
        -- ))
        ,

    child_suitability TEXT NOT NULL
        -- CHECK (child_suitability IN (
        --     'Excellent', 'Very_Good', 'Good', 'Moderate', 'Poor', 'Unsuitable'
        -- ))
        ,

    romantic_suitability TEXT NOT NULL
        -- CHECK (romantic_suitability IN (
        --     'Excellent', 'Very_Good', 'Good', 'Moderate', 'Poor', 'Unsuitable'
        -- ))
        ,

    booking_required INTEGER
        CHECK (
            booking_required IS NULL
            OR booking_required IN (0, 1)
        ),

    entry_type TEXT NOT NULL
        -- CHECK (entry_type IN (
        --     'Free',
        --     'Paid',
        --     'Donation',
        --     'Restricted',
        --     'Reservation_Required',
        --     'Permit_Required',
        --     'Seasonal'
        -- ))
        ,

    best_for TEXT NOT NULL
        CHECK (
            json_valid(best_for)
            AND json_type(best_for) = 'array'
            AND json_array_length(best_for) > 0
        ),

    source TEXT NOT NULL
        CHECK (
            json_valid(source)
            AND json_type(source) = 'array'
            AND json_array_length(source) > 0
        ),

    last_updated TEXT NOT NULL
        CHECK (
            last_updated GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
            AND date(last_updated) IS NOT NULL
            -- AND date(last_updated) <= date('now')
        )
);

`;

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function nonEmptyString(value: unknown, path: string): string {
    if (typeof value !== "string" || value.trim().length === 0) throw new CandidateDesignResponseError(`${path} must be a non-empty string`, [`${path}: non-empty string required`]);
    return value.trim();
}
function stringArray(value: unknown, path: string): string[] {
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim().length === 0)) throw new CandidateDesignResponseError(`${path} must be an array of non-empty strings`, [`${path}: string array required`]);
    return value.map((item) => (item as string).trim());
}
function positiveInteger(value: unknown, path: string): number {
    if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) throw new CandidateDesignResponseError(`${path} must be a positive integer`, [`${path}: positive integer required`]);
    return value;
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[], path: string): void {
    const expected = new Set(keys);
    for (const key of Object.keys(value)) if (!expected.has(key)) throw new CandidateDesignResponseError(`${path} contains unsupported field ${key}`, [`${path}.${key}: unsupported field`]);
}
function validateProfile(profile: TravelerProfile): void {
    if (!isRecord(profile)) throw new CandidateDesignConfigurationError("profile must be an object");
    for (const key of ["profile_id", "trip_context", "purpose_and_priorities", "preferences", "travel_style", "hard_constraints", "unknowns", "assumptions"]) {
        if (!(key in profile)) throw new CandidateDesignConfigurationError(`profile.${key} is required`);
    }
    if (typeof profile.profile_id !== "string" || profile.profile_id.trim().length === 0) throw new CandidateDesignConfigurationError("profile.profile_id must be a non-empty string");
    if (!isRecord(profile.trip_context) || !isRecord(profile.hard_constraints)) throw new CandidateDesignConfigurationError("profile trip_context and hard_constraints must be objects");
}
function validateInput(input: CandidateDesignInput): void {
    if (!isRecord(input)) throw new CandidateDesignConfigurationError("planning input must be an object");
    validateProfile(input.profile);
    if (typeof input.session_id !== "string" || input.session_id.trim().length === 0) throw new CandidateDesignConfigurationError("session_id is required");
    if (!isRecord(input.run_budget)) throw new CandidateDesignConfigurationError("run_budget is required");
    if (!Number.isInteger(input.run_budget.max_candidates) || input.run_budget.max_candidates < 1 || input.run_budget.max_candidates > 5) throw new CandidateDesignConfigurationError("run_budget.max_candidates must be between 1 and 5");
    if (!Number.isInteger(input.run_budget.max_tool_calls) || input.run_budget.max_tool_calls < 1 || input.run_budget.max_tool_calls > 100) throw new CandidateDesignConfigurationError("run_budget.max_tool_calls must be between 1 and 100");
    if (!Number.isInteger(input.run_budget.max_rows_per_tool_call) || input.run_budget.max_rows_per_tool_call < 1 || input.run_budget.max_rows_per_tool_call > 50) throw new CandidateDesignConfigurationError("run_budget.max_rows_per_tool_call must be between 1 and 50");
    if (!Number.isInteger(input.run_budget.timeout_ms) || input.run_budget.timeout_ms < 0 || input.run_budget.timeout_ms > 1200000) throw new CandidateDesignConfigurationError("run_budget.timeout_ms must be between 0 and 1200000 (0 = no timeout)");
    if (input.run_budget.timeout_ms !== 0 && input.run_budget.timeout_ms !== undefined && input.run_budget.timeout_ms < 0) throw new CandidateDesignConfigurationError("run_budget.timeout_ms must be 0 or positive");
}

function buildToolSchemas(options: CandidateDesignOptions): unknown[] {
    const searchCities = {
        type: "function", function: {
            name: "search_cities", description: "Search known cities from csv file. Use to discover cities matching the traveler's destination request and preferences.", strict: true,
                parameters: {
                        type: "object", additionalProperties: false, properties: {
                            region: { type: "string", description: "region of the city, possible values in system prompt" },
                            // region: { type: stringOrNullSchema, description: "region of the city, possible values in system prompt" },
                            destination_types: { type: "array", items: { type: "string" }, description: "venue category for destination, possible values in system prompt" },
                            climate_types: { type: "array", items: { type: "string" }, description: "climate category for destination, possible values in system prompt" },
                            // tourism_popularity: { type: stringOrNullSchema, description: "popularity level of destination, controlled values in system prompt" }
                            tourism_popularity: { type: "string", description: "popularity level of destination, controlled values in system prompt" }
                        }, required: ["region", "destination_types", "climate_types", "tourism_popularity"]
                },
        },
    };
    const getCity = {
        type: "function", function: {
            name: "get_city", description: "Load one authoritative city record by stable city_id.", strict: true,
            parameters: { type: "object", additionalProperties: false, properties: { city_id: { type: "string", description: "stable city_id, string" } }, required: ["city_id"] },
        },
    };
    const queryAttractions = {
        type: "function", function: {
            name: "query_attractions", description: "Query known attractions using sql queries.", strict: true,
            parameters: { type: "object", additionalProperties: false, properties: { query: { type: "string", description: "sql query for a sqlite table, schema in system prompt"} }, required: ["query"] },
        },
    };
    const getAttractionsByIds = {
        type: "function", function: {
            name: "get_attractions_by_ids", description: "Hydrate exact known attraction IDs within the selected city.", strict: true,
            parameters: { type: "object", additionalProperties: false, properties: { city_id: { type: "string" }, attraction_ids: { type: "array", items: { type: "string" } } }, required: ["city_id", "attraction_ids"] },
        },
    };
    const tools: unknown[] = [searchCities, getCity, queryAttractions, getAttractionsByIds];
    const hasDecisionResolver = !!(options.askUserDecision ?? options.askUserTradeoff);
    if (hasDecisionResolver) tools.push(buildAskUserDecisionToolSchema());
// console.log(
//     "\nAVAILABLE TOOLS:",
//     (tools as any[]).map(
//         (t) => t?.function?.name
//     )
// );
    return tools;
}

function buildUserMessage(input: CandidateDesignInput): string {
    if (input.replan)
        return JSON.stringify({ profile: input.profile, session_id: input.session_id, replan: input.replan });
    return JSON.stringify({ profile: input.profile, session_id: input.session_id });
}

function defaultFetcher(input: string, init?: FetchRequestInit): Promise<FetchResponse> { return fetch(input, init as RequestInit); }

async function withDeadline<T>(promise: Promise<T>, deadline: number | null, label: string): Promise<T> {
    if (deadline === null || deadline === undefined) return promise;
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new CandidateDesignTimeoutError(`${label} exceeded the run timeout`);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new CandidateDesignTimeoutError(`${label} exceeded the run timeout`)), remaining); });
    try { return await Promise.race([promise, timeout]); } finally { if (timer) clearTimeout(timer); }
}
function toolFailureMessage(error: unknown): string {
    if (error instanceof CandidateDesignToolError) return JSON.stringify({ error: { code: error.code, message: error.message } });
    return JSON.stringify({ error: { code: "retrieval_failed", message: "The retrieval adapter failed without exposing provider details." } });
}
function ensureToolBudget(state: RunState): void {
    if (state.tool_calls >= state.input.run_budget.max_tool_calls) throw new CandidateDesignToolError("The run tool-call budget was exhausted", "tool_budget_exhausted");
    if (state.deadline !== null && Date.now() >= state.deadline) throw new CandidateDesignTimeoutError("The run timeout was exceeded");
    state.tool_calls += 1;
}
function validateCityRecord(city: CityRecord): void {
    if (!isRecord(city) || typeof city.city_id !== "string" || typeof city.city_name !== "string") throw new CandidateDesignToolError("retrieval returned an invalid city record", "invalid_city_record");
}
function validateAttractionRecord(attraction: AttractionRecord, cityId: string): void {
    if (!isRecord(attraction) || typeof attraction.attraction_id !== "string" || typeof attraction.city_id !== "string" || typeof attraction.name !== "string") throw new CandidateDesignToolError("retrieval returned an invalid attraction record", "invalid_attraction_record");
    if (attraction.city_id !== cityId) throw new CandidateDesignToolError("retrieval returned an attraction outside the selected city", "out_of_scope_attraction");
}

async function executeTool(state: RunState, name: string, rawArguments: string): Promise<string> {
    ensureToolBudget(state);
    let args: Record<string, unknown>;
    try { const parsed: unknown = JSON.parse(rawArguments); if (!isRecord(parsed)) throw new Error("arguments must be an object"); args = parsed; } catch { return JSON.stringify({ error: { code: "invalid_arguments", message: "Tool arguments must be valid JSON object arguments." } }); }
    const hasResolver = !!((state.options as any).askUserDecision ?? (state.options as any).askUserTradeoff);
    const allowed = ["search_cities", "get_city", "query_attractions", "get_attractions_by_ids", ...(hasResolver ? ["ask_user_decision", "ask_user_tradeoff"] : [])];
    if (!allowed.includes(name)) return JSON.stringify({ error: { code: "tool_not_allowed", message: `Tool ${name} is not available.` } });
    if (name === "ask_user_decision" || name === "ask_user_tradeoff") return executeAskUserDecisionTool(state as unknown as Parameters<typeof executeAskUserDecisionTool>[0], rawArguments);
    try {
        if (name === "search_cities") {
            exactKeys(args, ["region", "destination_types", "climate_types", "tourism_popularity"], "search_cities arguments");
            const result = await withDeadline(state.options.tools!.searchCities({
                region: args.region === null ? null : nonEmptyString(args.region, "search_cities.region"),
                destination_types: stringArray(args.destination_types, "search_cities.destination_types"),
                climate_types: stringArray(args.climate_types, "search_cities.climate_types"),
                tourism_popularity: args.tourism_popularity === null ? null : nonEmptyString(args.tourism_popularity, "search_cities.tourism_popularity"),
            }), state.deadline, "search_cities");
            if (result.cities.length > state.input.run_budget.max_rows_per_tool_call) throw new CandidateDesignToolError("search_cities exceeded the row limit", "row_budget_exhausted");
            for (const city of result.cities) { validateCityRecord(city); state.known_cities.set(city.city_id, city); }
            state.retrieved_rows += result.cities.length;
            await callProgress(state, { phase: "destination_design", status: "running", progress: 22, message: "Searching cities..." });
            return JSON.stringify({ cities: result.cities, next_cursor: result.next_cursor });
        }
        if (name === "get_city") {
            exactKeys(args, ["city_id"], "get_city arguments");
            const cityId = nonEmptyString(args.city_id, "get_city.city_id");
            const result = await withDeadline(state.options.tools!.getCity({ city_id: cityId }), state.deadline, "get_city");
            validateCityRecord(result.city);
            if (result.city.city_id !== cityId) throw new CandidateDesignToolError("get_city returned a different city_id", "city_id_mismatch");
            state.known_cities.set(cityId, result.city);
            state.retrieved_rows += 1;
            return JSON.stringify({ city: result.city });
        }
        if (name === "query_attractions") {
            exactKeys(args, ["query"], "query_attractions arguments");
            const result = await withDeadline(state.options.tools!.queryAttractions({
                query: typeof args.query === "string" ? args.query.trim() : "",
            }), state.deadline, "query_attractions");
            if (result.attractions.length > state.input.run_budget.max_rows_per_tool_call) throw new CandidateDesignToolError("query_attractions exceeded the row limit", "row_budget_exhausted");
            state.retrieved_rows += result.attractions.length;
            await callProgress(state, { phase: "destination_design", status: "running", progress: 45, message: "Curating experiences..." });
            return JSON.stringify({ query_id: result.query_id, attractions: result.attractions, next_cursor: result.next_cursor });
        }
        // get_attractions_by_ids
        exactKeys(args, ["city_id", "attraction_ids"], "get_attractions_by_ids arguments");
        const cityId2 = nonEmptyString(args.city_id, "get_attractions_by_ids.city_id");
        const attractionIds = stringArray(args.attraction_ids, "get_attractions_by_ids.attraction_ids");
        if (attractionIds.length === 0 || attractionIds.length > state.input.run_budget.max_rows_per_tool_call) throw new CandidateDesignToolError("attraction_ids exceed the row limit", "row_budget_exhausted");
        const result = await withDeadline(state.options.tools!.getAttractionsByIds({ city_id: cityId2, attraction_ids: attractionIds }), state.deadline, "get_attractions_by_ids");
        if (result.attractions.length > state.input.run_budget.max_rows_per_tool_call) throw new CandidateDesignToolError("get_attractions_by_ids exceeded the row limit", "row_budget_exhausted");
        for (const attraction of result.attractions) { validateAttractionRecord(attraction, cityId2); state.known_attractions.set(attraction.attraction_id, attraction); }
        state.retrieved_rows += result.attractions.length;
        return JSON.stringify({ attractions: result.attractions });
    } catch (error) {
        if (error instanceof CandidateDesignTimeoutError) throw error;
        if (error instanceof CandidateDesignToolError) return toolFailureMessage(error);
        return toolFailureMessage(error);
    }
}

function parseModelMessage(payload: unknown): ModelMessage {
    if (isRecord(payload) && Array.isArray((payload as any).candidates)) {
        const cand = (payload as any).candidates[0];
        const parts = cand?.content?.parts ?? [];
        const calls: ToolCall[] = []; let text: string | null = null;
        for (const part of parts) {
            if (part.functionCall) { const fc = part.functionCall; calls.push({ id: fc.id ?? `call-${calls.length}`, type: "function", function: { name: fc.name, arguments: typeof fc.args === "string" ? fc.args : JSON.stringify(fc.args ?? {}) } }); }
            else if (typeof part.text === "string") text = text ? text + part.text : part.text;
        }
        if ((payload as any).functionCalls && Array.isArray((payload as any).functionCalls)) {
            for (const fc of (payload as any).functionCalls) calls.push({ id: fc.id ?? `call-${calls.length}`, type: "function", function: { name: fc.name, arguments: typeof fc.args === "string" ? fc.args : JSON.stringify(fc.args ?? {}) } });
        }
        if (calls.length > 0 || text !== null) return { content: text, tool_calls: calls };
    }
    if (isRecord(payload) && typeof (payload as any).output_text === "string") return { content: (payload as any).output_text, tool_calls: [] };
    if (isRecord(payload) && typeof (payload as any).outputText === "string") return { content: (payload as any).outputText, tool_calls: [] };
    if (!isRecord(payload) || !Array.isArray((payload as any).choices) || !isRecord((payload as any).choices[0])) throw new CandidateDesignResponseError("model response did not contain choices", ["choices: response array required"]);
    const choice = (payload as any).choices[0]; const message = isRecord(choice.message) ? choice.message : null;
    if (!message) throw new CandidateDesignResponseError("model response did not contain a message", ["choices[0].message: object required"]);
    const rawCalls = (message as any).tool_calls; const calls: ToolCall[] = [];
    if (rawCalls !== undefined) {
        if (!Array.isArray(rawCalls)) throw new CandidateDesignResponseError("tool_calls must be an array", ["tool_calls: array required"]);
        for (const [index, rawCall] of rawCalls.entries()) {
            if (!isRecord(rawCall) || rawCall.type !== "function" || typeof rawCall.id !== "string" || !isRecord(rawCall.function) || typeof rawCall.function.name !== "string" || typeof rawCall.function.arguments !== "string") throw new CandidateDesignResponseError(`invalid tool call at index ${index}`, [`tool_calls[${index}]: invalid function call`]);
            calls.push({ id: rawCall.id, type: "function", function: { name: rawCall.function.name, arguments: rawCall.function.arguments } });
        }
    }
    return { content: typeof (message as any).content === "string" ? (message as any).content : null, tool_calls: calls };
}

// OpenAI helper — tools are already in OpenAI shape { type:"function", function:{name,description,parameters} }
function toGeminiDeclarations(_tools: unknown[]): any[] { return []; }

async function requestModel(state: RunState, messages: ChatMessage[], tools: unknown[]): Promise<ModelMessage> {
    const apiKey = state.options.api_key ?? process.env.OPENAI_API_KEY ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) throw new CandidateDesignConfigurationError("Missing OPENAI_API_KEY. Set it in the environment or pass api_key.");
    const model = FIXED_MODEL;
    const fetcher = state.options.fetcher;
    if (fetcher) {
        for (let attempt = 0; attempt < 5; attempt += 1) {
            const controller = new AbortController();
            const hasDeadline = state.deadline !== null;
            // Keep run infinite (deadline null) but bound each model call to PER_MODEL_CALL_TIMEOUT_MS
            const callDeadline = hasDeadline ? state.deadline : Date.now() + PER_MODEL_CALL_TIMEOUT_MS;
            const remaining = Math.max(1, callDeadline - Date.now());
            const abortTimer = setTimeout(() => controller.abort(), remaining);
            try {
                const response = await withDeadline(fetcher(`${META_BASE_URL}/chat/completions`, {
                    method: "POST", headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" }, signal: controller.signal,
                    body: JSON.stringify({ model, messages, ...(tools.length > 0 ? { tools, tool_choice: "auto" } : { response_format: { type: "json_schema", json_schema: { name: "candidate_design_result", strict: true, schema: CANDIDATE_DESIGN_RESPONSE_SCHEMA } } }), temperature: 0.2, max_tokens: 8192, reasoning_effort: REASONING_EFFORT }),
                } as any), callDeadline, "model request");
                const rawText = await withDeadline(response.text(), callDeadline, "model response read");
                if (response.status === 429 && attempt < 4) {
                    const m = rawText.match(/try again in ([\d.]+)s/i); const delayMs = m?.[1] ? Math.ceil(parseFloat(m[1]) * 1000) + 500 : 4000 * (attempt + 1);
                    const waitMs = hasDeadline ? Math.min(delayMs, Math.max(0, state.deadline! - Date.now() - 1000)) : Math.min(delayMs, 5000); if (abortTimer) clearTimeout(abortTimer);
                    if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
                    if (hasDeadline && Date.now() >= state.deadline!) throw new CandidateDesignTimeoutError("The run timeout was exceeded during rate-limit backoff");
                    continue;
                }
                if (!response.ok) throw new CandidateDesignApiError(`Candidate Design model request failed with status ${response.status}: ${rawText}`, response.status);
                let payload: unknown; try { payload = JSON.parse(rawText); } catch { throw new CandidateDesignResponseError("model API returned malformed JSON", ["api_response: valid JSON required"]); }
                return parseModelMessage(payload);
            } finally { clearTimeout(abortTimer); }
        }
        throw new CandidateDesignApiError("Candidate Design model request failed after retries", 429);
    }
    const client = new OpenAI({ apiKey, baseURL: META_BASE_URL } as any);
    const withTimeout = async <T>(promise: Promise<T>, ms: number | null): Promise<T> => {
        if (ms === null) return promise;
        let tid: ReturnType<typeof setTimeout>; const tp = new Promise<never>((_, rej) => { tid = setTimeout(() => rej(new DOMException("Timeout", "AbortError")), ms); });
        try { const r = await Promise.race([promise, tp]); clearTimeout(tid!); return r as T; } catch (e) { clearTimeout(tid!); throw e; }
    };
    for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
            const hasDeadline2 = state.deadline !== null;
            const callDeadline2 = hasDeadline2 ? state.deadline : Date.now() + PER_MODEL_CALL_TIMEOUT_MS;
            const remaining = Math.max(1, callDeadline2 - Date.now());
            const payload: any = {
                model,
                messages: messages as any,
                temperature: 0.2,
                max_tokens: 8192,
                reasoning_effort: REASONING_EFFORT,
                ...(tools.length > 0 ? { tools: tools as any, tool_choice: "auto" as const } : { response_format: { type: "json_schema" as const, json_schema: { name: "candidate_design_result", strict: true, schema: CANDIDATE_DESIGN_RESPONSE_SCHEMA as any } } }),
            };
            const response: any = await withTimeout(client.chat.completions.create(payload), remaining);
            const choice = response?.choices?.[0];
            const msg: any = choice?.message;
            if (msg?.tool_calls && msg.tool_calls.length > 0) {
                const calls: ToolCall[] = msg.tool_calls.map((tc: any, idx: number) => ({
                    id: tc.id ?? `call-${idx}`,
                    type: "function",
                    function: { name: tc.function?.name ?? tc.name, arguments: tc.function?.arguments ?? JSON.stringify(tc.function?.arguments ?? {}) },
                }));
                return { content: msg.content ?? null, tool_calls: calls };
            }
            const text: string = msg?.content ?? "";
            if (!text) throw new CandidateDesignResponseError("model returned neither tool calls nor final JSON" + " text: " + text, ["message.content: final JSON required"]);
            return { content: text, tool_calls: [] };
        } catch (e: any) {
            const msg = String(e?.message ?? ""); const isRate = e?.status === 429 || msg.includes("429") || /rate limit/i.test(msg);
            if (isRate && attempt < 4) {
                const m = msg.match(/try again in ([\d.]+)s/i); const delayMs = m?.[1] ? Math.ceil(parseFloat(m[1]) * 1000) + 500 : 4000 * (attempt + 1);
                const waitMs = state.deadline !== null ? Math.min(delayMs, Math.max(0, state.deadline! - Date.now() - 1000)) : Math.min(delayMs, 5000);
                if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs)); continue;
            }
            if (e instanceof CandidateDesignApiError || e instanceof CandidateDesignResponseError) throw e;
            if (e instanceof DOMException && e.name === "AbortError") {
                if (state.deadline !== null) throw new CandidateDesignTimeoutError("The run timeout was exceeded");
                throw e;
            }
            throw e;
        }
    }
    throw new CandidateDesignApiError("Candidate Design model request failed after retries", 429);
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function modelToolLoop(state: RunState, messages: ChatMessage[], tools: unknown[]): Promise<string> {
    const maxTurns = state.input.run_budget.max_tool_calls + 2;
    for (let turn = 0; turn < maxTurns; turn += 1) {
        let message: ModelMessage;
        try { message = await requestModel(state, messages, tools); } catch (e) {
            if (e instanceof CandidateDesignApiError && (e.status === 400 || String(e.message).includes("400")) && String(e.message).includes("tool_use_failed")) {
                const detail = String(e.message).slice(0, 600);
                messages.push({ role: "user", content: JSON.stringify({ repair_errors: [`Tool call validation failed: ${detail}. Ensure all tool arguments match schema types.`] }) });
                continue;
            } throw e;
        }
        if (message.tool_calls.length > 0) {
            messages.push({
                role: "assistant",
                content: message.content,
                tool_calls: message.tool_calls,
            });

            for (const call of message.tool_calls) {
                const output = await executeTool(state, call.function.name, call.function.arguments);
                messages.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: output });
            }
            // No artificial gap when run is infinite — saves ~400ms per tool turn (10 turns = 4s)
            if (state.deadline !== null && Date.now() + gap < state.deadline) await new Promise((r) => setTimeout(r, gap));
            continue;
        }
        if (!message.content) throw new CandidateDesignResponseError("model returned neither tool calls nor final JSON", ["message.content: final JSON required"]);
        return message.content;
    }
    throw new CandidateDesignToolError("model/tool-call loop exceeded its bounded turn budget", "tool_budget_exhausted");
}

function normalizeCandidateResponse(content: string): CandidateBundle[] {
    let parsed: unknown;
    try { parsed = JSON.parse(content); } catch { throw new CandidateDesignResponseError("model final response was not valid JSON", ["response: valid JSON required"]); }
    if (!isRecord(parsed)) throw new CandidateDesignResponseError("model final response must be an object", ["response: object required"]);
    const rec = parsed as Record<string, unknown>;
    if (!("candidates" in rec) && "candidate_routes" in rec) rec["candidates"] = rec["candidate_routes"];
    if (!("candidates" in rec) && "candidate_route" in rec) rec["candidates"] = rec["candidate_route"];
    if (!("candidates" in rec) && "candidate_bundles" in rec) rec["candidates"] = rec["candidate_bundles"];
    if (!("candidates" in rec) && "routes" in rec) rec["candidates"] = rec["routes"];
    if (!("candidates" in rec) && "route" in rec && Array.isArray(rec["route"])) rec["candidates"] = rec["route"];
    if (!("candidates" in rec)) for (const k of Object.keys(rec)) if (k.toLowerCase().includes("candidate") && Array.isArray(rec[k])) { rec["candidates"] = rec[k]; break; }
    const candidatesRaw = rec["candidates"];
    if (candidatesRaw === undefined) throw new CandidateDesignResponseError("response.candidates missing", ["candidates: array required"]);
    const arr = Array.isArray(candidatesRaw) ? candidatesRaw : isRecord(candidatesRaw) ? [candidatesRaw] : null;
    if (!arr) throw new CandidateDesignResponseError("response.candidates must be an array", ["candidates: array required"]);
    return arr as CandidateBundle[];
}

function validateCandidate(candidate: CandidateBundle, state: RunState, index: number): void {
    for (const day of candidate.days) for (const item of day.items) {
        // if (item.type === "meal") {
        //     const combined = `${item.title} ${item.description}`;
        //     if (/\b(?:at|called|named)\s+[A-Z][\w'-]+/.test(combined) || /\b(?:cafe|café|restaurant|hotel)\s+[A-Z]/i.test(combined)) throw new CandidateDesignResponseError(`candidates[${index}] meal slot names a venue`, [`candidates[${index}].days: generic meal slot required`]);
        // }
        if (item.type === "experience") {
            if (!item.title || !item.title.trim() || !item.description || !item.description.trim() || !item.visit_approach) throw new CandidateDesignResponseError(`candidates[${index}] has incomplete experience item`, [`candidates[${index}].days: experience item incomplete`]);
            if (item.attraction_id && state.known_attractions.size > 0 && !state.known_attractions.has(item.attraction_id)) {
                // allow if attraction was not retrieved but still grounded — warn via unresolved, don't hard-fail (ponytail: trust retrieval but enforce if known set)
            }
        }
    }
}

function buildRepairMessage(errors: string[]): string { return JSON.stringify({ repair_errors: errors.slice(0, 20) }); }

export async function processCandidateDesign(input: CandidateDesignInput, options: CandidateDesignOptions): Promise<CandidateDesignResult> {

    validateInput(input);
    if (!options || !options.tools) throw new CandidateDesignConfigurationError("CandidateDesignOptions.tools is required");
    // Long processes: 0 or undefined means no timeout (deadline = null = infinite). Otherwise use min of both.
    const budgetMs = input.run_budget.timeout_ms;
    const optMs = options.timeout_ms;
    let deadline: number | null = null;
    if (budgetMs > 0 || (optMs !== undefined && optMs > 0)) {
        const effectiveMs = budgetMs > 0 && optMs !== undefined && optMs > 0 ? Math.min(budgetMs, optMs) : (budgetMs > 0 ? budgetMs : optMs!);
        deadline = Date.now() + effectiveMs;
    }
    const state: RunState = {
        input, options,
        deadline,
        tool_calls: 0, retrieved_rows: 0,
        known_cities: new Map(), known_attractions: new Map(),
        tradeoff_history: [], tradeoff_calls: 0,
        progressEmitted: new Set<string>(),
    };
    const final_sys_prompt = (input.replan) ? PROMPT_PLUG_REPLAN + SYSTEM_PROMPT : PROMPT_PLUG_FIRST_RUN + SYSTEM_PROMPT;
    const messages: ChatMessage[] = [
        { role: "system", content: final_sys_prompt },
        { role: "user", content: buildUserMessage(input) },
    ];
    const tools = buildToolSchemas(state.options);
    let candidates: CandidateBundle[] | null = null;
    let repairAttempts = 0;
    while (candidates === null) {
        const content = await modelToolLoop(state, messages, tools);
        try {
            const normalized = normalizeCandidateResponse(content);
            if (normalized.length < 1 || normalized.length > input.run_budget.max_candidates) throw new CandidateDesignResponseError("candidate count is outside the bounded run limit", ["candidates: count exceeds configured limit"]);
            const candidateIds = new Set<string>();
            for (const [index, candidate] of normalized.entries()) {
                if (candidateIds.has(candidate.candidate_id)) throw new CandidateDesignResponseError("candidate IDs must be unique", [`candidates[${index}].candidate_id: duplicate`]);
                candidateIds.add(candidate.candidate_id);
                validateCandidate(candidate, state, index);
            }
            candidates = normalized;
            await callProgress(state, { phase: "destination_design", status: "running", progress: 62, message: "Shaping itinerary..." });
        } catch (error) {
            throw error;
            // if (!(error instanceof CandidateDesignResponseError) || repairAttempts >= 2) {

            //     if (error instanceof CandidateDesignResponseError) throw error;
            //     throw new CandidateDesignResponseError("candidate response validation failed");
            // }
            // repairAttempts += 1;
            // messages.push({ role: "user", content: buildRepairMessage(error.validation_errors.length ? error.validation_errors : [error.message]) });
        }
    }
    return {
        mode: "itinerary",
        profile_revision: 1,
        dataset_revisions: { city: "local", attraction: "local" },
        candidates,
        operational: { tool_calls: state.tool_calls, retrieved_rows: state.retrieved_rows },
    };
}
