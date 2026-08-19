import { Socket } from 'socket.io';
import { logger } from '../modules/logger';
import { Acknowledge } from '../structures/enums';
import { DecisionRespondMessage, DecisionRespondSchema, SessionStartSchema } from '../structures/CommandMessage';
import { decisionRespondService } from '../services/DecisionServices';
import { checkBaseCommandRejections } from './BaseValidation';
import { AckMessage } from '../structures/AckMessage';
import { buildAckMsg } from '../factory/Ack';
import { currentWorkflowState, getNextSequence } from '../services/StateServices';
import { ServiceResult } from '../structures/types';

export async function decisionRespondHandler(socket: Socket, data: DecisionRespondMessage) {
    logger.debug('socket sent decision.respond', { socketid: socket.id, data: data });

    if (!checkBaseCommandRejections(socket, data, DecisionRespondSchema)) return;

    const ackmsg: AckMessage = buildAckMsg(
        data,
        await getNextSequence(data.run_id),
        true,
        await currentWorkflowState(data.session_id),
        false,
    )
    socket.emit(Acknowledge.COMMAND_ACCEPTED, ackmsg)

    const reses: ServiceResult[] = await decisionRespondService(data)

    for (let res of reses)
        socket.emit(res.event, res.data);
}
