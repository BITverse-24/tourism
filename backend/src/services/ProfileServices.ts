import { createProfileSnapshotMessage } from "../factory/Event";
import { getSessionCheckpoint, getSessionProfile, setSessionCheckpoint, setWorkflowState } from "../models/data";
import { generateUUID } from "../modules/util";
import { ProfileConfirmMessage, ProfileRequestChangesMessage } from "../structures/CommandMessage";
import { Events, ProfileSnapshotStates, WorkflowStates } from "../structures/enums";
import { ProfileSnapshotMessage } from "../structures/EventMessage";
import { CheckpointType, ProfileSnapshot, ServiceResult } from "../structures/types";
import { newDiscoveryQuestionService } from "./DiscoveryServices";
import { getNextSequence } from "./StateServices";

export async function profileConfirmService(
    data: ProfileConfirmMessage
): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []

    // mark the confirmed profile
    let checkpoint: CheckpointType = await getSessionCheckpoint(data.session_id)
    const snapshot: ProfileSnapshot = {
        revision:
        (checkpoint.profile_snapshots.length == 0) ?
            1 :
            checkpoint.profile_snapshots[checkpoint.profile_snapshots.length - 1].revision + 1,
        state: ProfileSnapshotStates.CONFIRMED,
        profile: await getSessionProfile(data.session_id)
    }
    checkpoint.profile_snapshots.push(snapshot)

    await setSessionCheckpoint(data.session_id, checkpoint)

    // send confirmed profile snapshot
    const profSnapMsg: ProfileSnapshotMessage = createProfileSnapshotMessage({
        message_id: `msg_${generateUUID()}`,
        session_id: data.session_id,
        run_id: data.run_id,
        command_id: data.command_id,
        occurred_at: new Date().toISOString(),
        sequence: await getNextSequence(data.session_id),
        payload: snapshot
    })
    res.push({ event: Events.PROFILE_SNAPSHOT, data: profSnapMsg })

    // set workflow to planning
    setWorkflowState(data.session_id, WorkflowStates.PLANNING)

    // start planning
    // agent 2 service

    return res
}

export async function profileRequestChangesService(
    data: ProfileRequestChangesMessage
): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []

    await setWorkflowState(data.session_id, WorkflowStates.DISCOVERY)
    // give agent to ask questions for the requested change topics ?????
    res.concat(
        await newDiscoveryQuestionService(
            data.session_id,
            data.run_id,
            data.command_id
        )
    )

    return res
}
