import { Socket } from 'socket.io';
import { logger } from '../modules/logger';
import { DecisionRespondMessage, DecisionRespondSchema } from '../structures/CommandMessage';
import { checkBaseCommandRejections } from './BaseValidation';
import { createCommandAcceptedMessage } from '../factory/Ack';
import { Acks } from '../structures/enums';
import { currentWorkflowState, nextSequence } from '../services/StateServices';
import { generateUUID } from '../modules/util';
import { getDecisionPending, setWorkflowState } from '../models/data';
import { WorkflowStates } from '../structures/enums';
import { resolvePendingDecision } from '../agent_tools/CandidateDecision';

export async function decisionRespondHandler(socket: Socket, data: DecisionRespondMessage): Promise<void> {
    logger.debug('socket sent decision.respond', { socketid: socket.id, data });

    const baseValid = await checkBaseCommandRejections(socket, data, DecisionRespondSchema);
    if (!baseValid) return;

    const pending = getDecisionPending(data.session_id);
    if (!pending) {
        // stale or no pending decision — ack but no side effect
        const ack = createCommandAcceptedMessage({
            message_id: `msg_${generateUUID()}`,
            session_id: data.session_id,
            run_id: data.run_id,
            command_id: data.command_id,
            occurred_at: new Date().toISOString(),
            workflow_state: await currentWorkflowState(data.session_id),
            sequence: await nextSequence(data.run_id),
            deduplicated: false,
        });
        socket.emit(Acks.COMMAND_ACCEPTED, ack);
        return;
    }
    if (pending.decision_id !== data.payload.decision_id) {
        const ack = createCommandAcceptedMessage({
            message_id: `msg_${generateUUID()}`,
            session_id: data.session_id,
            run_id: data.run_id,
            command_id: data.command_id,
            occurred_at: new Date().toISOString(),
            workflow_state: await currentWorkflowState(data.session_id),
            sequence: await nextSequence(data.run_id),
            deduplicated: false,
        });
        socket.emit(Acks.COMMAND_ACCEPTED, ack);
        return;
    }

    const valid = pending && data.payload.option_id && pending.decision_id === data.payload.decision_id;
    // validate option_id belongs to decision — trust askUserDecisionTool options (already validated by AI schema)
    // ack first
    const ack = createCommandAcceptedMessage({
        message_id: `msg_${generateUUID()}`,
        session_id: data.session_id,
        run_id: data.run_id,
        command_id: data.command_id,
        occurred_at: new Date().toISOString(),
        workflow_state: WorkflowStates.PLANNING,
        sequence: await nextSequence(data.run_id),
        deduplicated: false,
    });
    socket.emit(Acks.COMMAND_ACCEPTED, ack);

    await setWorkflowState(data.session_id, WorkflowStates.PLANNING);
    logger.debug('resolving pending decision via decision.respond handler', { data });
    resolvePendingDecision(data.session_id, data.payload.decision_id, data.payload.option_id);
}
