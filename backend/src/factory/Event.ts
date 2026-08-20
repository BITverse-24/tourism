import { Events, MessageKinds } from "../structures/enums";
import { DecisionRequestMessage, DeliveryQuestionMessage, PlanningStatusMessage, ProfileReadyMessage, ProfileSnapshotMessage, SessionExpiredMessage, SessionReadyMessage, WorkflowCompletedMessage } from "../structures/EventMessage";
import { BaseMessageEnvelope } from "../structures/MessageEnvelope";

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

export function createSessionReadyMessage({
    message_id,
    session_id,
    run_id,
    command_id,
    occurred_at,
    sequence,
    payload,
}: Omit<SessionReadyMessage, "kind" | "type">): SessionReadyMessage {
    return {
        message_id,
        session_id,
        run_id,
        command_id,
        occurred_at,
        kind: MessageKinds.EVENT,
        sequence,
        type: Events.SESSION_READY,
        payload,
    };
}

export function createDeliveryQuestionMessage({
    message_id,
    session_id,
    run_id,
    command_id,
    occurred_at,
    sequence,
    payload,
}: Omit<DeliveryQuestionMessage, "kind" | "type">): DeliveryQuestionMessage {
    return {
        message_id,
        session_id,
        run_id,
        command_id,
        occurred_at,
        kind: MessageKinds.EVENT,
        sequence,
        type: Events.DELIVERY_QUESTION,
        payload,
    };
}

export function createProfileSnapshotMessage({
    message_id,
    session_id,
    run_id,
    command_id,
    occurred_at,
    sequence,
    payload,
}: Omit<ProfileSnapshotMessage, "kind" | "type">): ProfileSnapshotMessage {
    return {
        message_id,
        session_id,
        run_id,
        command_id,
        occurred_at,
        kind: MessageKinds.EVENT,
        sequence,
        type: Events.PROFILE_SNAPSHOT,
        payload,
    };
}

export function createProfileReadyMessage({
    message_id,
    session_id,
    run_id,
    command_id,
    occurred_at,
    sequence,
    payload,
}: Omit<ProfileReadyMessage, "kind" | "type">): ProfileReadyMessage {
    return {
        message_id,
        session_id,
        run_id,
        command_id,
        occurred_at,
        kind: MessageKinds.EVENT,
        sequence,
        type: Events.PROFILE_READY,
        payload,
    };
}

export function createPlanningStatusMessage({
    message_id,
    session_id,
    run_id,
    command_id,
    occurred_at,
    sequence,
    payload,
}: Omit<PlanningStatusMessage, "kind" | "type">): PlanningStatusMessage {
    return {
        message_id,
        session_id,
        run_id,
        command_id,
        occurred_at,
        kind: MessageKinds.EVENT,
        sequence,
        type: Events.PLANNING_STATUS,
        payload,
    };
}

export function createDecisionRequestMessage({
    message_id,
    session_id,
    run_id,
    command_id,
    occurred_at,
    sequence,
    payload,
}: Omit<DecisionRequestMessage, "kind" | "type">): DecisionRequestMessage {
    return {
        message_id,
        session_id,
        run_id,
        command_id,
        occurred_at,
        kind: MessageKinds.EVENT,
        sequence,
        type: Events.DECISION_REQUEST,
        payload,
    };
}

export function createWorkflowCompletedMessage({
    message_id,
    session_id,
    run_id,
    command_id,
    occurred_at,
    sequence,
    payload,
}: Omit<WorkflowCompletedMessage, "kind" | "type">): WorkflowCompletedMessage {
    return {
        message_id,
        session_id,
        run_id,
        command_id,
        occurred_at,
        kind: MessageKinds.EVENT,
        sequence,
        type: Events.WORKFLOW_COMPLETED,
        payload,
    };
}

export function createSessionExpiredMessage({
    message_id,
    session_id,
    run_id,
    command_id,
    occurred_at,
    sequence,
    payload,
}: Omit<SessionExpiredMessage, "kind" | "type">): SessionExpiredMessage {
    return {
        message_id,
        session_id,
        run_id,
        command_id,
        occurred_at,
        kind: MessageKinds.EVENT,
        sequence,
        type: Events.SESSION_EXPIRED,
        payload,
    };
}
