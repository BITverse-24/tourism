export type WorkflowState = 'discovery' | 'profile_review' | 'planning' | 'decision_required' | 'plan_ready' | 'cancelled' | 'expired'
export type FreeTextMode = 'disabled' | 'optional' | 'only_if_no_option' | 'required'
export type SelectionMode = 'single' | 'multiple'

export interface QuestionOption { option_id: string; label: string; description?: string }
export interface DiscoveryQuestion {
  question_id: string
  prompt: string
  selection_mode: SelectionMode
  required: boolean
  options: QuestionOption[]
  free_text_mode: FreeTextMode
  free_text_placeholder?: string
}

export interface TravelerProfile {
  profile_id: string
  trip_context: {
    destination_request: string
    resolved_destination?: string
    start_date?: string
    end_date?: string
    duration_days?: number
    date_flexibility?: string
    party_size: number
    party_notes?: string
    budget?: { amount: number; currency: string; scope: string }
  }
  purpose_and_priorities: { primary_purpose: string; secondary_purposes?: string[]; priorities: string[]; success_definition?: string }
  preferences: { category: string; strength: string; notes?: string; source: string; confidence?: string }[]
  travel_style: { pace: string; energy_pattern?: string; walking_tolerance: string; crowd_tolerance: string; comfort_preference?: string; spontaneity?: string }
  hard_constraints: { must_visit: string[]; avoid: string[]; dietary_requirements: string[]; accessibility_requirements: string[]; accommodation_requirements: string[]; maximum_daily_travel?: string; maximum_hotel_changes?: number; budget_ceiling?: string }
  unknowns: { topic: string; impact: 'blocking'|'material'|'minor'; description: string }[]
  assumptions: { topic: string; value: string; reason: string; user_confirmation_needed: boolean }[]
}

export interface FinalPlan {
  plan_title: string
  summary: string
  traveler_profile_reference: string
  trip_dates?: { start?: string; end?: string; flexibility?: string }
  destination_route: { place: string; order: number; arrival_from?: string; departure_to?: string }[]
  city_allocations: { place: string; nights?: number; days: number; reason?: string }[]
  accommodation?: { place: string; nights: number; recommendation: string; reason: string; estimated_cost?: string; status: 'suggested'|'selected_by_traveler'|'not_yet_decided' }[]
  days: PlanDay[]
  cost_summary: { currency: string; estimated_total: number; scope: string; categories: { name: string; amount: number }[]; budget_position: string; caveats: string[] }
  fit_explanation: string
  tradeoffs: string[]
  assumptions: string[]
  warnings: string[]
  unresolved_details: string[]
}

export interface PlanDay {
  day: number
  date?: string
  place: string
  theme?: string
  daily_notes?: string
  items: PlanItem[]
}
export interface PlanItem {
  type: 'experience'|'meal'|'rest'|'movement'
  title: string
  start_time?: string
  end_time?: string
  location?: string
  description: string
  movement?: { mode?: string; duration?: string; cost?: string }
  estimated_cost?: string
  reason?: string
  flexibility?: 'fixed'|'moveable'|'optional'
  image?: string
}
