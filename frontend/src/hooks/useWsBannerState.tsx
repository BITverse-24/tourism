import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { WsClient } from '../ws/client'
import { toDisplayError, SanitizedError } from '../ws/errors'
import { getWsUrl } from '../ws/env'
import { checkAndRecordUnknown } from '../ws/compat'

type SessionBannerState =
  | { kind: 'expired'; reason: string; canStartNewSession: boolean }
  | { kind: 'superseded'; replacementRunId: string }
  | { kind: null }

export function useWsBannerState(client?: WsClient) {
  const ownedClientRef = useRef<WsClient | null>(null)
  const ws = useMemo(() => {
    if (client) return client
    const url = getWsUrl() || 'ws://localhost:8000/ws'
    const c = new WsClient({
      url,
      // no auto-connect; App can call connect explicitly
    })
    ownedClientRef.current = c
    return c
  }, [client])

  const [sessionBanner, setSessionBanner] = useState<SessionBannerState>({ kind: null } as SessionBannerState)
  const [lastError, setLastError] = useState<SanitizedError | null>(null)
  const [unknownCount, setUnknownCount] = useState(0)

  const clearSessionBanner = useCallback(() => setSessionBanner({ kind: null } as SessionBannerState), [])
  const clearError = useCallback(() => setLastError(null), [])

  useEffect(() => {
    const unsub = ws.subscribe((env) => {
      // forward-compat: unknown types already recorded in WsClient diagnostics,
      // but also record here for banner diagnostics and ignore
      if (checkAndRecordUnknown(env as { kind: string; type: string; message_id?: string })) {
        setUnknownCount((n) => n + 1)
        return // ignored after diagnostic — no further handling
      }

      // session lifecycle
      if (env.type === 'session.expired') {
        const p = env.payload as Record<string, unknown>
        setSessionBanner({
          kind: 'expired',
          reason: typeof p.reason === 'string' ? p.reason : 'backend_restart',
          canStartNewSession: p.can_start_new_session !== false,
        })
        return
      }
      if (env.type === 'session.superseded') {
        const p = env.payload as Record<string, unknown>
        setSessionBanner({
          kind: 'superseded',
          replacementRunId: typeof p.replacement_run_id === 'string' ? p.replacement_run_id : '',
        })
        return
      }

      // centralized error rendering: invalid_envelope (kind:error) vs command.rejected (ack)
      if (env.kind === 'error' || (env.kind === 'ack' && env.type === 'command.rejected')) {
        const disp = toDisplayError(env as unknown as { kind: string; type: string; payload: Record<string, unknown> })
        if (disp) setLastError(disp)
      }
    })
    return () => unsub()
  }, [ws])

  const handleStartNewSession = useCallback(() => {
    // per contract: after session.expired, client must offer new-session path
    // we clear banner and send session.start with null session_id
    clearSessionBanner()
    try {
      ws.sendSessionStart(null)
    } catch {}
  }, [ws, clearSessionBanner])

  const handleCloseSuperseded = useCallback(() => {
    try {
      ws.disconnect()
    } catch {}
    clearSessionBanner()
  }, [ws, clearSessionBanner])

  return {
    ws,
    sessionBanner,
    lastError,
    unknownCount,
    clearSessionBanner,
    clearError,
    handleStartNewSession,
    handleCloseSuperseded,
  }
}
