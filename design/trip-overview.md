# Trip Overview

> **Workflow state:** Plan Ready · **Reads:** `docs/FINAL_TRIP_PLAN_SCHEMA.md` (route, allocation, cost, accommodation)

## Purpose

The high-level reading of the finalized trip: where the traveler goes, in what order, how time is divided among places, and what the journey costs in clear, honest scope.

## Aesthetic Intent — Map as Editorial, Not Marketing

The overview should feel like an beautifully typeset atlas spread — cartography and ledger side by side, each given room, neither shouting. The beauty is in proportion and precision.

* **Cartography as atmosphere:** The map/route illustration is muted, understated, and tactile — like ink on good paper — not a product map pin field.
* **Ledger as clarity:** Allocations, accommodation, and cost are shown as calm disclosures and a single warm cost card, with every number accompanied by its scope so the traveler reads value, not just price.
* **Brass as proportion, not decoration:** The thin allocation bar's brass is used to show proportion at a glance, with subtle opacity steps that feel like layered washes rather than segments competing for attention.

## Scene & Layout — Descriptive

A wide, centered canvas (at most ~1240px) with an editorial top-to-bottom flow and generous whitespace between sections:

* **Hero block** at the top: the plan title as a large serif heading in dark ink, with airy margin beneath. Directly below, a smaller body line in muted ink indicates the trip window — either a date range when known, or a duration such as "11 days" plus any flexibility note. This line is quiet and factual; it lets the title carry the emotion.

* **Allocation bar** just beneath the hero, with generous bottom margin separating it from the body: a thin, softly rounded horizontal bar visualizing how nights/days are divided among places. The bar is segmented; each segment is warm brass at full warmth, with gentle opacity steps to distinguish consecutive places (beginning near full opacity and stepping down slightly with each segment, like layered washes). Tiny gaps in the light background separate the segments so the bar reads as inlaid. The bar has an accessible descriptive label; hovering or focusing a segment reveals its place name, amount, and the short reason for its share — without crowding the default view with text.

* **Main body** — a side-by-side, two-part layout with generous gutter between parts (feeling like a spread):
  * **Left — Cartography (about three-fifths):** A muted, square-proportioned route illustration. The route line is understated, slightly transparent and soft, at reduced opacity, with soft corners and a gentle blend into the warm surface. It shows places in order as defined by the route, never as numbered pins trying to be interactive. The cartography is a reading aid and atmosphere, not a widget.
  * **Right — Details rail (about two-fifths):** A calm vertical stack:
    * For each city/region allocation, a disclosure that can expand and collapse (initially collapsed) whose visible title is a tiny uppercase caption (place plus night count, generous tracking). When expanded, it reveals readable body text with the human reason for that allocation and any estimated cost. Collapsed state is simply the title and subtle divider — no preview text that crowds.
    * When accommodation is present, similar disclosures appear per place, showing the recommendation, its reason, and a status rendered literally as suggested, selected by traveler, or not yet decided — never implying anything is booked.
    * **Cost summary card** within the rail: a warm-filled card with soft corners and comfortable padding, slightly lifted. At top, a tiny muted caption ("Cost summary — currency · budget position"), then a medium heading with the estimated total in dark ink, then a caption line stating scope with precision (explicitly what is included and excluded, especially flights and lodging), then the category breakdown as muted body lines, then any caveats as even smaller muted caption. The budget position is a textual phrase (within / near / above target or unknown), not a colored chip.

## Material, Light & Detail — Luxury Cues

* **Brass as wash:** Each allocation segment's opacity step should read as layered watercolor, not as flat segments. The tiny light gaps between segments make the bar feel inlaid into the page.
* **Paper and ink:** All cards and disclosures share the warm bone surface with soft double shadows. Borders are faint warm hairlines when present; lifted elements use the diffuse elevation, never hard drop shadows.
* **Disclosures as ledger lines:** Collapsed disclosures feel like ledger entries — caption title plus faint rule — while expanded states feel like a page opened. The transition is a quiet settle, not an accordion snap.
* **Cost card as note:** The cost card's hierarchy (caption → heading → caption → body) guides the eye from context to total to detail, like a well-set invoice on good stock.

