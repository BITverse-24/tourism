# Voyager — Design System · Base Knowledge

### "Quiet Luxury, Liquid Intelligence" · v1.4 Modular Library

> **How to use this library:** This README is the only base knowledge you need. It defines the visual language, spatial rules, motion principles, shell, primitive components, lifecycle, accessibility, transport and architecture. Each screen file under `/design` then describes *one* screen in detail, assuming you have read this README. Do not re-define tokens in screen files.
>
> **Contracts are canonical for data:** The shapes of the traveler profile, final plan, and WebSocket messages are defined outside this directory in `docs/TRAVELER_PROFILE_SCHEMA.md`, `docs/FINAL_TRIP_PLAN_SCHEMA.md`, `docs/WEBSOCKET_CONTRACT.md`, and `docs/AGENT_ARCHITECTURE.md`. This `/design` directory defines only *how those shapes look and behave*. If a screen description ever conflicts with `docs/`, `docs/` wins. The legacy single-file `DESIGN.md` at the repo root is frozen and superseded by this library.
>
> **Tokens are frozen:** Palette, spacing, typography, motion intent, and elevation described below are final. No screen may invent new colors, radii, shadows, or type styles.

---

## 0. Philosophy & Implementation Rules

**What Voyager is:** A private travel consultancy powered by three reasoning agents — Discovery/Profile, Candidate Design, and Narrative/Explanation — coordinated by a deterministic workflow orchestrator across ten logical stages. The four measurement stages (mobility, cost, simulation, optimization) and the experience knowledge base are deterministic engines/retrieval, not agents. The interface must feel like a quiet hotel concierge desk: unhurried, precise, warm — never a dashboard, form-builder, or booking site.

**Rules for the implementing agent:**

1. **Restraint as luxury:** Use only the tokens below. Do not invent new margins, colors, shadows, or type sizes.
2. **Invisible machinery:** Never surface raw identifiers, provider responses, internal scores, chain-of-thought, or percentage progress. All status text comes from traveler-safe server summaries, not internals.
3. **Honesty over illusion:** Content that comes from a draft plan must visibly read as draft — a dashed brass border and a small "Draft — not yet confirmed" badge. Only a finalized plan with a workflow completion signal is visually locked.
4. **Desktop-first canvas:** Design for a minimum width of 1024px. The content canvas is centered, at most 1240px wide, conceptually 12 columns. Below 1024px, preserve order and avoid horizontal scroll; hide the right rail entirely below 1200px.
5. **No emoji:** Use single-weight, thin stroke line icons only; never emoji, never duotone.
6. **Contracts win:** Data shapes, workflow state names, and lifecycle stage names come from `docs/`. This directory owns only visual and interaction design.

---

## 0.5 Quiet Luxury — The Aesthetic That Governs Everything

Voyager's luxury is quiet, not loud. The reference is not a boutique hotel lobby filled with marble and gold, but the *feeling* of being remembered — the concierge who knows your name, the paper that feels right between fingers, the room where everything is already placed.

**Principles to implement on every screen:**

* **Warm minimalism:** Bone surfaces (warm paper/linen, never stark white), dark ink text (charcoal-navy, never pure black), brass used as jewelry — small, precise, warm metal against the neutrals. One accent, used sparingly, is what makes it feel precious.
* **Generous whitespace as material:** The most luxurious element is empty space. Headlines breathe above and below; cards have deep internal padding; sections are separated by 96–128 of air. Compress nothing to save space.
* **Tactile paper over glossy UI:** Every card, chip rest state, input fill, and rail surface should read as thick, matte, slightly textured stock laid on a table with a soft double shadow (a tighter faint shadow plus a broader diffuse one). No hard drop shadows, no glossy highlights, no bevels, no plastic.
* **Typography as hospitality:** Serif for what matters (headlines, titles, provenance notes) — elegant, grounded, confident. Sans for what guides (body, rails, captions) — humane, legible, unhurried. Uppercase captions with generous tracking feel like letterpressed labels. Line lengths are deliberately limited for comfortable reading; line heights are generous.
* **Discipline of brass:** Brass appears only for interaction (hover/selected), for the dashed draft border, and for slim left accents on unknowns/warnings. Its scarcity is its power. Never use brass as a background wash, never pair it with red/green semantics.
* **Motion as breath, not performance:** Nothing bounces, springs, or pops. Page transitions pour, content settles with a slight upward rise and fade, micro interactions tint precisely, the single ripple breathes. Even failures are quiet — a small muted dot and plain text, not a banner.
* **Light as lamplight:** On deep ink, text is warm bone slightly transparent, not stark white on black — like paper under a lamp. On warm bone, shadows are warm-grey, not blue-grey, so the palette holds together.

