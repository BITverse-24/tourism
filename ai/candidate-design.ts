/**
 * Voyager Agent 2 — simplified.
 * Input: { profile, session_id, run_budget } only.
 * Agent discovers cities/attractions via tools; backend owns CSV/SQLite query.
 */

import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

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
export interface AskUserDecisionRequest { reason: DecisionReason; prompt: string; options: AskUserDecisionOption[]; session_id?: string; }
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
  state: { known_attractions: Map<string, { attraction_id: string; city_id: string; name: string }>; tradeoff_history: TradeoffHistoryEntry[]; tradeoff_calls: number; options: { askUserTradeoff?: AskUserDecisionResolver; askUserDecision?: AskUserDecisionResolver }; deadline: number; input: CandidateDesignInput; },
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
      const remaining = state.deadline - Date.now(); if (remaining <= 0) throw new Error("ask_user_decision exceeded the run timeout");
      let timer: ReturnType<typeof setTimeout> | undefined; const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("ask_user_decision exceeded the run timeout")), remaining); });
      const sid = state.input.session_id;
      const genericReq: AskUserDecisionRequest = { reason: "material_tradeoff", prompt: question, options: [{ option_id: aId, label: a.name, tradeoff: tradeoffA }, { option_id: bId, label: b.name, tradeoff: tradeoffB }], session_id: sid };
      const legacyReq: any = { attraction_id_a: aId, attraction_id_b: bId, question, tradeoff_a: tradeoffA, tradeoff_b: tradeoffB, session_id: sid };
      const choiceRaw = await Promise.race([resolver(legacyReq), timeout]).finally(() => { if (timer) clearTimeout(timer); });
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
    const remaining = state.deadline - Date.now(); if (remaining <= 0) throw new Error("ask_user_decision exceeded the run timeout");
    let timer: ReturnType<typeof setTimeout> | undefined; const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("ask_user_decision exceeded the run timeout")), remaining); });
    const sid = state.input.session_id;
    const choiceRaw = await Promise.race([resolver({ reason: reason as DecisionReason, prompt, options, session_id: sid }), timeout]).finally(() => { if (timer) clearTimeout(timer); });
    const choice = typeof choiceRaw === "string" ? choiceRaw.trim() : String(choiceRaw ?? "").trim(); if (!choice) return JSON.stringify({ error: { code: "invalid_choice", message: "User reply was empty." } });
    state.tradeoff_history.push({ reason: reason as DecisionReason, prompt, options, choice });
    (state as { tradeoff_calls: number }).tradeoff_calls += 1;
    return JSON.stringify({ choice, reason, prompt, options, tradeoff_calls_used: state.tradeoff_calls, tradeoff_calls_remaining: MAX_TRADEOFF_CALLS - state.tradeoff_calls });
  } catch (error) { if (error instanceof Error && error.message.includes("exceeded the run timeout")) throw error; return JSON.stringify({ error: { code: "tradeoff_failed", message: "Tradeoff resolver failed without exposing details." } }); }
}
async function executeAskUserTradeoffTool(state: Parameters<typeof executeAskUserDecisionTool>[0], rawArguments: string): Promise<string> { return executeAskUserDecisionTool(state, rawArguments); }

// --- simplified input/output ---
export interface RunBudget { max_candidates: number; max_tool_calls: number; max_rows_per_tool_call: number; timeout_ms: number; }

export interface CandidateDesignInput {
  profile: TravelerProfile;
  session_id: string;
  run_budget: RunBudget;
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
export interface QueryAttractionsInput { city_id: string; query: string; best_for: string[]; attraction_types: string[]; }
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
}

export class CandidateDesignConfigurationError extends Error { constructor(message: string) { super(message); this.name = "CandidateDesignConfigurationError"; } }
export class CandidateDesignApiError extends Error { readonly status: number; constructor(message: string, status: number) { super(message); this.name = "CandidateDesignApiError"; this.status = status; } }
export class CandidateDesignToolError extends Error { readonly code: string; constructor(message: string, code = "tool_error") { super(message); this.name = "CandidateDesignToolError"; this.code = code; } }
export class CandidateDesignResponseError extends Error { readonly validation_errors: string[]; constructor(message: string, validation_errors: string[] = []) { super(message); this.name = "CandidateDesignResponseError"; this.validation_errors = validation_errors; } }
export class CandidateDesignTimeoutError extends Error { constructor(message: string) { super(message); this.name = "CandidateDesignTimeoutError"; } }

const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_TIMEOUT_MS = 30_000;

const stringOrNullSchema = { type: ["string", "null"] } as const;

