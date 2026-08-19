# Knowledge Datasets

**Status:** Knowledge data contracts — Phase 4
**Document revision:** 1.1 — City (§1) + Attraction (§2 MVP locked)
**Related contracts:** [Traveler Profile](TRAVELER_PROFILE_SCHEMA.md) · [Final Trip Plan](FINAL_TRIP_PLAN_SCHEMA.md) · [System Contract](SYSTEM_CONTRACT.md) · [Agent Architecture](AGENT_ARCHITECTURE.md)

## Overview

The planner depends on curated knowledge data to ground every decision in evidence rather than model invention. This document defines the file-based datasets that the retrieval services, deterministic engines, and reasoning agents consume.

Two datasets are defined for the current knowledge-data phase (MVP):

| # | Dataset | Purpose | Status |
|---|---|---|---|
| 1 | **City Knowledgebase** | Canonical geographic, climatic, logistical, and tourism-planning facts for each Indian city in scope. Single source of truth for routing, allocation, and feasibility. | **Specified — §1** |
| 2 | **Attraction Knowledgebase** | Curated, researched facts and semantic metadata for individual attractions/POIs, linked to cities. Consumed by the Candidate Design Agent for itinerary composition and by Simulation/Cost/Narrative components for feasibility and explanation. | **Specified — §2 (MVP locked)** |

Both datasets are delivered as portable flat files — **CSV or JSON** — suitable for retrieval, validation, and versioned loading without a live database. This document fully specifies both datasets. §3 defines shared conventions; §4 lists references.

---

## 1. Dataset 1 — City Knowledgebase

### 1.1 Objective

Generate a city-knowledge dataset using the schema in §1.4. Each record represents one Indian city and consolidates the geographic, administrative, and tourism-planning facts required by planning, simulation, and explanation.

### 1.2 Context

The previous generation included multiple fields and values that were **scale-independent, redundant, and ambiguous** — for example, free-form region or climate labels, derived scores presented as facts, and overlapping tourism-type vocabularies. Those defects caused inconsistent retrieval, non-comparable scoring, and hallucinated alternatives.

This revision corrects that by:

- constraining categorical fields to **controlled taxonomies** (`region`, `climate_type`, `destination_type`, `tourism_popularity`);
- separating **qualitative classifications** (e.g., `tourism_popularity`) from calculated scores;
- removing derived or scale-dependent fields in favor of sourceable facts;
- requiring **practical gateway** semantics for transport fields rather than naive nearest-point lookups;
- enforcing **stable, human-readable identity** (`city_id`) across future updates.

### 1.3 Expected Output

- **Format:** CSV or JSON — one record per city. Either format must encode the full schema in §1.4 without loss. JSON is preferred for `destination_type` arrays; CSV must encode the array as a delimited or JSON-encoded array field.
- **Delivery:** File sent via DMs for review before ingestion into the Retrieval service.
- **Quality bar:** Every field is sourced or classified per its description; no invented IATA codes, station codes, or coordinates.

### 1.4 Dataset Description

**Grain:** One row per city. A city is the principal urban area as commonly recognized for tourism, not the full municipal or metropolitan boundary.

**Coverage:** Indian cities and union-territory capitals/centers that are valid destinations or transit hubs for the planner. Coverage expands monotonically; existing `city_id` values never change (§1.5).

**Intended consumers:**

- **Candidate Design Agent** — selects route, city allocations, and gateway transport.
- **Mobility Engine** — validates inter-city moves and geographic feasibility using `latitude`/`longitude`/`elevation_m` and gateway fields.
- **Simulation & Objective Optimizer** — scores climate fit, destination-type alignment with traveler preferences, and duration feasibility via `recommended_days_min`/`max`.
- **Narrative/Explanation Agent** — surfaces `climate_type`, `destination_type`, and `tourism_popularity` in fit explanations and tradeoff prose.
- **Discovery/Profile tooling** — maps a traveler’s `resolved_destination` to a known `city_id`.

**Why this dataset exists (reasons):**

1. **Grounding.** Every city referenced in a `Final Trip Plan` (`destination_route`, `city_allocations`, `days[].place`) must resolve to a knowledge record. This eliminates invented places and stabilizes evaluation.
2. **Comparability.** Controlled taxonomies for `region`, `climate_type`, `destination_type`, and `tourism_popularity` make multi-city comparison, filtering, and preference matching deterministic.
3. **Practical logistics.** `primary_airport` / `primary_railway_station` encode traveler-realistic gateways, not geographic trivia. This prevents plans that route through unusable airports or minor halts.
4. **Duration planning.** `recommended_days_min` / `max` give the optimizer a bounded, human-calibrated allocation signal per city, independent of travel-to-city time.
5. **Stability.** A `city_id` that never changes allows `Traveler Profile`, `Final Trip Plan`, and the Attraction Knowledgebase to join reliably across releases.

**Non-goals:** The dataset does not store hotel inventory, attraction listings beyond city scope, live schedules, fares, or per-POI opening hours. Those belong to the Attraction Knowledgebase and provider layers.

### 1.5 Schema

All 16 fields are **required** unless a reliable official value does not exist (station code for a city without meaningful rail service — record as empty/null with provenance note, do not invent).

