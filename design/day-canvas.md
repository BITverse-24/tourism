# Day / City Canvas — The Main Itinerary

> **Workflow state:** Plan Ready · **Reads:** `docs/FINAL_TRIP_PLAN_SCHEMA.md` (days and items), `docs/WEBSOCKET_CONTRACT.md` (plan snapshot state)

## Purpose

The ordered, day-by-day reading of the trip — the core artifact travelers will carry. It must be a pleasure to read at a glance (which day, where) and at depth (what, when, why, how to move), with the honesty of draft vs final always legible and never alarmist.

## Aesthetic Intent — Tailored Timeline

The day canvas should feel like a bespoke daybook laid open: tabs down the left like a soft index, a rhythmic timeline down the right, and generous margins that let each entry breathe. The luxury is in rhythm, legibility, and the confidence to leave rest visibly empty.

* **Rhythm as luxury:** Ordered days, ordered items, consistent gaps, and an unwavering time column create a cadence that feels tailored. The page never feels busy, even with many entries.
* **Index and feed:** Tabs are a quiet index; the timeline is the feed. One orients, the other narrates. Neither competes.
* **Rest honored:** A rest period is designed as a valid entry — calmly centered, warm-filled, generous height — not as an empty slot waiting to be filled.

## Scene & Layout — Descriptive

A wide centered canvas (at most ~1240px) organized as a two-column reading layout with generous vertical margin at top and bottom:

* **Left — Day tabs (narrow, roughly one-sixth):** A sticky vertical index that remains visible while the timeline scrolls. Each entry is set as a small uppercase caption with generous tracking, such as "Day 2 · Kyoto" or the day's theme when present, left-aligned with comfortable padding. The active entry is indicated by slightly heavier weight and warm brass text, with a faint warm vertical divider separating the index from the timeline. The index's top sits with comfortable offset from the viewport top when sticky. No filled selection pill — the elegance is in weight and color alone.

* **Right — Timeline canvas (wide, remaining space), announced semantically as a feed:**
  * **Day header** at the top of each day, medium heading in dark ink with the day number, place, and optional date, with generous top and bottom margin so each day feels like a new chapter. Some days carry a theme.
  * **Theme and daily notes** beneath the header: the day's theme set in italic body (a warm, slightly narrower line length that feels like a handwritten annotation), and any daily notes as softer muted body beneath it, both with airy spacing before the first timed item.
  * **Timed item rows:** Each item appears as a composed row in two parts — a narrow left column for time and a wider right column for the detail card. The left column shows the start time (or a simple dash when no specific time applies, with an optional end time following), set as small muted caption with slight top offset so it aligns optically with the card's title baseline. The right column holds the experience or meal card (see primitives): title as medium heading, readable description beneath, optional location line and flexibility tag (fixed / moveable / optional) as small muted caption, optional reason line tying the choice to the traveler profile, and optional estimated cost. The card shares the warm bone surface and soft double shadow.
  * **Movement connectors:** When travel between items affects timing, cost, or feasibility, a subtle connector appears just below the relevant card — aligned with the card column, offset slightly to reveal a faint vertical warm line on its left, with a small line icon and short text such as mode and approximate duration (plus cost when relevant) in small muted body/caption. Movement connectors are subordinate: muted ink, never brass, so they guide without competing.
  * **Rest periods:** Rendered as valid entries, not blank gaps. A warm-filled, flat block of comfortable height (roughly three to four lines tall), centered muted text such as "Rest — no plans until late afternoon" with associated flexibility when present, soft corners, and no imagery. Its height should feel intentional, not like missing content.
  * **Floating summary strip:** A softly lifted, warm, slightly translucent pill fixed near the bottom center of the viewport, with a faint warm border and soft diffuse shadow, separated items with comfortable gaps (profile reference, allocation sketch, budget position in caption/small body). It floats above content without obscuring the timeline's final entries.

## Material, Light & Detail — Luxury Cues

* **Index typography:** The index's caption tracking and muted palette make it feel like marginalia in a fine book — present, searchable, but never louder than the feed.
* **Card stock and shadow:** Cards rest on warm bone with the same double soft shadow as in the overview — tight plus diffuse — so the timeline feels like cards laid on a table rather than boxes in a feed.
* **Connectors as stitching:** The faint vertical warm line and small icon should read as delicate stitching connecting entries, not as a logistics diagram.
* **Rest as linen:** Rest blocks should feel like a folded linen napkin — flat, warm, centered text with generous padding — quiet and dignified.
* **Pill as tray:** The floating strip's translucence suggests a thin porcelain tray floated above the page, not a toolbar.

