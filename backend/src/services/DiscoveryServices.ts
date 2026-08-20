import { DiscoveryAnswerMessage } from "../structures/CommandMessage";
import { CheckpointType, ProfileSnapshot, ServiceResult } from "../structures/types";
import { DiscoveryInput, DiscoveryQuestion, DiscoveryResult, processDiscovery } from "../../../ai/discovery";
import { getDiscoveryQuestionById, getSessionCheckpoint, getSessionProfile, getWorkflowState, setSessionCheckpoint, setSessionProfile, setWorkflowState } from "../models/data";
import { Events, ProfileSnapshotStates, WorkflowStates } from "../structures/enums";
import { DiscoveryQuestionMessage, ProfileSnapshotMessage } from "../structures/EventMessage";
import { generateUUID } from "../modules/util";
import { createDiscoveryQuestionMessage, createProfileSnapshotMessage } from "../factory/Event";
import { getNextSequence } from "./StateServices";

export async function discoveryAnswerService(
    data: DiscoveryAnswerMessage
): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []

    const prof = await getSessionProfile(data.session_id);
    const discoveryQ = await getDiscoveryQuestionById(data.run_id, data.payload?.question_id!)
    const discoveryInput: DiscoveryInput = {
        profile: prof,
        answer: {
            question_id: data.payload?.question_id!,
            question: discoveryQ,
            selected_option_ids: data.payload?.selected_option_ids!,
            free_text: data.payload?.free_text!,
        }
    }
    // give agent answer
    const discoveryRes: DiscoveryResult = await processDiscovery(
        discoveryInput,
        {}
    )
    // update profile given by agent
    setSessionProfile(data.session_id, discoveryRes.profile)

    // if all questions are done, set workflow to planning/decision_required
    if (discoveryRes.finished) {
        setWorkflowState(data.session_id, WorkflowStates.PLANNING)
        // start agent 2 service
    }
    // else add discovery.question msg to res
    else if (discoveryRes.next_question) {
        const discoveryQuestionMsg: DiscoveryQuestionMessage =
            createDiscoveryQuestionMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await getNextSequence(data.session_id),
                payload: discoveryRes.next_question
            })
        res.push({event: Events.DISCOVERY_QUESTION, data: discoveryQuestionMsg})
    }

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
        sequence: await getNextSequence(data.session_id),
        payload: snapshot
    })
    res.push({ event: Events.PROFILE_SNAPSHOT, data: profSnapMsg })

    return res
}

export async function newDiscoveryQuestionService(
    session_id: string,
    run_id: string,
    command_id: string
): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []

    const discoveryInput: DiscoveryInput = {
        answer: null,
        profile: null,
    }
    const discoveryRes: DiscoveryResult = await processDiscovery(
        discoveryInput,
        {}
    )
    // update profile given by agent
    setSessionProfile(session_id, discoveryRes.profile)

    // if all questions are done, set workflow to planning/decision_required
    if (discoveryRes.finished) {
        setWorkflowState(session_id, WorkflowStates.PLANNING)
        // start agent 2 service
    }
    // else add discovery.question msg to res
    else if (discoveryRes.next_question) {
        const discoveryQuestionMsg: DiscoveryQuestionMessage =
            createDiscoveryQuestionMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: session_id,
                run_id: run_id,
                command_id: command_id,
                occurred_at: new Date().toISOString(),
                sequence: await getNextSequence(session_id),
                payload: discoveryRes.next_question
            })
        res.push({event: Events.DISCOVERY_QUESTION, data: discoveryQuestionMsg})
    }

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
        sequence: await getNextSequence(session_id),
        payload: snapshot
    })
    res.push({ event: Events.PROFILE_SNAPSHOT, data: profSnapMsg })

    return res
}
