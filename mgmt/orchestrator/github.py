from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from .models import IssueState


class GitHubReadError(RuntimeError):
    """A classified, read-only GitHub failure."""

    def __init__(self, category: str, message: str, *, path: str | None = None):
        self.category = category
        self.path = path
        super().__init__(message)


def _redact(value: object, secret: str | None) -> str:
    text = str(value)
    return text.replace(secret, "[REDACTED]") if secret else text


def _issue(raw: dict[str, Any]) -> IssueState:
    labels = [x.get("name", x) if isinstance(x, dict) else x for x in raw.get("labels", [])]
    assignees = [x.get("login", x) if isinstance(x, dict) else x for x in raw.get("assignees", [])]
    return IssueState(
        number=int(raw["number"]), title=raw.get("title", ""), body=raw.get("body", "") or "",
        state=raw.get("state", "open"), labels=labels, assignees=assignees,
        comments=[x.get("body", "") if isinstance(x, dict) else str(x) for x in raw.get("comments", [])],
        pull_requests=raw.get("pull_requests", []), updated_at=raw.get("updated_at"),
    )


class GitHubReader:
    """Read-only source interface. No mutation methods intentionally exist."""

    def issues(self) -> list[IssueState]:
        raise NotImplementedError

    def labels(self) -> list[str]:
        return []

    def issue(self, number: int) -> IssueState:
        raise NotImplementedError

    def repository_metadata(self) -> dict[str, Any]:
        raise NotImplementedError

    def preflight(self) -> None:
        """Validate the source before analysis. Fixtures need no preflight."""


class FixtureGitHubReader(GitHubReader):
    def __init__(self, path: str | Path):
        self.path = Path(path)

    def _data(self) -> dict[str, Any]:
        return json.loads(self.path.read_text(encoding="utf-8"))

    def issues(self) -> list[IssueState]:
        return [_issue(x) for x in self._data().get("issues", [])]

    def labels(self) -> list[str]:
        return self._data().get("labels", [])

    def issue(self, number: int) -> IssueState:
        for issue in self.issues():
            if issue.number == number:
                return issue
        raise GitHubReadError("not_found", f"Fixture issue #{number} was not found")

    def repository_metadata(self) -> dict[str, Any]:
        return self._data().get("repository", {})


class GitHubApiReader(GitHubReader):
    def __init__(self, repository: str, token: str | None = None):
        self.repository, self.token = repository, token or os.getenv("GITHUB_TOKEN")

    def _require_token(self) -> str:
        if not self.token:
            raise GitHubReadError(
                "configuration",
                "GITHUB_TOKEN is not configured. Set it before running live analysis: export GITHUB_TOKEN=\"...\"",
            )
        return self.token

    def preflight(self) -> None:
        self._get("/user")
        self.repository_metadata()

    def _get(self, path: str) -> Any:
        token = self._require_token()
        request = urllib.request.Request(
            f"https://api.github.com{path}",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                try:
                    payload = json.load(response)
                except (json.JSONDecodeError, UnicodeDecodeError) as exc:
                    raise GitHubReadError("malformed_response", f"GitHub returned malformed JSON for {path}", path=path) from exc
                if not isinstance(payload, (dict, list)):
                    raise GitHubReadError("malformed_response", f"GitHub returned an unexpected response shape for {path}", path=path)
                return payload
        except urllib.error.HTTPError as exc:
            if exc.code == 401:
                category = "authentication"
            elif exc.code == 404:
                category = "not_found"
            elif exc.code == 403 and exc.headers.get("X-RateLimit-Remaining") == "0":
                category = "rate_limit"
            elif exc.code == 403:
                category = "forbidden"
            else:
                category = "http"
            raise GitHubReadError(category, f"GitHub read failed ({exc.code}) for {path}", path=path) from exc
        except urllib.error.URLError as exc:
            reason = exc.reason
            if isinstance(reason, OSError) and getattr(reason, "errno", None) in {8, -2}:
                category = "network_dns"
                detail = "DNS/name resolution failed"
            else:
                category = "network"
                detail = "network connection failed"
            raise GitHubReadError(category, f"{detail} while reading GitHub ({path}): {_redact(reason, token)}", path=path) from exc
        except TimeoutError as exc:
            raise GitHubReadError("network", f"GitHub request timed out for {path}", path=path) from exc

    def issues(self) -> list[IssueState]:
        raw = self._get(f"/repos/{self.repository}/issues?state=all&per_page=100")
        if not isinstance(raw, list) or any(not isinstance(x, dict) for x in raw):
            raise GitHubReadError("malformed_response", "GitHub issues response was not a list of objects")
        return [_issue(x) for x in raw if "pull_request" not in x]

    def labels(self) -> list[str]:
        raw = self._get(f"/repos/{self.repository}/labels?per_page=100")
        if not isinstance(raw, list) or any(not isinstance(x, dict) or "name" not in x for x in raw):
            raise GitHubReadError("malformed_response", "GitHub labels response was not a list of named objects")
        return [x["name"] for x in raw]

    def issue(self, number: int) -> IssueState:
        raw = self._get(f"/repos/{self.repository}/issues/{number}")
        if not isinstance(raw, dict) or "number" not in raw:
            raise GitHubReadError("malformed_response", "GitHub issue response was not an issue object")
        return _issue(raw)

    def issue_comments(self, number: int) -> list[str]:
        raw = self._get(f"/repos/{self.repository}/issues/{number}/comments?per_page=100")
        if not isinstance(raw, list) or any(not isinstance(x, dict) or "body" not in x for x in raw):
            raise GitHubReadError("malformed_response", "GitHub comments response was not a list of comment objects")
        return [x["body"] for x in raw]

    def repository_metadata(self) -> dict[str, Any]:
        raw = self._get(f"/repos/{self.repository}")
        if not isinstance(raw, dict) or "full_name" not in raw:
            raise GitHubReadError("malformed_response", "GitHub repository response was not a repository object")
        return raw


def reader_from_args(fixture: str | None, repository: str, *, live: bool = False) -> GitHubReader:
    if fixture and not live:
        return FixtureGitHubReader(fixture)
    return GitHubApiReader(repository)
