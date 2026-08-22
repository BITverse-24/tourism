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

    // Fast-path: if this is the exact pending decision, accept even if workflow/run_id checks would fail.
    // This is the root fix for "try again" — previously BaseValidation rejected with INVALID_WORKFLOW_STATE
    // when the client snapshot was still 'planning' due to sequencing, even though the server was already 'decision_required'.
    const pendingFast = getDecisionPending(data.session_id);
    if (pendingFast && pendingFast.decision_id === data.payload.decision_id) {
        // Only validate payload shape and session existence — skip workflow/run_id/command_id strict checks
        const parse = DecisionRespondSchema.safeParse(data);
        if (!parse.success) {
            const rej = (await import('../factory/Ack')).createCommandRejectedMessage({
                message_id: `msg_${generateUUID()}`, session_id: data.session_id, run_id: data.run_id, command_id: data.command_id,
                occurred_at: new Date().toISOString(), workflow_state: await currentWorkflowState(data.session_id),
                sequence: await nextSequence(data.run_id),
                code: (await import('../structures/enums')).RejectionCodes.INVALID_ENVELOPE, message: parse.error.message.slice(0,500), retryable: false, recovery: {}
            });
            socket.emit((await import('../structures/enums')).Acks.COMMAND_REJECTED, rej);
            return;
        }
        const { getValidSessionIds } = await import('../models/data');
        const validIds = await getValidSessionIds();
        if (!validIds.has(data.session_id)) {
            const rej = (await import('../factory/Ack')).createCommandRejectedMessage({
                message_id: `msg_${generateUUID()}`, session_id: data.session_id, run_id: data.run_id, command_id: data.command_id,
                occurred_at: new Date().toISOString(), workflow_state: await currentWorkflowState(data.session_id),
                sequence: await nextSequence(data.run_id),
                code: (await import('../structures/enums')).RejectionCodes.SESSION_EXPIRED, message: 'invalid session id', retryable: false, recovery: { valid_sessions: [...validIds] }
            });
            socket.emit((await import('../structures/enums')).Acks.COMMAND_REJECTED, rej);
            return;
        }
        // allow even if command_id was used in a previous run — this is the active pending decision
        // fall through to pending handling below
    } else {
        const baseValid = await checkBaseCommandRejections(socket, data, DecisionRespondSchema);
        if (!baseValid) return;
    }

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
