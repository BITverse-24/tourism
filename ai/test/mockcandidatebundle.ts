import { CandidateBundle, CandidateDesignResult } from "../candidate-design";

export const mockCandDesRes: CandidateDesignResult = {
  "mode": "itinerary",
  "profile_revision": 1,
  "dataset_revisions": {
    "city": "local",
    "attraction": "local"
  },
  "candidates": [
    {
      "candidate_id": "mumbai_3day_cultural_heritage",
      "profile_revision": 1,
      "dataset_revisions": {
        "city": "rev_city_2026",
        "attraction": "rev_attr_2026"
      },
      "route": {
        "route_id": "mumbai_route_3days",
        "stops": [
          {
            "city_id": "mumbai_maharashtra",
            "city_name": "Mumbai",
            "order": 1,
            "days": 3,
            "reason": "Explore iconic cultural sights, historic architecture, and heritage monuments in South Mumbai matching profile priorities.",
            "evidence_refs": [
              "mumbai_maharashtra"
            ]
          }
        ],
        "assumptions": [
          "Traveler prefers a balanced pace focused on iconic historical and cultural sights.",
          "Budget accommodation in local guesthouses/hostels is assumed for South Mumbai."
        ],
        "tradeoffs": [
          "Heavy crowds at major sights during peak hours."
        ],
        "unresolved_details": [
          "Exact lodging provider and booking status."
        ]
      },
      "days": [
        {
          "city_id": "mumbai_maharashtra",
          "day_number": 1,
          "items": [
            {
              "type": "experience",
              "attraction_id": "gateway_of_india_mumbai_maharashtra",
              "city_id": "mumbai_maharashtra",
              "title": "Gateway of India",
              "description": "An iconic Indo-Saracenic basalt arch built to commemorate the 1911 visit of King George V and Queen Mary to India. It stands at the waterfront overlooking the Arabian Sea.",
              "visit_approach": {
                "mode": "independent",
                "timing_preference": "Early_Morning",
                "duration_minutes": 60,
                "pace": "balanced",
                "focus": [
                  "History",
                  "Architecture",
                  "Photography"
                ],
                "rationale": "Early morning offers optimal lighting and manageable crowds at this major tourist landmark.",
                "tradeoffs": [
                  "High tourist footfall expected throughout the day."
                ]
              },
              "evidence_refs": [
                "gateway_of_india_mumbai_maharashtra"
              ],
              "soft_conflicts": []
            },
            {
              "type": "meal",
              "attraction_id": null,
              "city_id": "mumbai_maharashtra",
              "title": "Local South Mumbai Meal",
              "description": "Enjoy a flexible, budget-friendly local meal in the Colaba area.",
              "visit_approach": null,
              "evidence_refs": [],
              "soft_conflicts": []
            },
            {
              "type": "rest",
              "attraction_id": null,
              "city_id": "mumbai_maharashtra",
              "title": "Rest & Refresh",
              "description": "Take a short break at your budget guesthouse or hostel.",
              "visit_approach": null,
              "evidence_refs": [],
              "soft_conflicts": []
            }
          ]
        },
        {
          "city_id": "mumbai_maharashtra",
          "day_number": 2,
          "items": [
            {
              "type": "experience",
              "attraction_id": "elephanta_caves_mumbai_maharashtra",
              "city_id": "mumbai_maharashtra",
              "title": "Elephanta Caves",
              "description": "A network of sculpted rock-cut caves located on Elephanta Island in Mumbai Harbour, dedicated predominantly to the Hindu god Shiva and featuring the famous Trimurti sculpture.",
              "visit_approach": {
                "mode": "independent",
                "timing_preference": "Morning",
                "duration_minutes": 240,
                "pace": "balanced",
                "focus": [
                  "History",
                  "Architecture",
                  "Religion",
                  "Archaeology"
                ],
                "rationale": "Morning ferry and cooler weather facilitate exploring the rock-cut caves and steep steps.",
                "tradeoffs": [
                  "Involves climbing stairs and walking unpaved paths; elderly suitability is rated poor due to physical strain."
                ]
              },
              "evidence_refs": [
                "elephanta_caves_mumbai_maharashtra"
              ],
              "soft_conflicts": []
            },
            {
              "type": "meal",
              "attraction_id": null,
              "city_id": "mumbai_maharashtra",
              "title": "Harbor-side Lunch",
              "description": "Casual, budget-friendly dining near the ferry terminal.",
              "visit_approach": null,
              "evidence_refs": [],
              "soft_conflicts": []
            }
          ]
        },
        {
          "city_id": "mumbai_maharashtra",
          "day_number": 3,
          "items": [
            {
              "type": "experience",
              "attraction_id": "chhatrapati_shivaji_maharaj_terminus_mumbai_maharashtra",
              "city_id": "mumbai_maharashtra",
              "title": "Chhatrapati Shivaji Maharaj Terminus",
              "description": "A UNESCO World Heritage Site featuring Victorian Gothic Revival architecture blended with traditional Indian elements. It serves as the historic headquarters of the Central Railway.",
              "visit_approach": {
                "mode": "independent",
                "timing_preference": "Morning",
                "duration_minutes": 45,
                "pace": "balanced",
                "focus": [
                  "Architecture",
                  "History"
                ],
                "rationale": "Morning lighting highlights the intricate Victorian Gothic stone carvings and details.",
                "tradeoffs": [
                  "Extremely busy commuter hub."
                ]
              },
              "evidence_refs": [
                "chhatrapati_shivaji_maharaj_terminus_mumbai_maharashtra"
              ],
              "soft_conflicts": []
            },
            {
              "type": "meal",
              "attraction_id": null,
              "city_id": "mumbai_maharashtra",
              "title": "Historic District Lunch",
              "description": "Simple local meal around the Fort district.",
              "visit_approach": null,
              "evidence_refs": [],
              "soft_conflicts": []
            }
          ]
        }
      ],
      "assumptions": [
        "Sufficient daily budget under 30 USD for budget accommodation and local food in Mumbai."
      ],
      "tradeoffs": [
        "High crowd density at major sightseeing spots."
      ],
      "unresolved_details": [
        "Specific hostel or guesthouse name and exact booking confirmation."
      ]
    }
  ],
  "operational": {
    "tool_calls": 10,
    "retrieved_rows": 6
  }
}

