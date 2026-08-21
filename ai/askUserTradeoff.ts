/**
 * ask_user_decision control-flow tool for Agent 2.
 * Implements docs/AGENT_ARCHITECTURE.md §7.2 generic schema.
 * Backend receives AI's request, displays on frontend, waits for user reply,
 * then returns choice to AI. One active decision, 2-3 options, max 3 calls.
 */

export const MAX_TRADEOFF_CALLS = 3;
// ponytail: alias for docs naming
export const MAX_DECISION_CALLS = MAX_TRADEOFF_CALLS;

export const ALLOWED_DECISION_REASONS = [
  "material_tradeoff",
  "hard_constraint_conflict",
  "missing_preference",
] as const;
export type DecisionReason = (typeof ALLOWED_DECISION_REASONS)[number];

export interface AskUserDecisionOption {
  option_id: string;
  label: string;
  tradeoff: string;
}

export interface AskUserDecisionRequest {
  reason: DecisionReason;
  prompt: string;
  options: AskUserDecisionOption[];
  /** Injected from CandidateDesignInput.session_id, not from model */
  session_id?: string;
}

export type AskUserDecisionResolver = (request: AskUserDecisionRequest) => Promise<string>;

// legacy shape for backward compat (old attraction_id_a/b)
export interface LegacyAskUserTradeoffRequest {
  attraction_id_a: string;
  attraction_id_b: string;
  question: string;
  tradeoff_a: string;
  tradeoff_b: string;
  session_id?: string;
}

// --- backward compat aliases (deprecated, keep so old imports don't break) ---
/** @deprecated use AskUserDecisionRequest */
export type AskUserTradeoffRequest = AskUserDecisionRequest | LegacyAskUserTradeoffRequest;
/** @deprecated use AskUserDecisionResolver */
// ponytail: any keeps legacy (attraction_id_a/b) call sites assignable
export type AskUserTradeoffResolver = (request: any) => Promise<string>;
export interface TradeoffHistoryEntry {
  reason: DecisionReason;
  prompt: string;
  options: AskUserDecisionOption[];
  choice: string;
  // legacy fields kept optional for reading old history
  question?: string;
  attraction_id_a?: string;
  attraction_id_b?: string;
  tradeoff_a?: string;
  tradeoff_b?: string;
}

// minimal attraction shape needed for soft grounding check
export interface TradeoffAttractionRecord {
  attraction_id: string;
  city_id: string;
  name: string;
  [key: string]: unknown;
}

export interface TradeoffToolState {
  known_attractions: Map<string, TradeoffAttractionRecord>;
  tradeoff_history: TradeoffHistoryEntry[];
  tradeoff_calls: number;
  options: {
    askUserTradeoff?: AskUserDecisionResolver;
    askUserDecision?: AskUserDecisionResolver;
  };
  deadline: number;
  /** Optional session correlation, injected by controller */
  session_id?: string;
}

export function buildAskUserDecisionToolSchema(): unknown {
  return {
    type: "function" as const,
    function: {
      name: "ask_user_decision",
      description:
        "Pause planning and ask the traveler to resolve a material tradeoff, hard-constraint conflict, or missing preference. Use only when the decision materially changes the itinerary. Provide 2-3 options each with a stable option_id, traveler-safe label, and plain-language tradeoff. Backend pauses Agent 2, emits decision.request, and returns the traveler's selected option_id.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          reason: {
            type: "string",
            enum: [...ALLOWED_DECISION_REASONS],
            description: "Why the decision is needed",
          },
          prompt: {
            type: "string",
            description: "Traveler-facing question, e.g. 'Would you rather keep the pace gentle or see more attractions?'",
          },
          options: {
            type: "array",
            minItems: 2,
            maxItems: 3,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                option_id: { type: "string", description: "Stable local option identifier" },
                label: { type: "string", description: "Traveler-safe label" },
                tradeoff: { type: "string", description: "Plain-language tradeoff for this option" },
              },
              required: ["option_id", "label", "tradeoff"],
            },
          },
        },
        required: ["reason", "prompt", "options"],
      },
    },
  };
}

/** @deprecated use buildAskUserDecisionToolSchema */
export function buildAskUserTradeoffToolSchema(): unknown {
  return buildAskUserDecisionToolSchema();
}

export function normalizeTradeoffChoice(raw: string): string {
  return raw.trim();
}

