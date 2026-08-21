import { Socket } from 'socket.io';
import { logger } from '../modules/logger';
import { SessionCloseMessage, SessionStartMessage, SessionStartSchema } from '../structures/CommandMessage';
import { Acks } from '../structures/enums';
import { sessionCloseService, sessionStartService } from '../services/SessionServices';
import { ServiceResult } from '../structures/types';
import { currentWorkflowState, nextSequence } from '../services/StateServices';
import { AckMessage } from '../structures/AckMessage';
import { checkBaseCommandRejections } from './BaseValidation';
import { NewSessionMessageSchema } from '../structures/NewSessionMessage';
import { createCommandAcceptedMessage } from '../factory/Ack';
import { generateUUID } from '../modules/util';

export async function sessionStartHandler(socket: Socket, data: SessionStartMessage) {
    logger.debug('recieved session.start', { socketid: socket.id, data: data });

    const newSessMsgCheckRes = NewSessionMessageSchema.safeParse(data)
    const isNewSessionMsg = newSessMsgCheckRes.success

    if (!isNewSessionMsg) {
        const baseValid = await checkBaseCommandRejections(socket, data, SessionStartSchema)
        if (!baseValid) return;
    }

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

    const reses: ServiceResult[] = await sessionStartService(socket, data, isNewSessionMsg)

    for (let res of reses)
        socket.emit(res.event, res.data);
}

export async function sessionCloseHandler(socket: Socket, data: SessionCloseMessage) {
    logger.debug('recieved session.close', { socketid: socket.id, data: data });

    if (!checkBaseCommandRejections(socket, data, SessionStartSchema)) return;

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

    const reses: ServiceResult[] = await sessionCloseService(data)

    for (let res of reses)
        socket.emit(res.event, res.data);
}
