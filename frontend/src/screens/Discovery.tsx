import React, { useEffect, useId, useMemo, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types — mirror docs/WEBSOCKET_CONTRACT.md + TRAVELER_PROFILE_SCHEMA.md
// ---------------------------------------------------------------------------

export type SelectionMode = "single" | "multiple";
export type FreeTextMode = "disabled" | "optional" | "only_if_no_option" | "required";

export type DiscoveryOption = {
  option_id: string;
  label: string;
  description?: string;
};

export type DiscoveryQuestion = {
  question_id: string;
  prompt: string;
  selection_mode: SelectionMode;
  required: boolean;
  free_text_mode: FreeTextMode;
  free_text_placeholder?: string;
  options: DiscoveryOption[];
};

// Minimal profile shape needed for the rail — full snapshot is accepted.
export type ProfileSnapshot = {
  revision: number;
  sequence?: number;
  profile: {
    // trip context
    trip_context?: Record<string, unknown> | null;
    // purpose
    purpose_and_priorities?: Record<string, unknown> | null;
    // preferences
    preferences?: Array<{
      category: string;
      strength: string;
      source: "stated" | "inferred" | "defaulted";
      notes?: string;
      confidence?: string;
    }> | null;
    // travel_style
    travel_style?: Record<string, unknown> | null;
    // hard_constraints
    hard_constraints?: Record<string, unknown> | null;
    // unknowns
    unknowns?: Array<{ topic: string; impact: string; description: string }> | null;
    // assumptions
    assumptions?: Array<{
      topic: string;
      value: string;
      reason: string;
      user_confirmation_needed?: boolean;
    }> | null;
    // allow extra fields
    [k: string]: unknown;
  };
};

export type DiscoveryProps = {
  question: DiscoveryQuestion | null;
  profile?: ProfileSnapshot | null;
  /** server-observed sequence for brass accent fill 0..total */
  sequence?: number;
  sequenceTotal?: number;
  busy?: boolean;
  feedback?: string | null;
  /** called with fresh command_id; server remains authoritative */
  onAnswer?: (payload: {
    question_id: string;
    selected_option_ids: string[];
    free_text: string;
    command_id: string;
  }) => void;
  /** optional nav, kept minimal */
  onBack?: () => void;
  onToggleNav?: () => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function genCommandId() {
  try {
    // @ts-ignore
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  if (typeof v === "string") return v.trim().length === 0;
  return false;
}

// ---------------------------------------------------------------------------
// Profile rail helpers — render sections in fixed order, omit empty
// ---------------------------------------------------------------------------

type RailSection = { id: string; label: string; content: React.ReactNode };

function formatTripContext(tc: Record<string, unknown> | null | undefined): React.ReactNode {
  if (!tc || isEmpty(tc)) return null;
  const rows: Array<[string, unknown]> = [];
  const pick = (k: string) => (tc as Record<string, unknown>)[k];
  const dr = pick("destination_request") ?? pick("destinationRequest");
  const rd = pick("resolved_destination") ?? pick("resolvedDestination");
  if (dr) rows.push(["Destination request", dr]);
  if (rd) rows.push(["Resolved destination", rd]);
  const sd = pick("start_date") as string | undefined;
  const ed = pick("end_date") as string | undefined;
  const dd = pick("duration_days") ?? pick("durationDays");
  const df = pick("date_flexibility") ?? pick("dateFlexibility");
  if (sd || ed) rows.push(["Dates", [sd, ed].filter(Boolean).join(" — ")]);
  if (dd != null) rows.push(["Duration", `${String(dd)} days`]);
  if (df) rows.push(["Flexibility", df]);
  const ps = pick("party_size") ?? pick("partySize");
  const pn = (pick("party_notes") ?? pick("partyNotes")) as string | undefined;
  if (ps != null) rows.push(["Party", pn ? `${String(ps)} · ${pn}` : String(ps)]);
  const budget = pick("budget");
  if (budget != null) {
    let txt: string;
    if (typeof budget === "string" || typeof budget === "number") txt = String(budget);
    else {
      const b = budget as Record<string, unknown>;
      const amt = b.amount ?? b.value ?? "";
      const cur = b.currency ? ` ${b.currency}` : "";
      const scope = b.scope ?? b.type ?? "";
      txt = `${amt}${cur}${scope ? ` · ${scope}` : ""}` || JSON.stringify(b);
    }
    rows.push(["Budget", txt]);
  }
  if (!rows.length) return <span className="rail__muted">{JSON.stringify(tc)}</span>;
  return (
    <ul className="rail__kv">
      {rows.map(([k, v]) => (
        <li key={k} className="rail__kvRow">
          <span className="rail__kvKey">{k}</span>
          <span className="rail__kvVal">{String(v)}</span>
        </li>
      ))}
    </ul>
  );
}

function formatPurpose(p: Record<string, unknown> | null | undefined): React.ReactNode {
  if (!p || isEmpty(p)) return null;
  const primary = (p as Record<string, unknown>)["primary_purpose"] ?? (p as Record<string, unknown>)["primaryPurpose"];
  const secondary = (p as Record<string, unknown>)["secondary_purposes"] ?? (p as Record<string, unknown>)["secondaryPurposes"];
  const priorities = (p as Record<string, unknown>)["priorities"] as unknown[] | undefined;
  const success = (p as Record<string, unknown>)["success_definition"] ?? (p as Record<string, unknown>)["successDefinition"];
  return (
    <div className="rail__stack">
      {primary ? <div><span className="rail__kvKey">Primary</span> <span className="rail__kvVal">{String(primary)}</span></div> : null}
      {Array.isArray(secondary) && secondary.length ? <div><span className="rail__kvKey">Also</span> <span className="rail__kvVal">{secondary.join(", ")}</span></div> : null}
      {Array.isArray(priorities) && priorities.length ? <div><span className="rail__kvKey">Priorities</span> <span className="rail__kvVal">{priorities.map(String).join(" · ")}</span></div> : null}
      {success ? <div className="rail__bodySm">{String(success)}</div> : null}
    </div>
  );
}

function formatTravelStyle(ts: Record<string, unknown> | null | undefined): React.ReactNode {
  if (!ts || isEmpty(ts)) return null;
  const entries = Object.entries(ts).filter(([, v]) => v != null && String(v).trim() !== "" && String(v) !== "unknown");
  if (!entries.length) return null;
  return (
    <ul className="rail__chips" aria-label="Travel style">
      {entries.map(([k, v]) => (
        <li key={k} className="chip chip--stated chip--sm">
          {k.replace(/_/g, " ")} · {String(v)}
        </li>
      ))}
    </ul>
  );
}

function formatConstraints(hc: Record<string, unknown> | null | undefined): React.ReactNode {
  if (!hc || isEmpty(hc)) return null;
  const rows: React.ReactNode[] = [];
  const push = (label: string, val: unknown) => {
    if (val == null) return;
    if (Array.isArray(val) && val.length === 0) return;
    if (typeof val === "string" && val.trim() === "") return;
    const txt = Array.isArray(val) ? val.join(", ") : String(val);
    rows.push(
      <li key={label} className="rail__kvRow">
        <span className="rail__kvKey">{label}</span>
        <span className="rail__kvVal">{txt}</span>
      </li>
    );
  };
  const g = hc as Record<string, unknown>;
  push("Must visit", g.must_visit ?? g.mustVisit);
  push("Avoid", g.avoid);
  push("Dietary", g.dietary_requirements ?? g.dietaryRequirements);
  push("Accessibility", g.accessibility_requirements ?? g.accessibilityRequirements);
  push("Stay", g.accommodation_requirements ?? g.accommodationRequirements);
  if (g.maximum_daily_travel ?? g.maximumDailyTravel) push("Max daily travel", g.maximum_daily_travel ?? g.maximumDailyTravel);
  if (g.maximum_hotel_changes ?? g.maximumHotelChanges) push("Max hotel changes", g.maximum_hotel_changes ?? g.maximumHotelChanges);
  if (g.budget_ceiling ?? g.budgetCeiling) push("Budget ceiling", g.budget_ceiling ?? g.budgetCeiling);
  if (!rows.length) return null;
  return <ul className="rail__kv">{rows}</ul>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Discovery({
  question,
  profile,
  sequence,
  sequenceTotal,
  busy = false,
  feedback = null,
  onAnswer,
  onBack,
  onToggleNav,
}: DiscoveryProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [showMutualNote, setShowMutualNote] = useState(false);
  const promptId = useId();
  const feedbackId = useId();
  const prevQRef = useRef<string | null>(null);

  // Reset local state when question changes
  useEffect(() => {
    if (!question) return;
    if (prevQRef.current !== question.question_id) {
      prevQRef.current = question.question_id;
      setSelected([]);
      setText("");
      setShowMutualNote(false);
    }
  }, [question?.question_id]);

  // Keep ordered selection: toggle behavior
  const toggleOption = (optionId: string) => {
    if (!question || busy) return;
    const mode = question.selection_mode;
    const fmode = question.free_text_mode;
    if (fmode === "only_if_no_option" && text.trim().length > 0) {
      // selecting clears text in this mode
      setText("");
      setShowMutualNote(true);
    }
    setSelected((prev) => {
      const has = prev.includes(optionId);
      if (mode === "single") {
        return has ? [] : [optionId];
      }
      if (has) return prev.filter((id) => id !== optionId);
      return [...prev, optionId];
    });
  };

  const handleTextChange = (v: string) => {
    if (!question) return;
    const fmode = question.free_text_mode;
    if (fmode === "disabled") return;
    if (fmode === "only_if_no_option" && v.trim().length > 0 && selected.length > 0) {
      setSelected([]);
      setShowMutualNote(true);
    }
    setText(v);
  };

  const hasSelection = selected.length > 0;
  const hasText = text.trim().length > 0;

  const isValid = useMemo(() => {
    if (!question) return false;
    if (busy) return false;
    const req = question.required;
    const fm = question.free_text_mode;
    if (fm === "only_if_no_option") {
      if (hasSelection && hasText) return false;
      if (req) return hasSelection || hasText;
      return true; // not required: empty allowed
    }
    if (fm === "disabled") {
      return req ? hasSelection : true;
    }
    if (fm === "optional") {
      return req ? hasSelection || hasText : true;
    }
    // required
    if (fm === "required") {
      // require text when no selection, or always require text if required
      if (req) return hasText;
      return hasSelection || hasText;
    }
    return true;
  }, [question, busy, hasSelection, hasText]);

  const canSubmit = isValid && !!question && !busy;

  const handleSubmit = () => {
    if (!question || !canSubmit || !onAnswer) return;
    const fm = question.free_text_mode;
    // enforce mutual exclusion at submit time for only_if_no_option
    let ids = [...selected];
    let ft = text;
    if (fm === "only_if_no_option" && hasSelection && hasText) {
      // keep selection, drop text
      ft = "";
    }
    if (fm === "disabled") ft = "";
    onAnswer({
      question_id: question.question_id,
      selected_option_ids: ids,
      free_text: ft,
      command_id: genCommandId(),
    });
  };

  // Rail sections in fixed order
  const railSections: RailSection[] = useMemo(() => {
    if (!profile?.profile) return [];
    const p = profile.profile as Record<string, unknown>;
    const tripContext = p.trip_context as Record<string, unknown> | undefined;
    const purpose = p.purpose_and_priorities as Record<string, unknown> | undefined;
    const prefs = p.preferences as ProfileSnapshot["profile"]["preferences"];
    const style = p.travel_style as Record<string, unknown> | undefined;
    const constraints = p.hard_constraints as Record<string, unknown> | undefined;
    const unknowns = p.unknowns as ProfileSnapshot["profile"]["unknowns"];
    const assumptions = p.assumptions as ProfileSnapshot["profile"]["assumptions"];

    const secs: RailSection[] = [];

    const tcNode = tripContext ? formatTripContext(tripContext) : null;
    if (tcNode) secs.push({ id: "trip", label: "Trip context", content: tcNode });

    const purNode = purpose ? formatPurpose(purpose) : null;
    if (purNode) secs.push({ id: "purpose", label: "Purpose & priorities", content: purNode });

    if (prefs && prefs.length) {
      secs.push({
        id: "prefs",
        label: "Preferences",
        content: (
          <ul className="rail__chips" aria-label="Preferences">
            {prefs.map((pr, i) => {
              const isStated = pr.source === "stated";
              return (
                <li
                  key={`${pr.category}-${i}`}
                  className={isStated ? "chip chip--stated chip--sm" : "chip chip--inferred chip--sm"}
                  title={
                    isStated
                      ? "Stated"
                      : pr.confidence
                        ? `Inferred · ${pr.confidence} confidence${pr.notes ? ` · ${pr.notes}` : ""}`
                        : `Inferred from your answers${pr.notes ? ` · ${pr.notes}` : ""}`
                  }
                >
                  {pr.category} · {pr.strength}
                  {pr.notes ? ` · ${pr.notes}` : ""}
                  {!isStated && pr.confidence ? ` · ${pr.confidence}` : ""}
                </li>
              );
            })}
          </ul>
        ),
      });
    }

    const tsNode = style ? formatTravelStyle(style) : null;
    if (tsNode) secs.push({ id: "style", label: "Travel style", content: tsNode });

    const hcNode = constraints ? formatConstraints(constraints) : null;
    if (hcNode) secs.push({ id: "constraints", label: "Hard constraints", content: hcNode });

    if (unknowns && unknowns.length) {
      secs.push({
        id: "unknowns",
        label: "Unknowns",
        content: (
          <ul className="rail__unknowns">
            {unknowns.map((u, i) => (
              <li key={`${u.topic}-${i}`} className="rail__unknown">
                <div className="rail__unknownTopic">{u.topic}</div>
                <div className="rail__unknownDesc">{u.description}</div>
                <span className={`rail__impact rail__impact--${u.impact}`}>{u.impact}</span>
              </li>
            ))}
          </ul>
        ),
      });
    }

    if (assumptions && assumptions.length) {
      secs.push({
        id: "assumptions",
        label: "Assumptions",
        content: (
          <ul className="rail__assumptions">
            {assumptions.map((a, i) => (
              <li key={`${a.topic}-${i}`} className="rail__assumption">
                <span className="chip chip--inferred chip--sm">{a.topic} · {a.value}</span>
                <span className="rail__caption">{a.reason}{a.user_confirmation_needed ? " · confirmation needed" : ""}</span>
              </li>
            ))}
          </ul>
        ),
      });
    }

    return secs;
  }, [profile]);

  const showNote = useMemo(() => {
    if (!question) return false;
    if (question.free_text_mode === "disabled") return false;
    if (question.free_text_mode === "only_if_no_option" && hasSelection) return false;
    return true;
  }, [question, hasSelection]);

  const notePlaceholder = question?.free_text_placeholder ?? "Add a nuance if the options don't quite fit";

  const progressPct = useMemo(() => {
    if (sequence == null || sequenceTotal == null || sequenceTotal <= 0) return 0;
    return Math.max(0, Math.min(1, sequence / sequenceTotal));
  }, [sequence, sequenceTotal]);

  const questionKey = question?.question_id ?? "empty";

  return (
    <>
      <style>{css}</style>
      <div className="discovery__canvas">
        {/* Minimal top nav — kept basic */}
        {(onBack || onToggleNav) && (
          <nav className="discovery__nav" aria-label="Discovery navigation">
            {onBack ? (
              <button type="button" className="discovery__navBtn" onClick={onBack} aria-label="Go back">
                ← Back
              </button>
            ) : <span />}
            {onToggleNav ? (
              <button type="button" className="discovery__navBtn" onClick={onToggleNav} aria-label="Toggle navigation">
                Menu
              </button>
            ) : null}
          </nav>
        )}

        <main className="discovery" aria-label="Discovery interview">
          {/* Interview column */}
          <div className="discovery__interview">
            {/* vertical brass accent */}
            <div className="discovery__accent" aria-hidden="true">
              <div className="discovery__accentTrack" />
              <div className="discovery__accentFill" style={{ height: `${progressPct * 100}%` }} />
            </div>

            {!question ? (
              <div className="discovery__empty">
                <p className="discovery__prompt discovery__prompt--empty">Waiting for the next question…</p>
              </div>
            ) : (
              <div
                key={questionKey}
                className={`discovery__block ${busy ? "discovery__block--busy" : ""}`}
                style={{ opacity: busy ? 0.4 : 1 }}
              >
                {/* Prompt — serif heading, stagger 0 */}
                <h2 id={promptId} className="discovery__prompt discovery__pour discovery__pour--1">
                  {question.prompt}
                </h2>

                {/* Choice group — stagger 1 */}
                <div
                  className="discovery__choices discovery__pour discovery__pour--2"
                  role="group"
                  aria-labelledby={promptId}
                  aria-busy={busy ? "true" : undefined}
                >
                  {question.options.length === 0 ? (
                    <p className="discovery__noOptions">No preset options — use the note below.</p>
                  ) : (
                    question.options.map((opt) => {
                      const pressed = selected.includes(opt.option_id);
                      return (
                        <button
                          key={opt.option_id}
                          type="button"
                          className={`chip discovery__chip ${pressed ? "chip--selected" : "chip--rest"}`}
                          aria-pressed={pressed ? "true" : "false"}
                          aria-label={opt.description ? `${opt.label}: ${opt.description}` : opt.label}
                          onClick={() => toggleOption(opt.option_id)}
                          disabled={busy}
                        >
                          <span className="chip__label">{opt.label}</span>
                          {opt.description ? <span className="chip__desc">{opt.description}</span> : null}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Mutual exclusion note */}
                {question.free_text_mode === "only_if_no_option" && showMutualNote && !busy ? (
                  <p className="discovery__mutualNote discovery__pour discovery__pour--3" role="note">
                    Selecting an option will clear your note · Notes and options can&apos;t be sent together.
                  </p>
                ) : null}

                {/* Note area — stagger 2 */}
                {showNote ? (
                  <div className="discovery__noteWrap discovery__pour discovery__pour--3">
                    <label htmlFor={`note-${question.question_id}`} className="srOnly">
                      Additional note
                    </label>
                    <textarea
                      id={`note-${question.question_id}`}
                      className="discovery__textarea"
                      placeholder={notePlaceholder}
                      value={text}
                      onChange={(e) => handleTextChange(e.target.value)}
                      rows={3}
                      disabled={busy}
                      aria-describedby={question.free_text_mode === "only_if_no_option" ? `${promptId}-mutual` : undefined}
                    />
                    {question.free_text_mode === "required" && question.required && !hasText && !hasSelection ? (
                      <span className="discovery__caption">A note is required when no option is selected.</span>
                    ) : null}
                  </div>
                ) : null}

                {/* Continue — ghost, left aligned, stagger 3 */}
                <div className="discovery__action discovery__pour discovery__pour--4">
                  <button
                    type="button"
                    className="discovery__continue"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    aria-disabled={!canSubmit ? "true" : undefined}
                  >
                    Continue →
                  </button>
                </div>

                {/* Live feedback — polite */}
                <div
                  id={feedbackId}
                  className="discovery__feedback"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {feedback ? <span>{feedback}</span> : null}
                </div>
              </div>
            )}
          </div>

          {/* Rail — sticky */}
          <aside className="discovery__rail" aria-label="Traveler Profile">
            <div className="rail__inner">
              <div className="rail__caption">Traveler Profile</div>
              {railSections.length === 0 ? (
                <p className="rail__muted">Your profile will form here as you answer.</p>
              ) : (
                railSections.map((sec) => (
                  <section key={sec.id} className="rail__section" aria-labelledby={`rail-${sec.id}`}>
                    <h3 id={`rail-${sec.id}`} className="rail__sectionLabel">
                      {sec.label}
                    </h3>
                    <div className="rail__sectionBody">{sec.content}</div>
                  </section>
                ))
              )}
            </div>
          </aside>
        </main>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// CSS — token-correct, no external deps
// ---------------------------------------------------------------------------

const css = `
:root {
  --voyager-bone-0: #F7F2E9;
  --voyager-bone-1: #EEE6D8;
  --voyager-bone-2: #E1D6C5;
  --voyager-bone-3: #C9BBA5;
  --voyager-ink-0: #1B252C;
  --voyager-ink-1: #263239;
  --voyager-ink-2: #56636A;
  --voyager-ink-3: #7D878A;
  --voyager-light-ink: #F2EBDD;
  --voyager-brass-1: #B38A55;
  --voyager-brass-2: #D8C19A;
  --voyager-brass-3: #86633B;
  --voyager-radius-md: 12px;
  --voyager-radius-pill: 999px;
  --voyager-shadow-card: 0 1px 2px rgba(38,41,37,.08), 0 12px 28px rgba(38,41,37,.08);
  --voyager-focus-ring: 0 0 0 3px rgba(216,193,154,.72);
}

.discovery__canvas {
  background: var(--voyager-bone-0);
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 32px 64px;
}

.discovery__nav {
  width: min(1240px, 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.discovery__navBtn {
  font: 500 13px/18px General Sans, Inter, ui-sans-serif, sans-serif;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--voyager-ink-2);
  background: transparent;
  border: 1px solid transparent;
  padding: 8px 12px;
  border-radius: var(--voyager-radius-md);
  cursor: pointer;
}
.discovery__navBtn:hover { color: var(--voyager-ink-1); border-color: var(--voyager-bone-2); }
.discovery__navBtn:focus-visible { outline: none; box-shadow: var(--voyager-focus-ring); }

.discovery {
  width: min(1240px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(280px, 5fr);
  gap: 64px;
  align-items: start;
  position: relative;
}

/* Interview column */
.discovery__interview {
  position: relative;
  padding-left: 20px;
  min-width: 0;
}

.discovery__accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  pointer-events: none;
}
.discovery__accentTrack {
  position: absolute;
  inset: 0;
  background: var(--voyager-bone-2);
  border-radius: 999px;
}
.discovery__accentFill {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background: var(--voyager-brass-1);
  border-radius: 999px;
  transition: height 420ms ease;
  max-height: 100%;
}

.discovery__block {
  padding-bottom: 96px;
  transition: opacity 150ms ease;
}
.discovery__block--busy { pointer-events: none; }

/* Prompt — serif, generous rhythm */
.discovery__prompt {
  font-family: Fraunces, Georgia, serif;
  font-size: 28px;
  line-height: 36px;
  font-weight: 500;
  color: var(--voyager-ink-1);
  margin: 0 0 24px 0;
  max-width: 42ch;
}
.discovery__prompt--empty { color: var(--voyager-ink-3); }

/* Choices — wrapping cloud */
.discovery__choices {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}
.discovery__noOptions {
  font: 400 16px/25px General Sans, Inter, ui-sans-serif, sans-serif;
  color: var(--voyager-ink-3);
  margin: 0;
}

/* Chip tokens — bone-1 rest, brass-2 hover, ink-1 selected, 44px min */
.chip {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 2px;
  min-height: 44px;
  padding: 10px 18px;
  border-radius: var(--voyager-radius-pill);
  border: 1px solid var(--voyager-bone-2);
  font: 400 16px/20px General Sans, Inter, ui-sans-serif, sans-serif;
  color: var(--voyager-ink-1);
  background: var(--voyager-bone-1);
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease, border-color 150ms ease, transform 150ms ease;
  text-align: left;
  max-width: 100%;
}
.chip:hover:not(:disabled) {
  background: var(--voyager-brass-2);
  border-color: var(--voyager-brass-2);
}
.chip:focus-visible { outline: none; box-shadow: var(--voyager-focus-ring); }
.chip:disabled { cursor: not-allowed; }
.chip--selected {
  background: var(--voyager-ink-1) !important;
  color: var(--voyager-bone-0) !important;
  border-color: var(--voyager-ink-1) !important;
}
.chip--selected .chip__desc { color: rgba(247,242,233,.78); }
.chip--inferred {
  background: transparent !important;
  border: 1px dashed var(--voyager-brass-1) !important;
  color: var(--voyager-ink-2);
}
.chip--stated { /* filled warm */ }
.chip--sm { min-height: 32px; padding: 6px 12px; font-size: 13px; line-height: 16px; }
.chip__label { font-weight: 500; }
.chip__desc { font-size: 13px; line-height: 16px; color: var(--voyager-ink-3); }

.discovery__mutualNote {
  font: 500 12px/17px General Sans, Inter, ui-sans-serif, sans-serif;
  color: var(--voyager-ink-3);
  margin: 0 0 12px 0;
}

.discovery__noteWrap { margin-bottom: 24px; }
.discovery__textarea {
  width: 100%;
  min-height: 96px;
  padding: 16px;
  border-radius: var(--voyager-radius-md);
  border: 1px solid var(--voyager-bone-2);
  background: var(--voyager-bone-1);
  color: var(--voyager-ink-1);
  font: 400 16px/25px General Sans, Inter, ui-sans-serif, sans-serif;
  resize: vertical;
  box-shadow: none;
}
.discovery__textarea::placeholder { color: var(--voyager-ink-3); }
.discovery__textarea:focus { outline: none; box-shadow: var(--voyager-focus-ring); border-color: var(--voyager-brass-2); }
.discovery__textarea:disabled { opacity: .6; }
.discovery__caption {
  display: block;
  margin-top: 8px;
  font: 500 12px/17px General Sans, Inter, ui-sans-serif, sans-serif;
  color: var(--voyager-ink-3);
}

.discovery__action { margin-top: 8px; }
.discovery__continue {
  min-height: 44px;
  padding: 0 24px;
  border-radius: var(--voyager-radius-md);
  border: 1px solid var(--voyager-ink-2);
  background: transparent;
  color: var(--voyager-ink-1);
  font: 500 15px/22px General Sans, Inter, ui-sans-serif, sans-serif;
  cursor: pointer;
  transition: opacity 150ms ease, background 150ms ease, border-color 150ms ease;
}
.discovery__continue:hover:not(:disabled) { background: var(--voyager-bone-1); }
.discovery__continue:focus-visible { outline: none; box-shadow: var(--voyager-focus-ring); }
.discovery__continue:disabled {
  opacity: .4;
  pointer-events: none;
}

.discovery__feedback {
  min-height: 20px;
  margin-top: 16px;
  font: 400 14px/20px General Sans, Inter, ui-sans-serif, sans-serif;
  color: var(--voyager-ink-2);
}

.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}

/* Rail — sticky 104px */
.discovery__rail {
  position: sticky;
  top: 104px;
  max-height: calc(100svh - 128px);
  overflow: auto;
  scrollbar-width: thin;
  align-self: start;
}
.rail__inner {
  padding: 24px;
  background: var(--voyager-bone-1);
  border: 1px solid var(--voyager-bone-2);
  border-radius: var(--voyager-radius-md);
  box-shadow: var(--voyager-shadow-card);
}
.rail__caption {
  font: 500 13px/18px General Sans, Inter, ui-sans-serif, sans-serif;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--voyager-ink-3);
  margin-bottom: 16px;
}
.rail__section { margin-bottom: 24px; }
.rail__section:last-child { margin-bottom: 0; }
.rail__sectionLabel {
  font: 500 13px/18px General Sans, Inter, ui-sans-serif, sans-serif;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--voyager-ink-2);
  margin: 0 0 10px 0;
}
.rail__sectionBody { }
.rail__muted { font: 400 14px/20px General Sans, Inter, ui-sans-serif, sans-serif; color: var(--voyager-ink-3); margin: 0; }

.rail__kv { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.rail__kvRow { display: grid; grid-template-columns: 1fr; gap: 2px; }
.rail__kvKey { font: 500 12px/17px General Sans, Inter, ui-sans-serif, sans-serif; letter-spacing: .06em; text-transform: uppercase; color: var(--voyager-ink-3); }
.rail__kvVal { font: 400 14px/20px General Sans, Inter, ui-sans-serif, sans-serif; color: var(--voyager-ink-1); word-break: break-word; }
.rail__stack { display: grid; gap: 8px; }
.rail__bodySm { font: 400 14px/20px General Sans, Inter, ui-sans-serif, sans-serif; color: var(--voyager-ink-1); }

.rail__chips { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 8px; }

.rail__unknowns { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
.rail__unknown {
  border-left: 4px solid var(--voyager-brass-1);
  padding-left: 16px;
  padding-bottom: 4px;
}
.rail__unknownTopic { font: 500 13px/18px General Sans, Inter, ui-sans-serif, sans-serif; color: var(--voyager-ink-1); }
.rail__unknownDesc { font: 400 14px/20px General Sans, Inter, Georgia, serif; font-style: italic; color: var(--voyager-ink-2); margin-top: 4px; }
.rail__impact { font: 500 11px/16px General Sans, Inter, ui-sans-serif, sans-serif; letter-spacing: .06em; text-transform: uppercase; color: var(--voyager-ink-3); margin-top: 4px; display: inline-block; }
.rail__impact--blocking { color: var(--voyager-ink-1); }

.rail__assumptions { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
.rail__assumption { display: grid; gap: 6px; }

/* Motion — gentle gather */
@keyframes discoverySettle {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.discovery__pour { animation: discoverySettle 500ms ease both; }
.discovery__pour--1 { animation-delay: 0ms; }
.discovery__pour--2 { animation-delay: 80ms; }
.discovery__pour--3 { animation-delay: 160ms; }
.discovery__pour--4 { animation-delay: 240ms; }

@media (prefers-reduced-motion: reduce) {
  .discovery__pour { animation: none; }
  .discovery__accentFill { transition: none; }
}

/* Below 1200 — reduce rail */
@media (max-width: 1200px) {
  .discovery { grid-template-columns: minmax(0, 7fr) 280px; gap: 48px; }
}

/* Below 1024 — stack, rail after interview, not sticky */
@media (max-width: 1024px) {
  .discovery { grid-template-columns: 1fr; gap: 32px; }
  .discovery__rail { position: static; max-height: none; overflow: visible; }
  .discovery__interview { padding-left: 16px; }
  .discovery__canvas { padding: 32px 16px 48px; }
}

/* 320 — one-column chips stack, 44px targets preserved */
@media (max-width: 480px) {
  .discovery__choices { flex-direction: column; }
  .chip { width: 100%; }
}
`;
