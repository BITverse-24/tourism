import { createPlanSnapshotMessage, createPlanningStatusMessage, createProfileSnapshotMessage } from "../factory/Event";
import { addDiscoveryQuestion, appendProfileSnapshot, getSessionProfile, setWorkflowState } from "../models/data";
import { generateUUID } from "../modules/util";
import { ProfileConfirmMessage, ProfileRequestChangesMessage } from "../structures/CommandMessage";
import { DiscoveryAnsSelectionModes, DiscoveryFreeTextModes, Errors, Events, MessageKinds, PlanningPhases, PlanningStatus, PlanSnapshotStates, ProfileSnapshotStates, WorkflowStates } from "../structures/enums";
import { PlanSnapshotMessage, ProfileSnapshotMessage } from "../structures/EventMessage";
import { ServiceResult } from "../structures/types";
import { newDiscoveryQuestionService } from "./DiscoveryServices";
import { nextSequence } from "./StateServices";
import { CandidateDesignInput, CandidateDesignOptions, CandidateDesignResult, processCandidateDesign, RunBudget } from "../../../ai/candidate-design";
import { TravelerProfile } from "../structures/TravelerProfile";
import { AppConfig, loadConfig } from "../app/config";
import { createCandidateDesignOptions, createCandidateDesignTools, createNarrativeOptions } from "../factory/AgentConfig";
import { getCity, searchCities } from "../agent_tools/CityKnowledgebaseTools";
import { getAttractionsByIds, queryAttractions } from "../agent_tools/AttractionKnowledgebaseTools";
import { askUserDecisionTool } from "../agent_tools/CandidateDecision";
import { NarrativeInput, NarrativeOptions, NarrativeResult, processNarrative } from "../../../ai/narrative";
import { logger, serializeError } from "../modules/logger";

