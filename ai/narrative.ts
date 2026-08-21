/**
 * Voyager Agent 3: Narrative / Final Trip Plan renderer.
 *
 * Takes the single grounded CandidateBundle (code is single-bundle, not selection)
 * + confirmed TravelerProfile and renders validated FinalTripPlan.
 * No retrieval tools, no ranking, no optimizer. One LLM call + one bounded repair.
 * Backend controller owns protected-field authority; agent must not mutate route.
 */

import "dotenv/config";
import OpenAI from "openai";
import type { TravelerProfile, CandidateBundle } from "./candidate-design.js";

// --- types ---

export interface NarrativeInput {
  profile: TravelerProfile;
  profile_revision: number;
  candidate: CandidateBundle;
  dataset_revisions: { city: string; attraction: string };
}

export interface NarrativeOptions {
  api_key?: string;
  model?: string;
  timeout_ms?: number;
  fetcher?: Fetcher;
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

export interface NarrativeResult {
  plan: FinalTripPlan;
  operational: { repair_attempts: number };
}

// FinalTripPlan shape — mirrors docs/FINAL_TRIP_PLAN_SCHEMA.md
export interface FinalTripPlan {
  plan_title: string;
  summary: string;
  traveler_profile_reference: { profile_id: string; profile_revision: number };
  trip_dates: {
    start_date: string | null;
    end_date: string | null;
    duration_days: number | null;
    flexibility: string | null;
  };
  destination_route: Array<{
    place: string;
    city_id: string;
    order: number;
    arrival_from: string | null;
    departure_to: string | null;
  }>;
  city_allocations: Array<{
    place: string;
    city_id: string;
    nights: number | null;
    days: number;
    reason: string | null;
  }>;
  accommodation: Array<{
    place: string;
    nights: number;
    recommendation: string;
    reason: string;
    estimated_cost: { amount: number | null; currency: string | null } | null;
    status: "suggested" | "selected_by_traveler" | "not_yet_decided";
  }>;
  days: Array<{
    day: number;
    date: string | null;
    place: string;
    city_id: string;
    theme: string | null;
    items: Array<{
      type: "experience" | "meal" | "rest" | "movement";
      title: string;
      start_time: string | null;
      end_time: string | null;
      location: string | null;
      description: string;
      movement: { mode: string | null; duration_minutes: number | null; from: string | null; to: string | null } | null;
      estimated_cost: { amount: number | null; currency: string | null } | null;
      reason: string | null;
      flexibility: "fixed" | "moveable" | "optional" | null;
    }>;
    daily_notes: string | null;
  }>;
  cost_summary: {
    currency: string;
    estimated_total: number | null;
    scope: string;
    categories: Array<{ name: string; estimated_cost: number }>;
    budget_position: "within_target" | "near_target" | "above_target" | "budget_unknown";
    caveats: string[];
  };
  fit_explanation: string;
  tradeoffs: string[];
  assumptions: string[];
  warnings: string[];
  unresolved_details: string[];
}

// --- errors ---

export class NarrativeConfigurationError extends Error {
  constructor(message: string) { super(message); this.name = "NarrativeConfigurationError"; }
}
export class NarrativeApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.name = "NarrativeApiError"; this.status = status; }
}
export class NarrativeResponseError extends Error {
  readonly validation_errors: string[];
  constructor(message: string, validation_errors: string[] = []) { super(message); this.name = "NarrativeResponseError"; this.validation_errors = validation_errors; }
}
export class NarrativeTimeoutError extends Error {
  constructor(message: string) { super(message); this.name = "NarrativeTimeoutError"; }
}

const DEFAULT_MODEL = "muse-spark-1.2-contributor";
const FIXED_MODEL = "muse-spark-1.2-contributor";
const META_BASE_URL = "https://api.meta.ai/v1";
const DEFAULT_TIMEOUT_MS = 60_000;

const stringOrNull = { type: ["string", "null"] } as const;
const intOrNull = { type: ["integer", "null"] } as const;
const numOrNull = { type: ["number", "null"] } as const;

