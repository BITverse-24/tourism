import { z } from "zod";
import { Commands, RejectionCodes, WorkflowStates } from "../structures/enums";
import { MessageEnvelope } from "../structures/MessageEnvelope";
import { CommandRejectedMessage } from "../structures/AckMessage";
import { generateUUID, isValidCommandType } from "../modules/util";
import { getValidSessionIds } from "../models/data";
import { currentWorkflowState, nextSequence } from "./StateServices";
import { SessionStartSchema } from "../structures/CommandMessage";
import { logger } from "../modules/logger";
import { createCommandRejectedMessage } from "../factory/Ack";

export function isValidCommandForWorkflow(type: Commands, workflow: WorkflowStates): boolean {
    switch (workflow) {

            // discovery state
        case WorkflowStates.DISCOVERY:
            if (
                [Commands.DISCOVERY_ANSWER, Commands.RUN_CANCEL, Commands.SESSION_CLOSE]
                    .includes(type)
            ) return true; break;

            // profile_review state
        case WorkflowStates.PROFILE_REVIEW:
            if (
                [Commands.PROFILE_CONFIRM, Commands.PROFILE_REQUEST_CHANGES, Commands.RUN_CANCEL, Commands.SESSION_CLOSE].includes(type)
            ) return true; break;

            // planning state
        case WorkflowStates.PLANNING:
            if (
                [Commands.RUN_CANCEL, Commands.SESSION_CLOSE]
                    .includes(type)
            ) return true; break;
            
            // decision_required state
        case WorkflowStates.DECISION_REQUIRED:
            if (
                [Commands.DECISION_RESPOND, Commands.RUN_CANCEL, Commands.SESSION_CLOSE]
                    .includes(type)
            ) return true; break;

            // plan_ready state
        case WorkflowStates.PLAN_READY:
            if (
                [Commands.RUN_CANCEL, Commands.SESSION_CLOSE]
                    .includes(type)
            ) return true; break;

            // replanning state
        case WorkflowStates.REPLANNING:
            return false // cos replanning not supported
            // if (
            //     [Command.RUN_CANCEL, Command.SESSION_CLOSE]
            //         .includes(type)
            // ) return true; break;

            // cancelled state
        case WorkflowStates.CANCELLED:
            if (
                [Commands.SESSION_START, Commands.SESSION_CLOSE]
                    .includes(type)
            ) return true; break;

            // expired state
        case WorkflowStates.EXPIRED:
            if (
                [Commands.SESSION_START]
                    .includes(type)
            ) return true; break;
    }

    return false;
}

export function validateCommandDataFormat<T extends z.ZodObject>(
    data: MessageEnvelope,
    schema: T,
    workflow_state: WorkflowStates,
): { valid: boolean, ack?: CommandRejectedMessage } {

    const parseRes = schema.safeParse(data)


    let ret = {
        valid: false,
        ack: 
            createCommandRejectedMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                workflow_state: workflow_state,
                sequence: 1,
                code: RejectionCodes.RUN_CANCELLED,
                message: `invalid envelope format for message type ${data.type}`,
                retryable: false,
                recovery: {}
            })
    }
    if (!parseRes.success) {
        ret.ack.recovery = JSON.parse(parseRes.error.message)
        return ret;
    }

    if (!isValidCommandType(data.type)) {
        ret.ack.code = RejectionCodes.UNSUPPORTED_MESSAGE_TYPE
        ret.ack.message = `${data.type} is not a valid message type`
        return ret;
    }
    else if (!isValidCommandForWorkflow(data.type, workflow_state)) {
        ret.ack.code = RejectionCodes.INVALID_WORKFLOW_STATE
        ret.ack.message = `not a valid command in current workflow state: ${workflow_state}`
        return ret;
    }

    return { valid: true };
}

// checks if given session id is valid
export async function isValidSession(session_id: string):
Promise<{
    valid: boolean,
    validSessions: string[] 
}> {

    const validSessionIds: Set<string> = await getValidSessionIds()
    const ret = { valid: true, validSessions: [...validSessionIds] }

    if (!validSessionIds.has(session_id))
        ret.valid = false;

    return ret;
}

