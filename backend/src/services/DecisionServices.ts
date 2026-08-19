import { DecisionRespondMessage } from "../structures/CommandMessage";
import { ServiceResult } from "../structures/types";

export async function decisionRespondService(
    data: DecisionRespondMessage
): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []

    // make sure is valid decision question id and answer id
    // give agent the response
    // thats it no response here i think

    return res;
}
