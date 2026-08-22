# Proposals

## 1. Wire `profile.request_changes` to Agent 1 targeted discovery

**Target (implement in this directory):**

- `backend/src/services/ProfileServices.ts` (`profileRequestChangesService`)
- `backend/src/handlers/ProfileHandlers.ts` (`profileRequestChangesHandler`)
- `backend/src/structures/CommandMessage.ts` (`ProfileRequestChangesSchema`)
- `backend/src/services/DiscoveryServices.ts` (`newDiscoveryQuestionService`, `discoveryAnswerService`, `emitProfileSnapshotAndMaybeReady`)
- `backend/src/models/data.ts` (session-scoped change-request context)
- `backend/src/factory/Event.ts` (extract `workflow.state` factory used by confirm)
- `backend/src/handlers/ProfileHandlers.ts` session-aware emit (copy confirm handler)

**Target (do not implement from a backend-only task; required companion work):**

- `../ai/discovery.ts` — `DiscoveryInput`, system prompt, `buildUserMessage`, coverage/finish policy
- `../frontend/src/screens/ProfileReview.tsx` — wait for `discovery.question` / `workflow.state` instead of a 300 ms navigate
- `../frontend/src/ws/WsProvider.tsx` — optionally treat ack `workflow_state === "discovery"` the same way it already treats `"planning"`
- `../docs/WEBSOCKET_CONTRACT.md` — optional `free_text`; document change-request event order

**Issue:**

The review screen already sends a real `profile.request_changes` command. The backend already accepts it in `profile_review`. Agent 1 (`processDiscovery` in `ai/discovery.ts`) already produces the next `discovery.question` and a merged profile. Those three pieces are not connected.

`profileRequestChangesService` is a stub: it invents a fake question, pretends the traveler already answered it, never passes `topics` to Agent 1, never emits `workflow.state`, and can immediately bounce the session back to profile review because Agent 1’s 5–15-question finish policy still thinks discovery is complete.

**Evidence (current end-to-end):**

### Frontend already sends the contract command

`frontend/src/screens/ProfileReview.tsx` (`doRequestChanges`, ~230–251):

1. Requires at least one non-empty topic **or** a non-empty note.
2. Calls `ws.sendProfileRequestChanges(topicsTrimmed, freeTextTrimmed || undefined)`.
3. On local validation/send success, waits **300 ms**, closes the editor, and `navigate('/discovery')`.
4. Does **not** wait for `command.accepted`, `workflow.state`, or `discovery.question`.
5. Does **not** handle `command.rejected` (unlike Confirm, which correlates `command_id`).

`frontend/src/ws/useWs.ts` (`sendProfileRequestChanges`, ~252–273):

- Payload: `{ topics: string[] }` plus `free_text` **only if non-empty**.
- Uses `client.sendCommand('profile.request_changes', payload)`.
- Omitting `free_text` is intentional and matches `docs/WEBSOCKET_CONTRACT.md` (optional note).

`frontend/src/ws/planning.ts` (`validateProfileRequestChanges` / `buildProfileRequestChangesEnvelope`): same optional `free_text`; empty topics allowed only when `free_text` is present.

Topic chips come from the live profile’s `unknowns[].topic` and `assumptions[].topic`, padded with defaults (`Budget scope`, `Walking tolerance`, `Dates`, `Party size`, `Pace`, `Food preferences`) if fewer than three unique topics.

Design contract (`design/profile-review.md` Implementation Contract): *“On successful request, wait for the next `discovery.question` before leaving this screen.”* The screen currently does not do this.

### Backend stub does not implement targeted discovery

`backend/src/handlers/ProfileHandlers.ts` `profileRequestChangesHandler` (~59–87):

1. `checkBaseCommandRejections` + `ProfileRequestChangesSchema` (workflow must be `profile_review` — already correct in `ValidationServices.isValidCommandForWorkflow`).
2. Emits `command.accepted` **before** the service runs, with `workflow_state: await currentWorkflowState(...)` which is still **`profile_review`**.
3. Calls `profileRequestChangesService` with `(res) => socket.emit(res.event, res.data)` — **not** the session-aware reconnect emitter used by `profileConfirmHandler`.
4. Does not emit `workflow.state`.

