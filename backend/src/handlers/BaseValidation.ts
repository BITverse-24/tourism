import { z } from "zod";
import { currentWorkflowState, nextSequence } from "../services/StateServices";
import { MessageEnvelope } from "../structures/MessageEnvelope";
import { isValidSession, validateCommandDataFormat } from "../services/ValidationServices";
import { logger } from "../modules/logger";
import { Acks, RejectionCodes } from "../structures/enums";
import { Socket } from "socket.io";
import { addCommandIdToRun, getCommandIdsForRun, getCurrentRunIdForSession, getWorkflowState } from "../models/data";
import { createCommandRejectedMessage } from "../factory/Ack";
import { generateUUID } from "../modules/util";

export async function checkBaseCommandRejections<T extends z.ZodObject>(
    socket: Socket,
    data: MessageEnvelope,
    schema: T,
): Promise<boolean> {

    const curr_workflow_state = await currentWorkflowState(data.session_id);
    const curr_run_id = await getCurrentRunIdForSession(data.session_id);
    const seq = await nextSequence(data.run_id);
    const rejectionMsg = 
            createCommandRejectedMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                workflow_state: curr_workflow_state,
                sequence: seq,
                code: RejectionCodes.RUN_CANCELLED,
                message: `not current run id`,
                retryable: false,
                recovery: { current_run_id: curr_run_id }
            })

    const formatValidationRes = validateCommandDataFormat(
        data,
        schema,
        curr_workflow_state,
        seq
    ) 
    const sessionIdValidRes = await isValidSession(data.session_id);
    if (!formatValidationRes.valid) {

        logger.warn(`recieved data in invalid format for ${data.type}`, {
            socketid: socket.id,
            data: data,
            ack: formatValidationRes.ack
        })
        socket.emit(Acks.COMMAND_REJECTED, formatValidationRes.ack)
        return false;
    }
    // check if session doesnt exist in memory - session_expired command rejection
    else if (!sessionIdValidRes.valid) {
        rejectionMsg.code = RejectionCodes.SESSION_EXPIRED
        rejectionMsg.message = `invalid session id`
        rejectionMsg.recovery = { valid_sessions: sessionIdValidRes.validSessions }
        socket.emit(
            Acks.COMMAND_REJECTED,
            rejectionMsg
        )
        return false;
    }
    // check for run id correctness
    else if (curr_run_id !== data.run_id) {
        rejectionMsg.code = RejectionCodes.RUN_CANCELLED
        rejectionMsg.message = `not current run id`
        rejectionMsg.recovery = { current_run_id: curr_run_id }
        socket.emit(
            Acks.COMMAND_REJECTED,
            rejectionMsg
        )
        return false;
    }
    // check for command id conflict
    else if ((await getCommandIdsForRun(curr_run_id)).has(data.command_id)) {
        rejectionMsg.code = RejectionCodes.COMMAND_ID_CONFLICT
        rejectionMsg.message = `command id already used`
        rejectionMsg.recovery = {}
        socket.emit(
            Acks.COMMAND_REJECTED,
            rejectionMsg
        )
        return false;
    }


    addCommandIdToRun(data.run_id, data.command_id)

    return true;
}
