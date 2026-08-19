import React, { useEffect, useRef, useState } from "react";
import type { ItineraryItem } from "./DayCanvas";

export interface ExperienceDetailProps {
  open: boolean;
  item: ItineraryItem | null;
  /** plan-level fit explanation fallback for inset */
  fitExplanation?: string | null;
  onClose: () => void;
  /** element to restore focus to */
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

  // Save scroll and make underlying inert
  useEffect(() => {
    if (!open) return;
    savedScrollY.current = window.scrollY;
    savedBodyOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // inert underlying: set inert on main siblings
    const mains = document.querySelectorAll("main");
    mains.forEach((m) => {
      if (!overlayRef.current?.contains(m)) m.setAttribute("inert", "");
    });
    // focus heading after morph
    const t = setTimeout(() => headingRef.current?.focus(), 320);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = savedBodyOverflow.current;
      mains.forEach((m) => m.removeAttribute("inert"));
      window.scrollTo(0, savedScrollY.current);
      // restore focus
      if (returnFocusRef?.current) returnFocusRef.current.focus();
    };
  }, [open, returnFocusRef]);

  // Escape dismiss + focus trap
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
  const metadataParts: string[] = [];
  if (item.location) metadataParts.push(item.location);
  const timeLabel = item.start_time || item.end_time ? `${item.start_time ?? ""}${item.start_time && item.end_time ? " – " : ""}${item.end_time ?? ""}`.trim() : "";
  if (timeLabel) metadataParts.push(timeLabel);
  if (item.flexibility) metadataParts.push(item.flexibility);

  const insetText = item.reason || fitExplanation || null;
  // image alt: decorative if no description? Use item title as alt when informative
  const hasImage = Boolean(item.imageUrl) && !isRest;

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
        // bottom padding equal to ledge height +24 (ledge ~56px)
        paddingBottom: "80px",
      }}
    >
      <style>{`
        :root {
          --voyager-bone-0: #F7F2E9;
          --voyager-bone-1: #EEE6D8;
          --voyager-bone-2: #E1D6C5;
          --voyager-ink-1: #263239;
          --voyager-ink-2: #56636A;
          --voyager-ink-3: #7D878A;
          --voyager-brass-1: #B38A55;
          --voyager-shadow-float: 0 2px 5px rgba(38,41,37,.10), 0 20px 44px rgba(38,41,37,.12);
          --voyager-radius-md: 12px;
        }
        .detail-hero {
          width: 100%;
          height: 40vh;
          min-height: 360px;
          max-height: 560px;
          object-fit: cover;
          display: block;
          background: var(--voyager-bone-2);
        }
        .detail-hero--skeleton {
          width: 100%;
          height: 40vh;
          min-height: 360px;
          max-height: 560px;
          background: var(--voyager-bone-2);
        }
        .detail-column {
          width: min(800px, calc(100vw - 48px));
          margin: 0 auto;
        }
        .detail-card {
          background: var(--voyager-bone-1);
          border-radius: var(--voyager-radius-md);
          box-shadow: var(--voyager-shadow-float);
          margin-top: -32px;
          position: relative;
          padding: 48px 48px 64px 48px;
        }
        .detail-title {
          font-family: Fraunces, Georgia, serif;
          font-size: 28px;
          line-height: 36px;
          font-weight: 500;
          color: var(--voyager-ink-1);
          margin: 0 0 8px 0;
        }
        .detail-meta {
          font-family: General Sans, Inter, sans-serif;
          font-size: 14px;
          line-height: 20px;
          color: var(--voyager-ink-3);
          margin: 0 0 24px 0;
        }
        .detail-desc {
          font-family: General Sans, Inter, sans-serif;
          font-size: 16px;
          line-height: 25px;
          color: var(--voyager-ink-1);
          margin: 0 0 32px 0;
        }
        .detail-inset {
          background: var(--voyager-bone-0);
          border-left: 4px solid var(--voyager-brass-1);
          border-radius: 6px;
          padding: 20px 24px;
          margin: 0 0 24px 0;
          font-family: Fraunces, Georgia, serif;
          font-style: italic;
          font-size: 16px;
          line-height: 25px;
          color: var(--voyager-ink-1);
        }
        .detail-cost, .detail-movement {
          font-family: General Sans, Inter, sans-serif;
          font-size: 13px;
          line-height: 18px;
          color: var(--voyager-ink-3);
          margin: 0 0 8px 0;
        }
        .detail-ledge {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 56px;
          background: rgba(247,242,233,.92);
          backdrop-filter: blur(8px);
          border-top: 1px solid var(--voyager-bone-2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 0 24px;
          z-index: 2;
        }
        .detail-close {
          min-height: 44px;
          padding: 0 24px;
          border-radius: 12px;
          border: 1px solid var(--voyager-ink-2);
          background: transparent;
          color: var(--voyager-ink-1);
          font-family: General Sans, Inter, sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }
        .detail-close:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(216,193,154,.72);
        }
        .detail-caption {
          font-family: General Sans, Inter, sans-serif;
          font-size: 12px;
          line-height: 17px;
          color: var(--voyager-ink-3);
        }
        @media (max-width: 768px) {
          .detail-hero, .detail-hero--skeleton { height: 280px; min-height: 280px; max-height: 280px; }
          .detail-card { margin-top: -16px; padding: 24px 24px 32px 24px; }
        }
      `}</style>

      {/* Hero */}
      {hasImage ? (
        <img
          className="detail-hero"
          src={item.imageUrl as string}
          alt={item.title}
          style={{ transition: "opacity 250ms ease" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="detail-hero--skeleton" aria-hidden="true" />
      )}

      {/* Content card */}
      <div className="detail-column">
        <div ref={cardRef} className="detail-card">
          <h1 id="detail-heading" ref={headingRef} tabIndex={-1} className="detail-title">
            {item.title}
          </h1>
          {metadataParts.length > 0 ? <p className="detail-meta">{metadataParts.join(" · ")}</p> : null}
          <p className="detail-desc">{item.description}</p>
          {insetText ? <div className="detail-inset">{insetText}</div> : null}
          {item.movement && (item.movement.mode || item.movement.duration) ? (
            <p className="detail-movement">
              {[item.movement.mode, item.movement.duration].filter(Boolean).join(" · ")}
              {item.movement.estimated_cost ? ` · ${item.movement.estimated_cost}` : ""}
            </p>
          ) : null}
          {item.estimated_cost ? <p className="detail-cost">{item.estimated_cost}</p> : null}
        </div>
      </div>

      {/* Sticky action ledge outside card */}
      <div className="detail-ledge" role="toolbar" aria-label="Detail actions">
        <button ref={closeBtnRef} type="button" className="detail-close" onClick={onClose} aria-label="Close">
          Close
        </button>
        <span className="detail-caption">Want something different? You can request changes from Profile review</span>
        {/* inert replanning caption per scope guard - no button semantics */}
        <span className="detail-caption" style={{ marginLeft: 8 }}>
          Replanning will be available in a later phase — for now, use Profile review to adjust your trip.
        </span>
      </div>
    </div>
  );
}