export function isNeitherChoice(choice: string): boolean {
  const c = choice.trim().toLowerCase();
  return c === "neither" || c === "neither option" || c === "neither one" || c === "skip both" || c === "none";
}

// --- execution, fully contained in this file ---

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${path} must be a non-empty string`);
  }
  return value.trim();
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], path: string): void {
  const expected = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) {
      throw new Error(`${path} contains unsupported field ${key}`);
    }
  }
}

async function withDeadline<T>(promise: Promise<T>, deadline: number, label: string): Promise<T> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error(`${label} exceeded the run timeout`);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} exceeded the run timeout`)), remaining);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function getResolver(state: TradeoffToolState): AskUserDecisionResolver | undefined {
  return state.options.askUserDecision ?? state.options.askUserTradeoff;
}

/**
 * Execute the ask_user_decision tool. Called from candidate-design.ts's executeTool.
 * Returns JSON string for model (choice or error). Mutates state.tradeoff_history/calls on success.
 * Supports both generic §7.2 shape and legacy attraction_id_a/b shape for backward compat.
 */
export async function executeAskUserDecisionTool(
  state: TradeoffToolState,
  rawArguments: string,
): Promise<string> {
  const resolver = getResolver(state);
  if (!resolver) {
    return JSON.stringify({ error: { code: "tradeoff_not_configured", message: "ask_user_decision requires options.askUserDecision resolver." } });
  }
  if (state.tradeoff_calls >= MAX_TRADEOFF_CALLS) {
    return JSON.stringify({ error: { code: "tradeoff_budget_exhausted", message: `At most ${MAX_TRADEOFF_CALLS} tradeoff questions allowed.` } });
  }
  let args: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawArguments);
    if (!isRecord(parsed)) throw new Error("arguments must be an object");
    args = parsed;
  } catch {
    return JSON.stringify({ error: { code: "invalid_arguments", message: "Tool arguments must be valid JSON object arguments." } });
  }

  // Legacy compat: if caller used old attraction_id_a/b + question shape, translate to generic
  const isLegacy = "attraction_id_a" in args || "attraction_id_b" in args || "question" in args;
  if (isLegacy) {
    try {
      exactKeys(args, ["attraction_id_a", "attraction_id_b", "question", "tradeoff_a", "tradeoff_b"], "ask_user_decision arguments");
      const aId = nonEmptyString(args.attraction_id_a, "ask_user_decision.attraction_id_a");
      const bId = nonEmptyString(args.attraction_id_b, "ask_user_decision.attraction_id_b");
      const question = nonEmptyString(args.question, "ask_user_decision.question");
      const tradeoffA = nonEmptyString(args.tradeoff_a, "ask_user_decision.tradeoff_a");
      const tradeoffB = nonEmptyString(args.tradeoff_b, "ask_user_decision.tradeoff_b");
      if (aId === bId) {
        return JSON.stringify({ error: { code: "invalid_tradeoff_pair", message: "attraction IDs must be distinct" } });
      }
      const a = state.known_attractions.get(aId);
      const b = state.known_attractions.get(bId);
      if (!a || !b) {
        return JSON.stringify({ error: { code: "unknown_attraction", message: "Both attractions must be retrieved first via query_attractions/get_attractions_by_ids before asking." } });
      }
      const qLower = question.toLowerCase();
      const includesA = qLower.includes(a.name.toLowerCase()) || qLower.includes(aId.toLowerCase());
      const includesB = qLower.includes(b.name.toLowerCase()) || qLower.includes(bId.toLowerCase());
      if (!includesA || !includesB) {
        return JSON.stringify({ error: { code: "invalid_question", message: `Question must include both attraction names: ${a.name} and ${b.name}.` } });
      }
      const sid = (state as any).session_id ?? (state as any).input?.session_id as string | undefined;
      const genericReq: AskUserDecisionRequest = {
        reason: "material_tradeoff",
        prompt: question,
        options: [
          { option_id: aId, label: a.name, tradeoff: tradeoffA },
          { option_id: bId, label: b.name, tradeoff: tradeoffB },
        ],
        ...(sid ? { session_id: sid } : {}),
      };
      const legacyReq: any = { attraction_id_a: aId, attraction_id_b: bId, question, tradeoff_a: tradeoffA, tradeoff_b: tradeoffB, ...(sid ? { session_id: sid } : {}) };
      const choiceRaw = await withDeadline(resolver(legacyReq), state.deadline, "ask_user_decision");
      const choice = typeof choiceRaw === "string" ? choiceRaw.trim() : String(choiceRaw ?? "").trim();
      if (!choice) {
        return JSON.stringify({ error: { code: "invalid_choice", message: "User reply was empty." } });
      }
      state.tradeoff_history.push({ reason: "material_tradeoff", prompt: question, options: genericReq.options, choice, question, attraction_id_a: aId, attraction_id_b: bId, tradeoff_a: tradeoffA, tradeoff_b: tradeoffB });
      (state as { tradeoff_calls: number }).tradeoff_calls += 1;
      return JSON.stringify({ choice, reason: "material_tradeoff", prompt: question, options: genericReq.options, question, attraction_id_a: aId, attraction_id_b: bId, tradeoff_a: tradeoffA, tradeoff_b: tradeoffB, tradeoff_calls_used: state.tradeoff_calls, tradeoff_calls_remaining: MAX_TRADEOFF_CALLS - state.tradeoff_calls });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "unknown error";
      if (msg.includes("exceeded the run timeout")) throw error;
      return JSON.stringify({ error: { code: "tradeoff_failed", message: "Tradeoff resolver failed without exposing details." } });
    }
  }

  try {
    exactKeys(args, ["reason", "prompt", "options"], "ask_user_decision arguments");
    const reason = nonEmptyString(args.reason, "ask_user_decision.reason");
    if (!(ALLOWED_DECISION_REASONS as readonly string[]).includes(reason)) {
      return JSON.stringify({ error: { code: "invalid_arguments", message: `reason must be one of ${ALLOWED_DECISION_REASONS.join(", ")}` } });
    }
    const prompt = nonEmptyString(args.prompt, "ask_user_decision.prompt");
    const rawOptions = args.options;
    if (!Array.isArray(rawOptions) || rawOptions.length < 2 || rawOptions.length > 3) {
      return JSON.stringify({ error: { code: "invalid_arguments", message: "options must be an array of 2-3 items" } });
    }
    const options: AskUserDecisionOption[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < rawOptions.length; i++) {
      const o = rawOptions[i];
      if (!isRecord(o)) return JSON.stringify({ error: { code: "invalid_arguments", message: `options[${i}] must be an object` } });
      exactKeys(o, ["option_id", "label", "tradeoff"], `ask_user_decision.options[${i}]`);
      const option_id = nonEmptyString(o.option_id, `ask_user_decision.options[${i}].option_id`);
      const label = nonEmptyString(o.label, `ask_user_decision.options[${i}].label`);
      const tradeoff = nonEmptyString(o.tradeoff, `ask_user_decision.options[${i}].tradeoff`);
      if (seen.has(option_id)) return JSON.stringify({ error: { code: "invalid_arguments", message: `duplicate option_id: ${option_id}` } });
      seen.add(option_id);
      // soft grounding: if option_id corresponds to a known attraction, it's already grounded; otherwise allow generic ids
      // if option_id looks like attraction but not retrieved, we don't error — generic reasons may use non-attraction ids (comfort/coverage/neither)
      options.push({ option_id, label, tradeoff });
    }

    const sid2 = (state as any).session_id ?? (state as any).input?.session_id as string | undefined;
    const choiceRaw = await withDeadline(resolver({ reason: reason as DecisionReason, prompt, options, ...(sid2 ? { session_id: sid2 } : {}) }), state.deadline, "ask_user_decision");
    const choice = typeof choiceRaw === "string" ? choiceRaw.trim() : String(choiceRaw ?? "").trim();
    if (!choice) {
      return JSON.stringify({ error: { code: "invalid_choice", message: "User reply was empty." } });
    }
    state.tradeoff_history.push({ reason: reason as DecisionReason, prompt, options, choice });
    (state as { tradeoff_calls: number }).tradeoff_calls += 1;
    return JSON.stringify({ choice, reason, prompt, options, tradeoff_calls_used: state.tradeoff_calls, tradeoff_calls_remaining: MAX_TRADEOFF_CALLS - state.tradeoff_calls });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown error";
    if (msg.includes("exceeded the run timeout")) throw error;
    return JSON.stringify({ error: { code: "tradeoff_failed", message: "Tradeoff resolver failed without exposing details." } });
  }
}

/** @deprecated use executeAskUserDecisionTool */
export const executeAskUserTradeoffTool = executeAskUserDecisionTool;
