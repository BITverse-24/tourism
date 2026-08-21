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
import { GoogleGenAI } from "@google/genai";
import * as z from "zod";
import { DiscoveryAnsSelectionModes, DiscoveryFreeTextModes } from "../backend/src/structures/enums.js";

loadEnv({ path: resolve(__dirname, ".env") });

export type PreferenceStrength =
  | "must_have"
  | "strong"
  | "nice_to_have"
  | "not_interested"
  | "unknown";

export type InferenceConfidence = "high" | "medium" | "low";
// export type QuestionSelectionMode = "single" | "multiple";
// export type FreeTextMode = "disabled" | "optional" | "only_if_no_option" | "required";

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
  selection_mode: DiscoveryAnsSelectionModes;
  required: boolean;
  options: QuestionOption[];
  free_text_mode: DiscoveryFreeTextModes;
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
  /** Number of traveler-facing questions already asked in this run (authoritative backend count). When provided, Agent 1 uses this instead of estimating from profile fullness to enforce the 5–15 bounds exactly. */
  questions_asked_count?: number | null;
  /** Optional prior question prompts (oldest → newest) for de-duplication and variety. */
  prior_questions?: string[] | null;
}

export interface DiscoveryResult {
  profile: TravelerProfile;
  finished: boolean;
  next_question: DiscoveryQuestion | null;
  completion_reason: string | null;
}

export interface TripContextPatch {
  destination_request?: string | null;
  resolved_destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  duration_days?: number | null;
  date_flexibility?: TripContext["date_flexibility"] | null;
  party_size?: number | null;
  party_notes?: string | null;
  budget?: Budget | null;
}

export interface PurposeAndPrioritiesPatch {
  primary_purpose?: string | null;
  secondary_purposes?: string[];
  priorities?: string[];
  success_definition?: string | null;
}

export interface PreferencesPatch {
  upsert?: Preference[];
  remove_categories?: string[];
}

export interface TravelStylePatch {
  pace?: TravelStyle["pace"] | null;
  energy_pattern?: TravelStyle["energy_pattern"] | null;
  walking_tolerance?: TravelStyle["walking_tolerance"] | null;
  crowd_tolerance?: TravelStyle["crowd_tolerance"] | null;
  comfort_preference?: TravelStyle["comfort_preference"] | null;
  spontaneity?: TravelStyle["spontaneity"] | null;
}

export interface HardConstraintsPatch {
  must_visit_add?: string[];
  avoid_add?: string[];
  dietary_requirements_add?: string[];
  accessibility_requirements_add?: string[];
  accommodation_requirements_add?: string[];
  must_visit_remove?: string[];
  avoid_remove?: string[];
  dietary_requirements_remove?: string[];
  accessibility_requirements_remove?: string[];
  accommodation_requirements_remove?: string[];
  maximum_daily_travel?: string | null;
  maximum_hotel_changes?: number | null;
  budget_ceiling?: Budget | null;
}

export interface UnknownsPatch {
  add?: ProfileUnknown[];
  resolve_topics?: string[];
}

export interface AssumptionsPatch {
  add?: ProfileAssumption[];
  remove_topics?: string[];
}

export interface ProfilePatch {
  trip_context?: TripContextPatch | null;
  purpose_and_priorities?: PurposeAndPrioritiesPatch | null;
  preferences?: PreferencesPatch | null;
  travel_style?: TravelStylePatch | null;
  hard_constraints?: HardConstraintsPatch | null;
  unknowns?: UnknownsPatch | null;
  assumptions?: AssumptionsPatch | null;
}

export interface DiscoveryPatchResult {
  finished: boolean;
  next_question: DiscoveryQuestion | null;
  completion_reason: string | null;
  profile_patch: ProfilePatch;
}

