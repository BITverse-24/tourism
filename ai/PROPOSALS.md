# Proposals

> This file lives in the selected writable directory `ai/` and records changes that should be made **outside** that directory (in `backend/`). The `ai/` side of these proposals has been implemented in this task; the `backend/` side remains read-only per `AGENTS.md` and is proposed here.

## 1. Backend: Stop logging Agent 1 `reasoning_effort` as medium

**Target:** `backend/src/services/DiscoveryServices.ts`, `backend/src/factory/AgentConfig.ts` (indirectly), `backend/src/app/config.ts`, `backend/src/services/ProfileServices.ts` (documentation)

**Issue:** Backend always passes and logs `reasoning_effort: config.agent_reasoning_effort` (defaults to `medium` via `AGENT_REASONING_EFFORT`) for Agent 1. Agent 1 (`ai/discovery.ts`) ignores that field and forces `thinkingBudget: 0` (no reasoning). Logs therefore look like Agent 1 uses medium reasoning even when thinking is disabled.

**Evidence:**
- `backend/src/services/DiscoveryServices.ts:loadDiscoveryOptions()` returns `{ reasoning_effort: config.agent_reasoning_effort, ... }` for Agent 1.
- `backend/src/services/DiscoveryServices.ts:logAgentCall()` logs `config: { reasoning_effort: config.agent_reasoning_effort }` under `calling agent 1`.
- `ai/discovery.ts:ProcessDiscoveryOptions.reasoning_effort` is now documented as *Ignored for Agent 1 — discovery always disables model thinking (thinkingBudget: 0)* and `processDiscovery` logs it as `ignored_reasoning_effort` and never uses it for the Gemini request (`thinkingConfig: { thinkingBudget: 0 }`).

**Suggested change:**
- In `backend/src/services/DiscoveryServices.ts`:
  ```ts
  function loadDiscoveryOptions(): ProcessDiscoveryOptions {
    const config = loadConfig(process.env);
    return {
      api_key: config.agent_api_key,
      model: config.agent_model,
      // Do NOT include reasoning_effort for Agent 1 — it is ignored (thinkingBudget: 0).
      api_url: config.agent_api_url,
      timeout_ms: config.agent_timeout_ms,
    };
  }
  function logAgentCall(discoveryInput: DiscoveryInput, config: AppConfig): void {
    logger.debug('calling agent 1', {
      input: discoveryInput,
      config: {
        api_key: masked,
        model: config.agent_model,
        timeout_ms: config.agent_timeout_ms,
        api_url: config.agent_api_url || 'default',
        reasoning_effort: 'none (Agent 1 thinkingBudget: 0 — AGENT_REASONING_EFFORT not applied)',
      },
    });
  }
  ```
- In `backend/src/app/config.ts`: keep `AGENT_REASONING_EFFORT` but clarify it is for Agent 2 (candidate-design) only, or introduce an explicit `AGENT_CANDIDATE_DESIGN_REASONING_EFFORT` that aliases the existing var. Update the `AppConfig` comment and add env documentation: `Agent 1 has no reasoning budget; do not use AGENT_REASONING_EFFORT for discovery`.
- In `backend/src/services/ProfileServices.ts`: no functional change needed — it already correctly passes `reasoning_effort` to `createCandidateDesignOptions` for Agent 2. Just ensure comments distinguish Agent 2 vs Agent 1 usage.
- Optionally remove `reasoning_effort` from `createProcessDiscoveryOptions` call sites for discovery, or keep it but document as ignored.

**Reason:** Avoid misleading ops/debug logs that contradict the no-thinking Agent 1 policy. Make it obvious to operators that Agent 1 never reasons.

**Impact:** Log/config clarity only for Agent 1; Agent 2 continues to use `AGENT_REASONING_EFFORT` (or its renamed alias) with thinking enabled. No change to Agent 1 behavior — already `thinkingBudget: 0`.

**Status of `ai/` side:** Updated — Agent 1 now sends the model's lowest supported `thinking_level` (`thinkingConfig.thinkingLevel`) instead of `thinkingBudget: 0`, which Gemini 3.x rejects as `INVALID_ARGUMENT`. Backend logs that still say `thinkingBudget: 0` are stale (see proposal 3).

---

## 2. Backend: Pass discovery question count into Agent 1

**Target:** `backend/src/services/DiscoveryServices.ts` (and `DiscoveryInput` consumers), `backend/src/models/data.ts` (read-only reference)

**Issue:** Agent 1 now requires 5–15 varied questions before finishing, but `DiscoveryInput` previously only provided `profile` + `answer`. Question count was estimated from profile fullness in `ai/discovery.ts` (`coverage_hint.questions_asked_estimate`), which can under/over-count when the traveler volunteers a lot in one answer or when initial intent seeds many fields.

