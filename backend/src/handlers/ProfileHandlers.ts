import { Socket } from 'socket.io';
import { logger } from '../modules/logger';
import { ProfileConfirmMessage, ProfileConfirmSchema, ProfileRequestChangesMessage, ProfileRequestChangesSchema } from '../structures/CommandMessage';
import { profileConfirmService, profileRequestChangesService } from '../services/ProfileServices';
import { Acks } from '../structures/enums';
import { checkBaseCommandRejections } from './BaseValidation';
import { buildAckMsg } from '../factory/Ack';
import { AckMessage } from '../structures/AckMessage';
import { currentWorkflowState, nextSequence } from '../services/StateServices';
import { ServiceResult } from '../structures/types';

export async function profileConfirmHandler(socket: Socket, data: ProfileConfirmMessage) {
    logger.debug('socket sent profile.confirm', { socketid: socket.id, data: data });

    if (!checkBaseCommandRejections(socket, data, ProfileConfirmSchema)) return;

    // check if provided profile revision version is latest snapshot
    // if not send rejected ack profile revision conflict

    // check if the profile has any blocking unkowns
    // if it does send rejected ack error profile not ready

    const ackmsg: AckMessage = buildAckMsg(
        data,
        await nextSequence(data.run_id),
        true,
        await currentWorkflowState(data.session_id),
        false,
    )
    socket.emit(Acks.COMMAND_ACCEPTED, ackmsg)

    const reses: ServiceResult[] = await profileConfirmService(data)

    for (let res of reses)
        socket.emit(res.event, res.data);
}

export async function profileRequestChangesHandler(
    socket: Socket,
    data: ProfileRequestChangesMessage
) {
    logger.debug('socket sent profile.request_changes', { socketid: socket.id, data: data });

    if (!checkBaseCommandRejections(socket, data, ProfileConfirmSchema)) return;

    const ackmsg: AckMessage = buildAckMsg(
        data,
        await nextSequence(data.run_id),
        true,
        await currentWorkflowState(data.session_id),
        false,
    )
    socket.emit(Acks.COMMAND_ACCEPTED, ackmsg)

    const reses: ServiceResult[] = await profileRequestChangesService(data)

    for (let res of reses)
        socket.emit(res.event, res.data);
}