`backend/src/services/ProfileServices.ts` `profileRequestChangesService` (~323–360), as of this investigation:

```ts
await setWorkflowState(data.session_id, WorkflowStates.DISCOVERY)
const question = {
  question_id: `req-change_${data.command_id}`,
  prompt: 'Are you okay with this profile',  // TODO
  selection_mode: DiscoveryAnsSelectionModes.SINGLE,
  required: true,
  options: [],
  free_text_mode: DiscoveryFreeTextModes.REQUIRED,
  free_text_placeholder: null,
}
await addDiscoveryQuestion(data.run_id, question)
await newDiscoveryQuestionService(
  emit, data.session_id, data.run_id, data.command_id,
  await getSessionProfile(data.session_id),
  {
    question_id: `req-change_${data.command_id}`,
    question,
    selected_option_ids: [],
    free_text: data.payload.free_text,
  },
)
```

Failures of this stub:

| What happens | Why it is wrong |
|---|---|
| Dummy question is stored via `addDiscoveryQuestion` | Inflates `questions_asked_count` / `prior_questions`. Never emitted as `discovery.question`. Later `discovery.answer` lookup can see a question the UI never showed. |
| Dummy prompt `"Are you okay with this profile"` | Not a targeted follow-up. Not derived from `topics`. |
| Fake `UserAnswer` with traveler `free_text` | Agent 1 treats this as a normal answer to a question that was never asked. `topics` are **never passed**. Topics-only requests send `free_text: undefined` into `UserAnswer.free_text`. |
| `newDiscoveryQuestionService` → `processDiscovery` | Agent 1 has no `change_request` field. Coverage hint `may_finish` is true once depth is met **and** `questions_asked_count >= 5`. A ready profile almost always finishes immediately. |
| If `finished === true` | `emitProfileSnapshotAndMaybeReady` emits `profile.snapshot` (`ready`) + `profile.ready` and `setWorkflowState(PROFILE_REVIEW)`. Traveler never sees discovery. |
| If `finished === false` | A real `discovery.question` may be emitted, but it is chosen by the generic “highest-value unknown” policy, not the requested topics. Anti-loop rules may refuse to re-ask budget/dates/etc. because they are already in the profile. |
| No `workflow.state` event | Frontend `App.tsx` routes on `workflowState`. After last `profile.ready`, client state is `profile_review`. Optimistic `/discovery` navigate is immediately overridden back to `/profile-review`. |
| Ack still says `profile_review` | `WsProvider` only promotes workflow from ack when `payload.workflow_state` is `planning` or `decision_required`. It would not promote `discovery` even if the ack were updated, unless frontend is also changed. Confirm works because it **emits `workflow.state`**. Request-changes must do the same. |
| `socket.emit` not session-aware | Confirm already fixed reconnect by resolving `getSocketIdForSession`. Request-changes still binds the original socket. |
| No try/catch | Confirm wraps Agent 2/3 in error → `planning.status` failed + `error` event. Request-changes can throw and leave workflow stuck in `discovery` with no question. |
| Schema mismatch | `ProfileRequestChangesSchema.payload.free_text` is `z.string()` **required**. Frontend omits `free_text` when the note is empty. Topics-only “Send changes” is rejected as `invalid_envelope`. |

`backend/readme.org` item 4 is checked off (“give request topics to agent 1 somehow”) but the service still contains `?????` / `ToDO` comments. Treat that checklist as stale.

### Agent 1 is implemented, but only for ordinary discovery turns

`ai/discovery.ts`:

- `DiscoveryInput = { profile, answer, questions_asked_count?, prior_questions? }` — **no change-request channel**.
- `DISCOVERY_SYSTEM_PROMPT` first-turn and anti-loop rules: do not re-ask known destination/timing; finish when `coverage_hint.may_finish`.
- `buildCoverageHint`: `may_finish = depthMet && authoritativeCount >= 5`; hard cap path at 15.
- `buildUserMessage` JSON: `{ instructions, profile, answer, coverage_hint, prior_questions, questions_asked_count }`.
- `processDiscovery(input, options)`: one model call, patch merge, returns `{ profile, finished, next_question, completion_reason }`.

`backend/src/services/DiscoveryServices.ts`:

