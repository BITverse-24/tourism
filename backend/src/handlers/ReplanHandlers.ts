import { Socket } from 'socket.io';
import { logger } from '../modules/logger';
import { replanService } from '../services/ReplanServices';
import { ServiceResult } from '../structures/types';
import { AckMessage } from '../structures/AckMessage';
import { ReplanRequestMessage, ReplanRequestSchema } from '../structures/CommandMessage';
import { checkBaseCommandRejections } from './BaseValidation';
import { createCommandAcceptedMessage } from '../factory/Ack';
import { generateUUID } from '../modules/util';
import { currentWorkflowState, nextSequence } from '../services/StateServices';
import { Acks } from '../structures/enums';

export async function replanRequestHandler(socket: Socket, data: ReplanRequestMessage) {
    logger.debug('socket sent replan.request', { socketid: socket.id, data: data });
    socket.emit('error', { message: 'unsupported' })

    if (!checkBaseCommandRejections(socket, data, ReplanRequestSchema)) return;

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

    replanService(
        (res: ServiceResult) => socket.emit(res.event, res.data),
        data,
    )
}
