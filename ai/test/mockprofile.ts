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
