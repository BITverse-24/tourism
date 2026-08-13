# Architecture Grill — Final

**Date:** 2026-08-13
**Status:** Final — accepted 2026-08-13 per explicit user acceptance
**Scope:** Architecture & Contracts — unresolved decisions from `mgmt/knowledge/architecture.md` and `docs/SYSTEM_CONTRACT.md`
**Sources:** `README.md`, `TEAM.md`, `docs/SYSTEM_CONTRACT.md`, `mgmt/knowledge/architecture.md`, `mgmt/knowledge/product.md`

> Final decision record. All D1–D5 settled and explicitly accepted by user on 2026-08-13. Draft phase closed.

## Goals

- Resolve open architecture decisions that block MVP implementation.
- Distinguish Committed (required by `docs/` contracts), Working Assumption, and Open.
- Record consequences and contract relationships.

## Non-Goals

- Not inventing final product UX, worldwide coverage, booking/payments (explicitly out of MVP scope per `project.md`).
- Not specifying frontend implementation details (owned by Ayush per `TEAM.md`).

## Decisions

### D1 — Backend language/runtime & persistence — ✅ Settled (Amended 2026-08-13)
- **Context:** `architecture.md` §Unresolved: backend language/runtime, persistence, deployment, auth unspecified. Supreet owns backend/APIs/DB per `TEAM.md`.
- **Decision:** **Committed — TypeScript (Express + Socket.IO) with MongoDB via Mongoose schemas.** Product workflow orchestrator and APIs run on Node/TypeScript (Express for REST/command APIs, Socket.IO for real-time progress/event stream as alternative to `docs/SYSTEM_CONTRACT.md` SSE/events); persistence is MongoDB with Mongoose schemas modeling `TripState` (immutable version snapshots with `version`/`parent_version`, `trip_id` indexed, `schema_version` validated). Mgmt orchestrator remains Python but product runtime is TS.
- **Alternatives:** TypeScript/Node + Postgres (JSONB) — prior D1 value; Python FastAPI + Postgres; MongoDB without Mongoose (native driver).
- **Consequences:** Document store fits `TripState` hierarchy naturally (`TripState` as single document + version history); Mongoose provides schema validation mirroring `docs/json/schemas/trip-state.schema.json` but requires dual-schema sync; Socket.IO introduces WebSocket realtime path alongside `SYSTEM_CONTRACT.md` event types — must map `trip.created`, `agent.completed`, `itinerary.published`, etc. to Socket.IO events; manual deployment (D5) must provision MongoDB instance; Supreet owns Node/Mongo stack.
- **Owner:** Supreet (per `TEAM.md` Backend ownership)
- **Approval:** Final — accepted 2026-08-13
- **Contract affected:** `docs/SYSTEM_CONTRACT.md` §1 (orchestrator owns merges/versions), §2 (versions/events immutable), §3 ( `schema_version` required), `docs/json/schemas/trip-state.schema.json` → Mongoose schema parity required; `docs/json/openapi.json` event model → Socket.IO mapping required

### D2 — External provider selection & freshness/caching — ✅ Settled
- **Context:** Provider selection, freshness/caching, rate limits unspecified; `SYSTEM_CONTRACT.md` §3 allows stale facts only when hard feasibility verifiable, with warnings.
- **Decision:** **Working Assumption — Curated Experience KB primary (Aishwarya per `TEAM.md`); external maps/places/weather/transport as secondary `data_facts` with `source/observed_at/fresh_until/confidence`. Stale allowed only when hard feasibility verifiable; otherwise terminal with `ConstraintRelaxationOption`. Warnings reduce confidence per `SYSTEM_CONTRACT.md` §3.
- **Alternatives:** Live provider-first (stale = terminal); Keep Open.
- **Consequences:** Limits MVP provider blast radius; requires `fresh_until/confidence` enforcement in Mobility/Cost/Local/Simulation; rate limits not yet specified.
- **Owner:** Aishwarya (KB) + Supreet (integrations)
- **Approval:** Final — accepted 2026-08-13

### D3 — Traveler weight configuration & optimization implementation — ✅ Settled
- **Context:** Conceptual objective in `architecture.md` §Objective; exact weights and implementation to be refined. Krishay owns Optimization per `TEAM.md`.
- **Decision:** **Committed — Config-driven normalized weights (0..100 per component, composite `overall_score`); weights in versioned config, deterministic `candidate_id` tie-breaker, up to 3 candidates retained, rank-1 active. Krishay owns Agent 8 + objective function.**
- **Approval:** Final — accepted 2026-08-13

