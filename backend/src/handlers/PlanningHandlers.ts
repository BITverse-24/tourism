
import { Socket } from 'socket.io';
import { logger } from '../modules/logger';
import { Acks } from '../structures/enums';
import { PlanningStatusMessage, PlanningStatusSchema } from '../structures/EventMessage';
import { planningStatusService } from '../services/PlanningServices';
import { checkBaseCommandRejections } from './BaseValidation';
import { AckMessage } from '../structures/AckMessage';
import { buildAckMsg } from '../factory/Ack';
import { currentWorkflowState, getNextSequence } from '../services/StateServices';
import { ServiceResult } from '../structures/types';

export async function planningStatusHandler(socket: Socket, data: PlanningStatusMessage) {
    logger.debug('socket sent discovery.answer', { socketid: socket.id, data: data });

    if (!checkBaseCommandRejections(socket, data, PlanningStatusSchema)) return;

    const ackmsg: AckMessage = buildAckMsg(
        data,
        await getNextSequence(data.run_id),
        true,
        await currentWorkflowState(),
        false,
    )
    socket.emit(Acks.COMMAND_ACCEPTED, ackmsg)

    const reses: ServiceResult[] = await planningStatusService(data)

    for (let res of reses)
        socket.emit(res.event, res.data);
}
