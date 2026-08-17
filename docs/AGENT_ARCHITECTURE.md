# Lean Agentic Travel Planner Architecture

**Status:** Architecture decision for the initial planning workflow  
**Decision date:** 2026-08-17  
**Scope:** Initial planning only; continuous replanning is deferred

## Purpose

The product keeps ten named planning capabilities for lifecycle compatibility and product communication, but does not require ten independent LLM agents.

The runtime is organized around the smallest useful set of reasoning capabilities, deterministic planning engines, knowledge services, and one workflow orchestrator. The ten names describe responsibilities in the workflow; they do not imply ten deployments, ten models, or ten independently mutable state stores.

This document is the detailed architecture reference for the planning workflow. The [Traveler Profile](TRAVELER_PROFILE_SCHEMA.md), [Final Trip Plan](FINAL_TRIP_PLAN_SCHEMA.md), and [WebSocket Core API](WEBSOCKET_CONTRACT.md) remain the authoritative user-facing data and transport contracts.

## Design principles

1. **Reason where interpretation is required.** Natural-language understanding, adaptive questioning, candidate ideation, and user-facing writing may use reasoning models.
2. **Calculate where correctness is required.** Policy validation, feasibility, cost calculations, simulation, and objective scoring are deterministic and versioned.
3. **One owner for canonical state.** Only the Workflow Orchestrator advances workflow state and publishes Profile or Plan snapshots.
4. **Evidence before prose.** Candidate and plan decisions must reference knowledge records, provider facts, profile values, or explicit assumptions.
5. **Hard constraints are never silently relaxed.** If no admissible plan exists, the system reports the conflict or asks for a typed decision.
6. **Ten names are compatibility labels.** A lifecycle key identifies a workflow capability, not an implementation boundary or deployment promise.

## Runtime topology

```text
                         Workflow Orchestrator
       state, ordering, validation, retries, idempotency, publication
                                  │
        ┌─────────────────────────┼──────────────────────────┐
        ▼                         ▼                          ▼
 Discovery/Profile          Candidate Design          Narrative/Explanation
 reasoning capability       reasoning capability      reasoning capability
        │                         │                          │
        ▼                         ▼                          ▼
 Profile Policy Tools       Experience KB/Retrieval     Evidence + decisions
        │                         │                          │
        └───────────────┬─────────┴──────────────┬───────────┘
                        ▼                        ▼
                 Mobility Engine          Cost Engine
                        │                        │
                        └────────────┬───────────┘
                                     ▼
                              Simulation Engine
                                     ▼
                              Objective Optimizer
```

The reasoning capabilities may call only an allowlisted catalog of typed, read-only tools. Tool calls may retrieve facts or calculate results, but may not mutate canonical Profile, Plan, or workflow state. The orchestrator commits returned artifacts.

## Capability architecture

| Logical capability | Runtime role | Owns | Must not do |
|---|---|---|---|
| **1. Discovery** | Reasoning capability | Adaptive questions, answer interpretation, profile compilation, provenance, unknowns, and assumptions | Design an itinerary or silently promote an inference to a hard constraint |
| **2. Constraint & Preference** | Deterministic policy tools; not an independent agent | Profile schema validation, contradiction detection, hard/soft constraint checks, blocking-unknown checks, and derived evaluation views | Maintain a separate source of truth or make unconfirmed decisions |
| **3. Experience Designer** | One reasoning capability with two explicit modes | Evidence-backed candidates for `trip_route` and `city_day_plan` | Make the final plan selection or invent unsupported places |
| **4. Mobility & Logistics** | Deterministic feasibility engine | Routes, durations, opening-hour checks, transfers, overlaps, check-in/out, travel burden, and violations | Write narrative or override a confirmed hard constraint |
| **5. Cost Optimization** | Deterministic cost engine | Scoped estimates, budget position, cost deltas, and substitutions | Change budget scope or silently reject without alternatives or an explicit issue |
| **6. Local Intelligence** | Retrieval/enrichment capability | Sourced destination facts, local context, freshness, and confidence | Become a separate conversational planner or make unsupported recommendations |
| **7. Simulation & Risk** | Deterministic scenario evaluator | Fatigue, walking, crowd, weather, delay, closure, transfer, comfort, and risk metrics | Mutate the itinerary or turn a risk estimate into a hidden constraint |
| **8. Optimization** | Versioned objective function and solver | Candidate comparison, admissibility, scoring, tie detection, and selection | Select an infeasible candidate or override deterministic facts |
| **9. Narrative & Explanation** | Reasoning/rendering capability | Final plan prose, fit explanations, tradeoffs, assumptions, warnings, and unresolved details | Add new planning decisions, facts, costs, or bookings |
| **10. Continuous Replanning** | Deferred future controller | Nothing in the initial vertical slice | Be implemented as a second planning brain now |

