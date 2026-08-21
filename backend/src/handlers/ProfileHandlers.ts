import { Socket } from 'socket.io';
import { logger } from '../modules/logger';
import { ProfileConfirmMessage, ProfileConfirmSchema, ProfileRequestChangesMessage, ProfileRequestChangesSchema } from '../structures/CommandMessage';
import { profileConfirmService, profileRequestChangesService } from '../services/ProfileServices';
import { Acks } from '../structures/enums';
import { checkBaseCommandRejections } from './BaseValidation';
import { createCommandAcceptedMessage } from '../factory/Ack';
import { AckMessage } from '../structures/AckMessage';
import { currentWorkflowState, nextSequence } from '../services/StateServices';
import { ServiceResult } from '../structures/types';
import { generateUUID } from '../modules/util';

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

    const reses: ServiceResult[] = await profileConfirmService(
        (res: ServiceResult) => socket.emit(res.event, res.data),
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

    const reses: ServiceResult[] = await profileRequestChangesService(
        (res: ServiceResult) => socket.emit(res.event, res.data),
        data,
    )

    // for (let res of reses)
    //     socket.emit(res.event, res.data);
}