export const NARRATIVE_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    plan_title: { type: "string" },
    summary: { type: "string" },
    traveler_profile_reference: {
      type: "object",
      additionalProperties: false,
      properties: { profile_id: { type: "string" }, profile_revision: { type: "integer" } },
      required: ["profile_id", "profile_revision"],
    },
    trip_dates: {
      type: "object",
      additionalProperties: false,
      properties: {
        start_date: stringOrNull, end_date: stringOrNull, duration_days: intOrNull, flexibility: stringOrNull,
      },
      required: ["start_date", "end_date", "duration_days", "flexibility"],
    },
    destination_route: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          place: { type: "string" }, city_id: { type: "string" }, order: { type: "integer" },
          arrival_from: stringOrNull, departure_to: stringOrNull,
        },
        required: ["place", "city_id", "order", "arrival_from", "departure_to"],
      },
    },
    city_allocations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          place: { type: "string" }, city_id: { type: "string" }, nights: intOrNull, days: { type: "integer" }, reason: stringOrNull,
        },
        required: ["place", "city_id", "nights", "days", "reason"],
      },
    },
    accommodation: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          place: { type: "string" }, nights: { type: "integer" }, recommendation: { type: "string" }, reason: { type: "string" },
          estimated_cost: { type: ["object", "null"], additionalProperties: false, properties: { amount: numOrNull, currency: stringOrNull }, required: ["amount", "currency"] },
          status: { type: "string", enum: ["suggested", "selected_by_traveler", "not_yet_decided"] },
        },
        required: ["place", "nights", "recommendation", "reason", "estimated_cost", "status"],
      },
    },
    days: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          day: { type: "integer" }, date: stringOrNull, place: { type: "string" }, city_id: { type: "string" }, theme: stringOrNull,
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                type: { type: "string", enum: ["experience", "meal", "rest", "movement"] },
                title: { type: "string" }, start_time: stringOrNull, end_time: stringOrNull, location: stringOrNull,
                description: { type: "string" },
                movement: { type: ["object", "null"], additionalProperties: false, properties: { mode: stringOrNull, duration_minutes: intOrNull, from: stringOrNull, to: stringOrNull }, required: ["mode", "duration_minutes", "from", "to"] },
                estimated_cost: { type: ["object", "null"], additionalProperties: false, properties: { amount: numOrNull, currency: stringOrNull }, required: ["amount", "currency"] },
                reason: stringOrNull, flexibility: { type: ["string", "null"], enum: ["fixed", "moveable", "optional", null] },
              },
              required: ["type", "title", "start_time", "end_time", "location", "description", "movement", "estimated_cost", "reason", "flexibility"],
            },
          },
          daily_notes: stringOrNull,
        },
        required: ["day", "date", "place", "city_id", "theme", "items", "daily_notes"],
      },
    },
    cost_summary: {
      type: "object",
      additionalProperties: false,
      properties: {
        currency: { type: "string" }, estimated_total: numOrNull, scope: { type: "string" },
        categories: { type: "array", items: { type: "object", additionalProperties: false, properties: { name: { type: "string" }, estimated_cost: { type: "number" } }, required: ["name", "estimated_cost"] } },
        budget_position: { type: "string", enum: ["within_target", "near_target", "above_target", "budget_unknown"] },
        caveats: { type: "array", items: { type: "string" } },
      },
      required: ["currency", "estimated_total", "scope", "categories", "budget_position", "caveats"],
    },
    fit_explanation: { type: "string" },
    tradeoffs: { type: "array", items: { type: "string" } },
    assumptions: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
    unresolved_details: { type: "array", items: { type: "string" } },
  },
  required: ["plan_title", "summary", "traveler_profile_reference", "trip_dates", "destination_route", "city_allocations", "accommodation", "days", "cost_summary", "fit_explanation", "tradeoffs", "assumptions", "warnings", "unresolved_details"],
} as const;

