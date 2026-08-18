# Agent 1 — Discovery/Profile Module

This package is the first AI module for Voyager. It is called “Agent 1” for project organization, but it is one discovery function rather than a multi-agent system.

Its job is to process one discovery turn at a time:

1. receive the current profile, the previous question, and the traveler’s answer;
2. update the complete profile; and
3. decide whether to ask one more question or finish discovery.

Each turn makes exactly one Groq request. The caller stores the returned `profile` object and passes it back on the next turn. On the first turn, pass `profile: null` and `answer: null`; the module will return a default destination question.

## Files

```text
ai/
├── src/
│   ├── index.ts              public exports
│   ├── process-discovery.ts  one Groq-backed discovery function
│   ├── response-schema.ts    strict Groq response contract
│   ├── system-prompt.ts      discovery behavior and safety rules
│   ├── types.ts              TypeScript input/output types
│   └── mock-state.ts         temporary in-memory state
└── tests/
    └── process-discovery.test.ts
```

## Example

```ts
import { processDiscovery } from "./src/index.js";

const firstTurn = await processDiscovery({
  profile: null,
  answer: null,
});

// Store firstTurn.profile and show firstTurn.next_question.

const nextTurn = await processDiscovery({
  profile: firstTurn.profile,
  answer: {
    question_id: firstTurn.next_question!.question_id,
    question: firstTurn.next_question!,
    selected_option_ids: [],
    free_text: "Kyoto for four days",
  },
});

// Continue until nextTurn.finished is true.
```

The answer includes the full question because a short answer such as “balanced” needs the question’s context to be interpreted correctly.

## Configuration

Copy `.env.example` to `.env` inside `ai/` and provide `GROQ_API_KEY`. The mock workflow loads this file automatically. The module reads:

- `GROQ_API_KEY` — required unless `api_key` is passed directly for a call;
- `GROQ_MODEL` — optional, defaults to `openai/gpt-oss-20b`;
- `GROQ_API_URL` — optional, defaults to Groq’s Chat Completions endpoint.

Never commit the real `.env` file. It is ignored by Git.

For GPT-OSS models, requests use `reasoning_effort: "medium"` by default for a
better balance between latency and careful profile updates. Override it per call
with `reasoning_effort: "low"` or `reasoning_effort: "high"` when needed.

The request uses Groq Structured Outputs with a strict JSON Schema. The system prompt defines the behavior, and the module also validates and normalizes the returned profile before returning it to the caller.

## Commands

Run these commands from `ai/`:

```bash
npm install
npm test
npm run check
npm run build
```

Tests use a mocked Groq response and do not need an API key or network access.

Every Groq response is also saved locally in `ai/logs/` before parsing, including malformed responses and API errors. Files use timestamped names and are ignored by Git because they can contain traveler answers. Disable this per call with `log_raw_responses: false` when using the function programmatically.

## Mock workflow

Start the interactive in-memory workflow with Groq:

```bash
npm run mock
```

This starts with a null profile, asks the first question, accepts your answer, stores the returned profile in memory, and continues until Agent 1 says discovery is complete. It does not need a backend, but it does need `GROQ_API_KEY`.

For a completely offline wiring test, use the canned-response mode:

```bash
npm run mock:offline
```

Offline mode uses fixed sample responses instead of Groq. It is useful for checking the loop, profile storage, question display, and completion handling. You can type `:profile` to inspect the current profile or `:quit` to stop.

For a non-interactive smoke test of the full loop:

```bash
npm run mock:offline -- --demo
```

## Current boundaries

- Profile state is temporary and in memory; the future backend will own persistence.
- This module only performs discovery and profile construction.
- It does not plan destinations, select experiences, call travel providers, or create a final itinerary.
- It does not silently turn inferred preferences into hard constraints.
