# Discovery — Adaptive Interview

> **Workflow state:** Discovery · **Reads:** `docs/WEBSOCKET_CONTRACT.md` (discovery question/answer), `docs/TRAVELER_PROFILE_SCHEMA.md` (draft profile)

## Purpose

A calm, one-question-at-a-time conversation. The server composes each prompt; the traveler answers with choices and/or a short note. What has been said — beginning with the arrival intent — shapes what is asked next. The interview never invents questions from prompt wording, and it never asks for what is already known. Validation is server-authoritative.

## Aesthetic Intent — Luxury as Attention

Discovery should feel like a well-paced consultation, not an intake funnel. The page is quiet and well-lit; the interview column is the desk where the conversation happens; the forming-profile rail is the notepad where understanding visibly accumulates. Luxury here is in tempo, clarity, and typographic confidence.

* **Tempo:** One block at a time, with generous vertical rhythm between question blocks. Each block settles rather than snaps into view. The eye never has to search.
* **Clarity:** Prompts are large and legible, chips are editorial and evenly spaced, inputs feel like warm note paper. The right rail is an elegant glossary, not a dashboard.
* **Warmth:** Everything rests on the warm light bone background with dark ink text; brass appears only for interaction and for the subtle progress accent.

## Scene & Layout — Descriptive

A wide, centered reading canvas (at most ~1240px) with generous top margin so the page breathes:

* **Left — Interview column, the primary focus (roughly three-fifths of the width):** A vertical stack that reads like a transcript at a concierge desk. Just to the left of this column runs a subtle vertical accent line — a muted warm hairline with a brass fill whose extent grows only with server-observed sequence progress, never a percentage. The brass portion is quiet and precise. Each question block below has generous bottom margin and arrives with a soft, staggered settle (a gentle upward rise and fade), one block at a time:
  * **Prompt** at top of the block, prominent serif heading in dark ink, with comfortable line length and bottom margin, so the question itself feels considered.
  * **Choice group** beneath, a wrapping cloud of choice chips with comfortable, even gaps — inviting browsing, not rushing. Single rows breathe; multiple rows wrap gracefully without crowding.
  * **Note area when allowed** — a warm-filled, softly rounded multi-line field beneath the chips when the current question's free-text mode permits it, carrying the server-provided placeholder. Its presence and optionality follow the server, not the prompt text. When present, it has generous internal padding and readable body text.
  * **Quiet ghost Continue action** below the inputs, left-aligned beneath the question's intent, reading "Continue →". When disabled, it is visibly dimmed; when ready, it is a restrained outline with dark text.
  * **Live feedback region** just below the action, for human-readable plain-language messages when the server rejects something — never raw codes. The region is visually subtle, not a banner.

* **Right — Forming-profile rail (roughly two-fifths, sticky):** A quiet side column that remains visible while the interview scrolls. Headed by a tiny uppercase caption "Traveler Profile" with generous letter spacing, it lists what the system has understood so far, organized as editorial sections — trip context, purpose and priorities, preferences, travel style, hard constraints, unknowns, assumptions. Each section has small, muted labels and readable values. Stated information appears as warm-filled chips in dark text; inferred or defaulted information appears as transparent chips with a fine dashed brass outline; unknowns are not chips at all — they appear as italic body text with a slim brass left accent, just as on the review screen.

The page background is the lightest warm bone. Nothing competes with the interview column; the rail is subordinate by spacing and type, yet always legible.

## Material, Light & Detail — Luxury Cues

* **Chips as editorial tags:** Chips should feel like refined labels pressed onto warm paper — soft corners, comfortable padding, dark text at body size. Resting on warm fill, hovering to pale brass, selecting to an inverted dark ink with warm light text. The transition is precise and quick, never bouncy.
* **Paper, not plastic:** The note area and chip rest surfaces should read as matte bone paper, not glossy plastic. Borders are hairline warm, never heavy.
* **Accent discipline:** Brass appears in exactly three moments — the progress accent line, the hover/selected state, and the draft-to-come language elsewhere. Its scarcity is what makes it feel luxurious.
* **Whitespace as luxury:** Large gaps between question blocks, between prompt and chips, and between chips and action are the primary design material. Do not compress them.

## States — Four Free-Text Modes, Two Selection Modes

* **Free-text modes (server-driven, mutually exclusive per question):**
  * *Disabled* — no note area shown at all.
  * *Optional* — note area shown, optional alongside chips.
  * *Only if no option chosen* — note area hides when any chip is selected; typing in the note deselects chips.
  * *Required* — note area shown and required when no chip is selected (or as the server defines).
