# Day / City Canvas — The Main Itinerary

> **Workflow state:** Plan Ready · **Reads:** `docs/FINAL_TRIP_PLAN_SCHEMA.md` (days and items), `docs/WEBSOCKET_CONTRACT.md` (plan snapshot state)

## Purpose

The ordered, day-by-day reading of the finalized (or draft) itinerary — the core artifact travelers use on the trip.

## Scene & Layout

A wide centered canvas (at most ~1240px) organized as a two-column reading layout:

* **Left — Day tabs (narrow, about one-sixth):** A sticky vertical list of days that stays visible while the timeline scrolls. Each entry is a small caption, such as "Day 2 · Kyoto" or the day's theme when present. The active day is indicated by heavier weight and brass text, not by a filled background. A faint warm vertical divider separates the tabs from the timeline.
* **Right — Timeline canvas (wide, remaining space), announced as a feed:**
  * **Day header** at top of each day, medium heading with the day number, place, and optional date, with generous bottom margin.
  * **Theme and notes** beneath: the day's theme in italic body, and any daily notes as softer body text — both with airy spacing.
  * **Timed item rows:** Each item appears as a row with two parts: a narrow left column showing the time (or a simple dash when no specific time applies, with an optional end time), in small muted caption; and a wider right column holding the experience/meal card (see primitives). Cards include the title,Readable description, optional location line, optional estimated cost, optional flexibility tag (fixed / moveable / optional), and optional reason line tying the item to the traveler profile.
  * **Movement connectors:** When travel between items affects timing, cost, or feasibility, a subtle horizontal connector appears just below the relevant item — aligned with the card column, showing a small line icon plus short text such as mode and approximate duration (and cost when relevant), with a faint vertical line and comfortable padding.
  * **Rest periods:** Valid itinerary entries, not empty gaps. Shown as a warm-filled, flat block of comfortable height, centered muted text such as "Rest — no plans until late afternoon" with the associated flexibility when present, and no imagery.
  * **Floating summary strip:** A softly lifted, warm, translucent pill fixed near the bottom center of the viewport, with a faint border and small gap between items, summarizing the traveler profile reference, allocation sketch, and budget position in small body/caption.

## Visual Treatment

* The timeline is rhythmic and airy: generous gaps between items, faint dividers only where they aid scanning, and no heavy card chrome.
* Movement connectors share the muted ink style, never brass, to stay subordinate.
* Rest blocks are visually quiet by design.

## States

* **Final vs draft:** Final content uses a solid warm border; draft content (when the server has only a draft snapshot) uses the dashed brass border and carries a small floating badge offset outside the card ("Draft — not yet confirmed") on a warm surface with a brass outline.
* **Tabs:** Idle tabs are muted caption; active tab is brass and slightly bolder. Sticky behavior keeps the active tab visible without covering card content.
* **Busy:** No inline busy on the timeline itself; the floating strip and rail simply reflect the latest final snapshot.

## Behavior & Interaction

* Day tabs scroll the timeline to the anchored day with a calm settle motion. The timeline reflects the ordered days from the final plan, each day ordered by its day number (and date when present), agreeing with the route and allocations in the overview.
* Ideas within a day are ordered and must not imply impossible overlaps; times are shown exactly as provided or omitted when flexible.
* Plan snapshots are complete replacements — the UI replaces days only when a newer revision arrives in sequence order.

## Data & Contract Binding

* Each day's place, theme, and daily notes map directly. Items map to four types: experience, meal, rest, movement. Flexibility (fixed/moveable/optional), reason (profile-based justification), and movement details (mode/duration) are shown exactly as provided.

## Edge Cases & Errors

* A day may intentionally contain mostly rest and flexibility — render it as designed, not as an empty slot to "fill." Missing imagery inside experience cards falls back to a warm skeleton. Draft badges never use the word "provisional."

## Accessibility

* Day tabs indicate selection. The timeline is a feed; each item is an article. Times are real time elements when present. Badges and connectors have text equivalents.
