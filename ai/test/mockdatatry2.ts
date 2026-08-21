import { FinalTripPlan, NarrativeResult } from "../narrative";

const ftp1: FinalTripPlan = {
    "accommodation": [
      {
        "estimated_cost": null,
        "nights": 3,
        "place": "Budget guesthouse or hostel in Colaba/Fort area - single base for all 3 nights to minimize transit to Gateway, CSMVS and Victorian ensemble. No specific property named; book budget option near heritage cluster.",
        "reason": "Single base in South Mumbai covers all requested priorities without hotel changes, ideal for budget stay and balanced pace",
        "recommendation": "Stay in Colaba/Fort within walking distance of Gateway of India jetty and Fort heritage precinct. Choose budget guesthouse/hostel per $30/day target; verify availability and advance booking requirement.",
        "status": "not_yet_decided"
      }
    ],
    "assumptions": [
      "Stay in budget guesthouse/hostel in Colaba/Fort area to minimize transit to South Mumbai heritage cluster",
      "Elephanta ferry operates from Gateway of India jetty and is day-trip feasible within one morning/afternoon block",
      "Walking between Fort heritage buildings is feasible; local trains/buses available for longer hops",
      "Budget accommodation in Colaba/Fort area assumed available within $30 per day target; actual rates vary by season",
      "Elephanta ferry round-trip and cave entry are paid separately; timing assumes morning departure and return by early afternoon",
      "Walking tolerance sufficient for Fort heritage cluster (1-2 km between sites); auto/taxi optional for Mani Bhavan/Khotachiwadi transfer"
    ],
    "city_allocations": [
      {
        "city_id": "mumbai_maharashtra",
        "days": 3,
        "nights": 3,
        "place": "Mumbai - South Mumbai base (Colaba/Fort)",
        "reason": "Single base in South Mumbai (Colaba/Fort) covers all requested priorities — Gateway of India, Elephanta Caves ferry point, and Victorian Gothic ensemble — without hotel changes, ideal for budget stay and balanced pace"
      }
    ],
    "cost_summary": {
      "budget_position": "budget_unknown",
      "categories": [],
      "caveats": [
        "No grounded attraction prices, ferry fares, or accommodation rates provided in CandidateBundle; cannot estimate total cost against $30/day target",
        "CSMVS, Elephanta Caves entry and ferry are paid separately - verify current fees"
      ],
      "currency": "USD",
      "estimated_total": null,
      "scope": "per_day"
    },
    "days": [
      {
        "city_id": "mumbai_maharashtra",
        "daily_notes": "Early start to catch Gateway in softer light before crowds build; indoor museum covers midday heat; sunset promenade to close the day.",
        "date": null,
        "day": 1,
        "items": [
          {
            "description": "Iconic Indo-Saracenic basalt arch at Colaba waterfront overlooking Arabian Sea, built for 1911 royal visit. Exterior viewing, photography and promenade walk.",
            "end_time": "09:00",
            "estimated_cost": null,
            "flexibility": "fixed",
            "location": "Gateway of India, Colaba",
            "movement": null,
            "reason": "Early morning aligns with best_time_of_day and reduces Very_High crowd pressure; 60 min typical duration",
            "start_time": "08:00",
            "title": "Gateway of India waterfront visit",
            "type": "experience"
          },
          {
            "description": "Short walk between Gateway promenade and breakfast area in Colaba.",
            "end_time": "09:15",
            "estimated_cost": null,
            "flexibility": "moveable",
            "location": null,
            "movement": {
              "duration_minutes": 15,
              "from": "Gateway of India",
              "mode": "walk",
              "to": "Colaba breakfast area"
            },
            "reason": null,
            "start_time": "09:00",
            "title": "Walk to breakfast area",
            "type": "movement"
          },
          {
            "description": "Generic meal slot with flexible timing near Colaba/Fort. Choose budget local eatery per dietary needs; no venue named.",
            "end_time": "10:00",
            "estimated_cost": null,
            "flexibility": "moveable",
            "location": "Colaba/Fort",
            "movement": null,
            "reason": null,
            "start_time": "09:15",
            "title": "Breakfast / morning meal break",
            "type": "meal"
          },
          {
            "description": "Walk to museum precinct.",
            "end_time": "10:15",
            "estimated_cost": null,
            "flexibility": "moveable",
            "location": null,
            "movement": {
              "duration_minutes": 15,
              "from": "Colaba",
              "mode": "walk",
              "to": "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya"
            },
            "reason": null,
            "start_time": "10:00",
            "title": "Walk to CSMVS",
            "type": "movement"
          },
          {
            "description": "Premier art and history museum in Indo-Saracenic building with gardens, housing ancient artifacts, sculptures and miniature paintings in Fort area, short walk from Gateway.",
            "end_time": "13:15",
            "estimated_cost": null,
            "flexibility": "moveable",
            "location": "CSMVS, Fort",
            "movement": null,
            "reason": "180 min typical duration allows unhurried galleries; indoor setting ideal for midday heat",
            "start_time": "10:15",
            "title": "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya (Prince of Wales Museum)",
            "type": "experience"
          },
          {
            "description": "Short walk within Fort heritage precinct.",
            "end_time": "13:25",
            "estimated_cost": null,
            "flexibility": "moveable",
            "location": null,
            "movement": {
              "duration_minutes": 10,
              "from": "CSMVS",
              "mode": "walk",
              "to": "Asiatic Society Town Hall"
            },
            "reason": null,
            "start_time": "13:15",
            "title": "Walk to Asiatic Society Town Hall",
            "type": "movement"
          },
          {
            "description": "Grand 1833 Neo-Classical Town Hall with Doric columns and steps, housing rare manuscripts. Exterior viewing and steps photography in Fort heritage precinct.",
            "end_time": "14:05",
            "estimated_cost": null,
            "flexibility": "moveable",
            "location": "Asiatic Society Town Hall, Fort",
            "movement": null,
            "reason": "40 min typical duration fits as short stop between museum and Marine Drive; outdoor/mixed setting, late afternoon light",
            "start_time": "13:25",
            "title": "Asiatic Society Town Hall",
            "type": "experience"
          },
          {
            "description": "Generic rest period at budget accommodation. No venue named. Useful buffer before sunset walk.",
            "end_time": "16:00",
            "estimated_cost": null,
            "flexibility": "optional",
            "location": "Budget accommodation, Colaba/Fort",
            "movement": null,
            "reason": null,
            "start_time": "14:05",
            "title": "Rest at accommodation",
            "type": "rest"
          },
          {
            "description": "Transit to Marine Drive promenade.",
            "end_time": "16:20",
            "estimated_cost": null,
            "flexibility": "moveable",
            "location": null,
            "movement": {
              "duration_minutes": 20,
              "from": "Fort/Colaba accommodation",
              "mode": "walk / local taxi as convenient",
              "to": "Marine Drive"
            },
            "reason": null,
            "start_time": "16:00",
            "title": "Transit to Marine Drive",
            "type": "movement"
          },
          {
            "description": "3.6 km C-shaped boulevard from Marine Lines to Nariman Point, famous as Queen's Necklace at night. Leisurely walk, sunset viewing and people-watching.",
            "end_time": "17:50",
            "estimated_cost": null,
            "flexibility": "fixed",
            "location": "Marine Drive",
            "movement": null,
            "reason": "90 min typical at sunset aligns with best_time_of_day and provides relaxed end to Day 1",
            "start_time": "16:20",
            "title": "Marine Drive sunset promenade",
            "type": "experience"
          }
        ],
        "place": "Mumbai - South Mumbai heritage cluster",
        "theme": "Gateway, Museum & Sunset Promenade"
      },
      {
        "city_id": "mumbai_maharashtra",
        "daily_notes": "Ferry-dependent morning; early departure maximizes cooler hours. Victorian ensemble clustered for efficient walking in late afternoon.",
        "date": null,
        "day": 2,
        "items": [
          {
            "description": "UNESCO rock-cut cave network on Elephanta Island dedicated to Shiva, featuring Trimurti sculpture. Ferry from Gateway of India, then climb and guided cave exploration.",
            "end_time": "12:00",
            "estimated_cost": null,
            "flexibility": "fixed",
            "location": "Elephanta Island, ferry from Gateway of India jetty",
            "movement": null,
            "reason": "240 min typical plus ferry buffer; morning best_time_of_day avoids afternoon heat. Ferry dependency - weather dependent, steps involved.",
            "start_time": "08:00",
            "title": "Elephanta Caves day trip from Gateway jetty",
            "type": "experience"
          },
          {
            "description": "Ferry return and short walk to mainland meal area.",
            "end_time": "12:20",
            "estimated_cost": null,
            "flexibility": "moveable",
            "location": null,
            "movement": {
              "duration_minutes": 20,
              "from": "Gateway jetty",
              "mode": "walk",
              "to": "Colaba/Fort meal area"
            },
            "reason": null,
            "start_time": "12:00",
            "title": "Walk from jetty",
            "type": "movement"
          },
          {
            "description": "Generic meal slot with flexible timing after returning to mainland. Budget-friendly, no venue named.",
            "end_time": "13:10",
            "estimated_cost": null,
            "flexibility": "moveable",
            "location": "Colaba/Fort",
            "movement": null,
            "reason": null,
            "start_time": "12:20",
            "title": "Lunch break",
            "type": "meal"
          },
          {
            "description": "Transit to Fort Victorian ensemble. Short rest buffer if needed.",
            "end_time": "13:40",
            "estimated_cost": null,
            "flexibility": "moveable",
            "location": null,
            "movement": {
              "duration_minutes": 15,
              "from": "Colaba/Fort",
              "mode": "walk / local transit as convenient",
              "to": "Chhatrapati Shivaji Maharaj Terminus area"
            },
            "reason": null,
            "start_time": "13:10",
            "title": "Transit to CSMT area",
            "type": "movement"
          },
          {
            "description": "UNESCO Victorian Gothic Revival railway terminus blending Indian elements, headquarters of Central Railway. Exterior photography and facade appreciation in Fort.",
            "end_time": "14:25",
            "estimated_cost": null,
            "flexibility": "moveable",
            "location": "Chhatrapati Shivaji Maharaj Terminus, Fort",
            "movement": null,
            "reason": "45 min typical for exterior; Very_High crowd area best viewed from outside without entering platforms; late afternoon light",
            "start_time": "13:40",
            "title": "Chhatrapati Shivaji Maharaj Terminus exterior",
            "type": "experience"
          },
          {
            "description": "Walk within UNESCO Victorian ensemble.",
            "end_time": "14:35",
            "estimated_cost": null,
            "flexibility": "moveable",
            "location": null,
            "movement": {
              "duration_minutes": 10,
              "from": "CSMT",
              "mode": "walk",
              "to": "Rajabai Clock Tower"
            },
            "reason": null,
            "start_time": "14:25",
            "title": "Walk to Rajabai Clock Tower",
            "type": "movement"
          },
          {
            "description": "280-foot Venetian Gothic clock tower (1878) inside University of Mumbai Fort campus, part of UNESCO Victorian ensemble. Exterior viewing and campus walk.",
            "end_time": "15:20",
            "estimated_cost": null,
            "flexibility": "moveable",
            "location": "Rajabai Clock Tower, Fort campus",
            "movement": null,
            "reason": "45 min typical; pairs geographically with CSMT and High Court in Fort cluster",
            "start_time": "14:35",
            "title": "Rajabai Clock Tower",
            "type": "experience"
          },
          {
            "description": "Short walk to next heritage building.",
            "end_time": "15:30",
            "estimated_cost": null,
            "flexibility": "moveable",
            "location": null,
            "movement": {
              "duration_minutes": 10,
              "from": "Rajabai Clock Tower",
              "mode": "walk",
              "to": "Bombay High Court"
            },
            "reason": null,
            "start_time": "15:20",
            "title": "Walk to Bombay High Court",
            "type": "movement"
          },
          {
            "description": "Imposing Victorian Neo-Gothic fortress-like judicial building (1878) by Col. J.A. Fuller, integral to UNESCO heritage cluster. Facade viewing and photography.",
            "end_time": "16:15",
            "estimated_cost": null,
            "flexibility": "moveable",
            "location": "Bombay High Court, Fort",
            "movement": null,
            "reason": "45 min typical; completes Fort Victorian ensemble walk with Rajabai and CSMT",
            "start_time": "15:30",
            "title": "Bombay High Court exterior",
            "type": "experience"
          },
          {
            "description": "Generic rest period. No venue named. Evening free after dense heritage walk.",
            "end_time": "17:30",
            "estimated_cost": null,
            "flexibility": "optional",
            "location": "Budget accommodation",
            "movement": null,
            "reason": null,
            "start_time": "16:15",
            "title": "Rest",
            "type": "rest"
          }
        ],
        "place": "Mumbai - Elephanta Island & Fort Victorian ensemble",
        "theme": "Elephanta Island & Victorian Gothic Ensemble"
      },
      {
        "city_id": "mumbai_maharashtra",
        "daily_notes": "Lighter final day with Gandhi heritage and hidden-gem village walk; flexible afternoon for revisit or rest before departure.",
        "date": null,
        "day": 3,
        "items": [
          {
            "description": "Historic two-story building where Gandhi centered political activity 1917-1934, now memorial museum in Gamdevi. Exhibits on Gandhi's life and Mumbai role.",
            "end_time": "09:45",
            "estimated_cost": null,
            "flexibility": "moveable",
            "location": "Mani Bhavan, Gamdevi",
            "movement": null,
            "reason": "75 min typical indoor visit; Easy accessibility and Excellent family/elderly suitability; morning timing",
            "start_time": "08:30",
            "title": "Mani Bhavan Gandhi Sangrahalaya",
            "type": "experience"
          },
          {
            "description": "Transit between Gamdevi and Girgaon heritage precinct.",
            "end_time": "10:05",
            "estimated_cost": null,
            "flexibility": "moveable",
            "location": null,
            "movement": {
              "duration_minutes": 20,
              "from": "Mani Bhavan",
              "mode": "walk / local taxi as convenient",
              "to": "Khotachiwadi"
            },
            "reason": null,
            "start_time": "09:45",
            "title": "Transit to Khotachiwadi",
            "type": "movement"
          },
          {
            "description": "Historic East Indian precinct with narrow lanes and 19th-century Portuguese-style wooden homes in Girgaon. Slow heritage walk, architecture photography and local life.",
            "end_time": "11:05",
            "estimated_cost": null,
            "flexibility": "moveable",
            "location": "Khotachiwadi, Girgaon",
            "movement": null,
            "reason": "60 min typical; Low crowd Hidden_Gem with Very_High local authenticity complements South Mumbai monumental heritage",
            "start_time": "10:05",
            "title": "Khotachiwadi heritage village walk",
            "type": "experience"
          },
          {
            "description": "Generic meal slot with flexible timing near Girgaon/Gamdevi. Budget option, no venue named.",
            "end_time": "12:00",
            "estimated_cost": null,
            "flexibility": "moveable",
            "location": "Girgaon/Gamdevi",
            "movement": null,
            "reason": null,
            "start_time": "11:05",
            "title": "Lunch break",
            "type": "meal"
          },
          {
            "description": "Transit to seafront.",
            "end_time": "12:20",
            "estimated_cost": null,
            "flexibility": "moveable",
            "location": null,
            "movement": {
              "duration_minutes": 20,
              "from": "Girgaon",
              "mode": "walk / local taxi as convenient",
              "to": "Marine Drive / Girgaon Chowpatty"
            },
            "reason": null,
            "start_time": "12:00",
            "title": "Transit to Marine Drive area",
            "type": "movement"
          },
          {
            "description": "Optional second short promenade for daytime sea view or relaxed beachfront time, alternative to shopping at Colaba Causeway area if preferred.",
            "end_time": "13:50",
            "estimated_cost": null,
            "flexibility": "optional",
            "location": "Marine Drive / Girgaon Chowpatty",
            "movement": null,
            "reason": "Reuse of Marine Drive with different light; 90 min flexible, can be shortened for budget shopping or rest",
            "start_time": "12:20",
            "title": "Marine Drive leisure revisit or Girgaon Chowpatty option",
            "type": "experience"
          },
          {
            "description": "Generic rest and packing time before departure. No venue named.",
            "end_time": "15:00",
            "estimated_cost": null,
            "flexibility": "moveable",
            "location": "Budget accommodation",
            "movement": null,
            "reason": null,
            "start_time": "13:50",
            "title": "Rest and packing",
            "type": "rest"
          }
        ],
        "place": "Mumbai - Gamdevi, Girgaon & Seafront",
        "theme": "Gandhi Heritage & Hidden Village Lanes"
      }
    ],
    "destination_route": [
      {
        "arrival_from": null,
        "city_id": "mumbai_maharashtra",
        "departure_to": null,
        "order": 1,
        "place": "Mumbai, Maharashtra"
      }
    ],
    "fit_explanation": "Purpose is Culture, heritage & iconic sights with priorities Gateway of India, Elephanta Caves, and Historic architecture in South Mumbai. Itinerary delivers all three without hotel changes: Day 1 covers Gateway waterfront at early morning plus CSMVS and Fort precinct; Day 2 is dedicated Elephanta morning ferry (core UNESCO priority) followed by concentrated Victorian Gothic ensemble (CSMT, Rajabai Clock Tower, Bombay High Court) to minimize repeated transit; Day 3 adds Gandhi heritage (Mani Bhavan) and hidden-gem Khotachiwadi lanes for depth beyond monuments. Balanced pace with 60-180 min visits, midday indoor breaks, and sunset promenade. Budget accommodation preference respected via single Colaba/Fort base and generic budget meal slots; no specific venues invented. Somewhat flexible dates allow ferry contingency.",
    "plan_title": "Mumbai 3-Day South Mumbai Heritage Base - Gateway, Elephanta & Victorian Ensemble",
    "summary": "Three days based in South Mumbai (Colaba/Fort) covering your top priorities without hotel changes. Day 1: Gateway of India at early light, CSMVS museum, Asiatic Society Town Hall and Marine Drive sunset. Day 2: Morning ferry to Elephanta Caves, then walking tour of UNESCO Victorian ensemble - CSMT, Rajabai Clock Tower and Bombay High Court. Day 3: Mani Bhavan Gandhi museum, Khotachiwadi heritage village walk and optional Marine Drive/Girgaon Chowpatty revisit. Balanced pacing with indoor midday activities, short walks between Fort sites, and flexible budget meal/rest buffers.",
    "tradeoffs": [
      "Single-city base maximizes depth in South Mumbai heritage vs adding a second city",
      "Concentrating Victorian ensemble on one day reduces repeated transit but makes Day 2 dense",
      "Prioritized requested icons (Gateway, Elephanta, Victorian ensemble) over beach/nature sites to meet culture/heritage purpose",
      "Used single base to keep costs low and avoid hotel changes, trading off broader Mumbai coverage (e.g., Bandra, Juhu) for depth in South Mumbai"
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
      "Exact ferry departure times and return buffer for Elephanta Caves",
      "Budget accommodation availability and advance booking requirement",
      "Exact budget guesthouse/hostel name and booking confirmation",
      "Current Elephanta ferry schedule, last return ferry, and any booking requirement",
      "Entry fees and opening hours verification for CSMVS and Mani Bhavan on travel dates"
    ],
    "warnings": [
      "Elephanta requires ferry from Gateway and involves steps/climb; may be strenuous and weather-dependent in monsoon (avoid June-August). Alternative if ferry cancelled is extended Fort heritage walk including CSMVS or Kanheri Caves.",
      "Very_High crowds at Gateway of India and CSMT - early morning and exterior viewing recommended",
      "Asiatic Society interior access may be limited; focus on exterior and library steps",
      "Bombay High Court and Rajabai Clock Tower interior access restricted - exterior viewing only",
      "Khotachiwadi is residential; keep noise low and respect privacy",
      "Marine Drive High crowd level at sunset"
    ]
  }


