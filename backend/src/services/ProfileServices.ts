import { ProfileConfirmMessage, ProfileRequestChangesMessage } from "../structures/CommandMessage";
import { ServiceResult } from "../structures/types";

export async function profileConfirmService(
    data: ProfileConfirmMessage
): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []

    // mark the confirmed profile
    // set workflow to planning
    // start planning

    return res
}

export async function profileRequestChangesService(
    data: ProfileRequestChangesMessage
): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []

    // set workflow to discovery
    // go to discovery service
    // give agent to ask questions for the requested change topics

    return res
}
