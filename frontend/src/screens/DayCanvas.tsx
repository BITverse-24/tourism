import React, { useEffect, useRef, useState } from "react";

// ---------- Types mirroring docs/FINAL_TRIP_PLAN_SCHEMA.md ----------
export type ItemType = "experience" | "meal" | "rest" | "movement";
export interface MovementInfo {
  mode?: string;
  duration?: string;
  estimated_cost?: string;
}
export interface ItineraryItem {
  type: ItemType;
  title: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  description: string;
  movement?: MovementInfo | null;
  estimated_cost?: string | null;
  reason?: string | null;
  flexibility?: "fixed" | "moveable" | "optional" | null;
  imageUrl?: string | null;
}
export interface Day {
  day: number;
  date?: string | null;
  place: string;
  theme?: string | null;
  daily_notes?: string | null;
  items: ItineraryItem[];
}
export interface CostSummary {
  currency?: string;
  estimated_total?: string | number;
  budget_position?: string;
}
export interface PlanSnapshot {
  revision: number;
  state: "draft" | "final";
  days: Day[];
  traveler_profile_reference?: string;
  city_allocations?: { place: string; days?: string; nights?: number }[];
  cost_summary?: CostSummary;
  fit_explanation?: string;
  plan_title?: string;
}

export interface DayCanvasProps {
  plan: PlanSnapshot;
  workflowCompleted?: boolean;
  onSelectItem?: (dayIndex: number, itemIndex: number, item: ItineraryItem) => void;
}

// ---------- Helpers ----------
function formatTimeLabel(item: ItineraryItem): string {
  const s = item.start_time?.trim();
  const e = item.end_time?.trim();
  if (s && e) return `${s} – ${e}`;
  if (s) return s;
  if (e) return `Until ${e}`;
  return "Flexible";
}
function hasTime(item: ItineraryItem): boolean {
  return Boolean(item.start_time || item.end_time);
}
function padDay(n: number): string {
  return String(n).padStart(2, "0");
}

