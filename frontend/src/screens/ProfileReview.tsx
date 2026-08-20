import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWs } from '../ws/useWs'
import type { TravelerProfile } from '../types'
import { mockProfile } from '../data/mockProfile'

type Profile = TravelerProfile & { profile_revision?: number }

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
  const [editorOpen, setEditorOpen] = useState(false)
  const [topics, setTopics] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()

  // --- Live snapshot consumption (WEBSOCKET_CONTRACT.md) ---
  // profile.snapshot: { revision, state draft|ready|confirmed, profile }
  // profile.ready: { profile_revision, blocking_unknowns }
  const ws = useWs()
  const liveSnapshot = ws.snapshot
  const liveReady = ws.ready

  // Fallback to mock only when no live snapshot has arrived yet (dev / initial load).
  // Once a live snapshot exists, it is the single source of truth; mocks never override live.
  const hasLiveSnapshot = !!liveSnapshot
  const rawProfile = liveSnapshot?.profile as unknown as TravelerProfile | null | undefined
  // Use live profile when available, otherwise show demo placeholder so the UI is not blank.
  const p: Profile | null = useMemo(() => {
    if (rawProfile && typeof rawProfile === 'object') {
      // Ensure profile_id exists; fallback to placeholder if missing
      const withRev: Profile = {
        ...(rawProfile as TravelerProfile),
        profile_revision: liveSnapshot!.revision,
      } as Profile
      // Defensive defaults for required nested objects so rendering doesn't crash on partial snapshots
      if (!withRev.trip_context) withRev.trip_context = mockProfile.trip_context
      if (!withRev.purpose_and_priorities) withRev.purpose_and_priorities = mockProfile.purpose_and_priorities
      if (!withRev.preferences) withRev.preferences = mockProfile.preferences
      if (!withRev.travel_style) withRev.travel_style = mockProfile.travel_style
      if (!withRev.hard_constraints) withRev.hard_constraints = mockProfile.hard_constraints
      if (!withRev.unknowns) withRev.unknowns = []
      if (!withRev.assumptions) withRev.assumptions = []
      return withRev
    }
    return null
  }, [rawProfile, liveSnapshot])

  // Effective profile for rendering — live when present, otherwise null (shows loading)
  // We keep mock visible only as a non-interactive placeholder behind the loading state,
  // but all gating logic uses live signals only.
  const displayProfile: Profile | null = p

  // Confirm gating — contract: only when snapshot state === 'ready', revision is latest (matches profile.ready),
  // and no blocking unknowns. Server remains authoritative; this is frontend pre-validation.
  const isReadyState = liveSnapshot?.state === 'ready'
  const isLatestRevision = useMemo(() => {
    if (!liveSnapshot || !liveReady) return false
    return liveSnapshot.revision === liveReady.profile_revision
  }, [liveSnapshot, liveReady])
  const hasNoBlockingUnknowns = (liveReady?.blocking_unknowns.length ?? 0) === 0
  const canConfirm = isReadyState && isLatestRevision && hasNoBlockingUnknowns && !!displayProfile && !busy && ws.canConfirm
  // ws.canConfirm already encodes the same checks; we combine for belt-and-braces and to match task wording explicitly.

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

  const availableTopics = useMemo(() => {
    const set = new Set<string>()
    if (displayProfile) {
      displayProfile.unknowns.forEach((u) => set.add(u.topic))
      displayProfile.assumptions.forEach((a) => set.add(a.topic))
    }
    if (set.size < 3) {
      ;['Budget scope', 'Walking tolerance', 'Dates', 'Party size', 'Pace', 'Food preferences'].forEach((t) => set.add(t))
    }
    return Array.from(set)
  }, [displayProfile])

  const doConfirm = () => {
    if (busy) return
    if (!liveSnapshot || !liveReady) {
      setNotice('Profile snapshot not yet available — please wait for the live profile to load.')
      return
    }
    if (!canConfirm) {
      // Provide contract-aligned message matching planning.validateProfileConfirm
      if (liveSnapshot.state !== 'ready') {
        setNotice('The latest profile is not ready for confirmation.')
      } else if (!isLatestRevision) {
        setNotice(`The profile was updated (latest revision ${liveReady.profile_revision}). Please review the latest before confirming.`)
      } else if (!hasNoBlockingUnknowns) {
        setNotice(`Profile has blocking unknowns (${liveReady.blocking_unknowns.join(', ')}) and cannot be confirmed yet.`)
      } else {
        setNotice('The profile cannot be confirmed yet — please address the open questions above.')
      }
      return
    }
    setBusy(true)
    setNotice('')
    const revision = liveSnapshot.revision
    const result = ws.sendProfileConfirm(revision)
    if (!result.ok) {
      setBusy(false)
      setNotice(result.error ?? 'Could not confirm the profile. Please try again.')
      return
    }
    // Server will ack and start Planning Controller; navigate to consultation.
    // In real flow server emits planning.status / agent.lifecycle after ack.
    setTimeout(() => {
      setBusy(false)
      navigate('/consultation')
    }, 300)
  }

  const doRequestChanges = () => {
    const topicsTrimmed = topics.map((t) => t.trim()).filter(Boolean)
    const freeTextTrimmed = note.trim()
    if (topicsTrimmed.length === 0 && !freeTextTrimmed) {
      setNotice('Provide at least one topic or a note describing the change.')
      return
    }
    setBusy(true)
    setNotice('')
    const result = ws.sendProfileRequestChanges(topicsTrimmed, freeTextTrimmed || undefined)
    if (!result.ok) {
      setBusy(false)
      setNotice(result.error ?? 'Could not send changes. Please try again.')
      return
    }
    // Contract: backend returns workflow to discovery, asks targeted questions, emits revised snapshot.
    setTimeout(() => {
      setBusy(false)
      setEditorOpen(false)
      navigate('/discovery')
    }, 300)
  }

  const toggleTopic = (t: string) => {
    setTopics((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))
  }

  // Loading state — no live snapshot yet
  if (!displayProfile) {
    return (
      <main className="profile-review">
        <div className="pr-eyebrow mono pour" style={{ animationDelay: '0ms' }}>
          Your dossier &nbsp;·&nbsp; review before we plan
        </div>
        <h1 className="serif pr-headline pour" style={{ animationDelay: '40ms' }}>
          Here&rsquo;s what we&rsquo;ve understood.
        </h1>
        <p className="pr-lede pour" style={{ animationDelay: '80ms' }}>
          Waiting for the live profile snapshot from the concierge…
        </p>
        <div className="pr-notice" style={{ marginTop: 24 }}>
          No profile.snapshot received yet. The server will emit a complete snapshot — the frontend replaces, never patches, the prior snapshot for that revision.
        </div>
        {notice ? <div className="pr-notice">{notice}</div> : null}
        <style>{styles}</style>
      </main>
    )
  }

  const hard = displayProfile.hard_constraints
  const hasHardConstraints =
    hard.must_visit.length > 0 ||
    hard.avoid.length > 0 ||
    hard.dietary_requirements.length > 0 ||
    hard.accessibility_requirements.length > 0 ||
    hard.accommodation_requirements.length > 0 ||
    Boolean(hard.maximum_daily_travel) ||
    Boolean(hard.maximum_hotel_changes) ||
    Boolean(hard.budget_ceiling)
  const hasUnknowns = displayProfile.unknowns.length > 0
  const hasAssumptions = displayProfile.assumptions.length > 0
  const hasPreferences = displayProfile.preferences.length > 0
  const hasTravelStyle = Boolean(displayProfile.travel_style)

  const destinationValue = displayProfile.trip_context.resolved_destination
    ? `${displayProfile.trip_context.destination_request} · ${displayProfile.trip_context.resolved_destination}`
    : displayProfile.trip_context.destination_request

  let datesValue = ''
  if (displayProfile.trip_context.start_date || displayProfile.trip_context.end_date) {
    const s = displayProfile.trip_context.start_date ? formatDate(displayProfile.trip_context.start_date) : '—'
    const e = displayProfile.trip_context.end_date ? formatDate(displayProfile.trip_context.end_date) : '—'
    if (displayProfile.trip_context.start_date && displayProfile.trip_context.end_date) datesValue = `${s} — ${e}`
    else if (displayProfile.trip_context.start_date) datesValue = s
    else datesValue = e
  } else if (displayProfile.trip_context.duration_days) {
    datesValue = `${displayProfile.trip_context.duration_days} days`
  }

  const revisionLabel = liveSnapshot?.revision ?? displayProfile.profile_revision ?? 7
  const stateLabel = liveSnapshot?.state ?? '—'
  const blockingCount = liveReady?.blocking_unknowns.length ?? displayProfile.unknowns.filter((u) => u.impact === 'blocking').length

  return (
    <main className="profile-review">
      <div className="pr-eyebrow mono pour" style={{ animationDelay: '0ms' }}>
        Your dossier &nbsp;·&nbsp; review before we plan
      </div>
      <h1 className="serif pr-headline pour" style={{ animationDelay: '40ms' }}>
        Here&rsquo;s what we&rsquo;ve understood.
      </h1>
      <p className="pr-lede pour" style={{ animationDelay: '80ms' }}>
        A concise summary of your journey, preferences and constraints — as your concierge holds it. Please confirm, or tell us what to adjust.
      </p>
      {hasLiveSnapshot ? (
        <div className="pr-live-badge mono" style={{ marginTop: 8, fontSize: 10, letterSpacing: '0.08em', color: 'var(--voyager-ink-3)' }}>
          Live snapshot · revision {revisionLabel} · state {stateLabel} · {liveReady ? `${liveReady.blocking_unknowns.length} blocking` : `${blockingCount} blocking`}
        </div>
      ) : null}

      <div className="pr-dossier">
        {/* 01 JOURNEY */}
        <section className="pr-section pour" style={{ animationDelay: '120ms' }} aria-label="Journey">
          <div className="pr-section-head">
            <span className="mono pr-num">01</span>
            <span className="pr-section-label">Journey</span>
            <span className="pr-section-line" aria-hidden="true" />
          </div>

          <div className="pr-journey-grid">
            <div className="pr-feature pr-feature--wide">
              <div className="pr-caption">Destination</div>
              <div className="serif pr-feature-value pr-feature-value--hero">{destinationValue}</div>
            </div>
            {datesValue ? (
              <div className="pr-feature">
                <div className="pr-caption">Dates</div>
                <div className="serif pr-feature-value">{datesValue}</div>
                {displayProfile.trip_context.date_flexibility ? (
                  <div className="pr-feature-sub">{displayProfile.trip_context.date_flexibility}</div>
                ) : null}
              </div>
            ) : null}
            <div className="pr-feature">
              <div className="pr-caption">Budget</div>
              <div className="serif pr-feature-value">{displayProfile.trip_context.budget ? formatBudget(displayProfile.trip_context.budget) : '—'}</div>
            </div>
            <div className="pr-feature">
              <div className="pr-caption">Party</div>
              <div className="serif pr-feature-value">
                {displayProfile.trip_context.party_size} {displayProfile.trip_context.party_size === 1 ? 'traveler' : 'travelers'}
              </div>
              {displayProfile.trip_context.party_notes ? <div className="pr-feature-sub">{displayProfile.trip_context.party_notes}</div> : null}
            </div>
          </div>

          {(displayProfile.purpose_and_priorities.primary_purpose || displayProfile.purpose_and_priorities.priorities.length > 0 || displayProfile.purpose_and_priorities.success_definition) && (
            <div className="pr-purpose">
              {displayProfile.purpose_and_priorities.primary_purpose ? (
                <div className="pr-purpose-row">
                  <div className="pr-caption">Purpose</div>
                  <div className="serif pr-purpose-value">
                    {displayProfile.purpose_and_priorities.primary_purpose}
                    {displayProfile.purpose_and_priorities.secondary_purposes && displayProfile.purpose_and_priorities.secondary_purposes.length > 0
                      ? ` · ${displayProfile.purpose_and_priorities.secondary_purposes.join(' · ')}`
                      : null}
                  </div>
                </div>
              ) : null}
              {displayProfile.purpose_and_priorities.priorities.length > 0 ? (
                <div className="pr-purpose-row">
                  <div className="pr-caption">Priorities</div>
                  <div className="serif pr-purpose-value">{displayProfile.purpose_and_priorities.priorities.join(' · ')}</div>
                </div>
              ) : null}
              {displayProfile.purpose_and_priorities.success_definition ? (
                <div className="pr-success-note">“{displayProfile.purpose_and_priorities.success_definition}”</div>
              ) : null}
            </div>
          )}
        </section>

        {/* 02 PREFERENCES */}
        <section className="pr-section pour" style={{ animationDelay: '180ms' }} aria-label="Preferences">
          <div className="pr-section-head">
            <span className="mono pr-num">02</span>
            <span className="pr-section-label">Preferences</span>
            <span className="pr-section-line" aria-hidden="true" />
          </div>

          {hasPreferences ? (
            <div className="pr-pref-list">
              {displayProfile.preferences.map((pr, i) => {
                const strength = formatStrength(pr.strength)
                const showConfidence = (pr.source === 'inferred' || pr.source === 'defaulted') && pr.confidence
                return (
                  <div key={i} className="pr-pref-item">
                    <div className="pr-pref-head">
                      <span className="pr-pref-cat">{pr.category}</span>
                      <span className="mono pr-pref-meta">
                        {strength} · {pr.source}
                        {showConfidence ? ` · ${pr.confidence}` : ''}
                      </span>
                    </div>
                    {pr.notes ? <div className="pr-pref-notes">{pr.notes}</div> : null}
                  </div>
                )
              })}
            </div>
          ) : null}

          {hasTravelStyle ? (
            <div className="pr-style">
              <div className="pr-caption" style={{ marginBottom: 10 }}>
                Travel style
              </div>
              <div className="pr-style-grid">
                <span className="pr-style-pill">
                  <em className="pr-style-k">Pace</em> {displayProfile.travel_style.pace}
                </span>
                <span className="pr-style-pill">
                  <em className="pr-style-k">Walking</em> {displayProfile.travel_style.walking_tolerance}
                </span>
                <span className="pr-style-pill">
                  <em className="pr-style-k">Crowd</em> {displayProfile.travel_style.crowd_tolerance}
                </span>
                {displayProfile.travel_style.energy_pattern ? (
                  <span className="pr-style-pill">
                    <em className="pr-style-k">Energy</em> {displayProfile.travel_style.energy_pattern}
                  </span>
                ) : null}
                {displayProfile.travel_style.comfort_preference ? (
                  <span className="pr-style-pill">
                    <em className="pr-style-k">Comfort</em> {displayProfile.travel_style.comfort_preference}
                  </span>
                ) : null}
                {displayProfile.travel_style.spontaneity ? (
                  <span className="pr-style-pill">
                    <em className="pr-style-k">Spontaneity</em> {displayProfile.travel_style.spontaneity}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        {/* 03 CONSTRAINTS */}
        {hasHardConstraints ? (
          <section className="pr-section pour" style={{ animationDelay: '240ms' }} aria-label="Constraints">
            <div className="pr-section-head">
              <span className="mono pr-num">03</span>
              <span className="pr-section-label">Constraints</span>
              <span className="pr-section-line" aria-hidden="true" />
            </div>
            <div className="pr-constraint-grid">
              {hard.must_visit.length > 0 ? (
                <div className="pr-constraint">
                  <div className="pr-caption">Must visit</div>
                  <div className="pr-constraint-value">{hard.must_visit.join(', ')}</div>
                </div>
              ) : null}
              {hard.avoid.length > 0 ? (
                <div className="pr-constraint">
                  <div className="pr-caption">Avoid</div>
                  <div className="pr-constraint-value">{hard.avoid.join(', ')}</div>
                </div>
              ) : null}
              {hard.dietary_requirements.length > 0 ? (
                <div className="pr-constraint">
                  <div className="pr-caption">Dietary</div>
                  <div className="pr-constraint-value">{hard.dietary_requirements.join(', ')}</div>
                </div>
              ) : null}
              {hard.accessibility_requirements.length > 0 ? (
                <div className="pr-constraint">
                  <div className="pr-caption">Accessibility</div>
                  <div className="pr-constraint-value">{hard.accessibility_requirements.join(', ')}</div>
                </div>
              ) : null}
              {hard.accommodation_requirements.length > 0 ? (
                <div className="pr-constraint">
                  <div className="pr-caption">Lodging</div>
                  <div className="pr-constraint-value">{hard.accommodation_requirements.join(', ')}</div>
                </div>
              ) : null}
              {hard.maximum_daily_travel ? (
                <div className="pr-constraint">
                  <div className="pr-caption">Daily travel</div>
                  <div className="pr-constraint-value">{hard.maximum_daily_travel}</div>
                </div>
              ) : null}
              {typeof hard.maximum_hotel_changes === 'number' ? (
                <div className="pr-constraint">
                  <div className="pr-caption">Hotel changes</div>
                  <div className="pr-constraint-value">At most {hard.maximum_hotel_changes}</div>
                </div>
              ) : null}
              {hard.budget_ceiling ? (
                <div className="pr-constraint">
                  <div className="pr-caption">Budget ceiling</div>
                  <div className="pr-constraint-value">{hard.budget_ceiling}</div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Concierge notes — unknowns + assumptions as elegant hairline notes */}
        {(hasUnknowns || hasAssumptions) && (
          <section className="pr-notes pour" style={{ animationDelay: '300ms' }} aria-label="Concierge notes">
            <div className="pr-notes-head">
              <span className="mono pr-notes-kicker">Concierge notes</span>
              <span className="pr-notes-rule" aria-hidden="true" />
            </div>
            <p className="pr-notes-intro">A few points we&rsquo;re holding lightly — please confirm or clarify at your leisure.</p>
            <div className="pr-notes-list">
              {displayProfile.unknowns.map((u, i) => (
                <div key={`u-${i}`} className={`pr-note ${u.impact === 'blocking' ? 'pr-note--blocking' : ''}`}>
                  <div className="pr-note-text">— {u.description}</div>
                  <div className="mono pr-note-meta">
                    {u.topic} · {u.impact}
                  </div>
                </div>
              ))}
              {displayProfile.assumptions.map((a, i) => (
                <div key={`a-${i}`} className="pr-note pr-note--assumption">
                  <div className="pr-note-text">— {a.value}</div>
                  <div className="mono pr-note-meta">
                    {a.topic} · {a.reason}
                    {a.user_confirmation_needed ? ' · confirmation requested' : ''}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Actions — bronze primary only, ghost quieter */}
      <div className="pr-actions pour" style={{ animationDelay: '420ms' }}>
        <button
          className="pr-btn pr-btn--primary"
          onClick={doConfirm}
          disabled={!canConfirm}
          aria-disabled={!canConfirm}
          style={{ opacity: !canConfirm ? 0.45 : 1 }}
          title={
            !liveSnapshot
              ? 'Waiting for live snapshot'
              : !isReadyState
                ? 'Profile not ready — state must be ready'
                : !isLatestRevision
                  ? `Stale revision — latest is ${liveReady?.profile_revision}`
                  : !hasNoBlockingUnknowns
                    ? `Blocking unknowns: ${liveReady?.blocking_unknowns.join(', ')}`
                    : 'Confirm profile and start planning'
          }
        >
          Confirm &amp; continue
        </button>
        <button
          ref={requestChangesBtnRef}
          className="pr-btn pr-btn--ghost"
          onClick={() => setEditorOpen((o) => !o)}
          disabled={busy}
          aria-expanded={editorOpen}
          aria-controls="pr-editor"
          style={{ opacity: busy ? 0.45 : 1 }}
        >
          Request changes
        </button>
      </div>

      <div aria-live="polite" className="pr-notice">
        {!canConfirm && liveReady && liveReady.blocking_unknowns.length > 0
          ? `Please resolve the blocking topic(s) (${liveReady.blocking_unknowns.join(', ')}) before confirming.`
          : !canConfirm && liveSnapshot && liveSnapshot.state !== 'ready'
            ? `Profile state is ${liveSnapshot.state} — confirmation requires state ready.`
            : !canConfirm && liveSnapshot && liveReady && !isLatestRevision
              ? `A newer revision (${liveReady.profile_revision}) is available — please review the latest.`
              : notice}
      </div>

      <div className="pr-footer">
        <span className="mono pr-footer-text">Dossier · {displayProfile.profile_id} · revision {revisionLabel} · {stateLabel}</span>
        <span className="mono pr-footer-text" style={{ opacity: 0.7 }}>Live via WS · {hasLiveSnapshot ? 'snapshot+ready' : 'waiting'}</span>
      </div>

      {editorOpen && (
        <div id="pr-editor" ref={editorRef} className="pr-editor pour" role="region" aria-label="Request changes">
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
            placeholder="E.g., The budget should exclude international flights."
            rows={3}
            className="pr-textarea"
          />
          <div className="pr-editor-actions">
            <button onClick={doRequestChanges} className="pr-btn pr-btn--primary pr-btn--sm" disabled={busy}>
              Send changes →
            </button>
            <button onClick={() => setEditorOpen(false)} className="pr-btn pr-btn--ghost pr-btn--sm" disabled={busy}>
              Cancel
            </button>
          </div>
          <div className="mono pr-editor-hint">Topics and note will be sent as profile.request_changes — we&rsquo;ll return to discovery for targeted questions. No direct field edits.</div>
        </div>
      )}

      <style>{styles}</style>
    </main>
  )
}

const styles = `
        .profile-review{
          width: min(980px, 86vw);
          margin: 0 auto;
          padding: 36px 0 48px;
          background: var(--voyager-bone-0);
        }
        .pr-live-badge{ margin-bottom: 6px; }
        .pr-eyebrow{
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--voyager-ink-3);
          margin-bottom: 14px;
        }
        .pr-headline{
          font-size: 44px;
          line-height: 52px;
          font-weight: 400;
          letter-spacing: -0.02em;
          color: var(--voyager-ink-0);
          text-align: left;
          margin: 0;
        }
        .pr-lede{
          margin-top: 12px;
          font-size: 14px;
          line-height: 22px;
          color: var(--voyager-ink-2);
          max-width: 560px;
        }
        .pr-dossier{
          margin-top: 40px;
        }
        .pr-section{
          padding-top: 28px;
          border-top: 1px solid var(--voyager-bone-2);
          margin-top: 36px;
        }
        .pr-section:first-child{
          margin-top: 0;
        }
        .pr-section-head{
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 22px;
        }
        .pr-num{
          font-size: 10px;
          letter-spacing: 0.14em;
          color: var(--voyager-ink-3);
          min-width: 18px;
        }
        .pr-section-label{
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--voyager-ink-3);
          font-weight: 500;
          white-space: nowrap;
        }
        .pr-section-line{
          flex: 1;
          height: 1px;
          background: var(--voyager-bone-2);
          margin-left: 8px;
        }
        /* Journey */
        .pr-journey-grid{
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px 32px;
        }
        .pr-feature--wide{
          grid-column: 1 / -1;
        }
        .pr-caption{
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--voyager-ink-3);
          font-weight: 500;
          line-height: 16px;
          margin-bottom: 6px;
        }
        .pr-feature-value{
          font-size: 19px;
          line-height: 26px;
          color: var(--voyager-ink-0);
          font-weight: 400;
        }
        .pr-feature-value--hero{
          font-size: 22px;
          line-height: 30px;
          letter-spacing: -0.015em;
        }
        .pr-feature-sub{
          margin-top: 4px;
          font-size: 12px;
          line-height: 16px;
          color: var(--voyager-ink-3);
          font-style: italic;
        }
        .pr-purpose{
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid var(--voyager-bone-1);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .pr-purpose-row .pr-purpose-value{
          font-size: 17px;
          line-height: 24px;
          color: var(--voyager-ink-0);
          margin-top: 2px;
        }
        .pr-success-note{
          font-size: 13px;
          line-height: 20px;
          font-style: italic;
          color: var(--voyager-ink-2);
          border-left: 1px solid var(--voyager-bone-2);
          padding-left: 12px;
          margin-top: 4px;
        }
        /* Preferences */
        .pr-pref-list{
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .pr-pref-item{
          padding-bottom: 14px;
          border-bottom: 1px solid var(--voyager-bone-1);
        }
        .pr-pref-item:last-child{ border-bottom: none; padding-bottom: 0; }
        .pr-pref-head{
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .pr-pref-cat{
          font-size: 14px;
          font-weight: 500;
          color: var(--voyager-ink-1);
        }
        .pr-pref-meta{
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--voyager-ink-3);
        }
        .pr-pref-notes{
          margin-top: 4px;
          font-size: 13px;
          line-height: 19px;
          color: var(--voyager-ink-2);
          font-style: italic;
        }
        .pr-style{
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px solid var(--voyager-bone-1);
        }
        .pr-style-grid{
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .pr-style-pill{
          font-size: 12px;
          line-height: 1;
          color: var(--voyager-ink-2);
          background: var(--voyager-bone-1);
          border: 1px solid var(--voyager-bone-2);
          border-radius: 999px;
          padding: 8px 12px;
        }
        .pr-style-k{
          font-style: normal;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--voyager-ink-3);
          margin-right: 6px;
        }
        /* Constraints */
        .pr-constraint-grid{
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px 32px;
        }
        .pr-constraint-value{
          font-size: 13px;
          line-height: 19px;
          color: var(--voyager-ink-1);
          margin-top: 2px;
        }
        /* Concierge notes */
        .pr-notes{
          margin-top: 36px;
          padding-top: 28px;
          border-top: 1px solid var(--voyager-bone-2);
        }
        .pr-notes-head{
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .pr-notes-kicker{
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--voyager-ink-3);
          white-space: nowrap;
        }
        .pr-notes-rule{
          flex: 1;
          height: 1px;
          background: var(--voyager-bone-2);
        }
        .pr-notes-intro{
          font-size: 12px;
          line-height: 18px;
          color: var(--voyager-ink-3);
          font-style: italic;
          margin-bottom: 16px;
        }
        .pr-notes-list{
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .pr-note{
          border-left: 1px solid var(--voyager-bone-2);
          padding-left: 14px;
          padding-top: 2px;
          padding-bottom: 2px;
        }
        .pr-note--blocking{
          border-left-color: var(--voyager-clay);
          border-left-width: 1px;
        }
        .pr-note-text{
          font-size: 13px;
          line-height: 20px;
          font-style: italic;
          color: var(--voyager-ink-2);
        }
        .pr-note--blocking .pr-note-text{
          color: var(--voyager-ink-1);
        }
        .pr-note-meta{
          margin-top: 4px;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--voyager-ink-3);
        }
        /* Actions */
        .pr-actions{
          display: flex;
          gap: 14px;
          align-items: center;
          margin-top: 40px;
          flex-wrap: wrap;
        }
        .pr-btn{
          height: 44px;
          padding: 0 26px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 150ms, opacity 150ms, border-color 150ms, color 150ms;
          font-family: inherit;
          letter-spacing: -0.01em;
        }
        .pr-btn:disabled{ cursor: not-allowed; }
        .pr-btn--primary{
          border: none;
          background: #9A7A5A;
          color: #F7F2E9;
          border-radius: 10px;
        }
        .pr-btn--primary:hover:not(:disabled){
          background: #8A6D51;
        }
        .pr-btn--ghost{
          border: 1px solid var(--voyager-bone-2);
          background: transparent;
          color: var(--voyager-ink-2);
          font-weight: 400;
          border-radius: 10px;
        }
        .pr-btn--ghost:hover:not(:disabled){
          border-color: var(--voyager-ink-3);
          color: var(--voyager-ink-1);
          background: var(--voyager-bone-1);
        }
        .pr-btn--sm{ height: 38px; padding: 0 18px; font-size: 13px; border-radius: 10px; }
        .pr-notice{
          min-height: 16px;
          font-size: 11px;
          color: var(--voyager-clay);
          margin-top: 10px;
        }
        .pr-footer{
          margin-top: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          padding-top: 14px;
          border-top: 1px solid var(--voyager-bone-1);
        }
        .pr-footer-text{
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--voyager-ink-3);
        }
        .pr-dev-label{
          font-size: 10px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--voyager-ink-3);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .pr-dev-label input{ accent-color: var(--voyager-ink-2); }
        /* Editor */
        .pr-editor{
          margin-top: 22px;
          background: var(--voyager-bone-1);
          border: 1px solid var(--voyager-bone-2);
          border-radius: 10px;
          padding: 22px;
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
          padding: 7px 13px;
          border-radius: 999px;
          border: 1px solid var(--voyager-bone-2);
          background: var(--voyager-bone-0);
          color: var(--voyager-ink-1);
          font-size: 12px;
          cursor: pointer;
          transition: all 150ms;
        }
        .pr-chip--selected{
          background: var(--voyager-ink-1);
          color: var(--voyager-light-ink);
          border-color: var(--voyager-ink-1);
        }
        .pr-textarea-label{
          font-size: 11px;
          color: var(--voyager-ink-3);
          display: block;
          margin-bottom: 6px;
          letter-spacing: 0.04em;
        }
        .pr-optional{ color: var(--voyager-ink-3); font-style: italic; }
        .pr-textarea{
          width: 100%;
          background: var(--voyager-bone-0);
          border: 1px solid var(--voyager-bone-2);
          border-radius: 10px;
          padding: 11px 12px;
          font-size: 13px;
          line-height: 19px;
          color: var(--voyager-ink-1);
          resize: none;
          font-family: inherit;
        }
        .pr-textarea:focus{ outline: none; box-shadow: var(--voyager-focus-ring); }
        .pr-editor-actions{
          display: flex;
          gap: 10px;
          margin-top: 14px;
          flex-wrap: wrap;
        }
        .pr-editor-hint{
          font-size: 10px;
          letter-spacing: 0.04em;
          color: var(--voyager-ink-3);
          margin-top: 10px;
        }
        @media (max-width: 768px){
          .profile-review{ width: min(980px, calc(100vw - 32px)); }
          .pr-headline{ font-size: 34px; line-height: 40px; }
          .pr-journey-grid, .pr-constraint-grid{ grid-template-columns: 1fr; }
          .pr-pref-head{ flex-direction: column; gap: 4px; }
        }
        @media (max-width: 360px){
          .pr-actions{ flex-direction: column; align-items: stretch; }
          .pr-actions .pr-btn{ width: 100%; justify-content: center; }
        }
`
