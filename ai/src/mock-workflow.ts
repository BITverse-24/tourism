import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { mockDiscoveryState } from "./mock-state.js";
import { processDiscovery } from "./process-discovery.js";
import type {
  DiscoveryQuestion,
  FetchResponse,
  Fetcher,
  TravelerProfile,
  UserAnswer,
} from "./types.js";

const EMPTY_PROFILE: TravelerProfile = {
  profile_id: "mock-profile",
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

function question(
  question_id: string,
  prompt: string,
  options: DiscoveryQuestion["options"] = [],
  free_text_mode: DiscoveryQuestion["free_text_mode"] = "optional",
): DiscoveryQuestion {
  return {
    question_id,
    prompt,
    selection_mode: options.length > 0 ? "single" : "single",
    required: true,
    options,
    free_text_mode,
    free_text_placeholder: "Type your answer",
  };
}

function option(option_id: string, label: string, description: string) {
  return { option_id, label, description };
}

const OFFLINE_RESPONSES = [
  {
    profile: EMPTY_PROFILE,
    finished: false,
    next_question: question("q_destination", "Where would you like to travel?", [], "required"),
    completion_reason: null,
  },
  {
    profile: {
      ...EMPTY_PROFILE,
      trip_context: { ...EMPTY_PROFILE.trip_context, destination_request: "Kyoto" },
    },
    finished: false,
    next_question: question("q_duration", "How long would you like the trip to be?", [], "required"),
    completion_reason: null,
  },
  {
    profile: {
      ...EMPTY_PROFILE,
      trip_context: {
        ...EMPTY_PROFILE.trip_context,
        destination_request: "Kyoto",
        duration_days: 4,
        party_size: 2,
        budget: { amount: 85000, currency: "INR", scope: "local trip", type: "target" },
      },
    },
    finished: false,
    next_question: question(
      "q_purpose",
      "What matters most on this trip?",
      [
        option("culture", "Culture", "Temples, history, neighborhoods, and local traditions."),
        option("photography", "Photography", "Memorable scenes, light, and places worth photographing."),
        option("food", "Food", "Local restaurants, markets, and memorable meals."),
      ],
      "optional",
    ),
    completion_reason: null,
  },
  {
    profile: {
      ...EMPTY_PROFILE,
      trip_context: {
        ...EMPTY_PROFILE.trip_context,
        destination_request: "Kyoto",
        duration_days: 4,
        party_size: 2,
        budget: { amount: 85000, currency: "INR", scope: "local trip", type: "target" },
      },
      purpose_and_priorities: {
        ...EMPTY_PROFILE.purpose_and_priorities,
        primary_purpose: "culture and photography",
      },
    },
    finished: false,
    next_question: question(
      "q_pace",
      "What pace would feel best?",
      [
        option("slow", "Slow and spacious", "Fewer major activities with generous recovery time."),
        option("balanced", "Balanced", "A mix of planned experiences and flexible time."),
        option("fast", "Full and energetic", "More coverage with less unplanned time."),
      ],
      "disabled",
    ),
    completion_reason: null,
  },
  {
    profile: {
      ...EMPTY_PROFILE,
      trip_context: {
        ...EMPTY_PROFILE.trip_context,
        destination_request: "Kyoto",
        duration_days: 4,
        party_size: 2,
        budget: { amount: 85000, currency: "INR", scope: "local trip", type: "target" },
      },
      purpose_and_priorities: {
        ...EMPTY_PROFILE.purpose_and_priorities,
        primary_purpose: "culture and photography",
      },
      travel_style: {
        ...EMPTY_PROFILE.travel_style,
        pace: "balanced",
      },
    },
    finished: true,
    next_question: null,
    completion_reason: "The destination, duration, party, budget, purpose, and pace are enough for a planning handoff.",
  },
] as const;

function offlineFetcherFactory(): Fetcher {
  let responseIndex = 0;

  return async (): Promise<FetchResponse> => {
    const response = OFFLINE_RESPONSES[Math.min(responseIndex, OFFLINE_RESPONSES.length - 1)];
    responseIndex += 1;

    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(response) } }],
        }),
    };
  };
}

function syncMockState(profile: TravelerProfile, nextQuestion: DiscoveryQuestion | null): void {
  mockDiscoveryState.profile = profile;
  mockDiscoveryState.current_question = nextQuestion;
}

