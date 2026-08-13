# TripState Ownership and Lifecycle Contract

**Contract role:** Internal workflow policy
**Document revision:** 1.0
**Machine-readable policy:** [`docs/json/agent-ownership.json`](../json/agent-ownership.json)

## Purpose

This document makes the internal `TripState` workflow executable and unambiguous. It defines who may write each state area, how candidate skeletons become ranked candidates, which lifecycle transitions are allowed, and how the orchestrator handles patches, versions, events, and failures.

`TripState` is an internal planning state. It is not the user-facing [Traveler Profile](TRAVELER_PROFILE_SCHEMA.md) or [Final Trip Plan](FINAL_TRIP_PLAN_SCHEMA.md). Those core documents define product meaning; this document defines workflow ownership and mutation policy.

The machine-readable policy and this document must be changed together. The machine-readable file is limited to ownership, transitions, patch rules, and invariants; it is not a replacement for a user-data schema.

## State areas

The internal state uses these ownership boundaries:

```text
TripState
├── schema_version                 orchestrator
├── trip                           orchestrator
├── status                         orchestrator
├── version / parent_version       orchestrator
├── traveler_profile               Agent 1
├── constraints                    Agent 2
├── destination                    Agent 3
├── city_allocations               Agent 3
├── experience_catalog             Agent 3
├── candidates
│   ├── skeletons                  Agent 3
│   ├── ranked                     Agent 8
│   └── active_candidate_id        Agent 8
├── evaluations
│   ├── mobility                   Agent 4
│   ├── cost                       Agent 5
│   ├── local                      Agent 6
│   └── simulation                 Agent 7
├── itinerary                      Agent 8
├── optimization                   Agent 8
├── narrative                      Agent 9
├── replanning                     Agent 10, through orchestrator-approved commands
├── run                            orchestrator
└── events                         orchestrator
```

## Ownership rules

Ownership applies to a path and all of its descendants. An agent may write only a path listed for that agent. A listed read path does not grant write permission.

| Owner | Write paths | Explicit boundary |
|---|---|---|
| Orchestrator | `/schema_version`, `/trip`, `/status`, `/version`, `/parent_version`, `/run`, `/events` | Owns lifecycle, persistence metadata, event emission, and all merges. |
| Agent 1 — Discovery | `/traveler_profile` | May normalize discovery results; may not change constraints or lifecycle. |
| Agent 2 — Constraint & Preference | `/constraints` | May convert confirmed requirements into constraints; may not rank candidates. |
| Agent 3 — Experience Designer | `/destination`, `/city_allocations`, `/experience_catalog`, `/candidates/skeletons` | Creates feasible-to-evaluate candidate structures only; may not rank, select, or publish them. |
| Agent 4 — Mobility & Logistics | `/evaluations/mobility` | Evaluates movement and schedule feasibility only. |
| Agent 5 — Cost Optimization | `/evaluations/cost` | Evaluates costs and substitutions only; may not select the final candidate. |
| Agent 6 — Local Intelligence | `/evaluations/local` | Adds local context and advisories only. |
| Agent 7 — Simulation & Risk | `/evaluations/simulation` | Evaluates fatigue, risk, and simulation outcomes only. |
| Agent 8 — Optimization | `/candidates/ranked`, `/candidates/active_candidate_id`, `/itinerary`, `/optimization` | Reads skeletons and evaluations; creates ranking and the selected itinerary. It never writes `/candidates/skeletons`. |
| Agent 9 — Narrative & Explanation | `/narrative` | Explains frozen structured results; may not change scores, ranking, cost, constraints, or itinerary structure. |
| Agent 10 — Continuous Replanning | `/replanning` | Describes impact and repair intent; the orchestrator decides when it becomes a new planning run or state transition. |

### Candidate ownership decision

Candidate ownership is deliberately split into two sibling namespaces:

