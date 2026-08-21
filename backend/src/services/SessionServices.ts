import { Socket } from "socket.io";
import { createProfileReadyMessage, createProfileSnapshotMessage, createSessionExpiredMessage, createSessionReadyMessage } from "../factory/Event";
import { getNewRunId, getNewSessionId, getSessionCheckpoint, getValidSessionIds, moveSessionIdToExpired, setSessionProfile, setSocketIdForSession, setWorkflowState, unsetSocketIdForSession } from "../models/data";
import { generateUUID } from "../modules/util";
import { SessionCloseMessage, SessionStartMessage } from "../structures/CommandMessage";
import { Events, ProfileSnapshotStates, WorkflowStates } from "../structures/enums";
import { ProfileSnapshotMessage, SessionReadyMessage } from "../structures/EventMessage";
import { NewSessionMessage } from "../structures/NewSessionMessage";
import { ServiceResult } from "../structures/types";
import { newDiscoveryQuestionService } from "./DiscoveryServices";
import { nextSequence } from "./StateServices";
import { logger } from "../modules/logger";
import { hardcodedProfile } from "../tmp/hardcoded";

export async function sessionStartService(
    emit: (res: ServiceResult) => void,
    data: SessionStartMessage | NewSessionMessage,
    socketid: string,
    isNewSessMsg: boolean,
): Promise<ServiceResult[]>  {
    const res: ServiceResult[] = []
    logger.debug('starting service for session.start', { socketid: socketid, data: data });

    if (isNewSessMsg) {
        const newSessionId = await getNewSessionId()
        const newRunId = await getNewRunId(newSessionId)

        const sessReadyMsg: SessionReadyMessage = createSessionReadyMessage({
            message_id: `msg_${generateUUID()}`,
            session_id: newSessionId,
            run_id: newRunId,
            command_id: data.command_id,
            occurred_at: new Date().toISOString(),
            sequence: await nextSequence(newRunId),
            payload:{
                session_id: newSessionId,
                run_id: newRunId,
                workflow_state: WorkflowStates.DISCOVERY,
                has_recovery_state: false,
                confirmed_profile_revision: null,
            }
        })

        await setSocketIdForSession(newSessionId, socketid)

        logger.debug('sending session.ready', { data: data });
        const sessionReadyRes = {event: Events.SESSION_READY, data: sessReadyMsg}
        emit(sessionReadyRes)

        //////// HARDCODED REMOVE LATER ////////////////////////////////////////////////////////////
        await setSessionProfile(newSessionId, hardcodedProfile)
        emit({
            event: Events.PROFILE_SNAPSHOT, 
            data: createProfileSnapshotMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: newSessionId,
                run_id: newRunId,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(newRunId),
                payload: {
                    revision: 1,
                    state: ProfileSnapshotStates.READY,
                    profile: hardcodedProfile
                },
            })
        })
        emit({
            event: Events.PROFILE_READY, data: createProfileReadyMessage({
                message_id: `hardcode`,
                session_id: newSessionId,
                run_id: newRunId,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(newRunId),
                payload: {
                    profile_revision: 1,
                    blocking_unknowns: []
                }
            })
        })
        await setWorkflowState(newSessionId, WorkflowStates.PROFILE_REVIEW)
        return res;
        //////// HARDCODED REMOVE LATER ////////////////////////////////////////////////////////////

        // await setWorkflowState(newSessionId, WorkflowStates.DISCOVERY)

        // const initialIntent = (data as unknown as { payload?: { initial_intent?: string } }).payload?.initial_intent?.trim() || null
        // // Provisional profile keeps raw intent for immediate UI (ms latency).
        // // Hidden Q0 is NOT counted/emitted — it is an internal NLU seed so Agent 1
        // // can fill multiple profile fields (destination + purpose/party/preferences)
        // // from one free-text answer without brittle parsing.
        // const initialProfile = initialIntent
        //   ? ({
        //       profile_id: "mock-profile",
        //       trip_context: {
        //         destination_request: initialIntent,
        //         resolved_destination: null,
        //         start_date: null,
        //         end_date: null,
        //         duration_days: null,
        //         date_flexibility: "unknown",
        //         party_size: null,
        //         party_notes: null,
        //         budget: null,
        //       },
        //       purpose_and_priorities: { primary_purpose: null, secondary_purposes: [], priorities: [], success_definition: null },
        //       preferences: [],
        //       travel_style: { pace: "unknown", energy_pattern: "unknown", walking_tolerance: "unknown", crowd_tolerance: "unknown", comfort_preference: "unknown", spontaneity: "unknown" },
        //       hard_constraints: { must_visit: [], avoid: [], dietary_requirements: [], accessibility_requirements: [], accommodation_requirements: [], maximum_daily_travel: null, maximum_hotel_changes: null, budget_ceiling: null },
        //       unknowns: [],
        //       assumptions: [],
        //     } as unknown as import("../../../ai/discovery").TravelerProfile)
        //   : null
        // if (initialIntent) logger.debug('seeding discovery with initial_intent (hidden Q0)', { initialIntent })
        // // Emit provisional snapshot/question immediately so frontend sphere resolves in ms
        // // even while agent runs. Agent result (if/when it returns) will emit a newer revision.
        // {
        //   const { createDiscoveryQuestionMessage, createProfileSnapshotMessage } = await import("../factory/Event")
        //   const { Events, ProfileSnapshotStates } = await import("../structures/enums")
        //   const { appendProfileSnapshot, setSessionProfile, addDiscoveryQuestion, getDiscoveryEpoch } = await import("../models/data")
        //   const provisionalProfile = initialProfile ?? {
        //     profile_id: "mock-profile",
        //     trip_context: { destination_request: initialIntent ?? null, resolved_destination: null, start_date: null, end_date: null, duration_days: null, date_flexibility: "unknown", party_size: null, party_notes: null, budget: null },
        //     purpose_and_priorities: { primary_purpose: null, secondary_purposes: [], priorities: [], success_definition: null },
        //     preferences: [], travel_style: { pace: "unknown", energy_pattern: "unknown", walking_tolerance: "unknown", crowd_tolerance: "unknown", comfort_preference: "unknown", spontaneity: "unknown" },
        //     hard_constraints: { must_visit: [], avoid: [], dietary_requirements: [], accessibility_requirements: [], accommodation_requirements: [], maximum_daily_travel: null, maximum_hotel_changes: null, budget_ceiling: null },
        //     unknowns: [], assumptions: [],
        //   } as unknown as import("../../../ai/discovery").TravelerProfile
        //   const snap = await appendProfileSnapshot(
        //     newSessionId,
        //     ProfileSnapshotStates.DRAFT,
        //     provisionalProfile,
        //     WorkflowStates.DISCOVERY,
        //   )
        //   const profSnapMsg = createProfileSnapshotMessage({
        //     message_id: `msg_${generateUUID()}`,
        //     session_id: newSessionId,
        //     run_id: newRunId,
        //     command_id: data.command_id,
        //     occurred_at: new Date().toISOString(),
        //     sequence: await nextSequence(newRunId),
        //     payload: snap as unknown as import("../structures/EventMessage").ProfileSnapshotMessage["payload"],
        //   })
        //   emit({ event: Events.PROFILE_SNAPSHOT, data: profSnapMsg })
        //   await setSessionProfile(newSessionId, provisionalProfile)
        //   const provisionalQ = {
        //     question_id: "destination",
        //     prompt: initialIntent ? `Tell us more about your trip to ${initialIntent} — what kind of experience are you looking for?` : "Where are you planning to travel for your next trip?",
        //     selection_mode: "single" as const,
        //     required: true,
        //     options: [],
        //     free_text_mode: "required" as const,
        //     free_text_placeholder: "e.g., Tokyo, Paris, Maui...",
        //   }
        //   const qMsg = createDiscoveryQuestionMessage({
        //     message_id: `msg_${generateUUID()}`,
        //     session_id: newSessionId,
        //     run_id: newRunId,
        //     command_id: data.command_id,
        //     occurred_at: new Date().toISOString(),
        //     sequence: await nextSequence(newRunId),
        //     payload: provisionalQ as unknown as import("../structures/EventMessage").DiscoveryQuestionMessage["payload"],
        //   })
        //   emit({ event: Events.DISCOVERY_QUESTION, data: qMsg })

        //   // Capture epoch so a traveler answer during the agent call drops this result.
        //   const provisionalEpoch = getDiscoveryEpoch(newSessionId)
        //   // Call agent BEFORE adding provisional to DiscoveryQuestions so
        //   // questions_asked_count is 0 for the first agent refinement
        //   // (provisional is a UI placeholder, not an agent question).
        //   // Hidden Q0: treat initialIntent as free-text answer to "Describe your trip in short"
        //   // so Agent 1 can fill multiple profile fields at once. Hidden is NOT added to
        //   // DiscoveryQuestions — visible count stays 0 and prior_questions stays [].
        //   // Single LLM call enriches profile + produces first visible Q1.
        //   const hiddenQuestion = initialIntent
        //     ? ({
        //         question_id: "__initial_intent",
        //         prompt: "Describe your trip in short",
        //         selection_mode: "single" as const,
        //         required: true,
        //         options: [],
        //         free_text_mode: "required" as const,
        //         free_text_placeholder: "e.g., Srinagar honeymoon, 5 days in Goa with family...",
        //       } as unknown as import("../../../ai/discovery").DiscoveryQuestion)
        //     : null
        //   const hiddenAnswer = initialIntent && hiddenQuestion
        //     ? ({
        //         question_id: hiddenQuestion.question_id,
        //         question: hiddenQuestion,
        //         selected_option_ids: [],
        //         free_text: initialIntent,
        //       } as unknown as import("../../../ai/discovery").UserAnswer)
        //     : null
        //   void newDiscoveryQuestionService(
        //       emit,
        //       newSessionId,
        //       newRunId,
        //       data.command_id,
        //       null,
        //       hiddenAnswer,
        //       provisionalEpoch,
        //   ).catch((e: unknown) => {
        //     const msg = e instanceof Error ? e.message : String(e)
        //     const stack = e instanceof Error ? e.stack : undefined
        //     logger.warn('background newDiscoveryQuestionService failed (provisional already sent)', {
        //       error: msg,
        //       stack,
        //       session_id: newSessionId,
        //       run_id: newRunId,
        //       errorType: e?.constructor?.name
        //     })
        //   })
        //   // Add provisional AFTER background call so agent sees count 0 / no prior.
        //   // It is still stored for future discoveryAnswerService calls (count 1 after).
        //   addDiscoveryQuestion(newRunId, provisionalQ as unknown as import("../../../ai/discovery").DiscoveryQuestion)
        // }

    }

    else if ("session_id" in data) {

        await setSocketIdForSession(data.session_id, socketid)
        const newRunId = await getNewRunId(data.session_id)
        const checkpoint = await getSessionCheckpoint(data.session_id)
        if (checkpoint) {

            const sessReadyMsg: SessionReadyMessage = createSessionReadyMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: newRunId,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(newRunId),
                payload: {
                    session_id: data.session_id,
                    run_id: newRunId,
                    workflow_state: checkpoint.workflow_state,
                    has_recovery_state: true,
                    confirmed_profile_revision: checkpoint.latest_confirmed,
                }
            })
            logger.debug('sending session.ready', { data: data });
            const sessionReadyRes = { event: Events.SESSION_READY, data: sessReadyMsg }
            emit(sessionReadyRes)

            // Contract: events are not replayed into a new run — emit recovery state only
            // (latest snapshot), not the full snapshot history.
            let latestSnap = checkpoint.profile_snapshots[checkpoint.profile_snapshots.length - 1]
            if (latestSnap) {
                // profile_review with a draft tip must promote via a new revision (never reuse).
                if (
                    checkpoint.workflow_state === WorkflowStates.PROFILE_REVIEW
                    && latestSnap.state !== ProfileSnapshotStates.READY
                    && latestSnap.state !== ProfileSnapshotStates.CONFIRMED
                ) {
                    const { appendProfileSnapshot } = await import("../models/data")
                    latestSnap = await appendProfileSnapshot(
                        data.session_id,
                        ProfileSnapshotStates.READY,
                        latestSnap.profile,
                        WorkflowStates.PROFILE_REVIEW,
                    )
                    logger.debug('promoted recovery draft→ready with new revision', {
                        revision: latestSnap.revision,
                    })
                }

                logger.debug('sending recovery profile.snapshot', {
                    revision: latestSnap.revision,
                    state: latestSnap.state,
                })
                const profSnapMsg: ProfileSnapshotMessage = createProfileSnapshotMessage({
                    message_id: `msg_${generateUUID()}`,
                    session_id: data.session_id,
                    run_id: newRunId,
                    command_id: data.command_id,
                    occurred_at: new Date().toISOString(),
                    sequence: await nextSequence(newRunId),
                    payload: latestSnap
                })
                emit({ event: Events.PROFILE_SNAPSHOT, data: profSnapMsg })

                if (
                    latestSnap.state === ProfileSnapshotStates.READY
                    || checkpoint.workflow_state === WorkflowStates.PROFILE_REVIEW
                ) {
                    const profReadyMsg = createProfileReadyMessage({
                        message_id: `msg_${generateUUID()}`,
                        session_id: data.session_id,
                        run_id: newRunId,
                        command_id: data.command_id,
                        occurred_at: new Date().toISOString(),
                        sequence: await nextSequence(newRunId),
                        payload: {
                            profile_revision: latestSnap.revision,
                            blocking_unknowns: [],
                        },
                    })
                    emit({ event: Events.PROFILE_READY, data: profReadyMsg })
                }
            }

            // do checkpoint next service
            if (checkpoint.workflow_state === WorkflowStates.DISCOVERY) {
                try {
                    await newDiscoveryQuestionService(
                        emit,
                        data.session_id,
                        newRunId,
                        data.command_id,
                        checkpoint.profile_snapshots[checkpoint.profile_snapshots.length - 1].profile,
                    )
                } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : String(e)
                    const stack = e instanceof Error ? e.stack : undefined
                    logger.warn('newDiscoveryQuestionService (checkpoint) failed, sending fallback', { 
                        error: msg,
                        stack,
                        session_id: data.session_id,
                        run_id: newRunId,
                        errorType: e?.constructor?.name
                    })
                    const { createDiscoveryQuestionMessage, createProfileSnapshotMessage } = await import("../factory/Event")
                    const { Events, ProfileSnapshotStates } = await import("../structures/enums")
                    const { appendProfileSnapshot } = await import("../models/data")
                    const fallbackProfile = checkpoint.profile_snapshots[checkpoint.profile_snapshots.length - 1].profile
                    const snap = await appendProfileSnapshot(
                        data.session_id,
                        ProfileSnapshotStates.DRAFT,
                        fallbackProfile,
                        WorkflowStates.DISCOVERY,
                    )
                    const profSnapMsg = createProfileSnapshotMessage({
                        message_id: `msg_${generateUUID()}`,
                        session_id: data.session_id,
                        run_id: newRunId,
                        command_id: data.command_id,
                        occurred_at: new Date().toISOString(),
                        sequence: await nextSequence(newRunId),
                        payload: snap as unknown as import("../structures/EventMessage").ProfileSnapshotMessage["payload"],
                    })
                    emit({ event: Events.PROFILE_SNAPSHOT, data: profSnapMsg })
                    const qMsg = createDiscoveryQuestionMessage({
                        message_id: `msg_${generateUUID()}`,
                        session_id: data.session_id,
                        run_id: newRunId,
                        command_id: data.command_id,
                        occurred_at: new Date().toISOString(),
                        sequence: await nextSequence(newRunId),
                        payload: { question_id: "destination", prompt: "Tell us more about your trip — what kind of experience are you looking for?", selection_mode: "single" as const, required: true, options: [], free_text_mode: "required" as const, free_text_placeholder: "e.g., Tokyo, Paris, Maui..." } as unknown as import("../structures/EventMessage").DiscoveryQuestionMessage["payload"],
                    })
                    emit({ event: Events.DISCOVERY_QUESTION, data: qMsg })
                }
            }
            // if (checkpoint.workflow_state === WorkflowStates.DECISION_REQUIRED) {
            // }

            // other states do if time have

            await setWorkflowState(data.session_id, checkpoint.workflow_state)
        }

        else {
            const sessReadyMsg: SessionReadyMessage = createSessionReadyMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: newRunId,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(newRunId),
                payload: {
                    session_id: data.session_id,
                    run_id: newRunId,
                    workflow_state: WorkflowStates.DISCOVERY,
                    has_recovery_state: false,
                    confirmed_profile_revision: null,
                }
            })

            emit({ event: Events.SESSION_READY, data: sessReadyMsg })

            try {
                await newDiscoveryQuestionService(
                    emit,
                    data.session_id,
                    newRunId,
                    data.command_id,
                )
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e)
                const stack = e instanceof Error ? e.stack : undefined
                logger.warn('newDiscoveryQuestionService (no checkpoint) failed, sending fallback', { 
                    error: msg,
                    stack,
                    session_id: data.session_id,
                    run_id: newRunId,
                    errorType: e?.constructor?.name
                })
                const { createDiscoveryQuestionMessage, createProfileSnapshotMessage } = await import("../factory/Event")
                const { Events, ProfileSnapshotStates } = await import("../structures/enums")
                const { appendProfileSnapshot, setSessionProfile } = await import("../models/data")
                const fallbackProfile = { profile_id: "mock-profile", trip_context: { destination_request: null, resolved_destination: null, start_date: null, end_date: null, duration_days: null, date_flexibility: "unknown", party_size: null, party_notes: null, budget: null }, purpose_and_priorities: { primary_purpose: null, secondary_purposes: [], priorities: [], success_definition: null }, preferences: [], travel_style: { pace: "unknown", energy_pattern: "unknown", walking_tolerance: "unknown", crowd_tolerance: "unknown", comfort_preference: "unknown", spontaneity: "unknown" }, hard_constraints: { must_visit: [], avoid: [], dietary_requirements: [], accessibility_requirements: [], accommodation_requirements: [], maximum_daily_travel: null, maximum_hotel_changes: null, budget_ceiling: null }, unknowns: [], assumptions: [] } as unknown as import("../../../ai/discovery").TravelerProfile
                const snap = await appendProfileSnapshot(
                    data.session_id,
                    ProfileSnapshotStates.DRAFT,
                    fallbackProfile,
                    WorkflowStates.DISCOVERY,
                )
                await setSessionProfile(data.session_id, fallbackProfile)
                const profSnapMsg = createProfileSnapshotMessage({
                    message_id: `msg_${generateUUID()}`,
                    session_id: data.session_id,
                    run_id: newRunId,
                    command_id: data.command_id,
                    occurred_at: new Date().toISOString(),
                    sequence: await nextSequence(newRunId),
                    payload: snap as unknown as import("../structures/EventMessage").ProfileSnapshotMessage["payload"],
                })
                emit({ event: Events.PROFILE_SNAPSHOT, data: profSnapMsg })
                const qMsg = createDiscoveryQuestionMessage({
                    message_id: `msg_${generateUUID()}`,
                    session_id: data.session_id,
                    run_id: newRunId,
                    command_id: data.command_id,
                    occurred_at: new Date().toISOString(),
                    sequence: await nextSequence(newRunId),
                    payload: { question_id: "destination", prompt: "Where are you planning to travel for your next trip?", selection_mode: "single" as const, required: true, options: [], free_text_mode: "required" as const, free_text_placeholder: "e.g., Tokyo, Paris, Maui..." } as unknown as import("../structures/EventMessage").DiscoveryQuestionMessage["payload"],
                })
                emit({ event: Events.DISCOVERY_QUESTION, data: qMsg })
            }
            await setWorkflowState(data.session_id, WorkflowStates.DISCOVERY)
        }
    }

    logger.debug('service completed for session.start', { socketid: socketid, data: data });
    return res;
}

export async function sessionCloseService(
    emit: (res: ServiceResult) => void,
    data: SessionCloseMessage,
): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []
    logger.debug('starting service for session.close', { data: data });

    await moveSessionIdToExpired(data.session_id)
    await setWorkflowState(data.session_id, WorkflowStates.EXPIRED)
    await unsetSocketIdForSession(data.session_id)
    const sessExpiredMsg = createSessionExpiredMessage({
        message_id: `msg_${generateUUID()}`,
        session_id: data.session_id,
        run_id: data.run_id,
        command_id: data.command_id,
        occurred_at: new Date().toISOString(),
        sequence: await nextSequence(data.run_id),
        payload: {
            reason: 'closed by request',
            can_start_new_session: true
        }
    })
    logger.debug('sending event session.expired')
    emit({ event: Events.SESSION_EXPIRED, data: sessExpiredMsg })

    logger.debug('service completed for session.close', { data: data });
    return res;
}

