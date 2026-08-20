# Voyager — UI/UX Design System & Core Journey Specification

### v1.1 — "Quiet Luxury, Liquid Intelligence" · Desktop-First Web Application · Protocol-Reconciled

---

## 0. Design Philosophy

Voyager is not a search engine for destinations — it is a private travel consultancy powered by ten specialized reasoning agents. The interface must never look like a dashboard, a form-builder, or a booking site. It should feel like sitting across from a trusted concierge at a quiet hotel desk: unhurried, precise, warm, and confident enough to say little.

Four governing principles translate this into pixels:

1. **Restraint as luxury.** Colour, motion, and ornament are budgeted like a rare material — used exactly where meaning lives, nowhere else.
2. **Visible intelligence, invisible machinery.** The 10-agent architecture is felt, not exposed. No technical labels, no percentages, no raw system keys, ever.
3. **Liquid continuity.** Nothing cuts. Screens pour into one another; state changes look like water finding a new level.
4. **Honesty over illusion.** The interface only ever shows what is actually known, actually confirmed, or actually final. Assumptions are labeled as assumptions. Provisional states are labeled as provisional. Nothing is implied that the backend cannot back up.

---

## 1. Foundations

### 1.1 Color System

**Neutral — "Bone" (primary surfaces)**
| Token | Hex | Usage |
|---|---|---|
| `bone-50` (canvas) | `#F6F3ED` | App background |
| `bone-100` (surface) | `#EFE9DE` | Cards, panels, input fields, Stated profile chips |
| `bone-200` (line) | `#DDD5C7` | Hairline borders, dividers |
| `bone-300` (muted) | `#A89F8F` | Disabled states, placeholders |

**Neutral — "Ink" (text & dark surfaces)**
| Token | Hex | Usage |
|---|---|---|
| `ink-900` | `#1B1F2A` | Headlines, primary body copy |
| `ink-700` | `#4A5063` | Supporting copy, labels |
| `ink-400` | `#8A8FA0` | Captions, timestamps, metadata |
| `ink-950` | `#12141C` | Reserved for the Consultation screen only |

**Signature Accent — "Brass"**
| Token | Hex | Usage |
|---|---|---|
| `brass-500` | `#B08D57` | Primary CTA, active agent state, Assumed-chip outline, provisional borders |
| `brass-200` | `#D8C39A` | Hover fills, subtle highlights |
| `brass-700` | `#8C6F42` | Pressed state |

**Signal Colors** (desaturated; always paired with text/shape, never colour alone)
| Token | Hex | Usage |
|---|---|---|
| `clay-500` / `clay-100` | `#B5654A` / `#EDD9CF` | Warnings, "worth knowing" content |
| `sage-500` / `sage-100` | `#7A8B72` / `#E3E7DD` | Confirmed/resolved states |

**Rule of thumb:** any single screen uses Bone as 80%+ of surface, Ink for text, Brass as the only saturated colour permitted more than once.

### 1.2 Typography

| Role | Typeface |
|---|---|
| Display / Headlines | **Fraunces** (variable, optical sizing) — production equivalent GT Sectra/Canela |
| UI / Body | **General Sans** (fallback Inter) |
| Data / Metrics | **IBM Plex Mono**, Light/Regular — used sparingly, see §3 note on Metric Dial status |

| Token | Size/Line-height | Weight | Face |
|---|---|---|---|
| `display-xl` | 56/62px | 400 | Fraunces |
| `display-l` | 40/46px | 400 | Fraunces |
| `heading-l` | 28/34px | 500 | Fraunces |
| `heading-m` | 22/28px | 500 | General Sans |
| `body-l` | 18/28px | 400 | General Sans |
| `body-m` | 16/24px | 400 | General Sans |
| `caption` | 13/18px | 500, +2% tracking | General Sans, uppercase for labels |
| `data-l` / `data-m` | 32/36 · 18/24px | 300/400 | IBM Plex Mono |