const SYSTEM_PROMPT = `You are Agent 3, Narrative/Explanation for Voyager.

Input is the SINGLE grounded CandidateBundle + confirmed TravelerProfile. You render the user-facing Final Trip Plan.

Rules:
- Preserve protected structure verbatim from CandidateBundle: route stops (city_id/order/days), candidate_id/profile_revision/dataset_revisions, day city_ids and ordering. Do not add/remove cities, change days allocation, or add attractions not in candidate days.
- Every city in destination_route and city_allocations must match candidate.route.stops exactly (city_id, order, days). Place = candidate city_name.
- Every day must belong to a route stop; items are the candidate's items plus rendered meal/rest/movement slots where useful but never invent restaurants/providers/prices as guarantees.
- Costs are estimates with scope + caveats. If candidate has no cost facts, set estimated_total null and caveats explaining uncertainty.
- Title/summary/fit_explanation must connect decisions to profile priorities and constraints. Tradeoffs/assumptions/unresolved_details from candidate must stay visible, not hidden.
- No bookings, no transport guarantees, no optimization scores, no hidden reasoning.
- Return exactly one JSON object matching the supplied schema.`;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateInput(input: NarrativeInput): void {
  if (!isRecord(input)) throw new NarrativeConfigurationError("input must be an object");
  if (!isRecord(input.profile) || typeof (input.profile as any).profile_id !== "string" || !(input.profile as any).profile_id.trim()) {
    throw new NarrativeConfigurationError("profile.profile_id required");
  }
  if (!Number.isInteger(input.profile_revision) || input.profile_revision < 1) throw new NarrativeConfigurationError("profile_revision must be positive integer");
  if (!isRecord(input.candidate)) throw new NarrativeConfigurationError("candidate is required (single CandidateBundle)");
  const c: any = input.candidate;
  if (typeof c.candidate_id !== "string" || !c.candidate_id.trim()) throw new NarrativeConfigurationError("candidate.candidate_id required");
  if (!Array.isArray(c.route?.stops) || c.route.stops.length === 0) throw new NarrativeConfigurationError("candidate.route.stops must not be empty");
  if (c.profile_revision !== input.profile_revision) throw new NarrativeConfigurationError("candidate.profile_revision must match input profile_revision");
  if (!isRecord(input.dataset_revisions) || typeof input.dataset_revisions.city !== "string" || typeof input.dataset_revisions.attraction !== "string") {
    throw new NarrativeConfigurationError("dataset_revisions.city/attraction required");
  }
  if (input.dataset_revisions.city !== c.dataset_revisions?.city || input.dataset_revisions.attraction !== c.dataset_revisions?.attraction) {
    throw new NarrativeConfigurationError("dataset_revisions must match candidate.dataset_revisions");
  }
  if (!Array.isArray(c.days)) throw new NarrativeConfigurationError("candidate.days must be array");
}

function buildUserMessage(input: NarrativeInput): string {
  return JSON.stringify({
    profile: input.profile,
    profile_revision: input.profile_revision,
    candidate: input.candidate,
    dataset_revisions: input.dataset_revisions,
    hint: "Render FinalTripPlan from the SINGLE candidate above. Preserve route/days structure exactly.",
  });
}

async function withDeadline<T>(promise: Promise<T>, deadline: number, label: string): Promise<T> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new NarrativeTimeoutError(`${label} exceeded timeout`);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new NarrativeTimeoutError(`${label} exceeded timeout`)), remaining);
  });
  try { return await Promise.race([promise, timeout]); }
  finally { if (timer) clearTimeout(timer); }
}