| Field | Datatype | Required | Description |
|---|---|---|---|
| `city_id` | `string` | Yes | Unique, stable identifier in `city_state` format, lowercase, spaces replaced by underscores. Example: `shimla_himachal_pradesh`. Must remain unchanged across future updates. |
| `city_name` | `string` | Yes | Commonly recognized official English name of the city. Do not include state, region, country, or descriptive labels. Example: `Shimla`. |
| `state` | `string` | Yes | Official Indian state or union territory containing the city. Example: `Himachal Pradesh`. |
| `region` | `string` | Yes | Project-standardized geographic region taxonomy. Use only established values such as `North India`, `South India`, `East India`, `West India`, `Northeast India`. Do not create a new region for an individual city. |
| `latitude` | `number` | Yes | Latitude of the city's representative urban center in decimal degrees. North is positive, south is negative. Sourced from a reliable geographic or official source. Do not manually estimate. |
| `longitude` | `number` | Yes | Longitude of the city's representative urban center in decimal degrees. East is positive, west is negative. Sourced from a reliable geographic or official source. Do not manually estimate. |
| `elevation_m` | `number` | Yes | Approximate elevation of the principal urban area above mean sea level, in metres. For cities with significant variation, use the representative elevation of the main urban area, not the highest municipal point. |
| `climate_type` | `string` | Yes | Prevailing climate classification using the project's standardized climate taxonomy. Describes the general climate, not temporary weather. Use controlled values such as `Tropical`, `Arid`, `Semi-Arid`, `Temperate`, `Mediterranean`, `Subtropical`, `Alpine`, etc. Do not invent city-specific categories. |
| `destination_type` | `array[string]` | Yes | Major tourism characteristics of the destination. Use only values from the controlled taxonomy such as `Heritage`, `Beach`, `Mountain`, `Nature`, `Wildlife`, `Adventure`, `Religious`, `Cultural`, `Urban`, `Wellness`, `Nightlife`, `Food`, `Shopping`. Multiple values allowed. Assign only types genuinely significant to the city's tourism identity. |
| `tourism_popularity` | `string` | Yes | Overall tourism demand classification using the controlled taxonomy, e.g. `Very High`, `High`, `Moderate`, `Low`, `Very Low`. Qualitative, based on established significance, visitor demand, and reliable sources — not a calculated score. |
| `primary_airport` | `string` | Yes | Primary practical passenger airport normally used to reach the city. Select on scheduled commercial service, connectivity, traveler usage, and practical access — not mere geographic proximity. Use the official airport name. |
| `primary_airport_iata` | `string` | Yes | Official three-letter IATA code corresponding to `primary_airport`. Do not invent, infer, or approximate. |
| `primary_railway_station` | `string` | Yes | Primary practical passenger railway station normally used to reach the city. Prefer the principal station with meaningful passenger service and relevance to arrivals. Use the official station name. |
| `primary_railway_station_code` | `string` | Yes* | Official railway station code for `primary_railway_station`, where a reliable official code exists. Do not invent or approximate. *Empty/null only when no meaningful code exists, with provenance note. |
| `recommended_days_min` | `integer` | Yes | Minimum full days generally required for a worthwhile first-time visit covering major attractions and experiences. Tourism planning recommendation, not a calculation. Excludes travel-to/from-city time. |
| `recommended_days_max` | `integer` | Yes | Maximum full days generally recommended for a comprehensive visit without filling time with low-value activities. Tourism planning recommendation. Must be `>= recommended_days_min`. Excludes travel-to/from-city time. |

#### Field details and reasons

**`city_id` — `string`**
Stable identity is the join key for every downstream artifact: `Traveler Profile.resolved_destination`, `Final Trip Plan.destination_route[].place` / `city_allocations[].place`, and the Attraction Knowledgebase foreign key. Lowercase `city_state` with underscores avoids case/space ambiguity and keeps diffs readable. Stability across updates is a hard invariant — renaming a city must not change its ID.

**`city_name` — `string`**
Display name without qualifiers. Concatenating state/region/country in the name would duplicate `state`/`region` and break display, search, and deduplication. Example: `Shimla`, not `Shimla, Himachal Pradesh`.

**`state` — `string`**
Administrative truth. Must match the official state/UT name (e.g., `Himachal Pradesh`, `Jammu and Kashmir`, `Ladakh`, `Delhi`). Required for grouping, filtering, and for constructing `city_id`.

**`region` — `string` (controlled)**
Project-standardized macro-region. Constraining to `North India`, `South India`, `East India`, `West India`, `Northeast India` (and `Central India` if the project adopts it) prevents the previous one-off region per city. Reason: enables comparable regional reasoning and balanced multi-region itineraries.

**`latitude` / `longitude` — `number` (decimal degrees)**
Single representative point for the urban center, not a bounding box or municipal centroid. Sourced from a reliable gazetteer or official survey. North/East positive is the standard convention. Do not estimate — estimation introduced the prior generation’s coordinate drift. Used for distance, bearing, and map display; not for turn-by-turn routing.

**`elevation_m` — `number` (metres)**
Representative urban elevation, not the municipal high point. Elevation informs climate interpretation, mobility burden, and acclimatization warnings. Metres above mean sea level is the unambiguous unit. Source from a reliable geographic or official source.