export async function profileConfirmService(
        emit: (res: ServiceResult) => void,
        data: ProfileConfirmMessage,
): Promise<ServiceResult[]> {
        const res: ServiceResult[] = []

        logger.debug('started profile.confirm service', { data: data })

        // mark the confirmed profile — always a new revision (never reuse ready revision)
        const profile: TravelerProfile = await getSessionProfile(data.session_id);
        const snapshot = await appendProfileSnapshot(
                data.session_id,
                ProfileSnapshotStates.CONFIRMED,
                profile,
                WorkflowStates.PLANNING,
        )
        const revision = snapshot.revision

        // send confirmed profile snapshot
        const profSnapMsg: ProfileSnapshotMessage = createProfileSnapshotMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(data.run_id),
                payload: snapshot
        })
    logger.debug('sending profile.snapshot with the confirmed profile snapshot', {data: profSnapMsg})
    emit({ event: Events.PROFILE_SNAPSHOT, data: profSnapMsg })

    // set workflow to planning and emit event to notify frontend
    setWorkflowState(data.session_id, WorkflowStates.PLANNING)
    
    // Emit workflow state change event for frontend routing
    const workflowStateMsg = {
        message_id: `msg_${generateUUID()}`,
        session_id: data.session_id,
        run_id: data.run_id,
        command_id: data.command_id,
        occurred_at: new Date().toISOString(),
        sequence: await nextSequence(data.run_id),
        kind: 'event',
        type: Events.WORKFLOW_STATE,
        payload: {
            workflow_state: WorkflowStates.PLANNING
        }
    }
    logger.debug('sending workflow.state event', { data: workflowStateMsg })
    emit({ event: Events.WORKFLOW_STATE, data: workflowStateMsg })

    // Emit initial planning.status immediately so Consultation opens even with no lifecycle events
    const SIMPLE_MESSAGE = "Agent is optimising routes and selecting places — this takes a moment."
    try {
        const initialPlanningStatus = createPlanningStatusMessage({
            message_id: `msg_${generateUUID()}`,
            session_id: data.session_id,
            run_id: data.run_id,
            command_id: data.command_id,
            occurred_at: new Date().toISOString(),
            sequence: await nextSequence(data.run_id),
            payload: {
                phase: PlanningPhases.DESTINATION_DESIGN,
                status: PlanningStatus.RUNNING,
                message: SIMPLE_MESSAGE,
                progress: 10,
            }
        })
        logger.debug('sending initial planning.status', { data: initialPlanningStatus })
        emit({ event: Events.PLANNING_STATUS, data: initialPlanningStatus })
    } catch (e) {
        logger.warn('failed to send initial planning.status', serializeError(e))
    }

    // Heartbeat every 3s — keeps Consultation orb alive well before its graceful timeout.
    // Progress 10->25->40->60 then stays at 60 with same message; frontend treats any planning.status as liveness.
    let lastProgress = 10
    const heartbeatSteps = [25, 40, 60]
    let heartbeatIdx = 0
    let heartbeat: ReturnType<typeof setInterval> | null = null
    const startHeartbeat = () => {
        if (heartbeat) clearInterval(heartbeat)
        heartbeat = setInterval(async () => {
            try {
                // advance monotonically through 25->40->60, never regress; after 60 keep emitting 60
                const next = heartbeatSteps[heartbeatIdx]
                if (next !== undefined && next > lastProgress) {
                    lastProgress = next
                    if (heartbeatIdx < heartbeatSteps.length - 1) heartbeatIdx++
                }
                const hbMsg = createPlanningStatusMessage({
                    message_id: `msg_${generateUUID()}`,
                    session_id: data.session_id,
                    run_id: data.run_id,
                    command_id: data.command_id,
                    occurred_at: new Date().toISOString(),
                    sequence: await nextSequence(data.run_id),
                    payload: {
                        phase: PlanningPhases.DESTINATION_DESIGN,
                        status: PlanningStatus.RUNNING,
                        message: SIMPLE_MESSAGE,
                        progress: lastProgress,
                    }
                })
                // heartbeat is liveness only — intentionally not logged at debug to avoid flooding tool-call and decision logs
                emit({ event: Events.PLANNING_STATUS, data: hbMsg })
            } catch (e) {
                logger.warn('failed to send planning.status heartbeat', serializeError(e))
            }
        }, 3000)
    }
    startHeartbeat()

    // Simplified onProgress: emit generic planning.status, no phaseMessageMap complexity
    const emitPlanningPhase = async (phase: string, status: string, progress: number, _message: string) => {
        try {
            // Map any phase to one of the two generic phases frontend understands without strict mapping
            const genericPhase = phase === PlanningPhases.COST ? PlanningPhases.COST : PlanningPhases.DESTINATION_DESIGN
            const safeProgress = typeof progress === 'number' ? progress : lastProgress
            if (safeProgress <= lastProgress) return
            lastProgress = safeProgress
            // Keep heartbeat in sync so it never regresses
            // advance heartbeatIdx to match lastProgress
            for (let i = heartbeatSteps.length - 1; i >= 0; i--) {
                if (lastProgress >= heartbeatSteps[i]) { heartbeatIdx = Math.min(i + 1, heartbeatSteps.length - 1); break }
            }
            const psMsg = createPlanningStatusMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(data.run_id),
                payload: {
                    phase: genericPhase,
                    status: status as PlanningStatus,
                    message: SIMPLE_MESSAGE,
                    progress: safeProgress,
                }
            })
            logger.debug('sending planning.status progress', { data: psMsg })
            emit({ event: Events.PLANNING_STATUS, data: psMsg })
        } catch (e) {
            logger.warn('failed to send planning.status progress', serializeError(e))
        }
    }

    // start planning with error handling so Consultation never silently times out
    try {
        // agent 2 service
        const conf: AppConfig = loadConfig(process.env)
        // Long processes: 0 means disabled (no run timeout). Pass 0 through validation; AI layer treats 0 as infinite.
        const effectiveTimeoutMs = conf.agent_timeout_ms > 0 ? conf.agent_timeout_ms : 0
        const runBudget: RunBudget = {
            max_candidates: conf.agent_2_max_candidates,
            max_tool_calls: conf.agent_2_max_tool_calls,
            max_rows_per_tool_call: conf.agent_2_max_rows_per_tool_call,
            timeout_ms: effectiveTimeoutMs,
        }
        const candidateDesignInput: CandidateDesignInput = {
            profile: profile,
            run_budget: runBudget,
            session_id: data.session_id,
            profile_revision: revision,
        }

        // capture snapshot revision for decision requests (closure ensures correct profile_revision)
        const wrappedAskUserDecision: typeof askUserDecisionTool = async (req) => {
            const patched = { ...req, profile_revision: req.profile_revision ?? revision }
            return askUserDecisionTool(patched as any)
        }

        const candidateDesignOpt: CandidateDesignOptions = createCandidateDesignOptions({
            tools: createCandidateDesignTools({
                searchCities: searchCities,
                getCity: getCity,
                queryAttractions: queryAttractions,
                getAttractionsByIds: getAttractionsByIds
            }),
            api_key: conf.agent_api_key,
            model: conf.agent_model,
            reasoning_effort: conf.agent_reasoning_effort,
            api_url: conf.agent_api_url,
            timeout_ms: effectiveTimeoutMs,
            askUserDecision: wrappedAskUserDecision,
            onProgress: async (payload) => {
                // delegated to emitPlanningPhase; wrap in try/catch already handled inside
                await emitPlanningPhase(payload.phase, payload.status, payload.progress, payload.message)
            },
        })
        logger.debug('calling agent 2 for candidate bundle', {input: candidateDesignInput})
        const candidateDesignRes: CandidateDesignResult = await processCandidateDesign(
            candidateDesignInput,
            candidateDesignOpt
        )
        logger.debug('recieved candidate result from agent 2', {res: candidateDesignRes})

        // Keep same simple heartbeat through narrative — no phase-specific lifecycle

        // agent 3 service
        const narrativeInput: NarrativeInput = {
            profile: profile,
            profile_revision: revision,
            candidate: candidateDesignRes.candidates[0],
            dataset_revisions: candidateDesignRes.dataset_revisions ?? { city: "local", attraction: "local" },
        }
        const narrativeOpt: NarrativeOptions = createNarrativeOptions({
            api_key: conf.agent_api_key,
            model: conf.agent_model,
            timeout_ms: effectiveTimeoutMs,
        })
        logger.debug('calling agent 3 for final trip plan', {input: narrativeInput})
        const narrativeRes: NarrativeResult = await processNarrative(
            narrativeInput,
            narrativeOpt
        )
        logger.debug('recieved final trip plan from agent 3', {res: narrativeRes})

        if (heartbeat) { clearInterval(heartbeat); heartbeat = null }

        // plan snapshot message
        const planSnapMsg: PlanSnapshotMessage = createPlanSnapshotMessage({
            message_id: `msg_${generateUUID()}`,
            session_id: data.session_id,
            run_id: data.run_id,
            command_id: data.command_id,
            occurred_at: new Date().toISOString(),
            sequence: await nextSequence(data.run_id),
            payload: {
                revision: 1,
                state: PlanSnapshotStates.FINAL,
                plan: narrativeRes.plan
            }
        })
        logger.debug('sending plan snapshot of the final trup plan', {data: planSnapMsg})
        emit({ event: Events.PLAN_SNAPSHOT, data: planSnapMsg })

        try {
            const completedStatus = createPlanningStatusMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(data.run_id),
                payload: {
                    phase: PlanningPhases.DESTINATION_DESIGN,
                    status: PlanningStatus.COMPLETED,
                    message: "Planning completed.",
                    progress: 100,
                }
            })
            emit({ event: Events.PLANNING_STATUS, data: completedStatus })
        } catch (e) {
            logger.warn('failed to send completed planning.status', serializeError(e))
        }

        logger.debug('completed profile.confirm service', {data: data})
    } catch (error) {
        if (heartbeat) { clearInterval(heartbeat); heartbeat = null }
        logger.error('profile.confirm planning failed', serializeError(error))
        const errMessage = error instanceof Error ? error.message : String(error)
        try {
            const failedStatus = createPlanningStatusMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(data.run_id),
                payload: {
                    phase: PlanningPhases.DESTINATION_DESIGN,
                    status: PlanningStatus.FAILED,
                    message: errMessage.slice(0, 500),
                    progress: 0,
                }
            })
            logger.debug('sending planning.status failed', { data: failedStatus })
            emit({ event: Events.PLANNING_STATUS, data: failedStatus })
        } catch (e) {
            logger.warn('failed to send failed planning.status', serializeError(e))
        }
        try {
            const errorEvent = {
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(data.run_id),
                kind: MessageKinds.ERROR,
                type: Errors.ERROR,
                code: 'planning_failed',
                message: errMessage.slice(0, 1000),
                retryable: true,
            }
            logger.debug('sending error event for planning failure', { data: errorEvent })
            emit({ event: Errors.ERROR, data: errorEvent as unknown as Record<string, unknown> })
        } catch (e) {
            logger.warn('failed to send error event', serializeError(e))
        }
    }
    return res
}

export async function profileRequestChangesService(
    emit: (res: ServiceResult) => void,
    data: ProfileRequestChangesMessage,
): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []
    logger.debug('started profile.request_changes service', {data: data})

    await setWorkflowState(data.session_id, WorkflowStates.DISCOVERY)
    // give agent to ask questions for the requested change topics ?????
    const question =
        {
            question_id: `req-change_${data.command_id}`,
            prompt: 'Are you okay with this profile',  /////////// ToDO
            selection_mode: DiscoveryAnsSelectionModes.SINGLE,
            required: true,
            options: [],
            free_text_mode: DiscoveryFreeTextModes.REQUIRED,
            free_text_placeholder: null,
        };

    await addDiscoveryQuestion(data.run_id, question)
    await newDiscoveryQuestionService(
        emit,
        data.session_id,
        data.run_id,
        data.command_id,
        await getSessionProfile(data.session_id),
        {
            question_id: `req-change_${data.command_id}`,
            question: question,
            selected_option_ids: [],
            free_text: data.payload.free_text,
        },
    )

    logger.debug('completed profile.request_changes service', {data: data})
    return res
}
