import { RunCancelMessage } from "../structures/CommandMessage";
import { ServiceResult } from "../structures/types";

export async function runCancelService(
    data: RunCancelMessage
): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []

    // unset current run for session id - set it as expired or whatev

    return res
}
