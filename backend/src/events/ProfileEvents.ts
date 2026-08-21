import { Server, Socket } from 'socket.io';
import * as handlers from '../handlers/ProfileHandlers';

export function profileEvents (socket: Socket) {
    socket.on("profile.confirm", (data) => handlers.profileConfirmHandler(socket, data));
    socket.on("profile.request_changes", (data) => handlers.profileRequestChangesHandler(socket, data));
}

