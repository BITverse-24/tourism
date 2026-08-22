import { Socket, Server } from 'socket.io';
import { logger } from '../modules/logger';
import { runEvents } from '../events/RunEvents';
import { profileEvents } from '../events/ProfileEvents';
import { discoveryEvents } from '../events/DiscoveryEvents';
import { replanEvents } from '../events/ReplanEvents';
import { sessionEvents } from '../events/SessionEvents';
import { decisionEvents } from '../events/DecisionEvents';
import { registerSocket, unregisterSocketById } from '../models/data';

export async function onConnect(socket: Socket) {
    logger.debug('socket connected', { socketid: socket.id });
    await registerSocket(socket)
    sessionEvents(socket)
    runEvents(socket)
    profileEvents(socket)
    discoveryEvents(socket)
    replanEvents(socket)
    decisionEvents(socket)
}

export function onDisconnect(socket: Socket) {
    logger.debug('socket disconnected', { socketid: socket.id });
    unregisterSocketById(socket.id)
}
