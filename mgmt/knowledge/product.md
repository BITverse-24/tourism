# Product knowledge

**Sources:** [`README.md`](../../README.md), [`Traveler Profile`](../../docs/md/TRAVELER_PROFILE_SCHEMA.md), [`Final Trip Plan`](../../docs/md/FINAL_TRIP_PLAN_SCHEMA.md), and [`SYSTEM_CONTRACT.md`](../../docs/SYSTEM_CONTRACT.md).

## Vision and core principle

The product plans trips around the traveler rather than merely around the destination.

> Do not optimize only for where the traveler should go. Optimize for how the traveler wants to experience the journey.

The target output is a personalized sequence of experiences, not a generic attraction list.

## Traveler model

The system may account for personality and travel style, trip purpose, budget, energy, walking tolerance, food, photography, culture, nature, nightlife, crowd tolerance, pace, accommodation preferences, must-visit and avoid lists, comfort versus exploration, spontaneity, and regret associated with missing experiences.

The normalized post-discovery representation is the [Traveler Profile](../../docs/md/TRAVELER_PROFILE_SCHEMA.md). Unknowns, assumptions, and inferred preferences must remain explicit.

## User experience

1. The traveler supplies initial trip parameters.
2. Discovery asks adaptive follow-up questions.
3. The system presents a structured Traveler Profile.
4. Planning proposes destination allocation and daily experiences.
5. Evaluation and simulation expose feasibility, fatigue, walking, cost, and risk.
6. Optimization makes tradeoffs explicit.
7. Narrative explains why major decisions fit the profile.
8. The traveler receives a [Final Trip Plan](../../docs/md/FINAL_TRIP_PLAN_SCHEMA.md).
9. Changed conditions can trigger replanning in a later phase.

## Destination model

```text
Country → Region → City → Neighborhood → Experience / Activity / Restaurant / Attraction
```

Country requests require trip-level decisions about cities, days, order, inter-city movement, hotel changes, regional clustering, and budget allocation. City-level planning chooses experiences, restaurants, timing, sequence, walking, rest, crowds, and local transport.

## Experience Knowledge Base

The MVP requires a structured knowledge base with geography, experiences, and connections. The preferred atomic unit is an experience, such as “sunrise photography at Fushimi Inari,” rather than only the physical attraction.

Experience records should support identity and hierarchy, location, categories, duration, estimated cost, opening hours, best times, accessibility, preference attributes, experience attributes, and weather suitability. Connections should cover hotel-to-attraction, neighborhood-to-neighborhood, city-to-city, and airport-to-hotel movement.

The detailed knowledge-base contract is a later phase. Aishwarya may begin curated data work using the product concepts above, but integration requires an approved record and connection field list.

## Data source policy

Curated knowledge is the primary source for the MVP. External maps, places, transportation, and weather sources may supplement it when their provenance, freshness, and confidence are visible. LLM-assisted enrichment must be validated; important structured attributes must not be regenerated arbitrarily per traveler.

## Explicitly unknown product requirements

- Initial destination coverage.
- Provider choices and integration boundaries.
- Product runtime and persistence implementation.
- Public API and deployment details.
- Final optimization weights and evaluation dataset.
- User accounts, authentication, booking, and payments.
