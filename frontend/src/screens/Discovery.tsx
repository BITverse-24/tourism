import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import type {
  DiscoveryQuestion,
  DiscoveryOption,
  SelectionMode,
  FreeTextMode,
} from "../ws/discovery";
import { validateAnswer, generateCommandId } from "../ws/discovery";
import { getWsClient } from "../ws";
import { useDiscovery } from "../hooks/useDiscovery";

// Re-export for backwards compat — consumers importing from this screen keep working
export type { DiscoveryQuestion, DiscoveryOption, SelectionMode, FreeTextMode };

// ---------------------------------------------------------------------------
// Types — server-provided discovery.question payload (docs/WEBSOCKET_CONTRACT.md)
// No mockQuestions — question comes from useWs() / discovery.question event
// ---------------------------------------------------------------------------

// Minimal profile shape needed for the rail — full snapshot is accepted.
export type ProfileSnapshot = {
  revision: number;
  sequence?: number;
  profile: {
    trip_context?: Record<string, unknown> | null;
    purpose_and_priorities?: Record<string, unknown> | null;
    preferences?: Array<{
      category: string;
      strength: string;
      source: "stated" | "inferred" | "defaulted";
      notes?: string;
      confidence?: string;
    }> | null;
    travel_style?: Record<string, unknown> | null;
    hard_constraints?: Record<string, unknown> | null;
    unknowns?: Array<{ topic: string; impact: string; description: string }> | null;
    assumptions?: Array<{
      topic: string;
      value: string;
      reason: string;
      user_confirmation_needed?: boolean;
    }> | null;
    [k: string]: unknown;
  };
};

export type DiscoveryProps = {
  question?: DiscoveryQuestion | null;
  profile?: ProfileSnapshot | null;
  sequence?: number | null;
  sequenceTotal?: number | null;
  busy?: boolean;
  feedback?: string | null;
  onAnswer?: (payload: {
    question_id: string;
    selected_option_ids: string[];
    free_text: string;
    command_id: string;
  }) => void;
  onBack?: () => void;
  onToggleNav?: () => void;
};

// ---------------------------------------------------------------------------
// Helpers — ws-backed, server is truth
// ---------------------------------------------------------------------------

