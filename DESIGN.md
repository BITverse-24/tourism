# Voyager — UI/UX Design System & Core Journey Specification

### v1.3 — "Quiet Luxury, Liquid Intelligence" · Complete Architectural Blueprint

> **Contract alignment note (v1.3):** This revision aligns the aesthetic spec with the authoritative contracts in `docs/AGENT_ARCHITECTURE.md`, `docs/WEBSOCKET_CONTRACT.md`, `docs/TRAVELER_PROFILE_SCHEMA.md`, and `docs/FINAL_TRIP_PLAN_SCHEMA.md`. **No design tokens were changed** — colors, spacing, typography, motion, and elevation in §1–§3 and §7.2 are verbatim from v1.2. Changes are confined to workflow state names, data shapes, transport semantics, and the Arrival capture flow.

---

## 0. Design Philosophy & Implementation Rules

Voyager is a private travel consultancy powered by **three reasoning agents** — **Discovery/Profile**, **Candidate Design**, and **Narrative/Explanation** — orchestrated by a deterministic Workflow Orchestrator across **ten logical workflow stages**. Deterministic engines (Mobility, Cost, Simulation, Objective Optimizer) and retrieval services (Experience KB) handle measurement and scoring; they are not agents. The interface must never look like a dashboard, a form-builder, or a booking site. It should feel like sitting across from a trusted concierge at a quiet hotel desk: unhurried, precise, warm.

**For the Implementing AI Agent:**
1. **Restraint as luxury:** Use ONLY the design tokens provided. Do not invent margins, colors, or shadows.
2. **Invisible machinery:** Never render a raw JSON key, ID, technical error message, or percentage progress bar. Lifecycle summaries are traveler-safe prose only — no chain-of-thought, prompts, provider bodies, or internal scores.
3. **Honesty over illusion:** `plan.snapshot` with `state: "draft"` gets a dashed brass border (`border-provisional`) and a "Draft — not yet confirmed" badge. Do not pretend a plan is locked until the server emits `state: "final"` and `workflow.completed { outcome: "final_plan_available" }`.
4. **Desktop-First Execution:** Min-width supported is 1024px. The grid is 12 columns, fixed max-width 1240px, centered.
5. **No Emojis:** Replace all standard emojis with 1.5px stroke, single-weight SVG line icons. No duotone icons.
6. **Contracts are canonical:** `docs/TRAVELER_PROFILE_SCHEMA.md` and `docs/FINAL_TRIP_PLAN_SCHEMA.md` define profile/plan shapes; `docs/WEBSOCKET_CONTRACT.md` defines transport/envelope/workflow; `docs/AGENT_ARCHITECTURE.md` defines 3 agents vs 10 logical stages. This document defines *how* to render them, not *what* they contain.

---

## 1. Global Shell Architecture & Foundations

The Voyager DOM tree is governed by a consistent Shell overlay structure.

### 1.1 Global UI Shell Layers
*   **Layer 0 (Background):** Base surface (`var(--bone-50)` or `var(--ink-950)` for Consultation).
*   **Layer 1 (Canvas):** `<main>` containing the active Journey Phase. `max-width: 1240px; margin: 0 auto`.
*   **Layer 2 (Global Header):** Sticky `<header>`, transparent until scrolled. Contains brand wordmark (Left) and current Phase Indicator (Center, uppercase `caption`). Phase text maps to `workflow_state` (e.g., `discovery` → "Discovery", `profile_review` → "Review", `planning` → "Consultation", `decision_required` → "Your choice", `plan_ready` → "Itinerary").
*   **Layer 3 (Lifecycle Rail):** Persistent `<aside>` fixed to the right edge. Defaults to 4px wide (collapsed). See §5.
*   **Layer 4 (Overlays):** Absolute/Fixed elements (Errors, Micro-toasts, Modal morphs, Decision sheet).

### 1.2 Spatial System (Token Mapping)
Spacing variables map exactly to CSS tokens. Do not deviate.
`4px (s-4) · 8px (s-8) · 12px (s-12) · 16px (s-16) · 24px (s-24) · 32px (s-32) · 48px (s-48) · 64px (s-64) · 96px (s-96) · 128px (s-128)`
*   `gap-x` and `gap-y` in Flexbox use `s-16` for closely related items, `s-32` for separate modules.
*   Section margins (e.g., between questions or major itinerary blocks) use `s-96` or `s-128`.

### 1.3 Color System & Elevation
*   `bone-50` (`#F6F3ED`) - App background
*   `bone-100` (`#EFE9DE`) - Card fills, chip backgrounds
*   `bone-200` (`#DDD5C7`) - Hairline borders, dividers
*   `bone-300` (`#A89F8F`) - Disabled states, placeholders
*   `ink-900` (`#1B1F2A`) - Primary text
*   `ink-700` (`#4A5063`) - Secondary text
*   `ink-400` (`#8A8FA0`) - Meta text/timestamps
*   `ink-950` (`#12141C`) - Used ONLY for Consultation bg.
*   `brass-500` (`#B08D57`) - Active buttons, provisional borders
*   `brass-200` (`#D8C39A`) - Hover fill
*   `elevation-1`: `0 2px 8px rgba(27,31,42,0.06)`
*   `elevation-2`: `0 8px 24px rgba(27,31,42,0.08)`
*   `border-solid`: `1px solid var(--bone-200)`
*   `border-provisional`: `1.5px dashed var(--brass-500)`

### 1.4 Typography Structure
*   `display-xl`: 56px/62px, 400w, Fraunces
*   `display-l`: 40px/46px, 400w, Fraunces
*   `heading-l`: 28px/34px, 500w, Fraunces
*   `heading-m`: 22px/28px, 500w, General Sans
*   `body-l`: 18px/28px, 400w, General Sans
*   `body-m`: 16px/24px, 400w, General Sans
*   `caption`: 13px/18px, 500w, uppercase +2% tracking, General Sans

---

## 2. Motion System ("Liquid Flow")

**For the Implementer:** Use CSS Transitions/Animations mapped to these specific cubic-bezier variables. Do not use elastic/spring libraries unless strictly matching these curves.
*   `--ease-flow`: `cubic-bezier(0.45,0,0.15,1)` · 400ms (Page transitions, routing)
*   `--ease-settle`: `cubic-bezier(0.16,1,0.3,1)` · 500ms (Staggered element fades, translating Y from 8px to 0px)
*   `--ease-micro`: `cubic-bezier(0.4,0,0.2,1)` · 150ms (Button hovers, choice chip selection)
*   `--ease-ripple`: sinusoidal looping · 3000ms
*   `--ease-pour`: `cubic-bezier(0.65,0,0.35,1)` · 800ms (Image expansion, Card to Detail transitions)

**The Agent Ripple (`@keyframes agent-pulse`):**
A single absolute positioned div (`border-radius: 50%`) with background `radial-gradient(circle, var(--brass-500) 0%, transparent 70%)`. Scale breathes from `0.8` to `1.2`, opacity `0.4` to `0.0`. Requires a Javascript `setTimeout` for a strict 12-second max loop before failing gracefully.

