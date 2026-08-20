/**
 * Voyager Agent 2: grounded candidate design.
 *
 * Agent 2 proposes route and city-day candidates for deterministic evaluation.
 * It does not choose the final itinerary, call downstream planning engines, or
 * write to a knowledge dataset.
 */

import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import type { TravelerProfile } from "./src/types.js";

export type { TravelerProfile } from "./src/types.js";

// --- tradeoff tool (separate file also at src/tools/askUserTradeoff.ts, inlined here so backend only needs agent-2.ts) ---
export const MAX_TRADEOFF_CALLS = 3;
export interface AskUserTradeoffRequest {
  attraction_id_a: string;
  attraction_id_b: string;
  question: string;
}
export type AskUserTradeoffResolver = (request: AskUserTradeoffRequest) => Promise<string>;
export interface TradeoffHistoryEntry {
  question: string;
  attraction_id_a: string;
  attraction_id_b: string;
  choice: string;
}
export function buildAskUserTradeoffToolSchema(): unknown {
  return {
    type: "function",
    function: {
      name: "ask_user_tradeoff",
      description:
        "Ask the user to choose between two attractions when the tradeoff materially affects the plan. Vary framing naturally but include both attraction names and contrasting highlights. Use only when the decision changes the itinerary. Returns the user's choice: an attraction name/id, or 'neither'. Backend displays the question on the frontend and waits for the reply.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          attraction_id_a: { type: "string", description: "First attraction stable ID" },
          attraction_id_b: { type: "string", description: "Second attraction stable ID" },
          question: {
            type: "string",
            description:
              "Natural tradeoff question including both attraction names and contrast, e.g. 'Amber Fort vs City Palace, one has ... but the other has ...'. Vary phrasing each time.",
          },
        },
        required: ["attraction_id_a", "attraction_id_b", "question"],
      },
    },
  };
}
export function isNeitherChoice(choice: string): boolean {
  const c = choice.trim().toLowerCase();
  return c === "neither" || c === "neither option" || c === "neither one" || c === "skip both" || c === "none";
}
async function executeAskUserTradeoffTool(
  state: {
    known_attractions: Map<string, { attraction_id: string; city_id: string; name: string }>;
    tradeoff_history: TradeoffHistoryEntry[];
    tradeoff_calls: number;
    options: { askUserTradeoff?: AskUserTradeoffResolver };
    deadline: number;
  },
  rawArguments: string,
): Promise<string> {
  if (!state.options.askUserTradeoff) {
    return JSON.stringify({ error: { code: "tradeoff_not_configured", message: "ask_user_tradeoff requires options.askUserTradeoff resolver." } });
  }
  if (state.tradeoff_calls >= MAX_TRADEOFF_CALLS) {
    return JSON.stringify({ error: { code: "tradeoff_budget_exhausted", message: `At most ${MAX_TRADEOFF_CALLS} tradeoff questions allowed.` } });
  }
  let args: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawArguments);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("arguments must be an object");
    args = parsed as Record<string, unknown>;
  } catch {
    return JSON.stringify({ error: { code: "invalid_arguments", message: "Tool arguments must be valid JSON object arguments." } });
  }
  const expectedKeys = new Set(["attraction_id_a", "attraction_id_b", "question"]);
  for (const key of Object.keys(args)) if (!expectedKeys.has(key)) return JSON.stringify({ error: { code: "invalid_arguments", message: `ask_user_tradeoff contains unsupported field ${key}` } });
  const aId = typeof args.attraction_id_a === "string" && args.attraction_id_a.trim() ? args.attraction_id_a.trim() : "";
  const bId = typeof args.attraction_id_b === "string" && args.attraction_id_b.trim() ? args.attraction_id_b.trim() : "";
  const question = typeof args.question === "string" && args.question.trim() ? args.question.trim() : "";
  if (!aId || !bId || !question) return JSON.stringify({ error: { code: "invalid_arguments", message: "attraction_id_a, attraction_id_b, question must be non-empty strings" } });
  if (aId === bId) return JSON.stringify({ error: { code: "invalid_tradeoff_pair", message: "attraction IDs must be distinct" } });
  const a = state.known_attractions.get(aId);
  const b = state.known_attractions.get(bId);
  if (!a || !b) {
    return JSON.stringify({ error: { code: "unknown_attraction", message: "Both attractions must be retrieved first via query_attractions/get_attractions_by_ids before asking tradeoff." } });
  }
  const qLower = question.toLowerCase();
  const includesA = qLower.includes(a.name.toLowerCase()) || qLower.includes(aId.toLowerCase());
  const includesB = qLower.includes(b.name.toLowerCase()) || qLower.includes(bId.toLowerCase());
  if (!includesA || !includesB) {
    return JSON.stringify({ error: { code: "invalid_question", message: `Question must include both attraction names: ${a.name} and ${b.name}.` } });
  }
  try {
    const remaining = state.deadline - Date.now();
    if (remaining <= 0) throw new Error("ask_user_tradeoff exceeded the run timeout");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("ask_user_tradeoff exceeded the run timeout")), remaining);
    });
    const choiceRaw = await Promise.race([state.options.askUserTradeoff!({ attraction_id_a: aId, attraction_id_b: bId, question }), timeout]).finally(() => { if (timer) clearTimeout(timer); });
    const choice = typeof choiceRaw === "string" ? choiceRaw.trim() : String(choiceRaw ?? "").trim();
    if (!choice) return JSON.stringify({ error: { code: "invalid_choice", message: "User reply was empty." } });
    state.tradeoff_history.push({ question, attraction_id_a: aId, attraction_id_b: bId, choice });
    (state as { tradeoff_calls: number }).tradeoff_calls += 1;
    return JSON.stringify({ choice, question, attraction_id_a: aId, attraction_id_b: bId, tradeoff_calls_used: state.tradeoff_calls, tradeoff_calls_remaining: MAX_TRADEOFF_CALLS - state.tradeoff_calls });
  } catch (error) {
    if (error instanceof Error && error.message.includes("exceeded the run timeout")) throw error;
    return JSON.stringify({ error: { code: "tradeoff_failed", message: "Tradeoff resolver failed without exposing details." } });
  }
}

export type CandidateDesignMode = "trip_route" | "city_day_plan";
export type DestinationScopeType = "city" | "region" | "country";

export interface DestinationScope {
  type: DestinationScopeType;
  name: string;
  resolved_city_ids: string[];
}

export interface HardConstraintGuardrails {
  allowed_city_ids: string[];
  excluded_attraction_ids: string[];
}

export interface RunBudget {
  max_candidates: number;
  max_tool_calls: number;
  max_rows_per_tool_call: number;
  timeout_ms: number;
}

export interface CandidateDesignInput {
  mode: CandidateDesignMode;
  profile: TravelerProfile;
  profile_revision: number;
  destination_scope: DestinationScope;
  city_dataset_revision: string;
  attraction_dataset_revision: string;
  hard_constraint_guardrails: HardConstraintGuardrails;
  route_context?: RouteCandidate;
  city_context?: CityContext;
  run_budget: RunBudget;
}

export interface CityContext {
  city_id: string;
  allocated_days: number;
}

/** The fields are intentionally limited to facts useful to candidate design. */
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

/** The retrieval adapter may return the full dataset record. */
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

export interface SearchCitiesInput {
  destination_scope: DestinationScope;
  filters: {
    region: string | null;
    destination_types: string[];
    climate_types: string[];
    tourism_popularity: string | null;
  };
  allowed_city_ids: string[];
  page_size: number;
  dataset_revision: string;
}

export interface SearchCitiesResult {
  cities: CityRecord[];
  dataset_revision: string;
  next_cursor: string | null;
}

export interface GetCityInput {
  city_id: string;
  dataset_revision: string;
}

export interface GetCityResult {
  city: CityRecord;
  dataset_revision: string;
}

export interface QueryAttractionsInput {
  city_id: string;
  query: string;
  best_for: string[];
  attraction_types: string[];
  excluded_attraction_ids: string[];
  page_size: number;
  dataset_revision: string;
}

export interface QueryAttractionsResult {
  attractions: AttractionRecord[];
  dataset_revision: string;
  query_id: string;
  next_cursor: string | null;
}

export interface GetAttractionsByIdsInput {
  city_id: string;
  attraction_ids: string[];
  excluded_attraction_ids: string[];
  page_size: number;
  dataset_revision: string;
}

export interface GetAttractionsByIdsResult {
  attractions: AttractionRecord[];
  dataset_revision: string;
}

export interface CandidateDesignTools {
  searchCities(input: SearchCitiesInput): Promise<SearchCitiesResult>;
  getCity(input: GetCityInput): Promise<GetCityResult>;
  queryAttractions(input: QueryAttractionsInput): Promise<QueryAttractionsResult>;
  getAttractionsByIds(input: GetAttractionsByIdsInput): Promise<GetAttractionsByIdsResult>;
}

export interface RouteStop {
  city_id: string;
  city_name?: string | null;
  order: number;
  days: number;
  reason?: string;
  evidence_refs?: string[];
}

export interface RouteCandidate {
  route_id: string;
  stops: RouteStop[];
  assumptions: string[];
  tradeoffs: string[];
  unresolved_details: string[];
}

export interface VisitApproach {
  mode: string;
  timing_preference: string;
  duration_minutes: number;
  pace: string;
  focus: string[];
  rationale: string;
  tradeoffs: string[];
}

export interface SoftConflict {
  topic: string;
  explanation: string;
  alternative_attraction_id: string | null;
  evidence_refs: string[];
}

export type CandidateDayItemType = "experience" | "meal" | "rest";

export interface CandidateDayItem {
  type: CandidateDayItemType;
  attraction_id: string | null;
  city_id: string | null;
  title: string;
  description: string;
  visit_approach: VisitApproach | null;
  evidence_refs: string[];
  soft_conflicts: SoftConflict[];
}

export interface CandidateDay {
  city_id: string;
  day_number: number;
  items: CandidateDayItem[];
}

