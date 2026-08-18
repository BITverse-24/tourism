export type PreferenceStrength =
  | "must_have"
  | "strong"
  | "nice_to_have"
  | "not_interested"
  | "unknown";

export type InferenceConfidence = "high" | "medium" | "low";

export type QuestionSelectionMode = "single" | "multiple";

export type FreeTextMode =
  | "disabled"
  | "optional"
  | "only_if_no_option"
  | "required";

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
  comfort_preference:
    | "comfort_first"
    | "balanced"
    | "exploration_first"
    | "unknown";
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

export type Fetcher = (
  input: string,
  init?: FetchRequestInit,
) => Promise<FetchResponse>;
