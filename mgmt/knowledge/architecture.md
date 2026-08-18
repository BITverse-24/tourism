# Architecture knowledge

The canonical detailed architecture is [Three-Agent, Ten-Stage Travel Planner Architecture](../../docs/AGENT_ARCHITECTURE.md). This knowledge file summarizes the decisions that are relevant to the project-management orchestrator.

## Current system shape

The product is one planning workflow. Ten names remain as logical lifecycle stages, but the runtime is intentionally lean: one workflow orchestrator, three reasoning agents, deterministic policy/feasibility/cost/simulation/optimization engines, and knowledge retrieval.

Stage 2 is not an independent agent. Its natural-language interpretation belongs to the Discovery/Profile Agent; its deterministic behavior belongs to shared policy tools. Stage 10 is reserved for a later continuous-replanning phase.

The orchestrator owns canonical workflow state, artifact publication, ordering, retries, idempotency, and decision checkpoints. Components return structured artifacts and cannot mutate the Profile or Plan directly.

## Planning sequence

1. Discovery compiles a Profile draft.
2. Policy tools validate constraints, contradictions, provenance, and blocking unknowns.
3. The traveler confirms a Profile revision.
4. Candidate Design proposes route-level or city-level candidates.
5. Mobility, Cost, Local Intelligence, and Simulation evaluate candidates.
6. Optimization selects an admissible candidate or requests a typed traveler decision.
7. Narrative renders the selected result into a validated Final Trip Plan.

The public lifecycle keys remain compatible, but they represent workflow stages rather than independent deployments. Continuous replanning is not emitted or executed during initial planning.

## Separate management orchestrator

`mgmt/orchestrator/` is a separate, recommendation-only project-management analyzer over GitHub Issues. It does not execute product agents, persist travel plans, or define product architecture.

## Deferred architecture work

- Agent input/output interfaces and implementation protocol.
- Runtime, persistence, deployment, and public API.
- External provider selection and freshness/rate-limit policy.
- Optimization weight tuning and evaluation datasets.
- Replanning implementation details.
- Booking, payments, authentication, and user accounts.
