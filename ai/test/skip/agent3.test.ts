import { CandidateBundle, TravelerProfile } from "../candidate-design";
import { NarrativeInput, NarrativeOptions, processNarrative } from "../narrative";
import { mockCandBundl } from "./mockcandidatebundle";
import { profJSON } from "./mockprofile";

const candBundl: CandidateBundle = mockCandBundl
const prof: TravelerProfile = profJSON

const input: NarrativeInput = {
    profile: prof,
    profile_revision: 1,
    candidate: candBundl,
        dataset_revisions: {
            city: candBundl.dataset_revisions.city,
            attraction: candBundl.dataset_revisions.attraction
        }
}

const opt: NarrativeOptions = {
    api_key: process.env.AGENT_API_KEY,
    model: 'gemini-3.5-flash-lite',
    // reasoning_effort: "medium",
}

processNarrative(
    input,
    opt
).then((res) => {
    console.log(JSON.stringify(res))
})