Never bold body copy for emphasis — use Brass colour or Fraunces italic instead.

### 1.3 Spatial System

- Canvas 1440px, content max-width 1240px centered. Margins 96px (≥1440px) → 64px (1200px) → 32px (1024px, minimum supported width).
- Grid: 12-column, 24px gutter. Spacing scale (4px base): `4·8·12·16·24·32·48·64·96·128`.
- No primary block sits closer than 48px to another; card padding minimum 24–32px.

### 1.4 Shape & Elevation

| Token | Radius | Usage |
|---|---|---|
| `radius-s` | 8px | Inputs, chips, buttons |
| `radius-m` | 16px | Cards, experience tiles |
| `radius-l` | 28px | Panels, modals, Agent Console sheet |

| Token | Value |
|---|---|
| `elevation-1` | `0 2px 8px rgba(27,31,42,0.06)` |
| `elevation-2` | `0 8px 24px rgba(27,31,42,0.08)` |
| `elevation-3` | `0 24px 64px rgba(27,31,42,0.16)` |

**Border states (new in v1.1):**
| Token | Value | Meaning |
|---|---|---|
| `border-solid` | 1px `bone-200` | Confirmed / settled content |
| `border-provisional` | 1.5px dashed `brass-500` | Draft/unconfirmed data — used whenever content has not yet arrived as `state:"final"` |
| `border-assumed` | 1.5px dashed `brass-500` (chip context) | System-inferred, not user-confirmed |

### 1.5 Iconography & Imagery

Single-weight line icons, 1.5px stroke, no fills, no duotone. **No emoji anywhere in the product — including condition chips and quick-select controls.** Photography is full-bleed, editorial, natural light. No stock icons, no illustrated mascots, no decorative gradients (the only permitted gradient is the Brass-to-transparent radial in the Agent Ripple).

---

## 2. Motion Language — "Liquid Flow"

### 2.1 Easing & Duration Tokens

| Token | Curve | Duration | Used for |
|---|---|---|---|
| `ease-flow` | `cubic-bezier(0.45,0,0.15,1)` | 320–420ms | Primary screen/panel transitions |
| `ease-settle` | `cubic-bezier(0.16,1,0.3,1)` | 400–600ms | Elements arriving into view |
| `ease-micro` | `cubic-bezier(0.4,0,0.2,1)` | 120–180ms | Hover, press, toggle |
| `ease-ripple` | sinusoidal, looping | 2400–4000ms | Ambient "agent active" states, indeterminate progress |
| `ease-pour` | `cubic-bezier(0.65,0,0.35,1)` | 600–900ms | Card→detail expansion, itinerary recompose |

No overshoot, no bounce, no elastic easing anywhere. Nothing moves faster than 100ms or slower than 900ms except ambient loops.

### 2.2 Signature Interactions

**① The Liquid Thread — indeterminate.** A 2px Brass line with a soft glow drifts continuously along its channel (`ease-ripple`); it never fills toward a target and never implies a known question count or percentage. Used wherever an interview or process is "in progress" with no knowable length: Discovery, Consultation, Replanning.

**② The Agent Ripple.** A soft radial pulse, `brass-500 → transparent`, looping on `ease-ripple`, always paired with exactly one line of server-provided `summary` text beneath it (never a raw key, never a percentage — see §6). **Carries a 12-second soft timeout**: past that point it swaps to a steady, non-looping fallback line plus a **Try again** action rather than looping indefinitely.

**③ Morph & Pour.** The primary navigation transition — a card expands in place, background defocuses (8px blur, `ease-flow`), new content fades up 8px staggered 40ms/element on `ease-settle`. Reversed exactly for "back." This is also now the **Recompose** transition: when a replanned itinerary arrives as a new final snapshot, the entire Day Canvas performs a full Morph & Pour re-render rather than any item-level diff animation (see §5.9 — v1.1 no longer guarantees old-to-new pairing).

