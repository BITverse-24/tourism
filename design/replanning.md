# Replanning — Deferred (Reserved for a Later Phase)

> **Workflow state:** Not active in the initial journey · **Reads:** `docs/WEBSOCKET_CONTRACT.md` (reserved replanning)

## Purpose

To preserve how replanning will eventually feel, without making it live today. In the initial product travelers do not replan from within the itinerary — they refine via Profile Review. This file reserves the visual and interaction language of disruptive-change handling so a future phase can implement it without ever diluting the luxury now.

## Aesthetic Intent — Quiet Contingency

Replanning should feel like a contingency handled with the same poise as the original plan — a calm, private adjustment, not an alert. The luxury is in how little drama the design brings to a disruption.

* **Contingency, not alarm:** Even a flight delay or storm should be presented with hospitality language and warm materials, not warning colors or dense forms.
* **Same stock:** Any future replanning surface should use the same warm bone stock, soft lift, and brass discipline as the rest of the product — replan never introduces a new palette.
* **Authoritative continuity:** The existing finalized plan must always remain visible and authoritative while a replan is underway; the design never replaces it speculatively.

## Current Behavior (Initial Product)

* The itinerary and experience detail views do not offer a live disruption-intake action. If a "Want something different?" or "Swap this experience" affordance appears at all for preview purposes, it must be inert — for example, showing a small muted caption such as "Replanning will be available in a later phase — for now, use Profile review to adjust your trip" in soft ink, with no button that looks enabled — and it must not send any command. The server will treat any disruption submission as invalid at this stage; the UI must never attempt it.
* The existing finalized plan remains fully visible and is the source of truth throughout; no speculative in-place edits, no provisional replacement.

## Intended Future Flow — Descriptive Spec (Not Yet Wired)

**Stage 1 — Disruption intake (considered modal, when shipped):**

* A centered modal on a softly blurred deep-ink scrim — translucent, low-opacity, with a gentle blur that lets the underlying itinerary remain faintly legible. At center, a warm, softly rounded card with comfortable padding and a soft double shadow, slightly lifted. Not stark white, not narrow — simply warm bone with breathing room.
* **Headline** at top, medium-large serif in dark ink: "What's changed?" set with generous margin beneath.
* **Change-type chooser** beneath, as a three-across grid of selectable change-type chips (examples: weather, flight delay, attraction closed, budget shift, duration shift, fatigue, party change, preference change, other), each with a small, single-weight line icon centered above its label, faint warm border at rest, warm-filled on hover, dark ink when selected — the same ChoiceChip language as elsewhere, simply arranged in a grid and with an icon stacked above text for quick scanning.
* **Optional note area** below the grid, a warm-filled, softly rounded multi-line field (same affordance as the discovery note) for free-text elaboration, with a gentle placeholder. Generous internal padding, readable body text.
* **Primary action** at the bottom, full-width within the card, brass-filled with dark text and soft corners, labeled "Replan →" — visually prominent yet calm, with the micro hover tint.

**Reserved submission shape (for reference, not yet sent):** a change type from the reserved list (flight delayed / weather / attraction closed / budget changed / duration changed / fatigue / party changed / preference changed / other), plus optional date/condition details, plus a free-text note.

**Stage 2 — Replanning in progress and resolution (when shipped):**

* The modal closes and the traveler returns to exactly where they were (day canvas or detail), with a calm addition that does not replace content:
  * A sticky banner just below the header, spanning the full width, slightly translucent warm surface with a faint top and bottom warm hairline and soft blur. On the left, a small breathing ripple (the same brass glow as consultation but only about 24px, a jewel-scale version) — on the right, small body text in dark ink such as "Replanning your trip..." The banner lifts ever so slightly.
* The existing day canvas stays fully visible and remains the authoritative itinerary while replanning runs. While a replan is active, any draft updates that arrive appear with the familiar fine dashed brass border and the small floating "Draft — not yet confirmed" badge offset outside card corners — never the word "provisional" and never a speculative replacement of the finalized plan.
* **Resolution:** When a finalized snapshot and its completion signal arrive, the canvas briefly softens (a gentle dim plus rebuild), the banner's small ripple is replaced by a muted sage (soft green) check-like indicator, and the text updates to a plain-language outcome such as "Because of tomorrow's rain, we've moved your afternoon indoors" or "Adjusted for your shorter stay, with the same priorities honored." The banner then settles before eventually dismissing.

## Material, Light & Detail — Luxury Cues

* **Scrim as veil:** The deep-ink scrim should read as a sheer veil over the itinerary, not a blackout. The underlying map and timeline remain faintly visible, reinforcing continuity.
* **Card as correspondence:** The intake card should feel like a piece of fine correspondence laid on a table — same bone stock and double shadow as the intent card on arrival.
* **Banner as discreet notice:** The in-progress banner's translucence and faint hairlines make it feel like a discreet notice slipped under the header, not a system alert.

## Behavior & Interaction (When Active)

* The primary action in the intake card sends the disruption submission with a fresh correlation identifier; the banner appears immediately; draft visuals apply only to draft snapshots and final visuals only to finalized snapshots with completion. No optimistic in-place mutation of the itinerary occurs.

## Data & Contract Binding

* Reserved change-type values are listed above for parity with `docs/WEBSOCKET_CONTRACT.md`. Do not invent additional types or fields.

## Edge Cases — Composure

* Any attempt to submit a disruption in the initial phase is handled as an invalid-replanning condition with a calm inline notice and a redirection to Profile Review — never a blocking error modal.

## Luxury Priority

* Even a disruption should feel handled with hospitality: the same warm stock, the same brass, the same generous spacing, and language that is plain and humane ("Because of..." rather than "Action completed: replan"). The traveler should feel that contingency, too, has been considered with care.

## Implementation Contract — Scope Guard

This screen is a documentation reservation, not an implementation task for the initial product. In the current release, do not render a Replan button, change-type chooser, disruption modal, sticky replanning banner, or `replan.request` command. If an informational caption is shown near an itinerary detail action, it must be inert, must not have button semantics, hover styling, or a click handler, and may use: `Replanning will be available in a later phase — for now, use Profile review to adjust your trip.`

If a future phase activates this screen, keep the finalized plan authoritative until a replacement `plan.snapshot` with `state: final` and `workflow.completed` are both observed. Draft replacements use the global dashed border and exact draft badge. Never mutate a final itinerary optimistically, even for an obvious disruption. The initial implementation must include a feature flag or route guard so reserved controls cannot accidentally ship enabled.

## Acceptance Criteria

An initial-product screenshot contains no active replanning affordance and no dead-looking disabled button. The existing final day canvas and experience detail remain fully usable. Any attempted reserved command is blocked client-side and never sent. Future work must update this file and the WebSocket contract together before adding a live replanning control.
