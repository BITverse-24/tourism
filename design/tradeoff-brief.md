# Tradeoff Brief — A Calmer Version of Your Trip

> **Workflow state:** Plan Ready (excerpt, only when tradeoffs are material) · **Reads:** `docs/FINAL_TRIP_PLAN_SCHEMA.md` (tradeoffs, fit, cost, assumptions/warnings/unresolved)

## Purpose

A humane pause before the full itinerary — a brief that explains what was gained, what was given up, and why the plan chose as it did. It is not a disclaimer and not a marketing page; it is a calm letter about judgment, written in the traveler's terms so the traveler can read the plan with trust rather than with questions.

## Aesthetic Intent — Letter of Judgment

Tradeoff Brief should read like a handwritten note from the concierge left on the itinerary cover before the traveler opens it: measured, honest, beautifully typeset. The luxury is in candor delivered with typographic grace — in stating the compromise plainly and setting it beautifully.

* **Candor as elegance:** Each trade-off states both sides clearly — the comfort gained and the cost paid — with a short, human "why." The honesty itself feels premium, because it implies judgment, not automation.
* **Palette of restraint:** Every card is warm bone with dark ink text; the only subtle contrast is the muted caption for scope/budget context. Never use red for loss or green for gain — gains and costs share the same ink, distinguished only by prose and placement.
* **Editorial breathing:** Large top margin, cards with generous internal padding, and a tiny caption offset give the brief the pacing of a letter, not a data table. Whitespace between card families matters as much as the text within them.

## Scene & Layout — Descriptive

A centered, ~800px reading column on the warm light bone, with generous top margin so the brief feels like a new chapter rather than a continuation of consultation:

* **Title and summary** at the top, centered, with airy, deliberate separation between them: the plan's title as a serif heading in dark ink, set with generous letter spacing and comfortable line length; and the plan's summary as centered, muted body text (deliberately narrower than the title's line length so the summary reads like a dedication or epigraph). Both have generous bottom margin before the first card appears, so the title and summary are given a moment.

* **Tradeoffs stack** — a vertical list of warm-filled cards with soft corners, each with comfortable internal padding (the card is the unit of thought — one trade-off, one card). Within each card:
  * The main explanation spans the majority of the width (roughly three-quarters), set as readable body text that states what was gained, what was given up, and why that trade was chosen. Sentence case, natural language, never shorthand. The line length is kept readable and the text sits on warm bone with dark ink, not inside a tinted box.
  * A small, muted caption on the opposite side (right-aligned when Latin, gently mono-spaced when numeric) carries the relevant scope/budget context — for example, whether the estimate covers local transport and experiences, or the budget position relative to target. This caption is visually subordinate: lighter weight, smaller size, softer ink, right-aligned so it reads as an aside.
  * Never use color to imply good or bad; the distinction lives in prose and subtle placement, not in red/green washes or iconography.

* **Supporting notes** rendered with the same brass family resemblance as unknowns elsewhere, beneath the tradeoffs with comfortable separation: key assumptions, warnings, and unresolved details each appear as warm cards with a slim brass left accent, comfortably padded, with italic body where the note is interpretive and small captions for provenance. The gap between tradeoffs cards and these note cards is larger than the gap within each family, so the families are distinct without needing heavy headings.

* **Action** centered below with clear separation and generous white space before the itinerary begins: a brass primary labeled "View your itinerary →" with comfortable horizontal padding, soft corners, and a calm arrow. It rests on ample negative space so the brief feels complete before the traveler moves on.

## Material, Light & Detail — Luxury Cues

* **Paper unity:** All cards share the same warm bone stock and soft double shadow (a tighter faint shadow plus a broader diffuse one), so they read as sheets of the same paper suspended slightly over the page. Their only variety is internal padding and the slender left brass accent — this limited stock reads as a deliberate paper choice, not a component library.
* **Left accent as signature:** The slender brass accent on assumption/warning cards echoes the accent used for unknowns in Discovery and Profile Review — a quiet visual rhyme that signals "this too deserves reading" without adding a new color.
* **Caption nuance:** Scope/budget captions are set in tiny uppercase with generous tracking and right alignment, creating a polite marginal note rather than a second column of data. Numeric scope details in mono feel like a ledger entry in the margin.

## States

* **No material tradeoffs:** This brief is not shown at all; the journey proceeds directly to the trip overview with no placeholder or empty state apologizing. Silence is the design.
* **With tradeoffs:** The stack grows naturally with the content-settle motion, one card after another. No pagination, no carousel, no "read more" truncation — the brief is always fully legible.

## Motion — Letter Unfolding

* Title and summary settle first with the content-settle rise+fade, then tradeoff cards arrive one by one slightly staggered so reading order is guided, then the final action settles last, inviting the scroll into the overview. The pour is gentle; no card scales or pops.

## Behavior & Interaction

* This screen is a pure reading of a finalized plan — no command to the server is sent from it. Content maps directly from the final plan's tradeoffs, fit explanation, cost scope/budget position/caveats, assumptions, warnings, and unresolved details. Nothing is synthesized or editorialized beyond typesetting for legibility.
* The action simply anchors or scrolls to the overview within the already-finalized plan; it is the same page's next chapter.

## Data & Contract Binding

* Shown only after a finalized plan snapshot has arrived. Title, summary, and each card's text correspond directly to the final plan's lists. Do not interpret or reword beyond humane line breaks.

## Accessibility

* Headings and card texts follow natural reading order; captions remain captions (not promoted to body). No meaning is ever conveyed by color alone; all distinctions are also textual and positional, so monochrome reading remains legible.

## Edge Cases — Completeness Without Clutter

* If assumptions, warnings, or unresolved details are empty, their section simply does not appear — whitespace above the action expands gracefully to preserve balance. Empty states never feel like missing data or as apology blocks.

## Luxury Priority

* The priority is typographic generosity: wide margins around the title/summary, generous internal padding within cards, softer line length for the summary, and the tiny right-aligned caption's restraint. The traveler should feel that someone chose words carefully and set them beautifully.

## Implementation Contract — Editorial Reading Column

Use `main.tradeoff-brief` with `width: min(800px, calc(100vw - 48px))`, 96px top padding, and 128px bottom padding. The title is centered and uses `display-lg`; summary is centered, `body-md`, and constrained to 560px. Tradeoff cards use a one-column grid with 24px gaps, 32px padding, and a minimum 120px height. Keep the prose column at approximately 72% of the card width; the scope caption occupies the remaining space and aligns top-right. At 768px and below, stack the caption below the prose and left-align it.

Each tradeoff card renders the server-provided tradeoff text as one readable paragraph. Do not split, summarize, or add headings such as “Gain” and “Cost” unless the contract later supplies separate fields. Use `--voyager-ink-3` for scope/budget captions and `numeric` for amounts. Supporting notes render after all tradeoff cards in this order: assumptions, warnings, unresolved details. Each note includes a textual heading, server text, and a 4px brass left accent. Omit an entire note family when its list is empty.

Omit the page when `tradeoffs.length === 0`; do not render a blank shell. `View your itinerary →` is an in-page anchor to the Trip Overview heading, not a server command. Keep the anchor target visible and focusable after scroll. If the plan is draft, do not show this screen; draft content belongs on consultation/day surfaces with the draft badge.

## Acceptance Criteria

No gain/loss meaning depends on color. Long prose wraps naturally, one tradeoff keeps the same editorial spacing, and many notes do not create a second navigation system. At 320px, captions stack without truncation and the action is full width. The screen can render assumptions, warnings, and unresolved details independently absent.
