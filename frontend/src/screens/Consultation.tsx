import React, { useEffect, useRef, useState, useCallback } from "react";
import { getWsClient } from "../ws/index";
import {
  initialDecisionPlanState,
  handleDecisionRequest,
  validateDecisionRespond,
  applyDecisionRespond,
  type DecisionPlanState,
} from "../ws/decisionPlan";

/**
 * Consultation — Voyager Consultation (orb-only)
 * Center ripple + statusLine + decision panel. No lifecycle rail.
 */

export type DecisionOption = { option_id: string; label: string; tradeoff: string };
export type DecisionRequest = {
  decision_id: string;
  prompt: string;
  reason?: string;
  sequenceLabel?: string;
  kicker?: string;
  options: DecisionOption[];
};

function mapDecisionPayloadToRequest(payload: { decision_id: string; prompt: string; reason?: string; options: DecisionOption[] }): DecisionRequest {
  return {
    decision_id: payload.decision_id,
    prompt: payload.prompt,
    reason: payload.reason,
    sequenceLabel: "01  ·  TRADE-OFF",
    kicker: "A CHOICE IS NEEDED",
    options: payload.options.map((o) => ({ option_id: o.option_id, label: o.label, tradeoff: o.tradeoff })),
  };
}

function useLiveConsultation() {
  const [connected, setConnected] = useState(false);
  const [livePlanningMessage, setLivePlanningMessage] = useState<string | null>(null);
  const [liveLastSeq, setLiveLastSeq] = useState<number>(() => Date.now());
  const [liveDecision, setLiveDecision] = useState<DecisionRequest | null>(null);
  const [decisionPlanState, setDecisionPlanState] = useState<DecisionPlanState>(() => initialDecisionPlanState("planning"));
  const wsRef = useRef<ReturnType<typeof getWsClient> | null>(null);
  const seqRef = useRef<number>(Date.now());

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let ws: ReturnType<typeof getWsClient> | null = null;
    try {
      ws = getWsClient();
      wsRef.current = ws;
      const snapshot = ws.snapshot();
      setConnected(!!snapshot.connected);
      if (!snapshot.connected) {
        const connState = ws.getConnectionState();
        if (connState === "idle" || connState === "closed") {
          try {
            ws.connect();
          } catch {
            // fallback to mock
          }
        }
      }
      unsub = ws.subscribe((env: unknown) => {
        const envelope = env as { type: string; kind: string; payload: unknown; sequence?: number };
        const seq = typeof envelope.sequence === "number" ? envelope.sequence : null;
        if (seq !== null) {
          const now = Date.now();
          seqRef.current = now;
          setLiveLastSeq(now);
        } else if (envelope.type === "planning.status" || envelope.type === "decision.request") {
          const now = Date.now();
          seqRef.current = now;
          setLiveLastSeq(now);
        }

        if (envelope.type === "planning.status" && envelope.kind === "event") {
          const p = envelope.payload as Record<string, unknown>;
          if (typeof p.message === "string" && p.message.trim().length > 0) {
            setLivePlanningMessage(p.message as string);
          }
        } else if (envelope.type === "decision.request" && envelope.kind === "event") {
          setDecisionPlanState((prev) => {
            const res = handleDecisionRequest(prev, envelope.payload, { workflowState: "decision_required" });
            if (res.valid) {
              const dec = res.state.currentDecision;
              if (dec) {
                setLiveDecision(mapDecisionPayloadToRequest(dec as unknown as DecisionRequest & { reason?: string }));
              }
              return res.state;
            }
            return prev;
          });
        }

        try {
          const snap = ws!.snapshot();
          setConnected(!!snap.connected);
        } catch {
          // ignore
        }
      });

      poll = setInterval(() => {
        try {
          const snap = ws!.snapshot();
          setConnected(!!snap.connected);
        } catch {
          // ignore
        }
      }, 750);

      try {
        const snap = ws.snapshot();
        setConnected(!!snap.connected);
      } catch {}
    } catch {
      setConnected(false);
    }

    return () => {
      if (unsub) unsub();
      if (poll) clearInterval(poll);
    };
  }, []);

  const sendDecisionRespond = useCallback(
    (decisionId: string, optionId: string): { sent: boolean; stale?: boolean; duplicate?: boolean; noSideEffect?: boolean; error?: string } => {
      const ws = wsRef.current;
      if (!ws) return { sent: false, error: "no ws" };
      try {
        const snap = ws.snapshot();
        const wf = snap.workflowState;
        if (wf !== "decision_required" && decisionPlanState.workflowState !== "decision_required") {
          return { sent: false, stale: true, noSideEffect: true };
        }
      } catch {
        if (decisionPlanState.workflowState !== "decision_required") {
          return { sent: false, stale: true, noSideEffect: true };
        }
      }

      const currentId = liveDecision?.decision_id ?? decisionPlanState.currentDecision?.decision_id ?? null;
      if (!currentId || decisionId !== currentId) {
        return { sent: false, stale: true, noSideEffect: true };
      }

      const v = validateDecisionRespond(decisionPlanState, { decision_id: decisionId, option_id: optionId });
      if (!v.valid || !v.accepted) {
        if (v.noSideEffect) return { sent: false, stale: true, noSideEffect: true, error: v.error };
        if (v.code === "invalid_workflow_state" || v.code === "invalid_envelope") {
          return { sent: false, stale: true, noSideEffect: !!v.noSideEffect, error: v.error };
        }
        return { sent: false, error: v.error, noSideEffect: !!v.noSideEffect };
      }

      try {
        ws.sendDecisionRespond(decisionId, optionId);
      } catch (e) {
        return { sent: false, error: String(e) };
      }

      setDecisionPlanState((prev) => applyDecisionRespond(prev, { decision_id: decisionId, option_id: optionId }));
      setLiveDecision(null);
      return { sent: true };
    },
    [decisionPlanState, liveDecision]
  );

  const clearLiveDecisionForResuming = useCallback(() => {
    setLiveDecision(null);
  }, []);

  return {
    connected,
    planningMessage: livePlanningMessage,
    lastSeq: liveLastSeq,
    decision: liveDecision,
    decisionPlanState,
    sendDecisionRespond,
    clearLiveDecisionForResuming,
    ws: wsRef.current,
  };
}

