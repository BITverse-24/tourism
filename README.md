# Agentic Travel Planner

> **Implementation decisions (Final — 2026-08-13):** see [docs/SYSTEM_CONTRACT.md §10](docs/SYSTEM_CONTRACT.md#10-implementation-decisions-final--2026-08-13) and [mgmt/knowledge/decisions/2026-08-13-architecture-grill.md](mgmt/knowledge/decisions/2026-08-13-architecture-grill.md).

## 1. Core Idea

An **agentic, human-centric travel planning system** that plans trips around the traveler rather than merely around the destination.

Traditional AI travel planners primarily perform destination discovery, search, routing, and itinerary generation. Our system instead builds a model of **how the traveler wants to experience the trip** and uses that model to generate, simulate, optimize, and dynamically replan the itinerary.

The core principle is:

> **Do not optimize only for where the traveler should go. Optimize for how the traveler wants to experience the journey.**

The system considers:

* Personality and travel style
* Trip purpose
* Budget
* Energy levels
* Walking tolerance
* Food preferences
* Photography interest
* Culture interest
* Nature interest
* Nightlife interest
* Crowd tolerance
* Preferred pace
* Accommodation preferences
* Must-visit places
* Places to avoid
* Comfort vs exploration preferences
* Desired spontaneity
* Regret associated with missing important experiences

The final itinerary is therefore not simply a list of attractions. It is a personalized sequence of experiences optimized for the individual traveler.

---

# 2. MVP

The MVP contains **three primary capabilities**.

## Feature 1: Personalized Trip Generation

The system interactively understands the traveler and generates a personalized itinerary.

### Input

* Destination or country
* Travel dates / duration
* Budget
* Number of travelers
* Trip purpose
* Preferences
* Constraints

The Discovery Agent uses an adaptive questionnaire rather than asking a fixed list of questions.

Example:

> Estimated budget: ₹1.8L
> What matters more?

* Better hotels
* Better food
* More cities
* More shopping

The next question depends on previous answers.

The result is a structured **Traveler Profile**.

The system then determines:

* Which cities/regions to visit
* How many days to allocate to each
* How to travel between them
* Which experiences to include
* How to sequence activities within each day

The result is a complete personalized itinerary.

---

# Feature 2: Simulation + Human-Centric Optimization

The generated itinerary is not accepted immediately.

The system simulates the trip using the traveler's profile and evaluates the itinerary for:

* Preference alignment
* Fatigue
* Walking load
* Schedule feasibility
* Travel time
* Budget
* Crowd exposure
* Weather risk
* Transfer complexity
* Experience quality
* Regret risk
* Overall comfort

The system identifies weaknesses and automatically optimizes the itinerary.

Example:

### Before optimization

* Walking: 14.2 km/day
* Preference fit: 78/100
* Fatigue risk: High
* Budget: ₹1.87L
* Regret risk: 18%

### After optimization

* Walking: 8.1 km/day
* Preference fit: 87/100
* Fatigue risk: Low
* Budget: ₹1.82L
* Regret risk: 11%

The optimizer should make explicit tradeoffs rather than simply rejecting an itinerary.

For example:

> Replacing the central hotel with one 10 minutes farther from the station saves ₹12,000 but increases daily transit by 35 minutes.

The system can decide whether that tradeoff is worthwhile based on the traveler's priorities.

---

# Feature 3: Dynamic Replanning

The itinerary remains adaptable after generation.

The user can introduce a changed condition such as:

* Flight delayed
* Heavy rain
* Attraction closed
* Budget reduced
* Budget increased
* User becomes tired
* Trip shortened by one day
* Additional traveler added
* User wants more/less activity

The system identifies affected portions of the itinerary and replans while preserving the traveler's overall objectives.

Example:

> Heavy rain expected tomorrow.

The system:

1. Identifies outdoor activities affected by rain.
2. Calculates which activities can be moved.
3. Finds suitable alternatives from the Experience Knowledge Base.
4. Recalculates logistics and cost.
5. Simulates the revised itinerary.
6. Optimizes it.
7. Presents the updated plan and explains the changes.

The same replanning engine powers "What If?" scenarios such as:

> What if my budget decreases by 20%?

or:

> What if I lose one day?

---

# 3. Destination Model

The planner must support both **city-based** and **country-based** trip requests.

The underlying knowledge base should therefore be hierarchical.

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

For country-level planning, the system first performs **trip-level optimization**:

```text
Japan
    ↓
Tokyo: 4 days
Kyoto: 3 days
Osaka: 2 days
Hiroshima: 1 day
```

It then performs **city-level optimization**:

```text
Kyoto
    ↓
Day 1
    ↓
Experiences
    ↓
Activities
    ↓
Optimal sequence
```

Therefore, the system operates at two levels:

### Trip-level optimization

Determines:

* Which cities to visit
* Number of days per city
* City ordering
* Inter-city transportation
* Hotel changes
* Regional clustering
* Budget allocation

### City-level optimization

Determines:

* Experiences
* Attractions
* Restaurants
* Timing
* Activity sequence
* Walking load
* Rest periods
* Crowd exposure
* Local transportation

---

# 4. Experience Knowledge Base

The MVP should maintain a structured **Experience Knowledge Base** rather than relying entirely on an LLM's latent knowledge.

The database contains:

* Countries
* Regions
* Cities
* Neighborhoods
* Attractions
* Restaurants
* Activities
* Experiences
* Transportation connections
* Relevant metadata

The atomic unit should preferably be an **experience**, not merely an attraction.

For example:

Instead of only:

> Fushimi Inari Shrine

the database can contain:

> Sunrise photography at Fushimi Inari

These can have different attributes despite sharing the same physical location.

---

## Experience Schema

Each experience should contain structured fields such as:

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

  "categories": [
    "culture",
    "photography",
    "nature"
  ],

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

  "best_times": [
    "06:00-08:00"
  ],

  "weather_suitability": {
    "clear": 1.0,
    "cloudy": 0.9,
    "rain": 0.2
  },

  "accessibility": 0.40
}
```

The exact schema should be refined during implementation.

---

# 5. Knowledge Base Layers

## Layer 1: Geography

Contains:

* Country
* Region
* City
* Neighborhood
* Coordinates

Example:

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

---

## Layer 2: Experiences

Contains:

* Attractions
* Activities
* Restaurants
* Cultural experiences
* Scenic locations
* Photography locations
* Nightlife
* Shopping
* Nature
* Hidden gems
* Local experiences

Each item has structured attributes that agents can score and optimize.

---

## Layer 3: Connections

Contains inter-location transportation.

Example:

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

Connections can exist at multiple levels:

```text
Hotel → Attraction
Neighborhood → Neighborhood
City → City
City → Airport
Airport → Hotel
```

---

# 6. Data Sources

The Experience Knowledge Base can be constructed using a combination of:

* Public datasets
* Maps / places APIs
* Tourism datasets
* Transportation APIs
* Weather APIs
* Web research
* Curated information
* LLM-assisted data enrichment

LLMs can help convert unstructured information into the standardized schema, but important structured attributes should be validated rather than regenerated arbitrarily for every user.

The MVP does not need worldwide coverage.

A limited number of well-covered destinations is preferable to shallow global coverage.

> **Implementation (D2, Final — 2026-08-13):** Curated Experience Knowledge Base is primary (Aishwarya); external maps/places/weather/transport APIs are secondary `data_facts` with `source`/`observed_at`/`fresh_until`/`confidence`. Stale allowed only when hard feasibility remains verifiable.

---

# 7. Ten-Agent Architecture

The MVP retains the **10-agent architecture**, but the agents are logical specialized components rather than ten completely independent products.

> **Implementation (D1/D4, Final — 2026-08-13):** Product orchestrator and Command API are **TypeScript (Express + Socket.IO)** with **MongoDB via Mongoose** (Supreet); management orchestrator under `mgmt/orchestrator/` is separate **Python** and recommendation-only over GitHub Issues (see `docs/SYSTEM_CONTRACT.md` §10).

## Agent 1: Discovery Agent

The interviewer.

Responsibilities:

* Understand traveler personality
* Infer travel style
* Identify trip purpose
* Run adaptive questionnaire
* Identify preferences
* Identify soft constraints
* Build Traveler Profile

Output:

```text
Traveler Profile
```

---

## Agent 2: Constraint & Preference Agent

The rule keeper and source of truth.

Maintains:

### Hard constraints

* Budget ceiling
* Travel dates
* Duration
* Dietary restrictions
* Accessibility requirements
* Must-visit locations
* Places to avoid
* Accommodation requirements
* Maximum travel time
* Maximum hotel changes

### Soft preferences

* Food
* Photography
* Culture
* Nature
* Nightlife
* Shopping
* Crowds
* Walking
* Comfort
* Spontaneity
* Exploration

Every other agent receives the relevant constraints and preferences.

---

## Agent 3: Experience Designer Agent

Determines what the traveler should actually experience.

Responsibilities:

* Generate candidate experiences
* Select attractions
* Find restaurants
* Find hidden gems
* Find scenic locations
* Find cultural experiences
* Find seasonal experiences
* Find photography opportunities
* Rank experiences according to traveler preferences

It should use the Experience Knowledge Base rather than relying entirely on free-form LLM generation.

---

## Agent 4: Mobility & Logistics Agent

Determines whether the proposed itinerary is physically and temporally feasible.

Responsibilities:

* Walking
* Public transportation
* Trains
* Buses
* Flights
* Taxis
* Ferries
* Transfers
* Travel times
* Check-in/check-out
* Opening hours
* Geographic clustering
* Inter-city travel

This agent should rely heavily on deterministic calculations and external APIs rather than LLM reasoning alone.

---

## Agent 5: Cost Optimization Agent

Keeps the trip financially realistic.

Responsibilities:

* Accommodation costs
* Transportation costs
* Food costs
* Activity costs
* Miscellaneous costs
* Budget allocation
* Cost forecasting
* Cost reduction
* Tradeoff analysis

Instead of simply rejecting an over-budget itinerary, it should propose alternatives.

Example:

```text
Current cost: ₹1,92,000

