import { setWorkflowState, unsetRunId } from "../models/data";
import { RunCancelMessage } from "../structures/CommandMessage";
import { WorkflowStates } from "../structures/enums";
import { ServiceResult } from "../structures/types";

export async function runCancelService(
    data: RunCancelMessage,
    emit: (res: ServiceResult) => void
): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []

    unsetRunId(data.session_id)

    setWorkflowState(data.session_id, WorkflowStates.CANCELLED)

    return res
}
