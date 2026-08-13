# Agentic Travel Planner — Core Documentation Contract

**Status:** Markdown-first core contracts
**Document revision:** 1.0

## Purpose

This document defines the boundary between the product overview and the first two data contracts. It deliberately stays at the product and architecture level. Detailed workflow, evaluation, knowledge, persistence, and API contracts will be added only when their phase begins.

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
- Version lineage, immutable snapshots, runtime events, agent mutation rules, persistence, and API behavior are deferred.

## Phased architecture

1. **Core input and output** — Traveler Profile and Final Trip Plan.
2. **Feasibility and simulation** — schedule, mobility, fatigue, weather, and risk.
3. **Optimization and replanning** — alternatives, tradeoffs, changed conditions, and repair plans.
4. **Knowledge data** — geography, experiences, accommodations, and transportation connections.
5. **Workflow and integration** — agent interfaces, events, persistence, and APIs if required.

Later phases must consume and extend the core contracts without redefining their user-facing meaning.

## Retired contract material

The former all-in-one state contract and its generated-format, API, patch-ownership, and fixture documents are retired from the active documentation set. They must not be treated as implementation authority for the core contracts.

## Product context

The root [README](../README.md) remains the product and project overview. This contract and the two linked core documents define the initial data concepts that implementation should preserve.
