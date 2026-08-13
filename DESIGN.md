# Sahyatri — UI/UX Design System & Core Journey Specification
### *"Quiet Luxury, Liquid Intelligence"* — Desktop-First Web Application

---

## 0. Design Philosophy

Sahyatri is not a search engine for destinations — it is a private travel consultancy powered by ten specialized reasoning agents. The interface must never look like a dashboard, a form-builder, or a booking site. It should feel like sitting across from a trusted concierge at a quiet hotel desk: unhurried, precise, warm, and confident enough to say little.

Three governing principles translate this into pixels:

1. **Restraint as luxury.** Colour, motion, and ornament are budgeted like a rare material — used exactly where meaning lives (a decision, a tradeoff, an agent at work) and nowhere else. Silence (negative space) is the primary design tool.
2. **Visible intelligence, invisible machinery.** The 10-agent architecture is a strength to be felt, not a system to be exposed. The user should sense *"something considered is happening on my behalf"* — never see a spinner, a percentage, or a technical label.
3. **Liquid continuity.** Nothing cuts. Screens don't replace each other — they pour into one another. State changes (a re-optimized itinerary, a replanned day) should look like water finding a new, lower level: smooth, inevitable, calm.

---

## 1. Foundations

### 1.1 Color System

The palette tells the product's story in two families: **Bone** (paper, maps, daylight — the traveler's world) and **Ink** (dusk, depth, reasoning — the agents' world), joined by a single restrained metal, **Brass**.

#### Neutral — "Bone" (primary surfaces)
| Token | Hex | Usage |
|---|---|---|
| `bone-50` (canvas) | `#F6F3ED` | App background — warm linen white, never pure white |
| `bone-100` (surface) | `#EFE9DE` | Cards, panels, input fields |
| `bone-200` (line) | `#DDD5C7` | Hairline borders, dividers |
| `bone-300` (muted) | `#A89F8F` | Disabled states, placeholder text |

#### Neutral — "Ink" (text & dark surfaces)
| Token | Hex | Usage |
|---|---|---|
| `ink-900` (primary text) | `#1B1F2A` | Headlines, primary body copy — deep navy-charcoal, never pure black |
| `ink-700` (secondary text) | `#4A5063` | Supporting copy, labels |
| `ink-400` (tertiary text) | `#8A8FA0` | Captions, timestamps, metadata |
| `ink-950` (agent surface) | `#12141C` | Reserved exclusively for Agent Console & "consultation" panels |

#### Signature Accent — "Brass" (used on <10% of any screen)
| Token | Hex | Usage |
|---|---|---|
| `brass-500` (primary accent) | `#B08D57` | Primary CTA, active agent state, key numerals, the liquid progress thread |
| `brass-200` (tint) | `#D8C39A` | Hover backgrounds, subtle highlight fills |
| `brass-700` (pressed) | `#8C6F42` | Pressed/active states |

#### Signal Colors (desaturated — luxury products never shout)
| Token | Hex | Usage |
|---|---|---|
| `clay-500` | `#B5654A` | Fatigue, regret risk, budget pressure — warmth, not alarm |
| `clay-100` | `#EDD9CF` | Background tint for clay signals |
| `sage-500` | `#7A8B72` | Optimized, resolved, "improved" states |
| `sage-100` | `#E3E7DD` | Background tint for sage signals |

**Rule of thumb:** any single screen uses Bone as 80%+ of surface area, Ink for text, and Brass as the *only* saturated colour permitted to appear more than once. Clay and Sage appear only inside data/metric contexts (Simulation, Replanning), never as decoration.

---

### 1.2 Typography

| Role | Typeface | Notes |
|---|---|---|
| Display / Headlines | **Fraunces** (variable, optical sizing on) | High-contrast editorial serif — the "hotel signage" voice. Production equivalent: GT Sectra / Canela. |
| UI / Body | **General Sans** (fallback: Inter) | Humanist, quiet, legible at small sizes |
| Data / Metrics | **IBM Plex Mono**, Light/Regular only | Used only for numerals in Simulation & Cost views — gives a "fine instrument" precision without feeling technical |

**Type scale** (base 17px — luxury interfaces run slightly larger than default web for airy readability):

| Token | Size / Line-height | Weight | Face |
|---|---|---|---|
| `display-xl` | 56px / 62px | 400 | Fraunces |
| `display-l` | 40px / 46px | 400 | Fraunces |
| `heading-l` | 28px / 34px | 500 | Fraunces |
| `heading-m` | 22px / 28px | 500 | General Sans |
| `body-l` | 18px / 28px | 400 | General Sans |
| `body-m` | 16px / 24px | 400 | General Sans |
| `caption` | 13px / 18px | 500, tracked +2% | General Sans, uppercase for labels |
| `data-l` | 32px / 36px | 300 | IBM Plex Mono |
| `data-m` | 18px / 24px | 400 | IBM Plex Mono |

Rules: never bold body copy for emphasis — use Brass colour or Fraunces italic instead. All-caps is reserved for `caption` labels only, always letter-spaced, never for headlines.

---

### 1.3 Spatial System

- **Canvas:** designed at 1440px, content column max-width 1240px, centered.
- **Margins:** 96px side margins on large desktop (≥1440px), 64px at 1200px, 32px at 1024px (minimum supported width for MVP).
- **Grid:** 12-column, 24px gutter.
- **Spacing scale (4px base):** `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128`
- **Breathing rule:** no primary content block sits closer than 48px to another primary block. Cards internally use 24–32px padding minimum — cramped padding is the single fastest way to look cheap.

### 1.4 Shape & Elevation

| Token | Radius | Usage |
|---|---|---|
| `radius-s` | 8px | Inputs, chips, buttons |
| `radius-m` | 16px | Cards, experience tiles |
| `radius-l` | 28px | Panels, modals, the Agent Console sheet |

Corners are soft but never bubbly — a rounder radius reads playful/consumer-app; this restrained curve reads considered.

**Shadows** — diffused, low-opacity, large blur, near-zero spread ("resting on velvet," not "floating in space"):

| Token | Value |
|---|---|
| `elevation-1` | `0 2px 8px rgba(27,31,42,0.06)` |
| `elevation-2` | `0 8px 24px rgba(27,31,42,0.08)` |
| `elevation-3` (modals) | `0 24px 64px rgba(27,31,42,0.16)` |

No hard drop shadows, no coloured shadows, no borders + shadows combined (pick one per surface).

### 1.5 Iconography & Imagery

- **Icons:** single-weight line icons, 1.5px stroke, no fills, no duotone — think Linear/Notion restraint, not Material Design fullness. Used sparingly; text labels are preferred over icon-only affordances.
- **Photography:** full-bleed, editorial travel photography (soft natural light, no oversaturated tourist-brochure colour grading) — every destination/experience card carries a photograph, never a stock icon or illustrated placeholder.
- **No emoji, no illustrated mascots, no gradients-as-decoration.** The only permitted gradient is the Brass-to-transparent radial used in the Agent Ripple (see 2.2).

---

## 2. Motion Language — "Liquid Flow"

Motion is Sahyatri's second language after typography. It exists to communicate one thing consistently: *reasoning is happening, and it is unhurried and trustworthy.*

### 2.1 Easing & Duration Tokens

| Token | Curve | Duration | Used for |
|---|---|---|---|
| `ease-flow` | `cubic-bezier(0.45, 0, 0.15, 1)` | 320–420ms | Primary transitions between screens/panels |
| `ease-settle` | `cubic-bezier(0.16, 1, 0.3, 1)` | 400–600ms | Elements arriving into view (cards, results) |
| `ease-micro` | `cubic-bezier(0.4, 0, 0.2, 1)` | 120–180ms | Hover, press, toggle |
| `ease-ripple` | sinusoidal, looping | 2400–4000ms | Ambient "agent thinking" states |
| `ease-pour` | `cubic-bezier(0.65, 0, 0.35, 1)` | 600–900ms | Card → detail expansion, itinerary morphs |

**Global rule:** nothing on screen moves faster than 100ms or slower than 900ms except ambient loops. No bounce, no spring overshoot, no elastic easing anywhere — overshoot reads playful/cheap; this product only ever *settles*.

### 2.2 Signature Interactions

These three motifs should recur everywhere and are what make the product feel designed rather than assembled:

**① The Liquid Thread** — replaces every progress bar in the product. A 2px Brass line runs through a channel and fills like mercury/liquid rather than in discrete steps; it has a soft leading glow and gently overshoots-and-settles at completion (a single, restrained wobble, not a bounce). Used in: Discovery question progress, itinerary generation, simulation runs, replanning.

**② The Agent Ripple** — replaces every spinner/loader. A soft radial pulse in `brass-500 → transparent`, like a drop of ink released in water, emanating from a fixed point (e.g., the Agent Console icon, or the centre of a card being re-optimized). Loops on `ease-ripple`. Never accompanied by a percentage or technical label — only a single line of considered copy beneath it (e.g. *"Consulting logistics and weather for tomorrow…"*).

**③ Morph & Pour** — the primary navigation transition. A card does not "navigate" to a detail page; its bounding box expands in place, its image cross-fades into the new hero image, background content behind it defocuses (8px gaussian blur, `ease-flow`), and new content fades up 8px below its final position on `ease-settle`, staggered 40ms per element. Reversing this (closing a detail view) exactly retraces the motion — a true liquid return, not a hard "back."

**Diff / Change motion:** When Replanning alters the itinerary, changed items receive a 1px Brass outline that "breathes" once (opacity 0→40%→0 over 1200ms) rather than a badge or highlight colour — a single quiet pulse announces "this changed," then recedes to full calm.

---

## 3. Core Component Library

| Component | Description |
|---|---|
| **Button — Primary** | Bone text on Ink fill for the rare "committing" action (e.g. "Begin the Interview," "Confirm Itinerary"); Brass fill reserved only for the single most important action per screen. Radius `s`. 44px height. |
| **Button — Ghost** | Ink text, no fill, hairline `bone-200` border. Default for all secondary actions — most buttons in the product should be ghost buttons; solid fills are rationed. |
| **Choice Chip** | Used in Discovery for multi/single-select answers. Bone-100 fill, hairline border; selected state = Ink fill, Bone text, no border. No checkmarks — the fill inversion *is* the confirmation. |
| **Slider (Budget/Pace)** | Thin 2px track in `bone-200`, filled portion in Brass, a single circular handle (16px) with `elevation-1`. Value shown in `data-m` mono above the handle, not in a floating tooltip. |
| **Experience Card** | Full-bleed photo (4:3), radius `m`, `elevation-1`. On hover: `ease-micro` scale to 1.015 + `elevation-2`, image very slightly zooms (1.03). Caption overlay uses a bottom gradient scrim, never a solid bar. |
| **Traveler Profile Chip Rail** | Horizontal row of small pill tokens (e.g. "Photography-led," "Low crowd tolerance") that quietly accrue as Discovery progresses — each new chip enters via `ease-settle`, never pops. |
| **Metric Dial** | Replaces bar/progress charts for Simulation metrics (fatigue, preference-fit, regret risk). A thin circular arc, styled like a fine wristwatch dial, Ink track with Brass/Clay/Sage fill depending on signal type. Value in `data-l` mono at centre. |
| **Tradeoff Card** | Two-column card: left = "removes/changes," right = "gains/saves," divided by a hairline, each side headed by a mono delta number (e.g. `−₹12,000` / `+35 min`). No colour-coding red/green — deltas are always Ink, framed as *information*, not judgment. |
| **Agent Console Rail** | See Section 6. |
| **Toast / Narrative Note** | Small Fraunces-italic annotation card, Bone-100 fill, appears anchored beside the decision it explains (e.g. beside a hotel choice: *"This hotel costs ₹2,800 more per night, but reduces daily transit by 46 minutes."*) — this is the Narrative & Explanation Agent's voice made visual. |
| **Disruption Input Bar** | A single elegant text field, centred, Fraunces placeholder text ("What's changed?"), used for Replanning triggers — deliberately looks like a concierge note-taking pad, not a chat/search bar. |

---

## 4. Information Architecture — The Core Journey

```
ARRIVAL
   ↓
DISCOVERY  (adaptive interview → Traveler Profile forms live)
   ↓
ITINERARY — TRIP OVERVIEW  (city allocation, map)
   ↓
ITINERARY — DAY / CITY CANVAS  (sequenced experiences)
   ↓  (user opens a card, or system proposes)
ITINERARY — EXPERIENCE DETAIL
   ↓
SIMULATION — THE CONSULTATION  (agents evaluate silently)
   ↓
SIMULATION — BEFORE / AFTER  (tradeoffs surfaced, user accepts)
   ↓
[itinerary is now "live" — user can return to it anytime]
   ↓ (a condition changes)
REPLANNING — DISRUPTION INTAKE
   ↓
REPLANNING — ALTERNATIVES & RESOLUTION
   ↓
back to ITINERARY (updated, changes gently pulsed)
```

A persistent top bar (72px) carries: wordmark left (Fraunces, "Sahyatri," letter-spaced), a quiet phase indicator centre (`caption` style — "Discovery" / "Itinerary" / "Simulation" / "Replanning," current phase in Brass, others in `ink-400`), and the Agent Console toggle + traveler avatar right.

---

## 5. Screen Specifications

### 5.1 Arrival (Gateway)

**Purpose:** Set tone before any form appears. A luxury consultancy never opens with a blank input field.

**Layout:**
```
┌──────────────────────────────────────────────┐
│                                                │
│         [full-bleed, slow Ken-Burns           │
│          photograph — dusk, a quiet            │
│          departures hall or coastal road]      │
│                                                │
│              "Where shall we begin?"           │
│                 (display-xl, Bone text          │
│                  over scrim)                   │
│                                                │
│         [Begin the Interview] (Brass button)   │
│                                                │
└──────────────────────────────────────────────┘
```
- Background photo has a very slow (40s loop) 1.0→1.04 scale drift — motion so slow it registers as stillness, not animation.
- Single CTA only. No pricing, no feature list, no navigation — arrival is a threshold, not a landing page.
- On click: photo defocuses (`ease-flow`, 8px blur) and dims to Ink as the Discovery panel pours up from below (`ease-pour`).

---

### 5.2 Discovery — Adaptive Interview

**Purpose:** Agent 1 (Discovery Agent) builds the Traveler Profile via one considered question at a time — never a long form.

**Layout (two-zone, asymmetric 65/35):**
```
┌───────────────────────────────┬────────────────┐
│                                │                 │
│   Liquid Thread (progress)     │  Traveler       │
│   ─────────●───────────────    │  Profile        │
│                                │  (forming)      │
│   "Estimated budget: ₹1.8L.    │                 │
│    What matters more to you?"  │  ○ (empty       │
│         (heading-l, Fraunces)  │    silhouette   │
│                                │    until first   │
│   ◯ Better hotels               │    answer)      │
│   ◯ Better food                 │                 │
│   ◯ More cities                 │  [chips accrue  │
│   ◯ More shopping               │   here, one at  │
│                                │   a time]        │
│              [Continue →]      │                 │
│                                │                 │
└───────────────────────────────┴────────────────┘
```
- **Left zone (65%):** one question, presented as a Fraunces headline, answered via Choice Chips, a Slider, or a minimal map-pin picker depending on question type. Only one interaction pattern on screen at a time.
- **Right zone (35%, `bone-100` fill):** the **Traveler Profile Chip Rail**, building silently and in real time as a quiet reassurance — *the system is already listening.* Between questions, a very brief (600ms) Agent Ripple appears here, with a single line of Narrative Note copy (*"Noting a preference for culture over nightlife…"*) before the next question renders — this is the adaptive branching made visible without ever saying "processing."
- **Progress:** the Liquid Thread sits above the question, unlabeled — no "Question 4 of 12." Luxury interviews don't announce their own length.
- **Transition out:** on final question, the right-panel profile silhouette "completes" with a slow cross-fade to a full profile summary card, then the whole screen performs a Morph & Pour into Trip Overview, with an Agent Ripple + the copy *"Composing your itinerary…"* bridging the two (typically 2–4s, never faked shorter than the actual generation).

---

### 5.3 Itinerary — Trip Overview

**Purpose:** Trip-level optimization output — city allocation, ordering, and the overall shape of the journey (Section 3 of the source spec) — before descending into day-level detail.

**Layout:**
```
┌────────────────────────────────────────────────┐
│  "Your Japan, in eleven days."  (display-l)      │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │  Tokyo ████████  Kyoto ██████  Osaka ████  │  │  ← horizontal city
│  │  4 days           3 days        2 days     │  │    allocation bar,
│  │  Hiroshima █                                │  │    Brass-tinted
│  │  1 day                                      │  │    segments, hairline
│  └──────────────────────────────────────────┘  │    dividers only
│                                                  │
│   [subtle line map — muted Bone/Ink cartography, │
│    not a Google-Maps-style colour map — showing  │
│    the route between cities as a single hand-     │
│    drawn-feeling Brass line]                      │
│                                                  │
│   Trip essentials (right rail, quiet):            │
│   Budget · Pace · Comfort priorities (from        │
│   Traveler Profile, shown as small caption text)  │
│                                                  │
│              [Review the full itinerary →]        │
└────────────────────────────────────────────────┘
```
- The city-allocation bar is the single most important object on this screen — it should feel like a boarding pass or a fine timetable, not a Gantt chart. Segment widths are proportional to day-count; tapping a segment performs a Morph & Pour directly into that city's Day/City Canvas.
- Map styling: custom muted line-art cartography (Bone base, Ink coastlines, single Brass route line) — never an embedded default Maps widget, which would break the material language instantly.

---

### 5.4 Itinerary — Day / City Canvas

**Purpose:** City-level optimization output — sequenced experiences within a day (Section 3, city-level).

**Layout:**
```
┌───────────────┬──────────────────────────────┐
│  Day tabs      │   Day 2 · Kyoto                │
│  (vertical,    │   "A morning among shrines,     │
│  left rail,    │    an afternoon of quiet tea."  │
│  minimal —     │        (heading-m, Fraunces      │
│  Day 1..4,     │         italic subhead)          │
│  current in    │                                  │
│  Brass, rest   │   06:00  [Experience Card]        │
│  in ink-400)   │            Sunrise Photography    │
│                │            at Fushimi Inari        │
│                │   ─────────────────────────────   │
│                │   09:30  [Experience Card]        │
│                │            Breakfast, Nishiki      │
│                │   ─────────────────────────────   │
│                │   13:00  [Experience Card]         │
│                │            ...                     │
└───────────────┴──────────────────────────────┘
```
- Timeline uses a thin vertical Brass connecting line between cards (echoing the Liquid Thread) rather than a rigid calendar grid — reinforces "flow," not "schedule."
- Each Experience Card shows time, photo, name, and one `caption`-style tag (e.g. "Photography · Low crowd"). No dense metadata on the canvas itself — depth lives one tap away.
- A slim `elevation-1` floating summary strip pins to the bottom of the viewport on scroll: walking distance today, estimated cost, one-line fatigue read-out (mono numerals, quiet) — always visible, never intrusive.

---

### 5.5 Itinerary — Experience Detail

**Purpose:** The atomic unit of the product (per the Experience Schema) made tangible — and where the Narrative & Explanation Agent's voice appears directly.

**Layout:** full-width Morph & Pour expansion from the card:
```
┌────────────────────────────────────────────────┐
│  [full-bleed hero photograph, 40vh]              │
│                                                  │
│   Sunrise Photography at Fushimi Inari            │
│   (display-l)                                    │
│                                                  │
│   06:00 – 08:00 · Fushimi, Kyoto · Free           │
│   (caption row, ink-400)                          │
│                                                  │
│   [Narrative Note — Fraunces italic, brass        │
│    left-rule]                                     │
│   "Included for its regret score — travelers      │
│    who skip this consistently name it their        │
│    biggest miss."                                  │
│                                                  │
│   [Metric Dials, small, inline]:                   │
│   Walking intensity ● Crowd level ● Authenticity   │
│                                                  │
│   [Swap this experience]  (ghost button)           │
└────────────────────────────────────────────────┘
```
- This is the only place raw schema attributes (`regret_score`, `crowd_level`, `authenticity`) surface — always reframed in the Narrative Agent's voice first, with Metric Dials as secondary, optional detail.
- "Swap this experience" opens a small drawer of 2–3 alternatives from the Experience Designer Agent, presented as a horizontal card row — never a long list.

---

### 5.6 Simulation — The Consultation

**Purpose:** Visualize Agents 7 & 8 (Simulation & Risk, Optimization) doing their work — the emotional high point where "agentic" becomes felt, not explained.

**Layout — the one screen permitted to shift into the Ink palette**, signalling a mode-change ("the concierge has stepped away to consult"):
```
┌────────────────────────────────────────────────┐
│  [ink-950 background, full viewport]              │
│                                                  │
│         (Agent Ripple, centred, large,            │
│          Brass → transparent, slow loop)           │
│                                                  │
│      "Simulating fatigue, cost, and crowds        │
│       across your eleven days…"                    │
│           (body-l, Bone text, centred)             │
│                                                  │
│   [as each pass completes, a single word          │
│    fades in beneath, left to right, mono caps,    │
│    tracked wide: FEASIBILITY · BUDGET · COMFORT]   │
└────────────────────────────────────────────────┘
```
- Duration matches real computation time; never artificially shortened, but capped with graceful ambient looping if the backend takes longer than ~4s.
- No progress percentage, ever. The completing words are the only feedback the user needs.
- On completion, the whole screen performs a slow `ease-flow` fade from Ink back to Bone as the Before/After view pours in — literally "the lights coming back up."

---

### 5.7 Simulation — Before / After Tradeoffs

**Purpose:** Present the optimizer's output honestly, per the source spec's exact example (walking 14.2→8.1 km/day, preference fit 78→87, etc.), using explicit tradeoff language rather than a verdict.

**Layout:**
```
┌───────────────────┬───────────────────┐
│   BEFORE            │   AFTER              │
│  (caption, ink-400)  │  (caption, brass-500) │
│                     │                     │
│   Walking  14.2 km   │   Walking   8.1 km    │
│   Fit      78/100    │   Fit       87/100    │
│   Fatigue  High       │   Fatigue   Low        │
│   Budget   ₹1.87L     │   Budget    ₹1.82L     │
│   Regret   18%         │   Regret    11%        │
│   (all in Metric Dials,│   (Metric Dials)        │
│    Clay-tinted where    │   Sage-tinted where     │
│    elevated)             │   improved)              │
├───────────────────┴───────────────────┤
│  Tradeoff Cards (horizontal scroll):     │
│  [Replacing the central hotel with one   │
│   10 min farther saves ₹12,000 but adds  │
│   35 min daily transit.]                  │
│  [ ... ]                                  │
├──────────────────────────────────────────┤
│        [Accept this itinerary]  (Brass)   │
│        [Adjust priorities]  (ghost)        │
└──────────────────────────────────────────┘
```
- The Before column is deliberately quieter (lower contrast, `ink-400` numerals) so the eye naturally settles on After — without using red/green judgment colour, only weight and contrast.
- "Adjust priorities" returns the user to a lightweight re-weighting of their Traveler Profile sliders (not the full Discovery interview) and re-runs a shorter Consultation pass.

---

### 5.8 Replanning — Disruption Intake

**Purpose:** Agent 10 entry point — handling both real disruptions (rain, delay) and "what if" exploration, per the source spec.

**Layout:**
```
┌────────────────────────────────────────────────┐
│                                                  │
│         "What's changed?"                        │
│           (heading-l, Fraunces italic)             │
│                                                  │
│   ┌────────────────────────────────────────┐   │
│   │  Heavy rain expected tomorrow             │   │  ← Disruption
│   └────────────────────────────────────────┘   │    Input Bar
│                                                  │
│   Quick conditions (ghost chips):                  │
│   ⛅ Weather change  ✈ Flight delay                │
│   🕒 Trip shortened   ₹ Budget change               │
│   (icons minimal, single line-weight)              │
│                                                  │
│              [Replan →]  (Brass button)            │
└────────────────────────────────────────────────┘
```
- Freeform text is primary (matches the spec's natural-language trigger examples); quick-chips are a secondary accelerant, not the default path — reinforces the "concierge note-taking," not "support ticket," feeling.
- On submit: Morph & Pour directly into the itinerary view with affected items already breathing (see 2.2 diff motion) while an Agent Ripple runs quietly in the Agent Console rail (not full-screen this time — a disruption is smaller than a full Consultation).

---

### 5.9 Replanning — Alternatives & Resolution

**Purpose:** Show what changed, why, and what replaced it — closing the loop back into the live Itinerary.

**Layout:**
```
┌────────────────────────────────────────────────┐
│   "Because of tomorrow's rain…"  (heading-m)      │
│                                                  │
│   Affected (2)                                    │
│   ┌─────────────────────────────────────────┐   │
│   │ [struck-through outline, Clay hairline]   │   │
│   │  Arashiyama Bamboo Walk — outdoor, high    │   │
│   │  rain sensitivity                          │   │
│   └─────────────────────────────────────────┘   │
│                    ↓  (thin Brass connecting line) │
│   ┌─────────────────────────────────────────┐   │
│   │ [new card, entering via ease-settle]       │   │
│   │  Nishiki Market + Tea Ceremony — indoor     │   │
│   │  alternative, preserves food + culture      │   │
│   │  preference fit                             │   │
│   └─────────────────────────────────────────┘   │
│                                                  │
│   Narrative Note: "This keeps your afternoon      │
│   photography goals intact — we moved the walk    │
│   to Day 4, which stays dry."                       │
│                                                  │
│        [Accept]  (Brass)   [See other options]     │
└────────────────────────────────────────────────┘
```
- The old→new pairing is shown explicitly rather than just presenting a new list — this is what makes replanning feel considered rather than regenerated from scratch, and it directly reflects the spec's requirement to *"preserve high-value experiences and avoid unnecessary changes to unaffected parts of the trip."*
- On Accept: single Morph & Pour back to the Day/City Canvas, with the resolved items receiving one final breathing pulse before settling to normal state permanently.

---

## 6. The Agent Console (Persistent Signature Element)

A slim 4px Brass-on-Ink rail, collapsed by default, fixed to the right viewport edge across every screen post-Discovery. On hover/click it expands into a 320px panel:

```
┌─────────────────────┐
│  In consultation      │
│                        │
│  ● Mobility & Logistics │  ← currently active, Agent Ripple
│    Checking transfer    │    dot beside its name
│    times…                │
│                        │
│  ○ Cost Optimization    │  ← idle, ink-400, no ripple
│  ○ Local Intelligence    │
│  ○ Narrative              │
│  ...                      │
└─────────────────────┘
```
- Agents are always named in plain language (never "Agent 4," never technical labels) and only ever show *what* they're doing, in a single present-participle line — this is the one place the multi-agent architecture becomes visible, and it should read like a hotel's back-of-house being glimpsed through a half-open door: reassuring, not exposed.
- This panel is the natural home for a hackathon demo moment — judges can open it to "see the system think" without it ever being forced on an ordinary user.

---

## 7. Accessibility & Contrast

- `ink-900` on `bone-50` = 15.1:1 contrast (AAA). `ink-700` on `bone-100` = 7.8:1 (AAA for body text).
- Brass (`#B08D57`) on Bone fails AA for small text (3.1:1) — **Brass is never used for body copy**, only for large display numerals (≥24px, which only needs 3:1), icons with adjacent text labels, and fills with Bone/Ink text on top (not Brass text itself).
- All signal meaning (Clay/Sage) is paired with a text label or icon shape difference — never colour alone.
- Motion: every ambient loop (Agent Ripple, Ken-Burns) respects `prefers-reduced-motion` — falls back to a single static state with a subtle opacity fade only.

---

## 8. Implementation Handoff — Token Quick Reference

```
COLOR
  bone-50   #F6F3ED   bone-100  #EFE9DE   bone-200  #DDD5C7   bone-300  #A89F8F
  ink-900   #1B1F2A   ink-700   #4A5063   ink-400   #8A8FA0   ink-950   #12141C
  brass-500 #B08D57   brass-200 #D8C39A   brass-700 #8C6F42
  clay-500  #B5654A   clay-100  #EDD9CF   sage-500  #7A8B72   sage-100  #E3E7DD

TYPE
  Display/Headings : Fraunces (400/500)   Body/UI : General Sans (400)   Data : IBM Plex Mono (300/400)
  Scale: 56/40/28/22/18/16/13px

SPACE   4·8·12·16·24·32·48·64·96·128
RADIUS  s:8  m:16  l:28
MOTION  flow:cubic-bezier(.45,0,.15,1)@320-420ms · settle:cubic-bezier(.16,1,.3,1)@400-600ms
        micro:cubic-bezier(.4,0,.2,1)@120-180ms · pour:cubic-bezier(.65,0,.35,1)@600-900ms
```

---