If a choice would make the product look more like an app, do the other thing. If a choice would add color, check whether whitespace would do more.

---

## 1. Global Shell & Foundations

### 1.1 Shell — Five Layers

Think of every screen as stacked layers:

* **Background layer:** The page surface. Warm bone by default. The planning/consultation screen alone uses a deep ink background.
* **Content canvas:** The centered reading area that holds the active screen. At most 1240px, centered.
* **Header:** A sticky top bar, transparent at the top and subtly solid on scroll. Left side holds the wordmark. Center holds a small uppercase label reflecting the current workflow state (for example, Discovery → "Discovery", Profile Review → "Review", Planning → "Consultation", Decision Required → "Your choice", Plan Ready → "Itinerary").
* **Lifecycle rail:** A narrow vertical strip fixed to the right edge. Collapsed it reads as a thin 4px accent. When consultation is active it expands to roughly 320px to list lifecycle stages. Hidden on narrow viewports.
* **Overlays:** Toasts, banners, decision sheets, and full-screen morphs that float above the canvas.

### 1.2 Space

A single spacing scale governs all gaps, padding, and section margins: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Use the smaller steps for closely related elements (chips, chip-to-input gaps), medium steps for modules, and the largest steps (96/128) for separation between major sections or questions. Do not create off-scale values.

### 1.3 Color, Elevation & Borders — Semantic Roles

**Warm neutrals (Bone):**
- Lightest warm surface for the overall app background.
- Slightly deeper warm surface for cards, chip resting states, and input fills.
- Muted warm line color for hairline dividers and borders.
- Desaturated warm tone for disabled and placeholder text.

**Inks (deep charcoal-navy):**
- Primary text (near-black ink).
- Secondary text (mid ink).
- Meta and timestamp text (soft ink).
- Deepest ink reserved exclusively for the consultation background.

**Brass (warm metallic accent):**
- Strong brass for primary actions and for the dashed provisional/draft border.
- Pale brass for hover highlights.
- Deeper brass for pressed states.

**Additional accents (sparingly):**
- Clay (warm terracotta) for error/failed indicators.
- Sage (muted green) for completed/success indicators.

**Elevation:**
- Subtle lift (soft, small shadow) for cards at rest.
- Deeper lift for floating elements (summary strip, expanded rail).
- Two border treatments: a solid hairline warm border for final content, and a dashed brass border for draft/provisional content.

The exact hex values, shadow opacities, and border weights are canonical in §11.1 below; use those values through semantic tokens. Never place body-weight text directly on strong brass — place dark ink text on brass instead.

### 1.4 Typography

* **Display extra-large and large:** Elegant serif (Fraunces) at 56px and 40px, regular weight, for hero headlines ("Where shall we begin?").
* **Heading large/medium:** Serif at 28px (medium weight) and sans at 22px (medium weight) for section titles and card titles.
* **Body large/medium:** Humanist sans (General Sans / Inter fallback) at 18px and 16px, regular weight, for questions, descriptions, and rail content. Large for primary reading, medium for dense lists.
* **Caption:** Small sans at 13px, medium weight, uppercase with generous tracking, for labels, rail headings, and meta rows.
* **Mono:** Monospace (IBM Plex Mono) for any numeric deltas or scope details.

Line heights are generous (roughly 1.4–1.55 for body). Serif is for display/emphasis, sans for everything else.

---

## 2. Motion — "Liquid Flow"

Motion should feel liquid, never bouncy or elastic. Do not use spring libraries unless they reproduce these intents:

* **Page pour:** A calm, slightly eased transition (~400ms) for screens pouring into one another and for the background color shift into consultation.
* **Content settle:** A gentle, decelerating entrance (~500ms) where elements rise 8px and fade in, often staggered.
* **Micro interaction:** A quick, precise ease (~150ms) for hover and chip selection.
* **Ripple breathe:** A slow, sinusoidal loop (~3 seconds) for the consultation ripple, scaling and fading outward.
* **Image/card morph:** A smooth, slightly slower ease (~800ms) when a card expands into its detail view.

