# Final Trip Plan

**Contract role:** User-facing planning result
**Document revision:** 1.0
**Lifecycle:** Produced from a Traveler Profile after planning decisions have been made.

## Purpose

`Final Trip Plan` is the itinerary the traveler can read, evaluate, and use. It explains what to do, when to do it, how to move between places, what it is expected to cost, and why the plan fits the Traveler Profile.

This is a practical product document, not an internal execution state. It does not expose candidate branches, agent patches, event logs, optimization weights, or simulation internals.

## Shape at a glance

```text
Final Trip Plan
├── Trip summary
├── Destination route
├── City or region allocation
├── Accommodation plan
├── Day-by-day itinerary
├── Cost summary
├── Why this fits the traveler
├── Tradeoffs
├── Assumptions
└── Warnings and unresolved details
```

## Top-level fields

| Field | Required | Meaning |
|---|---|---|
| `plan_title` | Yes | Short human-readable name for the trip. |
| `summary` | Yes | Concise description of the trip’s character and intended experience. |
| `traveler_profile_reference` | Yes | Reference to the Traveler Profile used as the planning basis. |
| `trip_dates` | Yes when known | Start date, end date, or clearly stated flexibility. |
| `destination_route` | Yes | The destination, cities, regions, and order in which they are visited. |
| `city_allocations` | Yes | Nights or days assigned to each city or region. |
| `accommodation` | Optional | Lodging plan or explicit statement that lodging is not yet selected. |
| `days` | Yes | Ordered day-by-day plan. A day may intentionally contain rest or flexible time. |
| `cost_summary` | Yes | Estimated total and major cost categories, with currency and scope. |
| `fit_explanation` | Yes | Why the plan responds to the Traveler Profile’s priorities and constraints. |
| `tradeoffs` | Yes | Material compromises made in constructing the plan. Use an empty list when none are material. |
| `assumptions` | Yes | Planning assumptions that affect interpretation or execution. |
| `warnings` | Yes | Risks, limitations, freshness concerns, or items requiring traveler attention. |
| `unresolved_details` | Yes | Details still to be confirmed. Use an empty list when none remain. |

## Destination route and allocation

| Field | Required | Meaning |
|---|---|---|
| `destination_route[].place` | Yes | City, region, or destination name. |
| `destination_route[].arrival_from` | Optional | Previous place or arrival context. |
| `destination_route[].departure_to` | Optional | Next place or departure context. |
| `destination_route[].order` | Yes | Human-readable visit order starting at one. |
| `city_allocations[].place` | Yes | City or region receiving time. |
| `city_allocations[].nights` | Yes when lodging is relevant | Number of nights planned there. |
| `city_allocations[].days` | Yes | Number or range of itinerary days allocated there. |
| `city_allocations[].reason` | Optional | Why the allocation suits the traveler or route. |

The route must be ordered and must agree with the day-by-day plan. Travel between places is represented explicitly as movement in the relevant day.

## Accommodation

Accommodation is optional because the first planning result may recommend an area or lodging style without selecting a property.

| Field | Required | Meaning |
|---|---|---|
| `place` | Yes | City or area where the lodging applies. |
| `nights` | Yes | Number of nights covered. |
| `recommendation` | Yes | Property, neighborhood, or lodging type recommendation. |
| `reason` | Yes | Why it fits location, comfort, budget, or mobility needs. |
| `estimated_cost` | Optional | Estimated cost and currency. |
| `status` | Yes | `suggested`, `selected_by_traveler`, or `not_yet_decided`. |

The plan must not imply that a room is booked. Booking is outside this contract.

## Day-by-day itinerary

Each day is ordered by date or by clearly numbered trip day when dates are flexible.

| Field | Required | Meaning |
|---|---|---|
| `day` | Yes | Trip day number. |
| `date` | Optional | Calendar date when known. |
| `place` | Yes | Main city or region for the day. |
| `theme` | Optional | Short description of the day’s focus. |
| `items` | Yes | Ordered experiences, meals, rest periods, and movement. |
| `daily_notes` | Optional | Practical advice or flexibility guidance. |

Each itinerary item uses the following fields:

