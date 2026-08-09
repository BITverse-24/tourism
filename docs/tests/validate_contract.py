#!/usr/bin/env python3
"""Portable contract checks; full Draft 2020-12 validation belongs in the consuming CI runtime."""

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "json" / "schemas" / "trip-state.schema.json"
OPENAPI = ROOT / "json" / "openapi.json"
FIXTURE = ROOT / "json" / "examples" / "planning-run.json"
OWNERSHIP = ROOT / "json" / "agent-ownership.json"
TIMESTAMP = re.compile(r".+(Z|[+-]\d{2}:\d{2})$")


def load(path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def resolve_ref(document, ref, source):
    if ref.startswith("#/"):
        target = document
        for segment in ref[2:].split("/"):
            target = target[segment]
        return target
    file_name, _, fragment = ref.partition("#")
    target_path = (source.parent / file_name).resolve()
    assert target_path.exists(), f"missing external reference: {ref}"
    target = load(target_path)
    if fragment.startswith("/"):
        for segment in fragment[1:].split("/"):
            target = target[segment]
    return target


def check_refs(value, document, source):
    if isinstance(value, dict):
        if "$ref" in value:
            resolve_ref(document, value["$ref"], source)
        for child in value.values():
            check_refs(child, document, source)
    elif isinstance(value, list):
        for child in value:
            check_refs(child, document, source)


def check_trip_state(state):
    required = {"schema_version", "trip", "status", "version", "traveler_profile", "trip_request", "constraints", "candidates", "run"}
    assert required <= state.keys(), "fixture omits canonical required fields"
    assert state["schema_version"] == "1.0.0"
    assert state["status"] == "planned"
    assert state["version"] >= 1
    assert TIMESTAMP.match(state["trip"]["created_at"]), "timestamps require explicit offsets"
    assert re.fullmatch(r"[A-Z]{3}", state["trip"]["planning_currency"]), "currency must be ISO 4217"
    candidates = state["candidates"]
    assert 1 <= len(candidates) <= 3
    ranks = [candidate["rank"] for candidate in candidates]
    assert ranks == sorted(ranks) and ranks[0] == 1
    active = next(candidate for candidate in candidates if candidate["candidate_id"] == state["active_candidate_id"])
    assert active["rank"] == 1 and active["feasible"]
    expected_components = {"preference_fit", "experience_quality", "comfort", "authenticity", "fatigue", "cost_penalty", "logistics_penalty", "regret_risk", "disruption_penalty", "overall_score"}
    for candidate in candidates:
        assert expected_components <= candidate["score_components"].keys()
        assert candidate["total_cost"]["currency"] == state["trip"]["planning_currency"]


def main():
    schema, openapi, fixture, ownership = load(SCHEMA), load(OPENAPI), load(FIXTURE), load(OWNERSHIP)
    assert schema["$schema"] == "https://json-schema.org/draft/2020-12/schema"
    assert "AgentPatch" in schema["$defs"]
    assert set(ownership["agents"]) == {str(agent) for agent in range(1, 11)}
    assert "/version" in ownership["orchestrator_only"]
    check_refs(schema, schema, SCHEMA)
    check_refs(openapi, openapi, OPENAPI)
    required_paths = {"/trips", "/trips/{tripId}/discovery-answers", "/trips/{tripId}/planning-runs", "/planning-runs/{runId}", "/planning-runs/{runId}/constraint-relaxations", "/trips/{tripId}/versions", "/trips/{tripId}/versions/{version}", "/trips/{tripId}/alternatives/{candidateId}/select", "/trips/{tripId}/replans", "/planning-runs/{runId}/events"}
    assert required_paths <= openapi["paths"].keys(), "public command/read path missing"
    check_trip_state(fixture["initial_version"])
    expected_branches = {"minimal_change", "full_reoptimization"}
    assert set(fixture["replan_expectations"]["required_branches"]) == expected_branches
    assert fixture["replan_expectations"]["parent_version"] == fixture["initial_version"]["version"]
    print("System-contract structural checks passed.")


if __name__ == "__main__":
    main()
