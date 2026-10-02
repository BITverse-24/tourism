import assert from "node:assert/strict";
import { test } from "node:test";
import { processDiscovery } from "../discovery";
import { processCandidateDesign, CandidateDesignInput, CandidateDesignTools } from "../candidate-design";
import { processNarrative, NarrativeInput } from "../narrative";
import { mockCandDesRes, mockCandBundl } from "./mockcandidatebundle";
import { narrativeRes } from "./mockfinaltripplan";
import { mockprof } from "./mockprofile";

test("OpenRouter: discovery agent sends requests to OpenRouter with default model openrouter/free", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    const mockFetcher = async (url: string, init?: any) => {
        capturedUrl = url;
        capturedHeaders = init?.headers ?? {};
        capturedBody = JSON.parse(init?.body ?? "{}");

        const responsePayload = {
            choices: [
                {
                    message: {
                        content: JSON.stringify({
                            finished: false,
                            next_question: {
                                question_id: "q1",
                                prompt: "Where would you like to travel?",
                                selection_mode: "single",
                                required: true,
                                options: [{ option_id: "opt1", label: "Japan", description: "Explore Tokyo" }],
                                free_text_mode: "optional",
                                free_text_placeholder: "Enter city"
                            },
                            completion_reason: null,
                            profile_patch: {
                                trip_context: { destination_request: "Japan" }
                            }
                        })
                    }
                }
            ]
        };

        return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify(responsePayload),
        };
    };

    const result = await processDiscovery(
        { profile: null, answer: null },
        {
            api_key: "sk-or-test-key-12345",
            fetcher: mockFetcher as any,
        }
    );

    assert.ok(capturedUrl.startsWith("https://openrouter.ai/api/v1/chat/completions"), `URL should start with OpenRouter: ${capturedUrl}`);
    assert.equal(capturedHeaders["Authorization"], "Bearer sk-or-test-key-12345");
    assert.equal(capturedHeaders["HTTP-Referer"], "https://tourism.app");
    assert.equal(capturedBody.model, "openrouter/free");
    assert.equal(result.finished, false);
    assert.equal(result.next_question?.question_id, "q1");
});

test("OpenRouter: candidate-design agent sends requests to OpenRouter with default model openrouter/free", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    const mockFetcher = async (url: string, init?: any) => {
        capturedUrl = url;
        capturedHeaders = init?.headers ?? {};
        capturedBody = JSON.parse(init?.body ?? "{}");

        const responsePayload = {
            choices: [
                {
                    message: {
                        content: JSON.stringify(mockCandDesRes)
                    }
                }
            ]
        };

        return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify(responsePayload),
        };
    };

    const mockTools: CandidateDesignTools = {
        searchCities: async () => ({ cities: [], next_cursor: null }),
        getCity: async () => ({
            city: {
                city_id: "mumbai_maharashtra",
                city_name: "Mumbai",
                state: "Maharashtra",
                country: "India",
                region: "Western India",
                latitude: 18.922,
                longitude: 72.834,
                destination_types: ["metropolitan", "cultural"],
                climate_type: "tropical",
                target_attractions: 50,
                tourism_popularity: "high",
                tier: "major",
                is_active: true
            }
        }),
        queryAttractions: async () => ({ attractions: [], query_id: "q1", next_cursor: null }),
        getAttractionsByIds: async () => ({ attractions: [] }),
    };

    const input: CandidateDesignInput = {
        profile: mockprof,
        session_id: "sess_123",
        run_budget: {
            max_candidates: 1,
            max_tool_calls: 5,
            max_rows_per_tool_call: 10,
            timeout_ms: 10000,
        }
    };

    const result = await processCandidateDesign(input, {
        tools: mockTools,
        api_key: "sk-or-test-key-67890",
        fetcher: mockFetcher as any,
    });

    assert.ok(capturedUrl.startsWith("https://openrouter.ai/api/v1/chat/completions"), `URL should start with OpenRouter: ${capturedUrl}`);
    assert.equal(capturedHeaders["Authorization"], "Bearer sk-or-test-key-67890");
    assert.equal(capturedBody.model, "openrouter/free");
    assert.ok(result.candidates.length >= 1);
});

test("OpenRouter: narrative agent sends requests to OpenRouter with default model openrouter/free", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    const mockFetcher = async (url: string, init?: any) => {
        capturedUrl = url;
        capturedHeaders = init?.headers ?? {};
        capturedBody = JSON.parse(init?.body ?? "{}");

        const responsePayload = {
            choices: [
                {
                    message: {
                        content: JSON.stringify(narrativeRes.plan)
                    }
                }
            ]
        };

        return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify(responsePayload),
        };
    };

    const narrativeInput: NarrativeInput = {
        profile: mockprof,
        profile_revision: 1,
        candidate: mockCandBundl,
        dataset_revisions: mockCandBundl.dataset_revisions
    };

    const result = await processNarrative(narrativeInput, {
        api_key: "sk-or-test-key-abcde",
        fetcher: mockFetcher as any,
    });

    assert.ok(capturedUrl.startsWith("https://openrouter.ai/api/v1/chat/completions"), `URL should start with OpenRouter: ${capturedUrl}`);
    assert.equal(capturedHeaders["Authorization"], "Bearer sk-or-test-key-abcde");
    assert.equal(capturedBody.model, "openrouter/free");
    assert.equal(result.plan.plan_title, narrativeRes.plan.plan_title);
});
