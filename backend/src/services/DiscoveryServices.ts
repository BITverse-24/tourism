import { DiscoveryAnswerMessage } from "../structures/CommandMessage";
import { ProfileSnapshot, ServiceResult } from "../structures/types";
import { DiscoveryInput, DiscoveryQuestion, DiscoveryResult, processDiscovery, ProcessDiscoveryOptions, TravelerProfile, UserAnswer } from "../../../ai/discovery";
import {
    addDiscoveryQuestion,
    appendProfileSnapshot,
    bumpDiscoveryEpoch,
    getDiscoveryEpoch,
    getDiscoveryQuestionById,
    getDiscoveryQuestionCount,
    getDiscoveryQuestionPrompts,
    getSessionProfile,
    setSessionProfile,
    setWorkflowState,
} from "../models/data";
import { DiscoveryAnsSelectionModes, DiscoveryFreeTextModes, Events, ProfileSnapshotStates, WorkflowStates } from "../structures/enums";
import { DiscoveryQuestionMessage, ProfileReadyMessage, ProfileSnapshotMessage } from "../structures/EventMessage";
import { generateUUID } from "../modules/util";
import { createDiscoveryQuestionMessage, createProfileReadyMessage, createProfileSnapshotMessage, createWorkflowStateMessage } from "../factory/Event";
import { nextSequence } from "./StateServices";
import { AppConfig, loadConfig } from "../app/config";
import { logger } from "../modules/logger";

declare const require: any;

export function loadDiscoveryOptions(): ProcessDiscoveryOptions {
    const config: AppConfig = loadConfig(process.env)
    const effective = config.agent_timeout_ms > 0 ? config.agent_timeout_ms : 0
    return {
        api_key: config.agent_api_key,
        model: config.agent_model,
        // Agent 1 (discovery) always disables reasoning — thinkingBudget: 0.
        // Do not pass reasoning_effort here; AGENT_REASONING_EFFORT is for Agent 2 (candidate-design) only.
        api_url: config.agent_api_url,
        timeout_ms: effective,
    }
}

// ---------------------------------------------------------------------------
// Change-request helpers (guarded for compat when data.ts not yet updated)
// ---------------------------------------------------------------------------
function getActiveChangeRequestSafe(session_id: string): any | null {
    try {
        const mod: any = typeof require !== "undefined" ? require("../models/data") : null;
        if (mod && typeof mod.getActiveChangeRequest === "function") {
            return mod.getActiveChangeRequest(session_id);
        }
    } catch {}
    return null;
}
function clearActiveChangeRequestSafe(session_id: string): void {
    try {
        const mod: any = typeof require !== "undefined" ? require("../models/data") : null;
        if (mod && typeof mod.clearActiveChangeRequest === "function") {
            mod.clearActiveChangeRequest(session_id);
        }
    } catch {}
}
function incrementChangeRequestQuestionsSafe(session_id: string): void {
    try {
        const mod: any = typeof require !== "undefined" ? require("../models/data") : null;
        if (mod && typeof mod.incrementChangeRequestQuestions === "function") {
            mod.incrementChangeRequestQuestions(session_id);
        }
    } catch {}
}

// ---------------------------------------------------------------------------
// Fallback question (§F)
// ---------------------------------------------------------------------------
function formatTopicsForPrompt(topics: string[]): string {
    const t = topics.map((s) => s.trim()).filter(Boolean);
    if (t.length === 0) return "";
    if (t.length === 1) return t[0];
    if (t.length === 2) return `${t[0]} and ${t[1]}`;
    const last = t[t.length - 1];
    const rest = t.slice(0, -1).join(", ");
    return `${rest}, and ${last}`;
}