## States — Honesty Made Beautiful

* **Final vs draft:** Final content uses a solid faint warm border; draft content (when the server has only a draft snapshot) uses the fine dashed brass border and carries a small floating badge offset outside the card's top-right corner, reading "Draft — not yet confirmed" on a warm surface with a brass outline. The badge is small, caption-sized, never warning-colored.
* **Active day:** Indicated solely by weight and brass color in the index, plus generous whitespace around the day header. No background fill or underline animation that competes.
* **Flexibility tags:** Shown as tiny uppercase captions (fixed / moveable / optional) beside the location line, secondary to title and description.

## Motion — Reading Rhythm

* Day headers and notes settle first for each day, then timed rows appear with gentle stagger, each rising slightly while fading in. Connectors settle with the items they follow. Tab highlight changes with the calm settle ease, not an instant switch.

## Behavior & Interaction

* Day tabs scroll the timeline to the anchored day with a calm settle motion, preserving the sticky offset so the header is never hidden under the viewport top. The timeline reflects the ordered days from the final plan — ordered by day number (and date when present) — and must agree with the route and allocations shown in the overview. Ideas within a day are ordered and must not imply impossible overlaps; times are shown exactly as provided or omitted when flexible.
* Plan snapshots are complete replacements — the UI replaces days only when a newer revision arrives in sequence order; otherwise it holds still.

## Data & Contract Binding

* Each day's place, theme, and daily notes map directly. Items map to four types: experience, meal, rest, movement. Flexibility, reason (profile-based justification), and movement details (mode/duration) are shown exactly as provided or omitted when flexible.

## Edge Cases — Generously Handled

* A day may intentionally contain mostly rest and flexibility — render it as designed, honoring the rest block's height and centered text, not as an empty slot to be "filled" or collapsed. Missing imagery inside experience cards falls back to a warm neutral skeleton at the same proportion, never a broken-image icon. Draft badges never use the word "provisional" — always the humane "Draft — not yet confirmed."

## Accessibility

* Day tabs indicate selection; the timeline is a feed and each item an article. Times are semantically time when present. Badges and connectors have text equivalents. Reading order remains logical when linearized.

## Luxury Priority

* The priority here is rhythm and material coherence with the overview: same warm card stock, same shadow softness, same brass discipline, same caption tracking. The traveler should feel that the itinerary is not a feed of cards but a single book set with care.

## Implementation Contract — Daybook Anatomy

Use `main.day-canvas` with a 260px index column and a flexible timeline column inside the 1240px canvas; the gap is 64px. The index is a semantic navigation list of anchors, not buttons that mutate state. Each day heading owns a stable `id` used by the anchor. Use `scroll-margin-top: 104px` so the global header and any sticky notice never cover the heading. Below 1024px, the index becomes a wrapped row of links above the timeline; it must not become a sideways scroller.

Each day is an `article` within a `role="feed"`; each itinerary item is a nested `article`. Render day header, theme, and daily notes before the item list. Each item row is a grid with a 96px time column and a flexible card column; below 768px use a 72px time column. Preserve server item order. If only `end_time` exists, show `Until {end time}`; if neither exists, show `Flexible`, not an unlabeled dash.

Experience and meal cards use the primitive image ratios and are clickable only when detail data exists. Their body order is title → location/flexibility → description → reason → estimated cost. Omit absent lines and close the gap; never render `N/A`. Movement is a separate connector after the item it serves, with mode, duration, and cost only when supplied. Rest is a non-clickable linen block with title and description; it never receives an empty image slot.

The floating summary strip is fixed only above 768px, centered, 56px high, and padded 16px 24px. Add bottom scroll padding of 96px so it cannot cover the final item. Below 768px, the strip becomes a normal summary section before the day list. Its labels are text, not icon-only controls.

Plan snapshots replace the entire daybook only when `revision` is newer. For a newer draft, preserve the current scroll anchor by day number and item title where possible; if absent, return to the day heading. A final snapshot removes the draft badge only after `state: final` and the completion event are both observed.

## Acceptance Criteria

The canvas remains legible with one day, many days, a day containing only rest, missing dates, missing images, and long descriptions. Tabs, day headings, and items have a logical linear reading order. At 320px, time labels remain readable, cards do not become narrower than the content gutter, and the summary strip no longer occludes content. Draft and final are distinguishable without relying on border color alone because the draft badge is textual.
