import { z } from "zod";

export const PreferenceStrengthSchema = z.enum([
  "must_have",
  "strong",
  "nice_to_have",
  "not_interested",
  "unknown",
]);

export const InferenceConfidenceSchema = z.enum([
  "high",
  "medium",
  "low",
]);

export const QuestionSelectionModeSchema = z.enum([
  "single",
  "multiple",
]);

export const FreeTextModeSchema = z.enum([
  "disabled",
  "optional",
  "only_if_no_option",
  "required",
]);

export const BudgetSchema = z.object({
  amount: z.number().nullable(),
  currency: z.string().nullable(),
  scope: z.string().nullable(),
  type: z.enum(["target", "ceiling", "flexible", "unknown"]),
});

export const TripContextSchema = z.object({
  destination_request: z.string().nullable(),
  resolved_destination: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  duration_days: z.number().nullable(),
  date_flexibility: z.enum([
    "fixed",
    "somewhat_flexible",
    "highly_flexible",
    "unknown",
  ]),
  party_size: z.number().nullable(),
  party_notes: z.string().nullable(),
  budget: BudgetSchema.nullable(),
});

export const PurposeAndPrioritiesSchema = z.object({
  primary_purpose: z.string().nullable(),
  secondary_purposes: z.array(z.string()),
  priorities: z.array(z.string()),
  success_definition: z.string().nullable(),
});

export const PreferenceSchema = z.object({
  category: z.string(),
  strength: PreferenceStrengthSchema,
  notes: z.string().nullable(),
  source: z.enum(["stated", "inferred", "defaulted"]),
  confidence: InferenceConfidenceSchema.nullable(),
});

export const TravelStyleSchema = z.object({
  pace: z.enum(["slow", "balanced", "fast", "unknown"]),
  energy_pattern: z.enum([
    "morning",
    "afternoon",
    "evening",
    "consistent",
    "unknown",
  ]),
  walking_tolerance: z.enum(["low", "medium", "high", "unknown"]),
  crowd_tolerance: z.enum(["low", "medium", "high", "unknown"]),
  comfort_preference: z.enum([
    "comfort_first",
    "balanced",
    "exploration_first",
    "unknown",
  ]),
  spontaneity: z.enum([
    "structured",
    "some_flexibility",
    "spontaneous",
    "unknown",
  ]),
});

export const HardConstraintsSchema = z.object({
  must_visit: z.array(z.string()),
  avoid: z.array(z.string()),
  dietary_requirements: z.array(z.string()),
  accessibility_requirements: z.array(z.string()),
  accommodation_requirements: z.array(z.string()),
  maximum_daily_travel: z.string().nullable(),
  maximum_hotel_changes: z.number().nullable(),
  budget_ceiling: BudgetSchema.nullable(),
});

export const ProfileUnknownSchema = z.object({
  topic: z.string(),
  impact: z.enum(["blocking", "material", "minor"]),
  description: z.string(),
});

export const ProfileAssumptionSchema = z.object({
  topic: z.string(),
  value: z.string(),
  reason: z.string(),
  user_confirmation_needed: z.boolean(),
});

export const TravelerProfileSchema = z.object({
  profile_id: z.string(),
  trip_context: TripContextSchema,
  purpose_and_priorities: PurposeAndPrioritiesSchema,
  preferences: z.array(PreferenceSchema),
  travel_style: TravelStyleSchema,
  hard_constraints: HardConstraintsSchema,
  unknowns: z.array(ProfileUnknownSchema),
  assumptions: z.array(ProfileAssumptionSchema),
});

// Inferred types
export type PreferenceStrength = z.infer<typeof PreferenceStrengthSchema>;
export type InferenceConfidence = z.infer<typeof InferenceConfidenceSchema>;
export type QuestionSelectionMode = z.infer<
  typeof QuestionSelectionModeSchema
>;
export type FreeTextMode = z.infer<typeof FreeTextModeSchema>;

export type Budget = z.infer<typeof BudgetSchema>;
export type TripContext = z.infer<typeof TripContextSchema>;
export type PurposeAndPriorities = z.infer<
  typeof PurposeAndPrioritiesSchema
>;
export type Preference = z.infer<typeof PreferenceSchema>;
export type TravelStyle = z.infer<typeof TravelStyleSchema>;
export type HardConstraints = z.infer<typeof HardConstraintsSchema>;
export type ProfileUnknown = z.infer<typeof ProfileUnknownSchema>;
export type ProfileAssumption = z.infer<typeof ProfileAssumptionSchema>;

