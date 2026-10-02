import { createPlanSnapshotMessage, createPlanningStatusMessage, createProfileSnapshotMessage, createWorkflowStateMessage } from "../factory/Event";
import { addDiscoveryQuestion, appendProfileSnapshot, getDiscoveryEpoch, getDiscoveryQuestionCount, getDiscoveryQuestionPrompts, getSessionCheckpoint, getSessionProfile, setSessionProfile, setTripPlan, setWorkflowState } from "../models/data";
import { setActiveChangeRequest } from "../models/data";
import { generateUUID } from "../modules/util";
import { ProfileConfirmMessage, ProfileRequestChangesMessage } from "../structures/CommandMessage";
import { DiscoveryAnsSelectionModes, DiscoveryFreeTextModes, Errors, Events, MessageKinds, PlanningPhases, PlanningStatus, PlanSnapshotStates, ProfileSnapshotStates, WorkflowStates } from "../structures/enums";
import { PlanSnapshotMessage, ProfileSnapshotMessage } from "../structures/EventMessage";
import { ServiceResult } from "../structures/types";
import { createFallbackDiscoveryQuestion, loadDiscoveryOptions } from "./DiscoveryServices";
import { nextSequence } from "./StateServices";
import { processDiscovery } from "../../../ai/discovery";
import { createDiscoveryQuestionMessage } from "../factory/Event";
import { TravelerProfile } from "../structures/TravelerProfile";
import { AppConfig, loadConfig } from "../app/config";
import { createCandidateDesignOptions, createCandidateDesignTools, createNarrativeOptions } from "../factory/AgentConfig";
import { getCity, searchCities } from "../agent_tools/CityKnowledgebaseTools";
import { getAttractionsByIds, queryAttractions } from "../agent_tools/AttractionKnowledgebaseTools";
import { askUserDecisionTool } from "../agent_tools/CandidateDecision";
import { CandidateDesignInput, CandidateDesignOptions, CandidateDesignResult, processCandidateDesign, RunBudget } from "../../../ai/candidate-design";
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
            api_url: conf.agent_api_url,
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

    // Validate/normalize topics: trim, filter empty, deduplicate preserve order.
    const rawTopics: unknown[] = Array.isArray((data.payload as any).topics) ? (data.payload as any).topics : []
    const topics: string[] = []
    const seenTopics = new Set<string>()
    for (const t of rawTopics) {
        if (typeof t !== 'string') continue
        const trimmed = t.trim()
        if (!trimmed) continue
        if (!seenTopics.has(trimmed)) {
            seenTopics.add(trimmed)
            topics.push(trimmed)
        }
    }
    const rawFree = typeof (data.payload as any).free_text === 'string' ? (data.payload as any).free_text.trim() : ''
    const free_text: string | null = rawFree.length > 0 ? rawFree : null

    const profile = await getSessionProfile(data.session_id)
    const checkpoint = await getSessionCheckpoint(data.session_id)
    const source_profile_revision = (() => {
        const snaps = (checkpoint as any)?.profile_snapshots as Array<{ revision: number }> | undefined
        if (!snaps || snaps.length === 0) return 0
        return snaps.reduce((max: number, s: { revision: number }) => (s.revision > max ? s.revision : max), 0)
    })()

    const epochAtStart = getDiscoveryEpoch(data.session_id)

    // Immediately before LLM: emit workflow.state discovery and draft snapshot N+1
    await setWorkflowState(data.session_id, WorkflowStates.DISCOVERY)

    try {
        const wfMsg = createWorkflowStateMessage({
            message_id: `msg_${generateUUID()}`,
            session_id: data.session_id,
            run_id: data.run_id,
            command_id: data.command_id,
            occurred_at: new Date().toISOString(),
            sequence: await nextSequence(data.run_id),
            payload: { workflow_state: WorkflowStates.DISCOVERY },
        })
        logger.debug('sending workflow.state discovery', { data: wfMsg })
        emit({ event: Events.WORKFLOW_STATE, data: wfMsg as unknown as Record<string, unknown> })
    } catch (e) {
        logger.warn('failed to send workflow.state for request_changes', serializeError(e))
    }

    try {
        const draftSnapshot = await appendProfileSnapshot(
            data.session_id,
            ProfileSnapshotStates.DRAFT,
            profile,
            WorkflowStates.DISCOVERY,
        )
        const draftMsg: ProfileSnapshotMessage = createProfileSnapshotMessage({
            message_id: `msg_${generateUUID()}`,
            session_id: data.session_id,
            run_id: data.run_id,
            command_id: data.command_id,
            occurred_at: new Date().toISOString(),
            sequence: await nextSequence(data.run_id),
            payload: draftSnapshot,
        })
        logger.debug('sending profile.snapshot draft demote', { data: draftMsg, revision: draftSnapshot.revision })
        emit({ event: Events.PROFILE_SNAPSHOT, data: draftMsg as unknown as Record<string, unknown> })
    } catch (e) {
        logger.warn('failed to send draft snapshot for request_changes', serializeError(e))
    }

    // Persist change-request context
    try {
        // guard if function not yet exists (data.ts)
        const fn = (await import("../models/data")).setActiveChangeRequest as unknown as ((s: string, ctx: any) => void) | undefined
        if (typeof setActiveChangeRequest === 'function') {
            setActiveChangeRequest(data.session_id, {
                topics,
                free_text,
                source_profile_revision,
                opened_at_command_id: data.command_id,
                questions_in_phase: 0,
            })
        } else if (typeof fn === 'function') {
            fn(data.session_id, {
                topics,
                free_text,
                source_profile_revision,
                opened_at_command_id: data.command_id,
                questions_in_phase: 0,
            })
        }
    } catch (e) {
        logger.warn('failed to persist change-request context', serializeError(e))
    }

    // LLM part wrapped in try/catch
    try {
        const discoveryInput: any = {
            profile,
            answer: null,
            change_request: {
                topics,
                free_text,
                source_profile_revision,
                questions_in_phase: 0,
            },
            questions_asked_count: getDiscoveryQuestionCount(data.run_id),
            prior_questions: getDiscoveryQuestionPrompts(data.run_id),
        }

        let opt: any
        try {
            opt = loadDiscoveryOptions()
        } catch (e) {
            // fallback replicate if import fails
            const { loadConfig } = await import("../app/config")
            const conf: any = loadConfig(process.env)
            const effective = conf.agent_timeout_ms > 0 ? conf.agent_timeout_ms : 0
            opt = {
                api_key: conf.agent_api_key,
                model: conf.agent_model,
                api_url: conf.agent_api_url,
                timeout_ms: effective,
            }
        }

        logger.debug('calling agent 1 for targeted discovery', { input: discoveryInput })
        const discoveryRes: any = await processDiscovery(discoveryInput as any, opt)
        logger.debug('received discovery result for request_changes', { res: discoveryRes })

        if (getDiscoveryEpoch(data.session_id) !== epochAtStart) {
            logger.warn('dropping stale discovery result for request_changes (epoch advanced)', {
                session_id: data.session_id,
                epochAtStart,
                currentEpoch: getDiscoveryEpoch(data.session_id),
            })
            return res
        }

        await setSessionProfile(data.session_id, discoveryRes.profile)

        // Coercion: if finished===true on opening turn (questions_in_phase===0), do NOT emit profile.ready, instead emit fallback question
        const isOpeningTurn = true // questions_in_phase === 0
        if (discoveryRes.finished === true && isOpeningTurn) {
            logger.warn('change_request_ignored_immediate_finish', {
                session_id: data.session_id,
                topics,
                finished: discoveryRes.finished,
            })
            const fallback = createFallbackDiscoveryQuestion(topics, free_text, data.command_id)
            const snapshot = await appendProfileSnapshot(
                data.session_id,
                ProfileSnapshotStates.DRAFT,
                discoveryRes.profile,
                undefined,
            )
            const profSnapMsg: ProfileSnapshotMessage = createProfileSnapshotMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(data.run_id),
                payload: snapshot,
            })
            logger.debug('sending profile.snapshot draft after coerced finish', { data: profSnapMsg, revision: snapshot.revision })
            emit({ event: Events.PROFILE_SNAPSHOT, data: profSnapMsg as unknown as Record<string, unknown> })

            await addDiscoveryQuestion(data.run_id, fallback)
            try {
                const { incrementChangeRequestQuestions } = await import("../models/data")
                if (typeof incrementChangeRequestQuestions === 'function') incrementChangeRequestQuestions(data.session_id)
            } catch {}
            const qMsg = createDiscoveryQuestionMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(data.run_id),
                payload: fallback,
            })
            logger.debug('sending fallback discovery.question for coerced finish', { data: qMsg })
            emit({ event: Events.DISCOVERY_QUESTION, data: qMsg as unknown as Record<string, unknown> })
            logger.debug('completed profile.request_changes service (coerced)', {data: data})
            return res
        }

        // Normal handling: reuse snapshot + question / ready logic but for opening turn coerce already handled
        if (discoveryRes.finished) {
            const snapshot = await appendProfileSnapshot(
                data.session_id,
                ProfileSnapshotStates.READY,
                discoveryRes.profile,
                WorkflowStates.PROFILE_REVIEW,
            )
            const profSnapMsg: ProfileSnapshotMessage = createProfileSnapshotMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(data.run_id),
                payload: snapshot,
            })
            logger.debug('sending profile.snapshot ready for request_changes finish', { data: profSnapMsg, revision: snapshot.revision })
            emit({ event: Events.PROFILE_SNAPSHOT, data: profSnapMsg as unknown as Record<string, unknown> })

            await setWorkflowState(data.session_id, WorkflowStates.PROFILE_REVIEW)
            const { createProfileReadyMessage } = await import("../factory/Event")
            const profReadyMsg = createProfileReadyMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(data.run_id),
                payload: {
                    profile_revision: snapshot.revision,
                    blocking_unknowns: [],
                },
            })
            logger.debug('sending profile.ready for request_changes', { data: profReadyMsg })
            emit({ event: Events.PROFILE_READY, data: profReadyMsg as unknown as Record<string, unknown> })

            try {
                const wf2 = createWorkflowStateMessage({
                    message_id: `msg_${generateUUID()}`,
                    session_id: data.session_id,
                    run_id: data.run_id,
                    command_id: data.command_id,
                    occurred_at: new Date().toISOString(),
                    sequence: await nextSequence(data.run_id),
                    payload: { workflow_state: WorkflowStates.PROFILE_REVIEW },
                })
                emit({ event: Events.WORKFLOW_STATE, data: wf2 as unknown as Record<string, unknown> })
            } catch {}
        } else if (discoveryRes.next_question) {
            const snapshot = await appendProfileSnapshot(
                data.session_id,
                ProfileSnapshotStates.DRAFT,
                discoveryRes.profile,
                undefined,
            )
            const profSnapMsg: ProfileSnapshotMessage = createProfileSnapshotMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(data.run_id),
                payload: snapshot,
            })
            logger.debug('sending profile.snapshot draft after targeted discovery', { data: profSnapMsg, revision: snapshot.revision })
            emit({ event: Events.PROFILE_SNAPSHOT, data: profSnapMsg as unknown as Record<string, unknown> })

            await addDiscoveryQuestion(data.run_id, discoveryRes.next_question)
            try {
                const { incrementChangeRequestQuestions } = await import("../models/data")
                if (typeof incrementChangeRequestQuestions === 'function') incrementChangeRequestQuestions(data.session_id)
            } catch {}
            const qMsg = createDiscoveryQuestionMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(data.run_id),
                payload: discoveryRes.next_question,
            })
            logger.debug('sending discovery.question for request_changes', { data: qMsg })
            emit({ event: Events.DISCOVERY_QUESTION, data: qMsg as unknown as Record<string, unknown> })
        } else {
            // finished false but no next_question -> fallback
            logger.warn('discovery returned finished false with no next_question, using fallback', { discoveryRes })
            const snapshot = await appendProfileSnapshot(
                data.session_id,
                ProfileSnapshotStates.DRAFT,
                discoveryRes.profile,
                undefined,
            )
            const profSnapMsg: ProfileSnapshotMessage = createProfileSnapshotMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(data.run_id),
                payload: snapshot,
            })
            emit({ event: Events.PROFILE_SNAPSHOT, data: profSnapMsg as unknown as Record<string, unknown> })
            const fallback = createFallbackDiscoveryQuestion(topics, free_text, data.command_id)
            await addDiscoveryQuestion(data.run_id, fallback)
            try {
                const { incrementChangeRequestQuestions } = await import("../models/data")
                if (typeof incrementChangeRequestQuestions === 'function') incrementChangeRequestQuestions(data.session_id)
            } catch {}
            const qMsg = createDiscoveryQuestionMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(data.run_id),
                payload: fallback,
            })
            emit({ event: Events.DISCOVERY_QUESTION, data: qMsg as unknown as Record<string, unknown> })
        }
    } catch (error) {
        logger.error('profile.request_changes discovery failed', serializeError(error))
        const errMessage = error instanceof Error ? error.message : String(error)
        // emit fallback question + error event (code discovery_failed)
        try {
            const fallback = createFallbackDiscoveryQuestion(topics, free_text, data.command_id)
            // ensure only real question is stored; do not add dummy
            try {
                await addDiscoveryQuestion(data.run_id, fallback)
                try {
                    const { incrementChangeRequestQuestions } = await import("../models/data")
                    if (typeof incrementChangeRequestQuestions === 'function') incrementChangeRequestQuestions(data.session_id)
                } catch {}
            } catch {}
            const qMsg = createDiscoveryQuestionMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(data.run_id),
                payload: fallback,
            })
            logger.debug('sending fallback discovery.question after error', { data: qMsg })
            emit({ event: Events.DISCOVERY_QUESTION, data: qMsg as unknown as Record<string, unknown> })
        } catch (e) {
            logger.warn('failed to send fallback discovery.question', serializeError(e))
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
                code: 'discovery_failed',
                message: errMessage.slice(0, 1000),
                retryable: true,
            }
            logger.debug('sending error event for request_changes failure', { data: errorEvent })
            emit({ event: Errors.ERROR, data: errorEvent as unknown as Record<string, unknown> })
        } catch (e) {
            logger.warn('failed to send error event for request_changes', serializeError(e))
        }
    }

    logger.debug('completed profile.request_changes service', {data: data})
    return res
}
