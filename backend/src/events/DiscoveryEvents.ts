import { Server, Socket } from 'socket.io';
import * as handlers from '../handlers/DiscoveryHandlers';

export function discoveryEvents (socket: Socket) {
    socket.on("discovery.answer", (data) => handlers.discoveryAnswerHandler(socket, data));
}

