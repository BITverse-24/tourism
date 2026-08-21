// import { CandidateBundle, CandidateDesignResult } from "../candidate-design";

// export const mockCandDesRes: CandidateDesignResult = {
//   "mode": "itinerary",
//   "profile_revision": 1,
//   "dataset_revisions": {
//     "city": "local",
//     "attraction": "local"
//   },
//   "candidates": [
//     {
//       "candidate_id": "mumbai_culture_budget_3day",
//       "profile_revision": 1,
//       "dataset_revisions": {
//         "city": "v1",
//         "attraction": "v1"
//       },
//       "route": {
//         "route_id": "mumbai_culture_route",
//         "stops": [
//           {
//             "city_id": "mumbai_maharashtra",
//             "city_name": "Mumbai",
//             "order": 1,
//             "days": 3,
//             "reason": "Mumbai is the requested destination, offering rich colonial heritage, historic architecture, and iconic sights aligned with the traveler's priorities.",
//             "evidence_refs": [
//               "gateway_of_india_mumbai_maharashtra",
//               "chhatrapati_shivaji_maharaj_terminus_mumbai_maharashtra",
//               "elephanta_caves_mumbai_maharashtra"
//             ]
//           }
//         ],
//         "assumptions": [
//           "Traveler arrives directly in Mumbai and stays in a budget-friendly local guesthouse or hostel in South Mumbai (Colaba or Fort area) to minimize daily travel overhead."
//         ],
//         "tradeoffs": [
//           "Focusing exclusively on Mumbai over a 3-day period allows deep coverage of the iconic sights without exhausting long-distance travel."
//         ],
//         "unresolved_details": [
//           "Exact hostel/guesthouse name and booking confirmation are left flexible to fit the traveler's budget preference."
//         ]
//       },
//       "days": [
//         {
//           "city_id": "mumbai_maharashtra",
//           "day_number": 1,
//           "items": [
//             {
//               "type": "experience",
//               "attraction_id": "gateway_of_india_mumbai_maharashtra",
//               "city_id": "mumbai_maharashtra",
//               "title": "Gateway of India",
//               "description": "Start the journey at Mumbai's signature historic waterfront monument, taking in the grand Indo-Saracenic basalt arch and views of the Arabian Sea.",
//               "visit_approach": {
//                 "mode": "self_guided",
//                 "timing_preference": "Early_Morning",
//                 "duration_minutes": 60,
//                 "pace": "balanced",
//                 "focus": [
//                   "History",
//                   "Architecture",
//                   "Photography"
//                 ],
//                 "rationale": "Visiting in the early morning avoids the heaviest crowds and harsh midday sun while capturing the monument in soft light.",
//                 "tradeoffs": [
//                   "Early morning means ferry ticket counters for Elephanta may not yet be open, but it provides prime photographic conditions."
//                 ]
//               },
//               "evidence_refs": [
//                 "gateway_of_india_mumbai_maharashtra"
//               ],
//               "soft_conflicts": []
//             },
//             {
//               "type": "meal",
//               "attraction_id": null,
//               "city_id": "mumbai_maharashtra",
//               "title": "Local Breakfast / Tea",
//               "description": "Enjoy a casual, budget-friendly breakfast at a local heritage café or street-side stall near Colaba.",
//               "visit_approach": null,
//               "evidence_refs": [],
//               "soft_conflicts": []
//             },
//             {
//               "type": "experience",
//               "attraction_id": "csmvs_museum_mumbai_maharashtra",
//               "city_id": "mumbai_maharashtra",
//               "title": "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya",
//               "description": "Explore Mumbai's premier art and history museum, housed in a magnificent Indo-Saracenic building with sprawling gardens.",
//               "visit_approach": {
//                 "mode": "self_guided",
//                 "timing_preference": "Morning",
//                 "duration_minutes": 180,
//                 "pace": "balanced",
//                 "focus": [
//                   "History",
//                   "Art",
//                   "Architecture"
//                 ],
//                 "rationale": "Morning hours are ideal for indoor museum galleries before the midday peak.",
//                 "tradeoffs": [
//                   "Allocating 3 hours means skipping some minor exhibit halls if a more relaxed pace is desired."
//                 ]
//               },
//               "evidence_refs": [
//                 "csmvs_museum_mumbai_maharashtra"
//               ],
//               "soft_conflicts": []
//             },
//             {
//               "type": "meal",
//               "attraction_id": null,
//               "city_id": "mumbai_maharashtra",
//               "title": "Midday Meal",
//               "description": "Enjoy an affordable local meal or regional thali nearby in the Fort district.",
//               "visit_approach": null,
//               "evidence_refs": [],
//               "soft_conflicts": []
//             },
//             {
//               "type": "experience",
//               "attraction_id": "colaba_causeway_market_mumbai_maharashtra",
//               "city_id": "mumbai_maharashtra",
//               "title": "Colaba Causeway Market",
//               "description": "Stroll down the bustling commercial street known for street shopping, antiques, handicrafts, and local culture.",
//               "visit_approach": {
//                 "mode": "self_guided",
//                 "timing_preference": "Afternoon",
//                 "duration_minutes": 120,
//                 "pace": "balanced",
//                 "focus": [
//                   "Shopping",
//                   "Local_Life",
//                   "Culture"
//                 ],
//                 "rationale": "Afternoon gives ample time to browse street stalls and soak in the vibrant streetscape.",
//                 "tradeoffs": [
//                   "Can be quite crowded and warm during peak afternoon hours."
//                 ]
//               },
//               "evidence_refs": [
//                 "colaba_causeway_market_mumbai_maharashtra"
//               ],
//               "soft_conflicts": []
//             },
//             {
//               "type": "rest",
//               "attraction_id": null,
//               "city_id": "mumbai_maharashtra",
//               "title": "Rest & Freshen Up",
//               "description": "Take a short break at your budget guesthouse or hostel.",
//               "visit_approach": null,
//               "evidence_refs": [],
//               "soft_conflicts": []
//             },
//             {
//               "type": "experience",
//               "attraction_id": "marine_drive_mumbai_maharashtra",
//               "city_id": "mumbai_maharashtra",
//               "title": "Marine Drive",
//               "description": "Walk along the iconic 3.6-kilometre C-shaped coastal promenade and watch the sunset over the Arabian Sea.",
//               "visit_approach": {
//                 "mode": "self_guided",
//                 "timing_preference": "Sunset",
//                 "duration_minutes": 90,
//                 "pace": "slow",
//                 "focus": [
//                   "Relaxation",
//                   "Sunset",
//                   "Photography"
//                 ],
//                 "rationale": "Sunset and evening provide the quintessential 'Queen's Necklace' lighting and cool sea breeze.",
//                 "tradeoffs": [
//                   "Very popular with evening crowds."
//                 ]
//               },
//               "evidence_refs": [
//                 "marine_drive_mumbai_maharashtra"
//               ],
//               "soft_conflicts": []
//             },
//             {
//               "type": "meal",
//               "attraction_id": null,
//               "city_id": "mumbai_maharashtra",
//               "title": "Dinner",
//               "description": "Savor a budget-friendly dinner featuring local street food or local dining establishments.",
//               "visit_approach": null,
//               "evidence_refs": [],
//               "soft_conflicts": []
//             }
//           ]
//         },
//         {
//           "city_id": "mumbai_maharashtra",
//           "day_number": 2,
//           "items": [
//             {
//               "type": "experience",
//               "attraction_id": "elephanta_caves_mumbai_maharashtra",
//               "city_id": "mumbai_maharashtra",
//               "title": "Elephanta Caves",
//               "description": "Take a morning ferry from near the Gateway of India across Mumbai Harbour to explore the rock-cut cave temples dedicated to Lord Shiva.",
//               "visit_approach": {
//                 "mode": "guided_or_self_guided",
//                 "timing_preference": "Morning",
//                 "duration_minutes": 240,
//                 "pace": "balanced",
//                 "focus": [
//                   "History",
//                   "Architecture",
//                   "Archaeology"
//                 ],
//                 "rationale": "Morning departure is essential to allow adequate time for the ferry ride and extensive walking among the island caves.",
//                 "tradeoffs": [
//                   "Involves considerable stair climbing and boat travel, which may be moderately strenuous."
//                 ]
//               },
//               "evidence_refs": [
//                 "elephanta_caves_mumbai_maharashtra"
//               ],
//               "soft_conflicts": []
//             },
//             {
//               "type": "meal",
//               "attraction_id": null,
//               "city_id": "mumbai_maharashtra",
//               "title": "Lunch",
//               "description": "Enjoy a casual meal upon returning to mainland South Mumbai.",
//               "visit_approach": null,
//               "evidence_refs": [],
//               "soft_conflicts": []
//             },
//             {
//               "type": "experience",
//               "attraction_id": "chhatrapati_shivaji_maharaj_terminus_mumbai_maharashtra",
//               "city_id": "mumbai_maharashtra",
//               "title": "Chhatrapati Shivaji Maharaj Terminus",
//               "description": "Admire the UNESCO World Heritage Site featuring stunning Victorian Gothic Revival architecture blended with traditional Indian elements.",
//               "visit_approach": {
//                 "mode": "self_guided",
//                 "timing_preference": "Late_Afternoon",
//                 "duration_minutes": 45,
//                 "pace": "balanced",
//                 "focus": [
//                   "Architecture",
//                   "History",
//                   "Photography"
//                 ],
//                 "rationale": "Late afternoon light accentuates the intricate stone carvings and stained glass of the historic railway station.",
//                 "tradeoffs": [
//                   "High commuter activity during peak hours, but provides an authentic pulse of the city."
//                 ]
//               },
//               "evidence_refs": [
//                 "chhatrapati_shivaji_maharaj_terminus_mumbai_maharashtra"
//               ],
//               "soft_conflicts": []
//             },
//             {
//               "type": "experience",
//               "attraction_id": "crawford_market_mumbai_maharashtra",
//               "city_id": "mumbai_maharashtra",
//               "title": "Crawford Market",
//               "description": "Explore the historic Victorian-Gothic market building completed in 1869 with stone bas-reliefs designed by Lockwood Kipling.",
//               "visit_approach": {
//                 "mode": "self_guided",
//                 "timing_preference": "Late_Afternoon",
//                 "duration_minutes": 90,
//                 "pace": "balanced",
//                 "focus": [
//                   "Architecture",
//                   "Local_Life",
//                   "History"
//                 ],
//                 "rationale": "Conveniently located near CSMT, making it easy to combine heritage architecture with bustling market life.",
//                 "tradeoffs": [
//                   "Can be crowded and noisy inside wholesale aisles."
//                 ]
//               },
//               "evidence_refs": [
//                 "crawford_market_mumbai_maharashtra"
//               ],
//               "soft_conflicts": []
//             },
//             {
//               "type": "rest",
//               "attraction_id": null,
//               "city_id": "mumbai_maharashtra",
//               "title": "Rest & Relax",
//               "description": "Take a quiet break in your accommodation.",
//               "visit_approach": null,
//               "evidence_refs": [],
//               "soft_conflicts": []
//             },
//             {
//               "type": "meal",
//               "attraction_id": null,
//               "city_id": "mumbai_maharashtra",
//               "title": "Dinner",
//               "description": "Dine at an affordable local eatery.",
//               "visit_approach": null,
//               "evidence_refs": [],
//               "soft_conflicts": []
//             }
//           ]
//         },
//         {
//           "city_id": "mumbai_maharashtra",
//           "day_number": 3,
//           "items": [
//             {
//               "type": "experience",
//               "attraction_id": "dhobi_ghat_mumbai_maharashtra",
//               "city_id": "mumbai_maharashtra",
//               "title": "Dhobi Ghat",
//               "description": "Witness the world's largest open-air laundromat at Mahalaxmi, where thousands of dhobis wash clothes manually in open concrete troughs.",
//               "visit_approach": {
//                 "mode": "self_guided",
//                 "timing_preference": "Morning",
//                 "duration_minutes": 45,
//                 "pace": "balanced",
//                 "focus": [
//                   "Local_Life",
//                   "Culture",
//                   "Photography"
//                 ],
//                 "rationale": "Morning is when washing activity is at its highest operational peak.",
//                 "tradeoffs": [
//                   "Viewing is primarily from designated viewpoints overlooking the complex rather than walking among active washing stalls."
//                 ]
//               },
//               "evidence_refs": [
//                 "dhobi_ghat_mumbai_maharashtra"
//               ],
//               "soft_conflicts": []
//             },
//             {
//               "type": "experience",
//               "attraction_id": "haji_ali_dargah_mumbai_maharashtra",
//               "city_id": "mumbai_maharashtra",
//               "title": "Haji Ali Dargah",
//               "description": "Visit the 18th-century mosque and tomb located on an islet off the coast of Worli, reached via a scenic causeway.",
//               "visit_approach": {
//                 "mode": "self_guided",
//                 "timing_preference": "Late_Afternoon",
//                 "duration_minutes": 90,
//                 "pace": "balanced",
//                 "focus": [
//                   "Religion",
//                   "Spirituality",
//                   "Architecture"
//                 ],
//                 "rationale": "Timing your visit around the tide schedule allows safe crossing along the causeway.",
//                 "tradeoffs": [
//                   "Access is tide-dependent; during high tide the causeway may be temporarily closed."
//                 ]
//               },
//               "evidence_refs": [
//                 "haji_ali_dargah_mumbai_maharashtra"
//               ],
//               "soft_conflicts": [
//                 {
//                   "topic": "Tidal Accessibility",
//                   "explanation": "Haji Ali Dargah is accessible only during low tide via a walking causeway. If high tide restricts access, you can alternatively visit the nearby Shree Siddhivinayak Temple.",
//                   "alternative_attraction_id": "shree_siddhivinayak_temple_mumbai_maharashtra",
//                   "evidence_refs": [
//                     "haji_ali_dargah_mumbai_maharashtra"
//                   ]
//                 }
//               ]
//             },
//             {
//               "type": "meal",
//               "attraction_id": null,
//               "city_id": "mumbai_maharashtra",
//               "title": "Lunch",
//               "description": "Enjoy a budget-friendly meal in central Mumbai.",
//               "visit_approach": null,
//               "evidence_refs": [],
//               "soft_conflicts": []
//             },
//             {
//               "type": "experience",
//               "attraction_id": "bandra_fort_mumbai_maharashtra",
//               "city_id": "mumbai_maharashtra",
//               "title": "Bandra Fort",
//               "description": "Explore the 17th-century Portuguese fortress at Land's End, offering panoramic views of the Bandra-Worli Sea Link.",
//               "visit_approach": {
//                 "mode": "self_guided",
//                 "timing_preference": "Sunset",
//                 "duration_minutes": 60,
//                 "pace": "relaxed",
//                 "focus": [
//                   "Photography",
//                   "History",
//                   "Relaxation"
//                 ],
//                 "rationale": "Late afternoon and sunset provide stunning coastal views and a relaxing end to the 3-day itinerary.",
//                 "tradeoffs": [
//                   "Located further north in Bandra, requiring a suburban train or local taxi transit from South Mumbai."
//                 ]
//               },
//               "evidence_refs": [
//                 "bandra_fort_mumbai_maharashtra",
//                 "bandra_worli_sea_link_mumbai_maharashtra"
//               ],
//               "soft_conflicts": []
//             },
//             {
//               "type": "rest",
//               "attraction_id": null,
//               "city_id": "mumbai_maharashtra",
//               "title": "Relaxation & Departure Prep",
//               "description": "Unwind before your onward journey.",
//               "visit_approach": null,
//               "evidence_refs": [],
//               "soft_conflicts": []
//             },
//             {
//               "type": "meal",
//               "attraction_id": null,
//               "city_id": "mumbai_maharashtra",
//               "title": "Farewell Dinner",
//               "description": "Enjoy a final affordable meal in the city.",
//               "visit_approach": null,
//               "evidence_refs": [],
//               "soft_conflicts": []
//             }
//           ]
//         }
//       ],
//       "assumptions": [
//         "Traveler is comfortable using local public transit (trains, local buses, or budget taxis) to navigate between South Mumbai and Bandra.",
//         "Budget accommodation is secured independently by the traveler in the Colaba or Fort area."
//       ],
//       "tradeoffs": [
//         "Keeping the trip entirely within Mumbai maximizes depth of cultural and architectural exploration without long travel days."
//       ],
//       "unresolved_details": [
//         "Specific daily dining venues are left open to accommodate personal taste and budget flexibility."
//       ]
//     }
//   ],
//   "operational": {
//     "tool_calls": 4,
//     "retrieved_rows": 18
//   }
// }