async function requestModel(deadline: number, options: NarrativeOptions, messages: Array<Record<string, unknown>>): Promise<string> {
  const apiKey = options.api_key ?? process.env.OPENAI_API_KEY ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) throw new NarrativeConfigurationError("Missing OPENAI_API_KEY (or pass api_key)");
  const model = FIXED_MODEL;
  const fetcher = options.fetcher;

  if (fetcher) {
    // test/offline path — OpenAI-compatible envelope for determinism (like candidate-design)
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const controller = new AbortController();
      const remaining = Math.max(1, deadline - Date.now());
      const t = setTimeout(() => controller.abort(), remaining);
      try {
        const res = await withDeadline(fetcher(`${META_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ model, messages, response_format: { type: "json_schema", json_schema: { name: "final_trip_plan", strict: true, schema: NARRATIVE_RESPONSE_SCHEMA } }, temperature: 0.2, max_tokens: 8192, reasoning_effort: "low" }),
        } as any), deadline, "model request");
        const raw = await withDeadline(res.text(), deadline, "model response read");
        if (res.status === 429 && attempt < 4) {
          const m = raw.match(/try again in ([\d.]+)s/i);
          const delay = m?.[1] ? Math.ceil(parseFloat(m[1]) * 1000) + 500 : 4000 * (attempt + 1);
          const wait = Math.min(delay, Math.max(0, deadline - Date.now() - 1000));
          clearTimeout(t);
          if (wait > 0) await new Promise(r => setTimeout(r, wait));
          continue;
        }
        if (!res.ok) throw new NarrativeApiError(`model request failed ${res.status}: ${raw}`, res.status);
        let payload: unknown;
        try { payload = JSON.parse(raw); } catch { throw new NarrativeResponseError("model API returned malformed JSON", ["api_response: valid JSON required"]); }
        // OpenAI envelope: { choices: [{ message: { content } }] } plus legacy fallbacks
        if (isRecord(payload) && Array.isArray((payload as any).choices)) {
          const content = (payload as any).choices[0]?.message?.content;
          if (typeof content !== "string" || !content.trim()) throw new NarrativeResponseError("model returned empty content", ["message.content: non-empty string required"]);
          return content;
        }
        if (isRecord(payload) && typeof (payload as any).output_text === "string") return (payload as any).output_text;
        if (isRecord(payload) && Array.isArray((payload as any).candidates)) {
          const parts = (payload as any).candidates[0]?.content?.parts ?? [];
          const text = parts.filter((p: any) => typeof p.text === "string").map((p: any) => p.text).join("");
          if (text.trim()) return text;
        }
        throw new NarrativeResponseError("model response did not contain choices", ["choices: response array required"]);
      } finally { clearTimeout(t); }
    }
    throw new NarrativeApiError("model request failed after retries", 429);
  }

  // live OpenAI SDK path — single bundle, no tools
  const client = new OpenAI({ apiKey, baseURL: META_BASE_URL } as any);
  const withTimeout = async <T>(p: Promise<T>, ms: number): Promise<T> => {
    let tid: ReturnType<typeof setTimeout>;
    const tp = new Promise<never>((_, rej) => { tid = setTimeout(() => rej(new DOMException("Timeout", "AbortError")), ms); });
    try { const r = await Promise.race([p, tp]); clearTimeout(tid!); return r as T; } catch (e) { clearTimeout(tid!); throw e; }
  };
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const remaining = Math.max(1, deadline - Date.now());
      const response: any = await withTimeout(client.chat.completions.create({
        model,
        messages: messages as any,
        response_format: { type: "json_schema", json_schema: { name: "final_trip_plan", strict: true, schema: NARRATIVE_RESPONSE_SCHEMA as any } },
        temperature: 0.2,
        max_tokens: 8192,
        reasoning_effort: "low",
      } as any), remaining);
      const text: string = response?.choices?.[0]?.message?.content ?? "";
      if (!text.trim()) throw new NarrativeResponseError("model returned empty content", ["response: non-empty JSON required"]);
      return text;
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      const isRate = e?.status === 429 || msg.includes("429") || /rate limit/i.test(msg);
      if (isRate && attempt < 4) {
        const m = msg.match(/try again in ([\d.]+)s/i);
        const delay = m?.[1] ? Math.ceil(parseFloat(m[1]) * 1000) + 500 : 4000 * (attempt + 1);
        const wait = Math.min(delay, Math.max(0, deadline - Date.now() - 1000));
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        continue;
      }
      if (e instanceof NarrativeApiError || e instanceof NarrativeResponseError) throw e;
      if (e instanceof DOMException && e.name === "AbortError") throw new NarrativeTimeoutError("model request exceeded timeout");
      throw e;
    }
  }
  throw new NarrativeApiError("model request failed after retries", 429);
}

function normalizeResponse(content: string): Record<string, unknown> {
  let parsed: unknown;
  try { parsed = JSON.parse(content); } catch { throw new NarrativeResponseError("model response was not valid JSON", ["response: valid JSON required"]); }
  if (!isRecord(parsed)) throw new NarrativeResponseError("model response must be an object", ["response: object required"]);
  // alias tolerance — ponytail: trust schema 99%, only unwrap nested plan
  if (isRecord(parsed.plan) && !("plan_title" in parsed)) return parsed.plan as Record<string, unknown>;
  if (isRecord(parsed.FinalTripPlan) && !("plan_title" in parsed)) return parsed.FinalTripPlan as Record<string, unknown>;
  return parsed as Record<string, unknown>;
}

function validateNarrative(plan: Record<string, unknown>, input: NarrativeInput): string[] {
  const errors: string[] = [];
  const candidate: any = input.candidate;
  const routeStops: Array<{ city_id: string; city_name: string | null; order: number; days: number }> = candidate.route.stops;

  // traveler_profile_reference must match
  const ref: any = plan.traveler_profile_reference;
  if (!isRecord(ref) || ref.profile_id !== input.profile.profile_id) errors.push("traveler_profile_reference.profile_id must match profile.profile_id");
  if (ref?.profile_revision !== input.profile_revision) errors.push("traveler_profile_reference.profile_revision must match input");

  // destination_route must mirror candidate.route.stops exactly (protected fields)
  const destRoute: any = plan.destination_route;
  if (!Array.isArray(destRoute) || destRoute.length !== routeStops.length) {
    errors.push(`destination_route length must be ${routeStops.length} (single bundle)`);
  } else {
    for (let i = 0; i < routeStops.length; i += 1) {
      const s = routeStops[i]!;
      const r = destRoute[i] as any;
      if (r?.city_id !== s.city_id) errors.push(`destination_route[${i}].city_id must be ${s.city_id}`);
      if (r?.order !== s.order) errors.push(`destination_route[${i}].order must be ${s.order}`);
    }
  }

  // city_allocations must mirror stops days
  const allocs: any = plan.city_allocations;
  if (!Array.isArray(allocs) || allocs.length !== routeStops.length) {
    errors.push(`city_allocations length must be ${routeStops.length}`);
  } else {
    for (let i = 0; i < routeStops.length; i += 1) {
      const s = routeStops[i]!;
      const a = allocs[i] as any;
      if (a?.city_id !== s.city_id) errors.push(`city_allocations[${i}].city_id must be ${s.city_id}`);
      if (a?.days !== s.days) errors.push(`city_allocations[${i}].days must be ${s.days}`);
    }
  }

  // days length must equal total allocated days, each day's city_id must be in route
  const allowedCityIds = new Set(routeStops.map(s => s.city_id));
  const totalDays = routeStops.reduce((sum, s) => sum + s.days, 0);
  const days: any = plan.days;
  if (!Array.isArray(days) || days.length !== totalDays) {
    errors.push(`days length must be ${totalDays} (sum of route days)`);
  } else {
    for (let i = 0; i < days.length; i += 1) {
      const d = days[i] as any;
      if (!allowedCityIds.has(d?.city_id)) errors.push(`days[${i}].city_id must be one of ${[...allowedCityIds].join(",")}`);
      if (d?.day !== i + 1) errors.push(`days[${i}].day must be ${i + 1}`);
    }
  }

  // basic required strings
  if (typeof plan.plan_title !== "string" || !(plan.plan_title as string).trim()) errors.push("plan_title: non-empty string required");
  if (typeof plan.summary !== "string" || !(plan.summary as string).trim()) errors.push("summary: non-empty string required");
  if (typeof plan.fit_explanation !== "string" || !(plan.fit_explanation as string).trim()) errors.push("fit_explanation: non-empty string required");

  // cost_summary currency required
  const cs: any = plan.cost_summary;
  if (!isRecord(cs) || typeof cs.currency !== "string" || !cs.currency.trim()) errors.push("cost_summary.currency required");
  if (!isRecord(cs) || typeof cs.scope !== "string" || !cs.scope.trim()) errors.push("cost_summary.scope required");

  // arrays required
  for (const k of ["tradeoffs", "assumptions", "warnings", "unresolved_details"] as const) {
    if (!Array.isArray((plan as any)[k])) errors.push(`${k}: array required`);
  }

  return errors;
}

export async function processNarrative(input: NarrativeInput, options: NarrativeOptions = {}): Promise<NarrativeResult> {
  validateInput(input);
  const timeoutMs = options.timeout_ms ?? DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;

  const messages: Array<Record<string, unknown>> = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildUserMessage(input) },
  ];

  let repairAttempts = 0;
  let lastContent: string | null = null;

  while (true) {
    const content = await requestModel(deadline, options, messages);
    lastContent = content;
    let parsed: Record<string, unknown>;
    try {
      parsed = normalizeResponse(content);
    } catch (e) {
      if (e instanceof NarrativeResponseError && repairAttempts < 1) {
        repairAttempts += 1;
        messages.push({ role: "user", content: JSON.stringify({ repair_errors: e.validation_errors.length ? e.validation_errors : [e.message] }) });
        continue;
      }
      throw e;
    }

    const errors = validateNarrative(parsed, input);
    if (errors.length === 0) {
      return { plan: parsed as unknown as FinalTripPlan, operational: { repair_attempts: repairAttempts } };
    }
    if (repairAttempts >= 1) {
      throw new NarrativeResponseError(`FinalTripPlan validation failed: ${errors.slice(0, 5).join("; ")}`, errors);
    }
    repairAttempts += 1;
    messages.push({ role: "assistant", content });
    messages.push({ role: "user", content: JSON.stringify({ repair_errors: errors.slice(0, 20), instruction: "Fix ONLY the listed protected-field mismatches. Keep all other content. Return full JSON again." }) });
    // loop for repair
    void lastContent;
  }
}
