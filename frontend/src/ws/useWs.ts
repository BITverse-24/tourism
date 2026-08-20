/**
 * frontend/src/ws/useWs.ts
 *
 * Live WebSocket snapshot hook for ProfileReview and related screens.
 * Consumes docs/WEBSOCKET_CONTRACT.md profile.snapshot / profile.ready
 * and exposes typed helpers for profile.confirm / profile.request_changes.
 *
 * Contract refs:
 *  - profile.snapshot payload: { revision, state: draft|ready|confirmed, profile }
 *  - profile.ready payload: { profile_revision, blocking_unknowns }
 *  - profile.confirm payload: { profile_revision }
 *  - profile.request_changes payload: { topics, free_text? }
 *
 * No direct JSON patch — correction path is topics + free_text only.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { WsClient } from './client'
import { parseProfileSnapshot, parseProfileReady, type ProfileSnapshot as DiscoverySnapshot, type ProfileReady } from './discovery'
import { validateProfileConfirm, validateProfileRequestChanges } from './planning'

// Singleton accessor — avoids circular import with index.ts which re-exports this hook
let singleton: WsClient | null = null
function getClient(): WsClient {
  if (!singleton) singleton = new WsClient()
  return singleton
}

// Re-export discriminated state type for consumers
export type ProfileSnapshotState = 'draft' | 'ready' | 'confirmed'

// Shape stored in hook — mirrors discovery.Parse but keeps sequence for ordering
export interface HookProfileSnapshot {
  revision: number
  state: ProfileSnapshotState
  profile: Record<string, unknown>
  sequence?: number
}

export interface HookProfileReady {
  profile_revision: number
  blocking_unknowns: string[]
}

export interface UseWsReturn {
  // primary live state
  snapshot: HookProfileSnapshot | null
  profileSnapshot: HookProfileSnapshot | null
  ready: HookProfileReady | null
  profileReady: HookProfileReady | null
  // aliases for forward compat
  profile_snapshot: HookProfileSnapshot | null
  profile_ready: HookProfileReady | null

  // derived
  canConfirm: boolean
  isReady: boolean
  hasBlockingUnknowns: boolean

  // actions — contract-shaped
  sendProfileConfirm: (revision?: number) => { ok: boolean; error?: string; envelope?: unknown }
  sendProfileRequestChanges: (topics: string[], freeText?: string) => { ok: boolean; error?: string; envelope?: unknown }

  // transport
  client: WsClient
  connected: boolean
}

function toHookSnapshot(d: DiscoverySnapshot): HookProfileSnapshot {
  return {
    revision: d.revision,
    state: d.state as ProfileSnapshotState,
    profile: d.profile,
    sequence: d.sequence,
  }
}

export function useWs(): UseWsReturn {
  // singleton client — bundle-safe, no new connection per hook instance
  const [client] = useState<WsClient>(() => getClient())

  const [snapshot, setSnapshot] = useState<HookProfileSnapshot | null>(() => {
    const raw = client.getProfileSnapshot() as unknown as { revision: number; state?: string; profile?: Record<string, unknown> } | null
    if (!raw || typeof raw.revision !== 'number') return null
    const parsed = parseProfileSnapshot(raw)
    if (parsed) return toHookSnapshot(parsed)
    // client store may hold loosely typed snapshot before parsing — preserve if revision exists
    if (typeof raw.state === 'string' && (raw.state === 'draft' || raw.state === 'ready' || raw.state === 'confirmed')) {
      return {
        revision: raw.revision,
        state: raw.state as ProfileSnapshotState,
        profile: (raw.profile as Record<string, unknown>) ?? {},
      }
    }
    return null
  })

  const [ready, setReady] = useState<HookProfileReady | null>(null)
  const [connected, setConnected] = useState<boolean>(() => client.getConnectionState() === 'open')

  useEffect(() => {
    // subscribe to all ordered envelopes
    const unsub = client.subscribe((env) => {
      if (env.kind === 'event' && env.type === 'profile.snapshot') {
        const parsed = parseProfileSnapshot(env.payload)
        if (parsed) {
          const hook = toHookSnapshot(parsed)
          setSnapshot((prev) => {
            if (!prev || hook.revision > prev.revision) return hook
            return prev
          })
        }
      } else if (env.kind === 'event' && env.type === 'profile.ready') {
        const parsed = parseProfileReady(env.payload)
        if (parsed) {
          setReady({ profile_revision: parsed.profile_revision, blocking_unknowns: parsed.blocking_unknowns })
        }
      } else if (env.kind === 'event' && (env.type === 'session.ready' || env.type === 'session.expired' || env.type === 'session.superseded')) {
        // keep connected state in sync — session lifecycle may affect workflow
        setConnected(client.getConnectionState() === 'open')
      }
    })

    // also watch connection state via onStateChange if available
    const prevOnStateChange = (client as unknown as { opts?: { onStateChange?: (s: unknown) => void } }).opts?.onStateChange
    // we cannot easily intercept opts, so poll connection via subscribe already covers it;
    // add lightweight interval to keep connected accurate in case subscribe misses open/close without event
    const timer = setInterval(() => setConnected(client.getConnectionState() === 'open'), 1000)

    return () => {
      unsub()
      clearInterval(timer)
      void prevOnStateChange
    }
  }, [client])

  const canConfirm = useMemo(() => {
    if (!snapshot || !ready) return false
    if (snapshot.state !== 'ready') return false
    if (snapshot.revision !== ready.profile_revision) return false
    if (ready.blocking_unknowns.length > 0) return false
    return true
  }, [snapshot, ready])

  const isReady = snapshot?.state === 'ready'
  const hasBlockingUnknowns = (ready?.blocking_unknowns.length ?? 0) > 0

  const sendProfileConfirm = useCallback(
    (revision?: number) => {
      const rev = revision ?? snapshot?.revision
      if (rev == null) {
        return { ok: false, error: 'No profile revision available to confirm.' }
      }
      // Frontend validation mirrors planning.validateProfileConfirm — server remains authoritative
      const workflowState = client.getWorkflowState() ?? 'profile_review'
      // derive blocking_unknowns from ready marker (contract source of truth)
      const blocking = ready?.blocking_unknowns ?? []
      const latestState = snapshot?.state ?? null
      const latestRev = snapshot?.revision ?? null
      const v = validateProfileConfirm({
        workflow_state: workflowState,
        latest_profile_revision: latestRev,
        latest_profile_state: latestState as unknown as 'draft' | 'ready' | 'confirmed' | null,
        blocking_unknowns: blocking,
        requested_revision: rev,
      })
      if (!v.valid) {
        return { ok: false, error: v.message ?? v.code ?? 'Validation failed' }
      }
      // Send via WsClient — server will ack and start Planning Controller
      try {
        const res = client.sendProfileConfirm(rev)
        // res may contain conflict flag; surface it
        if ((res as { conflict?: boolean }).conflict) {
          return { ok: false, error: 'Profile revision conflict — please review the latest.' }
        }
        return { ok: true, envelope: (res as { envelope?: unknown }).envelope }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) }
      }
    },
    [client, ready, snapshot]
  )

  const sendProfileRequestChanges = useCallback(
    (topics: string[], freeText?: string) => {
      const payload = {
        topics: topics.map((t) => t.trim()).filter(Boolean),
        ...(typeof freeText === 'string' && freeText.trim().length > 0 ? { free_text: freeText.trim() } : {}),
      }
      const v = validateProfileRequestChanges(payload)
      if (!v.valid) {
        return { ok: false, error: v.message ?? v.code ?? 'Validation failed' }
      }
      try {
        const res = client.sendCommand('profile.request_changes', payload as unknown as Record<string, unknown>)
        if ((res as { conflict?: boolean }).conflict) {
          return { ok: false, error: 'Command conflict — please retry.' }
        }
        return { ok: true, envelope: (res as { envelope?: unknown }).envelope }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) }
      }
    },
    [client]
  )

  return {
    snapshot,
    profileSnapshot: snapshot,
    profile_snapshot: snapshot,
    ready,
    profileReady: ready,
    profile_ready: ready,
    canConfirm,
    isReady,
    hasBlockingUnknowns,
    sendProfileConfirm,
    sendProfileRequestChanges,
    client,
    connected,
  }
}

export default useWs
