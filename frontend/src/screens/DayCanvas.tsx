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
  /** whether workflow.completed has been observed (required with state:final to remove draft badge) */
  workflowCompleted?: boolean;
  /** called when a card is activated for detail */
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

// ---------- Component ----------
export default function DayCanvas({ plan, workflowCompleted = false, onSelectItem }: DayCanvasProps) {
  const [displayPlan, setDisplayPlan] = useState<PlanSnapshot>(plan);
  const [activeDay, setActiveDay] = useState<number>(plan.days[0]?.day ?? 1);
  const dayRefs = useRef<Record<number, HTMLElement | null>>({});
  const isDraft = displayPlan.state === "draft" || (displayPlan.state === "final" && !workflowCompleted);

  // Snapshot replacement guard: only when revision is newer
  const prevRevisionRef = useRef<number>(plan.revision);
  const prevPlanRef = useRef<PlanSnapshot>(plan);
  useEffect(() => {
    if (plan.revision > prevRevisionRef.current) {
      // preserve scroll anchor by day number + item title when draft newer
      const prevAnchorDay = activeDay;
      const prevAnchorTitle = prevPlanRef.current.days.find((d) => d.day === prevAnchorDay)?.items[0]?.title;
      setDisplayPlan(plan);
      prevRevisionRef.current = plan.revision;
      prevPlanRef.current = plan;
      // attempt to preserve anchor
      requestAnimationFrame(() => {
        const targetDay = plan.days.find((d) => d.day === prevAnchorDay) ? prevAnchorDay : plan.days[0]?.day;
        const targetEl = targetDay != null ? dayRefs.current[targetDay] : null;
        if (targetEl) {
          // try item title anchor
          if (prevAnchorTitle) {
            const itemEl = plan.days
              .find((d) => d.day === targetDay)
              ?.items.find((it) => it.title === prevAnchorTitle);
            if (itemEl) {
              targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
              return;
            }
          }
          targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    } else if (plan.revision === prevRevisionRef.current) {
      // same revision: allow finalization transition
      setDisplayPlan(plan);
      prevPlanRef.current = plan;
    }
  }, [plan, activeDay]);

  // Intersection observer for active day highlight (calm settle via css transition)
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
        :root {
          --voyager-bone-0: #F7F2E9;
          --voyager-bone-1: #EEE6D8;
          --voyager-bone-2: #E1D6C5;
          --voyager-bone-3: #C9BBA5;
          --voyager-ink-0: #1B252C;
          --voyager-ink-1: #263239;
          --voyager-ink-2: #56636A;
          --voyager-ink-3: #7D878A;
          --voyager-brass-1: #B38A55;
          --voyager-brass-2: #D8C19A;
          --voyager-shadow-card: 0 1px 2px rgba(38,41,37,.08), 0 12px 28px rgba(38,41,37,.08);
          --voyager-shadow-float: 0 2px 5px rgba(38,41,37,.10), 0 20px 44px rgba(38,41,37,.12);
          --voyager-radius-md: 12px;
        }
        .day-canvas {
          max-width: 1240px;
          margin: 0 auto;
          padding: 48px 0 96px 0;
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 64px;
          background: var(--voyager-bone-0);
          color: var(--voyager-ink-1);
        }
        .day-canvas__index {
          position: sticky;
          top: 104px;
          align-self: start;
          border-right: 1px solid var(--voyager-bone-2);
          padding-right: 24px;
        }
        .day-canvas__index ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .day-canvas__index a {
          font-family: General Sans, Inter, ui-sans-serif, sans-serif;
          font-size: 13px;
          line-height: 18px;
          font-weight: 500;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: var(--voyager-ink-3);
          text-decoration: none;
          display: block;
          padding: 8px 0;
          transition: color 300ms ease, font-weight 300ms ease;
        }
        .day-canvas__index a[aria-current="true"] {
          color: var(--voyager-brass-1);
          font-weight: 700;
        }
        .day-canvas__feed {
          min-width: 0;
        }
        .day-article {
          scroll-margin-top: 104px;
          margin-bottom: 96px;
        }
        .day-article:last-child { margin-bottom: 0; }
        .day-header {
          font-family: Fraunces, Georgia, serif;
          font-size: 22px;
          line-height: 30px;
          font-weight: 500;
          color: var(--voyager-ink-1);
          margin: 0 0 12px 0;
        }
        .day-theme {
          font-family: Fraunces, Georgia, serif;
          font-style: italic;
          font-size: 16px;
          line-height: 25px;
          color: var(--voyager-ink-2);
          max-width: 56ch;
          margin: 0 0 12px 0;
        }
        .day-notes {
          font-family: General Sans, Inter, sans-serif;
          font-size: 16px;
          line-height: 25px;
          color: var(--voyager-ink-3);
          margin: 0 0 32px 0;
          max-width: 60ch;
        }
        .item-row {
          display: grid;
          grid-template-columns: 96px 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }
        .item-row:last-child { margin-bottom: 0; }
        .item-time {
          font-family: General Sans, Inter, sans-serif;
          font-size: 13px;
          line-height: 18px;
          font-weight: 500;
          letter-spacing: .04em;
          color: var(--voyager-ink-3);
          padding-top: 18px;
          text-align: left;
        }
        .item-time time { color: inherit; }
        .card {
          position: relative;
          background: var(--voyager-bone-1);
          border: 1px solid var(--voyager-bone-2);
          border-radius: var(--voyager-radius-md);
          box-shadow: var(--voyager-shadow-card);
          padding: 24px;
          overflow: visible;
        }
        .card--draft {
          border: 1px dashed var(--voyager-brass-1);
        }
        .card__badge {
          position: absolute;
          top: -10px;
          right: -8px;
          background: var(--voyager-bone-1);
          border: 1px solid var(--voyager-brass-1);
          border-radius: 999px;
          padding: 4px 10px;
          font-family: General Sans, Inter, sans-serif;
          font-size: 12px;
          line-height: 17px;
          font-weight: 500;
          color: var(--voyager-ink-2);
          white-space: nowrap;
        }
        .card__title {
          font-family: Fraunces, Georgia, serif;
          font-size: 18px;
          line-height: 26px;
          font-weight: 500;
          color: var(--voyager-ink-1);
          margin: 0 0 6px 0;
        }
        .card__meta {
          font-family: General Sans, Inter, sans-serif;
          font-size: 13px;
          line-height: 18px;
          color: var(--voyager-ink-3);
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: .08em;
        }
        .card__meta span + span::before { content: " · "; }
        .card__desc {
          font-family: General Sans, Inter, sans-serif;
          font-size: 16px;
          line-height: 25px;
          color: var(--voyager-ink-1);
          margin: 0 0 8px 0;
        }
        .card__reason {
          font-family: General Sans, Inter, sans-serif;
          font-size: 14px;
          line-height: 20px;
          color: var(--voyager-ink-2);
          margin: 0 0 6px 0;
        }
        .card__cost {
          font-family: IBM Plex Mono, ui-monospace, monospace;
          font-size: 12px;
          line-height: 18px;
          color: var(--voyager-ink-3);
          margin: 0;
        }
        .card__image {
          width: 100%;
          aspect-ratio: 4 / 3;
          object-fit: cover;
          border-radius: 8px;
          display: block;
          margin-bottom: 12px;
          background: var(--voyager-bone-2);
        }
        .card__image--meal { aspect-ratio: 4 / 5; }
        .card__image--skeleton {
          background: var(--voyager-bone-2);
        }
        .card--clickable { cursor: pointer; }
        .card--clickable:focus-visible {
          outline: none;
          box-shadow: var(--voyager-shadow-card), 0 0 0 3px rgba(216,193,154,.72);
        }
        .movement-connector {
          margin-left: 0;
          padding: 12px 16px 12px 20px;
          border-left: 2px solid var(--voyager-bone-2);
          margin-top: 12px;
          display: flex;
          gap: 8px;
          align-items: center;
          color: var(--voyager-ink-3);
          font-family: General Sans, Inter, sans-serif;
          font-size: 13px;
          line-height: 18px;
        }
        .movement-connector svg { flex-shrink: 0; }
        .rest-block {
          background: var(--voyager-bone-1);
          border: 1px solid var(--voyager-bone-2);
          border-radius: var(--voyager-radius-md);
          padding: 32px 24px;
          min-height: 96px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 6px;
        }
        .rest-block__title {
          font-family: General Sans, Inter, sans-serif;
          font-size: 16px;
          line-height: 25px;
          color: var(--voyager-ink-2);
          margin: 0;
        }
        .rest-block__desc {
          font-family: General Sans, Inter, sans-serif;
          font-size: 14px;
          line-height: 20px;
          color: var(--voyager-ink-3);
          margin: 0;
        }
        /* floating pill */
        .summary-pill {
          position: fixed;
          left: 50%;
          bottom: 24px;
          transform: translateX(-50%);
          height: 56px;
          padding: 16px 24px;
          background: rgba(238,230,216,.88);
          backdrop-filter: blur(8px);
          border: 1px solid var(--voyager-bone-2);
          border-radius: 999px;
          box-shadow: var(--voyager-shadow-float);
          display: flex;
          align-items: center;
          gap: 24px;
          z-index: 10;
          white-space: nowrap;
        }
        .summary-pill__item {
          font-family: General Sans, Inter, sans-serif;
          font-size: 13px;
          line-height: 18px;
          color: var(--voyager-ink-2);
        }
        .summary-pill__sep { width: 1px; height: 20px; background: var(--voyager-bone-2); }
        .summary-static {
          display: none;
          background: var(--voyager-bone-1);
          border: 1px solid var(--voyager-bone-2);
          border-radius: var(--voyager-radius-md);
          padding: 16px 24px;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 16px 24px;
        }
        @media (max-width: 1024px) {
          .day-canvas {
            grid-template-columns: 1fr;
            gap: 32px;
            padding-left: 16px;
            padding-right: 16px;
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
          .item-row { grid-template-columns: 72px 1fr; }
          .summary-pill { display: none; }
          .summary-static { display: flex; }
        }
        @media (max-width: 320px) {
          .card { padding: 16px; }
        }
      `}</style>

      <main className="day-canvas">
        {/* Index - semantic navigation list of anchors */}
        <nav className="day-canvas__index" aria-label="Days">
          <ul>
            {sortedDays.map((d) => {
              const label = d.theme ? `Day ${d.day} · ${d.place}` : `Day ${d.day} · ${d.place}`;
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

        {/* Timeline feed */}
        <div className="day-canvas__feed" role="feed" aria-label="Day by day itinerary">
          {/* static summary below 768 */}
          <section className="summary-static" aria-label="Trip summary">
            <span className="summary-pill__item">{displayPlan.traveler_profile_reference ?? "Profile"}</span>
            <span className="summary-pill__item">
              {(displayPlan.city_allocations ?? []).map((c) => `${c.place} ${c.days ?? ""}`).join(" · ") || displayPlan.days.map((d) => d.place).join(" → ")}
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
              <h2 id={`day-heading-${day.day}`} className="day-header">
                Day {day.day} · {day.place}
                {day.date ? ` · ${day.date}` : ""}
              </h2>
              {day.theme ? <p className="day-theme">{day.theme}</p> : null}
              {day.daily_notes ? <p className="day-notes">{day.daily_notes}</p> : null}

              {day.items.map((item, idx) => {
                const isRest = item.type === "rest";
                const isMovement = item.type === "movement";
                const isCard = item.type === "experience" || item.type === "meal";
                // movement is rendered as connector after previous item; if standalone movement item, render connector alone
                if (isMovement) {
                  return (
                    <div key={idx} className="item-row">
                      <div className="item-time" aria-hidden="true" />
                      <div className="movement-connector" role="note" aria-label="Movement">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M8 2v12M3 7l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>
                          {[item.movement?.mode, item.movement?.duration].filter(Boolean).join(" · ")}
                          {item.movement?.estimated_cost ? ` · ${item.movement.estimated_cost}` : ""}
                          {!item.movement?.mode && !item.movement?.duration ? item.title : ""}
                        </span>
                      </div>
                    </div>
                  );
                }
                if (isRest) {
                  return (
                    <article key={idx} className="item-row" aria-label={`Rest: ${item.title}`}>
                      <div className="item-time">
                        {hasTime(item) ? (
                          <time dateTime={item.start_time ?? undefined}>{formatTimeLabel(item)}</time>
                        ) : (
                          <span>Flexible</span>
                        )}
                      </div>
                      <div className="rest-block">
                        <p className="rest-block__title">{item.title}</p>
                        <p className="rest-block__desc">{item.description}</p>
                        {item.flexibility ? <span className="card__meta">{item.flexibility}</span> : null}
                      </div>
                    </article>
                  );
                }
                // experience / meal card
                const clickable = Boolean(onSelectItem);
                const showDraftBadge = isDraft;
                const CardTag = clickable ? "button" : "div";
                return (
                  <article key={idx} className="item-row">
                    <div className="item-time">
                      {hasTime(item) ? (
                        <time dateTime={item.start_time ?? undefined}>{formatTimeLabel(item)}</time>
                      ) : item.end_time ? (
                        <span>Until {item.end_time}</span>
                      ) : (
                        <span>Flexible</span>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {/* card */}
                      {React.createElement(
                        CardTag as any,
                        {
                          className: `card ${showDraftBadge ? "card--draft" : ""} ${clickable ? "card--clickable" : ""}`,
                          ...(clickable
                            ? {
                                onClick: () => onSelectItem?.(dayIdx, idx, item),
                                "aria-label": `${item.title}, ${item.type}`,
                                type: "button" as const,
                                style: {
                                  textAlign: "left" as const,
                                  width: "100%",
                                  font: "inherit",
                                },
                              }
                            : {}),
                        },
                        <>
                          {showDraftBadge ? (
                            <span className="card__badge">Draft — not yet confirmed</span>
                          ) : null}
                          {item.imageUrl ? (
                            <img
                              className={`card__image ${item.type === "meal" ? "card__image--meal" : ""}`}
                              src={item.imageUrl}
                              alt=""
                              loading="lazy"
                              style={{ transition: "opacity 250ms ease" }}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div
                              className={`card__image card__image--skeleton ${item.type === "meal" ? "card__image--meal" : ""}`}
                              aria-hidden="true"
                            />
                          )}
                          <h3 className="card__title">{item.title}</h3>
                          {(item.location || item.flexibility) && (
                            <p className="card__meta">
                              {item.location ? <span>{item.location}</span> : null}
                              {item.flexibility ? <span>{item.flexibility}</span> : null}
                            </p>
                          )}
                          <p className="card__desc">{item.description}</p>
                          {item.reason ? <p className="card__reason">{item.reason}</p> : null}
                          {item.estimated_cost ? <p className="card__cost">{item.estimated_cost}</p> : null}
                        </>
                      )}
                      {item.movement && (item.movement.mode || item.movement.duration || item.movement.estimated_cost) ? (
                        <div className="movement-connector" role="note" aria-label={`Movement: ${item.movement.mode ?? ""}`}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M2 8h12M8 2v12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                            <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
                          </svg>
                          <span>
                            {[item.movement.mode, item.movement.duration].filter(Boolean).join(" · ")}
                            {item.movement.estimated_cost ? ` · ${item.movement.estimated_cost}` : ""}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </article>
          ))}
        </div>
      </main>

      {/* floating pill - fixed above 768 */}
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
