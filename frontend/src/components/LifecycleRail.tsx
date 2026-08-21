/**
 * LifecycleRail — standalone rail (outside Consultation)
 * When rendered outside Consultation it now subscribes to the live
 * PlanningLifecycleStore via the shared WsClient, so it is not a dummy.
 * When Consultation owns its rail that instance is authoritative, but this
 * standalone instance still shows live progress for deep-linked plan views.
 */

import { useEffect, useState, useRef } from 'react'
import { getSharedWsClient } from '../ws/WsProvider'
import { PlanningLifecycleStore } from '../ws/planning'

type RailStatus = "queued" | "started" | "progressed" | "completed" | "failed" | "decision_required"

const FALLBACK_STAGES: { key: string; label: string; status: RailStatus; summary?: string }[] = [
  { key:'discovery', label:'Discovery', status:'completed', summary:'Understanding you' },
  { key:'constraint_preference', label:'Constraint & Preference', status:'decision_required', summary:'Your input is needed to continue.' },
  { key:'experience_designer', label:'Attraction & Experience Designer', status:'queued', summary:'' },
  { key:'mobility_logistics', label:'Mobility', status:'queued', summary:'' },
  { key:'cost_optimization', label:'Cost', status:'queued', summary:'' },
  { key:'local_intelligence', label:'Local Intelligence', status:'queued', summary:'' },
  { key:'simulation_risk', label:'Simulation', status:'queued', summary:'' },
  { key:'optimization', label:'Optimization', status:'queued', summary:'' },
  { key:'narrative_explanation', label:'Narrative', status:'queued', summary:'' },
  { key:'continuous_replanning', label:'Continuous Replanning', status:'queued', summary:'Later phase' },
]

function Dot({status}:{status: RailStatus}){
  if(status==='decision_required') return <span style={{width:9,height:9,borderRadius:999,background:'#B38A55', display:'inline-block', boxShadow:'0 0 0 6px rgba(179,138,85,0.14), 0 0 10px rgba(216,193,154,0.38)', animation:'rippleBreathe 1.6s ease-in-out infinite'}}/>
  if(status==='completed') return <span style={{width:7,height:7,borderRadius:999,background:'var(--voyager-sage)', display:'inline-block', opacity:0.95}}/>
  if(status==='failed') return <span style={{width:7,height:7,borderRadius:999,background:'var(--voyager-clay)', display:'inline-block'}}/>
  if(status==='started' || status==='progressed') return <span style={{width:7,height:7,borderRadius:999,background:'var(--voyager-brass-1)', display:'inline-block', boxShadow:'0 0 0 5px rgba(179,138,85,0.14)', animation:'rippleBreathe 2.2s ease-in-out infinite'}}/>
  return <span style={{width:7,height:7,borderRadius:999,border:'1px solid rgba(201,187,165,0.55)', display:'inline-block'}}/>
}

export default function LifecycleRail({expanded, decisionStageKey: _decisionStageKey}:{expanded:boolean; decisionStageKey?: string}){
  const [liveStages, setLiveStages] = useState<{ key: string; label: string; status: RailStatus; summary?: string }[] | null>(null)
  const storeRef = useRef<PlanningLifecycleStore | null>(null)
  useEffect(() => {
    if (!expanded) return
    try {
      const client = getSharedWsClient()
      const store = new PlanningLifecycleStore({
        onStagesChanged: (stages) => {
          setLiveStages(stages.map(s => ({ key: s.key, label: s.label, status: s.status as RailStatus, summary: s.summary })))
        },
        onPlanningStatusChanged: () => {},
        onDiagnostics: () => {},
      })
      storeRef.current = store
      setLiveStages(store.getStages().map(s => ({ key: s.key, label: s.label, status: s.status as RailStatus, summary: s.summary })))
      const unsub = client.subscribe((env) => {
        const t = (env as unknown as { type: string }).type
        const kind = (env as unknown as { kind: string }).kind
        if (kind !== 'event') return
        if (t === 'agent.lifecycle') store.handleAgentLifecycle(env.payload)
        else if (t === 'planning.status') store.handlePlanningStatus(env.payload)
      })
      return () => { unsub(); storeRef.current = null }
    } catch {
      setLiveStages(null)
    }
  }, [expanded])

  const stages = liveStages ?? FALLBACK_STAGES

  if(!expanded){
    return <div aria-hidden style={{position:'fixed', right:0, top:64, bottom:0, width:3, background:'rgba(179,138,85,0.32)'}}/>
  }
  return (
    <aside aria-label="Lifecycle" style={{position:'fixed', right:0, top:64, bottom:0, width:288, background:'rgba(24,35,42,0.98)', color:'var(--voyager-light-ink)', padding:'28px 20px', overflow:'auto', boxShadow:'-8px 0 24px rgba(0,0,0,0.10)', borderLeft:'1px solid rgba(242,235,221,0.08)', boxSizing:'border-box'}}>
      <div style={{fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(242,235,221,0.46)', marginBottom:20, fontWeight:400}}>Progress</div>
      <div style={{display:'flex', flexDirection:'column', gap:18}}>
        {stages.map(s=>{
          const isDecision = s.status==='decision_required'
          const dimAfterDecision = !isDecision && stages.findIndex(x=>x.status==='decision_required')!==-1 && stages.findIndex(x=>x.key===s.key) > stages.findIndex(x=>x.status==='decision_required')
          return (
          <div key={s.key} style={{display:'flex', gap:10, alignItems:'flex-start', opacity: dimAfterDecision ? 0.42 : 1, background: isDecision ? 'linear-gradient(90deg, rgba(216,193,154,0.06) 0%, transparent 70%)' : 'none', margin: isDecision ? '-6px -8px' : 0, padding: isDecision ? '8px' : 0, borderRadius: isDecision ? 8 : 0}}>
            <span style={{marginTop:5, display:'inline-flex'}}><Dot status={s.status as RailStatus}/></span>
            <div>
              <div style={{fontSize:12.5, fontWeight:500, color:'rgba(242,235,221,0.92)', letterSpacing:'0.01em'}}>{s.label}</div>
              <div style={{fontSize:11, letterSpacing: isDecision ? '0.08em' : '0.06em', textTransform:'uppercase', color: isDecision ? 'var(--voyager-brass-2)' : 'rgba(242,235,221,0.46)', marginTop:2, fontWeight:500}}>{isDecision ? 'Decision required' : s.status==='queued' ? 'Queued' : s.status==='completed' ? 'Completed' : s.status==='failed' ? 'Needs attention' : 'In progress'}</div>
              {s.summary && <div style={{fontSize:11.5, color: isDecision ? 'rgba(242,235,221,0.72)' : 'rgba(242,235,221,0.52)', marginTop:4, lineHeight:1.45, fontStyle: isDecision ? 'italic' : 'normal'}}>{s.summary}</div>}
              {s.status==='failed' && <div style={{fontSize:11, color:'var(--voyager-clay)', marginTop:4, opacity:0.9}}>This check will be retried — your plan is still being shaped.</div>}
            </div>
          </div>
        )})}
      </div>
    </aside>
  )
}
