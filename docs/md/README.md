# Travel Planner Documentation

This directory contains the human-readable product contracts for the Agentic Travel Planner.

Markdown is the only authoritative contract format. The documents use field tables, plain-language rules, and illustrative examples. They are not generated API or serialization contracts.

## Core contracts

| Document | Purpose |
|---|---|
| [Traveler Profile](TRAVELER_PROFILE_SCHEMA.md) | The normalized result after discovery questions finish. It is the complete input to planning. |
| [Final Trip Plan](FINAL_TRIP_PLAN_SCHEMA.md) | The user-facing itinerary produced from a Traveler Profile. |

## Core flow

```text
Discovery answers
        ↓
Traveler Profile
        ↓
Planning and decision making
        ↓
Final Trip Plan
```

The two core documents intentionally separate what the system learns about the traveler from what it finally recommends. Internal evaluation, orchestration, persistence, and communication details are not part of either first-phase document.

## Documentation phases

1. **Core input and output** — Traveler Profile and Final Trip Plan.
2. **Feasibility and simulation** — schedule, mobility, fatigue, weather, and risk details.
3. **Optimization and replanning** — alternatives, tradeoffs, changed conditions, and repair plans.
4. **Knowledge data** — experiences, geography, accommodations, and transportation connections.
5. **Workflow and integration** — agent interfaces, orchestration, persistence, events, and APIs if they become necessary.

Later-phase documents must reference the core contracts rather than recreating their fields.

## Contract rules

- Unknown information is recorded explicitly; it is never silently replaced with a guessed value.
- A hard constraint is either satisfied, clearly unresolved, or clearly reported as impossible.
- Inferred preferences include their confidence and should not be presented as direct user statements.
- Examples are illustrative and do not define additional fields.
- Workflow state, orchestration, persistence, events, and API behavior are deferred to later phases.

The product and project context remains in the root [README](../../README.md). This directory defines the core data concepts that implementation must preserve.