Cheaper hotel:
-₹14,000
Preference impact: -3

Cheaper transport:
-₹7,000
Preference impact: -1

Remove Osaka day:
-₹27,000
Preference impact: -14
```

---

## Agent 6: Local Intelligence Agent

Provides destination-specific context.

Responsibilities:

* Local customs
* Etiquette
* Cultural awareness
* Payment methods
* Scams
* Safety considerations
* Local food
* Useful phrases
* Local recommendations
* Cultural context

For MVP, this should remain an enrichment layer rather than becoming a separate conversational travel assistant.

---

## Agent 7: Simulation & Risk Agent

Simulates the proposed trip before finalization.

Responsibilities:

* Fatigue
* Walking load
* Energy levels
* Crowd exposure
* Weather risk
* Schedule feasibility
* Delays
* Closure risk
* Budget risk
* Transfer complexity
* Overall experience quality

The system maintains a structured traveler state, for example:

```json
{
  "energy": 0.72,
  "fatigue": 0.31,
  "walking_tolerance": 0.35,
  "crowd_tolerance": 0.20,
  "food_interest": 0.91,
  "photography_interest": 0.88
}
```

Activities modify this state during simulation.

---

## Agent 8: Optimization Agent

The master decision-maker.

Other agents generate proposals, evaluations, constraints, and alternatives.

The Optimization Agent determines the best overall itinerary.

It balances:

* Preference satisfaction
* Experience quality
* Comfort
* Feasibility
* Cost
* Fatigue
* Regret
* Authenticity
* Logistics

Conceptually:

```text
Candidate Experiences
        ↓
