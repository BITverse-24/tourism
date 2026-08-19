import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Arrival() {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [exiting, setExiting] = useState(false)
  const navigate = useNavigate()
  const taRef = useRef<HTMLTextAreaElement>(null)

  // Unicode code points, not UTF-16 units
  const len = [...text].length
  const trimmed = text.trim()
  const overLimit = len > 2000
  const tooShort = trimmed.length < 2
  const valid = !tooShort && !overLimit && !busy

  const submit = () => {
    if (busy || exiting) return
    if (overLimit) {
      setFeedback('Please keep your note to 2000 characters.')
      return
    }
    if (tooShort) return
    setFeedback('')
    setBusy(true)
    // No backend — simulate respectful pause then poured exit to Discovery
    // Hold until "ready" — local pour delay, no optimistic navigation cut
    setTimeout(() => setExiting(true), 520)
    setTimeout(() => navigate('/discovery'), 980)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (valid) submit()
    }
  }

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    if (feedback) setFeedback('')
  }

  return (
    <main
      className={`arrival${exiting ? ' is-exiting' : ''}`}
      style={
        {
          position: 'relative',
          minHeight: '100svh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: 'var(--voyager-ink-0)',
        } as React.CSSProperties
      }
    >
      {/* background-image — fixed to viewport, slow living zoom */}
      <div
        className="background-image"
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'url(https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 58%',
          willChange: 'transform',
          animation: 'arrivalKenBurns 28s ease-in-out infinite alternate',
          transformOrigin: 'center center',
        }}
      />
      {/* background-veil — deep ink 62% */}
      <div
        className="background-veil"
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(27,37,44,0.62)',
        }}
      />

      {/* arrival-content — relative, centered */}
      <div
        className="arrival-content"
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          minHeight: '100svh',
          padding: '48px 0',
        }}
      >
        <div
          className="arrival-column"
          style={{
            width: 'min(640px, calc(100vw - 48px))',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            // poured entrance
            animation: exiting ? undefined : 'arrivalPour 520ms cubic-bezier(.22,.61,.36,1) both',
            opacity: exiting ? 0 : 1,
            transform: exiting ? 'translateY(-6px)' : undefined,
            transition: exiting ? 'opacity 420ms ease, transform 420ms cubic-bezier(.22,.61,.36,1), filter 420ms ease' : undefined,
            filter: exiting ? 'blur(1px)' : undefined,
          }}
        >
          {/* h1 — headline */}
          <h1
            className="serif"
            style={{
              fontFamily: 'Fraunces, Georgia, serif',
              fontSize: 56,
              lineHeight: '64px',
              fontWeight: 400,
              color: 'var(--voyager-bone-0)',
              textAlign: 'center',
              letterSpacing: '0.03em',
              margin: 0,
              maxWidth: '100%',
            }}
          >
            Where shall we begin?
          </h1>

          {/* reassurance paragraph — subline whisper */}
          <p
            style={{
              marginTop: 16,
              marginBottom: 0,
              color: 'rgba(247,242,233,0.88)',
              textAlign: 'center',
              maxWidth: 520,
              fontSize: 15,
              lineHeight: '25px',
              fontWeight: 400,
              letterSpacing: '0.01em',
            }}
          >
            A brief note or a long story — both work. We&apos;ll ask only what&apos;s missing, and shape
            the trip around how you want to feel.
          </p>

          {/* intent card — hero interaction */}
          <div
            className="intent-card"
            style={{
              marginTop: 32,
              width: '100%',
              maxWidth: 640,
              background: 'var(--voyager-bone-1)',
              borderRadius: 'var(--voyager-radius-lg)',
              padding: 32,
              boxShadow: 'var(--voyager-shadow-card)',
              border: '1px solid rgba(225,214,197,0.55)',
              opacity: busy ? 0.4 : 1,
              transition:
                'opacity 220ms ease, box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease',
            }}
          >
            <label
              htmlFor="intent"
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                overflow: 'hidden',
                clip: 'rect(0 0 0 0)',
                clipPath: 'inset(50%)',
                whiteSpace: 'nowrap',
              }}
            >
              Trip intent — describe what you want from this trip
            </label>
            <textarea
              id="intent"
              ref={taRef}
              value={text}
              onChange={onChange}
              onKeyDown={onKeyDown}
              placeholder={
                'Kyoto in autumn, slow, sunrise photography\nor — ten days, two friends, avoid crowds, street food over museums'
              }
              rows={3}
              disabled={busy}
              aria-describedby="intent-helper intent-count"
              aria-invalid={overLimit ? true : undefined}
              style={{
                width: '100%',
                minHeight: 96,
                maxHeight: 160,
                background: 'var(--voyager-bone-0)',
                border: '1px solid var(--voyager-bone-2)',
                borderRadius: 'var(--voyager-radius-md)',
                padding: '14px 16px',
                fontSize: 18,
                lineHeight: '28px',
                color: 'var(--voyager-ink-1)',
                resize: 'none',
                outline: 'none',
                display: 'block',
                fontFamily: 'General Sans, Inter, ui-sans-serif, sans-serif',
                transition:
                  'box-shadow 150ms ease, border-color 150ms ease, background 150ms ease',
                overflowY: 'auto',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--voyager-brass-2)'
                e.currentTarget.style.boxShadow =
                  '0 0 0 3px rgba(216,193,154,0.72), 0 0 0 1px rgba(216,193,154,0.9)'
                const card = e.currentTarget.closest('.intent-card') as HTMLElement | null
                if (card) {
                  card.style.boxShadow =
                    '0 1px 2px rgba(38,41,37,.08), 0 14px 32px rgba(38,41,37,.12)'
                  card.style.borderColor = 'rgba(216,193,154,0.45)'
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--voyager-bone-2)'
                e.currentTarget.style.boxShadow = 'none'
                const card = e.currentTarget.closest('.intent-card') as HTMLElement | null
                if (card) {
                  card.style.boxShadow = 'var(--voyager-shadow-card)'
                  card.style.borderColor = 'rgba(225,214,197,0.55)'
                }
              }}
            />

            {/* helper row — two-column grid, wraps at 320px */}
            <div
              className="helper-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '8px 12px',
                marginTop: 12,
                alignItems: 'start',
              }}
            >
              <span
                id="intent-helper"
                style={{
                  fontSize: 12,
                  lineHeight: '17px',
                  color: 'var(--voyager-ink-3)',
                  letterSpacing: '0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: 'var(--voyager-brass-1)',
                    opacity: 0.9,
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                />
                However short or long — we&apos;ll ask only what&apos;s missing.
              </span>
              <span
                id="intent-count"
                aria-live="polite"
                aria-atomic="true"
                style={{
                  fontSize: 12,
                  lineHeight: '17px',
                  color: overLimit ? 'var(--voyager-clay)' : 'var(--voyager-ink-3)',
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                  textAlign: 'right',
                  fontWeight: 500,
                  transition: 'color 150ms ease',
                }}
              >
                {len} / 2000
              </span>
            </div>
          </div>

          {/* primary action — 16px from card */}
          <button
            type="button"
            onClick={submit}
            disabled={!valid}
            aria-disabled={!valid}
            style={{
              marginTop: 16,
              height: 44,
              minHeight: 44,
              padding: '0 28px',
              borderRadius: 'var(--voyager-radius-md)',
              border: 'none',
              background: 'var(--voyager-brass-1)',
              color: 'var(--voyager-ink-1)',
              fontSize: 15,
              fontWeight: 500,
              letterSpacing: '0.01em',
              cursor: valid ? 'pointer' : 'not-allowed',
              opacity: valid || busy ? 1 : 0.4,
              pointerEvents: busy ? 'none' : undefined,
              transition: 'background 150ms ease, opacity 150ms ease, transform 150ms ease, box-shadow 150ms ease',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: valid ? '0 1px 2px rgba(38,41,37,.10)' : 'none',
              // busy dims via wrapper + button opacity already — card dims to 0.4
            }}
            onMouseEnter={(e) => {
              if (valid && !busy) (e.currentTarget as HTMLButtonElement).style.background = 'var(--voyager-brass-2)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--voyager-brass-1)'
            }}
            onMouseDown={(e) => {
              if (valid) (e.currentTarget as HTMLButtonElement).style.background = 'var(--voyager-brass-3)'
            }}
            onMouseUp={(e) => {
              if (valid) (e.currentTarget as HTMLButtonElement).style.background = 'var(--voyager-brass-2)'
            }}
          >
            Begin the Interview →
          </button>

          {/* safety caption — 16px from button */}
          <p
            style={{
              marginTop: 16,
              marginBottom: 0,
              fontSize: 12,
              lineHeight: '17px',
              color: 'rgba(247,242,233,0.72)',
              textAlign: 'center',
              letterSpacing: '0.01em',
            }}
          >
            You can change anything later — nothing is booked until you confirm the profile.
          </p>

          {/* inline feedback — polite live region beneath caption */}
          <div
            aria-live="polite"
            aria-atomic="true"
            style={{
              marginTop: 12,
              minHeight: 20,
              fontSize: 13,
              lineHeight: '18px',
              color: feedback ? 'var(--voyager-clay)' : 'rgba(242,235,221,0.92)',
              textAlign: 'center',
              maxWidth: 520,
              transition: 'color 150ms ease',
            }}
          >
            {feedback ? feedback : overLimit ? 'Please keep your note to 2000 characters.' : ''}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes arrivalKenBurns {
          from { transform: scale(1); }
          to   { transform: scale(1.06); }
        }
        @keyframes arrivalPour {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .arrival.is-exiting .background-image {
          filter: blur(7px);
          transition: filter 520ms ease;
        }
        .arrival.is-exiting .background-veil {
          background: rgba(27,37,44,0.62);
        }
        .arrival.is-exiting .arrival-content {
          filter: blur(1px);
        }
        /* helper row wraps at 320px */
        @media (max-width: 320px) {
          .helper-row {
            grid-template-columns: 1fr !important;
          }
          .helper-row #intent-count {
            text-align: left !important;
          }
        }
        /* arrival-content vertical padding responsive */
        @media (max-width: 768px) {
          .arrival-content {
            padding: 32px 0 !important;
          }
          .arrival-column h1 {
            font-size: 40px !important;
            line-height: 48px !important;
          }
          .intent-card {
            padding: 24px !important;
          }
        }
        @media (max-width: 320px) {
          .intent-card {
            padding: 20px !important;
          }
        }
        /* textarea placeholder */
        #intent::placeholder {
          color: var(--voyager-ink-3);
          opacity: 1;
        }
        /* brass focus ring via :focus-visible for keyboard users */
        #intent:focus-visible {
          border-color: var(--voyager-brass-2) !important;
          box-shadow: 0 0 0 3px rgba(216,193,154,.72), 0 0 0 1px rgba(216,193,154,0.9) !important;
        }
        /* button focus */
        button:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(216,193,154,.72), 0 1px 2px rgba(38,41,37,.10);
        }
        button:disabled {
          pointer-events: none;
        }
        /* respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .background-image { animation: none !important; }
          .arrival-column { animation: none !important; transition: none !important; }
        }
      `}</style>
    </main>
  )
}