export type ConsultationProps = {
  stages?: unknown;
  planningMessage?: string | null;
  lastSequenceAt?: number;
  onRetry?: () => void;
  expanded?: boolean;
  decisionRequest?: DecisionRequest | null;
  onDecisionSubmit?: (optionId: string, decisionId: string) => void;
};

export default function Consultation({
  planningMessage: externalPlanningMessage,
  lastSequenceAt: externalSeq,
  onRetry,
  expanded = true,
  decisionRequest: externalDecision,
  onDecisionSubmit,
}: ConsultationProps) {
  const [seqTick, setSeqTick] = useState<number>(() => Date.now());
  const [timedOut, setTimedOut] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const retryCountRef = useRef(0);
  const seqRef = useRef<number>(Date.now());

  const [selected, setSelected] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [decisionFadingOut, setDecisionFadingOut] = useState(false);

  const live = useLiveConsultation();
  const wsConnected = live.connected;

  let activeDecision: DecisionRequest | null = null;
  if (wsConnected) {
    activeDecision = live.decision;
  } else if (externalDecision !== undefined && externalDecision !== null) {
    activeDecision = externalDecision as DecisionRequest;
  } else {
    activeDecision = null;
  }

  const isDecisionRequired = !!activeDecision && !resuming;
  const isResuming = resuming;
  const isWorking = !isDecisionRequired && !isResuming;

  const FALLBACK_MESSAGE = "Agent is optimising routes and selecting places — this takes a moment.";
  const planningMessage = wsConnected ? (live.planningMessage ?? FALLBACK_MESSAGE) : (externalPlanningMessage ?? FALLBACK_MESSAGE);
  const statusLine = planningMessage || FALLBACK_MESSAGE;
  const lastSeq = wsConnected ? live.lastSeq : externalSeq ?? seqTick;

  useEffect(() => {
    if (wsConnected) {
      seqRef.current = live.lastSeq;
      setElapsed(0);
      setTimedOut(false);
    }
  }, [wsConnected, live.lastSeq]);

  // Non-blocking timeout: 60s+ without sequence, paused during decision/resuming. Only shows retry — never hides orb.
  useEffect(() => {
    if (timedOut) return;
    if (isDecisionRequired || isResuming) return;
    const start = lastSeq;
    seqRef.current = start;
    setElapsed(0);
    const tick = window.setInterval(() => {
      const now = Date.now();
      const diff = now - seqRef.current;
      setElapsed(diff);
      if (diff >= 65000) {
        if (wsConnected) setTimedOut(true);
        window.clearInterval(tick);
      }
    }, 500);
    return () => window.clearInterval(tick);
  }, [lastSeq, timedOut, isDecisionRequired, isResuming, wsConnected]);

  useEffect(() => {
    seqRef.current = lastSeq;
  }, [lastSeq]);

  useEffect(() => {
    if (activeDecision) {
      setSelected(null);
      setConfirming(false);
      setDecisionFadingOut(false);
    }
  }, [activeDecision?.decision_id]);

  const handleRetry = useCallback(() => {
    retryCountRef.current += 1;
    setTimedOut(false);
    setElapsed(0);
    const now = Date.now();
    seqRef.current = now;
    setSeqTick(now);
    onRetry?.();
  }, [onRetry]);

  const handleContinue = useCallback(() => {
    if (!selected || !activeDecision || confirming || resuming) return;

    if (wsConnected) {
      const res = live.sendDecisionRespond(activeDecision.decision_id, selected);
      if (!res.sent) {
        if (res.noSideEffect || res.stale || res.duplicate) {
          return;
        }
        return;
      }
      setConfirming(true);
      window.setTimeout(() => {
        setDecisionFadingOut(true);
        window.setTimeout(() => {
          setResuming(true);
          setDecisionFadingOut(false);
          setConfirming(false);
          onDecisionSubmit?.(selected, activeDecision.decision_id);
          window.setTimeout(() => {
            setResuming(false);
            setSelected(null);
          }, 1800);
        }, 380);
      }, 520);
      return;
    }

    setConfirming(true);
    window.setTimeout(() => {
      setDecisionFadingOut(true);
      window.setTimeout(() => {
        setResuming(true);
        setDecisionFadingOut(false);
        setConfirming(false);
        onDecisionSubmit?.(selected, activeDecision.decision_id);
        window.setTimeout(() => {
          setResuming(false);
          setSelected(null);
        }, 1800);
      }, 380);
    }, 520);
  }, [selected, activeDecision, confirming, resuming, onDecisionSubmit, wsConnected, live]);

  return (
    <main
      className={`consultation${expanded ? " is-expanded" : " is-collapsed"}${isDecisionRequired ? " is-decision" : ""}${isResuming ? " is-resuming" : ""}`}
      role="main"
      aria-label="Consultation"
      data-state={isDecisionRequired ? "decision_required" : isResuming ? "resuming" : "working"}
    >
      <header className="consultation-header" aria-hidden="true">
        <span className="consultation-header-label">Consultation</span>
      </header>

      <div className="consultation-layout">
        <div className="consultation-center">
          <div className="ripple-stage" aria-hidden="true">
            <div
              className={`ripple${isDecisionRequired ? " ripple--decision" : ""}${isResuming ? " ripple--resuming" : ""}`}
              data-testid="ripple"
              aria-hidden="true"
            >
              <div className="ripple-glow" />
              <div className="ripple-core" />
              {isDecisionRequired && (
                <>
                  <span className="ripple-orbit ripple-orbit--a" />
                  <span className="ripple-orbit ripple-orbit--b" />
                </>
              )}
            </div>
            {timedOut && !isDecisionRequired && !isResuming && (
              <div className="timeout-dot" data-testid="timeout-dot" aria-hidden="true" style={{ marginTop: 12 }} />
            )}
          </div>

          {isWorking && !timedOut && (
            <p
              className="status-line"
              aria-live="polite"
              aria-atomic="true"
              data-testid="status-line"
              style={{ opacity: 0.88 }}
            >
              {statusLine}
            </p>
          )}

          {isResuming && (
            <div className="resuming-block" aria-live="polite" data-testid="resuming-block">
              <p className="resuming-title">Preference recorded.</p>
              <p className="resuming-sub">Reworking the journey…</p>
            </div>
          )}

          {isDecisionRequired && activeDecision && (
            <section
              className={`decision-surface${decisionFadingOut ? " is-exiting" : " is-entering"}`}
              aria-label="Choice required"
              data-testid="decision-surface"
              role="group"
            >
              <div className="decision-eyebrow mono" aria-hidden="true">
                {activeDecision.sequenceLabel ?? "01  ·  TRADE-OFF"}
              </div>
              <div className="decision-kicker mono">{activeDecision.kicker ?? "A CHOICE IS NEEDED"}</div>
              <h2 className="decision-prompt serif">{activeDecision.prompt}</h2>

              <div className="decision-cards" role="group" aria-label="Choose one option">
                {activeDecision.options.map((o, idx) => {
                  const isSelected = selected === o.option_id;
                  const isConfirmingThis = isSelected && confirming;
                  return (
                    <button
                      key={o.option_id}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`${o.label}: ${o.tradeoff}`}
                      onClick={() => {
                        if (confirming || resuming) return;
                        setSelected(o.option_id);
                      }}
                      className={`decision-card${isSelected ? " is-selected" : ""}${isConfirmingThis ? " is-confirming" : ""}`}
                      data-testid={`decision-option-${o.option_id}`}
                      style={{ animationDelay: `${120 + idx * 90}ms` }}
                    >
                      <div className="card-head">
                        <span className="card-index mono">0{idx + 1}</span>
                        <span className="card-head-line" aria-hidden="true" />
                        <span className="card-radio" aria-hidden="true">
                          <span className="card-radio-dot" />
                        </span>
                      </div>
                      <div className="card-label serif">{o.label}</div>
                      <div className="card-tradeoff">{o.tradeoff}</div>
                      {isConfirmingThis && <span className="card-check" aria-hidden="true">✓</span>}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleContinue}
                disabled={!selected || confirming}
                className="decision-continue"
                data-testid="decision-continue"
                aria-label="Confirm preference"
                style={{ opacity: !selected || confirming ? 0.38 : 1 }}
              >
                <span>{confirming ? "Confirming…" : "Continue"}</span>
                <span aria-hidden="true" className="continue-arrow">→</span>
              </button>
              <div className="decision-hint mono" aria-hidden="true">
                Select a card, then continue — your choice shapes what follows
              </div>
            </section>
          )}

          {timedOut && isWorking && (
            <button
              type="button"
              className="retry-link"
              onClick={handleRetry}
              data-testid="retry-button"
              aria-label="Try again"
            >
              Try again
            </button>
          )}
          {!timedOut && isWorking && (
            <button
              type="button"
              className="retry-link"
              onClick={() => { try { getWsClient().sendRunCancel('Traveler cancelled planning') } catch {} }}
              data-testid="cancel-planning"
              aria-label="Cancel planning"
              style={{ marginTop: 12, opacity: 0.72 }}
            >
              Cancel
            </button>
          )}

          <span className="sr-only" aria-live="polite">
            {timedOut ? "Consultation paused. You can try again." : `Consulting — ${Math.floor(elapsed / 1000)} seconds`}
          </span>
        </div>
      </div>

      <style>{`
        :root {
          --voyager-bone-0: #F7F2E9;
          --voyager-bone-1: #EEE6D8;
          --voyager-bone-2: #E1D6C5;
          --voyager-bone-3: #C9BBA5;
          --voyager-ink-0: #1B252C;
          --voyager-ink-deep: #18232A;
          --voyager-ink-1: #263239;
          --voyager-ink-2: #56636A;
          --voyager-ink-3: #7D878A;
          --voyager-light-ink: #F2EBDD;
          --voyager-brass-1: #B38A55;
          --voyager-brass-2: #D8C19A;
          --voyager-brass-3: #86633B;
          --voyager-clay: #B56F62;
          --voyager-sage: #708A77;
          --voyager-radius-sm: 6px;
          --voyager-radius-md: 12px;
          --voyager-focus-ring: 0 0 0 3px rgba(216, 193, 154, .72);
          --voyager-decision-panel: #202B30;
          --voyager-decision-card: #263137;
          --voyager-decision-card-hover: #2A383E;
        }
        * { box-sizing: border-box; }
        .sr-only {
          position: absolute;
          width: 1px; height: 1px;
          padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0,0,0,0);
          white-space: nowrap; border: 0;
        }
        .mono { font-family: IBM Plex Mono, ui-monospace, monospace; }
        .serif { font-family: Fraunces, Georgia, serif; }
        .consultation {
          min-height: 100svh;
          background: var(--voyager-ink-deep);
          color: var(--voyager-light-ink);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }
        .consultation::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 80% 60% at 50% 42%, rgba(242,235,221,0.045) 0%, transparent 68%);
          pointer-events: none;
        }
        .consultation.is-decision::before {
          background:
            radial-gradient(ellipse 70% 52% at 50% 46%, rgba(179,138,85,0.09) 0%, transparent 62%),
            radial-gradient(ellipse 80% 60% at 50% 42%, rgba(242,235,221,0.045) 0%, transparent 68%);
        }
        .consultation-header {
          height: 72px;
          flex: 0 0 72px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          position: relative;
          z-index: 1;
        }
        .consultation-header-label {
          font-family: General Sans, Inter, ui-sans-serif, sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(242,235,221,0.62);
        }
        .consultation-layout {
          flex: 1;
          display: flex;
          min-height: calc(100svh - 72px);
          position: relative;
          z-index: 1;
        }
        .consultation-center {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 32px 64px;
          text-align: center;
        }
        .ripple-stage {
          width: 192px;
          height: 192px;
          display: grid;
          place-items: center;
          margin-bottom: 28px;
          flex-shrink: 0;
        }
        .ripple {
          width: 192px;
          height: 192px;
          display: grid;
          place-items: center;
          position: relative;
        }
        .ripple-glow {
          position: absolute;
          width: 192px;
          height: 192px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(179,138,85,0.42) 0%, rgba(179,138,85,0.18) 38%, rgba(179,138,85,0.06) 62%, transparent 72%);
          filter: blur(0.5px);
          animation: breathe-glow 3s ease-in-out infinite;
        }
        .ripple-core {
          width: 96px;
          height: 96px;
          border-radius: 999px;
          background: radial-gradient(circle at 50% 45%, #D8C19A 0%, #B38A55 58%, #8E6A3F 100%);
          box-shadow: 0 0 48px rgba(179,138,85,0.42), 0 0 96px rgba(179,138,85,0.18);
          opacity: 0.92;
          animation: breathe-core 3s ease-in-out infinite;
        }
        .ripple--decision .ripple-glow {
          background: radial-gradient(circle, rgba(179,138,85,0.55) 0%, rgba(179,138,85,0.26) 36%, rgba(179,138,85,0.10) 60%, transparent 72%);
          filter: blur(0.4px);
          animation: breathe-glow-strong 2.6s ease-in-out infinite;
        }
        .ripple--decision .ripple-core {
          box-shadow: 0 0 56px rgba(179,138,85,0.52), 0 0 110px rgba(179,138,85,0.24);
          animation: breathe-core-strong 2.6s ease-in-out infinite;
        }
        .ripple-orbit {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgba(216,193,154,0.72);
          box-shadow: 0 0 8px rgba(216,193,154,0.55);
          opacity: 0.85;
        }
        .ripple-orbit--a { transform: translate(-52px, -8px); animation: orbit-pulse 2.2s ease-in-out infinite; }
        .ripple-orbit--b { transform: translate(52px, 8px); animation: orbit-pulse 2.2s ease-in-out 0.7s infinite; }
        @keyframes orbit-pulse {
          0%,100% { opacity: 0.45; transform: scale(0.9) translate(var(--tx, -52px), var(--ty, -8px)); }
          50% { opacity: 0.9; transform: scale(1.15) translate(var(--tx, -52px), var(--ty, -8px)); }
        }
        .ripple-orbit--a { --tx: -52px; --ty: -8px; }
        .ripple-orbit--b { --tx: 52px; --ty: 8px; }
        @keyframes breathe-glow {
          0%, 100% { transform: scale(0.86); opacity: 0.72; }
          50% { transform: scale(1.06); opacity: 0.38; }
        }
        @keyframes breathe-core {
          0%, 100% { transform: scale(0.94); opacity: 0.90; }
          50% { transform: scale(1.04); opacity: 0.62; }
        }
        @keyframes breathe-glow-strong {
          0%,100% { transform: scale(0.92); opacity: 0.82; }
          50% { transform: scale(1.08); opacity: 0.48; }
        }
        @keyframes breathe-core-strong {
          0%,100% { transform: scale(0.97); opacity: 0.94; }
          50% { transform: scale(1.06); opacity: 0.72; }
        }
        .timeout-dot {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: var(--voyager-clay);
          opacity: 0.92;
          box-shadow: 0 0 16px rgba(181,111,98,0.28);
          animation: settle-in 420ms ease-out;
        }
        @keyframes settle-in {
          from { opacity: 0; transform: scale(0.6); }
          to { opacity: 0.92; transform: scale(1); }
        }
        .status-line {
          font-family: General Sans, Inter, ui-sans-serif, sans-serif;
          font-size: 16px;
          line-height: 25px;
          font-weight: 400;
          color: var(--voyager-light-ink);
          letter-spacing: 0.02em;
          max-width: 46ch;
          margin: 0;
          text-wrap: balance;
          animation: status-enter 420ms ease both;
        }
        @keyframes status-enter {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .resuming-block {
          text-align: center;
          animation: resuming-enter 420ms cubic-bezier(0.22,1,0.36,1) both;
        }
        .resuming-title {
          font-family: Fraunces, Georgia, serif;
          font-size: 20px;
          line-height: 28px;
          font-weight: 400;
          color: var(--voyager-light-ink);
          margin: 0;
          letter-spacing: -0.01em;
        }
        .resuming-sub {
          margin-top: 8px;
          font-family: General Sans, Inter, ui-sans-serif, sans-serif;
          font-size: 14px;
          line-height: 20px;
          color: rgba(242,235,221,0.68);
          letter-spacing: 0.02em;
        }
        @keyframes resuming-enter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .retry-link {
          margin-top: 16px;
          background: transparent;
          border: none;
          color: var(--voyager-brass-2);
          font-family: General Sans, Inter, ui-sans-serif, sans-serif;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-decoration: underline;
          text-underline-offset: 4px;
          text-decoration-color: rgba(216,193,154,0.55);
          cursor: pointer;
          padding: 4px 8px;
        }
        .retry-link:hover { color: var(--voyager-brass-1); }
        .retry-link:focus-visible {
          outline: none;
          box-shadow: var(--voyager-focus-ring);
          border-radius: 6px;
        }
        .decision-surface {
          width: min(560px, 92vw);
          background: var(--voyager-decision-panel);
          border: 1px solid rgba(242,235,221,0.08);
          border-radius: 18px;
          padding: 28px 28px 22px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.28), 0 1px 0 rgba(242,235,221,0.06) inset;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          position: relative;
          text-align: center;
          margin-top: 8px;
        }
        .decision-surface::before {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: 18px;
          background: radial-gradient(ellipse 90% 70% at 50% 0%, rgba(216,193,154,0.08) 0%, transparent 58%);
          pointer-events: none;
        }
        .decision-surface.is-entering {
          animation: decision-enter 480ms cubic-bezier(0.22,1,0.36,1) both;
        }
        .decision-surface.is-exiting {
          animation: decision-exit 360ms ease both;
        }
        @keyframes decision-enter {
          from { opacity: 0; transform: translateY(14px) scale(0.98); filter: blur(2px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes decision-exit {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(8px) scale(0.98); }
        }
        .decision-eyebrow {
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(242,235,221,0.48);
          font-weight: 500;
          margin-bottom: 14px;
        }
        .decision-kicker {
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--voyager-brass-2);
          font-weight: 600;
          margin-bottom: 14px;
          animation: decision-kicker-enter 420ms ease 120ms both;
        }
        @keyframes decision-kicker-enter {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .decision-prompt {
          font-size: 22px;
          line-height: 30px;
          font-weight: 400;
          color: var(--voyager-light-ink);
          letter-spacing: -0.015em;
          margin: 0;
          max-width: 28ch;
          text-wrap: balance;
          animation: decision-prompt-enter 420ms ease 180ms both;
        }
        @keyframes decision-prompt-enter {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .decision-cards {
          display: flex;
          flex-direction: column;
          gap: 14px;
          width: 100%;
          margin-top: 26px;
        }
        .decision-card {
          text-align: left;
          padding: 20px 20px 18px;
          border-radius: 14px;
          border: 1px solid rgba(242,235,221,0.07);
          background: var(--voyager-decision-card);
          color: var(--voyager-light-ink);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          width: 100%;
          transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease, transform 180ms ease;
          animation: card-enter 420ms cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes card-enter {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .decision-card:hover {
          border-color: rgba(216,193,154,0.22);
          background: var(--voyager-decision-card-hover);
        }
        .decision-card:focus-visible {
          outline: none;
          box-shadow: var(--voyager-focus-ring);
        }
        .decision-card.is-selected {
          border-color: rgba(216,193,154,0.48);
          background: #2E3C42;
          box-shadow: 0 0 0 1px rgba(216,193,154,0.22), 0 4px 18px rgba(0,0,0,0.22);
        }
        .decision-card.is-confirming {
          border-color: var(--voyager-brass-2);
          box-shadow: 0 0 0 2px rgba(216,193,154,0.28), 0 6px 22px rgba(0,0,0,0.26);
        }
        .card-head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .card-index {
          font-size: 10px;
          letter-spacing: 0.14em;
          color: rgba(242,235,221,0.46);
          font-weight: 600;
          flex-shrink: 0;
        }
        .decision-card.is-selected .card-index { color: var(--voyager-brass-2); }
        .card-head-line {
          flex: 1;
          height: 1px;
          background: rgba(242,235,221,0.07);
        }
        .decision-card.is-selected .card-head-line { background: rgba(216,193,154,0.18); }
        .card-radio {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          border: 1.25px solid rgba(242,235,221,0.18);
          background: transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 180ms ease;
        }
        .decision-card.is-selected .card-radio {
          border-color: var(--voyager-brass-2);
          background: var(--voyager-brass-1);
        }
        .card-radio-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #FFFEFB;
          opacity: 0;
          transform: scale(0.6);
          transition: all 180ms ease;
          display: block;
        }
        .decision-card.is-selected .card-radio-dot {
          opacity: 1;
          transform: scale(1);
        }
        .card-label {
          font-size: 16px;
          line-height: 24px;
          font-weight: 500;
          color: var(--voyager-light-ink);
          letter-spacing: -0.01em;
          margin-bottom: 6px;
        }
        .card-tradeoff {
          font-family: General Sans, Inter, ui-sans-serif, sans-serif;
          font-size: 13px;
          line-height: 19px;
          color: rgba(242,235,221,0.62);
        }
        .card-check {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 22px;
          height: 22px;
          border-radius: 999px;
          background: var(--voyager-brass-1);
          color: #FFFEFB;
          display: grid;
          place-items: center;
          font-size: 12px;
          font-weight: 700;
          animation: check-pop 320ms cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes check-pop {
          from { opacity: 0; transform: scale(0.6); }
          to { opacity: 1; transform: scale(1); }
        }
        .decision-continue {
          margin-top: 22px;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(242,235,221,0.18);
          color: rgba(242,235,221,0.86);
          font-family: General Sans, Inter, ui-sans-serif, sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.06em;
          padding: 8px 2px 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: color 180ms ease, border-color 180ms ease, opacity 180ms ease;
        }
        .decision-continue:hover:not(:disabled) {
          color: var(--voyager-brass-2);
          border-bottom-color: rgba(216,193,154,0.42);
        }
        .decision-continue:disabled {
          cursor: not-allowed;
        }
        .decision-continue:focus-visible {
          outline: none;
          box-shadow: var(--voyager-focus-ring);
          border-radius: 6px;
        }
        .continue-arrow {
          font-size: 14px;
          transition: transform 180ms ease;
        }
        .decision-continue:hover:not(:disabled) .continue-arrow {
          transform: translateX(2px);
        }
        .decision-hint {
          margin-top: 14px;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(242,235,221,0.38);
          line-height: 14px;
        }
      `}</style>
    </main>
  );
}