**`climate_type` — `string` (controlled)**
General climate, not weather. Controlled taxonomy (`Tropical`, `Arid`, `Semi-Arid`, `Temperate`, `Mediterranean`, `Subtropical`, `Alpine`, `Humid Subtropical`, etc.) replaces free-form descriptions. Reason: allows preference matching (e.g., traveler avoids `Arid` heat) and simulation without brittle string parsing.

**`destination_type` — `array[string]` (controlled, multi-valued)**
Tourism identity tags. Taxonomy is `Heritage`, `Beach`, `Mountain`, `Nature`, `Wildlife`, `Adventure`, `Religious`, `Cultural`, `Urban`, `Wellness`, `Nightlife`, `Food`, `Shopping`. Multi-valued because a city like Jaipur is both `Heritage` and `Cultural` and `Shopping`. Only genuinely significant types are assigned — over-tagging recreates the previous redundancy.

**`tourism_popularity` — `string` (controlled, qualitative)**
Demand classification: `Very High`, `High`, `Moderate`, `Low`, `Very Low`. Qualitative and source-informed, not a computed score. Keeps popularity comparable without implying false precision. Used for crowd-tolerance reasoning and expectation setting.

**`primary_airport` / `primary_airport_iata` — `string`**
Practical gateway, not closest point. A geographically nearest airstrip with no scheduled service is not the primary airport. Official name + verified IATA code. Reason: prevents infeasible flight legs and grounds cost/mobility estimates. Never invent an IATA code — leave empty with a note if no practical airport exists (rare for covered cities).

**`primary_railway_station` / `primary_railway_station_code` — `string`**
Same practicality rule for rail. Prefer the principal passenger station travelers actually use. Official code where it exists; do not approximate. Reason: grounds rail-based movement and transfer complexity.

**`recommended_days_min` / `recommended_days_max` — `integer`**
Human-calibrated planning bounds for a first-time visit, excluding travel-to/from-city time. `max >= min` is a validation invariant. Reason: gives the Candidate Design Agent and optimizer a defensible allocation range without pretending to calculate it from attraction counts. A city with `1–2` days and one with `3–5` days produce fundamentally different route structures.

### 1.6 Validation Rules

- `city_id` matches `^[a-z]+(_[a-z]+)*_[a-z]+(_[a-z]+)*$`, is unique, and is stable across releases.
- `city_id` equals `lower(city_name with spaces→_) + "_" + lower(state with spaces→_)` at creation; later renames do not change it.
- `region`, `climate_type`, `destination_type` values, and `tourism_popularity` are members of their controlled taxonomies; no free-form variants.
- `destination_type` is non-empty, deduplicated, and contains only significant types.
- `latitude` in `[-90, 90]`, `longitude` in `[-180, 180]`; both are numbers, not strings; not null.
- `elevation_m` is a finite number (integer or decimal) in metres; negative only for below-sea-level locales with provenance.
- `primary_airport_iata` matches `^[A-Z]{3}$` when present; verified against the official IATA list.
- `primary_railway_station_code` matches the official code pattern when present; no invented codes.
- `recommended_days_min >= 1`, `recommended_days_max >= recommended_days_min`; both integers.
- No field is silently defaulted — unknown sourceable facts are left explicit with a provenance note for review.

### 1.7 Example Record (JSON)

```json
{
  "city_id": "shimla_himachal_pradesh",
  "city_name": "Shimla",
  "state": "Himachal Pradesh",
  "region": "North India",
  "latitude": 31.1048,
  "longitude": 77.1734,
  "elevation_m": 2276,
  "climate_type": "Subtropical Highland",
  "destination_type": ["Mountain", "Heritage", "Nature"],
  "tourism_popularity": "High",
  "primary_airport": "Chandigarh Airport",
  "primary_airport_iata": "IXC",
  "primary_railway_station": "Kalka Railway Station",
  "primary_railway_station_code": "KLK",
  "recommended_days_min": 2,
  "recommended_days_max": 3
}
```

CSV equivalent encodes `destination_type` as a JSON array string or a documented delimiter (e.g., `Mountain|Heritage|Nature`) with the same field order and header row.

### 1.8 Usage Notes

- Retrieval should index `city_id`, `city_name`, `state`, `region`, `destination_type`, and `climate_type` for filtering.
- `Final Trip Plan` validation must reject any `destination_route[].place` or `city_allocations[].place` that does not resolve to a `city_id`.
- Attraction records in Dataset 2 foreign-key to `city_id`; do not join on display name.
- Coordinates and elevation are for planning and display, not for authoritative navigation or altitude-critical safety decisions.

---

## 2. Dataset 2 — Attraction Knowledgebase (MVP Locked)

> **Scope — MVP locked.** This version contains **destination facts and useful semantic metadata only**. No experience generation, route planning, attraction clustering, or derived scores.

### 2.1 Objective

Generate a researched attraction-knowledge dataset using the schema in §2.5. Each record represents one visitable attraction/POI within an Indian city and consolidates the factual, geographic, temporal, and semantic metadata required for evidence-backed candidate selection, feasibility checks, and explanation — without prescribing itineraries.

### 2.2 Context