- `discoveryAnswerService`: real traveler answer → `processDiscovery` → `emitProfileSnapshotAndMaybeReady`.
- `newDiscoveryQuestionService`: used for session-start / provisional turns with optional `answer`. The stub reuses this as if request-changes were “another first question.”
- `emitProfileSnapshotAndMaybeReady`: `finished` → snapshot `ready` + `profile.ready` + workflow `profile_review`; else snapshot `draft` + `discovery.question`.

This is the correct **engine**. Request-changes must be a **new input mode**, not a fake answer.

### Frontend routing that the backend must satisfy

`frontend/src/ws/client.ts`:

- `profile.ready` **sets** `this.workflowState = 'profile_review'`.
- Newer `profile.snapshot` with `state === 'draft'` and `revision >= profileReady.profile_revision` **clears** `profileReady`.
- `workflow.state` updates `workflowState` from `payload.workflow_state`.

`frontend/src/ws/WsProvider.tsx`:

- `workflow.state` → React `workflowState` (drives `App.tsx` auto-navigate).
- `command.accepted` only copies workflow when it is `planning` or `decision_required` (and it reads `payload.workflow_state`, while backend acks put `workflow_state` on the **envelope root**, not `payload` — confirm therefore relies on the `workflow.state` **event**, not the ack).

`frontend/src/App.tsx` AppShell effect: if `workflowState` is still `profile_review` and the user is on `/discovery`, it navigates back to `/profile-review`.

`frontend/src/hooks/useDiscovery.ts`: replaces the active question only when a `discovery.question` event arrives (sequence-gated). Discovery UI is empty until that event. Design wants the review screen to wait for that event; backend must still emit it even if the frontend currently navigates early.

Ack `workflow_state` lives at envelope root (`backend/src/factory/Ack.ts`). Do not assume putting `discovery` only on the ack will update `WsProvider`. **Always emit `workflow.state`.**

**Suggested change:**

Implement request-changes as a Controller turn that: validates the command, demotes the profile to draft, tells Agent 1 this is a change request (not a fake Q&A), emits `workflow.state: discovery` then exactly one `discovery.question`, and keeps a session-scoped targeted-discovery flag so later `discovery.answer` turns do not immediately re-finish.

Do **not** invent a new command. Do **not** accept raw profile JSON patches. Do **not** call Agent 2/3.

---

### A. Align the command schema with the frontend and contract

**File:** `backend/src/structures/CommandMessage.ts`

Today:

```ts
payload: z.object({
  topics: z.array(z.string()),
  free_text: z.string(),
})
```

Change to:

```ts
payload: z.object({
  topics: z.array(z.string()),
  free_text: z.string().optional(),
}).superRefine((val, ctx) => {
  const topics = val.topics.map((t) => t.trim()).filter(Boolean)
  const note = typeof val.free_text === 'string' ? val.free_text.trim() : ''
  if (topics.length === 0 && note.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide at least one topic or a note describing the change.',
    })
  }
  if (typeof val.free_text === 'string' && val.free_text.length > 5000) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['free_text'],
      message: 'free_text is too long',
    })
  }
})
```

Also reject empty-string topics inside the array (frontend already trims). Either `.transform` to trimmed topics or refine.

Keep `type: z.literal("profile.request_changes")`. Do not add `profile_revision` unless you also update the frontend; v1 contract payload is only `{ topics, free_text? }`. If you later add optional `profile_revision` for stale-review protection, default to “latest ready revision” when omitted so current clients keep working.

`factory/Command.ts` `createProfileRequestChangesMessage` types will follow the Zod infer; no separate payload factory change beyond types.

---

### B. Handler: accept, transition, session-aware emit, then run the service

**File:** `backend/src/handlers/ProfileHandlers.ts`

Mirror `profileConfirmHandler` emit helper:

```ts
const emitToSession = async (res: ServiceResult) => {
  try {
    const sid = await getSocketIdForSession(data.session_id)
    const cur = sid ? await getSocketById(sid) : null
    const target = cur ?? socket
    target.emit(res.event, res.data)
  } catch {
    try { socket.emit(res.event, res.data) } catch {}
  }
}
```

Recommended order (differs slightly from confirm, which acks first with the *old* state):

