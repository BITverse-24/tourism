# Three-Agent, Ten-Stage Travel Planner Architecture

**Status:** Architecture decision for the initial planning workflow  
**Decision date:** 2026-08-17  
**Scope:** Initial planning only; continuous replanning is deferred

## Purpose

The product has **three actual reasoning agents** and **ten logical workflow stages**.

The three agents handle language-heavy work. Deterministic engines, retrieval services, and the Workflow Orchestrator handle the remaining stages. The ten stage names remain for lifecycle compatibility and product communication; they do not imply ten agents, ten models, or ten deployments.

This document is the detailed architecture reference for the planning workflow. The [Traveler Profile](TRAVELER_PROFILE_SCHEMA.md), [Final Trip Plan](FINAL_TRIP_PLAN_SCHEMA.md), and [WebSocket Core API](WEBSOCKET_CONTRACT.md) remain the authoritative user-facing data and transport contracts.

## Design principles

1. **Reason where interpretation is required.** Natural-language understanding, adaptive questioning, candidate ideation, and user-facing writing may use reasoning models.
2. **Calculate where correctness is required.** Policy validation, feasibility, cost calculations, simulation, and objective scoring are deterministic and versioned.
3. **One owner for canonical state.** Only the Workflow Orchestrator advances workflow state and publishes Profile or Plan snapshots.
4. **Evidence before prose.** Candidate and plan decisions must reference knowledge records, provider facts, profile values, or explicit assumptions.
5. **Hard constraints are never silently relaxed.** If no admissible plan exists, the system reports the conflict or asks for a typed decision.
6. **Stages are not agents.** A lifecycle key identifies a workflow stage, not an implementation boundary or deployment promise.

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
 Profile Policy Tools       Attraction KB/Retrieval    Evidence + decisions
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

The three reasoning agents may call only an allowlisted catalog of typed, read-only tools. Tool calls may retrieve facts or calculate results, but may not mutate canonical Profile, Plan, or workflow state. The orchestrator commits returned artifacts.

## Actual runtime agents

Only these three components are agents in the runtime:

| Runtime agent | Responsibility | Must not do |
|---|---|---|
| **Discovery/Profile Agent** | Adaptive questions, answer interpretation, profile compilation, provenance, unknowns, and assumptions | Design an itinerary or silently promote an inference to a hard constraint |
| **Candidate Design Agent (Agent 2)** | Selects evidence-backed attractions and decides how the traveler should experience them in `trip_route` and `city_day_plan` modes | Make the final plan selection or invent unsupported attractions |
| **Narrative/Explanation Agent** | Final plan prose, fit explanations, tradeoffs, assumptions, warnings, and unresolved details | Add new planning decisions, facts, costs, or bookings |

There is no standalone Constraint Agent, Mobility Agent, Cost Agent, Local Intelligence Agent, Simulation Agent, Optimization Agent, or Replanning Agent. Those names belong to logical stages described below.

The optimizer may use a bounded adjudication prompt for a close non-material comparison, but that is a mode of the planning workflow—not a fourth independent agent. Material ambiguity always produces a typed traveler decision.

## Deterministic and service components

| Component | Responsibility |
|---|---|
| **Workflow Orchestrator** | Canonical state, per-answer recovery state, confirmed Profile revision markers, ordering, validation, retries, idempotency, lifecycle events, decision checkpoints, and publication |
| **Profile Policy Tools** | Schema validation, contradiction detection, hard/soft constraint checks, blocking-unknown checks, and derived evaluation views |
| **Attraction KB and Retrieval** | City-linked attraction records, geography, local facts, provenance, freshness, and confidence. Attraction records are linked to the City Knowledge Base by `city_id`; visit experiences are not stored as KB records. |
| **Mobility Engine** | Routes, durations, opening hours, transfers, overlaps, check-in/out, travel burden, and violations |
| **Cost Engine** | Scoped estimates, budget position, cost deltas, and substitutions |
| **Simulation Engine** | Fatigue, walking, crowd, weather, delay, closure, transfer, comfort, and risk metrics |
| **Objective Optimizer** | Candidate admissibility, versioned scoring, tie detection, and final selection |

None of these components directly mutates the canonical Profile or Plan.

## Ten logical workflow stages

The ten-stage architecture is retained as a workflow map. Each stage maps to an actual agent, deterministic component, service, or future controller.

