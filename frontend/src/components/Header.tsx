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
    <header style={{height:64, position:'sticky', top:0, zIndex:40, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 5vw', background:'rgba(247,242,233,0.66)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', borderBottom:'1px solid rgba(225,214,197,0.42)', boxSizing:'border-box'}}>
      <Link to="/" style={{textDecoration:'none', display:'flex', alignItems:'center', gap:10}}>
        <span className="serif" style={{fontSize:17, letterSpacing:'0.12em', fontWeight:400, color:'var(--voyager-ink-1)'}}>VOYAGER</span>
        <span style={{width:1,height:16, background:'rgba(225,214,197,0.7)'}}/>
        <span style={{fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(125,135,138,0.78)', fontWeight:400}}>{label}</span>
      </Link>
      <nav style={{display:'flex', gap:4, alignItems:'center'}}>
        {[
          ['/','Arrival'],
          ['/discovery','Discovery'],
          ['/profile-review','Review'],
          ['/consultation','Consultation'],
          ['/decision','Decision'],
          ['/trip-overview','Overview'],
          ['/day-canvas','Days'],
        ].map(([p,l])=>(
          <Link key={p} to={p} style={{fontSize:10, letterSpacing:'0.09em', textTransform:'uppercase', textDecoration:'none', padding:'5px 8px', borderRadius:6, background: loc.pathname===p ? 'rgba(238,230,216,0.85)' : 'transparent', color: loc.pathname===p ? 'var(--voyager-ink-1)' : 'rgba(86,99,106,0.72)', fontWeight: loc.pathname===p ? 500 : 400, border: loc.pathname===p ? '1px solid rgba(225,214,197,0.5)' : '1px solid transparent'}}>{l}</Link>
        ))}
      </nav>
    </header>
  )
}
