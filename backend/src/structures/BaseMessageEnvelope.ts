import { z } from "zod";

export const BaseMessageEnvelopeSchema = z.object({
    message_id: z.string(),
    session_id: z.string(),
    run_id: z.string(),
    command_id: z.string(),
    occurred_at: z.string(),
});
export type BaseMessageEnvelope = z.infer<typeof BaseMessageEnvelopeSchema>;