---

## 3. Strict Component Specifications

### Choice Chip
*   **DOM**: `<button type="button" aria-pressed="false">` inside a `role="group"` container.
*   **Idle**: `background: var(--bone-100)`, `border: none`, `color: var(--ink-900)`, `border-radius: 8px`, `padding: 12px 16px`. Text is `body-m`.
*   **Hover**: `background: var(--brass-200)`. Transition: `--ease-micro`.
*   **Selected**: `background: var(--ink-900)`, `color: var(--bone-50)`.
*   **Layout**: `display: inline-flex`, `flex-wrap: wrap`, `gap: 12px` between chips in a group.
*   **Contract binding:** Selection obeys the server's `discovery.question.selection_mode` (`single` → at most one `option_id`; `multiple` → one-or-more). `free_text_mode` (`disabled` | `optional` | `only_if_no_option` | `required`) gates whether free text and chips may coexist. Client must not invent rules from prompt text.

### Profile Chips (Left/Right Rail)
*   **Stated Chip (source `stated`)**: `background: var(--bone-100)`, `color: var(--ink-900)`, `radius: 8px`, `padding: 8px 12px`, `body-m`.
*   **Inferred/Defaulted Chip (source `inferred` | `defaulted`, with `confidence: high|medium|low`)**: `background: transparent`, `border: var(--border-provisional)`, `color: var(--ink-700)`. Tooltip on hover: fixed pseudo-element `caption` — "Assumed by system — confirmation needed" when the backing `assumptions[].user_confirmation_needed === true`, otherwise "Inferred from your answers".
*   **Hard-constraint chips** (`profile.hard_constraints.must_visit` / `avoid` / `dietary_requirements` etc.) use stated styling only when user-stated; inferred preferences never render as hard constraints.
*   **Unknowns** (`profile.unknowns[] {topic, impact: blocking|material|minor, description}`) do not render as chips; they render as italic `body-l` with `border-l-2 border-brass-500 pl-[s-16]` per §4.3.

### Experience / Meal Cards
*   **DOM**: `<article>` container. `display: flex; flex-direction: column`.
*   **Image**: `width: 100%`, `aspect-ratio: 4/3` (Experience) or `2/3` (Meal). `object-fit: cover`, `border-radius: 16px`.
*   **Typography Block**: `padding-top: 16px`. Title in `heading-m`, Metadata in `body-m`, `color: var(--ink-400)`.
*   **Tags**: Absolutely positioned on the top-right of the image (`padding: 4px 8px`, `background: var(--bone-100)`, `caption`).
*   **Draft vs Final:** `plan.snapshot.state === "draft"` → card `border: var(--border-provisional)` + badge `Draft — not yet confirmed` (see §4.10). `state === "final"` → `border-solid`.

### Buttons
*   **Primary (Brass)**: `background: var(--brass-500)`, `color: var(--ink-900)`. `height: 44px`, `border-radius: 8px`. Padding `0 24px`.
*   **Ghost**: `background: transparent`, `border: 1px solid var(--ink-900)`, `color: var(--ink-900)`.
*   **Disabled / Busy:** `opacity: 0.4`, `pointer-events: none` while `isBusy` (awaiting `command.accepted`/`command.rejected` or async `sequence` events). Required by §10 Rule C.

---

## 4. Screen-by-Screen Implementer's Guide

This outlines the precise DOM composition, layout rules, interactions, and contract bindings for every view.

### 4.1 Arrival — Intent Capture (Entry to `session.start`)

**Purpose:** Capture `TravelerProfile.destination_request` (and any free-form trip context) *before* adaptive questioning. This textbox is the correction for the v1.2 false assumption that location is never provided upfront; all subsequent `discovery.question` payloads are tailored using this intent plus recovery state.

**Layout/DOM Structure:**
*   **Wrapper:** `<div class="w-full h-screen overflow-hidden relative">`
*   **Background Asset:** `<img class="absolute inset-0 w-full h-full object-cover" loading="eager">`. Slow CSS animation: `scale 1.0 -> 1.04` over 40s.
*   **Scrim/Overlay:** `<div class="absolute inset-0 bg-ink-950/20">` (Ensure contrast).
*   **Foreground (Center):** `<main class="relative z-10 h-full flex flex-col justify-center items-center text-center px-[s-24]">`
    *   Text: `<h1 class="display-l text-bone-50 mb-[s-16]">Where shall we begin?</h1>`
    *   Subtext: `<p class="body-l text-bone-100/90 mb-[s-32] max-w-[640px]">Describe where you want to go — a word or a story. The questions that follow will be shaped by what you share here.</p>`
    *   **Intent Textbox (required):** `<div class="w-full max-w-[640px] bg-bone-50 rounded-[16px] p-[s-16] elevation-2 text-left">`
        *   `<textarea id="intent-input" rows="3" maxlength="2000" placeholder="e.g. Kyoto in autumn, slow, sunrise photography — or ten days, two friends, avoid crowds, street food over museums" class="w-full min-h-[88px] max-h-[160px] bg-bone-100 border-none rounded-[8px] p-[s-16] body-m text-ink-900 placeholder:text-ink-400 outline-none focus:ring-1 ring-brass-500 resize-none"></textarea>`
        *   `<div class="flex justify-between items-center mt-[s-12]">`
            *   `<span class="caption text-ink-400">However short or long — we’ll ask only what’s missing.</span>`
            *   `<span class="caption text-ink-400" aria-live="polite"><span id="intent-count">0</span>/2000</span>`
        *   `</div>`
    *   Action: Primary Brass button "Begin the Interview" (`type="button"`, `height: 44px`, `disabled` until `trimmedIntent.length >= 2` and `!isBusy`).
    *   Helper: `<p class="caption text-bone-100/70 mt-[s-16]">You can change anything later — nothing is booked until you confirm the profile.</p>`

**Interaction / Contract Details:**
*   On click (and on `Enter` with `metaKey`/`ctrlKey` from textarea):
    1. Set `isBusy = true`, disable button + textarea.
    2. Open WebSocket `WS /ws` if not already open.
    3. Send envelope `kind: "command", type: "session.start", command_id: <uuid>, payload: { session_id: null }` (or existing `session_id` on resume). Persist `session_id`/`run_id` from `session.ready`.
    4. On `command.accepted` for `session.start`, the server emits `session.ready { session_id, run_id, workflow_state: "discovery", has_recovery_state, confirmed_profile_revision }`.
    5. The server then emits the first `discovery.question` (adapted using the intent text, which the backend normalizes into `profile.destination_request` and `profile.unknowns/assumptions`). **Do not synthesize questions client-side.**
    6. The intent text is retained locally as the seed for `destination_request` and shown in the profile rail as `Stated: destination_request` until `profile.snapshot` arrives.
