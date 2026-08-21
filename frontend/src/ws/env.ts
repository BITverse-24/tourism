/**
 * WS environment helper — resolves the backend WebSocket URL from Vite env.
 * Contract: .env may contain WS_URL, which vite.config.ts maps to VITE_WS_URL
 * via define + envPrefix. Runtime should prefer VITE_WS_URL but accept WS_URL
 * for defensive forward-compat (e.g. when ran without the define mapping).
 */

export function getWsUrl(): string {
  try {
    const meta = import.meta as unknown as { env?: Record<string, string | undefined> }
    const env = meta.env ?? {}
    // VITE_WS_URL is the canonical key exposed by vite.config.ts define mapping.
    // WS_URL is also exposed via envPrefix ['VITE_', 'WS_'] for raw .env compat.
    const raw = env.VITE_WS_URL ?? env.WS_URL ?? env.VITE_WSURL ?? ''
    return typeof raw === 'string' ? raw.trim() : ''
  } catch {
    return ''
  }
}

export function getWsUrlOrDefault(fallback = ''): string {
  const v = getWsUrl()
  return v || fallback
}

/** Whether a WS URL was configured via env */
export function hasWsUrl(): boolean {
  return getWsUrl().length > 0
}
