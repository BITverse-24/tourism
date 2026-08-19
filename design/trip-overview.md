# Trip Overview

> **Workflow state:** Plan Ready · **Reads:** `docs/FINAL_TRIP_PLAN_SCHEMA.md` (route, allocation, cost, accommodation)

## Purpose

The high-level reading of the finalized trip: where the traveler will go, in what order, how time is divided, and what the trip costs in clear scope.

## Scene & Layout

A wide, centered canvas (at most ~1240px) with an editorial top-to-bottom flow:

* **Hero block** at top: the plan title as a large serif heading, and a body line beneath indicating the trip window — either a date range when known or a duration (e.g., "11 days") plus any flexibility note. Generous bottom margin separates the hero from what follows.
* **Allocation bar** just below: a thin, softly rounded horizontal bar visualizing how nights/days are divided among places. The bar is segmented, each segment in warm brass with subtle opacity steps to distinguish consecutive places (beginning around full opacity and stepping down gently). Tiny gaps in the light background separate segments. The bar has an accessible label describing its purpose; hovering or focusing a segment reveals its place, amount, and reason.
* **Main body** — a two-part layout side-by-side with generous gutter:
  * *Left — Cartography (about 60%):* A muted, square-route illustration or map. The route line is soft and understated (mix-blended, slightly transparent), with soft corners. It is a reading aid, not a booking widget. Shows the places in order as defined by the route.
  * *Right — Details rail (about 40%):* A vertical stack. For each city/region allocation, a disclosure that can expand/collapse (initially collapsed) whose title is a small caption (place plus night count). When expanded, it shows readable body text with the reason for the allocation and any estimated cost. When accommodation is present, similar disclosures appear per place, indicating its recommendation, reason, and a status such as suggested, selected by traveler, or not yet decided — never implying anything is booked.
  * *Cost summary card* within the rail: a warm-filled card with soft corners and comfortable padding, showing the currency and total with a caption noting the scope (explicitly stating what is included and excluded, especially flights and lodging), category breakdowns, a succinct budget position (within/near/above target or unknown), and any caveats.

## Visual Treatment

* The allocation bar is the only strong horizontal graphic; all else is restrained warm and ink with whitespace.
* Map and rail are visually balanced — neither dominates; the map is atmospheric, the rail is informational.

## States

* **Collapsed vs expanded disclosures:** Collapsed shows only the title; expanded reveals reason/cost with a soft settle motion. Borders remain a faint warm hairline.
* **Cost position:** Conveyed as concise text, not color-coded chips.

## Behavior & Interaction

* The route, allocation amounts, and reasons come directly from the final plan's ordered destination route and city allocations (ordered by visit sequence, agreeing with the day-by-day section). Costs map directly to cost summary fields (currency, estimated total, scope, categories, budget position, caveats).
* Hover/focus on allocation segments or disclosures reveals longer reasons without crowding the default view.

## Data & Contract Binding

* No distance or price is invented. The route order, segment proportions (by nights/total), and cost categories must match the final plan exactly. Accommodation status is shown literally.

## Edge Cases & Errors

* When lodging is not yet decided, the card explicitly states that. When flights are excluded, the scope must say so. Missing imagery falls back to a warm skeleton, never a broken-image icon.

## Accessibility

* The allocation bar has a descriptive label and each segment has an accessible name with its amount and reason. Disclosures are native expand/collapse controls.