The City Knowledgebase answers *where* and *how long* (city-level grounding). The Attraction Knowledgebase answers *what to do there* (POI-level grounding). Separating them keeps geographic facts stable while allowing attractions to be added, corrected, or seasonally annotated without invalidating city identity or forcing a city-file revision. Prior generators mixed facts with derived scores, routes, and recommendations; this MVP explicitly excludes all of those.

### 2.3 Expected Output

- **Format:** CSV or JSON — one record per attraction. Either format must encode the full schema in §2.5 without loss. JSON is preferred for `array[string]` fields; CSV must encode arrays as JSON array strings or a documented delimiter.
- **Delivery:** File sent via DMs for review before ingestion into the Retrieval / Candidate Design path (same review-then-ingest path as Dataset 1).
- **Quality bar:** Every factual/semantic field is sourced or classified per its description; no invented coordinates, names, or taxonomy values. Optional fields are left empty when reliable evidence is unavailable — never guessed.

### 2.4 Dataset Description

**Grain:** One row per attraction/POI (fort, temple, museum, beach, waterfall, market, viewpoint, national park, etc.).

**Coverage:** Attractions belonging to cities present in the City Knowledgebase. Every `city_id` must resolve to `City Knowledgebase.city_id` — never create a new city ID here. Coverage expands monotonically; existing `attraction_id` values never change.

**Intended consumers:**

- **Candidate Design Agent** — selects and sequences attractions within city day plans.
- **Mobility / Simulation / Cost engines** — checks `visit_duration_*`, `indoor_outdoor`, `accessibility_level`, `adventure_level`, `best_time_of_day`, `best_months`/`avoid_months`, and crowd/tourism signals for feasibility, fatigue, and seasonality.
- **Narrative/Explanation Agent** — surfaces `description`, `significance`, `discovery_category`, `local_authenticity`, `photography_value`, and `best_for` in fit explanations and tradeoff prose.
- **Discovery/Profile tooling** — maps traveler interests (`best_for`, `attraction_type`/`subtypes`, `significance`) to candidate attractions.

**Why this dataset exists (reasons):**

1. **POI grounding.** Every attraction referenced in a `Final Trip Plan` day item must resolve to a knowledge record. This eliminates invented places and stabilizes evaluation.
2. **Comparability.** Controlled taxonomies for `attraction_type`, `significance`, `crowd_level`, `tourism_level`, `discovery_category`, `local_authenticity`, `photography_value`, `indoor_outdoor`, `adventure_level`, `accessibility_level`, suitability fields, `entry_type`, `best_for`, `best_time_of_day`, and months make filtering and preference matching deterministic.
3. **Temporal feasibility.** `visit_duration_min` / `typical` / `max` (minutes), plus `best_time_of_day` and `best_months`/`avoid_months`, give the planner bounded, human-calibrated time and seasonality signals per POI, independent of travel time.
4. **Human-centric suitability.** `family_suitability`, `elderly_suitability`, `child_suitability`, `romantic_suitability`, `accessibility_level`, and `adventure_level` encode who an attraction is appropriate for without requiring the planner to infer it from prose.
5. **Stability and provenance.** A stable `attraction_id` (`attraction_name_city_state`) and mandatory `source` + `last_updated` allow joins, audits, and freshness-aware retrieval across releases.

**Non-goals (MUST NOT include):** Experience pods, attraction combinations, routes, schedules, rankings, calculated scores, travel times, distances, or user-specific recommendations. Ticket prices are excluded; only the access model (`entry_type`) is stored.

### 2.5 Schema

All fields marked **Yes** are required. Optional fields are left empty/null when reliable evidence is unavailable — do not fabricate.

