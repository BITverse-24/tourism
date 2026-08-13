# Traveler Profile

**Contract role:** Core planning input
**Document revision:** 1.0
**Lifecycle:** Created and updated during discovery; considered ready when the available answers have been normalized and remaining unknowns are explicit.

## Purpose

`Traveler Profile` is the complete, normalized result after the adaptive questions are over. It combines the trip the traveler wants to take with the way they want to experience it.

It is not a transcript of questions and answers. It contains the decisions, preferences, constraints, assumptions, and uncertainties that the planning process needs.

The profile may be incomplete. Incomplete means that a value is explicitly unknown or unresolved, not that the system is free to invent one.

## Shape at a glance

```text
Traveler Profile
├── Identity and trip context
├── Purpose and priorities
├── Preferences and travel style
├── Hard constraints
├── Unknowns
└── Assumptions and inferred preferences
```

## Top-level fields

| Field | Required | Meaning |
|---|---|---|
| `profile_id` | Yes | Stable identifier for this profile within the planning experience. This is an identity, not a version or snapshot number. |
| `trip_context` | Yes | Destination request, dates or duration, party, and budget information. |
| `purpose_and_priorities` | Yes | Why the traveler is taking the trip and what matters most. |
| `preferences` | Yes | Normalized experience preferences and their strength. An empty preference set is valid when the traveler has not expressed one. |
| `travel_style` | Yes | Pace, energy, walking, crowd, comfort, and spontaneity preferences. |
| `hard_constraints` | Yes | Requirements that the plan must not silently violate. |
| `unknowns` | Yes | Important information that remains unanswered, contradictory, or unverified. Use an empty list when none remain. |
| `assumptions` | Yes | Defaults or interpretations used to make the profile usable. Use an empty list when none were needed. |

## Identity and trip context

| Field | Required | Meaning and rules |
|---|---|---|
| `destination_request` | Yes | The destination as the traveler provided it, such as `Kyoto`, `Japan`, or `Japan in autumn`. Do not present an unresolved request as a confirmed destination. |
| `resolved_destination` | Optional | Country, region, city, or multi-city interpretation once planning has resolved the request. If resolution is not complete, keep this unknown. |
| `start_date` | Optional | Requested start date in `YYYY-MM-DD` form when known. |
| `end_date` | Optional | Requested end date in `YYYY-MM-DD` form when known. It must not be earlier than `start_date`. |
| `duration_days` | Optional | Desired trip length when exact dates are unknown or when the traveler expressed duration directly. |
| `date_flexibility` | Optional | Whether dates are fixed, somewhat flexible, or highly flexible. |
| `party_size` | Yes | Number of travelers. It must be a positive whole number. |
| `party_notes` | Optional | Relevant party context, such as children, older travelers, or different preferences within the group. Avoid unnecessary personal data. |
| `budget` | Optional | Amount, currency, and whether the amount is a target, ceiling, or flexible estimate. If no budget was supplied, record that in `unknowns`. |

At least one of `start_date`/`end_date` or `duration_days` should be known before planning begins. A flexible date is still different from an unknown date.

## Purpose and priorities

| Field | Required | Meaning |
|---|---|---|
| `primary_purpose` | Yes | The main reason for travel, such as culture, rest, photography, food, celebration, nature, or exploration. |
| `secondary_purposes` | Optional | Additional purposes that influence selection and tradeoffs. |
| `priorities` | Yes | Ordered or grouped concerns that should guide planning, such as better food over more cities or comfort over maximum coverage. |
| `success_definition` | Optional | The traveler’s description of what would make the trip feel worthwhile. |

Priorities are not the same as hard constraints. “I prefer fewer hotel changes” is a preference; “no more than one hotel change” is a hard constraint.

## Preferences

Each preference records a supported category, the traveler’s interest, and whether the preference was directly stated or inferred.

| Field | Required | Allowed values / meaning |
|---|---|---|
| `category` | Yes | A category such as culture, photography, food, nature, nightlife, shopping, history, relaxation, or local experiences. |
| `strength` | Yes | `must_have`, `strong`, `nice_to_have`, `not_interested`, or `unknown`. |
| `notes` | Optional | Qualifying detail, such as “street photography rather than museums.” |
| `source` | Yes | `stated`, `inferred`, or `defaulted`. |
| `confidence` | Yes when source is inferred or defaulted | `high`, `medium`, or `low`. Directly stated preferences do not need an inferred confidence score. |

