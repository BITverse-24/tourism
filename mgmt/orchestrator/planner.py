from __future__ import annotations

import re
from .models import CandidateTask, IssueState, ProjectState


def _field(issue: IssueState, label: str, default: str) -> str:
    return next((x.split(":", 1)[1] for x in issue.labels if x.startswith(label + ":")), default)


def _objective(body: str, title: str) -> str:
    match = re.search(r"^\s*## Objective\s*\n([\s\S]*?)(?=^\s*## |\Z)", body, re.I | re.M)
    return (match.group(1).strip() if match else title) or title


def plan(state: ProjectState) -> list[CandidateTask]:
    by_number = {x.number: x for x in state.issues}; candidates: list[CandidateTask] = []
    selected = state.newly_unblocked_issues + [x for x in state.ready_issues if x not in state.newly_unblocked_issues]
    for number in selected:
        issue = by_number[number]
        if issue.closed or number in state.blocked_issues: continue
        priority = _field(issue, "priority", "p2")
        workstream = _field(issue, "workstream", "product")
        issue_type = _field(issue, "type", "feature")
        deps = [d.target for d in issue.dependencies if d.kind == "depends_on" and d.valid]
        strategic = workstream == "product" or issue_type in {"architecture"}
        reason = "Newly unblocked by completed dependencies." if number in state.newly_unblocked_issues else "Ready issue relevant to the current milestone."
        candidates.append(CandidateTask(number, issue.title, _objective(issue.body, issue.title), workstream, issue_type, priority, _field(issue, "effort", "unknown"), deps, reason, strategic))
    return candidates