**The consultation ripple:** A soft circular glow in brass that breathes outward and fades. It should loop quietly. After about 12 seconds without progress, the ripple is replaced by a small solid muted dot and a textual "Try again" affordance — a graceful failure, not a spinner.

---

## 3. Primitive Components — What They Look Like and How They Behave

These are the only dumb building blocks. All are token-only and reusable.

**Choice chip:**
A pill-like button with soft corners, resting on the warm card surface with dark text. On hover, it tints to pale brass. When selected, it inverts to dark ink background with light text. Chips wrap in a flexible group with comfortable gaps. Behavior (single-select vs multi-select, whether free text is allowed) is not decided by this component — it obeys whatever the current server question dictates.

**Profile chips (in the forming-profile rail):**
- *Stated* information (explicitly provided by the traveler) appears as a solid, warm-filled chip in dark text.
- *Inferred or defaulted* information (assumed by the system) appears as a transparent chip with a dashed brass outline in mid-ink. Hovering or focusing reveals a small caption tooltip: if the underlying assumption needs confirmation, it reads as an assumption warning; otherwise it reads as "Inferred from your answers." Inferred information must never be visually promoted to look like a hard constraint.

**Experience and meal card:**
A vertical stack: image on top (photography, 4:3 for experiences, more portrait for meals, soft corners, cover fit), then a text block with a serif title and mid-ink meta line, with a small caption tag overlaid at the top-right of the image. Tags sit on the warm surface. Cards representing finalized plan content use a solid warm border; cards representing draft content use the dashed brass border and carry the "Draft — not yet confirmed" badge.

**Buttons:**
- *Primary (brass):* Warm brass fill, dark text, comfortably tall with horizontal padding, soft corners.
- *Ghost:* Transparent fill, dark outline and text.
In any busy/loading state, controls visually dim (reduced opacity) and become non-interactive until the server acknowledges.

**Intent field (used on arrival):**
A warm-filled, soft-cornered multi-line text area with generous padding, dark text, and muted placeholder text. It auto-grows from about three lines up to about five, with a caption helper line and a live character count beneath.

---

## 4. How Screens Are Organized

Each screen below is a separate file. Read this README first, then implement one screen at a time. The screen file tells you its workflow state, what data feeds it, how it is laid out, what states it has, and how it interacts with the transport.

For a quick map, the journey in order is: Arrival (intent capture) → Discovery (adaptive interview) → Profile Review → Consultation (planning) → Decision Required (when a trade-off needs a choice) → Tradeoff Brief → Trip Overview → Day/City Canvas → Experience Detail (overlay) → Replanning (deferred).

---

## 5. Lifecycle Rail — What It Represents

The rail visualizes ten logical stages, not ten agents. In contract order: discovery, constraint/preference shaping, experience design, mobility/logistics, cost optimization, local intelligence, simulation/risk, optimization, narrative/explanation, and continuous replanning (the last is disabled in the initial product and never becomes active). Each stage reflects events from the server's lifecycle and planning status streams, which carry only traveler-safe summaries. Tool-backed stages may complete deterministically yet still appear as lifecycle items. Active stages show a subtle breathing dot beneath; idle stages show an empty ring in muted warm; completed stages show a solid muted green dot; failed stages show a muted terracotta dot with a caption.

---

## 6. Accessibility, Transport & Errors

**Accessibility:**
- Focus outlines use brass with offset, always visible.
- Choice chip groups are announced as a single group labelled by the question prompt; timeline is a feed with each item as an article; day tabs indicate selection; decision options indicate pressed state.
- Never place body text on strong brass; use dark ink on brass.

**Transport (conceptual):**
Every WebSocket frame is a single JSON envelope carrying an identity, a kind (command vs acknowledgement vs event vs error), a type name, optional session/run/command correlation identifiers, an optional monotonic sequence number, a timestamp, and a payload. The client sends commands and always waits for an acknowledgement before trusting the next step. Duplicate commands with the same correlation identifier are idempotent when the payload matches; the same identifier with a different payload is a conflict.

**Acknowledgements and errors to handle:**
- An accepted acknowledgement may note that it was a duplicate — do not advance twice.
- A rejected acknowledgement carries a human-readable message, a retry hint, the workflow state, and sometimes a recovery hint (e.g., the current question identifier). Surface the human-readable message in a polite live region beneath the active view, never the raw code. Handle stale question, invalid selection, disallowed free text, stale revision, missing session, and disallowed replanning distinctly but always as plain language.
- Session-level events include readiness (with recovery flag and confirmed profile revision), expiry on backend restart (offer to start anew), and supersession (another tab took over — close the old connection with a calm notice).
- Process server events in sequence order per run and replace profile/plan snapshots only when the revision is newer.

