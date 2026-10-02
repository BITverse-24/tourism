import { z } from "zod";
import { BaseMessageEnvelopeSchema } from "./BaseMessageEnvelope";
import { MessageKinds } from "./enums";
import { TravelerProfileSchema } from "./TravelerProfile";
import { FinalTripPlanSchema } from "./FinalTripPlan";

const CommandMessageEnvelopeSchema = BaseMessageEnvelopeSchema.extend({
    kind: z.literal(MessageKinds.COMMAND),
})


export const ReplanRequestSchema = CommandMessageEnvelopeSchema.extend({
    type: z.literal("replan.request"),
    payload: z.object({
        replan_reason: z.string(),
    }),
})
export type ReplanRequestMessage = z.infer<typeof ReplanRequestSchema>;

export const SessionStartSchema = CommandMessageEnvelopeSchema.extend({
    type: z.literal("session.start"),
    payload: z.object({
        session_id: z.string().nullable(),
    }),
})
export type SessionStartMessage = z.infer<typeof SessionStartSchema>;


export const DiscoveryAnswerSchema = CommandMessageEnvelopeSchema.extend({
    type: z.literal("discovery.answer"),
    payload: z.object({
        question_id: z.string(),
        selected_option_ids: z.array(z.string()),
        free_text: z.string(),
    }),
})
export type DiscoveryAnswerMessage = z.infer<typeof DiscoveryAnswerSchema>;


export const ProfileConfirmSchema = CommandMessageEnvelopeSchema.extend({
    type: z.literal("profile.confirm"),
    payload: z.object({
        profile_revision: z.number(),
    }),
})
export type ProfileConfirmMessage = z.infer<typeof ProfileConfirmSchema>;


export const ProfileRequestChangesSchema = CommandMessageEnvelopeSchema.extend({
    type: z.literal("profile.request_changes"),
    payload: z.object({
        topics: z.array(z.string()),
        free_text: z.string().optional(),
    }).superRefine((val, ctx) => {
        const topics = val.topics.map((t) => t.trim()).filter(Boolean)
        const note = typeof val.free_text === 'string' ? val.free_text.trim() : ''
        if (topics.length === 0 && note.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Provide at least one topic or a note describing the change.',
            })
        }
        if (typeof val.free_text === 'string' && val.free_text.length > 5000) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['free_text'],
                message: 'free_text is too long',
            })
        }
        for (let i = 0; i < val.topics.length; i++) {
            if (typeof val.topics[i] === 'string' && val.topics[i].trim().length === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['topics', i],
                    message: 'Topic must not be empty',
                })
            }
        }
    }),
})
export type ProfileRequestChangesMessage = z.infer<typeof ProfileRequestChangesSchema>;


export const DecisionRespondSchema = CommandMessageEnvelopeSchema.extend({
    type: z.literal("decision.respond"),
    payload: z.object({
        decision_id: z.string(),
        option_id: z.string(),
    }),
})
export type DecisionRespondMessage = z.infer<typeof DecisionRespondSchema>;


export const RunCancelSchema = CommandMessageEnvelopeSchema.extend({
    type: z.literal("run.cancel"),
    payload: z.object({
        reason: z.string(),
    }),
})
export type RunCancelMessage = z.infer<typeof RunCancelSchema>;


export const SessionCloseSchema = CommandMessageEnvelopeSchema.extend({
    type: z.literal("session.close"),
    payload: z.object({
        reason: z.string(),
    }),
})
export type SessionCloseMessage = z.infer<typeof SessionCloseSchema>;


export const CommandSchemas = [
    SessionStartSchema,
    DiscoveryAnswerSchema,
    ProfileConfirmSchema,
    ProfileRequestChangesSchema,
    DecisionRespondSchema,
    RunCancelSchema,
    SessionCloseSchema,
    ReplanRequestSchema,
] as const;