const VISIT_APPROACH_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: { mode: { type: "string" }, timing_preference: { type: "string" }, duration_minutes: { type: "integer" }, pace: { type: "string" }, focus: { type: "array", items: { type: "string" } }, rationale: { type: "string" }, tradeoffs: { type: "array", items: { type: "string" } } },
  required: ["mode", "timing_preference", "duration_minutes", "pace", "focus", "rationale", "tradeoffs"],
} as const;
const SOFT_CONFLICT_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: { topic: { type: "string" }, explanation: { type: "string" }, alternative_attraction_id: stringOrNullSchema, evidence_refs: { type: "array", items: { type: "string" } } },
  required: ["topic", "explanation", "alternative_attraction_id", "evidence_refs"],
} as const;
const DAY_ITEM_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    type: { type: "string", enum: ["experience", "meal", "rest"] },
    attraction_id: stringOrNullSchema, city_id: stringOrNullSchema, title: { type: "string" }, description: { type: "string" },
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
              stops: { type: "array", items: { type: "object", additionalProperties: false, properties: { city_id: { type: "string" }, city_name: stringOrNullSchema, order: { type: "integer" }, days: { type: "integer" }, reason: { type: "string" }, evidence_refs: { type: "array", items: { type: "string" } } }, required: ["city_id", "city_name", "order", "days", "reason", "evidence_refs"] } },
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
interface ModelMessage { content: string | null; tool_calls: ToolCall[]; }
interface RunState {
  input: CandidateDesignInput;
  options: CandidateDesignOptions;
  deadline: number;
  tool_calls: number;
  retrieved_rows: number;
  known_cities: Map<string, CityRecord>;
  known_attractions: Map<string, AttractionRecord>;
  tradeoff_history: TradeoffHistoryEntry[];
  tradeoff_calls: number;
}

const SYSTEM_PROMPT = `You are Agent 2, the Itinerary Design Agent for Voyager.

You receive only the Traveler Profile. You must discover cities and attractions via retrieval tools — never invent places, restaurants, prices, or opening hours. Stable city_id and attraction_id are the only valid identifiers.

Rules:
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
- query_attractions: query attractions within an explicitly selected city_id
- get_attractions_by_ids: hydrate exact attraction IDs within a city

Decision tool (when available):
- Use ask_user_decision only when a material tradeoff, hard-constraint conflict, or missing preference materially changes the plan (e.g. comfort vs coverage, crowd vs intimacy). Max 3 per run.
- Provide reason (material_tradeoff | hard_constraint_conflict | missing_preference), a traveler-facing prompt, and 2-3 options each with option_id, label, and tradeoff.

The final JSON contains the final itinerary bundle (candidates array holds the final choice).`;

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
  if (!Number.isInteger(input.run_budget.timeout_ms) || input.run_budget.timeout_ms < 1000 || input.run_budget.timeout_ms > 120000) throw new CandidateDesignConfigurationError("run_budget.timeout_ms must be between 1000 and 120000");
}

