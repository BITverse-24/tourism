/**
 * useMockFallback — centralized mock-fallback decision.
 *
 * Contract (per task):
 *  - Live WebSocket is the default. No mock is used while the connection is
 *    healthy or still attempting to connect at start.
 *  - Mock data is ONLY allowed when the websocket connection has failed at
 *    start: i.e. after an initial connection attempt the socket is in
 *    `closed` (or remains `idle` past a short timeout) and has never been
 *    `open`. This is exposed as `wsFailedAtStart` / `allowMock`.
 *
 * Where mock remains (only on ws failure):
 *  - usePlan → falls back to mockPlan only when allowMock
 *  - TripOverview / DayCanvas / TradeoffBrief → render mockPlan only when allowMock
 *  - Consultation → mock timer / mock decision only when allowMock
 *  - App.tsx discovery fallback question/profile only when allowMock
 *  - ProfileReview → shows mockProfile placeholder only when allowMock; otherwise
 *    shows "waiting for live snapshot" loading state.
 *
 * Centralization:
 *  - WsProvider is the authoritative source: it tracks `wsFailedAtStart`
 *    alongside `connected` and exposes both via WsContext.
 *  - This hook reads WsContext when available (inside WsProvider tree) and
 *    otherwise falls back to the singleton WsClient (`getWsClient()`) with
 *    local timeout tracking, so screens rendered outside WsProvider or using
 *    the legacy usePlan singleton stay consistent.
 */

import { useEffect, useMemo, useState } from 'react'
import { useWsOptional } from '../ws/WsProvider'
import { getWsClient } from '../ws/index'

const FALLBACK_TIMEOUT_MS = 1500

export interface MockFallbackState {
  wsFailedAtStart: boolean
  allowMock: boolean
  isWaitingForLive: boolean
  wsConnected: boolean
}

function deriveFromClient(client: { getConnectionState: () => string; snapshot: () => { connected: boolean } }): { connected: boolean; connState: string } {
  try {
    const connState = client.getConnectionState()
    const snap = client.snapshot()
    return { connected: !!snap.connected || connState === 'open', connState }
  } catch {
    return { connected: false, connState: 'idle' }
  }
}

export function useMockFallback(opts?: { timeoutMs?: number }): MockFallbackState {
  const timeoutMs = opts?.timeoutMs ?? FALLBACK_TIMEOUT_MS
  const ctx = useWsOptional()

  if (ctx) {
    const anyCtx = ctx as unknown as MockFallbackState & { wsFailedAtStart?: boolean; allowMock?: boolean }
    if (typeof anyCtx.wsFailedAtStart === 'boolean') {
      const wsFailedAtStart = !!anyCtx.wsFailedAtStart
      const wsConnected = !!ctx.connected
      return {
        wsFailedAtStart,
        allowMock: wsFailedAtStart && !wsConnected,
        isWaitingForLive: !wsConnected && !wsFailedAtStart,
        wsConnected,
      }
    }
    const client = ctx.client
    return useLocalFallback(client as unknown as Parameters<typeof deriveFromClient>[0], timeoutMs, ctx.connected)
  }

  let fallbackClient: ReturnType<typeof getWsClient> | null = null
  try {
    fallbackClient = getWsClient()
  } catch {
    fallbackClient = null
  }
  if (!fallbackClient) {
    return { wsFailedAtStart: false, allowMock: false, isWaitingForLive: true, wsConnected: false }
  }
  return useLocalFallback(fallbackClient as unknown as Parameters<typeof deriveFromClient>[0], timeoutMs)
}

function useLocalFallback(
  client: { getConnectionState: () => string; snapshot: () => { connected: boolean } },
  timeoutMs: number,
  connectedOverride?: boolean,
): MockFallbackState {
  const [wsConnected, setWsConnected] = useState<boolean>(() => {
    if (typeof connectedOverride === 'boolean') return connectedOverride
    return deriveFromClient(client).connected
  })
  const [wsFailedAtStart, setWsFailedAtStart] = useState(false)
  const [hasEverConnected, setHasEverConnected] = useState<boolean>(() => deriveFromClient(client).connected)

  useEffect(() => {
    let cancelled = false
    const poll = window.setInterval(() => {
      if (cancelled) return
      const { connected, connState } = deriveFromClient(client)
      setWsConnected(connected)
      if (connected) setHasEverConnected(true)
      if (!connected && !hasEverConnected && connState === 'closed') {
        setWsFailedAtStart(true)
      }
    }, 500)

    const timer = window.setTimeout(() => {
      if (cancelled) return
      const { connected, connState } = deriveFromClient(client)
      if (!connected && !hasEverConnected && (connState === 'closed' || connState === 'idle')) {
        setWsFailedAtStart(true)
      }
    }, timeoutMs)

    return () => {
      cancelled = true
      window.clearInterval(poll)
      window.clearTimeout(timer)
    }
  }, [client, timeoutMs, hasEverConnected])

  useEffect(() => {
    if (wsConnected) setWsFailedAtStart(false)
  }, [wsConnected])

  return useMemo(() => ({
    wsFailedAtStart,
    allowMock: wsFailedAtStart && !wsConnected,
    isWaitingForLive: !wsConnected && !wsFailedAtStart,
    wsConnected,
  }), [wsFailedAtStart, wsConnected])
}

export default useMockFallback
