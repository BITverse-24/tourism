import json
import io
import os
import sys
import urllib.error
from email.message import Message
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from orchestrator.github import GitHubApiReader, GitHubReadError, FixtureGitHubReader
from orchestrator.main import run
from orchestrator.allocator import recommend
from orchestrator.models import CandidateTask, IssueState, TeamMember
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
    assert recommendations[19]["fit_score"] != recommendations[19]["confidence"]
    assert recommendations[19]["confidence"] is None


def test_report_is_json_serializable():
    json.dumps(run(str(ROOT / "fixtures" / "issues.json")))


def test_unknown_team_member_is_a_risk():
    issue = IssueState(1, "Unknown work", labels=["status:in-progress"], assignees=["MysteryPerson"])
    state = build_state([issue], "test", "test")
    assert state.unknown_team_members == ["MysteryPerson"]
    assert "Unknown team member" in state.project_risks[0]


def test_overloaded_member_loses_to_available_member():
    active = IssueState(1, "Existing", labels=["status:in-progress"], assignees=["Busy"])
    state = build_state([active], "test", "test")
    busy = TeamMember("Busy", None, "backend", ["backend"], ["backend"], [], [], 1)
    available = TeamMember("Available", None, "backend", ["backend"], ["backend"], [], [], 2)
    task = CandidateTask(2, "New backend task", "Build it", "backend", "feature", "p1", "s")
    recommendation = recommend([task], state, [busy, available])[0]
    assert recommendation.recommended_assignee == "Available"
    assert recommendation.score_breakdown["overloaded"] == 0.0


def test_duplicate_recommendations_are_removed():
    state = build_state([], "test", "test")
    task = CandidateTask(2, "Same task", "Build it", "backend", "feature", "p1", "s")
    assert len(recommend([task, task], state)) == 1


class FakeResponse:
    def __init__(self, payload):
        self._body = io.BytesIO(json.dumps(payload).encode())

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, *args):
        return self._body.read(*args)


def http_error(code, headers=None):
    message = Message()
    for key, value in (headers or {}).items():
        message[key] = value
    return urllib.error.HTTPError("https://api.github.com/test", code, "failure", message, None)


def test_missing_token_fails_before_request():
    with patch.dict(os.environ, {}, clear=True), patch("orchestrator.github.urllib.request.urlopen") as urlopen:
        try:
            GitHubApiReader("SinisterDeveloper/tourism").preflight()
        except GitHubReadError as error:
            assert error.category == "configuration"
            assert "GITHUB_TOKEN is not configured" in str(error)
        else:
            raise AssertionError("missing token did not fail")
        urlopen.assert_not_called()


def test_token_loaded_and_authorization_headers_are_generated():
    token = "test-token-value"
    requests = []

    def urlopen(request, timeout):
        requests.append(request)
        return FakeResponse({"login": "tester"})

    with patch.dict(os.environ, {"GITHUB_TOKEN": token}), patch("orchestrator.github.urllib.request.urlopen", side_effect=urlopen):
        reader = GitHubApiReader("SinisterDeveloper/tourism")
        reader._get("/user")
    assert reader.token == token
    assert requests[0].headers["Authorization"] == f"Bearer {token}"
    assert requests[0].headers["Accept"] == "application/vnd.github+json"
    assert requests[0].headers["X-github-api-version"] == "2022-11-28"


def test_token_never_appears_in_error_output():
    token = "super-secret-token"
    with patch("orchestrator.github.urllib.request.urlopen", side_effect=urllib.error.URLError(token)):
        try:
            GitHubApiReader("SinisterDeveloper/tourism", token=token)._get("/user")
        except GitHubReadError as error:
            assert token not in str(error)
        else:
            raise AssertionError("network failure did not fail")


def test_http_error_classification():
    cases = [(401, {}, "authentication"), (403, {}, "forbidden"), (403, {"X-RateLimit-Remaining": "0"}, "rate_limit"), (404, {}, "not_found")]
    for code, headers, category in cases:
        with patch("orchestrator.github.urllib.request.urlopen", side_effect=http_error(code, headers)):
            try:
                GitHubApiReader("SinisterDeveloper/tourism", token="token")._get("/test")
            except GitHubReadError as error:
                assert error.category == category
            else:
                raise AssertionError(f"HTTP {code} did not fail")


def test_successful_authenticated_repository_and_issue_requests():
    token = "token"
    seen_paths = []

    def urlopen(request, timeout):
        path = request.full_url.removeprefix("https://api.github.com")
        seen_paths.append(path)
        if path == "/user": return FakeResponse({"login": "tester"})
        if path == "/repos/SinisterDeveloper/tourism": return FakeResponse({"full_name": "SinisterDeveloper/tourism"})
        if path == "/repos/SinisterDeveloper/tourism/issues/7": return FakeResponse({"number": 7, "title": "Test issue", "state": "open"})
        if path == "/repos/SinisterDeveloper/tourism/issues?state=all&per_page=100": return FakeResponse([{"number": 7, "title": "Test issue", "state": "open"}])
        raise AssertionError(path)

    reader = GitHubApiReader("SinisterDeveloper/tourism", token=token)
    with patch("orchestrator.github.urllib.request.urlopen", side_effect=urlopen):
        reader.preflight()
        assert reader.issue(7).number == 7
        assert reader.issues()[0].number == 7
    assert seen_paths == ["/user", "/repos/SinisterDeveloper/tourism", "/repos/SinisterDeveloper/tourism/issues/7", "/repos/SinisterDeveloper/tourism/issues?state=all&per_page=100"]
