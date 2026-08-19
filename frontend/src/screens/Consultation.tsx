import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * Consultation — Night Desk
 * Full-ink veil 100svh, 96px ripple + 192px glow breathing 3s sinusoid,
 * bone status line 85-90%, 320px lifecycle rail with 10 stages,
 * graceful 12s timeout → clay dot + Try again, no progress bar.
 * Rail collapses to 4px brass edge outside consultation (handled via CSS).
 * Basic timer mock only — no real WebSocket, idempotent retry.
 */

type StageStatus = "queued" | "started" | "progressed" | "completed" | "failed";

type Stage = {
  key: string;
  label: string;
  status: StageStatus;
  summary?: string;
};

// Canonical ten-stage order — README / AGENT_ARCHITECTURE / WEBSOCKET_CONTRACT
const STAGE_DEFS: { key: string; label: string }[] = [
  { key: "discovery", label: "Discovery" },
  { key: "constraint_preference", label: "Constraint & Preference" },
  { key: "experience_designer", label: "Attraction & Experience Designer" },
  { key: "mobility_logistics", label: "Mobility & Logistics" },
  { key: "cost_optimization", label: "Cost Optimization" },
  { key: "local_intelligence", label: "Local Intelligence" },
  { key: "simulation_risk", label: "Simulation & Risk" },
  { key: "optimization", label: "Optimization" },
  { key: "narrative_explanation", label: "Narrative & Explanation" },
  { key: "continuous_replanning", label: "Continuous Replanning" },
];

// Traveler-safe planning messages — never raw phase identifiers
const PLANNING_MESSAGES: string[] = [
  "Preparing a thoughtful plan for you.",
  "Consulting on comfort and feasibility.",
  "Shaping routes with care for your pace.",
  "Balancing walking load, cost and attraction fit.",
  "Weaving your preferences into each day.",
  "Refining the journey so time feels well spent.",
];

const LIFECYCLE_SUMMARIES: Record<string, string> = {
  discovery: "Understanding how you travel best.",
  constraint_preference: "Honouring your priorities and constraints.",
  experience_designer: "Selecting places that fit your story.",
  mobility_logistics: "Checking routes and timing with care.",
  cost_optimization: "Balancing cost and comfort.",
  local_intelligence: "Gathering local nuance for your days.",
  simulation_risk: "Testing the plan for ease and resilience.",
  optimization: "Choosing the most thoughtful arrangement.",
  narrative_explanation: "Writing your journey in plain words.",
  continuous_replanning: "Standing by for future adjustments.",
};

function statusText(s: StageStatus): string {
  if (s === "queued") return "Queued";
  if (s === "started" || s === "progressed") return "In progress";
  if (s === "completed") return "Completed";
  return "Needs attention";
}

export type ConsultationProps = {
  /** Optional external control — if omitted, internal mock timer drives the screen */
  stages?: Stage[];
  planningMessage?: string | null;
  lastSequenceAt?: number;
  onRetry?: () => void;
  /** When false the rail renders in its collapsed 4px brass edge form (outside consultation) */
  expanded?: boolean;
};

