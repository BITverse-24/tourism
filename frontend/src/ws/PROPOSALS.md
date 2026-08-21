# Proposals — Discovery Question Not Displayed After Arrival Intent

Selected writable directory for this task: `src/ws/` (frontend WebSocket discovery/profile layer). This file records the concrete change that should be applied (and the related backend contract clarification) based on investigation of the reported arrival → discovery deadlock.

## 1. Fix SequenceManager Cold-Start Gap Deadlock (Frontend — Primary Fix)

**Target:** `frontend/src/ws/client.ts` — `SequenceManager` (lines 313-367) and `WsClient.handleRawMessage` / `WsClient.handleSessionReady` / `WsClient.startRun` (lines 590-634, 855-925)

**Issue:** Frontend never renders `discovery.question` `srinagar_dates_duration` after `arrival` → `session.start`. Backend correctly emits `profile.snapshot` seq 4 and `discovery.question` seq 5, but UI stays on the busy sphere in `Discovery` (`isInitialWaiting`).

**Evidence:**
- Backend logs (provided in task) for `sess_942e... / run_e72c... / cmd_ee48...`:
  - `profile.snapshot` `sequence:4` `revision:2`
  - `discovery.question` `sequence:5` `question_id:srinagar_dates_duration`
- `WsClient.SequenceManager` starts `expected=1` on every new `run_id` via `startRun(runId)` and `handleSessionReady`. `handleRawMessage` does `if (env.run_id && env.run_id !== runId) startRun(...)` then `seq.offer(env)`. `offer` buffers any `seq > expected` until the gap fills (`buffer.set(seq, env); return []`). With `expected=1` and first observed envelopes at 4/5, both are buffered forever. `handleEvent` → `listeners` (`useDiscovery` → `Discovery`) is never invoked.
- `useDiscovery` [src/hooks/useDiscovery.ts:78] and `WsProvider` [src/ws/WsProvider.tsx:116] only receive envelopes after `seq.offer` ordering, so they also never see seq 4/5.
- `Arrival.tsx:37` calls `ws.sendSessionStart(trimmed)` then navigates to `/discovery`; `App.tsx:DiscoveryRoute` shows mock only when `!connected`; with socket `open` but no question delivered, `effectiveQuestion` stays `null` → `Discovery.tsx:498` `isInitialWaiting` true indefinitely.
- Reproduction: connect, send `session.start` with `initial_intent:"Srinagar"`, observe raw socket frames seq 4/5 buffered, `WsClient.getSequenceManager().getExpected()===1`, `buffer.size===2`, `Discovery` props remain null. Existing `PROPOSALS.md` at frontend root is unrelated design note, not a fix.

**Suggested change (best option — cold-start fast-forward + grace timeout, minimal diff):**

1. In `SequenceManager`, add:
   - `hasPending(): boolean` already exists — add `getBufferedSequences(): number[]` for diagnostics and `flushWithGap(): Envelope[]` that returns buffered envelopes sorted by sequence when gap is deemed unrecoverable.
   - Optionally expose `getExpected()` mutation via `fastForwardTo(seq: number)`.

2. In `WsClient.handleRawMessage`, after `if (env.run_id !== runId) startRun(...)`, before `seq.offer`, detect cold-start gap:
   ```ts
   // cold-start: first envelope(s) for a new run arrived with seq > 1 and expected still 1
   // means server's counter is session-global or 1-3 were lost before subscription.
   // Don't deadlock — fast-forward expected to the smallest buffered seq after a short grace.
   ```
   Implementation:
   - On `startRun`, record `runStartAt = Date.now()`.
   - In `handleRawMessage`, if `env.sequence != null && this.seq.getExpected() === 1 && env.sequence > 1`:
     - Buffer via `seq.offer(env)` as today, then schedule a one-shot timer (e.g. 400–600 ms, `runStartAt` + 500 ms) that checks `if (seq.getExpected() === 1 && seq.hasPending()) { const flushed = seq.flushWithGap(); for (const o of flushed) routeToHandler(o); }`.
     - Alternative immediate path for discovery-critical events: if `env.type === 'discovery.question' || env.type === 'profile.snapshot'` and gap persists for > 400 ms, deliver regardless of missing 1–3 (they are `session.ready` / `command.accepted` which `WsProvider` can recover from via `recoveryState`).
   - `flushWithGap` should set `expected = maxBufferedSeq + 1` and clear buffer, preserving order (4 then 5). Stale check (`seq < expected`) already drops true duplicates.

3. Alternatively, if server contract is clarified to be per-run starting at 1 (see proposal 2), change `startRun` to not assume `1` when first envelope is `>1` — set `expected = env.sequence` and deliver immediately. Grace timer still covers races where 1 arrives slightly later (then it will be dropped as stale, which is acceptable because `session.ready` state is also conveyed via `WsProvider` recovery).

Keep `validateAnswer` / `parseDiscoveryQuestion` unchanged. No changes to `Discovery.tsx` live-mode wiring except it will now receive `question` and clear `isInitialWaiting`.

