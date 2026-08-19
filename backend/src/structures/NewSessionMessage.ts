import { z } from "zod";

export const NewSessionMessageSchema = z.object({
    message_id: z.string(),
    kind: z.literal("command"),
    type: z.literal("session.start"),
    occurred_at: z.string(),
    payload: z.object({ session_id: z.string().nullable().optional() })
})

export type NewSessionMessage = z.infer<typeof NewSessionMessageSchema>;
