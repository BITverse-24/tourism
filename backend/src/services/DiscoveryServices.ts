import { DiscoveryAnswerMessage } from "../structures/CommandMessage";
import { CheckpointType, ProfileSnapshot, ServiceResult } from "../structures/types";
import { DiscoveryInput, DiscoveryQuestion, DiscoveryResult, processDiscovery, ProcessDiscoveryOptions, TravelerProfile, UserAnswer } from "../../../ai/discovery";
import { addDiscoveryQuestion, getDiscoveryQuestionById, getSessionCheckpoint, getSessionProfile, getWorkflowState, setSessionCheckpoint, setSessionProfile, setWorkflowState } from "../models/data";
import { Events, ProfileSnapshotStates, WorkflowStates } from "../structures/enums";
import { DiscoveryQuestionMessage, ProfileReadyMessage, ProfileSnapshotMessage } from "../structures/EventMessage";
import { generateUUID } from "../modules/util";
import { createDiscoveryQuestionMessage, createProfileReadyMessage, createProfileSnapshotMessage } from "../factory/Event";
import { currentWorkflowState, nextSequence } from "./StateServices";
import { AppConfig, loadConfig } from "../app/config";
import { logger } from "../modules/logger";

export async function discoveryAnswerService(
    emit: (res: ServiceResult) => void,
    data: DiscoveryAnswerMessage
): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []

    const prof = await getSessionProfile(data.session_id);
    const discoveryQ = await getDiscoveryQuestionById(data.run_id, data.payload.question_id)
    const discoveryInput: DiscoveryInput = {
        profile: prof,
        answer: {
            question_id: data.payload.question_id,
            question: discoveryQ,
            selected_option_ids: data.payload.selected_option_ids,
            free_text: data.payload.free_text,
        }
    }
    const config: AppConfig = loadConfig(process.env)
    const opt: ProcessDiscoveryOptions = {
        api_key: config.agent_api_key,
        model: config.agent_model,
        reasoning_effort: config.agent_reasoning_effort,
        api_url: config.agent_api_url,
        timeout_ms: config.agent_timeout_ms,
    }
    // give agent answer
    logger.debug('calling agent 1', {input: discoveryInput})
    const discoveryRes: DiscoveryResult = await processDiscovery(
        discoveryInput,
        opt
    )
    logger.debug('got discovery question', {res: discoveryRes})
    // update profile given by agent
    setSessionProfile(data.session_id, discoveryRes.profile)

    // update checkpoint
    let checkpoint: CheckpointType = await getSessionCheckpoint(data.session_id)
    if (!checkpoint) {
        checkpoint = {
            session_id: data.session_id,
            profile_snapshots: [],
            latest_confirmed: null,
            workflow_state: await getWorkflowState(data.session_id)
        }
    }
    const snapshot: ProfileSnapshot = {
        revision:
        (checkpoint.profile_snapshots.length == 0) ?
            1 :
            checkpoint.profile_snapshots[checkpoint.profile_snapshots.length - 1].revision + 1,
        state: (discoveryRes.finished) ? ProfileSnapshotStates.READY : ProfileSnapshotStates.DRAFT,
        profile: discoveryRes.profile
    }
    checkpoint.profile_snapshots.push(snapshot)

    await setSessionCheckpoint(data.session_id, checkpoint)

    const profSnapMsg: ProfileSnapshotMessage = createProfileSnapshotMessage({
        message_id: `msg_${generateUUID()}`,
        session_id: data.session_id,
        run_id: data.run_id,
        command_id: data.command_id,
        occurred_at: new Date().toISOString(),
        sequence: await nextSequence(data.run_id),
        payload: snapshot
    })
    logger.debug('sending profile.snapshot', {data: profSnapMsg})
    emit({ event: Events.PROFILE_SNAPSHOT, data: profSnapMsg })

    // if all questions are done, set workflow to profile_review
    if (discoveryRes.finished) {
        logger.debug('discovery process finished')
        await setWorkflowState(data.session_id, WorkflowStates.PROFILE_REVIEW)
        const profReadyMsg: ProfileReadyMessage = createProfileReadyMessage({
            message_id: `msg_${generateUUID()}`,
            session_id: data.session_id,
            run_id: data.run_id,
            command_id: data.command_id,
            occurred_at: new Date().toISOString(),
            sequence: await nextSequence(data.run_id),
            payload: {
                profile_revision: snapshot.revision,
                blocking_unknowns: []
            }
        })
        logger.debug('sending profile.ready event', {data: profReadyMsg})
        emit({ event: Events.PROFILE_READY, data: profReadyMsg })
    }
    // else add discovery.question msg to res
    else if (discoveryRes.next_question) {
        logger.debug('got another question to send');
        addDiscoveryQuestion(data.run_id, discoveryRes.next_question)
        const discoveryQuestionMsg: DiscoveryQuestionMessage =
            createDiscoveryQuestionMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(data.run_id),
                payload: discoveryRes.next_question
            })
        logger.debug('sending discovery.question', {data: discoveryQuestionMsg})
        emit({event: Events.DISCOVERY_QUESTION, data: discoveryQuestionMsg})
    }

    checkpoint.workflow_state = await currentWorkflowState(data.session_id)

    return res
}

