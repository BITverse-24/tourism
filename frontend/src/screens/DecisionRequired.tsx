import Consultation from './Consultation'
import type { DecisionRequest } from './Consultation'

/**
 * DecisionRequired — legacy route now merged into Consultation.
 * Previously a separate cream trade-off page/modal.
 * Now delegates to Consultation's one-screen three-state model
 * (WORKING → DECISION_REQUIRED → RESUMING) so the decision
 * feels like Voyager has paused and surfaced a consultation point,
 * not navigated to another screen.
 */

const decision: DecisionRequest = {
  decision_id: 'decision_profile7_route_a_route_b',
  sequenceLabel: '01  ·  TRADE-OFF',
  kicker: 'A CHOICE IS NEEDED',
  prompt: 'Would you rather keep the pace gentle or see a little more, even if it means more walking?',
  reason: 'material_tradeoff',
  options: [
    { option_id: 'comfort', label: 'Prioritize comfort', tradeoff: 'Fewer attraction visits and less movement — more rest, less transit.' },
    { option_id: 'coverage', label: 'Prioritize coverage', tradeoff: 'More attraction visits and a higher movement burden — see more, walk more.' },
  ],
}

export default function DecisionRequired() {
  // Direct delegation — same dark consultation environment, no cream card, no separate page
  return <Consultation decisionRequest={decision} enableMockDecision={false} />
}
