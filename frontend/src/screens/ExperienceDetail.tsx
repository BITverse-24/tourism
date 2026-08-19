import React, { useEffect, useRef, useState } from "react";
import type { ItineraryItem } from "./DayCanvas";

export interface ExperienceDetailProps {
  open: boolean;
  item: ItineraryItem | null;
  fitExplanation?: string | null;
  onClose: () => void;
  returnFocusRef?: React.RefObject<HTMLElement>;
}

export default function ExperienceDetail({ open, item, fitExplanation, onClose, returnFocusRef }: ExperienceDetailProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [pointerDownOutside, setPointerDownOutside] = useState(false);
  const savedScrollY = useRef<number>(0);
  const savedBodyOverflow = useRef<string>("");

  useEffect(() => {
    if (!open) return;
    savedScrollY.current = window.scrollY;
    savedBodyOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const mains = document.querySelectorAll("main");
    mains.forEach((m) => {
      if (!overlayRef.current?.contains(m)) m.setAttribute("inert", "");
    });
    const t = setTimeout(() => headingRef.current?.focus(), 320);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = savedBodyOverflow.current;
      mains.forEach((m) => m.removeAttribute("inert"));
      window.scrollTo(0, savedScrollY.current);
      if (returnFocusRef?.current) returnFocusRef.current.focus();
    };
  }, [open, returnFocusRef]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab" && overlayRef.current) {
        const focusables = overlayRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !item) return null;

  const isRest = item.type === "rest";
  const timeLabel = item.start_time || item.end_time ? `${item.start_time ?? ""}${item.start_time && item.end_time ? " – " : ""}${item.end_time ?? ""}`.trim() : "";
  const insetText = item.reason || fitExplanation || null;
  const flexibilityLabel = item.flexibility ? item.flexibility.toUpperCase() : null;

  const handleOverlayPointerDown = (e: React.PointerEvent) => {
    if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
      setPointerDownOutside(true);
    } else {
      setPointerDownOutside(false);
    }
  };
  const handleOverlayPointerUp = (e: React.PointerEvent) => {
    if (pointerDownOutside && cardRef.current && !cardRef.current.contains(e.target as Node)) {
      onClose();
    }
    setPointerDownOutside(false);
  };

  const typeLabel = item.type.toUpperCase();

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-heading"
      onPointerDown={handleOverlayPointerDown}
      onPointerUp={handleOverlayPointerUp}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "var(--voyager-bone-0, #F7F2E9)",
        overflowY: "auto",
        paddingBottom: "88px",
      }}
    >
      <style>{`
        .detail-toprule {
          width: 92vw;
          max-width: 720px;
          margin: 0 auto;
          padding-top: 40px;
        }
        .detail-toprule hr {
          border: none;
          height: 1px;
          background: var(--voyager-bone-2);
          margin: 0;
        }
        .detail-close-row {
          width: 92vw;
          max-width: 720px;
          margin: 0 auto;
          padding: 28px 0 12px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }
        .detail-eyebrow {
          font-family: General Sans, Inter, sans-serif;
          font-size: 10px;
          line-height: 14px;
          font-weight: 600;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: var(--voyager-ink-3);
          margin: 0;
        }
        .detail-close {
          min-height: 36px;
          padding: 0 16px;
          border-radius: 999px;
          border: 1px solid var(--voyager-bone-3);
          background: transparent;
          color: var(--voyager-ink-2);
          font-family: General Sans, Inter, sans-serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: .06em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .detail-close:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(216,193,154,.42);
        }
        .detail-column {
          width: 92vw;
          max-width: 720px;
          margin: 0 auto;
          padding: 24px 0 48px 0;
        }
        .detail-title {
          font-family: Fraunces, Georgia, serif;
          font-size: 36px;
          line-height: 40px;
          font-weight: 400;
          letter-spacing: -0.02em;
          color: var(--voyager-ink-1);
          margin: 0 0 12px 0;
        }
        .detail-meta {
          font-family: General Sans, Inter, sans-serif;
          font-size: 11px;
          line-height: 16px;
          font-weight: 600;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: var(--voyager-ink-3);
          margin: 0 0 20px 0;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .detail-meta__tag {
          background: var(--voyager-bone-1);
          border: 1px solid var(--voyager-bone-2);
          border-radius: 999px;
          padding: 4px 10px;
        }
        .detail-rule {
          border: none;
          height: 1px;
          background: var(--voyager-bone-2);
          margin: 24px 0 28px 0;
        }
        .detail-desc {
          font-family: General Sans, Inter, sans-serif;
          font-size: 16px;
          line-height: 26px;
          color: var(--voyager-ink-1);
          margin: 0 0 28px 0;
          max-width: 60ch;
        }
        .detail-inset {
          border-left: 2px solid var(--voyager-brass-2);
          padding: 14px 18px;
          margin: 0 0 24px 0;
          max-width: 60ch;
        }
        .detail-inset__label {
          font-family: General Sans, Inter, sans-serif;
          font-size: 10px;
          line-height: 14px;
          font-weight: 600;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: var(--voyager-ink-3);
          margin: 0 0 8px 0;
        }
        .detail-inset__text {
          font-family: Fraunces, Georgia, serif;
          font-style: italic;
          font-size: 15px;
          line-height: 24px;
          color: var(--voyager-ink-2);
          margin: 0;
        }
        .detail-faint {
          font-family: General Sans, Inter, sans-serif;
          font-size: 12px;
          line-height: 18px;
          color: var(--voyager-ink-3);
          margin: 0 0 8px 0;
          letter-spacing: .04em;
        }
        .detail-ledge {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          min-height: 56px;
          background: rgba(247,242,233,.96);
          backdrop-filter: blur(8px);
          border-top: 1px solid var(--voyager-bone-2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 10px 24px;
          z-index: 2;
          flex-wrap: wrap;
        }
        .detail-caption {
          font-family: General Sans, Inter, sans-serif;
          font-size: 11px;
          line-height: 16px;
          color: var(--voyager-ink-3);
          letter-spacing: .02em;
        }
        @media (max-width: 768px) {
          .detail-title { font-size: 28px; line-height: 32px; }
          .detail-column { padding-top: 16px; }
          .detail-toprule { padding-top: 24px; }
        }
      `}</style>

      <div className="detail-toprule" aria-hidden="true">
        <hr />
      </div>

      <div className="detail-close-row">
        <p className="detail-eyebrow">{typeLabel}{item.location ? ` · ${item.location}` : ""}</p>
        <button ref={closeBtnRef} type="button" className="detail-close" onClick={onClose} aria-label="Close">
          Close
        </button>
      </div>

      <div className="detail-column">
        <div ref={cardRef}>
          <h1 id="detail-heading" ref={headingRef} tabIndex={-1} className="detail-title">
            {item.title}
          </h1>

          <div className="detail-meta" aria-label="Details">
            {timeLabel ? <span className="detail-meta__tag">{timeLabel}</span> : <span className="detail-meta__tag">Flexible</span>}
            {flexibilityLabel ? <span className="detail-meta__tag">{flexibilityLabel}</span> : null}
            {isRest ? null : <span className="detail-meta__tag">{item.type}</span>}
          </div>

          <hr className="detail-rule" />

          <p className="detail-desc">{item.description}</p>

          {insetText ? (
            <div className="detail-inset">
              <p className="detail-inset__label">Why this fits you</p>
              <p className="detail-inset__text">{insetText}</p>
            </div>
          ) : null}

          {item.movement && (item.movement.mode || item.movement.duration) ? (
            <p className="detail-faint">
              {[item.movement.duration, item.movement.mode].filter(Boolean).join(" · ")}
              {item.movement.estimated_cost ? ` · ${item.movement.estimated_cost}` : ""}
            </p>
          ) : null}
          {item.estimated_cost ? <p className="detail-faint">{item.estimated_cost}</p> : null}
        </div>
      </div>

      <div className="detail-ledge" role="toolbar" aria-label="Detail actions">
        <button type="button" className="detail-close" onClick={onClose} aria-label="Close dismissal">
          Close
        </button>
        <span className="detail-caption">Want something different? You can request changes from Profile review</span>
        <span className="detail-caption" style={{ opacity: 0.9 }}>
          Replanning will be available in a later phase — for now, use Profile review to adjust your trip.
        </span>
      </div>
    </div>
  );
}
