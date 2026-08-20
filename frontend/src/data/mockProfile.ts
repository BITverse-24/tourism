import { TravelerProfile } from '../types'
export const mockProfile: TravelerProfile = {
  profile_id: 'profile_01J',
  trip_context: {
    destination_request: 'Kyoto in autumn, slow, sunrise photography',
    resolved_destination: 'Kyoto, Japan',
    start_date: '2026-10-10',
    end_date: '2026-10-13',
    date_flexibility: 'somewhat flexible',
    party_size: 2,
    party_notes: 'Two friends, moderate fitness',
    budget: { amount: 85000, currency: 'INR', scope: 'target' }
  },
  purpose_and_priorities: {
    primary_purpose: 'Culture and photography',
    secondary_purposes: ['Food', 'Neighborhood wandering'],
    priorities: ['Better experiences over more cities', 'Comfort over maximum coverage', 'Unhurried mornings'],
    success_definition: 'Return with quiet, memorable photographs and unhurried days.'
  },
  preferences: [
    { category: 'Photography', strength: 'strong', source: 'stated', notes: 'Sunrise and street photography' },
    { category: 'Culture', strength: 'strong', source: 'stated', notes: 'Temples and neighborhood culture' },
    { category: 'Food', strength: 'nice_to_have', source: 'stated', notes: 'Street food over museums' },
    { category: 'Nature', strength: 'nice_to_have', source: 'inferred', confidence: 'medium' },
    { category: 'Nightlife', strength: 'not_interested', source: 'stated' },
  ],
  travel_style: { pace: 'slow', energy_pattern: 'morning', walking_tolerance: 'medium', crowd_tolerance: 'low', comfort_preference: 'balanced', spontaneity: 'some_flexibility' },
  hard_constraints: {
    must_visit: ['Fushimi Inari', 'Traditional neighborhood walk'],
    avoid: ['Tightly packed all-day schedules', 'Late nights'],
    dietary_requirements: ['Vegetarian-friendly'],
    accessibility_requirements: [],
    accommodation_requirements: [],
    maximum_daily_travel: 'Under 8 km walking',
  },
  unknowns: [
    { topic: 'Budget scope', impact: 'material', description: 'Whether INR 85,000 includes international flights remains unclear.' },
    { topic: 'Arrival time', impact: 'minor', description: 'Exact arrival window on Day 1 — to align first light timing.' },
  ],
  assumptions: [
    { topic: 'Early starts', value: 'Early mornings acceptable for sunrise photography', reason: 'Stated strong preference for sunrise photography', user_confirmation_needed: true },
    { topic: 'Meal pacing', value: 'Leisurely, local lunch preferred', reason: 'Inferred from food and pace preferences', user_confirmation_needed: false },
  ]
}
export const mockProfileBlocking: TravelerProfile = {
  ...mockProfile,
  unknowns: [
    { topic: 'Travel dates', impact: 'blocking', description: 'Exact dates are required to check temple light and availability.' },
    ...mockProfile.unknowns
  ]
}