export interface CandidateBundle {
  candidate_id: string;
  profile_revision: number;
  dataset_revisions: {
    city: string;
    attraction: string;
  };
  route: RouteCandidate;
  days: CandidateDay[];
  assumptions: string[];
  tradeoffs: string[];
  unresolved_details: string[];
}

export interface CandidateDesignResult {
  mode: CandidateDesignMode;
  profile_revision: number;
  dataset_revisions: {
    city: string;
    attraction: string;
  };
  candidates: CandidateBundle[];
  operational: {
    tool_calls: number;
    retrieved_rows: number;
  };
}

export interface FetchRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

export interface FetchResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export type Fetcher = (input: string, init?: FetchRequestInit) => Promise<FetchResponse>;

export interface CandidateDesignOptions {
  tools: CandidateDesignTools;
  api_key?: string;
  model?: string;
  reasoning_effort?: "low" | "medium" | "high";
  api_url?: string;
  timeout_ms?: number;
  fetcher?: Fetcher;
  askUserTradeoff?: AskUserTradeoffResolver;
}

export class CandidateDesignConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CandidateDesignConfigurationError";
  }
}

export class CandidateDesignApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CandidateDesignApiError";
    this.status = status;
  }
}

export class CandidateDesignToolError extends Error {
  readonly code: string;

  constructor(message: string, code = "tool_error") {
    super(message);
    this.name = "CandidateDesignToolError";
    this.code = code;
  }
}

export class CandidateDesignResponseError extends Error {
  readonly validation_errors: string[];

  constructor(message: string, validation_errors: string[] = []) {
    super(message);
    this.name = "CandidateDesignResponseError";
    this.validation_errors = validation_errors;
  }
}

export class CandidateDesignTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CandidateDesignTimeoutError";
  }
}

const DEFAULT_MODEL = "gemini-3.6-flash";
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_ROUTE_CANDIDATES = 1;
const MAX_DAY_CANDIDATES = 1;

const stringOrNullSchema = { type: ["string", "null"] } as const;
const integerOrNullSchema = { type: ["integer", "null"] } as const;

const VISIT_APPROACH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    mode: { type: "string" },
    timing_preference: { type: "string" },
    duration_minutes: { type: "integer" },
    pace: { type: "string" },
    focus: { type: "array", items: { type: "string" } },
    rationale: { type: "string" },
    tradeoffs: { type: "array", items: { type: "string" } },
  },
  required: [
    "mode",
    "timing_preference",
    "duration_minutes",
    "pace",
    "focus",
    "rationale",
    "tradeoffs",
  ],
} as const;

const SOFT_CONFLICT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    topic: { type: "string" },
    explanation: { type: "string" },
    alternative_attraction_id: stringOrNullSchema,
    evidence_refs: { type: "array", items: { type: "string" } },
  },
  required: ["topic", "explanation", "alternative_attraction_id", "evidence_refs"],
} as const;

const DAY_ITEM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: { type: "string", enum: ["experience", "meal", "rest"] },
    attraction_id: stringOrNullSchema,
    city_id: stringOrNullSchema,
    title: { type: "string" },
    description: { type: "string" },
    visit_approach: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: VISIT_APPROACH_SCHEMA.properties,
      required: VISIT_APPROACH_SCHEMA.required,
    },
    evidence_refs: { type: "array", items: { type: "string" } },
    soft_conflicts: { type: "array", items: SOFT_CONFLICT_SCHEMA },
  },
  required: [
    "type",
    "attraction_id",
    "city_id",
    "title",
    "description",
    "visit_approach",
    "evidence_refs",
    "soft_conflicts",
  ],
} as const;

export const CANDIDATE_DESIGN_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          candidate_id: { type: "string" },
          profile_revision: { type: "integer" },
          dataset_revisions: {
            type: "object",
            additionalProperties: false,
            properties: {
              city: { type: "string" },
              attraction: { type: "string" },
            },
            required: ["city", "attraction"],
          },
          route: {
            type: "object",
            additionalProperties: false,
            properties: {
              route_id: { type: "string" },
              stops: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    city_id: { type: "string" },
                    city_name: stringOrNullSchema,
                    order: { type: "integer" },
                    days: { type: "integer" },
                    reason: { type: "string" },
                    evidence_refs: { type: "array", items: { type: "string" } },
                  },
                  required: ["city_id", "city_name", "order", "days", "reason", "evidence_refs"],
                },
              },
              assumptions: { type: "array", items: { type: "string" } },
              tradeoffs: { type: "array", items: { type: "string" } },
              unresolved_details: { type: "array", items: { type: "string" } },
            },
            required: ["route_id", "stops", "assumptions", "tradeoffs", "unresolved_details"],
          },
          days: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                city_id: { type: "string" },
                day_number: { type: "integer" },
                items: { type: "array", items: DAY_ITEM_SCHEMA },
              },
              required: ["city_id", "day_number", "items"],
            },
          },
          assumptions: { type: "array", items: { type: "string" } },
          tradeoffs: { type: "array", items: { type: "string" } },
          unresolved_details: { type: "array", items: { type: "string" } },
        },
        required: [
          "candidate_id",
          "profile_revision",
          "dataset_revisions",
          "route",
          "days",
          "assumptions",
          "tradeoffs",
          "unresolved_details",
        ],
      },
    },
  },
  required: ["candidates"],
} as const;

type ChatMessage = Record<string, unknown>;

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface ModelMessage {
  content: string | null;
  tool_calls: ToolCall[];
}

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

const SYSTEM_PROMPT = `You are Agent 2, the Candidate Design Agent for Voyager.

Your job is to propose grounded candidate route or city-day designs for later deterministic evaluation. You are not the final itinerary selector. Use retrieval tools for every city and attraction decision. Stable city_id and attraction_id values are the only valid place identifiers.

General rules:
- Return exactly one JSON object matching the supplied schema. Never return markdown or commentary.
- Use only city and attraction records returned by tools or the validated route context.
- Do not invent places, restaurants, providers, prices, fares, distances, travel durations, opening-hour guarantees, bookings, or feasibility decisions.
- Keep the supplied profile revision and both dataset revisions unchanged.
- Hard guardrails are absolute. Never include an excluded attraction or a city outside the allowed scope.
- Soft conflicts may remain in a candidate. If you choose one, expose the conflict on the experience item, explain why it may still fit, and reference a known alternative when practical.
- Evidence references must contain the stable ID of the place decision they support.

trip_route mode:
- For a city scope, use the fixed resolved city and get_city. Never replace it.
- For a country or region scope, use search_cities, then use only returned city_id values. Produce 1 clear route candidate with day allocations.
- Route days are tentative allocations. Mobility and Cost decide inter-city feasibility later.

city_day_plan mode:
- Query attractions with the selected city_id as mandatory scope. Use get_attractions_by_ids only for exact hydration.
- Map must-visit requests to known records or put them in unresolved_details.
- Generate a visit approach for every experience. Duration is a proposal based on retrieved duration fields, not a guarantee.
- Meal and rest slots must stay generic. A meal may describe flexible timing or dietary needs but must not name a venue or provider.
- Return 1 clear day plan candidate.

Tradeoff tool (city_day_plan only, when available):
- Use ask_user_tradeoff only when two retrieved attractions present a real tradeoff that changes the plan (e.g. crowd vs intimacy, heritage vs nature, duration vs coverage). Do not waste calls. Max 3 per run.
- You must have queried both attractions first. Call with their stable attraction IDs and a natural question that includes both attraction names and contrasting highlights. Vary framing each time; never feel templated, but ensure the comparison is clear.
- The backend shows the question on the frontend and returns the user's choice (an attraction name/id, or 'neither'). Treat the choice as context: favor the chosen attraction, and if 'neither' exclude both. Never ask city-vs-city, only attraction-vs-attraction even if attractions are in different cities.

The final JSON contains candidate bundles, not a final plan or ranking.`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new CandidateDesignResponseError(`${path} must be a non-empty string`, [`${path}: non-empty string required`]);
  }
  return value.trim();
}

function stringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    throw new CandidateDesignResponseError(`${path} must be an array of non-empty strings`, [`${path}: string array required`]);
  }
  return value.map((item) => (item as string).trim());
}

function positiveInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new CandidateDesignResponseError(`${path} must be a positive integer`, [`${path}: positive integer required`]);
  }
  return value;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], path: string): void {
  const expected = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) {
      throw new CandidateDesignResponseError(`${path} contains unsupported field ${key}`, [`${path}.${key}: unsupported field`]);
    }
  }
}

function optionalString(value: unknown, path: string): string | null {
  if (value === null) return null;
  return nonEmptyString(value, path);
}

function optionalInteger(value: unknown, path: string): number | null {
  if (value === null) return null;
  return positiveInteger(value, path);
}

function validateProfile(profile: TravelerProfile): void {
  if (!isRecord(profile)) throw new CandidateDesignConfigurationError("profile must be an object");
  for (const key of [
    "profile_id",
    "trip_context",
    "purpose_and_priorities",
    "preferences",
    "travel_style",
    "hard_constraints",
    "unknowns",
    "assumptions",
  ]) {
    if (!(key in profile)) throw new CandidateDesignConfigurationError(`profile.${key} is required`);
  }
  if (typeof profile.profile_id !== "string" || profile.profile_id.trim().length === 0) {
    throw new CandidateDesignConfigurationError("profile.profile_id must be a non-empty string");
  }
  if (!isRecord(profile.trip_context) || !isRecord(profile.hard_constraints)) {
    throw new CandidateDesignConfigurationError("profile trip_context and hard_constraints must be objects");
  }
}

