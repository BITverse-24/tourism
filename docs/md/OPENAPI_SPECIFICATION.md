# API Specification — OpenAPI 3.1.0 Contract

- **OpenAPI Version:** `3.1.0`
- **API Version:** `1.0.0`
- **Title:** Agentic Travel Planner Contract API
- **Description:** Asynchronous command endpoints and read APIs for immutable trip versions and progress events.
- **Machine-Readable Source:** [`docs/json/openapi.json`](file:///Users/krishay/projects/tourism/docs/json/openapi.json)

---

## 🌐 Overview & Core Principles

The API boundary follows an **Asynchronous Command / Read Model Architecture**:

1. **Commands (POST)**: Initiates long-running asynchronous agent execution or state transitions. Returns HTTP `202 Accepted` with a `RunAccepted` payload containing `trip_id`, `run_id`, and initial run `status`.
2. **Queries (GET)**: Fetches immutable state versions (`TripState`), run progress status (`PlanningRun`), summary version listings (`TripVersionSummary`), or real-time event feeds (`PlanningEvent`).
3. **No Side-Effects in External Domains**: Booking, payment processing, scraping, and user interface state management are strictly excluded from this API contract.

---

## 🗺️ Path Registry Summary

| HTTP Method | Endpoint Path | Operation ID | Request Body | Success Response | Description |
|---|---|---|---|---|---|
| `POST` | `/trips` | `createTrip` | [`CreateTripCommand`](#createtripcommand) | `201 Created` → `TripState` | Create a new trip draft with initial request parameters. |
| `POST` | `/trips/{tripId}/discovery-answers` | `submitDiscoveryAnswers` | [`DiscoveryAnswersCommand`](#discoveryanswerscommand) | `202 Accepted` → `RunAccepted` | Submit traveler responses to discovery questions. |
| `POST` | `/trips/{tripId}/planning-runs` | `startPlanningRun` | *None* | `202 Accepted` → `RunAccepted` | Initiate an asynchronous multi-agent planning workflow run. |
| `GET` | `/planning-runs/{runId}` | `getPlanningRun` | *None* | `200 OK` → `PlanningRun` | Read status, progress, questions, and relaxation options for a run. |
| `POST` | `/planning-runs/{runId}/constraint-relaxations` | `resolveConstraintRelaxation` | `{ option_id: string }` | `202 Accepted` → `RunAccepted` | Accept a constraint relaxation option to resume an infeasible run. |
| `GET` | `/trips/{tripId}/versions` | `listTripVersions` | *None* | `200 OK` → `TripVersionSummary[]` | List immutable published itinerary versions for a trip. |
| `GET` | `/trips/{tripId}/versions/{version}` | `getTripVersion` | *None* | `200 OK` → `TripState` | Fetch a full immutable `TripState` snapshot for a version. |
| `POST` | `/trips/{tripId}/alternatives/{candidateId}/select` | `selectAlternative` | *None* | `202 Accepted` → `RunAccepted` | Select a candidate alternative and publish it as the new active version. |
| `POST` | `/trips/{tripId}/replans` | `requestReplan` | [`ReplanningRequest`](#replanningrequest) | `202 Accepted` → `RunAccepted` | Trigger a mid-trip replanning run due to weather, delay, or budget changes. |
| `GET` | `/planning-runs/{runId}/events` | `listRunEvents` | *None* | `200 OK` → `PlanningEvent[]` | Fetch ordered stream of execution events for a run. |

---

## 📑 Detailed Endpoint Reference

### 1. `POST /trips`
- **Operation ID:** `createTrip`
- **Request Body:** [`CreateTripCommand`](#createtripcommand)
  ```json
  {
    "trip_request": {
      "request_id": "req_001",
      "destination_query": "Kyoto",
      "start_date": "2026-10-10",
      "end_date": "2026-10-13",
      "travelers": 2,
      "budget": { "amount": 85000, "currency": "INR" }
    }
  }
  ```
- **Response:** `201 Created` returning the initial [`TripState`](TRIP_STATE_SCHEMA.md) object in `draft` status.

---

### 2. `POST /trips/{tripId}/discovery-answers`
- **Operation ID:** `submitDiscoveryAnswers`
- **Path Parameter:** `tripId` (String)
- **Request Body:** [`DiscoveryAnswersCommand`](#discoveryanswerscommand)
  ```json
  {
    "answers": {
      "pace_preference": "balanced",
      "dietary_restrictions": ["vegetarian"]
    }
  }
  ```
- **Response:** `202 Accepted` returning `RunAccepted` (`{ trip_id, run_id, status }`).

---

### 3. `POST /trips/{tripId}/planning-runs`
- **Operation ID:** `startPlanningRun`
- **Path Parameter:** `tripId` (String)
- **Description:** Triggers the multi-agent pipeline (Discovery → Constraints → Experience Designer → Mobility/Cost/Local → Simulation → Optimization → Narrative).
- **Response:** `202 Accepted` returning `RunAccepted`.

---

### 4. `GET /planning-runs/{runId}`
- **Operation ID:** `getPlanningRun`
- **Path Parameter:** `runId` (String)
- **Response:** `200 OK` returning [`PlanningRun`](TRIP_STATE_SCHEMA.md#planningrun) object.
  - Statuses: `queued`, `running`, `awaiting_user_decision`, `completed`, `failed`.

---

### 5. `POST /planning-runs/{runId}/constraint-relaxations`
- **Operation ID:** `resolveConstraintRelaxation`
- **Path Parameter:** `runId` (String)
- **Request Body:**
  ```json
  {
    "option_id": "relax_budget_10k"
  }
  ```
- **Response:** `202 Accepted` returning `RunAccepted`.

---

### 6. `GET /trips/{tripId}/versions`
- **Operation ID:** `listTripVersions`
- **Path Parameter:** `tripId` (String)
- **Response:** `200 OK` returning array of `TripVersionSummary`:
  ```json
  [
    {
      "trip_id": "trip_kyoto_001",
      "version": 1,
      "parent_version": null,
      "status": "planned",
      "created_at": "2026-08-09T09:04:00+05:30"
    }
  ]
  ```

---

### 7. `GET /trips/{tripId}/versions/{version}`
- **Operation ID:** `getTripVersion`
- **Path Parameters:** `tripId` (String), `version` (Integer ≥ 1)
- **Response:** `200 OK` returning canonical [`TripState`](TRIP_STATE_SCHEMA.md).

---

### 8. `POST /trips/{tripId}/alternatives/{candidateId}/select`
- **Operation ID:** `selectAlternative`
- **Path Parameters:** `tripId` (String), `candidateId` (String)
- **Description:** Promotes a retained alternative candidate to active status, spawning a successor version snapshot.
- **Response:** `202 Accepted` returning `RunAccepted`.

---

### 9. `POST /trips/{tripId}/replans`
- **Operation ID:** `requestReplan`
- **Path Parameter:** `tripId` (String)
- **Request Body:** [`ReplanningRequest`](TRIP_STATE_SCHEMA.md#replanningrequest)
  ```json
  {
    "request_id": "replan_001",
    "type": "weather",
    "occurred_at": "2026-10-10T06:00:00+09:00",
    "description": "Heavy rain forecast for outdoor photography.",
    "affected_activity_ids": ["fushimi_sunrise"]
  }
  ```
- **Response:** `202 Accepted` returning `RunAccepted`.

---

### 10. `GET /planning-runs/{runId}/events`
- **Operation ID:** `listRunEvents`
- **Path Parameter:** `runId` (String)
- **Response:** `200 OK` returning ordered array of [`PlanningEvent`](TRIP_STATE_SCHEMA.md#planningevent) items.

---

## 🏛️ Schemas & Component Wrappers

All command payloads refer directly to `$defs` in [`docs/json/schemas/trip-state.schema.json`](file:///Users/krishay/projects/tourism/docs/json/schemas/trip-state.schema.json).

| Component | Base Reference | Description |
|---|---|---|
| `CreateTripCommand` | `#/$defs/TripRequest` | Wraps initial trip request fields. |
| `DiscoveryAnswersCommand` | Freeform Object | Key-value dictionary of discovery answers. |
| `RunAccepted` | Local Schema | `{ trip_id: string, run_id: string, status: enum }` |
| `TripVersionSummary` | Local Schema | Version summary header for listing versions. |