| Stage | Logical name | Execution owner | Initial status |
|---:|---|---|---|
| 1 | Discovery | Discovery/Profile Agent + Policy Tools | Active |
| 2 | Constraint & Preference | Profile Policy Tools | Active; not an agent |
| 3 | Attraction & Experience Designer | Candidate Design Agent + Attraction KB/Retrieval | Active |
| 4 | Mobility & Logistics | Mobility Engine | Active; deterministic |
| 5 | Cost Optimization | Cost Engine | Active; deterministic |
| 6 | Local Intelligence | KB/Retrieval service | Active; enrichment only |
| 7 | Simulation & Risk | Simulation Engine | Active; deterministic |
| 8 | Optimization | Objective Optimizer | Active; deterministic with bounded adjudication mode |
| 9 | Narrative & Explanation | Narrative/Explanation Agent | Active |
| 10 | Continuous Replanning | Future workflow controller | Deferred |

### Stage 1 and Stage 2 boundary

The Discovery/Profile Agent owns the natural-language part of discovery and profile compilation. It may produce an interpretation such as “the traveler prefers less exhausting days,” but that interpretation remains sourced and confidence-tagged.

The policy tools then validate the resulting Profile and derive planning views. Only user-stated or explicitly accepted requirements may enter the hard-constraint set. Contradictions and blocking unknowns remain visible instead of being resolved silently.

The resulting boundary is:

```text
Answer
  → Discovery interpretation
  → Policy validation and derived views
  → Versioned Traveler Profile
```

There is no second LLM handoff whose purpose is to tell other agents what deterministic code could do.

### Stage 3 boundary

The Candidate Design Agent has two contract modes rather than becoming two agents:

- `trip_route`: cities or regions, ordering, allocation, inter-city movement, and lodging-base candidates;
- `city_day_plan`: selected attractions, Agent 2-designed visit approaches, meals, rest, timing, and local sequencing.

It proposes multiple evidence-backed candidates. For each candidate it may select an attraction and describe the intended visit approach—such as an early, photography-focused visit or a slower, lower-walking visit—based on the Traveler Profile. These approaches are planning outputs, not separate knowledge-base records. It does not make the final choice. This avoids duplicated ranking authority between attraction selection and optimization.

#### Agent 2 runtime contract

Agent 2 is one reasoning agent with two explicit modes. The modes are separate contracts and bounded phases of one run; they are not additional agents and they do not create a second ranking authority.

```text
Validated Traveler Profile
        │
        ├── city-level request ──► fixed resolved city
        │
        └── country/region request ──► city retrieval
                                      │
                                      ▼
                              trip_route mode
                         route candidates + allocations
                                      │
                                      ▼
                       city_day_plan mode, per route/city
                    attraction retrieval + visit approaches
                                      │
                                      ▼
                              CandidateBundle set
                                      │
                                      ▼
                 Mobility → Cost → Simulation → Optimizer
                                      │
                                      ▼
                              Final plan or decision
```

Agent 2 receives the confirmed `Traveler Profile`, its profile revision, the resolved destination scope, the current City and Attraction dataset revisions, and the policy-derived hard-constraint guardrails. It does not receive hidden workflow state, database credentials, raw file paths, arbitrary provider payloads, or previous candidates from unrelated sessions.

Agent 2 is responsible for:

- resolving a destination request to known cities through tools;
- proposing city routes and tentative day allocations;
- retrieving and selecting city-linked attractions;
- sequencing attractions into day-level candidate designs;
- deciding how the traveler should experience each selected attraction;
- preserving meaningful soft preference tradeoffs in its alternatives;
- grounding every place reference in a dataset record; and
- returning assumptions, evidence, tradeoffs, and unresolved details.

Agent 2 is not responsible for:

- inventing a city, attraction, restaurant, or provider fact;
- deciding authoritative travel times, transfers, prices, opening-hour feasibility, or weather feasibility;
- silently relaxing a confirmed hard constraint;
- publishing the final plan;
- writing to the City Knowledge Base or Attraction Knowledge Base; or
- exposing raw SQL, hidden reasoning, internal scores, or database details to the traveler.

#### Agent 2 input contract

The orchestrator must pass a complete, immutable planning input for one run:

| Input | Required meaning |
|---|---|
| `profile` | The confirmed Traveler Profile, including destination request, duration/dates, preferences, travel style, hard constraints, unknowns, and assumptions. |
| `profile_revision` | The exact Profile revision that Agent 2 is planning against. |
| `destination_scope` | `city`, `region`, or `country`, plus any resolved `city_id` values already confirmed by policy tools. |
| `city_dataset_revision` | Revision of the City Knowledge Base available to retrieval. |
| `attraction_dataset_revision` | Revision of the Attraction Knowledge Base available to retrieval. |
| `hard_constraint_guardrails` | Only deterministic filters that policy tools can prove from dataset fields, such as excluded attraction IDs or allowed city IDs. |
| `run_budget` | Maximum route candidates, day variants, tool calls, rows, and wall-clock time for this Agent 2 run. |

The two dataset revisions may be different. A `CandidateBundle` records both and must never be assembled from a later revision after retrieval has started. If either revision changes during a run, the orchestrator invalidates the partial bundle and restarts the affected phase.

#### Mode 1: `trip_route`

`trip_route` is the city-selection and allocation phase.

For a city-level request:

1. Use the policy-resolved `city_id` as the required city.
2. Load the complete city record with `get_city`.
3. Do not replace the city because another city appears more popular or has more attractions.
4. Produce route candidates only when the requested duration can be represented or the unresolved conflict is explicitly returned.

For a country- or region-level request:

1. Query candidate cities with `search_cities` using the destination scope and profile-relevant city facts.
2. Use only returned `city_id` values; display names are not sufficient identifiers.
3. Consider `recommended_days_min`, `recommended_days_max`, destination type, climate, tourism popularity, and the traveler’s stated priorities.
4. Propose up to three ordered city routes, including one-city and multi-city alternatives when the duration supports them.
5. Allocate tentative days within each city’s recommended bounds where possible.
6. Record the tradeoff between depth in fewer cities and coverage across more cities.

The route result is a proposal, not a feasibility decision. Mobility and Cost later determine whether inter-city movement, lodging changes, and budget are workable. Agent 2 must not manufacture route distances, durations, fares, or transfer claims from city coordinates.

Minimum route artifact:

```json
{
  "route_id": "route_a",
  "stops": [
    {
      "city_id": "jaipur_rajasthan",
      "city_name": "Jaipur",
      "order": 1,
      "days": 3,
      "reason": "Matches the culture and photography priorities."
    }
  ],
  "assumptions": [],
  "tradeoffs": ["One city preserves depth and reduces hotel changes."]
}
```

#### Mode 2: `city_day_plan`

`city_day_plan` begins only after a route candidate has been created. It is executed independently for each route and selected city so the attraction retrieval scope remains explicit.

For each route stop, Agent 2 must:

1. Query attractions with that stop’s `city_id` as a mandatory scope.
2. Apply deterministic hard-constraint guardrails supplied by policy tools.
3. Keep all structurally valid soft-conflict candidates visible, including high-crowd attractions for a low-crowd traveler or difficult attractions for a low-walking traveler.
4. Ensure must-visit requests are either mapped to known attraction records or recorded as unresolved.
5. Select combinations that fit the city allocation and the traveler’s stated preferences.
6. Sequence the selected attractions into day candidates.
7. Generate a visit approach for every attraction rather than treating the attraction record itself as a pre-authored experience.
8. Add rest and meal slots when useful. Meal slots may express timing or dietary needs, but must not name or describe an unsupported restaurant.
9. Return up to two materially different day-design variants for that route/city.

A visit approach may contain:

| Field | Meaning |
|---|---|
| `mode` | Generated framing such as `photography_focused_visit`, `slow_cultural_visit`, or `balanced_attraction_visit`. |
| `timing_preference` | A suggested time category derived from attraction facts, not a guaranteed opening schedule. |
| `duration_minutes` | A proposal based on the attraction’s duration fields; Mobility may revise it. |
| `pace` | The profile-compatible pace for the visit. |
| `focus` | Profile priorities the visit is intended to serve. |
| `rationale` | Traveler-safe explanation grounded in profile values and attraction evidence. |
| `tradeoffs` | What the visit gains and gives up, when material. |

The visit approach is generated planning output. It is not written back as an “experience” record and does not change the Attraction Knowledge Base.

#### Retrieval tool catalog

Agent 2 has access only to these read-only tools:

| Tool | Mode | Required arguments | Result |
|---|---|---|---|
| `search_cities` | `trip_route` | Destination scope, optional region/type filters, page size, dataset revision | City records with stable `city_id`, planning metadata, provenance, and a cursor. |
| `get_city` | `trip_route` | One `city_id`, dataset revision | One authoritative city record or a typed not-found error. |
| `query_attractions` | `city_day_plan` | Parameterized query, mandatory selected `city_id` scope, hard guardrails, page size, cursor, dataset revision | Attraction records from the allowlisted view, query ID, revision, and next cursor. |
| `get_attractions_by_ids` | Both | Attraction IDs, selected city IDs, dataset revision | Exact hydrated records or a typed unknown/out-of-scope error. |