---

## 7. App Architecture

The app is a single-page canvas that swaps views without browser navigation. The active view is driven entirely by the server's workflow state plus sequence, revision, and decision identifiers. When the workflow state changes (for example, Discovery to Profile Review when the profile is ready, or Planning to Decision Required when a choice is needed), the outgoing view pours out with the page-pour motion and the incoming view settles in. No hard reloads.

Persistence is in-memory on the server; a backend restart causes session expiry and requires starting again. There is a single JSON WebSocket per session; a newer connection supersedes an older one. There is no app-level heartbeat — rely on native socket ping/pong. On reconnect, create a new run from the existing session and restore the latest known good state without replaying the full history.

**Tailwind/design-token mapping note:** The original Tailwind configuration is frozen. Implementers must not re-enable default Tailwind colors, radii, or shadows. Map the semantic tokens above instead of inventing new ones.

---

## 8. Data Shapes at a Glance (for binding, not for rendering)

The authoritative field tables live in `docs/`. Below is only enough to bind UI correctly:

* **Workflow states:** Discovery, Profile Review, Planning, Decision Required, Plan Ready, Cancelled, Expired.
* **Lifecycle keys:** Discovery, Constraint/Preference, Experience Designer, Mobility/Logistics, Cost Optimization, Local Intelligence, Simulation/Risk, Optimization, Narrative/Explanation, Continuous Replanning (deferred).
* **Discovery question (server-driven):** a prompt, a selection mode (single-choice vs multi-choice), a required flag, a list of options (each with identifier, label, optional description), a free-text mode (disabled / optional / only if no option chosen / required), and an optional placeholder.
* **Traveler profile:** trip context (the original destination request plus resolved destination, dates/duration/flexibility, party size/notes, budget), purpose and priorities, a list of preferences (each with category, strength, source, and confidence), travel style, hard constraints (only when non-empty), unknowns (each with topic, impact blocking/material/minor, description), and assumptions (each with value, reason, and whether confirmation is needed).
* **Final trip plan:** title, summary, reference to the profile revision, trip dates, ordered destination route, city/region allocations, optional accommodation (with status suggested/selected/not-yet-decided — never implying booking), ordered days each with timed items (experience / meal / rest / movement, each with title, description, optional timing/location/cost/reason/flexibility), cost summary (currency, total, scope including what is excluded, category breakdown, budget position, caveats), fit explanation, tradeoffs (what was gained vs given up and why), assumptions, warnings, and unresolved details.

Render hard constraints literally; never synthesize preferences into constraints. Render unknowns and warnings with the brass left-accent treatment. Draft snapshots get the dashed border and badge; final snapshots get the solid border.

---

## 9. Library Map

- `design/README.md` — you are here (base knowledge)
- `design/arrival.md` — Arrival & intent capture (pre-Discovery)
- `design/discovery.md` — Adaptive interview
- `design/profile-review.md` — Human-readable profile checkpoint
- `design/consultation.md` — Planning / consultation
- `design/decision-required.md` — Typed checkpoint when a choice is needed
- `design/tradeoff-brief.md` — The calmer-version trade-off reading (Plan Ready excerpt)
- `design/trip-overview.md` — Route, allocation, and cost overview
- `design/day-canvas.md` — Ordered day-by-day canvas (main itinerary)
- `design/experience-detail.md` — Full-screen morph detail
- `design/replanning.md` — Deferred replanning (reserved)

---

## 10. Failure & Edge Handling

* **Images:** Lazy-load with a soft fade; missing imagery shows a warm neutral skeleton, never a broken-image icon.
* **Responsiveness:** Below 1024px, preserve reading order and avoid horizontal scroll; hide the rail below 1200px.
* **Resilience:** Every user submission (intent, answer, confirmation, decision) uses a fresh correlation identifier and an explicit busy state. Visibly dim/disable controls until the acknowledgement and subsequent sequenced events arrive. Duplicate identifiers with identical payloads do not double-apply; the same identifier with a new payload is a conflict error.

---

## Screen Index