export const mockCandBundl: CandidateBundle = {
      "candidate_id": "mumbai_3day_cultural_heritage",
      "profile_revision": 1,
      "dataset_revisions": {
        "city": "rev_city_2026",
        "attraction": "rev_attr_2026"
      },
      "route": {
        "route_id": "mumbai_route_3days",
        "stops": [
          {
            "city_id": "mumbai_maharashtra",
            "city_name": "Mumbai",
            "order": 1,
            "days": 3,
            "reason": "Explore iconic cultural sights, historic architecture, and heritage monuments in South Mumbai matching profile priorities.",
            "evidence_refs": [
              "mumbai_maharashtra"
            ]
          }
        ],
        "assumptions": [
          "Traveler prefers a balanced pace focused on iconic historical and cultural sights.",
          "Budget accommodation in local guesthouses/hostels is assumed for South Mumbai."
        ],
        "tradeoffs": [
          "Heavy crowds at major sights during peak hours."
        ],
        "unresolved_details": [
          "Exact lodging provider and booking status."
        ]
      },
      "days": [
        {
          "city_id": "mumbai_maharashtra",
          "day_number": 1,
          "items": [
            {
              "type": "experience",
              "attraction_id": "gateway_of_india_mumbai_maharashtra",
              "city_id": "mumbai_maharashtra",
              "title": "Gateway of India",
              "description": "An iconic Indo-Saracenic basalt arch built to commemorate the 1911 visit of King George V and Queen Mary to India. It stands at the waterfront overlooking the Arabian Sea.",
              "visit_approach": {
                "mode": "independent",
                "timing_preference": "Early_Morning",
                "duration_minutes": 60,
                "pace": "balanced",
                "focus": [
                  "History",
                  "Architecture",
                  "Photography"
                ],
                "rationale": "Early morning offers optimal lighting and manageable crowds at this major tourist landmark.",
                "tradeoffs": [
                  "High tourist footfall expected throughout the day."
                ]
              },
              "evidence_refs": [
                "gateway_of_india_mumbai_maharashtra"
              ],
              "soft_conflicts": []
            },
            {
              "type": "meal",
              "attraction_id": null,
              "city_id": "mumbai_maharashtra",
              "title": "Local South Mumbai Meal",
              "description": "Enjoy a flexible, budget-friendly local meal in the Colaba area.",
              "visit_approach": null,
              "evidence_refs": [],
              "soft_conflicts": []
            },
            {
              "type": "rest",
              "attraction_id": null,
              "city_id": "mumbai_maharashtra",
              "title": "Rest & Refresh",
              "description": "Take a short break at your budget guesthouse or hostel.",
              "visit_approach": null,
              "evidence_refs": [],
              "soft_conflicts": []
            }
          ]
        },
        {
          "city_id": "mumbai_maharashtra",
          "day_number": 2,
          "items": [
            {
              "type": "experience",
              "attraction_id": "elephanta_caves_mumbai_maharashtra",
              "city_id": "mumbai_maharashtra",
              "title": "Elephanta Caves",
              "description": "A network of sculpted rock-cut caves located on Elephanta Island in Mumbai Harbour, dedicated predominantly to the Hindu god Shiva and featuring the famous Trimurti sculpture.",
              "visit_approach": {
                "mode": "independent",
                "timing_preference": "Morning",
                "duration_minutes": 240,
                "pace": "balanced",
                "focus": [
                  "History",
                  "Architecture",
                  "Religion",
                  "Archaeology"
                ],
                "rationale": "Morning ferry and cooler weather facilitate exploring the rock-cut caves and steep steps.",
                "tradeoffs": [
                  "Involves climbing stairs and walking unpaved paths; elderly suitability is rated poor due to physical strain."
                ]
              },
              "evidence_refs": [
                "elephanta_caves_mumbai_maharashtra"
              ],
              "soft_conflicts": []
            },
            {
              "type": "meal",
              "attraction_id": null,
              "city_id": "mumbai_maharashtra",
              "title": "Harbor-side Lunch",
              "description": "Casual, budget-friendly dining near the ferry terminal.",
              "visit_approach": null,
              "evidence_refs": [],
              "soft_conflicts": []
            }
          ]
        },
        {
          "city_id": "mumbai_maharashtra",
          "day_number": 3,
          "items": [
            {
              "type": "experience",
              "attraction_id": "chhatrapati_shivaji_maharaj_terminus_mumbai_maharashtra",
              "city_id": "mumbai_maharashtra",
              "title": "Chhatrapati Shivaji Maharaj Terminus",
              "description": "A UNESCO World Heritage Site featuring Victorian Gothic Revival architecture blended with traditional Indian elements. It serves as the historic headquarters of the Central Railway.",
              "visit_approach": {
                "mode": "independent",
                "timing_preference": "Morning",
                "duration_minutes": 45,
                "pace": "balanced",
                "focus": [
                  "Architecture",
                  "History"
                ],
                "rationale": "Morning lighting highlights the intricate Victorian Gothic stone carvings and details.",
                "tradeoffs": [
                  "Extremely busy commuter hub."
                ]
              },
              "evidence_refs": [
                "chhatrapati_shivaji_maharaj_terminus_mumbai_maharashtra"
              ],
              "soft_conflicts": []
            },
            {
              "type": "meal",
              "attraction_id": null,
              "city_id": "mumbai_maharashtra",
              "title": "Historic District Lunch",
              "description": "Simple local meal around the Fort district.",
              "visit_approach": null,
              "evidence_refs": [],
              "soft_conflicts": []
            }
          ]
        }
      ],
      "assumptions": [
        "Sufficient daily budget under 30 USD for budget accommodation and local food in Mumbai."
      ],
      "tradeoffs": [
        "High crowd density at major sightseeing spots."
      ],
      "unresolved_details": [
        "Specific hostel or guesthouse name and exact booking confirmation."
      ]
    }
