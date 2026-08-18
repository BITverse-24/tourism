# Agentic Travel Planner

## 1. Core Idea

An **agentic, human-centric travel planning system** that plans trips around the traveler rather than merely around the destination.

Traditional travel planners focus on destination search, routing, and lists of popular attractions. This product builds a model of **how the traveler wants to experience the trip**, then uses that model to generate, simulate, and optimize a personalized itinerary.

The core principle is:

> **Do not optimize only for where the traveler should go. Optimize for how the traveler wants to experience the journey.**

The system may consider:

- personality and travel style;
- trip purpose;
- budget and comfort;
- energy levels and walking tolerance;
- food, photography, culture, nature, nightlife, and shopping;
- crowd tolerance and preferred pace;
- accommodation preferences;
- must-visit places and places to avoid;
- comfort versus exploration;
- desired spontaneity; and
- regret associated with missing important experiences.

The final itinerary is not simply a list of attractions. It is a personalized sequence of experiences optimized for the individual traveler.

## 2. MVP

The initial MVP contains two primary capabilities. Continuous replanning is a planned later capability, not part of the first vertical slice.

### Personalized Trip Generation

The system interactively understands the traveler and generates a personalized itinerary.

Inputs include:

- destination or country;
- travel dates or duration;
- budget;
- number of travelers;
- trip purpose;
- preferences; and
- constraints.

Discovery uses an adaptive questionnaire rather than a fixed list of questions. For example:

> Estimated budget: ₹1.8L. What matters more?

- Better hotels
- Better food
- More cities
- More shopping

The next question depends on previous answers. The result is a structured [Traveler Profile](docs/TRAVELER_PROFILE_SCHEMA.md).

The planner then determines:

- which cities or regions to visit;
- how many days to allocate to each;
- how to travel between them;
- which experiences to include; and
- how to sequence activities within each day.

The result is a complete personalized [Final Trip Plan](docs/FINAL_TRIP_PLAN_SCHEMA.md).

### Simulation and Human-Centric Optimization

The generated itinerary is not accepted immediately. It is evaluated using the traveler’s profile for:

- preference alignment;
- fatigue and walking load;
- schedule feasibility and travel time;
- budget;
- crowd exposure;
- weather and closure risk;
- transfer complexity;
- experience quality;
- regret risk; and
- overall comfort.

The planner identifies weaknesses and improves the itinerary through explicit tradeoffs.

Example:

### Before optimization

- Walking: 14.2 km/day
- Preference fit: 78/100
- Fatigue risk: High
- Budget: ₹1.87L
- Regret risk: 18%

### After optimization

- Walking: 8.1 km/day
- Preference fit: 87/100
- Fatigue risk: Low
- Budget: ₹1.82L
- Regret risk: 11%

Example tradeoff:

> Replacing the central hotel with one 10 minutes farther from the station saves ₹12,000 but increases daily transit by 35 minutes.

The value of that tradeoff depends on the traveler’s priorities rather than on a universal ranking.

### Future capability: Continuous Replanning

Later versions may adapt an itinerary after conditions change, such as:

- a delayed flight;
- heavy rain;
- an attraction closure;
- a reduced or increased budget;
- traveler fatigue;
- a shortened trip;
- an additional traveler; or
- a changed activity preference.

A future replanning flow should identify affected parts of the itinerary, find alternatives, reevaluate logistics and cost, simulate the revised plan, and preserve unaffected high-value experiences. It should reuse the initial planning workflow rather than introduce a second planning authority.

## 3. Destination Model

The planner supports both **city-based** and **country-based** trip requests. The knowledge base is hierarchical:

```text
Country
    ↓
Region
    ↓
City
    ↓
Neighborhood
    ↓
Experience / Activity / Restaurant / Attraction
```

For a country-level request, the product first makes trip-level decisions:

```text
Japan
    ↓
Tokyo: 4 days
Kyoto: 3 days
Osaka: 2 days
Hiroshima: 1 day
```

It then makes city-level decisions:

```text
Kyoto
    ↓
Day 1
    ↓
Experiences
    ↓
Activities
    ↓
Daily sequence
```

### Trip-level planning

Trip-level planning determines:

- which cities to visit;
- number of days per city;
- city ordering;
- inter-city transportation;
- hotel changes;
- regional clustering; and
- budget allocation.

### City-level planning

City-level planning determines:

- experiences and attractions;
- restaurants and meals;
- timing;
- activity sequence;
- walking load;
- rest periods;
- crowd exposure; and
- local transportation.

## 4. Experience Knowledge Base

The MVP uses a structured **Experience Knowledge Base** rather than relying entirely on an LLM’s latent knowledge.

The database contains:

- countries, regions, cities, and neighborhoods;
- attractions, restaurants, activities, and experiences;
- transportation connections; and
- metadata needed for fit, feasibility, cost, and freshness.

The preferred atomic unit is an **experience**, not merely an attraction. For example, the knowledge base may contain:

> Sunrise photography at Fushimi Inari

rather than only:

> Fushimi Inari Shrine

The two experiences may have different timing, crowd, walking, weather, and preference attributes even though they share a physical location.

### Experience record

An experience record should support structured fields such as:

