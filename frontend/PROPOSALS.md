# Proposals

## 1. Make Consultation resilient to planning sequence gaps and decision requests

**Target:**

- `frontend/src/ws/client.ts`
- `frontend/src/screens/Consultation.tsx`
- `frontend/src/ws/decisionPlan.ts`
- `frontend/src/ws/socketTransport.ts`

**Issue:**

The consultation screen can remain in the working state, or eventually show its timeout state, while Agent 2 is blocked on a user decision or while Agent 3 is still generating the final plan. The backend emits `planning.status` heartbeats and `decision.request`, but the frontend can fail to deliver those events to React when there is a sequence gap after the run has already started.

The current sequence recovery only fast-forwards a gap when `expectedSequence === 1`. A missing event in the middle of a run leaves later events buffered indefinitely. In that state, `decision.request` never reaches `Consultation`, and subsequent heartbeats can also be held behind the same gap. The UI then has no liveness signal and eventually reaches the 90-second timeout.

There is a second state-propagation problem: the backend changes its internal workflow state to `decision_required`, but the frontend only promotes its own workflow state when it processes `decision.request`. The `planning.status` fallback in `Consultation` checks for an already-updated client state, so it cannot recover a decision request that has not been delivered.

There is also a transport duplication issue. `SocketTransport` subscribes to both Socket.IO `onAny` and explicit listeners for the same event names. Each server event can therefore enter `WsClient.handleRawMessage` twice. The sequence manager normally drops the duplicate as stale, but this makes sequence-gap behavior and diagnostics harder to reason about and can expose ordering/reconnect races.

**Evidence:**

- `frontend/src/ws/client.ts:646-735` only schedules cold-start recovery when `SequenceManager.getExpected() === 1`; `flushSequenceGap()` returns without action for a mid-run gap.
- `frontend/src/ws/client.ts:1066-1090` attempts to special-case `workflow.state`, `planning.status`, and `decision.request`, but the fallback still depends on sequence state and does not repair a missing sequence in the middle of a run.
- `frontend/src/ws/client.ts:1256-1258` sets `workflowState = "decision_required"` only for `decision.request`; `planning.status` does not update it.
- `frontend/src/screens/Consultation.tsx:83-95` checks `ws.snapshot().workflowState === "decision_required"` after receiving `planning.status`, which is circular when `decision.request` has not been processed.
- `frontend/src/screens/Consultation.tsx:97-120` is the only live-event path that creates `liveDecision`; without it, `activeDecision` remains null and `isWorking` remains true (`:290-292`).
- `frontend/src/screens/Consultation.tsx:307-329` shows the timeout after 90 seconds without a processed sequence event.
- `frontend/src/ws/socketTransport.ts:77-99` registers `onAny`, while `:101-112` registers explicit listeners for the same events.
- Backend context for the frontend contract: `backend/src/agent_tools/CandidateDecision.ts:29-71` sets server state and emits `planning.status` plus `decision.request`; it does not emit a separate `workflow.state` event. `backend/src/services/ProfileServices.ts:94-131` emits planning heartbeats every three seconds while Agent 2 and Agent 3 run.

**Suggested change:**

### A. Repair sequence gaps without weakening stale-event protection

Update the sequence-handling design in `frontend/src/ws/client.ts` so a missing sequence cannot permanently block lifecycle-critical events.

Recommended behavior:

1. Keep strict ordering for ordinary snapshots and lifecycle events when the next sequence is available.
2. When an event is offered with a sequence greater than the expected sequence, start a bounded gap timer regardless of whether the expected sequence is `1`.
3. On expiry of that timer, flush buffered envelopes in ascending sequence order and advance the expected sequence to one past the highest flushed sequence. Record a diagnostic containing the missing range, run ID, and flushed event types.
4. Prefer not to delay decision-critical events. If a buffered or newly received envelope is `planning.status`, `workflow.state`, or `decision.request`, deliver it after the bounded grace period even when an earlier non-critical sequence is missing. Preserve deduplication by dropping envelopes whose sequence is below the current expected sequence or whose message ID has already been processed.
5. Ensure a later ordinary event cannot reset or cancel the gap timer while the gap remains unresolved. The current `ordered.length > 0` logic should be reviewed for this case.
6. Keep run boundaries isolated. Reset the sequence manager only when the `run_id` actually changes or an authoritative `session.ready` establishes a new run; do not reset it merely because a later event arrived out of order.
7. Expose enough sequence diagnostics for tests and debugging: expected sequence, buffered sequences, gap start, and whether a gap flush occurred.

Do not blindly accept every future event forever. The recovery must be bounded and must continue to reject stale duplicates. Use one documented grace interval and test it with fake timers if a test runner is added.

### B. Make `decision_required` a first-class client state transition

Update the event reducer/dispatch path so `planning.status` with `payload.phase === "decision_required"` promotes the client workflow state to `decision_required`, even if `decision.request` has not arrived yet. This should be done in the central WebSocket client/state layer, not only inside the screen.

Then update `Consultation` so the decision-required visual state is based on a durable decision state, not solely on a transient `liveDecision` React value:

