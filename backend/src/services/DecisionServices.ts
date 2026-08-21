import { DecisionRespondMessage } from "../structures/CommandMessage";
import { ServiceResult } from "../structures/types";

export async function decisionRespondService(
    emit: (res: ServiceResult) => void,
    data: DecisionRespondMessage
): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []

    // give agent 2 the response
    // thats it no response here i think

    return res;
}