function genCommandId() {
  // Delegate to ws/discovery helper for consistent id format; fallback inline
  try {
    return generateCommandId();
  } catch {
    try {
      // @ts-ignore
      if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    } catch {}
    return `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
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
  question: questionProp,
  profile: profileProp,
  sequence: sequenceProp,
  sequenceTotal: sequenceTotalProp,
  busy: busyProp = false,
  feedback: feedbackProp = null,
  onAnswer,
  onBack,
  onToggleNav,
}: DiscoveryProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [showMutualNote, setShowMutualNote] = useState(false);
  const [localRecoveryFeedback, setLocalRecoveryFeedback] = useState<string | null>(null);
  const promptId = useId();
  const feedbackId = useId();
  const prevQRef = useRef<string | null>(null);

  // Live wiring — when parent does NOT supply a question, consume WS discovery stream directly.
  // This makes Discovery self-sufficient in the live app (App.tsx renders <Discovery /> with no props).
  // When questionProp is provided (storybook/tests), that value is authoritative and the hook is still
  // subscribed but its question is ignored.
  const live = useDiscovery();
  const isLiveMode = questionProp == null && onAnswer == null;

  // Effective values: live WS data wins when in live mode; otherwise props win.
  const question = isLiveMode ? live.question : questionProp;
  const profile = isLiveMode ? (live.profile as unknown as ProfileSnapshot | null) ?? profileProp ?? null : (profileProp ?? null);
  const liveSequence = live.sequence;
  const sequence = isLiveMode ? (liveSequence ?? sequenceProp ?? null) : (sequenceProp ?? null);
  const sequenceTotal = sequenceTotalProp ?? live.sequenceTotal ?? null;
  const busy = isLiveMode ? live.busy : busyProp;
  // Feedback priority: live hook feedback > local recovery > prop feedback
  const liveFeedback = live.feedback;
  const feedback = (isLiveMode ? (liveFeedback ?? localRecoveryFeedback) : (localRecoveryFeedback ?? feedbackProp)) ?? null;

  // Reset selection/text when server pushes a new discovery.question (forward-only)
  useEffect(() => {
    if (!question) return;
    if (prevQRef.current !== question.question_id) {
      prevQRef.current = question.question_id;
      setSelected([]);
      setText("");
      setShowMutualNote(false);
      // clear stale recovery note once fresh question arrives
      setLocalRecoveryFeedback(null);
    }
  }, [question?.question_id]);

  // Handle question_not_current recovery — server rejected stale answer, wait for new question.
  // When in live mode the hook already handles this and exposes live.feedback; keep a
  // fallback subscription for prop-driven (test/storybook) usage.
  useEffect(() => {
    if (isLiveMode) return;
    let unsub: (() => void) | null = null;
    try {
      const client = getWsClient();
      unsub = client.subscribe((env) => {
        if (env.kind === "ack" && env.type === "command.rejected") {
          const p = env.payload as Record<string, unknown>;
          if (p.code === "question_not_current") {
            setLocalRecoveryFeedback("That question is no longer current — showing the latest one.");
          }
        }
      });
    } catch {
      // WsClient not available in test env — ignore
    }
    return () => {
      if (unsub) unsub();
    };
  }, [isLiveMode]);

  const toggleOption = (optionId: string) => {
    if (!question || busy) return;
    const mode = question.selection_mode;
    const fmode = question.free_text_mode;
    if (fmode === "only_if_no_option" && text.trim().length > 0) {
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

  // Client-side pre-validation using server contract helpers — server remains truth.
  // Mirrors docs/WEBSOCKET_CONTRACT.md § discovery.question schema & discovery.answer rules.
  const validation = useMemo(() => {
    if (!question) return { valid: false as const, message: "No question" } as const;
    return validateAnswer(question, selected, text);
  }, [question, selected, text]);

  const isValid = useMemo(() => {
    if (!question) return false;
    if (busy) return false;
    // Use validateAnswer result for UX gating; server is final validator
    return (validation as { valid: boolean }).valid === true;
  }, [question, busy, validation]);

  const canSubmit = isValid && !!question && !busy;

  const handleSubmit = () => {
    if (!question || !canSubmit) return;
    // Pre-validate again at submit time (UX only) — server remains truth
    const v = validateAnswer(question, selected, text);
    if (!v.valid) return;

    const fm = question.free_text_mode;
    let ft = text;
    if (fm === "disabled") ft = "";
    else if (fm === "only_if_no_option" && hasSelection && hasText) {
      ft = "";
    }

    const commandId = genCommandId();

    // If parent supplied onAnswer (storybook/tests or App wiring), delegate to it.
    if (onAnswer) {
      onAnswer({
        question_id: question.question_id,
        selected_option_ids: [...selected],
        free_text: ft,
        command_id: commandId,
      });
      return;
    }

    // Live path: single unified WsClient via useDiscovery (handles validateAnswer, busy, feedback,
    // question_not_current recovery, and sequence tracking). Falls back to direct client call
    // if hook is not yet fully initialized (e.g., early render before subscription).
    if (isLiveMode) {
      const res = live.sendAnswer({
        selected_option_ids: [...selected],
        free_text: ft,
        command_id: commandId,
      });
      // sendAnswer already manages busy/feedback; surface local recovery note if it failed locally
      if (!res.ok && res.error && !live.feedback) {
        setLocalRecoveryFeedback(res.error);
      }
      // Also send via WsClient directly if hook's send was no-op (defensive: keep single unified client)
      // No second send — live.sendAnswer already called client.sendDiscoveryAnswer with same commandId.
      return;
    }

    // Fallback direct WsClient send (covers prop-less but non-live edge, e.g., tests without hook)
    try {
      const client = getWsClient();
      client.sendDiscoveryAnswer(
        {
          question_id: question.question_id,
          selected_option_ids: [...selected],
          free_text: ft,
        },
        commandId,
      );
    } catch {
      // If WsClient unavailable (e.g., storybook), silently ignore — parent should provide onAnswer
    }
  };

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
  const paddedSeq = sequence != null ? String(sequence).padStart(2, "0") : "--";
  const paddedTotal = sequenceTotal != null ? String(sequenceTotal).padStart(2, "0") : "--";

  // Busy overlay — same aesthetic as after answering, also for initial wait for first question
  // After Arrival, Discovery mounts with !question — show same sphere as between questions until first discovery.question arrives.
  const isInitialWaiting = !question && isLiveMode
  const showBusy = busy || isInitialWaiting
  const [busyOverlayMounted, setBusyOverlayMounted] = useState(false)
  const [busyExiting, setBusyExiting] = useState(false)
  useEffect(() => {
    if (showBusy) {
      setBusyOverlayMounted(true)
      setBusyExiting(false)
    } else if (busyOverlayMounted) {
      setBusyExiting(true)
      const t = window.setTimeout(() => {
        setBusyOverlayMounted(false)
        setBusyExiting(false)
      }, 420)
      return () => window.clearTimeout(t)
    }
  }, [showBusy, busyOverlayMounted])

  return (
    <>
      <style>{css}</style>
      <div className="discovery__canvas">
        <div className="discovery__watermark" aria-hidden="true">
          <span className="discovery__watermarkText">THE ART OF TRAVEL</span>
          <span className="discovery__watermarkNum">02</span>
        </div>
        {busyOverlayMounted && (
          <div
            className={`discovery__busyOverlay ${busyExiting ? 'is-exiting' : 'is-entering'}`}
            aria-hidden="true"
            data-testid="discovery-busy"
          >
            <div className="discovery__busySphere">
              <div className="discovery-busy-ripple" aria-hidden="true">
                <div className="discovery-busy-glow" />
                <div className="discovery-busy-core" />
              </div>
              <p className="discovery__busyText">{isInitialWaiting ? "Shaping your first question…" : "Weaving your answers…"}</p>
              <p className="discovery__busySub">{isInitialWaiting ? "Listening to your intent — this takes a moment" : "Shaping the next question — this can take 10–15s"}</p>
            </div>
          </div>
        )}
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
            <div className="discovery__accent" aria-hidden="true">
              <div className="discovery__accentTrack" />
              <div className="discovery__accentFill" style={{ height: `${progressPct * 100}%` }} />
            </div>

            {!question ? (
              isInitialWaiting ? (
                // Initial wait — show nothing behind the sphere (same as between-questions busy, but no previous question to dim)
                <div className="discovery__empty" aria-hidden="true" />
              ) : (
                <div className="discovery__empty">
                  <div className="discovery__eyebrow discovery__pour discovery__pour--1">
                    <span className="discovery__eyebrowNum">01</span>
                    <span className="discovery__eyebrowSep">/</span>
                    <span>DISCOVERY</span>
                    <span className="discovery__eyebrowMeta">· {paddedSeq} / {paddedTotal}</span>
                  </div>
                  <p className="discovery__prompt discovery__prompt--empty">Waiting for the next question…</p>
                </div>
              )
            ) : (
              <div
                key={questionKey}
                className={`discovery__block ${busy ? "discovery__block--busy" : ""}`}
                style={{ opacity: busy ? 0.42 : 1 }}
              >
                {/* 01 / DISCOVERY micro-label */}
                <div className="discovery__eyebrow discovery__pour discovery__pour--1" aria-hidden="true">
                  <span className="discovery__eyebrowNum">{paddedSeq}</span>
                  <span className="discovery__eyebrowSep">/</span>
                  <span>DISCOVERY</span>
                  <span className="discovery__eyebrowMeta">· {paddedTotal} QUESTIONS</span>
                </div>

                <h2 id={promptId} className="discovery__prompt discovery__pour discovery__pour--1">
                  {question.prompt}
                </h2>

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

                {question.free_text_mode === "only_if_no_option" && showMutualNote && !busy ? (
                  <p className="discovery__mutualNote discovery__pour discovery__pour--3" role="note">
                    Selecting an option will clear your note · Notes and options can&apos;t be sent together.
                  </p>
                ) : null}

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

                <div className="discovery__action discovery__pour discovery__pour--4">
                  <button
                    type="button"
                    className="discovery__continue"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    aria-disabled={!canSubmit ? "true" : undefined}
                  >
                    Continue
                    <span className="discovery__continueArrow" aria-hidden="true">→</span>
                  </button>
                  <span className="discovery__continueHint">Press Enter to continue</span>
                  <button
                    type="button"
                    className="discovery__cancelGhost"
                    onClick={() => { try { getWsClient().sendRunCancel('Traveler cancelled discovery') } catch {} }}
                    aria-label="Cancel and return to start"
                    disabled={busy}
                    style={{ marginLeft: 12, fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--voyager-ink-3)', background: 'transparent', border: '1px solid transparent', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.4 : 0.72, padding: '6px 10px', borderRadius: 8 }}
                  >
                    Cancel
                  </button>
                </div>

                <div
                  id={feedbackId}
                  className="discovery__feedback"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {(localRecoveryFeedback ?? feedback) ? <span>{localRecoveryFeedback ?? feedback}</span> : null}
                </div>
              </div>
            )}
          </div>

          {/* Rail — private concierge dossier */}
          <aside className="discovery__rail" aria-label="Traveler Profile">
            <div className="rail__inner">
              <div className="rail__dossierHead">
                <div className="rail__eyebrow">
                  <span className="rail__eyebrowNum">02</span>
                  <span className="rail__eyebrowSep">/</span>
                  <span>DOSSIER</span>
                </div>
                <div className="rail__title">Traveler Profile</div>
                <div className="rail__subtitle">Private · concierge copy</div>
              </div>
              {railSections.length === 0 ? (
                <p className="rail__muted">Your profile will form here as you answer. Each reply refines the dossier.</p>
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
              <div className="rail__foot">
                <span>Rev. {profile?.revision ?? "—"}</span>
                <span className="rail__footDot" aria-hidden="true">·</span>
                <span>Confidential</span>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// CSS — darker warm taupe + stone + charcoal + ivory
// ---------------------------------------------------------------------------

const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap');

/* -- tokens extended for darker warm luxury */
:root {
  --voyager-ivory: #F7F2E9;
  --voyager-ivory-2: #FFFBF2;
  --voyager-stone: #C9BBA5;
  --voyager-stone-2: #B8A99A;
  --voyager-taupe-light: #E8DDCB;
  --voyager-taupe: #D9CCB6;
  --voyager-taupe-dark: #CABEA9;
  --voyager-bone-0: #F7F2E9;
  --voyager-bone-1: #E8DDCB;
  --voyager-bone-2: #D9CCB6;
  --voyager-bone-3: #C9BBA5;
  --voyager-ink-0: #1B252C;
  --voyager-ink-1: #242F36;
  --voyager-ink-2: #5A676E;
  --voyager-ink-3: #8A9699;
  --voyager-charcoal: #1B252C;
  --voyager-bronze: #8C6A3A;
  --voyager-bronze-hover: #745830;
  --voyager-brass-1: #B38A55;
  --voyager-brass-2: #D8C19A;
  --voyager-brass-3: #86633B;
  --voyager-radius-card: 10px;
  --voyager-radius-pill: 12px;
  --voyager-radius-input: 14px;
  --voyager-shadow-card: 0 1px 3px rgba(27,37,44,.06), 0 16px 32px rgba(27,37,44,.07);
  --voyager-shadow-card-soft: 0 1px 2px rgba(27,37,44,.05), 0 20px 48px rgba(27,37,44,.08);
  --voyager-focus-ring: 0 0 0 3px rgba(179,138,85,.28);
}

/* Canvas — larger editorial composition, moved upward, occupies 55–60% visual field */
.discovery__canvas {
  background: var(--voyager-ivory);
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0 64px;
  position: relative;
  overflow: clip;
  isolation: isolate;
}

/* Watermark — extremely subtle, fills empty space without busyness */
.discovery__watermark {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.discovery__watermarkText {
  position: absolute;
  left: 50%;
  top: 44%;
  transform: translate(-50%, -50%);
  white-space: nowrap;
  font-family: Fraunces, Georgia, serif;
  font-size: clamp(96px, 13vw, 188px);
  line-height: 1;
  font-weight: 400;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--voyager-charcoal);
  opacity: 0.032;
  user-select: none;
}
.discovery__watermarkNum {
  position: absolute;
  left: 54%;
  top: 10%;
  transform: translateX(-50%);
  font-family: Fraunces, Georgia, serif;
  font-size: clamp(220px, 28vw, 520px);
  line-height: 1;
  font-weight: 500;
  letter-spacing: -0.06em;
  color: var(--voyager-charcoal);
  opacity: 0.032;
  user-select: none;
}

.discovery__nav {
  width: min(1480px, 92vw);
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  position: relative;
  z-index: 1;
}
.discovery__navBtn {
  font: 500 12px/16px General Sans, Inter, ui-sans-serif, sans-serif;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--voyager-ink-2);
  background: transparent;
  border: 1px solid transparent;
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;
}
.discovery__navBtn:hover { color: var(--voyager-charcoal); border-color: var(--voyager-stone); }
.discovery__navBtn:focus-visible { outline: none; box-shadow: var(--voyager-focus-ring); }

/* Grid — scaled + ~45-50% wider editorial composition */
.discovery {
  width: min(1480px, 92vw);
  display: grid;
  grid-template-columns: minmax(0, 1.9fr) minmax(380px, 440px);
  gap: 72px;
  align-items: start;
  position: relative;
  z-index: 1;
}

@media (min-width: 1600px) {
  .discovery { width: min(1520px, 92vw); gap: 84px; }
  .discovery__nav { width: min(1520px, 92vw); }
  .discovery__watermarkText { font-size: 200px; }
}

/* Interview column — wider, with vertical editorial line from question through interaction */
.discovery__interview {
  position: relative;
  padding-left: 36px;
  min-width: 0;
  padding-top: 6px;
}

.discovery__accent {
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 12px;
  width: 1px;
  pointer-events: none;
}
.discovery__accentTrack {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 0%, var(--voyager-taupe) 6%, var(--voyager-taupe) 94%, transparent 100%);
  border-radius: 999px;
  opacity: .9;
}
.discovery__accentFill {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background: var(--voyager-bronze);
  border-radius: 999px;
  transition: height 520ms cubic-bezier(.22,.61,.36,1);
  max-height: 100%;
}

.discovery__block {
  padding-bottom: 36px;
  transition: opacity 150ms ease;
}
.discovery__block--busy { pointer-events: none; }

/* 02 / DISCOVERY micro-label — slightly larger */
.discovery__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font: 500 11px/16px General Sans, Inter, ui-sans-serif, sans-serif;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: var(--voyager-ink-3);
  margin-bottom: 22px;
}
.discovery__eyebrowNum {
  color: var(--voyager-bronze);
  font-weight: 600;
  letter-spacing: .08em;
}
.discovery__eyebrowSep { opacity: .5; }
.discovery__eyebrowMeta { opacity: .7; letter-spacing: .1em; }

/* Prompt — 40–48px editorial presence, stronger, more horizontal scale */
.discovery__prompt {
  font-family: Fraunces, Georgia, serif;
  font-size: clamp(38px, 3.1vw, 46px);
  line-height: 1.08;
  font-weight: 500;
  letter-spacing: -0.03em;
  color: var(--voyager-charcoal);
  margin: 0 0 36px 0;
  max-width: 18.5ch;
  font-variation-settings: "opsz" 72, "WONK" 1;
  text-wrap: balance;
}
.discovery__prompt--empty { color: var(--voyager-ink-3); font-size: clamp(26px, 2.4vw, 32px); line-height: 1.2; }

/* Choices — larger, more spacious, 3 across with generous padding */
.discovery__choices {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 32px;
}
@media (min-width: 900px) {
  .discovery__choices {
    gap: 14px;
  }
}
.discovery__noOptions {
  font: 400 15px/24px General Sans, Inter, ui-sans-serif, sans-serif;
  color: var(--voyager-ink-3);
  margin: 0;
}

/* Chips — larger, taller, generous padding, quiet luxury taupe */
.chip {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 3px;
  min-height: 56px;
  padding: 14px 22px;
  border-radius: var(--voyager-radius-pill);
  border: 1px solid var(--voyager-stone);
  font: 400 15.5px/20px General Sans, Inter, ui-sans-serif, sans-serif;
  color: var(--voyager-charcoal);
  background: var(--voyager-taupe-light);
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
  text-align: left;
  max-width: 100%;
  flex: 0 1 auto;
}
.chip:hover:not(:disabled) {
  background: var(--voyager-taupe);
  border-color: var(--voyager-stone-2);
  transform: translateY(-1px);
}
.chip:focus-visible { outline: none; box-shadow: var(--voyager-focus-ring); }
.chip:disabled { cursor: not-allowed; }
.chip--selected {
  background: var(--voyager-charcoal) !important;
  color: var(--voyager-ivory) !important;
  border-color: var(--voyager-charcoal) !important;
  box-shadow: 0 4px 16px rgba(27,37,44,.2);
}
.chip--selected .chip__desc { color: rgba(247,242,233,.74); }
.chip--inferred {
  background: transparent !important;
  border: 1px dashed var(--voyager-stone-2) !important;
  color: var(--voyager-ink-2);
}
.chip--stated { }
.chip--sm { min-height: 30px; padding: 7px 11px; font-size: 12px; line-height: 15px; border-radius: 10px; }
.chip__label { font-weight: 500; letter-spacing: -0.01em; }
.chip__desc { font-size: 12.5px; line-height: 15px; color: var(--voyager-ink-2); margin-top: 1px; }

.discovery__mutualNote {
  font: 500 11px/16px General Sans, Inter, ui-sans-serif, sans-serif;
  letter-spacing: .02em;
  color: var(--voyager-ink-3);
  margin: 0 0 16px 0;
}

/* Note field — personal letter / note field: wider, taller, letter-like */
.discovery__noteWrap { margin-bottom: 32px; }
.discovery__textarea {
  width: 100%;
  min-height: 164px;
  padding: 22px 24px;
  border-radius: var(--voyager-radius-input);
  border: 1px solid var(--voyager-stone);
  background: var(--voyager-ivory-2);
  color: var(--voyager-charcoal);
  font: 400 15.5px/26px General Sans, Inter, ui-sans-serif, sans-serif;
  resize: vertical;
  box-shadow: inset 0 1px 0 rgba(27,37,44,.04);
  transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
}
.discovery__textarea::placeholder { color: var(--voyager-ink-3); opacity: .88; font-style: italic; }
.discovery__textarea:focus { outline: none; box-shadow: var(--voyager-focus-ring), inset 0 1px 0 rgba(27,37,44,.03); border-color: var(--voyager-stone-2); background: #FFFEFB; }
.discovery__textarea:disabled { opacity: .6; }
.discovery__caption {
  display: block;
  margin-top: 10px;
  font: 500 11px/16px General Sans, Inter, ui-sans-serif, sans-serif;
  color: var(--voyager-ink-3);
  letter-spacing: .02em;
}

/* Continue — confident, with generous scale */
.discovery__action {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}
.discovery__continue {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 30px;
  border-radius: 10px;
  border: 1px solid var(--voyager-bronze);
  background: var(--voyager-bronze);
  color: var(--voyager-ivory-2);
  font: 500 14px/20px General Sans, Inter, ui-sans-serif, sans-serif;
  letter-spacing: .04em;
  cursor: pointer;
  transition: opacity 160ms ease, background 160ms ease, border-color 160ms ease, transform 140ms ease, box-shadow 160ms ease;
}
.discovery__continue:hover:not(:disabled) { background: var(--voyager-bronze-hover); border-color: var(--voyager-bronze-hover); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(140,106,58,.18); }
.discovery__continue:active:not(:disabled) { transform: translateY(0); box-shadow: none; }
.discovery__continue:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(140,106,58,.28); }
.discovery__continue:disabled {
  opacity: .38;
  pointer-events: none;
  background: transparent;
  color: var(--voyager-ink-3);
  border-color: var(--voyager-stone);
}
.discovery__continueArrow { font-size: 15px; transition: transform 160ms ease; }
.discovery__continue:hover:not(:disabled) .discovery__continueArrow { transform: translateX(3px); }
.discovery__continueHint {
  font: 400 11px/16px General Sans, Inter, ui-sans-serif, sans-serif;
  letter-spacing: .04em;
  color: var(--voyager-ink-3);
}

.discovery__feedback {
  min-height: 20px;
  margin-top: 18px;
  font: 400 13px/20px General Sans, Inter, ui-sans-serif, sans-serif;
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

/* Rail — slightly wider/taller, more breathing room between sections */
.discovery__rail {
  position: sticky;
  top: 32px;
  max-height: calc(100svh - 64px);
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--voyager-stone) transparent;
  align-self: start;
}
.rail__inner {
  padding: 32px 28px 24px;
  background: var(--voyager-taupe-light);
  border: 0.5px solid var(--voyager-stone);
  border-radius: 12px;
  box-shadow: var(--voyager-shadow-card-soft);
}
.rail__dossierHead {
  padding-bottom: 20px;
  margin-bottom: 20px;
  border-bottom: 0.5px solid rgba(27,37,44,.12);
}
.rail__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font: 500 10px/14px General Sans, Inter, ui-sans-serif, sans-serif;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--voyager-ink-3);
  margin-bottom: 12px;
}
.rail__eyebrowNum { color: var(--voyager-bronze); font-weight: 600; }
.rail__eyebrowSep { opacity: .5; }
.rail__title {
  font-family: Fraunces, Georgia, serif;
  font-size: 19px;
  line-height: 23px;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--voyager-charcoal);
}
.rail__subtitle {
  margin-top: 5px;
  font: 400 11px/14px General Sans, Inter, ui-sans-serif, sans-serif;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--voyager-ink-3);
}
.rail__section { padding: 20px 0; border-top: 0.5px solid rgba(27,37,44,.09); }
.rail__section:first-of-type { border-top: none; padding-top: 0; }
.rail__section:last-child { padding-bottom: 0; }
.rail__sectionLabel {
  font: 500 11px/14px General Sans, Inter, ui-sans-serif, sans-serif;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--voyager-ink-2);
  margin: 0 0 12px 0;
}
.rail__sectionBody { }
.rail__muted { font: 400 13.5px/21px General Sans, Inter, ui-sans-serif, sans-serif; color: var(--voyager-ink-3); margin: 0; }

/* kv — 12/13px hierarchy with more breathing */
.rail__kv { list-style: none; padding: 0; margin: 0; display: grid; gap: 11px; }
.rail__kvRow { display: grid; grid-template-columns: 1fr; gap: 3px; }
.rail__kvKey { font: 500 10px/14px General Sans, Inter, ui-sans-serif, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: var(--voyager-ink-3); }
.rail__kvVal { font: 400 13px/18px General Sans, Inter, ui-sans-serif, sans-serif; color: var(--voyager-charcoal); word-break: break-word; }
.rail__stack { display: grid; gap: 11px; }
.rail__bodySm { font: 400 13px/18px General Sans, Inter, ui-sans-serif, sans-serif; color: var(--voyager-charcoal); }

.rail__chips { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 8px; }

.rail__unknowns { list-style: none; padding: 0; margin: 0; display: grid; gap: 14px; }
.rail__unknown {
  border-left: 1.5px solid var(--voyager-stone-2);
  padding-left: 12px;
  padding-bottom: 2px;
}
.rail__unknownTopic { font: 500 12px/16px General Sans, Inter, ui-sans-serif, sans-serif; color: var(--voyager-charcoal); }
.rail__unknownDesc { font: 400 12px/17px General Sans, Inter, ui-sans-serif, sans-serif; font-style: italic; color: var(--voyager-ink-2); margin-top: 4px; }
.rail__impact { font: 500 10px/14px General Sans, Inter, ui-sans-serif, sans-serif; letter-spacing: .08em; text-transform: uppercase; color: var(--voyager-ink-3); margin-top: 4px; display: inline-block; }
.rail__impact--blocking { color: var(--voyager-charcoal); }

.rail__assumptions { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
.rail__assumption { display: grid; gap: 6px; }

.rail__foot {
  margin-top: 22px;
  padding-top: 16px;
  border-top: 0.5px solid rgba(27,37,44,.1);
  display: flex;
  align-items: center;
  gap: 8px;
  font: 400 10px/14px General Sans, Inter, ui-sans-serif, sans-serif;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--voyager-ink-3);
}
.rail__footDot { opacity: .5; }

/* Motion */
@keyframes discoverySettle {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.discovery__pour { animation: discoverySettle 560ms cubic-bezier(.22,.61,.36,1) both; }
.discovery__pour--1 { animation-delay: 0ms; }
.discovery__pour--2 { animation-delay: 95ms; }
.discovery__pour--3 { animation-delay: 185ms; }
.discovery__pour--4 { animation-delay: 270ms; }

@media (prefers-reduced-motion: reduce) {
  .discovery__pour { animation: none; }
  .discovery__accentFill { transition: none; }
}

@media (max-width: 1280px) {
  .discovery { grid-template-columns: minmax(0, 1.65fr) 360px; gap: 56px; }
  .discovery__watermarkText { font-size: clamp(84px, 11vw, 148px); }
  .discovery__watermarkNum { font-size: clamp(180px, 24vw, 420px); }
}
@media (max-width: 1024px) {
  .discovery { grid-template-columns: 1fr; gap: 32px; }
  .discovery__rail { position: static; max-height: none; overflow: visible; }
  .discovery__interview { padding-left: 24px; }
  .discovery__canvas { padding: 32px 16px 48px; }
  .discovery, .discovery__nav { width: min(1480px, 92vw); }
  .discovery__watermarkText { top: 38%; }
  .discovery__watermarkNum { top: 6%; left: 50%; }
}
@media (max-width: 640px) {
  .discovery__prompt { font-size: clamp(30px, 8vw, 38px); line-height: 1.08; max-width: none; }
  .discovery__interview { padding-left: 20px; }
  .discovery__watermarkText { font-size: 56px; letter-spacing: 0.1em; opacity: 0.02; }
  .discovery__watermarkNum { font-size: 180px; opacity: 0.02; }
}
@media (max-width: 480px) {
  .discovery__choices { flex-direction: column; }
  .chip { width: 100%; }
}

/* ——— Busy overlay — centered glowing sphere, same ivory background, aesthetic fade ——— */
.discovery__busyOverlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: grid;
  place-items: center;
  background: var(--voyager-ivory);
  /* keep watermark visible faintly underneath, but cover interview */
}
.discovery__busyOverlay.is-entering {
  animation: discovery-busy-enter 420ms cubic-bezier(.22,1,.36,1) both;
}
.discovery__busyOverlay.is-exiting {
  animation: discovery-busy-exit 420ms ease both;
}
@keyframes discovery-busy-enter {
  from { opacity: 0; backdrop-filter: blur(2px); }
  to   { opacity: 1; backdrop-filter: blur(0); }
}
@keyframes discovery-busy-exit {
  from { opacity: 1; transform: scale(1); filter: blur(0); }
  to   { opacity: 0; transform: scale(0.98); filter: blur(3px); }
}
.discovery__busySphere {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  text-align: center;
  padding: 24px;
  animation: discovery-busy-sphere-enter 480ms cubic-bezier(.22,1,.36,1) 120ms both;
}
@keyframes discovery-busy-sphere-enter {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.discovery-busy-ripple {
  width: 192px;
  height: 192px;
  display: grid;
  place-items: center;
  position: relative;
}
.discovery-busy-glow {
  position: absolute;
  width: 192px;
  height: 192px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(179,138,85,0.42) 0%, rgba(179,138,85,0.18) 38%, rgba(179,138,85,0.06) 62%, transparent 72%);
  filter: blur(0.5px);
  animation: breathe-glow 3s ease-in-out infinite;
}
.discovery-busy-core {
  width: 96px;
  height: 96px;
  border-radius: 999px;
  background: radial-gradient(circle at 50% 45%, #D8C19A 0%, #B38A55 58%, #8E6A3F 100%);
  box-shadow: 0 0 48px rgba(179,138,85,0.42), 0 0 96px rgba(179,138,85,0.18);
  opacity: 0.92;
  animation: breathe-core 3s ease-in-out infinite;
}
@keyframes breathe-glow {
  0%,100% { transform: scale(0.86); opacity: 0.72; }
  50%      { transform: scale(1.06); opacity: 0.38; }
}
@keyframes breathe-core {
  0%,100% { transform: scale(0.94); opacity: 0.90; }
  50%      { transform: scale(1.04); opacity: 0.62; }
}
.discovery__busyText {
  margin: 0;
  font-family: Fraunces, Georgia, serif;
  font-size: 17px;
  line-height: 24px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--voyager-charcoal);
}
.discovery__busySub {
  margin: 0;
  margin-top: -10px;
  font: 400 13px/18px General Sans, Inter, ui-sans-serif, sans-serif;
  letter-spacing: .02em;
  color: var(--voyager-ink-2);
}
@media (prefers-reduced-motion: reduce) {
  .discovery__busyOverlay.is-entering, .discovery__busyOverlay.is-exiting,
  .discovery__busySphere, .discovery-busy-glow, .discovery-busy-core { animation: none; }
}
`