function validateInput(input: CandidateDesignInput): void {
  if (!isRecord(input)) throw new CandidateDesignConfigurationError("planning input must be an object");
  validateProfile(input.profile);
  positiveInteger(input.profile_revision, "profile_revision");
  if (!isRecord(input.destination_scope)) throw new CandidateDesignConfigurationError("destination_scope is required");
  if (!(["city", "region", "country"] as string[]).includes(input.destination_scope.type)) {
    throw new CandidateDesignConfigurationError("destination_scope.type must be city, region, or country");
  }
  if (typeof input.destination_scope.name !== "string" || input.destination_scope.name.trim().length === 0) {
    throw new CandidateDesignConfigurationError("destination_scope.name must be non-empty");
  }
  if (!Array.isArray(input.destination_scope.resolved_city_ids) || input.destination_scope.resolved_city_ids.some((id) => typeof id !== "string" || !id)) {
    throw new CandidateDesignConfigurationError("destination_scope.resolved_city_ids must be a string array");
  }
  if (input.destination_scope.type === "city" && input.destination_scope.resolved_city_ids.length !== 1) {
    throw new CandidateDesignConfigurationError("city scope requires exactly one resolved city_id");
  }
  for (const revision of [input.city_dataset_revision, input.attraction_dataset_revision]) {
    if (typeof revision !== "string" || revision.trim().length === 0) {
      throw new CandidateDesignConfigurationError("dataset revisions must be non-empty strings");
    }
  }
  if (!isRecord(input.hard_constraint_guardrails)) {
    throw new CandidateDesignConfigurationError("hard_constraint_guardrails is required");
  }
  for (const ids of [input.hard_constraint_guardrails.allowed_city_ids, input.hard_constraint_guardrails.excluded_attraction_ids]) {
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || id.trim().length === 0)) {
      throw new CandidateDesignConfigurationError("guardrail IDs must be non-empty string arrays");
    }
  }
  if (input.destination_scope.type === "city" && !input.hard_constraint_guardrails.allowed_city_ids.includes(input.destination_scope.resolved_city_ids[0] as string)) {
    throw new CandidateDesignConfigurationError("the resolved city must be in allowed_city_ids");
  }
  if (!isRecord(input.run_budget)) throw new CandidateDesignConfigurationError("run_budget is required");
  if (!Number.isInteger(input.run_budget.max_candidates) || input.run_budget.max_candidates < 1 || input.run_budget.max_candidates > MAX_ROUTE_CANDIDATES) {
    throw new CandidateDesignConfigurationError(`run_budget.max_candidates must be between 1 and ${MAX_ROUTE_CANDIDATES}`);
  }
  if (!Number.isInteger(input.run_budget.max_tool_calls) || input.run_budget.max_tool_calls < 1 || input.run_budget.max_tool_calls > 100) {
    throw new CandidateDesignConfigurationError("run_budget.max_tool_calls must be between 1 and 100");
  }
  if (!Number.isInteger(input.run_budget.max_rows_per_tool_call) || input.run_budget.max_rows_per_tool_call < 1 || input.run_budget.max_rows_per_tool_call > 50) {
    throw new CandidateDesignConfigurationError("run_budget.max_rows_per_tool_call must be between 1 and 50");
  }
  if (!Number.isInteger(input.run_budget.timeout_ms) || input.run_budget.timeout_ms < 1_000 || input.run_budget.timeout_ms > 120_000) {
    throw new CandidateDesignConfigurationError("run_budget.timeout_ms must be between 1000 and 120000");
  }
  if (input.mode !== "trip_route" && input.mode !== "city_day_plan") {
    throw new CandidateDesignConfigurationError("mode must be trip_route or city_day_plan");
  }
  if (input.mode === "city_day_plan") {
    if (!input.route_context || !input.city_context) {
      throw new CandidateDesignConfigurationError("city_day_plan requires route_context and city_context");
    }
    validateRouteShape(input.route_context, "route_context");
    positiveInteger(input.city_context.allocated_days, "city_context.allocated_days");
    const selectedStop = input.route_context.stops.find((stop) => stop.city_id === input.city_context?.city_id);
    if (!selectedStop) throw new CandidateDesignConfigurationError("city_context.city_id must be a route stop");
    if (selectedStop.days !== input.city_context.allocated_days) {
      throw new CandidateDesignConfigurationError("city_context.allocated_days must match the route stop allocation");
    }
    if (!input.hard_constraint_guardrails.allowed_city_ids.includes(input.city_context.city_id)) {
      throw new CandidateDesignConfigurationError("city_context.city_id must be allowed");
    }
  }
}

function validateRouteShape(route: RouteCandidate, path: string): void {
  if (!isRecord(route)) throw new CandidateDesignConfigurationError(`${path} must be an object`);
  const stops = route.stops;
  if (!Array.isArray(stops) || stops.length === 0) throw new CandidateDesignConfigurationError(`${path}.stops must not be empty`);
  const ids = new Set<string>();
  for (const [index, stop] of stops.entries()) {
    if (!isRecord(stop)) throw new CandidateDesignConfigurationError(`${path}.stops[${index}] must be an object`);
    if (typeof stop.city_id !== "string" || !stop.city_id) throw new CandidateDesignConfigurationError(`${path}.stops[${index}].city_id is required`);
    if (ids.has(stop.city_id)) throw new CandidateDesignConfigurationError(`${path}.stops contains duplicate city_id ${stop.city_id}`);
    ids.add(stop.city_id);
    positiveInteger(stop.order, `${path}.stops[${index}].order`);
    positiveInteger(stop.days, `${path}.stops[${index}].days`);
  }
}

function validateToolResultRevision(resultRevision: unknown, expected: string, toolName: string): void {
  if (resultRevision !== expected) {
    throw new CandidateDesignToolError(`${toolName} returned dataset revision different from the frozen run revision`, "dataset_revision_mismatch");
  }
}

function cityIdsForInput(input: CandidateDesignInput): Set<string> {
  return new Set(input.hard_constraint_guardrails.allowed_city_ids);
}

function buildToolSchemas(input: CandidateDesignInput, options: CandidateDesignOptions): unknown[] {
  const searchCities = {
    type: "function",
    function: {
      name: "search_cities",
      description: "Search known cities within the requested country or region scope.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          region: stringOrNullSchema,
          destination_types: { type: "array", items: { type: "string" } },
          climate_types: { type: "array", items: { type: "string" } },
          tourism_popularity: stringOrNullSchema,
        },
        required: ["region", "destination_types", "climate_types", "tourism_popularity"],
      },
    },
  };
  const getCity = {
    type: "function",
    function: {
      name: "get_city",
      description: "Load one authoritative city record by stable city_id.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: { city_id: { type: "string" } },
        required: ["city_id"],
      },
    },
  };
  const queryAttractions = {
    type: "function",
    function: {
      name: "query_attractions",
      description: "Query known attractions. The runtime forces the selected city scope and hard exclusions.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: { type: "string" },
          best_for: { type: "array", items: { type: "string" } },
          attraction_types: { type: "array", items: { type: "string" } },
        },
        required: ["query", "best_for", "attraction_types"],
      },
    },
  };
  const getAttractionsByIds = {
    type: "function",
    function: {
      name: "get_attractions_by_ids",
      description: "Hydrate exact known attraction IDs within the selected city.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: { attraction_ids: { type: "array", items: { type: "string" } } },
        required: ["attraction_ids"],
      },
    },
  };
  const tools: unknown[] = [searchCities, getCity, queryAttractions, getAttractionsByIds];
  // ponytail: tradeoff tool separate file, only when resolver wired and city_day_plan (attraction vs attraction only)
  if (input.mode === "city_day_plan" && options.askUserTradeoff) {
    tools.push(buildAskUserTradeoffToolSchema());
  }
  // ponytail: expose all retrieval tools to avoid Gemini 400 "tool not in request.tools" on hallucinated calls; runtime still enforces mode via executeTool
  return tools;
}

function buildUserMessage(input: CandidateDesignInput, preloadedCity: CityRecord | null): string {
  return JSON.stringify({
    mode: input.mode,
    profile: input.profile,
    profile_revision: input.profile_revision,
    destination_scope: input.destination_scope,
    city_dataset_revision: input.city_dataset_revision,
    attraction_dataset_revision: input.attraction_dataset_revision,
    hard_constraint_guardrails: input.hard_constraint_guardrails,
    route_context: input.route_context ?? null,
    city_context: input.city_context ?? null,
    preloaded_authoritative_city: preloadedCity,
  });
}

function defaultFetcher(input: string, init?: FetchRequestInit): Promise<FetchResponse> {
  return fetch(input, init as RequestInit);
}

async function withDeadline<T>(promise: Promise<T>, deadline: number, label: string): Promise<T> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new CandidateDesignTimeoutError(`${label} exceeded the run timeout`);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new CandidateDesignTimeoutError(`${label} exceeded the run timeout`)), remaining);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function toolFailureMessage(error: unknown): string {
  if (error instanceof CandidateDesignToolError) return JSON.stringify({ error: { code: error.code, message: error.message } });
  return JSON.stringify({ error: { code: "retrieval_failed", message: "The retrieval adapter failed without exposing provider details." } });
}

function ensureToolBudget(state: RunState): void {
  if (state.tool_calls >= state.input.run_budget.max_tool_calls) {
    throw new CandidateDesignToolError("The run tool-call budget was exhausted", "tool_budget_exhausted");
  }
  if (Date.now() >= state.deadline) throw new CandidateDesignTimeoutError("The run timeout was exceeded");
  state.tool_calls += 1;
}

function validateCityRecord(city: CityRecord): void {
  if (!isRecord(city) || typeof city.city_id !== "string" || typeof city.city_name !== "string") {
    throw new CandidateDesignToolError("retrieval returned an invalid city record", "invalid_city_record");
  }
}

function validateAttractionRecord(attraction: AttractionRecord, input: CandidateDesignInput, cityId: string): void {
  if (!isRecord(attraction) || typeof attraction.attraction_id !== "string" || typeof attraction.city_id !== "string" || typeof attraction.name !== "string") {
    throw new CandidateDesignToolError("retrieval returned an invalid attraction record", "invalid_attraction_record");
  }
  if (attraction.city_id !== cityId) throw new CandidateDesignToolError("retrieval returned an attraction outside the selected city", "out_of_scope_attraction");
  if (input.hard_constraint_guardrails.excluded_attraction_ids.includes(attraction.attraction_id)) {
    throw new CandidateDesignToolError("retrieval returned an explicitly excluded attraction", "excluded_attraction");
  }
}

