import { Socket } from 'socket.io';
import { logger } from '../modules/logger';
import { Acknowledge } from '../structures/enums';
import { DecisionRespondMessage, DecisionRespondSchema } from '../structures/CommandMessage';
import { decisionRespondService } from '../services/DecisionServices';

export function decisionRespondHandler(socket: Socket, data: DecisionRespondMessage) {
    logger.debug('socket sent decision.respond', { socketid: socket.id, data: data });
    const isValidData = DecisionRespondSchema.safeParse(data);
    if (!isValidData.success) {
        logger.warn('recieved data in invalid format for decision.respond', {
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

    decisionRespondService(data)

    // TODO EMIT BACK EVENTS BASED ON PROCESSED RESULTS
}
