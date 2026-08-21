import { Socket, Server } from 'socket.io';
import { logger } from '../modules/logger';
import { runEvents } from '../events/RunEvents';
import { profileEvents } from '../events/ProfileEvents';
import { decisionEvents } from '../events/DecisionEvents';
import { discoveryEvents } from '../events/DiscoveryEvents';
import { replanEvents } from '../events/ReplanEvents';
import { sessionEvents } from '../events/SessionEvents';

export function onConnect(socket: Socket) {
    logger.debug('socket connected', { socketid: socket.id });
    sessionEvents(socket)
    runEvents(socket)
    profileEvents(socket)
    // decisionEvents(socket)  all handled in tool calls
    discoveryEvents(socket)
    replanEvents(socket)
}

export function onDisconnect(socket: Socket) {
    logger.debug('socket disconnected', { socketid: socket.id });
}