async function executeTool(state: RunState, name: string, rawArguments: string): Promise<string> {
  ensureToolBudget(state);
  const input = state.input;
  let args: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawArguments);
    if (!isRecord(parsed)) throw new Error("arguments must be an object");
    args = parsed;
  } catch {
    return JSON.stringify({ error: { code: "invalid_arguments", message: "Tool arguments must be valid JSON object arguments." } });
  }
  const baseAllowed = input.mode === "trip_route" ? ["search_cities", "get_city"] : ["query_attractions", "get_attractions_by_ids"];
  const allowed = [...baseAllowed, ...(input.mode === "city_day_plan" && state.options.askUserTradeoff ? ["ask_user_tradeoff"] : [])];
  if (!allowed.includes(name)) return JSON.stringify({ error: { code: "tool_not_allowed", message: `Tool ${name} is not available in ${input.mode}.` } });
  if (name === "ask_user_tradeoff") {
    // ponytail: full execution lives in separate file ai/src/tools/askUserTradeoff.ts
    return executeAskUserTradeoffTool(state as unknown as Parameters<typeof executeAskUserTradeoffTool>[0], rawArguments);
  }
  try {
    if (name === "search_cities") {
      exactKeys(args, ["region", "destination_types", "climate_types", "tourism_popularity"], "search_cities arguments");
      const result = await withDeadline(state.options.tools!.searchCities({
        destination_scope: input.destination_scope,
        filters: {
          region: args.region === null ? null : nonEmptyString(args.region, "search_cities.region"),
          destination_types: stringArray(args.destination_types, "search_cities.destination_types"),
          climate_types: stringArray(args.climate_types, "search_cities.climate_types"),
          tourism_popularity: args.tourism_popularity === null ? null : nonEmptyString(args.tourism_popularity, "search_cities.tourism_popularity"),
        },
        allowed_city_ids: [...cityIdsForInput(input)],
        page_size: input.run_budget.max_rows_per_tool_call,
        dataset_revision: input.city_dataset_revision,
      }), state.deadline, "search_cities");
      validateToolResultRevision(result.dataset_revision, input.city_dataset_revision, name);
      if (result.cities.length > input.run_budget.max_rows_per_tool_call) throw new CandidateDesignToolError("search_cities exceeded the row limit", "row_budget_exhausted");
      for (const city of result.cities) {
        validateCityRecord(city);
        if (!cityIdsForInput(input).has(city.city_id)) throw new CandidateDesignToolError("search_cities returned a city outside allowed scope", "out_of_scope_city");
        state.known_cities.set(city.city_id, city);
      }
      state.retrieved_rows += result.cities.length;
      return JSON.stringify({ dataset_revision: result.dataset_revision, cities: result.cities, next_cursor: result.next_cursor });
    }
    if (name === "get_city") {
      exactKeys(args, ["city_id"], "get_city arguments");
      const cityId = nonEmptyString(args.city_id, "get_city.city_id");
      if (!cityIdsForInput(input).has(cityId)) throw new CandidateDesignToolError("get_city city_id is outside allowed scope", "out_of_scope_city");
      const result = await withDeadline(state.options.tools!.getCity({ city_id: cityId, dataset_revision: input.city_dataset_revision }), state.deadline, "get_city");
      validateToolResultRevision(result.dataset_revision, input.city_dataset_revision, name);
      validateCityRecord(result.city);
      if (result.city.city_id !== cityId) throw new CandidateDesignToolError("get_city returned a different city_id", "city_id_mismatch");
      state.known_cities.set(cityId, result.city);
      state.retrieved_rows += 1;
      return JSON.stringify({ dataset_revision: result.dataset_revision, city: result.city });
    }
    if (name === "query_attractions") {
      exactKeys(args, ["query", "best_for", "attraction_types"], "query_attractions arguments");
      const cityId = input.city_context?.city_id;
      if (!cityId) throw new CandidateDesignToolError("city context is missing", "missing_city_scope");
      const result = await withDeadline(state.options.tools!.queryAttractions({
        city_id: cityId,
        query: typeof args.query === "string" ? args.query.trim() : "",
        best_for: stringArray(args.best_for, "query_attractions.best_for"),
        attraction_types: stringArray(args.attraction_types, "query_attractions.attraction_types"),
        excluded_attraction_ids: input.hard_constraint_guardrails.excluded_attraction_ids,
        page_size: input.run_budget.max_rows_per_tool_call,
        dataset_revision: input.attraction_dataset_revision,
      }), state.deadline, "query_attractions");
      validateToolResultRevision(result.dataset_revision, input.attraction_dataset_revision, name);
      if (result.attractions.length > input.run_budget.max_rows_per_tool_call) throw new CandidateDesignToolError("query_attractions exceeded the row limit", "row_budget_exhausted");
      for (const attraction of result.attractions) {
        validateAttractionRecord(attraction, input, cityId);
        state.known_attractions.set(attraction.attraction_id, attraction);
      }
      state.retrieved_rows += result.attractions.length;
      return JSON.stringify({ dataset_revision: result.dataset_revision, query_id: result.query_id, attractions: result.attractions, next_cursor: result.next_cursor });
    }
    exactKeys(args, ["attraction_ids"], "get_attractions_by_ids arguments");
    const cityId = input.city_context?.city_id;
    if (!cityId) throw new CandidateDesignToolError("city context is missing", "missing_city_scope");
    const attractionIds = stringArray(args.attraction_ids, "get_attractions_by_ids.attraction_ids");
    if (attractionIds.length === 0 || attractionIds.length > input.run_budget.max_rows_per_tool_call) throw new CandidateDesignToolError("attraction_ids exceed the row limit", "row_budget_exhausted");
    const result = await withDeadline(state.options.tools!.getAttractionsByIds({
      city_id: cityId,
      attraction_ids: attractionIds,
      excluded_attraction_ids: input.hard_constraint_guardrails.excluded_attraction_ids,
      page_size: input.run_budget.max_rows_per_tool_call,
      dataset_revision: input.attraction_dataset_revision,
    }), state.deadline, "get_attractions_by_ids");
    validateToolResultRevision(result.dataset_revision, input.attraction_dataset_revision, name);
    if (result.attractions.length > input.run_budget.max_rows_per_tool_call) throw new CandidateDesignToolError("get_attractions_by_ids exceeded the row limit", "row_budget_exhausted");
    for (const attraction of result.attractions) {
      validateAttractionRecord(attraction, input, cityId);
      state.known_attractions.set(attraction.attraction_id, attraction);
    }
    state.retrieved_rows += result.attractions.length;
    return JSON.stringify({ dataset_revision: result.dataset_revision, attractions: result.attractions });
  } catch (error) {
    if (error instanceof CandidateDesignTimeoutError) throw error;
    if (error instanceof CandidateDesignToolError) return toolFailureMessage(error);
    return toolFailureMessage(error);
  }
}

