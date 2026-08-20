import { Commands, Events, Acks, Errors, ProfileSnapshotStates, WorkflowStates } from "./enums";
import { TravelerProfile } from "./TravelerProfile";

export type ServiceResult = {
    event: string;
    data: Record<string, unknown>;
}

export type MessageType = Commands | Events | Acks | Errors

export type ProfileSnapshot = {
    revision: number,
    state: ProfileSnapshotStates
    profile: TravelerProfile
}

export type CheckpointType = {
    session_id: string,
    profile_snapshots: ProfileSnapshot[],
    latest_confirmed: number | null,
    workflow_state: WorkflowStates,
    // trip plan
}
