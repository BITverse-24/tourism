/**
 * Ask-User Tradeoff tool for Agent 2.
 * Separate file contains schema + execution. Backend receives AI's request,
 * displays on frontend, waits for user reply, then returns choice to AI.
 * Context-only, max 3 calls, attraction vs attraction only.
 */

export const MAX_TRADEOFF_CALLS = 3;

export interface AskUserTradeoffRequest {
  attraction_id_a: string;
  attraction_id_b: string;
  question: string;
  tradeoff_a: string;
  tradeoff_b: string;
}

export type AskUserTradeoffResolver = (
  request: AskUserTradeoffRequest,
) => Promise<string>;

export interface TradeoffHistoryEntry {
  question: string;
  attraction_id_a: string;
  attraction_id_b: string;
  tradeoff_a: string;
  tradeoff_b: string;
  choice: string;
}

// minimal attraction shape needed for tradeoff validation
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
    askUserTradeoff?: AskUserTradeoffResolver;
  };
  deadline: number;
}

export function buildAskUserTradeoffToolSchema(): unknown {
  return {
    type: "function",
    function: {
      name: "ask_user_tradeoff",
      description:
        "Ask the user to choose between two attractions when the tradeoff materially affects the plan. Vary framing naturally but include both attraction names and contrasting highlights. Use only when the decision changes the itinerary. Returns the user's choice: an attraction name/id, or 'neither'. Backend displays the question on the frontend and waits for the reply.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          attraction_id_a: { type: "string", description: "First attraction stable ID" },
          attraction_id_b: { type: "string", description: "Second attraction stable ID" },
          question: {
            type: "string",
            description:
              "Natural tradeoff question including both attraction names and contrast, e.g. 'Amber Fort vs City Palace, one has ... but the other has ...'. Vary phrasing each time.",
          },
          tradeoff_a: { type: "string", description: "Tradeoff description for attraction A displayed as option tradeoff" },
          tradeoff_b: { type: "string", description: "Tradeoff description for attraction B displayed as option tradeoff" },
        },
        required: ["attraction_id_a", "attraction_id_b", "question", "tradeoff_a", "tradeoff_b"],
      },
    },
  };
}

export function normalizeTradeoffChoice(raw: string): string {
  return raw.trim();
}

export function isNeitherChoice(choice: string): boolean {
  const c = choice.trim().toLowerCase();
  return c === "neither" || c === "neither option" || c === "neither one" || c === "skip both" || c === "none";
}

// --- execution, fully contained in this file (no logic in candidate-design.ts) ---
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

/**
 * Execute the ask_user_tradeoff tool. Called from candidate-design.ts's executeTool.
 * Returns JSON string for model (choice or error). Mutates state.tradeoff_history/calls on success.
 * All validation and resolver I/O lives here, not in candidate-design.ts.
 */
export async function executeAskUserTradeoffTool(
  state: TradeoffToolState,
  rawArguments: string,
): Promise<string> {
  if (!state.options.askUserTradeoff) {
    return JSON.stringify({ error: { code: "tradeoff_not_configured", message: "ask_user_tradeoff requires options.askUserTradeoff resolver." } });
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
  try {
    exactKeys(args, ["attraction_id_a", "attraction_id_b", "question", "tradeoff_a", "tradeoff_b"], "ask_user_tradeoff arguments");
    const aId = nonEmptyString(args.attraction_id_a, "ask_user_tradeoff.attraction_id_a");
    const bId = nonEmptyString(args.attraction_id_b, "ask_user_tradeoff.attraction_id_b");
    const question = nonEmptyString(args.question, "ask_user_tradeoff.question");
    const tradeoffA = nonEmptyString(args.tradeoff_a, "ask_user_tradeoff.tradeoff_a");
    const tradeoffB = nonEmptyString(args.tradeoff_b, "ask_user_tradeoff.tradeoff_b");
    if (aId === bId) {
      return JSON.stringify({ error: { code: "invalid_tradeoff_pair", message: "attraction IDs must be distinct" } });
    }
    const a = state.known_attractions.get(aId);
    const b = state.known_attractions.get(bId);
    if (!a || !b) {
      return JSON.stringify({ error: { code: "unknown_attraction", message: "Both attractions must be retrieved first via query_attractions/get_attractions_by_ids before asking tradeoff." } });
    }
    const qLower = question.toLowerCase();
    const includesA = qLower.includes(a.name.toLowerCase()) || qLower.includes(aId.toLowerCase());
    const includesB = qLower.includes(b.name.toLowerCase()) || qLower.includes(bId.toLowerCase());
    if (!includesA || !includesB) {
      return JSON.stringify({ error: { code: "invalid_question", message: `Question must include both attraction names: ${a.name} and ${b.name}.` } });
    }
    const choiceRaw = await withDeadline(state.options.askUserTradeoff({ attraction_id_a: aId, attraction_id_b: bId, question, tradeoff_a: tradeoffA, tradeoff_b: tradeoffB }), state.deadline, "ask_user_tradeoff");
    const choice = typeof choiceRaw === "string" ? choiceRaw.trim() : String(choiceRaw ?? "").trim();
    if (!choice) {
      return JSON.stringify({ error: { code: "invalid_choice", message: "User reply was empty." } });
    }
    state.tradeoff_history.push({ question, attraction_id_a: aId, attraction_id_b: bId, tradeoff_a: tradeoffA, tradeoff_b: tradeoffB, choice });
    // increment calls after successful round-trip (backend -> frontend -> user -> backend)
    (state as { tradeoff_calls: number }).tradeoff_calls += 1;
    return JSON.stringify({ choice, question, attraction_id_a: aId, attraction_id_b: bId, tradeoff_a: tradeoffA, tradeoff_b: tradeoffB, tradeoff_calls_used: state.tradeoff_calls, tradeoff_calls_remaining: MAX_TRADEOFF_CALLS - state.tradeoff_calls });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown error";
    if (msg.includes("exceeded the run timeout")) throw error;
    return JSON.stringify({ error: { code: "tradeoff_failed", message: "Tradeoff resolver failed without exposing details." } });
  }
}