- Agent 3 writes `/candidates/skeletons`. A skeleton is an unranked proposal containing candidate identity, intended places and experiences, and enough structure for downstream evaluation.
- Agents 4–7 write their evaluations under `/evaluations`; they do not rewrite the skeleton.
- Agent 8 reads the skeletons and evaluations and writes `/candidates/ranked`, `/candidates/active_candidate_id`, `/itinerary`, and `/optimization`.
- Agent 8 never writes `/candidates/skeletons`, and Agent 3 never writes `/candidates/ranked` or `/candidates/active_candidate_id`.

There is no ownership of the broad `/candidates` prefix. Only the explicit descendants above are writable.

## Orchestrator-only fields

Agents may not add, replace, remove, or test these paths:

| Path | Rule |
|---|---|
| `/schema_version` | Set by the orchestrator and immutable for the lifetime of a contract version. |
| `/trip` | Contains trip identity and timestamps; agents cannot change identity or timestamps. |
| `/status` | Changed only through an allowed lifecycle transition. |
| `/version` | Assigned only when the orchestrator creates a new immutable state version. |
| `/parent_version` | Set by the orchestrator to the immediately preceding version. |
| `/run` | Contains run identity, status, retry/failure metadata, and decision state. |
| `/events` | Appended only by the orchestrator after an accepted state or lifecycle action. |

An agent cannot use a patch to create a new root, replace the whole state, bypass validation, publish a version, or emit an event.

## Allowed lifecycle transitions

The orchestrator is the only actor allowed to change `status`. A transition is accepted only when its precondition is satisfied.

| Current status | Next status | Required condition |
|---|---|---|
| `draft` | `discovery_in_progress` | Discovery has started for the trip. |
| `discovery_in_progress` | `ready_to_plan` | Traveler Profile is normalized and no blocking discovery unknown remains. |
| `discovery_in_progress` | `failed` | Discovery cannot complete after the permitted retry policy or required input is invalid. |
| `ready_to_plan` | `planning` | The orchestrator has started a planning run. |
| `ready_to_plan` | `failed` | Planning cannot start because required input or infrastructure is unavailable. |
| `planning` | `awaiting_user_decision` | No acceptable plan satisfies the current hard constraints, and the system has a concrete decision or relaxation request. |
| `planning` | `planned` | At least one ranked candidate is valid, an active candidate is selected, and the Final Trip Plan is complete enough to present. |
| `planning` | `failed` | A terminal workflow or data failure remains after retries or safe degradation. |
| `awaiting_user_decision` | `planning` | The traveler supplied the requested decision or accepted a documented relaxation. |
| `awaiting_user_decision` | `failed` | The decision window is abandoned or the requested continuation cannot be executed. |
| `planned` | `planning` | The traveler requests replanning, an alternative, or a changed condition is accepted. |

### Invalid transitions

Every transition not listed above is invalid. In particular:

- `draft → planning` is invalid; discovery must establish the planning input first.
- `discovery_in_progress → planned` is invalid; planning and selection must occur.
- `ready_to_plan → planned` is invalid; a planning run must execute.
- `planned → ready_to_plan` is invalid; replanning starts from `planned` and preserves the existing plan as context.
- Any transition out of `failed` is invalid; a new run or trip must be created by a later workflow contract.
- A status value outside the enumerated set is invalid.

An attempted invalid transition changes neither state nor version and returns `INVALID_STATE_TRANSITION`.

## Patch operation rules

### Accepted operations

Agents may submit only `add`, `replace`, `remove`, and `test` operations. `move` and `copy` are prohibited because they can bypass ownership review. A patch must contain a JSON Pointer-style absolute path beginning with `/`.

For every operation:

1. The orchestrator authenticates the submitting agent identity through the workflow context.
2. The orchestrator checks the operation and path against the agent’s exact write-path prefixes.
3. The orchestrator rejects any operation touching an orchestrator-only path.
4. The orchestrator applies the complete batch to a working copy; no partial batch is committed.
5. The resulting state is validated for structural consistency and lifecycle preconditions.
6. Only then may the orchestrator persist a new version and emit success events.

