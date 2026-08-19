# Decision Required

> **Workflow state:** Decision Required · **Reads:** `docs/WEBSOCKET_CONTRACT.md` (decision request / response)

## Purpose

A respectful pause where the system does not presume. When the optimizer meets a material trade-off or finds no admissible candidate that satisfies every constraint, it asks the traveler to guide the decision with a single, well-framed choice. The screen turns a technical optimization moment into a calm, editorial decision.

## Aesthetic Intent — Curated Choice

Decision Required should feel like a private tasting of two futures laid on the table — each described with clarity, one chosen. The luxury is in curation and language: fewer options, better words, absolute clarity.

* **Curation as service:** Two or three options only, each written with poise (label + trade-off explanation). The page never feels like a survey; it feels like counsel.
* **Editorial cards:** Options read like refined invitations, not buttons. Their beauty carries the weight of the decision without adding visual anxiety.
* **Quiet celebration of choice:** The selected state is an elegant inversion, not a loud checkmark.

## Scene & Layout — Descriptive

A centered, ~800px reading column on the warm light bone, with generous top and bottom breathing room:

* **Prompt** at top, centered, large serif heading in dark ink — the server's question in natural language, set with generous line spacing so it reads as a sentence, not a label. The prompt spans comfortably, with balanced margins.
* **Reason caption** just below, tiny uppercase muted caption, centered: plain language framing for why a choice is needed. Two gentle phrasings cover the cases: when it is a close trade-off ("A close trade-off — your preference will guide the plan") and when no admissible plan fits ("No admissible plan fits all constraints — choose how to relax one"). The caption is quiet enough to not compete with the prompt.
* **Options stack** — a vertical list of generous, warm-filled selectable cards, each spanning the column width with soft corners, comfortable padding, and subtle lift. Within each card:
  * Top left, a medium serif heading: the option's label.
  * Beneath it, muted body text: the trade-off explanation, set with comfortable line length and soft ink color, so the cost of choosing is as legible as the benefit.
  * The card's opposite side carries the same trade-off phrasing again in an even smaller muted mono/caption alignment, giving a whisper of detail without repeating body. Some implementations may simply show label + body and rely on body for the trade-off — the decision is whether to echo trade-off text; never show hidden reasoning or scores.
  * Cards are single-select: only one can be pressed at a time, and the pressed state is clearly inverted — dark ink surface with warm light text, the soft lift deepening slightly, while unselected cards remain warm on light bone.
* **Action** centered below the stack with clear separation: a brass primary labeled "Continue →", comfortably large with generous horizontal padding and soft corners. Enabled only when an option is selected and the interface is not busy; otherwise visibly dimmed and non-interactive, with only the arrow hinting at forward motion.

## Material, Light & Detail — Luxury Cues

* **Card stock:** Cards rest on the light bone with a double soft shadow (tight + diffuse) that suggests thick paper suspended over the page. Warm fill on rest, pale brass on hover — never a brightness spike or colored glow.
* **Inverted selection as tailoring:** The selected dark ink surface should read as a precisely tailored inlay, not as a pressed state. Light text on dark remains warm bone, not stark white.
* **Typography refinement:** Labels in medium serif feel considered; trade-off body in sans is quiet and humane. The tiny reason caption's generous tracking gives the whole composition air.

## States

* **No selection:** Cards at rest, action dimmed. The page simply waits — no nudge or shake.
* **Selected:** Chosen card shows the inverted dark surface and slightly deeper lift; action becomes fully interactive with gentle hover to pale brass.
* **Busy:** While awaiting acknowledgement, the selected card and action dim to ~40% and lock; unselected cards also dim. No spinner overlays the choice.

## Motion — Deliberate & Brief

* Cards settle with the content-settle ease, slightly staggered so options appear one after another without hurry. Hover and selection use the quick micro ease. Starting the continue action fades the stack gently — the pour ease — as planning resumes.

## Behavior & Interaction

* Selecting an option toggles pressed state under single-choice logic; only one may be pressed. Continue submits that option's identifier together with the decision's identifier, correlated with a fresh identifier so duplicate sends are safe. Submitting a stale decision identifier or an unknown option identifier produces a calm inline notice such as "That choice is no longer active — the plan has moved on," preserving the options so the traveler can re-choose. Duplicate submissions with the same correlation identifier are idempotent; the same identifier with a different option is treated as a conflict and shown plainly.
* On accepted acknowledgement, the workflow returns to Planning and proceeds toward a finalized plan.

## Data & Contract Binding

* Driven by a decision-request event carrying a decision identifier, the profile revision, a reason, a prompt, and the list of options each with label and trade-off text. The reason determines the caption phrasing; no internal ranking or provider payloads exist in this payload.

## Edge Cases & Errors — Composure

* Handle stale or unknown choice as quiet inline text beneath the action, not a modal. Preserve selections until the traveler changes them. Keep the palette calm.

## Accessibility

* The options list is announced as a single-choice group, each option announcing its pressed state and its trade-off text. The action has a clear accessible name; feedback lives in a polite live region. Focus order is prompt → options → action.

## Implementation Contract — Typed Choice

Use `main.decision-required` with `width: min(800px, calc(100vw - 48px))`, 96px top padding, and 128px bottom padding. The prompt is the only `h1`. The reason caption is below it with 32px bottom margin. Options are a vertical stack with 16px gaps; each option is a button-like article with 24px padding, a minimum 96px height, and a full-width hit area. The option label uses `heading-md`; `tradeoff` uses `body-md` below it with 8px spacing. Do not repeat tradeoff copy in a separate right column unless the payload later supplies a distinct explicit scope field; never manufacture a score or comparison.

Reason text maps exactly: `material_tradeoff` → `A close trade-off — your preference will guide the plan`; `no_admissible_plan` → `No admissible plan fits all constraints — choose how to relax one`. For an unrecognized future reason, use the server’s human-readable reason text as a caption; do not silently pick a known phrase.

Options use `aria-pressed`, never a checkbox glyph. Selected state is `--voyager-ink-1` background with `--voyager-light-ink` text and a 1px brass outer border; hover on unselected is a bone-to-pale-brass tint. Continue is disabled until one option is selected. Submit `{decision_id, option_id}` with a fresh `command_id`, lock all options after accepted acknowledgement, and wait for `planning.status` or the next workflow event before leaving. Preserve the selected option on rejection.

## Acceptance Criteria

Render 2–3 options without changing stack geometry; long labels and long tradeoff text wrap without horizontal scroll. At 320px, the prompt remains readable, options stay full width, and Continue is full width. Stale decision or option errors are inline beneath Continue and never clear the choice. The screen never exposes optimizer ranking or a “recommended” badge unless the server explicitly supplies traveler-safe copy for it.
