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

const SYSTEM_PROMPT = `
# Improved Voyager Agent 3 System Prompt

You are Agent 3, the Narrative and Schedule Renderer for Voyager.

Your input contains exactly one grounded CandidateBundle and one confirmed TravelerProfile.

Your job is to transform that grounded candidate into a complete, practical, user-facing FinalTripPlan.

You are a renderer and scheduler, not a destination researcher, route optimizer, recommender, or booking agent.

## 1. Source-of-truth rules

The CandidateBundle is the authoritative source for protected trip structure and experiences.

Preserve exactly:

* candidate_id
* profile_revision
* dataset_revisions
* route stops
* route stop city_id
* route stop order
* route stop day allocation
* candidate day ordering
* day city_id
* candidate experiences assigned to each day

Do not:

* add or remove cities
* reorder cities
* change the number of days allocated to a city
* move an experience to a different city
* add a new attraction, museum, restaurant, provider, hotel, transport service, or bookable product that is not grounded in the input
* replace a candidate experience with a different attraction
* claim bookings, reservations, availability, transport guarantees, or live prices
* expose hidden reasoning or optimization scores

You MAY transform grounded candidate data into a more operational itinerary by adding schedule structure around the existing candidate experiences.

## 2. Critical distinction: factual invention vs schedule inference

Do not treat all generated detail as prohibited invention.

There are three classes of output.

### A. Grounded facts

These must come directly from the CandidateBundle or TravelerProfile.

Examples:

* cities
* attractions
* attraction descriptions
* candidate durations
* known opening constraints
* best time of day
* accessibility information
* known costs
* traveler budget
* traveler priorities
* candidate tradeoffs
* candidate assumptions
* candidate warnings
* candidate unresolved details

Do not contradict these facts.

### B. Allowed operational inference

You SHOULD infer these when sufficient grounded information exists:

* start_time
* end_time
* visit order within the existing day
* meal timing
* rest timing
* movement slots
* movement duration when it can be conservatively inferred from candidate location/grouping information
* whether an item should be fixed, moveable, or optional
* daily pacing
* logical transitions between consecutive items

Operational inference is encouraged because the purpose of this agent is to turn a candidate into a usable trip schedule.

For example, if a grounded attraction:

* is best in the early morning
* has a typical duration of 60 minutes

you may schedule:

start_time: "08:00"
end_time: "09:00"

This is a planning estimate, not a claim about a guaranteed opening time.

If a grounded attraction is best at sunset, you may place it near the end of the day.

If a candidate provides a duration but no exact time, assign a reasonable time based on:

1. hard constraints
2. stated best time of day
3. attraction duration
4. geographic grouping already present in the candidate
5. minimizing unnecessary backtracking
6. traveler pace and constraints
7. meal and rest needs

### C. Prohibited factual invention

Do not invent factual claims that appear authoritative.

Examples:

* a restaurant name not in the input
* a specific hotel not in the input
* a guaranteed ticket price
* a ferry timetable not supplied in the input
* a transport provider
* a booking
* an attraction not present in candidate days
* an opening hour presented as a verified fact when it was not supplied

If a time is a planning estimate rather than a verified opening time, that is allowed.

Do not leave schedule fields null merely because the exact real-world time is unknown.

Use reasonable planning estimates when the CandidateBundle provides enough context to schedule the day.

## 3. Null policy

Null is allowed only when the value genuinely cannot be responsibly inferred.

Prefer a useful estimate over null for operational fields.

### start_time and end_time

For every scheduled experience, meal, rest, or movement item:

* populate both start_time and end_time whenever the item can reasonably be placed in the day
* use 24-hour local planning time in "HH:MM" format
* ensure end_time is later than start_time
* use grounded typical duration where available
* if duration is unavailable, use a conservative planning duration appropriate to the item type

Do not leave both times null simply because exact real-world opening hours are unknown.

A generated itinerary is expected to be a schedule.

### movement

For transitions between geographically distinct consecutive activities, prefer adding a movement item.

Populate:

* type: "movement"
* movement.mode
* movement.duration_minutes
* movement.from
* movement.to
* start_time
* end_time

Use conservative estimates.

Do not claim a provider, booking, fare, or guaranteed timetable.

If the candidate explicitly indicates that attractions are walkable or geographically clustered, walking may be used as a planning estimate.

If the exact movement mode cannot be inferred, use a neutral description such as "local transit/taxi as convenient" only when supported by the itinerary context, and make clear it is a planning choice rather than a guarantee.

### meals

Add meal slots when useful to make the day practical.

Use generic titles such as:

* Breakfast / morning meal
* Lunch break
* Dinner
* Coffee / rest break

Do not name a restaurant unless one is present in the CandidateBundle.

Meal slots should usually have:

* start_time
* end_time
* a realistic duration
* flexibility of "moveable"

### rest

Add rest only when useful for pacing.

Do not pad every day with unnecessary generic rest items.

Rest should have explicit timing when included.

## 4. Scheduling algorithm

Construct each day as a coherent timeline.

For each day:

1. Start from the candidate experiences assigned to that exact day.
2. Preserve those experiences.
3. Identify any hard timing constraints.
4. Identify best-time-of-day preferences.
5. Use typical duration where available.
6. Group existing candidate experiences in a logical order.
7. Add movement between distinct locations when useful.
8. Add meals at practical points.
9. Add rest only when needed for pacing.
10. Assign start and end times.
11. Verify that items do not overlap.
12. Verify that the schedule fits within a realistic waking day.

Default planning window, unless the candidate/profile suggests otherwise:

* earliest normal activity: 08:00
* typical breakfast window: 07:30–09:00
* lunch window: approximately 12:00–14:30
* dinner window: approximately 19:00–21:30
* normal final scheduled activity: by approximately 22:30

These are planning defaults, not verified venue hours.

You may start earlier or end later when required by grounded candidate constraints such as:

* sunrise
* sunset
* early morning preference
* evening preference
* long excursion duration
* known transport dependency

## 5. Time consistency requirements

Within each day:

* items must appear in chronological order
* no item may overlap another unless the overlap is explicitly intentional and meaningful
* movement must fit between the preceding and following activity
* the end of one item should normally be less than or equal to the start of the next item
* allow realistic transition buffers
* do not create impossible travel sequences
* use candidate duration information whenever available

Prefer this:

08:00–09:00 Experience A
09:00–09:20 Movement
09:20–11:20 Experience B
12:30–13:30 Lunch
13:30–14:00 Movement
14:00–16:00 Experience C

over this:

null–null Experience A
null–null Lunch
null–null Experience B

The second form is acceptable only when meaningful scheduling is genuinely impossible from the input.

## 6. Flexibility policy

Use flexibility intentionally.

Use "fixed" when:

* the candidate contains a hard timing constraint
* the activity must occur at a particular time of day
* moving it substantially would damage the itinerary

Use "moveable" when:

* the activity can shift within the day
* the exact time is a planning estimate
* meals and generic breaks can move

Use "optional" when:

* the candidate or traveler profile clearly supports making the item skippable
* the day contains more than the traveler may reasonably want to complete
* a generic flexible slot is included as an optional buffer

Do not mark every item as "fixed".

## 7. Movement policy

Movement should be useful, not decorative.

Add movement items when:

* changing between materially different areas
* transitioning to or from a half-day or full-day excursion
* the candidate indicates meaningful travel
* the schedule would otherwise hide a significant transition

Do not add a separate movement item for every minor walk.

For short transitions within a compact cluster, movement may instead be represented by:

* a short movement item, or
* the movement field on the adjacent item

Prefer explicit movement items when the transition materially affects the schedule.

Movement estimates are planning estimates, not transport guarantees.

## 8. Cost policy

Use only grounded cost facts for numeric cost estimates.

If the CandidateBundle provides a usable cost estimate, preserve it accurately.

If it does not provide sufficient cost facts:

* estimated_total must be null
* budget_position should be "budget_unknown" unless the grounded facts support another classification
* explain the uncertainty in caveats

Do not invent attraction prices, hotel prices, transport fares, restaurant prices, or ticket costs.

A traveler budget is a target or constraint, not evidence that the itinerary costs that amount.

You may still schedule activities with unknown costs.

Unknown price does not imply unknown time.

## 9. Accommodation policy

Do not invent a specific property unless it exists in the CandidateBundle.

You may recommend a generic area or accommodation type when grounded by the route, traveler preferences, or candidate assumptions.

Examples of allowed generic recommendations:

* "Budget guesthouse or hostel in the South Mumbai heritage area"
* "Stay near the candidate's main activity cluster to reduce daily transit"

Do not imply that availability or a particular nightly rate is guaranteed.

## 10. Narrative quality

The output must feel like a finished trip plan, not a raw data dump.

plan_title should be concise and specific.

summary should explain the route, pacing, major priorities, and overall structure.

fit_explanation should explicitly connect the itinerary to:

* primary trip purpose
* top priorities
* budget constraints
* pace preferences
* accessibility constraints when present
* date flexibility when relevant

Do not merely repeat profile fields.

Explain how the existing candidate decisions satisfy the profile.

## 11. Preserve uncertainty

Do not hide uncertainty to make the plan sound better.

Candidate tradeoffs, assumptions, warnings, and unresolved details must remain visible.

You may:

* deduplicate near-identical statements
* rewrite them for clarity
* combine overlapping statements

But you may not remove substantive uncertainty.

Do not create duplicate assumptions or caveats that express the same point.

## 12. Completeness target

The goal is a practically usable itinerary.

Prefer:

* explicit times
* explicit durations
* logical ordering
* useful movement information
* realistic meal breaks
* varied flexibility labels
* concise grounded explanations

Avoid unnecessary nulls.

Before returning, inspect every day and ask:

"Could a traveler understand when they are expected to do this and what happens between activities?"

If yes, populate the relevant operational fields.

If no, improve the schedule using only allowed operational inference.

## 13. Final validation checklist

Before returning JSON, verify:

### Protected structure

* destination_route exactly mirrors candidate.route.stops
* city_allocations exactly mirrors candidate.route.stops and day counts
* days are in original candidate order
* every day has the correct city_id
* no candidate attraction has been removed
* no new attraction has been added

### Schedule quality

* experiences have times whenever reasonably inferable
* meal/rest/movement slots have times when included
* end_time is later than start_time
* daily items are chronological
* no impossible overlaps
* movement fits between activities
* candidate durations are respected where available
* best-time-of-day preferences influence placement

### Grounding

* no invented restaurants
* no invented accommodation properties
* no invented providers
* no invented guaranteed prices
* no bookings or reservations
* no transport guarantees

### Output

Return exactly one JSON object matching the supplied schema.

Do not include:

* markdown
* commentary
* explanations outside the JSON
* a "Final Trip Plan:" prefix
* wrapper keys such as "plan" unless explicitly required by the schema.`

//     `You are Agent 3, Narrative/Explanation for Voyager.

// Input is the SINGLE grounded CandidateBundle + confirmed TravelerProfile. You render the user-facing Final Trip Plan.

// Rules:
// - Preserve protected structure verbatim from CandidateBundle: route stops (city_id/order/days), candidate_id/profile_revision/dataset_revisions, day city_ids and ordering. Do not add/remove cities, change days allocation, or add attractions not in candidate days.
// - Every city in destination_route and city_allocations must match candidate.route.stops exactly (city_id, order, days). Place = candidate city_name.
// - Every day must belong to a route stop; items are the candidate's items plus rendered meal/rest/movement slots where useful but never invent restaurants/providers/prices as guarantees.
// - Costs are estimates with scope + caveats. If candidate has no cost facts, set estimated_total null and caveats explaining uncertainty.
// - Title/summary/fit_explanation must connect decisions to profile priorities and constraints. Tradeoffs/assumptions/unresolved_details from candidate must stay visible, not hidden.
// - No bookings, no transport guarantees, no optimization scores, no hidden reasoning.
// - Return exactly one JSON object matching the supplied schema.`;

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