| Field | Data type | Required | Description / Generating Agent Instruction |
|---|---|---|---|
| `city_id` | `string` | Yes | The exact `city_id` from the City Knowledge Base to which this attraction belongs. Never create a new city ID here. |
| `attraction_id` | `string` | Yes | Create a unique, stable identifier using `attraction_name_{city_id}` in lowercase with spaces replaced by underscores. Example: `amber_fort_jaipur_rajasthan`. The ID must remain stable across updates. |
| `name` | `string` | Yes | The canonical English name of the attraction. Use the officially recognized or commonly established name. Do not append the city or state. |
| `alternate_names` | `array[string]` | No | Other established names for the attraction, including local names, historical names, transliterations, or commonly used spelling variants. Do not include arbitrary descriptions or invented aliases. |
| `attraction_type` | `string` | Yes | The primary category of the attraction. Must use a value from the project's controlled attraction taxonomy. Examples: `Fort`, `Temple`, `Museum`, `Beach`, `Waterfall`, `Market`, `Viewpoint`, `National_Park`. Select the category that best represents what the attraction fundamentally is. |
| `subtypes` | `array[string]` | No | More specific characteristics of the attraction. Use controlled taxonomy values where available. Example: a fort may have `Hill_Fort`, `Historic_Site`, and `Viewpoint`. Do not duplicate `attraction_type`. |
| `description` | `string` | Yes | Provide a concise, factual description explaining what the attraction is, what visitors encounter there, and its primary significance. Avoid promotional language, subjective praise, and itinerary recommendations. |
| `significance` | `array[string]` | Yes | Identify why the attraction is significant. Use controlled values such as `Historical`, `Architectural`, `Religious`, `Cultural`, `Archaeological`, `Natural`, `Ecological`, `Wildlife`, `Culinary`, `Scenic`, `Geological`, `Spiritual`, or `UNESCO_Heritage`. Multiple values are allowed. Only include genuinely relevant forms of significance. |
| `location_area` | `string` | Yes | Name the neighborhood, locality, district, area, or other commonly recognized part of the city where the attraction is located. Use the most useful human-readable locality rather than a full postal address. |
| `latitude` | `number` | Yes | Geographic latitude of the attraction in decimal degrees. Use a reliable geographic or official source. North is positive and south is negative. Do not manually estimate or calculate coordinates. |
| `longitude` | `number` | Yes | Geographic longitude of the attraction in decimal degrees. Use a reliable geographic or official source. East is positive and west is negative. Do not manually estimate or calculate coordinates. |
| `visit_duration_min` | `integer` | Yes | Minimum realistic time, in minutes, required for a meaningful visit. Do not represent the value as a string such as `1-2 hours`. |
| `visit_duration_typical` | `integer` | Yes | Typical time, in minutes, that a traveler would reasonably spend experiencing the attraction. Base this on the attraction's physical scale, content, activities, and typical visitor behavior. |
| `visit_duration_max` | `integer` | No | Reasonable maximum visit duration, in minutes, for a traveler who wants to explore the attraction thoroughly. Do not include unrelated waiting or travel time. |
| `best_time_of_day` | `array[string]` | No | Identify the most suitable times of day to visit based on factors such as lighting, weather, temperature, crowd patterns, wildlife activity, ceremonies, or operating characteristics. Use controlled values such as `Early_Morning`, `Morning`, `Afternoon`, `Late_Afternoon`, `Sunset`, `Evening`, `Night`, or `Anytime`. |
| `best_months` | `array[string]` | No | List the months that generally provide the best conditions or experience for visiting. Use full month names. Do not simply mark a month as "best" because it is popular. Consider weather, seasonal accessibility, natural phenomena, festivals, wildlife, and other attraction-specific factors. |
| `avoid_months` | `array[string]` | No | List months in which visiting is substantially less desirable because of weather, closures, extreme conditions, poor accessibility, or other significant factors. Do not populate this merely because another month is better. |
| `crowd_level` | `string` | Yes | Classify the typical crowd intensity at the attraction using the controlled values `Very_Low`, `Low`, `Moderate`, `High`, or `Very_High`. Consider normal visitor patterns rather than a single festival, holiday, or exceptional event. |
| `tourism_level` | `string` | Yes | Classify how prominent the attraction is within the tourism ecosystem using controlled values such as `Major_Tourist`, `Popular`, `Moderately_Touristed`, `Local`, or `Niche`. This describes tourism prominence, not crowd density. |
| `hidden_gem` | `boolean` | Yes | Set to `true` only if the attraction is genuinely lesser-known relative to the city's mainstream attractions while still providing meaningful tourism value. Do not use this merely because the attraction has few online reviews or because the agent did not previously know about it. |
| `discovery_category` | `string` | Yes | Classify the attraction's discovery character using controlled values such as `Must_See`, `Popular`, `Local_Favorite`, `Hidden_Gem`, `Offbeat`, `Seasonal`, `Special_Interest`, or `Worth_Detour`. Select the category that best describes how the attraction should be surfaced to travelers. |
| `local_authenticity` | `string` | Yes | Classify how strongly the attraction represents genuine local culture, traditions, environment, craftsmanship, or everyday life using `Very_High`, `High`, `Moderate`, `Low`, or `Very_Low`. Do not equate popularity with low authenticity. |
| `photography_value` | `string` | Yes | Classify the attraction's suitability for photography using `Very_High`, `High`, `Moderate`, `Low`, or `Very_Low`. Consider architecture, landscapes, viewpoints, cultural scenes, wildlife, lighting opportunities, and visual distinctiveness. |
| `indoor_outdoor` | `string` | Yes | Identify the primary physical environment of the attraction using `Indoor`, `Outdoor`, or `Mixed`. Use `Mixed` when both indoor and outdoor components are meaningful parts of the visit. |
| `adventure_level` | `string` | Yes | Classify the physical or adventure intensity using `None`, `Low`, `Moderate`, `High`, or `Extreme`. Consider trekking, climbing, water activities, difficult terrain, exposure, and other physical demands. Do not confuse adventure level with general walking requirements. |
| `accessibility_level` | `string` | Yes | Classify the physical difficulty of accessing and moving through the attraction using `Very_Easy`, `Easy`, `Moderate`, `Difficult`, or `Very_Difficult`. Consider stairs, terrain, elevation changes, walking distances, trails, and vehicle access. Do not make claims about disability accessibility unless reliable accessibility information exists. |
| `family_suitability` | `string` | Yes | Classify suitability for families traveling with children using `Excellent`, `Good`, `Moderate`, `Poor`, or `Unsuitable`. Consider safety, physical demands, content, facilities, and whether children are likely to find the attraction engaging. |
| `elderly_suitability` | `string` | Yes | Classify suitability for elderly travelers using `Excellent`, `Good`, `Moderate`, `Poor`, or `Unsuitable`. Consider walking distance, stairs, terrain, elevation, seating, and physical demands. |
| `child_suitability` | `string` | Yes | Classify suitability specifically for children using `Excellent`, `Good`, `Moderate`, `Poor`, or `Unsuitable`. Consider engagement, safety, physical demands, and age-appropriate content. |
| `romantic_suitability` | `string` | Yes | Classify suitability for couples seeking romantic experiences using `Excellent`, `Good`, `Moderate`, `Poor`, or `Unsuitable`. Base this on the attraction's setting, atmosphere, privacy, scenery, and activities rather than generic assumptions. |
| `booking_required` | `boolean` | No | Set to `true` when advance reservation or booking is normally required to access the attraction. Set to `false` when advance booking is generally unnecessary. Do not treat ordinary ticket purchase at the entrance as advance booking. |
| `entry_type` | `string` | Yes | Identify the general access/payment model using controlled values such as `Free`, `Paid`, `Donation`, `Restricted`, `Reservation_Required`, `Permit_Required`, or `Seasonal`. Do not include current ticket prices in this dataset. |
| `best_for` | `array[string]` | Yes | Identify traveler interests and trip motivations for which the attraction is particularly relevant. Use controlled values such as `History`, `Architecture`, `Culture`, `Religion`, `Spirituality`, `Nature`, `Wildlife`, `Adventure`, `Photography`, `Food`, `Shopping`, `Art`, `Local_Life`, `Nightlife`, `Relaxation`, `Families`, `Couples`, `Solo_Travel`, `Luxury`, `Budget_Travel`, `Backpacking`, or `Offbeat_Travel`. Multiple values are allowed. |
| `source` | `array[string]` | Yes | List the sources used to verify the attraction's factual information. Prefer official tourism departments, government sources, archaeological authorities, park authorities, religious institutions, museum websites, and other authoritative or reputable sources. |
| `last_updated` | `date` | Yes | Date on which the attraction record was last researched or materially updated. Use ISO format `YYYY-MM-DD`. |