Tool results must include the dataset revision and stable evidence identifiers. Tool results must not include database credentials, filesystem paths, unbounded raw payloads, or hidden provider responses.

#### Restricted attraction SQL contract

The attraction dataset may be indexed in SQLite for efficient structured querying, but Agent 2 does not receive a database connection. `query_attractions` is a constrained tool over an allowlisted `attraction_query_view`.

The submitted query must:

- be one parameterized `SELECT` statement;
- read only from `attraction_query_view`;
- select `city_id` so the service can verify scope;
- use bound parameters rather than embedded string literals;
- omit `LIMIT` and `OFFSET`, because the service owns pagination; and
- stay within the tool’s approved columns and query shape.

The retrieval service must reject:

- writes, DDL, pragmas, attachments, extensions, or multiple statements;
- comments and query concatenation;
- joins, unions, subqueries, arbitrary tables, or filesystem access;
- queries without a selected-city scope;
- rows outside the route’s selected `city_id` set;
- stale or mismatched dataset revisions; and
- results exceeding row, byte, execution-time, or page limits.

The service adds the selected-city restriction outside the model query and applies explicit hard exclusions before returning rows. It may use neutral ordering or query relevance for context management, but it must not silently remove a soft preference conflict. If the model query is invalid, the tool returns a structured error; the orchestrator permits one bounded repair attempt and never falls back to raw CSV access.

#### Hard constraints and soft conflicts

Policy tools, not the LLM, determine which hard constraints can be mechanically enforced from available fields.

Confirmed hard constraints that can be proven from the data are applied as retrieval guardrails and checked again during candidate validation. Examples include:

- an attraction ID explicitly excluded by the traveler;
- a city not permitted by the confirmed destination scope; and
- an attraction whose `city_id` is outside the route being planned.

Soft or ambiguous conflicts remain visible to Agent 2 with conflict metadata. Examples include:

- low crowd tolerance versus a must-see attraction with `Very_High` crowd level;
- comfort-first travel versus a difficult attraction;
- local authenticity versus a major tourist attraction; and
- photography priority versus poor weather suitability.

Agent 2 may choose a soft conflict, but must explain the tradeoff and provide an alternative when practical. It may not reinterpret a confirmed hard constraint as a preference. If a verified hard constraint leaves no grounded candidate, the workflow enters `decision_required` with typed options such as choosing another city, changing dates, or reviewing the constraint.

#### CandidateBundle contract

Agent 2 returns multiple candidate bundles. A bundle is an internal artifact for deterministic evaluation, not the public Final Trip Plan.

```json
{
  "candidate_id": "route_a_variant_1",
  "profile_revision": 7,
  "dataset_revisions": {
    "city": "city-rev-12",
    "attraction": "attraction-rev-8"
  },
  "route": {
    "route_id": "route_a",
    "stops": [
      {"city_id": "city_jaipur", "order": 1, "days": 3}
    ]
  },
  "days": [
    {
      "city_id": "city_jaipur",
      "day_number": 1,
      "items": [
        {
          "type": "experience",
          "attraction_id": "amber_fort_jaipur_rajasthan",
          "city_id": "city_jaipur",
          "visit_approach": {
            "mode": "slow_cultural_visit",
            "timing_preference": "Morning",
            "duration_minutes": 150,
            "pace": "balanced",
            "focus": ["culture", "photography"],
            "rationale": "..."
          },
          "evidence_refs": ["amber_fort_jaipur_rajasthan", "city_jaipur"]
        },
        {
          "type": "meal",
          "title": "Meal break",
          "description": "Restaurant not selected; preserve flexible meal time."
        }
      ]
    }
  ],
  "assumptions": [],
  "tradeoffs": [],
  "unresolved_details": []
}
```

Candidate validation must verify:

- every route city exists and is unique;
- every attraction exists and belongs to the day’s city;
- every day belongs to the route and falls within its allocation;
- every evidence reference resolves to a current dataset record;
- hard exclusions are not present;
- the Profile revision and both dataset revisions are current; and
- meal slots contain no fabricated restaurant identity or provider fact.