```json
{
  "id": "fushimi_inari_sunrise",
  "name": "Sunrise Photography at Fushimi Inari",
  "country": "Japan",
  "region": "Kansai",
  "city": "Kyoto",
  "neighborhood": "Fushimi",
  "location": {
    "latitude": 34.9671,
    "longitude": 135.7727
  },
  "categories": ["culture", "photography", "nature"],
  "duration_hours": 2.0,
  "estimated_cost": 0,
  "opening_hours": {
    "open": "06:00",
    "close": "18:00"
  },
  "preference_scores": {
    "photography": 0.98,
    "culture": 0.90,
    "food": 0.10,
    "nature": 0.70,
    "nightlife": 0.00,
    "shopping": 0.00
  },
  "experience_attributes": {
    "authenticity": 0.75,
    "uniqueness": 0.85,
    "regret_score": 0.90,
    "crowd_level": 0.20,
    "walking_intensity": 0.80,
    "comfort": 0.55
  },
  "best_times": ["06:00-08:00"],
  "weather_suitability": {
    "clear": 1.0,
    "cloudy": 0.9,
    "rain": 0.2
  },
  "accessibility": 0.40
}
```

The exact knowledge-base schema is a separate data contract and should be refined during implementation.

## 5. Knowledge Base Layers

### Geography

Contains country, region, city, neighborhood, and coordinate relationships.

```text
Japan
 ├── Kanto
 │    └── Tokyo
 │         ├── Shibuya
 │         ├── Asakusa
 │         └── Shinjuku
 │
 └── Kansai
      ├── Kyoto
      └── Osaka
```

### Experiences

Contains attractions, activities, restaurants, cultural experiences, scenic locations, photography locations, nightlife, shopping, nature, hidden gems, and local experiences.

Each item should expose structured attributes that support traveler-fit scoring and planning constraints.

### Connections

Contains movement options at multiple levels:

```text
Hotel → Attraction
Neighborhood → Neighborhood
City → City
City → Airport
Airport → Hotel
```

For example:

```text
Tokyo → Kyoto
    Shinkansen
    Duration: ~2h 15m
    Cost: ...
    Comfort: ...
    Transfer complexity: ...

Tokyo → Kyoto
    Bus
    Duration: ...
    Cost: ...
    Comfort: ...
```

## 6. Data Sources

The Experience Knowledge Base may be constructed from:

- public datasets;
- maps and places APIs;
- tourism datasets;
- transportation APIs;
- weather APIs;
- web research;
- curated information; and
- LLM-assisted data enrichment.

LLMs may help convert unstructured information into standardized records, but important structured attributes must be validated rather than regenerated arbitrarily for every traveler.

Curated knowledge is primary for the MVP. External maps, places, weather, and transport APIs are secondary data facts and should carry `source`, `observed_at`, `fresh_until`, and `confidence`. Stale data is acceptable only when hard feasibility remains verifiable.

The MVP does not need worldwide coverage. A limited number of well-covered destinations is preferable to shallow global coverage.

## 7. Product Experience Flow

The product experience has four user-visible steps:

1. **Understand the traveler** — capture trip context, priorities, preferences, constraints, and unknowns.
2. **Shape the trip** — form a personalized route and daily experience plan from the Traveler Profile and destination knowledge.
3. **Test and improve the plan** — evaluate feasibility, cost, fatigue, comfort, risk, and preference fit, then expose important tradeoffs.
4. **Explain the result** — present a complete Final Trip Plan with daily activities, movement, costs, fit explanations, assumptions, warnings, and unresolved details.

```text
Traveler conversation
        ↓
Traveler Profile
        ↓
Personalized candidate plans
        ↓
Feasibility, cost, simulation, and optimization
        ↓
Final Trip Plan
```

## 8. Core Philosophy

The system should optimize for:

> **The quality of the traveler’s experience, not simply the number of places visited.**

The planner should answer:

> Given this traveler, their constraints, preferences, energy, budget, and current conditions, what itinerary maximizes the value of the trip?

It should not merely answer:

> What are the most popular attractions in this destination?

Two people visiting the same destination with the same budget and duration should be able to receive substantially different itineraries because their Traveler Profiles and priorities differ.

## 9. Explicitly Out of MVP Scope

The following are not initial MVP features:

- travel movie or cinematic preview;
- smart packing list;
- full conversational Local Guide;
- full language-learning assistant;
- booking system;
- payment processing;
- social travel network;
- hotel booking platform;
- flight booking platform;
- comprehensive worldwide destination coverage;
- fully autonomous interaction with every external travel service; and
- continuous replanning.

The initial MVP is centered on:

1. **Personalized Trip Generation**
2. **Simulation + Human-Centric Optimization**

Continuous replanning is a future capability that should reuse the same planning pipeline.

## 10. Documentation Map

This README is the detailed product overview. Architecture, workflow contracts, and project-management material live in the documentation set:

- [Traveler Profile](docs/TRAVELER_PROFILE_SCHEMA.md) — normalized planning input.
- [Final Trip Plan](docs/FINAL_TRIP_PLAN_SCHEMA.md) — user-facing planning result.
- [WebSocket Core API](docs/WEBSOCKET_CONTRACT.md) — frontend/backend transport and workflow behavior.
- [Three-Agent, Ten-Stage Architecture](docs/AGENT_ARCHITECTURE.md) — actual runtime agents, logical stages, deterministic services, and orchestration.
- [System Contract](docs/SYSTEM_CONTRACT.md) — product boundaries and phased contract authority.
- [Documentation Index](docs/README.md) — canonical product and workflow documents.
- [Project Knowledge](mgmt/knowledge/project.md) — objectives, priorities, milestones, and project scope.
- [Team Responsibilities](TEAM.md) — ownership and collaboration responsibilities.

The separate [management orchestrator](mgmt/orchestrator/README.md) analyzes project work and does not execute the travel-planning runtime.
