import React from 'react'

export type SessionBannerProps =
  | {
      kind: 'expired'
      reason?: string
      canStartNewSession?: boolean
      onStartNewSession?: () => void
      onDismiss?: () => void
    }
  | {
      kind: 'superseded'
      replacementRunId?: string
      onClose?: () => void
      onDismiss?: () => void
    }
  | {
      kind: null
    }

/**
 * Surfaces session.expired / session.superseded as prominent banners.
 * Contract:
 *  - session.expired: backend_restart, can_start_new_session true → offer new-session path
 *  - session.superseded: older connection superseded by newer → stop sending, close
 */
export function SessionBanner(props: SessionBannerProps) {
  if (!props || (props as { kind: null }).kind == null) return null

  if (props.kind === 'expired') {
    const { reason = 'backend_restart', canStartNewSession = true, onStartNewSession, onDismiss } = props
    return (
      <div
        role="alert"
        aria-live="assertive"
        data-testid="session-expired-banner"
        data-kind="expired"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: '16px 18px',
          borderRadius: 12,
          border: '1px solid rgba(181,111,98,0.22)',
          background: 'rgba(247,242,233,0.96)',
          boxShadow: '0 2px 16px rgba(27,37,44,0.07)',
          maxWidth: 720,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{
                fontFamily: 'General Sans, Inter, ui-sans-serif, sans-serif',
                fontSize: 12,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: '#9A5A50',
              }}
            >
              Session expired
            </div>
            <div style={{ fontSize: 13, lineHeight: '19px', color: 'rgba(27,37,44,0.84)', maxWidth: 560 }}>
              Your session is no longer available{reason ? ` — ${reason}` : ''}. All in-memory state was lost
              after a backend restart. Please start a new session to continue.
            </div>
            <div
              style={{
                fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
                fontSize: 11,
                color: 'rgba(86,99,106,0.64)',
              }}
            >
              reason: {reason} · can_start_new_session: {String(!!canStartNewSession)}
            </div>
          </div>
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss session expired banner"
              style={{
                flexShrink: 0,
                background: 'transparent',
                border: '1px solid rgba(225,214,197,0.6)',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 11,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'rgba(86,99,106,0.72)',
                cursor: 'pointer',
              }}
            >
              Dismiss
            </button>
          ) : null}
        </div>
        {canStartNewSession && onStartNewSession ? (
          <div>
            <button
              type="button"
              onClick={onStartNewSession}
              data-testid="start-new-session"
              style={{
                background: 'var(--voyager-ink-0, #1B252C)',
                color: '#F7F2E9',
                border: '1px solid var(--voyager-ink-0, #1B252C)',
                borderRadius: 8,
                padding: '9px 16px',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.03em',
                cursor: 'pointer',
              }}
            >
              Start new session
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  if (props.kind === 'superseded') {
    const { replacementRunId, onClose, onDismiss } = props
    return (
      <div
        role="alert"
        aria-live="assertive"
        data-testid="session-superseded-banner"
        data-kind="superseded"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: '16px 18px',
          borderRadius: 12,
          border: '1px solid rgba(179,138,85,0.24)',
          background: 'rgba(247,242,233,0.96)',
          boxShadow: '0 2px 16px rgba(27,37,44,0.07)',
          maxWidth: 720,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{
                fontFamily: 'General Sans, Inter, ui-sans-serif, sans-serif',
                fontSize: 12,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: '#8A6D3B',
              }}
            >
              Session continued elsewhere
            </div>
            <div style={{ fontSize: 13, lineHeight: '19px', color: 'rgba(27,37,44,0.84)', maxWidth: 560 }}>
              Another connection for this session is now active. This connection has been superseded and will stop
              sending commands.
            </div>
            {replacementRunId ? (
              <div
                data-testid="replacement-run-id"
                style={{
                  fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
                  fontSize: 11,
                  color: 'rgba(86,99,106,0.64)',
                  wordBreak: 'break-all',
                }}
              >
                replacement_run_id: {replacementRunId}
              </div>
            ) : null}
          </div>
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss superseded banner"
              style={{
                flexShrink: 0,
                background: 'transparent',
                border: '1px solid rgba(225,214,197,0.6)',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 11,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'rgba(86,99,106,0.72)',
                cursor: 'pointer',
              }}
            >
              Dismiss
            </button>
          ) : null}
        </div>
        {onClose ? (
          <div>
            <button
              type="button"
              onClick={onClose}
              data-testid="close-superseded"
              style={{
                background: 'transparent',
                color: 'var(--voyager-ink-1, #1B252C)',
                border: '1px solid rgba(225,214,197,0.7)',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.04em',
                cursor: 'pointer',
              }}
            >
              Close this connection
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  return null
}

export default SessionBanner