**Provisional treatment (replaces the v1.0 "diff breathing" motif):** content that has arrived as a draft, not yet `state:"final"`, is rendered with `border-provisional` (dashed Brass) and a `caption` label reading *"Provisional — not yet confirmed."* No animation is used to claim a change happened until the confirmed snapshot arrives — the border alone communicates "not settled yet."

---

## 3. Core Component Library

| Component | Description | Status |
|---|---|---|
| **Button — Primary** | Ink fill / Bone text, or Brass fill for the single most important action per screen. `radius-s`, 44px height. | Active |
| **Button — Ghost** | Ink text, hairline border, no fill. Default for secondary actions. | Active |
| **Choice Chip** | Single/multi-select, `bone-100` fill → Ink fill inverted when selected. **This is the only guaranteed v1 interaction control** for Discovery and Replanning condition intake. | Active |
| **Optional Note Field** | Single-line text input beneath a Choice Chip group, behavior driven entirely by server-sent mode (`disabled` / `optional` / `only_if_no_option` / `required`). Never styled as chat. | Active — new |
| **Profile Chip — Stated** | Solid `bone-100` fill, Ink text. Represents a user-confirmed preference. | Active — new |
| **Profile Chip — Assumed** | Same shape, `border-assumed` (dashed Brass), small "assumed" caption on hover/tap. Represents system inference. | Active — new |
| **Experience Card** | Full-bleed 4:3 photo, `radius-m`, `elevation-1`; hover scales 1.015 + `elevation-2`. | Active |
| **Meal Card** | Same visual family, 2:3 photo, no time-slot emphasis. | Active — new |
| **Movement Connector** | No photo; thin horizontal line + icon + mode + approximate duration; deliberately lower visual weight than any card. | Active — new |
| **Rest Block** | `bone-100` fill, no photo, centred caption (e.g. *"Rest — no plans until 4:00 PM"*); styled as an intentional pause. | Active — new |
| **Fixed/Flexible Tag** | Small `caption` pill on any itinerary item indicating timing rigidity. | Active — new |
| **Tradeoff Card** | Two-column card, deltas in `data-m` mono, no red/green judgment colour. | Active |
| **Plan Detail Accordion** | Closed-by-default sections: Recommended stay · Cost scope · Why this fits you · Tradeoffs · Assumptions we made · Worth knowing · Still to confirm. "Worth knowing" auto-expands if populated. | Active — new |
| **Narrative Note** | Fraunces-italic annotation card, Brass left-rule, anchored beside the decision it explains. Always sourced from server narrative content. | Active |
| **Agent Console Rail** | See §6. | Active |
| **Slider** | Numeric range control. | **Deferred** — no protocol support for min/max/step; not used anywhere in v1.1 |
| **Map-pin Picker** | Coordinate selection. | **Deferred** — same reason |
| **Metric Dial** | Circular gauge for a scored value. | **Defined, unused in v1.1** — reintroduce only if a future `simulation.summary` / `experience_insights` contract ships user-safe scores |
| **Disabled Control** | Any control at 40% opacity, `cursor:not-allowed`, no colour change, shown while workflow is busy. | Active — new |

---

## 4. Information Architecture — The Core Journey

```
ARRIVAL
   ↓  session.start
DISCOVERY            (workflow: discovery)
   ↓  discovery complete (agent-decided, no fixed question count)
PROFILE REVIEW        (workflow: profile_review)
   ↓  user confirms via "Confirm Profile"
CONSULTATION           (workflow: planning — includes simulation as a sub-phase)
   ↓  plan.snapshot { state: "final" }
ITINERARY — TRIP OVERVIEW    (workflow: plan_ready)
   ↓
ITINERARY — DAY / CITY CANVAS
   ↓ (open a card)
ITINERARY — EXPERIENCE DETAIL
   ↓ (a condition changes)
REPLANNING — DISRUPTION INTAKE    (workflow: replanning)
   ↓  quiet in-place "Replanning…" state, existing plan stays authoritative
   ↓  new plan.snapshot { state: "final" } arrives
ITINERARY — DAY CANVAS (recomposed via Morph & Pour, narrative banner explains the change)
```

