import { Socket } from 'socket.io';
import { logger } from '../modules/logger';
import { DiscoveryAnswerMessage, DiscoveryAnswerSchema } from '../structures/CommandMessage';
import { Acknowledge } from '../structures/enums';
import { discoveryAnswerService } from '../services/DiscoveryServices';

export function discoveryAnswerHandler(socket: Socket, data: DiscoveryAnswerMessage) {
    logger.debug('socket sent discovery.answer', { socketid: socket.id, data: data });
    const isValidData = DiscoveryAnswerSchema.safeParse(data);
    if (!isValidData.success) {
        logger.warn('recieved data in invalid format for session.start', {
            socketid: socket.id,
            data: data,
            zod_error: isValidData.error,
        });

        const ackmsg = {}; // TODO
        socket.emit(Acknowledge.COMMAND_REJECTED, ackmsg)
        return;
    }
    else {
        const ackmsg = {}; // TODO
        socket.emit(Acknowledge.COMMAND_ACCEPTED, ackmsg)
    }

    discoveryAnswerService(data)

    // TODO EMIT BACK EVENTS BASED ON PROCESSED RESULTS
}