export function buildFallbackDiscoveryQuestion(
    topics: string[],
    free_text: string | null | undefined,
    command_id: string
): DiscoveryQuestion {
    // Try external factory first (Subagent 2)
    try {
        const mod: any = typeof require !== "undefined" ? require("../factory/DiscoveryFallback") : null;
        if (mod && typeof mod.createFallbackDiscoveryQuestion === "function") {
            // Support both signatures: (topics, free_text, command_id) and ({topics, free_text, command_id})
            let q: any = null;
            try {
                q = mod.createFallbackDiscoveryQuestion(topics, free_text, command_id);
                // If positional returned undefined but object signature expected, try object
                if (!q || !q.question_id) {
                    q = mod.createFallbackDiscoveryQuestion({ topics, free_text, command_id });
                }
            } catch {
                q = mod.createFallbackDiscoveryQuestion({ topics, free_text, command_id });
            }
            if (q && q.question_id) return q as DiscoveryQuestion;
        }
    } catch {}
    const trimmedTopics = (topics ?? []).map((s) => s.trim()).filter(Boolean);
    const note = typeof free_text === "string" ? free_text.trim() : "";
    let prompt: string;
    if (trimmedTopics.length === 0) {
        prompt = "Tell us what to change in the profile.";
    } else if (trimmedTopics.length === 1) {
        prompt = `What should we change about ${trimmedTopics[0]}?`;
    } else {
        prompt = `You asked us to revisit ${formatTopicsForPrompt(trimmedTopics)}. What should we correct?`;
    }
    // If note exists but topics empty, prompt already covers; otherwise keep topic prompt.
    // The question always requires free_text; do not invent option ids.
    return {
        question_id: `q_change_${command_id}`,
        prompt,
        selection_mode: DiscoveryAnsSelectionModes.SINGLE,
        required: true,
        options: [],
        free_text_mode: DiscoveryFreeTextModes.REQUIRED,
        free_text_placeholder: "Add the correction in your own words",
    };
}

// Keep alias for spec name
export const createFallbackDiscoveryQuestion = buildFallbackDiscoveryQuestion;

function logAgentCall(discoveryInput: DiscoveryInput, config: AppConfig): void {
    const maskedApiKey = config.agent_api_key
        ? (config.agent_api_key.length >= 4 ? `${config.agent_api_key.slice(0, 4)}****` : '****')
        : 'MISSING'
    logger.debug('calling agent 1', {
        input: discoveryInput,
        config: {
            api_key: maskedApiKey,
            model: config.agent_model,
            timeout_ms: config.agent_timeout_ms,
            api_url: config.agent_api_url || 'default',
            // Agent 1 never uses reasoning — thinkingBudget: 0 (see ai/discovery.ts).
            // AGENT_REASONING_EFFORT is for Agent 2 (candidate-design) only.
            reasoning_effort: 'none (Agent 1 thinkingBudget: 0 — AGENT_REASONING_EFFORT not applied)',
        },
    })
}

