import { createDiscoveryAnswerMessage } from "../factory/Command";
import { createProfileSnapshotMessage, createSessionReadyMessage } from "../factory/Event";
import { getNewRunId, getNewSessionId, getSessionCheckpoint, getValidSessionIds, moveSessionIdToExpired, setWorkflowState } from "../models/data";
import { generateUUID } from "../modules/util";
import { SessionCloseMessage, SessionStartMessage } from "../structures/CommandMessage";
import { Events, WorkflowStates } from "../structures/enums";
import { ProfileSnapshotMessage, SessionReadyMessage } from "../structures/EventMessage";
import { NewSessionMessage, NewSessionMessageSchema } from "../structures/NewSessionMessage";
import { ServiceResult } from "../structures/types";
import { discoveryAnswerService, newDiscoveryQuestionService } from "./DiscoveryServices";
import { getNextSequence } from "./StateServices";

export async function sessionStartService(
    data: SessionStartMessage | NewSessionMessage,
    isNewSessMsg: boolean,
): Promise<ServiceResult[]>  {
    const res: ServiceResult[] = []

    if (isNewSessMsg) {
        const newSessionId = await getNewSessionId()
        const newRunId = await getNewRunId(newSessionId)

        const sessReadyMsg: SessionReadyMessage = createSessionReadyMessage({
            message_id: `msg_${generateUUID()}`,
            session_id: newSessionId,
            run_id: newRunId,
            command_id: data.command_id,
            occurred_at: new Date().toISOString(),
            sequence: await getNextSequence(newSessionId),
            payload:{
                session_id: newSessionId,
                run_id: newRunId,
                workflow_state: WorkflowStates.DISCOVERY,
                has_recovery_state: false,
                confirmed_profile_revision: null,
            }
        })

        res.push({event: Events.SESSION_READY, data: sessReadyMsg})

        setWorkflowState(newSessionId, WorkflowStates.DISCOVERY)

        res.concat(
            await newDiscoveryQuestionService(
                newSessionId,
                newRunId,
                data.command_id
            )
        )

    }

    else if ("session_id" in data) {

        const newRunId = await getNewRunId(data.session_id)
        const checkpoint = await getSessionCheckpoint(data.session_id)
        if (checkpoint) {

            const sessReadyMsg: SessionReadyMessage = createSessionReadyMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: newRunId,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await getNextSequence(data.session_id),
                payload: {
                    session_id: data.session_id,
                    run_id: newRunId,
                    workflow_state: checkpoint.workflow_state,
                    has_recovery_state: true,
                    confirmed_profile_revision: checkpoint.latest_confirmed,
                }
            })
            res.push({ event: Events.SESSION_READY, data: sessReadyMsg })

            for (let snapshot of checkpoint.profile_snapshots) {
                const profSnapMsg: ProfileSnapshotMessage = createProfileSnapshotMessage({
                    message_id: `msg_${generateUUID()}`,
                    session_id: data.session_id,
                    run_id: newRunId,
                    command_id: data.command_id,
                    occurred_at: new Date().toISOString(),
                    sequence: await getNextSequence(data.session_id),
                    payload: snapshot
                })
                res.push({ event: Events.PROFILE_SNAPSHOT, data: profSnapMsg })
            }

            // do checkpoint next service
            if (checkpoint.workflow_state === WorkflowStates.DISCOVERY) {
                res.concat(
                    await newDiscoveryQuestionService(
                        data.session_id,
                        newRunId,
                        data.command_id
                    )
                )
            }

            // other states do if time have

            await setWorkflowState(data.session_id, checkpoint.workflow_state)
        }

        else {
            const sessReadyMsg: SessionReadyMessage = createSessionReadyMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: newRunId,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await getNextSequence(data.session_id),
                payload: {
                    session_id: data.session_id,
                    run_id: newRunId,
                    workflow_state: WorkflowStates.DISCOVERY,
                    has_recovery_state: false,
                    confirmed_profile_revision: null,
                }
            })

            res.push({ event: Events.SESSION_READY, data: sessReadyMsg })

            res.concat(
                await newDiscoveryQuestionService(
                    data.session_id,
                    newRunId,
                    data.command_id
                )
            )
            await setWorkflowState(data.session_id, WorkflowStates.DISCOVERY)
        }
    }

    return res;
}

export async function sessionCloseService(data: SessionCloseMessage): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []

    await moveSessionIdToExpired(data.session_id)
    await setWorkflowState(data.session_id, WorkflowStates.EXPIRED)

    return res;
}

