import { SessionCloseMessage, SessionStartMessage } from "../structures/CommandMessage";
import { ServiceResult } from "../structures/types";

export function sessionStartService(data: SessionStartMessage): ServiceResult[]  {
    return;
}


export function sessionCloseService(data: SessionCloseMessage): ServiceResult[] {
    return;
}
