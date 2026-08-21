import { AskUserDecisionRequest } from "../../../ai/candidate-design";
import { logger } from "../modules/logger";

export async function askUserDecisionTool(
        request: AskUserDecisionRequest
): Promise<string> {
    logger.debug('agent 2 is requesting user decision', {req: request})
    const data = request.options[0].option_id 
    logger.debug('sending agent 2 the requested data response', {res: data})
    return data
}
