import { Socket } from "socket.io";
import { AskUserDecisionRequest } from "../../../ai/candidate-design";
import { getCurrentRunIdForSession, getSocketById, getSocketIdForSession, setWorkflowState } from "../models/data";
import { Commands, Events, WorkflowStates } from "../structures/enums";
import { DecisionRequestMessage } from "../structures/EventMessage";
import { createDecisionRequestMessage } from "../factory/Event";
import { generateUUID } from "../modules/util";
import { nextSequence } from "../services/StateServices";
import { DecisionRespondMessage } from "../structures/CommandMessage";
import { logger } from "../modules/logger";

export async function askUserDecisionTool(
        request: AskUserDecisionRequest
): Promise<string> {
    logger.debug('agent 2 is requesting user decision', {req: request})
    const sockid: string = await getSocketIdForSession(request.session_id!)
    const sock: Socket = await getSocketById(sockid)
    const run_id = await getCurrentRunIdForSession(request.session_id!);
    const seq = await nextSequence(run_id);
    setWorkflowState(request.session_id!, WorkflowStates.DECISION_REQUIRED)

    return new Promise<string>((resolve, reject) => {
        const req: DecisionRequestMessage = createDecisionRequestMessage({
            message_id: `msg_${generateUUID()}`,
            session_id: request.session_id!,
            run_id: run_id,
            command_id: '',
            occurred_at: new Date().toISOString(),
            sequence: seq,
            payload: {
                decision_id: `dec_${generateUUID()}`,
                profile_revision: 1,
                reason: request.reason,
                prompt: request.prompt,
                options: request.options
            }
        })
        sock.emit(Events.DECISION_REQUEST, req)

        sock.once(Commands.DECISION_RESPOND, (data: DecisionRespondMessage) => {
            setWorkflowState(request.session_id!, WorkflowStates.PLANNING)
            logger.debug('sending agent 2 the requested data response', {res: data})
            resolve(data.payload.option_id)
        })
    });
}
