import { Socket } from 'socket.io';
import * as handlers from '../handlers/DecisionHandlers';

export function decisionEvents(socket: Socket): void {
    socket.on('decision.respond', (data) => handlers.decisionRespondHandler(socket, data));
}