async function emitProfileSnapshotAndMaybeReady(
    emit: (res: ServiceResult) => void,
    args: {
        session_id: string
        run_id: string
        command_id: string
        discoveryRes: DiscoveryResult
    },
): Promise<ProfileSnapshot> {
    const { session_id, run_id, command_id, discoveryRes } = args
    const ctx: any = getActiveChangeRequestSafe(session_id)

    // Coerce opening-turn immediate finish to fallback (§C.4)
    let effectiveRes: DiscoveryResult = discoveryRes
    if (discoveryRes.finished && ctx && ctx.questions_in_phase === 0) {
        logger.debug('change_request_ignored_immediate_finish', {
            session_id,
            command_id,
            topics: ctx.topics,
            free_text: ctx.free_text,
        })
        const fallback = buildFallbackDiscoveryQuestion(ctx.topics ?? [], ctx.free_text ?? null, command_id)
        effectiveRes = {
            ...discoveryRes,
            finished: false,
            next_question: fallback,
        } as DiscoveryResult
    }

    // Also handle finish=false but missing next_question while change request active -> synthesize fallback
    if (!effectiveRes.finished && !effectiveRes.next_question && ctx) {
        logger.debug('synthesizing fallback for missing next_question in change_request phase', {
            session_id,
            command_id,
            topics: ctx.topics,
        })
        const fallback = buildFallbackDiscoveryQuestion(ctx.topics ?? [], ctx.free_text ?? null, command_id)
        effectiveRes = { ...effectiveRes, next_question: fallback } as DiscoveryResult
    }

    const isFinished = effectiveRes.finished
    const state = isFinished ? ProfileSnapshotStates.READY : ProfileSnapshotStates.DRAFT
    // Contract 1.0: revision is always strictly newer than any prior snapshot,
    // including draft→ready promotions (never reuse a draft revision as ready).
    const snapshot = await appendProfileSnapshot(
        session_id,
        state,
        effectiveRes.profile,
        isFinished ? WorkflowStates.PROFILE_REVIEW : undefined,
    )

    const profSnapMsg: ProfileSnapshotMessage = createProfileSnapshotMessage({
        message_id: `msg_${generateUUID()}`,
        session_id,
        run_id,
        command_id,
        occurred_at: new Date().toISOString(),
        sequence: await nextSequence(run_id),
        payload: snapshot,
    })
    logger.debug('sending profile.snapshot', {
        data: profSnapMsg,
        revision: snapshot.revision,
        state: snapshot.state,
    })
    emit({ event: Events.PROFILE_SNAPSHOT, data: profSnapMsg })

    if (isFinished) {
        logger.debug('discovery process finished', { revision: snapshot.revision })
        await setWorkflowState(session_id, WorkflowStates.PROFILE_REVIEW)
        // Clear change request context on targeted completion
        if (ctx) {
            clearActiveChangeRequestSafe(session_id)
        }
        const profReadyMsg: ProfileReadyMessage = createProfileReadyMessage({
            message_id: `msg_${generateUUID()}`,
            session_id,
            run_id,
            command_id,
            occurred_at: new Date().toISOString(),
            sequence: await nextSequence(run_id),
            payload: {
                profile_revision: snapshot.revision,
                blocking_unknowns: [],
            },
        })
        logger.debug('sending profile.ready event', { data: profReadyMsg })
        emit({ event: Events.PROFILE_READY, data: profReadyMsg })

        // Explicit workflow.state for targeted completion (§G)
        try {
            const wsMsg = createWorkflowStateMessage({
                message_id: `msg_${generateUUID()}`,
                session_id,
                run_id,
                command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(run_id),
                payload: { workflow_state: WorkflowStates.PROFILE_REVIEW },
            })
            logger.debug('sending workflow.state profile_review after finish', { data: wsMsg })
            emit({ event: Events.WORKFLOW_STATE, data: wsMsg as unknown as Record<string, unknown> })
        } catch (e) {
            logger.warn('failed to emit workflow.state after finish', { error: String(e) })
        }
    } else if (effectiveRes.next_question) {
        logger.debug('got another question to send')
        // Increment change request questions_in_phase if active
        if (ctx) {
            incrementChangeRequestQuestionsSafe(session_id)
        }
        addDiscoveryQuestion(run_id, effectiveRes.next_question)
        const discoveryQuestionMsg: DiscoveryQuestionMessage =
            createDiscoveryQuestionMessage({
                message_id: `msg_${generateUUID()}`,
                session_id,
                run_id,
                command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(run_id),
                payload: effectiveRes.next_question,
            })
        logger.debug('sending discovery.question', { data: discoveryQuestionMsg })
        emit({ event: Events.DISCOVERY_QUESTION, data: discoveryQuestionMsg })
    }

    return snapshot
}

