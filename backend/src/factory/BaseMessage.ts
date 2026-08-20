import { BaseMessageEnvelope } from "../structures/BaseMessageEnvelope";

export function createBaseMessageEnvelope({
    message_id,
    session_id,
    run_id,
    command_id,
    occurred_at,
}: BaseMessageEnvelope): BaseMessageEnvelope {
    return {
        message_id,
        session_id,
        run_id,
        command_id,
        occurred_at,
    };
}
