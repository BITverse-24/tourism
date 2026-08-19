import { z } from "zod";
import { BaseMessageEnvelopeSchema } from "./MessageEnvelope";
import { WorkflowStates } from "./enums";

const BaseEventMessageSchema = BaseMessageEnvelopeSchema.extend({
    kind: z.literal("event"),
})

export const SessionReadySchema = BaseEventMessageSchema.extend({
    type: z.literal("session.ready"),
    payload: z.object({
        session_id: z.string(),
        run_id: z.string(),
        workflow_state: z.enum(WorkflowStates),
        has_checkpoint: z.boolean(),
    }),
})
export type SessionReadyMessage = z.infer<typeof SessionReadySchema>;


export const DeliveryQuestionSchema = BaseEventMessageSchema.extend({
    type: z.literal("delivery.question"),
    payload: z.object({
        /////////////// TOOOOOOOOOOOOOO DOOOOOOOOOOOOOOO
// question_id 	Yes 	Stable identifier for this question within the run.
// prompt 	Yes 	Question displayed to the traveler.
// selection_mode 	Yes 	single or multiple.
// required 	Yes 	Whether an answer is required before continuing.
// options 	Yes 	Ordered list of selectable options.
// options[].option_id 	Yes 	Stable identifier submitted in selected_option_ids.
// options[].label 	Yes 	Human-readable option label.
// options[].description 	Optional 	Supporting explanation for the option.
// free_text_mode 	Yes 	disabled, optional, only_if_no_option, or required.
// free_text_placeholder 	Optional 	Suggested text-field placeholder.
    }),
})
export type DeliveryQuestionMessage = z.infer<typeof DeliveryQuestionSchema>;


export const ProfileSnapshotSchema = BaseEventMessageSchema.extend({
    type: z.literal("profile.snapshot"),
    payload: z.object({
        // todo
    }),
})
export type ProfileSnapshotMessage = z.infer<typeof ProfileSnapshotSchema>;


export const ProfileReadySchema = BaseEventMessageSchema.extend({
    type: z.literal("profile.ready"),
    payload: z.object({
        // todo
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
        // todo
    }),
})
export type PlanningStatusMessage = z.infer<typeof PlanningStatusSchema>;


export const DecisionRequestSchema = BaseEventMessageSchema.extend({
    type: z.literal("decision.request"),
    payload: z.object({
        // todo
    }),
})
export type DecisionRequestMessage = z.infer<typeof DecisionRequestSchema>;


export const PlanSnapshotSchema = BaseEventMessageSchema.extend({
    type: z.literal("plan.snapshot"),
    payload: z.object({
        // todo
    }),
})
export type PlanSnapshotMessage = z.infer<typeof PlanSnapshotSchema>;


export const WorkflowCompletedSchema = BaseEventMessageSchema.extend({
    type: z.literal("workflow.completed"),
    payload: z.object({
        // todo
    }),
})
export type WorkflowCompletedMessage = z.infer<typeof WorkflowCompletedSchema>;


export const SessionExpiredSchema = BaseEventMessageSchema.extend({
    type: z.literal("session.expired"),
    payload: z.object({
        // todo
    }),
})
export type SessionExpiredMessage = z.infer<typeof SessionExpiredSchema>;


export const SessionSupersededSchema = BaseEventMessageSchema.extend({
    type: z.literal("session.superseed"),
    payload: z.object({
        // todo
    }),
})
export type SessionSupersededMessage = z.infer<typeof SessionSupersededSchema>;


export const EventSchemas = [
    SessionReadySchema,
    DeliveryQuestionSchema,
    ProfileSnapshotSchema,
    ProfileReadySchema,
    AgentLifecycleSchema,
    PlanningStatusSchema,
    DecisionRequestSchema,
    PlanSnapshotSchema,
    WorkflowCompletedSchema,
    SessionExpiredSchema,
    SessionSupersededSchema,
] as const
