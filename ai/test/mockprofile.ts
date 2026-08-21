import { TravelerProfile } from "../candidate-design";

export const profSnapshotMessage = {
    "message_id": "msg_7f4cbbd2-2cfe-4fc0-94ac-6b82bb420560",
    "session_id": "sess_7ea98983-8e72-419c-9649-0b1a6d69c4e2",
    "run_id": "run_8cdd4dd6-284a-44d4-85d3-18ae4c4a0ecb",
    "command_id": "cmd_f3331a2b-98c2-454e-82ed-01e9a506d408",
    "occurred_at": "2026-08-21T10:51:56.385Z",
    "kind": "event",
    "sequence": 16,
    "type": "profile.snapshot",
    "payload": {
        "revision": 8,
        "state": "ready",
        "profile": {
            "profile_id": "mock-profile",
            "trip_context": {
                "destination_request": "Mumbai",
                "resolved_destination": null,
                "start_date": null,
                "end_date": null,
                "duration_days": 3,
                "date_flexibility": "somewhat_flexible",
                "party_size": 1,
                "party_notes": null,
                "budget": {
                    "amount": 30,
                    "currency": "USD",
                    "scope": "per_day",
                    "type": "target"
                }
            },
            "purpose_and_priorities": {
                "primary_purpose": "Culture, heritage & iconic sights",
                "secondary_purposes": [],
                "priorities": [
                    "Gateway of India",
                    "Elephanta Caves",
                    "Historic architecture in South Mumbai"
                ],
                "success_definition": null
            },
            "preferences": [
                {
                    "category": "budget_accommodation",
                    "strength": "strong",
                    "notes": "Prefers budget / local guesthouse or hostel",
                    "source": "stated",
                    "confidence": "high"
                }
            ],
            "travel_style": {
                "pace": "balanced",
                "energy_pattern": "unknown",
                "walking_tolerance": "unknown",
                "crowd_tolerance": "unknown",
                "comfort_preference": "exploration_first",
                "spontaneity": "unknown"
            },
            "hard_constraints": {
                "must_visit": [],
                "avoid": [],
                "dietary_requirements": [],
                "accessibility_requirements": [],
                "accommodation_requirements": [],
                "maximum_daily_travel": null,
                "maximum_hotel_changes": null,
                "budget_ceiling": null
            },
            "unknowns": [],
            "assumptions": []
        }
    }
}

export const profJSON: TravelerProfile = {
    profile_id: "mock-profile",
    trip_context: {
        destination_request: "Mumbai",
        resolved_destination: null,
        start_date: null,
        end_date: null,
        duration_days: 3,
        date_flexibility: "somewhat_flexible",
        party_size: 1,
        party_notes: null,
        budget: {
            amount: 30,
            currency: "USD",
            scope: "per_day",
            type: "target"
        }
    },
    purpose_and_priorities: {
        primary_purpose: "Culture, heritage & iconic sights",
        secondary_purposes: [],
        priorities: [
            "Gateway of India",
            "Elephanta Caves",
            "Historic architecture in South Mumbai"
        ],
        success_definition: null
    },
    preferences: [
        {
            category: "budget_accommodation",
            strength: "strong",
            notes: "Prefers budget / local guesthouse or hostel",
            source: "stated",
            confidence: "high"
        }
    ],
    travel_style: {
        pace: "balanced",
        energy_pattern: "unknown",
        walking_tolerance: "unknown",
        crowd_tolerance: "unknown",
        comfort_preference: "exploration_first",
        spontaneity: "unknown"
    },
    hard_constraints: {
        must_visit: [],
        avoid: [],
        dietary_requirements: [],
        accessibility_requirements: [],
        accommodation_requirements: [],
        maximum_daily_travel: null,
        maximum_hotel_changes: null,
        budget_ceiling: null
    },
    unknowns: [],
    assumptions: []
};

export const mockprof: TravelerProfile = {
    "profile_id": "mock-profile",
    "trip_context": {
      "destination_request": "Jaipur and Pushkar",
      "resolved_destination": null,
      "start_date": "2026-10-15",
      "end_date": null,
      "duration_days": 4,
      "date_flexibility": "somewhat_flexible",
      "party_size": 8,
      "party_notes": "Joint family of 8 - mixed ages including elders, adults and kids",
      "budget": {
        "amount": 350000,
        "currency": "INR",
        "scope": "total_for_party_of_8",
        "type": "target"
      }
    },
    "purpose_and_priorities": {
      "primary_purpose": "leisure",
      "secondary_purposes": [],
      "priorities": [
        "sightseeing highlights"
      ],
      "success_definition": null
    },
    "preferences": [
      {
        "category": "culture",
        "strength": "must_have",
        "notes": "Selected culture & history - forts, palaces, temples",
        "source": "stated",
        "confidence": "high"
      },
      {
        "category": "photography",
        "strength": "must_have",
        "notes": "Family photos and memorable moments",
        "source": "stated",
        "confidence": "high"
      }
    ],
    "travel_style": {
      "pace": "balanced",
      "energy_pattern": "unknown",
      "walking_tolerance": "medium",
      "crowd_tolerance": "unknown",
      "comfort_preference": "balanced",
      "spontaneity": "unknown"
    },
    "hard_constraints": {
      "must_visit": [],
      "avoid": [],
      "dietary_requirements": [],
      "accessibility_requirements": [],
      "accommodation_requirements": [],
      "maximum_daily_travel": null,
      "maximum_hotel_changes": null,
      "budget_ceiling": null
    },
    "unknowns": [],
    "assumptions": [
      {
        "topic": "timing_mid_october_2026_approx",
        "value": "Mid-October 2026, exact dates flexible",
        "reason": "Traveler said 'Mid October' without year/dates; assuming mid-October 2026 with flexibility",
        "user_confirmation_needed": true
      },
      {
        "topic": "no_special_constraints_confirmed",
        "value": "No dietary, accessibility, or must-visit/avoid constraints reported for 8-person family",
        "reason": "Traveler selected 'No major constraints' for dietary/accessibility/must-visit",
        "user_confirmation_needed": false
      },
      {
        "topic": "mixed_age_family_needs",
        "value": "Group includes elders and kids - plan for lower walking intensity, frequent breaks, and accessible options",
        "reason": "Traveler confirmed mixed ages (elders, adults, kids) for 8-person joint family; implies need for slower pace and kid/elder-friendly logistics",
        "user_confirmation_needed": false
      }
    ]
  }
