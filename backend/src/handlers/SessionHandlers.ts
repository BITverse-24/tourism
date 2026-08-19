import { Socket } from 'socket.io';
import { logger } from '../modules/logger';
import { SessionCloseMessage, SessionCloseSchema, SessionStartMessage, SessionStartSchema } from '../structures/CommandMessage';
import { Acknowledge } from '../structures/enums';
import { sessionCloseService, sessionStartService } from '../services/SessionServices';
import { ServiceResult } from '../structures/types';
import { validateCommandDataFormat } from '../modules/util';
import { currentWorkflowState } from '../services/StateServices';

export async function sessionStartHandler(socket: Socket, data: SessionStartMessage) {
    logger.debug('recieved session.start', { socketid: socket.id, data: data });
    const formatValidationRes = validateCommandDataFormat(
        data,
        SessionStartSchema,
        await currentWorkflowState(),
    ) 
    if (!formatValidationRes.valid) {

        logger.warn('recieved data in invalid format for session.start', {
            socketid: socket.id,
            data: data,
            ack: formatValidationRes.ack
        })
        socket.emit(Acknowledge.COMMAND_REJECTED, formatValidationRes.ack)
        return;
    }
    // check if session doesnt exist in memory - session_expired command rejection
    // else if () {
    // }
    //

    const ackmsg = {}; // TODO
    socket.emit(Acknowledge.COMMAND_ACCEPTED, ackmsg)

    const reses: ServiceResult[] = sessionStartService(data)

    for (let res of reses)
        socket.emit(res.event, res.data);
}

export async function sessionCloseHandler(socket: Socket, data: SessionCloseMessage) {
    logger.debug('recieved session.close', { socketid: socket.id, data: data });
    const formatValidationRes = validateCommandDataFormat(
        data,
        SessionStartSchema,
        await currentWorkflowState(),
    ) 
    if (!formatValidationRes.valid) {

        logger.warn('recieved data in invalid format for session.close', {
            socketid: socket.id,
            data: data,
            ack: formatValidationRes.ack
        })
        socket.emit(Acknowledge.COMMAND_REJECTED, formatValidationRes.ack)
        return;
    }
    // check if session doesnt exist in memory - session_expired command rejection
    // else if () {
    // }
    //

    const ackmsg = {
        // TODO
    };
    socket.emit(Acknowledge.COMMAND_ACCEPTED, ackmsg)

    const reses: ServiceResult[] = sessionCloseService(data)

    for (let res of reses)
        socket.emit(res.event, res.data);
}
