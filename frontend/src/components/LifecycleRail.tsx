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
  if(status==='completed') return <span style={{width:7,height:7,borderRadius:999,background:'var(--voyager-sage)', display:'inline-block', opacity:0.95}}/>
  if(status==='failed') return <span style={{width:7,height:7,borderRadius:999,background:'var(--voyager-clay)', display:'inline-block'}}/>
  if(status==='progress') return <span style={{width:7,height:7,borderRadius:999,background:'var(--voyager-brass-1)', display:'inline-block', boxShadow:'0 0 0 5px rgba(179,138,85,0.14)', animation:'rippleBreathe 2.2s ease-in-out infinite'}}/>
  return <span style={{width:7,height:7,borderRadius:999,border:'1px solid rgba(201,187,165,0.55)', display:'inline-block'}}/>
}

export default function LifecycleRail({expanded}:{expanded:boolean}){
  if(!expanded){
    return <div aria-hidden style={{position:'fixed', right:0, top:64, bottom:0, width:3, background:'rgba(179,138,85,0.32)'}}/>
  }
  return (
    <aside aria-label="Lifecycle" style={{position:'fixed', right:0, top:64, bottom:0, width:288, background:'rgba(27,37,44,0.96)', color:'var(--voyager-light-ink)', padding:'28px 20px', overflow:'auto', boxShadow:'-8px 0 24px rgba(0,0,0,0.10)', borderLeft:'1px solid rgba(242,235,221,0.06)', boxSizing:'border-box'}}>
      <div style={{fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(242,235,221,0.46)', marginBottom:20, fontWeight:400}}>Lifecycle</div>
      <div style={{display:'flex', flexDirection:'column', gap:18}}>
        {stages.map(s=>(
          <div key={s.key} style={{display:'flex', gap:10, alignItems:'flex-start'}}>
            <span style={{marginTop:5, display:'inline-flex'}}><Dot status={s.status}/></span>
            <div>
              <div style={{fontSize:12.5, fontWeight:400, color:'rgba(242,235,221,0.92)', letterSpacing:'0.01em'}}>{s.label}</div>
              {s.summary && <div style={{fontSize:11.5, color:'rgba(242,235,221,0.52)', marginTop:2, lineHeight:1.45}}>{s.summary}</div>}
              {s.status==='failed' && <div style={{fontSize:11, color:'var(--voyager-clay)', marginTop:4, opacity:0.9}}>This check will be retried — your plan is still being shaped.</div>}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
