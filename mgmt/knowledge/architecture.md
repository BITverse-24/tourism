# Architecture knowledge

**Active sources:** [`README.md`](../../README.md), [`docs/SYSTEM_CONTRACT.md`](../../docs/SYSTEM_CONTRACT.md), [`Traveler Profile`](../../docs/md/TRAVELER_PROFILE_SCHEMA.md), and [`Final Trip Plan`](../../docs/md/FINAL_TRIP_PLAN_SCHEMA.md).

## Authority and scope

The active product contracts are the Markdown documents under `docs/md/`. They define the normalized planning input and the user-facing planning output. Workflow internals, persistence, public APIs, runtime choices, agent mutation rules, and event contracts are intentionally deferred until a later architecture phase.

Previous all-in-one state, generated API, ownership, and fixture documents are retired. They must not be recreated or treated as implementation authority.

## System shape

The MVP is one planning workflow. The ten agents are logical modules, not ten independently deployed products.

```text
Discovery answers
        ↓
Traveler Profile
        ↓
Planning workflow
        ↓
Experience selection and itinerary design
        ↓
Feasibility, simulation, and optimization
        ↓
Final Trip Plan
```

The product goal is a personalized plan, not a generic list of popular attractions. The same destination, budget, and duration may produce different plans for different Traveler Profiles.

## Logical agent responsibilities

| Agent | Primary responsibility | Owner from TEAM.md |
|---|---|---|
| 1 — Discovery | Adaptive questions and Traveler Profile inference | Siddhant |
| 2 — Constraint & Preference | Hard constraints, preferences, and contradictions | Krishay |
| 3 — Experience Designer | Destination, city, and experience selection | Siddhant |
| 4 — Mobility & Logistics | Movement, timing, and schedule feasibility | Supreet |
| 5 — Cost Optimization | Cost estimates, budget fit, and substitutions | Krishay |
| 6 — Local Intelligence | Local context and practical advice | Siddhant |
| 7 — Simulation & Risk | Fatigue, risk, comfort, and feasibility evaluation | Siddhant |
| 8 — Optimization | Candidate comparison and final itinerary selection | Krishay |
| 9 — Narrative & Explanation | Human-readable reasoning and tradeoffs | Siddhant |
| 10 — Continuous Replanning | Changed-condition planning in a later phase | Krishay |

These are responsibility boundaries, not executable mutation or API contracts. Detailed interfaces will be defined only after the core documents and the first vertical slice are accepted.

## Processing sequence

1. Discovery produces a normalized Traveler Profile.
2. Constraints identifies hard requirements and meaningful preferences.
3. Experience Design proposes destinations, cities, and experiences.
4. Mobility, Cost, and Local Intelligence evaluate the proposal.
5. Simulation evaluates fatigue, risk, and practical feasibility.
6. Optimization compares alternatives and selects a plan.
7. Narrative explains the plan using the structured decisions.
8. The product presents the Final Trip Plan.

Replanning, persistence, event delivery, and public API behavior are later phases.

## Separate management orchestrator

`mgmt/orchestrator/` is a separate, recommendation-only project-management analyzer over GitHub Issues. It does not execute product agents, persist travel plans, or define product architecture.

## Deferred architecture work

- Agent input/output interfaces and implementation protocol.
- Runtime, persistence, deployment, and public API.
- External provider selection and freshness/rate-limit policy.
- Optimization weight tuning and evaluation datasets.
- Replanning implementation details.
- Booking, payments, authentication, and user accounts.
