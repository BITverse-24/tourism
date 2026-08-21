import { CandidateBundle, CandidateDesignResult } from "../candidate-design";

const mockreplanagent2res: CandidateDesignResult = {
  "mode": "itinerary",
  "profile_revision": 1,
  "dataset_revisions": {
    "city": "local",
    "attraction": "local"
  },
  "candidates": [
    {
      "candidate_id": "mumbai_replan_rainy_day_1",
      "profile_revision": 2,
      "dataset_revisions": {
        "city": "rev_city_v1",
        "attraction": "rev_attr_v1"
      },
      "route": {
        "route_id": "mumbai_route_3days_replan",
        "stops": [
          {
            "city_id": "mumbai_maharashtra",
            "city_name": "Mumbai",
            "order": 1,
            "days": 3,
            "reason": "Complete the 3-day cultural and heritage exploration of Mumbai, adjusting Day 2 morning due to heavy rain by swapping Elephanta Caves for premier indoor heritage and museum experiences.",
            "evidence_refs": [
              "chhatrapati_shivaji_maharaj_terminus_mumbai_maharashtra",
              "csmvs_museum_mumbai_maharashtra",
              "elephanta_caves_mumbai_maharashtra"
            ]
          }
        ],
        "assumptions": [
          "Traveler prefers budget guesthouse or hostel accommodation in South Mumbai.",
          "Indoor and mixed indoor attractions are prioritized on Day 2 morning due to heavy rain."
        ],
        "tradeoffs": [
          "Elephanta Caves ferry and island tour are omitted due to heavy rain and adverse weather conditions."
        ],
        "unresolved_details": [
          "Exact lodging provider and booking confirmation remain unconfirmed."
        ]
      },
      "days": [
        {
          "city_id": "mumbai_maharashtra",
          "day_number": 1,
          "items": [
            {
              "type": "experience",
              "attraction_id": "chhatrapati_shivaji_maharaj_terminus_mumbai_maharashtra",
              "city_id": "mumbai_maharashtra",
              "title": "Chhatrapati Shivaji Maharaj Terminus",
              "description": "A UNESCO World Heritage Site featuring Victorian Gothic Revival architecture blended with traditional Indian elements. It serves as the historic headquarters of the Central Railway.",
              "visit_approach": {
                "mode": "walking",
                "timing_preference": "morning",
                "duration_minutes": 45,
                "pace": "balanced",
                "focus": [
                  "Architecture",
                  "History",
                  "Photography"
                ],
                "rationale": "Morning lighting highlights the intricate Victorian Gothic stone carvings and details.",
                "tradeoffs": [
                  "High crowd density during peak morning commute times."
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
              "title": "Local South Mumbai Meal",
              "description": "Enjoy a flexible, budget-friendly local meal in the Colaba/Fort area.",
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
              "attraction_id": "csmvs_museum_mumbai_maharashtra",
              "city_id": "mumbai_maharashtra",
              "title": "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya",
              "description": "Mumbai's premier art and history museum, housed in a magnificent Indo-Saracenic building with sprawling gardens, showcasing thousands of ancient Indian artifacts, sculptures, and miniature paintings.",
              "visit_approach": {
                "mode": "indoor exploration",
                "timing_preference": "morning",
                "duration_minutes": 180,
                "pace": "balanced",
                "focus": [
                  "History",
                  "Art",
                  "Architecture",
                  "Rainy Day Shelter"
                ],
                "rationale": "Provides a magnificent indoor heritage experience to safely replace the rain-impacted outdoor ferry trip to Elephanta Caves.",
                "tradeoffs": [
                  "Indoor galleries may experience moderate crowding during inclement weather."
                ]
              },
              "evidence_refs": [
                "csmvs_museum_mumbai_maharashtra"
              ],
              "soft_conflicts": [
                {
                  "topic": "Weather Substitution",
                  "explanation": "Replaces the outdoor Elephanta Caves island tour due to heavy morning rain.",
                  "alternative_attraction_id": "elephanta_caves_mumbai_maharashtra",
                  "evidence_refs": [
                    "elephanta_caves_mumbai_maharashtra",
                    "csmvs_museum_mumbai_maharashtra"
                  ]
                }
              ]
            },
            {
              "type": "meal",
              "attraction_id": null,
              "city_id": "mumbai_maharashtra",
              "title": "Indoor Museum District Lunch",
              "description": "Casual, budget-friendly dining near the Fort and museum district.",
              "visit_approach": null,
              "evidence_refs": [],
              "soft_conflicts": []
            },
            {
              "type": "experience",
              "attraction_id": "rbi_monetary_museum_mumbai_maharashtra",
              "city_id": "mumbai_maharashtra",
              "title": "RBI Monetary Museum",
              "description": "A specialized museum established by the Reserve Bank of India detailing the historic evolution of coinage, paper currency, and financial instruments across Indian history.",
              "visit_approach": {
                "mode": "indoor exploration",
                "timing_preference": "afternoon",
                "duration_minutes": 75,
                "pace": "relaxed",
                "focus": [
                  "History",
                  "Culture",
                  "National Importance"
                ],
                "rationale": "Keeps the afternoon entirely sheltered from heavy rain while maintaining a rich cultural focus.",
                "tradeoffs": [
                  "Smaller exhibition scale compared to major monuments."
                ]
              },
              "evidence_refs": [
                "rbi_monetary_museum_mumbai_maharashtra"
              ],
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
              "attraction_id": "mani_bhavan_gandhi_sangrahalaya_mumbai_maharashtra",
              "city_id": "mumbai_maharashtra",
              "title": "Mani Bhavan Gandhi Sangrahalaya",
              "description": "A historic two-story building that served as Mahatma Gandhi's focal point of political activity in Mumbai between 1917 and 1934, now a memorial and museum.",
              "visit_approach": {
                "mode": "indoor exploration",
                "timing_preference": "morning",
                "duration_minutes": 75,
                "pace": "balanced",
                "focus": [
                  "History",
                  "Culture"
                ],
                "rationale": "Explores deep political and cultural heritage in a well-preserved historic building.",
                "tradeoffs": [
                  "Limited space inside historic rooms."
                ]
              },
              "evidence_refs": [
                "mani_bhavan_gandhi_sangrahalaya_mumbai_maharashtra"
              ],
              "soft_conflicts": []
            },
            {
              "type": "meal",
              "attraction_id": null,
              "city_id": "mumbai_maharashtra",
              "title": "Historic District Lunch",
              "description": "Simple local meal around South Mumbai.",
              "visit_approach": null,
              "evidence_refs": [],
              "soft_conflicts": []
            }
          ]
        }
      ],
      "assumptions": [
        "Day 2 morning weather requires substituting outdoor island visits with premier indoor cultural institutions.",
        "Budget guesthouse or hostel accommodation is maintained in South Mumbai."
      ],
      "tradeoffs": [
        "Elephanta Caves skipped due to heavy rain and safety concerns on the harbor ferry."
      ],
      "unresolved_details": [
        "Exact accommodation booking and provider names."
      ]
    }
  ],
  "operational": {
    "tool_calls": 2,
    "retrieved_rows": 29
  }
}

export const mockreplancandbundl: CandidateBundle = {
      "candidate_id": "mumbai_replan_rainy_day_1",
      "profile_revision": 2,
      "dataset_revisions": {
        "city": "rev_city_v1",
        "attraction": "rev_attr_v1"
      },
      "route": {
        "route_id": "mumbai_route_3days_replan",
        "stops": [
          {
            "city_id": "mumbai_maharashtra",
            "city_name": "Mumbai",
            "order": 1,
            "days": 3,
            "reason": "Complete the 3-day cultural and heritage exploration of Mumbai, adjusting Day 2 morning due to heavy rain by swapping Elephanta Caves for premier indoor heritage and museum experiences.",
            "evidence_refs": [
              "chhatrapati_shivaji_maharaj_terminus_mumbai_maharashtra",
              "csmvs_museum_mumbai_maharashtra",
              "elephanta_caves_mumbai_maharashtra"
            ]
          }
        ],
        "assumptions": [
          "Traveler prefers budget guesthouse or hostel accommodation in South Mumbai.",
          "Indoor and mixed indoor attractions are prioritized on Day 2 morning due to heavy rain."
        ],
        "tradeoffs": [
          "Elephanta Caves ferry and island tour are omitted due to heavy rain and adverse weather conditions."
        ],
        "unresolved_details": [
          "Exact lodging provider and booking confirmation remain unconfirmed."
        ]
      },
      "days": [
        {
          "city_id": "mumbai_maharashtra",
          "day_number": 1,
          "items": [
            {
              "type": "experience",
              "attraction_id": "chhatrapati_shivaji_maharaj_terminus_mumbai_maharashtra",
              "city_id": "mumbai_maharashtra",
              "title": "Chhatrapati Shivaji Maharaj Terminus",
              "description": "A UNESCO World Heritage Site featuring Victorian Gothic Revival architecture blended with traditional Indian elements. It serves as the historic headquarters of the Central Railway.",
              "visit_approach": {
                "mode": "walking",
                "timing_preference": "morning",
                "duration_minutes": 45,
                "pace": "balanced",
                "focus": [
                  "Architecture",
                  "History",
                  "Photography"
                ],
                "rationale": "Morning lighting highlights the intricate Victorian Gothic stone carvings and details.",
                "tradeoffs": [
                  "High crowd density during peak morning commute times."
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
              "title": "Local South Mumbai Meal",
              "description": "Enjoy a flexible, budget-friendly local meal in the Colaba/Fort area.",
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
              "attraction_id": "csmvs_museum_mumbai_maharashtra",
              "city_id": "mumbai_maharashtra",
              "title": "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya",
              "description": "Mumbai's premier art and history museum, housed in a magnificent Indo-Saracenic building with sprawling gardens, showcasing thousands of ancient Indian artifacts, sculptures, and miniature paintings.",
              "visit_approach": {
                "mode": "indoor exploration",
                "timing_preference": "morning",
                "duration_minutes": 180,
                "pace": "balanced",
                "focus": [
                  "History",
                  "Art",
                  "Architecture",
                  "Rainy Day Shelter"
                ],
                "rationale": "Provides a magnificent indoor heritage experience to safely replace the rain-impacted outdoor ferry trip to Elephanta Caves.",
                "tradeoffs": [
                  "Indoor galleries may experience moderate crowding during inclement weather."
                ]
              },
              "evidence_refs": [
                "csmvs_museum_mumbai_maharashtra"
              ],
              "soft_conflicts": [
                {
                  "topic": "Weather Substitution",
                  "explanation": "Replaces the outdoor Elephanta Caves island tour due to heavy morning rain.",
                  "alternative_attraction_id": "elephanta_caves_mumbai_maharashtra",
                  "evidence_refs": [
                    "elephanta_caves_mumbai_maharashtra",
                    "csmvs_museum_mumbai_maharashtra"
                  ]
                }
              ]
            },
            {
              "type": "meal",
              "attraction_id": null,
              "city_id": "mumbai_maharashtra",
              "title": "Indoor Museum District Lunch",
              "description": "Casual, budget-friendly dining near the Fort and museum district.",
              "visit_approach": null,
              "evidence_refs": [],
              "soft_conflicts": []
            },
            {
              "type": "experience",
              "attraction_id": "rbi_monetary_museum_mumbai_maharashtra",
              "city_id": "mumbai_maharashtra",
              "title": "RBI Monetary Museum",
              "description": "A specialized museum established by the Reserve Bank of India detailing the historic evolution of coinage, paper currency, and financial instruments across Indian history.",
              "visit_approach": {
                "mode": "indoor exploration",
                "timing_preference": "afternoon",
                "duration_minutes": 75,
                "pace": "relaxed",
                "focus": [
                  "History",
                  "Culture",
                  "National Importance"
                ],
                "rationale": "Keeps the afternoon entirely sheltered from heavy rain while maintaining a rich cultural focus.",
                "tradeoffs": [
                  "Smaller exhibition scale compared to major monuments."
                ]
              },
              "evidence_refs": [
                "rbi_monetary_museum_mumbai_maharashtra"
              ],
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
              "attraction_id": "mani_bhavan_gandhi_sangrahalaya_mumbai_maharashtra",
              "city_id": "mumbai_maharashtra",
              "title": "Mani Bhavan Gandhi Sangrahalaya",
              "description": "A historic two-story building that served as Mahatma Gandhi's focal point of political activity in Mumbai between 1917 and 1934, now a memorial and museum.",
              "visit_approach": {
                "mode": "indoor exploration",
                "timing_preference": "morning",
                "duration_minutes": 75,
                "pace": "balanced",
                "focus": [
                  "History",
                  "Culture"
                ],
                "rationale": "Explores deep political and cultural heritage in a well-preserved historic building.",
                "tradeoffs": [
                  "Limited space inside historic rooms."
                ]
              },
              "evidence_refs": [
                "mani_bhavan_gandhi_sangrahalaya_mumbai_maharashtra"
              ],
              "soft_conflicts": []
            },
            {
              "type": "meal",
              "attraction_id": null,
              "city_id": "mumbai_maharashtra",
              "title": "Historic District Lunch",
              "description": "Simple local meal around South Mumbai.",
              "visit_approach": null,
              "evidence_refs": [],
              "soft_conflicts": []
            }
          ]
        }
      ],
      "assumptions": [
        "Day 2 morning weather requires substituting outdoor island visits with premier indoor cultural institutions.",
        "Budget guesthouse or hostel accommodation is maintained in South Mumbai."
      ],
      "tradeoffs": [
        "Elephanta Caves skipped due to heavy rain and safety concerns on the harbor ferry."
      ],
      "unresolved_details": [
        "Exact accommodation booking and provider names."
      ]
    }
