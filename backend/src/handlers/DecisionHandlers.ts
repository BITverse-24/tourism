import { Socket } from 'socket.io';
import { logger } from '../modules/logger';
import { Acks } from '../structures/enums';
import { DecisionRespondMessage, DecisionRespondSchema, SessionStartSchema } from '../structures/CommandMessage';
import { decisionRespondService } from '../services/DecisionServices';
import { checkBaseCommandRejections } from './BaseValidation';
import { AckMessage } from '../structures/AckMessage';
import { createCommandAcceptedMessage } from '../factory/Ack';
import { currentWorkflowState, nextSequence } from '../services/StateServices';
import { ServiceResult } from '../structures/types';
import { generateUUID } from '../modules/util';

export async function decisionRespondHandler(socket: Socket, data: DecisionRespondMessage) {
    logger.debug('socket sent decision.respond', { socketid: socket.id, data: data });

    const baseValid = await checkBaseCommandRejections(socket, data, DecisionRespondSchema)
    if (!baseValid) return;
    // make sure is valid decision question id and answer id

    const ackmsg: AckMessage = createCommandAcceptedMessage({
        message_id: `msg_${generateUUID()}`,
        session_id: data.session_id,
        run_id: data.run_id,
        command_id: data.command_id,
        occurred_at: new Date().toISOString(),
        workflow_state: await currentWorkflowState(data.session_id),
        sequence: await nextSequence(data.run_id),
        deduplicated: false,
    })
    socket.emit(Acks.COMMAND_ACCEPTED, ackmsg)

    const reses: ServiceResult[] = await decisionRespondService(
        (res: ServiceResult) => socket.emit(res.event, res.data),
        data
    )

    // for (let res of reses)
    //     socket.emit(res.event, res.data);
}
