import { FinalTripPlan, NarrativeResult } from "../narrative";

export const narrativeRes: NarrativeResult = {
  "plan": {
    "plan_title": "Mumbai Cultural & Heritage Itinerary",
    "summary": "A 3-day cultural exploration of Mumbai tailored to your interests in historic architecture and iconic sights, featuring the Gateway of India, Elephanta Caves, and Chhatrapati Shivaji Maharaj Terminus while sticking close to a budget-friendly style.",
    "traveler_profile_reference": {
      "profile_id": "mock-profile",
      "profile_revision": 1
    },
    "trip_dates": {
      "start_date": null,
      "end_date": null,
      "duration_days": 3,
      "flexibility": "somewhat_flexible"
    },
    "destination_route": [
      {
        "place": "Mumbai",
        "city_id": "mumbai_maharashtra",
        "order": 1,
        "arrival_from": null,
        "departure_to": null
      }
    ],
    "city_allocations": [
      {
        "place": "Mumbai",
        "city_id": "mumbai_maharashtra",
        "nights": 3,
        "days": 3,
        "reason": "Explore iconic cultural sights, historic architecture, and heritage monuments in South Mumbai matching profile priorities."
      }
    ],
    "accommodation": [
      {
        "place": "Mumbai",
        "nights": 3,
        "recommendation": "Budget guesthouse or hostel in South Mumbai",
        "reason": "Aligns with your preference for budget-friendly local accommodation near major heritage sites.",
        "estimated_cost": {
          "amount": null,
          "currency": "USD"
        },
        "status": "not_yet_decided"
      }
    ],
    "days": [
      {
        "day": 1,
        "date": null,
        "place": "Mumbai",
        "city_id": "mumbai_maharashtra",
        "theme": "Iconic Waterfront & Architecture",
        "items": [
          {
            "type": "experience",
            "title": "Gateway of India",
            "start_time": "09:00",
            "end_time": "10:00",
            "location": "Waterfront, Colaba, Mumbai",
            "description": "An iconic Indo-Saracenic basalt arch built to commemorate the 1911 visit of King George V and Queen Mary to India. It stands at the waterfront overlooking the Arabian Sea.",
            "movement": {
              "mode": null,
              "duration_minutes": null,
              "from": null,
              "to": null
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Early morning offers optimal lighting and manageable crowds at this major tourist landmark.",
            "flexibility": "moveable"
          },
          {
            "type": "meal",
            "title": "Local South Mumbai Meal",
            "start_time": "12:00",
            "end_time": "13:00",
            "location": "Colaba area, Mumbai",
            "description": "Enjoy a flexible, budget-friendly local meal in the Colaba area.",
            "movement": {
              "mode": null,
              "duration_minutes": null,
              "from": null,
              "to": null
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Provides a convenient lunch break near your first-day sights.",
            "flexibility": "moveable"
          },
          {
            "type": "rest",
            "title": "Rest & Refresh",
            "start_time": "14:00",
            "end_time": "15:00",
            "location": "Budget guesthouse or hostel",
            "description": "Take a short break at your budget guesthouse or hostel.",
            "movement": {
              "mode": null,
              "duration_minutes": null,
              "from": null,
              "to": null
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Allows you to recharge during the warmest part of the day.",
            "flexibility": "moveable"
          }
        ],
        "daily_notes": "Focus on the Colaba waterfront area and settle into your accommodations."
      },
      {
        "day": 2,
        "date": null,
        "place": "Mumbai",
        "city_id": "mumbai_maharashtra",
        "theme": "Island Temples & Rock-Cut Caves",
        "items": [
          {
            "type": "experience",
            "title": "Elephanta Caves",
            "start_time": "09:00",
            "end_time": "13:00",
            "location": "Elephanta Island, Mumbai Harbour",
            "description": "A network of sculpted rock-cut caves located on Elephanta Island in Mumbai Harbour, dedicated predominantly to the Hindu god Shiva and featuring the famous Trimurti sculpture.",
            "movement": {
              "mode": "ferry",
              "duration_minutes": 60,
              "from": "Gateway of India",
              "to": "Elephanta Island"
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Morning ferry and cooler weather facilitate exploring the rock-cut caves and steep steps.",
            "flexibility": "moveable"
          },
          {
            "type": "meal",
            "title": "Harbor-side Lunch",
            "start_time": "13:30",
            "end_time": "14:30",
            "location": "Near ferry terminal, Mumbai",
            "description": "Casual, budget-friendly dining near the ferry terminal.",
            "movement": {
              "mode": null,
              "duration_minutes": null,
              "from": null,
              "to": null
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Refuel right after returning from the island excursion.",
            "flexibility": "moveable"
          }
        ],
        "daily_notes": "Be prepared for walking unpaved paths and climbing stairs at the caves."
      },
      {
        "day": 3,
        "date": null,
        "place": "Mumbai",
        "city_id": "mumbai_maharashtra",
        "theme": "Victorian Gothic Architecture",
        "items": [
          {
            "type": "experience",
            "title": "Chhatrapati Shivaji Maharaj Terminus",
            "start_time": "09:30",
            "end_time": "10:15",
            "location": "Fort district, Mumbai",
            "description": "A UNESCO World Heritage Site featuring Victorian Gothic Revival architecture blended with traditional Indian elements. It serves as the historic headquarters of the Central Railway.",
            "movement": {
              "mode": null,
              "duration_minutes": null,
              "from": null,
              "to": null
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Morning lighting highlights the intricate Victorian Gothic stone carvings and details.",
            "flexibility": "moveable"
          },
          {
            "type": "meal",
            "title": "Historic District Lunch",
            "start_time": "12:00",
            "end_time": "13:00",
            "location": "Fort district, Mumbai",
            "description": "Simple local meal around the Fort district.",
            "movement": {
              "mode": null,
              "duration_minutes": null,
              "from": null,
              "to": null
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Concludes your heritage tour with local food options in the historic district.",
            "flexibility": "moveable"
          }
        ],
        "daily_notes": "Enjoy the architecture of the Fort district before concluding your trip."
      }
    ],
    "cost_summary": {
      "currency": "USD",
      "estimated_total": null,
      "scope": "Per-day targets and general guesthouse/food expectations set without guaranteed provider pricing.",
      "categories": [
        {
          "name": "Accommodation",
          "estimated_cost": 0
        },
        {
          "name": "Food & Meals",
          "estimated_cost": 0
        },
        {
          "name": "Activities & Transport",
          "estimated_cost": 0
        }
      ],
      "budget_position": "budget_unknown",
      "caveats": [
        "Exact pricing depends on your chosen hostel or guesthouse provider.",
        "Entrance fees and ferry tickets are subject to change."
      ]
    },
    "fit_explanation": "This itinerary targets your primary desire for culture, heritage, and iconic sights by focusing directly on Mumbai's top historic landmarks: Gateway of India, Elephanta Caves, and Chhatrapati Shivaji Maharaj Terminus. It maintains a balanced pace suited for independent exploration.",
    "tradeoffs": [
      "Heavy crowds at major sights during peak hours.",
      "Elephanta Caves involve climbing stairs and walking unpaved paths."
    ],
    "assumptions": [
      "Traveler prefers a balanced pace focused on iconic historical and cultural sights.",
      "Budget accommodation in local guesthouses/hostels is assumed for South Mumbai.",
      "Sufficient daily budget under 30 USD for budget accommodation and local food in Mumbai."
    ],
    "warnings": [
      "High crowd density at major sightseeing spots."
    ],
    "unresolved_details": [
      "Exact lodging provider and booking status.",
      "Specific hostel or guesthouse name and exact booking confirmation."
    ]
  },
  "operational": {
    "repair_attempts": 0
  }
}

export const mockfinaltripplan: FinalTripPlan = {
    "plan_title": "Mumbai Cultural & Heritage Itinerary",
    "summary": "A 3-day cultural exploration of Mumbai tailored to your interests in historic architecture and iconic sights, featuring the Gateway of India, Elephanta Caves, and Chhatrapati Shivaji Maharaj Terminus while sticking close to a budget-friendly style.",
    "traveler_profile_reference": {
      "profile_id": "mock-profile",
      "profile_revision": 1
    },
    "trip_dates": {
      "start_date": null,
      "end_date": null,
      "duration_days": 3,
      "flexibility": "somewhat_flexible"
    },
    "destination_route": [
      {
        "place": "Mumbai",
        "city_id": "mumbai_maharashtra",
        "order": 1,
        "arrival_from": null,
        "departure_to": null
      }
    ],
    "city_allocations": [
      {
        "place": "Mumbai",
        "city_id": "mumbai_maharashtra",
        "nights": 3,
        "days": 3,
        "reason": "Explore iconic cultural sights, historic architecture, and heritage monuments in South Mumbai matching profile priorities."
      }
    ],
    "accommodation": [
      {
        "place": "Mumbai",
        "nights": 3,
        "recommendation": "Budget guesthouse or hostel in South Mumbai",
        "reason": "Aligns with your preference for budget-friendly local accommodation near major heritage sites.",
        "estimated_cost": {
          "amount": null,
          "currency": "USD"
        },
        "status": "not_yet_decided"
      }
    ],
    "days": [
      {
        "day": 1,
        "date": null,
        "place": "Mumbai",
        "city_id": "mumbai_maharashtra",
        "theme": "Iconic Waterfront & Architecture",
        "items": [
          {
            "type": "experience",
            "title": "Gateway of India",
            "start_time": "09:00",
            "end_time": "10:00",
            "location": "Waterfront, Colaba, Mumbai",
            "description": "An iconic Indo-Saracenic basalt arch built to commemorate the 1911 visit of King George V and Queen Mary to India. It stands at the waterfront overlooking the Arabian Sea.",
            "movement": {
              "mode": null,
              "duration_minutes": null,
              "from": null,
              "to": null
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Early morning offers optimal lighting and manageable crowds at this major tourist landmark.",
            "flexibility": "moveable"
          },
          {
            "type": "meal",
            "title": "Local South Mumbai Meal",
            "start_time": "12:00",
            "end_time": "13:00",
            "location": "Colaba area, Mumbai",
            "description": "Enjoy a flexible, budget-friendly local meal in the Colaba area.",
            "movement": {
              "mode": null,
              "duration_minutes": null,
              "from": null,
              "to": null
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Provides a convenient lunch break near your first-day sights.",
            "flexibility": "moveable"
          },
          {
            "type": "rest",
            "title": "Rest & Refresh",
            "start_time": "14:00",
            "end_time": "15:00",
            "location": "Budget guesthouse or hostel",
            "description": "Take a short break at your budget guesthouse or hostel.",
            "movement": {
              "mode": null,
              "duration_minutes": null,
              "from": null,
              "to": null
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Allows you to recharge during the warmest part of the day.",
            "flexibility": "moveable"
          }
        ],
        "daily_notes": "Focus on the Colaba waterfront area and settle into your accommodations."
      },
      {
        "day": 2,
        "date": null,
        "place": "Mumbai",
        "city_id": "mumbai_maharashtra",
        "theme": "Island Temples & Rock-Cut Caves",
        "items": [
          {
            "type": "experience",
            "title": "Elephanta Caves",
            "start_time": "09:00",
            "end_time": "13:00",
            "location": "Elephanta Island, Mumbai Harbour",
            "description": "A network of sculpted rock-cut caves located on Elephanta Island in Mumbai Harbour, dedicated predominantly to the Hindu god Shiva and featuring the famous Trimurti sculpture.",
            "movement": {
              "mode": "ferry",
              "duration_minutes": 60,
              "from": "Gateway of India",
              "to": "Elephanta Island"
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Morning ferry and cooler weather facilitate exploring the rock-cut caves and steep steps.",
            "flexibility": "moveable"
          },
          {
            "type": "meal",
            "title": "Harbor-side Lunch",
            "start_time": "13:30",
            "end_time": "14:30",
            "location": "Near ferry terminal, Mumbai",
            "description": "Casual, budget-friendly dining near the ferry terminal.",
            "movement": {
              "mode": null,
              "duration_minutes": null,
              "from": null,
              "to": null
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Refuel right after returning from the island excursion.",
            "flexibility": "moveable"
          }
        ],
        "daily_notes": "Be prepared for walking unpaved paths and climbing stairs at the caves."
      },
      {
        "day": 3,
        "date": null,
        "place": "Mumbai",
        "city_id": "mumbai_maharashtra",
        "theme": "Victorian Gothic Architecture",
        "items": [
          {
            "type": "experience",
            "title": "Chhatrapati Shivaji Maharaj Terminus",
            "start_time": "09:30",
            "end_time": "10:15",
            "location": "Fort district, Mumbai",
            "description": "A UNESCO World Heritage Site featuring Victorian Gothic Revival architecture blended with traditional Indian elements. It serves as the historic headquarters of the Central Railway.",
            "movement": {
              "mode": null,
              "duration_minutes": null,
              "from": null,
              "to": null
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Morning lighting highlights the intricate Victorian Gothic stone carvings and details.",
            "flexibility": "moveable"
          },
          {
            "type": "meal",
            "title": "Historic District Lunch",
            "start_time": "12:00",
            "end_time": "13:00",
            "location": "Fort district, Mumbai",
            "description": "Simple local meal around the Fort district.",
            "movement": {
              "mode": null,
              "duration_minutes": null,
              "from": null,
              "to": null
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Concludes your heritage tour with local food options in the historic district.",
            "flexibility": "moveable"
          }
        ],
        "daily_notes": "Enjoy the architecture of the Fort district before concluding your trip."
      }
    ],
    "cost_summary": {
      "currency": "USD",
      "estimated_total": null,
      "scope": "Per-day targets and general guesthouse/food expectations set without guaranteed provider pricing.",
      "categories": [
        {
          "name": "Accommodation",
          "estimated_cost": 0
        },
        {
          "name": "Food & Meals",
          "estimated_cost": 0
        },
        {
          "name": "Activities & Transport",
          "estimated_cost": 0
        }
      ],
      "budget_position": "budget_unknown",
      "caveats": [
        "Exact pricing depends on your chosen hostel or guesthouse provider.",
        "Entrance fees and ferry tickets are subject to change."
      ]
    },
    "fit_explanation": "This itinerary targets your primary desire for culture, heritage, and iconic sights by focusing directly on Mumbai's top historic landmarks: Gateway of India, Elephanta Caves, and Chhatrapati Shivaji Maharaj Terminus. It maintains a balanced pace suited for independent exploration.",
    "tradeoffs": [
      "Heavy crowds at major sights during peak hours.",
      "Elephanta Caves involve climbing stairs and walking unpaved paths."
    ],
    "assumptions": [
      "Traveler prefers a balanced pace focused on iconic historical and cultural sights.",
      "Budget accommodation in local guesthouses/hostels is assumed for South Mumbai.",
      "Sufficient daily budget under 30 USD for budget accommodation and local food in Mumbai."
    ],
    "warnings": [
      "High crowd density at major sightseeing spots."
    ],
    "unresolved_details": [
      "Exact lodging provider and booking status.",
      "Specific hostel or guesthouse name and exact booking confirmation."
    ]
  }
