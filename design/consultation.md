# Consultation — Planning

> **Workflow state:** Planning · **Reads:** `docs/AGENT_ARCHITECTURE.md` (logical stages), `docs/WEBSOCKET_CONTRACT.md` (lifecycle & planning status)

## Purpose

A deliberate, gracious pause while the system designs the trip. Where arrival was warm invitation and discovery was attentive conversation, consultation is quiet back-of-house work made visible with dignity. The traveler should feel that thoughtful work is underway — not waiting, but being cared for. The screen's job is to make time feel spent, not lost.

## Aesthetic Intent — Night Desk, Quiet Work

This is the only screen that fully inverts the palette, and its power comes from that discipline. Deep ink everywhere, a single breathing brass glow, and one line of humane text. No chart, no progress bar, no checklist of agents. The luxury is in darkness, focus, and restraint — a late desk at night, not a loading state.

* **Depth, not decoration:** The deep ink background should read as softly lit evening paper or lacquer at night — velvety, with a barely perceptible inner softness and no glossy gradients. Avoid any marketing sweep or sheen that would break the calm.
* **Single point of light:** The brass ripple is the only strong light source in the viewport. Its slowness and scale make the wait feel intentional, like a candle, not idle.
* **Whispered narration:** Status text is short, human, and trustworthy — never technical, never numeric. The rail's stage summaries are similarly humane, like quiet notes from the team placed on the ledger.

## Scene & Layout — Descriptive

The viewport becomes continuous deep ink, transitioning smoothly from the prior warm bone via a calm page-pour that the eye can follow. Centered in the viewport, with generous vertical breathing room and no crowding toward the top:

* **Ripple — the hero element:** A soft, circular brass glow, generously sized (roughly hand-sized, centered), perfectly centered both horizontally and vertically within the available space. It breathes — scaling gently outward and fading — then returns, in a slow, sinusoidal loop. It is the only element that moves continuously. It should feel centered and solitary, with ample space above and below so the glow has room to diffuse.

* **Status line** directly beneath the ripple, centered, light bone body text at slightly reduced opacity (warm, not stark white), generously tracked and set with comfortable line length. It is announced politely for assistive tech, sharing what the system is doing now (e.g., consulting on comfort and feasibility, or similar traveler-safe phrasing drawn from server summaries). The text updates only from those safe summaries — never from internals — and changes at a calm cadence, never flooding.

* **Lifecycle rail** (the right ledger described in README) expands during this screen from its thin accent to its full reading width (~320px) along the right edge, subtly lifted with a very soft shadow and a faint warm border along its left edge. Its items are the ten logical stages. Outside consultation, the rail reads as a thin brass edge; here it becomes a legible, calm ledger of stages, with plenty of inter-item spacing and gentle settle as each stage appears or updates.

Nothing else competes in the viewport. There is no secondary card, no button row, no progress percentage. The screen's confidence is precisely that it does not try to fill time with ornament.

## Material, Light & Detail — Luxury Cues

* **Ink as velvet:** The deep ink should read as matte paper or dark lacquer at night, with a barely perceptible inner softness where light might naturally pool. Avoid hard solids or gradient merchandising that would cheapen the darkness.
* **Brass as candlelight:** The ripple's glow is warm brass diffused through haze — radial, soft-edged, fading well before its geometric edge, warm bone-bone at the fringe. Its scale and opacity modulate gently and together, never snapping. No hard edge, no second color, no concentric ring that would feel like a target.
* **Rail as ledger:** The rail's surface is the same deep ink but ever-so-slightly lifted (so subtle you feel rather than see the shadow). Its left border is a faint warm hairline that catches the imagined light. Stage names are set in muted light text; summaries beneath are softer warm-light body. Inter-item spacing is generous — the ledger breathes.
* **Type in darkness:** Light bone text on ink is beautifully legible but never stark white on black; it is slightly warmed so it feels like paper under lamplight, appropriate for evening reading.

## States — How Waiting Is Designed

* **Active consultation:** Ripple breathing continuously, status line updating at a calm cadence (quietly, not rapidly), rail items showing started or progressed with a subtle breathing dot beneath the stage name and a short human summary. The overall cadence should never feel frantic; updates arrive rather than flood, and the breathing remains the primary temporal signal.

