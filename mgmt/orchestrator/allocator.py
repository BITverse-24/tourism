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
    members = team or default_team(); result = []; seen: set[tuple[int | None, str]] = set()
    for task in tasks:
        key = (task.issue_number, task.title.strip().casefold())
        if key in seen: continue
        seen.add(key)
        scored = []
        for person in members:
            load = state.estimated_workload.get(person.name, 0)
            skill = 1.0 if any(task.workstream.lower() in s.lower() or task.issue_type.lower() in s.lower() for s in person.skills + person.responsibilities) else 0.2
            workstream = 1.0 if task.workstream.lower() in person.role.lower() or task.workstream.lower() in " ".join(person.skills).lower() else 0.25
            availability = max(0.0, 1 - load / max(person.max_concurrent_tasks, 1))
            dependency_fit = 1.0 if not task.depends_on or task.issue_number in state.newly_unblocked_issues else 0.7
            strategic_alignment = 1.0 if not task.strategic or person.name == "Krishay" else 0.0
            score = (.35 * skill + .20 * workstream + .20 * availability + .15 * dependency_fit) / .90
            overload_penalty = .25 if load >= person.max_concurrent_tasks else 0.0
            if overload_penalty: score -= overload_penalty
            if task.strategic and not strategic_alignment: score -= .20
            scored.append((score, person, {"skill_match": skill, "workstream_match": workstream, "availability": availability, "dependency_fit": dependency_fit, "current_load": float(load), "overloaded": float(bool(overload_penalty)), "strategic_alignment": strategic_alignment}))
        score, person, breakdown = max(scored, key=lambda x: (x[0], x[1].name == "Krishay"))
        approval = task.strategic
        fit_score = round(max(0.0, min(score, 1.0)), 2)
        reason = task.reason + f" {person.name} matches the workstream with a deterministic fit score of {fit_score:.2f}."
        if breakdown["current_load"] >= 1:
            reason += f" Current active load: {int(breakdown['current_load'])}."
        if breakdown["overloaded"]:
            reason += " The member is at or above the recommended concurrent-task limit."
        if approval: reason += " This is strategic work and requires human approval."
        result.append(AssignmentRecommendation(task, person.name, reason, fit_score, None, approval, breakdown))
    return result