The profile must distinguish a lack of evidence from a lack of interest. An absent category is not automatically `not_interested`.

## Travel style

| Field | Required | Allowed values / meaning |
|---|---|---|
| `pace` | Yes | `slow`, `balanced`, `fast`, or `unknown`. |
| `energy_pattern` | Optional | When the traveler prefers activity: `morning`, `afternoon`, `evening`, `consistent`, or `unknown`. |
| `walking_tolerance` | Yes | `low`, `medium`, `high`, or `unknown`. |
| `crowd_tolerance` | Yes | `low`, `medium`, `high`, or `unknown`. |
| `comfort_preference` | Optional | `comfort_first`, `balanced`, `exploration_first`, or `unknown`. |
| `spontaneity` | Optional | `structured`, `some_flexibility`, `spontaneous`, or `unknown`. |

These values describe preferences and tolerances, not medical or safety conclusions.

## Hard constraints

Only requirements stated by the traveler or explicitly accepted during discovery belong here.

| Field | Required | Meaning |
|---|---|---|
| `must_visit` | Yes | Places, experiences, people, or events the plan should include. Use an empty list when none were named. |
| `avoid` | Yes | Places, activities, situations, or conditions the plan must avoid. Use an empty list when none were named. |
| `dietary_requirements` | Yes | Dietary requirements or restrictions. Use an empty list when none were named. |
| `accessibility_requirements` | Yes | Mobility, sensory, medical, or other access requirements. Use an empty list when none were named. |
| `accommodation_requirements` | Yes | Non-negotiable lodging requirements. Use an empty list when none were named. |
| `maximum_daily_travel` | Optional | Maximum acceptable travel burden when the traveler gave one. Record the unit clearly. |
| `maximum_hotel_changes` | Optional | Maximum number of lodging changes when the traveler gave one. |
| `budget_ceiling` | Optional | A hard spending limit, distinct from a preferred or target budget. |

If a hard constraint conflicts with another hard constraint, preserve both in the profile and explain the contradiction in `unknowns` rather than choosing silently.

## Unknowns and assumptions

| Field | Required | Meaning |
|---|---|---|
| `unknowns[].topic` | Yes | The missing or contradictory topic. |
| `unknowns[].impact` | Yes | `blocking`, `material`, or `minor`. |
| `unknowns[].description` | Yes | What is not known and why it matters. |
| `assumptions[].topic` | Yes | The topic on which an interpretation or default was applied. |
| `assumptions[].value` | Yes | The chosen interpretation in plain language. |
| `assumptions[].reason` | Yes | Why it was used. |
| `assumptions[].user_confirmation_needed` | Yes | Whether the traveler should confirm it before the plan is treated as reliable. |

Blocking unknowns prevent the system from pretending that planning is complete. Material unknowns may permit a draft plan only when the plan clearly exposes their effect.

## Profile invariants

- The profile describes one trip and one traveling party.
- User-stated constraints take precedence over inferred preferences.
- An inferred preference never becomes a hard constraint without explicit confirmation.
- Dates, duration, budget, and party size are never fabricated.
- Contradictions remain visible until resolved.
- The profile contains no itinerary, candidate ranking, simulation result, event log, agent patch, API state, or persistence lineage.

## Human-readable example: Kyoto photography trip

### Context

| Field | Example |
|---|---|
| Destination request | Kyoto, Japan |
| Dates | 10–13 October 2026 |
| Party size | 2 |
| Budget | INR 85,000 target, somewhat flexible |
| Primary purpose | Culture and photography |

### Preferences and style

| Category | Strength | Source | Notes |
|---|---|---|---|
| Photography | Strong | Stated | Sunrise and street photography are especially valuable. |
| Culture | Strong | Stated | Temples and neighborhood culture preferred. |
| Food | Nice to have | Stated | Local food matters, but not at the expense of the main experiences. |

| Style field | Example |
|---|---|
| Pace | Balanced |
| Walking tolerance | Medium |
| Crowd tolerance | Low |
| Comfort preference | Balanced |
| Spontaneity | Some flexibility |

### Constraints and uncertainty

- Must visit: Fushimi Inari and one traditional neighborhood.
- Avoid: tightly packed all-day schedules.
- Dietary requirements: none stated.
- Accessibility requirements: none stated.
- Unknown: whether the INR 85,000 target includes international flights; material impact.
- Assumption: early starts are acceptable because sunrise photography was stated as a strong preference; user confirmation is recommended.