**Workflow state → phase indicator mapping** (top bar, `caption` style, current phase in Brass):

| Protocol state | Phase label |
|---|---|
| `discovery` | Discovery |
| `profile_review` | Review your profile |
| `planning` | Consultation |
| `plan_ready` | Itinerary |
| `replanning` | Replanning |
| `expired` / `cancelled` | *(phase bar hidden — recovery screen shown, §7)* |

---

## 5. Screen Specifications

### 5.1 Arrival

Unchanged. Full-bleed slow-drift photograph (40s loop, 1.0→1.04 scale), single headline (*"Where shall we begin?"*), single Brass CTA (*"Begin the Interview"*). Dispatches `session.start`. On click: photo defocuses and dims as the Discovery panel pours up (`ease-pour`).

---

### 5.2 Discovery — Adaptive Interview

**Layout (65/35 asymmetric):**
```
┌───────────────────────────────┬────────────────┐
│  Liquid Thread (indeterminate   │  Traveler       │
│  drift, no fill target)          │  Profile        │
│                                 │  (forming)      │
│   [Server-authored question,      │                 │
│    heading-l Fraunces]             │  [Stated chips  │
│                                 │   solid fill]   │
│   ◯ Choice Chip                  │  [Assumed chips │
│   ◯ Choice Chip                  │   dashed brass] │
│   ◯ Choice Chip   (single or       │                 │
│      multi per selection_mode)      │                 │
│                                 │                 │
│   [Optional note field —           │                 │
│    shown/required per server         │                 │
│    mode, see table below]            │                 │
│                                 │                 │
│              [Continue →]        │                 │
└───────────────────────────────┴────────────────┘
```
- **Only Choice Chips + optional note** are guaranteed controls. Any question requiring a numeric range (e.g. budget) is pre-bucketed into chips server-side (e.g. *Under ₹1L · ₹1–2L · ₹2–3L · Flexible*).
- **Optional note field**, four server-controlled modes:

| Mode | Behavior |
|---|---|
| `disabled` | Not rendered |
| `optional` | Visible, can accompany selected chips |
| `only_if_no_option` | Visible only while nothing is selected; disables the moment a chip is chosen |
| `required` | Visible; `Continue` disabled until filled |

- **Right panel** — Profile Chip Rail, built *exclusively* from `profile.snapshot`, never from local answer tracking. Stated vs. Assumed chip styling (§3) makes the system's confidence visible at every step.
- Between questions: a brief (≤600ms) Agent Ripple with server `summary` text bridges to the next question — this is the adaptive branching made visible, without claiming a known progress amount.
- Discovery ends when the **server** signals completion (`workflow → profile_review`) — there is no client-side "final question."

---

### 5.3 Profile Review *(new gate — required before planning begins)*

```
┌────────────────────────────────────────────────┐
│   "Here's what we've understood."  (heading-l)     │
│                                                  │
│   Grouped by theme — Pace & Comfort · Interests ·   │
│   Constraints — each line a Stated or Assumed chip.  │
│                                                  │
│   Unknowns stated plainly:                          │
│   "We don't yet know your walking tolerance —        │
│    we'll assume moderate unless you tell us."         │
│                                                  │
│        [Confirm Profile]  (Brass, primary)           │
│        [Request changes]  (ghost)                      │
└────────────────────────────────────────────────┘
```
- **No itinerary generation begins until "Confirm Profile" is pressed.** This is a hard gate, matching the protocol's required sequence.
- "Request changes" reopens a scoped, topic-specific Choice Chip interaction (reusing the Discovery component) and dispatches `profile.request_changes`; on completion, returns to an updated Profile Review, not straight to planning.
- On confirm: Morph & Pour into the Consultation screen.

