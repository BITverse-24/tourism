import { Socket } from 'socket.io';
import { logger } from '../modules/logger';
import { RunCancelMessage, RunCancelSchema } from '../structures/CommandMessage';
import { Acks } from '../structures/enums';
import { runCancelService } from '../services/RunServices';
import { checkBaseCommandRejections } from './BaseValidation';
import { AckMessage } from '../structures/AckMessage';
import { createCommandAcceptedMessage } from '../factory/Ack';
import { currentWorkflowState, nextSequence } from '../services/StateServices';
import { ServiceResult } from '../structures/types';
import { generateUUID } from '../modules/util';

export async function runCancelHandler(socket: Socket, data: RunCancelMessage) {
    logger.debug('socket sent run.cancel', { socketid: socket.id, data: data });

    const baseValid = await checkBaseCommandRejections(socket, data, RunCancelSchema)
    if (!baseValid) return;

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

    const reses: ServiceResult[] = await runCancelService(
        data,
        (res: ServiceResult) => socket.emit(res.event, res.data)
    )

    // for (let res of reses)
    //     socket.emit(res.event, res.data);
}