function parseModelMessage(payload: unknown): ModelMessage {
  // Gemini primary: candidates with parts + functionCalls
  if (isRecord(payload) && Array.isArray((payload as any).candidates)) {
    const cand = (payload as any).candidates[0];
    const parts = cand?.content?.parts ?? [];
    const calls: ToolCall[] = [];
    let text: string | null = null;
    for (const part of parts) {
      if (part.functionCall) {
        const fc = part.functionCall;
        calls.push({ id: fc.id ?? `call-${calls.length}`, type: "function", function: { name: fc.name, arguments: typeof fc.args === "string" ? fc.args : JSON.stringify(fc.args ?? {}) } });
      } else if (typeof part.text === "string") {
        text = text ? text + part.text : part.text;
      }
    }
    // also check top-level functionCalls shortcut
    if ((payload as any).functionCalls && Array.isArray((payload as any).functionCalls)) {
      for (const fc of (payload as any).functionCalls) {
        calls.push({ id: fc.id ?? `call-${calls.length}`, type: "function", function: { name: fc.name, arguments: typeof fc.args === "string" ? fc.args : JSON.stringify(fc.args ?? {}) } });
      }
    }
    if (calls.length > 0 || text !== null) return { content: text, tool_calls: calls };
  }
  if (isRecord(payload) && typeof (payload as any).output_text === "string") {
    // discovery-style Gemini output_text
    return { content: (payload as any).output_text, tool_calls: [] };
  }
  if (isRecord(payload) && typeof (payload as any).outputText === "string") {
    return { content: (payload as any).outputText, tool_calls: [] };
  }
  // Groq legacy: choices[0].message
  if (!isRecord(payload) || !Array.isArray((payload as any).choices) || !isRecord((payload as any).choices[0])) {
    throw new CandidateDesignResponseError("model response did not contain choices", ["choices: response array required"]);
  }
  const choice = (payload as any).choices[0];
  const message = isRecord(choice.message) ? choice.message : null;
  if (!message) throw new CandidateDesignResponseError("model response did not contain a message", ["choices[0].message: object required"]);
  const rawCalls = (message as any).tool_calls;
  const calls: ToolCall[] = [];
  if (rawCalls !== undefined) {
    if (!Array.isArray(rawCalls)) throw new CandidateDesignResponseError("tool_calls must be an array", ["tool_calls: array required"]);
    for (const [index, rawCall] of rawCalls.entries()) {
      if (!isRecord(rawCall) || rawCall.type !== "function" || typeof rawCall.id !== "string" || !isRecord(rawCall.function) || typeof rawCall.function.name !== "string" || typeof rawCall.function.arguments !== "string") {
        throw new CandidateDesignResponseError(`invalid tool call at index ${index}`, [`tool_calls[${index}]: invalid function call`]);
      }
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
    if (role === "system") {
      // system will be handled via systemInstruction, but keep as user text prefix
      const content = (m as any).content ?? "";
      if (content) contents.push({ role: "user", parts: [{ text: `[System] ${content}` }] });
    } else if (role === "user") {
      const content = (m as any).content ?? "";
      if (content) contents.push({ role: "user", parts: [{ text: String(content) }] });
    } else if (role === "assistant") {
      const parts: any[] = [];
      const content = (m as any).content;
      if (typeof content === "string" && content) parts.push({ text: content });
      const toolCalls = (m as any).tool_calls as ToolCall[] | undefined;
      if (toolCalls) {
        for (const c of toolCalls) {
          let args: any = {};
          try { args = JSON.parse(c.function.arguments); } catch { args = {}; }
          parts.push({ functionCall: { name: c.function.name, args } });
        }
      }
      if (parts.length) contents.push({ role: "model", parts });
    } else if (role === "tool") {
      const name = (m as any).name ?? "unknown";
      const content = (m as any).content ?? "";
      let parsed: any = content;
      try { parsed = JSON.parse(String(content)); } catch {}
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
  // If fetcher is provided (tests / offline), keep Groq-compatible path for backward compat but also handle Gemini envelope
  if (fetcher) {
    // ponytail: retry 429 with backoff (Gemini quotas)
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const controller = new AbortController();
      const remaining = Math.max(1, state.deadline - Date.now());
      const abortTimer = setTimeout(() => controller.abort(), remaining);
      try {
        // Keep OpenAI-style payload for test compatibility
        const response = await withDeadline(fetcher("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
          method: "POST",
          headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages,
            ...(tools.length > 0 ? { tools, tool_choice: "auto" } : { response_format: { type: "json_schema", json_schema: { name: "candidate_design_result", strict: true, schema: CANDIDATE_DESIGN_RESPONSE_SCHEMA } } }),
            ...(state.options.reasoning_effort ? { reasoning_effort: state.options.reasoning_effort } : {}),
          }),
        } as any), state.deadline, "model request");
        const rawText = await withDeadline(response.text(), state.deadline, "model response read");
        if (response.status === 429 && attempt < 4) {
          const m = rawText.match(/try again in ([\d.]+)s/i);
          const delayMs = m?.[1] ? Math.ceil(parseFloat(m[1]) * 1000) + 500 : 4000 * (attempt + 1);
          const waitMs = Math.min(delayMs, Math.max(0, state.deadline - Date.now() - 1000));
          clearTimeout(abortTimer);
          if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
          if (Date.now() >= state.deadline) throw new CandidateDesignTimeoutError("The run timeout was exceeded during rate-limit backoff");
          continue;
        }
        if (!response.ok) throw new CandidateDesignApiError(`Candidate Design model request failed with status ${response.status}: ${rawText}`, response.status);
        let payload: unknown;
        try { payload = JSON.parse(rawText); } catch { throw new CandidateDesignResponseError("model API returned malformed JSON", ["api_response: valid JSON required"]); }
        return parseModelMessage(payload);
      } finally { clearTimeout(abortTimer); }
    }
    throw new CandidateDesignApiError("Candidate Design model request failed after retries", 429);
  }
  // Real Gemini path via SDK
  const geminiTools = tools.length > 0 ? [{ functionDeclarations: toGeminiDeclarations(tools) }] : [];
  const contents = chatMessagesToGeminiContents(messages);
  const systemInstruction = SYSTEM_PROMPT;
  const client = new GoogleGenAI({ apiKey } as any);
  const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
    let tid: ReturnType<typeof setTimeout>;
    const tp = new Promise<never>((_, rej) => { tid = setTimeout(() => rej(new DOMException("Timeout", "AbortError")), ms); });
    try { const r = await Promise.race([promise, tp]); clearTimeout(tid!); return r as T; } catch (e) { clearTimeout(tid!); throw e; }
  };
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const remaining = Math.max(1, state.deadline - Date.now());
      let response: any;
      if (tools.length > 0) {
        response = await withTimeout(client.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            tools: geminiTools,
            toolConfig: { functionCallingConfig: { mode: "AUTO" } },
            temperature: 0.2,
          },
        } as any), remaining);
      } else {
        response = await withTimeout(client.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseJsonSchema: CANDIDATE_DESIGN_RESPONSE_SCHEMA as any,
            temperature: 0.2,
            maxOutputTokens: 3000,
          },
        } as any), remaining);
      }
      // SDK returns GenerateContentResponse with functionCalls / text
      const functionCalls = (response as any).functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        const calls: ToolCall[] = functionCalls.map((fc: any, idx: number) => ({ id: `call-${idx}`, type: "function", function: { name: fc.name, arguments: typeof fc.args === "string" ? fc.args : JSON.stringify(fc.args ?? {}) } }));
        return { content: (response as any).text ?? null, tool_calls: calls };
      }
      const text = (response as any).text ?? "";
      if (!text) throw new CandidateDesignResponseError("model returned neither tool calls nor final JSON", ["message.content: final JSON required"]);
      return { content: text, tool_calls: [] };
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      const isRate = e?.status === 429 || msg.includes("429") || /rate limit/i.test(msg);
      if (isRate && attempt < 4) {
        const m = msg.match(/try again in ([\d.]+)s/i);
        const delayMs = m?.[1] ? Math.ceil(parseFloat(m[1]) * 1000) + 500 : 4000 * (attempt + 1);
        const waitMs = Math.min(delayMs, Math.max(0, state.deadline - Date.now() - 1000));
        if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
        continue;
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
    try {
      message = await requestModel(state, messages, tools);
    } catch (e) {
      if (e instanceof CandidateDesignApiError && (e.status === 400 || String(e.message).includes("400")) && String(e.message).includes("tool_use_failed")) {
        const detail = String(e.message).slice(0, 600);
        messages.push({ role: "user", content: JSON.stringify({ repair_errors: [`Tool call validation failed: ${detail}. Ensure all tool arguments match schema types (arrays must be arrays, strings must be strings). In trip_route mode only use search_cities/get_city.`] }) });
        continue;
      }
      throw e;
    }
    if (message.tool_calls.length > 0) {
      const assistantMessage: ChatMessage = { role: "assistant", content: message.content, tool_calls: message.tool_calls };
      messages.push(assistantMessage);
      for (const call of message.tool_calls) {
        const output = await executeTool(state, call.function.name, call.function.arguments);
        messages.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: output });
      }
      const gap = 800;
      if (Date.now() + gap < state.deadline) await new Promise((r) => setTimeout(r, gap));
      continue;
    }
    if (!message.content) throw new CandidateDesignResponseError("model returned neither tool calls nor final JSON", ["message.content: final JSON required"]);
    return message.content;
  }
  throw new CandidateDesignToolError("model/tool-call loop exceeded its bounded turn budget", "tool_budget_exhausted");
}

function normalizeVisitApproach(raw: Record<string, unknown>, path: string): VisitApproach {
  exactKeys(raw, ["mode", "timing_preference", "duration_minutes", "pace", "focus", "rationale", "tradeoffs"], path);
  return {
    mode: nonEmptyString(raw.mode, `${path}.mode`),
    timing_preference: nonEmptyString(raw.timing_preference, `${path}.timing_preference`),
    duration_minutes: positiveInteger(raw.duration_minutes, `${path}.duration_minutes`),
    pace: nonEmptyString(raw.pace, `${path}.pace`),
    focus: stringArray(raw.focus, `${path}.focus`),
    rationale: nonEmptyString(raw.rationale, `${path}.rationale`),
    tradeoffs: stringArray(raw.tradeoffs, `${path}.tradeoffs`),
  };
}

function normalizeSoftConflict(raw: Record<string, unknown>, path: string): SoftConflict {
  exactKeys(raw, ["topic", "explanation", "alternative_attraction_id", "evidence_refs"], path);
  return {
    topic: nonEmptyString(raw.topic, `${path}.topic`),
    explanation: nonEmptyString(raw.explanation, `${path}.explanation`),
    alternative_attraction_id: optionalString(raw.alternative_attraction_id, `${path}.alternative_attraction_id`),
    evidence_refs: stringArray(raw.evidence_refs, `${path}.evidence_refs`),
  };
}

function normalizeDayItem(raw: unknown, path: string): CandidateDayItem {
  if (!isRecord(raw)) throw new CandidateDesignResponseError(`${path} must be an object`, [`${path}: object required`]);
  exactKeys(raw, ["type", "attraction_id", "city_id", "title", "description", "visit_approach", "evidence_refs", "soft_conflicts"], path);
  const type = raw.type;
  if (type !== "experience" && type !== "meal" && type !== "rest") throw new CandidateDesignResponseError(`${path}.type is invalid`, [`${path}.type: invalid item type`]);
  if (raw.visit_approach !== null && !isRecord(raw.visit_approach)) throw new CandidateDesignResponseError(`${path}.visit_approach is invalid`, [`${path}.visit_approach: object or null required`]);
  if (!Array.isArray(raw.soft_conflicts) || raw.soft_conflicts.some((item) => !isRecord(item))) throw new CandidateDesignResponseError(`${path}.soft_conflicts is invalid`, [`${path}.soft_conflicts: object array required`]);
  return {
    type,
    attraction_id: optionalString(raw.attraction_id, `${path}.attraction_id`),
    city_id: optionalString(raw.city_id, `${path}.city_id`),
    title: nonEmptyString(raw.title, `${path}.title`),
    description: nonEmptyString(raw.description, `${path}.description`),
    visit_approach: raw.visit_approach === null ? null : normalizeVisitApproach(raw.visit_approach, `${path}.visit_approach`),
    evidence_refs: stringArray(raw.evidence_refs, `${path}.evidence_refs`),
    soft_conflicts: raw.soft_conflicts.map((item, index) => normalizeSoftConflict(item as Record<string, unknown>, `${path}.soft_conflicts[${index}]`)),
  };
}

