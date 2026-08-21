import { Socket } from "socket.io";
import { createDiscoveryAnswerMessage } from "../factory/Command";
import { createProfileSnapshotMessage, createSessionExpiredMessage, createSessionReadyMessage } from "../factory/Event";
import { getNewRunId, getNewSessionId, getSessionCheckpoint, getSessionProfile, getValidSessionIds, moveSessionIdToExpired, setSocketIdForSession, setWorkflowState, unsetSocketIdForSession } from "../models/data";
import { generateUUID } from "../modules/util";
import { SessionCloseMessage, SessionStartMessage } from "../structures/CommandMessage";
import { Events, WorkflowStates } from "../structures/enums";
import { ProfileSnapshotMessage, SessionReadyMessage } from "../structures/EventMessage";
import { NewSessionMessage, NewSessionMessageSchema } from "../structures/NewSessionMessage";
import { ServiceResult } from "../structures/types";
import { discoveryAnswerService, newDiscoveryQuestionService } from "./DiscoveryServices";
import { nextSequence } from "./StateServices";

export async function sessionStartService(
    emit: (res: ServiceResult) => void,
    data: SessionStartMessage | NewSessionMessage,
    socketid: string,
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
            sequence: await nextSequence(newSessionId),
            payload:{
                session_id: newSessionId,
                run_id: newRunId,
                workflow_state: WorkflowStates.DISCOVERY,
                has_recovery_state: false,
                confirmed_profile_revision: null,
            }
        })

        await setSocketIdForSession(newSessionId, socketid)

        const sessionReadyRes = {event: Events.SESSION_READY, data: sessReadyMsg}
        emit(sessionReadyRes)

        setWorkflowState(newSessionId, WorkflowStates.DISCOVERY)

        await newDiscoveryQuestionService(
            emit,
            newSessionId,
            newRunId,
            data.command_id,
        )

    }

    else if ("session_id" in data) {

        await setSocketIdForSession(data.session_id, socketid)
        const newRunId = await getNewRunId(data.session_id)
        const checkpoint = await getSessionCheckpoint(data.session_id)
        if (checkpoint) {

            const sessReadyMsg: SessionReadyMessage = createSessionReadyMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: newRunId,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(data.session_id),
                payload: {
                    session_id: data.session_id,
                    run_id: newRunId,
                    workflow_state: checkpoint.workflow_state,
                    has_recovery_state: true,
                    confirmed_profile_revision: checkpoint.latest_confirmed,
                }
            })
            const sessionReadyRes = { event: Events.SESSION_READY, data: sessReadyMsg }
            emit(sessionReadyRes)


            for (let snapshot of checkpoint.profile_snapshots) {
                const profSnapMsg: ProfileSnapshotMessage = createProfileSnapshotMessage({
                    message_id: `msg_${generateUUID()}`,
                    session_id: data.session_id,
                    run_id: newRunId,
                    command_id: data.command_id,
                    occurred_at: new Date().toISOString(),
                    sequence: await nextSequence(data.session_id),
                    payload: snapshot
                })
                emit({ event: Events.PROFILE_SNAPSHOT, data: profSnapMsg })
            }

            // do checkpoint next service
            if (checkpoint.workflow_state === WorkflowStates.DISCOVERY) {
                await newDiscoveryQuestionService(
                    emit,
                    data.session_id,
                    newRunId,
                    data.command_id,
                    checkpoint.profile_snapshots[checkpoint.profile_snapshots.length - 1].profile,
                )
            }
            // if (checkpoint.workflow_state === WorkflowStates.DECISION_REQUIRED) {
            // }

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
                sequence: await nextSequence(data.session_id),
                payload: {
                    session_id: data.session_id,
                    run_id: newRunId,
                    workflow_state: WorkflowStates.DISCOVERY,
                    has_recovery_state: false,
                    confirmed_profile_revision: null,
                }
            })

            emit({ event: Events.SESSION_READY, data: sessReadyMsg })

            await newDiscoveryQuestionService(
                emit,
                data.session_id,
                newRunId,
                data.command_id,
            )
            await setWorkflowState(data.session_id, WorkflowStates.DISCOVERY)
        }
    }

    return res;
}

export async function sessionCloseService(
    emit: (res: ServiceResult) => void,
    data: SessionCloseMessage,
): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []

    await moveSessionIdToExpired(data.session_id)
    await setWorkflowState(data.session_id, WorkflowStates.EXPIRED)
    await unsetSocketIdForSession(data.session_id)
    const sessExpiredMsg = createSessionExpiredMessage({
        message_id: `msg_${generateUUID()}`,
        session_id: data.session_id,
        run_id: data.run_id,
        command_id: data.command_id,
        occurred_at: new Date().toISOString(),
        sequence: await nextSequence(data.run_id),
        payload: {
            reason: 'closed by request',
            can_start_new_session: true
        }
    })
    emit({ event: Events.SESSION_EXPIRED, data: sessExpiredMsg })

    return res;
}

