import { CandidateDesignInput, CandidateDesignOptions, CandidateDesignTools, processCandidateDesign, TravelerProfile } from "../candidate-design";
import { NarrativeInput, NarrativeOptions, processNarrative } from "../narrative";
import { getAttractionsByIds, queryAttractions } from "./agent_tools/AttractionKnowledgebaseTools";
import { askUserDecisionTool } from "./agent_tools/CandidateDecision";
import { getCity, searchCities } from "./agent_tools/CityKnowledgebaseTools";
import { profJSON } from "./mockprofile";
import 'dotenv/config';

const profile: TravelerProfile = profJSON

const candinput: CandidateDesignInput = {
    profile: profile,
    session_id: "abc",
    run_budget: {
        max_candidates: 1,
        max_tool_calls: 30,
        max_rows_per_tool_call: 50,
        timeout_ms: 120000,
        }
}
const candtools: CandidateDesignTools = {
    searchCities: searchCities,
    getCity: getCity,
    queryAttractions: queryAttractions,
    getAttractionsByIds: getAttractionsByIds,
}
const candopt: CandidateDesignOptions = {
    tools: candtools,
    api_key: process.env.AGENT_API_KEY,
    model: 'gemini-3.5-flash-lite',
    reasoning_effort: "medium",
    askUserDecision: askUserDecisionTool
}

const narratopt: NarrativeOptions = {
    api_key: process.env.AGENT_API_KEY,
    model: 'gemini-3.5-flash-lite',
    // reasoning_effort: "medium",
}

processCandidateDesign(
    candinput,
    candopt
).then((candbundl) => {
    console.log("\n\nCandidate Bundle: " + JSON.stringify(candbundl))

    const cand = candbundl.candidates[0]
    const narratinput: NarrativeInput = {
        profile: profile,
        profile_revision: cand.profile_revision,
        candidate: cand,
        dataset_revisions: {
            city: cand.dataset_revisions.city,
            attraction: cand.dataset_revisions.attraction
        }
    }

    processNarrative(
        narratinput,
        narratopt
    ).then((narrresone) => {
        console.log("\n\n Final Trip Plan: " + JSON.stringify(narrresone))

        const replcandinp: CandidateDesignInput = {
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
                previous_plan: narrresone.plan
            }
        }

        processCandidateDesign(
            replcandinp,
            candopt
        ).then((replcandbundl) => {

            console.log("\n\nReplan Candidate Bundle: " + JSON.stringify(replcandbundl))

            const cand = replcandbundl.candidates[0]
            const replnarratinput: NarrativeInput = {
                profile: profile,
                profile_revision: cand.profile_revision,
                candidate: cand,
                dataset_revisions: {
                    city: cand.dataset_revisions.city,
                    attraction: cand.dataset_revisions.attraction
                }
            }

            processNarrative(
                replnarratinput,
                narratopt
            ).then((narrrestwo) => {
                console.log("\n\n Replanned Final Trip Plan: " + JSON.stringify(narrrestwo))
            })
        })
    })
})