| Journey order | Screen | File | Workflow state | Key data |
|---|---|---|---|---|
| 1 | Arrival — Intent Capture | arrival.md | pre-Discovery (session start) | Session start → readiness → first question |
| 2 | Discovery — Adaptive Interview | discovery.md | Discovery | Question ↔ answer, draft profile snapshots |
| 3 | Profile Review | profile-review.md | Profile Review | Profile snapshot (ready), readiness signal, confirm / request changes |
| 4 | Consultation | consultation.md | Planning | Lifecycle + planning status summaries |
| 5 | Decision Required | decision-required.md | Decision Required | Decision request ↔ response |
| 6 | Tradeoff Brief | tradeoff-brief.md | Plan Ready (excerpt) | Final plan tradeoffs & fit |
| 7 | Trip Overview | trip-overview.md | Plan Ready | Route, allocation, cost |
| 8 | Day / City Canvas | day-canvas.md | Plan Ready | Days & timed items |
| 9 | Experience Detail | experience-detail.md | Plan Ready (overlay) | Single item + fit note |
| 10 | Replanning | replanning.md | Deferred | Reserved — not active in initial flow |

---

## 11. Self-Contained Implementation Contract

This section turns the visual direction above into values a coding agent can implement without access to the old prototype or a missing design file. These values are part of the `/design` contract. If a screen description below uses a relative phrase such as “comfortable padding” or “soft shadow,” use the values here.

### 11.1 Canonical tokens

Use CSS custom properties, a typed token object, or the equivalent in the UI framework. Do not use literal values in screen components when one of these tokens applies.

```css
:root {
  --voyager-bone-0: #F7F2E9;       /* page background */
  --voyager-bone-1: #EEE6D8;       /* card and input surface */
  --voyager-bone-2: #E1D6C5;       /* hairline and quiet divider */
  --voyager-bone-3: #C9BBA5;       /* disabled, placeholder, skeleton */
  --voyager-ink-0: #1B252C;        /* deepest consultation background */
  --voyager-ink-1: #263239;        /* primary light-surface text */
  --voyager-ink-2: #56636A;        /* secondary text */
  --voyager-ink-3: #7D878A;        /* meta, caption, placeholder */
  --voyager-light-ink: #F2EBDD;    /* text on consultation background */
  --voyager-brass-1: #B38A55;      /* primary action, selected accent */
  --voyager-brass-2: #D8C19A;      /* hover tint, focus ring */
  --voyager-brass-3: #86633B;      /* pressed state, dark accent */
  --voyager-clay: #B56F62;         /* failed or timed-out state */
  --voyager-sage: #708A77;         /* completed state */
  --voyager-radius-sm: 6px;
  --voyager-radius-md: 12px;
  --voyager-radius-lg: 18px;
  --voyager-radius-pill: 999px;
  --voyager-shadow-card: 0 1px 2px rgba(38, 41, 37, .08), 0 12px 28px rgba(38, 41, 37, .08);
  --voyager-shadow-float: 0 2px 5px rgba(38, 41, 37, .10), 0 20px 44px rgba(38, 41, 37, .12);
  --voyager-shadow-night-rail: -12px 0 30px rgba(0, 0, 0, .12);
  --voyager-focus-ring: 0 0 0 3px rgba(216, 193, 154, .72);
}
```

Semantic use is strict: `clay` and `sage` are never decorative fills or positive/negative comparison badges; brass is never a warning color. Use `--voyager-bone-2` for 1px rules and `--voyager-bone-3` for disabled text. On `--voyager-ink-0`, use `--voyager-light-ink`, never white.

### 11.2 Type, spacing, and geometry

Font loading order is `Fraunces, Georgia, serif` for serif styles; `General Sans, Inter, ui-sans-serif, sans-serif` for sans styles; and `IBM Plex Mono, ui-monospace, monospace` for numeric scope. Use the following exact styles:

| Token | Size / line-height | Weight | Use |
|---|---:|---:|---|
| `display-xl` | 56 / 64px | 400 | Arrival hero only, desktop |
| `display-lg` | 40 / 48px | 400 | Screen titles and plan title |
| `heading-lg` | 28 / 36px | 500 | Major section headings |
| `heading-md` | 22 / 30px | 500 | Cards and day headings |
| `body-lg` | 18 / 28px | 400 | Prompts and primary reading |
| `body-md` | 16 / 25px | 400 | Descriptions and rail content |
| `caption` | 13 / 18px | 500 | Uppercase labels; letter-spacing .12em |
| `meta` | 12 / 17px | 500 | Timestamps, tags, helper text |
| `numeric` | 12 / 18px | 400 | Costs, deltas, quantities |