export async function newDiscoveryQuestionService(
    emit: (res: ServiceResult) => void,
    session_id: string,
    run_id: string,
    command_id: string,
    profile: TravelerProfile | null = null,
    answer: UserAnswer | null = null
): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []
    logger.debug('starting service for new discovery question', { session_id: session_id, run_id: run_id, command_id: command_id, profile: profile, answer: answer });

    const discoveryInput: DiscoveryInput = {
        answer:  answer,
        profile: profile,
    }

    const config: AppConfig = loadConfig(process.env)
    const opt: ProcessDiscoveryOptions = {
        api_key: config.agent_api_key,
        model: config.agent_model,
        reasoning_effort: config.agent_reasoning_effort,
        api_url: config.agent_api_url,
        timeout_ms: config.agent_timeout_ms,
    }
    logger.debug('calling agent 1', {input: discoveryInput})
    const discoveryRes: DiscoveryResult = await processDiscovery(
        discoveryInput,
        opt
    )
    logger.debug('got discovery question', {res: discoveryRes})
    // update profile given by agent
    setSessionProfile(session_id, discoveryRes.profile)

    // update checkpoint
    let checkpoint: CheckpointType = await getSessionCheckpoint(session_id)
    if (!checkpoint) {
        checkpoint = {
            session_id: session_id,
            profile_snapshots: [],
            latest_confirmed: null,
            workflow_state: await getWorkflowState(session_id)
        }
    }
    const snapshot: ProfileSnapshot = {
        revision:
        (checkpoint.profile_snapshots.length == 0) ?
            1 :
            checkpoint.profile_snapshots[checkpoint.profile_snapshots.length - 1].revision + 1,
        state: (discoveryRes.finished) ? ProfileSnapshotStates.READY : ProfileSnapshotStates.DRAFT,
        profile: discoveryRes.profile
    }
    checkpoint.profile_snapshots.push(snapshot)

    await setSessionCheckpoint(session_id, checkpoint)

    const profSnapMsg: ProfileSnapshotMessage = createProfileSnapshotMessage({
        message_id: `msg_${generateUUID()}`,
        session_id: session_id,
        run_id: run_id,
        command_id: command_id,
        occurred_at: new Date().toISOString(),
        sequence: await nextSequence(run_id),
        payload: snapshot
    })
    logger.debug('sending profile.snapshot', {data: profSnapMsg})
    emit({ event: Events.PROFILE_SNAPSHOT, data: profSnapMsg })

    // if all questions are done, set workflow to profile_review
    if (discoveryRes.finished) {
        await setWorkflowState(session_id, WorkflowStates.PROFILE_REVIEW)
        const profReadyMsg: ProfileReadyMessage = createProfileReadyMessage({
            message_id: `msg_${generateUUID()}`,
            session_id: session_id,
            run_id: run_id,
            command_id: command_id,
            occurred_at: new Date().toISOString(),
            sequence: await nextSequence(run_id),
            payload: {
                profile_revision: snapshot.revision,
                blocking_unknowns: []
            }
        })
        emit({ event: Events.PROFILE_READY, data: profReadyMsg })
    }
    // else add discovery.question msg to res
    else if (discoveryRes.next_question) {
        addDiscoveryQuestion(run_id, discoveryRes.next_question)
        const discoveryQuestionMsg: DiscoveryQuestionMessage =
            createDiscoveryQuestionMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: session_id,
                run_id: run_id,
                command_id: command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(run_id),
                payload: discoveryRes.next_question
            })
        logger.debug('sending discovery.question', {data: discoveryQuestionMsg})
        emit({event: Events.DISCOVERY_QUESTION, data: discoveryQuestionMsg})
    }

    return res
}
