import { DiscoveryAnswerMessage } from "../structures/CommandMessage";
import { ServiceResult } from "../structures/types";

export async function discoveryAnswerService(
    data: DiscoveryAnswerMessage
): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []

    // give agent answer
    // update profile given by agent
    // update checkpoint
    // if all questions are done, set workflow to planning/decision_required
    // if required, add decision.required msg to res
    // else add discovery.question msg to res

    return res
}