### Agent 1 and Agent 2 boundary

Agent 1 owns the natural-language part of discovery and profile compilation. It may produce an interpretation such as “the traveler prefers less exhausting days,” but that interpretation remains sourced and confidence-tagged.

The policy tools then validate the resulting Profile and derive planning views. Only user-stated or explicitly accepted requirements may enter the hard-constraint set. Contradictions and blocking unknowns remain visible instead of being resolved silently.

The resulting boundary is:

```text
Answer
  → Discovery interpretation
  → Policy validation and derived views
  → Versioned Traveler Profile
```

There is no second LLM handoff whose purpose is to tell other agents what deterministic code could do.

### Agent 3 boundary

Agent 3 remains one reasoning capability rather than two agents. It has two contract modes:

- `trip_route`: cities or regions, ordering, allocation, inter-city movement, and lodging-base candidates;
- `city_day_plan`: experiences, meals, rest, timing, and local sequencing.

It proposes multiple evidence-backed candidates. It does not make the final choice. This avoids duplicated ranking authority between experience selection and optimization.

### Agents 4, 5, and 7

These capabilities return measurements and structured alternatives:

- Mobility returns feasibility, travel segments, burden, and violations.
- Cost returns amount, currency, scope, budget position, and substitution options.
- Simulation returns model-versioned metrics, risk flags, and reproducibility information.

They do not directly edit a candidate or write user-facing explanations. The orchestrator and optimizer decide how those measurements affect workflow state.

### Agent 6

Local Intelligence is a retrieval and enrichment layer. Curated knowledge is primary. External maps, places, transport, and weather facts are secondary and must carry `source`, `observed_at`, `fresh_until`, and `confidence` metadata. LLM-assisted enrichment must be validated before entering the knowledge base.

### Agent 8 and ambiguity

The optimizer uses a versioned deterministic objective function. An LLM may provide bounded qualitative adjudication only when candidates are close and the difference is not material.

When close candidates represent a material tradeoff—such as comfort versus coverage or cost versus a must-have experience—the optimizer returns `decision_required` instead of silently choosing. The traveler selects among typed options. The LLM cannot change costs, durations, feasibility, hard constraints, or source facts.

### Agent 9

Narrative receives the selected candidate, evaluation artifacts, profile references, evidence, assumptions, and tradeoffs. It produces a Final Trip Plan that passes the existing plan invariants. It is a renderer of structured decisions, not a hidden second optimizer.

### Agent 10

Continuous replanning is deferred from the initial implementation and architecture contract. A future replanner should identify affected components and reuse the same candidate, mobility, cost, simulation, optimization, and narrative pipeline. It should not introduce a separate planning authority.

## Canonical artifacts

Components return immutable-style artifacts. The orchestrator is the only component that commits them to workflow state.

| Artifact | Producer | Required meaning |
|---|---|---|
| `ProfileDraft` | Discovery | Interpreted answers, extracted fields, inferred fields, and a proposed Profile |
| `ValidatedTravelerProfile` | Policy tools + orchestrator | Profile satisfying schema and provenance rules, with explicit unknowns and assumptions |
| `CandidateBundle` | Experience Designer | Diverse route/day candidates with knowledge IDs, fit signals, and evidence |
| `EvaluationBundle` | Mobility, Cost, Local Intelligence, Simulation | Feasibility, cost, sourced facts, risk, comfort, and model metadata |
| `OptimizationResult` | Optimizer | Selected candidate or a typed decision request; includes objective version and traceable scores internally |
| `DecisionRequest` | Orchestrator/Optimizer | Stable decision ID, prompt, typed options, tradeoff summaries, and profile revision |
| `FinalTripPlanDraft` | Narrative | User-facing plan payload before final schema and invariant validation |