Apply the spacing scale exactly: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128px`. Default card padding is 32px; compact cards use 24px. Default content width is `min(1240px, calc(100vw - 64px))` at desktop, `calc(100vw - 48px)` at 1024–1199px, and `calc(100vw - 32px)` below 768px.

Global geometry:

| Element | Canonical value |
|---|---:|
| Header height | 72px desktop; 64px below 768px |
| Content max-width | 1240px |
| Desktop page gutter | 32px each side |
| Lifecycle rail | 320px expanded; 4px collapsed edge |
| Rail reveal breakpoint | visible at `min-width: 1200px` |
| Two-column-to-one-column breakpoint | 1024px unless a screen says otherwise |
| Minimum interactive target | 44 × 44px |
| Hairline border | 1px solid |
| Draft border | 1px dashed `--voyager-brass-1` |
| Standard control radius | `--voyager-radius-md` |

At widths below 1024px, preserve the primary-content-first DOM order and do not create horizontal scrolling. At widths below 768px, stack multi-column layouts, make actions full-width where specified, and reduce display titles to 40/48px and body-large to 16/25px. Every state must remain usable at 320px.

### 11.3 Component contracts

**Buttons.** Primary buttons are at least 44px high, use 16px horizontal padding plus 24px side inset, `--voyager-brass-1` fill, `--voyager-ink-1` text, and `--voyager-radius-md`. Ghost buttons use a 1px `--voyager-ink-2` border and transparent fill. Hover is a 150ms tint to `--voyager-brass-2`; pressed is `--voyager-brass-3`; disabled/busy is `opacity: .4` with `pointer-events: none`. Preserve the accessible name while showing busy; do not replace the label with a spinner.

**Inputs.** Textareas use `--voyager-bone-1`, `--voyager-ink-1`, 1px `--voyager-bone-2`, `--voyager-radius-md`, 16px padding, and `resize: none`. Focus uses `--voyager-focus-ring` and does not change layout. Placeholder uses `--voyager-ink-3`. A visible label or accessible name is mandatory even when the visual label is represented by the surrounding prompt.

**Cards.** Standard cards use `--voyager-bone-1`, `--voyager-shadow-card`, `--voyager-radius-md`, and 32px padding. Use 24px padding only for compact rail or timeline cards. Final content gets a 1px solid `--voyager-bone-2` border. Draft content gets the dashed brass border and the exact badge text `Draft — not yet confirmed`.

**Icons.** Use one-weight stroke icons at 20px in controls and 16px in meta rows, with `stroke-width: 1.5`, round line caps, and no filled or duotone treatment. Every meaningful icon has a text label or accessible name. Never substitute emoji.

**Images.** Experience imagery is 4:3; meal imagery is 4:5; hero imagery is a cover image with a 40vh minimum and 56vh maximum. Use `object-fit: cover`, a 250ms opacity fade after load, and a `--voyager-bone-2` skeleton with no broken-image icon. Image alt text is descriptive when informative and empty when decorative.

### 11.4 View and event rules

Every screen owns a small view model with `workflowState`, `busy`, `errorMessage`, and the latest authoritative snapshot relevant to that screen. Render server text exactly unless a screen explicitly calls for a fixed label. A client may format dates, currency, counts, and line breaks; it may not invent destination facts, reasons, scores, progress percentages, or missing values.

Apply server events in sequence order. Replace complete Profile and Plan snapshots only when the revision is newer. Never advance a screen on a click alone: render busy, wait for `command.accepted`, then wait for the next authoritative event before transitioning. Repeated accepted commands marked `deduplicated` must not replay entrance motion or append duplicate content.

Use a polite `aria-live="polite"` region for server messages. Keep focus stable during snapshot replacement; move focus only when the workflow state changes or a newly opened overlay requires a focus trap. On a rejected command, preserve entered values unless the contract explicitly supplies a newer authoritative value.

### 11.5 Definition of done for every screen

A screen is implementation-complete only when default, hover, focus, selected, disabled, busy, empty, error, and narrow-width states are implemented; optional fields can be absent; no internal server field is displayed; keyboard order matches visual reading order; 44px targets and visible brass focus rings are present; draft/final status is explicit where relevant; event replay and stale-command behavior do not duplicate UI; and screenshot review passes at 1440px, 1200px, 1024px, 768px, and 320px widths.
