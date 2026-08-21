import { FinalTripPlan, NarrativeResult } from "../narrative";

const ftp1: FinalTripPlan = {
    "accommodation": [
      {
        "estimated_cost": null,
        "nights": 3,
        "place": "Mumbai",
        "reason": "Single base in South Mumbai (Colaba/Fort) keeps all priority heritage sights walkable or short transit and aligns with 3-day duration and budget guesthouse preference",
        "recommendation": "Budget guesthouse/hostel in Colaba/Fort area - traveler to select specific property within $30/day target. Keeps Gateway of India, CSMVS, Asiatic Society, CSMT and Marine Drive walkable.",
        "status": "suggested"
      }
    ],
    "assumptions": [
      "Base in budget guesthouse/hostel in Colaba/Fort area to minimize daily travel to South Mumbai heritage cluster",
      "Elephanta Caves ferry operates from Gateway of India jetty and is weather-dependent",
      "No intercity travel needed; all sights within Mumbai",
      "Traveler bases in budget guesthouse/hostel in Colaba/Fort to keep Gateway, CSMVS, Asiatic Society, CSMT and Marine Drive walkable",
      "Elephanta Caves visited as half-day ferry trip from Gateway jetty; ferry schedule and sea conditions to be confirmed locally",
      "$30 per day target prioritizes free exterior sights (Gateway, CSMT, Marine Drive, Asiatic Society) and limits paid entries to Elephanta and CSMVS",
      "Balanced pace with 2-4 heritage experiences per day plus generic meal/rest slots"
    ],
    "city_allocations": [
      {
        "city_id": "mumbai_maharashtra",
        "days": 3,
        "nights": 3,
        "place": "Mumbai",
        "reason": "Single base in South Mumbai (Colaba/Fort) keeps all priority heritage sights walkable or short transit and aligns with 3-day duration and budget guesthouse preference"
      }
    ],
    "cost_summary": {
      "budget_position": "budget_unknown",
      "categories": [],
      "caveats": [
        "No guaranteed cost facts available in candidate dataset - estimated_total is null. $30/day is a target, not a ceiling. Final cost depends on traveler-selected budget guesthouse/hostel nightly rate, Elephanta ferry ticket, and entry fees for CSMVS and Elephanta Caves which must be verified locally.",
        "Free exterior sights (Gateway of India, CSMT exterior, Marine Drive, Asiatic Society exterior) help stay within target; paid entries limited to Elephanta and CSMVS to control spend.",
        "Ferry operation is weather-dependent and seasonal sea conditions may affect availability and price."
      ],
      "currency": "USD",
      "estimated_total": null,
      "scope": "per_day target $30 - total for 3 days not estimated due to missing price guarantees"
    },
    "days": [
      {
        "city_id": "mumbai_maharashtra",
        "daily_notes": "South Mumbai heritage cluster - walkable focus on Gateway and Fort area",
        "date": null,
        "day": 1,
        "items": [
          {
            "description": "Iconic Indo-Saracenic basalt arch at Colaba waterfront overlooking Arabian Sea, built to commemorate 1911 royal visit. Start early for photos and to observe morning activity before crowds build.",
            "end_time": null,
            "estimated_cost": null,
            "flexibility": "fixed",
            "location": "Mumbai",
            "movement": null,
            "reason": "Best_time_of_day includes Early_Morning and photography_value Very_High; 60 min matches typical duration and allows unhurried viewing before ferry crowds",
            "start_time": null,
            "title": "Gateway of India - early morning waterfront visit",
            "type": "experience"
          },
          {
            "description": "Generic meal slot with flexible timing near Colaba/Fort; choose venue based on budget and dietary needs without pre-booking a specific restaurant.",
            "end_time": null,
            "estimated_cost": null,
            "flexibility": "fixed",
            "location": null,
            "movement": null,
            "reason": null,
            "start_time": null,
            "title": "Lunch break - flexible timing",
            "type": "meal"
          },
          {
            "description": "Premier art and history museum in Indo-Saracenic building with gardens, showcasing ancient artifacts, sculptures and miniature paintings in Fort area, short walk from Gateway.",
            "end_time": null,
            "estimated_cost": null,
            "flexibility": "fixed",
            "location": "Mumbai",
            "movement": null,
            "reason": "Indoor museum best Morning/Afternoon; typical duration 180 min allows comprehensive galleries without rushing; Moderate crowd level more comfortable midday",
            "start_time": null,
            "title": "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya (CSMVS) Museum",
            "type": "experience"
          },
          {
            "description": "Grand 1833 Neo-Classical building with Doric columns and historic library, representing South Mumbai's colonial-era architecture in Fort.",
            "end_time": null,
            "estimated_cost": null,
            "flexibility": "fixed",
            "location": "Mumbai",
            "movement": null,
            "reason": "Typical duration 40 min and best Late_Afternoon timing fits between museum and sunset; Very_High photography value for facade and steps",
            "start_time": null,
            "title": "Asiatic Society Town Hall - Neo-Classical heritage stop",
            "type": "experience"
          },
          {
            "description": "3.6 km C-shaped boulevard along South Mumbai coast, famous as Queen's Necklace at night. Leisurely walk and sunset viewing.",
            "end_time": null,
            "estimated_cost": null,
            "flexibility": "fixed",
            "location": "Mumbai",
            "movement": null,
            "reason": "Best_time_of_day Sunset/Evening and Very_High photography value; 90 min typical allows relaxed stroll after heritage-heavy day",
            "start_time": null,
            "title": "Marine Drive sunset promenade",
            "type": "experience"
          },
          {
            "description": "Generic dinner slot near Marine Lines/Colaba with flexible timing; prioritize budget-friendly local options.",
            "end_time": null,
            "estimated_cost": null,
            "flexibility": "fixed",
            "location": null,
            "movement": null,
            "reason": null,
            "start_time": null,
            "title": "Dinner - flexible budget option",
            "type": "meal"
          },
          {
            "description": "Overnight in South Mumbai budget guesthouse/hostel to keep next day's ferry departure convenient.",
            "end_time": null,
            "estimated_cost": null,
            "flexibility": "fixed",
            "location": null,
            "movement": null,
            "reason": null,
            "start_time": null,
            "title": "Rest at budget accommodation",
            "type": "rest"
          }
        ],
        "place": "Mumbai",
        "theme": "Gateway & Fort Heritage Core"
      },
      {
        "city_id": "mumbai_maharashtra",
        "daily_notes": "Half-day island trip - ferry dependent, confirm locally",
        "date": null,
        "day": 2,
        "items": [
          {
            "description": "UNESCO rock-cut cave network on Elephanta Island dedicated to Shiva, featuring Trimurti sculpture. Ferry from Gateway of India, then climb and cave exploration.",
            "end_time": null,
            "estimated_cost": null,
            "flexibility": "fixed",
            "location": "Mumbai",
            "movement": null,
            "reason": "Typical duration 240 min plus ferry time; best Morning/Afternoon and best months Oct-Mar align with heritage focus; island setting requires half-day block",
            "start_time": null,
            "title": "Elephanta Caves day trip from Gateway jetty",
            "type": "experience"
          },
          {
            "description": "Generic meal slot after returning to mainland; timing depends on ferry arrival, keep flexible and budget-conscious.",
            "end_time": null,
            "estimated_cost": null,
            "flexibility": "fixed",
            "location": null,
            "movement": null,
            "reason": null,
            "start_time": null,
            "title": "Lunch - flexible timing on return",
            "type": "meal"
          },
          {
            "description": "UNESCO Victorian Gothic Revival railway terminus blending Indian elements, historic headquarters of Central Railway in Fort. Focus on exterior architecture and photography.",
            "end_time": null,
            "estimated_cost": null,
            "flexibility": "fixed",
            "location": "Mumbai",
            "movement": null,
            "reason": "Typical 45 min exterior visit; best Morning/Evening/Night for light; Very_High photography value and Very_High local authenticity as active station",
            "start_time": null,
            "title": "Chhatrapati Shivaji Maharaj Terminus (CSMT) exterior heritage viewing",
            "type": "experience"
          },
          {
            "description": "Generic dinner slot in Fort/Colaba area with flexible timing.",
            "end_time": null,
            "estimated_cost": null,
            "flexibility": "fixed",
            "location": null,
            "movement": null,
            "reason": null,
            "start_time": null,
            "title": "Dinner - flexible",
            "type": "meal"
          },
          {
            "description": "Overnight rest to recover from island walking and prepare for final heritage day.",
            "end_time": null,
            "estimated_cost": null,
            "flexibility": "fixed",
            "location": null,
            "movement": null,
            "reason": null,
            "start_time": null,
            "title": "Rest",
            "type": "rest"
          }
        ],
        "place": "Mumbai",
        "theme": "Elephanta Caves & Victorian Gothic Heritage"
      },
      {
        "city_id": "mumbai_maharashtra",
        "daily_notes": "Freedom-movement heritage and living culture - balanced pace",
        "date": null,
        "day": 3,
        "items": [
          {
            "description": "Historic two-story building where Gandhi centered political activity 1917-1934, now memorial museum in Gamdevi, showcasing heritage of independence movement.",
            "end_time": null,
            "estimated_cost": null,
            "flexibility": "fixed",
            "location": "Mumbai",
            "movement": null,
            "reason": "Typical 75 min indoor visit; Easy accessibility and Moderate crowd allow calm morning; complements South Mumbai colonial architecture with freedom-movement heritage",
            "start_time": null,
            "title": "Mani Bhavan Gandhi Sangrahalaya",
            "type": "experience"
          },
          {
            "description": "World's largest open-air laundromat from 1890 where dhobis wash clothes in concrete troughs, offering living workforce heritage and photography.",
            "end_time": null,
            "estimated_cost": null,
            "flexibility": "fixed",
            "location": "Mumbai",
            "movement": null,
            "reason": "Best Morning timing and 45 min typical duration fits after Mani Bhavan; Very_High local authenticity and photography value with Easy accessibility",
            "start_time": null,
            "title": "Dhobi Ghat (Mahalaxmi) - open-air heritage laundromat",
            "type": "experience"
          },
          {
            "description": "Generic lunch slot near Mahalaxmi/Gamdevi with flexible timing before afternoon free time.",
            "end_time": null,
            "estimated_cost": null,
            "flexibility": "fixed",
            "location": null,
            "movement": null,
            "reason": null,
            "start_time": null,
            "title": "Lunch - flexible budget meal",
            "type": "meal"
          },
          {
            "description": "Generic rest and flexible time for revisiting Colaba Causeway area, shopping, or additional photography without a fixed venue; keeps pace balanced and budget low.",
            "end_time": null,
            "estimated_cost": null,
            "flexibility": "fixed",
            "location": null,
            "movement": null,
            "reason": null,
            "start_time": null,
            "title": "Afternoon rest / flexible exploration",
            "type": "rest"
          },
          {
            "description": "Generic final dinner slot with flexible timing near accommodation.",
            "end_time": null,
            "estimated_cost": null,
            "flexibility": "fixed",
            "location": null,
            "movement": null,
            "reason": null,
            "start_time": null,
            "title": "Dinner - flexible",
            "type": "meal"
          },
          {
            "description": "Final overnight in budget accommodation; departure next day via CSMT or BOM airport as needed.",
            "end_time": null,
            "estimated_cost": null,
            "flexibility": "fixed",
            "location": null,
            "movement": null,
            "reason": null,
            "start_time": null,
            "title": "Overnight rest",
            "type": "rest"
          }
        ],
        "place": "Mumbai",
        "theme": "Gandhi Heritage & Living Culture"
      }
    ],
    "destination_route": [
      {
        "arrival_from": null,
        "city_id": "mumbai_maharashtra",
        "departure_to": null,
        "order": 1,
        "place": "Mumbai"
      }
    ],
    "fit_explanation": "This 3-day single-base plan in South Mumbai (Colaba/Fort) directly delivers your primary purpose 'Culture, heritage & iconic sights' and all three stated priorities: Gateway of India on Day 1 early morning, Elephanta Caves as the full half-day focus on Day 2, and historic architecture in South Mumbai throughout (CSMVS Museum, Asiatic Society Town Hall, CSMT Victorian Gothic exterior, plus Mani Bhavan). Balanced pace with 2-4 heritage experiences per day plus flexible generic meal/rest slots respects your exploration-first comfort preference while keeping daily travel minimal. Budget accommodation preference (strong) is honored by recommending a budget guesthouse/hostel in Colaba/Fort and prioritizing free exterior sights (Gateway, CSMT, Marine Drive, Asiatic Society) with only two paid entries (CSMVS, Elephanta) to help stay near your $30/day target. Somewhat flexible dates help with weather-dependent Elephanta ferry.",
    "plan_title": "Mumbai Heritage in 3 Days — Gateway, Elephanta & South Mumbai Architecture on a $30/Day Budget",
    "summary": "Stay 3 nights in a single budget guesthouse/hostel in Colaba/Fort to keep South Mumbai's heritage cluster walkable. Day 1 covers Gateway of India at sunrise, CSMVS Museum, Asiatic Society Town Hall and a Marine Drive sunset. Day 2 is your Elephanta Caves UNESCO ferry day from the Gateway jetty, followed by CSMT's Victorian Gothic exterior. Day 3 adds Mani Bhavan Gandhi heritage and Dhobi Ghat's living laundromat, with flexible time for Colaba Causeway. All sights are within Mumbai — no intercity travel — maximizing time for your top priorities while keeping costs low with generic meal/rest slots.",
    "tradeoffs": [
      "Single base maximizes heritage time and reduces hotel changes vs. exploring distant suburbs",
      "Concentrating on South Mumbai heritage limits beach/nature coverage but matches stated priorities",
      "Focusing on South Mumbai historic architecture and UNESCO sites maximizes stated priorities but leaves limited time for distant suburbs like Bandra or Sanjay Gandhi National Park",
      "Including Elephanta Caves consumes half of Day 2 but delivers top priority; alternative would be Kanheri Caves which requires longer transit",
      "Using generic meal/rest slots preserves budget flexibility vs. naming specific restaurants"
    ],
    "traveler_profile_reference": {
      "profile_id": "mock-profile",
      "profile_revision": 1
    },
    "trip_dates": {
      "duration_days": 3,
      "end_date": null,
      "flexibility": "somewhat_flexible",
      "start_date": null
    },
    "unresolved_details": [
      "Exact ferry timings and ticket availability for Elephanta Caves need local confirmation",
      "Budget accommodation availability and final nightly rate within $30/day target needs traveler verification",
      "Exact budget accommodation name and nightly rate within $30/day needs traveler selection",
      "Elephanta ferry ticket price, departure times and seasonal sea conditions require local confirmation",
      "Entry fees for CSMVS and Elephanta not guaranteed and should be verified locally"
    ],
    "warnings": [
      "Gateway of India has Very_High crowd level even early morning - 60 min visit keeps it manageable",
      "Elephanta Caves requires ~1 hour ferry each way plus steps/climb; accessibility Moderate, elderly suitability Poor; confirm ferry schedule and sea conditions locally",
      "CSMT is an active station with Very_High crowds - exterior viewing recommended; interior platforms require ticket",
      "No bookings or transport guarantees are included - all timings, ferry operation and entry fees must be verified locally"
    ]
  }

