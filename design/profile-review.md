# Profile Review

> **Workflow state:** Profile Review · **Reads:** `docs/TRAVELER_PROFILE_SCHEMA.md` (full TravelerProfile), `docs/WEBSOCKET_CONTRACT.md` (profile snapshot / readiness / confirm)

## Purpose

A human-readable checkpoint before any design work begins. The traveler sees exactly what has been understood — organized editorially, written in their words where possible — and can confirm or ask for changes. Nothing is implied as booked; nothing is silently assumed. If essential information is still missing (blocking unknowns), the interface makes that clear and prevents confirmation with calm authority rather than an error wall.

## Aesthetic Intent — Editorial Proof, Not Form Review

Profile Review should feel like a beautifully typeset proof handed across the desk: centered, measured, and worthy of a signature. The luxury is in typographic hierarchy, perfect alignment, and the confidence to show empty states plainly.

* **Centered calm:** A narrower, focused reading column that feels like a letter, not a table. Ample top margin, centered headline, generous breathing room between groups, and consistent faint dividers that guide the eye downward without boxing anything in.
* **Honesty as elegance:** Hard constraints are shown literally, only when non-empty. Preferences carry their strength and source visibly. Unknowns and assumptions are given their own quiet treatments rather than being hidden or footnoted.
* **Signature moment:** The pair of actions at the bottom — a solid brass primary and a restrained ghost alternative — should read as "approve proof vs request edits," not as a funnel.

## Scene & Layout — Descriptive

A centered, narrower reading column (ideally ~800px) with editorial proportions:

* **Headline** centered at top, large elegant serif with generous margin beneath: "Here's what we've understood."

* **Review body** below, deliberately left-aligned within the centered column, with generous vertical rhythm between groups:
  * **Trip context** — destination request (and resolved destination when present), dates or duration with flexibility phrasing, party size with notes, budget with currency and scope — only what exists, each row separated by a faint warm hairline. Within each row: a small muted uppercase caption on the left naming the category, readable values in the middle, and where helpful a secondary hint on the right indicating source or confidence.
  * **Purpose and priorities** — primary purpose, secondary purposes, and success definition in clear, short lines.
  * **Preferences by category** — each preference shown with a subtle strength indicator (must-have / strong / nice-to-have / not interested / unknown) and its provenance (explicitly stated vs inferred/defaulted). The strength reads as editorial text, not a colored badge.
  * **Travel style** — pace, walking tolerance, crowd tolerance, and related attributes as short, scannable phrases.
  * **Hard constraints** (must-visit, avoid, dietary, accessibility, accommodation needs, travel limits, hotel-change limits, budget ceiling) shown literally only when non-empty — never synthesized or padded to fill space. Empty groups simply do not appear.
  * **Unknowns** — not chips. Each appears as italic body text with a slim brass left accent, followed on the same line or just beneath by a tiny muted tag indicating impact (blocking / material / minor) and its topic. Blocking unknowns look quietly urgent (the accent is steady, the typography slightly firmer) but never alarming.
  * **Assumptions** — provisional chips with a fine dashed brass outline, each followed by a small muted caption giving the reason and, when confirmation is needed, a brief "confirmation needed" note. The outline's delicacy signals "assumed, awaiting your confirmation."

* **Actions** anchored at the bottom, centered, side-by-side with comfortable gap and ample top margin: a brass primary "Confirm Profile" and a ghost outline "Request changes." The primary's hover tints to pale brass; its busy state dims gracefully.

## Material, Light & Detail — Luxury Cues

* **Paper editorial:** The column should feel like a fine proof on warm bone stock, with hairline warm dividers like faint rules on good paper. Nothing is carded unnecessarily — the beauty is in the type and spacing.
* **Strength as prose:** Preference strengths are set as calm textual indicators (e.g., "strong · stated" or "must-have · inferred") rather than pill badges requiring a legend.
* **Brass accents with intent:** Used for two purposes only here — the slim left accent on unknowns and the dashed outline of assumptions, plus the primary action. Their scarcity keeps them meaningful.
* **Negative space:** The generous gaps between groups, between headline and first row, and above the actions are as important as the text itself.

## States

