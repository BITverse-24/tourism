# Worked Integration Fixture — Planning Run & Replan Example

- **Fixture File:** [`docs/json/examples/planning-run.json`](file:///Users/krishay/projects/tourism/docs/json/examples/planning-run.json)
- **Purpose:** Synthetic end-to-end integration test fixture demonstrating an initial Kyoto trip planning run (Version 1) and a mid-trip weather replan trigger.

---

## ⛩️ Fixture Context: Kyoto Culture & Photography Trip

- **Trip ID:** `trip_kyoto_001`
- **Travelers:** 2 people
- **Duration:** 3 nights (2026-10-10 to 2026-10-13)
- **Budget Ceiling:** `INR 85,000`
- **Key Preferences:** Culture (weight `0.9`), Photography (weight `0.9`), Food (weight `0.6`)
- **Hard Constraints:** `must_visit: ["Fushimi Inari"]`, `avoid: ["late nightlife"]`, max 1 hotel change.

---

## 🏆 Initial Planning Run Candidates (Version 1)

The initial planning run evaluates candidate options and selects **Candidate A** as the active itinerary.

### Candidates Comparison Table

| Candidate Attribute | Candidate A (Active) | Candidate B (Alternative) |
|---|---|---|
| **Branch** | `initial` | `alternative` |
| **Rank** | **1** | **2** |
| **Total Cost** | `INR 79,200` | `INR 75,400` |
| **Overall Score** | **299** | **293** |
| **Preference Fit** | 91 | 88 |
| **Experience Quality** | 88 | 84 |
| **Comfort** | 82 | 86 |
| **Authenticity** | 86 | 80 |
| **Fatigue Penalty** | 18 | 14 |
| **Logistics Penalty**| 10 | 12 |
| **Confidence** | 0.87 | 0.84 |
| **Tradeoff Rationale**| Central hotel costs INR 4,000 more but saves 35 mins daily transit. | Lower cost, higher comfort, but misses sunrise photography window. |

---

## 🌧️ Weather Replanning Trigger Example

During the trip on Day 1 (`2026-10-10`), a sudden heavy rain forecast affects the scheduled outdoor photography activity (`fushimi_sunrise`).

```json
{
  "weather_replan_request": {
    "request_id": "replan_001",
    "type": "weather",
    "occurred_at": "2026-10-10T06:00:00+09:00",
    "description": "Heavy rain forecast for the outdoor photography day.",
    "affected_activity_ids": ["fushimi_sunrise"]
  }
}
```

### Replan Expectations & Requirements

```json
{
  "replan_expectations": {
    "parent_version": 1,
    "required_branches": ["minimal_change", "full_reoptimization"],
    "completed_history_preserved": true,
    "published_only_after_feasible_candidate": true
  }
}
```

1. **Parent Lineage**: The new planning run references `parent_version: 1`.
2. **Two Repair Branches**:
   - `minimal_change`: Swaps or reschedules only `fushimi_sunrise` with minimal disruption penalty.
   - `full_reoptimization`: Recomputes the entire remaining schedule for maximum score.
3. **History Preservation**: Completed activities prior to `2026-10-10T06:00:00+09:00` are locked and preserved.
4. **Publishing Gate**: A successor version (Version 2) is published only when a candidate passes all hard gates (`feasible: true`).
