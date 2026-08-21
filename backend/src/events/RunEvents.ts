import { Server, Socket } from 'socket.io';
import * as handlers from '../handlers/RunHandlers';

export function runEvents (socket: Socket) {
    socket.on("run.cancel", (data) => handlers.runCancelHandler(socket, data));
}

