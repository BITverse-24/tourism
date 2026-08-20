# Project knowledge: Agentic Travel Planner

**Sources:** [`README.md`](../../README.md), [`TEAM.md`](../../TEAM.md), [`docs/SYSTEM_CONTRACT.md`](../../docs/SYSTEM_CONTRACT.md), and the active core contracts under [`docs/md/`](../../docs/md/).

## Objective

Build a human-centric, agentic travel-planning system that models how a traveler wants to experience a trip, then generates, simulates, optimizes, explains, and eventually replans a personalized itinerary.

## MVP capabilities

### Personalized trip generation

Discovery produces a normalized [Traveler Profile](../../docs/md/TRAVELER_PROFILE_SCHEMA.md). Planning uses it to determine destination coverage, city or region allocation, experiences, transportation, and daily sequencing.

### Simulation and human-centric optimization

Candidate plans are evaluated for preference fit, fatigue, walking, schedule feasibility, travel time, budget, crowds, weather, transfers, experience quality, regret risk, and comfort. Material tradeoffs must be visible to the traveler.

### Dynamic replanning

The product is intended to respond to delays, weather, closures, budget changes, duration changes, fatigue, preference changes, and party changes. Replanning is a later phase after the initial planning path is stable.

## Current project phase

**Phase:** MVP contract and integration foundation.

**Milestone:** Implement one complete workflow from discovery through a user-facing Final Trip Plan, using the internal ownership and lifecycle policy before broad destination coverage or secondary features.

There is currently no production application runtime in this repository. Progress must therefore be measured by contract completion, vertical-slice fixtures, and implementation work—not inferred from source-code coverage.

## Success criteria

- Distinct travelers can receive materially different plans for the same destination, budget, and duration.
- Traveler Profile and Final Trip Plan remain separate, understandable contracts.
- Candidate skeletons and ranked candidates have disjoint ownership.
- Hard constraints are never silently broken.
- Agent patches are atomic and rejected when they violate ownership or lifecycle rules.
- A complete vertical slice can produce a Final Trip Plan from a Traveler Profile.
- The Experience Knowledge Base supplies structured evidence rather than relying entirely on latent model knowledge.
- Replanning preserves completed context when the later phase is implemented.

## Current priorities

1. Freeze the minimal agent input/output interfaces around the active ownership policy.
2. Select and document one vertical-slice destination and test fixture.
3. Establish a curated, validated experience and transportation foundation.
4. Implement the backend workflow and the minimum frontend/backend handshake.
5. Validate agent outputs, failure handling, and lifecycle transitions.
6. Add replanning and alternatives only after the initial planning path is reliable.

## Explicitly out of MVP scope

Travel Movie/cinematic preview, smart packing list, full conversational Local Guide, language-learning assistant, booking, payments, social travel network, hotel or flight booking platforms, comprehensive worldwide coverage, and fully autonomous interaction with every external travel service.

For the project orchestrator specifically, GitHub Projects, autonomous task assignment, and GitHub mutations are out of scope.

## Progress interpretation

The management orchestrator uses repository knowledge plus read-only GitHub state. It must not infer product requirements from issue titles, invent architecture to fill gaps, or silently revive retired contracts. Missing requirements, stale evidence, invalid dependencies, and unresolved decisions are reported explicitly.
