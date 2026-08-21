import { createContext, useContext, useState, ReactNode } from 'react'

type Ctx = {
  intent: string; setIntent:(s:string)=>void
  workflowState: string
  setWorkflowState:(s:string)=>void
}

const INTENT_STORAGE_KEY = 'voyager_intent'

const AppCtx = createContext<Ctx>(null as any)
export function AppProvider({children}:{children:ReactNode}){
  const [intent,setIntent]=useState(() => {
    try {
      const v = typeof window !== 'undefined' ? window.localStorage.getItem(INTENT_STORAGE_KEY) : null
      return v && v.trim().length > 0 ? v : 'Kyoto in autumn, slow, sunrise photography'
    } catch { return 'Kyoto in autumn, slow, sunrise photography' }
  })
  const [workflowState,setWorkflowState]=useState('arrival')
  const persistIntent = (s: string) => {
    setIntent(s)
    try { if (typeof window !== 'undefined') window.localStorage.setItem(INTENT_STORAGE_KEY, s) } catch {}
  }
  return <AppCtx.Provider value={{intent,setIntent: persistIntent, workflowState,setWorkflowState}}>{children}</AppCtx.Provider>
}
export function useAppState(){ return useContext(AppCtx) }
