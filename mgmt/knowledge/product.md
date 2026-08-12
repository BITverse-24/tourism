# Product knowledge

**Source:** [`README.md`](../../README.md). The canonical API and state details are in [`docs/SYSTEM_CONTRACT.md`](../../docs/SYSTEM_CONTRACT.md).

## Vision and core principle

The product plans trips around the traveler rather than merely around the destination. Its core principle is:

> Do not optimize only for where the traveler should go. Optimize for how the traveler wants to experience the journey.

The target output is a personalized sequence of experiences, not a generic attraction list.

## Traveler model

The system may account for personality/travel style, trip purpose, budget, energy, walking tolerance, food, photography, culture, nature, nightlife, crowd tolerance, pace, accommodation preferences, must-visit and avoid lists, comfort versus exploration, spontaneity, and regret associated with missing experiences.

## User experience

1. The traveler supplies initial trip parameters.
2. Discovery asks adaptive follow-up questions instead of a fixed questionnaire.
3. The system builds and exposes a structured Traveler Profile.
4. The planner proposes city/region allocation and daily experiences.
5. Simulation exposes fatigue, walking, cost, feasibility, and risk.
6. Optimization shows changes and tradeoffs.
7. Narrative explains why activities, hotels, routes, or removals were selected.
8. The traveler can introduce a changed condition and receive an updated plan.

## Destination model

The knowledge hierarchy is:

```text
Country → Region → City → Neighborhood → Experience / Activity / Restaurant / Attraction
```

Country requests first receive trip-level optimization: cities, days, order, inter-city transport, hotel changes, regional clustering, and budget allocation. City-level optimization then chooses experiences, attractions, restaurants, timing, sequence, walking, rest, crowds, and local transport.

## Experience Knowledge Base

The MVP requires a structured knowledge base with geography, experiences, and connections. The preferred atomic unit is an experience, such as “sunrise photography at Fushimi Inari,” rather than only the physical attraction.

Experience records should support:

- Identity and hierarchy: ID, name, country, region, city, neighborhood.
- Location: latitude and longitude.
- Categories: culture, photography, nature, food, nightlife, shopping, and other supported categories.
- Logistics: duration, estimated cost, opening hours, best times, accessibility.
- Preference scores: photography, culture, food, nature, nightlife, shopping.
- Experience attributes: authenticity, uniqueness, regret score, crowd level, walking intensity, comfort.
- Weather suitability by condition.

Connections should cover hotel-to-attraction, neighborhood-to-neighborhood, city-to-city, and airport-to-hotel movement, with mode, duration, cost, comfort, and transfer complexity.

## Data source policy

Potential sources are public datasets, maps/places, tourism, transportation, and weather APIs, web research, curated information, and LLM-assisted enrichment. LLM enrichment must be validated; important structured attributes must not be regenerated arbitrarily per user. Destination coverage should begin with a controlled, well-covered set; the exact destinations remain undecided.

## Explicitly unknown product requirements

The repository does not yet establish final destination coverage, provider choices, production runtime, persistence, deployment, authentication, user-account model, or exact optimization weights. The README’s conceptual fields and examples are guidance, not a license to invent final schemas.