**Evidence:**
- `backend/src/services/DiscoveryServices.ts:discoveryAnswerService` and `newDiscoveryQuestionService` build `DiscoveryInput` as `{ profile, answer }` only, without a count.
- `backend/src/models/data.ts:DiscoveryQuestions` already stores per-run questions via `addDiscoveryQuestion(run_id, question)` and could provide `DiscoveryQuestions[run_id].length`.
- `ai/discovery.ts:buildCoverageHint` previously computed `questions_asked_estimate` from `filledScore`; `buildUserMessage` did not forward a count.

**Suggested change:**
- Add helper in `backend/src/models/data.ts` (or reuse existing map) to read count:
  ```ts
  export function getDiscoveryQuestionCount(run_id: string): number {
    return DiscoveryQuestions[run_id]?.length ?? 0;
  }
  // Optionally:
  export function getDiscoveryQuestionPrompts(run_id: string): string[] {
    return (DiscoveryQuestions[run_id] ?? []).map(q => q.prompt);
  }
  ```
- In `backend/src/services/DiscoveryServices.ts`, include the authoritative count when calling `processDiscovery`:
  ```ts
  import { getDiscoveryQuestionCount } from "../models/data"; // or add getDiscoveryQuestions accessor
  const discoveryInput: DiscoveryInput = {
    profile: prof,
    answer: { ... },
    questions_asked_count: getDiscoveryQuestionCount(data.run_id), // or DiscoveryQuestions length
    prior_questions: getDiscoveryQuestionPrompts(data.run_id), // optional, for de-duplication
  };
  ```
  Apply in both `discoveryAnswerService` and `newDiscoveryQuestionService`. For `newDiscoveryQuestionService`, ensure the count is read *before* the new agent call (the run currently has N questions; the next question will be N+1).
- Ensure `DiscoveryInput` import reflects the updated interface from `ai/discovery.ts`:
  ```ts
  interface DiscoveryInput { profile, answer, questions_asked_count?: number | null, prior_questions?: string[] | null }
  ```
- No change needed to challenge intent seeding — if initial intent already set `destination_request`, that counts as 0 or 1? Document that `questions_asked_count` counts only `next_question` turns via `addDiscoveryQuestion`, not the initial seed.

**Reason:** Makes the 5–15 interview length reliable and reduces premature `finished: true` after rich initial intent. Exact count avoids profile-fullness heuristics.

**Impact:** Small backend wiring change + one accessor in `data.ts`. Backward-compatible — `ai/discovery.ts` treats `questions_asked_count` as optional and falls back to estimate when absent.

**Status of `ai/` side:** Implemented in this task:
- `ai/discovery.ts:DiscoveryInput` now has `questions_asked_count?: number | null` and `prior_questions?: string[] | null`.
- `buildCoverageHint(profile, questionsAskedCount?)` uses the authoritative count when present (`questions_asked_estimate` = authoritative count, `questions_asked_count` = actual, `is_estimate` flag, `questions_asked_estimate_fallback` for debugging, `may_finish` uses authoritative count).
- `buildUserMessage(input)` now builds `coverage_hint` via `buildCoverageHint(input.profile, input.questions_asked_count ?? null)` and forwards `prior_questions` and `questions_asked_count` in the user context JSON.
- `ProcessDiscoveryOptions.reasoning_effort` comment clarified as ignored for Agent 1.

---

## 3. Backend: Agent 1 thinking logs still say `thinkingBudget: 0`

**Target:** `backend/src/services/DiscoveryServices.ts`

**Issue:** Agent 1 now sends `thinkingConfig: { thinkingLevel }` (lowest supported level per model). Backend still logs `reasoning_effort: 'none (Agent 1 thinkingBudget: 0 — AGENT_REASONING_EFFORT not applied)'`, which is no longer accurate and will confuse operators looking at the 400 INVALID_ARGUMENT we just fixed.

**Evidence:** `logAgentCall` in `DiscoveryServices.ts` still documents thinking as `thinkingBudget: 0`. `ai/discovery.ts` uses `thinkingLevel: "minimal"` for `gemini-3.5-flash-lite` / `gemini-3.6-flash` / `gemini-3.5-flash`, and `"low"` where `minimal` is unsupported (`gemini-3.7-flash`, Gemini 3 Pro variants).

**Suggested change:** Update the log string to something like `thinking_level: lowest supported (Agent 1 — AGENT_REASONING_EFFORT not applied)`.

**Reason:** Ops logs should match the actual Gemini request.

**Impact:** Log-only.
