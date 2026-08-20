import { z } from "zod";
import { EventSchemas } from "./EventMessage";
import { CommandSchemas } from "./CommandMessage";
import { AckSchemas } from "./AckMessage";
import { ErrorSchemas } from "./ErrorMessage";


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