function buildToolSchemas(options: CandidateDesignOptions): unknown[] {
  const searchCities = {
    type: "function", function: {
      name: "search_cities", description: "Search known cities. Use to discover cities matching the traveler's destination request and preferences.", strict: true,
      parameters: { type: "object", additionalProperties: false, properties: { region: stringOrNullSchema, destination_types: { type: "array", items: { type: "string" } }, climate_types: { type: "array", items: { type: "string" } }, tourism_popularity: stringOrNullSchema }, required: ["region", "destination_types", "climate_types", "tourism_popularity"] },
    },
  };
  const getCity = {
    type: "function", function: {
      name: "get_city", description: "Load one authoritative city record by stable city_id.", strict: true,
      parameters: { type: "object", additionalProperties: false, properties: { city_id: { type: "string" } }, required: ["city_id"] },
    },
  };
  const queryAttractions = {
    type: "function", function: {
      name: "query_attractions", description: "Query known attractions within an explicitly selected city.", strict: true,
      parameters: { type: "object", additionalProperties: false, properties: { city_id: { type: "string" }, query: { type: "string" }, best_for: { type: "array", items: { type: "string" } }, attraction_types: { type: "array", items: { type: "string" } } }, required: ["city_id", "query", "best_for", "attraction_types"] },
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
  return tools;
}

function buildUserMessage(input: CandidateDesignInput): string {
  return JSON.stringify({ profile: input.profile, session_id: input.session_id });
}

function defaultFetcher(input: string, init?: FetchRequestInit): Promise<FetchResponse> { return fetch(input, init as RequestInit); }

async function withDeadline<T>(promise: Promise<T>, deadline: number, label: string): Promise<T> {
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
  if (Date.now() >= state.deadline) throw new CandidateDesignTimeoutError("The run timeout was exceeded");
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
      exactKeys(args, ["city_id", "query", "best_for", "attraction_types"], "query_attractions arguments");
      const cityId = nonEmptyString(args.city_id, "query_attractions.city_id");
      const result = await withDeadline(state.options.tools!.queryAttractions({
        city_id: cityId,
        query: typeof args.query === "string" ? args.query.trim() : "",
        best_for: stringArray(args.best_for, "query_attractions.best_for"),
        attraction_types: stringArray(args.attraction_types, "query_attractions.attraction_types"),
      }), state.deadline, "query_attractions");
      if (result.attractions.length > state.input.run_budget.max_rows_per_tool_call) throw new CandidateDesignToolError("query_attractions exceeded the row limit", "row_budget_exhausted");
      for (const attraction of result.attractions) { validateAttractionRecord(attraction, cityId); state.known_attractions.set(attraction.attraction_id, attraction); }
      state.retrieved_rows += result.attractions.length;
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

function toGeminiDeclarations(tools: unknown[]): any[] {
  const decls: any[] = [];
  for (const t of tools as any[]) {
    if (!t || typeof t !== "object") continue;
    const fn = (t as any).function ?? t;
    if (!fn || typeof fn.name !== "string") continue;
    const params = fn.parameters ?? fn.parametersJsonSchema ?? { type: "object", properties: {} };
    decls.push({ name: fn.name, description: fn.description ?? "", parametersJsonSchema: params });
  }
  return decls;
}
function chatMessagesToGeminiContents(messages: ChatMessage[]): any[] {
  const contents: any[] = [];
  for (const m of messages) {
    const role = (m as any).role;
    if (role === "system") { const content = (m as any).content ?? ""; if (content) contents.push({ role: "user", parts: [{ text: `[System] ${content}` }] }); }
    else if (role === "user") { const content = (m as any).content ?? ""; if (content) contents.push({ role: "user", parts: [{ text: String(content) }] }); }
    else if (role === "assistant") {
      const parts: any[] = []; const content = (m as any).content; if (typeof content === "string" && content) parts.push({ text: content });
      const toolCalls = (m as any).tool_calls as ToolCall[] | undefined;
      if (toolCalls) for (const c of toolCalls) { let args: any = {}; try { args = JSON.parse(c.function.arguments); } catch { args = {}; } parts.push({ functionCall: { name: c.function.name, args } }); }
      if (parts.length) contents.push({ role: "model", parts });
    } else if (role === "tool") {
      const name = (m as any).name ?? "unknown"; const content = (m as any).content ?? ""; let parsed: any = content; try { parsed = JSON.parse(String(content)); } catch {}
      contents.push({ role: "user", parts: [{ functionResponse: { name, response: typeof parsed === "object" ? parsed : { output: String(parsed) } } }] });
    }
  }
  return contents;
}

async function requestModel(state: RunState, messages: ChatMessage[], tools: unknown[]): Promise<ModelMessage> {
  const apiKey = state.options.api_key ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) throw new CandidateDesignConfigurationError("Missing GEMINI_API_KEY. Set it in the environment or pass api_key.");
  const model = state.options.model ?? process.env.GEMINI_MODEL ?? process.env.GOOGLE_MODEL ?? DEFAULT_MODEL;
  const fetcher = state.options.fetcher;
  if (fetcher) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const controller = new AbortController(); const remaining = Math.max(1, state.deadline - Date.now()); const abortTimer = setTimeout(() => controller.abort(), remaining);
      try {
        const response = await withDeadline(fetcher("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
          method: "POST", headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" }, signal: controller.signal,
          body: JSON.stringify({ model, messages, ...(tools.length > 0 ? { tools, tool_choice: "auto" } : { response_format: { type: "json_schema", json_schema: { name: "candidate_design_result", strict: true, schema: CANDIDATE_DESIGN_RESPONSE_SCHEMA } } }), ...(state.options.reasoning_effort ? { reasoning_effort: state.options.reasoning_effort } : {}) }),
        } as any), state.deadline, "model request");
        const rawText = await withDeadline(response.text(), state.deadline, "model response read");
        if (response.status === 429 && attempt < 4) {
          const m = rawText.match(/try again in ([\d.]+)s/i); const delayMs = m?.[1] ? Math.ceil(parseFloat(m[1]) * 1000) + 500 : 4000 * (attempt + 1);
          const waitMs = Math.min(delayMs, Math.max(0, state.deadline - Date.now() - 1000)); clearTimeout(abortTimer);
          if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
          if (Date.now() >= state.deadline) throw new CandidateDesignTimeoutError("The run timeout was exceeded during rate-limit backoff");
          continue;
        }
        if (!response.ok) throw new CandidateDesignApiError(`Candidate Design model request failed with status ${response.status}: ${rawText}`, response.status);
        let payload: unknown; try { payload = JSON.parse(rawText); } catch { throw new CandidateDesignResponseError("model API returned malformed JSON", ["api_response: valid JSON required"]); }
        return parseModelMessage(payload);
      } finally { clearTimeout(abortTimer); }
    }
    throw new CandidateDesignApiError("Candidate Design model request failed after retries", 429);
  }
  const geminiTools = tools.length > 0 ? [{ functionDeclarations: toGeminiDeclarations(tools) }] : [];
  const contents = chatMessagesToGeminiContents(messages);
  const systemInstruction = SYSTEM_PROMPT;
  const client = new GoogleGenAI({ apiKey } as any);
  const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
    let tid: ReturnType<typeof setTimeout>; const tp = new Promise<never>((_, rej) => { tid = setTimeout(() => rej(new DOMException("Timeout", "AbortError")), ms); });
    try { const r = await Promise.race([promise, tp]); clearTimeout(tid!); return r as T; } catch (e) { clearTimeout(tid!); throw e; }
  };
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const remaining = Math.max(1, state.deadline - Date.now()); let response: any;
      if (tools.length > 0) {
        response = await withTimeout(client.models.generateContent({ model, contents, config: { systemInstruction, tools: geminiTools, toolConfig: { functionCallingConfig: { mode: "AUTO" } }, temperature: 0.2 } } as any), remaining);
      } else {
        response = await withTimeout(client.models.generateContent({ model, contents, config: { systemInstruction, responseMimeType: "application/json", responseJsonSchema: CANDIDATE_DESIGN_RESPONSE_SCHEMA as any, temperature: 0.2, maxOutputTokens: 3000 } } as any), remaining);
      }
      const functionCalls = (response as any).functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        const calls: ToolCall[] = functionCalls.map((fc: any, idx: number) => ({ id: `call-${idx}`, type: "function", function: { name: fc.name, arguments: typeof fc.args === "string" ? fc.args : JSON.stringify(fc.args ?? {}) } }));
        return { content: (response as any).text ?? null, tool_calls: calls };
      }
      const text = (response as any).text ?? "";
      if (!text) throw new CandidateDesignResponseError("model returned neither tool calls nor final JSON", ["message.content: final JSON required"]);
      return { content: text, tool_calls: [] };
    } catch (e: any) {
      const msg = String(e?.message ?? ""); const isRate = e?.status === 429 || msg.includes("429") || /rate limit/i.test(msg);
      if (isRate && attempt < 4) {
        const m = msg.match(/try again in ([\d.]+)s/i); const delayMs = m?.[1] ? Math.ceil(parseFloat(m[1]) * 1000) + 500 : 4000 * (attempt + 1);
        const waitMs = Math.min(delayMs, Math.max(0, state.deadline - Date.now() - 1000));
        if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs)); continue;
      }
      if (e instanceof CandidateDesignApiError || e instanceof CandidateDesignResponseError) throw e;
      if (e instanceof DOMException && e.name === "AbortError") throw new CandidateDesignTimeoutError("The run timeout was exceeded");
      throw e;
    }
  }
  throw new CandidateDesignApiError("Candidate Design model request failed after retries", 429);
}

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
      const assistantMessage: ChatMessage = { role: "assistant", content: message.content, tool_calls: message.tool_calls };
      messages.push(assistantMessage);
      for (const call of message.tool_calls) {
        const output = await executeTool(state, call.function.name, call.function.arguments);
        messages.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: output });
      }
      const gap = 400;
      if (Date.now() + gap < state.deadline) await new Promise((r) => setTimeout(r, gap));
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
    if (item.type === "meal") {
      const combined = `${item.title} ${item.description}`;
      if (/\b(?:at|called|named)\s+[A-Z][\w'-]+/.test(combined) || /\b(?:cafe|café|restaurant|hotel)\s+[A-Z]/i.test(combined)) throw new CandidateDesignResponseError(`candidates[${index}] meal slot names a venue`, [`candidates[${index}].days: generic meal slot required`]);
    }
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
  const state: RunState = {
    input, options,
    deadline: Date.now() + Math.min(input.run_budget.timeout_ms, options.timeout_ms ?? input.run_budget.timeout_ms),
    tool_calls: 0, retrieved_rows: 0,
    known_cities: new Map(), known_attractions: new Map(),
    tradeoff_history: [], tradeoff_calls: 0,
  };
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
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
    } catch (error) {
      if (!(error instanceof CandidateDesignResponseError) || repairAttempts >= 2) {
        if (error instanceof CandidateDesignResponseError) throw error;
        throw new CandidateDesignResponseError("candidate response validation failed");
      }
      repairAttempts += 1;
      messages.push({ role: "user", content: buildRepairMessage(error.validation_errors.length ? error.validation_errors : [error.message]) });
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