export interface ProcessDiscoveryOptions {
  api_key?: string;
  model?: string;
  /**
   * Ignored for Agent 1 — discovery always uses the model's lowest supported thinking_level
   * (or omits thinking when the model defaults to Off). Kept for Agent 2 (candidate-design).
   */
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

export const DISCOVERY_SYSTEM_PROMPT = `
You are the Discovery/Profile agent for Voyager, an agentic travel-planning product.

Your job is to build a sufficiently rich Traveler Profile for a later planning stage. Capture not only logistics, but also the traveler's purpose, priorities, preferences, travel style, and material constraints.

In every response, do exactly two things:

1. Return ONLY the additions/changes to the traveler profile derived from the latest answer (a patch). Never repeat the complete profile.
2. Decide whether discovery should continue. If it should, ask exactly ONE high-value next question.

The backend already stores the complete profile and will merge your patch. The full current profile is provided in context. Always inspect it before choosing a question. Use it to avoid re-asking known information, but never echo it back.

CRITICAL ANTI-LOOP RULE:
Before asking any question, compare the intended topic against:
- the current profile;
- the latest traveler answer;
- unknowns;
- assumptions;
- coverage_hint, if provided;
- topics asked in previous turns, if available.

If the topic has already been resolved at sufficient specificity, DO NOT ask it again, even if the corresponding field is technically incomplete.

If timing is known anywhere in the profile or latest answer — including a specific date, date range, month, season, approximate timing, or timing stored in notes/assumptions — NEVER ask again about when, month, season, or time of year unless the traveler explicitly contradicts the previous timing.

If a topic is partially known, ask only for the genuinely missing piece when that missing piece is materially important. Example: if the month is known but duration is unknown, ask about duration, not "when are you going?"

Do not alternate different phrasings of the same question across turns.

## First turn

The profile and answer may both be null.

- If destination_request is already set from existing context or initial intent, do NOT ask for the destination again. Ask the highest-value unresolved question instead.
- Otherwise, return an empty patch and ask a concise default question about the destination.

## Discovery objective

The objective is PLANNING SUFFICIENCY, not blindly filling every field.

Treat the traveler's possible trips as a set of plausible solutions. After each answer, identify the remaining uncertainties that could materially change the trip. Ask the ONE question whose possible answers would most reduce important planning uncertainty.

Do not use a rigid checklist or fixed question order.

Prioritize questions based on:
- how much different answers would change the resulting trip;
- how many plausible trip directions the answer would rule in or out;
- whether an unresolved ambiguity could cause a materially wrong planning assumption;
- whether one natural question can reveal several related dimensions;
- whether the traveler can answer it naturally without filling out a form.

An unknown field does NOT automatically justify a question.

A single unknown DOES justify a question when resolving it would materially change the feasible trip or planning direction.

Use volunteered information aggressively. One answer may legitimately update multiple profile dimensions.

Avoid asking for information that:
- is already known;
- can be reliably derived from the latest answer;
- is unlikely to materially affect the plan;
- can safely be handled through a reasonable assumption;
- has already been resolved at sufficient specificity.

When an answer is ambiguous, clarify only the ambiguity with the greatest downstream planning impact.

Example:
If the traveler says "$3,000 for the trip" and it is unclear whether that is total or per person, clarify the budget scope if that distinction materially changes feasibility. Do not ask unrelated low-impact questions first.

## Profile dimensions

Learn these dimensions when they are useful for reducing planning uncertainty. They are NOT a mandatory question-by-question checklist.

### trip_context
- destination_request
- start_date
- end_date
- duration_days
- date_flexibility
- party_size
- party_notes
- budget, including amount, currency, scope, and type

### purpose_and_priorities
- primary_purpose
- secondary_purposes
- priorities
- success_definition

### preferences
Experience categories such as:
- culture
- food
- nature
- photography
- history
- relaxation
- nightlife
- shopping
- local experiences
- adventure
- architecture
- wellness
- entertainment

Store preference strength and notes where justified.

### travel_style
Where relevant:
- pace
- energy_pattern
- walking_tolerance
- crowd_tolerance
- comfort_preference
- spontaneity

### hard_constraints
When relevant:
- must_visit
- avoid
- dietary
- accessibility
- accommodation requirements
- other explicit non-negotiables

### unknowns / assumptions
Record material unresolved gaps and temporary interpretations explicitly.

## Question strategy

After basic destination information exists, generally prioritize the highest-impact unresolved dimension among:
1. missing essential logistics: dates/duration, party size, budget;
2. purpose and what success looks like;
3. experience interests and priorities;
4. travel style;
5. material constraints;
6. final blocking ambiguities.

This ordering is only a heuristic. A different question is preferable when it has substantially higher information value.

Do not ask multiple unrelated questions in one prompt.

Questions must be SHORT, DIRECT, and SPECIFIC.

Do NOT add:
- congratulations;
- enthusiasm;
- travel clichés;
- praise;
- filler;
- explanations of why you are asking;
- repeated context;
- "That sounds wonderful!";
- "Congratulations on your trip to...";
- "When would you like to visit this lovely place?";
- multi-sentence conversational framing.

Prefer:
- "When do you want to travel?"
- "How long will you stay?"
- "Who is traveling?"
- "What's your total budget?"
- "What matters most on this trip?"
- "What kind of experience do you want?"
- "How fast do you like to travel?"
- "Anything you want to avoid?"
- "Any dietary or accessibility needs?"

The question should usually be one sentence. Keep it concise while still allowing the traveler to provide useful detail.

## Question format (STRICT — free-text-only is the exception)

Default to structured choice. For the vast majority of questions you MUST provide MCQ/MSQ options:

- Provide 2-4 options (each with 'option_id', 'label', 'description') that are genuinely distinct and cover the common answers for that dimension.
- Set 'selection_mode' to 'single' for logistics/timing/party_size/budget/purpose (one answer) and 'multiple' for interests/priorities/constraints where several can apply.
- Set 'free_text_mode' to 'optional' (user may supplement a choice with detail) or 'only_if_no_option' (free text as fallback). This is the normal relaxation — user can still type more detail without forcing a blank textbox.
- Do NOT use 'options: []' by default. An empty options array with 'free_text_mode: "required"' is reserved ONLY for the hardest open-ended questions where a meaningful 2-4 choice set cannot be constructed (e.g., unconstrained must-visit/avoid list with arbitrary place names, highly specific dietary/accessibility requirements, or a truly open narrative that cannot be bucketed). Treat overuse of free-text-only as a defect.

Examples — correct vs incorrect:

- Correct (logistics): 'prompt:"Who is traveling?" options:[{2 travelers},{family with kids},{solo},{group 6+}] free_text_mode:"optional"'
- Correct (preferences, multiple): 'prompt:"What kinds of experiences do you want?" options:[{culture & history},{food & nightlife},{nature & outdoors},{relaxation & wellness}] selection_mode:"multiple" free_text_mode:"optional"'
- Incorrect: 'options:[], free_text_mode:"required"' for party_size, dates, budget, pace, or generic preferences — these ALWAYS have a natural choice set.

Do not pack several unrelated questions into one prompt. However, a question may naturally invite multiple related preferences when those preferences belong to the same decision.

## Never re-ask known information

Treat the following as resolved when sufficiently populated:

- destination_request non-null → never ask destination again;
- start_date or end_date non-null → do not ask when/month/season again;
- duration_days non-null → do not ask trip length again;
- date_flexibility sufficiently known → do not ask date flexibility again;
- party_size non-null → do not ask number of travelers again;
- budget non-null → do not ask budget again unless a missing scope/type is materially blocking;
- primary_purpose or priorities already sufficiently established → do not ask the same purpose question again;
- a travel_style field sufficiently known → do not re-ask that same style dimension;
- a preference category already present with sufficient strength → do not re-ask that interest unless strength/notes are materially important;
- hard constraint information already collected → do not ask the same constraint question again unless resolving a contradiction.

A free-text answer counts as an answer even if the traveler ignored provided options.

Do not ask the same semantic question in different wording.

## Coverage and completion

If coverage_hint is provided, use it as authoritative guidance for remaining gaps.

- If coverage_hint.timing_already_known is true, NEVER ask about month, season, dates, timing, or time of year again.
- If coverage_hint.may_finish is false, finished MUST be false. Ask the highest-value unresolved item from missing_high_value or another materially important uncovered dimension.
- If coverage_hint.questions_asked_estimate >= 15, finish. Record material leftover gaps in unknowns rather than continuing discovery.

Do not finish merely because destination, timing, party size, and budget exist. Logistics alone are insufficient when important experiential information is still missing.

Set finished=true only when, AFTER MERGING current profile + your patch, there is enough reliable information to produce a good trip plan.

As a strong default, the merged profile should contain:

1. Logistics:
   - destination_request;
   - at least one of start_date/end_date or duration_days;
   - party_size;
   - budget information OR an explicit material/blocking budget unknown.

2. Purpose:
   - primary_purpose;
   - at least one meaningful priority or success_definition.

3. Persona depth:
   - at least TWO preference categories with strengths;
   - at least THREE non-unknown travel_style fields among:
     pace, energy_pattern, walking_tolerance, crowd_tolerance, comfort_preference, spontaneity.

4. Constraints:
   - relevant hard constraints collected when applicable, OR at least one constraints-oriented question has been asked and the result recorded, including an explicit "none" where appropriate.

5. Interview depth:
   - normally at least ~5 traveler-facing questions worth of meaningful coverage;
   - never exceed ~15 questions.

These are sufficiency guidelines, not permission to ask redundant questions. If the profile is already rich enough with fewer questions, finish. If the traveler naturally supplied substantial information, count that coverage rather than manufacturing additional questions.

Do not continue merely to fill cosmetic gaps.

Finish earlier if the remaining unknowns are unlikely to materially change a reasonable plan.

Do not finish if one remaining question could resolve a genuinely blocking uncertainty and the question limit has not been reached.

When finished=true:
- next_question MUST be null;
- completion_reason MUST briefly explain why the profile is sufficient.

When finished=false:
- next_question MUST contain exactly ONE question;
- completion_reason MUST be null.

## Patch rules

Return ONLY changed fields in profile_patch.

Omit any section or field that did not change.

Within trip_context, purpose_and_priorities, and travel_style:
- include only keys changed in this turn;
- omit unchanged keys;
- use null only when explicitly clearing a previously set value.

Use the exact schema field names. For example:
- destination_request, NOT destination;
- start_date;
- end_date;
- duration_days;
- party_size;
- budget;
- primary_purpose.

Never invent alternate field names.

Never invent:
- dates;
- duration;
- budget;
- party size;
- destinations;
- constraints;
- preferences.

Only patch information the traveler explicitly stated or clearly accepted.

Do not represent an inference as a stated fact.

For inferred preferences:
- source MUST be "inferred";
- confidence MUST be populated.

A hard constraint may ONLY be patched when the traveler clearly stated it or explicitly accepted it.

Never copy a target, preferred, or flexible budget into hard_constraints.budget_ceiling.

Only patch hard_constraints.budget_ceiling when the traveler clearly states a maximum, limit, or non-negotiable ceiling. Its type MUST be "ceiling".

For preferences:
- use preferences.upsert to add or update a category;
- use preferences.remove_categories ONLY when the traveler retracts an interest;
- normally prefer updating strength to "not_interested" over removal.

For hard constraint array fields:
- use *_add to add items;
- use *_remove to retract items;
- never resend the entire array.

For unknowns:
- use unknowns.add for new unresolved topics;
- use unknowns.resolve_topics to remove resolved topics by topic string.

For assumptions:
- use assumptions.add to record assumptions;
- use assumptions.remove_topics to remove assumptions that are no longer applicable.

Keep patches minimal and readable.

Do not plan an itinerary.
Do not recommend destinations or places.
Do not book anything.
Do not discuss implementation details.
Do not echo the complete profile.

## Output format

Return EXACTLY one valid JSON object with exactly these four root-level keys:

{
  "finished": false,
  "next_question": {
    "question_id": "...",
    "prompt": "...",
    "selection_mode": "single",
    "required": true,
    "options": [
      { "option_id": "opt_a", "label": "Example A", "description": "Description for A" },
      { "option_id": "opt_b", "label": "Example B", "description": "Description for B" }
    ],
    "free_text_mode": "optional",
    "free_text_placeholder": "Add detail (optional)..."
  },
  "completion_reason": null,
  "profile_patch": {}
}

The keys finished, next_question, completion_reason, and profile_patch are siblings.

If finished=true:
- next_question = null;
- completion_reason = a brief explanation of why discovery is sufficient.

If finished=false:
- next_question contains exactly one question;
- completion_reason = null.

The next_question prompt MUST be concise and direct. Do not add conversational filler.

Return ONLY valid JSON.
No markdown.
No commentary.
No chain-of-thought.
No explanations outside the JSON.
No extra keys.
`;

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

export const DISCOVERY_PATCH_RESPONSE_SCHEMA = {
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
    profile_patch: {
      type: "object",
      additionalProperties: false,
      properties: {
        trip_context: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: {
            destination_request: stringOrNullSchema,
            resolved_destination: stringOrNullSchema,
            start_date: stringOrNullSchema,
            end_date: stringOrNullSchema,
            duration_days: numberOrNullSchema,
            date_flexibility: {
              type: ["string", "null"],
              enum: ["fixed", "somewhat_flexible", "highly_flexible", "unknown", null],
            },
            party_size: numberOrNullSchema,
            party_notes: stringOrNullSchema,
            budget: budgetSchema,
          },
          required: [], // Make all fields optional to support partial patches
        },
        purpose_and_priorities: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: {
            primary_purpose: stringOrNullSchema,
            secondary_purposes: { type: "array", items: { type: "string" } },
            priorities: { type: "array", items: { type: "string" } },
            success_definition: stringOrNullSchema,
          },
          required: [], // Make all fields optional to support partial patches
        },
        preferences: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: {
            upsert: {
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
            remove_categories: { type: "array", items: { type: "string" } },
          },
          required: [], // Make all fields optional to support partial patches
        },
        travel_style: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: {
            pace: { type: ["string", "null"], enum: ["slow", "balanced", "fast", "unknown", null] },
            energy_pattern: {
              type: ["string", "null"],
              enum: ["morning", "afternoon", "evening", "consistent", "unknown", null],
            },
            walking_tolerance: {
              type: ["string", "null"],
              enum: ["low", "medium", "high", "unknown", null],
            },
            crowd_tolerance: {
              type: ["string", "null"],
              enum: ["low", "medium", "high", "unknown", null],
            },
            comfort_preference: {
              type: ["string", "null"],
              enum: ["comfort_first", "balanced", "exploration_first", "unknown", null],
            },
            spontaneity: {
              type: ["string", "null"],
              enum: ["structured", "some_flexibility", "spontaneous", "unknown", null],
            },
          },
          required: [], // Make all fields optional to support partial patches
        },
        hard_constraints: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: {
            must_visit_add: { type: "array", items: { type: "string" } },
            avoid_add: { type: "array", items: { type: "string" } },
            dietary_requirements_add: { type: "array", items: { type: "string" } },
            accessibility_requirements_add: { type: "array", items: { type: "string" } },
            accommodation_requirements_add: { type: "array", items: { type: "string" } },
            must_visit_remove: { type: "array", items: { type: "string" } },
            avoid_remove: { type: "array", items: { type: "string" } },
            dietary_requirements_remove: { type: "array", items: { type: "string" } },
            accessibility_requirements_remove: { type: "array", items: { type: "string" } },
            accommodation_requirements_remove: { type: "array", items: { type: "string" } },
            maximum_daily_travel: stringOrNullSchema,
            maximum_hotel_changes: numberOrNullSchema,
            budget_ceiling: budgetSchema,
          },
          required: [], // Make all fields optional to support partial patches
        },
        unknowns: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: {
            add: {
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
            resolve_topics: { type: "array", items: { type: "string" } },
          },
          required: [], // Make all fields optional to support partial patches
        },
        assumptions: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: {
            add: {
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
            remove_topics: { type: "array", items: { type: "string" } },
          },
          required: [], // Make all fields optional to support partial patches
        },
      },
    },
  },
  required: ["finished", "next_question", "completion_reason", "profile_patch"],
} as const;

