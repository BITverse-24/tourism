import { createPlanSnapshotMessage, createProfileSnapshotMessage } from "../factory/Event";
import { addDiscoveryQuestion, getSessionCheckpoint, getSessionProfile, setSessionCheckpoint, setWorkflowState } from "../models/data";
import { generateUUID } from "../modules/util";
import { ProfileConfirmMessage, ProfileRequestChangesMessage } from "../structures/CommandMessage";
import { DiscoveryAnsSelectionModes, DiscoveryFreeTextModes, Events, PlanSnapshotStates, ProfileSnapshotStates, WorkflowStates } from "../structures/enums";
import { PlanSnapshotMessage, ProfileSnapshotMessage } from "../structures/EventMessage";
import { CheckpointType, ProfileSnapshot, ServiceResult } from "../structures/types";
import { newDiscoveryQuestionService } from "./DiscoveryServices";
import { nextSequence } from "./StateServices";
import { CandidateDesignInput, CandidateDesignOptions, CandidateDesignResult, processCandidateDesign, RunBudget } from "../../../ai/candidate-design";
import { TravelerProfile } from "../structures/TravelerProfile";
import { AppConfig, loadConfig } from "../app/config";
import { createCandidateDesignOptions, createCandidateDesignTools, createNarrativeOptions } from "../factory/AgentConfig";
import { getCity, searchCities } from "../agent_tools/CityKnowledgebaseTools";
import { getAttractionsByIds, queryAttractions } from "../agent_tools/AttractionKnowledgebaseTools";
import { askUserDecisionTool } from "../agent_tools/CandidateDecision";
import { NarrativeInput, NarrativeOptions, NarrativeResult, processNarrative } from "../../../ai/narrative";
import { logger } from "../modules/logger";

export async function profileConfirmService(
        emit: (res: ServiceResult) => void,
        data: ProfileConfirmMessage,
): Promise<ServiceResult[]> {
        const res: ServiceResult[] = []

        logger.debug('started profile.confirm service', { data: data })

        // mark the confirmed profile
        const checkpoint: CheckpointType = await getSessionCheckpoint(data.session_id)
        const profile: TravelerProfile = await getSessionProfile(data.session_id);
        const revision = (checkpoint.profile_snapshots.length == 0) ?
                1 :
                checkpoint.profile_snapshots[checkpoint.profile_snapshots.length - 1].revision + 1
        const snapshot: ProfileSnapshot = {
                revision: revision,
                state: ProfileSnapshotStates.CONFIRMED,
                profile: profile,
        }
        checkpoint.profile_snapshots.push(snapshot)

        await setSessionCheckpoint(data.session_id, checkpoint)

        // send confirmed profile snapshot
        const profSnapMsg: ProfileSnapshotMessage = createProfileSnapshotMessage({
                message_id: `msg_${generateUUID()}`,
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                occurred_at: new Date().toISOString(),
                sequence: await nextSequence(data.session_id),
                payload: snapshot
        })
    logger.debug('sending profile.snapshot with the confirmed profile snapshot', {data: profSnapMsg})
    emit({ event: Events.PROFILE_SNAPSHOT, data: profSnapMsg })

    // set workflow to planning
    setWorkflowState(data.session_id, WorkflowStates.PLANNING)

    // start planning                                                                       
    // agent 2 service                                                                      
    const conf: AppConfig = loadConfig(process.env)                                         
    const runBudget: RunBudget = {                                                          
        max_candidates: conf.agent_2_max_candidates,                                        
        max_tool_calls: conf.agent_2_max_tool_calls,                                        
        max_rows_per_tool_call: conf.agent_2_max_rows_per_tool_call,                        
        timeout_ms: conf.agent_timeout_ms,                                                  
    }                                                                                       
    const candidateDesignInput: CandidateDesignInput = {                                    
        profile: profile,                                                                   
        run_budget: runBudget,                                                              
        session_id: data.session_id,                                                        
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
    const narrativeInput: NarrativeInput = {                                                
        profile: profile,                                                                   
        profile_revision: revision,                                                         
        candidate: candidateDesignRes.candidates[0],                                        
        dataset_revisions: { city: "HUH", attraction: "HUUH" }, ///// TOO DOO when whenever 
    }                                                                                       
    const narrativeOpt: NarrativeOptions = createNarrativeOptions({                         
        api_key: conf.agent_api_key,                                                        
        model: conf.agent_model,                                                            
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
    logger.debug('sending plan snapshot of the final trup plan', {data: planSnapMsg})
    emit({ event: Events.PLAN_SNAPSHOT, data: planSnapMsg })                                
    
    logger.debug('completed profile.confirm service', {data: data})
    return res
}

export async function profileRequestChangesService(
    emit: (res: ServiceResult) => void,
    data: ProfileRequestChangesMessage,
): Promise<ServiceResult[]> {
    const res: ServiceResult[] = []
    logger.debug('started profile.request_changes service', {data: data})

    await setWorkflowState(data.session_id, WorkflowStates.DISCOVERY)
    // give agent to ask questions for the requested change topics ?????
    const question =
        {
            question_id: `req-change_${data.command_id}`,
            prompt: 'Are you okay with this profile',  /////////// ToDO
            selection_mode: DiscoveryAnsSelectionModes.SINGLE,
            required: false,
            options: [],
            free_text_mode: DiscoveryFreeTextModes.REQUIRED,
            free_text_placeholder: null,
        };

    await addDiscoveryQuestion(data.run_id, question)
    await newDiscoveryQuestionService(
        emit,
        data.session_id,
        data.run_id,
        data.command_id,
        await getSessionProfile(data.session_id),
        {
            question_id: `req-change_${data.command_id}`,
            question: question,
            selected_option_ids: [],
            free_text: data.payload.free_text,
        },
    )

    logger.debug('completed profile.request_changes service', {data: data})
    return res
}
