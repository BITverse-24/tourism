import { ProcessDiscoveryOptions } from "../../../ai/discovery";
import { CandidateDesignOptions, CandidateDesignTools } from "../../../ai/candidate-design";
import { NarrativeOptions } from "../../../ai/narrative";

export function createProcessDiscoveryOptions({
    api_key,
    model,
    reasoning_effort,
    api_url,
    timeout_ms,
    fetcher,
    log_raw_responses,
}: ProcessDiscoveryOptions = {}): ProcessDiscoveryOptions {
    return {
        ...(api_key !== undefined && { api_key }),
        ...(model !== undefined && { model }),
        ...(reasoning_effort !== undefined && { reasoning_effort }),
        ...(api_url !== undefined && { api_url }),
        ...(timeout_ms !== undefined && { timeout_ms }),
        ...(fetcher !== undefined && { fetcher }),
        ...(log_raw_responses !== undefined && { log_raw_responses }),
    };
}

export function createCandidateDesignTools({
    searchCities,
    getCity,
    queryAttractions,
    getAttractionsByIds,
}: CandidateDesignTools): CandidateDesignTools {
    return {
        searchCities,
        getCity,
        queryAttractions,
        getAttractionsByIds,
    };
}

export function createCandidateDesignOptions({
    tools,
    api_key,
    model,
    reasoning_effort,
    api_url,
    timeout_ms,
    fetcher,
    askUserDecision,
    onProgress,
}: CandidateDesignOptions): CandidateDesignOptions {
    return {
        tools,
        ...(api_key !== undefined && { api_key }),
        ...(model !== undefined && { model }),
        ...(reasoning_effort !== undefined && { reasoning_effort }),
        ...(api_url !== undefined && { api_url }),
        ...(timeout_ms !== undefined && { timeout_ms }),
        ...(fetcher !== undefined && { fetcher }),
        ...(askUserDecision !== undefined && { askUserDecision }),
        ...(onProgress !== undefined && { onProgress }),
    };
}

export function createNarrativeOptions({
    api_key,
    model,
    timeout_ms,
    fetcher,
}: NarrativeOptions = {}): NarrativeOptions {
    return {
        ...(api_key !== undefined && { api_key }),
        ...(model !== undefined && { model }),
        ...(timeout_ms !== undefined && { timeout_ms }),
        ...(fetcher !== undefined && { fetcher }),
    };
}
