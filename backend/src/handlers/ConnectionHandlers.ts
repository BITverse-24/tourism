import { Socket, Server } from 'socket.io';
import { tripEvents } from '../events/TripEvents';
import { logger } from '../modules/logger';

export function onConnect(socket: Socket) {
    logger.debug('socket connected', { socketid: socket.id });
    tripEvents(socket);
}

export function onDisconnect(socket: Socket) {
    logger.debug('socket disconnected', { socketid: socket.id });
}
