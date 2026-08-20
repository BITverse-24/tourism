# Agentic Travel Planner — Core Documentation Contract

**Status:** Markdown-first core contracts
**Document revision:** 1.0

## Purpose

This document defines the boundary between the product overview, the two user-facing data contracts, and the initial workflow transport contract. Detailed evaluation, knowledge, persistence, and deployment contracts remain later-phase concerns.

## Core transformation

```text
Discovery answers
        ↓
Traveler Profile
        ↓
Planning and decision making
        ↓
Final Trip Plan
```

The [Traveler Profile](TRAVELER_PROFILE_SCHEMA.md) is the normalized planning input. The [Final Trip Plan](FINAL_TRIP_PLAN_SCHEMA.md) is the user-facing planning output.
The [WebSocket Core API](WEBSOCKET_CONTRACT.md) defines how the frontend and backend exchange commands, acknowledgements, workflow events, and full Profile/Plan snapshots.


## Contract boundaries

### Traveler Profile

The profile contains:

- trip context;
- purpose and priorities;
- experience preferences;
- travel style and tolerances;
- hard constraints;
- unknowns, assumptions, and inferred values.

It does not contain an itinerary, candidate alternatives, internal scores, event history, agent output, or persistence lineage.

### Final Trip Plan

The plan contains:

- destination route and time allocation;
- accommodation recommendations, when available;
- day-by-day experiences, meals, rest, and movement;
- cost estimates and scope;
- profile-based explanations;
- tradeoffs, assumptions, warnings, and unresolved details.

It is not a booking confirmation, a provider response, or an internal optimization record.

### WebSocket Core API

The WebSocket contract contains workflow and transport state around the core contracts, including sessions, runs, commands, acknowledgements, question schemas, lifecycle events, snapshots, retries, and recovery. It must not redefine the meaning of fields inside a Traveler Profile or Final Trip Plan.

## Shared rules

- Markdown field tables are authoritative for the current phase.
- Examples are illustrative and do not add fields.
- Unknown information is explicit and is never silently guessed.
- Only user-stated or explicitly accepted requirements are hard constraints.
- Inferred preferences carry their source and confidence.
- Major final-plan decisions must be traceable to a profile preference, constraint, or documented assumption.
- Dates, times, costs, and availability must state their scope and uncertainty.
- Persistence, deployment, authentication, and external-provider behavior remain later-phase concerns. Initial workflow state, versioning, events, failure handling, and API behavior are defined by the WebSocket Core API.

## Phased architecture

1. **Core input and output** — Traveler Profile and Final Trip Plan.
2. **Feasibility and simulation** — schedule, mobility, fatigue, weather, and risk.
3. **Optimization and replanning** — alternatives, tradeoffs, changed conditions, and repair plans.
4. **Knowledge data** — geography, experiences, accommodations, and transportation connections.
5. **Workflow and integration** — agent interfaces, orchestration, persistence, events, and APIs. The initial WebSocket behavior is defined by [WebSocket Core API](WEBSOCKET_CONTRACT.md); persistence, authentication, and deployment remain deferred.

Later phases must consume and extend the core contracts without redefining their user-facing meaning.

## Retired contract material

The former all-in-one state contract, generated API contract, ownership policy, and fixture documents are retired from the active documentation set. No replacement internal state contract is currently authoritative.

## Product context

The root [README](../README.md) remains the product and project overview. This contract and the linked core documents define the initial data and transport concepts that implementation should preserve.
