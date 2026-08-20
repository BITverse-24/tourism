import { mockPlan } from '../data/mockPlan'

function budgetText(pos: string): string {
  switch (pos) {
    case 'within_target': return 'Within target'
    case 'near_target': return 'Near target'
    case 'above_target': return 'Above target'
    default: return 'Budget unknown'
  }
}

export default function TripOverview() {
  const plan = mockPlan
  const allocations = plan.city_allocations
  const totalNights = allocations.reduce((s, a) => s + (a.nights ?? 0), 0)
  const primary = allocations[0]
  const nightLabel = totalNights ? `${totalNights} NIGHTS` : primary ? `${primary.nights ?? primary.days} NIGHTS` : ''
  const placeLabel = primary?.place?.toUpperCase() ?? 'KYOTO'
  const marker = `${placeLabel} · ${nightLabel}`

  const dateLine = (() => {
    const td = plan.trip_dates
    const daysLen = plan.days?.length ?? totalNights
    if (td?.start && td?.end) return `${td.start} → ${td.end}`
    if (td?.start || td?.end) return td.start ?? td.end ?? ''
    if (daysLen) return `${daysLen} days`
    return ''
  })()

  // stay — first accommodation
  const stay = plan.accommodation?.[0]

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
            {/* Destination row */}
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
                <p
                  className="serif"
                  style={{
                    fontSize: 18,
                    lineHeight: '26px',
                    color: 'var(--voyager-ink-1)',
                    fontWeight: 400,
                  }}
                >
                  {primary ? `${primary.place} · ${primary.nights != null ? `${primary.nights} nights` : `${primary.days} days`}` : 'Kyoto · 3 nights'}
                </p>
                {primary?.reason && (
                  <p style={{ marginTop: 8, fontSize: 14, lineHeight: '22px', color: 'var(--voyager-ink-2)', maxWidth: 520 }}>
                    {primary.reason}
                  </p>
                )}
              </div>
            </div>

            {/* Stay row */}
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
                {stay ? (
                  <>
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
                    {stay.estimated_cost && (
                      <p style={{ marginTop: 6, fontSize: 12, lineHeight: '16px', color: 'var(--voyager-ink-3)' }}>
                        {stay.estimated_cost} · {stay.status === 'suggested' ? 'Suggested' : stay.status === 'selected_by_traveler' ? 'Selected by traveler' : 'Not yet decided'}
                      </p>
                    )}
                  </>
                ) : (
                  <p style={{ fontSize: 14, lineHeight: '22px', color: 'var(--voyager-ink-2)' }}>
                    Lodging not yet decided — recommendations will appear here when selected.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* The intention */}
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
              Slow mornings, quiet temples, neighborhood wandering — one main experience per part of day, time to breathe.
            </p>
            <p
              style={{
                marginTop: 14,
                fontSize: 14,
                lineHeight: '23px',
                color: 'var(--voyager-ink-2)',
                maxWidth: 560,
              }}
            >
              {plan.summary}
            </p>
          </div>

          {/* What this trip feels like */}
          <div
            style={{
              marginTop: 36,
              paddingTop: 20,
              borderTop: '1px solid var(--voyager-bone-2)',
            }}
          >
            <p
              style={{
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--voyager-ink-3)',
                fontWeight: 500,
              }}
            >
              What this trip feels like
            </p>
            <p
              style={{
                marginTop: 10,
                fontSize: 11,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--voyager-ink-2)',
                fontWeight: 500,
                lineHeight: '20px',
              }}
            >
              EARLY LIGHT · LOW CROWDS · LOCAL FOOD · UNHURRIED DAYS
            </p>
          </div>

          {/* subtle closing rule */}
          <div style={{ marginTop: 36, height: 1, background: 'var(--voyager-bone-2)' }} aria-hidden />
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

          {/* price + tiny status */}
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
              INR 63,000
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
              {budgetText(plan.cost_summary.budget_position)}
            </span>
          </div>

          <p
            style={{
              marginTop: 10,
              fontSize: 12,
              lineHeight: '18px',
              color: 'var(--voyager-ink-3)',
            }}
          >
            {plan.cost_summary.scope}
          </p>

          {/* dotted ledger */}
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
            {[
              { name: 'Accommodation', amount: '36,000' },
              { name: 'Local transport', amount: '6,000' },
              { name: 'Food', amount: '18,000' },
              { name: 'Experiences', amount: '3,000' },
            ].map(row => (
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
                  {row.amount}
                </span>
              </div>
            ))}
          </div>

          {/* Included / Not included */}
          <div
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop: '1px solid var(--voyager-bone-2)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 20,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--voyager-ink-3)',
                  fontWeight: 500,
                }}
              >
                Included
              </p>
              <ul
                style={{
                  marginTop: 8,
                  listStyle: 'none',
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  fontSize: 12,
                  lineHeight: '18px',
                  color: 'var(--voyager-ink-2)',
                }}
              >
                <li>Kyoto stay (3 nights)</li>
                <li>Local activities</li>
                <li>Lodging estimate</li>
              </ul>
            </div>
            <div>
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--voyager-ink-3)',
                  fontWeight: 500,
                }}
              >
                Not included
              </p>
              <ul
                style={{
                  marginTop: 8,
                  listStyle: 'none',
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  fontSize: 12,
                  lineHeight: '18px',
                  color: 'var(--voyager-ink-2)',
                }}
              >
                <li>International flights</li>
                <li>Travel insurance</li>
                <li>Personal purchases</li>
              </ul>
            </div>
          </div>

          {/* caveats — quiet footnote */}
          {plan.cost_summary.caveats.length > 0 && (
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
              {plan.cost_summary.caveats.map((c, i) => (
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
