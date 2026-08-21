import { setWorkflowState, unsetRunId } from "../models/data";
import { logger } from "../modules/logger";
import { RunCancelMessage } from "../structures/CommandMessage";
import { WorkflowStates } from "../structures/enums";
import { ServiceResult } from "../structures/types";

export async function runCancelService(
    data: RunCancelMessage,
    emit: (res: ServiceResult) => void
): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []
    logger.debug('started run.cancel service', {data: data})

    unsetRunId(data.session_id)

    setWorkflowState(data.session_id, WorkflowStates.CANCELLED)

    logger.debug('completed run.cancel service', {data: data})
    return res
}