Internal artifacts may contain candidate rankings, model scores, provider payload normalization, and decision traces. These are not added to the public Traveler Profile or Final Trip Plan schemas.

## Workflow state and planning flow

```text
discovery
  → profile_review
  → planning
  → decision_required ──┐
  │                      │ typed decision response
  └──────────────────────┘
  → plan_ready
```

The normal planning sequence is:

1. Discovery compiles a Profile draft.
2. Policy tools validate the Profile and expose contradictions or blocking unknowns.
3. The traveler confirms the Profile revision.
4. Candidate Design proposes route-level or city-level candidates.
5. Mobility, Cost, Local Intelligence, and Simulation evaluate the candidates.
6. Optimization selects an admissible candidate or returns `decision_required`.
7. A typed traveler response resumes planning when needed.
8. Narrative renders the selected structured result.
9. The orchestrator validates and publishes one Final Trip Plan snapshot.

The orchestrator also owns command idempotency, stale revision checks, retry behavior, lifecycle events, and rejection of partial work. No component may publish a final snapshot directly.

## Lifecycle compatibility

The public lifecycle keys remain:

```text
discovery
constraint_preference
experience_designer
mobility_logistics
cost_optimization
local_intelligence
simulation_risk
optimization
narrative_explanation
continuous_replanning
```

These keys are logical workflow capabilities. Tool-backed capabilities may emit lifecycle events even when no LLM is running. `continuous_replanning` remains reserved for the future phase and is not emitted during initial planning.

Lifecycle summaries must be safe user-facing text. They must not expose chain-of-thought, hidden prompts, raw provider responses, internal rankings, or unreviewed personal data.

## Decision checkpoint transport

The WebSocket workflow adds a `decision_required` state between `planning` and `plan_ready`.

The server emits a typed `decision.request` containing:

- stable `decision_id`;
- current `profile_revision`;
- plain-language prompt;
- one or more `option_id` values;
- labels and tradeoff summaries;
- reason such as `material_tradeoff` or `no_admissible_candidate`.

The client responds with `decision.respond` containing:

- `decision_id`;
- selected `option_id`;
- normal command ID for idempotency.

Responses are rejected when the decision ID, option ID, or Profile revision is stale. Clients cannot submit arbitrary JSON patches to the Profile or Plan.

## Ownership model

Team ownership follows capabilities rather than the old ten-agent table:

| Capability area | Primary responsibility |
|---|---|
| Workflow orchestration, policy, objective function, contracts, and integration | System architecture/orchestration owner |
| Discovery, Candidate Design, Narrative reasoning, prompts, and evaluation | AI/ML and agent-intelligence owner |
| Mobility, Cost, Simulation runtime, APIs, retries, and external adapters | Backend/infrastructure owner, with architecture support |
| Experience KB, retrieval data, provenance, and freshness | Knowledge-base/data owner |
| Profile, plan, decision checkpoint, and lifecycle UI | Frontend owner |
| Contract scenarios, edge cases, provider research, and acceptance testing | Research/QA owner |

Individual names remain governed by the team ownership document; this architecture defines the capability boundaries those owners implement.

## Acceptance criteria

- A Profile with an inferred preference retains its source and confidence.
- An inferred preference cannot become a hard constraint without explicit acceptance.
- Contradictions and blocking unknowns prevent silent planning completion.
- Mobility, cost, and simulation produce structured, reproducible evaluations.
- Infeasible candidates never win optimization.
- Material close tradeoffs produce `decision_required` and typed options.
- A stale or duplicate decision response cannot mutate the workflow twice.
- Narrative output is grounded in selected decisions and passes Final Trip Plan invariants.
- Ten logical lifecycle keys remain compatible without implying ten deployments.
- No initial-planning flow invokes continuous replanning.

## Deferred decisions and scope

The following remain outside this architecture decision:

- continuous replanning behavior and change-impact contracts;
- persistence, authentication, deployment, and durable event history;
- provider-specific adapters and rate-limit policy;
- final objective-weight tuning and evaluation datasets;
- booking, payments, accounts, and worldwide destination coverage.
