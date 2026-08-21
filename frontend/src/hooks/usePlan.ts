/**
 * usePlan — live Final Trip Plan snapshot from the WebSocket client.
 * Subscribes to plan.snapshot (draft/final) via WsClient, respects revision
 * ordering (replace not patch), and normalizes to canonical FinalPlan.
 *
 * Falls back to mockPlan in DEV when no live plan has arrived, so the
 * overview/day-canvas screens remain inspectable without a running backend.
 */
import { useEffect, useMemo, useState } from 'react'
import { WsClient } from '../ws/client'
import { mockPlan } from '../data/mockPlan'
import { normalizePlanSnapshot, type NormalizedPlanSnapshot } from '../types/planAdapter'
import type { FinalPlan } from '../types'

let singletonClient: WsClient | null = null
function getClient(): WsClient {
  if (!singletonClient) singletonClient = new WsClient()
  return singletonClient
}

export interface UsePlanReturn {
  snapshot: NormalizedPlanSnapshot | null
  plan: FinalPlan | null
  revision: number | null
  state: 'draft' | 'final' | null
  isDraft: boolean
  isFinal: boolean
  hasLivePlan: boolean
}

export function usePlan(clientOpt?: WsClient): UsePlanReturn {
  const client = clientOpt ?? getClient()

  const [snapshot, setSnapshot] = useState<NormalizedPlanSnapshot | null>(() => {
    const raw = client.getPlanSnapshot() as unknown as Record<string, unknown> | null
    if (!raw || typeof raw.revision !== 'number') return null
    // client stores { revision, state, plan } — normalize
    const n = normalizePlanSnapshot(raw)
    return n
  })

  useEffect(() => {
    const unsub = client.subscribe((env) => {
      if (env.kind === 'event' && env.type === 'plan.snapshot') {
        const n = normalizePlanSnapshot(env.payload)
        if (n) {
          setSnapshot((prev) => {
            if (!prev || n.revision > prev.revision) return n
            // same revision: draft → final promotion or field update — replace
            if (n.revision === prev.revision && n.state !== prev.state) return n
            return prev
          })
        }
      } else if (env.kind === 'event' && env.type === 'session.expired') {
        // invalidate on backend restart — clear live plan, allow fallback
        setSnapshot(null)
      } else if (env.kind === 'event' && env.type === 'workflow.completed') {
        // keep final snapshot as authoritative; no clear
      }
    })
    // poll for missed snapshot delivered via client's internal store before subscription
    const t = setInterval(() => {
      const raw = client.getPlanSnapshot() as unknown as Record<string, unknown> | null
      if (raw && typeof raw.revision === 'number') {
        const n = normalizePlanSnapshot(raw)
        if (n) setSnapshot((prev) => !prev || n.revision > prev.revision ? n : prev)
      }
    }, 1000)
    return () => {
      unsub()
      clearInterval(t)
    }
  }, [client])

  const derived = useMemo<UsePlanReturn>(() => {
    if (snapshot) {
      return {
        snapshot,
        plan: snapshot.plan,
        revision: snapshot.revision,
        state: snapshot.state,
        isDraft: snapshot.state === 'draft',
        isFinal: snapshot.state === 'final',
        hasLivePlan: true,
      }
    }
    // DEV fallback so screens are inspectable without backend
    if ((import.meta as unknown as { env: Record<string, unknown> }).env?.DEV) {
      return {
        snapshot: { revision: 1, state: 'final' as const, plan: mockPlan as unknown as FinalPlan },
        plan: mockPlan as unknown as FinalPlan,
        revision: 1,
        state: 'final' as const,
        isDraft: false,
        isFinal: true,
        hasLivePlan: false,
      }
    }
    return { snapshot: null, plan: null, revision: null, state: null, isDraft: false, isFinal: false, hasLivePlan: false }
  }, [snapshot])

  return derived
}

export default usePlan
