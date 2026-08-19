
import { Socket } from 'socket.io';
import { logger } from '../modules/logger';
import { Acknowledge } from '../structures/enums';
import { PlanningStatusMessage, PlanningStatusSchema } from '../structures/EventMessage';
import { planningStatusService } from '../services/PlanningServices';

export function planningStatusHandler(socket: Socket, data: PlanningStatusMessage) {
    logger.debug('socket sent discovery.answer', { socketid: socket.id, data: data });
    const isValidData = PlanningStatusSchema.safeParse(data);
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

    planningStatusService(data)

    // TODO EMIT BACK EVENTS BASED ON PROCESSED RESULTS
}
