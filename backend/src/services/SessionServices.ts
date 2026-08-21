import { Socket } from "socket.io";
import { createDiscoveryAnswerMessage } from "../factory/Command";
import { createProfileSnapshotMessage, createSessionExpiredMessage, createSessionReadyMessage } from "../factory/Event";
import { getNewRunId, getNewSessionId, getSessionCheckpoint, getSessionProfile, getValidSessionIds, moveSessionIdToExpired, setSocketIdForSession, setWorkflowState, unsetSocketIdForSession } from "../models/data";
import { generateUUID } from "../modules/util";
import { SessionCloseMessage, SessionStartMessage } from "../structures/CommandMessage";
import { Events, WorkflowStates } from "../structures/enums";
import { ProfileSnapshotMessage, SessionReadyMessage } from "../structures/EventMessage";
import { NewSessionMessage, NewSessionMessageSchema } from "../structures/NewSessionMessage";
import { ServiceResult } from "../structures/types";
import { discoveryAnswerService, newDiscoveryQuestionService } from "./DiscoveryServices";
import { nextSequence } from "./StateServices";
import { logger } from "../modules/logger";

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

        await setWorkflowState(newSessionId, WorkflowStates.DISCOVERY)

        const initialIntent = (data as unknown as { payload?: { initial_intent?: string } }).payload?.initial_intent?.trim() || null
        // Seed profile with destination_request so first discovery question is contextual
        // (do not fake a UserAnswer without a DiscoveryQuestion object — that breaks the AI prompt)
        const initialProfile = initialIntent
          ? ({
              profile_id: "mock-profile",
              trip_context: {
                destination_request: initialIntent,
                resolved_destination: null,
                start_date: null,
                end_date: null,
                duration_days: null,
                date_flexibility: "unknown",
                party_size: null,
                party_notes: null,
                budget: null,
              },
              purpose_and_priorities: { primary_purpose: null, secondary_purposes: [], priorities: [], success_definition: null },
              preferences: [],
              travel_style: { pace: "unknown", energy_pattern: "unknown", walking_tolerance: "unknown", crowd_tolerance: "unknown", comfort_preference: "unknown", spontaneity: "unknown" },
              hard_constraints: { must_visit: [], avoid: [], dietary_requirements: [], accessibility_requirements: [], accommodation_requirements: [], maximum_daily_travel: null, maximum_hotel_changes: null, budget_ceiling: null },
              unknowns: [],
              assumptions: [],
            } as unknown as import("../../../ai/discovery").TravelerProfile)
          : null
        if (initialIntent) logger.debug('seeding discovery with initial_intent', { initialIntent })
        try {
          await newDiscoveryQuestionService(
              emit,
              newSessionId,
              newRunId,
              data.command_id,
              initialProfile,
              null,
          )
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          const isQuota = /429|quota|rate limit/i.test(msg)
          logger.warn('newDiscoveryQuestionService failed, sending fallback', { error: msg, isQuota })
          // Emit a fallback so frontend interlude doesn't hang forever and server doesn't crash
          const { createDiscoveryQuestionMessage, createProfileSnapshotMessage } = await import("../factory/Event")
          const { Events, ProfileSnapshotStates } = await import("../structures/enums")
          const fallbackProfile = initialProfile ?? {
            profile_id: "mock-profile",
            trip_context: { destination_request: initialIntent ?? null, resolved_destination: null, start_date: null, end_date: null, duration_days: null, date_flexibility: "unknown", party_size: null, party_notes: null, budget: null },
            purpose_and_priorities: { primary_purpose: null, secondary_purposes: [], priorities: [], success_definition: null },
            preferences: [], travel_style: { pace: "unknown", energy_pattern: "unknown", walking_tolerance: "unknown", crowd_tolerance: "unknown", comfort_preference: "unknown", spontaneity: "unknown" },
            hard_constraints: { must_visit: [], avoid: [], dietary_requirements: [], accessibility_requirements: [], accommodation_requirements: [], maximum_daily_travel: null, maximum_hotel_changes: null, budget_ceiling: null },
            unknowns: [], assumptions: [],
          } as unknown as import("../../../ai/discovery").TravelerProfile
          const snap = { revision: 1, state: ProfileSnapshotStates.DRAFT, profile: fallbackProfile }
          const profSnapMsg = createProfileSnapshotMessage({
            message_id: `msg_${generateUUID()}`,
            session_id: newSessionId,
            run_id: newRunId,
            command_id: data.command_id,
            occurred_at: new Date().toISOString(),
            sequence: await nextSequence(newRunId),
            payload: snap as unknown as import("../structures/EventMessage").ProfileSnapshotMessage["payload"],
          })
          emit({ event: Events.PROFILE_SNAPSHOT, data: profSnapMsg })
          const fallbackQ = {
            question_id: "destination",
            prompt: initialIntent ? `Tell us more about your trip to ${initialIntent} — what kind of experience are you looking for?` : "Where are you planning to travel for your next trip?",
            selection_mode: "single" as const,
            required: true,
            options: [],
            free_text_mode: "required" as const,
            free_text_placeholder: "e.g., Tokyo, Paris, Maui...",
          }
          const qMsg = createDiscoveryQuestionMessage({
            message_id: `msg_${generateUUID()}`,
            session_id: newSessionId,
            run_id: newRunId,
            command_id: data.command_id,
            occurred_at: new Date().toISOString(),
            sequence: await nextSequence(newRunId),
            payload: fallbackQ as unknown as import("../structures/EventMessage").DiscoveryQuestionMessage["payload"],
          })
          emit({ event: Events.DISCOVERY_QUESTION, data: qMsg })
        }

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

            logger.debug('sending checkpoint profile.snapshot s', { data: data });
            for (let snapshot of checkpoint.profile_snapshots) {
                const profSnapMsg: ProfileSnapshotMessage = createProfileSnapshotMessage({
                    message_id: `msg_${generateUUID()}`,
                    session_id: data.session_id,
                    run_id: newRunId,
                    command_id: data.command_id,
                    occurred_at: new Date().toISOString(),
                    sequence: await nextSequence(newRunId),
                    payload: snapshot
                })
                emit({ event: Events.PROFILE_SNAPSHOT, data: profSnapMsg })
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
                    logger.warn('newDiscoveryQuestionService (checkpoint) failed, sending fallback', { error: msg })
                    const { createDiscoveryQuestionMessage, createProfileSnapshotMessage } = await import("../factory/Event")
                    const { Events, ProfileSnapshotStates } = await import("../structures/enums")
                    const fallbackProfile = checkpoint.profile_snapshots[checkpoint.profile_snapshots.length - 1].profile
                    const snap = { revision: (checkpoint.profile_snapshots[checkpoint.profile_snapshots.length - 1].revision ?? 0) + 1, state: ProfileSnapshotStates.DRAFT, profile: fallbackProfile }
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
                logger.warn('newDiscoveryQuestionService (no checkpoint) failed, sending fallback', { error: msg })
                const { createDiscoveryQuestionMessage, createProfileSnapshotMessage } = await import("../factory/Event")
                const { Events, ProfileSnapshotStates } = await import("../structures/enums")
                const fallbackProfile = { profile_id: "mock-profile", trip_context: { destination_request: null, resolved_destination: null, start_date: null, end_date: null, duration_days: null, date_flexibility: "unknown", party_size: null, party_notes: null, budget: null }, purpose_and_priorities: { primary_purpose: null, secondary_purposes: [], priorities: [], success_definition: null }, preferences: [], travel_style: { pace: "unknown", energy_pattern: "unknown", walking_tolerance: "unknown", crowd_tolerance: "unknown", comfort_preference: "unknown", spontaneity: "unknown" }, hard_constraints: { must_visit: [], avoid: [], dietary_requirements: [], accessibility_requirements: [], accommodation_requirements: [], maximum_daily_travel: null, maximum_hotel_changes: null, budget_ceiling: null }, unknowns: [], assumptions: [] } as unknown as import("../../../ai/discovery").TravelerProfile
                const snap = { revision: 1, state: ProfileSnapshotStates.DRAFT, profile: fallbackProfile }
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

