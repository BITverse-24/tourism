/**
 * Voyager Agent 1: discovery/profile processing.
 *
 * This is the backend-facing entrypoint. It is intentionally self-contained
 * so the backend only needs to import this file and provide its own package
 * runtime and environment.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), ".env") });

export type PreferenceStrength =
  | "must_have"
  | "strong"
  | "nice_to_have"
  | "not_interested"
  | "unknown";

export type InferenceConfidence = "high" | "medium" | "low";
export type QuestionSelectionMode = "single" | "multiple";
export type FreeTextMode = "disabled" | "optional" | "only_if_no_option" | "required";

export interface Budget {
  amount: number | null;
  currency: string | null;
  scope: string | null;
  type: "target" | "ceiling" | "flexible" | "unknown";
}

export interface TripContext {
  destination_request: string | null;
  resolved_destination: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  date_flexibility: "fixed" | "somewhat_flexible" | "highly_flexible" | "unknown";
  party_size: number | null;
  party_notes: string | null;
  budget: Budget | null;
}

export interface PurposeAndPriorities {
  primary_purpose: string | null;
  secondary_purposes: string[];
  priorities: string[];
  success_definition: string | null;
}

export interface Preference {
  category: string;
  strength: PreferenceStrength;
  notes: string | null;
  source: "stated" | "inferred" | "defaulted";
  confidence: InferenceConfidence | null;
}

export interface TravelStyle {
  pace: "slow" | "balanced" | "fast" | "unknown";
  energy_pattern: "morning" | "afternoon" | "evening" | "consistent" | "unknown";
  walking_tolerance: "low" | "medium" | "high" | "unknown";
  crowd_tolerance: "low" | "medium" | "high" | "unknown";
  comfort_preference: "comfort_first" | "balanced" | "exploration_first" | "unknown";
  spontaneity: "structured" | "some_flexibility" | "spontaneous" | "unknown";
}

export interface HardConstraints {
  must_visit: string[];
  avoid: string[];
  dietary_requirements: string[];
  accessibility_requirements: string[];
  accommodation_requirements: string[];
  maximum_daily_travel: string | null;
  maximum_hotel_changes: number | null;
  budget_ceiling: Budget | null;
}

export interface ProfileUnknown {
  topic: string;
  impact: "blocking" | "material" | "minor";
  description: string;
}

export interface ProfileAssumption {
  topic: string;
  value: string;
  reason: string;
  user_confirmation_needed: boolean;
}

export interface TravelerProfile {
  profile_id: string;
  trip_context: TripContext;
  purpose_and_priorities: PurposeAndPriorities;
  preferences: Preference[];
  travel_style: TravelStyle;
  hard_constraints: HardConstraints;
  unknowns: ProfileUnknown[];
  assumptions: ProfileAssumption[];
}

export interface QuestionOption {
  option_id: string;
  label: string;
  description: string;
}

export interface DiscoveryQuestion {
  question_id: string;
  prompt: string;
  selection_mode: QuestionSelectionMode;
  required: boolean;
  options: QuestionOption[];
  free_text_mode: FreeTextMode;
  free_text_placeholder: string | null;
}

export interface UserAnswer {
  question_id: string;
  question: DiscoveryQuestion;
  selected_option_ids: string[];
  free_text: string | null;
}

export interface DiscoveryInput {
  profile: TravelerProfile | null;
  answer: UserAnswer | null;
}

export interface DiscoveryResult {
  profile: TravelerProfile;
  finished: boolean;
  next_question: DiscoveryQuestion | null;
  completion_reason: string | null;
}

export interface ProcessDiscoveryOptions {
  api_key?: string;
  model?: string;
  reasoning_effort?: "low" | "medium" | "high";
  api_url?: string;
  timeout_ms?: number;
  fetcher?: Fetcher;
  log_raw_responses?: boolean;
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

export const DISCOVERY_SYSTEM_PROMPT = `You are Agent 1, the Discovery/Profile module for Voyager, an agentic travel-planning product.

Your only job is to understand the traveler well enough for a later planning stage. In one response, do both jobs:
1. Update the complete traveler profile using the current profile and the latest answer.
2. Decide whether enough information exists to plan the trip. If it does not, ask exactly one useful next question.

The backend has no question list. Generate questions dynamically from the profile and the latest answer. Do not follow a fixed questionnaire and do not ask for information that is already known. Ask the highest-value missing or unclear question next.

First turn:
- The profile and answer may both be null.
- Preserve an empty profile.
- Ask a clear default question about the travel destination.

Questions should collect, when relevant: destination, dates or duration, party size, budget and its scope, trip purpose, priorities, interests, pace, energy pattern, walking tolerance, crowd tolerance, comfort, spontaneity, must-visit items, things to avoid, dietary requirements, accessibility requirements, and accommodation requirements.

Profile rules:
- Return the complete profile every time, never a partial patch.
- Use the exact profile field names from the response shape. In particular, use destination_request (not destination), start_date, end_date, duration_days, party_size, budget, and primary_purpose. Do not invent alternate field names such as dates_or_duration or trip_purpose.
- Never invent dates, budget, party size, destinations, constraints, or preferences.
- Do not treat an inference as something the traveler directly said.
- Never copy a target or flexible budget into hard_constraints.budget_ceiling. Use that field only when the traveler clearly states a maximum, limit, or non-negotiable spending ceiling, and set its type to ceiling.
- Put missing or unclear information in unknowns.
- Put a useful default or interpretation in assumptions and set user_confirmation_needed to true when the traveler should verify it.
- A preference inferred from the conversation must have source=inferred and a confidence value.
- A hard constraint may only come from something the traveler clearly stated or explicitly accepted.
- Keep the profile practical and readable. Do not plan an itinerary, recommend places, book anything, or discuss implementation details.

Completion rules:
- Set finished=true only when the profile contains enough reliable information for a planning agent to begin.
- At minimum, planning normally needs a destination, dates or duration, party size, trip purpose or priorities, and enough budget information to understand the spending boundary. If a missing value is genuinely not needed, record it as an explicit unknown or assumption rather than silently filling it.
- If a blocking unknown remains, set finished=false and ask about it.
- If finished=true, next_question must be null and completion_reason must briefly explain why.
- If finished=false, next_question must contain exactly one question and completion_reason must be null.

Return exactly one JSON object with these four root-level keys. The fields finished, next_question, and completion_reason are siblings of profile, never fields inside profile:
{
  "finished": false,
  "next_question": { "question_id": "...", "prompt": "...", "selection_mode": "single", "required": true, "options": [], "free_text_mode": "optional", "free_text_placeholder": "..." },
  "completion_reason": null,
  "profile": { "profile_id": "...", "trip_context": {}, "purpose_and_priorities": {}, "preferences": [], "travel_style": {}, "hard_constraints": {}, "unknowns": [], "assumptions": [] }
}
Use null for next_question when finished is true and null for completion_reason when finished is false. Return the complete profile, not a patch. Do not include markdown, commentary, chain-of-thought, or extra keys.`;

const stringOrNullSchema = { type: ["string", "null"] } as const;
const numberOrNullSchema = { type: ["number", "null"] } as const;
const budgetSchema = {
  type: ["object", "null"],
  additionalProperties: false,
  properties: {
    amount: numberOrNullSchema,
    currency: stringOrNullSchema,
    scope: stringOrNullSchema,
    type: { type: "string", enum: ["target", "ceiling", "flexible", "unknown"] },
  },
  required: ["amount", "currency", "scope", "type"],
} as const;

export const DISCOVERY_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    finished: { type: "boolean" },
    next_question: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: {
        question_id: { type: "string" },
        prompt: { type: "string" },
        selection_mode: { type: "string", enum: ["single", "multiple"] },
        required: { type: "boolean" },
        options: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              option_id: { type: "string" },
              label: { type: "string" },
              description: { type: "string" },
            },
            required: ["option_id", "label", "description"],
          },
        },
        free_text_mode: {
          type: "string",
          enum: ["disabled", "optional", "only_if_no_option", "required"],
        },
        free_text_placeholder: stringOrNullSchema,
      },
      required: [
        "question_id",
        "prompt",
        "selection_mode",
        "required",
        "options",
        "free_text_mode",
        "free_text_placeholder",
      ],
    },
    completion_reason: stringOrNullSchema,
    profile: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile_id: { type: "string" },
        trip_context: {
          type: "object",
          additionalProperties: false,
          properties: {
            destination_request: stringOrNullSchema,
            resolved_destination: stringOrNullSchema,
            start_date: stringOrNullSchema,
            end_date: stringOrNullSchema,
            duration_days: numberOrNullSchema,
            date_flexibility: {
              type: "string",
              enum: ["fixed", "somewhat_flexible", "highly_flexible", "unknown"],
            },
            party_size: numberOrNullSchema,
            party_notes: stringOrNullSchema,
            budget: budgetSchema,
          },
          required: [
            "destination_request",
            "resolved_destination",
            "start_date",
            "end_date",
            "duration_days",
            "date_flexibility",
            "party_size",
            "party_notes",
            "budget",
          ],
        },
        purpose_and_priorities: {
          type: "object",
          additionalProperties: false,
          properties: {
            primary_purpose: stringOrNullSchema,
            secondary_purposes: { type: "array", items: { type: "string" } },
            priorities: { type: "array", items: { type: "string" } },
            success_definition: stringOrNullSchema,
          },
          required: ["primary_purpose", "secondary_purposes", "priorities", "success_definition"],
        },
        preferences: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              category: { type: "string" },
              strength: {
                type: "string",
                enum: ["must_have", "strong", "nice_to_have", "not_interested", "unknown"],
              },
              notes: stringOrNullSchema,
              source: { type: "string", enum: ["stated", "inferred", "defaulted"] },
              confidence: {
                type: ["string", "null"],
                enum: ["high", "medium", "low", null],
              },
            },
            required: ["category", "strength", "notes", "source", "confidence"],
          },
        },
        travel_style: {
          type: "object",
          additionalProperties: false,
          properties: {
            pace: { type: "string", enum: ["slow", "balanced", "fast", "unknown"] },
            energy_pattern: {
              type: "string",
              enum: ["morning", "afternoon", "evening", "consistent", "unknown"],
            },
            walking_tolerance: { type: "string", enum: ["low", "medium", "high", "unknown"] },
            crowd_tolerance: { type: "string", enum: ["low", "medium", "high", "unknown"] },
            comfort_preference: {
              type: "string",
              enum: ["comfort_first", "balanced", "exploration_first", "unknown"],
            },
            spontaneity: {
              type: "string",
              enum: ["structured", "some_flexibility", "spontaneous", "unknown"],
            },
          },
          required: [
            "pace",
            "energy_pattern",
            "walking_tolerance",
            "crowd_tolerance",
            "comfort_preference",
            "spontaneity",
          ],
        },
        hard_constraints: {
          type: "object",
          additionalProperties: false,
          properties: {
            must_visit: { type: "array", items: { type: "string" } },
            avoid: { type: "array", items: { type: "string" } },
            dietary_requirements: { type: "array", items: { type: "string" } },
            accessibility_requirements: { type: "array", items: { type: "string" } },
            accommodation_requirements: { type: "array", items: { type: "string" } },
            maximum_daily_travel: stringOrNullSchema,
            maximum_hotel_changes: numberOrNullSchema,
            budget_ceiling: budgetSchema,
          },
          required: [
            "must_visit",
            "avoid",
            "dietary_requirements",
            "accessibility_requirements",
            "accommodation_requirements",
            "maximum_daily_travel",
            "maximum_hotel_changes",
            "budget_ceiling",
          ],
        },
        unknowns: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              topic: { type: "string" },
              impact: { type: "string", enum: ["blocking", "material", "minor"] },
              description: { type: "string" },
            },
            required: ["topic", "impact", "description"],
          },
        },
        assumptions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              topic: { type: "string" },
              value: { type: "string" },
              reason: { type: "string" },
              user_confirmation_needed: { type: "boolean" },
            },
            required: ["topic", "value", "reason", "user_confirmation_needed"],
          },
        },
      },
      required: [
        "profile_id",
        "trip_context",
        "purpose_and_priorities",
        "preferences",
        "travel_style",
        "hard_constraints",
        "unknowns",
        "assumptions",
      ],
    },
  },
  required: ["finished", "next_question", "completion_reason", "profile"],
} as const;

const DEFAULT_MODEL = "openai/gpt-oss-20b";
const DEFAULT_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_COMPLETION_TOKENS = 3_000;
const MAX_RATE_LIMIT_RETRIES = 2;
let responseLogSequence = 0;

const DEFAULT_LOG_DIRECTORY = resolve(dirname(fileURLToPath(import.meta.url)), "logs");

export class DiscoveryConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiscoveryConfigurationError";
  }
}

export class DiscoveryApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DiscoveryApiError";
    this.status = status;
  }
}

export class DiscoveryResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiscoveryResponseError";
  }
}

export const mockDiscoveryState: {
  profile: TravelerProfile | null;
  current_question: DiscoveryQuestion | null;
} = {
  profile: null,
  current_question: null,
};

function defaultFetcher(input: string, init?: FetchRequestInit): Promise<Response> {
  return fetch(input, init as RequestInit);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").match(/[\d.]+/)?.[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

function recordOrEmpty(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function parseDuration(value: unknown): number | null {
  const match = stringOrNull(value)?.match(/(\d+)\s*day/i);
  return match?.[1] ? Number(match[1]) : null;
}

function emptyProfile(profileId: string): TravelerProfile {
  return {
    profile_id: profileId,
    trip_context: {
      destination_request: null,
      resolved_destination: null,
      start_date: null,
      end_date: null,
      duration_days: null,
      date_flexibility: "unknown",
      party_size: null,
      party_notes: null,
      budget: null,
    },
    purpose_and_priorities: {
      primary_purpose: null,
      secondary_purposes: [],
      priorities: [],
      success_definition: null,
    },
    preferences: [],
    travel_style: {
      pace: "unknown",
      energy_pattern: "unknown",
      walking_tolerance: "unknown",
      crowd_tolerance: "unknown",
      comfort_preference: "unknown",
      spontaneity: "unknown",
    },
    hard_constraints: {
      must_visit: [],
      avoid: [],
      dietary_requirements: [],
      accessibility_requirements: [],
      accommodation_requirements: [],
      maximum_daily_travel: null,
      maximum_hotel_changes: null,
      budget_ceiling: null,
    },
    unknowns: [],
    assumptions: [],
  };
}

function normalizeBudget(value: unknown, fallbackScope: string | null): Budget | null {
  if (typeof value === "string") {
    const amount = numberOrNull(value);
    const currency = value.match(/\b[A-Z]{3}\b/)?.[0] ?? null;
    const describedScope = value.match(/\b(?:for|including|excluding)\s+(.+)$/i)?.[1]?.trim() ?? null;
    return amount === null && currency === null
      ? null
      : { amount, currency, scope: fallbackScope ?? describedScope, type: "target" };
  }

  const budget = recordOrEmpty(value);
  if (Object.keys(budget).length === 0) return null;

  return {
    amount: numberOrNull(budget.amount),
    currency: stringOrNull(budget.currency),
    scope: stringOrNull(budget.scope) ?? fallbackScope,
    type:
      budget.type === "ceiling" || budget.type === "flexible" || budget.type === "target"
        ? budget.type
        : "unknown",
  };
}

function normalizeBudgetCeiling(value: unknown): Budget | null {
  if (typeof value === "string") {
    if (!/\b(max(?:imum)?|ceiling|limit|not\s+exceed)\b/i.test(value)) return null;
    const budget = normalizeBudget(value, "hard budget ceiling");
    return budget ? { ...budget, type: "ceiling" } : null;
  }

  const rawBudget = recordOrEmpty(value);
  if (rawBudget.type !== "ceiling") return null;
  const budget = normalizeBudget(rawBudget, "hard budget ceiling");
  return budget ? { ...budget, type: "ceiling" } : null;
}

function normalizeProfile(rawProfile: Record<string, unknown>): TravelerProfile {
  const profile = emptyProfile(stringOrNull(rawProfile.profile_id) ?? "mock-profile");
  const trip = recordOrEmpty(rawProfile.trip_context);
  const rawDatesOrDuration = stringOrNull(trip.dates_or_duration);

  profile.trip_context = {
    destination_request: stringOrNull(trip.destination_request) ?? stringOrNull(trip.destination),
    resolved_destination: stringOrNull(trip.resolved_destination),
    start_date: stringOrNull(trip.start_date),
    end_date: stringOrNull(trip.end_date),
    duration_days: numberOrNull(trip.duration_days) ?? parseDuration(rawDatesOrDuration),
    date_flexibility:
      trip.date_flexibility === "fixed" ||
      trip.date_flexibility === "somewhat_flexible" ||
      trip.date_flexibility === "highly_flexible"
        ? trip.date_flexibility
        : "unknown",
    party_size: numberOrNull(trip.party_size),
    party_notes: stringOrNull(trip.party_notes),
    budget: normalizeBudget(trip.budget, stringOrNull(trip.budget_scope)),
  };

  const purpose = recordOrEmpty(rawProfile.purpose_and_priorities);
  profile.purpose_and_priorities = {
    primary_purpose: stringOrNull(purpose.primary_purpose) ?? stringOrNull(purpose.trip_purpose),
    secondary_purposes: stringArray(purpose.secondary_purposes),
    priorities: stringArray(purpose.priorities),
    success_definition: stringOrNull(purpose.success_definition),
  };

  const style = recordOrEmpty(rawProfile.travel_style);
  profile.travel_style = {
    pace: style.pace === "slow" || style.pace === "balanced" || style.pace === "fast" ? style.pace : "unknown",
    energy_pattern:
      style.energy_pattern === "morning" ||
      style.energy_pattern === "afternoon" ||
      style.energy_pattern === "evening" ||
      style.energy_pattern === "consistent"
        ? style.energy_pattern
        : "unknown",
    walking_tolerance:
      style.walking_tolerance === "low" || style.walking_tolerance === "medium" || style.walking_tolerance === "high"
        ? style.walking_tolerance
        : "unknown",
    crowd_tolerance:
      style.crowd_tolerance === "low" || style.crowd_tolerance === "medium" || style.crowd_tolerance === "high"
        ? style.crowd_tolerance
        : "unknown",
    comfort_preference:
      style.comfort_preference === "comfort_first" ||
      style.comfort_preference === "balanced" ||
      style.comfort_preference === "exploration_first"
        ? style.comfort_preference
        : "unknown",
    spontaneity:
      style.spontaneity === "structured" ||
      style.spontaneity === "some_flexibility" ||
      style.spontaneity === "spontaneous"
        ? style.spontaneity
        : "unknown",
  };

  const constraints = recordOrEmpty(rawProfile.hard_constraints);
  profile.hard_constraints = {
    must_visit: stringArray(constraints.must_visit),
    avoid: stringArray(constraints.avoid),
    dietary_requirements: stringArray(constraints.dietary_requirements),
    accessibility_requirements: stringArray(constraints.accessibility_requirements),
    accommodation_requirements: stringArray(constraints.accommodation_requirements),
    maximum_daily_travel: stringOrNull(constraints.maximum_daily_travel),
    maximum_hotel_changes: numberOrNull(constraints.maximum_hotel_changes),
    budget_ceiling: normalizeBudgetCeiling(constraints.budget_ceiling),
  };

  profile.preferences = Array.isArray(rawProfile.preferences)
    ? rawProfile.preferences.flatMap((item) => {
        const preference = recordOrEmpty(item);
        const category = stringOrNull(preference.category);
        if (!category) return [];
        return [{
          category,
          strength:
            preference.strength === "must_have" ||
            preference.strength === "strong" ||
            preference.strength === "nice_to_have" ||
            preference.strength === "not_interested"
              ? preference.strength
              : "unknown",
          notes: stringOrNull(preference.notes),
          source:
            preference.source === "stated" || preference.source === "inferred" ? preference.source : "defaulted",
          confidence:
            preference.confidence === "high" || preference.confidence === "medium" || preference.confidence === "low"
              ? preference.confidence
              : null,
        }];
      })
    : [];

  profile.unknowns = Array.isArray(rawProfile.unknowns)
    ? rawProfile.unknowns.flatMap((item) => {
        const unknown = recordOrEmpty(item);
        const topic = stringOrNull(unknown.topic);
        const description = stringOrNull(unknown.description);
        if (!topic || !description) return [];
        return [{
          topic,
          description,
          impact: unknown.impact === "blocking" || unknown.impact === "material" ? unknown.impact : "minor",
        }];
      })
    : [];

  profile.assumptions = Array.isArray(rawProfile.assumptions)
    ? rawProfile.assumptions.flatMap((item) => {
        const assumption = recordOrEmpty(item);
        const topic = stringOrNull(assumption.topic);
        const value = stringOrNull(assumption.value);
        const reason = stringOrNull(assumption.reason);
        if (!topic || !value || !reason) return [];
        return [{ topic, value, reason, user_confirmation_needed: assumption.user_confirmation_needed === true }];
      })
    : [];

  return profile;
}

function validateResult(value: unknown): asserts value is DiscoveryResult {
  if (!isRecord(value)) throw new DiscoveryResponseError("Groq returned a response that is not an object.");
  if (!isRecord(value.profile)) throw new DiscoveryResponseError("Groq returned an invalid traveler profile.");
  if (typeof value.finished !== "boolean") throw new DiscoveryResponseError("Groq returned an invalid completion flag.");
  if (value.next_question !== null && !isRecord(value.next_question)) {
    throw new DiscoveryResponseError("Groq returned an invalid next question.");
  }
  if (value.finished && value.next_question !== null) {
    throw new DiscoveryResponseError("A finished discovery response cannot contain a next question.");
  }
  if (!value.finished && value.next_question === null) {
    throw new DiscoveryResponseError("An unfinished discovery response must contain a next question.");
  }
  if (value.completion_reason !== null && typeof value.completion_reason !== "string") {
    throw new DiscoveryResponseError("Groq returned an invalid completion reason.");
  }
  if (value.finished && typeof value.completion_reason !== "string") {
    throw new DiscoveryResponseError("A finished discovery response must explain why it is complete.");
  }
}

function buildUserMessage(input: DiscoveryInput): string {
  return JSON.stringify({
    instructions: "Return the complete updated profile and either one next question or a finished response.",
    profile: input.profile,
    answer: input.answer,
    profile_id_if_new: input.profile?.profile_id ?? "mock-profile",
  });
}

function rateLimitDelayMs(responseText: string): number {
  const secondsMatch = responseText.match(/in\s+([\d.]+)s/i);
  const seconds = secondsMatch?.[1] ? Number(secondsMatch[1]) : 2;
  return Math.min(Math.max(seconds * 1_000, 250), 15_000);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function logRawResponse(responseText: string, status: number, attempt: number): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${timestamp}-${process.pid}-${responseLogSequence++}.log`;
  const logContent = [
    `recorded_at: ${new Date().toISOString()}`,
    `status: ${status}`,
    `attempt: ${attempt}`,
    "",
    "----- raw Groq response -----",
    responseText,
    "",
  ].join("\n");

  try {
    await mkdir(DEFAULT_LOG_DIRECTORY, { recursive: true });
    await writeFile(join(DEFAULT_LOG_DIRECTORY, filename), logContent, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown logging error";
    console.warn(`Could not write discovery response log: ${message}`);
  }
}

/** Processes one discovery turn with exactly one Groq request. */
export async function processDiscovery(
  input: DiscoveryInput,
  options: ProcessDiscoveryOptions = {},
): Promise<DiscoveryResult> {
  const apiKey = options.api_key ?? process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new DiscoveryConfigurationError(
      "Missing GROQ_API_KEY. Set it in the environment or pass api_key for this request.",
    );
  }

  const model = options.model ?? process.env.GROQ_MODEL ?? DEFAULT_MODEL;
  const reasoningEffort =
    options.reasoning_effort ?? (model.startsWith("openai/gpt-oss-") ? "medium" : undefined);
  const apiUrl = options.api_url ?? process.env.GROQ_API_URL ?? DEFAULT_API_URL;
  const timeoutMs = options.timeout_ms ?? DEFAULT_TIMEOUT_MS;
  const fetcher: Fetcher = options.fetcher ?? defaultFetcher;
  const logResponses = options.log_raw_responses ?? true;
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const requestBody = JSON.stringify({
      model,
      temperature: 0.2,
      ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
      max_completion_tokens: MAX_COMPLETION_TOKENS,
      messages: [
        { role: "system", content: DISCOVERY_SYSTEM_PROMPT },
        { role: "user", content: buildUserMessage(input) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "voyager_discovery_turn",
          strict: true,
          schema: DISCOVERY_RESPONSE_SCHEMA,
        },
      },
    });

    let response: FetchResponse | undefined;
    let responseText = "";
    for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
      response = await fetcher(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: abortController.signal,
        body: requestBody,
      });
      responseText = await response.text();
      if (logResponses) await logRawResponse(responseText, response.status, attempt + 1);
      if (response.status !== 429 || attempt === MAX_RATE_LIMIT_RETRIES) break;
      await wait(rateLimitDelayMs(responseText));
    }

    if (!response) throw new DiscoveryApiError("Groq did not return a response.", 0);
    if (!response.ok) {
      throw new DiscoveryApiError(
        `Groq request failed with status ${response.status}: ${responseText.slice(0, 500)}`,
        response.status,
      );
    }

    let envelope: unknown;
    try {
      envelope = JSON.parse(responseText);
    } catch {
      throw new DiscoveryResponseError("Groq returned invalid JSON outside the response content.");
    }

    if (!isRecord(envelope) || !Array.isArray(envelope.choices)) {
      throw new DiscoveryResponseError("Groq returned an unexpected completion response.");
    }

    const firstChoice = envelope.choices[0];
    const message = isRecord(firstChoice) ? firstChoice.message : null;
    const content = isRecord(message) ? message.content : null;
    if (typeof content !== "string" || content.length === 0) {
      throw new DiscoveryResponseError("Groq returned an empty discovery response.");
    }

    let result: unknown;
    try {
      result = JSON.parse(content);
    } catch {
      throw new DiscoveryResponseError("Groq returned discovery content that is not valid JSON.");
    }

    validateResult(result);
    return {
      ...result,
      profile: normalizeProfile(result.profile as unknown as Record<string, unknown>),
    };
  } catch (error) {
    if (error instanceof DiscoveryApiError || error instanceof DiscoveryResponseError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new DiscoveryApiError(`Groq request timed out after ${timeoutMs}ms.`, 408);
    }
    const message = error instanceof Error ? error.message : "Unknown Groq request failure.";
    throw new DiscoveryApiError(`Unable to reach Groq: ${message}`, 0);
  } finally {
    clearTimeout(timeout);
  }
}