*   **Reconnect:** If `session_id` exists, `session.start { session_id }` creates a new `run_id` from `has_recovery_state`. No event replay. Restore textbox value from recovery if provided.
*   **Backend restart:** `session.expired { reason: "backend_restart" }` → show inline `caption` "Your session was lost — start again?" and re-enable Arrival.
*   **Exit Animation:** Background image applies `filter: blur(8px)`, `<main>` wrapper fades out opacity over 400ms with `--ease-flow`. Phase advances when `workflow_state === "discovery"` observed (not optimistically).

### 4.2 Discovery — Adaptive Interview (Phase: `discovery`, `workflow_state: "discovery"`)

**Layout/DOM Structure:**
*   **Wrapper:** Grid container, `max-width: 1240px`, `margin: 128px auto`.
*   **CSS Grid:** `grid-template-columns: 7fr 5fr; gap: 96px; min-height: 60vh;`
*   **Left Column (Interview Area):** `display: flex; flex-direction: column; position: relative`.
    *   **The Liquid Thread:** `<div class="absolute left-[-24px] top-0 bottom-0 w-[2px] bg-bone-200">`. Inside it, a nested `div` with `bg-brass-500` animates height 0-100% and top 0-100% iteratively (progress derived from `sequence`, not element count).
    *   **Question Block:** `margin-bottom: 64px`. Animate in with `--ease-settle`.
        *   Text: `<h2 class="heading-l text-ink-900 mb-[s-32]">{payload.prompt}</h2>`
        *   Chips Container: `<div role="group" aria-labelledby="q-prompt" class="flex flex-wrap gap-[s-12] mb-[s-24]">` — one `<button aria-pressed>` per `payload.options[]` (`option_id`, `label`, `description?`).
        *   Free-text Input: `<textarea class="w-full bg-bone-100 border-none rounded-[8px] p-[s-16] body-m outline-none focus:ring-1 ring-brass-500 mb-[s-32] min-h-[88px]">` with `placeholder` from `payload.free_text_placeholder`. Visibility/requiredness driven by `payload.free_text_mode`:
            *   `disabled` → hide input
            *   `optional` → show, optional
            *   `only_if_no_option` → hide input when any chip selected; if user types, deselect chips
            *   `required` → show, require non-empty when `selected_option_ids` empty (or as server dictates)
        *   Action: Ghost Button "Continue →" (`disabled` until `isValid(payload.selection_mode, payload.required, selected, freeText)` and `!isBusy`, `opacity: 0.4` when disabled). `aria-live` error region below for `command.rejected`.
*   **Right Column (Profile Forming Rail):** `position: sticky; top: 128px; height: max-content;`
    *   Header: `<h3 class="caption text-ink-400 mb-[s-24]">Traveler Profile</h3>`
    *   Sections derived from `profile.snapshot { revision, state: "draft"|"ready", profile: TravelerProfile }` — do not invent traits:
        *   `trip_context` (destination_request, resolved_destination?, dates/duration, party_size, budget)
        *   `purpose_and_priorities` + `preferences[]` + `travel_style`
        *   `hard_constraints`
        *   `unknowns[]` → italic `border-l-2` rows (see §4.3)
        *   `assumptions[]` → provisional chips with confirmation affordance
    *   Each chip tooltip shows `source` + `confidence` + `notes`. Inferred never promoted to hard constraint.

**Contract / Validation Details:**
*   Single `envelope` per answer: `type: "discovery.answer", command_id, payload: { question_id, selected_option_ids: string[], free_text: string }`. `selected_option_ids` is always an array (may be empty only when `free_text_mode` permits text-only).
*   `selection_mode: "single"` → at most one `option_id`; `"multiple"` → one-or-more unless explicitly permitted empty. Server validates `question_id` is current; stale answer → `command.rejected { code: "question_not_current", recovery: { current_question_id } }` — replace UI with current question.
*   `command.accepted { deduplicated }` — if `deduplicated: true`, do not advance; show original result.
*   `command.rejected` codes: `invalid_envelope`, `unsupported_message_type`, `session_not_found/expired`, `invalid_workflow_state`, `question_not_current`, `invalid_selection`, `free_text_not_allowed`, `command_id_conflict`. Each shows a `body-m` error under the question (never raw code), e.g., `invalid_selection` → "That combination isn’t allowed — try choosing one option or adding a note."

### 4.3 Profile Review (Phase: `profile_review`, `workflow_state: "profile_review"`)

**Layout/DOM Structure:**
*   **Wrapper:** `max-width: 800px`, `margin: 128px auto`, text aligned center.
*   **Header:** `<h1 class="display-l mb-[s-64]">Here's what we've understood.</h1>`
*   **Review Body:** `<section class="flex flex-col gap-[s-48] text-left">`
    *   Map thematically from `TravelerProfile`:
        *   `trip_context` row: destination_request / resolved_destination / dates or duration + date_flexibility / party_size + party_notes / budget (amount+currency+scope)
        *   `purpose_and_priorities` row: primary_purpose, secondary_purposes, priorities, success_definition
        *   `preferences` rows: each `category` with `strength` badge (`must_have`/`strong`/`nice_to_have`/`not_interested`/`unknown`) + `source`/`confidence`
        *   `travel_style` row: pace, energy_pattern, walking_tolerance, crowd_tolerance, comfort_preference, spontaneity
        *   `hard_constraints` rows: must_visit / avoid / dietary / accessibility / accommodation / maximum_daily_travel / maximum_hotel_changes / budget_ceiling — only when non-empty/non-null; render literally, no inference.
    *   Each row: `<div class="flex items-center gap-[s-24] border-b border-bone-200 pb-[s-24]">`
    *   Unknowns rendering (required): for each `unknowns[]` → `<p class="body-l text-ink-700 italic border-l-2 border-brass-500 pl-[s-16]">{description} — <span class="caption text-ink-400">{impact}: {topic}</span></p>`. `blocking` unknowns block confirmation visually (see below).
    *   Assumptions rendering: for each `assumptions[]` → provisional chip + `<span class="caption text-ink-400">{reason}{user_confirmation_needed ? " · confirmation needed" : ""}</span>`
*   **Actions Base:** `<div class="flex gap-[s-16] justify-center mt-[s-64]">`
    *   Button: "Confirm Profile" (Primary, Brass). Sends `profile.confirm { profile_revision }` with fresh `command_id`. Disabled when `isBusy` or when `profile.ready.blocking_unknowns.length > 0`.
    *   Button: "Request changes" (Ghost). Opens inline `topics` chips + `free_text` textarea → sends `profile.request_changes { topics: string[], free_text: string }` → server returns to `discovery` with targeted `discovery.question` events and a revised `profile.snapshot`.
*   **Contract note:** `profile.snapshot` must be treated as complete snapshots (`revision` monotonic). `profile.ready { profile_revision, blocking_unknowns }` marks readiness. `profile.confirm` rejected with `profile_not_ready` / `profile_revision_conflict` if stale. On success, `confirmed_profile_revision` is set and planning starts; no duplicate checkpoint is created. Resulting `plan.traveler_profile_reference` must equal the confirmed profile.

### 4.4 Consultation (Planning Phase, `workflow_state: "planning"`)

