import { Socket } from "socket.io";
import { DiscoveryQuestion } from "../../../ai/discovery";
import { generateUUID } from "../modules/util";
import { ProfileSnapshotStates, WorkflowStates } from "../structures/enums";
import { TravelerProfile } from "../structures/TravelerProfile";
import { CheckpointType, ProfileSnapshot } from "../structures/types";
import { FinalTripPlan } from "../structures/FinalTripPlan";

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

const DiscoveryQuestions: Record<string, DiscoveryQuestion[]> = {
}

const SequenceNumbers: Record<string, number> = {
}

const SessionSocketIds: Record<string, string> = {
}

const SocketIdtoSocket: Record<string, Socket> = {
}

/** Serializes checkpoint mutations per session so revisions stay unique/monotonic. */
const SessionCheckpointChains: Record<string, Promise<unknown>> = {
}

/**
 * Discovery epoch per session. Bumped when the traveler answers so a stale
 * background provisional discovery result cannot emit a colliding snapshot.
 */
const SessionDiscoveryEpoch: Record<string, number> = {
}

const RunTripPlan: Record<string, FinalTripPlan> = {
}



export async function setTripPlan(run_id: string, plan: FinalTripPlan) {
    RunTripPlan[run_id] = plan
}
export async function getTripPlan(run_id: string) {
    return RunTripPlan[run_id]
}



export async function registerSocket(socket: Socket) {
    SocketIdtoSocket[socket.id] = socket
}
export async function unregisterSocketById(socketid: string) {
    delete SocketIdtoSocket[socketid]
    delete SessionSocketIds[socketid]
}
export async function getSocketById(socketid: string): Promise<Socket> {
    return SocketIdtoSocket[socketid]
}



export async function getSocketIdForSession(session_id: string): Promise<string> {
    return SessionSocketIds[session_id]
}
export async function setSocketIdForSession(session_id: string, socketid: string) {
    SessionSocketIds[session_id] = socketid
}
export async function unsetSocketIdForSession(session_id: string) {
    delete SessionSocketIds[session_id]
}



export async function getNextSequence(run_id: string): Promise<number> {
    if (!SequenceNumbers[run_id]) SequenceNumbers[run_id] = 0;
    SequenceNumbers[run_id] = SequenceNumbers[run_id]+1;
    return SequenceNumbers[run_id];
}



export async function getDiscoveryQuestionById(run_id: string, q_id: string): Promise<DiscoveryQuestion> {
    return DiscoveryQuestions[run_id].find((it) => it.question_id === q_id)!
}
export async function addDiscoveryQuestion(run_id: string, q: DiscoveryQuestion) {
    if (!DiscoveryQuestions[run_id]) DiscoveryQuestions[run_id] = []
    DiscoveryQuestions[run_id].push(q)
}

export function getDiscoveryQuestions(run_id: string): DiscoveryQuestion[] {
    return DiscoveryQuestions[run_id] ?? []
}

export function getDiscoveryQuestionCount(run_id: string): number {
    return DiscoveryQuestions[run_id]?.length ?? 0
}

export function getDiscoveryQuestionPrompts(run_id: string): string[] {
    return (DiscoveryQuestions[run_id] ?? []).map((q) => q.prompt)
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

export function getDiscoveryEpoch(session_id: string): number {
    return SessionDiscoveryEpoch[session_id] ?? 0
}

/** Bump when accepting a traveler answer so in-flight provisional work is ignored. */
export function bumpDiscoveryEpoch(session_id: string): number {
    const next = (SessionDiscoveryEpoch[session_id] ?? 0) + 1
    SessionDiscoveryEpoch[session_id] = next
    return next
}

function latestSnapshotRevision(checkpoint: CheckpointType | undefined): number {
    if (!checkpoint?.profile_snapshots?.length) return 0
    return checkpoint.profile_snapshots.reduce(
        (max, snap) => (snap.revision > max ? snap.revision : max),
        0,
    )
}

/**
 * Atomically append a profile snapshot with a strictly increasing revision.
 * Contract 1.0: clients replace only when revision is newer — state changes
 * (draft→ready→confirmed) must never reuse a prior revision.
 */
export async function appendProfileSnapshot(
    session_id: string,
    state: ProfileSnapshotStates,
    profile: TravelerProfile,
    workflow_state?: WorkflowStates,
): Promise<ProfileSnapshot> {
    const prev = SessionCheckpointChains[session_id] ?? Promise.resolve()
    let result!: ProfileSnapshot
    const next = prev.then(async () => {
        let checkpoint = SessionCheckpoints[session_id]
        if (!checkpoint) {
            checkpoint = {
                session_id,
                profile_snapshots: [],
                latest_confirmed: null,
                workflow_state: workflow_state ?? SessionWorkflowState[session_id] ?? WorkflowStates.DISCOVERY,
            }
        }
        const revision = latestSnapshotRevision(checkpoint) + 1
        const snapshot: ProfileSnapshot = { revision, state, profile }
        checkpoint = {
            ...checkpoint,
            profile_snapshots: [...checkpoint.profile_snapshots, snapshot],
            ...(workflow_state !== undefined ? { workflow_state } : {}),
            ...(state === ProfileSnapshotStates.CONFIRMED ? { latest_confirmed: revision } : {}),
        }
        SessionCheckpoints[session_id] = checkpoint
        result = snapshot
        return snapshot
    })
    SessionCheckpointChains[session_id] = next.catch(() => undefined)
    await next
    return result
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
    CommandIds[run_id] = new Set()
    RunIds[session_id] = run_id
    return run_id
}

export async function unsetRunId(session_id: string) {
    delete DiscoveryQuestions[RunIds[session_id]]
    delete CommandIds[RunIds[session_id]]
    delete RunIds[session_id]
}



export async function getCommandIdsForRun(run_id: string): Promise<Set<string>> {
    if (CommandIds[run_id] == undefined) CommandIds[run_id] = new Set()
    return CommandIds[run_id];
}

export async function addCommandIdToRun(run_id: string, command_id: string) {
    if (CommandIds[run_id] == undefined) CommandIds[run_id] = new Set()
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