export async function discoveryAnswerService(
    emit: (res: ServiceResult) => void,
    data: DiscoveryAnswerMessage
): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []

    // Invalidate in-flight provisional/background discovery for this session.
    bumpDiscoveryEpoch(data.session_id)

    const prof = await getSessionProfile(data.session_id);
    const discoveryQ = await getDiscoveryQuestionById(data.run_id, data.payload.question_id)
    const ctx: any = getActiveChangeRequestSafe(data.session_id)
    const prior = getDiscoveryQuestionPrompts(data.run_id)
    const discoveryInput: DiscoveryInput = {
        profile: prof,
        answer: {
            question_id: data.payload.question_id,
            question: discoveryQ,
            selected_option_ids: data.payload.selected_option_ids,
            free_text: data.payload.free_text,
        },
        questions_asked_count: getDiscoveryQuestionCount(data.run_id),
        prior_questions: prior,
    } as DiscoveryInput
    // Attach change_request when active (compat via as any if ai/discovery not yet typed)
    if (ctx) {
        ;(discoveryInput as any).change_request = {
            topics: ctx.topics ?? [],
            free_text: ctx.free_text ?? null,
            source_profile_revision: ctx.source_profile_revision ?? 0,
            questions_in_phase: ctx.questions_in_phase ?? 0,
        }
        // Compat hint for AI that doesn't yet know change_request: prepend controller note
        const t = (ctx.topics ?? []).map((s: string) => s.trim()).filter(Boolean)
        if (t.length > 0 || (ctx.free_text && String(ctx.free_text).trim().length > 0)) {
            const hint = `[Change request topics: ${t.join(", ")}${ctx.free_text ? `; note: ${String(ctx.free_text).slice(0, 500)}` : ""}]`
            ;(discoveryInput as any).prior_questions = [hint, ...(prior ?? [])]
        }
    }
    const config: AppConfig = loadConfig(process.env)
    const opt = loadDiscoveryOptions()
    logAgentCall(discoveryInput, config)
    logger.debug('current profile before agent call', {
        profile_id: prof?.profile_id,
        destination_request: prof?.trip_context?.destination_request,
        start_date: prof?.trip_context?.start_date,
        end_date: prof?.trip_context?.end_date,
        duration_days: prof?.trip_context?.duration_days,
        party_size: prof?.trip_context?.party_size,
        date_flexibility: prof?.trip_context?.date_flexibility
    })
    let discoveryRes: DiscoveryResult
    try {
        discoveryRes = await processDiscovery(
            discoveryInput,
            opt
        )
    } catch (e) {
        // On LLM error while change_request active, emit deterministic fallback instead of leaving discovery blank
        if (ctx) {
            logger.warn('discoveryAnswerService agent error, emitting fallback', { error: String(e), session_id: data.session_id })
            const fallback = buildFallbackDiscoveryQuestion(ctx.topics ?? [], ctx.free_text ?? null, data.command_id)
            const fallbackRes: DiscoveryResult = {
                profile: prof ?? discoveryQ as unknown as TravelerProfile,
                finished: false,
                next_question: fallback,
                completion_reason: "agent_error_fallback",
            } as unknown as DiscoveryResult
            // Need current profile after error - keep existing prof
            // Ensure profile is not null
            const profForSnap = (fallbackRes.profile as any) && (fallbackRes.profile as any).profile_id ? fallbackRes.profile : (prof as TravelerProfile)
            const snapRes: DiscoveryResult = { ...fallbackRes, profile: profForSnap as TravelerProfile }
            await emitProfileSnapshotAndMaybeReady(emit, {
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                discoveryRes: snapRes,
            })
            return res
        }
        throw e
    }
    logger.debug('got discovery question', {res: discoveryRes})
    logger.debug('profile from agent', {
        profile: discoveryRes.profile,
        finished: discoveryRes.finished
    })
    setSessionProfile(data.session_id, discoveryRes.profile)
    logger.debug('updated profile after agent call', {
        profile_id: discoveryRes.profile?.profile_id,
        destination_request: discoveryRes.profile?.trip_context?.destination_request,
        start_date: discoveryRes.profile?.trip_context?.start_date,
        end_date: discoveryRes.profile?.trip_context?.end_date,
        duration_days: discoveryRes.profile?.trip_context?.duration_days,
        party_size: discoveryRes.profile?.trip_context?.party_size,
        date_flexibility: discoveryRes.profile?.trip_context?.date_flexibility
    })

    await emitProfileSnapshotAndMaybeReady(emit, {
        session_id: data.session_id,
        run_id: data.run_id,
        command_id: data.command_id,
        discoveryRes,
    })

    return res
}

