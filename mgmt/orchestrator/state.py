from __future__ import annotations

import re
from collections import defaultdict
from typing import Iterable

from .models import Dependency, IssueState, ProjectState

REF = re.compile(r"#(\d+)")
SECTION = re.compile(r"^\s*(Depends on|Blocks):\s*$", re.I | re.M)


def _refs(body: str, heading: str) -> list[int]:
    match = re.search(rf"^\s*{heading}:\s*$([\s\S]*?)(?=^\s*(?:Depends on|Blocks):\s*$|\Z)", body, re.I | re.M)
    if not match:
        return []
    return [int(x) for x in REF.findall(match.group(1))]


def parse_dependencies(issue: IssueState, known: set[int]) -> tuple[list[Dependency], list[str]]:
    dependencies: list[Dependency] = []
    errors: list[str] = []
    for number in _refs(issue.body, "Depends on"):
        valid = number in known
        error = None if valid else f"Issue #{issue.number} depends on missing issue #{number}"
        dependencies.append(Dependency(issue.number, number, "depends_on", valid, error))
        if error: errors.append(error)
    for number in _refs(issue.body, "Blocks"):
        valid = number in known
        error = None if valid else f"Issue #{issue.number} blocks missing issue #{number}"
        dependencies.append(Dependency(issue.number, number, "blocks", valid, error))
        if error: errors.append(error)
    return dependencies, errors


def _cycles(graph: dict[int, set[int]]) -> list[list[int]]:
    found: list[list[int]] = []
    path: list[int] = []
    visiting: set[int] = set()
    done: set[int] = set()

    def visit(node: int) -> None:
        if node in visiting:
            cycle = path[path.index(node):] + [node]
            if cycle not in found: found.append(cycle)
            return
        if node in done: return
        visiting.add(node); path.append(node)
        for child in sorted(graph.get(node, ())): visit(child)
        path.pop(); visiting.remove(node); done.add(node)

    for node in sorted(graph): visit(node)
    return found


def build_state(issues: Iterable[IssueState], phase: str, milestone: str) -> ProjectState:
    items = list(issues); known = {x.number for x in items}; by_number = {x.number: x for x in items}
    invalid: list[str] = []; graph: dict[int, set[int]] = defaultdict(set)
    previous_closed = {x.number for x in items if x.closed}
    for issue in items:
        issue.dependencies, errors = parse_dependencies(issue, known); invalid.extend(errors)
        for dep in issue.dependencies:
            if dep.valid:
                target = dep.target
                if dep.kind == "depends_on": graph[issue.number].add(target)
                else: graph[target].add(issue.number)
    cycles = _cycles(graph)
    blocked: list[int] = []; ready: list[int] = []; newly: list[int] = []
    for issue in items:
        if issue.closed: continue
        deps = [d.target for d in issue.dependencies if d.kind == "depends_on" and d.valid]
        unresolved = [d for d in issue.dependencies if d.kind == "depends_on" and (not d.valid or not by_number[d.target].closed)]
        if unresolved or any(issue.number in cycle for cycle in cycles): blocked.append(issue.number)
        elif issue.status in {"ready", "in-progress"} or not deps:
            ready.append(issue.number)
            if deps and all(by_number[d].closed for d in deps): newly.append(issue.number)
    active: dict[str, list[int]] = defaultdict(list)
    for issue in items:
        if not issue.closed and issue.status == "in-progress":
            for person in issue.assignees: active[person].append(issue.number)
    workload = {person: len(numbers) for person, numbers in active.items()}
    risks = list(invalid)
    if cycles: risks.extend("Dependency cycle: " + " → ".join(f"#{x}" for x in cycle) for cycle in cycles)
    if blocked: risks.append(f"{len(blocked)} open issue(s) are blocked")
    health = "red" if cycles or any("missing" in x for x in invalid) else ("yellow" if blocked else "green")
    return ProjectState(phase, milestone, health, items, [x.number for x in items if not x.closed], [x.number for x in items if x.closed], [x.number for x in items if not x.closed and x.status == "in-progress"], blocked, ready, newly, invalid, cycles, dict(active), workload, risks, [])
