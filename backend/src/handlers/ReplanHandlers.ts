import { Socket } from 'socket.io';
import { logger } from '../modules/logger';

export function replanRequestHandler(socket: Socket, data: unknown) {
    logger.debug('socket sent replan.request', { socketid: socket.id, data: data });
    socket.emit('error', { message: 'unsupported' })
}