const DEFAULT_MODEL = "gemini-3.5-flash";
// ponytail: TPD/RPD are model-specific -> fallback hierarchy for testing (lite 0 budget loops, use 3.5 regular)
const MODEL_HIERARCHY = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemma-4-31b-it",
] as const;

type GeminiThinkingLevel = "minimal" | "low" | "medium" | "high";

/** Lowest → highest. Gemini 3.x rejects thinkingBudget: 0; use thinking_level instead. */
const MODEL_THINKING_LEVELS: Record<string, readonly GeminiThinkingLevel[]> = {
  "gemini-3.7-flash": ["low", "medium", "high"],
  "gemini-3.6-flash": ["minimal", "low", "medium", "high"],
  "gemini-3.5-flash-lite": ["minimal", "low", "medium", "high"],
  "gemini-3.1-pro-preview": ["low", "medium", "high"],
  "gemini-3.1-flash-lite-image": ["minimal", "high"],
  "gemini-3.1-flash-lite": ["minimal", "low", "medium", "high"],
  "gemini-3-flash-preview": ["minimal", "low", "medium", "high"],
  "gemini-3-pro-preview": ["low", "high"],
  "gemini-3.5-flash": ["minimal", "low", "medium", "high"],
  "gemini-2.5-pro": ["low", "medium", "high"],
  "gemini-2.5-flash": ["low", "medium", "high"],
  "gemini-2.5-flash-lite": ["low", "medium", "high"],
};

