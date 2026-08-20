import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // WS_URL is the canonical backend WebSocket URL in .env (per project spec).
  // Vite only exposes VITE_ prefixed vars by default, so we map WS_URL -> VITE_WS_URL
  // via both envPrefix and define to ensure forward-compat whether the operator sets
  // WS_URL or VITE_WS_URL.
  const wsUrl = env.WS_URL ?? env.VITE_WS_URL ?? ''
  return {
    plugins: [react()],
    server: { port: 3000 },
    // Allow both prefixes: operators may author WS_URL in .env, we expose either.
    envPrefix: ['VITE_', 'WS_'],
    define: {
      // Ensure VITE_WS_URL is always available even when only WS_URL was set.
      'import.meta.env.VITE_WS_URL': JSON.stringify(wsUrl),
    },
  }
})
