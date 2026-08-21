import { Socket } from 'socket.io';
import { logger } from '../modules/logger';
import { DiscoveryAnswerMessage, DiscoveryAnswerSchema } from '../structures/CommandMessage';
import { Acks } from '../structures/enums';
import { discoveryAnswerService } from '../services/DiscoveryServices';
import { checkBaseCommandRejections } from './BaseValidation';
import { AckMessage } from '../structures/AckMessage';
import { createCommandAcceptedMessage } from '../factory/Ack';
import { currentWorkflowState, nextSequence } from '../services/StateServices';
import { ServiceResult } from '../structures/types';
import { generateUUID } from '../modules/util';

export async function discoveryAnswerHandler(socket: Socket, data: DiscoveryAnswerMessage) {
    logger.debug('socket sent discovery.answer', { socketid: socket.id, data: data });

    const baseValid = await checkBaseCommandRejections(socket, data, DiscoveryAnswerSchema)
    if (!baseValid) return;

    // validate selected option id
    // validate selection count
    // validate question id to be correct

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

    const reses: ServiceResult[] = await discoveryAnswerService(
        (res: ServiceResult) => socket.emit(res.event, res.data),
        data
    )

    for (let res of reses)
        socket.emit(res.event, res.data);
}
