import { Socket } from 'socket.io';
import { logger } from '../modules/logger';
import { DiscoveryAnswerMessage, DiscoveryAnswerSchema } from '../structures/CommandMessage';
import { Acks } from '../structures/enums';
import { discoveryAnswerService } from '../services/DiscoveryServices';
import { checkBaseCommandRejections } from './BaseValidation';
import { AckMessage } from '../structures/AckMessage';
import { buildAckMsg } from '../factory/Ack';
import { currentWorkflowState, nextSequence } from '../services/StateServices';
import { ServiceResult } from '../structures/types';

export async function discoveryAnswerHandler(socket: Socket, data: DiscoveryAnswerMessage) {
    logger.debug('socket sent discovery.answer', { socketid: socket.id, data: data });

    if (!checkBaseCommandRejections(socket, data, DiscoveryAnswerSchema)) return;

    // validate selected option id
    // validate selection count
    // validate question id to be correct

    const ackmsg: AckMessage = buildAckMsg(
        data,
        await nextSequence(data.run_id),
        true,
        await currentWorkflowState(data.session_id),
        false,
    )
    socket.emit(Acks.COMMAND_ACCEPTED, ackmsg)

    const reses: ServiceResult[] = await discoveryAnswerService(data)

    for (let res of reses)
        socket.emit(res.event, res.data);
}
