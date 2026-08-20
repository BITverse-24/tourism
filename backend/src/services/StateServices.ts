import { getNextSequence, getWorkflowState } from "../models/data";
import { WorkflowStates } from "../structures/enums";

export async function currentWorkflowState(session_id: string): Promise<WorkflowStates> {
    return await getWorkflowState(session_id);
}

export async function nextSequence(run_id: string): Promise<number> {
    return await getNextSequence(run_id)
}