/** Sending a thinking_level on this model would turn thinking on; omit config instead. */
const THINKING_OFF_BY_DEFAULT = new Set<string>(["gemini-2.5-flash-lite"]);

function lowestThinkingLevel(modelName: string): GeminiThinkingLevel | null {
  if (THINKING_OFF_BY_DEFAULT.has(modelName)) return null;
  const listed = MODEL_THINKING_LEVELS[modelName];
  if (listed && listed.length > 0) return listed[0];
  if (modelName.startsWith("gemini-3") && modelName.includes("pro")) return "low";
  if (modelName.startsWith("gemini-3")) return "minimal";
  if (modelName.startsWith("gemini-2.5")) return "low";
  return "minimal";
}

function agent1ThinkingConfig(modelName: string): { thinkingLevel: GeminiThinkingLevel } | undefined {
  if (!modelName.startsWith("gemini")) return undefined;
  const level = lowestThinkingLevel(modelName);
  if (!level) return undefined;
  return { thinkingLevel: level };
}
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_COMPLETION_TOKENS = 1_200; // ponytail: patch only, 3k overkill -> 14-26s, 1.2k cuts gen 40%
const MAX_RATE_LIMIT_RETRIES = 2;
let responseLogSequence = 0;
// ponytail: cache zod schema once, was recompiled per request (heavy)
const _cachedPatchJsonSchema = DISCOVERY_PATCH_RESPONSE_SCHEMA as unknown as Record<string, unknown>;
let _cachedPatchZodSchema: any | null = null;
function getPatchZodSchema() {
  if (_cachedPatchZodSchema) return _cachedPatchZodSchema;
  _cachedPatchZodSchema = (z as any).fromJSONSchema ? (z as any).fromJSONSchema(_cachedPatchJsonSchema as any) : { parse: (v: unknown) => v };
  return _cachedPatchZodSchema;
}

const DEFAULT_LOG_DIRECTORY = resolve(__dirname, "logs");

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

function cloneProfile(profile: TravelerProfile): TravelerProfile {
  return JSON.parse(JSON.stringify(profile)) as TravelerProfile;
}

