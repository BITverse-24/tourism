# Replanning — Deferred (Reserved for a Later Phase)

> **Workflow state:** Not active in the initial journey · **Reads:** `docs/WEBSOCKET_CONTRACT.md` (reserved replanning)

## Purpose

To capture how replanning will eventually work, without making it live today. In the initial product, travelers do not replan from the itinerary — they refine via Profile Review. This file preserves the intended disruptive-change flow so a future phase can implement it without visual drift.

## Current Behavior (Initial Product)

* The itinerary and experience detail views do not offer a live disruption-intake action. If a "Want something different?" or "Swap this experience" affordance appears for preview, it must be inert — for example, showing a small muted caption such as "Replanning will be available in a later phase — for now, use Profile review to adjust your trip" — and must not send any command. The server will reject any disruption submission with an invalid-replanning signal in this phase.
* The existing finalized plan remains authoritative throughout; no provisional in-place edits are shown.

## Intended Future Flow — Descriptive Spec

**1) Disruption intake (modal)**

* A centered modal on a softly blurred deep-ink scrim, holding a warm card with soft corners and comfortable padding and subtle lift.
* Headline, medium-large serif: "What's changed?"
* Beneath, a three-across grid of selectable change-type chips (for example, weather, flight delay, attraction closed, budget shift, duration shift, fatigue, party change, preference change, other), each with a small line icon above its label, faint warm border at rest, warm-filled on hover, dark ink when selected.
* Below that, an optional warm-filled note area for free text (same affordance as the discovery note).
* A full-width brass primary action at the bottom: "Replan →" — visually prominent with micro hover.

**Reserved submission shape (for reference, not yet sent):** A change type from the list above, plus optional date/condition details, plus a free-text note.

**2) Replanning in progress & resolution**

* The modal closes and the traveler returns to exactly where they were (day canvas or detail), with a calm addition:
  * A sticky banner just below the header spanning the full width, slightly translucent warm surface with a faint top/bottom hairline. On the left, a small breathing ripple (same brass glow, but only about 24px) — on the right, small body text such as "Replanning your trip..."
* The existing day canvas stays fully visible and remains the source of truth. While replanning is active, any *draft* updates that arrive appear with the familiar dashed brass border and the small floating "Draft — not yet confirmed" badge — never the word "provisional."
* **Resolution:** When a finalized snapshot and workflow completion signal arrive, the canvas briefly dims and rebuilds (a soft fade), the banner's ripple is replaced by a muted green check-like indicator, and the text updates to a plain-language outcome (for example, "Because of tomorrow's rain, we've moved your afternoon indoors").

## Visual Treatment

* Scrim is deep ink at low opacity with a subtle blur, not a stark black. The modal card is warm and lifted, distinct from the hero imagery elsewhere.

## Behavior & Interaction (When Active)

* The primary action sends the disruption submission with a fresh correlation identifier. The banner appears immediately; draft visuals apply only to draft snapshots, final visuals only to final snapshots with completion.

## Data & Contract Binding

* Reserved contract values for change types are listed above for parity with `docs/WEBSOCKET_CONTRACT.md`. Do not invent additional types.

## Edge Cases & Errors

* Any attempt to submit in the initial phase should be handled as an invalid-replanning condition with a calm notice and a redirection to Profile Review.
