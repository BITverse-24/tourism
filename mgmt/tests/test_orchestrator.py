import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from orchestrator.github import FixtureGitHubReader
from orchestrator.main import run
from orchestrator.state import build_state


def test_fixture_state_classifies_dependencies():
    issues = FixtureGitHubReader(ROOT / "fixtures" / "issues.json").issues()
    state = build_state(issues, "test", "test")
    assert 18 in state.newly_unblocked_issues
    assert 20 in state.blocked_issues
    assert state.invalid_references == ["Issue #20 depends on missing issue #999"]
    assert [21, 22, 21] in state.dependency_cycles


def test_report_recommends_strategic_human_approval():
    report = run(str(ROOT / "fixtures" / "issues.json"))
    recommendations = {x["task"]["issue_number"]: x for x in report["recommended_tasks"]}
    assert recommendations[19]["recommended_assignee"] == "Krishay"
    assert recommendations[19]["requires_human_approval"] is True
    assert recommendations[18]["recommended_assignee"] == "Supreet"


def test_report_is_json_serializable():
    json.dumps(run(str(ROOT / "fixtures" / "issues.json")))
