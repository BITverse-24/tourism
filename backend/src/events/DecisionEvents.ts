import { Server, Socket } from 'socket.io';
import * as handlers from '../handlers/DecisionHandlers';

export function decisionEvents (socket: Socket) {
    socket.on("decision.respond", (data) => handlers.decisionRespondHandler(socket, data));
}