#### Locked schema (compact)

```text
attraction_id              string
city_id                    string
name                       string
alternate_names            array[string]

attraction_type            string
subtypes                   array[string]
description                string
significance               array[string]

location_area              string
latitude                   number
longitude                  number

visit_duration_min         integer
visit_duration_typical     integer
visit_duration_max         integer

best_time_of_day           array[string]
best_months                array[string]
avoid_months               array[string]

crowd_level                string
tourism_level              string
hidden_gem                 boolean
discovery_category         string
local_authenticity         string

photography_value          string
indoor_outdoor             string
adventure_level            string
accessibility_level        string

family_suitability         string
elderly_suitability        string
child_suitability          string
romantic_suitability       string

booking_required           boolean
entry_type                 string

best_for                   array[string]

source                     array[string]
last_updated               date
```

#### Field details and reasons

**`attraction_id` — `string`**
Stable identity using `attraction_name_city_state` lowercase with underscores (e.g., `amber_fort_jaipur_rajasthan`). Mirrors `city_id` stability — joins and diffs remain readable and `Final Trip Plan` references never break after a name correction. Never regenerate on update.

**`city_id` — `string`**
Foreign key into City Knowledgebase. Must be an exact existing `city_id`; creating a city ID here would fork the city registry. Enables city-scoped filtering and guarantees every attraction belongs to a known geography.

**`name` / `alternate_names` — `string` / `array[string]`**
`name` is the canonical English name without city/state suffix (keeps display clean). `alternate_names` captures established variants (local, historical, transliteration) for recall without polluting search with invented aliases.

**`attraction_type` / `subtypes` — `string` / `array[string]`**
Primary category from a controlled attraction taxonomy (`Fort`, `Temple`, `Museum`, `Beach`, `Waterfall`, `Market`, `Viewpoint`, `National_Park`, etc.) plus optional specific characteristics (`Hill_Fort`, `Historic_Site`, `Viewpoint`). Controlled to avoid scale-independent free-form labels that broke prior retrieval. Do not duplicate `attraction_type` inside `subtypes`.

**`description` — `string`**
Concise factual explanation — what the attraction is, what visitors encounter, primary significance. No promotional language or itinerary advice. Keeps the dataset factual (system-level rule) so the Narrative Agent can generate recommendations separately.

**`significance` — `array[string]` (controlled)**
Why the attraction matters: `Historical`, `Architectural`, `Religious`, `Cultural`, `Archaeological`, `Natural`, `Ecological`, `Wildlife`, `Culinary`, `Scenic`, `Geological`, `Spiritual`, `UNESCO_Heritage`. Multi-valued; only genuinely relevant values. Distinct from `best_for` (traveler motivation) — significance is intrinsic to the place.

**`location_area` / `latitude` / `longitude` — `string` / `number`**
Human-readable locality (`location_area` — neighborhood/area, not postal address) plus sourced decimal-degree coordinates (north/east positive, no manual estimation). Area aids display; coordinates enable proximity reasoning without fabricating distances in the file.

**`visit_duration_min` / `typical` / `max` — `integer` (minutes)**
Bounded, realistic time for a meaningful visit. `min` = minimum worthwhile, `typical` = expected behavior given scale/content, `max` = thorough exploration. Integers in minutes (not `"1-2 hours"` strings) for deterministic scheduling. Excludes waiting/travel time. `max` is optional; when present must be `>= typical >= min`.