* **Graceful timeout (~12 seconds without progress):** The ripple fades gracefully and is replaced by a small, solid muted dot (muted terracotta, centered in the same space where the ripple was). The status line softens further in color, and a subtle text link "Try again" appears nearby in muted brass — understated, never a red error block or banner. The rail remains visible; the timeout is not a failure of the whole page but a pause that invites a calm retry.

* **Failed stage:** The stage's dot becomes muted terracotta and a small caption explains that stage in plain, humane language ("This check will be retried — your plan is still being shaped"). The rest of the screen remains composed; a single stage's hiccup does not darken the whole scene.

## Motion — Breath, Not Spin

* The ripple's breath is sinusoidal and slow (~3 seconds per cycle), scaling gently outward while its opacity fades in unison. Rail items settle in with the content-settle rise-and-fade, slightly staggered so the ledger feels assembled by hand rather than appearing at once. The background color pour from warm bone into deep ink takes its calm ~400ms; nothing else animates intrusively on entry.

## Behavior & Interaction

* Driven by two server streams: lifecycle events per logical stage (stage name, started/progressed/completed/failed, optional progress, human-readable summary) and planning status (phase such as profile validation, destination design, experience selection, mobility, cost, simulation, optimization, decision needed, explanation, replanning; each queued/running/completed/failed with a human message). The visible status line prefers the planning message but gracefully falls back to the lifecycle summary.
* Tool-backed stages may complete deterministically yet still appear as lifecycle items. After about 12 seconds of silence, the "Try again" retry uses the same correlation identifier so the server treats it idempotently and does not duplicate work.

## Data & Contract Binding

* Logical stage order and ownership are defined by `docs/AGENT_ARCHITECTURE.md`. Summaries are traveler-safe prose only — raw scores, prompts, or provider payloads are never rendered, even as tooltips.

## Edge Cases — Poised

* Timeouts and stage failures are shown inline with muted colors and gentle inline text, not as blocking modals. Retry preserves idempotency and keeps the deep-ink scene intact, so the traveler never feels bounced between themes.

## Accessibility

* Status line is a polite live region; the rail list is readable without relying on color alone. Keyboard focus, where applicable, moves in logical order: status → rail → retry when present. No focus trap is needed on this screen.

## Luxury Priority

* Every detail on this screen should deepen the night-desk feeling: the velvet of the ink, the candle of the brass, the ledger of the rail, and the single line of trustworthy text. If anything competes for attention beyond those four, remove it.

## Implementation Contract — Night Desk Geometry

Set `main.consultation` to `min-height: 100svh; background: var(--voyager-ink-0); color: var(--voyager-light-ink)`. The header becomes transparent on entry and remains 72px high. Reserve the expanded rail width on the right at 1200px and above; center the ripple within the remaining central area, not within the full viewport. Below 1200px the rail is collapsed to its 4px edge; below 1024px it is removed from layout, but its stage information remains available to assistive technology through the status summary.

The ripple is decorative with a 96px visual diameter and a 192px maximum glow footprint. It must not be the only status indication: the status line is the live text source. With `prefers-reduced-motion`, replace the continuous breath with a static 16px brass dot and retain the same status text.

Aggregate lifecycle events by the canonical ten-stage order from the README. For each stage show its label, public status, and latest safe summary. Status treatment is text plus shape: empty ring = queued/not started, breathing dot = started/progressed, sage dot = completed, clay dot = failed. Do not render the optional numeric progress field.

Visible copy rules: prefer the latest `planning.status.message`; fall back to the latest lifecycle `summary`; if neither exists, use `Preparing a thoughtful plan for you.`. Reveal `Try again` only after 12 seconds with no newer sequence event. Retrying must be idempotent, must not reset completed stages, and must not show a spinner.

## Acceptance Criteria

The page has no progress bar, percentage, agent names, raw phase identifiers, or cancel button in the primary scene. When a decision request arrives, preserve the planning background while pouring to Decision Required only after the event is sequenced. When a final plan arrives, hold the night desk until `workflow.completed` confirms `final_plan_available`, then pour to the plan-ready entry screen. Every rail stage remains readable when color is removed.
