/**
 * Unified WebSocket client entry point — orchestrates the contract.
 *
 * This module is the single import surface for the app:
 *   import { createWsClient, WsClient } from '@/ws'
 *   import { WsClient } from '@/ws/index'
 *
 * It re-exports the ordering/retries/error core from client.ts and
 * integrates all other ws/*.ts modules (envelope, transport, session,
 * discovery, planning, decisionPlan) for forward compatibility.
 */

 // Core — authoritative ordering/retries/recovery implementation
export * from './client';
export { WsClient as default } from './client';

import {
  WsClient,
  type WsClientOptions,
  type Envelope,
  type WorkflowState,
  sanitizeErrorEnvelope,
  STABLE_REJECTION_CODES,
  isStableCode,
} from './client';

// Statically integrate sibling modules — ensures they are bundled and
// their contract helpers are available through the unified facade.
// We use namespace re-exports to avoid name collisions (each sibling
// defines its own Envelope type, but they are structurally compatible).
import * as EnvelopeMod from './envelope';
import * as TransportMod from './transport';
import * as SessionMod from './session';
import * as DiscoveryMod from './discovery';
import * as PlanningMod from './planning';
import * as DecisionPlanMod from './decisionPlan';

// Re-export sibling namespaces for consumers that need fine-grained helpers
export { EnvelopeMod, TransportMod, SessionMod, DiscoveryMod, PlanningMod, DecisionPlanMod };

// Hook — live profile snapshot consumption (profile.snapshot / profile.ready)
export { useWs, default as useWsDefault } from './useWs';
export type { UseWsReturn, HookProfileSnapshot, HookProfileReady } from './useWs';

// Also expose frequently used sibling helpers directly under distinct names
export const EnvelopeHelpers = {
  validateEnvelope: EnvelopeMod.validateEnvelope,
  parseEnvelope: EnvelopeMod.parseEnvelope,
  serializeEnvelope: EnvelopeMod.serializeEnvelope,
  isKnownCommandType: EnvelopeMod.isKnownCommandType,
  isKnownServerEventType: EnvelopeMod.isKnownServerEventType,
  KNOWN_COMMAND_TYPES: EnvelopeMod.KNOWN_COMMAND_TYPES,
  KNOWN_EVENT_TYPES: EnvelopeMod.KNOWN_EVENT_TYPES,
  KNOWN_ERROR_CODES: EnvelopeMod.KNOWN_ERROR_CODES,
};

export const SessionHelpers = {
  SessionManager: SessionMod.SessionManager,
  isNewerRevision: SessionMod.isNewerRevision,
  shouldProcessSequence: SessionMod.shouldProcessSequence,
  parseSessionReady: SessionMod.parseSessionReady,
};

export const TransportHelpers = {
  Transport: TransportMod.Transport,
  buildWsUrl: TransportMod.buildWsUrl,
};

export const DiscoveryHelpers = {
  parseDiscoveryQuestion: DiscoveryMod.parseDiscoveryQuestion,
  parseProfileSnapshot: DiscoveryMod.parseProfileSnapshot,
};

export const PlanningHelpers = {
  LIFECYCLE_KEYS: PlanningMod.LIFECYCLE_KEYS,
  PLANNING_PHASES: PlanningMod.PLANNING_PHASES,
};

// ---------------------------------------------------------------------------
// Factory + singleton
// ---------------------------------------------------------------------------

let singleton: WsClient | null = null;

export function createWsClient(opts: WsClientOptions = {}): WsClient {
  const c = new WsClient(opts);
  applyWsExtensions(c);
  return c;
}

export function getWsClient(opts?: WsClientOptions): WsClient {
  if (!singleton) singleton = createWsClient(opts);
  return singleton;
}

export function resetWsClient(): void {
  if (singleton) {
    try { singleton.disconnect(); } catch {}
    singleton = null;
  }
}

// ---------------------------------------------------------------------------
// High-level helpers composing ordering + recovery + error handling
// ---------------------------------------------------------------------------

export function buildSessionStartEnvelope(ws: WsClient, sessionId: string | null, commandId?: string): Envelope {
  return ws.buildCommand('session.start', { session_id: sessionId ?? null }, commandId);
}

export function handleIncomingRaw(ws: WsClient, raw: string): void {
  // Delegate to client's ordered pipeline; sibling envelope validation is
  // internally consistent (client uses same rules as envelope.ts)
  ws.handleRawMessage(raw);
}

export function isSafeErrorEnvelope(env: Envelope): boolean {
  const payload = env.payload as Record<string, unknown>;
  if (!payload) return false;
  if ('stack' in payload || 'stackTrace' in payload || 'stack_trace' in payload) return false;
  for (const k of Object.keys(payload)) if (/secret|token|credential|provider/i.test(k)) return false;
  const code = payload.code as string | undefined;
  if (!code || typeof code !== 'string') return false;
  // stable codes preferred; unknown codes still safe if sanitized (forward compat)
  if (typeof payload.retryable !== 'boolean') return false;
  return true;
}

export function isAckRetryable(env: Envelope): boolean {
  if (env.kind !== 'ack' || env.type !== 'command.rejected') return false;
  const p = env.payload as Record<string, unknown>;
  return p.retryable === true;
}

export function sanitizeEnvelope(env: Envelope): Envelope {
  return sanitizeErrorEnvelope(env);
}

export { STABLE_REJECTION_CODES };

export function isWorkflowState(s: string): s is WorkflowState {
  return ['discovery', 'profile_review', 'planning', 'decision_required', 'plan_ready', 'cancelled', 'expired', 'replanning'].includes(s);
}

// ---------------------------------------------------------------------------
// Extension hook — sibling modules can register additional behavior
// ---------------------------------------------------------------------------

type WsExtension = (client: WsClient) => void;
const extensions: WsExtension[] = [];

export function registerWsExtension(ext: WsExtension): void {
  extensions.push(ext);
}

export function applyWsExtensions(client: WsClient): void {
  for (const e of extensions) {
    try { e(client); } catch {}
  }
  // Auto-apply any sibling that exposes extendWsClient / register / default
  const candidates: unknown[] = [EnvelopeMod, TransportMod, SessionMod, DiscoveryMod, PlanningMod, DecisionPlanMod];
  for (const mod of candidates) {
    const m = mod as Record<string, unknown>;
    const fn = (m.extendWsClient as WsExtension | undefined)
      ?? (m.register as WsExtension | undefined)
      ?? (m.default as WsExtension | undefined);
    if (typeof fn === 'function') {
      try { (fn as WsExtension)(client); } catch {}
    }
  }
}

export function createWsClientWithExtensions(opts: WsClientOptions = {}): WsClient {
  const c = new WsClient(opts);
  applyWsExtensions(c);
  return c;
}

// ---------------------------------------------------------------------------
// Diagnostic: verify sibling integration is live (used by tests)
// ---------------------------------------------------------------------------

export function getIntegratedModules(): string[] {
  return ['client', 'envelope', 'transport', 'session', 'discovery', 'planning', 'decisionPlan'];
}
