# Tradeoff Brief — A Calmer Version of Your Trip

> **Workflow state:** Plan Ready (excerpt, shown only when tradeoffs are material) · **Reads:** `docs/FINAL_TRIP_PLAN_SCHEMA.md` (tradeoffs, fit, cost, warnings)

## Purpose

A humane reading of the finalized plan, shown only when the plan contains material compromises. It explains what was gained, what was given up, and why — in the traveler's terms — before the full itinerary.

## Scene & Layout

A centered 800px reading column on the warm light background:

* **Title and summary** at top, centered: the plan's title as a heading, and the plan's summary as a warm, centered body paragraph, both with generous bottom margin.
* **Tradeoffs stack** — a vertical list of warm-filled cards with soft corners, each with comfortable padding. Within each card, the main explanation spans most of the width (roughly three-quarters), set as readable body text ("what was gained, what was given up, why this choice"). A small, muted caption on the opposite side (right-aligned, mono-styled when numeric) carries the relevant scope/budget context (for example, that the estimate covers local transport and experiences). Never use red/green color to imply good/bad.
* **Supporting notes** rendered in the same warm cards with a slim brass left accent (like unknowns): key assumptions, warnings, and unresolved details that help the traveler interpret the plan.
* **Action** centered below: a brass primary "View your itinerary →" that anchors/scrolls to the trip overview.

## Visual Treatment

* Cards rest on the light background with subtle lift, never boxed in heavy borders. The left-accent treatment for assumptions/warnings mirrors that for unknowns elsewhere, creating family resemblance.
* Numeric scope details are in muted mono caption, right-aligned, not inline body.

## States

* **No material tradeoffs:** This brief is not shown; the itinerary starts with the overview.
* **With tradeoffs:** Stack grows naturally; no pagination.

## Behavior & Interaction

* Content comes from the final plan's tradeoffs, fit explanation, cost scope/budget position/caveats, assumptions, warnings, and unresolved details. Nothing is synthesized.
* The action simply navigates within the already-finalized plan — no new command to the server.

## Data & Contract Binding

* Shown only after a final plan snapshot has arrived. The title/summary and card texts map directly to the final plan's corresponding lists.

## Accessibility

* Headings and card texts are plain reading order; tags and deltas are captions. No reliance on color to convey meaning.
