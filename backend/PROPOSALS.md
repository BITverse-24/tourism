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

---

# Proposals — Agent 1 discovery: question count off-by-one + Gemini 400 fallback (2026-08-21)

## Target
`backend/src/services/SessionServices.ts` (already fixed), `../ai/discovery.ts`

## Issue 1 — Off-by-one provisional count
`SessionServices.sessionStartService` emitted a provisional `DiscoveryQuestion` and did `addDiscoveryQuestion(runId, provisionalQ)` **before** calling `newDiscoveryQuestionService` in background. `DiscoveryServices.newDiscoveryQuestionService` then computed `questions_asked_count = getDiscoveryQuestionCount(runId)` which was `1` for the first agent refinement (answer `null`, profile seeded with `destination_request`). The log for `Honeymoon in Srinagar` showed `questions_asked_count:1, prior_questions:["Tell us more about your trip to Honeymoon in Srinagar — ..."]` before any traveler answer. The first agent turn should see `0` / empty prior (provisional is a UI placeholder, not an agent question). Otherwise the 5–15 enforcement is off by one and prior deduplication is misleading.

**Evidence**
- Log 2026-08-21T15:48:58.647Z `starting service for new discovery question` with `answer:null, profile.destination_request:"Honeymoon in Srinagar"` and 2026-08-21T15:48:58.648Z `calling agent 1` with `questions_asked_count:1, prior_questions:[provisional]` before any answer.
- `SessionServices.ts:127` `addDiscoveryQuestion` preceded `void newDiscoveryQuestionService` (lines 131-138).

**Suggested change / Implemented**
- **Implemented in `backend/src/services/SessionServices.ts` this task:** Move `addDiscoveryQuestion` to **after** the `void newDiscoveryQuestionService` call so the background agent sees `count 0 / prior []`. The provisional is still stored for future `discoveryAnswerService` calls (they will see `count 1` after the traveler answers it). See diff: emit `qMsg`, capture `provisionalEpoch`, `void newDiscoveryQuestionService(...)`, then `addDiscoveryQuestion(newRunId, provisionalQ)`.
- `DiscoveryServices.ts` already correctly forwards `questions_asked_count` and `prior_questions` from `DiscoveryQuestions[runId]` — no further change needed there. `ai/discovery.ts` already handles `questions_asked_count` as authoritative when present.

## Issue 2 — Gemini 400 INVALID_ARGUMENT does not fallback
`ai/discovery.ts:processDiscovery` tries models in `MODEL_HIERARCHY` (`gemini-3.6-flash`, `gemini-3.5-flash`, ...) but only falls back to the next model on **rate-limit (429)**. A `400 INVALID_ARGUMENT` (e.g., model name not available in the API, or `thinkingConfig: {thinkingBudget:0}` rejected for that model) throws `DiscoveryApiError` immediately without trying the next model, causing `background newDiscoveryQuestionService failed` and leaving only the provisional question. Log showed `Request contains an invalid argument` for `gemini-3.6-flash` with `thinkingBudget:0`.

**Evidence**
- Log 2026-08-21T15:48:59.573Z `DiscoveryApiError: Gemini request failed: {"error":{"code":400,"message":"Request contains an invalid argument."}}` for `gemini-3.6-flash` with `thinkingConfig: {thinkingBudget:0}`. No fallback to `gemini-3.5-flash`/`gemma-4-31b-it` attempted.
- `ai/discovery.ts:1852-1860` only `if (isRateLimited && hasNextModel) break` to next model; `400` goes to `throw new DiscoveryApiError(...)` at line 1870.

**Suggested change (for `../ai/discovery.ts` owner)**
- Treat `400` with `INVALID_ARGUMENT` / `model not found` / `invalid argument` as retriable for model fallback as well (at least for the model loop, not the per-attempt retry):
  ```ts
  const isInvalidModel = error?.status === 400 && /invalid argument|model.*not found|not supported/i.test(error?.message ?? "");
  if ((isRateLimited || isInvalidModel) && hasNextModel) {
    lastRateLimitError = error;
    await wait(Math.min(rateLimitDelayMs(error?.message ?? ""), 2000));
    break; // try next model in hierarchy
  }
  ```
- Optionally validate `thinkingBudget` field name per Gemini API version (`thinkingBudget` vs `thinking_budget`) and ensure `responseJsonSchema` is only sent for models that support it. Keep `thinkingBudget:0` for Agent 1 (no reasoning) as documented.
- Keep `backend/src/app/config.ts` documentation that `AGENT_REASONING_EFFORT` is for Agent 2 only, and ensure `backend/src/services/DiscoveryServices.ts:loadDiscoveryOptions` continues to omit it for Agent 1 (already done).

