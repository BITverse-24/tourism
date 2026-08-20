import { Socket } from 'socket.io';
import { logger } from '../modules/logger';
import { SessionCloseMessage, SessionStartMessage, SessionStartSchema } from '../structures/CommandMessage';
import { Acks } from '../structures/enums';
import { sessionCloseService, sessionStartService } from '../services/SessionServices';
import { ServiceResult } from '../structures/types';
import { currentWorkflowState, getNextSequence } from '../services/StateServices';
import { AckMessage } from '../structures/AckMessage';
import { buildAckMsg } from '../factory/Ack';
import { checkBaseCommandRejections } from './BaseValidation';
import { NewSessionMessageSchema } from '../structures/NewSessionMessage';

export async function sessionStartHandler(socket: Socket, data: SessionStartMessage) {
    logger.debug('recieved session.start', { socketid: socket.id, data: data });

    const newSessMsgCheckRes = NewSessionMessageSchema.safeParse(data)
    const isNewSessionMsg = newSessMsgCheckRes.success

    if (!isNewSessionMsg && !checkBaseCommandRejections(socket, data, SessionStartSchema)) return;
    
    const ackmsg: AckMessage = buildAckMsg(
        data,
        await getNextSequence(),
        true,
        await currentWorkflowState(data.session_id),
        false,
    )
    socket.emit(Acks.COMMAND_ACCEPTED, ackmsg)

    const reses: ServiceResult[] = await sessionStartService(data, isNewSessionMsg)

    for (let res of reses)
        socket.emit(res.event, res.data);
}

export async function sessionCloseHandler(socket: Socket, data: SessionCloseMessage) {
    logger.debug('recieved session.close', { socketid: socket.id, data: data });

    if (!checkBaseCommandRejections(socket, data, SessionStartSchema)) return;

    const ackmsg: AckMessage = buildAckMsg(
        data,
        await getNextSequence(data.run_id),
        true,
        await currentWorkflowState(data.session_id),
        false,
    )
    socket.emit(Acks.COMMAND_ACCEPTED, ackmsg)

    const reses: ServiceResult[] = await sessionCloseService(data)

    for (let res of reses)
        socket.emit(res.event, res.data);
}
