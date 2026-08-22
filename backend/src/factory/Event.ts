import { Events, MessageKinds } from "../structures/enums";
import { DecisionRequestMessage, DiscoveryQuestionMessage, PlanningStatusMessage, PlanSnapshotMessage, ProfileReadyMessage, ProfileSnapshotMessage, SessionExpiredMessage, SessionReadyMessage, WorkflowCompletedMessage, WorkflowStateMessage } from "../structures/EventMessage";

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

export function createDiscoveryQuestionMessage({
    message_id,
    session_id,
    run_id,
    command_id,
    occurred_at,
    sequence,
    payload,
}: Omit<DiscoveryQuestionMessage, "kind" | "type">): DiscoveryQuestionMessage {
    return {
        message_id,
        session_id,
        run_id,
        command_id,
        occurred_at,
        kind: MessageKinds.EVENT,
        sequence,
        type: Events.DISCOVERY_QUESTION,
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

export function createPlanSnapshotMessage({
    message_id,
    session_id,
    run_id,
    command_id,
    occurred_at,
    sequence,
    payload,
}: Omit<PlanSnapshotMessage, "kind" | "type">): PlanSnapshotMessage {
    return {
        message_id,
        session_id,
        run_id,
        command_id,
        occurred_at,
        kind: MessageKinds.EVENT,
        sequence,
        type: Events.PLAN_SNAPSHOT,
        payload,
    };
}

export function createWorkflowStateMessage({
    message_id,
    session_id,
    run_id,
    command_id,
    occurred_at,
    sequence,
    payload,
}: Omit<WorkflowStateMessage, "kind" | "type">): WorkflowStateMessage {
    return {
        message_id,
        session_id,
        run_id,
        command_id,
        occurred_at,
        kind: MessageKinds.EVENT,
        sequence,
        type: Events.WORKFLOW_STATE,
        payload,
    };
}
