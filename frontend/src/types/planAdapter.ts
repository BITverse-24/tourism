/**
 * Plan adapter — bridges FinalTripPlan wire shape to the app's FinalPlan type.
 *
 * Handles real backend variance:
 *  - accommodation / movement cost aliases (cost vs estimated_cost)
 *  - city_allocations.days as number | string (schema allows range)
 *  - movement as Record<string,unknown> vs typed
 *  - image vs imageUrl (display-only, not contract)
 *  - estimated_total as number vs string
 *  - fit_explanation as string | string[]
 *  - missing optional trip_dates / accommodation
 *
 * Pure, no side effects. Used by TripOverview and DayCanvas so both screens
 * see the same canonical shape instead of a lossy PlanSnapshot.
 */
import type { FinalPlan, PlanItem } from './index'

export type PlanState = 'draft' | 'final'

export interface NormalizedPlanSnapshot {
  revision: number
  state: PlanState
  plan: FinalPlan
}

function asString(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim().length > 0) return v.trim()
  return undefined
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/,/g, ''))
    if (Number.isFinite(n)) return n
  }
  return undefined
}

export function formatMoney(amount: number, currency: string): string {
  const c = currency?.trim() || 'INR'
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${c} ${amount.toLocaleString('en-IN')}`
  }
}

export function formatMoneyCompact(amount: number): string {
  return amount.toLocaleString('en-IN')
}

function normalizeMovement(raw: unknown): { mode?: string; duration?: string; cost?: string; estimated_cost?: string } | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const r = raw as Record<string, unknown>
  const mode = asString(r.mode)
  const duration = asString(r.duration)
  const cost = asString(r.cost)
  const estimated_cost = asString(r.estimated_cost) ?? cost
  const costAlias = asString(r.cost) ?? estimated_cost
  if (!mode && !duration && !costAlias) return undefined
  return { mode, duration, cost: costAlias, estimated_cost }
}

function normalizeItem(raw: unknown): PlanItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  const type = asString(r.type)
  if (type !== 'experience' && type !== 'meal' && type !== 'rest' && type !== 'movement') return null
  const title = asString(r.title)
  const description = asString(r.description)
  if (!title || !description) return null

  const movement = normalizeMovement(r.movement)
  const estimated_cost = asString(r.estimated_cost) ?? asString(r.cost)
  const image = asString(r.image) ?? asString(r.imageUrl)

  return {
    type: type as PlanItem['type'],
    title,
    description,
    start_time: asString(r.start_time),
    end_time: asString(r.end_time),
    location: asString(r.location),
    movement,
    estimated_cost,
    reason: asString(r.reason),
    flexibility: r.flexibility === 'fixed' || r.flexibility === 'moveable' || r.flexibility === 'optional' ? (r.flexibility as PlanItem['flexibility']) : undefined,
    image,
  }
}

export function normalizeFinalPlan(raw: unknown): FinalPlan | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const p = raw as Record<string, unknown>

  const plan_title = asString(p.plan_title)
  const summary = asString(p.summary)
  const traveler_profile_reference = asString(p.traveler_profile_reference)
  if (!plan_title || !summary || !traveler_profile_reference) return null

  const trip_dates: FinalPlan['trip_dates'] | undefined = (() => {
    const td = p.trip_dates as Record<string, unknown> | undefined
    if (!td || typeof td !== 'object' || Array.isArray(td)) return undefined
    const start = asString(td.start)
    const end = asString(td.end)
    const flexibility = asString(td.flexibility)
    if (!start && !end && !flexibility) return undefined
    return { ...(start ? { start } : {}), ...(end ? { end } : {}), ...(flexibility ? { flexibility } : {}) }
  })()

  const destination_route: FinalPlan['destination_route'] = Array.isArray(p.destination_route)
    ? (p.destination_route as unknown[])
        .map((r) => {
          if (!r || typeof r !== 'object' || Array.isArray(r)) return null
          const rr = r as Record<string, unknown>
          const place = asString(rr.place)
          const order = asNumber(rr.order)
          if (!place || order == null) return null
          return { place, order, ...(asString(rr.arrival_from) ? { arrival_from: asString(rr.arrival_from) } : {}), ...(asString(rr.departure_to) ? { departure_to: asString(rr.departure_to) } : {}) }
        })
        .filter(Boolean) as FinalPlan['destination_route']
    : []

  const city_allocations: FinalPlan['city_allocations'] = Array.isArray(p.city_allocations)
    ? (p.city_allocations as unknown[])
        .map((a) => {
          if (!a || typeof a !== 'object' || Array.isArray(a)) return null
          const aa = a as Record<string, unknown>
          const place = asString(aa.place)
          if (!place) return null
          const nights = asNumber(aa.nights)
          const daysRaw = aa.days
          let days: number
          if (typeof daysRaw === 'number' && Number.isFinite(daysRaw)) days = daysRaw
          else if (typeof daysRaw === 'string') {
            const n = Number(daysRaw.replace(/[^0-9.]/g, ''))
            days = Number.isFinite(n) && n > 0 ? n : (nights ?? 1)
          } else days = nights ?? 1
          return { place, ...(nights != null ? { nights } : {}), days, ...(asString(aa.reason) ? { reason: asString(aa.reason) } : {}) }
        })
        .filter(Boolean) as FinalPlan['city_allocations']
    : []

  const accommodation: FinalPlan['accommodation'] | undefined = Array.isArray(p.accommodation)
    ? (p.accommodation as unknown[])
        .map((a) => {
          if (!a || typeof a !== 'object' || Array.isArray(a)) return null
          const aa = a as Record<string, unknown>
          const place = asString(aa.place)
          const recommendation = asString(aa.recommendation)
          const reason = asString(aa.reason)
          const nights = asNumber(aa.nights)
          if (!place || !recommendation || !reason || nights == null) return null
          const status = aa.status === 'suggested' || aa.status === 'selected_by_traveler' || aa.status === 'not_yet_decided' ? aa.status : 'suggested'
          return { place, nights, recommendation, reason, ...(asString(aa.estimated_cost) ? { estimated_cost: asString(aa.estimated_cost) } : {}), status: status as FinalPlan['accommodation'] extends Array<infer T> ? T extends { status: infer S } ? S : never : never }
        })
        .filter(Boolean) as FinalPlan['accommodation']
    : undefined

  const days: FinalPlan['days'] = Array.isArray(p.days)
    ? (p.days as unknown[])
        .map((d) => {
          if (!d || typeof d !== 'object' || Array.isArray(d)) return null
          const dd = d as Record<string, unknown>
          const day = asNumber(dd.day)
          const place = asString(dd.place)
          if (day == null || !place) return null
          const itemsRaw = Array.isArray(dd.items) ? dd.items : []
          const items = itemsRaw.map(normalizeItem).filter(Boolean) as PlanItem[]
          return {
            day,
            place,
            ...(asString(dd.date) ? { date: asString(dd.date) } : {}),
            ...(asString(dd.theme) ? { theme: asString(dd.theme) } : {}),
            ...(asString(dd.daily_notes) ? { daily_notes: asString(dd.daily_notes) } : {}),
            items,
          }
        })
        .filter(Boolean) as FinalPlan['days']
    : []

  const csRaw = p.cost_summary as Record<string, unknown> | undefined
  let cost_summary: FinalPlan['cost_summary']
  if (csRaw && typeof csRaw === 'object' && !Array.isArray(csRaw)) {
    const currency = asString(csRaw.currency) ?? 'INR'
    const estimated_total = asNumber(csRaw.estimated_total) ?? 0
    const scope = asString(csRaw.scope) ?? ''
    const categories: FinalPlan['cost_summary']['categories'] = Array.isArray(csRaw.categories)
      ? (csRaw.categories as unknown[])
          .map((c) => {
            if (!c || typeof c !== 'object' || Array.isArray(c)) return null
            const cc = c as Record<string, unknown>
            const name = asString(cc.name)
            const amount = asNumber(cc.amount)
            if (!name || amount == null) return null
            return { name, amount }
          })
          .filter(Boolean) as FinalPlan['cost_summary']['categories']
      : []
    const budget_position = asString(csRaw.budget_position) ?? 'unknown'
    const caveats: string[] = Array.isArray(csRaw.caveats) ? (csRaw.caveats as unknown[]).map((x) => (typeof x === 'string' ? x : '')).filter(Boolean) : []
    cost_summary = { currency, estimated_total, scope, categories, budget_position, caveats }
  } else {
    cost_summary = { currency: 'INR', estimated_total: 0, scope: '', categories: [], budget_position: 'unknown', caveats: [] }
  }

  const fit_explanation: string = (() => {
    const fe = p.fit_explanation
    if (typeof fe === 'string') return fe
    if (Array.isArray(fe)) return fe.filter((x) => typeof x === 'string' && x.trim().length > 0).join('\n\n')
    return ''
  })()

  const stringArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') as string[] : [])

  return {
    plan_title,
    summary,
    traveler_profile_reference,
    ...(trip_dates ? { trip_dates } : {}),
    destination_route,
    city_allocations,
    ...(accommodation && accommodation.length > 0 ? { accommodation } : {}),
    days,
    cost_summary,
    fit_explanation,
    tradeoffs: stringArray(p.tradeoffs),
    assumptions: stringArray(p.assumptions),
    warnings: stringArray(p.warnings),
    unresolved_details: stringArray(p.unresolved_details),
  }
}

export function normalizePlanSnapshot(raw: unknown): NormalizedPlanSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  const revision = asNumber(r.revision)
  const state = r.state === 'draft' || r.state === 'final' ? (r.state as PlanState) : null
  const planRaw = r.plan
  if (revision == null || !state || !planRaw) return null
  const plan = normalizeFinalPlan(planRaw)
  if (!plan) return null
  return { revision, state, plan }
}

export function budgetLabel(pos: string): string {
  switch (pos) {
    case 'within_target': return 'Within target'
    case 'near_target': return 'Near target'
    case 'above_target': return 'Above target'
    default: return pos ? pos.replace(/_/g, ' ') : 'Budget unknown'
  }
}