function normalizeRoute(raw: unknown, path: string): RouteCandidate {
  if (!isRecord(raw)) throw new CandidateDesignResponseError(`${path} must be an object`, [`${path}: object required`]);
  exactKeys(raw, ["route_id", "stops", "assumptions", "tradeoffs", "unresolved_details"], path);
  if (!Array.isArray(raw.stops)) throw new CandidateDesignResponseError(`${path}.stops must be an array`, [`${path}.stops: array required`]);
  const stops: RouteStop[] = raw.stops.map((rawStop, index) => {
    if (!isRecord(rawStop)) throw new CandidateDesignResponseError(`${path}.stops[${index}] must be an object`, [`${path}.stops[${index}]: object required`]);
    exactKeys(rawStop, ["city_id", "city_name", "order", "days", "reason", "evidence_refs"], `${path}.stops[${index}]`);
    return {
      city_id: nonEmptyString(rawStop.city_id, `${path}.stops[${index}].city_id`),
      city_name: optionalString(rawStop.city_name, `${path}.stops[${index}].city_name`),
      order: positiveInteger(rawStop.order, `${path}.stops[${index}].order`),
      days: positiveInteger(rawStop.days, `${path}.stops[${index}].days`),
      reason: nonEmptyString(rawStop.reason, `${path}.stops[${index}].reason`),
      evidence_refs: stringArray(rawStop.evidence_refs, `${path}.stops[${index}].evidence_refs`),
    };
  });
  return {
    route_id: nonEmptyString(raw.route_id, `${path}.route_id`),
    stops,
    assumptions: stringArray(raw.assumptions, `${path}.assumptions`),
    tradeoffs: stringArray(raw.tradeoffs, `${path}.tradeoffs`),
    unresolved_details: stringArray(raw.unresolved_details, `${path}.unresolved_details`),
  };
}

function normalizeCandidateResponse(content: string): CandidateBundle[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new CandidateDesignResponseError("model final response was not valid JSON", ["response: valid JSON object required"]);
  }
  if (!isRecord(parsed)) throw new CandidateDesignResponseError("model final response must be an object", ["response: object required"]);
  // ponytail: tolerate alias keys model sometimes emits (candidate_routes/candidate_bundles/etc) before strict check
  const rec = parsed as Record<string, unknown>;
  if (!("candidates" in rec) && "candidate_routes" in rec) rec["candidates"] = rec["candidate_routes"];
  if (!("candidates" in rec) && "candidate_route" in rec) rec["candidates"] = rec["candidate_route"];
  if (!("candidates" in rec) && "candidate_bundles" in rec) rec["candidates"] = rec["candidate_bundles"];
  if (!("candidates" in rec) && "routes" in rec) rec["candidates"] = rec["routes"];
  if (!("candidates" in rec) && "route" in rec && Array.isArray(rec["route"])) rec["candidates"] = rec["route"];
  if (!("candidates" in rec)) {
    for (const k of Object.keys(rec)) if (k.toLowerCase().includes("candidate") && Array.isArray(rec[k])) { rec["candidates"] = rec[k]; break; }
  }
  // delete alias keys so exactKeys strict check passes
  for (const k of Object.keys(rec)) if (k !== "candidates") delete rec[k];
  exactKeys(parsed, ["candidates"], "response");
  const candidatesRaw = (parsed as Record<string, unknown>)["candidates"];
  if (!Array.isArray(candidatesRaw)) {
    if (isRecord(candidatesRaw)) (parsed as Record<string, unknown>)["candidates"] = [candidatesRaw];
    else throw new CandidateDesignResponseError(`response.candidates must be an array (got ${typeof candidatesRaw}: ${JSON.stringify(parsed).slice(0, 500)})`, ["candidates: array required"]);
  }
  return ((parsed as Record<string, unknown>)["candidates"] as unknown[]).map((rawCandidate, index) => {
    const path = `candidates[${index}]`;
    if (!isRecord(rawCandidate)) throw new CandidateDesignResponseError(`${path} must be an object`, [`${path}: object required`]);
    // ponytail: strip unknown top-level keys model hallucinates (e.g. city_id) instead of failing strict check
    for (const k of Object.keys(rawCandidate)) if (!["candidate_id", "profile_revision", "dataset_revisions", "route", "days", "assumptions", "tradeoffs", "unresolved_details"].includes(k)) delete (rawCandidate as Record<string, unknown>)[k];
    exactKeys(rawCandidate, ["candidate_id", "profile_revision", "dataset_revisions", "route", "days", "assumptions", "tradeoffs", "unresolved_details"], path);
    if (!isRecord(rawCandidate.dataset_revisions)) throw new CandidateDesignResponseError(`${path}.dataset_revisions must be an object`, [`${path}.dataset_revisions: object required`]);
    exactKeys(rawCandidate.dataset_revisions, ["city", "attraction"], `${path}.dataset_revisions`);
    if (!Array.isArray(rawCandidate.days)) throw new CandidateDesignResponseError(`${path}.days must be an array`, [`${path}.days: array required`]);
    const days: CandidateDay[] = rawCandidate.days.map((rawDay, dayIndex) => {
      if (!isRecord(rawDay)) throw new CandidateDesignResponseError(`${path}.days[${dayIndex}] must be an object`, [`${path}.days[${dayIndex}]: object required`]);
      exactKeys(rawDay, ["city_id", "day_number", "items"], `${path}.days[${dayIndex}]`);
      if (!Array.isArray(rawDay.items)) throw new CandidateDesignResponseError(`${path}.days[${dayIndex}].items must be an array`, [`${path}.days[${dayIndex}].items: array required`]);
      return {
        city_id: nonEmptyString(rawDay.city_id, `${path}.days[${dayIndex}].city_id`),
        day_number: positiveInteger(rawDay.day_number, `${path}.days[${dayIndex}].day_number`),
        items: rawDay.items.map((item, itemIndex) => normalizeDayItem(item, `${path}.days[${dayIndex}].items[${itemIndex}]`)),
      };
    });
    return {
      candidate_id: nonEmptyString(rawCandidate.candidate_id, `${path}.candidate_id`),
      profile_revision: positiveInteger(rawCandidate.profile_revision, `${path}.profile_revision`),
      dataset_revisions: {
        city: nonEmptyString(rawCandidate.dataset_revisions.city, `${path}.dataset_revisions.city`),
        attraction: nonEmptyString(rawCandidate.dataset_revisions.attraction, `${path}.dataset_revisions.attraction`),
      },
      route: normalizeRoute(rawCandidate.route, `${path}.route`),
      days,
      assumptions: stringArray(rawCandidate.assumptions, `${path}.assumptions`),
      tradeoffs: stringArray(rawCandidate.tradeoffs, `${path}.tradeoffs`),
      unresolved_details: stringArray(rawCandidate.unresolved_details, `${path}.unresolved_details`),
    };
  });
}

function hasUnsupportedClaim(text: string): boolean {
  return /(?:₹|\$|€|£|\b(?:INR|USD|EUR|GBP)\s*\d)|\b(?:fare|ticket\s+price|opening\s+hours?|guaranteed|provider|reservation\s+required|booking\s+confirmed)\b/i.test(text);
}

function validateFreeText(text: string, path: string): void {
  if (hasUnsupportedClaim(text)) throw new CandidateDesignResponseError(`${path} contains an unsupported factual claim`, [`${path}: unsupported provider, price, booking, or schedule claim`]);
}

function validateGenericItemText(item: CandidateDayItem, path: string): void {
  validateFreeText(item.title, `${path}.title`);
  validateFreeText(item.description, `${path}.description`);
  if (!/\b(?:meal|breakfast|lunch|dinner|snack|food)\b/i.test(item.title)) throw new CandidateDesignResponseError(`${path}.title must remain a generic meal slot`, [`${path}.title: generic meal slot required`]);
  if (!/\b(?:flexible|not selected|generic|meal slot|preserve)\b/i.test(item.description)) throw new CandidateDesignResponseError(`${path}.description must keep the meal venue unresolved`, [`${path}.description: unresolved generic meal description required`]);
  const combinedText = `${item.title} ${item.description}`;
  if (/\b(?:at|called|named)\s+[A-Z][\w'-]+/.test(combinedText) || /\b(?:cafe|café|restaurant|hotel)\s+[A-Z][\w'-]+/i.test(combinedText)) {
    throw new CandidateDesignResponseError(`${path} appears to name a venue`, [`${path}: restaurant/provider names are not allowed`]);
  }
}

function detectableSoftConflictTopics(profile: TravelerProfile, attraction: AttractionRecord): string[] {
  const topics: string[] = [];
  const crowdTolerance = profile.travel_style.crowd_tolerance;
  if (crowdTolerance === "low" && (attraction.crowd_level === "High" || attraction.crowd_level === "Very_High")) {
    topics.push("crowd exposure");
  }
  const walkingTolerance = profile.travel_style.walking_tolerance;
  if (walkingTolerance === "low" && ["Difficult", "Very_Difficult"].includes(attraction.accessibility_level ?? "")) {
    topics.push("physical access");
  }
  if (walkingTolerance === "low" && ["High", "Extreme"].includes(attraction.adventure_level ?? "")) {
    topics.push("physical intensity");
  }
  if (profile.travel_style.comfort_preference === "comfort_first" && attraction.accessibility_level === "Very_Difficult") {
    topics.push("comfort");
  }
  return topics;
}

