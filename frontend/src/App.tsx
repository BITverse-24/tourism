import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useState, useRef } from 'react'
import Header from './components/Header'
import LifecycleRail from './components/LifecycleRail'
import Arrival from './screens/Arrival'
import Discovery from './screens/Discovery'
import ProfileReview from './screens/ProfileReview'
import Consultation from './screens/Consultation'
import DecisionRequired from './screens/DecisionRequired'
import TradeoffBrief from './screens/TradeoffBrief'
import TripOverview from './screens/TripOverview'
import DayCanvas from './screens/DayCanvas'
import ExperienceDetail from './screens/ExperienceDetail'
import Replanning from './screens/Replanning'
import { mockQuestions } from './data/mockQuestions'
import { mockPlan } from './data/mockPlan'
import type { ItineraryItem } from './screens/DayCanvas'

function AppShell(){
  const loc=useLocation()
  const isConsultation = loc.pathname==='/consultation'
  const isArrival = loc.pathname==='/'
  const [detailOpen,setDetailOpen]=useState(false)
  const [detailItem,setDetailItem]=useState<ItineraryItem | null>(null)
  const returnFocusRef = useRef<HTMLElement>(null) as React.RefObject<HTMLElement>
  const showRail = isConsultation

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
  const mockPlanForCanvas = {
    revision: 3,
    state: "final" as const,
    plan_title: mockPlan.plan_title,
    days: mockPlan.days.map(d=> ({
      day: d.day,
      date: (d as any).date ?? null,
      place: d.place,
      theme: (d as any).theme ?? null,
      daily_notes: (d as any).daily_notes ?? null,
      items: d.items.map(it=> ({
        type: it.type,
        title: it.title,
        start_time: (it as any).start_time ?? null,
        end_time: (it as any).end_time ?? null,
        location: (it as any).location ?? null,
        description: it.description,
        movement: (it as any).movement ?? null,
        estimated_cost: (it as any).estimated_cost ?? null,
        reason: (it as any).reason ?? null,
        flexibility: (it as any).flexibility ?? null,
        imageUrl: (it as any).image ?? null,
      }))
    })),
    traveler_profile_reference: mockPlan.traveler_profile_reference,
    city_allocations: mockPlan.city_allocations.map(a=> ({ place: a.place, nights: a.nights, days: String(a.days) })),
    cost_summary: { currency: mockPlan.cost_summary.currency, estimated_total: String(mockPlan.cost_summary.estimated_total), budget_position: mockPlan.cost_summary.budget_position },
    fit_explanation: mockPlan.fit_explanation,
  }

  const handleSelectItem = (_dayIdx:number, _itemIdx:number, item: ItineraryItem) => {
    setDetailItem(item)
    setDetailOpen(true)
  }

  return (
    <>
      {!isArrival && !isConsultation && <Header/>}
      {isConsultation && (
        <header style={{position:'fixed', top:0, left:0, right:0, height:64, display:'flex', alignItems:'center', padding:'0 5vw', zIndex:10, background:'transparent', borderBottom:'1px solid rgba(242,235,221,0.06)'}}>
          <span className="serif" style={{color:'rgba(242,235,221,0.92)', letterSpacing:'0.12em', fontWeight:400, fontSize:13}}>VOYAGER</span>
          <span style={{marginLeft:10, fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(242,235,221,0.42)', fontWeight:400}}>Consultation</span>
        </header>
      )}
      <Routes>
        <Route path="/" element={<Arrival/>} />
        <Route path="/discovery" element={<Discovery question={mockQuestion} profile={mockProfile} sequence={2} sequenceTotal={5} onAnswer={()=>{}} />} />
        <Route path="/profile-review" element={<ProfileReview/>} />
        <Route path="/consultation" element={<Consultation />} />
        <Route path="/decision" element={<DecisionRequired/>} />
        <Route path="/tradeoff" element={<TradeoffBrief/>} />
        <Route path="/trip-overview" element={<TripOverview/>} />
        <Route path="/day-canvas" element={<DayCanvas plan={mockPlanForCanvas} workflowCompleted={true} onSelectItem={handleSelectItem} />} />
        <Route path="/replanning" element={<Replanning/>} />
      </Routes>
      {showRail && <LifecycleRail expanded={true}/>}
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
