from __future__ import annotations

from .models import AssignmentRecommendation, CandidateTask, ProjectState, TeamMember


def default_team() -> list[TeamMember]:
    return [
        TeamMember("Krishay", None, "architecture and orchestration", ["architecture", "orchestration", "optimization", "integration"], ["architecture", "orchestration", "optimization", "integration"], ["strategic", "integration"], ["routine frontend", "database CRUD"], 2, True),
        TeamMember("Ayush", None, "frontend", ["frontend", "UX", "visualization"], ["frontend", "UX", "state visualization"], ["UI", "visualization"], ["agent logic", "backend"], 3),
        TeamMember("Supreet", None, "backend and APIs", ["backend", "API", "database", "infra"], ["backend", "API", "database", "infrastructure"], ["backend", "integration"], ["UI", "ML"], 3),
        TeamMember("Siddhant", None, "AI/ML", ["AI", "ML", "simulation", "agents"], ["AI", "ML", "simulation", "agent intelligence"], ["agent", "evaluation"], ["frontend", "database"], 2),
        TeamMember("Aishwarya", None, "data", ["data", "research", "pipeline"], ["data", "knowledge base", "pipeline", "validation"], ["curation", "evaluation"], ["UI", "infrastructure"], 3),
        TeamMember("Zainab", None, "research and QA", ["research", "API", "QA", "documentation"], ["research", "provider evaluation", "API", "QA", "documentation"], ["research", "feasibility", "QA"], ["strategic product decisions"], 3),
    ]


def recommend(tasks: list[CandidateTask], state: ProjectState, team: list[TeamMember] | None = None) -> list[AssignmentRecommendation]:
    members = team or default_team(); result = []
    for task in tasks:
        scored = []
        for person in members:
            load = state.estimated_workload.get(person.name, 0)
            skill = 1.0 if any(task.workstream.lower() in s.lower() or task.issue_type.lower() in s.lower() for s in person.skills + person.responsibilities) else 0.2
            workstream = 1.0 if task.workstream.lower() in person.role.lower() or task.workstream.lower() in " ".join(person.skills).lower() else 0.25
            availability = max(0.0, 1 - load / max(person.max_concurrent_tasks, 1))
            dependency_fit = 1.0 if not task.depends_on or task.issue_number in state.newly_unblocked_issues else 0.7
            strategic = 0.0 if task.strategic and person.name != "Krishay" else 1.0
            score = .35 * skill + .20 * workstream + .20 * availability + .15 * dependency_fit + .10 * strategic
            if load >= person.max_concurrent_tasks: score -= .25
            scored.append((score, person, {"skill_match": skill, "workstream_match": workstream, "availability": availability, "dependency_fit": dependency_fit, "historical_success": strategic}))
        score, person, breakdown = max(scored, key=lambda x: (x[0], x[1].name == "Krishay"))
        approval = task.strategic
        reason = task.reason + f" {person.name} matches the workstream and has a deterministic fit score of {score:.2f}."
        if approval: reason += " This is strategic work and requires human approval."
        result.append(AssignmentRecommendation(task, person.name, reason, round(max(0.0, min(score, 1.0)), 2), approval, breakdown))
    return result
