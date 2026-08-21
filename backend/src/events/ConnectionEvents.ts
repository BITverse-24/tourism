import { Server, Socket } from 'socket.io';
import * as handlers from '../handlers/ConnectionHandlers';

export function connectionEvents (io: Server) {
    io.on('connection', (socket: Socket) => {
        handlers.onConnect(socket);
        socket.on('disconnect', () => handlers.onDisconnect(socket));
    });
}
