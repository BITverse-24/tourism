# Project knowledge: Agentic Travel Planner

**Sources:** [`README.md`](../../README.md), [`TEAM.md`](../../TEAM.md), [`docs/SYSTEM_CONTRACT.md`](../../docs/SYSTEM_CONTRACT.md).

## Objective

Build a human-centric, agentic travel-planning system that models how a traveler wants to experience a trip, then generates, simulates, optimizes, explains, and dynamically replans a personalized itinerary.

The system should optimize for the traveler’s experience rather than merely returning popular destinations or attractions.

## MVP capabilities

### 1. Personalized trip generation

Inputs include destination or country, travel dates/duration, budget, traveler count, trip purpose, preferences, and constraints. Discovery uses an adaptive questionnaire, producing a structured Traveler Profile. Planning then determines regions/cities, duration allocation, inter-city travel, experiences, and daily sequencing.

### 2. Simulation and human-centric optimization

Generated itineraries are evaluated before acceptance for preference alignment, fatigue, walking load, schedule feasibility, travel time, budget, crowds, weather, transfers, experience quality, regret risk, and comfort. The optimizer must expose explicit tradeoffs instead of only rejecting an itinerary.

### 3. Dynamic replanning

The planner responds to delays, weather, closures, budget changes, duration changes, fatigue, preference changes, and party changes. It identifies affected activities, finds alternatives, re-evaluates mobility/cost, simulates, optimizes, and preserves unaffected high-value itinerary sections.

## Current project phase

**Phase:** MVP contract and architecture foundation.

**Milestone:** Implement the canonical TripState-backed workflow and its ownership boundaries before broad destination coverage or secondary product features.

This phase is based on the repository’s existing contracts. There is no production application runtime in the repository from which implementation progress can be inferred.

## Success criteria

- Distinct travelers can receive materially different itineraries for the same destination, budget, and duration.
- Traveler Profile and hard/soft constraints are represented structurally.
- City/country requests can be handled through trip-level and city-level planning.
- The Experience Knowledge Base supplies structured evidence rather than relying entirely on latent LLM knowledge.
- Candidate itineraries are evaluated deterministically where possible, ranked, and explained.
- Hard feasibility constraints are never silently broken.
- Published results are immutable, versioned TripState snapshots.
- Replanning preserves completed history and compares `minimal_change` with `full_reoptimization` branches.
- Agent patches are validated against ownership boundaries.

## Current priorities

1. Preserve and implement against the canonical TripState, OpenAPI, and agent-ownership contracts.
2. Define and validate the ten logical agent interfaces.
3. Establish a curated, validated experience and transportation foundation.
4. Implement the end-to-end initial planning flow.
5. Implement replanning and alternatives without unnecessary disruption.
6. Prefer limited, well-covered destinations over shallow worldwide coverage.

## Explicitly out of MVP scope

Travel Movie/cinematic preview, smart packing list, full conversational Local Guide, language-learning assistant, booking, payments, social travel network, hotel or flight booking platforms, comprehensive worldwide coverage, and fully autonomous interaction with every external travel service.

For the project orchestrator specifically, GitHub Projects, autonomous task assignment, and GitHub mutations are also out of scope.

## Progress interpretation

The management orchestrator uses repository knowledge plus read-only GitHub state. It must not infer product requirements from issue titles, invent architecture to fill gaps, or change strategic scope. Missing requirements, stale evidence, invalid dependencies, and unresolved decisions are reported explicitly.
