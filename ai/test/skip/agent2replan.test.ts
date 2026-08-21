import { CandidateDesignInput, CandidateDesignOptions, CandidateDesignTools, processCandidateDesign, TravelerProfile } from "../candidate-design";
import { getAttractionsByIds, queryAttractions } from "./agent_tools/AttractionKnowledgebaseTools";
import { askUserDecisionTool } from "./agent_tools/CandidateDecision";
import { getCity, searchCities } from "./agent_tools/CityKnowledgebaseTools";
import { mockfinaltripplan } from "./mockfinaltripplan";
import { profJSON } from "./mockprofile";
import 'dotenv/config';

const profile: TravelerProfile = profJSON

const input: CandidateDesignInput = {
    profile: profile,
    session_id: "abc",
    run_budget: {
        max_candidates: 1,
        max_tool_calls: 30,
        max_rows_per_tool_call: 50,
        timeout_ms: 120000,
    },
    replan: {
        replan_reason: "it is raining heavily on day 2 in the morning at 9:00, cannot visit elephanta caves, please suggest a new plan",
        previous_plan: mockfinaltripplan
    }
}
const tools: CandidateDesignTools = {
    searchCities: searchCities,
    getCity: getCity,
    queryAttractions: queryAttractions,
    getAttractionsByIds: getAttractionsByIds,
}
const opt: CandidateDesignOptions = {
    tools: tools,
    api_key: process.env.AGENT_API_KEY,
    model: 'gemini-3.5-flash-lite',
    reasoning_effort: "medium",
    askUserDecision: askUserDecisionTool
}

processCandidateDesign(
    input,
    opt
).then((res) => {
    console.log(JSON.stringify(res))
})
