import assert from "node:assert/strict";
import test from "node:test";
import { processDiscovery, DiscoveryApiError, DiscoveryResponseError } from "../src/index.js";
import type { DiscoveryInput, FetchResponse } from "../src/types.js";

const emptyProfile = {
  profile_id: "mock-profile",
  trip_context: {
    destination_request: null,
    resolved_destination: null,
    start_date: null,
    end_date: null,
    duration_days: null,
    date_flexibility: "unknown" as const,
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
    pace: "unknown" as const,
    energy_pattern: "unknown" as const,
    walking_tolerance: "unknown" as const,
    crowd_tolerance: "unknown" as const,
    comfort_preference: "unknown" as const,
    spontaneity: "unknown" as const,
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

const nextQuestion = {
  question_id: "q_destination",
  prompt: "Where would you like to travel?",
  selection_mode: "single" as const,
  required: true,
  options: [],
  free_text_mode: "required" as const,
  free_text_placeholder: "Tell us a city, country, or region",
};

function responseWith(result: unknown, status = 200): FetchResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(result) } }] }),
  };
}

function requestRecorder(result: unknown) {
  const requests: Array<{
    input: string;
    init: { body?: string; headers?: Record<string, string> } | undefined;
  }> = [];
  const fetcher = async (input: string, init?: { body?: string; headers?: Record<string, string> }) => {
    requests.push({ input, init });
    return responseWith(result);
  };
  return { fetcher, requests };
}

test("uses one Groq request to create the first question from a null profile", async () => {
  const { fetcher, requests } = requestRecorder({
    profile: emptyProfile,
    finished: false,
    next_question: nextQuestion,
    completion_reason: null,
  });

  const result = await processDiscovery(
    { profile: null, answer: null },
    { api_key: "test-key", fetcher },
  );

  assert.equal(requests.length, 1);
  assert.equal(result.finished, false);
  assert.equal(result.next_question?.question_id, "q_destination");
  const body = JSON.parse(requests[0]?.init?.body ?? "{}");
  const userMessage = JSON.parse(body.messages[1].content);
  assert.equal(userMessage.profile, null);
  assert.equal(userMessage.answer, null);
  assert.equal(body.reasoning_effort, "medium");
  assert.equal(requests[0]?.init?.headers?.Authorization, "Bearer test-key");
});

test("sends the current profile and answer in one request and returns completion", async () => {
  const finishedProfile = {
    ...emptyProfile,
    trip_context: {
      ...emptyProfile.trip_context,
      destination_request: "Kyoto",
      duration_days: 4,
      party_size: 2,
      budget: { amount: 85000, currency: "INR", scope: "local trip", type: "target" as const },
    },
    purpose_and_priorities: {
      ...emptyProfile.purpose_and_priorities,
      primary_purpose: "culture and photography",
    },
  };
  const { fetcher, requests } = requestRecorder({
    profile: finishedProfile,
    finished: true,
    next_question: null,
    completion_reason: "The destination, duration, party, budget, and purpose are clear enough to plan.",
  });
  const input: DiscoveryInput = {
    profile: emptyProfile,
    answer: {
      question: nextQuestion,
      question_id: nextQuestion.question_id,
      selected_option_ids: [],
      free_text: "Kyoto for four days, for two people, around INR 85,000. We love culture and photography.",
    },
  };

  const result = await processDiscovery(input, { api_key: "test-key", fetcher });

  assert.equal(requests.length, 1);
  assert.equal(result.finished, true);
  assert.equal(result.next_question, null);
  const body = JSON.parse(requests[0]?.init?.body ?? "{}");
  const userMessage = JSON.parse(body.messages[1].content);
  assert.equal(userMessage.profile.trip_context.destination_request, null);
  assert.equal(userMessage.answer.question_id, "q_destination");
  assert.match(userMessage.answer.free_text, /Kyoto/);
});

test("normalizes sparse and aliased AI profile fields before returning them", async () => {
  const { fetcher } = requestRecorder({
    profile: {
      profile_id: "mock-profile",
      trip_context: {
        destination: "Kyoto",
        dates_or_duration: "4 days",
        party_size: "2",
        budget: "INR 85000 for local travel",
      },
      purpose_and_priorities: {
        trip_purpose: "culture and photography",
      },
    },
    finished: true,
    next_question: null,
    completion_reason: "Enough information is available to begin planning.",
  });

  const result = await processDiscovery(
    { profile: null, answer: null },
    { api_key: "test-key", fetcher },
  );

  assert.equal(result.profile.trip_context.destination_request, "Kyoto");
  assert.equal(result.profile.trip_context.duration_days, 4);
  assert.equal(result.profile.trip_context.party_size, 2);
  assert.equal(result.profile.trip_context.budget?.amount, 85000);
  assert.equal(result.profile.trip_context.budget?.currency, "INR");
  assert.equal(result.profile.purpose_and_priorities.primary_purpose, "culture and photography");
  assert.equal(result.profile.travel_style.pace, "unknown");
  assert.deepEqual(result.profile.hard_constraints.must_visit, []);
});

test("does not promote a target budget into a hard budget ceiling", async () => {
  const { fetcher } = requestRecorder({
    profile: {
      profile_id: "mock-profile",
      trip_context: {
        destination_request: "Kyoto",
        budget: { amount: 85000, currency: "INR", scope: "local trip", type: "target" },
      },
      hard_constraints: {
        budget_ceiling: { amount: 85000, currency: "INR", type: "target" },
      },
    },
    finished: true,
    next_question: null,
    completion_reason: "Enough information is available to begin planning.",
  });

  const result = await processDiscovery(
    { profile: null, answer: null },
    { api_key: "test-key", fetcher },
  );

  assert.equal(result.profile.trip_context.budget?.type, "target");
  assert.equal(result.profile.hard_constraints.budget_ceiling, null);
});

test("rejects a response that has no next question while unfinished", async () => {
  const { fetcher } = requestRecorder({
    profile: emptyProfile,
    finished: false,
    next_question: null,
    completion_reason: null,
  });

  await assert.rejects(
    processDiscovery({ profile: null, answer: null }, { api_key: "test-key", fetcher }),
    DiscoveryResponseError,
  );
});

test("reports Groq API failures without exposing the API key", async () => {
  const fetcher = async (): Promise<FetchResponse> => ({
    ok: false,
    status: 401,
    text: async () => "invalid api key",
  });

  await assert.rejects(
    processDiscovery({ profile: null, answer: null }, { api_key: "secret-key", fetcher }),
    (error: unknown) => {
      assert.ok(error instanceof DiscoveryApiError);
      assert.match((error as Error).message, /401/);
      assert.doesNotMatch((error as Error).message, /secret-key/);
      return true;
    },
  );
});
