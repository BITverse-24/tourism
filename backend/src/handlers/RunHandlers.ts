import { Socket } from 'socket.io';
import { logger } from '../modules/logger';
import { RunCancelMessage, RunCancelSchema } from '../structures/CommandMessage';
import { Acknowledge } from '../structures/enums';
import { runCancelService } from '../services/RunServices';

export function runCancelHandler(socket: Socket, data: RunCancelMessage) {
    logger.debug('socket sent run.cancel', { socketid: socket.id, data: data });
    const isValidData = RunCancelSchema.safeParse(data);
    if (!isValidData.success) {
        logger.warn('recieved data in invalid format for run.cancel', {
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

    runCancelService(data)

    // TODO EMIT BACK EVENTS BASED ON PROCESSED RESULTS
    
}
