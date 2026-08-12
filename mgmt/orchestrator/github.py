from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from .models import IssueState


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


class FixtureGitHubReader(GitHubReader):
    def __init__(self, path: str | Path):
        self.path = Path(path)

    def _data(self) -> dict[str, Any]:
        return json.loads(self.path.read_text(encoding="utf-8"))

    def issues(self) -> list[IssueState]:
        return [_issue(x) for x in self._data().get("issues", [])]

    def labels(self) -> list[str]:
        return self._data().get("labels", [])


class GitHubApiReader(GitHubReader):
    def __init__(self, repository: str, token: str | None = None):
        self.repository, self.token = repository, token or os.getenv("GITHUB_TOKEN")

    def _get(self, path: str) -> Any:
        request = urllib.request.Request(
            f"https://api.github.com{path}",
            headers={"Accept": "application/vnd.github+json", **({"Authorization": f"Bearer {self.token}"} if self.token else {})},
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            raise RuntimeError(f"GitHub read failed ({exc.code}) for {path}") from exc

    def issues(self) -> list[IssueState]:
        raw = self._get(f"/repos/{self.repository}/issues?state=all&per_page=100")
        return [_issue(x) for x in raw if "pull_request" not in x]

    def labels(self) -> list[str]:
        return [x["name"] for x in self._get(f"/repos/{self.repository}/labels?per_page=100")]


def reader_from_args(fixture: str | None, repository: str) -> GitHubReader:
    if fixture:
        return FixtureGitHubReader(fixture)
    return GitHubApiReader(repository)