**`best_time_of_day` / `best_months` / `avoid_months` — `array[string]`**
Semantic temporal signals, not schedules. `best_time_of_day` uses `Early_Morning`, `Morning`, `Afternoon`, `Late_Afternoon`, `Sunset`, `Evening`, `Night`, `Anytime` based on light/weather/crowd/ceremony factors. `best_months`/`avoid_months` use full month names based on weather, accessibility, natural phenomena, festivals, wildlife — not mere popularity. `avoid_months` is populated only when a month is substantially less desirable (closure, extreme conditions), not merely because another month is better.

**`crowd_level` / `tourism_level` / `hidden_gem` / `discovery_category` / `local_authenticity` — `string`/`boolean`**
Four distinct, often-confused signals kept orthogonal: `crowd_level` (`Very_Low`..`Very_High`) = typical crowd intensity (not a single festival); `tourism_level` (`Major_Tourist`..`Niche`) = prominence in the tourism ecosystem (not density); `hidden_gem` (`boolean`) = genuinely lesser-known but valuable relative to the city's mainstream (not low review count); `discovery_category` (`Must_See`..`Worth_Detour`) = how to surface it; `local_authenticity` (`Very_High`..`Very_Low`) = representation of local culture/environment (not inversely correlated with popularity by rule).

**`photography_value` / `indoor_outdoor` / `adventure_level` / `accessibility_level` — `string`**
Experience-character signals for feasibility and matching: photography suitability, physical environment (`Indoor`/`Outdoor`/`Mixed`), adventure intensity (`None`..`Extreme` — physical demands, not walking), and access difficulty (`Very_Easy`..`Very_Difficult` — stairs/terrain/elevation/trails; no disability claims without evidence).

**`family_suitability` / `elderly_suitability` / `child_suitability` / `romantic_suitability` — `string`**
Suitability for distinct traveler groups using `Excellent`/`Good`/`Moderate`/`Poor`/`Unsuitable`. Each considers safety, physical demands, engagement, and facilities/atmosphere specific to that group. Kept separate because a family-friendly market may be `Poor` for elderly due to stairs.

**`booking_required` / `entry_type` — `boolean` / `string`**
Access model without prices. `booking_required` = advance reservation normally required (entrance ticket purchase ≠ advance booking). `entry_type` = `Free`/`Paid`/`Donation`/`Restricted`/`Reservation_Required`/`Permit_Required`/`Seasonal`. Prices are excluded to avoid staleness and scale variance.

**`best_for` — `array[string]` (controlled)**
Traveler-interest tags: `History`, `Architecture`, `Culture`, `Religion`, `Spirituality`, `Nature`, `Wildlife`, `Adventure`, `Photography`, `Food`, `Shopping`, `Art`, `Local_Life`, `Nightlife`, `Relaxation`, `Families`, `Couples`, `Solo_Travel`, `Luxury`, `Budget_Travel`, `Backpacking`, `Offbeat_Travel`. Multi-valued, motivation-oriented — complements `significance` for preference matching.

**`source` / `last_updated` — `array[string]` / `date`**
Provenance and freshness. `source` prefers official tourism departments, government/ASI, park/religious/museum authorities, and reputable sources. `last_updated` is `YYYY-MM-DD` ISO date of last research/material update — enables freshness-aware retrieval and staleness warnings.

### 2.6 Validation Rules

- `attraction_id` matches `^[a-z0-9]+(_[a-z0-9]+)*_[a-z]+(_[a-z]+)*_[a-z]+(_[a-z]+)*$` (lowercase `name_city_state` with underscores), is unique, and is stable across releases.
- `city_id` resolves to an existing `City Knowledgebase.city_id`; no orphan attractions.
- `name` is non-empty, does not include city/state suffix; `alternate_names` (when present) contains only established variants, deduplicated, no invented aliases.
- `attraction_type`, `subtypes`, `significance`, `best_time_of_day`, `best_months`, `avoid_months`, `crowd_level`, `tourism_level`, `discovery_category`, `local_authenticity`, `photography_value`, `indoor_outdoor`, `adventure_level`, `accessibility_level`, `family_suitability`, `elderly_suitability`, `child_suitability`, `romantic_suitability`, `entry_type`, `best_for` are members of their controlled taxonomies; no free-form variants.
- `significance` and `best_for` are non-empty, deduplicated; `subtypes` does not duplicate `attraction_type`.
- `latitude` in `[-90, 90]`, `longitude` in `[-180, 180]`; numbers, not strings; not null; sourced, not estimated.
- `visit_duration_min` and `visit_duration_typical` are positive integers (minutes); `visit_duration_max` when present is integer `>= visit_duration_typical`; all `>= visit_duration_min`; no string durations.
- `best_time_of_day` values in `{Early_Morning, Morning, Afternoon, Late_Afternoon, Sunset, Evening, Night, Anytime}`.
- `best_months` / `avoid_months` use full month names (`January`..`December`), deduplicated; no overlap between the two.
- `crowd_level` in `{Very_Low, Low, Moderate, High, Very_High}`; `tourism_level` in `{Major_Tourist, Popular, Moderately_Touristed, Local, Niche}`; `discovery_category` in `{Must_See, Popular, Local_Favorite, Hidden_Gem, Offbeat, Seasonal, Special_Interest, Worth_Detour}`.
- `local_authenticity` / `photography_value` in `{Very_High, High, Moderate, Low, Very_Low}`; `adventure_level` in `{None, Low, Moderate, High, Extreme}`; `accessibility_level` in `{Very_Easy, Easy, Moderate, Difficult, Very_Difficult}`.
- Suitability fields in `{Excellent, Good, Moderate, Poor, Unsuitable}`.
- `indoor_outdoor` in `{Indoor, Outdoor, Mixed}`; `entry_type` in `{Free, Paid, Donation, Restricted, Reservation_Required, Permit_Required, Seasonal}`.
- `hidden_gem` and `booking_required` (when present) are booleans, not strings.
- `source` is non-empty, deduplicated; `last_updated` matches `YYYY-MM-DD` and is not in the future.
- No derived fields: no pods, combinations, routes, schedules, rankings, scores, travel times, distances, or recommendations.