* **Ready to confirm:** No blocking unknowns and not busy — primary action is fully interactive and shows the gentle hover tint.
* **Blocked:** When blocking unknowns exist, the primary action is visibly disabled (dimmed, non-interactive) with the remaining questions clearly visible above; the design does not scold, it simply waits.
* **Busy:** While awaiting acknowledgement, both actions dim to about 40% and become non-interactive, but all review text remains fully readable. No spinner overlays the proof.

## Motion — Considered, Not Cheerful

* Rows settle in with a soft staggered rise and fade, like lines being laid onto a proof. The headline settles first, then groups, then actions. No bounce or elastic feel.

## Behavior & Interaction

* The view is driven by complete profile snapshots; a separate readiness signal names the current revision and lists any blocking unknowns, and the UI's enabled state mirrors that signal.
* **Confirm:** Submits the current profile revision as confirmation with a fresh correlation identifier. If the profile is not ready or the revision is stale (a newer revision already exists), the server will respond accordingly — show a quiet, plain-language notice such as "The profile was just updated — please review the latest" and restore the current snapshot without advancing. On acceptance, the server records the confirmed revision and moves to planning; the eventual final plan will reference that revision.
* **Request changes:** Reveals a calm inline affordance to select affected topics (as small selectable chips under a soft label) plus an optional note area. Submitting sends those topics and the note; the server returns the workflow to Discovery and emits targeted questions plus a revised snapshot. No duplicate checkpoint is created.

## Data & Contract Binding

* Snapshots are complete replacements gated by newer revision and sequence order — replace, don't patch. Confirmation must reference the exact latest revision; stale revisions are politely handled.

## Edge Cases & Errors — Quiet Authority

* Stale revision and not-ready responses are shown inline as plain language beneath the actions, preserving all review text. Correlation conflicts and invalid workflow states are similarly handled as gentle inline notices.

## Accessibility

* All rows are plain reading text, not form controls, and remain legible at high contrast. Actions have clear accessible names; submission feedback lives in a polite live region. The proof's divider lines are decorative, not semantic.

## Implementation Contract — Proof Layout and Edit Path

Use a centered `main.profile-review` with `width: min(800px, calc(100vw - 48px))`. The headline is centered; every data group below it is left aligned. Use a semantic `section` per non-empty profile group and a two-column row inside each group: a 160px caption column and a flexible value column. At 768px and below, collapse each row to caption above value with an 8px gap. Do not render an empty placeholder row.

Render values in this order: destination request/resolved destination, dates or duration, date flexibility, party size/notes, budget and scope, purpose/priorities, preferences, travel style, hard constraints, unknowns, assumptions. Dates are displayed in the traveler’s locale; the contract date remains the source of truth. Budget must include amount, currency, and target/ceiling/flexible scope when available.

Preferences are text rows, not colored badges. Format each as `{category} — {strength} · {source}` and append notes only when present. Source text is `stated`, `inferred`, or `defaulted`; inferred/defaulted entries also show confidence when supplied. Hard constraints are rendered literally and omitted when their list is empty. Never promote a preference to a constraint during formatting.

Unknown blocks use a 4px brass left border, 16px left padding, and 16px bottom margin. Each includes topic, impact (`blocking`, `material`, or `minor`), and description. Assumptions use a dashed brass outline around the value; reason and `confirmation needed` are text below, not tooltip-only content. A blocking unknown disables `Confirm Profile` even if a stale local readiness flag says ready.

The action row is a flex row with a 24px gap, 48px top margin, and 32px bottom margin. `Confirm Profile` sends the latest `profile_revision`; `Request changes` reveals an inline editor below the row rather than a modal. The editor contains a labelled multi-select topic group from the current profile’s unknown/material topics, an optional textarea, `Send changes →`, and `Cancel`. It must not expose raw profile fields for direct editing. On successful request, wait for the next `discovery.question` before leaving this screen.

## Acceptance Criteria

Confirm is disabled when any `blocking` unknown exists, regardless of color or text. A stale revision leaves all proof content visible and asks the traveler to review the newer snapshot. If a snapshot removes a group, the surrounding rhythm closes naturally. At 320px, captions stack above values and the two actions stack full width. Focus enters the request-changes editor only when it opens and returns to `Request changes` when it closes.
