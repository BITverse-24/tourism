You are setting up the first version of an AI project orchestration system inside this repository.

Repository:
SinisterDeveloper/tourism

Project:
Agentic Travel Planner for the SIH Internal Hackathon.

IMPORTANT:
Do not make assumptions about the existing codebase. Inspect the repository first. Preserve all existing application code and architecture unless a change is explicitly required for this orchestration system.

==================================================
OBJECTIVE
==================================================

Build the foundational infrastructure for an AI project orchestrator that uses GitHub Issues as the sole task-management system.

Do NOT use GitHub Projects.

Do NOT build a multi-agent system.

Do NOT implement autonomous task assignment yet.

The first version must establish:

1. A structured project knowledge base.
2. A standardized GitHub Issue format.
3. A strict label taxonomy.
4. Team capability information.
5. Task dependency conventions.
6. An orchestrator codebase capable of reading GitHub state.
7. A project-state representation.
8. A planner that can identify candidate next tasks.
9. An allocator that can recommend appropriate team members.
10. A recommendation-only mode that never mutates GitHub.

The end result should allow us to run the orchestrator against the repository and receive a structured report:

- Current project state
- Current phase
- Active work
- Blocked work
- Completed work
- Newly unblocked work
- Recommended next tasks
- Recommended assignees
- Reason for each assignment
- Confidence
- Risks

==================================================
PHASE 0: INSPECT BEFORE MODIFYING
==================================================

Before creating or modifying anything:

1. Inspect the repository tree.
2. Read the README.
3. Inspect existing source code structure.
4. Inspect existing .github configuration.
5. Inspect existing issue templates if any.
6. Inspect existing GitHub-related scripts/workflows if any.
7. Inspect existing documentation.
8. Determine the project's current implementation phase.
9. Check whether there are existing conventions for Python, Node.js, TypeScript, environment variables, testing, linting, etc.
10. Do not introduce a second programming language or framework if the repository already has a reasonable convention that can be reused.

Do not overwrite existing files blindly.

If an orchestration-related directory already exists, extend it instead of replacing it.

==================================================
PHASE 1: KNOWLEDGE BASE
==================================================

Create:

knowledge/
├── project.md
├── product.md
├── architecture.md
├── team.md
├── workflow.md
└── decisions/
    └── README.md

These files are the initial knowledge base for the orchestrator.

IMPORTANT:
Do not invent unknown team members, skills, responsibilities, architecture decisions, APIs, or product requirements.

Use information already present in the repository and the following known project context.

Project:
Agentic Travel Planner.

Product concept:
An agentic travel-planning system that takes a user's travel requirements, performs research and planning using specialized agents/tools, and produces a refined final travel plan.

Product leadership:
SinisterDeveloper is the product lead and technical lead.

SinisterDeveloper responsibilities:
- Product direction
- Product scope
- Final product decisions
- System architecture
- Agent architecture
- Critical technical decisions

SinisterDeveloper should NOT automatically receive routine research, API investigation, documentation, or mechanical implementation tasks when another qualified teammate can perform them.

Zainab's known responsibilities:
- External API research
- API/provider evaluation
- External service research
- Integration feasibility
- API documentation research
- Integration prototypes

Do not invent Zainab's GitHub username. The actual username should be discovered from GitHub if available, or left as a placeholder in knowledge/team.md.

For other collaborators:
Inspect GitHub/repository information if available through the configured GitHub tooling.
If their skills cannot be reliably determined, create placeholders rather than hallucinating capabilities.

knowledge/project.md must contain:

- Project objective
- Current phase
- Current milestone
- Success criteria
- Current priorities
- Explicit out-of-scope items
- How the orchestrator should interpret project progress

knowledge/product.md must contain:

- Product vision
- Core user problem
- Core user experience
- Major system capabilities
- Current product scope
- Explicitly unknown requirements

knowledge/architecture.md must contain:

- Known architecture
- Known agents/components
- Known integrations
- Known dependencies
- Explicitly unresolved architecture questions

Do not invent architecture simply to fill the file.

knowledge/team.md must contain structured profiles for known team members:

- GitHub username
- Role
- Responsibilities
- Skills
- Preferred work
- Work to avoid
- Maximum recommended concurrent tasks
- Whether strategic approval is required

knowledge/workflow.md must define the orchestration rules described below.

==================================================
PHASE 2: GITHUB ISSUE TAXONOMY
==================================================

The orchestrator uses GitHub Issues as its ONLY project-management primitive.

Do not use GitHub Projects.

Create/update GitHub issue templates where appropriate.

Create these issue types:

1. Task
2. Research
3. Bug

If the repository already has issue templates, preserve compatible existing templates and improve them rather than destroying them.

Every task issue should contain:

## Objective

What needs to be accomplished?

## Context

Why does this task exist?

## Expected Output

What should exist when this is completed?

