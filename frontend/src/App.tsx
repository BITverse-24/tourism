import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useState, useRef, useEffect, useContext } from 'react'
import Header from './components/Header'
import Arrival from './screens/Arrival'
import Discovery from './screens/Discovery'
import ProfileReview from './screens/ProfileReview'
import Consultation from './screens/Consultation'
import TradeoffBrief from './screens/TradeoffBrief'
import TripOverview from './screens/TripOverview'
import DayCanvas from './screens/DayCanvas'
import ExperienceDetail from './screens/ExperienceDetail'
import Replanning from './screens/Replanning'
import type { ItineraryItem } from './screens/DayCanvas'
import SessionBanner from './components/SessionBanner'
import ErrorBanner from './components/ErrorBanner'
import { useWsBannerState } from './hooks/useWsBannerState'
import { usePlan } from './hooks/usePlan'
import { WsContext, workflowStateToPath } from './ws/WsProvider'

function TripOverviewGuard({ plan, state, revision, hasLivePlan }: { plan: ReturnType<typeof usePlan>['plan']; state: ReturnType<typeof usePlan>['state']; revision: ReturnType<typeof usePlan>['revision']; hasLivePlan: boolean }){
  const ws = useContext(WsContext)
  const workflowState = ws?.workflowState ?? null
  const isFinal = state === 'final'
  const allowed = workflowState === 'plan_ready' || isFinal
  if (!allowed && !isFinal) {
    const target = workflowState ? workflowStateToPath(workflowState) : '/discovery'
    return <Navigate to={target} replace />
  }
  return <TripOverview plan={plan} state={state ?? undefined} revision={revision ?? undefined} />
}
function DayCanvasGuard({ plan, state, revision, hasLivePlan, onSelectItem }: { plan: ReturnType<typeof usePlan>['plan']; state: ReturnType<typeof usePlan>['state']; revision: ReturnType<typeof usePlan>['revision']; hasLivePlan: boolean; onSelectItem: (d:number,i:number,item:ItineraryItem)=>void }){
  const ws = useContext(WsContext)
  const workflowState = ws?.workflowState ?? null
  const isFinal = state === 'final'
  const allowed = workflowState === 'plan_ready' || isFinal
  if (!allowed && !isFinal) {
    const target = workflowState ? workflowStateToPath(workflowState) : '/discovery'
    return <Navigate to={target} replace />
  }
  return <DayCanvas plan={plan} revision={revision ?? undefined} state={state ?? undefined} workflowCompleted={state === 'final'} onSelectItem={onSelectItem} />
}

function DiscoveryRoute(){
  return <Discovery />
}