export type TravelerProfile = z.infer<typeof TravelerProfileSchema>;


////////////////////////////////////////////////////////// OLD
// // export interface TravelerProfile {
//     profile_id: string;
//     trip_context: TripContext;
//     purpose_and_priorities: PurposeAndPriorities;
//     preferences: TravelerPreference[];
//     travel_style: TravelStyle;
//     hard_constraints: HardConstraints;
//     unknowns: ProfileUnknown[];
//     assumptions: ProfileAssumption[];
// }

// export interface TripContext {
//     destination_request: string;
//     resolved_destination?: ResolvedDestination;

//     start_date?: string;
//     end_date?: string; 
//     duration_days?: number;

//     date_flexibility?: DateFlexibility;

//     party_size: number;
//     party_notes?: string;

//     budget?: Budget;
// }

// export interface ResolvedDestination {
//     country?: string;
//     region?: string;
//     city?: string;
//     cities?: string[];
//     description?: string;
// }

// export type DateFlexibility =
//     | "fixed"
//     | "somewhat_flexible"
//     | "highly_flexible";

// export interface Budget {
//     amount: number;
//     currency: string;
//     type: BudgetType;
// }

// export type BudgetType =
//     | "target"
//     | "ceiling"
//     | "flexible_estimate";

// export interface PurposeAndPriorities {
//     primary_purpose: string;
//     secondary_purposes?: string[];
//     priorities: Priority[];
//     success_definition?: string;
// }

// export interface Priority {
//     name: string;
//     rank?: number;
//     notes?: string;
// }

// export interface TravelerPreference {
//     category: PreferenceCategory | string;
//     strength: PreferenceStrength;
//     notes?: string;
//     source: PreferenceSource;
//     confidence?: Confidence;
// }

// export type PreferenceCategory =
//     | "culture"
//     | "photography"
//     | "food"
//     | "nature"
//     | "nightlife"
//     | "shopping"
//     | "history"
//     | "relaxation"
//     | "local_experiences";

// export type PreferenceStrength =
//     | "must_have"
//     | "strong"
//     | "nice_to_have"
//     | "not_interested"
//     | "unknown";

// export type PreferenceSource =
//     | "stated"
//     | "inferred"
//     | "defaulted";

// export type Confidence =
//     | "high"
//     | "medium"
//     | "low";

// export interface TravelStyle {
//     pace: TravelPace;
//     energy_pattern?: EnergyPattern;
//     walking_tolerance: Tolerance;
//     crowd_tolerance: Tolerance;
//     comfort_preference?: ComfortPreference;
//     spontaneity?: Spontaneity;
// }

// export type TravelPace =
//     | "slow"
//     | "balanced"
//     | "fast"
//     | "unknown";

// export type EnergyPattern =
//     | "morning"
//     | "afternoon"
//     | "evening"
//     | "consistent"
//     | "unknown";

// export type Tolerance =
//     | "low"
//     | "medium"
//     | "high"
//     | "unknown";

// export type ComfortPreference =
//     | "comfort_first"
//     | "balanced"
//     | "exploration_first"
//     | "unknown";

// export type Spontaneity =
//     | "structured"
//     | "some_flexibility"
//     | "spontaneous"
//     | "unknown";

// export interface HardConstraints {
//     must_visit: string[];
//     avoid: string[];
//     dietary_requirements: string[];
//     accessibility_requirements: string[];
//     accommodation_requirements: string[];

//     maximum_daily_travel?: TravelLimit;
//     maximum_hotel_changes?: number;
//     budget_ceiling?: BudgetAmount;
// }

// export interface TravelLimit {
//     amount: number;
//     unit: TravelLimitUnit;
//     description?: string;
// }

// export type TravelLimitUnit =
//     | "minutes"
//     | "hours"
//     | "kilometers"
//     | "miles";

// export interface BudgetAmount {
//     amount: number;
//     currency: string;
// }

// export type UnknownImpact =
//     | "blocking"
//     | "material"
//     | "minor";

// export interface ProfileUnknown {
//     topic: string;
//     impact: UnknownImpact;
//     description: string;
// }

// export interface ProfileAssumption {
//     topic: string;
//     value: string;
//     reason: string;
//     user_confirmation_needed: boolean;
// }
