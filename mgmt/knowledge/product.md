# Product knowledge

## Vision

Optimize for how a traveler wants to experience a journey, not only where they should go.

## Core user problem

Generic travel planners list destinations and activities but do not adequately model personality, pace, comfort, fatigue, regret, tradeoffs, or changing conditions.

## Core experience

The system adaptively understands a traveler, produces a personalized itinerary, simulates its consequences, explains tradeoffs, and replans when conditions change.

## Major capabilities

- Personalized trip generation from destination, dates, budget, party, preferences, and constraints.
- Human-centric simulation and optimization covering preference fit, fatigue, walking, feasibility, cost, crowds, weather, transfers, quality, and regret.
- Dynamic replanning for weather, delay, closures, budget, fatigue, duration, party, or custom changes.
- Hierarchical destination knowledge from country through experience.

## Current scope

The MVP is a single asynchronous planning workflow composed of ten logical agents and a sole workflow orchestrator. It publishes up to three ranked candidates and a narrative derived from frozen structured results.

## Explicitly unknown requirements

The repository does not define the production runtime, provider choices, persistence implementation, deployment target, authentication model, destination coverage, or final optimization mathematics. These remain decisions rather than invented requirements.
