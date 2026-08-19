import { WorkflowStates } from "../structures/enums";

export async function currentWorkflowState(session_id: string): Promise<WorkflowStates> {
    return WorkflowStates.DISCOVERY;
}

export async function getNextSequence(run_id: string): Promise<number> {
    return -1;
}
