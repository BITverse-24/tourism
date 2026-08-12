# Team knowledge

**Source:** [`TEAM.md`](../../TEAM.md). GitHub usernames are not present in repository files and remain explicit placeholders until discovered from GitHub.

## Ownership rule

Every subsystem has exactly one owner responsible for correctness, interface, and final integration. Contributors may help, but nobody changes another person’s subsystem without notifying its owner.

## Krishay — system architecture and orchestration

- GitHub username: `TODO: discover from GitHub`
- Role: Lead, system architecture, orchestration, optimization, integration
- Owns: Overall architecture, agent communication, data flow, state management, contracts, event/replanning flow, error strategy, workflow ordering, objective function, constraint handling, candidate comparison, regret integration, final itinerary selection, canonical itinerary object, integration
- Agent ownership: Constraint & Preference, Cost Optimization, Optimization, Continuous Replanning
- Supports: Mobility, Simulation
- Skills: Architecture, orchestration, optimization, integration, technical decisions
- Preferred work: Strategic architecture, contracts, orchestration, integration
- Avoid: Frontend implementation, database CRUD, dataset creation, scraping, styling, authentication, routine prompt work
- Maximum recommended concurrent tasks: 2
- Strategic approval required: Yes

## Ayush — frontend

- GitHub username: `TODO: discover from GitHub`
- Role: Frontend engineer and user-facing application owner
- Owns: Traveler onboarding, adaptive questionnaire UI, Traveler Profile UI, itinerary UI, optimization visualization, explanations, replanning UI, optional agent-activity visualization
- Supports: UX and state visualization
- Skills: Frontend, UX, state visualization
- Preferred work: User-facing flows and visual explanations
- Avoid: Agent logic, LLM prompts, optimization, database schema, data collection, backend business logic
- Maximum recommended concurrent tasks: 3
- Strategic approval required: No
- Done means: Users can create trips, answer questions, view profile/itinerary, inspect optimization, trigger replanning, and view the updated plan.

## Supreet — backend and data infrastructure

- GitHub username: `TODO: discover from GitHub`
- Role: Backend, APIs, database, infrastructure
- Owns: API layer, persistence, CRUD, indexes, TripState storage, agent execution infrastructure, external integrations, caching, environment/secrets, deployment, logging, monitoring, error handling, rate limiting
- Agent ownership: Mobility & Logistics
- Skills: Backend, APIs, database, infrastructure, integrations
- Preferred work: Backend foundation and external service implementation
- Avoid: ML models, UI, optimization mathematics, agent personality/prompt design
- Maximum recommended concurrent tasks: 3
- Strategic approval required: No
- Done means: APIs, database, execution infrastructure, external APIs, persistence, and deployment work.

## Siddhant — AI/ML and agent intelligence

- GitHub username: `TODO: discover from GitHub`
- Role: AI/ML and agent intelligence
- Owns: Traveler profile inference, adaptive discovery, experience ranking, simulation, energy/fatigue/satisfaction/crowd models, regret model, prompts, structured outputs, tools, validation, evaluation
- Agent ownership: Discovery, Experience Designer, Local Intelligence, Simulation & Risk, Narrative & Explanation
- Supports: Constraint & Preference, Optimization, Continuous Replanning
- Skills: AI/ML, agent intelligence, simulation models, evaluation
- Preferred work: Agent reasoning, models, structured outputs, evaluation
- Avoid: Raw activity data, database infrastructure, frontend, orchestration infrastructure, external API implementation
- Maximum recommended concurrent tasks: 2
- Strategic approval required: No
- Done means: Profile inference, experience ranking, simulation, fatigue/satisfaction, regret, validated outputs, and AI evaluation scenarios pass.

## Aishwarya — experience knowledge base and data pipeline

- GitHub username: `TODO: discover from GitHub`
- Role: Experience Knowledge Base and data owner
- Owns: Geography, experiences, attractions/restaurants/activities, metadata, transportation connections, source-to-database pipeline, cleaning, normalization, enrichment, validation, data-quality checklist, controlled destination expansion
- Supports: Experience Designer, Mobility, Local Intelligence
- Skills: Data curation, data pipelines, data validation, evaluation
- Preferred work: Structured world model and data quality
- Avoid: ML models, agent prompts, backend architecture, UI, optimization logic
- Maximum recommended concurrent tasks: 3
- Strategic approval required: No
- Done means: The experience KB, required destination coverage, complete schema, connections, data validation, and agent-queryable data exist.

## Zainab — research, product specification, and QA

- GitHub username: `TODO: discover from GitHub`
- Role: Research, product intelligence, QA, documentation, presentation
- Owns: Competitor research, user research, provider/API research, requirements/product specification, QA across UI/APIs/itinerary/agents/constraints/replanning, edge-case testing, bug tracking, documentation, presentation narrative
- Skills: External API research, provider evaluation, integration feasibility, API documentation, research, QA, documentation
- Preferred work: Provider investigation, product validation, QA, evidence-backed documentation
- Avoid: Strategic product decisions unless explicitly requested; primary implementation outside research/prototypes
- Maximum recommended concurrent tasks: 3
- Strategic approval required: No
- Done means: Requirements are frozen, research and test scenarios exist, QA checklist and bug tracker exist, core flows are validated, and documentation is complete.

## Dependency graph

```text
Zainab (requirements / QA)
        ↓
Krishay (system contracts)
        ↓
Aishwarya (data) + Siddhant (AI/ML) + Supreet (backend)
        ↓
Krishay (integration)
        ↓
Ayush (frontend)
        ↓
Zainab (QA)
```

The graph expresses collaboration order, not permission to bypass subsystem ownership.
