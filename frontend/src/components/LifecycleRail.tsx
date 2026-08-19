const stages = [
  { key:'discovery', label:'Discovery', status:'completed', summary:'Understanding you' },
  { key:'constraint_preference', label:'Preferences', status:'completed', summary:'Shaping constraints' },
  { key:'experience_designer', label:'Experience Designer', status:'progress', summary:'Selecting experiences' },
  { key:'mobility_logistics', label:'Mobility', status:'queued', summary:'' },
  { key:'cost_optimization', label:'Cost', status:'queued', summary:'' },
  { key:'local_intelligence', label:'Local Intelligence', status:'queued', summary:'' },
  { key:'simulation_risk', label:'Simulation', status:'queued', summary:'' },
  { key:'optimization', label:'Optimization', status:'queued', summary:'' },
  { key:'narrative_explanation', label:'Narrative', status:'queued', summary:'' },
  { key:'continuous_replanning', label:'Continuous Replanning', status:'queued', summary:'Later phase' },
]

function Dot({status}:{status:string}){
  if(status==='completed') return <span style={{width:8,height:8,borderRadius:999,background:'var(--voyager-sage)', display:'inline-block'}}/>
  if(status==='failed') return <span style={{width:8,height:8,borderRadius:999,background:'var(--voyager-clay)', display:'inline-block'}}/>
  if(status==='progress') return <span style={{width:8,height:8,borderRadius:999,background:'var(--voyager-brass-1)', display:'inline-block', boxShadow:'0 0 0 6px rgba(179,138,85,0.18)', animation:'rippleBreathe 2.2s ease-in-out infinite'}}/>
  return <span style={{width:8,height:8,borderRadius:999,border:'1px solid var(--voyager-bone-3)', display:'inline-block'}}/>
}

export default function LifecycleRail({expanded}:{expanded:boolean}){
  if(!expanded){
    return <div aria-hidden style={{position:'fixed', right:0, top:72, bottom:0, width:4, background:'var(--voyager-brass-1)', opacity:.9}}/>
  }
  return (
    <aside aria-label="Lifecycle" style={{position:'fixed', right:0, top:72, bottom:0, width:320, background:'var(--voyager-ink-0)', color:'var(--voyager-light-ink)', padding:'32px 24px', overflow:'auto', boxShadow:'var(--voyager-shadow-night-rail)', borderLeft:'1px solid rgba(242,235,221,0.08)'}}>
      <div style={{fontSize:11, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(242,235,221,0.58)', marginBottom:24}}>Lifecycle</div>
      <div style={{display:'flex', flexDirection:'column', gap:22}}>
        {stages.map(s=>(
          <div key={s.key} style={{display:'flex', gap:12}}>
            <Dot status={s.status}/>
            <div>
              <div style={{fontSize:13, fontWeight:500, color:'var(--voyager-light-ink)'}}>{s.label}</div>
              {s.summary && <div style={{fontSize:12, color:'rgba(242,235,221,0.62)', marginTop:2, lineHeight:1.5}}>{s.summary}</div>}
              {s.status==='failed' && <div style={{fontSize:11, color:'var(--voyager-clay)', marginTop:4}}>This check will be retried — your plan is still being shaped.</div>}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
