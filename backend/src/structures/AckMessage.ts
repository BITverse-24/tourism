import { z } from "zod";
import { RejectionCodes, WorkflowStates } from "./enums";
import { BaseMessageEnvelopeSchema } from "./BaseMessageEnvelope";

const BaseAckMessageSchema = BaseMessageEnvelopeSchema.extend({
    kind: z.literal('ack'),
    workflow_state: z.enum(WorkflowStates),
    sequence: z.number(),
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
    code: z.enum(RejectionCodes),
    message: z.string(),
    retryable: z.boolean(),
    recovery: z.unknown(),
})
export type CommandRejectedMessage = z.infer<typeof CommandRejectedSchema>;

export const AckSchemas = [
    CommandAcceptedSchema,
    CommandRejectedSchema,
] as const

export const AckMessageSchema = z.discriminatedUnion(
    "type",
    [
        ...AckSchemas
    ],
);
export type AckMessage = z.infer<typeof AckMessageSchema>;
