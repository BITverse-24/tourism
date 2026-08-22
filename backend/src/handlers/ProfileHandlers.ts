import { Socket } from 'socket.io';
import { logger, serializeError } from '../modules/logger';
import { ProfileConfirmMessage, ProfileConfirmSchema, ProfileRequestChangesMessage, ProfileRequestChangesSchema } from '../structures/CommandMessage';
import { profileConfirmService, profileRequestChangesService } from '../services/ProfileServices';
import { Acks, DiscoveryAnsSelectionModes, DiscoveryFreeTextModes, Errors, Events, MessageKinds, WorkflowStates } from '../structures/enums';
import { checkBaseCommandRejections } from './BaseValidation';
import { createCommandAcceptedMessage } from '../factory/Ack';
import { createDiscoveryQuestionMessage } from '../factory/Event';
import { AckMessage } from '../structures/AckMessage';
import { currentWorkflowState, nextSequence } from '../services/StateServices';
import { ServiceResult } from '../structures/types';
import { generateUUID } from '../modules/util';
import { addDiscoveryQuestion, bumpDiscoveryEpoch, getSocketById, getSocketIdForSession, setWorkflowState } from '../models/data';

export async function profileConfirmHandler(socket: Socket, data: ProfileConfirmMessage) {
    logger.debug('socket sent profile.confirm', { socketid: socket.id, data: data });

    const baseValid = await checkBaseCommandRejections(socket, data, ProfileConfirmSchema)
    if (!baseValid) return;

    // check if provided profile revision version is latest snapshot
    // if not send rejected ack profile revision conflict

    // check if the profile has any blocking unkowns
    // if it does send rejected ack error profile not ready

    const ackmsg: AckMessage = createCommandAcceptedMessage({
        message_id: `msg_${generateUUID()}`,
        session_id: data.session_id,
        run_id: data.run_id,
        command_id: data.command_id,
        occurred_at: new Date().toISOString(),
        workflow_state: await currentWorkflowState(data.session_id),
        sequence: await nextSequence(data.run_id),
        deduplicated: false,
    })
    socket.emit(Acks.COMMAND_ACCEPTED, ackmsg)

    // Session-aware emitter — survives reconnects (fixes consultation timeout while backend heartbeats)
    const emitToSession = async (res: ServiceResult) => {
        try {
            const sid = await getSocketIdForSession(data.session_id)
            const cur = sid ? await getSocketById(sid) : null
            const target = cur ?? socket
            // @ts-ignore dynamic event name
            target.emit(res.event, res.data)
        } catch {
            try { socket.emit(res.event, res.data) } catch {}
        }
    }
    const reses: ServiceResult[] = await profileConfirmService(
        emitToSession as (res: ServiceResult) => void,
        data,
    )

    // for (let res of reses)
    //     socket.emit(res.event, res.data);
}

export async function profileRequestChangesHandler(
    socket: Socket,
    data: ProfileRequestChangesMessage
) {
    logger.debug('socket sent profile.request_changes', { socketid: socket.id, data: data });

    const baseValid = await checkBaseCommandRejections(socket, data, ProfileRequestChangesSchema)
    if (!baseValid) return;

    bumpDiscoveryEpoch(data.session_id)
    await setWorkflowState(data.session_id, WorkflowStates.DISCOVERY)

    const ackmsg: AckMessage = createCommandAcceptedMessage({
        message_id: `msg_${generateUUID()}`,
        session_id: data.session_id,
        run_id: data.run_id,
        command_id: data.command_id,
        occurred_at: new Date().toISOString(),
        workflow_state: await currentWorkflowState(data.session_id),
        sequence: await nextSequence(data.run_id),
        deduplicated: false,
    })
    socket.emit(Acks.COMMAND_ACCEPTED, ackmsg)

    const emitToSession = async (res: ServiceResult) => {
        try {
            const sid = await getSocketIdForSession(data.session_id)
            const cur = sid ? await getSocketById(sid) : null
            const target = cur ?? socket
            // @ts-ignore dynamic event name
            target.emit(res.event, res.data)
        } catch {
            try { socket.emit(res.event, res.data) } catch {}
        }
    }

    try {
        await profileRequestChangesService(
            emitToSession as (res: ServiceResult) => void,
            data,
        )
    } catch (error) {
        logger.error('profile.request_changes failed', serializeError(error))
        const errMessage = error instanceof Error ? error.message : String(error)
        try {
            const errorEvent = {
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(data.run_id),
                kind: MessageKinds.ERROR,
                type: Errors.ERROR,
                code: 'discovery_failed',
                message: errMessage.slice(0, 1000),
                retryable: true,
            }
            await emitToSession({ event: Errors.ERROR, data: errorEvent as unknown as Record<string, unknown> })
        } catch {}
        try {
            const topicsRaw: string[] = Array.isArray((data as unknown as { payload?: { topics?: unknown } }).payload?.topics)
                ? ((data as unknown as { payload: { topics: string[] } }).payload.topics as string[])
                : []
            const topics = topicsRaw.map((t) => (typeof t === 'string' ? t.trim() : '')).filter(Boolean)
            let prompt: string
            if (topics.length === 0) {
                prompt = 'Tell us what to change in the profile.'
            } else if (topics.length === 1) {
                prompt = `What should we change about ${topics[0]}?`
            } else if (topics.length === 2) {
                prompt = `You asked us to revisit ${topics[0]} and ${topics[1]}. What should we correct?`
            } else {
                const allButLast = topics.slice(0, -1).join(', ')
                const last = topics[topics.length - 1]
                prompt = `You asked us to revisit ${allButLast}, and ${last}. What should we correct?`
            }
            const fallbackQuestion = {
                question_id: `q_change_${data.command_id}`,
                prompt,
                selection_mode: DiscoveryAnsSelectionModes.SINGLE,
                required: true,
                options: [] as { option_id: string; label: string; description: string }[],
                free_text_mode: DiscoveryFreeTextModes.REQUIRED,
                free_text_placeholder: 'Add the correction in your own words',
            }
            await addDiscoveryQuestion(data.run_id, fallbackQuestion as unknown as import('../../../ai/discovery').DiscoveryQuestion)
            const fallbackMsg = createDiscoveryQuestionMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(data.run_id),
                payload: fallbackQuestion,
            })
            await emitToSession({ event: Events.DISCOVERY_QUESTION, data: fallbackMsg as unknown as Record<string, unknown> })
        } catch {}
    }
}
