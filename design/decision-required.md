# Decision Required

> **Workflow state:** Decision Required · **Reads:** `docs/WEBSOCKET_CONTRACT.md` (decision request/response)

## Purpose

When the optimizer encounters a material trade-off or no admissible candidate satisfies all constraints, it does not choose silently. It asks the traveler to guide the plan with a typed, single-choice checkpoint.

## Scene & Layout

A centered, 800px-wide reading column with airy spacing, on the light warm background (or with a deep-ink card if the consultation ink is retained — whichever preserves contrast):

* **Prompt** at top, centered, large heading: the server's question in natural language.
* **Reason caption** just below, small muted uppercase: a plain-language hint about why a choice is needed ("A close trade-off — your preference will guide the plan" vs "No admissible plan fits all constraints — choose how to relax one").
* **Options stack** — a vertical list of generous, warm-filled selectable cards, each spanning the column width:
  * Each option shows its label as a medium heading and its trade-off explanation as body text beneath. The visual is similar to a warm card that hovers to pale brass and inverts to dark ink with light text when selected.
  * Options are single-select; only one can be pressed at a time.
* **Action** centered below the stack: a brass primary "Continue →", enabled only when an option is selected and the interface is not busy.

## Visual Treatment

* No hidden reasoning or scores are shown — the trade-off text supplied by the server is the only detail per option.
* Selected state is clearly inverted (dark surface, light text), not just an outline.

## States

* **No selection:** Action disabled (visibly dimmed, non-interactive).
* **Selected:** Card shows selected inversion; action enabled with micro hover.
* **Busy:** While awaiting acknowledgement, selection and action dim and lock.

## Behavior & Interaction

* Selecting an option sets pressed state (single-choice). Continue sends that option's identifier together with the decision's identifier using a fresh correlation identifier. Stale decision identifiers or unknown option identifiers are rejected — show a calm notice such as "That choice is no longer active — the plan has moved on." Duplicate submissions with the same correlation identifier are idempotent; the same identifier with a different option is a conflict.
* On accepted acknowledgement, the workflow returns to Planning and proceeds toward a final plan.

## Data & Contract Binding

* Driven by a decision-request event (decision identifier, profile revision, reason, prompt, list of options each with label and trade-off). The reason determines the caption wording. No internal ranking or provider data is present.

## Edge Cases & Errors

* Handle stale/unknown choice as inline plain-language text; do not advance. Preserve idempotency.

## Accessibility

* The options list is announced as a single-choice group. Each option announces its pressed state and its trade-off text.