function hasOwnPatchField<T extends object>(obj: T, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function applyProfilePatch(
  current: TravelerProfile | null,
  patch: ProfilePatch | null | undefined,
): TravelerProfile {
  const base = current ? cloneProfile(current) : emptyProfile("mock-profile");
  if (!patch || typeof patch !== "object") return base;

  const tc = patch.trip_context;
  if (tc && typeof tc === "object") {
    const rec = tc as Record<string, unknown>;
    if (hasOwnPatchField(rec, "destination_request")) {
      base.trip_context.destination_request = stringOrNull(rec.destination_request);
    }
    if (hasOwnPatchField(rec, "resolved_destination")) {
      base.trip_context.resolved_destination = stringOrNull(rec.resolved_destination);
    }
    if (hasOwnPatchField(rec, "start_date")) {
      base.trip_context.start_date = stringOrNull(rec.start_date);
    }
    if (hasOwnPatchField(rec, "end_date")) {
      base.trip_context.end_date = stringOrNull(rec.end_date);
    }
    if (hasOwnPatchField(rec, "duration_days")) {
      base.trip_context.duration_days = numberOrNull(rec.duration_days);
    }
    if (hasOwnPatchField(rec, "date_flexibility")) {
      const v = rec.date_flexibility;
      base.trip_context.date_flexibility =
        v === "fixed" || v === "somewhat_flexible" || v === "highly_flexible" ? (v as TripContext["date_flexibility"]) : v === null ? "unknown" : base.trip_context.date_flexibility;
      if (v === "unknown") base.trip_context.date_flexibility = "unknown";
    }
    if (hasOwnPatchField(rec, "party_size")) {
      base.trip_context.party_size = numberOrNull(rec.party_size);
    }
    if (hasOwnPatchField(rec, "party_notes")) {
      base.trip_context.party_notes = stringOrNull(rec.party_notes);
    }
    if (hasOwnPatchField(rec, "budget")) {
      const b = normalizeBudget(rec.budget, null);
      if (b !== null || rec.budget === null) base.trip_context.budget = b;
    }
  }

  const pp = patch.purpose_and_priorities;
  if (pp && typeof pp === "object") {
    const rec = pp as Record<string, unknown>;
    if (hasOwnPatchField(rec, "primary_purpose")) {
      base.purpose_and_priorities.primary_purpose = stringOrNull(rec.primary_purpose);
    }
    if (hasOwnPatchField(rec, "secondary_purposes") && Array.isArray(rec.secondary_purposes)) {
      base.purpose_and_priorities.secondary_purposes = stringArray(rec.secondary_purposes);
    }
    if (hasOwnPatchField(rec, "priorities") && Array.isArray(rec.priorities)) {
      base.purpose_and_priorities.priorities = stringArray(rec.priorities);
    }
    if (hasOwnPatchField(rec, "success_definition")) {
      base.purpose_and_priorities.success_definition = stringOrNull(rec.success_definition);
    }
  }

  const ts = patch.travel_style;
  if (ts && typeof ts === "object") {
    const rec = ts as Record<string, unknown>;
    if (hasOwnPatchField(rec, "pace") && rec.pace !== undefined) {
      const v = rec.pace;
      if (v === "slow" || v === "balanced" || v === "fast" || v === "unknown" || v === null) {
        base.travel_style.pace = (v as TravelStyle["pace"]) ?? "unknown";
        if (v === null) base.travel_style.pace = "unknown";
      }
    }
    if (hasOwnPatchField(rec, "energy_pattern") && rec.energy_pattern !== undefined) {
      const v = rec.energy_pattern;
      if (v === "morning" || v === "afternoon" || v === "evening" || v === "consistent" || v === "unknown" || v === null) {
        base.travel_style.energy_pattern = (v as TravelStyle["energy_pattern"]) ?? "unknown";
        if (v === null) base.travel_style.energy_pattern = "unknown";
      }
    }
    if (hasOwnPatchField(rec, "walking_tolerance") && rec.walking_tolerance !== undefined) {
      const v = rec.walking_tolerance;
      if (v === "low" || v === "medium" || v === "high" || v === "unknown" || v === null) {
        base.travel_style.walking_tolerance = (v as TravelStyle["walking_tolerance"]) ?? "unknown";
        if (v === null) base.travel_style.walking_tolerance = "unknown";
      }
    }
    if (hasOwnPatchField(rec, "crowd_tolerance") && rec.crowd_tolerance !== undefined) {
      const v = rec.crowd_tolerance;
      if (v === "low" || v === "medium" || v === "high" || v === "unknown" || v === null) {
        base.travel_style.crowd_tolerance = (v as TravelStyle["crowd_tolerance"]) ?? "unknown";
        if (v === null) base.travel_style.crowd_tolerance = "unknown";
      }
    }
    if (hasOwnPatchField(rec, "comfort_preference") && rec.comfort_preference !== undefined) {
      const v = rec.comfort_preference;
      if (v === "comfort_first" || v === "balanced" || v === "exploration_first" || v === "unknown" || v === null) {
        base.travel_style.comfort_preference = (v as TravelStyle["comfort_preference"]) ?? "unknown";
        if (v === null) base.travel_style.comfort_preference = "unknown";
      }
    }
    if (hasOwnPatchField(rec, "spontaneity") && rec.spontaneity !== undefined) {
      const v = rec.spontaneity;
      if (v === "structured" || v === "some_flexibility" || v === "spontaneous" || v === "unknown" || v === null) {
        base.travel_style.spontaneity = (v as TravelStyle["spontaneity"]) ?? "unknown";
        if (v === null) base.travel_style.spontaneity = "unknown";
      }
    }
  }

  const pref = patch.preferences;
  if (pref && typeof pref === "object") {
    if (Array.isArray(pref.upsert)) {
      for (const item of pref.upsert) {
        const rec = recordOrEmpty(item);
        const category = stringOrNull(rec.category);
        if (!category) continue;
        const normalized: Preference = {
          category,
          strength:
            rec.strength === "must_have" ||
            rec.strength === "strong" ||
            rec.strength === "nice_to_have" ||
            rec.strength === "not_interested"
              ? (rec.strength as PreferenceStrength)
              : "unknown",
          notes: stringOrNull(rec.notes),
          source: rec.source === "stated" || rec.source === "inferred" ? (rec.source as Preference["source"]) : "defaulted",
          confidence:
            rec.confidence === "high" || rec.confidence === "medium" || rec.confidence === "low"
              ? (rec.confidence as InferenceConfidence)
              : null,
        };
        const idx = base.preferences.findIndex((p) => p.category.toLowerCase() === category.toLowerCase());
        if (idx >= 0) base.preferences[idx] = normalized;
        else base.preferences.push(normalized);
      }
    }
    if (Array.isArray(pref.remove_categories)) {
      const toRemove = new Set(pref.remove_categories.map((c) => String(c).toLowerCase()));
      base.preferences = base.preferences.filter((p) => !toRemove.has(p.category.toLowerCase()));
    }
  }

  const hc = patch.hard_constraints;
  if (hc && typeof hc === "object") {
    const addUnique = (currentList: string[], additions: unknown): string[] => {
      if (!Array.isArray(additions)) return currentList;
      const cleaned = stringArray(additions);
      const existing = new Set(currentList.map((s) => s.toLowerCase()));
      for (const item of cleaned) {
        if (!existing.has(item.toLowerCase())) {
          currentList.push(item);
          existing.add(item.toLowerCase());
        }
      }
      return currentList;
    };
    const removeByValue = (currentList: string[], removals: unknown): string[] => {
      if (!Array.isArray(removals)) return currentList;
      const toRemove = new Set(stringArray(removals).map((s) => s.toLowerCase()));
      return currentList.filter((s) => !toRemove.has(s.toLowerCase()));
    };
    if (Array.isArray(hc.must_visit_add)) base.hard_constraints.must_visit = addUnique(base.hard_constraints.must_visit, hc.must_visit_add);
    if (Array.isArray(hc.avoid_add)) base.hard_constraints.avoid = addUnique(base.hard_constraints.avoid, hc.avoid_add);
    if (Array.isArray(hc.dietary_requirements_add)) base.hard_constraints.dietary_requirements = addUnique(base.hard_constraints.dietary_requirements, hc.dietary_requirements_add);
    if (Array.isArray(hc.accessibility_requirements_add)) base.hard_constraints.accessibility_requirements = addUnique(base.hard_constraints.accessibility_requirements, hc.accessibility_requirements_add);
    if (Array.isArray(hc.accommodation_requirements_add)) base.hard_constraints.accommodation_requirements = addUnique(base.hard_constraints.accommodation_requirements, hc.accommodation_requirements_add);
    if (Array.isArray(hc.must_visit_remove)) base.hard_constraints.must_visit = removeByValue(base.hard_constraints.must_visit, hc.must_visit_remove);
    if (Array.isArray(hc.avoid_remove)) base.hard_constraints.avoid = removeByValue(base.hard_constraints.avoid, hc.avoid_remove);
    if (Array.isArray(hc.dietary_requirements_remove)) base.hard_constraints.dietary_requirements = removeByValue(base.hard_constraints.dietary_requirements, hc.dietary_requirements_remove);
    if (Array.isArray(hc.accessibility_requirements_remove)) base.hard_constraints.accessibility_requirements = removeByValue(base.hard_constraints.accessibility_requirements, hc.accessibility_requirements_remove);
    if (Array.isArray(hc.accommodation_requirements_remove)) base.hard_constraints.accommodation_requirements = removeByValue(base.hard_constraints.accommodation_requirements, hc.accommodation_requirements_remove);
    if (hasOwnPatchField(hc as Record<string, unknown>, "maximum_daily_travel")) {
      base.hard_constraints.maximum_daily_travel = stringOrNull((hc as Record<string, unknown>).maximum_daily_travel);
    }
    if (hasOwnPatchField(hc as Record<string, unknown>, "maximum_hotel_changes")) {
      base.hard_constraints.maximum_hotel_changes = numberOrNull((hc as Record<string, unknown>).maximum_hotel_changes);
    }
    if (hasOwnPatchField(hc as Record<string, unknown>, "budget_ceiling")) {
      const bc = normalizeBudgetCeiling((hc as Record<string, unknown>).budget_ceiling);
      if (bc !== null || (hc as Record<string, unknown>).budget_ceiling === null) base.hard_constraints.budget_ceiling = bc;
    }
  }

  const unk = patch.unknowns;
  if (unk && typeof unk === "object") {
    if (Array.isArray(unk.add)) {
      for (const item of unk.add) {
        const rec = recordOrEmpty(item);
        const topic = stringOrNull(rec.topic);
        const description = stringOrNull(rec.description);
        if (!topic || !description) continue;
        const normalized: ProfileUnknown = {
          topic,
          description,
          impact: rec.impact === "blocking" || rec.impact === "material" ? (rec.impact as ProfileUnknown["impact"]) : "minor",
        };
        const idx = base.unknowns.findIndex((u) => u.topic.toLowerCase() === topic.toLowerCase());
        if (idx >= 0) base.unknowns[idx] = normalized;
        else base.unknowns.push(normalized);
      }
    }
    if (Array.isArray(unk.resolve_topics)) {
      const toResolve = new Set(unk.resolve_topics.map((t) => String(t).toLowerCase()));
      base.unknowns = base.unknowns.filter((u) => !toResolve.has(u.topic.toLowerCase()));
    }
  }

  const assum = patch.assumptions;
  if (assum && typeof assum === "object") {
    if (Array.isArray(assum.add)) {
      for (const item of assum.add) {
        const rec = recordOrEmpty(item);
        const topic = stringOrNull(rec.topic);
        const value = stringOrNull(rec.value);
        const reason = stringOrNull(rec.reason);
        if (!topic || !value || !reason) continue;
        const normalized: ProfileAssumption = {
          topic,
          value,
          reason,
          user_confirmation_needed: rec.user_confirmation_needed === true,
        };
        const idx = base.assumptions.findIndex((a) => a.topic.toLowerCase() === topic.toLowerCase());
        if (idx >= 0) base.assumptions[idx] = normalized;
        else base.assumptions.push(normalized);
      }
    }
    if (Array.isArray(assum.remove_topics)) {
      const toRemove = new Set(assum.remove_topics.map((t) => String(t).toLowerCase()));
      base.assumptions = base.assumptions.filter((a) => !toRemove.has(a.topic.toLowerCase()));
    }
  }

  return base;
}

function validateResult(value: unknown): asserts value is DiscoveryResult {
  if (!isRecord(value)) throw new DiscoveryResponseError("Gemini returned a response that is not an object.");
  if (!isRecord(value.profile)) throw new DiscoveryResponseError("Gemini returned an invalid traveler profile.");
  if (typeof value.finished !== "boolean") throw new DiscoveryResponseError("Gemini returned an invalid completion flag.");
  if (value.next_question !== null && !isRecord(value.next_question)) {
    throw new DiscoveryResponseError("Gemini returned an invalid next question.");
  }
  if (value.finished && value.next_question !== null) {
    throw new DiscoveryResponseError("A finished discovery response cannot contain a next question.");
  }
  if (!value.finished && value.next_question === null) {
    throw new DiscoveryResponseError("An unfinished discovery response must contain a next question.");
  }
  if (value.completion_reason !== null && typeof value.completion_reason !== "string") {
    throw new DiscoveryResponseError("Gemini returned an invalid completion reason.");
  }
  if (value.finished && typeof value.completion_reason !== "string") {
    throw new DiscoveryResponseError("A finished discovery response must explain why it is complete.");
  }
}

function validatePatchResult(value: unknown): asserts value is DiscoveryPatchResult {
  if (!isRecord(value)) throw new DiscoveryResponseError("Gemini returned a response that is not an object.");
  if (!isRecord(value.profile_patch)) throw new DiscoveryResponseError("Gemini returned an invalid profile_patch.");
  if (typeof value.finished !== "boolean") throw new DiscoveryResponseError("Gemini returned an invalid completion flag.");
  if (value.next_question !== null && !isRecord(value.next_question)) {
    throw new DiscoveryResponseError("Gemini returned an invalid next question.");
  }
  if (value.finished && value.next_question !== null) {
    throw new DiscoveryResponseError("A finished discovery response cannot contain a next question.");
  }
  if (!value.finished && value.next_question === null) {
    throw new DiscoveryResponseError("An unfinished discovery response must contain a next question.");
  }
  if (value.completion_reason !== null && typeof value.completion_reason !== "string") {
    throw new DiscoveryResponseError("Gemini returned an invalid completion reason.");
  }
  if (value.finished && typeof value.completion_reason !== "string") {
    throw new DiscoveryResponseError("A finished discovery response must explain why it is complete.");
  }
}

function buildCoverageHint(profile: TravelerProfile | null, questionsAskedCount?: number | null): Record<string, unknown> {
  const hasActualCount = typeof questionsAskedCount === "number" && Number.isFinite(questionsAskedCount);
  const actualCount = hasActualCount ? (questionsAskedCount as number) : null;
  if (!profile) {
    return {
      questions_asked_estimate: actualCount ?? 0,
      questions_asked_count: actualCount,
      is_estimate: !hasActualCount,
      may_finish: false,
      missing_high_value: [
        "destination_request",
        "dates_or_duration",
        "party_size",
        "budget",
        "primary_purpose",
        "priorities",
        "preferences",
        "travel_style",
        "constraints_pass",
      ],
      timing_already_known: false,
      note: "First turn or empty profile — do not finish; ask the best opening question.",
    };
  }

  const tc = profile.trip_context;
  const timingKnown = !!(tc.start_date || tc.end_date || tc.duration_days);
  const style = profile.travel_style;
  const styleKnown = [
    style.pace,
    style.energy_pattern,
    style.walking_tolerance,
    style.crowd_tolerance,
    style.comfort_preference,
    style.spontaneity,
  ].filter((v) => v && v !== "unknown").length;

  const prefs = profile.preferences.filter((p) => p.strength !== "unknown");
  const purpose = profile.purpose_and_priorities;
  const hc = profile.hard_constraints;
  const constraintsTouched =
    hc.must_visit.length > 0 ||
    hc.avoid.length > 0 ||
    hc.dietary_requirements.length > 0 ||
    hc.accessibility_requirements.length > 0 ||
    hc.accommodation_requirements.length > 0 ||
    hc.maximum_daily_travel !== null ||
    hc.maximum_hotel_changes !== null ||
    hc.budget_ceiling !== null ||
    profile.assumptions.some((a) => /constraint|dietary|access|avoid|must.?visit|accommodation/i.test(a.topic)) ||
    profile.unknowns.some((u) => /constraint|dietary|access|avoid|must.?visit|accommodation/i.test(u.topic));

  const missing: string[] = [];
  if (!tc.destination_request) missing.push("destination_request");
  if (!timingKnown) missing.push("dates_or_duration");
  if (tc.party_size === null) missing.push("party_size");
  if (!tc.budget) missing.push("budget");
  if (!purpose.primary_purpose) missing.push("primary_purpose");
  if (purpose.priorities.length === 0 && !purpose.success_definition) missing.push("priorities_or_success_definition");
  if (prefs.length < 2) missing.push("preferences_at_least_2");
  if (styleKnown < 3) missing.push("travel_style_at_least_3_fields");
  if (!constraintsTouched) missing.push("constraints_pass");

  // Rough depth signal from how much of the profile is already filled (no backend question counter).
  let filledScore = 0;
  if (tc.destination_request) filledScore += 1;
  if (timingKnown) filledScore += 1;
  if (tc.party_size !== null) filledScore += 1;
  if (tc.budget) filledScore += 1;
  if (purpose.primary_purpose) filledScore += 1;
  if (purpose.priorities.length > 0 || purpose.success_definition) filledScore += 1;
  filledScore += Math.min(prefs.length, 3);
  filledScore += Math.min(styleKnown, 3);
  if (constraintsTouched) filledScore += 1;
  const questionsAskedEstimate = Math.max(0, filledScore - (tc.destination_request ? 1 : 0));
  const authoritativeCount = hasActualCount ? (actualCount as number) : questionsAskedEstimate;

  const depthMet =
    !!tc.destination_request &&
    timingKnown &&
    tc.party_size !== null &&
    (!!tc.budget || profile.unknowns.some((u) => /budget/i.test(u.topic))) &&
    !!purpose.primary_purpose &&
    (purpose.priorities.length > 0 || !!purpose.success_definition) &&
    prefs.length >= 2 &&
    styleKnown >= 3 &&
    constraintsTouched;

  return {
    questions_asked_estimate: authoritativeCount,
    questions_asked_count: actualCount,
    questions_asked_estimate_fallback: questionsAskedEstimate,
    is_estimate: !hasActualCount,
    min_questions: 5,
    max_questions: 15,
    may_finish: depthMet && authoritativeCount >= 5,
    timing_already_known: timingKnown,
    date_flexibility: tc.date_flexibility,
    preference_count: prefs.length,
    travel_style_known_count: styleKnown,
    constraints_pass_done: constraintsTouched,
    missing_high_value: missing,
    note: timingKnown
      ? "Timing is already known — do NOT ask month, season, dates, or time-of-year again."
      : "Timing still unknown — you may ask once for dates/duration/season.",
  };
}

function buildUserMessage(input: DiscoveryInput): string {
  const coverageHint = buildCoverageHint(input.profile, input.questions_asked_count ?? null);
  return JSON.stringify({
    instructions:
      "Return ONLY the profile_patch (changed fields) and either one next question or a finished response. Use coverage_hint to pick an uncovered dimension. Never re-ask timing if timing_already_known is true. Do not finish unless coverage_hint.may_finish is true (unless questions_asked_count/estimate >= 15). Do not echo the profile back. questions_asked_count is authoritative when present; otherwise questions_asked_estimate is a fallback.",
    profile: input.profile,
    answer: input.answer,
    coverage_hint: coverageHint,
    prior_questions: input.prior_questions ?? undefined,
    questions_asked_count: input.questions_asked_count ?? undefined,
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
    "----- raw Gemini response -----",
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

/** Processes one discovery turn with exactly one Gemini request. */
export async function processDiscovery(
  input: DiscoveryInput,
  options: ProcessDiscoveryOptions & { genAiClient?: any } = {},
): Promise<DiscoveryResult> {
  console.log('[processDiscovery] Starting processDiscovery with input:', {
    hasProfile: !!input.profile,
    hasAnswer: !!input.answer,
    profileId: input.profile?.profile_id
  });

  const apiKey =
    options.api_key ??
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_API_KEY ??
    process.env.GOOGLE_GENAI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  console.log('[processDiscovery] API key found:', !!apiKey);
  
  if (!apiKey) {
    throw new DiscoveryConfigurationError(
      "Missing GEMINI_API_KEY. Set it in the environment or pass api_key for this request.",
    );
  }

  const requestedModel = options.model ?? process.env.GEMINI_MODEL ?? process.env.GOOGLE_MODEL ?? DEFAULT_MODEL;
  const timeoutMs = options.timeout_ms ?? DEFAULT_TIMEOUT_MS;
  const logResponses = options.log_raw_responses ?? true;
  
  console.log('[processDiscovery] Configuration:', {
    requestedModel,
    timeoutMs,
    logResponses,
    thinkingLevel: lowestThinkingLevel(requestedModel),
    // Backend may still pass AGENT_REASONING_EFFORT; Agent 1 never uses it.
    ignored_reasoning_effort: options.reasoning_effort ?? null,
    hasFetcher: !!options.fetcher,
    hasInjectedClient: !!options.genAiClient
  });
  
  // Build hierarchy starting from requested model, fallback through list
  const startIdx = MODEL_HIERARCHY.indexOf(requestedModel as any);
  const modelsToTry = startIdx >= 0 ? MODEL_HIERARCHY.slice(startIdx) : [requestedModel, ...MODEL_HIERARCHY.filter(m => m !== requestedModel)];
  
  console.log('[processDiscovery] Models to try (in order):', modelsToTry);

  // Build combined prompt: system instruction + user context.
  // Do not modify DISCOVERY_SYSTEM_PROMPT per requirements.
  const fullPrompt = `${DISCOVERY_SYSTEM_PROMPT}\n\n---\n\nUser context:\n${buildUserMessage(input)}`;

  const discoveryPatchJsonSchema = _cachedPatchJsonSchema;
  const discoveryPatchZodSchema = getPatchZodSchema();

  // Allow injection for tests (genAiClient) otherwise create real client.
  // Keep fetcher as legacy escape hatch for tests that mock fetch-like behavior.
  const injectedClient = (options as any).genAiClient as any | undefined;
  const fetcher = options.fetcher;

  const getOutputText = (interaction: any): string => {
    if (!interaction) return "";
    if (typeof interaction.output_text === "string") return interaction.output_text;
    if (typeof interaction.outputText === "string") return interaction.outputText;
    // Fallback: try candidates/parts shape (Gemini generateContent)
    if (Array.isArray(interaction.candidates) && interaction.candidates[0]?.content?.parts?.[0]?.text) {
      return interaction.candidates[0].content.parts[0].text as string;
    }
    if (typeof interaction.text === "string") return interaction.text;
    return "";
  };

  const createInteraction = async (client: any, modelName: string, signal?: AbortSignal): Promise<any> => {
    const thinkingConfig = agent1ThinkingConfig(modelName);
    const thinkingLevel = thinkingConfig?.thinkingLevel ?? null;
    // Prefer generateContent: GoogleGenAI always exposes interactions.create, and that
    // path previously sent thinkingBudget: 0 which Gemini 3.x rejects as INVALID_ARGUMENT.
    if (client.models && typeof client.models.generateContent === "function") {
      console.log(`[processDiscovery] Using generateContent with thinkingLevel=${thinkingLevel ?? "omit"} for ${modelName}`);
      const res = await client.models.generateContent({
        model: `models/${modelName}`,
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: discoveryPatchJsonSchema,
          temperature: 0.2,
          maxOutputTokens: MAX_COMPLETION_TOKENS,
          ...(thinkingConfig ? { thinkingConfig } : {}),
          httpOptions: signal ? { signal } as any : undefined,
        } as any,
      });
      return res;
    }
    if (client.interactions && typeof client.interactions.create === "function") {
      console.log(`[processDiscovery] Fallback interactions.create for ${modelName}`);
      return await client.interactions.create({
        model: `models/${modelName}`,
        input: fullPrompt,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: discoveryPatchJsonSchema,
        },
        generation_config: {
          temperature: 0.2,
          max_output_tokens: MAX_COMPLETION_TOKENS,
          ...(thinkingLevel ? { thinking_level: thinkingLevel, thinking_summaries: "none" } : {}),
        },
      }, signal ? { signal } as any : undefined);
    }
    throw new DiscoveryApiError("Unsupported GoogleGenAI client shape.", 0);
  };

  const withTimeout = async <T>(promise: Promise<T>, ms: number, controller?: AbortController): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller?.abort();
        reject(new DOMException("Timeout", "AbortError"));
      }, ms);
    });
    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId!);
      return result as T;
    } catch (e) {
      clearTimeout(timeoutId!);
      throw e;
    }
  };

  let lastOutputText = "";
  let lastStatus = 200;
  let lastRateLimitError: any = null;

  for (const model of modelsToTry) {
    console.log(`[processDiscovery] Trying model: ${model}`);
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
    console.log(`[processDiscovery] Attempt ${attempt + 1}/${MAX_RATE_LIMIT_RETRIES + 1} for model ${model}`);
    try {
      let interaction: any;

      if (injectedClient) {
        console.log(`[processDiscovery] Using injected client for model ${model}`);
        const ctrl = new AbortController();
        interaction = await withTimeout(createInteraction(injectedClient, model, ctrl.signal), timeoutMs, ctrl);
      } else if (fetcher) {
        console.log(`[processDiscovery] Using fetcher for model ${model}`);
        // Legacy fetch-style mock: allow tests to provide fetcher that returns Gemini-like envelope.
        // We synthesize a Gemini interaction from fetcher response to keep migration testable without real API.
        const mockUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent";
        const mockBody = JSON.stringify({
          model,
          input: fullPrompt,
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema: discoveryPatchJsonSchema,
          },
        });
        const ctrl = new AbortController();
        const response = await withTimeout(
          fetcher(mockUrl, {
            method: "POST",
            headers: {
              "x-goog-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: mockBody,
            signal: ctrl.signal as any,
          } as any),
          timeoutMs,
          ctrl,
        ) as any;
        const responseText = await response.text();
        lastStatus = response.status ?? 200;
        if (logResponses) { void logRawResponse(responseText, lastStatus, attempt + 1).catch(()=>{}); } // ponytail: fire-and-forget, was blocking return
        if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
          await wait(rateLimitDelayMs(responseText));
          continue;
        }
        if (!response.ok) {
          throw new DiscoveryApiError(
            `Gemini request failed with status ${response.status}: ${responseText.slice(0, 500)}`,
            response.status,
          );
        }
        // Try to parse fetcher's envelope as Gemini output
        let envelope: any;
        try {
          envelope = JSON.parse(responseText);
        } catch {
          throw new DiscoveryResponseError("Gemini returned invalid JSON outside the response content.");
        }
        // If fetcher returned { output_text: "..." } use it directly
        if (typeof envelope.output_text === "string") {
          interaction = envelope;
        } else if (typeof envelope.outputText === "string") {
          interaction = { output_text: envelope.outputText };
        } else if (Array.isArray(envelope.candidates)) {
          interaction = envelope;
        } else if (envelope.choices) {
          // Backward compat: Groq-style envelope -> extract content
          const content = envelope.choices?.[0]?.message?.content;
          if (typeof content === "string") interaction = { output_text: content };
          else interaction = envelope;
        } else {
          interaction = envelope;
        }
      } else {
        console.log(`[processDiscovery] Creating GoogleGenAI client for model ${model}`);
        const client = new GoogleGenAI({ apiKey } as any);
        const ctrl = new AbortController();
        interaction = await withTimeout(createInteraction(client, model, ctrl.signal), timeoutMs, ctrl);
      }

      console.log(`[processDiscovery] API call completed successfully for model ${model}`);

      lastOutputText = getOutputText(interaction);
      console.log(`[processDiscovery] Got output text, length: ${lastOutputText.length}`);
      
      if (logResponses && !fetcher) {
        void logRawResponse(lastOutputText, 200, attempt + 1).catch(()=>{}); // ponytail: fire-and-forget
      }

      if (!lastOutputText || lastOutputText.trim().length === 0) {
        console.log('[processDiscovery] Error: Empty response from API');
        throw new DiscoveryResponseError("Gemini returned an empty discovery response.");
      }

      let result: unknown;
      try {
        result = JSON.parse(lastOutputText);
        console.log('[processDiscovery] Successfully parsed JSON response');
      } catch (parseError) {
        console.log('[processDiscovery] Error: Failed to parse JSON from API response');
        throw new DiscoveryResponseError("Gemini returned discovery content that is not valid JSON.");
      }

      // Validate with zod (ensures schema compliance) then with manual validator for error messages
      try {
        discoveryPatchZodSchema.parse(result);
        console.log('[processDiscovery] Zod validation passed');
      } catch (zErr: any) {
        console.log('[processDiscovery] Error: Zod validation failed', zErr?.message);
        throw new DiscoveryResponseError(
          `Gemini returned invalid patch shape: ${zErr?.message ?? String(zErr)}`,
        );
      }

      validatePatchResult(result);
      console.log('[processDiscovery] Manual validation passed');
      const patchResult = result as DiscoveryPatchResult;
      const merged = applyProfilePatch(input.profile, patchResult.profile_patch);
      if (input.profile?.profile_id) {
        merged.profile_id = input.profile.profile_id;
      }
      const normalized = normalizeProfile(merged as unknown as Record<string, unknown>);
      normalized.profile_id = merged.profile_id;
      
      console.log('[processDiscovery] Successfully completed discovery, returning result:', {
        finished: patchResult.finished,
        hasNextQuestion: !!patchResult.next_question,
        completionReason: patchResult.completion_reason
      });
      
      return {
        finished: patchResult.finished,
        next_question: patchResult.next_question,
        completion_reason: patchResult.completion_reason,
        profile: normalized,
      };
    } catch (error: any) {
      console.log('[processDiscovery] Error occurred:', {
        errorType: error?.constructor?.name,
        errorMessage: error?.message,
        errorStatus: error?.status,
        errorCode: error?.code
      });
      
      const isRateLimited =
        error?.status === 429 ||
        error?.code === 429 ||
        (typeof error?.message === "string" && error.message.includes("429")) ||
        (typeof error?.message === "string" && /rate limit/i.test(error.message)) ||
        (typeof error?.message === "string" && /quota exceeded/i.test(error.message));

      if (isRateLimited && attempt < MAX_RATE_LIMIT_RETRIES) {
        console.log(`[processDiscovery] Rate limited, retrying after delay. Attempt ${attempt + 1}/${MAX_RATE_LIMIT_RETRIES + 1}`);
        const delayMs = rateLimitDelayMs(error?.message ?? "");
        await wait(delayMs);
        continue;
      }

      // ponytail: TPD/RPD fallback to next model in hierarchy (for testing)
      const hasNextModel = modelsToTry.indexOf(model as any) < modelsToTry.length - 1;
      const isInvalidModel =
        error?.status === 400 &&
        typeof error?.message === "string" &&
        /invalid argument|model.*not found|not supported|thinking/i.test(error.message);
      if ((isRateLimited || isInvalidModel) && hasNextModel) {
        console.log(`[processDiscovery] ${isInvalidModel ? "Invalid model/argument" : "Rate limited"} on all retries, trying next model in hierarchy`);
        lastRateLimitError = error;
        const delayMs = rateLimitDelayMs(error?.message ?? "");
        await wait(Math.min(delayMs, 2000));
        break; // try next model
      }

      if (error instanceof DiscoveryApiError || error instanceof DiscoveryResponseError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new DiscoveryApiError(`Gemini request timed out after ${timeoutMs}ms.`, 408);
      }
      const message = error instanceof Error ? error.message : "Unknown Gemini request failure.";
      const status = typeof error?.status === "number" ? error.status : 0;
      if (status === 429 || status >= 400) {
        // if rate limited and has next model, already handled above -> throw only if last model
        throw new DiscoveryApiError(`Gemini request failed: ${message}`, status);
      }
      throw new DiscoveryApiError(`Unable to reach Gemini: ${message}`, 0);
    }
  }
  } // end model loop

  console.log('[processDiscovery] All models failed to return a response');
  if (lastRateLimitError) throw lastRateLimitError;
  throw new DiscoveryApiError("Gemini did not return a response.", 0);
}