---

### 5.4 Consultation (Simulation, as a planning sub-phase)

**The one screen that shifts into the Ink palette** (`ink-950` background) — signals "the concierge has stepped away to consult":

```
┌────────────────────────────────────────────────┐
│  [ink-950, full viewport]                          │
│                                                  │
│         (Agent Ripple, centred, large,              │
│          12s soft timeout)                           │
│                                                  │
│      [server `summary` text, body-l, Bone,           │
│       centred — e.g. "Consulting on comfort           │
│       and feasibility…"]                              │
└────────────────────────────────────────────────┘
```
- Numeric `progress` is **never rendered**. Raw agent keys and phase names (`mobility_logistics`, `experience_selection`, `simulation`) are **never shown** — only the mapped plain-language line (§6).
- If the Ripple's 12s timeout is reached with no new event, it swaps to a steady fallback line + **Try again**, without disappearing.
- On `plan.snapshot{state:"final"}`: slow `ease-flow` fade from Ink back to Bone as the Tradeoff summary (§5.5) pours in.

---

### 5.5 A Calmer Version of Your Trip (formerly "Before/After")

**No numeric metrics** — the current contract excludes simulation internals, so this screen is now built entirely from the plan's `tradeoffs` / `fit_explanation` content:

```
┌────────────────────────────────────────────────┐
│   "A calmer version of your trip."  (heading-l)     │
│                                                  │
│   [Tradeoff Cards, vertical stack]                    │
│   "Replacing the central hotel with one 10 min         │
│    farther saves ₹12,000 and adds 35 min daily          │
│    transit."                                              │
│                                                  │
│        [View your itinerary →]  (Brass)               │
└────────────────────────────────────────────────┘
```
"View your itinerary" is **local navigation only** — there is no `plan.accept` command; a plan is already final the instant its snapshot arrived. The button never implies it is "committing" anything.

---

### 5.6 Itinerary — Trip Overview

```
┌────────────────────────────────────────────────┐
│  "Your Japan, in eleven days."  (display-l)          │
│                                                  │
│  [City allocation bar — Brass-tinted proportional       │
│   segments, hairline dividers, tap → Day Canvas]           │
│                                                  │
│  [Muted line-art cartography — Bone/Ink, single           │
│   Brass route line]                                        │
│                                                  │
│  Trip essentials (right rail, quiet captions)                │
│                                                  │
│  [Plan Detail accordion — closed by default,                │
│   "Worth knowing" auto-expanded if populated]:                │
│     Recommended stay                                          │
│     What's included / not included                             │
│     Why this fits you                                            │
│     Tradeoffs                                                     │
│     Assumptions we made                                            │
│     Worth knowing                                                   │
│     Still to confirm                                                  │
│                                                  │
│   "Want something different?"  (ghost — routes into           │
│    Replanning with change_type: preference_changed)              │
└────────────────────────────────────────────────┘
```
Language throughout avoids any implication that lodging or transport is booked — always "recommended" / "suggested," never "reserved."

---

### 5.7 Itinerary — Day / City Canvas

```
┌───────────────┬──────────────────────────────┐
│  Day tabs       │   Day 2 · Kyoto                  │
│  (vertical,      │   "A morning among shrines…"       │
│  minimal)         │                                    │
│                 │   06:00  [Experience Card] [Fixed]    │
│                 │   ───────────────────────────────      │
│                 │   08:15  [Movement Connector —           │
│                 │           walk, ~15 min]                   │
│                 │   ───────────────────────────────          │
│                 │   09:30  [Meal Card] [Flexible]              │
│                 │   ───────────────────────────────              │
│                 │   11:00  [Rest Block — "no plans                │
│                 │           until 4:00 PM"]                          │
└───────────────┴──────────────────────────────┘
```
All four item types (`experience`, `meal`, `movement`, `rest`) now have explicit, intentional presentation — a rest block is a designed moment, not empty space. Fixed/Flexible tags appear wherever the plan indicates timing rigidity.