**Layout/DOM Structure:**
*   **Wrapper:** **CRITICAL STATE CHANGE.** Body background swaps from `bone-50` to `ink-950` using `--ease-flow` 800ms. All UI fades to text `bone-50`.
*   **Container:** `display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;`
*   **The Agent Ripple:**
    *   `<div class="relative w-[120px] h-[120px] mb-[s-48]">` containing the `@keyframes agent-pulse` gradient div.
*   **Current Action Line:** `<p class="body-l text-bone-100" aria-live="polite">{planning.status.message || agent.lifecycle.summary}</p>` — sourced from `planning.status { phase, status, message, progress? }` or `agent.lifecycle { agent: LifecycleKey, status, summary }`. Never render internal scores or provider payloads. `agent.lifecycle.summary` is traveler-safe by contract.
*   **Lifecycle Rail** (§5) expands to 320px; animate items in with `--ease-settle`.

**Lifecycle mapping ( §5 / AGENT_ARCHITECTURE.md ):**
The rail reflects 10 logical stages, not 10 agents. `agent` field values are keys: `discovery`, `constraint_preference`, `experience_designer`, `mobility_logistics`, `cost_optimization`, `local_intelligence`, `simulation_risk`, `optimization`, `narrative_explanation`, `continuous_replanning` (deferred, never emitted in initial planning). Tool-backed stages (`constraint_preference`, `mobility_logistics`, `cost_optimization`, `simulation_risk`, `optimization`) complete deterministically. `planning.status.phase` values: `profile_validation`, `destination_design`, `experience_selection`, `mobility`, `cost`, `simulation`, `optimization`, `decision_required`, `explanation`, `replanning`.

### 4.5 Decision Required — Typed Traveler Choice (`workflow_state: "decision_required"`)

**Trigger:** Optimizer emits `decision.request { decision_id, profile_revision, reason: "material_tradeoff"|"no_admissible_candidate", prompt, options: [{option_id,label,tradeoff}] }` and `planning.status { phase: "decision_required", status: "running" }`. This replaces silent planner choice.

**Layout/DOM Structure:**
*   **Wrapper:** Transitions back to `bone-50` background (or stays `ink-950` with bone card — implementer may choose, but must meet contrast). Container `max-width: 800px; margin: 96px auto;`.
*   **Header:** `<h1 class="heading-l text-ink-900 mb-[s-16] text-center">{decision.request.prompt}</h1>`
*   **Reason caption:** `<p class="caption text-ink-400 text-center mb-[s-32]">{reason === "material_tradeoff" ? "A close trade-off — your preference will guide the plan." : "No admissible plan fits all constraints — choose how to relax one."}</p>`
*   **Options Stack:** `<div class="flex flex-col gap-[s-24] mb-[s-32]" role="group" aria-label="Choose one option">`
    *   Each option: `<button type="button" aria-pressed="false" class="bg-bone-100 p-[s-32] rounded-[12px] grid grid-cols-12 gap-[s-24] text-left hover:bg-brass-200 transition-micro w-full">` — left 9 cols: `heading-m` label + `body-m text-ink-700 tradeoff`, right 3 cols: `caption` reasoning. Selected → `bg-ink-900 text-bone-50`.
    *   Payload contains no hidden reasoning / scores / provider data — do not attempt to render such.
*   **Action:** `<div class="flex justify-center"><button class="btn-primary" disabled={!selected || isBusy}>Continue →</button></div>` → sends `decision.respond { decision_id, option_id }` with `command_id`. Rejected if `decision_id` stale or `option_id` unknown → `command.rejected { code: "invalid_selection" }`; show "That choice is no longer active — the plan has moved on." Duplicate `command_id` is idempotent (no double mutation).

**After acceptance:** Server returns to `planning` (`workflow_state: "planning"`) and resumes evaluation/explanation toward `plan.snapshot`.

### 4.6 A Calmer Version of Your Trip — Tradeoff Brief (within `plan_ready`, when tradeoffs material)

**Prerequisite:** `plan.snapshot { state: "final", plan: FinalTripPlan }` has arrived and `plan.tradeoffs.length > 0`. This view is a *reading* of the final plan, not a separate lifecycle phase.

**Layout/DOM Structure:**
*   **Wrapper:** Transitions back to `bone-50` background. Container `max-width: 800px; margin: 128px auto`.
*   **Header:** `<h1 class="heading-l text-ink-900 mb-[s-16] text-center">{plan.plan_title}</h1>` with `<p class="body-l text-ink-700 text-center mb-[s-64]">{plan.summary}</p>`
*   **Tradeoffs Stack:** `<div class="flex flex-col gap-[s-24] mb-[s-64]">`
    *   **Tradeoff Card DOM:** `<article class="bg-bone-100 p-[s-32] rounded-[12px] grid grid-cols-12 gap-[s-24]">`
    *   **Explanation text:** spans 9 cols (`col-span-9 body-l`) — from `plan.tradeoffs[]` (what gained / given up / why).
    *   **Fit context:** spans 3 cols, right-aligned (`col-span-3 caption text-ink-700 text-right`) — from `plan.fit_explanation[]` or `plan.cost_summary { scope, budget_position, caveats }`. Example: `Scope: local transport & experiences · Within target`. No red/green colors.
    *   Also render `plan.assumptions[]`, `plan.warnings[]`, `plan.unresolved_details[]` as brass-left-border blocks (same style as unknowns).
*   **Action:** `<div class="flex justify-center"><button class="btn-primary">View your itinerary →</button></div>` (anchors to §4.7).

### 4.7 Itinerary — Trip Overview (`plan_ready`)

**Layout/DOM Structure:**
*   **Wrapper:** `max-width: 1240px; margin: 96px auto`.
*   **Hero Block:** `<h1 class="display-l text-ink-900 mb-[s-16]">{plan.plan_title}</h1>` + `<p class="body-l text-ink-700 mb-[s-32]">{plan.trip_dates.start_date ? plan.trip_dates.start_date + " – " + plan.trip_dates.end_date : plan.trip_dates.duration_days + " days" + (plan.trip_dates.date_flexibility ? " · " + plan.trip_dates.date_flexibility : "")}</p>`
*   **Allocation Bar:** `<nav class="w-full h-[8px] flex rounded-full overflow-hidden mb-[s-64]" aria-label="City allocation">`.
    *   Proportional chunks from `plan.city_allocations[]` (`place`, `nights`/`days`, `reason` on hover). `style="width: {nights/total*100}%; background: var(--brass-500); opacity: 1.0 - index*0.12"`  Divider is a 1px `bone-50` gap.
