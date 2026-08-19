import { z } from "zod";
import { BaseMessageEnvelopeSchema } from "./MessageEnvelope";
import { RejectionCode, WorkflowStates } from "./enums";

const BaseAckMessageSchema = BaseMessageEnvelopeSchema.extend({
    kind: z.literal('ack'),
    workflow_state: z.enum(WorkflowStates),
})

export const CommandAcceptedSchema = BaseAckMessageSchema.extend({
    type: z.literal('command.accepted'),
    accepted: z.literal(true),
    deduplicated: z.boolean(),
})
export type CommandAcceptedMessage = z.infer<typeof CommandAcceptedSchema>;

export const CommandRejectedSchema = BaseAckMessageSchema.extend({
    type: z.literal('command.rejected'),
    accepted: z.literal(false),
    code: z.enum(RejectionCode),
    message: z.string(),
    retryable: z.boolean(),
    recovery: z.record(z.string(), z.unknown()),
})
export type CommandRejectedMessage = z.infer<typeof CommandRejectedSchema>;


export const AckSchemas = [
    CommandAcceptedSchema,
    CommandRejectedSchema,
] as const
