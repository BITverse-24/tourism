import { generateUUID } from "../modules/util";
import { WorkflowStates } from "../structures/enums";
import { TravelerProfile } from "../structures/TravelerProfile";
import { CheckpointType } from "../structures/types";

const SessionIds: Record<string, Set<string>> = {
    valid: new Set(),
    expired: new Set(),
}

const RunIds: Record<string, string> = {
}

const CommandIds: Record<string, Set<string>>= {
}

const SessionWorkflowState: Record<string, WorkflowStates> = {
}

const SessionCheckpoints: Record<string, CheckpointType> = {
}

const SessionProfiles: Record<string, TravelerProfile> = {
}





export async function getSessionProfile(session_id: string): Promise < TravelerProfile > {
    return SessionProfiles[session_id]
}
export async function setSessionProfile(session_id: string, prof: TravelerProfile) {
    SessionProfiles[session_id] = prof
}



export async function getSessionCheckpoint(session_id: string): Promise<CheckpointType> {
    return SessionCheckpoints[session_id]
}

export async function setSessionCheckpoint(session_id: string, checkpoint: CheckpointType) {
    SessionCheckpoints[session_id] = checkpoint
}



export async function getWorkflowState(session_id: string): Promise<WorkflowStates> {
    return SessionWorkflowState[session_id]
}

export async function setWorkflowState(session_id: string, workflow_state: WorkflowStates) {
    SessionWorkflowState[session_id] =  workflow_state
}



export async function getCurrentRunIdForSession(session_id: string): Promise<string> {
    return RunIds[session_id];
}

export async function setNewRunIdForSession(session_id: string, run_id: string) {
    RunIds[session_id] = run_id;
}

export async function getNewRunId(session_id: string): Promise<string> {
    const run_id = `run_${generateUUID()}`;
    RunIds[session_id] = run_id
    return run_id
}

export async function unsetRunId(session_id: string) {
    delete RunIds[session_id]
}



export async function getCommandIdsForRun(run_id: string): Promise<Set<string>> {
    return CommandIds[run_id];
}

export async function addCommandIdToRun(run_id: string, command_id: string) {
    CommandIds[run_id].add(command_id)
}



export async function getNewSessionId(): Promise<string> {
    const sess_id = `sess_${generateUUID()}`;
    SessionIds.valid.add(sess_id)
    return sess_id
}

export async function getValidSessionIds(): Promise<Set<string>> {
    return SessionIds.valid;
}

export async function getExpiredSessionIds(): Promise<Set<string>> {
    return SessionIds.expired;
}

export async function getAllSessionIds(): Promise<typeof SessionIds> {
    return SessionIds;
}

export async function addNewSessionId(session_id: string) {
    SessionIds.valid.add(session_id);
}

export async function moveSessionIdToExpired(session_id: string) {
    SessionIds.valid.delete(session_id)
    SessionIds.expired.add(session_id)
}
