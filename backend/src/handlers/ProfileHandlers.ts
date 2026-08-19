import { Socket } from 'socket.io';
import { logger } from '../modules/logger';
import { ProfileConfirmMessage, ProfileConfirmSchema, ProfileRequestChangesMessage, ProfileRequestChangesSchema } from '../structures/CommandMessage';
import { profileConfirmService, profileRequestChangesService } from '../services/ProfileServices';
import { Acknowledge } from '../structures/enums';

export function profileConfirmHandler(socket: Socket, data: ProfileConfirmMessage) {
    logger.debug('socket sent profile.confirm', { socketid: socket.id, data: data });
    const isValidData = ProfileConfirmSchema.safeParse(data);
    if (!isValidData.success) {
        logger.warn('recieved data in invalid format for profile.confirm', {
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

    profileConfirmService(data)

    // TODO EMIT BACK EVENTS BASED ON PROCESSED RESULTS
}

export function profileRequestChangesHandler(socket: Socket, data: ProfileRequestChangesMessage) {
    logger.debug('socket sent profile.request_changes', { socketid: socket.id, data: data });
    const isValidData = ProfileRequestChangesSchema.safeParse(data);
    if (!isValidData.success) {
        logger.warn('recieved data in invalid format for profile.request_changes', {
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

    profileRequestChangesService(data)

    // TODO EMIT BACK EVENTS BASED ON PROCESSED RESULTS
}