// ---------- Component ----------
export default function DayCanvas({ plan, workflowCompleted = false, onSelectItem }: DayCanvasProps) {
  const [displayPlan, setDisplayPlan] = useState<PlanSnapshot>(plan);
  const [activeDay, setActiveDay] = useState<number>(plan.days[0]?.day ?? 1);
  const dayRefs = useRef<Record<number, HTMLElement | null>>({});
  const isDraft = displayPlan.state === "draft" || (displayPlan.state === "final" && !workflowCompleted);

  const prevRevisionRef = useRef<number>(plan.revision);
  const prevPlanRef = useRef<PlanSnapshot>(plan);
  useEffect(() => {
    if (plan.revision > prevRevisionRef.current) {
      const prevAnchorDay = activeDay;
      const prevAnchorTitle = prevPlanRef.current.days.find((d) => d.day === prevAnchorDay)?.items[0]?.title;
      setDisplayPlan(plan);
      prevRevisionRef.current = plan.revision;
      prevPlanRef.current = plan;
      requestAnimationFrame(() => {
        const targetDay = plan.days.find((d) => d.day === prevAnchorDay) ? prevAnchorDay : plan.days[0]?.day;
        const targetEl = targetDay != null ? dayRefs.current[targetDay] : null;
        if (targetEl) {
          if (prevAnchorTitle) {
            const itemEl = plan.days.find((d) => d.day === targetDay)?.items.find((it) => it.title === prevAnchorTitle);
            if (itemEl) {
              targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
              return;
            }
          }
          targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    } else if (plan.revision === prevRevisionRef.current) {
      setDisplayPlan(plan);
      prevPlanRef.current = plan;
    }
  }, [plan, activeDay]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const id = visible[0].target.getAttribute("id");
          if (id) {
            const dayNum = Number(id.replace("day-", ""));
            if (!Number.isNaN(dayNum)) setActiveDay(dayNum);
          }
        }
      },
      { rootMargin: "-104px 0px -60% 0px", threshold: 0 }
    );
    Object.values(dayRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [displayPlan.days.length]);

  const sortedDays = [...displayPlan.days].sort((a, b) => a.day - b.day);

  return (
    <>
      <style>{`
        .day-canvas {
          width: 92vw;
          max-width: 1400px;
          margin: 0 auto;
          padding: 48px 0 96px 0;
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 64px;
          background: var(--voyager-bone-0);
          color: var(--voyager-ink-1);
        }
        /* sticky vertical timeline */
        .day-canvas__index {
          position: sticky;
          top: 104px;
          align-self: start;
          padding-right: 24px;
          border-right: 1px solid var(--voyager-bone-2);
        }
        .day-canvas__index ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .day-canvas__index a {
          font-family: General Sans, Inter, ui-sans-serif, sans-serif;
          font-size: 11px;
          line-height: 16px;
          font-weight: 600;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: var(--voyager-ink-3);
          text-decoration: none;
          display: block;
          padding: 6px 0;
          transition: color 260ms ease;
        }
        .day-canvas__index a[aria-current="true"] {
          color: var(--voyager-ink-1);
        }
        .day-canvas__index a:hover { color: var(--voyager-ink-2); }
        .day-canvas__feed { min-width: 0; }

        /* day header */
        .day-article {
          scroll-margin-top: 104px;
          margin-bottom: 96px;
          padding-bottom: 8px;
        }
        .day-article:last-child { margin-bottom: 0; }
        .day-label {
          font-family: General Sans, Inter, sans-serif;
          font-size: 11px;
          line-height: 16px;
          font-weight: 600;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: var(--voyager-ink-3);
          margin: 0 0 10px 0;
        }
        .day-subtitle {
          font-family: Fraunces, Georgia, serif;
          font-size: 28px;
          line-height: 34px;
          font-weight: 400;
          font-style: italic;
          color: var(--voyager-ink-1);
          margin: 0 0 20px 0;
        }
        .day-intention {
          font-family: Fraunces, Georgia, serif;
          font-style: italic;
          font-size: 17px;
          line-height: 26px;
          color: var(--voyager-ink-2);
          max-width: 60ch;
          margin: 0 0 36px 0;
          padding-left: 16px;
          border-left: 2px solid var(--voyager-bone-2);
        }
        .day-rule {
          height: 1px;
          background: var(--voyager-bone-2);
          border: none;
          margin: 0 0 8px 0;
        }
        .day-rule--top {
          margin: 0 0 32px 0;
        }

        /* editorial activity blocks */
        .activity-row {
          display: grid;
          grid-template-columns: 96px 1fr;
          gap: 20px;
          padding: 32px 0 28px 0;
          border-top: 1px solid var(--voyager-bone-2);
        }
        .activity-row:first-of-type {
          border-top: 1px solid var(--voyager-bone-2);
        }
        .activity-time {
          font-family: General Sans, Inter, sans-serif;
          font-size: 12px;
          line-height: 18px;
          font-weight: 500;
          letter-spacing: .06em;
          color: var(--voyager-ink-3);
          padding-top: 4px;
          text-transform: uppercase;
        }
        .activity-time time { color: inherit; font-variant-numeric: tabular-nums; }
        .activity-main { min-width: 0; }
        .activity-title {
          font-family: Fraunces, Georgia, serif;
          font-size: 19px;
          line-height: 26px;
          font-weight: 500;
          color: var(--voyager-ink-1);
          margin: 0 0 8px 0;
        }
        .activity-desc {
          font-family: General Sans, Inter, sans-serif;
          font-size: 15px;
          line-height: 24px;
          color: var(--voyager-ink-1);
          margin: 0 0 12px 0;
          max-width: 60ch;
        }
        .activity-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 0 0 14px 0;
        }
        .activity-tag {
          font-family: General Sans, Inter, sans-serif;
          font-size: 10px;
          line-height: 14px;
          font-weight: 600;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: var(--voyager-ink-3);
          background: var(--voyager-bone-1);
          border: 1px solid var(--voyager-bone-2);
          border-radius: 999px;
          padding: 4px 8px;
        }
        .activity-reason {
          margin: 0 0 10px 0;
          padding: 12px 16px;
          background: transparent;
          border-left: 2px solid var(--voyager-brass-2);
          max-width: 60ch;
        }
        .activity-reason__label {
          font-family: General Sans, Inter, sans-serif;
          font-size: 10px;
          line-height: 14px;
          font-weight: 600;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: var(--voyager-ink-3);
          margin: 0 0 6px 0;
        }
        .activity-reason__text {
          font-family: Fraunces, Georgia, serif;
          font-style: italic;
          font-size: 14px;
          line-height: 22px;
          color: var(--voyager-ink-2);
          margin: 0;
        }
        .activity-cost {
          font-family: IBM Plex Mono, ui-monospace, monospace;
          font-size: 12px;
          line-height: 16px;
          color: var(--voyager-ink-3);
          margin: 0;
        }
        .activity-clickable {
          cursor: pointer;
          border-radius: 6px;
          transition: background 160ms ease;
        }
        .activity-clickable:hover { background: rgba(238,230,216,.45); }
        .activity-clickable:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(216,193,154,.42);
        }

        /* rest block editorial - lighter */
        .rest-row .activity-title { color: var(--voyager-ink-2); font-style: italic; }
        .rest-row .activity-desc { color: var(--voyager-ink-2); }

        /* transport connector delicate */
        .transport-connector {
          display: grid;
          grid-template-columns: 96px 1fr;
          gap: 20px;
          padding: 14px 0 14px 0;
        }
        .transport-connector__line {
          position: relative;
          display: flex;
          justify-content: center;
          padding-top: 2px;
        }
        .transport-connector__line::before {
          content: "";
          position: absolute;
          top: -14px;
          bottom: -14px;
          left: 50%;
          width: 1px;
          background: var(--voyager-bone-2);
        }
        .transport-connector__dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: var(--voyager-bone-0);
          border: 1px solid var(--voyager-ink-3);
          position: relative;
          z-index: 1;
        }
        .transport-connector__text {
          font-family: General Sans, Inter, sans-serif;
          font-size: 12px;
          line-height: 18px;
          color: var(--voyager-ink-3);
          letter-spacing: .04em;
        }

        /* day note at end */
        .day-note {
          margin-top: 32px;
          padding: 20px 0 0 0;
          border-top: 1px solid var(--voyager-bone-2);
          max-width: 68ch;
        }
        .day-note__label {
          font-family: General Sans, Inter, sans-serif;
          font-size: 10px;
          line-height: 14px;
          font-weight: 600;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: var(--voyager-ink-3);
          margin: 0 0 8px 0;
        }
        .day-note__text {
          font-family: General Sans, Inter, sans-serif;
          font-size: 14px;
          line-height: 22px;
          color: var(--voyager-ink-2);
          margin: 0;
        }

        /* draft subtle */
        .draft-indicator {
          font-family: General Sans, Inter, sans-serif;
          font-size: 11px;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: var(--voyager-brass-1);
          border: 1px dashed var(--voyager-brass-1);
          border-radius: 999px;
          padding: 4px 10px;
          display: inline-flex;
          margin-bottom: 16px;
        }

        /* summary pills */
        .summary-pill {
          position: fixed;
          left: 50%;
          bottom: 24px;
          transform: translateX(-50%);
          height: 44px;
          padding: 0 20px;
          background: rgba(238,230,216,.92);
          backdrop-filter: blur(8px);
          border: 1px solid var(--voyager-bone-2);
          border-radius: 999px;
          box-shadow: 0 2px 12px rgba(38,41,37,.08);
          display: flex;
          align-items: center;
          gap: 16px;
          z-index: 10;
          white-space: nowrap;
        }
        .summary-pill__item {
          font-family: General Sans, Inter, sans-serif;
          font-size: 12px;
          line-height: 16px;
          color: var(--voyager-ink-2);
        }
        .summary-pill__sep { width: 1px; height: 16px; background: var(--voyager-bone-2); }
        .summary-static {
          display: none;
          border: 1px solid var(--voyager-bone-2);
          border-radius: 12px;
          padding: 14px 16px;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 12px 20px;
          background: var(--voyager-bone-1);
        }

        @media (max-width: 1024px) {
          .day-canvas {
            grid-template-columns: 1fr;
            gap: 32px;
            padding-left: 0;
            padding-right: 0;
          }
          .day-canvas__index {
            position: static;
            border-right: none;
            border-bottom: 1px solid var(--voyager-bone-2);
            padding-right: 0;
            padding-bottom: 12px;
          }
          .day-canvas__index ul {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 8px 20px;
          }
        }
        @media (max-width: 768px) {
          .activity-row {
            grid-template-columns: 72px 1fr;
            gap: 14px;
            padding: 24px 0 20px 0;
          }
          .transport-connector { grid-template-columns: 72px 1fr; gap: 14px; }
          .summary-pill { display: none; }
          .summary-static { display: flex; }
          .day-subtitle { font-size: 22px; line-height: 28px; }
        }
      `}</style>

      <main className="day-canvas">
        <nav className="day-canvas__index" aria-label="Days">
          <ul>
            {sortedDays.map((d) => {
              const label = `Day ${padDay(d.day)} — ${d.place.toUpperCase()}`;
              return (
                <li key={d.day}>
                  <a
                    href={`#day-${d.day}`}
                    aria-current={activeDay === d.day ? "true" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      const el = dayRefs.current[d.day];
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    {label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="day-canvas__feed" role="feed" aria-label="Day by day itinerary">
          <section className="summary-static" aria-label="Trip summary">
            <span className="summary-pill__item">{displayPlan.traveler_profile_reference ?? "Profile"}</span>
            <span className="summary-pill__item">
              {(displayPlan.city_allocations ?? []).map((c) => `${c.place}`).join(" → ") || displayPlan.days.map((d) => d.place).join(" → ")}
            </span>
            <span className="summary-pill__item">{displayPlan.cost_summary?.budget_position ?? ""}</span>
          </section>

          {sortedDays.map((day, dayIdx) => (
            <article
              key={day.day}
              id={`day-${day.day}`}
              ref={(el) => {
                dayRefs.current[day.day] = el;
              }}
              className="day-article"
              aria-labelledby={`day-heading-${day.day}`}
            >
              <p className="day-label" id={`day-heading-${day.day}`}>
                Day {padDay(day.day)} — {day.place.toUpperCase()}
                {day.date ? ` · ${day.date}` : ""}
              </p>
              {day.theme ? <h2 className="day-subtitle">{day.theme}</h2> : null}
              {isDraft ? <span className="draft-indicator">Draft — not yet confirmed</span> : null}
              {day.daily_notes ? <p className="day-intention">{day.daily_notes}</p> : null}
              <hr className="day-rule day-rule--top" />

              {day.items.map((item, idx) => {
                const isRest = item.type === "rest";
                const isMovement = item.type === "movement";

                if (isMovement) {
                  const text =
                    [item.movement?.duration, item.movement?.mode].filter(Boolean).join(" · ") ||
                    item.title ||
                    "Transfer";
                  const cost = item.movement?.estimated_cost ? ` · ${item.movement.estimated_cost}` : "";
                  return (
                    <div key={idx} className="transport-connector" role="note" aria-label="Movement">
                      <div className="transport-connector__line" aria-hidden="true">
                        <span className="transport-connector__dot" />
                      </div>
                      <div className="transport-connector__text">
                        {text}
                        {cost}
                      </div>
                    </div>
                  );
                }

                if (isRest) {
                  const clickable = Boolean(onSelectItem);
                  const Tag = clickable ? "button" : "div";
                  const tagProps = clickable
                    ? {
                        onClick: () => onSelectItem?.(dayIdx, idx, item),
                        "aria-label": `${item.title}, rest`,
                        type: "button" as const,
                        style: { textAlign: "left" as const, width: "100%", font: "inherit", background: "transparent", border: "none", padding: 0 },
                      }
                    : {};
                  return (
                    <div key={idx} className={`activity-row rest-row ${clickable ? "activity-clickable" : ""}`} style={clickable ? { cursor: "pointer" } : undefined}>
                      <div className="activity-time">
                        {hasTime(item) ? <time dateTime={item.start_time ?? undefined}>{formatTimeLabel(item)}</time> : <span>Flexible</span>}
                      </div>
                      {React.createElement(
                        Tag as any,
                        { className: "activity-main", ...(tagProps as any) },
                        <>
                          <h3 className="activity-title">{item.title}</h3>
                          <p className="activity-desc">{item.description}</p>
                          {item.flexibility ? (
                            <div className="activity-meta">
                              <span className="activity-tag">{item.flexibility}</span>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  );
                }

                // experience / meal
                const clickable = Boolean(onSelectItem);
                const Tag = clickable ? "button" : "div";
                const tagProps = clickable
                  ? {
                      onClick: () => onSelectItem?.(dayIdx, idx, item),
                      "aria-label": `${item.title}, ${item.type}`,
                      type: "button" as const,
                      style: { textAlign: "left" as const, width: "100%", font: "inherit", background: "transparent", border: "none", padding: 0, display: "block" },
                    }
                  : {};
                const tags: string[] = [];
                if (item.flexibility) tags.push(item.flexibility);
                if (item.location) tags.push(item.location);

                return (
                  <div
                    key={idx}
                    className={`activity-row ${clickable ? "activity-clickable" : ""}`}
                    style={clickable ? { cursor: "pointer" } : undefined}
                  >
                    <div className="activity-time">
                      {hasTime(item) ? <time dateTime={item.start_time ?? undefined}>{formatTimeLabel(item)}</time> : <span>Flexible</span>}
                    </div>
                    {React.createElement(
                      Tag as any,
                      { className: "activity-main", ...(tagProps as any) },
                      <>
                        <h3 className="activity-title">{item.title}</h3>
                        {tags.length > 0 ? (
                          <div className="activity-meta">
                            {tags.map((t) => (
                              <span key={t} className="activity-tag">
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <p className="activity-desc">{item.description}</p>
                        {item.reason ? (
                          <div className="activity-reason">
                            <p className="activity-reason__label">Why this fits you</p>
                            <p className="activity-reason__text">{item.reason}</p>
                          </div>
                        ) : null}
                        {item.estimated_cost ? <p className="activity-cost">{item.estimated_cost}</p> : null}
                      </>
                    )}
                    {item.movement && (item.movement.mode || item.movement.duration || item.movement.estimated_cost) ? (
                      <div style={{ gridColumn: "2", marginTop: 16 }}>
                        <div className="transport-connector" style={{ padding: "8px 0 0 0" }} aria-label="Movement connector">
                          <div className="transport-connector__line" aria-hidden="true" style={{ display: "none" }} />
                          <span className="transport-connector__text" style={{ fontSize: 11, letterSpacing: ".06em" }}>
                            {[item.movement.duration, item.movement.mode].filter(Boolean).join(" · ")}
                            {item.movement.estimated_cost ? ` · ${item.movement.estimated_cost}` : ""}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {/* DAY NOTE at end */}
              {day.daily_notes ? (
                <div className="day-note">
                  <p className="day-note__label">Day note</p>
                  <p className="day-note__text">{day.daily_notes}</p>
                </div>
              ) : (
                <div className="day-note" style={{ opacity: 0.85 }}>
                  <p className="day-note__label">Day note</p>
                  <p className="day-note__text">Keep this day unhurried — allow time between moments.</p>
                </div>
              )}
            </article>
          ))}
        </div>
      </main>

      <div className="summary-pill" role="status" aria-label="Trip summary">
        <span className="summary-pill__item">{displayPlan.traveler_profile_reference ?? "Trip"}</span>
        <span className="summary-pill__sep" aria-hidden="true" />
        <span className="summary-pill__item">
          {(displayPlan.city_allocations ?? []).map((c) => `${c.place}`).join(" → ") || displayPlan.days.map((d) => d.place).join(" → ")}
        </span>
        <span className="summary-pill__sep" aria-hidden="true" />
        <span className="summary-pill__item">{displayPlan.cost_summary?.budget_position ?? ""}</span>
      </div>
    </>
  );
}