*   **Grid layout for Main Body:** `grid-template-columns: 7fr 5fr; gap: 96px`.
    *   **Left (Cartography):** Static `<img class="w-full aspect-square mix-blend-multiply opacity-80 rounded-[12px]" loading="lazy">`. Contains muted SVG line route derived from `plan.destination_route[] { place, order }` (ordered). No booking implied.
    *   **Right (Details Rail):** `<aside class="flex flex-col gap-[s-32]">`
        *   **Plan Detail Accordions:** For `plan.city_allocations[]` and `plan.accommodation[]` (when present; `status: suggested|selected_by_traveler|not_yet_decided` — never imply booked) — `<details class="group border-b border-bone-200 pb-[s-16]">`. Title `<summary class="caption list-none flex justify-between cursor-pointer">{place} — {nights} nights</summary>`. Content `body-m mt-[s-16]` with `reason` + `estimated_cost?`.
        *   **Cost Summary Card:** `<div class="bg-bone-100 p-[s-24] rounded-[12px]">` — `currency`, `estimated_total`, `scope` (what includes/excludes, especially flights/lodging), `categories[]`, `budget_position` (`within_target`/`near_target`/`above_target`/`budget_unknown`), `caveats`.

### 4.8 Itinerary — Day / City Canvas (The Main UI, `plan_ready`)

**Data source:** `plan.days[] { day, date?, place, theme?, items[]: { type: experience|meal|rest|movement, title, start_time?, end_time?, location?, description, movement?, estimated_cost?, reason?, flexibility?: fixed|moveable|optional }, daily_notes? }` — ordered, no overlaps implied.

