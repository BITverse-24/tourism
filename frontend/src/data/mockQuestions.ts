import { DiscoveryQuestion } from '../types'
export const mockQuestions: DiscoveryQuestion[] = [
  {
    question_id: 'q_purpose', prompt: 'What draws you most to this journey?',
    selection_mode: 'multiple', required: true,
    free_text_mode: 'optional', free_text_placeholder: 'Add a nuance if the options do not quite fit',
    options: [
      { option_id: 'culture', label: 'Culture & temples', description: 'Shrines, neighborhoods, craft' },
      { option_id: 'photography', label: 'Photography', description: 'Light, streets, quiet mornings' },
      { option_id: 'food', label: 'Food & markets', description: 'Street food, seasonal plates' },
      { option_id: 'nature', label: 'Nature & gardens', description: 'Gardens, rivers, bamboo' },
      { option_id: 'rest', label: 'Rest & ease', description: 'Unhurried, low movement' },
    ]
  },
  {
    question_id: 'q_pace', prompt: 'What pace would make this trip feel best?',
    selection_mode: 'single', required: true,
    free_text_mode: 'optional',
    options: [
      { option_id: 'slow', label: 'Slow and spacious', description: 'Fewer activities with more recovery.' },
      { option_id: 'balanced', label: 'Balanced', description: 'Mix of visits and flexible time.' },
      { option_id: 'fast', label: 'Full and energetic', description: 'More coverage, less unplanned time.' },
    ]
  },
  {
    question_id: 'q_budget_scope', prompt: 'Does your budget include flights to Japan?',
    selection_mode: 'single', required: true,
    free_text_mode: 'only_if_no_option', free_text_placeholder: 'Tell us in your own words',
    options: [
      { option_id: 'exclude', label: 'Flights are separate', description: 'Budget is for Japan stay only.' },
      { option_id: 'include', label: 'Flights included', description: 'Budget covers flights and stay.' },
    ]
  },
]