## States

* **Collapsed vs expanded disclosures:** Collapsed shows only the title and faint rule; expanded adds reason/cost body with a soft settle. No heavy border appears on expand.
* **Brass interaction:** Hovering allocation segments or focusing disclosures simply tints gently or deepens the caption contrast — never a brand-color flash.

## Motion — Spread Settling

* Hero settles first, then the allocation bar (a gentle width-and-fade), then the two-column spread (cartography and rail settling slightly staggered). Disclosure expansion uses the content-settle ease.

## Behavior & Interaction

* The route, allocation amounts, and reasons come directly from the final plan's ordered destination route and city allocations, with ordering by visit sequence that agrees with the day-by-day canvas. Costs map directly to the cost summary's currency, estimated total, scope, categories, budget position, and caveats. Nothing is invented — proportional widths derive from nights/total, not an aesthetic ratio.

## Data & Contract Binding

* The route order, segment proportions, and cost breakdown must match the final plan exactly. Accommodation status is shown literally and never suggests a reservation exists.

## Edge Cases — Honest Completeness

* When lodging is not yet decided, the accommodation disclosure states that plainly and beautifully. When flights are excluded from the total, the scope line says so explicitly. Missing cartography imagery falls back to a warm skeleton at the same square proportion, never a broken-image icon.

## Accessibility

* The allocation bar carries a descriptive label and each segment has an accessible name with its amount and reason. Disclosures are native expand/collapse controls with clear state. No information relies solely on color or opacity.

## Luxury Priority

* For this screen, luxury is felt in the restraint of the brass bar (never a rainbow), in the generous gutter between map and rail, and in the precision of the cost card's scope language — the traveler should feel that someone has accounted for everything and hidden nothing.

## Implementation Contract — Atlas Spread

Use `main.trip-overview` with 64px top padding and 128px bottom padding. The hero title is left aligned within the 1240px canvas. The allocation bar is a semantic list rendered as a 12px-high flex row with 4px gaps; each segment width derives from `nights` when present, otherwise `days`, divided by the total, with a minimum visual width of 4px. Its accessible name states place, amount, and reason; never rely on opacity alone.

Below the bar, use a 7fr/5fr grid with a 64px gutter. The cartography panel is a 1:1 square with a warm skeleton fallback. Implement the route illustration as quiet inline SVG or canvas: one soft path in `--voyager-ink-2` at 55% opacity, one small outlined circle per ordered place, and visible place labels. It is not a map SDK surface and must not display clickable pins, zoom controls, provider branding, or false geographic precision. If coordinates are absent, use an ordered abstract path that makes sequence clear without pretending to be geography.

The details rail is a vertical stack with 24px gaps. Allocation and accommodation disclosures are native buttons controlling adjacent regions. Collapsed height is 56px; expanded content uses 24px top padding and the quiet settle motion. Use exact accommodation labels `Suggested`, `Selected by traveler`, and `Not yet decided`; never use “booked,” “reserved,” or “confirmed” for lodging.

The cost card is last in the rail. Its hierarchy is caption → `estimated_total` heading → scope → category rows → budget position → caveats. Budget position is plain text: `Within target`, `Near target`, `Above target`, or `Budget unknown`. Show zero-value categories only when supplied; never invent missing categories. The scope sentence explicitly names excluded flights or lodging when applicable.

## Acceptance Criteria

Route order, allocation proportions, and day/city reading order agree. A missing route image never removes route labels. At 1024px the grid remains readable; below 1024px the rail follows the cartography and the cost card remains reachable without horizontal scroll. Every disclosure works with keyboard and announces expanded/collapsed state. A final plan is the only plan state that can use the solid final border; draft plans retain the explicit draft badge.
