# Architecture knowledge

**Sources:** [`README.md`](../../README.md), [`docs/SYSTEM_CONTRACT.md`](../../docs/SYSTEM_CONTRACT.md), [`docs/json/openapi.json`](../../docs/json/openapi.json), [`docs/json/agent-ownership.json`](../../docs/json/agent-ownership.json).

## System shape

The MVP is one asynchronous planning workflow. The ten agents are typed logical modules, not ten independently deployed products. The workflow orchestrator is the only component allowed to merge patches, change lifecycle status, create versions, or emit public events.

```text
Client → Command API → Workflow Orchestrator
  → Discovery → Constraints → Experience Designer
  → Mobility + Cost + Local Intelligence (parallel)
  → Simulation & Risk → Optimization → Narrative
  → immutable TripState version → event/progress APIs
```

Continuous Replanning returns to the orchestrator. It preserves completed history and produces `minimal_change` and `full_reoptimization` branches.

## Canonical state

`TripState` is the sole canonical interchange object. Its hierarchy is:

```text
TripState
├── trip, traveler_profile, trip_request, constraints
├── destination, cities, experience_catalog, transportation_options
├── candidates (≤3), active_candidate_id, itinerary
├── simulation, optimization, narrative
├── data_facts, warnings, run, events
└── schema_version, status, version, parent_version
```

Published snapshots are immutable. Version increments on every published itinerary or explicit alternative selection; `parent_version` records lineage. Public objects require `schema_version`; unsupported major versions must be rejected.

## Lifecycle

```text
draft → discovery_in_progress → ready_to_plan → planning → planned
                                      ↓            ↓
                              awaiting_user_decision / failed
planned → planning (replan or alternative selection)
```

The run is ephemeral and has `queued`, `running`, `awaiting_user_decision`, `completed`, or `failed` status. Events include trip creation, discovery update, planning start, agent completion, awaiting decision, publication, replan request, and failure.

## Agent responsibilities and ownership

| # | Agent | Primary responsibility | Owner from TEAM.md |
|---|---|---|---|
| 1 | Discovery | Traveler profile and unanswered questions | Siddhant |
| 2 | Constraint & Preference | Hard constraints, soft weights, contradiction report | Krishay |
| 3 | Experience Designer | Destination, cities, catalog, candidate skeletons | Siddhant |
| 4 | Mobility & Logistics | Routes, transfers, opening-hours feasibility | Supreet |
| 5 | Cost Optimization | Cost totals, substitutions, tradeoffs | Krishay |
| 6 | Local Intelligence | Local advice and warnings | Siddhant |
| 7 | Simulation & Risk | Traveler state, fatigue, risk, simulation | Siddhant |
| 8 | Optimization | Candidate ranking, active candidate, itinerary | Krishay |
| 9 | Narrative & Explanation | Explanations only from frozen structured data | Siddhant |
| 10 | Continuous Replanning | Impact report and repair branches | Krishay |

Supporting ownership is documented in `TEAM.md`; no agent may mutate another agent’s output.

## Patch boundary

Agents emit JSON Patch operations. The machine-readable allow-list is authoritative. The orchestrator owns `/status`, `/version`, `/parent_version`, `/trip/updated_at`, and `/events`. Narrative is explicitly forbidden from changing ranking, scores, costs, or itinerary structure. Mobility, Cost, Local, and Simulation may evaluate in parallel but write only their assigned namespaces.

## Processing protocol

1. Run Discovery, then Constraints; incomplete discovery remains `discovery_in_progress`.
2. Experience Designer performs trip-level city allocation and city-level candidate construction.
3. Mobility, Cost, and Local fan out per candidate and join before Simulation.
4. Simulation applies day-by-day traveler state and hard feasibility gates.
5. Optimization ranks feasible candidates, retains up to three, uses deterministic candidate ID tie-breaking, and marks rank one active.
6. Narrative explains frozen structured results; the orchestrator validates and publishes the immutable version.

Retry only explicitly retryable failures. Stale facts may degrade with warnings only when hard feasibility remains verifiable. Missing required facts that prevent verification are terminal and must expose a safe error without secrets or raw stack traces.

## Objective and feasibility

The conceptual objective is:

```text
preference_fit + experience_quality + comfort + authenticity
- fatigue - cost_penalty - logistics_penalty - regret_risk - disruption_penalty
```

Components are normalized to `0..100`; `overall_score` is the composite. Hard gates include valid dates/duration, must-visit/avoid, dietary/accessibility, opening hours, transport schedule, and any hard budget ceiling. Infeasibility yields ranked relaxation options and `awaiting_user_decision`.

## Public API boundary

The contract exposes asynchronous commands and read APIs for trip creation, discovery answers, planning runs, constraint relaxations, immutable versions, alternative selection, replanning, run status, and event feeds. It explicitly does not provide booking, payment, authentication, scraping, CRUD persistence design, or UI behavior.

## Unresolved architecture decisions

- Backend language/runtime, persistence, deployment, and authentication remain unspecified.
- External provider selection, freshness/caching details, and rate limits remain unspecified.
- Exact traveler-weight configuration and optimization implementation remain to be refined.
- The product workflow orchestrator and this read-only GitHub work orchestrator are separate systems.
