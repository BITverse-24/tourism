import { TravelerProfile } from "../structures/TravelerProfile";

export const hardcodedProfile: TravelerProfile = {
        "profile_id": "mock-profile",
        "trip_context": {
          "destination_request": "Bangalore",
          "resolved_destination": null,
          "start_date": null,
          "end_date": null,
          "duration_days": 3,
          "date_flexibility": "unknown",
          "party_size": 1,
          "party_notes": "Solo traveler",
          "budget": {
            "amount": 80000,
            "currency": "INR",
            "scope": "total",
            "type": "ceiling"
          }
        },
        "purpose_and_priorities": {
          "primary_purpose": "leisure",
          "secondary_purposes": [],
          "priorities": [
            "Seeing the highlights"
          ],
          "success_definition": null
        },
        "preferences": [
          {
            "category": "nature",
            "strength": "strong",
            "notes": null,
            "source": "stated",
            "confidence": "high"
          },
          {
            "category": "shopping_nightlife",
            "strength": "strong",
            "notes": null,
            "source": "stated",
            "confidence": "high"
          }
        ],
        "travel_style": {
          "pace": "balanced",
          "energy_pattern": "afternoon",
          "walking_tolerance": "medium",
          "crowd_tolerance": "medium",
          "comfort_preference": "comfort_first",
          "spontaneity": "some_flexibility"
        },
        "hard_constraints": {
          "must_visit": [],
          "avoid": [],
          "dietary_requirements": [
            "vegetarian only food"
          ],
          "accessibility_requirements": [],
          "accommodation_requirements": [],
          "maximum_daily_travel": null,
          "maximum_hotel_changes": null,
          "budget_ceiling": null
        },
        "unknowns": [],
        "assumptions": []
      }