**Layout/DOM Structure:**
*   **Wrapper:** `max-width: 1240px; margin: 64px auto`.
*   **Layout:** CSS Grid `grid-template-columns: 2fr 10fr`.
*   **Left: Day Tabs (`2fr`)**: Sticky to viewport. `<aside class="sticky top-[s-64] h-max border-r border-bone-200">`. Items display `caption` — `{theme || place} · Day {day}` — active item uses `font-weight: 600; color: var(--brass-500)`.
*   **Right: Timeline Canvas (`10fr`)** — `role="feed"`:
    *   Day Header: `<h2 class="heading-m text-ink-900 mb-[s-16]">Day {day} · {place}{date ? " · " + date : ""}</h2>`
    *   Theme/Narrative text: `<p class="body-l text-ink-700 italic mb-[s-32]">{theme}</p>` + `<p class="body-m text-ink-700 mb-[s-64]">{daily_notes}</p>` when present.
    *   **Timeline Item (`<article role="article">`) structure:** `display: grid; grid-template-columns: 80px 1fr; gap: 24px; align-items: start`.
        *   Col 1: `<time class="caption text-ink-400 mt-[s-4]">{start_time || "—"}{end_time ? " – " + end_time : ""}</time>`
        *   Col 2: Card Component (§3) — `title`, `description`, `location`, `estimated_cost`, `reason` (profile-based), `flexibility` chip (`fixed`/`moveable`/`optional`).
        *   `type: "movement"` → Movement Connector (below) is the visual for that item; do not duplicate as an experience card.
    *   **Movement Connector:** `margin-left: 104px` (aligns with Col 2).
        *   DOM: `<div class="flex items-center gap-[s-16] py-[s-24] border-l border-bone-200 ml-[s-16] pl-[s-24]">`. Icon + Text (`movement` string, e.g., "Walk, ~15 min" or `estimated_cost`).
    *   **Rest Block (`type: "rest"`):** `background: var(--bone-100)`, `height: 120px`, centered `body-m text-ink-700` "Rest — {description || "no plans until " + next_start}"`, `border-radius: 16px`, NO imagery. `flexibility` badge when present.
    *   **Draft state:** When `plan.snapshot.state === "draft"` → container `border: var(--border-provisional)` and badge `<span class="absolute -top-3 right-4 bg-bone-50 border border-brass-500 text-brass-500 caption px-2 py-1 rounded-[8px]">Draft — not yet confirmed</span>`. Do not use `provisional` terminology.
*   **Floating Summary Strip:**
    *   Fixed DOM bottom-center. `<div class="fixed bottom-[s-32] left-1/2 -translate-x-1/2 bg-bone-50/90 backdrop-blur px-[s-24] py-[s-12] rounded-full elevation-2 border border-bone-200 flex gap-[s-24] body-m z-50">` — `plan.traveler_profile_reference` (truncated), `city_allocations` summary, `cost_summary.budget_position`.

### 4.9 Itinerary — Experience Detail (Card Expands via "Morph & Pour", `plan_ready`)

**Layout/DOM Structure:**
*   **Transition Mechanic:** When a card in §4.8 is activated, trigger a full-screen morph overlay (no route change — SPA view-swim, see §7.1).
*   **Wrapper:** `absolute inset-0 z-[100] bg-bone-50 overflow-y-auto`.
*   **Hero Asset:** `<div class="w-full h-[40vh] relative">` -> `<img loading="lazy" class="w-full h-full object-cover">` inside. Skeleton `bg-bone-200` when missing (never broken icon).
*   **Content:** `max-width: 800px; margin: -64px auto 128px; position: relative; z-index: 10;`.
    *   Title block: `<div class="bg-bone-50 pt-[s-32] pb-[s-16]">` (creates visual breakout from image).
    *   Headline: `display-l text-ink-900` — `items[].title`
    *   Subtitles: `body-l text-ink-700` — `location` · `start_time–end_time` · `flexibility`
    *   Description: `body-l text-ink-900 mt-[s-24]` — `items[].description`
    *   **Fit / Tradeoff Note:** `<blockquote class="relative p-[s-24] bg-bone-100 rounded-[8px] border-l-4 border-brass-500 text-ink-900 italic font-display body-l mt-[s-48]">{items[].reason || plan.fit_explanation excerpt}</blockquote>`
    *   Cost/movement: `body-m text-ink-700` when `estimated_cost`/`movement` present.
*   **Action Bar:** Sticky bottom — informational only in MVP. No `Swap` / `Replan` mutation in initial workflow (see §4.10). May show ghost button "Close" + `caption` "Want something different? You can request changes from Profile review."

### 4.10 Replanning — Deferred (Reserved for later phase)

**Status:** The initial planning workflow **does not accept** `replan.request`. The client must not render a live disruption intake modal that posts `replan.request` in `plan_ready`.

*   **If rendered for preview/forward-compatibility:** Keep the DOM spec below behind a `FEATURE_REPLANNING=false` flag and wire the primary button to show an inline `caption text-ink-400` "Replanning will be available in a later phase — for now, use Profile review to adjust your trip." Do not send `replan.request`; the server will reject it with `invalid_replan_request`.
*   **Reserved payload shape (not active):** `{ change_type: flight_delayed|weather|attraction_closed|budget_changed|duration_changed|fatigue|party_changed|preference_changed|other, details: { date?, condition? }, free_text }`. `change_type` values are reserved per contract.
*   **Forward-compat display spec (when phase ships):**
    *   **Modal Overlay:** `<div class="fixed inset-0 z-[200] bg-ink-900/40 backdrop-blur-sm flex justify-center items-center">`
    *   **Modal Body:** `<dialog open class="bg-bone-50 rounded-[12px] p-[s-48] max-w-[600px] w-full elevation-2 border-none relative">` — Headline `heading-l`, chip grid 3 cols, note textarea, 100% brass button.
    *   **In-Progress Banner:** `<div class="sticky top-[72px] z-[90] w-full bg-bone-100/95 backdrop-blur py-[s-16] border-y border-bone-200 flex justify-center items-center gap-[s-16]">` with 24px ripple + `body-m` "Replanning your trip..." — existing `final` plan remains authoritative until replacement `plan.snapshot { state: "final" }` arrives, at which point `workflow.completed` emits outcome.
    *   **Draft rendering during replanning:** Same `draft` badge/border as §4.8; never `provisional` wording.

---

## 5. Lifecycle Rail — Right Rail (10 logical stages, not 10 agents)

**Architecture correction:** The product has **3 reasoning agents** and **10 logical workflow stages** (see `docs/AGENT_ARCHITECTURE.md`). The rail visualizes *stages*, not agents. Tool-backed stages complete deterministically and still emit lifecycle events.

**Layout/DOM Structure:**
*   **Wrapper:** Persistent overlay outside of `<main>`.
*   **DOM Element:** `<aside id="lifecycle-rail" class="fixed right-0 top-0 h-screen transition-all duration-[--ease-flow] border-l border-bone-200 bg-ink-950 z-[300]" aria-expanded="false" style="width: 4px">`
*   **When Active / Expanded (`aria-expanded="true"`):** `width: 320px`. The 4px edge changes to `var(--brass-500)`.
*   **Content List (`padding: 32px`):**
    *   `<h4 class="caption text-bone-300 mb-[s-32]">In consultation</h4>`
    *   Items in contract order: `discovery`, `constraint_preference`, `experience_designer`, `mobility_logistics`, `cost_optimization`, `local_intelligence`, `simulation_risk`, `optimization`, `narrative_explanation`, `continuous_replanning` (rendered as disabled/ "Later phase" with empty-ring dot; never active in initial flow).
    *   Each item bound to `agent.lifecycle { agent: LifecycleKey, stage?, status: started|progressed|completed|failed, progress?: 0-100, summary: string }` and/or `planning.status { phase, status: queued|running|completed|failed, message, progress? }`. `summary`/`message` is traveler-safe prose only.
    *   Active Item Template:
        *   `<li class="flex items-start gap-[s-12] text-bone-50">`
        *   Col 1: `12px` dot with looping ripple underneath when `status: started|progressed`.
        *   Col 2: Title (e.g., "Mobility & Logistics" from key `mobility_logistics`).
        *   Subtitle: `body-m text-bone-200 mt-[s-4]` showing `summary`/`message`.
    *   Idle/Completed/Failed Templates:
        *   Idle: empty ring `border: 1px solid var(--bone-300)`, title `text-ink-400`, no subtitle.
        *   Completed: solid `bg-sage-500` dot, `text-bone-50`.
        *   Failed: `bg-clay-500` dot, `caption text-clay-500` summary.
*   **Visibility:** Hide completely below 1200px (`display: none`).

---

## 6. Accessibility & State Error Matrices

*   **Keyboard Nav:** Outline for focus states is `2px solid var(--brass-500); outline-offset: 4px;` Apply globally, do not remove `outline` without a fallback box-shadow. All `discovery.question` chip groups are `role="group"`; timeline is `role="feed"`, items `role="article"`.
*   **Color Contrast Overrides:** Do not place `body` text directly onto `brass-500`; use `ink-900` over `brass`.
*   **Focus & ARIA:** Choice chips `aria-pressed`, Day tabs `aria-selected`, Decision options `aria-pressed` single-select.

**Transport & Error Components (from `WEBSOCKET_CONTRACT.md`):**

*   **Envelope (all frames):** `{ message_id, kind: command|ack|event|error, type, session_id?, run_id?, command_id?, sequence? (server ack/event/error after run), occurred_at: ISO8601, payload }`. Unknown fields ignored; unknown `type` on command → `unsupported_message_type` rejection; unknown server event types ignored after diagnostics.
*   **Command Acknowledgements (immediate):**
    *   `command.accepted { command_id, accepted: true, deduplicated: bool, workflow_state }` — `deduplicated: true` means replay; do not mutate twice.
    *   `command.rejected { command_id, accepted: false, code, message, retryable: bool, workflow_state, recovery?: { current_question_id } }` — render `message` (never raw `code`) in `aria-live` region under the active view.
*   **Stable `code` values:** `invalid_envelope`, `unsupported_message_type`, `session_not_found`, `session_expired`, `invalid_workflow_state`, `question_not_current`, `invalid_selection`, `free_text_not_allowed`, `profile_not_ready`, `profile_revision_conflict`, `invalid_replan_request`, `run_cancelled`, `command_id_conflict`.
*   **Envelope errors (not tied to command):** `kind: "error", code, message, retryable`.
*   **Disconnected / WebSocket Dropped:** `<div class="fixed top-0 left-0 w-full h-[32px] bg-ink-900 flex justify-center items-center z-[500]"><span class="caption text-bone-50">Reconnecting...</span></div>` — no page block. On reconnect, send `session.start { session_id }` → new `run_id` from `has_recovery_state`; no replay. If `session.expired { reason: "backend_restart", can_start_new_session: true }` → show Arrival reset CTA.
*   **Superseded:** `session.superseded { replacement_run_id }` on old connection → stop sending commands, close socket, show `caption` "Continued in another tab."
*   **Timeout (12s failure of Ripple):** The `DOM` node for the loop gradient is deleted, replaced by `<span class="inline-block w-2 h-2 rounded-full bg-clay-500">`. Text overrides to `ink-700`, appending `<button class="underline text-brass-500" onclick="retryLastCommand()">Try again</button>` — retry uses same `command_id` (idempotent).
*   **Ordering:** Process server messages in increasing `sequence` per `run`; replace `profile.snapshot`/`plan.snapshot` only when `revision` is newer.

## 7. Application Architecture & Routing

**Do not use standard page-based routing** (e.g., standard Next.js `<Link>` hard reloads or React Router page swaps). The strict "Liquid Continuity" rule dictates that screens *pour* into one another.

### 7.1 View Coordinator Architecture
The application is a Single Page Application (SPA) view-swapper at the core canvas level, managed by a global State Machine (e.g., Zustand or React Context). 
*   **Transport:** Single JSON WebSocket at `WS /ws`, native ping/pong, no app heartbeat. One active connection per `session_id`; newer connection supersedes older. Auth not in v1; persistence in-memory only (lost on backend restart → `session.expired`).
*   **Root Structure:** `<App>` wraps an `<AnimatePresence>` (if Framer Motion) or CSS-Transition-Group overlay.
*   **Active View State:** Driven strictly by the server's `workflow_state` (`discovery` | `profile_review` | `planning` | `decision_required` | `plan_ready` | `cancelled` | `expired`) plus the latest `sequence`-ordered events. Also track `session_id`, `run_id`, `has_recovery_state`, `confirmed_profile_revision`, `profile.snapshot.revision`, `plan.snapshot.revision`, and `decision.request.decision_id` when present.
*   **Routing Logic:** When `workflow_state` changes (e.g., `discovery` -> `profile_review` on `profile.ready`, `profile_review` -> `planning` on `profile.confirm` accepted, `planning` -> `decision_required` on `decision.request`, `planning` -> `plan_ready` on `plan.snapshot {state:final}` + `workflow.completed`), the outgoing view triggers its `--ease-flow` exit animation, unmounts, and the incoming view mounts with `--ease-settle`. No browser navigation occurs. `sequence` orders rendering; `revision` guards snapshot replacement; `command_id` guarantees idempotency.
*   **Recovery:** After a network drop, create a new `run` via `session.start { session_id }` from `has_recovery_state`; do not replay missed events. Show the restored `discovery.question` or `profile.snapshot`/`decision.request`/`plan.snapshot` as appropriate.

### 7.2 The Tailwind Override Blueprint (Critical Constraint)
The AI must override the default Tailwind configuration. Standard Tailwind colors (red-500, blue-500), border-radii, and shadows **must be disabled or bypassed**. 

The AI must generate this `tailwind.config.ts` theme extension:
```typescript
theme: {
  extend: {
    colors: {
      bone: { 50: '#F6F3ED', 100: '#EFE9DE', 200: '#DDD5C7', 300: '#A89F8F' },
      ink:  { 400: '#8A8FA0', 700: '#4A5063', 900: '#1B1F2A', 950: '#12141C' },
      brass: { 200: '#D8C39A', 500: '#B08D57', 700: '#8C6F42' },
      clay: { 100: '#EDD9CF', 500: '#B5654A' },
      sage: { 100: '#E3E7DD', 500: '#7A8B72' }
    },
    fontFamily: {
      display: ['Fraunces', 'serif'], // Fallback: 'Canela' / 'GT Sectra' equivalents
      sans: ['General Sans', 'Inter', 'sans-serif'],
      mono: ['IBM Plex Mono', 'monospace']
    },
    spacing: {
      's-4': '4px', 's-8': '8px', 's-12': '12px', 's-16': '16px', 's-24': '24px',
      's-32': '32px', 's-48': '48px', 's-64': '64px', 's-96': '96px', 's-128': '128px'
    },
    transitionTimingFunction: {
      'flow': 'cubic-bezier(0.45,0,0.15,1)',
      'settle': 'cubic-bezier(0.16,1,0.3,1)',
      'micro': 'cubic-bezier(0.4,0,0.2,1)',
      'pour': 'cubic-bezier(0.65,0,0.35,1)'
    }
  }
}
```

---

## 8. Strictly Enforced TypeScript Interfaces (Data Binding)

To ensure the AI does not hallucinate props for the UI components, it must strictly build against the contracts — not the shapes below in isolation. Shapes below are **summaries for binding**; the authoritative field tables live in `docs/TRAVELER_PROFILE_SCHEMA.md`, `docs/FINAL_TRIP_PLAN_SCHEMA.md`, and `docs/WEBSOCKET_CONTRACT.md`.

```typescript
// 8.1 Envelope & workflow — from WEBSOCKET_CONTRACT.md
export type MessageKind = 'command' | 'ack' | 'event' | 'error';
export type CommandType = 'session.start' | 'discovery.answer' | 'profile.confirm' | 'profile.request_changes' | 'decision.respond' | 'run.cancel' | 'session.close';
export type EventType = 'session.ready' | 'discovery.question' | 'profile.snapshot' | 'profile.ready' | 'agent.lifecycle' | 'planning.status' | 'decision.request' | 'plan.snapshot' | 'workflow.completed' | 'session.expired' | 'session.superseded' | 'command.accepted' | 'command.rejected';
export type WorkflowState = 'discovery' | 'profile_review' | 'planning' | 'decision_required' | 'plan_ready' | 'cancelled' | 'expired';
export type LifecycleKey = 'discovery' | 'constraint_preference' | 'experience_designer' | 'mobility_logistics' | 'cost_optimization' | 'local_intelligence' | 'simulation_risk' | 'optimization' | 'narrative_explanation' | 'continuous_replanning'; // last = deferred

