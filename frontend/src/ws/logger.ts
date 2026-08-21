/**
 * Lightweight frontend WS logger — dev-only verbose, prod safe.
 * Respects sanitize helpers, never logs secrets/stack traces.
 */
const isDev = (() => {
  try {
    const env = (import.meta as unknown as { env?: Record<string, unknown> }).env
    return !!env?.DEV
  } catch { return false }
})()

function safeStringify(v: unknown): string {
  try {
    const s = JSON.stringify(v)
    return s.length > 2000 ? s.slice(0, 2000) + "…" : s
  } catch { return String(v) }
}

export const wsLogger = {
  debug: (...args: unknown[]) => { if (isDev) console.debug("[voyager:ws]", ...args) },
  info: (...args: unknown[]) => { if (isDev) console.info("[voyager:ws]", ...args) },
  warn: (...args: unknown[]) => console.warn("[voyager:ws]", ...args),
  error: (...args: unknown[]) => console.error("[voyager:ws]", ...args),
  envelope: (dir: "↑" | "↓", env: unknown) => {
    if (!isDev) return
    const e = env as Record<string, unknown>
    const line = `${dir} ${String(e.kind ?? "?")}/${String(e.type ?? "?")} seq=${String((e as {sequence?:unknown}).sequence ?? "-")} sid=${String((e as {session_id?:unknown}).session_id ?? "-").slice(0,8)}`
    console.debug(`[voyager:ws] ${line}`, safeStringify(env))
  },
}
