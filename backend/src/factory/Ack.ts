import { AckMessage, CommandAcceptedSchema, CommandRejectedSchema } from "../structures/AckMessage";
import { RejectionCodes, WorkflowStates } from "../structures/enums";
import { MessageEnvelope } from "../structures/MessageEnvelope";

export function buildAckMsg(
    data: MessageEnvelope,
    sequence: number,
    accepted: boolean,
    workflow_state: WorkflowStates,

    // if accepted = true need these
    deduplicated?: boolean,

    // if accepted = false need these
    code?: RejectionCodes,
    message?: string,
    retryable?: boolean,
    recovery?: Record<string, unknown>,

): AckMessage {

    if (accepted) {
        if (!deduplicated) throw new Error('deduplicated value not provided');
        return {
            message_id: data.message_id,
            session_id: data.session_id,
            run_id: data.run_id,
            command_id: data.command_id,
            sequence: sequence,
            type: CommandAcceptedSchema.shape.type.value,
            kind: CommandAcceptedSchema.shape.kind.value,
            occurred_at: new Date().toISOString(),
            accepted: true,
            workflow_state: workflow_state,
            deduplicated: deduplicated,
        }
    }

    if (!code || !message || !retryable || !recovery)
        throw new Error('didnt provide all required fields');

    return {
        message_id: data.message_id,
        session_id: data.session_id,
        run_id: data.run_id,
        command_id: data.command_id,
        sequence: sequence,
        occurred_at: new Date().toISOString(),
        type: CommandRejectedSchema.shape.type.value,
        kind: CommandRejectedSchema.shape.kind.value,
        workflow_state: workflow_state,
        accepted: CommandRejectedSchema.shape.accepted.value,
        code: code,
        message: message,
        retryable: retryable,
        recovery: recovery,
    }
}