The bundle may contain internal qualitative fit signals and tradeoff explanations, but it must not be treated as the final ranking. The Objective Optimizer receives the bundle plus deterministic Mobility, Cost, and Simulation results.

#### Ranking and authority model

There are three distinct ranking operations:

1. **Retrieval ordering:** context management only. It may use stable ID ordering or transparent query relevance. It is not a traveler-fit score.
2. **Agent 2 selection:** qualitative composition. Agent 2 chooses a route, attraction combination, sequence, and visit approach. Its alternatives should preserve meaningful differences rather than merely reorder the same places.
3. **Objective optimization:** final plan ranking. The optimizer scores complete candidate bundles using versioned deterministic inputs such as hard-constraint satisfaction, feasibility, cost, fatigue, walking burden, crowd exposure, weather risk, and profile fit.

No universal attraction ranking or user-specific recommendation is stored in the knowledge files. No candidate is final merely because Agent 2 listed it first.

#### Orchestrator sequence

The initial planning run follows this sequence:

1. Confirm the Profile revision and freeze the two dataset revisions.
2. Derive deterministic hard-constraint guardrails with Profile Policy Tools.
3. Enter `experience_designer` with internal subphase `trip_route`.
4. Resolve or retrieve cities and generate up to three route candidates.
5. Validate route IDs, city scope, day bounds, and profile revision.
6. For each route, enter internal subphase `city_day_plan`.
7. Query attractions per `city_id`, apply hard guardrails, and attach soft-conflict metadata.
8. Generate up to two city-day variants per route/city.
9. Validate each `CandidateBundle`; reject and repair invalid bundles once.
10. Send valid bundles to Mobility, Cost, and Simulation.
11. Run the deterministic Objective Optimizer.
12. Publish `decision_required` for a material unresolved tradeoff or impossible verified constraint; otherwise pass the selected bundle to Narrative.
13. Narrative renders the selected structured result into the Final Trip Plan; it cannot add new attractions, costs, or planning decisions.

Agent 2 may not skip from retrieval directly to publication. It may not call Mobility, Cost, Simulation, or the Optimizer as if they were LLM tools; the orchestrator invokes those deterministic services after candidate validation.

#### Bounds, retries, and failure states

Default bounds for the initial implementation are:

| Bound | Default |
|---|---:|
| Route candidates | 3 |
| City-day variants per route/city | 2 |
| Attraction rows per retrieval page | 50 |
| SQL repair attempts | 1 |
| Dataset revision per bundle | 1 city revision + 1 attraction revision |

The orchestrator additionally configures a total tool-call budget and wall-clock budget per run. Repeated query failures, excessive pages, or a stalled reasoning call fail the Agent 2 stage rather than opening an unbounded loop.

Failure behavior is explicit:

| Failure | Workflow behavior |
|---|---|
| Destination does not resolve to a known city | `decision_required` asking the traveler to clarify or choose a known city. |
| Route contains unknown, duplicate, or out-of-scope `city_id` | Reject the route candidate and request one bounded Agent 2 repair. |
| Attraction query contains invalid SQL | Return structured tool error, allow one repair, then fail the stage if still invalid. |
| Attraction is orphaned or outside selected city scope | Reject the record/candidate; never repair by joining on display name. |
| Dataset revision changes mid-run | Invalidate partial candidates and restart against one revision pair. |
| No attraction remains after verified hard filters | `decision_required`; never silently relax the hard constraint. |
| Only soft conflicts remain | Preserve candidates, expose conflict metadata, and let Agent 2 produce alternatives. |
| Candidate references unsupported facts | Reject the candidate or mark the detail unresolved; Narrative cannot fill it in. |
| No restaurant dataset exists | Emit meal slots only; do not invent restaurant names or availability. |

#### Lifecycle and observability

The public lifecycle key remains `experience_designer` for compatibility. Internal progress may use these safe subphase summaries:

- `Resolving destination cities`
- `Comparing route possibilities`
- `Finding attractions in {city}`
- `Designing visits around your priorities`
- `Preparing alternatives for evaluation`

Lifecycle events must not expose SQL, file paths, raw retrieval rows, hidden prompts, chain-of-thought, private profile details, or internal scores.

The orchestrator should record structured operational telemetry for each Agent 2 run:

- `run_id`, `profile_revision`, and dataset revisions;
- mode and subphase;
- tool name, query ID, duration, row count, page count, and rejection reason;
- candidate count and candidate validation failures;
- hard-constraint conflicts and decision-required reason;
- grounding rate and out-of-scope reference count;
- total tool calls, token/latency budget use, and stage duration.

