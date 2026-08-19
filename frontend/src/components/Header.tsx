import { useLocation, Link } from 'react-router-dom'

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

export default function Header(){
  const loc = useLocation()
  const label = labels[loc.pathname] ?? 'Voyager'
  return (
    <header style={{height:72, position:'sticky', top:0, zIndex:40, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 32px', background:'rgba(247,242,233,0.82)', backdropFilter:'blur(10px)', borderBottom:'1px solid var(--voyager-bone-2)'}}>
      <Link to="/" style={{textDecoration:'none', display:'flex', alignItems:'center', gap:10}}>
        <span className="serif" style={{fontSize:22, letterSpacing:0.14+'em', fontWeight:500, color:'var(--voyager-ink-1)'}}>VOYAGER</span>
        <span style={{width:1,height:18, background:'var(--voyager-bone-2)'}}/>
        <span style={{fontSize:11, letterSpacing:'0.16em', textTransform:'uppercase', color:'var(--voyager-ink-3)', fontWeight:500}}>{label}</span>
      </Link>
      <nav style={{display:'flex', gap:6}}>
        {[
          ['/','Arrival'],
          ['/discovery','Discovery'],
          ['/profile-review','Review'],
          ['/consultation','Consultation'],
          ['/decision','Decision'],
          ['/trip-overview','Overview'],
          ['/day-canvas','Days'],
        ].map(([p,l])=>(
          <Link key={p} to={p} style={{fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', textDecoration:'none', padding:'6px 8px', borderRadius:6, background: loc.pathname===p ? 'var(--voyager-bone-1)' : 'transparent', color: loc.pathname===p ? 'var(--voyager-ink-1)' : 'var(--voyager-ink-3)'}}>{l}</Link>
        ))}
      </nav>
    </header>
  )
}
