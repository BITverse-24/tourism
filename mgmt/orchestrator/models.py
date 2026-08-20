from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal


@dataclass(frozen=True)
class Dependency:
    source: int
    target: int
    kind: Literal["depends_on", "blocks"]
    valid: bool = True
    error: str | None = None


@dataclass
class IssueState:
    number: int
    title: str
    body: str = ""
    state: str = "open"
    labels: list[str] = field(default_factory=list)
    assignees: list[str] = field(default_factory=list)
    comments: list[str] = field(default_factory=list)
    pull_requests: list[dict[str, Any]] = field(default_factory=list)
    updated_at: str | None = None
    dependencies: list[Dependency] = field(default_factory=list)
    effort: str | None = None
    workstream: str | None = None
    issue_type: str | None = None
    priority: str | None = None

    @property
    def closed(self) -> bool:
        return self.state.lower() == "closed"

    @property
    def status(self) -> str:
        return next((x.split(":", 1)[1] for x in self.labels if x.startswith("status:")), "backlog")


@dataclass
class TeamMember:
    name: str
    github_username: str | None
    role: str
    responsibilities: list[str]
    skills: list[str]
    preferred_work: list[str]
    work_to_avoid: list[str]
    max_concurrent_tasks: int = 2
    requires_strategic_approval: bool = False


@dataclass
class CandidateTask:
    issue_number: int | None
    title: str
    objective: str
    workstream: str
    issue_type: str
    priority: str
    effort: str
    depends_on: list[int] = field(default_factory=list)
    reason: str = ""
    strategic: bool = False


@dataclass
class AssignmentRecommendation:
    task: CandidateTask
    recommended_assignee: str | None
    reason: str
    fit_score: float
    confidence: float | None
    requires_human_approval: bool = False
    score_breakdown: dict[str, float] = field(default_factory=dict)


@dataclass
class ProjectState:
    phase: str
    milestone: str
    health: str
    issues: list[IssueState]
    open_issues: list[int]
    closed_issues: list[int]
    in_progress_issues: list[int]
    blocked_issues: list[int]
    ready_issues: list[int]
    newly_unblocked_issues: list[int]
    invalid_references: list[str]
    dependency_cycles: list[list[int]]
    active_work_by_person: dict[str, list[int]]
    estimated_workload: dict[str, int]
    project_risks: list[str]
    unresolved_decisions: list[str]
    unknown_team_members: list[str] = field(default_factory=list)


@dataclass
class OrchestratorReport:
    project_state: ProjectState
    recommended_tasks: list[AssignmentRecommendation]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