Mobility Evaluation
        ↓
Cost Evaluation
        ↓
Simulation
        ↓
Optimization
        ↓
Final Itinerary
```

The optimization should use a structured scoring/objective system rather than asking an LLM to arbitrarily decide which itinerary "feels best."

---

## Agent 9: Narrative & Explanation Agent

Converts the structured optimized itinerary into a human-readable plan.

Responsibilities:

* Daily itinerary writing
* Experience descriptions
* Decision explanations
* Tradeoff explanations
* "Why this hotel?"
* "Why this activity?"
* "Why was this removed?"
* Summarize optimization decisions

Example:

> This hotel costs ₹2,800 more per night, but reduces average daily transit by 46 minutes and places you closer to your preferred photography districts.

---

## Agent 10: Continuous Replanning Agent

Handles changes after the initial itinerary has been created.

Triggers:

* Flight delay
* Weather change
* Attraction closure
* Budget change
* Trip duration change
* User fatigue
* User preference change
* Additional traveler
* Removed traveler

Process:

```text
Existing Itinerary
        ↓
Changed Condition
        ↓
Identify Affected Components
        ↓
Generate Alternatives
        ↓
Mobility / Cost Evaluation
        ↓
Simulation
        ↓
Optimization
        ↓
Updated Itinerary
```

The replanner should preserve high-value experiences and avoid unnecessary changes to unaffected parts of the trip.

---

# 8. Core System Flow

```text
USER
  ↓