function parseAnswer(currentQuestion: DiscoveryQuestion, rawInput: string): UserAnswer {
  const trimmed = rawInput.trim();
  const selectedOptionIds: string[] = [];

  if (currentQuestion.options.length > 0) {
    const indexes = trimmed
      .split(",")
      .map((part) => Number(part.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);
    const allowedIndexes = currentQuestion.selection_mode === "single" ? indexes.slice(0, 1) : indexes;

    for (const index of allowedIndexes) {
      const selectedOption = currentQuestion.options[index - 1];
      if (selectedOption && !selectedOptionIds.includes(selectedOption.option_id)) {
        selectedOptionIds.push(selectedOption.option_id);
      }
    }
  }

  const usedOptionInput = selectedOptionIds.length > 0;
  return {
    question_id: currentQuestion.question_id,
    question: currentQuestion,
    selected_option_ids: selectedOptionIds,
    free_text: usedOptionInput ? null : trimmed || null,
  };
}

function printQuestion(currentQuestion: DiscoveryQuestion): void {
  console.log(`\n${currentQuestion.prompt}`);
  currentQuestion.options.forEach((currentOption, index) => {
    console.log(`  ${index + 1}. ${currentOption.label} — ${currentOption.description}`);
  });
  if (currentQuestion.options.length > 0) {
    console.log("  Type a number, comma-separated numbers, or your own answer.");
  }
  console.log("  Commands: :profile, :quit");
}

async function runWorkflow(offline: boolean): Promise<void> {
  const readline = createInterface({ input, output });
  const fetcher = offline ? offlineFetcherFactory() : undefined;

  mockDiscoveryState.profile = null;
  mockDiscoveryState.current_question = null;

  console.log(offline ? "Voyager mock workflow — offline mode" : "Voyager mock workflow — Groq mode");
  console.log("Profile state is stored only in memory. Nothing is sent to a backend.");

  try {
    let result = await processDiscovery(
      { profile: mockDiscoveryState.profile, answer: null },
      fetcher ? { fetcher, api_key: "offline-key" } : {},
    );
    syncMockState(result.profile, result.next_question);

    while (!result.finished && mockDiscoveryState.current_question) {
      printQuestion(mockDiscoveryState.current_question);
      const rawInput = await readline.question("\nYou: ");

      if (rawInput.trim() === ":quit") {
        console.log("\nStopped. The mock profile was kept only for this process.");
        return;
      }

      if (rawInput.trim() === ":profile") {
        console.log(JSON.stringify(mockDiscoveryState.profile, null, 2));
        continue;
      }

      result = await processDiscovery(
        {
          profile: mockDiscoveryState.profile,
          answer: parseAnswer(mockDiscoveryState.current_question, rawInput),
        },
        fetcher ? { fetcher, api_key: "offline-key" } : {},
      );
      syncMockState(result.profile, result.next_question);
    }

    console.log("\nDiscovery complete.");
    console.log(JSON.stringify(mockDiscoveryState.profile, null, 2));
  } finally {
    readline.close();
  }
}

async function runOfflineDemo(): Promise<void> {
  const fetcher = offlineFetcherFactory();
  mockDiscoveryState.profile = null;
  mockDiscoveryState.current_question = null;

  console.log("Voyager mock workflow — offline demo");
  console.log("This uses canned AI responses and keeps the profile in memory.\n");

  let currentProfile: TravelerProfile | null = null;
  let currentQuestion: DiscoveryQuestion | null = null;
  let result = await processDiscovery(
    { profile: currentProfile, answer: null },
    { fetcher, api_key: "offline-key" },
  );
  currentProfile = result.profile;
  currentQuestion = result.next_question;
  syncMockState(result.profile, result.next_question);

  const demoAnswers = ["Kyoto", "4 days", "1", "2"];
  for (const rawAnswer of demoAnswers) {
    if (result.finished || currentQuestion === null) {
      break;
    }

    console.log(`Question: ${currentQuestion.prompt}`);
    console.log(`Answer: ${rawAnswer}`);
    result = await processDiscovery(
      {
        profile: currentProfile,
        answer: parseAnswer(currentQuestion, rawAnswer),
      },
      { fetcher, api_key: "offline-key" },
    );
    currentProfile = result.profile;
    currentQuestion = result.next_question;
    syncMockState(result.profile, result.next_question);
  }

  console.log(`\nFinished: ${result.finished}`);
  console.log(JSON.stringify(mockDiscoveryState.profile, null, 2));
}

const offline = process.argv.includes("--offline");
const demo = process.argv.includes("--demo");
const workflow = offline && demo ? runOfflineDemo() : runWorkflow(offline);

workflow.catch((error: unknown) => {
  console.error("\nMock workflow failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
