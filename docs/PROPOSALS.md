# Proposals — docs/ is writable; README.md is read-only this task

> Writable directory this task: `docs/` per AGENTS.md (one task → one writable directory). Changes to `README.md` (project root) could not be applied directly and are proposed here.

## 1. Sync README.md with Final Architecture Decisions (2026-08-13)

**Target:** `README.md` (project root) and `docs/SYSTEM_CONTRACT.md` cross-reference

**Issue:** `README.md` (v1 product vision) does not reflect the Final implementation decisions from `mgmt/knowledge/decisions/2026-08-13-architecture-grill.md` (D1–D5 accepted 2026-08-13). `docs/SYSTEM_CONTRACT.md` has now been synced in this task (see §10), but `README.md` still reads as runtime-agnostic.

**Evidence:**
- `mgmt/knowledge/decisions/2026-08-13-architecture-grill.md` — Final — D1 Committed: TypeScript (Express + Socket.IO) + MongoDB via Mongoose; D5 Working Assumption: manual deployment, no auth/containers.
- `docs/SYSTEM_CONTRACT.md` §10 (added this task) now documents D1–D5; `README.md` §§1–10 has no implementation stack, deployment, or real-time event note.

**Suggested change:** Add a short **Implementation** appendix to `README.md` (e.g., after §10 Explicitly Out of MVP Scope), without altering the product vision:

```markdown
## 11. Implementation Stack (Final — 2026-08-13)

> Committed per `mgmt/knowledge/decisions/2026-08-13-architecture-grill.md` (Final).

- **Runtime & API:** TypeScript — Express (REST Command API per `docs/json/openapi.json`) + Socket.IO (real-time `PlanningEvent` feed complementing `GET /planning-runs/{runId}/events`).
- **Persistence:** MongoDB via Mongoose — `TripState` stored as immutable versioned documents (`trip_id`/`version`/`parent_version` indexed, `schema_version` validated, parity with `docs/json/schemas/trip-state.schema.json`).
- **Orchestration boundary:** Product orchestrator (this repo, `docs/SYSTEM_CONTRACT.md`) ≠ management orchestrator (`mgmt/orchestrator/`, Python, recommendation-only over GitHub Issues).
- **Data & freshness:** Curated Experience Knowledge Base primary (Aishwarya); external facts carry `source/observed_at/fresh_until/confidence`; stale allowed only when hard feasibility verifiable.
- **Optimization:** Config-driven normalized weights (`0..100` per component, `overall_score` composite, `candidate_id` tie-break, ≤3 candidates).
- **Deployment & auth:** Manual deployment (no containers/managed platform) in MVP; no authentication/user accounts (out of scope); env-based secrets/logging under Supreet.

See `docs/SYSTEM_CONTRACT.md` §10 for the full D1–D5 record.
```

Optionally add one-line notes to existing sections:
- §6 Data Sources: note “Curated KB is primary; external APIs secondary with freshness/confidence (D2).”
- §7 Ten-Agent Architecture intro: note “Product orchestrator is Express+Socket.IO/MongoDB; mgmt orchestrator is separate Python (D4).”

**Reason:** Keeps `README.md` (reader-facing) consistent with `docs/` as canonical contract without duplicating full detail. Prevents drift between product vision and implementation decisions.

**Impact:** Documentation-only. No code change. Owner to approve: Krishay (architecture) per `TEAM.md`. After approval, apply the markdown addition and add cross-links to `docs/md/README.md` if desired.

---

## 2. Optional README → docs cross-link

**Target:** `README.md`

**Issue:** No link from `README.md` to `docs/SYSTEM_CONTRACT.md` §10 or the Final grill file, so readers may miss the implementation decisions.

**Suggested change:** Add at top of `README.md`: `> Implementation decisions: see [docs/SYSTEM_CONTRACT.md §10](docs/SYSTEM_CONTRACT.md#10-implementation-decisions-final--2026-08-13) and [mgmt/knowledge/decisions/2026-08-13-architecture-grill.md](mgmt/knowledge/decisions/2026-08-13-architecture-grill.md).`

**Reason:** Discoverability.

**Impact:** Trivial doc link.

---

## 3. Historical record from the previous contract set

The following entries record changes made before the Markdown-first contract reset. They are retained for audit context only; the referenced generated-format artifacts are no longer active or authoritative.

The following were applied directly in `docs/` during the previous contract state and do **not** need separate proposals:
- `docs/SYSTEM_CONTRACT.md` — added §10 Implementation Decisions (D1–D5 Final), plus inline notes in §§1 and 8; removed “repository intentionally does not impose a backend language or runtime.”
- `docs/md/README.md` — added Implementation note under Validation & Compliance.
- `docs/md/OPENAPI_SPECIFICATION.md` — added Implementation note under Overview.
- `docs/md/TRIP_STATE_SCHEMA.md` — added Implementation note after Overview.
- `docs/json/openapi.json` — appended implementation note to `info.description` (non-breaking, D1/D5).

Verify with: `python3 docs/tests/validate_contract.py` (portable checks) and full Draft 2020-12 validator against `docs/json/schemas/trip-state.schema.json`.

## 4. Update README references after Markdown contract reset

**Target:** `README.md` (project root)

**Issue:** The root product overview still contains implementation notes that link to the retired generated-format contract files and describe the former all-in-one state object as an implementation reference.

**Evidence:** The new authoritative documents are `docs/md/TRAVELER_PROFILE_SCHEMA.md`, `docs/md/FINAL_TRIP_PLAN_SCHEMA.md`, and `docs/SYSTEM_CONTRACT.md`. Existing README implementation notes reference `docs/json/openapi.json` and `docs/json/schemas/trip-state.schema.json`.

**Suggested change:** Replace those links and references with a short link to `docs/SYSTEM_CONTRACT.md` and the two Markdown core contracts. Keep the README focused on product vision and project context.

**Reason:** Prevents readers from following stale contract links after the generated-format artifacts are retired.

**Impact:** Documentation-only root change. It must be applied by an owner with write access to the project root.

## 5. Align management knowledge with the Markdown-first core contracts

**Target:** `mgmt/knowledge/architecture.md`, `mgmt/knowledge/project.md`, and `mgmt/knowledge/product.md` (management knowledge directory)

**Issue:** Management knowledge still describes the retired all-in-one state, generated API contracts, and agent-patch ownership documents as current implementation authority.

**Evidence:** The active product contracts now define `Traveler Profile` and `Final Trip Plan` in `docs/md/`, while the management files still reference `TripState`, `docs/json/openapi.json`, and `docs/json/agent-ownership.json`.

**Suggested change:** Update the management knowledge to describe the two core contracts and the phased architecture. Defer workflow state, events, persistence, agent interfaces, and APIs to their later phases. Keep the accepted architecture decision as historical context, but mark any superseded contract references clearly.

**Reason:** Prevents agents and project planning work from implementing against contracts that are no longer authoritative.

**Impact:** Documentation-only change outside this task’s writable boundary. The owner of `mgmt/knowledge/` should apply it before using those files as implementation guidance.
