# Travel Planner Documentation

This directory contains the human-readable product contracts for the Agentic Travel Planner.

Markdown is the authoritative format for the user-facing data contracts. The internal ownership and lifecycle policy also has a deliberately narrow machine-readable companion so an orchestrator can enforce path and transition rules without introducing a generated API or serialization contract.

## Core contracts

| Document | Purpose |
|---|---|
| [Traveler Profile](TRAVELER_PROFILE_SCHEMA.md) | The normalized result after discovery questions finish. It is the complete input to planning. |
| [Final Trip Plan](FINAL_TRIP_PLAN_SCHEMA.md) | The user-facing itinerary produced from a Traveler Profile. |
| [TripState Ownership and Lifecycle](TRIPSTATE_OWNERSHIP_AND_LIFECYCLE.md) | Internal ownership, lifecycle transitions, patch rejection, version, event, and failure rules. |

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
5. **Workflow and integration** — agent interfaces, ownership, lifecycle, events, persistence, and APIs if they become necessary. The ownership/lifecycle policy is now defined in [TripState Ownership and Lifecycle](TRIPSTATE_OWNERSHIP_AND_LIFECYCLE.md).

Later-phase documents must reference the core contracts rather than recreating their fields.

## Contract rules

- Unknown information is recorded explicitly; it is never silently replaced with a guessed value.
- A hard constraint is either satisfied, clearly unresolved, or clearly reported as impossible.
- Inferred preferences include their confidence and should not be presented as direct user statements.
- Examples are illustrative and do not define additional fields.
- User-facing trip snapshot lineage and API behavior are deferred to later phases; internal mutation, lifecycle, version, event, and failure rules are defined in the workflow contract.

The product and project context remains in the root [README](../../README.md). This directory defines the core data concepts that implementation must preserve.
