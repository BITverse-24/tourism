import { getValidSessionIds } from "../models/data";
import { SessionCloseMessage, SessionStartMessage } from "../structures/CommandMessage";
import { NewSessionMessage, NewSessionMessageSchema } from "../structures/NewSessionMessage";
import { ServiceResult } from "../structures/types";

export async function sessionStartService(
    data: SessionStartMessage | NewSessionMessage,
    isNewSessMsg: boolean,
): Promise<ServiceResult[]>  {
    const res: ServiceResult[] = []

    if (isNewSessMsg) {
        // create new session id and run id
        // add session.ready msg to res
        // add discovery.question to res
    }
    // else if ("session_id" in data && !sessionHasCheckpoint(data.session_id)) {
        // get session checkpoint
        // create new run
        // add session.ready msg to res
        // do checkpoint next service
        // add next msg after checkpoint to res
    // }
    else {
        // create new run
        // add session.ready msg to res with no checkpoint
        // add discovery.question to res
    }

    return res;
}

export async function sessionCloseService(data: SessionCloseMessage): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []

    // move session id to expired

    return res;
}

