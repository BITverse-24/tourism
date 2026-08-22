import { z } from "zod";
import { DiscoveryAnsSelectionModes, DiscoveryFreeTextModes, PlanningPhases, PlanningStatus, ProfileSnapshotStates, WorkflowOutcomes, WorkflowStates, PlanSnapshotStates, MessageKinds, Events } from "./enums";
import { TravelerProfileSchema } from "./TravelerProfile";
import { BaseMessageEnvelopeSchema } from "./BaseMessageEnvelope";
import { FinalTripPlan, FinalTripPlanSchema } from "./FinalTripPlan";

const BaseEventMessageSchema = BaseMessageEnvelopeSchema.extend({
    kind: z.literal(MessageKinds.EVENT),
    sequence: z.number(),
})

export const SessionReadySchema = BaseEventMessageSchema.extend({
    type: z.literal("session.ready"),
    payload: z.object({
        session_id: z.string(),
        run_id: z.string(),
        workflow_state: z.enum(WorkflowStates),
        has_recovery_state: z.boolean(),
        confirmed_profile_revision: z.number().nullable(),
    }),
})
export type SessionReadyMessage = z.infer<typeof SessionReadySchema>;


const QuestionOptionsSchema = z.object({
    option_id: z.string(),
    label: z.string(),
    description: z.string(),
})
export const DiscoveryQuestionSchema = BaseEventMessageSchema.extend({
    type: z.literal("discovery.question"),
    payload: z.object({
        question_id: z.string(),
        prompt: z.string(),
        selection_mode: z.enum(DiscoveryAnsSelectionModes),
        required: z.boolean(),
        options: z.array(QuestionOptionsSchema),
        free_text_mode: z.enum(DiscoveryFreeTextModes),
        free_text_placeholder: z.string().nullable(),
    }),
})
export type DiscoveryQuestionMessage = z.infer<typeof DiscoveryQuestionSchema>;


export const ProfileSnapshotSchema = BaseEventMessageSchema.extend({
    type: z.literal(Events.PROFILE_SNAPSHOT),
    payload: z.object({
        revision: z.number(),
        state: z.enum(ProfileSnapshotStates),
        profile: TravelerProfileSchema,
    }),
})
export type ProfileSnapshotMessage = z.infer<typeof ProfileSnapshotSchema>;


export const ProfileReadySchema = BaseEventMessageSchema.extend({
    type: z.literal("profile.ready"),
    payload: z.object({
        profile_revision: z.number(),
        blocking_unknowns: z.array(z.string()),
    }),
})
export type ProfileReadyMessage = z.infer<typeof ProfileReadySchema>;


export const AgentLifecycleSchema = BaseEventMessageSchema.extend({
    type: z.literal("agent.lifecycle"),
    payload: z.object({
        // todo
    }),
})
export type AgentLifecycleMessage = z.infer<typeof AgentLifecycleSchema>;


export const PlanningStatusSchema = BaseEventMessageSchema.extend({
    type: z.literal("planning.status"),
    payload: z.object({
        phase: z.enum(PlanningPhases),
        status: z.enum(PlanningStatus),
        message: z.string(),
        progress: z.number(),
    }),
})
export type PlanningStatusMessage = z.infer<typeof PlanningStatusSchema>;


const DecisionOptionSchema = z.object({
    option_id: z.string(),
    label: z.string(),
    tradeoff: z.string(),
});
export type DecisionOptionType = z.infer<typeof DecisionOptionSchema>;
export const DecisionRequestSchema = BaseEventMessageSchema.extend({
    type: z.literal("decision.request"),
    payload: z.object({
        decision_id: z.string(),
        profile_revision: z.number(),
        reason: z.string(),
        prompt: z.string(),
        options: z.array(DecisionOptionSchema),
    }),
})
export type DecisionRequestMessage = z.infer<typeof DecisionRequestSchema>;


export const PlanSnapshotSchema = BaseEventMessageSchema.extend({
    type: z.literal(Events.PLAN_SNAPSHOT),
    payload: z.object({
        revision: z.number(),
        state: z.enum(PlanSnapshotStates),
        plan: FinalTripPlanSchema,
    }),
})
export type PlanSnapshotMessage = z.infer<typeof PlanSnapshotSchema>;


export const WorkflowCompletedSchema = BaseEventMessageSchema.extend({
    type: z.literal("workflow.completed"),
    payload: z.object({
        outcome: z.enum(WorkflowOutcomes),
        final_plan_revision: z.number(),
    }),
})
export type WorkflowCompletedMessage = z.infer<typeof WorkflowCompletedSchema>;


export const SessionExpiredSchema = BaseEventMessageSchema.extend({
    type: z.literal("session.expired"),
    payload: z.object({
        reason: z.string(),
        can_start_new_session: z.boolean(),
    }),
})
export type SessionExpiredMessage = z.infer<typeof SessionExpiredSchema>;


export const WorkflowStateSchema = BaseEventMessageSchema.extend({
    type: z.literal(Events.WORKFLOW_STATE),
    payload: z.object({
        workflow_state: z.enum(WorkflowStates),
    }),
})
export type WorkflowStateMessage = z.infer<typeof WorkflowStateSchema>;

export const SessionSupersededSchema = BaseEventMessageSchema.extend({
    type: z.literal("session.superseed"),
    payload: z.object({
        // todo
    }),
})
export type SessionSupersededMessage = z.infer<typeof SessionSupersededSchema>;

export const EventSchemas = [
    SessionReadySchema,
    DiscoveryQuestionSchema,
    ProfileSnapshotSchema,
    ProfileReadySchema,
    AgentLifecycleSchema,
    PlanningStatusSchema,
    DecisionRequestSchema,
    PlanSnapshotSchema,
    WorkflowCompletedSchema,
    SessionExpiredSchema,
    SessionSupersededSchema,
    WorkflowStateSchema,
] as const
