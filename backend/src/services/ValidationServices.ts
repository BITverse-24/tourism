import { z } from "zod";
import { Commands, RejectionCodes, WorkflowStates } from "../structures/enums";
import { MessageEnvelope } from "../structures/MessageEnvelope";
import { CommandRejectedMessage } from "../structures/AckMessage";
import { isValidCommandType } from "../modules/util";
import { buildAckMsg } from "../factory/Ack";
import { getValidSessionIds } from "../models/data";
import { currentWorkflowState, getNextSequence } from "./StateServices";
import { SessionStartSchema } from "../structures/CommandMessage";
import { logger } from "../modules/logger";

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
    sequence: number,
): { valid: boolean, ack?: CommandRejectedMessage } {

    const parseRes = schema.safeParse(data)

    if (!parseRes.success) {

        let ret = {
            valid: false,
            ack: buildAckMsg(
                data,
                sequence,
                false,
                workflow_state,
                undefined,
                RejectionCodes.INVALID_ENVELOPE,
                `invalid envelope format for message type ${data.type}`,
                true,
                {}
            ) as CommandRejectedMessage
        }

        if (!isValidCommandType(data.type)) {
            ret.ack.code = RejectionCodes.UNSUPPORTED_MESSAGE_TYPE
            ret.ack.message = `${data.type} is not a valid message type`
        }
        else if (!isValidCommandForWorkflow(data.type, workflow_state)) {
            ret.ack.code = RejectionCodes.INVALID_WORKFLOW_STATE
            ret.ack.message = `not a valid command in current workflow state: ${workflow_state}`
        }

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

    const validSessionIds: string[] = await getValidSessionIds()
    const ret = { valid: true, validSessions: validSessionIds }

    if (!validSessionIds.includes(session_id))
        ret.valid = false;

    return ret;
}