1. `checkBaseCommandRejections` (unchanged). On failure, return; do not mutate workflow.
2. Optional extra reject (only if easy and consistent with confirm TODOs): if workflow is not `profile_review` — already handled. Do **not** reject merely because blocking unknowns exist; requesting changes is valid when the proof is incomplete.
3. `bumpDiscoveryEpoch(session_id)` so any in-flight provisional discovery result is dropped (`DiscoveryServices.newDiscoveryQuestionService` already honors epoch).
4. `setWorkflowState(session_id, DISCOVERY)` **before** the ack so `currentWorkflowState` on the ack is `discovery` (nice for logs; frontend still needs the event).
5. Emit `command.accepted` with `workflow_state: discovery`.
6. `await profileRequestChangesService(emitToSession, data)`.
7. Wrap the service in try/catch. On failure: log, emit a sequenced `error` event (`kind: error`, `code: 'discovery_failed'` or reuse existing error shape from confirm’s `planning_failed`), and emit a **deterministic fallback** `discovery.question` so the Discovery screen is never blank (see §F). Do not revert to `profile_review` after a failed agent call; the traveler already left confirm.

Do not block the ack on the LLM. Same as confirm: ack immediately, then stream events. The frontend currently navigates on a timer; the important events are `workflow.state` and `discovery.question` as soon as they exist. Emit `workflow.state` **immediately** at the start of the service (before the LLM) so AppShell routing stops fighting the review screen.

---

### C. Service: real targeted-discovery Controller turn

**File:** `backend/src/services/ProfileServices.ts`

Replace the stub body of `profileRequestChangesService`. Do **not** call `addDiscoveryQuestion` with a dummy question. Do **not** construct a fake `UserAnswer`.

#### C.1 Immediate workflow event (before LLM)

Extract the inline `workflow.state` object from `profileConfirmService` (~55–69) into `factory/Event.ts`, e.g. `createWorkflowStateMessage({ ..., payload: { workflow_state } })`. Confirm already emits a loosely typed object; give it a typed helper and reuse it.

Event order for request-changes:

1. `workflow.state` `{ workflow_state: "discovery" }` — **before** Agent 1.
2. `profile.snapshot` `{ state: "draft", revision: N+1, profile }` — demote ready → draft with a **new** revision (`appendProfileSnapshot`). Same profile object is fine for this first snapshot, except apply the unknown/assumption annotations in §C.2 if you do them server-side. Frontend `client.ts` clears `profileReady` when draft revision ≥ previous ready revision. **Required**, otherwise the review screen still looks “ready to confirm” if they bounce.
3. Agent 1 call (may take seconds).
4. Then either:
   - `profile.snapshot` (newer draft, merged profile) + `discovery.question`, or
   - (rare) `profile.snapshot` ready + `profile.ready` + `workflow.state` `profile_review` only if Agent 1 correctly finished **targeted** discovery (see §E — first change-request turn must almost never finish).

Checkpoint: `appendProfileSnapshot(..., DRAFT, profile, WorkflowStates.DISCOVERY)` already writes recovery `workflow_state`. Keep `SessionWorkflowState` in sync via `setWorkflowState` (already done in handler).

#### C.2 Persist change-request context on the session

**File:** `backend/src/models/data.ts`

Add a small in-memory map, same style as `SessionDiscoveryEpoch`:

```ts
export type ProfileChangeRequestContext = {
  topics: string[]
  free_text: string | null
  source_profile_revision: number
  opened_at_command_id: string
  questions_in_phase: number  // traveler-facing questions asked since this request
}

export function setActiveChangeRequest(session_id: string, ctx: ProfileChangeRequestContext): void
export function getActiveChangeRequest(session_id: string): ProfileChangeRequestContext | null
export function clearActiveChangeRequest(session_id: string): void
export function incrementChangeRequestQuestions(session_id: string): void
```

Set this **before** the Agent 1 call, from:

- `topics`: trimmed, de-duplicated, preserve order.
- `free_text`: trimmed or `null`.
- `source_profile_revision`: latest snapshot revision from checkpoint (`getSessionCheckpoint` / latest `profile_snapshots` revision), not a client-supplied field.
- `questions_in_phase`: `0` until the first emitted `discovery.question` for this phase is stored via `addDiscoveryQuestion`.

