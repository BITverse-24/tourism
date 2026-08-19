import { z } from "zod";
import { EventSchemas } from "./EventMessage";
import { CommandSchemas } from "./CommandMessage";
import { AckSchemas } from "./AckMessage";
import { ErrorSchemas } from "./ErrorMessage";

export const BaseMessageEnvelopeSchema = z.object({
    message_id: z.string(),
    session_id: z.string(),
    run_id: z.string(),
    command_id: z.string(),
    sequence: z.number(),
    occurred_at: z.string(),
});

export const MessageEnvelopeSchema = z.discriminatedUnion(
    "type",
    [
        ...EventSchemas,
        ...CommandSchemas,
        ...AckSchemas,
        ...ErrorSchemas,
    ],
)

export type MessageEnvelope = z.infer<typeof MessageEnvelopeSchema>;
