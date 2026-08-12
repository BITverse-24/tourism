# Read-only project orchestrator

## Purpose

This package reads GitHub Issues and repository knowledge, normalizes project state, evaluates explicit dependency declarations, identifies ready work, and produces human-reviewable assignment recommendations. It is a project-management analyzer, not the product’s ten-agent travel-planning workflow.

V1 is strictly read-only. It does not create, assign, close, relabel, comment on, or reopen GitHub issues. It does not use GitHub Projects, background workers, databases, MCP, or autonomous agents.

## Architecture

```text
GitHubReader / FixtureReader
            ↓
       normalized issues
            ↓
     dependency/state graph
            ↓
          planner
            ↓
         allocator
            ↓
 JSON report + human report
```

## Directory structure

```text
mgmt/orchestrator/
├── allocator.py       deterministic candidate scoring
├── config.py          repository/configuration constants and taxonomy
├── github.py          read-only fixture and GitHub API clients
├── main.py            CLI and report rendering
├── models.py          typed dataclasses
├── planner.py         ready/newly-unblocked task selection
├── state.py           dependency parsing and normalized project state
└── prompts/           guarded future explanation guidance only
```

The knowledge base is in `mgmt/knowledge/`. Test data is in `mgmt/fixtures/`; dependency-free tests are in `mgmt/tests/`.

## Dependency model

Issues declare `Depends on:` and `Blocks:` in their bodies. Explicit declarations are authoritative. The analyzer reports missing references, blocked work, closed-dependency unlocks, and cycles. It does not infer dependencies from titles.

## Assignment scoring

The allocator computes a deterministic `fit_score` from:

- skill match: 35%
- workstream match: 20%
- availability: 20%
- dependency fit: 15%

Historical success is not available in V1, so its weight is omitted and the available factors are renormalized. Overload and strategic role mismatch incur penalties.

`fit_score` is candidate fit, not certainty. `confidence` is separate and is `null`/`Unknown` in V1 because the system has no calibrated evidence model. It must not be presented as a percentage fabricated from the fit score.

Strategic/product recommendations set `requires_human_approval: true`. They remain recommendations and never become automatic assignments.

## Fixture mode

From `mgmt/`, run:

```bash
python3 -m orchestrator.main --fixture fixtures/issues.json
python3 -m orchestrator.main --fixture fixtures/issues.json --json
```

Fixture mode is deterministic and requires no credentials or network.

## Live mode

Live mode is explicit and read-only:

```bash
python3 -m orchestrator.main --live --repository SinisterDeveloper/tourism
```

Live mode requires a GitHub Personal Access Token in `GITHUB_TOKEN`. The client reads the token at runtime, sends it as `Authorization: Bearer <token>`, and never puts it in a URL, report, fixture, or error message.

Configure it in the shell:

```bash
export GITHUB_REPOSITORY="SinisterDeveloper/tourism"
export GITHUB_TOKEN="YOUR_TOKEN"
```

Alternatively, use the repository's existing environment configuration mechanism. No dotenv dependency is used and `.env` is not loaded automatically. `.env.example` documents the variable names without containing a credential.

Use a fine-grained PAT scoped only to `SinisterDeveloper/tourism` with:

- Metadata: Read-only
- Issues: Read-only
- Pull requests: Read-only only if pull-request data is enabled/used

Before fetching issues, live mode performs a read-only preflight against `/user` and `/repos/{owner}/{repo}`. This verifies that the token is accepted and the repository is accessible.

Live failures are classified as network/DNS, authentication, not found, rate limit, forbidden, malformed response, or other HTTP errors. A failure is reported and the process exits without mutating GitHub.

## Current limitations

- No calibrated confidence model or historical-success data.
- No automatic issue creation or assignment.
- No GitHub write client by design.
- No pagination beyond the current bounded API reads.
- Knowledge-based phase/milestone values are CLI defaults, not inferred from GitHub milestones.
- Team usernames remain placeholders until verified from GitHub.
- Live mode fails before making a request when `GITHUB_TOKEN` is missing.

## Future automation roadmap

Only after V1 recommendations are validated should the team consider a separately approved draft-generation workflow, human approval gates, and eventually narrowly scoped GitHub mutations. Those are V2 decisions and are intentionally absent from this implementation.