export interface Envelope<T = unknown> {
  message_id: string;
  kind: MessageKind;
  type: string;
  session_id?: string;
  run_id?: string;
  command_id?: string;
  sequence?: number; // required on server ack/event/error after run exists
  occurred_at: string; // ISO 8601 UTC
  payload: T;
}

// Commands
export type SessionStartPayload = { session_id: string | null };
export type DiscoveryAnswerPayload = { question_id: string; selected_option_ids: string[]; free_text: string };
export type ProfileConfirmPayload = { profile_revision: number };
export type ProfileRequestChangesPayload = { topics: string[]; free_text: string };
export type DecisionRespondPayload = { decision_id: string; option_id: string };
export type RunCancelPayload = { reason: string };
export type SessionClosePayload = { reason: string };

// Events (authoritative shapes — keep in sync with WEBSOCKET_CONTRACT.md)
export type DiscoveryQuestionPayload = {
  question_id: string;
  prompt: string;
  selection_mode: 'single' | 'multiple';
  required: boolean;
  options: { option_id: string; label: string; description?: string }[];
  free_text_mode: 'disabled' | 'optional' | 'only_if_no_option' | 'required';
  free_text_placeholder?: string;
};
export type SessionReadyPayload = { session_id: string; run_id: string; workflow_state: WorkflowState; has_recovery_state: boolean; confirmed_profile_revision: number | null };
export type ProfileSnapshotPayload = { revision: number; state: 'draft' | 'ready' | 'confirmed'; profile: TravelerProfile };
export type ProfileReadyPayload = { profile_revision: number; blocking_unknowns: string[] };
export type AgentLifecyclePayload = { agent: LifecycleKey; stage?: string; status: 'started' | 'progressed' | 'completed' | 'failed'; progress?: number; summary: string };
export type PlanningStatusPayload = { phase: 'profile_validation' | 'destination_design' | 'experience_selection' | 'mobility' | 'cost' | 'simulation' | 'optimization' | 'decision_required' | 'explanation' | 'replanning'; status: 'queued' | 'running' | 'completed' | 'failed'; message: string; progress?: number };
export type DecisionRequestPayload = { decision_id: string; profile_revision: number; reason: 'material_tradeoff' | 'no_admissible_candidate'; prompt: string; options: { option_id: string; label: string; tradeoff: string }[] };
export type PlanSnapshotPayload = { revision: number; state: 'draft' | 'final'; plan: FinalTripPlan };
export type WorkflowCompletedPayload = { outcome: 'final_plan_available' | 'cancelled'; final_plan_revision?: number };
export type SessionExpiredPayload = { reason: 'backend_restart'; can_start_new_session: boolean };
export type SessionSupersededPayload = { replacement_run_id: string };

