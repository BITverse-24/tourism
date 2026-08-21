import { z } from "zod";
// import { TravelerProfileSchema } from "./TravelerProfile";


/* -------------------------------------------------------------------------- */
/*                                    Enums                                   */
/* -------------------------------------------------------------------------- */

export const AccommodationStatusSchema = z.enum([
  "suggested",
  "selected_by_traveler",
  "not_yet_decided",
]);

export const ItineraryItemTypeSchema = z.enum([
  "experience",
  "meal",
  "rest",
  "movement",
]);

export const ItemFlexibilitySchema = z.enum([
  "fixed",
  "moveable",
  "optional",
]);

export const BudgetPositionSchema = z.enum([
  "within_target",
  "near_target",
  "above_target",
  "budget_unknown",
]);

/* -------------------------------------------------------------------------- */
/*                               Shared Schemas                               */
/* -------------------------------------------------------------------------- */

export const EstimatedCostSchema = z.object({
  amount: z.number().nullable(),
  currency: z.string().nullable(),
});

export const MovementSchema = z.object({
  mode: z.string().nullable(),
  duration_minutes: z.number().nullable(),
  from: z.string().nullable(),
  to: z.string().nullable(),
});

/* -------------------------------------------------------------------------- */
/*                            Traveler Profile Reference                      */
/* -------------------------------------------------------------------------- */

export const TravelerProfileReferenceSchema = z.object({
  profile_id: z.string(),
  profile_revision: z.number(),
});

/* -------------------------------------------------------------------------- */
/*                                 Trip Dates                                 */
/* -------------------------------------------------------------------------- */

export const TripDatesSchema = z.object({
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  duration_days: z.number().nullable(),
  flexibility: z.string().nullable(),
});

/* -------------------------------------------------------------------------- */
/*                             Destination Route                              */
/* -------------------------------------------------------------------------- */

export const DestinationRouteItemSchema = z.object({
  place: z.string(),
  city_id: z.string(),
  order: z.number(),
  arrival_from: z.string().nullable(),
  departure_to: z.string().nullable(),
});

/* -------------------------------------------------------------------------- */
/*                              City Allocations                              */
/* -------------------------------------------------------------------------- */

export const CityAllocationSchema = z.object({
  place: z.string(),
  city_id: z.string(),
  nights: z.number().nullable(),
  days: z.number(),
  reason: z.string().nullable(),
});

/* -------------------------------------------------------------------------- */
/*                                Accommodation                               */
/* -------------------------------------------------------------------------- */

export const AccommodationSchema = z.object({
  place: z.string(),
  nights: z.number(),
  recommendation: z.string(),
  reason: z.string(),
  estimated_cost: EstimatedCostSchema.nullable(),
  status: AccommodationStatusSchema,
});

/* -------------------------------------------------------------------------- */
/*                              Itinerary Items                               */
/* -------------------------------------------------------------------------- */

export const ItineraryItemSchema = z.object({
  type: ItineraryItemTypeSchema,
  title: z.string(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  location: z.string().nullable(),
  description: z.string(),
  movement: MovementSchema.nullable(),
  estimated_cost: EstimatedCostSchema.nullable(),
  reason: z.string().nullable(),
  flexibility: ItemFlexibilitySchema.nullable(),
});

/* -------------------------------------------------------------------------- */
/*                                 Trip Days                                  */
/* -------------------------------------------------------------------------- */

export const TripDaySchema = z.object({
  day: z.number(),
  date: z.string().nullable(),
  place: z.string(),
  city_id: z.string(),
  theme: z.string().nullable(),
  items: z.array(ItineraryItemSchema),
  daily_notes: z.string().nullable(),
});

/* -------------------------------------------------------------------------- */
/*                               Cost Summary                                 */
/* -------------------------------------------------------------------------- */

export const CostCategorySchema = z.object({
  name: z.string(),
  estimated_cost: z.number(),
});

export const CostSummarySchema = z.object({
  currency: z.string(),
  estimated_total: z.number().nullable(),
  scope: z.string(),
  categories: z.array(CostCategorySchema),
  budget_position: BudgetPositionSchema,
  caveats: z.array(z.string()),
});

/* -------------------------------------------------------------------------- */
/*                               Final Trip Plan                              */
/* -------------------------------------------------------------------------- */

export const FinalTripPlanSchema = z.object({
  plan_title: z.string(),
  summary: z.string(),

  traveler_profile_reference: TravelerProfileReferenceSchema,

  trip_dates: TripDatesSchema,

  destination_route: z.array(DestinationRouteItemSchema),

  city_allocations: z.array(CityAllocationSchema),

  accommodation: z.array(AccommodationSchema),

  days: z.array(TripDaySchema),

  cost_summary: CostSummarySchema,

  fit_explanation: z.string(),
  tradeoffs: z.array(z.string()),
  assumptions: z.array(z.string()),
  warnings: z.array(z.string()),
  unresolved_details: z.array(z.string()),
});

/* -------------------------------------------------------------------------- */
/*                               Inferred Types                               */
/* -------------------------------------------------------------------------- */

// Enums
export type AccommodationStatus = z.infer<
  typeof AccommodationStatusSchema
>;

export type ItineraryItemType = z.infer<
  typeof ItineraryItemTypeSchema
>;

export type ItemFlexibility = z.infer<
  typeof ItemFlexibilitySchema
>;

export type BudgetPosition = z.infer<
  typeof BudgetPositionSchema
>;

// Shared objects
export type EstimatedCost = z.infer<typeof EstimatedCostSchema>;

export type Movement = z.infer<typeof MovementSchema>;

// Trip-level objects
export type TravelerProfileReference = z.infer<
  typeof TravelerProfileReferenceSchema
>;

export type TripDates = z.infer<typeof TripDatesSchema>;

export type DestinationRouteItem = z.infer<
  typeof DestinationRouteItemSchema
>;

export type CityAllocation = z.infer<
  typeof CityAllocationSchema
>;

export type Accommodation = z.infer<
  typeof AccommodationSchema
>;

export type ItineraryItem = z.infer<
  typeof ItineraryItemSchema
>;

export type TripDay = z.infer<typeof TripDaySchema>;

export type CostCategory = z.infer<
  typeof CostCategorySchema
>;

export type CostSummary = z.infer<
  typeof CostSummarySchema
>;

// Root schema
export type FinalTripPlan = z.infer<
  typeof FinalTripPlanSchema
>;