1. Store the latest validated decision request in `decisionPlanState`.
2. Treat `decisionPlanState.workflowState === "decision_required"` as the paused workflow state.
3. Render the decision surface only when a usable decision payload exists, but pause the timeout whenever the workflow state is `decision_required`.
4. If `planning.status` says `decision_required` before `decision.request` arrives, keep the orb alive and continue waiting for the request; do not show `Try again`.
5. Once `decision.request` is processed, atomically update the plan state and the rendered decision. Avoid relying on `queueMicrotask` to bridge two independent React state updates if a single derived state can be used.
6. On a successful response, transition the local state back to `planning` only after the response has been accepted/sent according to the existing command contract. Preserve stale-decision protection.

The frontend should not invent a separate event named `decision_required`; the current backend contract uses `planning.status` with `phase: "decision_required"` and `decision.request`. Document that mapping in the code comments.

### C. Normalize and validate decision payloads consistently

Review `frontend/src/ws/decisionPlan.ts:238-300` against the backend/AI contract. The AI can produce `material_tradeoff`, `hard_constraint_conflict`, or `missing_preference`, while the frontend currently requires only `material_tradeoff`.

Choose one contract-compatible approach and apply it consistently:

- either accept the complete allowed reason union in the frontend type and validator;
- or explicitly normalize all permitted backend reasons to the UI’s display category while preserving the original reason only if it is not used for rendering or command validation.

Do not bypass validation for arbitrary payloads merely to make the panel appear. If a compatibility fallback remains in `Consultation`, it must validate the required display fields (`decision_id`, non-empty `prompt`, and a non-empty array of options with `option_id`, `label`, and `tradeoff`) and must log/diagnose the rejected contract field without exposing hidden reasoning.

Also support the exact envelope shape emitted by the backend. If transport compatibility requires accepting a nested `{ payload: ... }` wrapper, unwrap it once in a shared parser and test that parser; do not maintain separate ad hoc normalization in the screen.

### D. Remove duplicate Socket.IO delivery

Make `SocketTransport` use one event-ingress mechanism. Prefer `onAny` because the backend emits dynamic envelope event names, or retain explicit listeners only if `onAny` is unavailable. Do not register both for the same event.

Verify that:

- one server envelope produces one `WsClient.handleRawMessage` call;
- duplicate server deliveries are still harmless through message/sequence deduplication;
- reconnects do not leave old listeners attached;
- acknowledgements and events continue to be received for both known and forward-compatible event types.

### E. Keep timeout semantics tied to workflow state and connection health

Review `Consultation.tsx:307-329` after the state changes:

- pause the idle timeout while the client is connected and workflow state is `planning` or `decision_required`;
- continue to update liveness from accepted `planning.status`, `workflow.state`, `decision.request`, and relevant workflow events;
- only show `Try again` when the connection is actually lost or no server event has been accepted beyond a clearly documented recovery deadline;
- never show the timeout while a decision is visibly pending or while the client has received `phase: decision_required` and is waiting for its request payload;
- preserve the cancel action and do not make timeout suppression hide genuine connection failures.

The timeout should be a connection/recovery fallback, not a proxy for Agent 2 or Agent 3 completion. Agent 3 runs after Agent 2 completes, so the UI must remain in the working state during both stages and in the decision state while Agent 2 is paused.

**Tests/verification required:**

Add or extend frontend unit/integration coverage for the following cases. Tests may use a fake transport and direct `WsClient.handleEnvelope()` calls; they should not require a live backend.

1. `planning.status` with `phase: "decision_required"` changes the client workflow state and pauses the consultation timeout.
2. A valid `decision.request` immediately renders the decision surface with the prompt and all options.
3. A `decision.request` whose reason is `hard_constraint_conflict` or `missing_preference` is handled according to the selected compatible reason policy.
4. A decision request arriving after an earlier sequence was missed is delivered after the bounded gap recovery period rather than remaining buffered forever.
5. A heartbeat arriving after a mid-run gap cannot cause the decision request to be lost or keep the gap timer permanently stuck.
6. A stale duplicate envelope is processed at most once.
7. A single Socket.IO server emission produces one client callback even though the event name is both known and dynamically emitted.
8. A decision request followed by `decision.respond` returns local state to `planning` and does not leave the timeout paused forever.
9. Agent 2/3 silence shorter than the configured recovery deadline does not show `Try again` when the connection and workflow state are healthy.
10. A genuine disconnect or exhausted recovery deadline still produces the timeout/retry affordance.
11. Existing plan/profile snapshot ordering and stale-revision behavior remain unchanged.

Run `npm run build` in `frontend/` after the implementation. If tests are introduced, run them separately and include a regression test for the sequence manager rather than relying only on the rendered screen test.

**Reason:**

The observed UI failure is caused by a frontend delivery/state deadlock, not by Agent 3 finishing early. A lost mid-run sequence can hold both heartbeats and `decision.request`; the screen then cannot distinguish “Agent is still working” from “the event pipeline is blocked.” Making sequence recovery bounded, promoting `decision_required` centrally, and removing duplicate transport delivery restores the intended workflow without weakening stale-event or decision validation.

**Impact:**

- Frontend WebSocket ordering and transport behavior change.
- Consultation state rendering becomes resilient to delayed/out-of-order decision events.
- Decision reason compatibility must be coordinated with the backend/AI contract; do not change backend files as part of this frontend proposal unless a separate owner approves that scope.
- The implementation should remain backward-compatible with existing `planning.status`, `decision.request`, `workflow.state`, and Socket.IO envelope shapes.
