import { AskUserDecisionRequest } from "../../../ai/candidate-design";
import { clearDecisionPending, getCurrentRunIdForSession, getDecisionPending, getSocketById, getSocketIdForSession, setDecisionPending, setWorkflowState } from "../models/data";
import { Events, PlanningPhases, PlanningStatus, WorkflowStates } from "../structures/enums";
import { DecisionRequestMessage } from "../structures/EventMessage";
import { createDecisionRequestMessage, createPlanningStatusMessage } from "../factory/Event";
import { generateUUID } from "../modules/util";
import { nextSequence } from "../services/StateServices";
import { logger } from "../modules/logger";

async function emitToSession(session_id: string, run_id: string, event: string, data: unknown): Promise<void> {
    try {
        const sid = await getSocketIdForSession(session_id)
        const sock = sid ? await getSocketById(sid) : null
        if (sock) {
            // @ts-ignore
            sock.emit(event, data)
            return
        }
    } catch {}
    // fallback: try any socket for session (already covered) — no-op if none
}

export async function askUserDecisionTool(
        request: AskUserDecisionRequest
): Promise<string> {
    logger.debug('agent 2 is requesting user decision', {req: request})
    const session_id = request.session_id!
    const run_id = await getCurrentRunIdForSession(session_id);
    await setWorkflowState(session_id, WorkflowStates.DECISION_REQUIRED)

    const profileRev = request.profile_revision !== undefined && Number.isInteger(request.profile_revision) && request.profile_revision > 0 ? request.profile_revision : 1
    const decision_id = `dec_${generateUUID()}`
    // Allocate sequences in emit order so seq ordering matches wire order.
    // planning.status (rail) must have lower seq than decision.request (blocking).
    const psSeq = await nextSequence(run_id);
    const reqSeq = await nextSequence(run_id);
    const req: DecisionRequestMessage = createDecisionRequestMessage({
        message_id: `msg_${generateUUID()}`,
        session_id,
        run_id,
        command_id: '',
        occurred_at: new Date().toISOString(),
        sequence: reqSeq,
        payload: {
            decision_id,
            profile_revision: profileRev,
            reason: request.reason,
            prompt: request.prompt,
            options: request.options
        }
    })
    // planning.status decision_required — drives Consultation rail while paused
    try {
        const ps = createPlanningStatusMessage({
            message_id: `msg_${generateUUID()}`,
            session_id,
            run_id,
            command_id: '',
            occurred_at: new Date().toISOString(),
            sequence: psSeq,
            payload: {
                phase: PlanningPhases.DECISION_REQUIRED,
                status: PlanningStatus.RUNNING,
                message: request.prompt.slice(0, 200),
                progress: 60,
            }
        })
        await emitToSession(session_id, run_id, Events.PLANNING_STATUS, ps)
    } catch {}

    await emitToSession(session_id, run_id, Events.DECISION_REQUEST, req)

    return new Promise<string>((resolve, reject) => {
        // store pending resolver — survives reconnects, resolved by decision.respond handler
        // No timeout: long processes may wait indefinitely for user decision. Forever-hang is handled by run.cancel / session expiry.
        const existing = getDecisionPending(session_id)
        if (existing) {
            // reject stale pending
            try { existing.reject(new Error('superseded by new decision')) } catch {}
        }
        setDecisionPending(session_id, { resolve: (choice: string) => { clearDecisionPending(session_id); resolve(choice) }, reject: (err: Error) => { clearDecisionPending(session_id); reject(err) }, decision_id, run_id })
    });
}

export function resolvePendingDecision(session_id: string, decision_id: string, option_id: string): boolean {
    const pending = getDecisionPending(session_id)
    if (!pending) return false
    if (pending.decision_id !== decision_id) return false
    pending.resolve(option_id)
    return true
}
