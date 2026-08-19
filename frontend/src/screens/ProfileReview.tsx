import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { mockProfile, mockProfileBlocking } from '../data/mockProfile'

type Profile = typeof mockProfile & { profile_revision?: number }

function formatDate(dateStr?: string) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return dateStr
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).format(d)
  } catch {
    return dateStr
  }
}

function formatBudget(b?: { amount: number; currency: string; scope: string }) {
  if (!b) return ''
  const amt = new Intl.NumberFormat(undefined).format(b.amount)
  const scopeMap: Record<string, string> = { target: 'target', ceiling: 'ceiling', flexible: 'flexible' }
  const scope = b.scope ? ` · ${scopeMap[b.scope] ?? b.scope}` : ''
  return `${b.currency} ${amt}${scope}`
}

function formatStrength(s: string) {
  return s.replace(/_/g, '-')
}

export default function ProfileReview() {
  const [useBlocking, setUseBlocking] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [topics, setTopics] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()

  // Simulate profile snapshot and readiness / revision gating
  const baseProfile: Profile = useBlocking ? { ...mockProfileBlocking, profile_revision: 7 } : { ...mockProfile, profile_revision: 7 }
  const p: Profile = baseProfile
  const hasBlocking = p.unknowns.some((u) => u.impact === 'blocking')
  // readiness is derived from snapshot; blocking unknown disables confirm regardless
  const isReady = !hasBlocking

  const requestChangesBtnRef = useRef<HTMLButtonElement>(null)
  const firstChipRef = useRef<HTMLButtonElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editorOpen) {
      firstChipRef.current?.focus()
    } else {
      requestChangesBtnRef.current?.focus()
    }
  }, [editorOpen])

  // Derive available topics from unknowns + material topics (spec: from current profile's unknown/material topics)
  const availableTopics = (() => {
    const set = new Set<string>()
    p.unknowns.forEach((u) => set.add(u.topic))
    p.assumptions.forEach((a) => set.add(a.topic))
    // also include common travel topics as fallback if profile has few unknowns
    if (set.size < 3) {
      ;['Budget scope', 'Walking tolerance', 'Dates', 'Party size', 'Pace', 'Food preferences'].forEach((t) => set.add(t))
    }
    return Array.from(set)
  })()

  const doConfirm = () => {
    if (hasBlocking || busy) return
    // stale / not-ready handling: simulate plain-language notice
    if (!isReady) {
      setNotice('The profile is not ready to confirm — please address the open questions above.')
      return
    }
    setBusy(true)
    setNotice('')
    // procedure: draft — send latest profile_revision with fresh correlation
    const correlationId = `corr_${Date.now().toString(36)}`
    const revision = p.profile_revision ?? 7
    // In real WS: { type: 'profile.confirm', payload: { profile_revision: revision }, command_id: correlationId }
    void correlationId
    void revision
    setTimeout(() => {
      // Simulate server acceptance vs stale revision edge
      const stale = false
      if (stale) {
        setBusy(false)
        setNotice('The profile was just updated — please review the latest.')
        return
      }
      setBusy(false)
      navigate('/consultation')
    }, 600)
  }

  const doRequestChanges = () => {
    setBusy(true)
    setNotice('')
    const correlationId = `corr_${Date.now().toString(36)}`
    void correlationId
    // payload: { topics, free_text: note }
    setTimeout(() => {
      setBusy(false)
      setEditorOpen(false)
      // spec: wait for next discovery.question before leaving this screen — navigate to discovery as draft procedure
      navigate('/discovery')
    }, 500)
  }

  const toggleTopic = (t: string) => {
    setTopics((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))
  }

  // Helpers to determine if groups are non-empty
  const hasTripContext = true // always has at least destination_request + party_size
  const hasPurpose = Boolean(p.purpose_and_priorities.primary_purpose || p.purpose_and_priorities.priorities.length)
  const hasPreferences = p.preferences.length > 0
  const hasTravelStyle = Boolean(p.travel_style)
  const hard = p.hard_constraints
  const hasHardConstraints =
    hard.must_visit.length > 0 ||
    hard.avoid.length > 0 ||
    hard.dietary_requirements.length > 0 ||
    hard.accessibility_requirements.length > 0 ||
    hard.accommodation_requirements.length > 0 ||
    Boolean(hard.maximum_daily_travel) ||
    Boolean(hard.maximum_hotel_changes) ||
    Boolean(hard.budget_ceiling)
  const hasUnknowns = p.unknowns.length > 0
  const hasAssumptions = p.assumptions.length > 0

  const Row = ({ label, value, hint }: { label: string; value: string; hint?: string }) => {
    if (!value) return null
    return (
      <div className="pr-row">
        <div className="pr-caption">{label}</div>
        <div className="pr-value">
          {value}
          {hint ? <span className="pr-hint"> · {hint}</span> : null}
        </div>
      </div>
    )
  }

  // Build destination value
  const destinationValue = p.trip_context.resolved_destination
    ? `${p.trip_context.destination_request} · resolved: ${p.trip_context.resolved_destination}`
    : p.trip_context.destination_request

  // Dates or duration
  let datesValue = ''
  if (p.trip_context.start_date || p.trip_context.end_date) {
    const s = p.trip_context.start_date ? formatDate(p.trip_context.start_date) : '—'
    const e = p.trip_context.end_date ? formatDate(p.trip_context.end_date) : '—'
    if (p.trip_context.start_date && p.trip_context.end_date) datesValue = `${s} → ${e}`
    else if (p.trip_context.start_date) datesValue = s
    else datesValue = e
  } else if (p.trip_context.duration_days) {
    datesValue = `${p.trip_context.duration_days} days`
  }

  return (
    <main className="profile-review">
      <h1 className="serif pr-headline">Here&apos;s what we&apos;ve understood.</h1>

      <div className="pr-body">
        {/* Trip context */}
        {hasTripContext && (
          <section className="pr-group pour" style={{ animationDelay: '60ms' }} aria-label="Trip context">
            <Row label="Destination" value={destinationValue} />
            {datesValue ? <Row label="Dates" value={datesValue} /> : null}
            {p.trip_context.date_flexibility ? <Row label="Flexibility" value={p.trip_context.date_flexibility} /> : null}
            <Row
              label="Party"
              value={`${p.trip_context.party_size} ${p.trip_context.party_size === 1 ? 'traveler' : 'travelers'}`}
              hint={p.trip_context.party_notes}
            />
            {p.trip_context.budget ? <Row label="Budget" value={formatBudget(p.trip_context.budget)} /> : null}
          </section>
        )}

        {/* Purpose and priorities */}
        {hasPurpose && (
          <section className="pr-group pour" style={{ animationDelay: '120ms' }} aria-label="Purpose and priorities">
            <div className="pr-section-label">Purpose &amp; priorities</div>
            <div className="pr-row">
              <div className="pr-caption">Purpose</div>
              <div className="pr-value">
                {p.purpose_and_priorities.primary_purpose}
                {p.purpose_and_priorities.secondary_purposes && p.purpose_and_priorities.secondary_purposes.length > 0
                  ? ` · ${p.purpose_and_priorities.secondary_purposes.join(' · ')}`
                  : null}
              </div>
            </div>
            {p.purpose_and_priorities.priorities.length > 0 && (
              <div className="pr-row">
                <div className="pr-caption">Priorities</div>
                <div className="pr-value">{p.purpose_and_priorities.priorities.join(' · ')}</div>
              </div>
            )}
            {p.purpose_and_priorities.success_definition && (
              <div className="pr-row">
                <div className="pr-caption">Success</div>
                <div className="pr-value pr-success">{p.purpose_and_priorities.success_definition}</div>
              </div>
            )}
          </section>
        )}

        {/* Preferences */}
        {hasPreferences && (
          <section className="pr-group pour" style={{ animationDelay: '180ms' }} aria-label="Preferences by category">
            <div className="pr-section-label">Preferences</div>
            <div className="pr-stack">
              {p.preferences.map((pr, i) => {
                const strength = formatStrength(pr.strength)
                const source = pr.source
                const showConfidence = (source === 'inferred' || source === 'defaulted') && pr.confidence
                const confidencePart = showConfidence ? ` (${pr.confidence})` : ''
                const notesPart = pr.notes ? ` — ${pr.notes}` : ''
                return (
                  <div key={i} className="pr-row pr-pref-row">
                    <div className="pr-caption">{pr.category}</div>
                    <div className="pr-value">
                      {strength} · {source}
                      {confidencePart}
                      {notesPart}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Travel style */}
        {hasTravelStyle && (
          <section className="pr-group pour" style={{ animationDelay: '240ms' }} aria-label="Travel style">
            <div className="pr-section-label">Travel style</div>
            <div className="pr-row">
              <div className="pr-caption">Pace</div>
              <div className="pr-value">{p.travel_style.pace}</div>
            </div>
            <div className="pr-row">
              <div className="pr-caption">Walking</div>
              <div className="pr-value">{p.travel_style.walking_tolerance}</div>
            </div>
            <div className="pr-row">
              <div className="pr-caption">Crowd</div>
              <div className="pr-value">{p.travel_style.crowd_tolerance}</div>
            </div>
            {p.travel_style.energy_pattern && (
              <div className="pr-row">
                <div className="pr-caption">Energy</div>
                <div className="pr-value">{p.travel_style.energy_pattern}</div>
              </div>
            )}
            {p.travel_style.comfort_preference && (
              <div className="pr-row">
                <div className="pr-caption">Comfort</div>
                <div className="pr-value">{p.travel_style.comfort_preference}</div>
              </div>
            )}
            {p.travel_style.spontaneity && (
              <div className="pr-row">
                <div className="pr-caption">Spontaneity</div>
                <div className="pr-value">{p.travel_style.spontaneity}</div>
              </div>
            )}
          </section>
        )}

        {/* Hard constraints — only when non-empty, no placeholder */}
        {hasHardConstraints && (
          <section className="pr-group pour" style={{ animationDelay: '300ms' }} aria-label="Hard constraints">
            <div className="pr-section-label">Hard constraints</div>
            {hard.must_visit.length > 0 && (
              <div className="pr-row">
                <div className="pr-caption">Must visit</div>
                <div className="pr-value">{hard.must_visit.join(', ')}</div>
              </div>
            )}
            {hard.avoid.length > 0 && (
              <div className="pr-row">
                <div className="pr-caption">Avoid</div>
                <div className="pr-value">{hard.avoid.join(', ')}</div>
              </div>
            )}
            {hard.dietary_requirements.length > 0 && (
              <div className="pr-row">
                <div className="pr-caption">Dietary</div>
                <div className="pr-value">{hard.dietary_requirements.join(', ')}</div>
              </div>
            )}
            {hard.accessibility_requirements.length > 0 && (
              <div className="pr-row">
                <div className="pr-caption">Accessibility</div>
                <div className="pr-value">{hard.accessibility_requirements.join(', ')}</div>
              </div>
            )}
            {hard.accommodation_requirements.length > 0 && (
              <div className="pr-row">
                <div className="pr-caption">Lodging</div>
                <div className="pr-value">{hard.accommodation_requirements.join(', ')}</div>
              </div>
            )}
            {hard.maximum_daily_travel && (
              <div className="pr-row">
                <div className="pr-caption">Travel limit</div>
                <div className="pr-value">{hard.maximum_daily_travel}</div>
              </div>
            )}
            {typeof hard.maximum_hotel_changes === 'number' && (
              <div className="pr-row">
                <div className="pr-caption">Hotel changes</div>
                <div className="pr-value">At most {hard.maximum_hotel_changes}</div>
              </div>
            )}
            {hard.budget_ceiling && (
              <div className="pr-row">
                <div className="pr-caption">Budget ceiling</div>
                <div className="pr-value">{hard.budget_ceiling}</div>
              </div>
            )}
          </section>
        )}

        {/* Unknowns — brass left accent, italic, impact tag */}
        {hasUnknowns && (
          <section className="pr-group pour" style={{ animationDelay: '360ms' }} aria-label="Unknowns">
            <div className="pr-section-label">Unknowns</div>
            <div className="pr-unknowns">
              {p.unknowns.map((u, i) => {
                const isBlocking = u.impact === 'blocking'
                return (
                  <div key={i} className={`pr-unknown ${isBlocking ? 'pr-unknown--blocking' : ''}`}>
                    <div className="pr-unknown-desc">{u.description}</div>
                    <div className="pr-unknown-meta">
                      {u.topic} · {u.impact}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Assumptions — dashed brass outline */}
        {hasAssumptions && (
          <section className="pr-group pour" style={{ animationDelay: '420ms' }} aria-label="Assumptions">
            <div className="pr-section-label">Assumptions</div>
            <div className="pr-assumptions">
              {p.assumptions.map((a, i) => (
                <div key={i} className="pr-assumption">
                  <div className="pr-assumption-value">{a.value}</div>
                  <div className="pr-assumption-meta">
                    {a.reason}
                    {a.user_confirmation_needed ? ' · confirmation needed' : ''}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Actions — brass primary + ghost, centered */}
      <div className="pr-actions pour" style={{ animationDelay: '500ms' }}>
        <button
          className="pr-btn pr-btn--primary"
          onClick={doConfirm}
          disabled={hasBlocking || busy}
          aria-disabled={hasBlocking || busy}
          style={{ opacity: hasBlocking || busy ? 0.4 : 1 }}
        >
          Confirm Profile
        </button>
        <button
          ref={requestChangesBtnRef}
          className="pr-btn pr-btn--ghost"
          onClick={() => setEditorOpen((o) => !o)}
          disabled={busy}
          aria-expanded={editorOpen}
          aria-controls="pr-editor"
          style={{ opacity: busy ? 0.4 : 1 }}
        >
          Request changes
        </button>
      </div>

      <div aria-live="polite" className="pr-notice">
        {hasBlocking ? 'Please resolve blocking unknowns before confirming.' : notice}
      </div>

      {/* Dev toggle — not part of proof, muted */}
      <div className="pr-dev-toggle">
        <label className="pr-dev-label">
          <input type="checkbox" checked={useBlocking} onChange={(e) => setUseBlocking(e.target.checked)} /> Simulate blocking unknown
        </label>
      </div>

      {/* Inline editor — not modal, procedure: draft */}
      {editorOpen && (
        <div
          id="pr-editor"
          ref={editorRef}
          className="pr-editor pour"
          role="region"
          aria-label="Request changes"
        >
          <div className="pr-editor-label">What would you like to change?</div>
          <div className="pr-topics" role="group" aria-label="Affected topics">
            {availableTopics.map((t, idx) => {
              const selected = topics.includes(t)
              return (
                <button
                  key={t}
                  ref={idx === 0 ? firstChipRef : undefined}
                  aria-pressed={selected}
                  onClick={() => toggleTopic(t)}
                  className={`pr-chip ${selected ? 'pr-chip--selected' : ''}`}
                >
                  {t}
                </button>
              )
            })}
          </div>
          <label className="pr-textarea-label" htmlFor="pr-note">
            Add a note <span className="pr-optional">(optional)</span>
          </label>
          <textarea
            id="pr-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note — e.g., The budget should exclude international flights."
            rows={3}
            className="pr-textarea"
          />
          <div className="pr-editor-actions">
            <button onClick={doRequestChanges} className="pr-btn pr-btn--primary pr-btn--sm">
              Send changes →
            </button>
            <button onClick={() => setEditorOpen(false)} className="pr-btn pr-btn--ghost pr-btn--sm">
              Cancel
            </button>
          </div>
          <div className="pr-editor-hint">Topics and note will be sent; we&apos;ll return to discovery for targeted questions.</div>
        </div>
      )}

      <style>{`
        .profile-review{
          width: min(800px, calc(100vw - 48px));
          margin: 0 auto;
          padding: 48px 0 64px;
          background: var(--voyager-bone-0);
        }
        .pr-headline{
          font-size: 40px;
          line-height: 48px;
          font-weight: 400;
          text-align: center;
          color: var(--voyager-ink-1);
          margin-bottom: 48px;
        }
        .pr-body{
          text-align: left;
        }
        .pr-group{
          margin-top: 40px;
        }
        .pr-group:first-child{ margin-top: 0; }
        .pr-section-label{
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--voyager-ink-3);
          font-weight: 500;
          margin-bottom: 8px;
        }
        .pr-row{
          display: grid;
          grid-template-columns: 160px 1fr;
          gap: 16px;
          padding: 14px 0;
          border-top: 1px solid var(--voyager-bone-2);
          align-items: start;
        }
        .pr-stack .pr-row{ border-top: 1px solid var(--voyager-bone-2); }
        .pr-caption{
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--voyager-ink-3);
          font-weight: 500;
          line-height: 22px;
        }
        .pr-value{
          font-size: 15px;
          line-height: 22px;
          color: var(--voyager-ink-1);
        }
        .pr-hint{
          color: var(--voyager-ink-3);
          font-size: 13px;
        }
        .pr-success{
          font-style: italic;
          color: var(--voyager-ink-2);
        }
        .pr-pref-row .pr-value{
          font-size: 14px;
        }
        /* Unknowns */
        .pr-unknowns{ display: flex; flex-direction: column; }
        .pr-unknown{
          border-left: 4px solid var(--voyager-brass-1);
          padding-left: 16px;
          margin-bottom: 16px;
          padding-top: 2px;
          padding-bottom: 4px;
        }
        .pr-unknown:last-child{ margin-bottom: 0; }
        .pr-unknown-desc{
          font-size: 14px;
          line-height: 21px;
          font-style: italic;
          color: var(--voyager-ink-2);
        }
        .pr-unknown--blocking .pr-unknown-desc{
          color: var(--voyager-ink-1);
          font-weight: 500;
          font-style: italic;
        }
        .pr-unknown-meta{
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--voyager-ink-3);
          margin-top: 4px;
        }
        /* Assumptions */
        .pr-assumptions{
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .pr-assumption{
          border: 1px dashed var(--voyager-brass-1);
          border-radius: var(--voyager-radius-md);
          padding: 12px 16px;
          background: transparent;
        }
        .pr-assumption-value{
          font-size: 14px;
          line-height: 20px;
          color: var(--voyager-ink-1);
        }
        .pr-assumption-meta{
          font-size: 12px;
          line-height: 16px;
          color: var(--voyager-ink-3);
          margin-top: 4px;
        }
        /* Actions */
        .pr-actions{
          display: flex;
          gap: 24px;
          justify-content: center;
          margin-top: 48px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }
        .pr-btn{
          height: 44px;
          padding: 0 28px;
          border-radius: var(--voyager-radius-md);
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: background 150ms, opacity 150ms, border-color 150ms, color 150ms;
          font-family: inherit;
        }
        .pr-btn:disabled{ cursor: not-allowed; }
        .pr-btn--primary{
          border: none;
          background: var(--voyager-brass-1);
          color: var(--voyager-bone-0);
        }
        .pr-btn--primary:hover:not(:disabled){
          background: var(--voyager-brass-2);
        }
        .pr-btn--primary:disabled{ opacity: 0.4; }
        .pr-btn--ghost{
          border: 1px solid var(--voyager-ink-2);
          background: transparent;
          color: var(--voyager-ink-1);
        }
        .pr-btn--ghost:hover:not(:disabled){
          border-color: var(--voyager-ink-1);
          background: var(--voyager-bone-1);
        }
        .pr-btn--sm{ height: 40px; padding: 0 22px; font-size: 14px; }
        .pr-notice{
          text-align: center;
          min-height: 20px;
          font-size: 13px;
          color: var(--voyager-clay);
        }
        .pr-dev-toggle{
          text-align: center;
          margin-top: 8px;
        }
        .pr-dev-label{
          font-size: 12px;
          color: var(--voyager-ink-3);
          cursor: pointer;
        }
        .pr-dev-label input{ margin-right: 6px; }
        /* Editor */
        .pr-editor{
          margin-top: 24px;
          background: var(--voyager-bone-1);
          border: 1px solid var(--voyager-bone-2);
          border-radius: var(--voyager-radius-md);
          padding: 24px;
        }
        .pr-editor-label{
          font-size: 13px;
          font-weight: 500;
          color: var(--voyager-ink-1);
          margin-bottom: 12px;
        }
        .pr-topics{
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }
        .pr-chip{
          padding: 8px 14px;
          border-radius: var(--voyager-radius-pill);
          border: 1px solid var(--voyager-bone-2);
          background: var(--voyager-bone-0);
          color: var(--voyager-ink-1);
          font-size: 13px;
          cursor: pointer;
          transition: all 150ms;
        }
        .pr-chip--selected{
          background: var(--voyager-ink-1);
          color: var(--voyager-light-ink);
          border-color: var(--voyager-ink-1);
        }
        .pr-textarea-label{
          font-size: 12px;
          color: var(--voyager-ink-2);
          display: block;
          margin-bottom: 6px;
        }
        .pr-optional{ color: var(--voyager-ink-3); }
        .pr-textarea{
          width: 100%;
          background: var(--voyager-bone-0);
          border: 1px solid var(--voyager-bone-2);
          border-radius: var(--voyager-radius-md);
          padding: 12px;
          font-size: 14px;
          line-height: 20px;
          color: var(--voyager-ink-1);
          resize: none;
          font-family: inherit;
        }
        .pr-textarea:focus{ outline: none; box-shadow: var(--voyager-focus-ring); }
        .pr-editor-actions{
          display: flex;
          gap: 12px;
          margin-top: 16px;
          flex-wrap: wrap;
        }
        .pr-editor-hint{
          font-size: 12px;
          color: var(--voyager-ink-3);
          margin-top: 10px;
        }
        /* 768px collapse + 320px stack */
        @media (max-width: 768px){
          .pr-row{
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .pr-headline{
            font-size: 32px;
            line-height: 40px;
          }
        }
        @media (max-width: 320px){
          .pr-actions{
            flex-direction: column;
          }
          .pr-actions .pr-btn{
            width: 100%;
          }
        }
      `}</style>
    </main>
  )
}
