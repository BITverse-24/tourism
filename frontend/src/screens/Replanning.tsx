import React from "react";

/**
 * Replanning — Deferred (Reserved for a Later Phase)
 * Scope guard: This module is intentionally inert in the initial product.
 * Do not render a Replan button, change-type chooser, disruption modal,
 * sticky replanning banner, or replan.request command.
 * See design/replanning.md Implementation Contract — Scope Guard.
 */

export const REPLANNING_ENABLED = false as const;
export const REPLANNING_INERT_CAPTION =
  "Replanning will be available in a later phase — for now, use Profile review to adjust your trip.";

/**
 * Inert caption — the only allowed replanning affordance in v1.
 * Must not have button semantics, hover styling, or click handler.
 */
export function ReplanningCaption({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <p
      className={className}
      style={{
        fontFamily: "General Sans, Inter, ui-sans-serif, sans-serif",
        fontSize: "12px",
        lineHeight: "17px",
        color: "var(--voyager-ink-3, #7D878A)",
        margin: 0,
        ...style,
      }}
    >
      {REPLANNING_INERT_CAPTION}
    </p>
  );
}

/**
 * Guard helper — any attempted replan.request must be blocked client-side.
 * Returns false always; caller must never send the command.
 */
export function guardReplanRequest(): false {
  // Intentionally no network call, no state mutation.
  // Server treats disruption submission as invalid at this stage.
  return false;
}

/**
 * Default export is the inert caption for convenient import.
 * No modal, banner, or button is rendered.
 */
export default function Replanning() {
  return <ReplanningCaption />;
}
