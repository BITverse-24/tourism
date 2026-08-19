# Profile Review

> **Workflow state:** Profile Review · **Reads:** `docs/TRAVELER_PROFILE_SCHEMA.md` (full TravelerProfile), `docs/WEBSOCKET_CONTRACT.md` (profile snapshot/readiness/confirm)

## Purpose

A human-readable checkpoint before any planning begins. The traveler sees exactly what the system has understood, organized thematically, and can either confirm or ask for changes. Nothing is implied as booked. Blocking unknowns — things the system flags as essential before planning — prevent confirmation.

## Scene & Layout

A centered, narrower reading column (about 800px), editorial and calm:

* **Headline** centered at top, large elegant serif: "Here's what we've understood."
* **Review body** below, left-aligned, with generous vertical rhythm between groups:
  * Each thematic group (trip context, purpose and priorities, preferences, travel style, hard constraints) appears as a row separated by a faint warm divider. On the left of each row, a small muted caption names the category; the middle holds the readable value; the right may hold a subtle source/confidence hint.
  * Trip context includes the destination request (and resolved destination when present), dates or duration with flexibility, party size with notes, and budget with currency and scope — only what exists.
  * Purpose and priorities include primary purpose, secondary purposes, and success definition.
  * Preferences are listed by category, each annotated with a strength indicator (must-have / strong / nice-to-have / not interested / unknown) and its source/confidence.
  * Travel style covers pace, walking tolerance, crowd tolerance, and related attributes.
  * Hard constraints (must-visit, avoid, dietary, accessibility, accommodation needs, travel limits, hotel-change limits, budget ceiling) are shown literally and only when non-empty — never synthesized.
  * **Unknowns** are not chips; each appears as italic body text with a slim brass left border, followed by a small muted tag indicating its impact (blocking / material / minor) and its topic.
  * **Assumptions** appear as provisional chips with a dashed brass outline, each followed by a small caption giving the reason and, when confirmation is needed, a note that confirmation is needed.
* **Actions** anchored at the bottom, centered, side-by-side with comfortable gap: a brass primary "Confirm Profile" and a ghost "Request changes".

## Visual Treatment

* The divider between rows is a hairline warm line, not a card border.
* Strength indicators for preferences are textual/subtle, not colored badges requiring a legend.
* Unknowns' brass left accent echoes the draft border language elsewhere.

## States

* **Ready to confirm:** Enabled brass action when no blocking unknowns remain and the interface is not busy. Hover tints to pale brass.
* **Blocked:** When blocking unknowns exist, the confirm action is visibly disabled (dimmed, non-interactive) with the reason nearby.
* **Busy:** While awaiting acknowledgement, both actions dim and become non-interactive.

## Behavior & Interaction

* The view is driven by complete profile snapshots. A separate readiness signal names the revision and lists any blocking unknowns; the UI mirrors that signal to enable/disable confirmation.
* **Confirm:** Sends the current profile revision as confirmation with a fresh correlation identifier. If the profile is not ready or the revision is stale (the server has already moved to a newer revision), show a plain-language notice such as "The profile was just updated — please review again" and restore the latest snapshot without advancing. On accepted acknowledgement, the server records the confirmed revision and moves to planning; the resulting final plan will reference that revision.
* **Request changes:** Reveals an inline affordance to select affected topics (as small selectable chips) and an optional free-text note area. Submitting sends those topics plus free text; the server returns the workflow to Discovery and emits targeted questions plus a revised snapshot. No duplicate checkpoint is created.

## Data & Contract Binding

* Profile snapshots are complete replacements (gated by newer revision + sequence order), not patches. Confirmation must reference the exact latest revision.

## Edge Cases & Errors

* Stale revision and not-ready rejections discussed above. Handle correlation conflicts and invalid workflow state as plain-language inline notices.

## Accessibility

* All rows are plain reading text, not form controls. Contrast meets body-on-warm and dark-on-brass rules. Live region for submission feedback.