export default function Consultation({
  stages: externalStages,
  planningMessage: externalPlanningMessage,
  lastSequenceAt: externalSeq,
  onRetry,
  expanded = true,
}: ConsultationProps) {
  const [internalStages, setInternalStages] = useState<Stage[]>(() =>
    STAGE_DEFS.map((d) => ({ ...d, status: "queued" as StageStatus, summary: undefined }))
  );
  const [planningIdx, setPlanningIdx] = useState(0);
  const [seqTick, setSeqTick] = useState<number>(() => Date.now());
  const [timedOut, setTimedOut] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const retryCountRef = useRef(0);
  const seqRef = useRef<number>(Date.now());

  const stages = externalStages ?? internalStages;
  const usesMock = externalStages === undefined;

  // Derive status line: prefer planning message, fallback to latest lifecycle summary, else default
  const planningMessage = externalPlanningMessage ?? PLANNING_MESSAGES[planningIdx] ?? PLANNING_MESSAGES[0];
  const lastSummary = (() => {
    // latest stage with summary and not queued
    for (let i = stages.length - 1; i >= 0; i--) {
      if (stages[i].summary && stages[i].status !== "queued") return stages[i].summary!;
    }
    return null;
  })();
  const statusLine = planningMessage || lastSummary || "Preparing a thoughtful plan for you.";

  // Track last sequence — external or internal mock tick
  const lastSeq = externalSeq ?? seqTick;

  // Mock timer: progress stages deterministically, update seqTick as new event
  useEffect(() => {
    if (!usesMock) return;
    if (timedOut) return; // pause mock while timed out

    let current = 0;
    // start first stage as started after short delay
    const interval = window.setInterval(() => {
      setInternalStages((prev) => {
        const next = prev.map((s) => ({ ...s }));
        // find first non-completed non-failed that is queued/started
        // advance in order: queued -> started -> completed
        const idx = next.findIndex((s) => s.status === "queued" || s.status === "started" || s.status === "progressed");
        if (idx === -1) {
          // all done
          return prev;
        }
        const st = next[idx];
        if (st.status === "queued") {
          st.status = "started";
          st.summary = LIFECYCLE_SUMMARIES[st.key];
        } else if (st.status === "started" || st.status === "progressed") {
          // occasionally mark progressed then completed
          st.status = "completed";
          // keep summary
        }
        // advance planning message occasionally
        setPlanningIdx((p) => Math.min(p + 1, PLANNING_MESSAGES.length - 1));
        const now = Date.now();
        seqRef.current = now;
        setSeqTick(now);
        setElapsed(0);
        return next;
      });
      current++;
      if (current > 20) window.clearInterval(interval);
    }, 1400);

    return () => window.clearInterval(interval);
  }, [usesMock, timedOut]);

  // Graceful timeout: ~12s without newer sequence event
  useEffect(() => {
    if (timedOut) return;
    const start = lastSeq;
    seqRef.current = start;
    setElapsed(0);
    const tick = window.setInterval(() => {
      const now = Date.now();
      const diff = now - seqRef.current;
      setElapsed(diff);
      if (diff >= 12000) {
        setTimedOut(true);
        window.clearInterval(tick);
      }
    }, 250);
    return () => window.clearInterval(tick);
  }, [lastSeq, timedOut]);

  // When external seq changes, keep ref in sync
  useEffect(() => {
    seqRef.current = lastSeq;
  }, [lastSeq]);

  const handleRetry = useCallback(() => {
    // Idempotent: do not reset completed stages, do not show spinner, same correlation concept
    retryCountRef.current += 1;
    setTimedOut(false);
    setElapsed(0);
    const now = Date.now();
    seqRef.current = now;
    setSeqTick(now);
    // keep completed stages, only nudge planning index back one so status feels responsive
    setPlanningIdx((p) => Math.max(0, p - 0));
    onRetry?.();
  }, [onRetry]);

  return (
    <main className={`consultation${expanded ? " is-expanded" : " is-collapsed"}`} role="main" aria-label="Consultation">
      {/* transparent header 72px */}
      <header className="consultation-header" aria-hidden="true">
        <span className="consultation-header-label">Consultation</span>
      </header>

      <div className="consultation-layout">
        <div className="consultation-center">
          {/* Ripple — 96px visual diameter, 192px glow footprint, 3s sinusoid */}
          <div className="ripple-stage" aria-hidden="true">
            {timedOut ? (
              <div className="timeout-dot" data-testid="timeout-dot" aria-hidden="true" />
            ) : (
              <div className="ripple" data-testid="ripple" aria-hidden="true">
                <div className="ripple-glow" />
                <div className="ripple-core" />
              </div>
            )}
          </div>

          {/* Status line — bone 85-90% opacity, centered, polite live region */}
          <p
            className="status-line"
            aria-live="polite"
            aria-atomic="true"
            data-testid="status-line"
            style={{ opacity: timedOut ? 0.72 : 0.88 }}
          >
            {statusLine}
          </p>

          {timedOut && (
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

          {/* Elapsed helper — basic timer mock only (no progress bar) */}
          <span className="sr-only" aria-live="polite">
            {timedOut ? "Consultation paused. You can try again." : `Consulting — ${Math.floor(elapsed / 1000)} seconds`}
          </span>
        </div>

        {/* Lifecycle rail — 320px ledger when expanded, 4px brass edge when collapsed */}
        <aside
          className="lifecycle-rail"
          aria-label="Planning stages"
          data-testid="lifecycle-rail"
          data-expanded={expanded ? "true" : "false"}
        >
          <div className="rail-inner">
            <p className="rail-heading">Progress</p>
            <ol className="rail-list" role="list">
              {stages.map((stage, idx) => {
                const isActive = stage.status === "started" || stage.status === "progressed";
                const isCompleted = stage.status === "completed";
                const isFailed = stage.status === "failed";
                const isQueued = stage.status === "queued";
                return (
                  <li
                    key={stage.key}
                    className={`rail-item rail-item--${stage.status}`}
                    data-testid={`stage-${stage.key}`}
                    data-status={stage.status}
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <div className="rail-item-row">
                      <span className="rail-indicator" aria-hidden="true" data-status={stage.status}>
                        {/* shape: empty ring / breathing dot / sage / clay */}
                        {isQueued && <span className="indicator-ring" />}
                        {isActive && <span className="indicator-breathing" />}
                        {isCompleted && <span className="indicator-sage" />}
                        {isFailed && <span className="indicator-clay" />}
                        {/* timeout replaces all with clay at center dot position is handled separately */}
                      </span>
                      <div className="rail-text">
                        <span className="rail-label">{stage.label}</span>
                        <span className="rail-status-text">{statusText(stage.status)}</span>
                      </div>
                    </div>
                    {stage.summary && (
                      <p className="rail-summary">{stage.summary}</p>
                    )}
                    {isFailed && !stage.summary && (
                      <p className="rail-summary rail-summary--failed">
                        This check will be retried — your plan is still being shaped.
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </div>

      <style>{`
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
          --voyager-clay: #B56F62;
          --voyager-sage: #708A77;
          --voyager-radius-sm: 6px;
          --voyager-radius-md: 12px;
          --voyager-shadow-night-rail: -12px 0 30px rgba(0, 0, 0, .12);
          --voyager-focus-ring: 0 0 0 3px rgba(216, 193, 154, .72);
        }
        * { box-sizing: border-box; }
        .sr-only {
          position: absolute;
          width: 1px; height: 1px;
          padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0,0,0,0);
          white-space: nowrap; border: 0;
        }
        /* Page veil — full ink 100svh */
        .consultation {
          min-height: 100svh;
          background: var(--voyager-ink-0);
          color: var(--voyager-light-ink);
          display: flex;
          flex-direction: column;
          /* subtle velvet: barely perceptible inner softness, no glossy sweep */
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
          /* reserve rail at >=1200px so ripple centers in remaining central area */
        }
        @media (min-width: 1200px) {
          .consultation.is-expanded .consultation-center {
            margin-right: 320px;
          }
        }
        /* Ripple stage — 192px footprint, core 96px */
        .ripple-stage {
          width: 192px;
          height: 192px;
          display: grid;
          place-items: center;
          margin-bottom: 28px;
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
        @keyframes breathe-glow {
          0%, 100% { transform: scale(0.86); opacity: 0.72; }
          50% { transform: scale(1.06); opacity: 0.38; }
        }
        @keyframes breathe-core {
          0%, 100% { transform: scale(0.94); opacity: 0.90; }
          50% { transform: scale(1.04); opacity: 0.62; }
        }
        /* Timeout dot — small solid muted clay, centered in same space */
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
        /* Status line — bone 85-90% centered, generous tracking, comfortable length */
        .status-line {
          font-family: General Sans, Inter, ui-sans-serif, sans-serif;
          font-size: 16px;
          line-height: 25px;
          font-weight: 400;
          color: var(--voyager-light-ink);
          /* opacity via inline style: 0.88 active, 0.72 timeout */
          letter-spacing: 0.02em;
          max-width: 46ch;
          margin: 0;
          text-wrap: balance;
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
        /* Lifecycle rail — 320px ledger, lifted with soft shadow + warm hairline */
        .lifecycle-rail {
          width: 320px;
          flex: 0 0 320px;
          background: var(--voyager-ink-0);
          border-left: 1px solid rgba(242,235,221,0.10);
          box-shadow: var(--voyager-shadow-night-rail);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .rail-inner {
          padding: 28px 28px 32px;
        }
        .rail-heading {
          font-family: General Sans, Inter, ui-sans-serif, sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(242,235,221,0.56);
          margin: 0 0 20px;
        }
        .rail-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .rail-item {
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(242,235,221,0.06);
          animation: rail-settle 520ms cubic-bezier(0.22,1,0.36,1) both;
        }
        .rail-item:last-child { border-bottom: none; }
        @keyframes rail-settle {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .rail-item-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .rail-indicator {
          flex: 0 0 14px;
          width: 14px;
          height: 14px;
          display: grid;
          place-items: center;
          margin-top: 2px;
        }
        .indicator-ring {
          width: 12px; height: 12px;
          border-radius: 999px;
          border: 1.5px solid rgba(242,235,221,0.28);
          display: block;
        }
        .indicator-breathing {
          width: 8px; height: 8px;
          border-radius: 999px;
          background: var(--voyager-brass-2);
          box-shadow: 0 0 10px rgba(216,193,154,0.45);
          animation: dot-breathe 1.9s ease-in-out infinite;
          display: block;
        }
        @keyframes dot-breathe {
          0%,100% { transform: scale(0.9); opacity: 0.85; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        .indicator-sage {
          width: 8px; height: 8px;
          border-radius: 999px;
          background: var(--voyager-sage);
          display: block;
        }
        .indicator-clay {
          width: 8px; height: 8px;
          border-radius: 999px;
          background: var(--voyager-clay);
          display: block;
        }
        .rail-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .rail-label {
          font-family: General Sans, Inter, ui-sans-serif, sans-serif;
          font-size: 14px;
          font-weight: 500;
          line-height: 18px;
          color: rgba(242,235,221,0.88);
        }
        .rail-status-text {
          font-family: General Sans, Inter, ui-sans-serif, sans-serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(242,235,221,0.46);
        }
        .rail-summary {
          margin: 8px 0 0 26px;
          font-family: General Sans, Inter, ui-sans-serif, sans-serif;
          font-size: 13px;
          line-height: 18px;
          color: rgba(242,235,221,0.62);
        }
        .rail-summary--failed {
          color: rgba(242,235,221,0.66);
        }

        /* Collapsed rail outside consultation: 4px brass edge */
        .consultation.is-collapsed .lifecycle-rail,
        .lifecycle-rail[data-expanded="false"] {
          width: 4px !important;
          flex: 0 0 4px !important;
          min-width: 4px;
          overflow: hidden;
          border-left: none;
          background: var(--voyager-brass-1);
          box-shadow: none;
        }
        .consultation.is-collapsed .lifecycle-rail .rail-inner,
        .lifecycle-rail[data-expanded="false"] .rail-inner { display: none; }

        /* Below 1200px the rail is collapsed to its 4px edge (even when expanded logically) */
        @media (max-width: 1199px) {
          .consultation.is-expanded .lifecycle-rail {
            width: 4px;
            flex: 0 0 4px;
            min-width: 4px;
            overflow: hidden;
            border-left: none;
            background: var(--voyager-brass-1);
            box-shadow: none;
          }
          .consultation.is-expanded .lifecycle-rail .rail-inner { display: none; }
          .consultation.is-expanded .consultation-center { margin-right: 0; }
        }
        /* Below 1024px rail removed from layout, info remains via status summary (sr-only + status line) */
        @media (max-width: 1023px) {
          .lifecycle-rail { display: none !important; }
          .consultation-center { padding: 32px 20px 48px; }
          .ripple-stage { width: 160px; height: 160px; }
          .ripple, .ripple-glow { width: 160px; height: 160px; }
          .ripple-core { width: 84px; height: 84px; }
        }

        /* prefers-reduced-motion: static 16px brass dot instead of breath */
        @media (prefers-reduced-motion: reduce) {
          .ripple-glow, .ripple-core, .indicator-breathing { animation: none !important; }
          .ripple-glow { opacity: 0.22; transform: none; }
          .ripple-core {
            width: 16px; height: 16px;
            opacity: 1;
            box-shadow: none;
            background: var(--voyager-brass-1);
          }
          .ripple-stage { width: 96px; height: 96px; }
          .ripple { width: 96px; height: 96px; }
          .rail-item { animation: none; }
        }

        /* No progress bar anywhere — enforce */
        .consultation progress, .consultation [role="progressbar"] { display: none !important; }
      `}</style>
    </main>
  );
}
