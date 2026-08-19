import { TravelerProfile } from "./TravelerProfile";

export interface FinalTripPlan {
  plan_title: string;
  summary: string;
  traveler_profile_reference: TravelerProfile;
  trip_dates?: TripDates;
  destination_route: DestinationRouteItem[];
  city_allocations: CityAllocation[];
  accommodation?: AccommodationPlan[];
  days: ItineraryDay[];
  cost_summary: CostSummary;
  fit_explanation: FitExplanationItem[];
  tradeoffs: Tradeoff[];
  assumptions: string[];
  warnings: Warning[];
  unresolved_details: UnresolvedDetail[];
}

export interface TravelerProfileReference {
  id: string;
  version?: string;
}

export interface TripDates {
  start_date?: string; // ISO 8601: YYYY-MM-DD
  end_date?: string;   // ISO 8601: YYYY-MM-DD
  flexibility?: string;
}

export interface DestinationRouteItem {
  place: string;
  arrival_from?: string;
  departure_to?: string;
  order: number;
}

export interface CityAllocation {
  place: string;
  nights?: number;
  days: number | string;
  reason?: string;
}

export type AccommodationStatus =
  | "suggested"
  | "selected_by_traveler"
  | "not_yet_decided";

export interface AccommodationPlan {
  place: string;
  nights: number;
  recommendation: string;
  reason: string;
  estimated_cost?: MoneyAmount;
  status: AccommodationStatus;
}

export interface ItineraryDay {
  day: number;
  date?: string; // ISO 8601: YYYY-MM-DD
  place: string;
  theme?: string;
  items: ItineraryItem[];
  daily_notes?: string;
}

export type ItineraryItemType =
  | "experience"
  | "meal"
  | "rest"
  | "movement";

export type ItineraryFlexibility =
  | "fixed"
  | "moveable"
  | "optional";

export interface ItineraryItem {
  type: ItineraryItemType;
  title: string;
  start_time?: string; // Local time, e.g. "06:30"
  end_time?: string;   // Local time, e.g. "08:00"
  location?: string;
  description: string;
  movement?: MovementDetails;
  estimated_cost?: MoneyAmount;
  reason?: string;
  flexibility?: ItineraryFlexibility;
}

export interface MovementDetails {
  mode?: string;
  description: string;
  duration_minutes?: number;
}

export interface CostSummary {
  currency: string;
  estimated_total: number;
  scope: string;
  categories: CostCategory[];
  budget_position: BudgetPosition;
  caveats: string[];
}

export interface CostCategory {
  category: string;
  estimated_cost: number;
  scope?: string;
}

export type BudgetPosition =
  | "within_target"
  | "near_target"
  | "above_target"
  | "budget_unknown";

export interface MoneyAmount {
  amount: number;
  currency: string;
  scope?: string;
}

export interface FitExplanationItem {
  preference_or_priority?: string;
  constraint_satisfied?: string;
  explanation: string;
  uncertainty_or_assumption?: string;
  expected_compromise?: string;
}

export interface Tradeoff {
  gained: string;
  given_up: string;
  reason: string;
}

export interface Warning {
  message: string;
  severity?: "low" | "medium" | "high";
}

export interface UnresolvedDetail {
  detail: string;
  impact?: string;
}

// import { TravelerProfile } from "./TravelerProfile";

// export interface FinalTripPlan {
//     plan_title: string;
//     summary: string;
//     traveler_profile_preference: TravelerProfile;
//     trip_dates: [string];
//     destination_route: [DestinationRouteItem];
//     city_allocations: [City];
//     accomadation?: Accommodation;
//     days: DayPlan[];
//     cost_summary: CostSummary;
//     fit_explanation: string;
//     tradeoffs: string,
//     assumptions:
//     warnings:
//     unresolved_details:
// }

// interface DayPlan {
// }

// interface DestinationRouteItem {
//     place: string;
//     arrival_from?: string;
//     departure_to?: string;
//     order: number;
// }

// interface City {
//     place: string;
//     nights: number;
//     days: number;
//     reason?: string;
// }

// interface Accommodation {
//     place: string;
//     nights: number;
//     recommendation: string;
//     reason: string;
//     estimated_cost?: Cost;
//     status: AccomodationStatus;
// }

// type AccomodationStatus = "suggested" | "selected_by_traveler" | "not_yet_decided";

// export interface Cost {
//     amount: number;
//     currency: string;
// }