A floating `elevation-1` summary strip pins to the bottom on scroll (distance, cost, one-line comfort read) — quiet, always visible.

---

### 5.8 Itinerary — Experience Detail

```
┌────────────────────────────────────────────────┐
│  [full-bleed hero photograph, 40vh]                  │
│                                                  │
│   Sunrise Photography at Fushimi Inari                  │
│   06:00–08:00 · Fushimi, Kyoto · Free                      │
│                                                  │
│   [Narrative Note — the entire explanatory content       │
│    of this screen, sourced from the plan's fit             │
│    explanation / tradeoff content]                           │
│   "Included for its regret score — travelers who              │
│    skip this consistently name it their biggest miss."         │
│                                                  │
│   [Swap this experience]  (ghost)                           │
└────────────────────────────────────────────────┘
```
Raw metric dials (regret score, crowd level, authenticity, walking intensity) are **removed** — not currently exposed by the Final Trip Plan schema. The Narrative Note carries the full explanatory weight instead.

---

### 5.9 Replanning — Disruption Intake

```
┌────────────────────────────────────────────────┐
│         "What's changed?"  (heading-l)                │
│                                                  │
│   [Weather]  [Flight delay]  [Attraction closed]         │
│   [Budget]   [Trip length]   [Fatigue]  [Other]              │
│   (single-weight line-icon chips — no emoji)                    │
│                                                  │
│   Optional note — visible once a chip is chosen,                  │
│   required only when "Other" is selected                              │
│                                                  │
│              [Replan →]  (Brass)                          │
└────────────────────────────────────────────────┘
```
Typed `change_type` chips are primary; free text is secondary context, matching the required command shape. "Other" is the only path where text becomes mandatory (the backend needs *some* signal to reason from).

---

### 5.10 Replanning — In Progress & Resolution

```
┌────────────────────────────────────────────────┐
│  [existing Day Canvas — fully visible, unchanged,      │
│   remains authoritative]                                 │
│                                                  │
│  ┌────────────────────────────────────────┐         │
│  │  ○ Replanning your trip…  (small Agent      │         │
│  │    Ripple, banner pinned above canvas)       │         │
│  └────────────────────────────────────────┘         │
└────────────────────────────────────────────────┘
```
- The current plan **stays fully visible and authoritative** throughout — no items are marked as changed, moved, or removed before a new final snapshot exists, since the protocol provides no stable IDs to support a trustworthy diff.
- If the server sends an interim/draft snapshot, it renders with `border-provisional` (dashed Brass) and the caption *"Provisional — not yet confirmed."*
- On `plan.snapshot{state:"final"}`: the Day Canvas performs a full **Recompose** (Morph & Pour across the whole canvas), followed by a single Narrative Note banner at the top carrying the server's own plain-language summary of the change — e.g. *"Because of tomorrow's rain, we moved your afternoon indoors."*

---

## 6. Agent Console — Formal Mapping

Persistent 4px Brass-on-Ink rail, right edge, collapsed by default; expands to a 320px panel:

```
┌─────────────────────┐
│  In consultation        │
│  ● Mobility & Logistics   │  ← active, Ripple dot
│    [server `summary`]        │
│  ○ Cost Optimization       │  ← idle
│  ○ Experience Design         │
│  ○ Trip Explanation             │
└─────────────────────┘
```

| Protocol key | Rendered as |
|---|---|
| `experience_designer` | Experience Design |
| `mobility_logistics` | Mobility & Logistics |
| `simulation_risk` | Comfort & Feasibility |
| `narrative_explanation` | Trip Explanation |
| *(any other key)* | Static lookup table — never shown raw |

**Absolute rules:** numeric `progress` is never rendered; raw agent keys are never shown; technical phase names (`experience_selection`, `simulation`, etc.) are never shown; the single line of copy under any Ripple is always the server's `summary`, falling back to a static per-agent phrase (never a raw value) if `summary` is missing.

