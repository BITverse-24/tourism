import type { FinalPlan } from '../types'
import { usePlan } from '../hooks/usePlan'

export interface TradeoffBriefProps {
  plan?: FinalPlan | null
}

export default function TradeoffBrief({ plan: incoming }: TradeoffBriefProps = {}) {
  const { plan: livePlan } = usePlan()
  const resolved: FinalPlan | null = incoming ?? livePlan ?? null
  const plan: any = resolved

  // Distinguish waiting-for-live vs mock fallback active
  if (!plan) {
    return (
      <main style={{ width: '90vw', maxWidth: 980, margin: '0 auto', padding: '96px 0 128px' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--voyager-ink-3)' }}>Trade-off brief</p>
        <h1 className="serif" style={{ marginTop: 12, fontSize: 28, fontWeight: 400, color: 'var(--voyager-ink-1)' }}>Your trade-offs will appear here</h1>
        <p style={{ marginTop: 12, fontSize: 14, lineHeight: '22px', color: 'var(--voyager-ink-2)', maxWidth: 560 }}>
          No trade-offs yet — they will appear when the Final Trip Plan snapshot arrives.
        </p>
      </main>
    )
  }
  // Do not render a blank shell when there are no material tradeoffs
  if (!Array.isArray(plan.tradeoffs) || plan.tradeoffs.length === 0) return null

  // Draft content belongs on consultation/day surfaces with draft badge — do not show brief for drafts
  const isDraft = plan.isDraft === true || (typeof plan.plan_title === 'string' && plan.plan_title.includes('(Draft)'))
  if (isDraft) return null

  const scopeCaption = `${plan.cost_summary?.scope?.slice(0, 72) ?? ''} · ${plan.cost_summary?.budget_position ?? ''}`

  const assumptions: string[] = plan.assumptions ?? []
  const warnings: string[] = plan.warnings ?? []
  const unresolved: string[] = plan.unresolved_details ?? []

  return (
    <main
      className="tradeoff-brief fluid-medium"
      style={{
        width: '90vw',
        maxWidth: 980,
        margin: '0 auto',
        padding: '96px 0 128px',
        minWidth: 0,
      }}
    >
      <h1
        className="serif"
        style={{
          fontSize: 40,
          lineHeight: '48px',
          fontWeight: 400,
          textAlign: 'center',
          color: 'var(--voyager-ink-1)',
          letterSpacing: '0.02em',
          overflowWrap: 'anywhere',
        }}
      >
        {plan.plan_title}
      </h1>
      <p
        style={{
          textAlign: 'center',
          fontSize: 16,
          lineHeight: '25px',
          color: 'var(--voyager-ink-2)',
          maxWidth: 560,
          margin: '16px auto 0',
          overflowWrap: 'anywhere',
        }}
      >
        {plan.summary}
      </p>

      <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
        {plan.tradeoffs.map((t: string, i: number) => (
          <div
            key={i}
            className="tradeoff-card"
            style={{
              display: 'grid',
              gridTemplateColumns: '72% 28%',
              gap: 16,
              background: 'var(--voyager-bone-1)',
              border: '1px solid var(--voyager-bone-2)',
              borderRadius: 'var(--voyager-radius-md)',
              padding: 32,
              boxShadow: 'var(--voyager-shadow-card)',
              minHeight: 120,
              minWidth: 0,
            }}
          >
            <p
              style={{
                fontSize: 16,
                lineHeight: '25px',
                color: 'var(--voyager-ink-1)',
                overflowWrap: 'anywhere',
                minWidth: 0,
              }}
            >
              {t}
            </p>
            <div
              className="mono"
              style={{
                textAlign: 'right',
                fontSize: 11,
                lineHeight: '16px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--voyager-ink-3)',
                alignSelf: 'start',
                overflowWrap: 'anywhere',
                minWidth: 0,
                wordBreak: 'break-word',
              }}
            >
              {scopeCaption}
            </div>
          </div>
        ))}
      </div>

      {(assumptions.length > 0 || warnings.length > 0 || unresolved.length > 0) && (
        <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {assumptions.map((a, i) => (
            <div
              key={'a' + i}
              style={{
                background: 'var(--voyager-bone-1)',
                borderLeft: '4px solid var(--voyager-brass-1)',
                borderRadius: 'var(--voyager-radius-md)',
                padding: '16px 20px',
                boxShadow: 'var(--voyager-shadow-card)',
                minWidth: 0,
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--voyager-ink-3)' }}>
                Assumption
              </div>
              <div style={{ marginTop: 6, fontSize: 14, lineHeight: '21px', fontStyle: 'italic', color: 'var(--voyager-ink-2)', overflowWrap: 'anywhere' }}>
                {a}
              </div>
            </div>
          ))}
          {warnings.map((w, i) => (
            <div
              key={'w' + i}
              style={{
                background: 'var(--voyager-bone-1)',
                borderLeft: '4px solid var(--voyager-brass-1)',
                borderRadius: 'var(--voyager-radius-md)',
                padding: '16px 20px',
                boxShadow: 'var(--voyager-shadow-card)',
                minWidth: 0,
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--voyager-ink-3)' }}>Note</div>
              <div style={{ marginTop: 6, fontSize: 14, lineHeight: '21px', color: 'var(--voyager-ink-2)', overflowWrap: 'anywhere' }}>{w}</div>
            </div>
          ))}
          {unresolved.map((u, i) => (
            <div
              key={'u' + i}
              style={{
                background: 'var(--voyager-bone-1)',
                borderLeft: '4px solid var(--voyager-brass-1)',
                borderRadius: 'var(--voyager-radius-md)',
                padding: '16px 20px',
                boxShadow: 'var(--voyager-shadow-card)',
                minWidth: 0,
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--voyager-ink-3)' }}>To confirm</div>
              <div style={{ marginTop: 6, fontSize: 14, lineHeight: '21px', color: 'var(--voyager-ink-2)', overflowWrap: 'anywhere' }}>{u}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault()
            document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth' })
            document.getElementById('overview')?.focus()
          }}
          style={{
            height: 44,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 28px',
            borderRadius: 'var(--voyager-radius-md)',
            background: 'var(--voyager-brass-1)',
            color: 'var(--voyager-ink-1)',
            textDecoration: 'none',
            fontWeight: 500,
            fontSize: 15,
            minWidth: 0,
          }}
        >
          View your itinerary →
        </a>
      </div>

      {/* In-page anchor target — Trip Overview heading */}
      <div id="overview" tabIndex={-1} style={{ marginTop: 96, paddingTop: 24, outline: 'none' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--voyager-ink-3)' }}>Next</div>
        <h2 className="serif" style={{ marginTop: 8, fontSize: 22, lineHeight: '30px', fontWeight: 500, color: 'var(--voyager-ink-1)' }}>
          Trip Overview
        </h2>
        <p style={{ marginTop: 8, fontSize: 14, lineHeight: '21px', color: 'var(--voyager-ink-2)' }}>
          Your itinerary continues below — this anchor is the Trip Overview heading.
        </p>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .tradeoff-brief .tradeoff-card { grid-template-columns: 1fr !important; }
          .tradeoff-brief .tradeoff-card .mono { text-align: left !important; }
        }
        @media (max-width: 480px) {
          .tradeoff-brief h1 { font-size: 30px !important; line-height: 36px !important; }
          .tradeoff-brief a[href="#overview"] { width: 100% !important; }
        }
      `}</style>
    </main>
  )
}
