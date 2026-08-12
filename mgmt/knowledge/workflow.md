# Orchestration workflow

GitHub Issues are the only project-management primitive. GitHub Projects are not used.

## Issue lifecycle

Use `status:backlog`, `status:ready`, `status:in-progress`, `status:blocked`, and `status:review`. Do not create `status:done`; GitHub's closed state means completion.

## Dependencies

Issues declare dependencies in their body under `Depends on:` and `Blocks:`. Explicit declarations are authoritative. Missing, malformed, nonexistent, and cyclic references are surfaced as risks. A closed dependency unlocks downstream work only when all declared dependencies are closed.

## Recommendations

The tool is recommendation-only. It reads issues, labels, assignees, comments, and pull requests where available. It never creates, edits, assigns, labels, comments on, closes, or reopens GitHub issues.

## Planning rules

Recommend only work relevant to the current project phase and milestone. Prefer ready and newly unblocked issues, then clearly specified backlog issues. Do not invent strategic scope. Flag ambiguous or stale issues for human review.

## Allocation rules

Score skill match (35%), workstream match (20%), availability (20%), dependency fit (15%), and historical success (10% when data exists). Penalize overload, role mismatch, strategic decisions, and work outside declared responsibilities. Strategic/product decisions recommend Krishay with `requires_human_approval: true`.
