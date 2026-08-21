import { DiscoveryAnswerMessage } from "../structures/CommandMessage";
import { ProfileSnapshot, ServiceResult } from "../structures/types";
import { DiscoveryInput, DiscoveryResult, processDiscovery, ProcessDiscoveryOptions, TravelerProfile, UserAnswer } from "../../../ai/discovery";
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
import { Events, ProfileSnapshotStates, WorkflowStates } from "../structures/enums";
import { DiscoveryQuestionMessage, ProfileReadyMessage, ProfileSnapshotMessage } from "../structures/EventMessage";
import { generateUUID } from "../modules/util";
import { createDiscoveryQuestionMessage, createProfileReadyMessage, createProfileSnapshotMessage } from "../factory/Event";
import { nextSequence } from "./StateServices";
import { AppConfig, loadConfig } from "../app/config";
import { logger } from "../modules/logger";

function loadDiscoveryOptions(): ProcessDiscoveryOptions {
    const config: AppConfig = loadConfig(process.env)
    return {
        api_key: config.agent_api_key,
        model: config.agent_model,
        // Agent 1 (discovery) always disables reasoning — thinkingBudget: 0.
        // Do not pass reasoning_effort here; AGENT_REASONING_EFFORT is for Agent 2 (candidate-design) only.
        api_url: config.agent_api_url,
        timeout_ms: config.agent_timeout_ms,
    }
}

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
    const state = discoveryRes.finished ? ProfileSnapshotStates.READY : ProfileSnapshotStates.DRAFT
    // Contract 1.0: revision is always strictly newer than any prior snapshot,
    // including draft→ready promotions (never reuse a draft revision as ready).
    const snapshot = await appendProfileSnapshot(
        session_id,
        state,
        discoveryRes.profile,
        discoveryRes.finished ? WorkflowStates.PROFILE_REVIEW : undefined,
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

    if (discoveryRes.finished) {
        logger.debug('discovery process finished', { revision: snapshot.revision })
        await setWorkflowState(session_id, WorkflowStates.PROFILE_REVIEW)
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
    } else if (discoveryRes.next_question) {
        logger.debug('got another question to send')
        addDiscoveryQuestion(run_id, discoveryRes.next_question)
        const discoveryQuestionMsg: DiscoveryQuestionMessage =
            createDiscoveryQuestionMessage({
                message_id: `msg_${generateUUID()}`,
                session_id,
                run_id,
                command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(run_id),
                payload: discoveryRes.next_question,
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
    const discoveryInput: DiscoveryInput = {
        profile: prof,
        answer: {
            question_id: data.payload.question_id,
            question: discoveryQ,
            selected_option_ids: data.payload.selected_option_ids,
            free_text: data.payload.free_text,
        },
        questions_asked_count: getDiscoveryQuestionCount(data.run_id),
        prior_questions: getDiscoveryQuestionPrompts(data.run_id),
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
    const discoveryRes: DiscoveryResult = await processDiscovery(
        discoveryInput,
        opt
    )
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
): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []
    const epochAtStart = expectedEpoch ?? getDiscoveryEpoch(session_id)
    logger.debug('starting service for new discovery question', { session_id: session_id, run_id: run_id, command_id: command_id, profile: profile, answer: answer, epochAtStart });

    const discoveryInput: DiscoveryInput = {
        answer:  answer,
        profile: profile,
        questions_asked_count: getDiscoveryQuestionCount(run_id),
        prior_questions: getDiscoveryQuestionPrompts(run_id),
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
    const discoveryRes: DiscoveryResult = await processDiscovery(
        discoveryInput,
        opt
    )
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
