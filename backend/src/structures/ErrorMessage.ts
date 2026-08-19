import { z } from "zod";
import { BaseMessageEnvelopeSchema } from "./MessageEnvelope";

const BaseErrorMessageSchema = BaseMessageEnvelopeSchema.extend({
    kind: z.literal('error'),
    sequence: z.number(),
})

export const ErrorMessageSchema = BaseErrorMessageSchema.extend({
    type: z.literal('error'),
    code: z.string(), //todo: check for valid code
    message: z.string(),
    retryable: z.boolean(),
})
export type ErrorMessage = z.infer<typeof ErrorMessageSchema>;

export const ErrorSchemas = [
    ErrorMessageSchema,
] as const;