Clear the context in `emitProfileSnapshotAndMaybeReady` when `discoveryRes.finished === true` (targeted phase complete → review). Also clear on `run.cancel` / `session.close` if those paths already wipe session maps; if they do not, add clear there so a new run cannot inherit it.

Optional but useful: when opening the phase, add material `unknowns` for each requested topic that is not already an unknown (impact `material`, description from free_text or “Traveler requested changes to {topic}”). That gives Agent 1 a profile-native signal even before the AI contract is updated. Do **not** wipe existing profile fields. Do **not** delete constraints. Provenance: this is a Controller annotation, not a traveler statement; if you add unknowns, do not invent new `hard_constraints`.

#### C.3 Call Agent 1 with a change-request input (not a fake answer)

Until `ai/discovery.ts` is updated, backend still compiles. Use a **compat adapter** so backend can ship first:

**Preferred (after AI update):** extend `DiscoveryInput`:

```ts
export interface ProfileChangeRequest {
  topics: string[]
  free_text: string | null
  source_profile_revision: number
  questions_in_phase: number
}

export interface DiscoveryInput {
  profile: TravelerProfile | null
  answer: UserAnswer | null
  questions_asked_count?: number | null
  prior_questions?: string[] | null
  change_request?: ProfileChangeRequest | null
}
```

First turn of the phase:

```ts
const discoveryInput: DiscoveryInput = {
  profile: await getSessionProfile(session_id),
  answer: null,                    // NOT a fabricated Q&A
  change_request: {
    topics,
    free_text,
    source_profile_revision,
    questions_in_phase: 0,
  },
  questions_asked_count: getDiscoveryQuestionCount(run_id),
  prior_questions: getDiscoveryQuestionPrompts(run_id),
}
```

Call `processDiscovery(discoveryInput, loadDiscoveryOptions())` — same options as `DiscoveryServices.loadDiscoveryOptions()` (no `reasoning_effort` for Agent 1). Prefer **calling a new exported helper** in `DiscoveryServices.ts`, e.g. `targetedDiscoveryTurnService(emit, { session_id, run_id, command_id, change_request })`, rather than duplicating `logAgentCall` / epoch / `setSessionProfile` / `emitProfileSnapshotAndMaybeReady` inside `ProfileServices.ts`. `ProfileServices` should orchestrate workflow + context; `DiscoveryServices` should own Agent 1 I/O.

**Compat if AI is not updated yet:** do **not** keep the dummy question. Temporary adapter (delete once AI lands):

- Keep `answer: null`.
- Prepend a Controller-only note into `prior_questions` **or** a synthetic `profile.unknowns` list (preferred) so the existing prompt at least sees the topics.
- Force `finished` handling: if `processDiscovery` returns `finished: true` on the **opening** change-request turn (`questions_in_phase === 0`), **ignore finish**, keep workflow `discovery`, and emit the fallback question from §F instead of `profile.ready`. Log `change_request_ignored_immediate_finish`. This prevents the bounce-back even with the current 5–15 policy.

Do not pass `free_text` as `UserAnswer.free_text` against a fake prompt. That teaches the model the traveler confirmed the whole profile.

#### C.4 After Agent 1 returns

Reuse `emitProfileSnapshotAndMaybeReady`, with one extra rule:

**Opening turn (`questions_in_phase === 0` and `change_request` active):**

- If `finished === false` and `next_question` is set: `addDiscoveryQuestion`, emit snapshot draft + `discovery.question`, increment `questions_in_phase`. Same as today.
- If `finished === true`: **do not** emit `profile.ready` on the opening turn unless you have a documented exception: the note fully specified every requested topic **and** the model returned an empty `next_question` **and** you still want a one-shot correction without a question. Default: coerce to unfinished + fallback question (§F). Rationale: the UI and design require targeted questions; a silent merge of free_text then `profile.ready` looks like confirm was skipped.

**Later answers in the same phase** (`discoveryAnswerService`): see §D.

Always `setSessionProfile` with the merged profile before emitting snapshots (existing `newDiscoveryQuestionService` behavior).

