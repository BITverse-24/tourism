# Travel Planner Documentation

This directory contains the human-readable product contracts for the Agentic Travel Planner.

Markdown is the only authoritative contract format. The documents use field tables, plain-language rules, and illustrative examples. They are not generated API or serialization contracts.

## Core contracts

| Document | Purpose |
|---|---|
| [Traveler Profile](TRAVELER_PROFILE_SCHEMA.md) | The normalized result after discovery questions finish. It is the complete input to planning. |
| [Final Trip Plan](FINAL_TRIP_PLAN_SCHEMA.md) | The user-facing itinerary produced from a Traveler Profile. |
| [WebSocket Core API](WEBSOCKET_CONTRACT.md) | The frontend/backend transport and workflow contract for discovery, planning, and replanning. |

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

The Traveler Profile and Final Trip Plan intentionally separate what the system learns about the traveler from what it finally recommends. Internal evaluation, orchestration, and persistence details are not part of those user-facing data contracts; communication behavior is defined separately by the WebSocket contract.

## Documentation phases

1. **Core input and output** — Traveler Profile and Final Trip Plan.
2. **Feasibility and simulation** — schedule, mobility, fatigue, weather, and risk details.
3. **Optimization and replanning** — alternatives, tradeoffs, changed conditions, and repair plans.
4. **Knowledge data** — experiences, geography, accommodations, and transportation connections.
5. **Workflow and integration** — agent interfaces, orchestration, persistence, events, and APIs. The initial WebSocket contract is defined in [WebSocket Core API](WEBSOCKET_CONTRACT.md).

Later-phase documents must reference the core contracts rather than recreating their fields.

## Contract rules

- Unknown information is recorded explicitly; it is never silently replaced with a guessed value.
- A hard constraint is either satisfied, clearly unresolved, or clearly reported as impossible.
- Inferred preferences include their confidence and should not be presented as direct user statements.
- Examples are illustrative and do not define additional fields.
- Persistence, deployment, authentication, and external-provider behavior remain later-phase concerns. Initial workflow and API behavior is defined in [WebSocket Core API](WEBSOCKET_CONTRACT.md).

The product and project context remains in the root [README](../README.md). This directory defines the core data and transport concepts that implementation must preserve.
