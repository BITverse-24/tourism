export interface TravelerProfile {
    profile_id: string;
    trip_context: TripContext;
    purpose_and_priorities: PurposeAndPriorities;
    preferences: TravelerPreference[];
    travel_style: TravelStyle;
    hard_constraints: HardConstraints;
    unknowns: ProfileUnknown[];
    assumptions: ProfileAssumption[];
}

export interface TripContext {
    destination_request: string;
    resolved_destination?: ResolvedDestination;

    start_date?: string;
    end_date?: string; 
    duration_days?: number;

    date_flexibility?: DateFlexibility;

    party_size: number;
    party_notes?: string;

    budget?: Budget;
}

export interface ResolvedDestination {
    country?: string;
    region?: string;
    city?: string;
    cities?: string[];
    description?: string;
}

export type DateFlexibility =
    | "fixed"
    | "somewhat_flexible"
    | "highly_flexible";

export interface Budget {
    amount: number;
    currency: string;
    type: BudgetType;
}

export type BudgetType =
    | "target"
    | "ceiling"
    | "flexible_estimate";

export interface PurposeAndPriorities {
    primary_purpose: string;
    secondary_purposes?: string[];
    priorities: Priority[];
    success_definition?: string;
}

export interface Priority {
    name: string;
    rank?: number;
    notes?: string;
}

export interface TravelerPreference {
    category: PreferenceCategory | string;
    strength: PreferenceStrength;
    notes?: string;
    source: PreferenceSource;
    confidence?: Confidence;
}

export type PreferenceCategory =
    | "culture"
    | "photography"
    | "food"
    | "nature"
    | "nightlife"
    | "shopping"
    | "history"
    | "relaxation"
    | "local_experiences";

export type PreferenceStrength =
    | "must_have"
    | "strong"
    | "nice_to_have"
    | "not_interested"
    | "unknown";

export type PreferenceSource =
    | "stated"
    | "inferred"
    | "defaulted";

export type Confidence =
    | "high"
    | "medium"
    | "low";

export interface TravelStyle {
    pace: TravelPace;
    energy_pattern?: EnergyPattern;
    walking_tolerance: Tolerance;
    crowd_tolerance: Tolerance;
    comfort_preference?: ComfortPreference;
    spontaneity?: Spontaneity;
}

export type TravelPace =
    | "slow"
    | "balanced"
    | "fast"
    | "unknown";

export type EnergyPattern =
    | "morning"
    | "afternoon"
    | "evening"
    | "consistent"
    | "unknown";

export type Tolerance =
    | "low"
    | "medium"
    | "high"
    | "unknown";

export type ComfortPreference =
    | "comfort_first"
    | "balanced"
    | "exploration_first"
    | "unknown";

export type Spontaneity =
    | "structured"
    | "some_flexibility"
    | "spontaneous"
    | "unknown";

export interface HardConstraints {
    must_visit: string[];
    avoid: string[];
    dietary_requirements: string[];
    accessibility_requirements: string[];
    accommodation_requirements: string[];

    maximum_daily_travel?: TravelLimit;
    maximum_hotel_changes?: number;
    budget_ceiling?: BudgetAmount;
}

export interface TravelLimit {
    amount: number;
    unit: TravelLimitUnit;
    description?: string;
}

export type TravelLimitUnit =
    | "minutes"
    | "hours"
    | "kilometers"
    | "miles";

export interface BudgetAmount {
    amount: number;
    currency: string;
}

export type UnknownImpact =
    | "blocking"
    | "material"
    | "minor";

export interface ProfileUnknown {
    topic: string;
    impact: UnknownImpact;
    description: string;
}

export interface ProfileAssumption {
    topic: string;
    value: string;
    reason: string;
    user_confirmation_needed: boolean;
}
