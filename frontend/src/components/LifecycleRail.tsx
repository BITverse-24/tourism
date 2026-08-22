/**
 * LifecycleRail — removed / no-op.
 * Previously showed live planning stages; now intentionally renders nothing so
 * it never blocks consultation. Kept as a stub to avoid breaking imports.
 * Navigation is driven solely by workflowState (workflow.state / command.accepted)
 * in WsProvider + AppShell — no lifecycle event gating.
 */
export default function LifecycleRail(_props: { expanded: boolean; decisionStageKey?: string }) {
  return null
}
