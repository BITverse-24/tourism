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

export default function DecisionRequired() {
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const caption = reasonCaption(decision.reason)

  const submit = () => {
    if (!selected || busy) return
    // Basic toggle only: lock, simulate submit, preserve selection on error
    setBusy(true)
    setError('')
    const command_id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `cmd_${Date.now()}`
    // Simulate idempotent submit — in real wiring this would send { decision_id: decision.decision_id, option_id: selected } with command_id
    void command_id
    // Demo: show inline stale handling if option is unknown (not reachable with current mock), otherwise navigate after brief lock
    setTimeout(() => {
      // For demo, keep busy locked briefly then unlock; real code would wait for planning.status
      setBusy(false)
      // keep selection preserved; show no error on success
    }, 800)
  }

  return (
    <main
      className="decision-required"
      style={{
        width: 'min(800px, calc(100vw - 48px))',
        margin: '0 auto',
        padding: '96px 0 128px',
        minWidth: 0,
      }}
    >
      <h1
        className="serif"
        style={{
          fontSize: 28,
          lineHeight: '36px',
          fontWeight: 500,
          textAlign: 'center',
          color: 'var(--voyager-ink-1)',
          overflowWrap: 'anywhere',
        }}
      >
        {decision.prompt}
      </h1>
      <p
        style={{
          textAlign: 'center',
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--voyager-ink-3)',
          marginTop: 12,
          marginBottom: 32,
          fontWeight: 500,
          overflowWrap: 'anywhere',
        }}
      >
        {caption}
      </p>

      <div
        role="group"
        aria-label="Choose one option"
        style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}
      >
        {decision.options.map((o) => {
          const isSelected = selected === o.option_id
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
              style={{
                textAlign: 'left',
                padding: 24,
                borderRadius: 'var(--voyager-radius-md)',
                border: isSelected ? '1px solid var(--voyager-brass-1)' : '1px solid var(--voyager-bone-2)',
                background: isSelected ? 'var(--voyager-ink-1)' : 'var(--voyager-bone-1)',
                color: isSelected ? 'var(--voyager-light-ink)' : 'var(--voyager-ink-1)',
                boxShadow: isSelected ? 'var(--voyager-shadow-float)' : 'var(--voyager-shadow-card)',
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.4 : 1,
                minHeight: 96,
                width: '100%',
                transition: 'background 150ms ease, box-shadow 150ms ease, opacity 150ms ease',
                display: 'block',
                minWidth: 0,
              }}
              onMouseEnter={(e) => {
                if (!isSelected && !busy) (e.currentTarget as HTMLButtonElement).style.background = 'var(--voyager-bone-0)'
              }}
              onMouseLeave={(e) => {
                if (!isSelected && !busy) (e.currentTarget as HTMLButtonElement).style.background = 'var(--voyager-bone-1)'
              }}
            >
              <div className="serif" style={{ fontSize: 18, lineHeight: '26px', fontWeight: 500, overflowWrap: 'anywhere' }}>
                {o.label}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 16,
                  lineHeight: '25px',
                  color: isSelected ? 'rgba(242,235,221,0.78)' : 'var(--voyager-ink-2)',
                  overflowWrap: 'anywhere',
                }}
              >
                {o.tradeoff}
              </div>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
        <button
          type="button"
          onClick={submit}
          disabled={!selected || busy}
          aria-label="Continue"
          style={{
            height: 44,
            padding: '0 28px',
            borderRadius: 'var(--voyager-radius-md)',
            border: 'none',
            background: 'var(--voyager-brass-1)',
            color: 'var(--voyager-ink-1)',
            fontWeight: 500,
            fontSize: 15,
            opacity: !selected || busy ? 0.4 : 1,
            cursor: !selected || busy ? 'not-allowed' : 'pointer',
            transition: 'opacity 150ms ease, background 150ms ease',
            minWidth: 0,
          }}
          onMouseEnter={(e) => {
            if (selected && !busy) (e.currentTarget as HTMLButtonElement).style.background = 'var(--voyager-brass-2)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--voyager-brass-1)'
          }}
        >
          Continue →
        </button>
      </div>

      <div
        aria-live="polite"
        style={{
          textAlign: 'center',
          minHeight: 18,
          marginTop: 12,
          fontSize: 13,
          lineHeight: '18px',
          color: 'var(--voyager-clay)',
          overflowWrap: 'anywhere',
          padding: '0 8px',
        }}
      >
        {error}
      </div>

      <style>{`
        @media (max-width: 480px) {
          .decision-required h1 { font-size: 22px !important; line-height: 30px !important; }
          .decision-required > div > button { width: 100% !important; }
          .decision-required > div:last-of-type button { width: 100% !important; }
        }
      `}</style>
    </main>
  )
}
