import { Server, Socket } from 'socket.io';
import * as handlers from '../handlers/SessionHandlers';

export function sessionEvents (socket: Socket) {
    socket.on("session.start", (data) => handlers.sessionStartHandler(socket, data));
    socket.on("session.close", (data) => handlers.sessionCloseHandler(socket, data));
}

