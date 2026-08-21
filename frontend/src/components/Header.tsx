import { useLocation, Link } from 'react-router-dom'
import { useWsOptional, workflowStateToPath } from '../ws/WsProvider'
import { usePlan } from '../hooks/usePlan'

const labels: Record<string,string> = {
  '/': 'Arrival',
  '/discovery': 'Discovery',
  '/profile-review': 'Review',
  '/consultation': 'Consultation',
  '/decision': 'Your choice',
  '/tradeoff': 'Itinerary',
  '/trip-overview': 'Itinerary',
  '/day-canvas': 'Itinerary',
}

// Order for gating: which workflow states allow which links
const WORKFLOW_ORDER: Record<string, number> = {
  discovery: 1,
  profile_review: 2,
  planning: 3,
  decision_required: 3,
  plan_ready: 4,
  replanning: 4,
  cancelled: 0,
  expired: 0,
}

function isAllowed(path: string, workflowState: string | null, isFinal: boolean): boolean {
  if (!workflowState) {
    // No session yet — only arrival/discovery are safe; block overview/days
    if (path === '/trip-overview' || path === '/day-canvas' || path === '/tradeoff') return isFinal
    return true
  }
  const order = WORKFLOW_ORDER[workflowState] ?? 0
  // arrival always allowed
  if (path === '/') return true
  if (path === '/discovery') return true // always reachable (recovery)
  if (path === '/profile-review') return order >= 2
  if (path === '/consultation' || path === '/decision') return order >= 3
  if (path === '/trip-overview' || path === '/day-canvas' || path === '/tradeoff') {
    // Do not allow direct jump to overview/days if no final plan
    if (!isFinal && workflowState !== 'plan_ready') return false
    return order >= 4 || isFinal
  }
  if (path === '/replanning') return order >= 4 || isFinal
  return true
}

export default function Header(){
  const loc = useLocation()
  const label = labels[loc.pathname] ?? 'Voyager'
  const ws = useWsOptional()
  const workflowState = ws?.workflowState ?? null
  const { state: planState } = usePlan()
  const isFinal = planState === 'final'
  const activePath = workflowState ? workflowStateToPath(workflowState) : null

  const links: [string,string][] = [
    ['/','Arrival'],
    ['/discovery','Discovery'],
    ['/profile-review','Review'],
    ['/consultation','Consultation'],
    ['/decision','Decision'],
    ['/trip-overview','Overview'],
    ['/day-canvas','Days'],
  ]

  return (
    <header style={{height:64, position:'sticky', top:0, zIndex:40, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 5vw', background:'rgba(247,242,233,0.66)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', borderBottom:'1px solid rgba(225,214,197,0.42)', boxSizing:'border-box'}}>
      <Link to="/" style={{textDecoration:'none', display:'flex', alignItems:'center', gap:10}}>
        <span className="serif" style={{fontSize:17, letterSpacing:'0.12em', fontWeight:400, color:'var(--voyager-ink-1)'}}>VOYAGER</span>
        <span style={{width:1,height:16, background:'rgba(225,214,197,0.7)'}}/>
        <span style={{fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(125,135,138,0.78)', fontWeight:400}}>{label}</span>
      </Link>
      <nav style={{display:'flex', gap:4, alignItems:'center'}} aria-label="Primary">
        {links.map(([p,l])=>{
          const isActive = loc.pathname===p || (activePath===p) || (activePath==='/consultation' && p==='/consultation' && loc.pathname==='/decision') || (activePath==='/consultation' && p==='/decision' && loc.pathname==='/consultation')
          const allowed = isAllowed(p, workflowState, isFinal)
          const activeByWorkflow = activePath === p || (activePath === '/consultation' && (p === '/consultation' || p === '/decision'))
          if (!allowed) {
            return (
              <span key={p} title={workflowState ? `Available after ${workflowState}` : 'Complete planning to view'} style={{fontSize:10, letterSpacing:'0.09em', textTransform:'uppercase', padding:'5px 8px', borderRadius:6, background:'transparent', color:'rgba(86,99,106,0.32)', fontWeight:400, border:'1px solid transparent', cursor:'not-allowed', opacity:0.55}} aria-disabled="true">{l}</span>
            )
          }
          return (
            <Link key={p} to={p} aria-current={isActive ? 'page' : undefined} style={{fontSize:10, letterSpacing:'0.09em', textTransform:'uppercase', textDecoration:'none', padding:'5px 8px', borderRadius:6, background: isActive ? 'rgba(238,230,216,0.85)' : activeByWorkflow ? 'rgba(238,230,216,0.45)' : 'transparent', color: isActive ? 'var(--voyager-ink-1)' : activeByWorkflow ? 'var(--voyager-ink-1)' : 'rgba(86,99,106,0.72)', fontWeight: isActive ? 500 : 400, border: isActive ? '1px solid rgba(225,214,197,0.5)' : activeByWorkflow ? '1px solid rgba(225,214,197,0.28)' : '1px solid transparent'}}>{l}</Link>
          )
        })}
      </nav>
    </header>
  )
}