Epoch: pass `getDiscoveryEpoch(session_id)` into the discovery helper so a second request-changes or an answer during the LLM call drops the stale result (`newDiscoveryQuestionService` already does this).

---

### D. Subsequent `discovery.answer` turns while targeted discovery is active

**File:** `backend/src/services/DiscoveryServices.ts` `discoveryAnswerService`

Today it always passes `{ profile, answer, questions_asked_count, prior_questions }`.

When `getActiveChangeRequest(session_id)` is non-null, also pass `change_request: { ...ctx, questions_in_phase: ctx.questions_in_phase }` (after incrementing when a new question is emitted, not when the answer arrives).

Finish policy for this phase (Controller, even if the model returns `finished: true` too early):

- Do **not** use the original “minimum 5 questions in this run” to block finishing targeted discovery. The traveler already finished that. Requiring 5 more questions is hostile.
- Do **not** allow finish on the opening turn (see C.4).
- Allow finish when **all requested topics are resolved enough for planning** (model `finished: true`) **or** after a small cap (recommend **1–3** traveler-facing questions in `questions_in_phase`, then allow finish even if the model is timid). Cap prevents infinite re-ask of the same chip.
- When finish is accepted: `clearActiveChangeRequest`, then existing `emitProfileSnapshotAndMaybeReady` path (`ready` + `profile.ready` + workflow `profile_review`).
- When finish is rejected: if the model omitted `next_question`, synthesize fallback (§F) from remaining topics.

`discoveryAnswerService` must keep validating the **current** question id (existing TODO in the handler). The dummy `req-change_${command_id}` must never exist in `DiscoveryQuestions`.

---

### E. Agent 1 contract changes (`../ai/discovery.ts`) — companion spec

A backend-only agent cannot edit `ai/`. Implement §C compat adapter until this lands. When an `ai/`-writable task runs, apply the following.

#### E.1 `DiscoveryInput`

Add `change_request?: ProfileChangeRequest | null` as in §C.3. `answer` remains the only way to apply a **question** response. On the opening turn, `answer` is `null` and `change_request` is set. On follow-up turns, **both** may be set: `answer` is the latest discovery answer; `change_request` is still the open request so the model does not “forget” the topics.

#### E.2 `buildUserMessage`

Include `change_request` in the JSON payload. Extra instructions when it is present:

```
This is a targeted profile-correction turn after the traveler reviewed a ready profile and sent profile.request_changes.
Do not restart discovery from destination/dates unless those topics are in change_request.topics or clearly implicated by free_text.
Do not set finished=true on this turn unless questions_in_phase >= 1 AND every requested topic is resolved or explicitly assumed with user_confirmation_needed.
Ask exactly ONE question whose answers would correct or confirm the requested topics.
If free_text already states a concrete correction, apply it in profile_patch with source "stated", then ask only if a material ambiguity remains.
Never treat this as confirmation of the whole profile.
Ignore coverage_hint.may_finish from the original 5–15 discovery; that phase already completed.
Prefer questions about the listed topics even if those fields are already populated — the traveler disputed them.
```

#### E.3 System prompt section

Add a `## Change request (post profile review)` section to `DISCOVERY_SYSTEM_PROMPT` with the same rules. Anti-loop must be **scoped**: “do not re-ask timing” does **not** apply when `topics` include Dates / timing or `free_text` contradicts stored dates.

#### E.4 `buildCoverageHint`

When `change_request` is set:

- `may_finish` should be `false` if `questions_in_phase === 0`.
- `may_finish` may be `true` if requested topics are resolved (no blocking unknown on those topics) and `questions_in_phase >= 1`.
- Do not require `authoritativeCount >= 5` in this mode.
- Add `missing_high_value` from the requested topics that are still ambiguous, not from the whole profile checklist.

#### E.5 Patch merge

`free_text` corrections must flow through the existing patch merge (stated preferences, constraints, trip_context). Do not replace the entire profile. Preserve `profile_id`.

#### E.6 Tests in `ai/` (when writable)

- Opening turn with topics `["budget scope"]` and empty profile-complete fixture → `finished === false`, `next_question` mentions budget, destination not re-asked.
- Opening turn with free_text `"Budget is USD 4000 total, exclude flights"` → patch updates budget; optionally still one clarifying question or finish only if unambiguous **and** `questions_in_phase` rule allows (prefer still one confirm question).
- Follow-up answer that resolves the topic → `finished === true`, `next_question === null`.