### 2.7 Example Record (JSON)

```json
{
  "attraction_id": "amber_fort_jaipur_rajasthan",
  "city_id": "jaipur_rajasthan",
  "name": "Amber Fort",
  "alternate_names": ["Amer Fort"],
  "attraction_type": "Fort",
  "subtypes": ["Hill_Fort", "Historic_Site", "Viewpoint"],
  "description": "A 16th-century hill fort northeast of Jaipur combining Rajput and Mughal architecture, with palaces, courtyards, ramparts, and views over Maota Lake.",
  "significance": ["Historical", "Architectural", "UNESCO_Heritage"],
  "location_area": "Amer",
  "latitude": 26.9855,
  "longitude": 75.8513,
  "visit_duration_min": 90,
  "visit_duration_typical": 150,
  "visit_duration_max": 210,
  "best_time_of_day": ["Morning", "Late_Afternoon"],
  "best_months": ["October", "November", "December", "January", "February", "March"],
  "avoid_months": ["May", "June"],
  "crowd_level": "Very_High",
  "tourism_level": "Major_Tourist",
  "hidden_gem": false,
  "discovery_category": "Must_See",
  "local_authenticity": "High",
  "photography_value": "Very_High",
  "indoor_outdoor": "Mixed",
  "adventure_level": "Low",
  "accessibility_level": "Moderate",
  "family_suitability": "Good",
  "elderly_suitability": "Moderate",
  "child_suitability": "Good",
  "romantic_suitability": "Good",
  "booking_required": false,
  "entry_type": "Paid",
  "best_for": ["History", "Architecture", "Culture", "Photography"],
  "source": ["Rajasthan Tourism (tourism.rajasthan.gov.in)", "Archaeological Survey of India"],
  "last_updated": "2026-08-15"
}
```

CSV equivalent encodes all `array[string]` fields as JSON array strings or a documented delimiter with the same header order.

### 2.8 Usage Notes

- Retrieval should index `city_id`, `attraction_type`, `subtypes`, `significance`, `discovery_category`, `best_for`, `tourism_level`, `crowd_level`, and `best_months` for filtering.
- `Final Trip Plan` day items that reference an attraction should resolve via `attraction_id` (or `city_id` + `name` disambiguation); do not invent attractions.
- Duration fields drive day-level scheduling feasibility; `indoor_outdoor` and `best_time_of_day`/`best_months` drive seasonality and weather-aware sequencing.
- Coordinates are for proximity and map display within a city, not for authoritative inter-city routing (use City coordinates for that).

### 2.9 System-Level Rule (applies to entire dataset)

> **The Attraction Knowledge Base must contain researched information about attractions, not itinerary recommendations. Do not create experience pods, attraction combinations, routes, schedules, rankings, calculated scores, travel times, distances, or user-specific recommendations. Do not fabricate information to fill missing fields. When reliable evidence is unavailable, leave an optional field empty rather than guessing.**

---

## 3. Cross-Dataset Conventions

- **IDs are stable.** `city_id` and `attraction_id` never change; future experience or accommodation IDs will be similarly stable.
- **Taxonomies are closed.** New categorical values require a document revision, not a per-row invention.
- **Sources over estimates.** Coordinates, IATA/station codes, and attraction facts must be sourced; duration bounds are calibrated recommendations, not calculations. When evidence is missing, leave optional fields empty — do not guess.
- **No derived data in knowledge files.** Knowledge datasets store facts and semantic metadata only — no pods, routes, scores, distances, travel times, or recommendations.
- **File delivery.** CSV and JSON are interchangeable serializations of the same logical schema. Either must validate against §1.6 and §2.6 without loss.
- **Versioning.** Each file release carries a revision marker; consumers validate against the `Document revision` in this file.

---

## 4. References

- [Traveler Profile](TRAVELER_PROFILE_SCHEMA.md) — normalized planning input.
- [Final Trip Plan](FINAL_TRIP_PLAN_SCHEMA.md) — user-facing itinerary output.
- [System Contract](SYSTEM_CONTRACT.md) — boundary between data and transport contracts.
- [Agent Architecture](AGENT_ARCHITECTURE.md) — three agents, ten stages, and deterministic engines that consume these datasets.
