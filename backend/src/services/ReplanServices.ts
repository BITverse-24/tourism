import { CandidateDesignInput, CandidateDesignOptions, CandidateDesignResult, processCandidateDesign, RunBudget, TravelerProfile } from "../../../ai/candidate-design";
import { NarrativeInput, NarrativeOptions, NarrativeResult, processNarrative } from "../../../ai/narrative";
import { getAttractionsByIds, queryAttractions } from "../agent_tools/AttractionKnowledgebaseTools";
import { askUserDecisionTool } from "../agent_tools/CandidateDecision";
import { getCity, searchCities } from "../agent_tools/CityKnowledgebaseTools";
import { AppConfig, loadConfig } from "../app/config";
import { createCandidateDesignOptions, createCandidateDesignTools, createNarrativeOptions } from "../factory/AgentConfig";
import { createPlanSnapshotMessage } from "../factory/Event";
import { getSessionProfile, getTripPlan, setTripPlan } from "../models/data";
import { logger } from "../modules/logger";
import { generateUUID } from "../modules/util";
import { ReplanRequestMessage } from "../structures/CommandMessage";
import { Events, PlanSnapshotStates } from "../structures/enums";
import { PlanSnapshotMessage } from "../structures/EventMessage";
import { ServiceResult } from "../structures/types";
import { nextSequence } from "./StateServices";

export async function replanService(
        emit: (res: ServiceResult) => void,
        data: ReplanRequestMessage,
) {

    const conf: AppConfig = loadConfig(process.env)                                         
    const runBudget: RunBudget = {                                                          
        max_candidates: conf.agent_2_max_candidates,                                        
        max_tool_calls: conf.agent_2_max_tool_calls,                                        
        max_rows_per_tool_call: conf.agent_2_max_rows_per_tool_call,                        
        timeout_ms: conf.agent_timeout_ms,                                                  
    }                                                                                       
    const prof: TravelerProfile =  await getSessionProfile(data.session_id); 
    const candidateDesignInput: CandidateDesignInput = {                                    
        profile: prof,
        run_budget: runBudget,                                                              
        session_id: data.session_id,                                                        
        replan: {
            replan_reason: data.payload.replan_reason,
            previous_plan: await getTripPlan(data.run_id),
        }
    }                                                                                       
    
    const candidateDesignOpt: CandidateDesignOptions = createCandidateDesignOptions({       
        tools: createCandidateDesignTools({                                                 
            searchCities: searchCities,                                                     
            getCity: getCity,                                                               
            queryAttractions: queryAttractions,                                             
            getAttractionsByIds: getAttractionsByIds                                        
        }),                                                                                 
        api_key: conf.agent_api_key,                                                        
        model: conf.agent_model,                                                            
        reasoning_effort: conf.agent_reasoning_effort,                                      
        api_url: conf.agent_api_url,                                                        
        timeout_ms: conf.agent_timeout_ms,                                                  
        askUserDecision: askUserDecisionTool,                                               
    })                                                                                      
    logger.debug('calling agent 2 for candidate bundle', {input: candidateDesignInput})
    const candidateDesignRes: CandidateDesignResult = await processCandidateDesign(         
        candidateDesignInput,                                                               
        candidateDesignOpt                                                                  
    )                                                                                       
    logger.debug('recieved candidate result from agent 2', {res: candidateDesignRes})
    
    
    // agent 3 service                                                                      
    const candidate = candidateDesignRes.candidates[0];                                        
    const narrativeInput: NarrativeInput = {                                                
        profile: prof,
        profile_revision: candidate.profile_revision,
        candidate: candidate,
        dataset_revisions: { city: candidate.dataset_revisions.city, attraction: candidate.dataset_revisions.attraction }, ///// TOO DOO when whenever 
    }                                                                                       
    const narrativeOpt: NarrativeOptions = createNarrativeOptions({                         
        api_key: conf.agent_api_key,                                                        
        model: conf.agent_model,                                                            
        api_url: conf.agent_api_url,                                                        
        timeout_ms: conf.agent_timeout_ms,                                                  
    })                                                                                      
    logger.debug('calling agent 3 for final trip plan', {input: narrativeInput})
    const narrativeRes: NarrativeResult = await processNarrative(                           
        narrativeInput,                                                                     
        narrativeOpt                                                                        
    )                                                                                       
    logger.debug('recieved final trip plan from agent 3', {res: narrativeRes})
    
    // plan snapshot message                                                                
    const planSnapMsg: PlanSnapshotMessage = createPlanSnapshotMessage({                    
        message_id: `msg_${generateUUID()}`,                                                
        session_id: data.session_id,                                                        
        run_id: data.run_id,                                                                
        command_id: data.command_id,                                                        
        occurred_at: new Date().toISOString(),                                              
        sequence: await nextSequence(data.run_id),                                          
        payload: {                                                                          
            revision: 1, // cos final is first rn??                                         
            state: PlanSnapshotStates.FINAL,                                                
            plan: narrativeRes.plan                                                         
        }                                                                                   
    })                                                                                      
    setTripPlan(data.run_id, narrativeRes.plan)
    logger.debug('sending plan snapshot of the final trup plan', {data: planSnapMsg})
    emit({ event: Events.PLAN_SNAPSHOT, data: planSnapMsg })                                
    
    logger.debug('completed replan.requst service', {data: data})
}