* **Selection modes:**
  * *Single-choice* — at most one chip may be selected.
  * *Multi-choice* — one or more chips may be selected unless the server explicitly allows text-only.
* **Continue enabled** only when the current combination is valid per the question's required/optional rules and the interface is not busy. Otherwise dimmed and non-interactive.
* **Busy** — while awaiting acknowledgement, all inputs dim to roughly 40% and become non-interactive. The progress accent simply holds.

## Motion — Gentle Gathering

* Each question block settles upward by about 8px while fading in, slightly staggered so the prompt appears first, then chips, then note/action. The vertical accent's brass fill grows with server-observed sequence, not with element count, so progress feels authoritative rather than cosmetic.

## Behavior & Interaction

* **Chip interaction:** Clicking toggles selection under the active mode's constraints. In "only if no option" mode, chips and free text are mutually exclusive as described.
* **Submitting:** Sends the current question's identifier along with the ordered list of chosen option identifiers (always as a list, possibly empty only when the free-text mode permits) and the free-text string, correlated with a fresh identifier so the server can treat duplicate sends idempotently.
* **Acknowledgements:** An accepted acknowledgement marked as a duplicate means the submission was already processed — hold position and show the original result rather than advancing. A rejected acknowledgement surfaces as plain-language inline text beneath the Continue action: stale question ("This question is no longer current — here's the one to answer"), invalid combination, or disallowed notes — each calm, each preserving entered text for correction. When the server names the current question identifier, replace the UI with that question.
* **Right rail:** Updates only by complete profile snapshots — replace entirely when a newer revision arrives in sequence order, not by patching.

## Data & Contract Binding

* Driven by server question events (prompt, selection mode, required flag, options, free-text mode and placeholder) and by draft profile snapshots. Answers are validated server-side; the client does not invent rules from prompt wording.

## Edge Cases & Errors — Poise

* Handle stale question, invalid selection, disallowed free text, missing/expired session, and correlation conflicts as quiet inline notices, never modals or raw codes. Duplicate sends with identical payloads are idempotent and safe.

## Accessibility

* The chip group is announced as a single group labelled by the question prompt; each chip announces its pressed state. The feedback region below Continue is a polite live region. The two-column layout retains logical reading order when linearized.

## Implementation Contract — Question State Machine

Use a two-column `main.discovery` inside the global content canvas. The interview column is `minmax(0, 7fr)` and the rail is `minmax(280px, 5fr)` with a 64px gutter. The rail is sticky at `top: 104px`, with `max-height: calc(100svh - 128px)` and its own overflow. Below 1200px it may reduce to 280px; below 1024px render it after the interview as a normal section and never leave it sticky.

The active question is the only editable question. Render `question.prompt` as the fieldset legend or equivalent programmatic label. Render options in server order. A selected option is `aria-pressed="true"`; single-select uses a radio-like visual but remains a button group so pressed state is explicit. Do not infer `required` or free-text rules from prompt wording.

Implement the free-text modes literally:

| `free_text_mode` | Field visibility | Submit rule |
|---|---|---|
| `disabled` | Hidden and absent from the accessibility tree | Selected options only |
| `optional` | Visible | Options and/or text according to `required` |
| `only_if_no_option` | Visible | Never submit options and non-empty text together |
| `required` | Visible | Require text when the server-defined combination requires it |

When text is entered in `only_if_no_option`, clear selected options immediately and explain the mutual exclusion with a caption-sized note. When an option is selected, clear text only in that mode; for other modes preserve text. `selected_option_ids` is always submitted as an ordered array, even for single choice.

The Continue button is 44px high, left aligned with the question text, and always labelled `Continue →`. Its enabled state is a local affordance only; the server remains authoritative. Generate one fresh `command_id` per intentional submit. On accepted acknowledgement, lock controls until the next question or profile event arrives. On `deduplicated: true`, do not append or replay the question. On stale-question rejection, replace the active question only after the supplied recovery/current-question event is received.

The profile rail is a read-only complete snapshot. Render sections in this order: Trip context, Purpose & priorities, Preferences, Travel style, Hard constraints, Unknowns, Assumptions. Omit empty sections. Stated values use filled chips; inferred/defaulted values use dashed chips and a text explanation on focus/hover. Unknowns are full-width text blocks with topic and impact text; never hide `blocking` behind color alone.

## Acceptance Criteria

The screen renders a question with zero options, a text-only question, long option descriptions, and a profile containing only unknowns. The answer payload matches the visible state exactly. A newer profile snapshot replaces the rail atomically without changing the active answer. At 320px, options become a one-column stack, the rail follows the question, and every chip remains at least 44px high. The prompt, options, textarea, Continue, and feedback are navigable in that order.
