from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

from .allocator import recommend
from .config import DEFAULT_FIXTURE, REPO
from .github import GitHubReadError, reader_from_args
from .planner import plan
from .state import build_state


def _args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Read-only GitHub project orchestrator",
        epilog="--live requires GITHUB_TOKEN in the environment; no GitHub writes are performed.",
    )
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--fixture", help="Offline JSON issue fixture")
    source.add_argument("--live", action="store_true", help="Read live GitHub state; never writes")
    parser.add_argument("--repository", default=REPO)
    parser.add_argument("--phase", default="MVP contract and architecture foundation")
    parser.add_argument("--milestone", default="MVP contract and integration foundation")
    parser.add_argument("--json", action="store_true", dest="as_json")
    return parser.parse_args()


def run(fixture: str | None = None, repository: str = REPO, phase: str = "MVP contract and integration foundation", milestone: str = "MVP contract and integration foundation", *, live: bool = False) -> dict:
    path = fixture or str(DEFAULT_FIXTURE)
    reader = reader_from_args(path if Path(path).exists() else None, repository, live=live)
    if live:
        reader.preflight()
    state = build_state(reader.issues(), phase, milestone)
    report = {"project_state": asdict(state), "recommended_tasks": [asdict(x) for x in recommend(plan(state), state)]}
    return report


def human(report: dict) -> str:
    state = report["project_state"]
    by_number = {issue["number"]: issue for issue in state["issues"]}
    lines = ["PROJECT STATE", "=============", f"Phase: {state['phase']}", f"Milestone: {state['milestone']}", f"Health: {state['health'].title()}", f"Open: {len(state['open_issues'])}  Closed: {len(state['closed_issues'])}"]
    lines += ["", "BLOCKERS", "========"]
    lines.extend([f"#{number} {by_number[number]['title']}" for number in state["blocked_issues"]] or ["None"])
    lines += ["", "IN-PROGRESS WORK", "================="]
    lines.extend([f"#{number} {by_number[number]['title']}" for number in state["in_progress_issues"]] or ["None"])
    lines += ["", "READY WORK", "=========="]
    lines.extend([f"#{number} {by_number[number]['title']}" for number in state["ready_issues"]] or ["None"])
    lines += ["", "NEWLY UNBLOCKED WORK", "===================="]
    lines.extend([f"#{number} {by_number[number]['title']}" for number in state["newly_unblocked_issues"]] or ["None"])
    lines += ["", "RECOMMENDED TASKS", "================="]
    for index, item in enumerate(report["recommended_tasks"], 1):
        issue_number = item["task"]["issue_number"]
        title = f"#{issue_number} {item['task']['title']}" if issue_number else item["task"]["title"]
        confidence = "Unknown" if item["confidence"] is None else f"{item['confidence']:.0%}"
        lines += [f"{index}. {title}", f"Assignee recommendation: {item['recommended_assignee'] or 'None'}", f"Fit score: {item['fit_score']:.2f}", f"Confidence: {confidence}", f"Priority: {item['task']['priority']}", "", "ASSIGNMENT RATIONALE", item["reason"], f"Requires human approval: {'Yes' if item['requires_human_approval'] else 'No'}", ""]
    lines += ["RISKS", "=====", *(state["project_risks"] or ["None"]), "", "HUMAN APPROVAL REQUIRED", "========================"]
    approvals = [item for item in report["recommended_tasks"] if item["requires_human_approval"]]
    lines.extend([f"#{item['task']['issue_number']} {item['task']['title']}" for item in approvals] or ["None"])
    return "\n".join(lines).rstrip()


def main() -> None:
    args = _args()
    try:
        report = run(args.fixture, args.repository, args.phase, args.milestone, live=args.live)
    except GitHubReadError as exc:
        print(f"LIVE GITHUB ERROR [{exc.category}]: {exc}", file=sys.stderr)
        raise SystemExit(2)
    print(json.dumps(report, indent=2, sort_keys=True) if args.as_json else human(report))


if __name__ == "__main__":
    main()
