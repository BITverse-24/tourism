# Orchestration workflow

**Sources:** [`mgmt/README.md`](../README.md), [`README.md`](../../README.md), [`TEAM.md`](../../TEAM.md), [`docs/SYSTEM_CONTRACT.md`](../../docs/SYSTEM_CONTRACT.md).

## Project-management primitive

GitHub Issues are the only project-management primitive. Do not use GitHub Projects. The management orchestrator is recommendation-only and must not create, edit, assign, label, comment on, close, or reopen GitHub issues.

## Issue taxonomy

### Status

Use `status:backlog`, `status:ready`, `status:in-progress`, `status:blocked`, and `status:review`. Do not create `status:done`; a closed GitHub issue represents completion.

### Priority

Use `priority:p0` through `priority:p3`.

### Workstream

Use `workstream:product`, `frontend`, `backend`, `ai`, `api`, `research`, or `infra`.

### Type

Use `type:feature`, `bug`, `research`, `integration`, `architecture`, or `documentation`.

Unrelated existing labels must not be deleted or duplicated.

## Required issue format

Every task, research, and bug issue should include:

```markdown
## Objective
## Context
## Expected Output
## Dependencies

Depends on:
- #issue or None

Blocks:
- #issue or None

## Acceptance Criteria
## Definition of Done
## Agent Metadata

Workstream:
Type:
Priority:
Effort:
```

## Dependency graph

Dependencies are explicit declarations under `Depends on:` and `Blocks:`. Do not infer them solely from issue titles. The parser must identify:

- blocked issues and unresolved dependencies;
- actionable issues whose dependencies are all closed;
- closed issues that newly unlock downstream work;
- invalid, missing, or malformed references;
- contradictory dependency declarations;
- dependency cycles.

Explicit declarations have higher priority than any future LLM suggestion. The orchestrator may recommend a missing dependency, but cannot modify the issue.

## State report

The normalized project state includes current phase, open/closed/in-progress/blocked/ready issues, dependency graph, newly unblocked issues, active work by person, estimated workload, risks, and unresolved decisions.

The human report must show current phase, health, critical blockers, active work, blocked work, completed work, newly unblocked work, recommended tasks, assignees, reasons, confidence, and human-approval requirements. JSON is the internal/reporting contract.

## Planning rules

- Recommend work relevant to the current milestone and the product’s three MVP capabilities.
- Prefer newly unblocked and ready work, then clearly specified backlog work.
- Identify missing milestone tasks only when supported by repository contracts or an explicit gap.
- Flag stale, ambiguous, invalid, or strategic work instead of silently resolving it.
- Never invent team skills, product requirements, architecture, APIs, or scope.

## Allocation rules

Use deterministic scoring where possible:

- skill match: 35%
- workstream match: 20%
- availability: 20%
- dependency fit: 15%
- historical success: 10%, omitted and renormalized when unavailable

Penalize overloaded members, role mismatch, work outside declared responsibilities, and strategic/product decisions assigned without approval. Strategic decisions should recommend Krishay and set `requires_human_approval: true`; recommendation is not automatic assignment.

## Product workflow awareness

The management planner should understand the product’s delivery dependencies:

```text
Discovery → Constraints → Destination/Country planning → City allocation
→ Experience Design → Mobility + Cost + Local Intelligence
→ Candidate Itinerary → Simulation & Risk → Optimization
→ Narrative & Explanation → Final Personalized Itinerary
```

For replanning:

```text
Final Itinerary → New Condition → Affected Activities → Alternatives
→ Mobility/Cost → Simulation → Optimization → Updated Itinerary
```

This informs task relevance only; it does not cause the management tool to execute product agents.
