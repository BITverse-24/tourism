import { FinalTripPlan, NarrativeResult } from "../narrative";

export const replanNarrativeres: NarrativeResult = {
  "plan": {
    "plan_title": "Mumbai Cultural and Heritage Exploration (Rainy Day Adjustment)",
    "summary": "A 3-day cultural and heritage-focused itinerary through Mumbai, tailored for a budget traveler preferring local guesthouses. This plan includes a smart weather substitution on Day 2, replacing the outdoor Elephanta Caves ferry tour with premier indoor museums due to heavy rain.",
    "traveler_profile_reference": {
      "profile_id": "mock-profile",
      "profile_revision": 2
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
        "reason": "Complete the 3-day cultural and heritage exploration of Mumbai, adjusting Day 2 morning due to heavy rain by swapping Elephanta Caves for premier indoor heritage and museum experiences."
      }
    ],
    "accommodation": [
      {
        "place": "Mumbai",
        "nights": 3,
        "recommendation": "Budget guesthouse or hostel in South Mumbai (Colaba/Fort area)",
        "reason": "Aligns with traveler's strong preference for budget-friendly local guesthouse or hostel accommodation close to historical sites.",
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
        "theme": "Victorian Gothic Architecture and South Mumbai",
        "items": [
          {
            "type": "experience",
            "title": "Chhatrapati Shivaji Maharaj Terminus",
            "start_time": "09:00",
            "end_time": "09:45",
            "location": "Chhatrapati Shivaji Maharaj Terminus, Mumbai",
            "description": "A UNESCO World Heritage Site featuring Victorian Gothic Revival architecture blended with traditional Indian elements. It serves as the historic headquarters of the Central Railway.",
            "movement": {
              "mode": "walking",
              "duration_minutes": 0,
              "from": null,
              "to": "Chhatrapati Shivaji Maharaj Terminus"
            },
            "estimated_cost": {
              "amount": 0,
              "currency": "USD"
            },
            "reason": "Morning lighting highlights the intricate Victorian Gothic stone carvings and details.",
            "flexibility": "moveable"
          },
          {
            "type": "meal",
            "title": "Local South Mumbai Meal",
            "start_time": "12:30",
            "end_time": "13:30",
            "location": "Colaba / Fort Area, Mumbai",
            "description": "Enjoy a flexible, budget-friendly local meal in the Colaba/Fort area.",
            "movement": {
              "mode": "walking",
              "duration_minutes": 15,
              "from": "Chhatrapati Shivaji Maharaj Terminus",
              "to": "Colaba/Fort Area"
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Provides a casual, budget-friendly dining experience suited to the traveler's preferences.",
            "flexibility": "moveable"
          },
          {
            "type": "rest",
            "title": "Rest & Refresh",
            "start_time": "14:30",
            "end_time": "16:00",
            "location": "Budget Guesthouse / Hostel, South Mumbai",
            "description": "Take a short break at your budget guesthouse or hostel.",
            "movement": {
              "mode": "walking",
              "duration_minutes": 15,
              "from": "Colaba/Fort Area",
              "to": "Accommodation"
            },
            "estimated_cost": {
              "amount": 0,
              "currency": "USD"
            },
            "reason": "Allows time to rest and recharge during the afternoon.",
            "flexibility": "optional"
          }
        ],
        "daily_notes": "Focuses on iconic South Mumbai heritage architecture with flexible pacing."
      },
      {
        "day": 2,
        "date": null,
        "place": "Mumbai",
        "city_id": "mumbai_maharashtra",
        "theme": "Premier Indoor Heritage & Museums (Rainy Day Adaptation)",
        "items": [
          {
            "type": "experience",
            "title": "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya",
            "start_time": "09:30",
            "end_time": "12:30",
            "location": "CSMVS Museum, Mumbai",
            "description": "Mumbai's premier art and history museum, housed in a magnificent Indo-Saracenic building with sprawling gardens, showcasing thousands of ancient Indian artifacts, sculptures, and miniature paintings.",
            "movement": {
              "mode": "walking",
              "duration_minutes": 15,
              "from": "Accommodation",
              "to": "CSMVS Museum"
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Provides a magnificent indoor heritage experience to safely replace the rain-impacted outdoor ferry trip to Elephanta Caves.",
            "flexibility": "moveable"
          },
          {
            "type": "meal",
            "title": "Indoor Museum District Lunch",
            "start_time": "12:45",
            "end_time": "13:45",
            "location": "Fort District, Mumbai",
            "description": "Casual, budget-friendly dining near the Fort and museum district.",
            "movement": {
              "mode": "walking",
              "duration_minutes": 10,
              "from": "CSMVS Museum",
              "to": "Fort District Dining"
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Convenient, budget-friendly option close to the morning and afternoon cultural sites.",
            "flexibility": "moveable"
          },
          {
            "type": "experience",
            "title": "RBI Monetary Museum",
            "start_time": "14:15",
            "end_time": "15:30",
            "location": "RBI Monetary Museum, Mumbai",
            "description": "A specialized museum established by the Reserve Bank of India detailing the historic evolution of coinage, paper currency, and financial instruments across Indian history.",
            "movement": {
              "mode": "walking",
              "duration_minutes": 10,
              "from": "Fort District Dining",
              "to": "RBI Monetary Museum"
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Keeps the afternoon entirely sheltered from heavy rain while maintaining a rich cultural focus.",
            "flexibility": "moveable"
          }
        ],
        "daily_notes": "Adapted for heavy morning rain by prioritizing sheltered, premier indoor cultural institutions."
      },
      {
        "day": 3,
        "date": null,
        "place": "Mumbai",
        "city_id": "mumbai_maharashtra",
        "theme": "Political Heritage and Mahatma Gandhi History",
        "items": [
          {
            "type": "experience",
            "title": "Mani Bhavan Gandhi Sangrahalaya",
            "start_time": "09:30",
            "end_time": "10:45",
            "location": "Mani Bhavan, Mumbai",
            "description": "A historic two-story building that served as Mahatma Gandhi's focal point of political activity in Mumbai between 1917 and 1934, now a memorial and museum.",
            "movement": {
              "mode": "transit",
              "duration_minutes": 30,
              "from": "Accommodation",
              "to": "Mani Bhavan"
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Explores deep political and cultural heritage in a well-preserved historic building.",
            "flexibility": "moveable"
          },
          {
            "type": "meal",
            "title": "Historic District Lunch",
            "start_time": "12:00",
            "end_time": "13:00",
            "location": "South Mumbai",
            "description": "Simple local meal around South Mumbai.",
            "movement": {
              "mode": "transit",
              "duration_minutes": 30,
              "from": "Mani Bhavan",
              "to": "South Mumbai"
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Concludes the trip with budget-friendly local dining options.",
            "flexibility": "moveable"
          }
        ],
        "daily_notes": "Final day exploring key figures and political history in Mumbai."
      }
    ],
    "cost_summary": {
      "currency": "USD",
      "estimated_total": null,
      "scope": "Daily estimates and exact totals are unconfirmed pending specific provider and lodging selections.",
      "categories": [
        {
          "name": "Accommodation",
          "estimated_cost": 0
        },
        {
          "name": "Food and Dining",
          "estimated_cost": 0
        },
        {
          "name": "Attractions and Entry Fees",
          "estimated_cost": 0
        }
      ],
      "budget_position": "budget_unknown",
      "caveats": [
        "No specific accommodation provider costs are guaranteed.",
        "Exact meal and transport expenses will vary based on local choices."
      ]
    },
    "fit_explanation": "This plan directly honors your primary purpose of exploring culture, heritage, and iconic sights in Mumbai while respecting your strong preference for budget guesthouse or hostel accommodation. It also gracefully handles adverse weather conditions by prioritizing indoor heritage sites when rain impacts outdoor excursions.",
    "tradeoffs": [
      "Elephanta Caves ferry and island tour are omitted due to heavy rain and adverse weather conditions.",
      "Indoor galleries may experience moderate crowding during inclement weather."
    ],
    "assumptions": [
      "Traveler prefers budget guesthouse or hostel accommodation in South Mumbai.",
      "Day 2 morning weather requires substituting outdoor island visits with premier indoor cultural institutions."
    ],
    "warnings": [
      "Heavy rain may cause localized transit delays or temporary disruptions."
    ],
    "unresolved_details": [
      "Exact lodging provider and booking confirmation remain unconfirmed."
    ]
  },
  "operational": {
    "repair_attempts": 0
  }
}

export const replanfinalplantrip: FinalTripPlan = {
    "plan_title": "Mumbai Cultural and Heritage Exploration (Rainy Day Adjustment)",
    "summary": "A 3-day cultural and heritage-focused itinerary through Mumbai, tailored for a budget traveler preferring local guesthouses. This plan includes a smart weather substitution on Day 2, replacing the outdoor Elephanta Caves ferry tour with premier indoor museums due to heavy rain.",
    "traveler_profile_reference": {
      "profile_id": "mock-profile",
      "profile_revision": 2
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
        "reason": "Complete the 3-day cultural and heritage exploration of Mumbai, adjusting Day 2 morning due to heavy rain by swapping Elephanta Caves for premier indoor heritage and museum experiences."
      }
    ],
    "accommodation": [
      {
        "place": "Mumbai",
        "nights": 3,
        "recommendation": "Budget guesthouse or hostel in South Mumbai (Colaba/Fort area)",
        "reason": "Aligns with traveler's strong preference for budget-friendly local guesthouse or hostel accommodation close to historical sites.",
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
        "theme": "Victorian Gothic Architecture and South Mumbai",
        "items": [
          {
            "type": "experience",
            "title": "Chhatrapati Shivaji Maharaj Terminus",
            "start_time": "09:00",
            "end_time": "09:45",
            "location": "Chhatrapati Shivaji Maharaj Terminus, Mumbai",
            "description": "A UNESCO World Heritage Site featuring Victorian Gothic Revival architecture blended with traditional Indian elements. It serves as the historic headquarters of the Central Railway.",
            "movement": {
              "mode": "walking",
              "duration_minutes": 0,
              "from": null,
              "to": "Chhatrapati Shivaji Maharaj Terminus"
            },
            "estimated_cost": {
              "amount": 0,
              "currency": "USD"
            },
            "reason": "Morning lighting highlights the intricate Victorian Gothic stone carvings and details.",
            "flexibility": "moveable"
          },
          {
            "type": "meal",
            "title": "Local South Mumbai Meal",
            "start_time": "12:30",
            "end_time": "13:30",
            "location": "Colaba / Fort Area, Mumbai",
            "description": "Enjoy a flexible, budget-friendly local meal in the Colaba/Fort area.",
            "movement": {
              "mode": "walking",
              "duration_minutes": 15,
              "from": "Chhatrapati Shivaji Maharaj Terminus",
              "to": "Colaba/Fort Area"
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Provides a casual, budget-friendly dining experience suited to the traveler's preferences.",
            "flexibility": "moveable"
          },
          {
            "type": "rest",
            "title": "Rest & Refresh",
            "start_time": "14:30",
            "end_time": "16:00",
            "location": "Budget Guesthouse / Hostel, South Mumbai",
            "description": "Take a short break at your budget guesthouse or hostel.",
            "movement": {
              "mode": "walking",
              "duration_minutes": 15,
              "from": "Colaba/Fort Area",
              "to": "Accommodation"
            },
            "estimated_cost": {
              "amount": 0,
              "currency": "USD"
            },
            "reason": "Allows time to rest and recharge during the afternoon.",
            "flexibility": "optional"
          }
        ],
        "daily_notes": "Focuses on iconic South Mumbai heritage architecture with flexible pacing."
      },
      {
        "day": 2,
        "date": null,
        "place": "Mumbai",
        "city_id": "mumbai_maharashtra",
        "theme": "Premier Indoor Heritage & Museums (Rainy Day Adaptation)",
        "items": [
          {
            "type": "experience",
            "title": "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya",
            "start_time": "09:30",
            "end_time": "12:30",
            "location": "CSMVS Museum, Mumbai",
            "description": "Mumbai's premier art and history museum, housed in a magnificent Indo-Saracenic building with sprawling gardens, showcasing thousands of ancient Indian artifacts, sculptures, and miniature paintings.",
            "movement": {
              "mode": "walking",
              "duration_minutes": 15,
              "from": "Accommodation",
              "to": "CSMVS Museum"
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Provides a magnificent indoor heritage experience to safely replace the rain-impacted outdoor ferry trip to Elephanta Caves.",
            "flexibility": "moveable"
          },
          {
            "type": "meal",
            "title": "Indoor Museum District Lunch",
            "start_time": "12:45",
            "end_time": "13:45",
            "location": "Fort District, Mumbai",
            "description": "Casual, budget-friendly dining near the Fort and museum district.",
            "movement": {
              "mode": "walking",
              "duration_minutes": 10,
              "from": "CSMVS Museum",
              "to": "Fort District Dining"
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Convenient, budget-friendly option close to the morning and afternoon cultural sites.",
            "flexibility": "moveable"
          },
          {
            "type": "experience",
            "title": "RBI Monetary Museum",
            "start_time": "14:15",
            "end_time": "15:30",
            "location": "RBI Monetary Museum, Mumbai",
            "description": "A specialized museum established by the Reserve Bank of India detailing the historic evolution of coinage, paper currency, and financial instruments across Indian history.",
            "movement": {
              "mode": "walking",
              "duration_minutes": 10,
              "from": "Fort District Dining",
              "to": "RBI Monetary Museum"
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Keeps the afternoon entirely sheltered from heavy rain while maintaining a rich cultural focus.",
            "flexibility": "moveable"
          }
        ],
        "daily_notes": "Adapted for heavy morning rain by prioritizing sheltered, premier indoor cultural institutions."
      },
      {
        "day": 3,
        "date": null,
        "place": "Mumbai",
        "city_id": "mumbai_maharashtra",
        "theme": "Political Heritage and Mahatma Gandhi History",
        "items": [
          {
            "type": "experience",
            "title": "Mani Bhavan Gandhi Sangrahalaya",
            "start_time": "09:30",
            "end_time": "10:45",
            "location": "Mani Bhavan, Mumbai",
            "description": "A historic two-story building that served as Mahatma Gandhi's focal point of political activity in Mumbai between 1917 and 1934, now a memorial and museum.",
            "movement": {
              "mode": "transit",
              "duration_minutes": 30,
              "from": "Accommodation",
              "to": "Mani Bhavan"
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Explores deep political and cultural heritage in a well-preserved historic building.",
            "flexibility": "moveable"
          },
          {
            "type": "meal",
            "title": "Historic District Lunch",
            "start_time": "12:00",
            "end_time": "13:00",
            "location": "South Mumbai",
            "description": "Simple local meal around South Mumbai.",
            "movement": {
              "mode": "transit",
              "duration_minutes": 30,
              "from": "Mani Bhavan",
              "to": "South Mumbai"
            },
            "estimated_cost": {
              "amount": null,
              "currency": "USD"
            },
            "reason": "Concludes the trip with budget-friendly local dining options.",
            "flexibility": "moveable"
          }
        ],
        "daily_notes": "Final day exploring key figures and political history in Mumbai."
      }
    ],
    "cost_summary": {
      "currency": "USD",
      "estimated_total": null,
      "scope": "Daily estimates and exact totals are unconfirmed pending specific provider and lodging selections.",
      "categories": [
        {
          "name": "Accommodation",
          "estimated_cost": 0
        },
        {
          "name": "Food and Dining",
          "estimated_cost": 0
        },
        {
          "name": "Attractions and Entry Fees",
          "estimated_cost": 0
        }
      ],
      "budget_position": "budget_unknown",
      "caveats": [
        "No specific accommodation provider costs are guaranteed.",
        "Exact meal and transport expenses will vary based on local choices."
      ]
    },
    "fit_explanation": "This plan directly honors your primary purpose of exploring culture, heritage, and iconic sights in Mumbai while respecting your strong preference for budget guesthouse or hostel accommodation. It also gracefully handles adverse weather conditions by prioritizing indoor heritage sites when rain impacts outdoor excursions.",
    "tradeoffs": [
      "Elephanta Caves ferry and island tour are omitted due to heavy rain and adverse weather conditions.",
      "Indoor galleries may experience moderate crowding during inclement weather."
    ],
    "assumptions": [
      "Traveler prefers budget guesthouse or hostel accommodation in South Mumbai.",
      "Day 2 morning weather requires substituting outdoor island visits with premier indoor cultural institutions."
    ],
    "warnings": [
      "Heavy rain may cause localized transit delays or temporary disruptions."
    ],
    "unresolved_details": [
      "Exact lodging provider and booking confirmation remain unconfirmed."
    ]
  }