---

### F. Deterministic fallback question (no LLM / LLM ignored finish / LLM error)

Build a single `DiscoveryQuestion` in backend (e.g. `backend/src/factory/DiscoveryFallback.ts` or a function in `DiscoveryServices.ts`):

- `question_id`: `q_change_${command_id}` (stable for this command; unique per request).
- `prompt`: If one topic: `What should we change about {topic}?` If several: `You asked us to revisit {topic1}, {topic2}, and {topic3}. What should we correct?` If only note: `Tell us what to change in the profile.`
- `selection_mode`: `single`
- `required`: `true`
- `options`: `[]` (free-text correction path; do not invent option ids)
- `free_text_mode`: `required`
- `free_text_placeholder`: `"Add the correction in your own words"`

`addDiscoveryQuestion` **only** this real question, then `createDiscoveryQuestionMessage` + emit. This is the only question that should be stored if Agent 1 fails.

Never use prompt `"Are you okay with this profile"`.

---

### G. Event sequence (normative)

Successful path, opening turn, Agent 1 returns a question:

```
C: profile.request_changes { topics, free_text? }
S: command.accepted (envelope.workflow_state = discovery)
S: workflow.state { workflow_state: "discovery" }          // immediately
S: profile.snapshot { state: "draft", revision: n+1 }      // demote ready
S: profile.snapshot { state: "draft", revision: n+2 }      // after Agent 1 merge (if profile changed)
S: discovery.question { ...next_question }
```

If the first draft snapshot is identical to the merged one, you may skip the extra snapshot **only if** revision still increases when the merged profile differs. Never reuse the ready revision as draft (`appendProfileSnapshot` already increments). Emitting two drafts (pre-LLM + post-LLM) is OK and matches “replace when revision newer.”

Then normal loop:

```
C: discovery.answer
S: command.accepted
S: profile.snapshot draft
S: discovery.question | (profile.snapshot ready + profile.ready + workflow.state profile_review)
```

When targeted discovery completes:

```
S: profile.snapshot { state: "ready", revision: n+k }
S: profile.ready { profile_revision, blocking_unknowns }
S: workflow.state { workflow_state: "profile_review" }   // emit this; today finish only sets state in emitProfileSnapshotAndMaybeReady via setWorkflowState + profile.ready. Frontend client.ts sets profile_review from profile.ready. Emitting workflow.state is still recommended for AppShell consistency with confirm.
```

Add `workflow.state` `profile_review` inside `emitProfileSnapshotAndMaybeReady` when finishing, if not already emitted. Confirm currently emits `workflow.state` for planning; discovery finish currently relies on `profile.ready` mutating client workflow. Be explicit for request-changes completion.

---

### H. What not to do

- Do not call `processCandidateDesign` / `processNarrative`.
- Do not accept a profile JSON blob from the client.
- Do not create a new checkpoint type; `appendProfileSnapshot` is the checkpoint.
- Do not reset `questions_asked_count` to 0 (prior_questions still help de-dup). Override **finish policy**, not history.
- Do not emit `profile.ready` before a targeted question on the opening turn (default).
- Do not register a second Socket.IO listener; `ProfileEvents.ts` already binds `profile.request_changes`.
- Do not change `isValidCommandForWorkflow` except if you add a command. Request-changes must remain **only** in `profile_review`.
- Do not use confirm’s heartbeat / `planning.status` for this path.
- Do not write files outside `backend/` in the implementing task; put remaining AI/frontend/docs work in this `PROPOSALS.md` (this section is that work).

---

### I. Tests / verification

Add `backend/test/profileRequestChanges.test.ts` (or extend `discovery.test.ts`) with a **fake** `processDiscovery` if the test harness already injects one; if not, unit-test the service by extracting input-building into a pure function.

Cases:

1. Topics-only payload (no `free_text` key) **parses** and is accepted in `profile_review`.
2. Empty topics and empty/missing `free_text` **rejects** (`invalid_envelope` / Zod).
3. Command in `discovery` or `planning` **rejects** `invalid_workflow_state`.
4. Opening turn: dummy question `"Are you okay with this profile"` is **never** stored (`getDiscoveryQuestions`).
5. Opening turn: `workflow.state` discovery is emitted **before** the mocked Agent 1 resolves (use a deferred promise).
6. Opening turn: first snapshot after accept is `draft` with revision strictly greater than the previous `ready` revision.
7. Mock Agent 1 `finished: true` on opening turn → Controller still emits a `discovery.question` (compat / coerce), does not emit `profile.ready`.
8. Mock Agent 1 `finished: false` with `next_question` → that question is emitted; `topics` appear in the `DiscoveryInput` passed to `processDiscovery` (spy).
9. After a follow-up mock finish, `profile.ready` fires, change-request context is cleared, workflow is `profile_review`.
10. Agent 1 throw → fallback question emitted; workflow remains `discovery`; error event logged/emitted.
11. Reconnect: emit goes to `getSocketIdForSession` socket (same pattern as confirm).

Run `npm run build` and `npm run test` in `backend/`. Do not require a live Gemini key for the new unit tests.

Manual: from Profile Review, pick a topic, send without a note (this currently 400s on Zod), confirm Discovery shows a real question and Header/AppShell stay on Discovery until that question arrives.

---

### J. Frontend / docs follow-ups (record only)

**Target:** `../frontend/src/screens/ProfileReview.tsx`

- Keep `busy` until `workflow.state === 'discovery'` **or** `discovery.question` (design: wait for question). Remove the 300 ms blind `navigate('/discovery')` as the sole success path.
- Handle `command.rejected` like Confirm (`invalid_envelope`, `invalid_workflow_state`, `command_id_conflict`).
- Do not clear the editor on send failure.

**Target:** `../frontend/src/ws/WsProvider.tsx`

- If you keep relying on ack for routing, read `workflow_state` from the **envelope root** (acks have no payload today) and allow `'discovery'`. Prefer not depending on this if backend emits `workflow.state`.

**Target:** `../docs/WEBSOCKET_CONTRACT.md` § `profile.request_changes`

- State that `free_text` is optional.
- Document event order in §G.
- State that the first post-request snapshot is `draft`, not `ready`.

**Reason:**

Review “Request changes” is already a first-class v1 command on the client. Backend validation already allows it in `profile_review`. Agent 1 already knows how to emit one question and a merged profile. The gap is the Controller: it must pass topics/note as a change request, demote the ready snapshot, emit `workflow.state` so the SPA does not snap back to review, and stop Agent 1 from auto-finishing because the original 5–15 discovery already completed.

**Impact:**

- Profile review → discovery → review loop becomes usable.
- Topics-only requests start working (schema).
- Agent 1 prompt/coverage must change for correct targeting; until then the Controller must coerce “immediate finish” into a fallback question.
- Session memory grows by one optional change-request record per session.
- Confirm / planning paths unchanged if the new `createWorkflowStateMessage` helper is a pure extract.
- Frontend may still navigate at 300 ms; with `workflow.state` + `discovery.question` that navigate will stick. Without those events, AppShell will keep yanking the user back to review.

---

## 2. Fix `ai/candidate-design.ts` undefined `gap` (discovered during handler build)

**Target:** `../ai/candidate-design.ts` ~1370

**Issue:** `gap` is referenced but never defined: `if (state.deadline !== null && Date.now() + gap < state.deadline) await new Promise((r) => setTimeout(r, gap));` causes `TS2304: Cannot find name 'gap'` and blocks `tsc` build.

**Evidence:** `npx tsc --project backend/tsconfig.json` reports `ai/candidate-design.ts(1370,57): error TS2304: Cannot find name 'gap'` and `ai/candidate-design.ts(1370,118)` duplicate.

**Suggested change:** Define `const gap = 400;` (or restore the prior constant, e.g., `const GAP_MS = 400`) before the loop, or remove the artificial gap when deadline is infinite (comment says "No artificial gap when run is infinite"). If intentional to remove gap, delete the `if` line.

**Reason:** Backend imports `ai/candidate-design` via `ProfileServices`, so any `tsc` build in `backend/` type-checks this file.

**Impact:** Owner of `../ai/` should verify intended gap duration.
