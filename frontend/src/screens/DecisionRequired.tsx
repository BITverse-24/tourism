import { useState } from 'react'

type DecisionOption = { option_id: string; label: string; tradeoff: string }

// Mock decision payload — mirrors WEBSOCKET_CONTRACT decision_request shape
const decision = {
  decision_id: 'decision_profile7_route_a_route_b',
  prompt: 'Would you rather keep the pace gentle or see a little more, even if it means more walking?',
  reason: 'material_tradeoff' as string,
  options: [
    { option_id: 'comfort', label: 'Prioritize comfort', tradeoff: 'Fewer attraction visits and less movement — more rest, less transit.' },
    { option_id: 'coverage', label: 'Prioritize coverage', tradeoff: 'More attraction visits and a higher movement burden — see more, walk more.' },
  ] as DecisionOption[],
}

function reasonCaption(reason: string) {
  if (reason === 'material_tradeoff') return 'A close trade-off — your preference will guide the plan'
  if (reason === 'no_admissible_plan') return 'No admissible plan fits all constraints — choose how to relax one'
  return reason
}

const BRONZE = '#9A7A5A'
const BRONZE_HOVER = '#8B6E51'

export default function DecisionRequired() {
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const caption = reasonCaption(decision.reason)

  const submit = () => {
    if (!selected || busy) return
    setBusy(true)
    setError('')
    const command_id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `cmd_${Date.now()}`
    void command_id
    setTimeout(() => {
      setBusy(false)
    }, 800)
  }

  return (
    <main
      className="decision-required"
      style={{
        width: 'min(920px, 88vw)',
        margin: '0 auto',
        padding: '48px 0 24px',
        minHeight: 'calc(100vh - 72px - 56px)',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      {/* Editorial eyebrow */}
      <div
        className="mono"
        style={{
          textAlign: 'center',
          fontSize: 10,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: BRONZE,
          fontWeight: 600,
          marginBottom: 20,
          opacity: 0.95,
        }}
      >
        01 — TRADE-OFF
      </div>

      <h1
        className="serif"
        style={{
          fontSize: 30,
          lineHeight: '40px',
          fontWeight: 400,
          textAlign: 'center',
          color: 'var(--voyager-ink-1)',
          overflowWrap: 'anywhere',
          maxWidth: 680,
          margin: '0 auto',
          letterSpacing: '-0.015em',
        }}
      >
        {decision.prompt}
      </h1>

      <p
        style={{
          textAlign: 'center',
          fontSize: 11,
          letterSpacing: '0.13em',
          textTransform: 'uppercase',
          color: 'var(--voyager-ink-3)',
          marginTop: 16,
          marginBottom: 44,
          fontWeight: 500,
          overflowWrap: 'anywhere',
          lineHeight: '16px',
        }}
      >
        {caption}
      </p>

      <div
        role="group"
        aria-label="Choose one option"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          minWidth: 0,
          width: '100%',
        }}
      >
        {decision.options.map((o, idx) => {
          const isSelected = selected === o.option_id
          const isComfort = idx === 0
          // subtle tonal distinction: ivory vs warm taupe
          const baseBg = isComfort ? '#FFFEFB' : '#F9F0E0'
          const baseBorder = isComfort ? '#E8DDC8' : '#E1D6C5'
          return (
            <button
              key={o.option_id}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${o.label}: ${o.tradeoff}`}
              onClick={() => {
                if (busy) return
                setSelected(o.option_id)
                setError('')
              }}
              disabled={busy}
              className="decision-card"
              style={{
                textAlign: 'left',
                padding: 32,
                borderRadius: 14,
                border: `1px solid ${isSelected ? BRONZE : baseBorder}`,
                background: baseBg,
                color: 'var(--voyager-ink-1)',
                boxShadow: isSelected
                  ? `0 0 0 3px rgba(154,122,90,0.13), 0 2px 12px rgba(154,122,90,0.08)`
                  : 'none',
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.5 : 1,
                minHeight: 132,
                width: '100%',
                maxWidth: 420,
                transition: 'border-color 180ms ease, box-shadow 180ms ease, background 180ms ease, opacity 150ms ease',
                display: 'block',
                minWidth: 0,
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement
                if (!isSelected && !busy) {
                  el.style.borderColor = 'rgba(154,122,90,0.45)'
                  el.style.boxShadow = '0 0 0 3px rgba(154,122,90,0.08)'
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement
                if (!isSelected && !busy) {
                  el.style.borderColor = baseBorder
                  el.style.boxShadow = 'none'
                }
              }}
              onFocus={(e) => {
                if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(154,122,90,0.5)'
              }}
              onBlur={(e) => {
                if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = baseBorder
              }}
            >
              {/* Card header: number + discreet advisor label */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                  gap: 12,
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.14em',
                    color: isSelected ? BRONZE : 'var(--voyager-ink-3)',
                    fontWeight: 600,
                    transition: 'color 180ms ease',
                  }}
                >
                  0{idx + 1}
                </span>
                <span
                  style={{
                    flex: 1,
                    height: 1,
                    background: isSelected ? 'rgba(154,122,90,0.22)' : 'rgba(38,50,57,0.08)',
                    margin: '0 10px',
                    transition: 'background 180ms ease',
                  }}
                />
                <span
                  className="mono"
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: isSelected ? BRONZE : 'var(--voyager-ink-3)',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    opacity: isSelected ? 1 : 0.85,
                  }}
                >
                  {isComfort ? 'Advisor note' : 'Advisor note'}
                </span>
                {/* selection dot */}
                <span
                  aria-hidden
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    border: `1.25px solid ${isSelected ? BRONZE : 'rgba(38,50,57,0.18)'}`,
                    background: isSelected ? BRONZE : 'transparent',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 180ms ease',
                    marginLeft: 2,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 999,
                      background: '#FFFEFB',
                      opacity: isSelected ? 1 : 0,
                      transform: isSelected ? 'scale(1)' : 'scale(0.6)',
                      transition: 'all 180ms ease',
                      display: 'block',
                    }}
                  />
                </span>
              </div>

              <div
                className="serif"
                style={{
                  fontSize: 17,
                  lineHeight: '26px',
                  fontWeight: 500,
                  overflowWrap: 'anywhere',
                  color: 'var(--voyager-ink-1)',
                  letterSpacing: '-0.01em',
                }}
              >
                {o.label}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  lineHeight: '22px',
                  color: 'var(--voyager-ink-2)',
                  overflowWrap: 'anywhere',
                }}
              >
                {o.tradeoff}
              </div>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}>
        <button
          type="button"
          onClick={submit}
          disabled={!selected || busy}
          aria-label="Continue"
          style={{
            height: 42,
            padding: '0 28px',
            borderRadius: 999,
            border: '1px solid transparent',
            background: BRONZE,
            color: '#FFFEFB',
            fontWeight: 600,
            fontSize: 13.5,
            letterSpacing: '0.04em',
            opacity: !selected || busy ? 0.38 : 1,
            cursor: !selected || busy ? 'not-allowed' : 'pointer',
            transition: 'opacity 180ms ease, background 180ms ease, transform 180ms ease',
            minWidth: 148,
            boxShadow: selected && !busy ? '0 1px 10px rgba(154,122,90,0.22)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (selected && !busy) (e.currentTarget as HTMLButtonElement).style.background = BRONZE_HOVER
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = BRONZE
          }}
        >
          Continue &nbsp;→
        </button>
      </div>

      <div
        aria-live="polite"
        style={{
          textAlign: 'center',
          minHeight: 18,
          marginTop: 10,
          fontSize: 13,
          lineHeight: '18px',
          color: 'var(--voyager-clay)',
          overflowWrap: 'anywhere',
          padding: '0 8px',
        }}
      >
        {error}
      </div>

      {/* Discreet footer — reduces perceived empty space below */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: 28,
          borderTop: '1px solid rgba(225,214,197,0.55)',
          textAlign: 'center',
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--voyager-ink-3)',
          lineHeight: '16px',
        }}
      >
        Voyager &nbsp;·&nbsp; Private counsel — your choice refines what follows
      </div>

      <style>{`
        .decision-required .mono { font-family: IBM Plex Mono, ui-monospace, monospace; }
        @media (max-width: 720px) {
          .decision-required { width: min(92vw, 88vw) !important; padding-top: 32px !important; }
          .decision-required h1 { font-size: 26px !important; line-height: 34px !important; }
        }
        @media (max-width: 480px) {
          .decision-required h1 { font-size: 23px !important; line-height: 30px !important; }
          .decision-card { max-width: 100% !important; padding: 24px !important; }
        }
      `}</style>
    </main>
  )
}
