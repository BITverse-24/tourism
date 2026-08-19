import { Server, Socket } from 'socket.io';
import * as handlers from '../handlers/ReplanHandlers';

export function replanEvents (socket: Socket) {
    socket.on("replan.request", (data) => handlers.replanRequestHandler(socket, data));
}

