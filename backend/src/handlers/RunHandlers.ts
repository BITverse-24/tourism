import { Socket } from 'socket.io';
import { logger } from '../modules/logger';
import { RunCancelMessage, RunCancelSchema } from '../structures/CommandMessage';
import { Acks } from '../structures/enums';
import { runCancelService } from '../services/RunServices';
import { checkBaseCommandRejections } from './BaseValidation';
import { AckMessage } from '../structures/AckMessage';
import { buildAckMsg } from '../factory/Ack';
import { currentWorkflowState, nextSequence } from '../services/StateServices';
import { ServiceResult } from '../structures/types';

export async function runCancelHandler(socket: Socket, data: RunCancelMessage) {
    logger.debug('socket sent run.cancel', { socketid: socket.id, data: data });

    if (!checkBaseCommandRejections(socket, data, RunCancelSchema)) return;

    const ackmsg: AckMessage = buildAckMsg(
        data,
        await nextSequence(data.run_id),
        true,
        await currentWorkflowState(data.session_id),
        false,
    )
    socket.emit(Acks.COMMAND_ACCEPTED, ackmsg)

    const reses: ServiceResult[] = await runCancelService(data)

    for (let res of reses)
        socket.emit(res.event, res.data);
}