## Dependencies

Depends on:
- #issue

Blocks:
- #issue

If none:

Depends on:
- None

Blocks:
- None

## Acceptance Criteria

- [ ] ...

## Definition of Done

- [ ] ...

## Agent Metadata

Workstream:
Type:
Priority:
Effort:

==================================================
PHASE 3: LABEL TAXONOMY
==================================================

Use the following labels.

STATUS:

status:backlog
status:ready
status:in-progress
status:blocked
status:review

Do NOT create status:done.
GitHub's native closed state represents completion.

PRIORITY:

priority:p0
priority:p1
priority:p2
priority:p3

WORKSTREAM:

workstream:product
workstream:frontend
workstream:backend
workstream:ai
workstream:api
workstream:research
workstream:infra

TYPE:

type:feature
type:bug
type:research
type:integration
type:architecture
type:documentation

Create the labels if they do not exist.

Do not duplicate labels.

Do not delete unrelated existing labels.

==================================================
PHASE 4: DEPENDENCY MODEL
==================================================

The orchestrator must treat GitHub Issues as a dependency graph.

An issue may declare:

Depends on:
- #21
- #25

Blocks:
- #31
- #32

The orchestrator must be able to determine:

- Which issues are blocked
- Which issues are actionable
- Which closed issues have unlocked downstream work
- Which issues have unresolved dependencies
- Which issues have invalid references
- Which issues appear to form dependency cycles

Do not attempt to infer dependencies solely from issue titles.

Explicit dependency declarations have higher priority than LLM inference.

The orchestrator may suggest a missing dependency, but recommendation-only mode must not modify the issue.

==================================================
PHASE 5: ORCHESTRATOR
==================================================

Create:

orchestrator/
├── main.py
├── github.py
├── state.py
├── planner.py
├── allocator.py
├── models.py
├── config.py
└── prompts/
    └── orchestrator.md

Adapt the language/framework to the repository's existing conventions if appropriate.

Do not introduce unnecessary frameworks.

Responsibilities:

github.py:
- Read repository issues
- Read issue metadata
- Read labels
- Read assignees
- Read issue state
- Read comments where useful
- Read pull requests where useful
- Abstract GitHub access behind functions/interfaces
- Do not mutate GitHub in V1

state.py:
Construct a normalized project state.

The state should include:

- current phase
- open issues
- closed issues
- in-progress issues
- blocked issues
- ready issues
- dependency graph
- newly unblocked issues
- active work by person
- estimated workload
- project risks
- unresolved decisions

models.py:
Define typed models for:

ProjectState
IssueState
Dependency
TeamMember
CandidateTask
AssignmentRecommendation
OrchestratorReport

planner.py:
Given ProjectState + knowledge base:

- Identify work that should happen next.
- Identify missing tasks required to reach the current milestone.
- Identify newly unblocked tasks.
- Identify blocked tasks.
- Identify stale or ambiguous tasks.
- Do not invent work unrelated to the current project goals.
- Do not change strategic product scope.

allocator.py:
Recommend an assignee for each candidate task.

Use deterministic scoring where possible.

Assignment scoring should consider:

skill_match
workstream_match
availability
current_load
dependency_fit
role_alignment

Suggested conceptual weighting:

skill_match: 35%
workstream_match: 20%
availability: 20%
dependency_fit: 15%
historical_success: 10%

If historical_success data does not exist, omit it and renormalize.

Apply penalties for:

- overloaded member
- role mismatch
- strategic/product decisions
- tasks outside declared responsibilities

Strategic product decisions should recommend SinisterDeveloper but mark:

requires_human_approval = true

Do NOT automatically assign strategic tasks.

==================================================
PHASE 6: ORCHESTRATOR OUTPUT
==================================================

The orchestrator must output structured JSON internally.

Use a structure similar to:

{
  "project_state": {
    "phase": "...",
    "health": "green|yellow|red",
    "critical_blockers": [],
    "risks": []
  },
  "recommended_tasks": [
    {
      "title": "...",
      "objective": "...",
      "workstream": "...",
      "type": "...",
      "priority": "...",
      "effort": "...",
      "depends_on": [],
      "recommended_assignee": "...",
      "reason": "...",
      "confidence": 0.0,
      "requires_human_approval": false
    }
  ]
}

The CLI should also render a readable human-oriented report.

Example:

PROJECT STATE
=============

Phase:
Architecture

Health:
Yellow

CRITICAL BLOCKERS
=================

#17 Travel API selection

RECOMMENDED TASKS
=================

1. Evaluate travel API providers

Assignee:
Zainab

Priority:
P1

Reason:
API selection blocks the integration layer. Zainab owns external API
research and currently has available capacity.

Confidence:
91%

Human approval:
No

2. Define planner-agent interface

Assignee:
SinisterDeveloper

Priority:
P0

Reason:
This is an architectural/product decision.