function validateCandidate(candidate: CandidateBundle, state: RunState, index: number): void {
  const input = state.input;
  if (candidate.profile_revision !== input.profile_revision) throw new CandidateDesignResponseError(`candidates[${index}] has the wrong profile revision`, [`candidates[${index}].profile_revision: must match input`]);
  if (candidate.dataset_revisions.city !== input.city_dataset_revision || candidate.dataset_revisions.attraction !== input.attraction_dataset_revision) throw new CandidateDesignResponseError(`candidates[${index}] has a dataset revision mismatch`, [`candidates[${index}].dataset_revisions: must match input`]);
  validateRouteShape(candidate.route, `candidates[${index}].route`);
  const routeCities = new Set(candidate.route.stops.map((stop) => stop.city_id));
  const knownPlaceIds = new Set<string>([...state.known_cities.keys(), ...state.known_attractions.keys()]);
  if (input.mode === "trip_route") {
    if (input.destination_scope.type === "city") {
      const fixedCity = input.destination_scope.resolved_city_ids[0] as string;
      if (candidate.route.stops.length !== 1 || candidate.route.stops[0]?.city_id !== fixedCity) throw new CandidateDesignResponseError(`candidates[${index}] replaces the fixed city`, [`candidates[${index}].route: city scope must remain fixed`]);
    }
    const duration = input.profile.trip_context.duration_days;
    if (duration !== null && typeof duration === "number" && Number.isInteger(duration) && duration > 0 && candidate.route.stops.reduce((sum, stop) => sum + stop.days, 0) !== duration) {
      throw new CandidateDesignResponseError(`candidates[${index}] route days do not match trip duration`, [`candidates[${index}].route.stops.days: total must match duration_days`]);
    }
  } else {
    const selectedCity = input.city_context?.city_id;
    if (!selectedCity || candidate.route.stops.length !== 1 || candidate.route.stops[0]?.city_id !== selectedCity) throw new CandidateDesignResponseError(`candidates[${index}] changes the city-day scope`, [`candidates[${index}].route: must contain selected city only`]);
    if (candidate.days.length === 0) throw new CandidateDesignResponseError(`candidates[${index}] has no day design`, [`candidates[${index}].days: at least one day required`]);
  }
  for (const [stopIndex, stop] of candidate.route.stops.entries()) {
    if (!cityIdsForInput(input).has(stop.city_id) || (input.mode === "trip_route" && !state.known_cities.has(stop.city_id))) throw new CandidateDesignResponseError(`candidates[${index}] contains an unknown or out-of-scope city`, [`candidates[${index}].route.stops[${stopIndex}].city_id: known allowed city required`]);
    const stopEvidenceRefs = stop.evidence_refs ?? [];
    if (!stopEvidenceRefs.includes(stop.city_id)) throw new CandidateDesignResponseError(`candidates[${index}] is missing city evidence`, [`candidates[${index}].route.stops[${stopIndex}].evidence_refs: city_id required`]);
    for (const ref of stopEvidenceRefs) if (!knownPlaceIds.has(ref)) throw new CandidateDesignResponseError(`candidates[${index}] contains an unknown route evidence reference`, [`candidates[${index}].route.stops[${stopIndex}].evidence_refs: unknown reference`]);
    validateFreeText(stop.reason ?? "", `candidates[${index}].route.stops[${stopIndex}].reason`);
  }
  const dayNumbers = new Set<string>();
  for (const [dayIndex, day] of candidate.days.entries()) {
    if (!routeCities.has(day.city_id)) throw new CandidateDesignResponseError(`candidates[${index}].days[${dayIndex}] is outside the route`, [`candidates[${index}].days[${dayIndex}].city_id: route city required`]);
    const stop = candidate.route.stops.find((candidateStop) => candidateStop.city_id === day.city_id);
    if (!stop || day.day_number > stop.days) throw new CandidateDesignResponseError(`candidates[${index}].days[${dayIndex}] exceeds its city allocation`, [`candidates[${index}].days[${dayIndex}].day_number: allocation exceeded`]);
    const dayKey = `${day.city_id}:${day.day_number}`;
    if (dayNumbers.has(dayKey)) throw new CandidateDesignResponseError(`candidates[${index}] contains a duplicate day`, [`candidates[${index}].days[${dayIndex}]: duplicate day`]);
    dayNumbers.add(dayKey);
    for (const [itemIndex, item] of day.items.entries()) {
      const path = `candidates[${index}].days[${dayIndex}].items[${itemIndex}]`;
      if (item.type === "experience") {
        if (!item.attraction_id || item.city_id !== day.city_id || !item.visit_approach) throw new CandidateDesignResponseError(`${path} is not a complete experience item`, [`${path}: attraction, city, and visit approach required`]);
        const attraction = state.known_attractions.get(item.attraction_id);
        if (!attraction) throw new CandidateDesignResponseError(`${path} references an unknown attraction`, [`${path}.attraction_id: retrieved attraction required`]);
        if (attraction.city_id !== day.city_id) throw new CandidateDesignResponseError(`${path} references an out-of-scope attraction`, [`${path}.attraction_id: city ownership mismatch`]);
        if (input.hard_constraint_guardrails.excluded_attraction_ids.includes(item.attraction_id)) throw new CandidateDesignResponseError(`${path} references an excluded attraction`, [`${path}.attraction_id: excluded attraction`]);
        if (!item.evidence_refs.includes(item.attraction_id) || !item.evidence_refs.includes(day.city_id)) throw new CandidateDesignResponseError(`${path} is missing place evidence`, [`${path}.evidence_refs: attraction_id and city_id required`]);
        for (const ref of item.evidence_refs) if (!knownPlaceIds.has(ref)) throw new CandidateDesignResponseError(`${path} contains an unknown evidence reference`, [`${path}.evidence_refs: unknown reference`]);
        const duration = item.visit_approach.duration_minutes;
        if (attraction.visit_duration_min !== undefined && duration < attraction.visit_duration_min) throw new CandidateDesignResponseError(`${path} duration is below the retrieved minimum`, [`${path}.visit_approach.duration_minutes: below attraction minimum`]);
        if (attraction.visit_duration_max !== undefined && duration > attraction.visit_duration_max) throw new CandidateDesignResponseError(`${path} duration exceeds the retrieved maximum`, [`${path}.visit_approach.duration_minutes: above attraction maximum`]);
        const requiredConflictTopics = detectableSoftConflictTopics(input.profile, attraction);
        if (requiredConflictTopics.length > 0 && item.soft_conflicts.length === 0) {
          throw new CandidateDesignResponseError(`${path} hides a detectable soft conflict`, [`${path}.soft_conflicts: expose ${requiredConflictTopics.join(", ")}`]);
        }
        validateFreeText(item.title, `${path}.title`);
        validateFreeText(item.description, `${path}.description`);
        validateFreeText(item.visit_approach.rationale, `${path}.visit_approach.rationale`);
        for (const conflict of item.soft_conflicts) {
          for (const ref of conflict.evidence_refs) if (!knownPlaceIds.has(ref)) throw new CandidateDesignResponseError(`${path} soft conflict has unknown evidence`, [`${path}.soft_conflicts: unknown evidence reference`]);
          if (conflict.alternative_attraction_id !== null) {
            const alternative = state.known_attractions.get(conflict.alternative_attraction_id);
            if (!alternative || alternative.city_id !== day.city_id || conflict.alternative_attraction_id === item.attraction_id) throw new CandidateDesignResponseError(`${path} soft conflict has an invalid alternative`, [`${path}.soft_conflicts: alternative must be a different known attraction in the city`]);
          }
        }
      } else {
        if (item.attraction_id !== null || item.visit_approach !== null || item.city_id !== null && item.city_id !== day.city_id) throw new CandidateDesignResponseError(`${path} non-experience item contains place-specific fields`, [`${path}: meal/rest items cannot contain attraction facts`]);
        if (item.type === "meal") validateGenericItemText(item, path);
        else {
          validateFreeText(item.title, `${path}.title`);
          validateFreeText(item.description, `${path}.description`);
        }
      }
    }
  }
}

function normalizeRouteContext(route: RouteCandidate): RouteCandidate {
  return {
    route_id: route.route_id,
    stops: route.stops.map((stop) => ({
      city_id: stop.city_id,
      city_name: stop.city_name ?? null,
      order: stop.order,
      days: stop.days,
      reason: stop.reason ?? "Validated route context",
      evidence_refs: stop.evidence_refs?.length ? stop.evidence_refs : [stop.city_id],
    })),
    assumptions: route.assumptions ?? [],
    tradeoffs: route.tradeoffs ?? [],
    unresolved_details: route.unresolved_details ?? [],
  };
}

function buildRepairMessage(errors: string[]): string {
  return JSON.stringify({ repair_errors: errors.slice(0, 20) });
}