// 8.2 Traveler Profile — from TRAVELER_PROFILE_SCHEMA.md (no itinerary / no rankings)
export interface TravelerProfile {
  profile_id: string;
  trip_context: {
    destination_request: string; // traveler-provided; seed is §4.1 intent textbox
    resolved_destination?: string;
    start_date?: string; // YYYY-MM-DD
    end_date?: string;   // YYYY-MM-DD, >= start_date
    duration_days?: number;
    date_flexibility?: string;
    party_size: number; // positive whole number
    party_notes?: string;
    budget?: { amount: number; currency: string; scope: string };
  };
  purpose_and_priorities: {
    primary_purpose: string;
    secondary_purposes?: string[];
    priorities: string[];
    success_definition?: string;
  };
  preferences: { category: string; strength: 'must_have' | 'strong' | 'nice_to_have' | 'not_interested' | 'unknown'; notes?: string; source: 'stated' | 'inferred' | 'defaulted'; confidence?: 'high' | 'medium' | 'low' }[];
  travel_style: {
    pace: 'slow' | 'balanced' | 'fast' | 'unknown';
    energy_pattern?: 'morning' | 'afternoon' | 'evening' | 'consistent' | 'unknown';
    walking_tolerance: 'low' | 'medium' | 'high' | 'unknown';
    crowd_tolerance: 'low' | 'medium' | 'high' | 'unknown';
    comfort_preference?: 'comfort_first' | 'balanced' | 'exploration_first' | 'unknown';
    spontaneity?: 'structured' | 'some_flexibility' | 'spontaneous' | 'unknown';
  };
  hard_constraints: {
    must_visit: string[];
    avoid: string[];
    dietary_requirements: string[];
    accessibility_requirements: string[];
    accommodation_requirements: string[];
    maximum_daily_travel?: string;
    maximum_hotel_changes?: number;
    budget_ceiling?: string;
  };
  unknowns: { topic: string; impact: 'blocking' | 'material' | 'minor'; description: string }[];
  assumptions: { topic: string; value: string; reason: string; user_confirmation_needed: boolean }[];
}

// 8.3 Final Trip Plan — from FINAL_TRIP_PLAN_SCHEMA.md (practical document, not internal state)
export interface FinalTripPlan {
  plan_title: string;
  summary: string;
  traveler_profile_reference: string; // profile_id / revision reference
  trip_dates: { start_date?: string; end_date?: string; duration_days?: number; date_flexibility?: string };
  destination_route: { place: string; arrival_from?: string; departure_to?: string; order: number }[];
  city_allocations: { place: string; nights?: number; days: number; reason?: string }[];
  accommodation?: { place: string; nights: number; recommendation: string; reason: string; estimated_cost?: string; status: 'suggested' | 'selected_by_traveler' | 'not_yet_decided' }[];
  days: { day: number; date?: string; place: string; theme?: string; items: { type: 'experience' | 'meal' | 'rest' | 'movement'; title: string; start_time?: string; end_time?: string; location?: string; description: string; movement?: string; estimated_cost?: string; reason?: string; flexibility?: 'fixed' | 'moveable' | 'optional' }[]; daily_notes?: string }[];
  cost_summary: { currency: string; estimated_total: string; scope: string; categories: { name: string; amount: string }[]; budget_position: 'within_target' | 'near_target' | 'above_target' | 'budget_unknown'; caveats: string[] };
  fit_explanation: string[];
  tradeoffs: { what_gained: string; what_given_up: string; why: string }[];
  assumptions: string[];
  warnings: string[];
  unresolved_details: string[];
}
```

**Binding rules:**
*   Do not hallucinate `ProfileTrait`, `TimelineItem.subtitle`, `TripSnapshot.trip_id`, `ComponentState provisional`, or `JourneyPhase 'session.start'` — those shapes are removed.
*   `profile.snapshot` and `plan.snapshot` are **complete snapshots** — replace, don't patch. Gate replacement on `revision` monotonicity and `sequence` ordering.
*   `decision_required` is a first-class view, not an error state.
*   `border-provisional` maps to `plan.snapshot.state === "draft"`, not an ad-hoc `system_state`.

---

## 9. Recommended Component Tree / File Structure

For the AI to scaffold this intelligently, it should adhere to a strict atomic file structure keeping Layout, UI primitives, and specific Journey features entirely decoupled.

```text
/src
  /components
    /ui              # The completely dumb primitives (Tokens applied here ONLY)
      ChoiceChip.tsx          # obeys selection_mode / free_text_mode
      LifecycleRipple.tsx     # was AgentRipple — now LifecycleRipple (same visuals)
      ExperienceCard.tsx      # handles draft (dashed brass + badge) vs final
      MovementConnector.tsx
      Typography.tsx
      IntentTextbox.tsx       # §4.1 aesthetic textarea (new)
      DecisionOptionCard.tsx  # §4.5 decision_required options (new)
    
    /shell           # The persistent Layer overlays (See §1.1)
      GlobalHeader.tsx        # maps workflow_state → caption
      LifecycleRail.tsx       # was AgentConsoleRail — 10 logical stages, 3 agents
      ReconnectionToast.tsx
      SupersededToast.tsx     # session.superseded (new)

  /features          # Phase-specific smart components
    /arrival
      ArrivalHero.tsx         # includes IntentTextbox
    /discovery
      InterviewCanvas.tsx     # renders discovery.question schema + recovery
      ProfileRail.tsx         # renders profile.snapshot (real TravelerProfile)
    /profile-review
      ProfileReview.tsx       # profile.confirm / profile.request_changes
    /consultation
      ConsultationState.tsx   # planning.status + agent.lifecycle
    /decision
      DecisionCheckpoint.tsx  # decision.request → decision.respond (new)
    /itinerary
      TradeoffBrief.tsx       # reads plan.tradeoffs / fit_explanation (new name)
      TripOverview.tsx        # reads destination_route / city_allocations / cost_summary
      DayCanvas.tsx           # reads days[].items (experience/meal/rest/movement)
      ExperienceDetailModal.tsx

  /store             # Global state (No UI here)
    useJourneyStore.ts  # Zustand: workflow_state, sequence, revisions, decision_id
    useWebSocket.ts     # Envelope codec, command_id idempotency, sequence ordering

  /contracts         # New — authoritative types (no UI)
    envelope.ts
    traveler-profile.ts
    final-trip-plan.ts

  /features/replanning  # Deferred — gated by FEATURE_REPLANNING=false
    DisruptionModal.tsx   # reserved replan.request shape, not wired in MVP
```

---

## 10. Ultimate Failure Constraints for the AI
*   **Rule A (Images):** The AI must implement lazy loading (`loading="lazy"`) and soft-fade-ins for all photography. Missing images must display a `var(--bone-200)` skeleton state, **never a broken image icon**.
*   **Rule B (Responsiveness):** Even though it is desktop-first, the AI must ensure that on window resizes below 1024px, the layout maintains its flex-order and does not horizontally scroll. Hide the Right Rail (Lifecycle Rail) beneath 1200px completely. 
*   **Rule C (State Resilience):** The AI must bind *every* input choice, intent submit, or "Continue" action to an explicit check against a loading variable (`isBusy`) and a fresh `command_id`. The UI must instantly show disabled states (opacity 40%) until `command.accepted`/`command.rejected` and the subsequent `sequence`-ordered events arrive. Never trust optimistic updates. Duplicate `command_id` with same payload is idempotent; with different payload → `command_id_conflict`.
```

