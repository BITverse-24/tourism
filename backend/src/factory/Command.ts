import { DecisionRespondMessage, DiscoveryAnswerMessage, ProfileConfirmMessage, ProfileRequestChangesMessage, RunCancelMessage, SessionCloseMessage, SessionStartMessage } from "../structures/CommandMessage";
import { Commands, MessageKinds } from "../structures/enums";

export function createSessionStartMessage({
    message_id,
    session_id,
    run_id,
    command_id,
    occurred_at,
    payload,
}: Omit<SessionStartMessage, "kind" | "type">): SessionStartMessage {
    return {
        message_id,
        session_id,
        run_id,
        command_id,
        occurred_at,
        kind: MessageKinds.COMMAND,
        type: Commands.SESSION_START,
        payload,
    };
}

export function createDiscoveryAnswerMessage({
    message_id,
    session_id,
    run_id,
    command_id,
    occurred_at,
    payload,
}: Omit<DiscoveryAnswerMessage, "kind" | "type">): DiscoveryAnswerMessage {
    return {
        message_id,
        session_id,
        run_id,
        command_id,
        occurred_at,
        kind: MessageKinds.COMMAND,
        type: Commands.DISCOVERY_ANSWER,
        payload,
    };
}

export function createProfileConfirmMessage({
    message_id,
    session_id,
    run_id,
    command_id,
    occurred_at,
    payload,
}: Omit<ProfileConfirmMessage, "kind" | "type">): ProfileConfirmMessage {
    return {
        message_id,
        session_id,
        run_id,
        command_id,
        occurred_at,
        kind: MessageKinds.COMMAND,
        type: Commands.PROFILE_CONFIRM,
        payload,
    };
}

export function createProfileRequestChangesMessage({
    message_id,
    session_id,
    run_id,
    command_id,
    occurred_at,
    payload,
}: Omit<ProfileRequestChangesMessage, "kind" | "type">): ProfileRequestChangesMessage {
    return {
        message_id,
        session_id,
        run_id,
        command_id,
        occurred_at,
        kind: MessageKinds.COMMAND,
        type: Commands.PROFILE_REQUEST_CHANGES,
        payload,
    };
}

export function createDecisionRespondMessage({
    message_id,
    session_id,
    run_id,
    command_id,
    occurred_at,
    payload,
}: Omit<DecisionRespondMessage, "kind" | "type">): DecisionRespondMessage {
    return {
        message_id,
        session_id,
        run_id,
        command_id,
        occurred_at,
        kind: MessageKinds.COMMAND,
        type: Commands.DECISION_RESPOND,
        payload,
    };
}

export function createRunCancelMessage({
    message_id,
    session_id,
    run_id,
    command_id,
    occurred_at,
    payload,
}: Omit<RunCancelMessage, "kind" | "type">): RunCancelMessage {
    return {
        message_id,
        session_id,
        run_id,
        command_id,
        occurred_at,
        kind: MessageKinds.COMMAND,
        type: Commands.RUN_CANCEL,
        payload,
    };
}

export function createSessionCloseMessage({
    message_id,
    session_id,
    run_id,
    command_id,
    occurred_at,
    payload,
}: Omit<SessionCloseMessage, "kind" | "type">): SessionCloseMessage {
    return {
        message_id,
        session_id,
        run_id,
        command_id,
        occurred_at,
        kind: MessageKinds.COMMAND,
        type: Commands.SESSION_CLOSE,
        payload,
    };
}
