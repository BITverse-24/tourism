import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useState, useRef } from 'react'
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
import { mockQuestions } from './data/mockQuestions'
import { mockPlan } from './data/mockPlan'
import type { ItineraryItem } from './screens/DayCanvas'
import SessionBanner from './components/SessionBanner'
import ErrorBanner from './components/ErrorBanner'
import { useWsBannerState } from './hooks/useWsBannerState'
import { usePlan } from './hooks/usePlan'

function AppShell(){
  const loc=useLocation()
  const isConsultation = loc.pathname==='/consultation' || loc.pathname==='/decision'
  const isArrival = loc.pathname==='/'
  const [detailOpen,setDetailOpen]=useState(false)
  const [detailItem,setDetailItem]=useState<ItineraryItem | null>(null)
  const returnFocusRef = useRef<HTMLElement>(null) as React.RefObject<HTMLElement>
  // Centralized WS banners — single WebSocket integration surface
  const { sessionBanner, lastError, clearSessionBanner, clearError, handleStartNewSession, handleCloseSuperseded } = useWsBannerState()
  // Live plan snapshot (plan.snapshot draft/final) — replaces static mock wiring
  const { plan: livePlan, revision: liveRevision, state: liveState, hasLivePlan } = usePlan()

  const mockQuestion = mockQuestions[0] ?? null
  const mockProfile = {
    revision: 7,
    profile: {
      trip_context: { destination_request: "Kyoto in autumn, slow" },
      preferences: [{ category:"Photography", strength:"strong", source:"stated" as const, notes:"sunrise" }],
      unknowns: [{ topic:"budget", impact:"minor", description:"flights excluded?" }],
      assumptions: [{ topic:"pace", value:"slow", reason:"preference", user_confirmation_needed:true }]
    }
  }

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
      {(sessionBanner.kind === 'expired' || sessionBanner.kind === 'superseded' || lastError) && (
        <div style={{ display:'flex', flexDirection:'column', gap:10, padding:'12px 5vw 0', background:'transparent' }}>
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
        <Route path="/discovery" element={<Discovery question={mockQuestion} profile={mockProfile} sequence={2} sequenceTotal={5} onAnswer={()=>{}} />} />
        <Route path="/profile-review" element={<ProfileReview/>} />
        <Route path="/consultation" element={<Consultation />} />
        <Route path="/decision" element={<Consultation decisionRequest={decisionForRoute} enableMockDecision={false} />} />
        <Route path="/tradeoff" element={<TradeoffBrief/>} />
        <Route path="/trip-overview" element={<TripOverview plan={livePlan} state={liveState ?? undefined} revision={liveRevision ?? undefined} />} />
        <Route path="/day-canvas" element={<DayCanvas plan={livePlan} revision={liveRevision ?? undefined} state={liveState ?? undefined} workflowCompleted={hasLivePlan ? liveState === 'final' : true} onSelectItem={handleSelectItem} />} />
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
      <ExperienceDetail open={detailOpen} item={detailItem} fitExplanation={mockPlan.fit_explanation} onClose={()=>{ setDetailOpen(false); setTimeout(()=>setDetailItem(null),200)}} returnFocusRef={returnFocusRef} />
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