Telemetry must be sufficient to diagnose retrieval and grounding failures without storing raw model reasoning or unnecessary personal data.

### Stages 4, 5, and 7

These capabilities return measurements and structured alternatives:

- Mobility returns feasibility, travel segments, burden, and violations.
- Cost returns amount, currency, scope, budget position, and substitution options.
- Simulation returns model-versioned metrics, risk flags, and reproducibility information.

They do not directly edit a candidate or write user-facing explanations. The orchestrator and optimizer decide how those measurements affect workflow state.

### Stage 6

Local Intelligence is a retrieval and enrichment layer for city and attraction facts. Curated knowledge is primary. External maps, places, transport, and weather facts are secondary and must carry `source`, `observed_at`, `fresh_until`, and `confidence` metadata. LLM-assisted enrichment must be validated before entering the City or Attraction Knowledge Base. Agent 2 may use those facts to design a visit approach, but the approach itself is not persisted as knowledge data.

### Stage 8 and ambiguity

The optimizer uses a versioned deterministic objective function. An LLM may provide bounded qualitative adjudication only when candidates are close and the difference is not material.

When close candidates represent a material tradeoff—such as comfort versus coverage or cost versus a must-have experience—the optimizer returns `decision_required` instead of silently choosing. The traveler selects among typed options. The LLM cannot change costs, durations, feasibility, hard constraints, or source facts.

### Stage 9

Narrative receives the selected candidate, evaluation artifacts, profile references, evidence, assumptions, and tradeoffs. It produces a Final Trip Plan that passes the existing plan invariants. It is a renderer of structured decisions, not a hidden second optimizer.

### Stage 10

Continuous replanning is deferred from the initial implementation and architecture contract. A future replanner should identify affected components and reuse the same candidate, mobility, cost, simulation, optimization, and narrative pipeline. It should not introduce a separate planning authority.

## Canonical artifacts

Components return immutable-style artifacts. The orchestrator is the only component that commits them to workflow state.

| Artifact | Producer | Required meaning |
|---|---|---|
| `ProfileDraft` | Discovery/Profile Agent | Interpreted answers, extracted fields, inferred fields, and a proposed Profile |
| `ValidatedTravelerProfile` | Policy tools + orchestrator | Profile satisfying schema and provenance rules, with explicit unknowns and assumptions |
| `CandidateBundle` | Candidate Design Agent | Diverse route/day candidates with `city_id` and `attraction_id` references, Agent 2 visit approaches, fit signals, and evidence |
| `EvaluationBundle` | Mobility, Cost, Local Intelligence, Simulation | Feasibility, cost, sourced facts, risk, comfort, and model metadata |
| `OptimizationResult` | Optimizer | Selected candidate or a typed decision request; includes objective version and traceable scores internally |
| `DecisionRequest` | Orchestrator/Optimizer | Stable decision ID, prompt, typed options, tradeoff summaries, and profile revision |
| `FinalTripPlanDraft` | Narrative/Explanation Agent | User-facing plan payload before final schema and invariant validation |

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

The orchestrator also owns per-answer recovery state, confirmed Profile revision markers, command idempotency, stale revision checks, retry behavior, lifecycle events, and rejection of partial work. No component may publish a final snapshot directly.

Every accepted discovery answer creates recovery state containing the latest Profile draft, Profile revision, active question, and discovery state. The answer is acknowledged only after that state is written. A reconnect resumes from the latest recovery state; it does not replay prior events. Profile confirmation records `confirmed_profile_revision` as the planning baseline, while the resulting Plan stores or immutably references the exact Profile revision/snapshot it used. No second checkpoint or duplicate Profile store is required.

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

These keys are logical workflow stages. Tool-backed stages may emit lifecycle events even when no LLM is running. `continuous_replanning` remains reserved for the future phase and is not emitted during initial planning.

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
| City and Attraction KB, retrieval data, provenance, and freshness | Knowledge-base/data owner |
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
- Agent 2 emits only known `city_id` and `attraction_id` references.
- Attraction retrieval cannot escape its selected-city scope or read/write outside the allowlisted view.
- Soft attraction conflicts remain available to Agent 2; verified hard constraints remain enforced through final validation.
- Candidate bundles do not mix city and attraction dataset revisions.
- Meal slots contain no fabricated restaurant facts when no restaurant dataset is available.
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
