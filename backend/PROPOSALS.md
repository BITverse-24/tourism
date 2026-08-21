# Proposals — Frontend intent not sent with session.start (2026-08-21)

## Target
`frontend/src/screens/Arrival.tsx`, `frontend/src/ws/WsProvider.tsx`, `backend/src/structures/NewSessionMessage.ts`

## Issue
User typed "Kashmir" on the initial trip plan screen, but backend log shows `payload:{session_id:null}`, `profile:null`, `answer:null` and generates generic question `Where are you planning to travel...` with `destination_request:null`. `Arrival.tsx` does `setIntent(trimmed)` (local) and `ws.sendSessionStart()` with only `session_id`. The intent never leaves the client, so `backend/src/services/SessionServices.ts` → `backend/src/services/DiscoveryServices.ts:newDiscoveryQuestionService` is called with `profile=null, answer=null` and cannot seed the traveler profile.

## Evidence
- Backend log at `13:08:18.897` `session.start payload:{session_id:null}` and at `13:08:33.443` `profile.trip_context.destination_request:null` despite UI input "Kashmir".
- `frontend/src/screens/Arrival.tsx:32-36` stores intent via `useAppState` but `WsProvider.sendSessionStart` (`frontend/src/ws/WsProvider.tsx:188`) builds envelope `payload:{session_id}` only.
- `backend/src/structures/NewSessionMessage.ts:9` only validates `payload.session_id`, so even if frontend added `initial_intent` it would be stripped.

## Suggested change (pick one contract option)
**Option A — carry intent in session.start (minimal):**
```ts
// frontend/src/screens/Arrival.tsx
ws?.sendSessionStart(trimmed) // pass intent
// frontend/src/ws/WsProvider.tsx
sendSessionStart(intent?: string | null) { 
  const stored = getStoredSessionId()
  const payload: Record<string, unknown> = { session_id: stored ?? null, ...(intent ? { initial_intent: intent } : {}) }
  client.sendSessionStart(stored ?? null, command_id, payload) // adapt WsClient to accept payload override
}
// backend/src/structures/NewSessionMessage.ts
payload: z.object({ session_id: z.string().nullable().optional(), initial_intent: z.string().optional() })
// backend/src/services/SessionServices.ts
const initialIntent = (data as any).payload?.initial_intent as string | undefined
await newDiscoveryQuestionService(..., profile=null, answer= initialIntent ? { question_id:"destination", selected_option_ids:[], free_text:initialIntent } as any : null)
```
**Option B — send discovery.answer after session.ready:**
Keep `session.start` as is, but in `frontend/src/screens/Discovery.tsx` or `frontend/src/hooks/useDiscovery.ts` after `session.ready` auto-send `discovery.answer {question_id:"destination", free_text:"Kashmir"}`.

Option A is preferred for E2E manual flow (one click).

## Reason
Without intent, first discovery question is always generic and loses user context. E2E manual testing expects "Kashmir" to influence the generated profile/snapshot.

## Impact
- Frontend owner must update `WsProvider` and `Arrival`.
- Backend owner must widen `NewSessionMessageSchema` (forward-compatible, unknown fields currently ignored by Zod strict? Check `z.object` stripping).
- No breaking change to existing clients sending only `session_id`.

## Secondary
The backend fixes already applied in `backend/src/handlers/SessionHandlers.ts` (avoid `nextSequence(undefined)`) and `backend/src/services/SessionServices.ts` (`await newDiscoveryQuestionService`) should be retained. They ensure `command.accepted` does not pollute `SequenceNumbers["undefined"]` and that `profile.snapshot(2)`/`discovery.question(3)` are emitted before `service completed`, avoiding 15s buffered race observed in the log.

---

# Proposals — Frontend sequence cold-start gap (still open)

## Target
`../frontend/src/ws/client.ts` — `SequenceManager` / `handleRawMessage`

## Issue
Even with monotonic profile revisions fixed on the backend, if the client resets `expected=1` and first delivered envelopes for a run are e.g. seq 10–11 (`profile.snapshot` / `profile.ready`), those events buffer forever unless a gap flush runs. That independently leaves ProfileReview with a stale snapshot vs `profile.ready`.

## Evidence
Contract 1.0 Analysis: window `sess_f28cfa31` seq 10–11; `frontend/src/ws/PROPOSALS.md` documents the same deadlock for seq 4/5.

## Suggested change
Schedule `scheduleSequenceGapFlush()` after every `offer` that buffers while `expected===1 && smallestBuffered>1`, then `flushWithGap()` after ~500ms grace. Also allow same-revision draft→ready promotion in `SnapshotStore` / `useWs` as defense-in-depth (backend now bumps revision on state change, so this is optional resilience).

## Reason
Backend cannot force the client to process out-of-order sequence gaps once early envelopes were missed before subscribe.

## Impact
Frontend-only; backend recovery now emits latest snapshot + `profile.ready` (not full history) to keep new-run sequences short.