## Reason
Accurate count ensures 5–15 interview length is enforced from the first turn, and fallback ensures a single invalid-model 400 does not kill discovery when the hierarchy contains a valid fallback.

## Impact
- Backend count fix: single reorder in `SessionServices.ts`, no API change.
- AI fallback fix: small error-handling change in `ai/discovery.ts`; no prompt/schema change.


---

# Proposals — Consultation timeout + silent planning failure (2026-08-22)

## Selected writable directory for this task
`backend/` — all changes below outside `backend/` are proposals only, not applied.

## Target 1 — Frontend consultation idle timeout
`frontend/src/screens/Consultation.tsx:402-419`

**Issue:** Consultation arms a 12s idle timer (`if (diff>=12000) setTimedOut(true)`) that resets only on `envelope.sequence` or `agent.lifecycle`/`planning.status`/`decision.request`. `backend/src/services/ProfileServices.ts` previously emitted only one `workflow.state` then blocked 20-40s inside `await processCandidateDesign()` + `await processNarrative()` with zero interim events, so frontend deterministically shows “Consultation paused. You can try again.” even when backend is healthy. User report for Mumbai 5-day family trip (rev 14 → 15) hit this exactly.

**Evidence:** Frontend snippet `frontend/src/screens/Consultation.tsx:402` + `useLiveConsultation` at `168`; backend `ProfileServices.ts:52-69` emitted `workflow.state=planning` and no `planning.status` heartbeat before fix.

**Suggested change (for frontend owner):**
- Increase timeout from 12s to 45-60s, OR make it conditional: while `connected && workflow_state==='planning'` suppress timeout / show “Consulting — …” without Try Again.
- Alternatively consume `planning.status` heartbeats (now emitted by backend every 4s) as reset source — already wired to `liveLastSeq` via `envelope.sequence`.

**Reason:** `agent_timeout_ms` is 120s (`backend/src/app/config.ts:14`); 12s < LLM tool-loop is a guaranteed false timeout.

**Impact:** Frontend-only.

## Target 2 — AI candidate-design attraction grounding
`ai/candidate-design.ts:1166-1174`

**Issue:** `executeTool` for `query_attractions` increments `retrieved_rows` but the lines that populate `state.known_attractions` are commented out:
```ts
// for (const attraction of result.attractions) { validateAttractionRecord(...); state.known_attractions.set(...) }
```
`get_attractions_by_ids` correctly populates the map, but the cheap `query_attractions` path (used by Agent 2 for Mumbai `SELECT ... WHERE city_id='mumbai_maharashtra' LIMIT 30`) never registers attractions. Legacy `ask_user_decision` check at `ai/candidate-design.ts:90` then always returns `{code:"unknown_attraction"}` and `validateCandidate` cannot enforce grounding.

**Suggested change (for ai owner):**
Uncomment/populate:
```ts
for (const attraction of result.attractions) { validateAttractionRecord(attraction, (attraction as any).city_id ?? cityId); state.known_attractions.set(attraction.attraction_id, attraction as any); }
```
Validate against `attraction.city_id` from row (query may already filter by city_id).

**Reason:** Without this, trade-off tool is broken for the common retrieval path.

**Impact:** `ai/` only; backend change in `backend/src/services/ProfileServices.ts` now also forwards real `dataset_revisions` from `CandidateDesignResult` instead of hardcoded `{city:"HUH", attraction:"HUUH"}`.

## Target 3 — Frontend decision vs. heartbeat interaction
`frontend/src/screens/Consultation.tsx:405` already disables timeout during `isDecisionRequired || isResuming` — no change needed, but verify heartbeat does not overwrite decision_required state.

## What was fixed in `backend/` this task
`backend/src/services/ProfileServices.ts`:
- emits initial `planning.status` (RUNNING, DESTINATION_DESIGN, progress 10) immediately after `workflow.state=planning` to reset consultation timer;
- starts 4s heartbeat emitting `planning.status` (RUNNING) for DESTINATION_DESIGN then EXPLANATION phases;
- wraps `processCandidateDesign` + `processNarrative` in try/catch; on error emits `planning.status` FAILED + `error` event (`code: planning_failed`, `retryable:true`) and logs via `serializeError` instead of bubbling as `unhandledRejection` which previously killed server per `backend/src/app/Server.ts:104`;
- emits COMPLETED `planning.status` and forwards real `dataset_revisions` on success.