export async function processCandidateDesign(input: CandidateDesignInput, options: CandidateDesignOptions): Promise<CandidateDesignResult> {
  validateInput(input);
  if (!options || !options.tools) throw new CandidateDesignConfigurationError("CandidateDesignOptions.tools is required");
  const state: RunState = {
    input,
    options,
    deadline: Date.now() + Math.min(input.run_budget.timeout_ms, options.timeout_ms ?? input.run_budget.timeout_ms),
    tool_calls: 0,
    retrieved_rows: 0,
    known_cities: new Map(),
    known_attractions: new Map(),
    tradeoff_history: [],
    tradeoff_calls: 0,
  };
  if (input.mode === "city_day_plan" && input.route_context) {
    for (const stop of input.route_context.stops) state.known_cities.set(stop.city_id, { city_id: stop.city_id, city_name: stop.city_name ?? stop.city_id });
  }
  let preloadedCity: CityRecord | null = null;
  if (input.mode === "trip_route" && input.destination_scope.type === "city") {
    const fixedCity = input.destination_scope.resolved_city_ids[0] as string;
    const result = await executeTool(state, "get_city", JSON.stringify({ city_id: fixedCity }));
    const parsed: unknown = JSON.parse(result);
    if (!isRecord(parsed) || !isRecord(parsed.city)) throw new CandidateDesignToolError("fixed city could not be loaded", "city_not_found");
    preloadedCity = parsed.city as CityRecord;
  }
  // ponytail: city scope trip_route is deterministic (fixed city), skip LLM to avoid hallucination + TPM waste
  if (input.mode === "trip_route" && input.destination_scope.type === "city" && preloadedCity) {
    const totalDays = input.profile.trip_context.duration_days ?? preloadedCity.recommended_days_min ?? 3;
    const fixedCityId = input.destination_scope.resolved_city_ids[0] as string;
    const cand: CandidateBundle = {
      candidate_id: `route_${fixedCityId}`,
      profile_revision: input.profile_revision,
      dataset_revisions: { city: input.city_dataset_revision, attraction: input.attraction_dataset_revision },
      route: {
        route_id: `route_${fixedCityId}`,
        stops: [{ city_id: fixedCityId, city_name: preloadedCity.city_name, order: 1, days: totalDays, reason: `Fixed destination scope ${preloadedCity.city_name} with ${totalDays} days allocated`, evidence_refs: [fixedCityId] }],
        assumptions: ["Inter-city movement not evaluated in city scope"],
        tradeoffs: ["Single city depth vs multi-city coverage not applicable"],
        unresolved_details: [],
      },
      days: [],
      assumptions: [],
      tradeoffs: [],
      unresolved_details: [],
    };
    // validate directly (uses known_cities already populated via preload)
    validateCandidate(cand, state, 0);
    return { mode: input.mode, profile_revision: input.profile_revision, dataset_revisions: { city: input.city_dataset_revision, attraction: input.attraction_dataset_revision }, candidates: [cand], operational: { tool_calls: state.tool_calls, retrieved_rows: state.retrieved_rows } };
  }
  // ponytail: LLM-free trip_route for region/country — deterministic search + simple allocation, no LLM
  if (input.mode === "trip_route" && input.destination_scope.type !== "city") {
    try {
      const searchRes = await executeTool(state, "search_cities", JSON.stringify({ region: null, destination_types: [], climate_types: [], tourism_popularity: null }));
      const sParsed: unknown = JSON.parse(searchRes);
      if (!isRecord(sParsed) || !Array.isArray((sParsed as Record<string, unknown>).cities)) throw new Error("no cities");
      const found = (sParsed as Record<string, unknown>).cities as CityRecord[];
      if (found.length === 0) throw new Error("empty");
      // sort by popularity + recommended days
      const popRank: Record<string, number> = { "Very High": 4, "Very_High": 4, High: 3, Moderate: 2, Low: 1 };
      const sortedCities = [...found].sort((a, b) => (popRank[b.tourism_popularity ?? ""] ?? 0) - (popRank[a.tourism_popularity ?? ""] ?? 0));
      const duration = input.profile.trip_context.duration_days ?? sortedCities[0]?.recommended_days_min ?? 3;
      // pick 1-2 cities based on duration
      const numCities = duration >= 6 && sortedCities.length >= 2 ? 2 : 1;
      const picked = sortedCities.slice(0, numCities);
      const base = Math.floor(duration / numCities);
      const rem = duration % numCities;
      const stops: RouteStop[] = picked.map((c, idx) => ({
        city_id: c.city_id,
        city_name: c.city_name,
        order: idx + 1,
        days: base + (idx < rem ? 1 : 0) || c.recommended_days_min || 2,
        reason: `Selected ${c.city_name} for ${c.destination_type?.join(", ") ?? "general"} fit and ${c.tourism_popularity ?? "balanced"} popularity`,
        evidence_refs: [c.city_id],
      }));
      const cand: CandidateBundle = {
        candidate_id: `route_${picked.map((c) => c.city_id).join("_")}`,
        profile_revision: input.profile_revision,
        dataset_revisions: { city: input.city_dataset_revision, attraction: input.attraction_dataset_revision },
        route: { route_id: `route_${picked.map((c) => c.city_id).join("_")}`, stops, assumptions: ["Route days tentative; mobility will evaluate"], tradeoffs: numCities > 1 ? ["Coverage vs depth"] : ["Single city depth"], unresolved_details: [] },
        days: [],
        assumptions: [],
        tradeoffs: [],
        unresolved_details: [],
      };
      validateCandidate(cand, state, 0);
      return { mode: input.mode, profile_revision: input.profile_revision, dataset_revisions: { city: input.city_dataset_revision, attraction: input.attraction_dataset_revision }, candidates: [cand], operational: { tool_calls: state.tool_calls, retrieved_rows: state.retrieved_rows } };
    } catch {
      // fall through to LLM path if deterministic fails
    }
  }
  // ponytail: deterministic grounded day plan — LLM-free, but skip when tradeoff resolver wired so AI can ask user
  if (input.mode === "city_day_plan" && input.city_context && input.route_context && !options.askUserTradeoff) {
    try {
      const cityId = input.city_context.city_id;
      const allocated = input.city_context.allocated_days;
      // ensure city known
      const cityRes = await executeTool(state, "get_city", JSON.stringify({ city_id: cityId }));
      const cityParsed: unknown = JSON.parse(cityRes);
      if (isRecord(cityParsed) && isRecord((cityParsed as Record<string, unknown>).city)) {
        // city loaded
      }
      // query attractions for this city (grounded, filtered)
      const qRes = await executeTool(state, "query_attractions", JSON.stringify({ query: "", best_for: [], attraction_types: [] }));
      const qParsed: unknown = JSON.parse(qRes);
      const atts: AttractionRecord[] = isRecord(qParsed) && Array.isArray((qParsed as Record<string, unknown>).attractions) ? (qParsed as Record<string, unknown>).attractions as AttractionRecord[] : [];
      // pick up to 3 heritage attractions, ensure must_visit Amber Fort first
      const mustVisit = input.profile.hard_constraints.must_visit ?? [];
      const sorted = [...atts].sort((a, b) => {
        const aMust = mustVisit.some((m) => a.name.toLowerCase().includes(m.toLowerCase())) ? -1 : 1;
        const bMust = mustVisit.some((m) => b.name.toLowerCase().includes(m.toLowerCase())) ? -1 : 1;
        if (aMust !== bMust) return aMust - bMust;
        return a.name.localeCompare(b.name);
      });
      const selected = sorted.slice(0, Math.min(3, sorted.length));
      // build days: spread selected across allocated days, rest days get rest slot
      const days: CandidateDay[] = [];
      for (let d = 1; d <= allocated; d += 1) {
        const att = selected[d - 1];
        if (att) {
          const duration = att.visit_duration_typical ?? att.visit_duration_min ?? 90;
          const conflicts: SoftConflict[] = [];
          const topics = detectableSoftConflictTopics(input.profile, att);
          for (const t of topics) {
            const alt = selected.find((s) => s.attraction_id !== att.attraction_id);
            conflicts.push({ topic: t, explanation: `Selected ${att.name} has ${t} that may conflict with low tolerance; alternative ${alt?.name ?? "available"} offers lower exposure`, alternative_attraction_id: alt?.attraction_id ?? null, evidence_refs: [att.attraction_id] });
          }
          days.push({
            city_id: cityId,
            day_number: d,
            items: [
              {
                type: "experience",
                attraction_id: att.attraction_id,
                city_id: cityId,
                title: `${att.name} focused visit`,
                description: `Grounded visit to ${att.name} based on retrieved record`,
                visit_approach: { mode: "balanced_visit", timing_preference: att.best_time_of_day?.[0] ?? "Morning", duration_minutes: duration, pace: input.profile.travel_style.pace ?? "balanced", focus: att.best_for?.slice(0, 2) ?? ["culture"], rationale: `Supports ${input.profile.purpose_and_priorities.primary_purpose} and photography`, tradeoffs: [] },
                evidence_refs: [att.attraction_id, cityId],
                soft_conflicts: conflicts,
              },
              { type: "meal", attraction_id: null, city_id: null, title: "Flexible meal break", description: "Meal slot not selected; preserve flexible timing.", visit_approach: null, evidence_refs: [], soft_conflicts: [] },
            ],
          });
        } else {
          days.push({ city_id: cityId, day_number: d, items: [{ type: "rest", attraction_id: null, city_id: null, title: "Unstructured recovery time", description: "Keep part of the day open for rest or spontaneous exploration.", visit_approach: null, evidence_refs: [], soft_conflicts: [] }] });
        }
      }
      // city_day_plan route must contain only selected city, not full multi-city route
      const selectedStop = input.route_context.stops.find((s) => s.city_id === cityId);
      const route: RouteCandidate = {
        route_id: `route_${cityId}`,
        stops: [{ city_id: cityId, city_name: selectedStop?.city_name ?? cityId, order: 1, days: allocated, reason: `Day plan for ${cityId} with ${allocated} days`, evidence_refs: [cityId] }],
        assumptions: ["Day order tentative; mobility evaluation later"],
        tradeoffs: ["Depth vs coverage within single city"],
        unresolved_details: [],
      };
      const cand: CandidateBundle = {
        candidate_id: `${cityId}_day_plan`,
        profile_revision: input.profile_revision,
        dataset_revisions: { city: input.city_dataset_revision, attraction: input.attraction_dataset_revision },
        route,
        days,
        assumptions: ["Day order tentative; mobility evaluation later"],
        tradeoffs: ["Depth vs coverage within single city"],
        unresolved_details: [],
      };
      validateCandidate(cand, state, 0);
      return { mode: input.mode, profile_revision: input.profile_revision, dataset_revisions: { city: input.city_dataset_revision, attraction: input.attraction_dataset_revision }, candidates: [cand], operational: { tool_calls: state.tool_calls, retrieved_rows: state.retrieved_rows } };
    } catch {
      // fall through to LLM path if deterministic build fails
    }
  }
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildUserMessage(input, preloadedCity) },
  ];
  const tools = buildToolSchemas(input, state.options);
  let candidates: CandidateBundle[] | null = null;
  let repairAttempts = 0;
  while (candidates === null) {
    const content = await modelToolLoop(state, messages, tools);
    try {
      const normalized = normalizeCandidateResponse(content);
      const maxCandidates = input.mode === "city_day_plan" ? MAX_DAY_CANDIDATES : MAX_ROUTE_CANDIDATES;
      if (normalized.length < 1 || normalized.length > Math.min(input.run_budget.max_candidates, maxCandidates)) {
        throw new CandidateDesignResponseError("candidate count is outside the bounded run limit", ["candidates: count exceeds configured mode limit"]);
      }
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
    mode: input.mode,
    profile_revision: input.profile_revision,
    dataset_revisions: { city: input.city_dataset_revision, attraction: input.attraction_dataset_revision },
    candidates,
    operational: { tool_calls: state.tool_calls, retrieved_rows: state.retrieved_rows },
  };
}
