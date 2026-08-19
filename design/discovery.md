# Discovery — Adaptive Interview

> **Workflow state:** Discovery · **Reads:** `docs/WEBSOCKET_CONTRACT.md` (discovery question/answer) and `docs/TRAVELER_PROFILE_SCHEMA.md` (draft profile)

## Purpose

A calm, adaptive interview. The server asks one question at a time; the traveler answers with choices and/or a note. Each next question is chosen based on the arrival intent and all prior answers — the UI never invents questions from prompt text alone. Validation is server-authoritative.

## Scene & Layout

A two-column reading layout within the centered canvas, with generous vertical rhythm:

* **Left — Interview column (about 60%):** The primary focus. A subtle vertical accent line sits just to the left of this column (a muted warm line with a brass fill that grows with progress tied to server sequencing, not merely element count). Each question block has generous bottom margin and settles in with a soft staggered rise and fade.
  * Question prompt at the top, prominent heading, dark ink.
  * Beneath it, a wrapping group of choice chips with comfortable gaps.
  * Beneath that, a warm-filled multi-line note area when the current question allows free text — its presence and optionality are dictated by the server, not by prompt wording. When present it shows the server-provided placeholder.
  * A quiet ghost-style Continue action ("Continue →") aligned beneath the inputs. When disabled, it is visibly dimmed.
  * A polite live region just below the action for human-readable errors.
* **Right — Forming-profile rail (about 40%):** A sticky side column that stays visible while the interview scrolls. Headed by a small uppercase caption "Traveler Profile", it lists what the system has understood so far, organized by trip context, purpose/priorities, preferences, travel style, hard constraints, unknowns, and assumptions. Chips and rows use the primitive treatments described in the README — stated information appears warm-filled, inferred/defaulted information appears as transparent chips with a dashed brass outline and a tooltip distinction. Unknowns are not chips; they appear as italic reading text with a slim brass left accent.

The overall page has the warm light background and ample top margin to feel unhurried.

## Visual Treatment

* The left accent line is understated — never a progress bar with a percentage. The brass fill is the only color on it.
* Choice chips use the ChoiceChip visual language: warm resting, pale brass hover, dark ink selected.
* The rail has no heavy border; its presence is communicated by spacing and the "Traveler Profile" caption.

## States

* **Free-text modes (server-driven, four possibilities):**
  * *Disabled:* No note area is shown.
  * *Optional:* Note area shown, optional.
  * *Only if no option chosen:* Note area hides when any chip is selected; typing in the note deselects chips.
  * *Required:* Note area shown and required when no chip is selected (or as the server defines).
* **Selection modes:**
  * *Single-choice:* At most one chip may be selected.
  * *Multi-choice:* One or more chips may be selected unless the server explicitly allows text-only.
* **Continue action:** Enabled only when the combination is valid per the current question's rules and the interface is not busy. Otherwise dimmed and non-interactive.
* **Busy:** While awaiting acknowledgement, all inputs dim and become non-interactive.

## Behavior & Interaction

* Chip interaction: clicking toggles selection (with single-choice enforcing at most one). In "only if no option" mode, interaction between chips and free text is mutually exclusive as described above.
* Submitting sends the current question's identifier along with the set of chosen option identifiers (always as a list, possibly empty only when free-text mode permits) and the free-text string, with a fresh correlation identifier.
* An accepted acknowledgement that is marked as a duplicate means the submission was already processed — do not advance; show the original result.
* A rejected acknowledgement is never shown as a raw code. Typical human messages: stale question ("This question is no longer current — here's the one to answer"), invalid combination ("That combination isn't allowed — try one option or add a note"), disallowed notes ("Notes aren't needed for this one"). Replace the UI with the current question when the server indicates the current identifier.
* The right rail updates only by complete profile snapshots — replace entirely, don't patch — gated by newer revision and sequenced ordering. The rail reflects the draft profile state.

## Data & Contract Binding

* Driven by discovery-question events (prompt, selection mode, required flag, options with labels/descriptions, free-text mode and placeholder) and by draft profile snapshots. Answers are not trusted client-side; the server validates.

## Edge Cases & Errors

* Handle stale question, invalid selection, disallowed free text, missing/expired session, and correlation conflicts — each as plain-language inline text, never as codes. Duplicate submissions with identical payloads are idempotent.

## Accessibility

* The chip group is announced as a single group labelled by the question prompt. Each chip announces its pressed state. The error region beneath the Continue action is a polite live region.