DISCOVERY AGENT
  ↓
TRAVELER PROFILE
  ↓
CONSTRAINT & PREFERENCE AGENT
  ↓
DESTINATION / COUNTRY PLANNING
  ↓
CITY ALLOCATION
  ↓
EXPERIENCE DESIGNER
  ↓
MOBILITY + COST + LOCAL INTELLIGENCE
  ↓
CANDIDATE ITINERARY
  ↓
SIMULATION & RISK
  ↓
OPTIMIZATION
  ↓
NARRATIVE & EXPLANATION
  ↓
FINAL PERSONALIZED ITINERARY
```

For changes:

```text
FINAL ITINERARY
      ↓
NEW CONDITION
      ↓
CONTINUOUS REPLANNING AGENT
      ↓
AFFECTED ACTIVITIES
      ↓
ALTERNATIVES
      ↓
SIMULATION
      ↓
OPTIMIZATION
      ↓
UPDATED ITINERARY
```

---

# 9. Core Philosophy

The system should optimize for:

> **The quality of the traveler's experience, not simply the number of places visited.**

The planner should answer:

> "Given this particular traveler, their constraints, their preferences, their energy, their budget, and the current conditions, what itinerary maximizes the value of this trip?"

rather than:

> "What are the most popular attractions in this destination?"

The final goal is for two people visiting the same destination with the same budget and duration to potentially receive substantially different itineraries because their **Traveler Profiles and optimization objectives are different**.

---

# 10. Explicitly Out of MVP Scope

The following are not independent MVP features:

* Travel Movie / cinematic preview
* Smart packing list
* Full conversational Local Guide
* Full language-learning assistant
* Booking system
* Payment processing
* Social travel network
* Hotel booking platform
* Flight booking platform
* Comprehensive worldwide destination coverage
* Fully autonomous interaction with every external travel service

They may be added later, but the MVP is centered on:

1. **Personalized Trip Generation**
2. **Simulation + Human-Centric Optimization**
3. **Dynamic Replanning**

with the **10-agent architecture** operating underneath these three capabilities.

---

# 11. Implementation Stack (Final — 2026-08-13)

> Committed per [mgmt/knowledge/decisions/2026-08-13-architecture-grill.md](mgmt/knowledge/decisions/2026-08-13-architecture-grill.md) (Final). See [docs/SYSTEM_CONTRACT.md §10](docs/SYSTEM_CONTRACT.md#10-implementation-decisions-final--2026-08-13).

- **Runtime & API:** TypeScript — Express (REST Command API per `docs/json/openapi.json`) + Socket.IO (real-time `PlanningEvent` feed complementing `GET /planning-runs/{runId}/events`).
- **Persistence:** MongoDB via Mongoose — `TripState` stored as immutable versioned documents (`trip_id`/`version`/`parent_version` indexed, `schema_version` validated, parity with `docs/json/schemas/trip-state.schema.json`).
- **Orchestration boundary:** Product orchestrator (this repo, `docs/SYSTEM_CONTRACT.md`) ≠ management orchestrator (`mgmt/orchestrator/`, Python, recommendation-only over GitHub Issues).
- **Data & freshness:** Curated Experience Knowledge Base primary (Aishwarya); external facts carry `source/observed_at/fresh_until/confidence`; stale allowed only when hard feasibility verifiable.
- **Optimization:** Config-driven normalized weights (`0..100` per component, `overall_score` composite, `candidate_id` tie-break, ≤3 candidates).
- **Deployment & auth:** Manual deployment (no containers/managed platform) in MVP; no authentication/user accounts (out of scope); env-based secrets/logging under Supreet.