**Reason:** Contract says “sequence ordering per run starting at 1, buffer out-of-order, drop stale.” Current code implements strict buffering with no recovery, so any lost or not-yet-routed `seq 1-3` (e.g., `session.ready` emitted as `session.ready` event that `SocketTransport.onAny` double-handles or not yet subscribed, or `command.accepted` ack not observed) deadlocks discovery. The arrival flow is the first user-visible interaction, so deadlock is always seen on first intent.

**Impact:**
- `src/ws/client.ts` only; `useDiscovery`, `WsProvider`, `Discovery`, `Arrival`, `App` unchanged behaviorally — they simply start receiving events.
- Backward compatible: if server later correctly sends 1,2,3,4,5 in order, `offer` delivers immediately (no timer fires). If out-of-order 5 then 4, buffer still drains in order 4→5 after 4 arrives or after timeout in order.
- Diagnostic: add `wsLogger.debug` when fast-forwarding (“sequence gap fast-forward expected 1 → 4 after 500ms, flushing 2 buffered envelopes”) so future backend sequence bugs are visible.
- Tests: add unit test for `SequenceManager` cold-start gap and `WsClient.handleRawMessage` with `run_e72...` seq 4/5 as first messages — assert `discovery.question` delivered and `profileStore` applied (revision 2 beats initial 0).
- No change to `PROPOSALS.md` at frontend root; no new dependencies.

## 2. Clarify / Align Backend Sequence Contract (Backend — Outside Writable Directory)

**Target:** `backend` (or equivalent) WebSocket envelope emitter — `session.ready`, `command.accepted`, `profile.snapshot`, `discovery.question` sequence generation and `socket.io` emit path. Read-only from this task.

**Issue:** Backend sent `sequence:4` and `sequence:5` as first two observable messages for `run_e72cd9b1-daf4-40b0-9fd3-08e71e36db76`. Frontend `SequenceManager` per docs expects per-run `1,2,3,…`. If backend uses a session-global counter or increments for internal events not forwarded to the client, the client will always see a gap on first arrival.

**Evidence:** Same logs as above; `run_id` is new but `sequence` is 4/5. Earlier sequences 1-3 are not in provided logs and never arrived at the client in this reproduction (whether not emitted, emitted on a different socket.io channel before `onAny` subscription, or filtered by `validateEnvelope`).

**Suggested change (to be handled by backend owner):**
- Document whether `sequence` is per-`run_id` (must reset to 1 on `session.ready` for new run) or per-`session_id` (then client must track per-session, not per-run). Implement consistently.
- Ensure `session.ready` is always the first `sequence:1` envelope for a new run and is emitted via the same `socket.emit(envelope.type, envelope)` path that `SocketTransport` `onAny` + explicit `socket.on(ev)` listeners cover, so it participates in ordering and is not lost before client subscribes.
- If session-global counter is intentional, update `docs/WEBSOCKET_CONTRACT.md` to state that and adjust frontend `SequenceManager` to track per-session instead of resetting on `run_id`; otherwise fix backend to reset per run.

**Reason:** Even with frontend fast-forward fix, aligning contract prevents reliance on timeout fallback and makes ordering deterministic for `profile.ready` / `decision.request` / `plan.snapshot` later in the flow.

**Impact:** Backend change only; frontend fast-forward remains as resilience. Requires updating `WEBSOCKET_CONTRACT.md` if counter semantics change and verifying `WsClient.startRun` vs `handleSessionReady` reset logic matches.

## 3. No Change to Discovery Validation / Mock Fallback

**Target:** `src/ws/discovery.ts`, `src/hooks/useMockFallback.ts`, `src/screens/Discovery.tsx`

**Issue:** None — `parseDiscoveryQuestion`, `validateAnswer`, `free_text_mode:optional`, and mock fallback (`allowMock` only when `wsFailedAtStart && !connected`) are correct. The bug is not schema validation but delivery.

**Suggested change:** None. Keep `useDiscovery` `lastSequenceRef` stale guard and `Discovery` `isInitialWaiting` busy overlay as-is; they will correctly clear once proposal 1 is applied.

**Reason / Impact:** Avoids unnecessary churn; preserves server-authoritative, forward-only discovery flow and the 1.5 s mock-fallback window in `WsProvider`.

---
*Verification for proposal 1 (to be run after implementation by owner of `src/ws/`):*
- `npm run build` (tsc + vite) passes.
- Unit: `WsClient` cold-start test with envelopes seq 4 (`profile.snapshot`) and seq 5 (`discovery.question`) as first messages → both delivered, `question_id==="srinagar_dates_duration"`, `profile revision 2` stored.
- Manual: `vite --port 3000 --host` with backend at `WS_URL` (or `VITE_WS_URL`), submit “Srinagar” on Arrival, assert navigation to `/discovery` and prompt “When are you planning to visit Srinagar…” with 4 options and free-text placeholder visible within ~600 ms, not indefinite spinner.