// export const mockCandBundl: CandidateBundle = {
//       "candidate_id": "mumbai_culture_budget_3day",
//       "profile_revision": 1,
//       "dataset_revisions": {
//         "city": "v1",
//         "attraction": "v1"
//       },
//       "route": {
//         "route_id": "mumbai_culture_route",
//         "stops": [
//           {
//             "city_id": "mumbai_maharashtra",
//             "city_name": "Mumbai",
//             "order": 1,
//             "days": 3,
//             "reason": "Mumbai is the requested destination, offering rich colonial heritage, historic architecture, and iconic sights aligned with the traveler's priorities.",
//             "evidence_refs": [
//               "gateway_of_india_mumbai_maharashtra",
//               "chhatrapati_shivaji_maharaj_terminus_mumbai_maharashtra",
//               "elephanta_caves_mumbai_maharashtra"
//             ]
//           }
//         ],
//         "assumptions": [
//           "Traveler arrives directly in Mumbai and stays in a budget-friendly local guesthouse or hostel in South Mumbai (Colaba or Fort area) to minimize daily travel overhead."
//         ],
//         "tradeoffs": [
//           "Focusing exclusively on Mumbai over a 3-day period allows deep coverage of the iconic sights without exhausting long-distance travel."
//         ],
//         "unresolved_details": [
//           "Exact hostel/guesthouse name and booking confirmation are left flexible to fit the traveler's budget preference."
//         ]
//       },
//       "days": [
//         {
//           "city_id": "mumbai_maharashtra",
//           "day_number": 1,
//           "items": [
//             {
//               "type": "experience",
//               "attraction_id": "gateway_of_india_mumbai_maharashtra",
//               "city_id": "mumbai_maharashtra",
//               "title": "Gateway of India",
//               "description": "Start the journey at Mumbai's signature historic waterfront monument, taking in the grand Indo-Saracenic basalt arch and views of the Arabian Sea.",
//               "visit_approach": {
//                 "mode": "self_guided",
//                 "timing_preference": "Early_Morning",
//                 "duration_minutes": 60,
//                 "pace": "balanced",
//                 "focus": [
//                   "History",
//                   "Architecture",
//                   "Photography"
//                 ],
//                 "rationale": "Visiting in the early morning avoids the heaviest crowds and harsh midday sun while capturing the monument in soft light.",
//                 "tradeoffs": [
//                   "Early morning means ferry ticket counters for Elephanta may not yet be open, but it provides prime photographic conditions."
//                 ]
//               },
//               "evidence_refs": [
//                 "gateway_of_india_mumbai_maharashtra"
//               ],
//               "soft_conflicts": []
//             },
//             {
//               "type": "meal",
//               "attraction_id": null,
//               "city_id": "mumbai_maharashtra",
//               "title": "Local Breakfast / Tea",
//               "description": "Enjoy a casual, budget-friendly breakfast at a local heritage café or street-side stall near Colaba.",
//               "visit_approach": null,
//               "evidence_refs": [],
//               "soft_conflicts": []
//             },
//             {
//               "type": "experience",
//               "attraction_id": "csmvs_museum_mumbai_maharashtra",
//               "city_id": "mumbai_maharashtra",
//               "title": "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya",
//               "description": "Explore Mumbai's premier art and history museum, housed in a magnificent Indo-Saracenic building with sprawling gardens.",
//               "visit_approach": {
//                 "mode": "self_guided",
//                 "timing_preference": "Morning",
//                 "duration_minutes": 180,
//                 "pace": "balanced",
//                 "focus": [
//                   "History",
//                   "Art",
//                   "Architecture"
//                 ],
//                 "rationale": "Morning hours are ideal for indoor museum galleries before the midday peak.",
//                 "tradeoffs": [
//                   "Allocating 3 hours means skipping some minor exhibit halls if a more relaxed pace is desired."
//                 ]
//               },
//               "evidence_refs": [
//                 "csmvs_museum_mumbai_maharashtra"
//               ],
//               "soft_conflicts": []
//             },
//             {
//               "type": "meal",
//               "attraction_id": null,
//               "city_id": "mumbai_maharashtra",
//               "title": "Midday Meal",
//               "description": "Enjoy an affordable local meal or regional thali nearby in the Fort district.",
//               "visit_approach": null,
//               "evidence_refs": [],
//               "soft_conflicts": []
//             },
//             {
//               "type": "experience",
//               "attraction_id": "colaba_causeway_market_mumbai_maharashtra",
//               "city_id": "mumbai_maharashtra",
//               "title": "Colaba Causeway Market",
//               "description": "Stroll down the bustling commercial street known for street shopping, antiques, handicrafts, and local culture.",
//               "visit_approach": {
//                 "mode": "self_guided",
//                 "timing_preference": "Afternoon",
//                 "duration_minutes": 120,
//                 "pace": "balanced",
//                 "focus": [
//                   "Shopping",
//                   "Local_Life",
//                   "Culture"
//                 ],
//                 "rationale": "Afternoon gives ample time to browse street stalls and soak in the vibrant streetscape.",
//                 "tradeoffs": [
//                   "Can be quite crowded and warm during peak afternoon hours."
//                 ]
//               },
//               "evidence_refs": [
//                 "colaba_causeway_market_mumbai_maharashtra"
//               ],
//               "soft_conflicts": []
//             },
//             {
//               "type": "rest",
//               "attraction_id": null,
//               "city_id": "mumbai_maharashtra",
//               "title": "Rest & Freshen Up",
//               "description": "Take a short break at your budget guesthouse or hostel.",
//               "visit_approach": null,
//               "evidence_refs": [],
//               "soft_conflicts": []
//             },
//             {
//               "type": "experience",
//               "attraction_id": "marine_drive_mumbai_maharashtra",
//               "city_id": "mumbai_maharashtra",
//               "title": "Marine Drive",
//               "description": "Walk along the iconic 3.6-kilometre C-shaped coastal promenade and watch the sunset over the Arabian Sea.",
//               "visit_approach": {
//                 "mode": "self_guided",
//                 "timing_preference": "Sunset",
//                 "duration_minutes": 90,
//                 "pace": "slow",
//                 "focus": [
//                   "Relaxation",
//                   "Sunset",
//                   "Photography"
//                 ],
//                 "rationale": "Sunset and evening provide the quintessential 'Queen's Necklace' lighting and cool sea breeze.",
//                 "tradeoffs": [
//                   "Very popular with evening crowds."
//                 ]
//               },
//               "evidence_refs": [
//                 "marine_drive_mumbai_maharashtra"
//               ],
//               "soft_conflicts": []
//             },
//             {
//               "type": "meal",
//               "attraction_id": null,
//               "city_id": "mumbai_maharashtra",
//               "title": "Dinner",
//               "description": "Savor a budget-friendly dinner featuring local street food or local dining establishments.",
//               "visit_approach": null,
//               "evidence_refs": [],
//               "soft_conflicts": []
//             }
//           ]
//         },
//         {
//           "city_id": "mumbai_maharashtra",
//           "day_number": 2,
//           "items": [
//             {
//               "type": "experience",
//               "attraction_id": "elephanta_caves_mumbai_maharashtra",
//               "city_id": "mumbai_maharashtra",
//               "title": "Elephanta Caves",
//               "description": "Take a morning ferry from near the Gateway of India across Mumbai Harbour to explore the rock-cut cave temples dedicated to Lord Shiva.",
//               "visit_approach": {
//                 "mode": "guided_or_self_guided",
//                 "timing_preference": "Morning",
//                 "duration_minutes": 240,
//                 "pace": "balanced",
//                 "focus": [
//                   "History",
//                   "Architecture",
//                   "Archaeology"
//                 ],
//                 "rationale": "Morning departure is essential to allow adequate time for the ferry ride and extensive walking among the island caves.",
//                 "tradeoffs": [
//                   "Involves considerable stair climbing and boat travel, which may be moderately strenuous."
//                 ]
//               },
//               "evidence_refs": [
//                 "elephanta_caves_mumbai_maharashtra"
//               ],
//               "soft_conflicts": []
//             },
//             {
//               "type": "meal",
//               "attraction_id": null,
//               "city_id": "mumbai_maharashtra",
//               "title": "Lunch",
//               "description": "Enjoy a casual meal upon returning to mainland South Mumbai.",
//               "visit_approach": null,
//               "evidence_refs": [],
//               "soft_conflicts": []
//             },
//             {
//               "type": "experience",
//               "attraction_id": "chhatrapati_shivaji_maharaj_terminus_mumbai_maharashtra",
//               "city_id": "mumbai_maharashtra",
//               "title": "Chhatrapati Shivaji Maharaj Terminus",
//               "description": "Admire the UNESCO World Heritage Site featuring stunning Victorian Gothic Revival architecture blended with traditional Indian elements.",
//               "visit_approach": {
//                 "mode": "self_guided",
//                 "timing_preference": "Late_Afternoon",
//                 "duration_minutes": 45,
//                 "pace": "balanced",
//                 "focus": [
//                   "Architecture",
//                   "History",
//                   "Photography"
//                 ],
//                 "rationale": "Late afternoon light accentuates the intricate stone carvings and stained glass of the historic railway station.",
//                 "tradeoffs": [
//                   "High commuter activity during peak hours, but provides an authentic pulse of the city."
//                 ]
//               },
//               "evidence_refs": [
//                 "chhatrapati_shivaji_maharaj_terminus_mumbai_maharashtra"
//               ],
//               "soft_conflicts": []
//             },
//             {
//               "type": "experience",
//               "attraction_id": "crawford_market_mumbai_maharashtra",
//               "city_id": "mumbai_maharashtra",
//               "title": "Crawford Market",
//               "description": "Explore the historic Victorian-Gothic market building completed in 1869 with stone bas-reliefs designed by Lockwood Kipling.",
//               "visit_approach": {
//                 "mode": "self_guided",
//                 "timing_preference": "Late_Afternoon",
//                 "duration_minutes": 90,
//                 "pace": "balanced",
//                 "focus": [
//                   "Architecture",
//                   "Local_Life",
//                   "History"
//                 ],
//                 "rationale": "Conveniently located near CSMT, making it easy to combine heritage architecture with bustling market life.",
//                 "tradeoffs": [
//                   "Can be crowded and noisy inside wholesale aisles."
//                 ]
//               },
//               "evidence_refs": [
//                 "crawford_market_mumbai_maharashtra"
//               ],
//               "soft_conflicts": []
//             },
//             {
//               "type": "rest",
//               "attraction_id": null,
//               "city_id": "mumbai_maharashtra",
//               "title": "Rest & Relax",
//               "description": "Take a quiet break in your accommodation.",
//               "visit_approach": null,
//               "evidence_refs": [],
//               "soft_conflicts": []
//             },
//             {
//               "type": "meal",
//               "attraction_id": null,
//               "city_id": "mumbai_maharashtra",
//               "title": "Dinner",
//               "description": "Dine at an affordable local eatery.",
//               "visit_approach": null,
//               "evidence_refs": [],
//               "soft_conflicts": []
//             }
//           ]
//         },
//         {
//           "city_id": "mumbai_maharashtra",
//           "day_number": 3,
//           "items": [
//             {
//               "type": "experience",
//               "attraction_id": "dhobi_ghat_mumbai_maharashtra",
//               "city_id": "mumbai_maharashtra",
//               "title": "Dhobi Ghat",
//               "description": "Witness the world's largest open-air laundromat at Mahalaxmi, where thousands of dhobis wash clothes manually in open concrete troughs.",
//               "visit_approach": {
//                 "mode": "self_guided",
//                 "timing_preference": "Morning",
//                 "duration_minutes": 45,
//                 "pace": "balanced",
//                 "focus": [
//                   "Local_Life",
//                   "Culture",
//                   "Photography"
//                 ],
//                 "rationale": "Morning is when washing activity is at its highest operational peak.",
//                 "tradeoffs": [
//                   "Viewing is primarily from designated viewpoints overlooking the complex rather than walking among active washing stalls."
//                 ]
//               },
//               "evidence_refs": [
//                 "dhobi_ghat_mumbai_maharashtra"
//               ],
//               "soft_conflicts": []
//             },
//             {
//               "type": "experience",
//               "attraction_id": "haji_ali_dargah_mumbai_maharashtra",
//               "city_id": "mumbai_maharashtra",
//               "title": "Haji Ali Dargah",
//               "description": "Visit the 18th-century mosque and tomb located on an islet off the coast of Worli, reached via a scenic causeway.",
//               "visit_approach": {
//                 "mode": "self_guided",
//                 "timing_preference": "Late_Afternoon",
//                 "duration_minutes": 90,
//                 "pace": "balanced",
//                 "focus": [
//                   "Religion",
//                   "Spirituality",
//                   "Architecture"
//                 ],
//                 "rationale": "Timing your visit around the tide schedule allows safe crossing along the causeway.",
//                 "tradeoffs": [
//                   "Access is tide-dependent; during high tide the causeway may be temporarily closed."
//                 ]
//               },
//               "evidence_refs": [
//                 "haji_ali_dargah_mumbai_maharashtra"
//               ],
//               "soft_conflicts": [
//                 {
//                   "topic": "Tidal Accessibility",
//                   "explanation": "Haji Ali Dargah is accessible only during low tide via a walking causeway. If high tide restricts access, you can alternatively visit the nearby Shree Siddhivinayak Temple.",
//                   "alternative_attraction_id": "shree_siddhivinayak_temple_mumbai_maharashtra",
//                   "evidence_refs": [
//                     "haji_ali_dargah_mumbai_maharashtra"
//                   ]
//                 }
//               ]
//             },
//             {
//               "type": "meal",
//               "attraction_id": null,
//               "city_id": "mumbai_maharashtra",
//               "title": "Lunch",
//               "description": "Enjoy a budget-friendly meal in central Mumbai.",
//               "visit_approach": null,
//               "evidence_refs": [],
//               "soft_conflicts": []
//             },
//             {
//               "type": "experience",
//               "attraction_id": "bandra_fort_mumbai_maharashtra",
//               "city_id": "mumbai_maharashtra",
//               "title": "Bandra Fort",
//               "description": "Explore the 17th-century Portuguese fortress at Land's End, offering panoramic views of the Bandra-Worli Sea Link.",
//               "visit_approach": {
//                 "mode": "self_guided",
//                 "timing_preference": "Sunset",
//                 "duration_minutes": 60,
//                 "pace": "relaxed",
//                 "focus": [
//                   "Photography",
//                   "History",
//                   "Relaxation"
//                 ],
//                 "rationale": "Late afternoon and sunset provide stunning coastal views and a relaxing end to the 3-day itinerary.",
//                 "tradeoffs": [
//                   "Located further north in Bandra, requiring a suburban train or local taxi transit from South Mumbai."
//                 ]
//               },
//               "evidence_refs": [
//                 "bandra_fort_mumbai_maharashtra",
//                 "bandra_worli_sea_link_mumbai_maharashtra"
//               ],
//               "soft_conflicts": []
//             },
//             {
//               "type": "rest",
//               "attraction_id": null,
//               "city_id": "mumbai_maharashtra",
//               "title": "Relaxation & Departure Prep",
//               "description": "Unwind before your onward journey.",
//               "visit_approach": null,
//               "evidence_refs": [],
//               "soft_conflicts": []
//             },
//             {
//               "type": "meal",
//               "attraction_id": null,
//               "city_id": "mumbai_maharashtra",
//               "title": "Farewell Dinner",
//               "description": "Enjoy a final affordable meal in the city.",
//               "visit_approach": null,
//               "evidence_refs": [],
//               "soft_conflicts": []
//             }
//           ]
//         }
//       ],
//       "assumptions": [
//         "Traveler is comfortable using local public transit (trains, local buses, or budget taxis) to navigate between South Mumbai and Bandra.",
//         "Budget accommodation is secured independently by the traveler in the Colaba or Fort area."
//       ],
//       "tradeoffs": [
//         "Keeping the trip entirely within Mumbai maximizes depth of cultural and architectural exploration without long travel days."
//       ],
//       "unresolved_details": [
//         "Specific daily dining venues are left open to accommodate personal taste and budget flexibility."
//       ]
//     }

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