Confidence:
95%

Human approval:
Yes

==================================================
PHASE 7: KNOWLEDGE + GITHUB INPUTS
==================================================

The orchestrator must combine:

1. Repository state
2. GitHub issues
3. GitHub issue dependencies
4. Pull request state where relevant
5. Knowledge base
6. Team capability data
7. Current workload

Do NOT rely only on the LLM's context window.

Build a normalized state object first.

Then give the normalized state to the planner.

==================================================
PHASE 8: SAFETY RULES
==================================================

These rules are mandatory.

1. V1 is recommendation-only.
2. Never create GitHub issues automatically.
3. Never assign GitHub issues automatically.
4. Never close GitHub issues automatically.
5. Never modify labels automatically.
6. Never change product scope automatically.
7. Never make architectural decisions automatically.
8. Never invent team skills.
9. Never invent dependencies.
10. Never create duplicate task recommendations.
11. Never recommend work that conflicts with the current project scope.
12. Prefer existing unblocked issues over creating new work.
13. Flag ambiguity instead of hallucinating.
14. Flag insufficient team information.
15. Strategic/product/architecture decisions require human approval.

==================================================
PHASE 9: CLI
==================================================

Create a simple command:

orchestrator analyze

It should:

1. Load knowledge base.
2. Fetch GitHub state.
3. Normalize the state.
4. Build dependency graph.
5. Determine current project state.
6. Generate candidate next tasks.
7. Recommend assignees.
8. Print the report.
9. Optionally save the raw JSON report to:

orchestrator/output/latest.json

Do not require GitHub write permissions.

The command should fail clearly if required configuration is missing.

==================================================
PHASE 10: CONFIGURATION
==================================================

Create a safe configuration mechanism.

Required:

GITHUB_REPOSITORY=SinisterDeveloper/tourism

LLM configuration should use environment variables.

Never hardcode:

- API keys
- GitHub tokens
- secrets
- OAuth credentials

Create:

.env.example

Do NOT create a real .env file containing secrets.

Update .gitignore if necessary.

==================================================
PHASE 11: TESTING
==================================================

Create tests for:

1. Issue parsing
2. Dependency parsing
3. Dependency graph construction
4. Blocked issue detection
5. Newly-unblocked issue detection
6. Workload calculation
7. Assignment scoring
8. Strategic-task approval detection
9. Duplicate-task prevention
10. Malformed dependency handling

Tests must not require real GitHub credentials.

Use fixtures/mocks.

Create representative fixture data for:

- completed task
- blocked task
- ready task
- task with multiple dependencies
- task with missing dependency
- overloaded teammate
- strategic product task

==================================================
PHASE 12: DOCUMENTATION
==================================================

Create/update:

orchestrator/README.md

It must explain:

- What the orchestrator does
- What it does NOT do
- How GitHub Issues are structured
- How dependencies work
- How team capabilities are represented
- How assignment scoring works
- How to configure credentials
- How to run the analyzer
- Example output
- Current V1 limitations
- Roadmap toward automated assignment

Also create:

knowledge/workflow.md

with the complete operational rules.

==================================================
IMPORTANT DESIGN PRINCIPLES
==================================================

This system is NOT an autonomous AI project manager yet.

It is a project-state analysis and task-recommendation engine.

The hierarchy is:

Product direction
        ↓
Human / SinisterDeveloper

Project state
        ↓
GitHub + knowledge base

Planning
        ↓
LLM

Assignment recommendation
        ↓
LLM + deterministic scoring

Execution
        ↓
Human team member

Evidence of completion
        ↓
GitHub issue / PR

Then the cycle repeats.

The goal is to remove the manual scheduling burden from SinisterDeveloper without giving an LLM uncontrolled authority over the project.

==================================================
CODING STANDARDS
==================================================

Before implementing:

- Inspect existing repository conventions.
- Reuse existing dependencies where reasonable.
- Keep modules small.
- Prefer typed interfaces.
- Keep GitHub access isolated from planning logic.
- Keep LLM calls isolated from deterministic logic.
- Make the system testable without external services.
- Do not add unnecessary dependencies.
- Do not refactor unrelated application code.
- Do not modify application behavior.

==================================================
FINAL REQUIREMENT
==================================================

After implementation:

1. Run all tests.
2. Run lint/type checks if the repository has them.
3. Run:

   orchestrator analyze

   if credentials are available.

4. If credentials are not available, run the analyzer against fixture data.
5. Report exactly what files were created/modified.
6. Report any assumptions made.
7. Report anything that could not be verified.
8. Do not claim the orchestrator is production-ready.
9. Do not enable autonomous GitHub mutations.

Before finishing, inspect your own changes for unnecessary complexity and remove anything not required for V1.

The desired result is a clean, minimal, working foundation that we can test against the real project before adding autonomous issue creation and assignment.
