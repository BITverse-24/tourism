# Project knowledge: Agentic Travel Planner

## Objective

Build a human-centric, agentic travel planner that creates, simulates, optimizes, and dynamically replans personalized itineraries.

## Current phase and milestone

- **Current phase:** MVP contract and architecture foundation.
- **Current milestone:** Establish the canonical TripState contract and a coherent path from discovery through planning, simulation, optimization, narrative, and replanning.

This phase is derived from the existing system contract and repository documentation; no implementation status is inferred from absent application code.

## Success criteria

- A traveler can be represented by a structured profile and constraints.
- The planning workflow produces ranked, explainable itinerary candidates.
- Hard feasibility constraints are never silently broken.
- Published plans are immutable versioned TripState snapshots.
- Replanning preserves completed history and exposes minimal-change and full-reoptimization branches.
- Team work is visible through read-only GitHub issue state and explicit dependencies.

## Current priorities

1. Protect and use the canonical TripState and agent ownership contracts.
2. Define interfaces between logical agents and the workflow orchestrator.
3. Establish a validated, curated experience/data foundation.
4. Build the MVP workflow before broad destination coverage.

## Explicitly out of scope

Booking, payments, authentication, source scraping, GitHub Projects, autonomous task assignment, automatic GitHub mutation, and ten independently deployed agent services.

## Progress interpretation

The orchestrator treats the current phase and milestone as repository knowledge plus GitHub evidence. It reports gaps and unresolved decisions as recommendations, never changes product scope, and does not treat issue titles as dependency declarations.