An empty patch or a patch that produces no state change is acknowledged as a no-op. It creates no version and no state-change event.

### Rejection codes

| Code | Meaning | State effect |
|---|---|---|
| `PATCH_UNAUTHENTICATED_AGENT` | Agent identity is missing or not recognized. | No change. |
| `PATCH_INVALID_OPERATION` | Operation is missing required fields or uses a prohibited operation such as `move` or `copy`. | No change. |
| `PATCH_INVALID_PATH` | Path is malformed, targets a forbidden root, or uses an unsupported path form. | No change. |
| `PATCH_OWNERSHIP_VIOLATION` | Agent writes outside its owned path set or into another agent’s namespace. | No change. |
| `PATCH_ORCHESTRATOR_FIELD` | Agent targets a protected lifecycle, version, run, or event field. | No change. |
| `PATCH_TEST_FAILED` | A `test` operation does not match the working state. | No change. |
| `PATCH_CONFLICT` | The patch was based on a state version other than the current version. | No change. |
| `PATCH_VALIDATION_FAILED` | The complete proposed state violates a documented invariant. | No change. |
| `INVALID_STATE_TRANSITION` | The patch or command requests an unlisted status transition. | No change. |

The rejection response includes the code, agent identity, offending operation index when available, path when available, current state version, and a safe human-readable message. It must not include secrets or raw stack traces.

## Version invariants

- Published state versions are immutable.
- The first persisted state version is `1`; every later committed version increments by exactly one for that trip.
- `parent_version` on a new version equals the immediately preceding current version.
- A committed state-changing patch batch creates exactly one new version, even if it contains multiple operations.
- A rejected or no-op patch creates no version.
- Agents never assign or increment `version` or `parent_version`.
- A version is persisted only after the complete patch batch and any requested status transition pass validation.
- The user-facing Final Trip Plan is derived from the committed active state; it is not itself a patch target.

## Event invariants

Events are emitted only by the orchestrator. Agents return patches and results; they do not publish lifecycle events.

- A committed state-changing batch emits one `state.version_created` event after persistence.
- A successful lifecycle transition emits one `state.transitioned` event after the new version is persisted.
- If a transition and state mutation occur in one accepted command, both events reference the same new version and are emitted in that order.
- A rejected patch emits one `agent.patch_rejected` operational event with the current version; it never emits `state.version_created` or `state.transitioned`.
- A no-op patch emits no state-change event.
- Every event has a unique event ID, trip ID, event time, current version, and event type.
- Event emission is durable-or-retried: the orchestrator must not report a successful committed operation while silently losing its required event.
- Event consumers may observe an operational rejection event without a new state version.

## Failure handling

1. Retry only failures explicitly marked retryable by the owning workflow component.
2. Keep the last valid state version unchanged while a retry is in progress.
3. If retries are exhausted or a required invariant cannot be verified, the orchestrator transitions to `failed` when the current lifecycle allows it.
4. A failure transition is orchestrator-owned, creates a new version, and emits the corresponding transition/version events.
5. Agent failures identify the agent, safe error code, retryability, and affected stage in `/run`; agents still cannot write `/run` directly.
6. A failed patch is never partially applied, and a failed candidate evaluation is not silently treated as a successful evaluation.

## Implementation conformance checklist

An implementation conforms only if it can demonstrate:

- Agent 3 can write a candidate skeleton but receives `PATCH_OWNERSHIP_VIOLATION` for `/candidates/ranked`.
- Agent 8 can write ranked candidates but receives `PATCH_OWNERSHIP_VIOLATION` for `/candidates/skeletons`.
- Any agent receives `PATCH_ORCHESTRATOR_FIELD` for `/status`, `/version`, `/parent_version`, `/run`, or `/events`.
- Invalid transitions return `INVALID_STATE_TRANSITION` without creating a version.
- Accepted multi-operation patches are atomic and create one version.
- Rejected and no-op patches do not create versions.
- Successful commits cannot lose their required events.
