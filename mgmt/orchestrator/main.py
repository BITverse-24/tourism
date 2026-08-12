from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from pathlib import Path

from .allocator import recommend
from .config import DEFAULT_FIXTURE, REPO
from .github import reader_from_args
from .planner import plan
from .state import build_state


def _args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Read-only GitHub project orchestrator")
    parser.add_argument("--fixture", help="Offline JSON issue fixture")
    parser.add_argument("--repository", default=REPO)
    parser.add_argument("--phase", default="MVP contract and architecture foundation")
    parser.add_argument("--milestone", default="Canonical workflow and TripState foundation")
    parser.add_argument("--json", action="store_true", dest="as_json")
    return parser.parse_args()


def run(fixture: str | None = None, repository: str = REPO, phase: str = "MVP contract and architecture foundation", milestone: str = "Canonical workflow and TripState foundation") -> dict:
    path = fixture or str(DEFAULT_FIXTURE)
    reader = reader_from_args(path if Path(path).exists() else None, repository)
    state = build_state(reader.issues(), phase, milestone)
    report = {"project_state": asdict(state), "recommended_tasks": [asdict(x) for x in recommend(plan(state), state)]}
    return report


def human(report: dict) -> str:
    state = report["project_state"]
    lines = ["PROJECT STATE", "=============", f"Phase: {state['phase']}", f"Health: {state['health'].title()}", f"Open: {len(state['open_issues'])}  Closed: {len(state['closed_issues'])}", "", "CRITICAL BLOCKERS", "================="]
    lines.extend(state["project_risks"] or ["None"])
    lines += ["", "RECOMMENDED TASKS", "================="]
    for index, item in enumerate(report["recommended_tasks"], 1):
        lines += [f"{index}. {item['task']['title']}", f"Assignee: {item['recommended_assignee']}", f"Priority: {item['task']['priority']}", f"Reason: {item['reason']}", f"Confidence: {item['confidence']:.0%}", f"Human approval: {'Yes' if item['requires_human_approval'] else 'No'}", ""]
    return "\n".join(lines).rstrip()


def main() -> None:
    args = _args(); report = run(args.fixture, args.repository, args.phase, args.milestone)
    print(json.dumps(report, indent=2, sort_keys=True) if args.as_json else human(report))


if __name__ == "__main__":
    main()