export async function newDiscoveryQuestionService(
    emit: (res: ServiceResult) => void,
    session_id: string,
    run_id: string,
    command_id: string,
    profile: TravelerProfile | null = null,
    answer: UserAnswer | null = null,
    /** When set, skip emit if session epoch advanced (stale provisional). */
    expectedEpoch?: number,
    changeRequestOverride?: any | null,
): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []
    const epochAtStart = expectedEpoch ?? getDiscoveryEpoch(session_id)
    logger.debug('starting service for new discovery question', { session_id: session_id, run_id: run_id, command_id: command_id, profile: profile, answer: answer, epochAtStart });

    const ctx: any = changeRequestOverride !== undefined ? changeRequestOverride : getActiveChangeRequestSafe(session_id)
    const prior = getDiscoveryQuestionPrompts(run_id)
    const discoveryInput: DiscoveryInput = {
        answer:  answer,
        profile: profile,
        questions_asked_count: getDiscoveryQuestionCount(run_id),
        prior_questions: prior,
    } as DiscoveryInput
    if (ctx) {
        ;(discoveryInput as any).change_request = {
            topics: ctx.topics ?? [],
            free_text: ctx.free_text ?? null,
            source_profile_revision: ctx.source_profile_revision ?? 0,
            questions_in_phase: ctx.questions_in_phase ?? 0,
        }
        const t = (ctx.topics ?? []).map((s: string) => s.trim()).filter(Boolean)
        if (t.length > 0 || (ctx.free_text && String(ctx.free_text).trim().length > 0)) {
            const hint = `[Change request topics: ${t.join(", ")}${ctx.free_text ? `; note: ${String(ctx.free_text).slice(0, 500)}` : ""}]`
            ;(discoveryInput as any).prior_questions = [hint, ...(prior ?? [])]
        }
    }

    const config: AppConfig = loadConfig(process.env)
    const opt = loadDiscoveryOptions()
    logAgentCall(discoveryInput, config)
    logger.debug('current profile before agent call', {
        profile_id: profile?.profile_id,
        destination_request: profile?.trip_context?.destination_request,
        start_date: profile?.trip_context?.start_date,
        end_date: profile?.trip_context?.end_date,
        duration_days: profile?.trip_context?.duration_days,
        party_size: profile?.trip_context?.party_size,
        date_flexibility: profile?.trip_context?.date_flexibility
    })
    let discoveryRes: DiscoveryResult
    try {
        discoveryRes = await processDiscovery(
            discoveryInput,
            opt
        )
    } catch (e) {
        if (ctx) {
            logger.warn('newDiscoveryQuestionService agent error, emitting fallback', { error: String(e), session_id })
            const fallback = buildFallbackDiscoveryQuestion(ctx.topics ?? [], ctx.free_text ?? null, command_id)
            // Epoch check before emitting fallback
            if (getDiscoveryEpoch(session_id) !== epochAtStart) {
                logger.warn('dropping stale fallback discovery result (epoch advanced)', {
                    session_id,
                    run_id,
                    epochAtStart,
                    currentEpoch: getDiscoveryEpoch(session_id),
                })
                return res
            }
            const fallbackProfile = (profile as TravelerProfile) ?? await getSessionProfile(session_id)
            const snapRes: DiscoveryResult = {
                profile: fallbackProfile as TravelerProfile,
                finished: false,
                next_question: fallback,
                completion_reason: "agent_error_fallback",
            } as unknown as DiscoveryResult
            if (fallbackProfile) setSessionProfile(session_id, fallbackProfile as TravelerProfile)
            await emitProfileSnapshotAndMaybeReady(emit, {
                session_id,
                run_id,
                command_id,
                discoveryRes: snapRes,
            })
            return res
        }
        throw e
    }
    logger.debug('got discovery question', {res: discoveryRes})
    logger.debug('profile from agent', {
        profile: discoveryRes.profile,
        finished: discoveryRes.finished
    })

    if (getDiscoveryEpoch(session_id) !== epochAtStart) {
        logger.warn('dropping stale discovery result (epoch advanced)', {
            session_id,
            run_id,
            epochAtStart,
            currentEpoch: getDiscoveryEpoch(session_id),
            finished: discoveryRes.finished,
        })
        return res
    }

    setSessionProfile(session_id, discoveryRes.profile)
    logger.debug('updated profile after agent call', {
        profile_id: discoveryRes.profile?.profile_id,
        destination_request: discoveryRes.profile?.trip_context?.destination_request,
        start_date: discoveryRes.profile?.trip_context?.start_date,
        end_date: discoveryRes.profile?.trip_context?.end_date,
        duration_days: discoveryRes.profile?.trip_context?.duration_days,
        party_size: discoveryRes.profile?.trip_context?.party_size,
        date_flexibility: discoveryRes.profile?.trip_context?.date_flexibility
    })

    await emitProfileSnapshotAndMaybeReady(emit, {
        session_id,
        run_id,
        command_id,
        discoveryRes,
    })

    return res
}

// Helper for ProfileServices targeted turn (§C.3)
export async function targetedDiscoveryTurnService(
    emit: (res: ServiceResult) => void,
    args: {
        session_id: string
        run_id: string
        command_id: string
        change_request: { topics: string[]; free_text: string | null; source_profile_revision: number; questions_in_phase: number }
        profile?: TravelerProfile | null
        expectedEpoch?: number
    }
): Promise<ServiceResult[]> {
    const profile = args.profile ?? await getSessionProfile(args.session_id)
    return newDiscoveryQuestionService(
        emit,
        args.session_id,
        args.run_id,
        args.command_id,
        profile,
        null,
        args.expectedEpoch,
        args.change_request
    )
}
