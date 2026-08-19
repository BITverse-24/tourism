import { useState } from 'react'
import { mockPlan } from '../data/mockPlan'

type Allocation = { place: string; nights?: number; days: number; reason?: string }
type Accommodation = { place: string; nights: number; recommendation: string; reason: string; estimated_cost?: string; status: 'suggested' | 'selected_by_traveler' | 'not_yet_decided' }

function budgetText(pos: string): string {
  switch (pos) {
    case 'within_target': return 'Within target'
    case 'near_target': return 'Near target'
    case 'above_target': return 'Above target'
    default: return 'Budget unknown'
  }
}

function statusLabel(s: string): string {
  if (s === 'suggested') return 'Suggested'
  if (s === 'selected_by_traveler') return 'Selected by traveler'
  return 'Not yet decided'
}

export default function TripOverview() {
  const plan = mockPlan
  // derive total nights/days for allocation proportions
  const allocations: Allocation[] = plan.city_allocations
  const route = [...plan.destination_route].sort((a, b) => a.order - b.order)
  const totalUnits = allocations.reduce((s, a) => s + (a.nights ?? a.days), 0) || 1
  const totalNights = allocations.reduce((s, a) => s + (a.nights ?? 0), 0)
  const totalDays = allocations.reduce((s, a) => s + (a.days ?? 0), 0)

  // which disclosure is open: one at a time for simplicity but independent per spec
  const [openKey, setOpenKey] = useState<string | null>(null)
  const toggle = (k: string) => setOpenKey(prev => (prev === k ? null : k))

  // hero date line
  const dateLine = (() => {
    const td = plan.trip_dates
    const daysLen = plan.days?.length ?? totalDays ?? totalNights
    if (td?.start && td?.end) {
      const flex = td.flexibility ? ` · ${td.flexibility}` : ''
      const d = daysLen ? ` · ${daysLen} days` : ''
      return `${td.start} → ${td.end}${d}${flex}`
    }
    if (td?.start || td?.end) {
      const s = td.start ?? ''
      const e = td.end ?? ''
      const range = s && e ? `${s} → ${e}` : s || e
      const d = daysLen ? ` · ${daysLen} days` : ''
      const flex = td.flexibility ? ` · ${td.flexibility}` : ''
      return `${range}${d}${flex}`.trim()
    }
    // duration fallback
    if (daysLen) {
      const flex = td?.flexibility ? ` · ${td.flexibility}` : ' · Flexible'
      return `${daysLen} days${flex}`
    }
    return td?.flexibility ?? ''
  })()

  const isDraft = plan.plan_title.toLowerCase().includes('draft')

  // generate abstract positions for cartography circles and path
  // place circles horizontally spaced, slight vertical wave for atmosphere
  const circlePositions = route.map((_, idx) => {
    const n = route.length
    // spread across 400 width with padding 60
    const x = n === 1 ? 200 : 60 + (idx * (280 / Math.max(1, n - 1)))
    // gentle vertical undulation
    const y = 200 + Math.sin(idx * 1.1) * 18 - idx * 4
    return { x, y }
  })

  const pathD = (() => {
    if (circlePositions.length === 0) return ''
    if (circlePositions.length === 1) return `M ${circlePositions[0].x - 24} ${circlePositions[0].y} C ${circlePositions[0].x - 8} ${circlePositions[0].y - 18}, ${circlePositions[0].x + 8} ${circlePositions[0].y + 18}, ${circlePositions[0].x + 24} ${circlePositions[0].y}`
    let d = `M ${circlePositions[0].x} ${circlePositions[0].y}`
    for (let i = 1; i < circlePositions.length; i++) {
      const prev = circlePositions[i - 1]
      const cur = circlePositions[i]
      const mx = (prev.x + cur.x) / 2
      // soft cubic with slight offset for organic feel
      const c1x = mx - 24
      const c1y = prev.y - 14
      const c2x = mx + 24
      const c2y = cur.y + 14
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${cur.x} ${cur.y}`
    }
    return d
  })()

  return (
    <main
      className="trip-overview content-canvas"
      style={{
        paddingTop: 64,
        paddingBottom: 128,
        maxWidth: 1240,
        margin: '0 auto',
      }}
    >
      {/* Hero */}
      <div style={{ animation: 'pourIn 500ms cubic-bezier(.22,.61,.36,1) both' }}>
        <h1
          className="serif"
          style={{
            fontSize: 40,
            lineHeight: '48px',
            fontWeight: 400,
            color: 'var(--voyager-ink-1)',
            textAlign: 'left',
            letterSpacing: '-0.02em',
          }}
        >
          {plan.plan_title}
        </h1>
        {dateLine && (
          <p
            style={{
              marginTop: 12,
              fontSize: 16,
              lineHeight: '25px',
              color: 'var(--voyager-ink-2)',
            }}
          >
            {dateLine}
          </p>
        )}
        {isDraft && (
          <div
            style={{
              marginTop: 16,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              border: '1px dashed var(--voyager-brass-1)',
              borderRadius: 'var(--voyager-radius-pill)',
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--voyager-ink-2)',
            }}
          >
            Draft — not yet confirmed
          </div>
        )}
      </div>

      {/* Allocation bar */}
      <div
        role="list"
        aria-label="Time allocation by place"
        style={{
          marginTop: 32,
          marginBottom: 48,
          display: 'flex',
          gap: 4,
          height: 12,
          alignItems: 'stretch',
          animation: 'fadeIn 420ms ease 180ms both',
        }}
      >
        {allocations.map((a, i) => {
          const value = a.nights ?? a.days
          const pct = (value / totalUnits) * 100
          // opacity wash: begin near full, step down gently
          const opacity = Math.max(0.52, 1 - i * 0.14)
          const amountLabel = a.nights != null ? `${a.nights} nights` : `${a.days} days`
          const ariaName = `${a.place}, ${amountLabel}${a.reason ? `, ${a.reason}` : ''}`
          return (
            <div
              key={`${a.place}-${i}`}
              role="listitem"
              aria-label={ariaName}
              title={`${a.place}: ${amountLabel}${a.reason ? ` — ${a.reason}` : ''}`}
              tabIndex={0}
              style={{
                flex: `${value} 1 0%`,
                minWidth: 4,
                width: `${pct}%`,
                background: 'var(--voyager-brass-1)',
                opacity,
                borderRadius: 999,
                transition: 'filter 150ms ease, opacity 150ms ease',
              }}
              onFocus={e => ((e.currentTarget as HTMLDivElement).style.filter = 'brightness(1.06)')}
              onBlur={e => ((e.currentTarget as HTMLDivElement).style.filter = 'none')}
              onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.filter = 'brightness(1.06)')}
              onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.filter = 'none')}
            />
          )
        })}
      </div>

      {/* Main spread 7fr / 5fr */}
      <div
        className="overview-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '7fr 5fr',
          gap: 64,
          alignItems: 'start',
        }}
      >
        {/* Left — Cartography 1:1 */}
        <div style={{ animation: 'pourIn 520ms cubic-bezier(.22,.61,.36,1) 260ms both' }}>
          <div
            aria-label="Route illustration"
            style={{
              aspectRatio: '1 / 1',
              background: 'var(--voyager-bone-1)',
              border: `1px solid ${isDraft ? 'var(--voyager-brass-1)' : 'var(--voyager-bone-2)'}`,
              borderStyle: isDraft ? 'dashed' : 'solid',
              borderRadius: 'var(--voyager-radius-lg)',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--voyager-shadow-card)',
            }}
          >
            {/* warm skeleton fallback is the bone background itself; SVG is the ink illustration */}
            <svg
              viewBox="0 0 400 400"
              role="img"
              aria-label={`Route through ${route.map(r => r.place).join(', ')} in order`}
              style={{ width: '100%', height: '100%', display: 'block' }}
            >
              {/* soft route path */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="var(--voyager-ink-2)"
                  strokeOpacity={0.55}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {route.map((r, idx) => {
                const pos = circlePositions[idx]
                if (!pos) return null
                return (
                  <g key={`${r.place}-${r.order}`}>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={10}
                      fill="var(--voyager-bone-0)"
                      stroke="var(--voyager-ink-2)"
                      strokeOpacity={0.9}
                      strokeWidth={1.2}
                    />
                    {/* place label */}
                    <text
                      x={pos.x}
                      y={pos.y + 36}
                      textAnchor="middle"
                      fontSize={10}
                      letterSpacing="0.10em"
                      fill="var(--voyager-ink-2)"
                      style={{ textTransform: 'uppercase', fontWeight: 500, fontFamily: 'General Sans, Inter, ui-sans-serif, sans-serif' }}
                    >
                      {r.place}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
          <p style={{ marginTop: 16, fontSize: 12, lineHeight: '17px', color: 'var(--voyager-ink-3)' }}>
            Route is ordered; geography is illustrative, not precise.
          </p>
        </div>

        {/* Right — Details rail */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            animation: 'pourIn 520ms cubic-bezier(.22,.61,.36,1) 340ms both',
          }}
        >
          {/* Allocation disclosures */}
          {allocations.map((a, idx) => {
            const key = `alloc-${idx}`
            const isOpen = openKey === key
            const amountLabel = a.nights != null ? `${a.nights} nights` : `${a.days} days`
            return (
              <div
                key={key}
                style={{
                  borderTop: '1px solid var(--voyager-bone-2)',
                }}
              >
                <button
                  type="button"
                  id={`${key}-btn`}
                  aria-expanded={isOpen}
                  aria-controls={`${key}-panel`}
                  onClick={() => toggle(key)}
                  style={{
                    width: '100%',
                    minHeight: 56,
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: '0 2px',
                    color: 'var(--voyager-ink-1)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      lineHeight: '18px',
                      fontWeight: 500,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--voyager-ink-1)',
                    }}
                  >
                    {a.place} · {amountLabel}
                  </span>
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: 18,
                      lineHeight: '18px',
                      color: 'var(--voyager-ink-3)',
                      flexShrink: 0,
                      width: 24,
                      textAlign: 'center',
                    }}
                  >
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                <div
                  id={`${key}-panel`}
                  role="region"
                  aria-labelledby={`${key}-btn`}
                  hidden={!isOpen}
                  style={{
                    display: isOpen ? 'block' : 'none',
                    paddingTop: isOpen ? 24 : 0,
                    paddingBottom: isOpen ? 8 : 0,
                    animation: isOpen ? 'settle 420ms cubic-bezier(.22,.61,.36,1) both' : undefined,
                  }}
                >
                  {a.reason ? (
                    <p style={{ fontSize: 16, lineHeight: '25px', color: 'var(--voyager-ink-2)' }}>{a.reason}</p>
                  ) : (
                    <p style={{ fontSize: 16, lineHeight: '25px', color: 'var(--voyager-ink-3)' }}>
                      Time here reflects the planned pace and routing.
                    </p>
                  )}
                </div>
              </div>
            )
          })}

          {/* Accommodation disclosures */}
          {plan.accommodation && plan.accommodation.length > 0 ? (
            plan.accommodation.map((acc: Accommodation, idx: number) => {
              const key = `acc-${idx}`
              const isOpen = openKey === key
              return (
                <div
                  key={key}
                  style={{
                    borderTop: '1px solid var(--voyager-bone-2)',
                  }}
                >
                  <button
                    type="button"
                    id={`${key}-btn`}
                    aria-expanded={isOpen}
                    aria-controls={`${key}-panel`}
                    onClick={() => toggle(key)}
                    style={{
                      width: '100%',
                      minHeight: 56,
                      height: 56,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: '0 2px',
                      color: 'var(--voyager-ink-1)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        lineHeight: '18px',
                        fontWeight: 500,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--voyager-ink-1)',
                      }}
                    >
                      Stay · {acc.place}
                    </span>
                    <span
                      aria-hidden="true"
                      style={{
                        fontSize: 18,
                        lineHeight: '18px',
                        color: 'var(--voyager-ink-3)',
                        flexShrink: 0,
                        width: 24,
                        textAlign: 'center',
                      }}
                    >
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  <div
                    id={`${key}-panel`}
                    role="region"
                    aria-labelledby={`${key}-btn`}
                    hidden={!isOpen}
                    style={{
                      display: isOpen ? 'block' : 'none',
                      paddingTop: isOpen ? 24 : 0,
                      paddingBottom: isOpen ? 8 : 0,
                      animation: isOpen ? 'settle 420ms cubic-bezier(.22,.61,.36,1) both' : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 16, lineHeight: '25px', fontWeight: 500, color: 'var(--voyager-ink-1)' }}>
                          {acc.recommendation}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            letterSpacing: '0.10em',
                            textTransform: 'uppercase',
                            color: 'var(--voyager-ink-3)',
                            fontWeight: 500,
                          }}
                        >
                          {statusLabel(acc.status)}
                        </span>
                      </div>
                      <p style={{ fontSize: 16, lineHeight: '25px', color: 'var(--voyager-ink-2)' }}>{acc.reason}</p>
                      {acc.estimated_cost && (
                        <p style={{ fontSize: 13, lineHeight: '18px', color: 'var(--voyager-ink-3)' }}>{acc.estimated_cost}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div style={{ borderTop: '1px solid var(--voyager-bone-2)', paddingTop: 16 }}>
              <p
                style={{
                  fontSize: 13,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--voyager-ink-3)',
                  fontWeight: 500,
                }}
              >
                Accommodation
              </p>
              <p style={{ marginTop: 12, fontSize: 16, lineHeight: '25px', color: 'var(--voyager-ink-2)' }}>
                Lodging not yet decided — recommendations will appear here when selected.
              </p>
            </div>
          )}

          {/* Cost summary card — last in rail */}
          <div
            style={{
              background: 'var(--voyager-bone-1)',
              border: `1px solid ${isDraft ? 'var(--voyager-brass-1)' : 'var(--voyager-bone-2)'}`,
              borderStyle: isDraft ? 'dashed' : 'solid',
              borderRadius: 'var(--voyager-radius-md)',
              padding: 24,
              boxShadow: 'var(--voyager-shadow-card)',
            }}
          >
            {/* caption */}
            <div
              style={{
                fontSize: 13,
                lineHeight: '18px',
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--voyager-ink-3)',
              }}
            >
              Cost summary — {plan.cost_summary.currency}
            </div>
            {/* heading — estimated total */}
            <div
              className="mono"
              style={{
                marginTop: 10,
                fontSize: 22,
                lineHeight: '30px',
                fontWeight: 500,
                color: 'var(--voyager-ink-1)',
              }}
            >
              {plan.cost_summary.currency} {plan.cost_summary.estimated_total.toLocaleString('en-IN')}
            </div>
            {/* scope */}
            <p
              style={{
                marginTop: 10,
                fontSize: 12,
                lineHeight: '17px',
                color: 'var(--voyager-ink-3)',
              }}
            >
              {plan.cost_summary.scope}
            </p>
            {/* categories */}
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {plan.cost_summary.categories.map(c => (
                <div
                  key={c.name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 16,
                    fontSize: 16,
                    lineHeight: '25px',
                    color: 'var(--voyager-ink-2)',
                  }}
                >
                  <span>{c.name}</span>
                  <span className="mono" style={{ color: 'var(--voyager-ink-1)', flexShrink: 0 }}>
                    {plan.cost_summary.currency} {c.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
            {/* budget position — plain text */}
            <p
              style={{
                marginTop: 16,
                fontSize: 13,
                lineHeight: '18px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 500,
                color: 'var(--voyager-ink-2)',
              }}
            >
              {budgetText(plan.cost_summary.budget_position)}
            </p>
            {/* caveats */}
            {plan.cost_summary.caveats.length > 0 && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plan.cost_summary.caveats.map((cv, i) => (
                  <p
                    key={i}
                    style={{
                      fontSize: 12,
                      lineHeight: '17px',
                      color: 'var(--voyager-ink-3)',
                    }}
                  >
                    {cv}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pourIn { from { opacity:0; transform: translateY(8px);} to {opacity:1; transform: translateY(0);} }
        @keyframes fadeIn { from {opacity:0;} to {opacity:1;} }
        @keyframes settle { from { opacity:0; transform: translateY(6px);} to {opacity:1; transform: translateY(0);} }
        @media (max-width: 1024px) {
          .overview-grid { grid-template-columns: 1fr !important; }
        }
        /* focus ring — brass */
        .trip-overview button:focus-visible { box-shadow: var(--voyager-focus-ring); outline: none; border-radius: 6px; }
        .trip-overview [role="listitem"]:focus-visible { box-shadow: var(--voyager-focus-ring); outline: none; border-radius: 999px; }
      `}</style>
    </main>
  )
}
