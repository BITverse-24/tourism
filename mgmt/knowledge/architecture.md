# Architecture knowledge

## Known architecture

The MVP is a single asynchronous workflow. The orchestrator is the only component allowed to merge agent patches, update lifecycle/version fields, publish TripState versions, or emit public events.

The canonical flow is:

`Discovery → Constraints → Experience → (Mobility, Cost, Local) → Simulation → Optimization → Narrative → immutable TripState`

Continuous replanning returns to the orchestrator and produces minimal-change and full-reoptimization branches.

## Known agents/components

Ten logical agents are defined in `docs/SYSTEM_CONTRACT.md`: Discovery, Constraints & Preference, Experience Designer, Mobility & Logistics, Cost Optimization, Local Intelligence, Simulation & Risk, Optimization, Narrative & Explanation, and Continuous Replanning.

## Known integrations and dependencies

The public API is described in `docs/json/openapi.json`. The canonical data object is `docs/json/schemas/trip-state.schema.json`; JSON Patch ownership is defined in `docs/json/agent-ownership.json`. External providers are named conceptually (maps, places, weather, transportation, geocoding) but not selected.

## Unresolved architecture questions

- Backend language, runtime, persistence, and deployment are not selected.
- Provider contracts, caching policy, and credential handling are not implemented.
- The exact optimization objective and model evaluation protocol remain to be refined.
- The orchestration system must not be confused with the product workflow orchestrator; this management tool only reads project state.
