import { z } from "zod";
import { currentWorkflowState, nextSequence } from "../services/StateServices";
import { MessageEnvelope } from "../structures/MessageEnvelope";
import { isValidSession, validateCommandDataFormat } from "../services/ValidationServices";
import { buildAckMsg } from "../factory/Ack";
import { logger } from "../modules/logger";
import { Acks, RejectionCodes } from "../structures/enums";
import { Socket } from "socket.io";
import { getCommandIdsForRun, getCurrentRunIdForSession, getWorkflowState } from "../models/data";

export async function checkBaseCommandRejections<T extends z.ZodObject>(
    socket: Socket,
    data: MessageEnvelope,
    schema: T,
): Promise<boolean> {

    const curr_workflow_state = await currentWorkflowState(data.session_id);
    const curr_run_id = await getCurrentRunIdForSession(data.session_id);

    const formatValidationRes = validateCommandDataFormat(
        data,
        schema,
        curr_workflow_state,
        await nextSequence(data.run_id)
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
        socket.emit(
            Acks.COMMAND_REJECTED,
            buildAckMsg(
                data,
                await nextSequence(data.run_id),
                false,
                curr_workflow_state,
                undefined,
                RejectionCodes.SESSION_EXPIRED,
                `invalid session id`,
                false,
                { valid_sessions: sessionIdValidRes.validSessions }
            )
        )
        return false;
    }
    // check for run id correctness
    else if (curr_run_id !== data.run_id) {
        socket.emit(
            Acks.COMMAND_REJECTED,
            buildAckMsg(
                data,
                await nextSequence(data.run_id),
                false,
                curr_workflow_state,
                undefined,
                RejectionCodes.RUN_CANCELLED,
                `not current run id`,
                false,
                { current_run_id: curr_run_id }
            )
        )
        return false;
    }
    // check for command id conflict
    else if ((await getCommandIdsForRun(curr_run_id)).has(data.command_id)) {
        socket.emit(
            Acks.COMMAND_REJECTED,
            buildAckMsg(
                data,
                await nextSequence(data.run_id),
                false,
                curr_workflow_state,
                undefined,
                RejectionCodes.COMMAND_ID_CONFLICT,
                `command id already used`,
                false,
                { }
            )
        )
        return false;
    }

    return true;
}
