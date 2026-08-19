# Experience Detail — Card Morph & Pour

> **Workflow state:** Plan Ready (full-screen overlay on top of the day canvas) · **Reads:** `docs/FINAL_TRIP_PLAN_SCHEMA.md` (days → items) and surrounding fit explanation

## Purpose

A focused, immersive reading of a single itinerary item — the moment a timeline card pours into a full-screen detail, giving photography, context, and fit reasoning room to breathe.

## Scene & Layout

Triggered by activating any experience/meal card on the day canvas, this view overlays the entire viewport without navigating away:

* **Backdrop:** The surrounding page is covered by the warm light surface, softly scrolling if needed. The transition from the card to the detail feels like a smooth, slower pour rather than a hard cut.
* **Hero area** at top: a full-width, roughly two-fifths viewport image (photography that covers the space, with soft corners only where it meets the content card). It is the visual anchor.
* **Content card** overlapping the hero slightly: a centered, 800px-wide reading column that appears to lift out from the image with a gentle offset. Slightly pulled upward over the hero's bottom edge, it creates a layered breakout.
  * Inside, a small plain header area with the item's title as a large serif heading.
  * Just below, a line of small body text in muted ink: location, timing window, and flexibility tag (fixed/moveable/optional), as available.
  * Below that, the item's description as comfortable body text.
  * A distinctive inset note — a warm-filled block with a thick brass left accent, serif italic body — sharing the fit or trade-off reasoning (the item's profile-based reason, or a short excerpt from the overall fit explanation when the item has no specific reason).
  * Optional movement and cost lines beneath, in smaller muted body, when those details exist.
* **Sticky action bar** at the bottom of the overlay: a lightly translucent warm bar with a faint top border and soft blur, holding a simple ghost "Close" control centered within it plus a tiny reassurance caption ("Want something different? You can request changes from Profile review"). The bar stays visible as the content scrolls.

## Visual Treatment

* The hero image is treated cinematically — full-bleed within the overlay, not boxed. The overlapping content card is clearly a warm surface floating over it.
* The fit-reason inset uses the same warm surface and brass accent seen for unknowns/warnings elsewhere — a quiet family resemblance.

## States

* **Missing image:** Show a warm neutral skeleton in the hero area with a soft fade-in handling, never a broken-image icon. Still render all text.
* **Rest/movement items:** Detail is informational only; rest has no imagery and movement reasoning is simply its connector text.
* **Draft context:** The underlying canvas may be in draft, but this detail always reflects the current snapshot's item as is — no separate draft terminology here beyond what the card already carried.

## Behavior & Interaction

* Opening animates with the slower image-morph motion; closing reverses with the page-pour motion, returning the traveler to the exact scroll position on the day canvas (a view-swim, not a route change).
* Dismiss is via the Close control or the standard overlay dismiss gesture (background click or escape) if the platform provides it.
* In the initial product, this detail is informational only. There is no "Swap this experience" mutation here; any desire to change the trip is expressed via Profile Review, as noted in the action bar's caption.

## Data & Contract Binding

* Title, location, timing, description, movement, cost, reason, and flexibility map directly from the selected item in `days → items`. The fit-reason inset prefers the item's reason when present; otherwise it excerpts the plan-level fit explanation.

## Edge Cases & Errors

* If an item has no timing, show the location/flexibility line without a time range. If no reason is present, the inset simply reflects the general fit. Image handling is lazy with fade and skeleton fallback as per global rules.

## Accessibility

* The overlay traps focus while open and restores it to the originating card on close. The hero image has descriptive alternate text when available, otherwise it is decorative. Focus order is hero → content → action bar.
