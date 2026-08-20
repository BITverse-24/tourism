# Experience Detail — Card Morph & Pour

> **Workflow state:** Plan Ready (full-screen overlay on the day canvas) · **Reads:** `docs/FINAL_TRIP_PLAN_SCHEMA.md` (days → items and surrounding fit)

## Purpose

A focused, immersive reading of a single itinerary item — the moment a timeline card pours into a full-screen detail, giving its photography, context, and fit reasoning room to breathe before the traveler returns to the flow of the day.

## Aesthetic Intent — Gallery Reveal

Where the day canvas is a daybook, the detail is a gallery wall. One image, one story, one reason — all given generous scale and centered calm. The luxury is in scale, overlap, and typographic focus.

* **Scale as reverence:** The hero image is allowed to be large and cinematic; the text that follows is allowed to be spare. No crowding, no competing sidebars.
* **Overlap as craft:** The content card overlapping the hero reads as a precisely placed print laid over a photograph — a tactile detail that signals editorial care.
* **Reason as provenance:** The brass-accented inset for fit reasoning feels like the provenance note beside an artwork — it explains why this piece belongs in the collection.

## Scene & Layout — Descriptive

Triggered by activating any experience or meal card on the day canvas, this view overlays the entire viewport without navigating away, preserving scroll position underneath:

* **Backdrop:** The surrounding page is covered by the warm light bone, softly scrolling if needed. The transition from the card to this overlay feels like a smooth, slightly slower pour rather than a hard cut or modal pop.

* **Hero area** at the top: a full-width, roughly two-fifths viewport photograph filling the width, covering its area gracefully, with soft duality: the image is vivid and atmospheric, yet never hard-bordered. It fills edge to edge within the overlay, and its bottom edge is the place where the content card will overlap.

* **Content card** overlapping the hero slightly — centered, about 800px wide, warm light surface, soft corners, lifted so it reads as a print floated over the photograph — slightly pulled upward over the hero's bottom edge, creating a layered breakout with gentle shadow. Slightly offset upward, it casts a soft double shadow onto the hero's edge, making the overlap feel physical. Inside, with generous internal padding:
  * **Title** at top, large serif heading in dark ink, with generous line spacing — the item's name set as a dedication.
  * **Subline** just below, small body in muted ink, giving location, timing window, and flexibility tag (fixed / moveable / optional) as available, spaced so it reads as a single breath.
  * **Description** below, comfortable body text in dark ink, with generous paragraph spacing. The line length is kept readable and the text sits on warm bone with no tinted box.
  * **Fit-reason inset** — a distinctive warm-filled block with a thick brass left accent, comfortably padded, set in serif italic body in dark ink. This is the provenance note: the item's profile-based reason (why this experience suits the traveler) or, when the item has no specific reason, a short excerpt from the overall fit explanation. The accent's thickness and color echo the unknowns elsewhere — a quiet family rhyme.
  * **Optional movement and cost lines** beneath the inset, in smaller muted body/caption, when those details exist — never crowding the inset.
  * **Internal spacing:** Title to subline compact, subline to description generous, description to inset generous, inset to movement/cost moderate — the cadence is deliberate.

* **Sticky action bar** at the bottom of the overlay: a lightly translucent warm bar with a faint top hairline and soft blur, holding a simple ghost "Close" control centered within it plus a tiny reassurance caption ("Want something different? You can request changes from Profile review") in muted caption. The bar stays visible as the content scrolls and feels like a thin lacquered ledge, not a toolbar.

## Material, Light & Detail — Luxury Cues

* **Hero as print:** The hero image should feel like a fine photographic print edge to edge, not a cropped card. Its veil is minimal — the image carries.
* **Card over print:** The overlapping card's shadow should read as paper floating over a photograph on a table — soft, double-layered, diffuse. No hard line where they meet.
* **Provenance inset:** The warm fill and thick brass accent should read as a gallery caption card placed inside the print — same stock as elsewhere, same brass as unknowns and trade-off warnings. The serif italic signals voice, not data.
* **Action ledge:** The translucent bar's blur and faint border read as a thin tray of lacquered bone, not a sticky footer.

