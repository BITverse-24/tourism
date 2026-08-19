# Consultation — Planning

> **Workflow state:** Planning · **Reads:** `docs/AGENT_ARCHITECTURE.md` (logical stages), `docs/WEBSOCKET_CONTRACT.md` (lifecycle & planning status)

## Purpose

The quiet consultation: a deliberate pause while the system designs the trip. The background shifts to deep ink, the ripple breathes, and the lifecycle rail expands. The traveler sees only graceful, safe summaries — never internals.

## Scene & Layout

The entire viewport becomes deep ink, transitioning smoothly from the warm background over a calm pour motion. Centered in the viewport:

* A soft, circular brass glow — the ripple — breathing slowly outward and fading. It is the only strong motion on the screen.
* A single line of light body text beneath it, announced politely for assistive tech, sharing what the system is doing right now (for example, consulting on comfort and feasibility). The text updates only from traveler-safe server summaries.

The right lifecycle rail (described in the README) expands during this screen to its full width (~320px), while the rest of the page remains minimal.

## Visual Treatment

* Deep ink background with light text for contrast; no card surface competes with the ripple.
* The ripple is understated — a radial brass glow, not a spinner — scaling gently and fading. Staggered entrance of rail items uses the content-settle motion.

## States

* **Active consultation:** Ripple breathing, status line updating, rail items showing started/progressed with a subtle breathing dot and a short summary beneath the stage name.
* **Graceful timeout:** If no progress for roughly 12 seconds, the ripple fades and is replaced by a small solid muted dot, the status color softens, and a subtle "Try again" text button appears — a calm fallback, not an error block.
* **Failed stage:** Shows a muted terracotta dot and a caption explaining the stage in plain language.

## Behavior & Interaction

* Driven by two server streams: lifecycle events per logical stage (stage name, status started/progressed/completed/failed, optional progress, human-readable summary) and planning status (phase such as profile validation, destination design, experience selection, mobility, cost, simulation, optimization, decision needed, explanation, replanning; each queued/running/completed/failed with a human message). The visible status line prefers the planning message but falls back to the lifecycle summary.
* Tool-backed stages may complete deterministically yet still appear as lifecycle items with updates. After about 12 seconds of silence, offer a retry that reuses the same correlation identifier so the server treats it idempotently.

## Data & Contract Binding

* Logical stage order is defined by `docs/AGENT_ARCHITECTURE.md`. Summaries are traveler-safe prose only — never render raw scores, prompts, or provider payloads.

## Edge Cases & Errors

* Timeouts and stage failures are shown inline with muted colors, not as blocking modals. Retry preserves idempotency.

## Accessibility

* Status line is a polite live region. The rail list is readable without relying on color alone.
