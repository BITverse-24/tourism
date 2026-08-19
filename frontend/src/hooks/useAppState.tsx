import { createContext, useContext, useState, ReactNode } from 'react'
import { mockProfile } from '../data/mockProfile'
import { mockPlan } from '../data/mockPlan'
import { TravelerProfile, FinalPlan } from '../types'

type Ctx = {
  intent: string; setIntent:(s:string)=>void
  profile: TravelerProfile
  plan: FinalPlan
  workflowState: string
  setWorkflowState:(s:string)=>void
}

const AppCtx = createContext<Ctx>(null as any)
export function AppProvider({children}:{children:ReactNode}){
  const [intent,setIntent]=useState('Kyoto in autumn, slow, sunrise photography')
  const [workflowState,setWorkflowState]=useState('arrival')
  return <AppCtx.Provider value={{intent,setIntent, profile: mockProfile, plan: mockPlan, workflowState,setWorkflowState}}>{children}</AppCtx.Provider>
}
export function useAppState(){ return useContext(AppCtx) }
