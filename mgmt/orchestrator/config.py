from __future__ import annotations

import os
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
KNOWLEDGE_DIR = ROOT / "knowledge"
DEFAULT_FIXTURE = ROOT / "fixtures" / "issues.json"
REPO = os.getenv("GITHUB_REPOSITORY", os.getenv("ORCHESTRATOR_REPOSITORY", "SinisterDeveloper/tourism"))
TOKEN_ENV = "GITHUB_TOKEN"
KNOWN_TEAM_NAMES = {"Krishay", "Ayush", "Supreet", "Siddhant", "Aishwarya", "Zainab"}

LABEL_TAXONOMY = {
    "status": ["backlog", "ready", "in-progress", "blocked", "review"],
    "priority": ["p0", "p1", "p2", "p3"],
    "workstream": ["product", "frontend", "backend", "ai", "api", "research", "infra"],
    "type": ["feature", "bug", "research", "integration", "architecture", "documentation"],
}


def label_names() -> list[str]:
    return [f"{group}:{value}" for group, values in LABEL_TAXONOMY.items() for value in values]
