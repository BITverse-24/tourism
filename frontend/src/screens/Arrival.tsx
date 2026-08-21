import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../hooks/useAppState'
import { useWsOptional } from '../ws/WsProvider'

export default function Arrival() {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [exiting, setExiting] = useState(false)
  const navigate = useNavigate()
  const taRef = useRef<HTMLTextAreaElement>(null)
  const { setIntent } = useAppState()
  const ws = useWsOptional()

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
    // Persist intent for downstream screens (Discovery → profile, etc.)
    try { setIntent(trimmed) } catch {}
    // Queue session.start with initial intent so backend can seed profile (Kashmir etc.)
    // WsProvider reads stored session_id or null and ensures connection.
    // Must happen before navigate so discovery can receive session.ready / recovery state.
    // Handle idle/closed client gracefully; navigation must still proceed.
    try { ws?.sendSessionStart(trimmed) } catch {}
    setTimeout(() => setExiting(true), 380)
    setTimeout(() => navigate('/discovery'), 820)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (valid) submit()
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      // allow Enter to submit when valid and single line intent
      // keep textarea behaviour — only submit on Cmd+Enter to avoid accidental
    }
  }

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    if (feedback) setFeedback('')
  }

  return (
    <main
      className={`arrival arrival--editorial${exiting ? ' is-exiting' : ''}`}
      style={
        {
          position: 'relative',
          minHeight: '100svh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: 'var(--voyager-bone-0)',
          isolation: 'isolate',
        } as React.CSSProperties
      }
    >
      {/* oversized 01 watermark — very low opacity */}
      <div className="arrival-watermark" aria-hidden="true">
        <span className="arrival-watermark__num">01</span>
      </div>

      <div className="arrival-editorial">
        <div
          className="arrival-column"
          style={{
            opacity: exiting ? 0 : 1,
            transform: exiting ? 'translateY(-8px)' : undefined,
            transition: exiting
              ? 'opacity 420ms ease, transform 520ms cubic-bezier(.22,.61,.36,1), filter 420ms ease'
              : undefined,
            filter: exiting ? 'blur(2px)' : undefined,
          }}
        >
          {/* eyebrow */}
          <div className="arrival-eyebrow" aria-hidden="true">
            <span className="arrival-eyebrow__num">01</span>
            <span className="arrival-eyebrow__sep">—</span>
            <span>THE JOURNEY</span>
          </div>

          <h1 className="arrival-headline serif">
            Where shall we begin?
          </h1>

          <p className="arrival-tagline">
            A considered journey, shaped around how you want to feel.
          </p>

          <div className="arrival-rule" aria-hidden="true" />

          <div className={`arrival-fieldWrap${busy ? ' is-busy' : ''}`}>
            <label htmlFor="intent" className="arrival-fieldLabel">
              Tell us what you&apos;re looking for
            </label>
            <textarea
              id="intent"
              ref={taRef}
              value={text}
              onChange={onChange}
              onKeyDown={onKeyDown}
              placeholder="Kyoto in autumn, slow mornings, photography…"
              rows={3}
              disabled={busy}
              aria-describedby="intent-helper intent-count"
              aria-invalid={overLimit ? true : undefined}
              className="arrival-textarea"
            />
            <div className="arrival-fieldMeta">
              <span id="intent-helper" className="arrival-helper">
                However short or long — we&apos;ll ask only what&apos;s missing.
              </span>
              <span
                id="intent-count"
                aria-live="polite"
                aria-atomic="true"
                className={`arrival-count${overLimit ? ' is-over' : ''}`}
              >
                {len} / 2000
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={!valid}
            aria-disabled={!valid}
            className="arrival-cta"
          >
            <span>Begin the interview</span>
            <span aria-hidden className="arrival-cta__arrow">→</span>
          </button>

          <p className="arrival-footnote">
            You can change anything later — nothing is booked until you confirm the profile.
          </p>

          <div
            aria-live="polite"
            aria-atomic="true"
            className="arrival-feedback"
          >
            {feedback ? feedback : overLimit ? 'Please keep your note to 2000 characters.' : ''}
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&display=swap');
        .arrival--editorial {
          background: var(--voyager-bone-0, #F7F2E9);
          min-height: 100svh;
        }
        .arrival-watermark {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .arrival-watermark__num {
          position: absolute;
          left: 50%;
          top: 46%;
          transform: translate(-50%, -52%);
          font-family: Fraunces, Georgia, serif;
          font-size: clamp(280px, 42vw, 640px);
          line-height: 1;
          font-weight: 500;
          letter-spacing: -0.06em;
          color: #1B252C;
          opacity: 0.035;
          user-select: none;
          white-space: nowrap;
        }
        .arrival-editorial {
          position: relative;
          z-index: 1;
          width: 100%;
          min-height: 100svh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 24px 56px;
        }
        .arrival-column {
          width: min(720px, 92vw);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          animation: arrivalPour 680ms cubic-bezier(.22,.61,.36,1) both;
        }
        .arrival-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font: 500 11px/16px General Sans, Inter, ui-sans-serif, sans-serif;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--voyager-ink-3, #7D878A);
          margin-bottom: 18px;
        }
        .arrival-eyebrow__num {
          color: var(--voyager-brass-3, #86633B);
          font-weight: 600;
        }
        .arrival-eyebrow__sep { opacity: 0.45; }
        .arrival-headline {
          font-family: Fraunces, Georgia, serif;
          font-size: clamp(44px, 5.2vw, 64px);
          line-height: 0.98;
          font-weight: 400;
          letter-spacing: -0.03em;
          color: var(--voyager-ink-0, #1B252C);
          margin: 0;
          text-wrap: balance;
          font-variation-settings: "opsz" 72, "WONK" 1;
        }
        .arrival-tagline {
          margin-top: 16px;
          font-family: Fraunces, Georgia, serif;
          font-size: 16px;
          line-height: 26px;
          font-style: italic;
          font-weight: 400;
          color: var(--voyager-ink-2, #56636A);
          max-width: 520px;
          letter-spacing: 0.01em;
        }
        .arrival-rule {
          width: 100%;
          max-width: 720px;
          height: 1px;
          margin: 32px 0 28px;
          background: linear-gradient(to right, transparent, var(--voyager-bone-3, #C9BBA5) 12%, var(--voyager-bone-3, #C9BBA5) 88%, transparent);
          opacity: 0.9;
        }
        .arrival-fieldWrap {
          width: 100%;
          text-align: left;
          transition: opacity 200ms ease;
        }
        .arrival-fieldWrap.is-busy { opacity: 0.55; }
        .arrival-fieldLabel {
          display: block;
          font: 500 11px/16px General Sans, Inter, ui-sans-serif, sans-serif;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--voyager-ink-2, #56636A);
          margin-bottom: 12px;
        }
        .arrival-textarea {
          width: 100%;
          min-height: 148px;
          max-height: 220px;
          background: #FFFBF2;
          border: 1px solid var(--voyager-bone-2, #E1D6C5);
          border-radius: 14px;
          padding: 20px 22px;
          font-size: 17px;
          line-height: 27px;
          color: var(--voyager-ink-0, #1B252C);
          resize: vertical;
          outline: none;
          display: block;
          font-family: General Sans, Inter, ui-sans-serif, sans-serif;
          transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
          box-shadow: inset 0 1px 0 rgba(27,37,44,.04);
        }
        .arrival-textarea::placeholder {
          color: #9AA3A6;
          opacity: 1;
          font-style: italic;
        }
        .arrival-textarea:hover {
          border-color: var(--voyager-bone-3, #C9BBA5);
        }
        .arrival-textarea:focus {
          border-color: var(--voyager-bone-3, #C9BBA5);
          background: #FFFEFB;
          box-shadow: 0 0 0 3px rgba(179,138,85,.16), inset 0 1px 0 rgba(27,37,44,.03);
        }
        .arrival-textarea:disabled { opacity: 0.6; cursor: not-allowed; }
        .arrival-fieldMeta {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px 16px;
          margin-top: 10px;
          align-items: start;
        }
        .arrival-helper {
          font-size: 12px;
          line-height: 17px;
          color: var(--voyager-ink-3, #7D878A);
          letter-spacing: 0.01em;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .arrival-helper::before {
          content: "";
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: var(--voyager-bone-3, #C9BBA5);
          flex-shrink: 0;
          opacity: 0.95;
        }
        .arrival-count {
          font-size: 11px;
          line-height: 17px;
          color: var(--voyager-ink-3, #7D878A);
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
          text-align: right;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .arrival-count.is-over { color: var(--voyager-clay, #B56F62); }
        .arrival-cta {
          margin-top: 28px;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(27,37,44,0.18);
          border-radius: 0;
          padding: 10px 2px 9px;
          color: var(--voyager-ink-0, #1B252C);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: color 180ms ease, border-color 180ms ease, opacity 180ms ease, transform 180ms ease;
        }
        .arrival-cta:disabled {
          opacity: 0.38;
          cursor: not-allowed;
          pointer-events: none;
        }
        .arrival-cta:not(:disabled):hover {
          color: var(--voyager-brass-3, #86633B);
          border-bottom-color: rgba(134,99,59,0.42);
          transform: translateY(-1px);
        }
        .arrival-cta:not(:disabled):active { transform: translateY(0); }
        .arrival-cta:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(179,138,85,.22);
          border-bottom-color: rgba(134,99,59,0.42);
        }
        .arrival-cta__arrow {
          font-size: 15px;
          line-height: 1;
          transition: transform 180ms ease;
          display: inline-block;
        }
        .arrival-cta:not(:disabled):hover .arrival-cta__arrow { transform: translateX(4px); }
        .arrival-footnote {
          margin-top: 20px;
          font-size: 12px;
          line-height: 18px;
          color: rgba(86,99,106,0.62);
          text-align: center;
          letter-spacing: 0.01em;
          max-width: 520px;
        }
        .arrival-feedback {
          margin-top: 12px;
          min-height: 20px;
          font-size: 13px;
          line-height: 18px;
          color: var(--voyager-clay, #B56F62);
          text-align: center;
          max-width: 520px;
        }
        @keyframes arrivalPour {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .is-exiting .arrival-column { animation: none; }
        @media (max-width: 768px) {
          .arrival-editorial { padding: 32px 18px 40px; }
          .arrival-headline { font-size: clamp(36px, 9vw, 48px); }
          .arrival-tagline { font-size: 15px; line-height: 24px; }
          .arrival-textarea { min-height: 132px; font-size: 16px; }
          .arrival-watermark__num { font-size: clamp(200px, 70vw, 380px); opacity: 0.028; }
        }
        @media (max-width: 380px) {
          .arrival-fieldMeta { grid-template-columns: 1fr; }
          .arrival-count { text-align: left; }
        }
        @media (prefers-reduced-motion: reduce) {
          .arrival-column { animation: none !important; transition: none !important; }
        }
      `}</style>
    </main>
  )
}