## States

* **Missing image:** Show a warm neutral skeleton in the hero area at the same proportion, with a soft fade-in handling, never a broken-image icon. All text remains fully rendered.
* **Rest or movement items:** Detail is informational only; rest has no imagery and its detail is simply its centered text plus flexibility; movement reasoning is just its connector text.
* **Draft context:** The underlying canvas may be in draft, but this detail always reflects the current snapshot's item exactly as is — no separate draft terminology here beyond what the card already carried on the timeline.

## Motion — Pour, Not Pop

* Opening animates with the slower image-morph ease — the tapped card's image appears to pour into the hero while the title settles, then the subline, description, and inset follow with staggered settle. Closing reverses with the page-pour ease, returning the traveler precisely to the originating card's scroll position (a view-swim, not a route change).

## Behavior & Interaction

* Dismiss is via the centered Close control or the standard overlay dismiss gesture (background click outside the content card or the expected keyboard dismiss) when the platform provides it.
* In the initial product, this detail is informational only. There is no "Swap this experience" mutation here; any desire to change the trip is expressed via Profile Review, as the action bar's caption gently reminds.

## Data & Contract Binding

* Title, location, timing, description, movement, cost, reason, and flexibility map directly from the selected item in the days list. The fit-reason inset prefers the item's reason when present; otherwise it excerpts the plan-level fit explanation with the same brass-accent treatment.

## Edge Cases — Gracefully Handled

* If an item has no timing, the subline shows location and flexibility without a time range. If no item-level reason exists, the inset simply reflects the general fit — never empty. Image handling is lazy with fade and skeleton fallback per global rules.

## Accessibility

* The overlay traps focus while open and restores it precisely to the originating card on close. The hero image has descriptive alternate text when available, otherwise it is decorative and not announced. Focus order is hero → content heading → description → inset → action bar, announced as a single coherent article.

## Luxury Priority

* The priority is to make a single item feel worth pausing for — generous top breathing room after the hero, the content card's deliberate overlap, and the provenance inset's serif italic are the signatures of this screen. Nothing should feel like a template.

## Implementation Contract — Overlay Geometry

Render the detail as a full-screen dialog-like overlay mounted above the day canvas, not as a new route. The overlay owns a scroll container; the underlying page is `inert` while open and its scroll position is saved. Use a deep-ink scrim only when the underlying canvas needs separation; the detail surface itself remains warm bone. The content column is `width: min(800px, calc(100vw - 48px))`.

The hero is 40vh with a 360px minimum and 560px maximum on desktop. The content card overlaps the hero by 32px, has 48px top/side padding and 64px bottom padding, and uses `--voyager-shadow-float`. At 768px and below, hero height is 280px, overlap is 16px, and card padding is 24px. Keep the bottom action ledge outside the card and add bottom padding equal to its height plus 24px.

Content order is title → metadata line → description → fit-reason inset → movement → cost → close ledge. Metadata is one readable line that may wrap: location, timing, then flexibility. The fit inset is present when an item `reason` or plan-level fit explanation exists; otherwise omit it rather than inventing a reason. Movement and cost are omitted when absent. The Close control is the only action and is labelled `Close`.

Opening focus lands on the dialog heading after the morph completes; closing restores focus to the originating card. Escape and Close dismiss. Trap focus while open. A scrim click dismisses only when pointer-down and pointer-up both occur outside the content card. Do not add swap, save, book, or share actions in v1.

## Acceptance Criteria

The overlay renders experience, meal, rest, and movement items; missing imagery never removes text; long titles and descriptions wrap without clipping; and the underlying scroll position is restored after close. At 320px the hero, card, inset, and Close action remain usable without horizontal scroll. Decorative images have empty alt text; informative images have descriptive alt text. The dialog has a human-readable label and does not announce the decorative morph as content.
