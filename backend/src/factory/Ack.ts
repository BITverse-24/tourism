import { AckMessage, CommandAcceptedMessage, CommandAcceptedSchema, CommandRejectedMessage, CommandRejectedSchema } from "../structures/AckMessage";
import { Acks, MessageKinds, RejectionCodes, WorkflowStates } from "../structures/enums";
import { MessageEnvelope } from "../structures/MessageEnvelope";
export function createCommandAcceptedMessage({
    message_id,
    session_id,
    run_id,
    command_id,
    occurred_at,
    workflow_state,
    sequence,
    deduplicated,
}: Omit<CommandAcceptedMessage, "kind" | "type" | "accepted">): CommandAcceptedMessage {
    return {
        message_id,
        session_id,
        run_id,
        command_id,
        occurred_at,
        kind: MessageKinds.ACK,
        workflow_state,
        sequence,
        type: Acks.COMMAND_ACCEPTED,
        accepted: true,
        deduplicated,
    };
}

export function createCommandRejectedMessage({
    message_id,
    session_id,
    run_id,
    command_id,
    occurred_at,
    workflow_state,
    sequence,
    code,
    message,
    retryable,
    recovery,
}: Omit<CommandRejectedMessage, "kind" | "type" | "accepted">): CommandRejectedMessage {
    return {
        message_id,
        session_id,
        run_id,
        command_id,
        occurred_at,
        kind: MessageKinds.ACK,
        workflow_state,
        sequence,
        type: Acks.COMMAND_REJECTED,
        accepted: false,
        code,
        message,
        retryable,
        recovery,
    };
}
