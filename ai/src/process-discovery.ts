import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DISCOVERY_RESPONSE_SCHEMA } from "./response-schema.js";
import { DISCOVERY_SYSTEM_PROMPT } from "./system-prompt.js";
import type {
  Budget,
  DiscoveryInput,
  DiscoveryResult,
  Fetcher,
  ProcessDiscoveryOptions,
  TravelerProfile,
} from "./types.js";

const DEFAULT_MODEL = "openai/gpt-oss-20b";
const DEFAULT_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_COMPLETION_TOKENS = 3_000;
const MAX_RATE_LIMIT_RETRIES = 2;
let responseLogSequence = 0;

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const parentDirectory = dirname(moduleDirectory);
const packageDirectory = basename(parentDirectory) === "dist" ? dirname(parentDirectory) : parentDirectory;
const DEFAULT_LOG_DIRECTORY = resolve(packageDirectory, "logs");

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

function defaultFetcher(input: string, init?: Parameters<typeof fetch>[1]) {
  return fetch(input, init);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

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
  const text = stringOrNull(value);
  const match = text?.match(/(\d+)\s*day/i);
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
  if (Object.keys(budget).length === 0) {
    return null;
  }

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
    if (!/\b(max(?:imum)?|ceiling|limit|not\s+exceed)\b/i.test(value)) {
      return null;
    }
    const budget = normalizeBudget(value, "hard budget ceiling");
    return budget ? { ...budget, type: "ceiling" } : null;
  }

  const rawBudget = recordOrEmpty(value);
  if (rawBudget.type !== "ceiling") {
    return null;
  }
  const budget = normalizeBudget(rawBudget, "hard budget ceiling");
  return budget ? { ...budget, type: "ceiling" } : null;
}

function normalizeProfile(rawProfile: Record<string, unknown>): TravelerProfile {
  const profile = emptyProfile(stringOrNull(rawProfile.profile_id) ?? "mock-profile");
  const trip = recordOrEmpty(rawProfile.trip_context);
  const rawDatesOrDuration = stringOrNull(trip.dates_or_duration);
  const rawBudget = trip.budget;

  profile.trip_context = {
    destination_request:
      stringOrNull(trip.destination_request) ?? stringOrNull(trip.destination),
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
    budget: normalizeBudget(rawBudget, stringOrNull(trip.budget_scope)),
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
        return [{
          topic,
          value,
          reason,
          user_confirmation_needed: assumption.user_confirmation_needed === true,
        }];
      })
    : [];

  return profile;
}

function validateResult(value: unknown): asserts value is DiscoveryResult {
  if (!isRecord(value)) {
    throw new DiscoveryResponseError("Groq returned a response that is not an object.");
  }

  const profile = value.profile;
  if (!isRecord(profile)) {
    throw new DiscoveryResponseError("Groq returned an invalid traveler profile.");
  }

  if (typeof value.finished !== "boolean") {
    throw new DiscoveryResponseError("Groq returned an invalid completion flag.");
  }

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
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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

/**
 * Processes one discovery turn with exactly one Groq request.
 * The caller owns the returned profile and passes it back on the next turn.
 */
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

    let response: Awaited<ReturnType<Fetcher>> | undefined;
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
      if (logResponses) {
        await logRawResponse(responseText, response.status, attempt + 1);
      }

      if (response.status !== 429 || attempt === MAX_RATE_LIMIT_RETRIES) {
        break;
      }

      await wait(rateLimitDelayMs(responseText));
    }

    if (!response) {
      throw new DiscoveryApiError("Groq did not return a response.", 0);
    }

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
    if (error instanceof DiscoveryApiError || error instanceof DiscoveryResponseError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new DiscoveryApiError(`Groq request timed out after ${timeoutMs}ms.`, 408);
    }

    const message = error instanceof Error ? error.message : "Unknown Groq request failure.";
    throw new DiscoveryApiError(`Unable to reach Groq: ${message}`, 0);
  } finally {
    clearTimeout(timeout);
  }
}
