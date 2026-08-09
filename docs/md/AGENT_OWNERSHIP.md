# Agent Patch Ownership & Mutation Contract

- **Contract Version:** `1.0.0`
- **Format:** JSON Pointer path prefixes (wildcard array members indicated by `*`)
- **Machine-Readable Source:** [`docs/json/agent-ownership.json`](file:///Users/krishay/projects/tourism/docs/json/agent-ownership.json)

---

## 🛡️ Core Security & Isolation Principles

To prevent race conditions, unauthorized mutations, and silent cross-agent corruption, **state updates are strictly modularized**:

1. **JSON Patch Mechanism**: Agents emit `AgentPatch` arrays containing operations (`add`, `replace`, `remove`, `test`) targeting explicit `TripState` paths.
2. **Strict Pointer Allow-Listing**: An agent operation is evaluated against its allowed JSON Pointer prefixes. Any attempt to mutate a path outside the caller's allowed set triggers a `PATCH_OWNERSHIP_VIOLATION` error and is rejected by the orchestrator.
3. **Orchestrator Sole Authority**: Only the Orchestrator can change system-wide state like `/status`, `/version`, `/parent_version`, `/trip/updated_at`, or emit events into `/events`.

---

## 📊 Agent Ownership Matrix

| Agent ID | Agent Name | Allowed JSON Pointer Paths | Responsibility Scope |
|---|---|---|---|
| **1** | **Discovery** | `/traveler_profile`<br>`/run/unanswered_questions` | Populates profile attributes, tracks missing traveler answers. |
| **2** | **Constraints & Preference** | `/constraints`<br>`/run/constraint_report` | Defines hard boundaries, soft weights, reports constraint issues. |
| **3** | **Experience Designer** | `/destination`<br>`/cities`<br>`/experience_catalog`<br>`/candidates` | Resolves destination, allocates city nights, populates catalog and candidate skeletons. |
| **4** | **Mobility & Logistics** | `/candidates/*/mobility`<br>`/candidates/*/hard_constraint_failures` | Evaluates transit times, transfers, and route opening-hours hard gates. |
| **5** | **Cost Optimization** | `/candidates/*/cost`<br>`/candidates/*/total_cost`<br>`/candidates/*/tradeoffs` | Calculates itemized candidate costs, budget penalties, and cost tradeoffs. |
| **6** | **Local Intelligence** | `/candidates/*/local_advice`<br>`/warnings` | Appends local advisories, weather warnings, and neighborhood tips. |
| **7** | **Simulation & Risk** | `/candidates/*/simulation`<br>`/simulation`<br>`/warnings` | Simulates traveler pace, physical exertion, fatigue risk, and environmental warnings. |
| **8** | **Optimization** | `/candidates`<br>`/active_candidate_id`<br>`/itinerary`<br>`/optimization`<br>`/run/relaxation_options` | Ranks candidate itineraries (up to 3), selects active candidate, builds final timetable, generates relaxation options. |
| **9** | **Narrative & Explanation** | `/narrative` | Writes human-readable summaries and decision explanations from frozen structured data. |
| **10** | **Continuous Replanning** | `/run`<br>`/warnings` | Evaluates disruption impact, initiates replanning runs, and sets up repair branches. |
| **Orchestrator** | **System Orchestrator** | `/status`<br>`/version`<br>`/parent_version`<br>`/trip/updated_at`<br>`/events` | Maintains version lineage, updates run/trip lifecycle status, appends public events. |

---

## 🚫 Explicit Negative Guardrails

- ❌ **Agent 9 (Narrative)** is **explicitly forbidden** from altering candidate ranking, total cost, score components, or itinerary timetables. It may only write to `/narrative`.
- ❌ **No Parallel Mutation of Candidates**: Agents 4, 5, 6, and 7 evaluate candidate skeletons in parallel, but write **only to their respective sub-namespaces** under `/candidates/*/...`.
- ❌ **No Direct Version Bumping**: No agent can modify `/version` or `/status`. All version publications are handled by the Workflow Orchestrator after full schema validation.
