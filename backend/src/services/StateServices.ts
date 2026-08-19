import { WorkflowStates } from "../structures/enums";

export async function currentWorkflowState(): Promise<WorkflowStates> {
    return WorkflowStates.DISCOVERY;
}