### D4 — Product orchestrator vs GitHub work orchestrator boundary — ✅ Settled
- **Context:** `architecture.md` notes these are separate systems; confusion risks scope creep.
- **Decision:** **Committed — Separate systems. Product orchestrator owns TripState merges/versions/events per `SYSTEM_CONTRACT.md` §1; mgmt orchestrator (`mgmt/orchestrator/`) is recommendation-only over GitHub Issues per `mgmt/knowledge/workflow.md`. No shared persistence or mutation path.**
- **Approval:** Final — accepted 2026-08-13

### D5 — Deployment & authentication — ✅ Settled
- **Context:** Listed as unspecified in `architecture.md`.
- **Decision:** **Working Assumption — No auth/user accounts in MVP (per `project.md` out-of-scope). Deployment is manual (no containers/managed platform); env-based secrets and logging/monitoring remain Supreet ownership. Exact host/rate-limit details remain Open.**
- **Alternatives:** Managed container deploy; Add auth now (JWT/OAuth).
- **Consequences:** Simplest ops for MVP but lacks container isolation and auto-scaling; manual deploy steps must be documented; revisit containerization before scaling.
- **Owner:** Supreet (Infra) per `TEAM.md`
- **Approval:** Final — accepted 2026-08-13

## Risks

- D1 (Express+Socket.IO+MongoDB/Mongoose) introduces second language (TS product vs Python mgmt) + dual-schema sync risk (Mongoose schemas must mirror `trip-state.schema.json`); Socket.IO event mapping must cover all `SYSTEM_CONTRACT.md` event types; MongoDB version-history requires immutable snapshot discipline. Mitigate with shared validation and `version`/`parent_version` indexes.
- D2 stale-with-warning depends on correct `fresh_until/confidence` enforcement; mis-classifying a stale hard gate as warning could silently break feasibility.
- D3 config-driven weights require evaluation harness to avoid optimizing for wrong traveler profile.
- D5 manual deployment lacks isolation/scaling; operational drift risk across environments.

## Validation

- TripState validation against `docs/json/schemas/trip-state.schema.json` and `docs/tests/validate_contract.py` must pass for TS/Mongoose implementation; Mongoose schemas must be validated for parity (version/parent_version/schema_version).
- Agent patch ownership enforced per `docs/json/agent-ownership.json` (`PATCH_OWNERSHIP_VIOLATION`).
- Orchestration protocol `draft → planned` with immutable versions and events must remain green.

## Unresolved Questions

- D5 host specifics, rate limits, caching TTLs remain Open.
- Exact weight values for D3 not yet tuned — requires evaluation data.
- Provider list for D2 (which maps/places/weather APIs) not yet selected.

## Settled Contract Summary

- **Goals:** Resolve MVP-blocking architecture decisions; distinguish Committed vs Working Assumption vs Open.
- **Non-Goals:** Worldwide coverage, booking/payments, frontend detail — confirmed out of scope.
- **Decisions:** D1 TypeScript (Express + Socket.IO) + MongoDB/Mongoose (Committed, amended); D2 Curated KB primary, stale-with-warning (Working Assumption); D3 Config-driven normalized weights (Committed); D4 Separate product vs mgmt orchestrators (Committed); D5 No auth, manual deploy without containers (Working Assumption).
- **Constraints:** Respect `SYSTEM_CONTRACT.md` §3 hard-gate rules; orchestrator sole authority over `/status/version/events`; Team ownership per `TEAM.md`.
- **Risks:** See Risks above.
- **Validation:** Schema + ownership + lifecycle tests.
- **Unresolved:** Host/rate-limit/cache specifics, weight tuning, provider selection.

> **Accepted as Final on 2026-08-13** — Draft → Final per explicit user message "Accept as FInal". Implementation remains `mgmt/knowledge/decisions/` documentation only; product implementation requires separate explicit request per grill-and-record rules.

## Changelog

- 2026-08-13 — Created Draft with D1–D5 settled (D1: TS+Postgres, D2: curated KB, D3: config weights, D4: separate orchestrators, D5: manual no-auth).
- 2026-08-13 — Amended D1 to TypeScript (Express + Socket.IO) + MongoDB/Mongoose per user request.
- 2026-08-13 — Promoted to Final per user acceptance.
