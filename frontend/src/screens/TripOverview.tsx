import type { FinalPlan } from '../types'
import { mockPlan } from '../data/mockPlan'
import { formatMoney, formatMoneyCompact, budgetLabel } from '../types/planAdapter'

export interface TripOverviewProps {
  plan?: FinalPlan | null
  state?: 'draft' | 'final'
  revision?: number
}

function statusLabel(s: string): string {
  switch (s) {
    case 'suggested': return 'Suggested'
    case 'selected_by_traveler': return 'Selected by traveler'
    case 'not_yet_decided': return 'Not yet decided'
    default: return s
  }
}

export default function TripOverview({ plan: incoming, state, revision }: TripOverviewProps) {
  const plan = incoming ?? ((import.meta as unknown as { env: Record<string, unknown> }).env?.DEV ? (mockPlan as unknown as FinalPlan) : null)

  if (!plan) {
    return (
      <main style={{ width: 'min(1360px,92vw)', margin: '0 auto', paddingTop: 56, paddingBottom: 96 }}>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--voyager-ink-3)', fontWeight: 500 }}>01 — THE JOURNEY</p>
        <h1 className="serif" style={{ marginTop: 18, fontSize: 'clamp(32px,4vw,44px)', fontWeight: 300, color: 'var(--voyager-ink-1)' }}>Your trip will appear here</h1>
        <p style={{ marginTop: 12, fontSize: 14, lineHeight: '22px', color: 'var(--voyager-ink-2)', maxWidth: 520 }}>
          Confirm your profile to generate a plan. When a live Final Trip Plan arrives, it will render here with full route, stay, and budget details.
        </p>
      </main>
    )
  }

  const isDraft = state === 'draft'
  const allocations = plan.city_allocations ?? []
  const route = plan.destination_route ?? []
  // route label prefers destination_route ordering; falls back to allocations
  const routeLabel = route.length > 0
    ? route.slice().sort((a, b) => a.order - b.order).map(r => r.place.toUpperCase()).join(' → ')
    : allocations.map(a => a.place.toUpperCase()).join(' → ') || '—'
  const totalNights = allocations.reduce((s, a) => s + (a.nights ?? 0), 0)
  const nightLabel = totalNights ? `${totalNights} NIGHTS` : allocations[0] ? `${allocations[0].nights ?? allocations[0].days} NIGHTS` : ''
  const marker = nightLabel ? `${routeLabel} · ${nightLabel}` : routeLabel

  const dateLine = (() => {
    const td = plan.trip_dates
    const daysLen = plan.days?.length ?? totalNights
    if (td?.start && td?.end) return `${td.start} → ${td.end}`
    if (td?.start || td?.end) return td.start ?? td.end ?? ''
    if (daysLen) return `${daysLen} days`
    return ''
  })()

  const accommodations = plan.accommodation ?? []
  const cs = plan.cost_summary
  const categories = cs?.categories ?? []
  const totalLabel = cs ? formatMoney(cs.estimated_total, cs.currency) : ''
  const caveats = cs?.caveats ?? []
  const budgetPosLabel = budgetLabel(cs?.budget_position ?? '')

  return (
    <main
      className="trip-overview"
      style={{
        width: 'min(1360px, 92vw)',
        margin: '0 auto',
        paddingTop: 56,
        paddingBottom: 96,
      }}
    >
      {/* ——— Top editorial header ——— */}
      <div style={{ maxWidth: 760 }}>
        <p
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--voyager-ink-3)',
            fontWeight: 500,
          }}
        >
          01 — THE JOURNEY
          {typeof revision === 'number' ? ` · REV ${String(revision).padStart(2, '0')}` : ''}
          {isDraft ? ' · DRAFT' : ''}
        </p>

        <h1
          className="serif"
          style={{
            marginTop: 18,
            fontSize: 'clamp(36px, 4.2vw, 52px)',
            lineHeight: 1.05,
            fontWeight: 300,
            letterSpacing: '-0.03em',
            color: 'var(--voyager-ink-1)',
          }}
        >
          {plan.plan_title}
        </h1>

        {isDraft && (
          <div style={{ marginTop: 14 }}>
            <span style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--voyager-brass-1)', border: '1px dashed var(--voyager-brass-1)', borderRadius: 999, padding: '4px 10px' }}>Draft — not yet confirmed</span>
          </div>
        )}

        {dateLine && (
          <p
            style={{
              marginTop: 18,
              fontSize: 13,
              lineHeight: '20px',
              letterSpacing: '0.06em',
              color: 'var(--voyager-ink-2)',
            }}
          >
            {dateLine}
            {plan.trip_dates?.flexibility ? ` · ${plan.trip_dates.flexibility}` : ''}
          </p>
        )}
      </div>

      {/* very thin horizontal rule + marker — not gold */}
      <div
        style={{
          marginTop: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div style={{ flex: 1, height: 1, background: 'var(--voyager-bone-2)' }} aria-hidden />
        <span
          style={{
            fontSize: 10,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--voyager-ink-3)',
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          {marker}
        </span>
      </div>

      {/* ——— Editorial body: left ~65% / right 35% ——— */}
      <div
        className="overview-editorial"
        style={{
          marginTop: 40,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.85fr) minmax(320px, 0.95fr)',
          gap: '56px 64px',
          alignItems: 'start',
        }}
      >
        {/* LEFT — editorial rows */}
        <div>
          {/* Destination / Stay as quiet rows — not accordions */}
          <div style={{ borderTop: '1px solid var(--voyager-bone-2)' }}>
            {/* Destination row — full route + allocations */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '132px 1fr',
                gap: 24,
                padding: '22px 0',
                borderBottom: '1px solid var(--voyager-bone-2)',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--voyager-ink-3)',
                  fontWeight: 500,
                  paddingTop: 2,
                }}
              >
                Destination
              </span>
              <div>
                {route.length > 0 && (
                  <p style={{ fontSize: 14, lineHeight: '20px', color: 'var(--voyager-ink-2)', letterSpacing: '0.04em' }}>
                    {route.slice().sort((a, b) => a.order - b.order).map((r, i) => (
                      <span key={`${r.place}-${r.order}`}>{i > 0 ? ' → ' : ''}{r.place}{r.arrival_from ? ` (from ${r.arrival_from})` : ''}</span>
                    ))}
                  </p>
                )}
                {allocations.length > 0 ? allocations.map((a) => (
                  <div key={a.place} style={{ marginTop: route.length > 0 ? 12 : 0, paddingTop: route.length > 0 ? 12 : 0, borderTop: route.length > 0 ? '1px solid var(--voyager-bone-2)' : 'none' }}>
                    <p
                      className="serif"
                      style={{
                        fontSize: 18,
                        lineHeight: '26px',
                        color: 'var(--voyager-ink-1)',
                        fontWeight: 400,
                      }}
                    >
                      {a.place} · {a.nights != null ? `${a.nights} nights` : `${a.days} days`}
                    </p>
                    {a.reason && (
                      <p style={{ marginTop: 8, fontSize: 14, lineHeight: '22px', color: 'var(--voyager-ink-2)', maxWidth: 520 }}>
                        {a.reason}
                      </p>
                    )}
                  </div>
                )) : (
                  <p style={{ fontSize: 14, lineHeight: '22px', color: 'var(--voyager-ink-2)' }}>Route will be determined after profile confirmation.</p>
                )}
              </div>
            </div>

            {/* Stay row — all accommodations */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '132px 1fr',
                gap: 24,
                padding: '22px 0',
                borderBottom: '1px solid var(--voyager-bone-2)',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--voyager-ink-3)',
                  fontWeight: 500,
                  paddingTop: 2,
                }}
              >
                Stay
              </span>
              <div>
                {accommodations.length > 0 ? accommodations.map((stay, idx) => (
                  <div key={`${stay.place}-${idx}`} style={{ paddingTop: idx > 0 ? 16 : 0, marginTop: idx > 0 ? 16 : 0, borderTop: idx > 0 ? '1px solid var(--voyager-bone-2)' : 'none' }}>
                    <p
                      style={{
                        fontSize: 15,
                        lineHeight: '22px',
                        color: 'var(--voyager-ink-1)',
                        fontWeight: 500,
                      }}
                    >
                      {stay.recommendation}
                    </p>
                    <p style={{ marginTop: 6, fontSize: 13, lineHeight: '19px', color: 'var(--voyager-ink-2)' }}>
                      {stay.place} · {stay.nights} nights · {stay.reason}
                    </p>
                    {(stay.estimated_cost || stay.status) && (
                      <p style={{ marginTop: 6, fontSize: 12, lineHeight: '16px', color: 'var(--voyager-ink-3)' }}>
                        {[stay.estimated_cost, statusLabel(stay.status)].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                )) : (
                  <p style={{ fontSize: 14, lineHeight: '22px', color: 'var(--voyager-ink-2)' }}>
                    Lodging not yet decided — recommendations will appear here when selected.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* The intention — now purely from plan.summary + fit_explanation, no hard-coded copy */}
          <div style={{ marginTop: 44 }}>
            <p
              style={{
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--voyager-ink-3)',
                fontWeight: 500,
              }}
            >
              The intention
            </p>
            <p
              className="serif"
              style={{
                marginTop: 14,
                fontSize: 20,
                lineHeight: '32px',
                color: 'var(--voyager-ink-1)',
                fontWeight: 300,
                letterSpacing: '-0.015em',
                maxWidth: 560,
              }}
            >
              {plan.summary}
            </p>
            {plan.fit_explanation && plan.fit_explanation !== plan.summary && (
              <p style={{ marginTop: 14, fontSize: 14, lineHeight: '23px', color: 'var(--voyager-ink-2)', maxWidth: 560 }}>
                {plan.fit_explanation}
              </p>
            )}
          </div>

          {/* Tradeoffs / Assumptions / Warnings / Unresolved — was missing */}
          {plan.tradeoffs.length > 0 && (
            <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--voyager-bone-2)' }}>
              <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--voyager-ink-3)', fontWeight: 500 }}>Tradeoffs</p>
              <ul style={{ marginTop: 12, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {plan.tradeoffs.map((t, i) => (
                  <li key={i} style={{ fontSize: 14, lineHeight: '22px', color: 'var(--voyager-ink-2)' }}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          {plan.assumptions.length > 0 && (
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--voyager-bone-2)' }}>
              <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--voyager-ink-3)', fontWeight: 500 }}>Assumptions</p>
              <ul style={{ marginTop: 12, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {plan.assumptions.map((a, i) => (
                  <li key={i} style={{ fontSize: 13, lineHeight: '20px', color: 'var(--voyager-ink-2)' }}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          {plan.warnings.length > 0 && (
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--voyager-bone-2)' }}>
              <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--voyager-ink-3)', fontWeight: 500 }}>Heads up</p>
              <ul style={{ marginTop: 12, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plan.warnings.map((w, i) => (
                  <li key={i} style={{ fontSize: 13, lineHeight: '20px', color: 'var(--voyager-ink-2)' }}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {plan.unresolved_details.length > 0 && (
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--voyager-bone-2)' }}>
              <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--voyager-ink-3)', fontWeight: 500 }}>Unresolved details</p>
              <ul style={{ marginTop: 12, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plan.unresolved_details.map((u, i) => (
                  <li key={i} style={{ fontSize: 13, lineHeight: '20px', color: 'var(--voyager-ink-2)' }}>{u}</li>
                ))}
              </ul>
            </div>
          )}

          {/* subtle closing rule */}
          <div style={{ marginTop: 36, height: 1, background: 'var(--voyager-bone-2)' }} aria-hidden />
          <p style={{ marginTop: 10, fontSize: 10, letterSpacing: '0.08em', color: 'var(--voyager-ink-3)' }}>Ref: {plan.traveler_profile_reference}</p>
        </div>

        {/* RIGHT — 35% Concierge estimate : the visual anchor */}
        <div
          style={{
            background: 'var(--voyager-bone-1)',
            border: '1px solid var(--voyager-bone-2)',
            borderRadius: 'var(--voyager-radius-md)',
            padding: '28px 28px 24px',
            position: 'sticky',
            top: 24,
          }}
        >
          <p
            style={{
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--voyager-ink-3)',
              fontWeight: 500,
            }}
          >
            CONCIERGE ESTIMATE
          </p>

          {/* price + status */}
          <div
            style={{
              marginTop: 14,
              display: 'flex',
              alignItems: 'baseline',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span
              className="serif"
              style={{
                fontSize: 36,
                lineHeight: '40px',
                fontWeight: 300,
                letterSpacing: '-0.03em',
                color: 'var(--voyager-ink-1)',
              }}
            >
              {totalLabel || '—'}
            </span>
            <span
              style={{
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--voyager-ink-3)',
                fontWeight: 500,
                border: '1px solid var(--voyager-bone-2)',
                borderRadius: 'var(--voyager-radius-pill)',
                padding: '4px 9px',
                lineHeight: 1,
                background: 'var(--voyager-bone-0)',
              }}
            >
              {budgetPosLabel}
            </span>
          </div>

          {cs?.scope && (
            <p
              style={{
                marginTop: 10,
                fontSize: 12,
                lineHeight: '18px',
                color: 'var(--voyager-ink-3)',
              }}
            >
              {cs.scope}
            </p>
          )}

          {/* ledger from categories */}
          <div
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop: '1px solid var(--voyager-bone-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
            aria-label="Cost breakdown"
          >
            {categories.length > 0 ? categories.map(row => (
              <div
                key={row.name}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 10,
                  fontSize: 13,
                  lineHeight: '20px',
                }}
              >
                <span style={{ color: 'var(--voyager-ink-2)', whiteSpace: 'nowrap' }}>{row.name}</span>
                <span
                  aria-hidden
                  style={{
                    flex: 1,
                    borderBottom: '1px dotted var(--voyager-bone-3)',
                    opacity: 0.9,
                    transform: 'translateY(-3px)',
                    minWidth: 12,
                  }}
                />
                <span
                  className="mono"
                  style={{
                    color: 'var(--voyager-ink-1)',
                    fontWeight: 500,
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatMoneyCompact(row.amount)}
                </span>
              </div>
            )) : (
              <p style={{ fontSize: 12, lineHeight: '18px', color: 'var(--voyager-ink-3)' }}>No cost breakdown available.</p>
            )}
          </div>

          {/* Included / Not included derived from scope — no hard-coded Kyoto text */}
          {cs?.scope && (
            <div
              style={{
                marginTop: 22,
                paddingTop: 18,
                borderTop: '1px solid var(--voyager-bone-2)',
              }}
            >
              <p style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--voyager-ink-3)', fontWeight: 500 }}>Scope</p>
              <p style={{ marginTop: 8, fontSize: 12, lineHeight: '18px', color: 'var(--voyager-ink-2)' }}>{cs.scope}</p>
            </div>
          )}

          {/* caveats — quiet footnote */}
          {caveats.length > 0 && (
            <div
              style={{
                marginTop: 18,
                paddingTop: 16,
                borderTop: '1px solid var(--voyager-bone-2)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {caveats.map((c, i) => (
                <p key={i} style={{ fontSize: 11, lineHeight: '16px', color: 'var(--voyager-ink-3)' }}>
                  — {c}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .overview-editorial { grid-template-columns: 1fr !important; }
          .overview-editorial > div:last-child { position: static !important; }
        }
      `}</style>
    </main>
  )
}