| Field | Required | Meaning |
|---|---|---|
| `type` | Yes | `experience`, `meal`, `rest`, or `movement`. |
| `title` | Yes | Human-readable item name. |
| `start_time` | Optional | Local start time when useful or known. |
| `end_time` | Optional | Local end time when useful or known. |
| `location` | Optional | Place, neighborhood, or meeting point. |
| `description` | Yes | What the traveler should expect to do. |
| `movement` | Optional | How the traveler arrives or continues, including approximate duration when relevant. |
| `estimated_cost` | Optional | Estimated item cost and currency. |
| `reason` | Optional | Profile-based reason for including the item. |
| `flexibility` | Optional | `fixed`, `moveable`, or `optional`. |

Movement must be visible when it affects timing, comfort, budget, or feasibility. Rest is a valid itinerary item, not an empty slot.

## Cost summary

| Field | Required | Meaning |
|---|---|---|
| `currency` | Yes | Currency used for the estimates. |
| `estimated_total` | Yes | Estimated total for the stated scope. |
| `scope` | Yes | What the total includes and excludes, especially flights and lodging. |
| `categories` | Yes | Major categories such as accommodation, transport, food, experiences, and other costs. |
| `budget_position` | Yes | `within_target`, `near_target`, `above_target`, or `budget_unknown`. |
| `caveats` | Yes | Factors that can move the estimate, such as seasonality or unconfirmed prices. |

Every amount must make its scope clear. A plan must not compare a partial trip estimate with a full-trip budget without saying so.

## Explanation and safeguards

### Fit explanation

The explanation should connect major decisions to the profile:

- preference or priority addressed;
- constraint satisfied;
- relevant uncertainty or assumption;
- expected compromise, if any.

### Tradeoffs

Each material tradeoff states what was gained, what was given up, and why the choice was made. For example, fewer hotel changes may increase transit time but improve comfort.

### Warnings and unresolved details

Warnings cover practical risks or limitations. Unresolved details identify decisions the traveler still needs to make. Neither should be hidden in narrative prose.

## Plan invariants

- Every day belongs to the stated trip window or is marked as flexible.
- Items within a day are ordered and must not imply impossible overlaps.
- The destination route and city allocations agree with the daily itinerary.
- Required Traveler Profile constraints are not silently violated.
- Estimated costs use one stated currency or clearly labeled conversions.
- Major recommendations trace to a profile preference, constraint, or explicit assumption.
- The plan does not claim that transport, lodging, tickets, or reservations are booked.
- The plan contains no internal candidate ranking, score weights, agent patch, event, or persistence-lineage fields.

## Human-readable example: Kyoto photography trip

### Summary

**Plan title:** Slow Kyoto: temples, neighborhoods, and sunrise photography

This three-day plan favors strong photography and culture experiences, keeps the pace balanced, avoids tightly packed days, and leaves flexible time for weather or energy changes.

### Route and allocation

| Order | Place | Allocation | Reason |
|---|---|---|---|
| 1 | Kyoto | 3 nights / Days 1–3 | One base reduces hotel changes and supports a lower-stress pace. |

### Day 1 — Fushimi and southern Kyoto

| Time | Type | Item | Location | Movement / notes |
|---|---|---|---|---|
| Early morning | Experience | Sunrise photography at Fushimi Inari | Fushimi | Early start is an explicit profile-based assumption. |
| Late morning | Rest | Breakfast and recovery | Near lodging | Keeps the afternoon workload moderate. |
| Afternoon | Experience | Traditional neighborhood walk | Southern Kyoto | Move at a flexible pace; avoid adding another major attraction. |
| Evening | Meal | Local dinner | Near lodging | Optional if energy is low. |

### Cost summary

| Category | Estimate |
|---|---:|
| Accommodation | INR 36,000 |
| Local transport | INR 6,000 |
| Food | INR 18,000 |
| Experiences | INR 3,000 |
| **Estimated total** | **INR 63,000** |

**Scope:** Kyoto stay and local activities only; international flights are excluded.

### Fit, tradeoffs, and warnings

- The plan prioritizes photography and culture while keeping one main experience block per part of the day.
- A single lodging base improves comfort and reduces hotel changes, at the cost of some additional local transit.
- The INR 85,000 profile budget may include flights; this remains unresolved and materially affects feasibility.
- Opening hours, weather, and exact prices should be confirmed before execution.
