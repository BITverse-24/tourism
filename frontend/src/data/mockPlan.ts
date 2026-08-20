import { FinalPlan } from '../types'
export const mockPlan: FinalPlan = {
  plan_title: 'Slow Kyoto: temples, neighborhoods, and sunrise photography',
  summary: 'A three-day plan favoring quiet mornings, neighborhood culture, and unhurried photography — one main experience per part of day, with generous rest and flexible evenings.',
  traveler_profile_reference: 'profile_01J',
  trip_dates: { start: '2026-10-10', end: '2026-10-13' },
  destination_route: [
    { place: 'Kyoto', order: 1 },
  ],
  city_allocations: [
    { place: 'Kyoto', nights: 3, days: 3, reason: 'One base reduces hotel changes and supports a low-stress, sunrise-friendly pace.' },
  ],
  accommodation: [
    { place: 'Kyoto', nights: 3, recommendation: 'Higashiyama — quiet ryokan near Gion', reason: 'Walkable to early starts, low transit to neighborhoods', estimated_cost: 'INR 36,000', status: 'suggested' },
  ],
  days: [
    {
      day: 1, date: '2026-10-10', place: 'Kyoto', theme: 'Arrival & southern Kyoto',
      daily_notes: 'Keep Day 1 light — recover from travel, one gentle walk.',
      items: [
        { type: 'experience', title: 'Sunrise photography at Fushimi Inari', start_time: '05:45', end_time: '08:00', location: 'Fushimi, Kyoto', description: 'Arrive before first light for empty torii corridors. Walk slowly through the lower gates, pause for street-level shrine details, return via quiet side paths.', reason: 'Chosen for strong photography and culture preferences — early light, low crowds.', flexibility: 'fixed', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80' },
        { type: 'rest', title: 'Rest — breakfast and recovery', description: 'Return to lodging, breakfast, rest until late morning. Keep the afternoon workload moderate.', flexibility: 'moveable' },
        { type: 'experience', title: 'Traditional neighborhood walk — Southern Kyoto', start_time: '14:00', location: 'Gion South', description: 'Unhurried walk through machiya lanes, tea houses, and small galleries. No additional major attraction — preserve energy.', reason: 'Honor the slow pace and preference for neighborhoods over crowded icons.', flexibility: 'moveable', image: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=800&q=80' },
        { type: 'meal', title: 'Local dinner — seasonal small plates', start_time: '19:00', location: 'Near lodging', description: 'Vegetarian-friendly kaiseki-inspired set — book a quiet counter, street food as alternative.', flexibility: 'optional', image: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800&q=80' },
      ]
    },
    {
      day: 2, date: '2026-10-11', place: 'Kyoto', theme: 'Temples & garden light',
      items: [
        { type: 'experience', title: 'Arashiyama early walk', start_time: '07:00', location: 'Arashiyama', description: 'Bamboo grove at quiet hour, then riverside light before crowds. Keep to eastern paths.', reason: 'Low crowd tolerance and morning energy favor early access.', flexibility: 'fixed', image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800&q=80' },
        { type: 'movement', title: 'Transfer to central Kyoto', description: 'Local train, ~25 minutes', movement: { mode: 'Local train', duration: '25 min', cost: 'INR 180' } },
        { type: 'meal', title: 'Street food lunch — Nishiki Market', start_time: '12:30', location: 'Nishiki Market', description: 'Tofu skewers, pickles, seasonal sweets — grazing rather than a long sit-down.', flexibility: 'moveable', image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&q=80' },
        { type: 'experience', title: 'Kinkaku-ji garden — late light', start_time: '15:30', location: 'Kita-ku', description: 'Golden pavilion from the garden approach — late afternoon light, fewer groups.', flexibility: 'moveable', image: 'https://images.unsplash.com/photo-1624253321171-1be53e12f9d7?w=800&q=80' },
      ]
    },
    {
      day: 3, date: '2026-10-12', place: 'Kyoto', theme: 'Craft & departure',
      items: [
        { type: 'experience', title: 'Pottery studio — hands on', start_time: '09:00', location: 'Higashiyama', description: 'Small-group wheel and glaze session — tangible memory, low walking.', reason: 'Local experiences preferred over shopping malls.', flexibility: 'moveable', image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80' },
        { type: 'rest', title: 'Rest — afternoon free', description: 'No plans until departure. Café, pack, revisit a lane that stayed with you.', flexibility: 'optional' },
      ]
    },
  ],
  cost_summary: {
    currency: 'INR', estimated_total: 63000,
    scope: 'Kyoto stay and local activities only; international flights excluded. Lodging estimate included.',
    categories: [
      { name: 'Accommodation', amount: 36000 },
      { name: 'Local transport', amount: 6000 },
      { name: 'Food', amount: 18000 },
      { name: 'Experiences', amount: 3000 },
    ],
    budget_position: 'within_target',
    caveats: ['Prices seasonally variable — confirm ryokan and studio rates before booking.', 'Market food costs will vary with choices.']
  },
  fit_explanation: 'This plan prioritizes your stated loves — sunrise photography, temple culture, and quiet neighborhoods — while honoring a slow pace and low crowd tolerance. Fewer moves, earlier starts, and generous rest keep each day humane.',
  tradeoffs: [
    'A single Kyoto base improves comfort and reduces hotel changes, at the cost of somewhat longer local transit to Arashiyama — transit time is traded for calm.',
    'Keeping mornings early secures empty shrine light but asks for early wake-ups; evenings are left flexible to recover.',
    'One major experience per half-day leaves space for wandering and weather; broader coverage is traded for depth and ease.',
  ],
  assumptions: ['Early starts are acceptable due to stated sunrise preference — please confirm.', 'Nishiki grazing can be lengthened into a seated lunch if you prefer structure.'],
  warnings: ['Confirm temple opening hours for 10–13 October.', 'Expect higher foot traffic at Fushimi after 09:00 — early arrival matters.'],
  unresolved_details: ['Exact arrival time on Day 1 to confirm Fushimi start.', 'Whether rail-inclusive budget scope is correct.']
}

export const mockPlanDraft: FinalPlan = { ...mockPlan, plan_title: mockPlan.plan_title + ' (Draft)' }
