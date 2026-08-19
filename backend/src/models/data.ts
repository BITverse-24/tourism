
const SessionIds: Record<string, Set<string>> = {
    valid: new Set(),
    expired: new Set(),
}

const RunIds: Record<string, string> = {
}

const CommandIds: Record<string, Set<string>>= {
}

export async function getCurrentRunIdForSession(session_id: string): Promise<string> {
    return RunIds[session_id];
}

export async function setNewRunIdForSession(session_id: string, run_id: string) {
    RunIds[session_id] = run_id;
}

export async function getCommandIdsForRun(run_id: string): Promise<Set<string>> {
    return CommandIds[run_id];
}

export async function addCommandIdToRun(run_id: string, command_id: string) {
    CommandIds[run_id].add(command_id)
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