function AppShell(){
  const loc=useLocation()
  const navigate = useNavigate()
  const isConsultation = loc.pathname==='/consultation' || loc.pathname==='/decision'
  const isArrival = loc.pathname==='/'
  const [detailOpen,setDetailOpen]=useState(false)
  const [detailItem,setDetailItem]=useState<ItineraryItem | null>(null)
  const returnFocusRef = useRef<HTMLElement>(null) as React.RefObject<HTMLElement>
  const wsCtx = useContext(WsContext)
  const wsClient = wsCtx?.client ?? null
  const workflowState = wsCtx?.workflowState ?? null
  const { sessionBanner, lastError, clearSessionBanner, clearError, handleStartNewSession, handleCloseSuperseded } = useWsBannerState(wsClient ?? undefined)
  const { plan: livePlan, revision: liveRevision, state: liveState, hasLivePlan } = usePlan(wsClient ?? undefined)

  // Workflow-state-driven routing: live state drives URL (loop guard, arrival exempt)
  useEffect(() => {
    if (!workflowState) return
    if (isArrival) return
    // Don't auto-navigate while on plan destinations if already there
    const target = workflowStateToPath(workflowState)
    // Alias: /decision and /consultation are same workflow state
    const isSame = loc.pathname === target || (target === '/consultation' && (loc.pathname === '/consultation' || loc.pathname === '/decision'))
    if (isSame) return
    // Do not auto-navigate away from plan views when plan is final and user explicitly navigated to day-canvas
    if ((loc.pathname === '/trip-overview' || loc.pathname === '/day-canvas') && workflowState === 'plan_ready') return
    navigate(target)
  }, [workflowState, loc.pathname, isArrival, navigate])

  // Auto-navigation on plan snapshot final (draft stays on consultation)
  useEffect(() => {
    const isFinal = liveState === 'final'
    const isPlanReady = workflowState === 'plan_ready'
    if (!isFinal && !isPlanReady) return
    if (liveState === 'draft') return
    if (loc.pathname === '/trip-overview' || loc.pathname === '/day-canvas') return
    if (loc.pathname === '/consultation' || loc.pathname === '/decision') {
      navigate('/trip-overview')
    }
  }, [liveState, workflowState, loc.pathname, navigate])

  // Workflow completed cancelled → show dedicated cancelled state (banner + return to start)
  const isCancelled = workflowState === 'cancelled'

  const handleSelectItem = (_dayIdx:number, _itemIdx:number, item: ItineraryItem) => {
    setDetailItem(item)
    setDetailOpen(true)
  }

  const decisionForRoute: import('./screens/Consultation').DecisionRequest = {
    decision_id: 'decision_profile7_route_a_route_b',
    sequenceLabel: '01  ·  TRADE-OFF',
    kicker: 'A CHOICE IS NEEDED',
    prompt: 'Would you rather keep the pace gentle or see a little more, even if it means more walking?',
    reason: 'material_tradeoff',
    options: [
      { option_id: 'comfort', label: 'Prioritize comfort', tradeoff: 'Fewer attraction visits and less movement — more rest, less transit.' },
      { option_id: 'coverage', label: 'Prioritize coverage', tradeoff: 'More attraction visits and a higher movement burden — see more, walk more.' },
    ],
  }

  return (
    <>
      {(sessionBanner.kind === 'expired' || sessionBanner.kind === 'superseded' || lastError || isCancelled) && (
        <div style={{ display:'flex', flexDirection:'column', gap:10, padding:'12px 5vw 0', background:'transparent' }}>
          {isCancelled && (
            <div role="status" data-testid="cancelled-banner" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:12, border:'1px solid rgba(225,214,197,0.55)', background:'rgba(247,242,233,0.92)', color:'var(--voyager-ink-1)' }}>
              <span style={{ fontSize:13, lineHeight:'18px' }}>Run cancelled — your previous answers are preserved. Start again from Arrival or continue where you left off.</span>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => { try { wsCtx?.startNewSession() } catch {} ; navigate('/') }} style={{ fontSize:12, padding:'6px 12px', borderRadius:8, border:'1px solid var(--voyager-stone)', background:'var(--voyager-ivory)', cursor:'pointer' }}>Start new session</button>
                <button onClick={() => navigate('/discovery')} style={{ fontSize:12, padding:'6px 12px', borderRadius:8, border:'1px solid transparent', background:'transparent', color:'var(--voyager-ink-2)', cursor:'pointer' }}>Back to discovery</button>
              </div>
            </div>
          )}
          {sessionBanner.kind === 'expired' && (
            <SessionBanner kind="expired" reason={sessionBanner.reason} canStartNewSession={sessionBanner.canStartNewSession} onStartNewSession={handleStartNewSession} onDismiss={clearSessionBanner} />
          )}
          {sessionBanner.kind === 'superseded' && (
            <SessionBanner kind="superseded" replacementRunId={sessionBanner.replacementRunId} onClose={handleCloseSuperseded} onDismiss={clearSessionBanner} />
          )}
          {lastError && (
            <ErrorBanner error={lastError} onDismiss={clearError} onRetry={lastError.retryable ? () => clearError() : undefined} />
          )}
        </div>
      )}
      {!isArrival && !isConsultation && <Header/>}
      <Routes>
        <Route path="/" element={<Arrival/>} />
        <Route path="/discovery" element={<DiscoveryRoute/>} />
        <Route path="/profile-review" element={<ProfileReview/>} />
        <Route path="/consultation" element={<Consultation />} />
        <Route path="/decision" element={<Consultation decisionRequest={decisionForRoute} />} />
        <Route path="/tradeoff" element={<TradeoffBrief/>} />
        <Route path="/trip-overview" element={<TripOverviewGuard plan={livePlan} state={liveState} revision={liveRevision} hasLivePlan={hasLivePlan} />} />
        <Route path="/day-canvas" element={<DayCanvasGuard plan={livePlan} state={liveState} revision={liveRevision} hasLivePlan={hasLivePlan} onSelectItem={handleSelectItem} />} />
        <Route path="/replanning" element={<Replanning/>} />
      </Routes>
      {!isArrival && !isConsultation && (
        <footer style={{borderTop:'1px solid rgba(225,214,197,0.38)', padding:'20px 5vw', display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, flexWrap:'wrap', fontSize:10, color:'rgba(125,135,138,0.72)', letterSpacing:'0.07em', textTransform:'uppercase', background:'transparent'}}>
          <span style={{fontWeight:400, letterSpacing:'0.06em'}}>Voyager — Quiet Luxury, Liquid Intelligence</span>
          <span style={{display:'flex', gap:16}}>
            <a href="/tradeoff" style={{color:'inherit', textDecoration:'none', opacity:0.9}}>Tradeoff Brief</a>
            <a href="/replanning" style={{color:'inherit', textDecoration:'none', opacity:0.9}}>Replanning</a>
          </span>
        </footer>
      )}
      <ExperienceDetail open={detailOpen} item={detailItem} fitExplanation={livePlan?.fit_explanation} onClose={()=>{ setDetailOpen(false); setTimeout(()=>setDetailItem(null),200)}} returnFocusRef={returnFocusRef} />
    </>
  )
}

export default function App(){
  return (
    <BrowserRouter>
      <AppShell/>
    </BrowserRouter>
  )
}
