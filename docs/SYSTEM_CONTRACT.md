# Agentic Travel Planner — Core Documentation Contract

**Status:** Markdown-first core contracts
**Document revision:** 1.0

## Purpose

This document defines the boundary between the product overview, the two user-facing data contracts, and the narrow internal workflow policy now required for implementation. Detailed evaluation, knowledge, persistence, and API contracts will be added only when their phase begins.

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

The [Traveler Profile](md/TRAVELER_PROFILE_SCHEMA.md) is the normalized planning input. The [Final Trip Plan](md/FINAL_TRIP_PLAN_SCHEMA.md) is the user-facing planning output.

The internal ownership and lifecycle rules are defined in [TripState Ownership and Lifecycle](md/TRIPSTATE_OWNERSHIP_AND_LIFECYCLE.md), with its focused machine-readable policy at [`docs/json/agent-ownership.json`](json/agent-ownership.json). The machine-readable policy covers path ownership, patch operations, transitions, version invariants, and event invariants only.

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

## Shared rules

- Markdown field tables are authoritative for the current phase.
- Examples are illustrative and do not add fields.
- Unknown information is explicit and is never silently guessed.
- Only user-stated or explicitly accepted requirements are hard constraints.
- Inferred preferences carry their source and confidence.
- Major final-plan decisions must be traceable to a profile preference, constraint, or documented assumption.
- Dates, times, costs, and availability must state their scope and uncertainty.
- User-facing version lineage, persistence, and API behavior are deferred. Internal state mutation, lifecycle transitions, version creation, events, and failure handling follow the workflow contract.

## Phased architecture

1. **Core input and output** — Traveler Profile and Final Trip Plan.
2. **Feasibility and simulation** — schedule, mobility, fatigue, weather, and risk.
3. **Optimization and replanning** — alternatives, tradeoffs, changed conditions, and repair plans.
4. **Knowledge data** — geography, experiences, accommodations, and transportation connections.
5. **Workflow and integration** — agent interfaces, ownership, lifecycle, events, persistence, and APIs if required. Ownership and lifecycle are now specified; persistence and API details remain deferred.

Later phases must consume and extend the core contracts without redefining their user-facing meaning.

## Retired contract material

The former all-in-one user-data state contract, generated API contract, and fixture documents are retired from the active documentation set. The focused [TripState Ownership and Lifecycle](md/TRIPSTATE_OWNERSHIP_AND_LIFECYCLE.md) policy replaces the former broad ownership ambiguity without restoring the old all-in-one user-data contract.

## Product context

The root [README](../README.md) remains the product and project overview. This contract and the two linked core documents define the initial data concepts that implementation should preserve.