---

## 7. Error & Recovery States

All treated with the same restraint as the rest of the product — no red alert banners, no blocking modal dialogs:

| Situation | Treatment |
|---|---|
| Stale/invalid answer selected | Inline note beside the rejected chip; chip returns to unselected |
| Connection dropped, reconnecting | Slim top banner, *"Reconnecting…"*, micro Ripple, non-blocking |
| `session.expired` | Full calm screen: *"This session has ended,"* single **Start again** |
| `session.superseded` | Full calm screen: *"You're viewing this from another tab,"* single **Continue here** |
| Planning/replanning failure | Ripple swaps copy to a steady fallback line + **Try again** |
| Cancellation | Confirms locally, returns to last stable screen, no modal |
| Command disabled (workflow busy) | Control at 40% opacity, `cursor:not-allowed`, no tooltip |
| Ripple exceeds 12s with no event | Same as failure — never loops indefinitely |

---

## 8. Accessibility & Contrast

- `ink-900` on `bone-50` = 15.1:1 (AAA). `ink-700` on `bone-100` = 7.8:1 (AAA, body text).
- Brass fails AA for small text (3.1:1) — never used for body copy, only large numerals (≥24px), icons with adjacent labels, or as a fill beneath Bone/Ink text.
- **Stated vs. Assumed, and Confirmed vs. Provisional, are never colour-only distinctions** — each pairs a shape change (solid vs. dashed border) with a text label, satisfying non-colour-dependent recognition.
- All ambient loops (Ripple, Ken-Burns, indeterminate Thread) respect `prefers-reduced-motion`, falling back to a static state with a subtle opacity fade only.

---

## 9. Implementation Handoff — Token & Protocol Reference

```
COLOR
  bone-50 #F6F3ED  bone-100 #EFE9DE  bone-200 #DDD5C7  bone-300 #A89F8F
  ink-900 #1B1F2A  ink-700 #4A5063  ink-400 #8A8FA0  ink-950 #12141C
  brass-500 #B08D57  brass-200 #D8C39A  brass-700 #8C6F42
  clay-500 #B5654A  clay-100 #EDD9CF  sage-500 #7A8B72  sage-100 #E3E7DD

TYPE   Display/Headings: Fraunces (400/500)  ·  Body/UI: General Sans (400)  ·  Data: IBM Plex Mono (300/400)
       Scale: 56/40/28/22/18/16/13px

SPACE  4·8·12·16·24·32·48·64·96·128        RADIUS  s:8  m:16  l:28
BORDER solid:1px bone-200  ·  provisional/assumed:1.5px dashed brass-500

MOTION flow:cubic-bezier(.45,0,.15,1)@320-420ms  ·  settle:cubic-bezier(.16,1,.3,1)@400-600ms
       micro:cubic-bezier(.4,0,.2,1)@120-180ms   ·  pour:cubic-bezier(.65,0,.35,1)@600-900ms
       ripple: sinusoidal loop @2400-4000ms, 12s soft timeout

WORKFLOW STATE MAP
  discovery → Discovery · profile_review → Review your profile · planning → Consultation
  plan_ready → Itinerary · replanning → Replanning · expired/cancelled → recovery screen

AGENT KEY MAP
  experience_designer → Experience Design · mobility_logistics → Mobility & Logistics
  simulation_risk → Comfort & Feasibility · narrative_explanation → Trip Explanation

CHANGE_TYPE (Replanning, typed, chip-driven)
  flight_delayed · weather · attraction_closed · budget_changed · duration_changed
  fatigue · party_changed · preference_changed · other (note required)

DEFERRED (not in v1.1)
  Slider control · Map-pin picker · Metric Dial (unused, pending simulation.summary /
  experience_insights contracts) · plan.accept/reject/alternatives commands ·
  item-level old→new diff pairing
```

---