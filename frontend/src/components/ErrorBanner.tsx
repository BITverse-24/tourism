import React from 'react'
import { SanitizedError, formatBannerText, codeLabel } from '../ws/errors'

export type ErrorBannerProps = {
  error: SanitizedError | null
  onRetry?: () => void
  onDismiss?: () => void
  /** Optional extra context: show recovery question id inline */
  showRecovery?: boolean
}

/**
 * Centralized rendering for invalid_envelope vs command.rejected.
 * - invalid_envelope (kind:error) shown as non-retryable by default with neutral tone
 * - command.rejected (kind:ack) shows code, retryable badge, recovery.current_question_id
 * - All messages are already sanitized — never renders stack/secrets
 */
export function ErrorBanner({ error, onRetry, onDismiss, showRecovery = true }: ErrorBannerProps) {
  if (!error) return null

  const isRejected = error.kind === 'command_rejected'
  const isEnvelope = error.kind === 'invalid_envelope'
  const title = isRejected ? codeLabel(error.code) : isEnvelope ? 'Invalid envelope' : codeLabel(error.code)

  // tone: envelope errors are softer amber, rejected retryable is amber, non-retryable is clay
  const tone: 'amber' | 'clay' | 'neutral' = isEnvelope ? 'neutral' : error.retryable ? 'amber' : 'clay'

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="error-banner"
      data-kind={error.kind}
      data-code={error.code}
      data-retryable={String(error.retryable)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '14px 16px',
        borderRadius: 12,
        border: `1px solid ${tone === 'clay' ? 'rgba(181,111,98,0.32)' : tone === 'amber' ? 'rgba(179,138,85,0.28)' : 'rgba(225,214,197,0.55)'}`,
        background:
          tone === 'clay'
            ? 'rgba(181,111,98,0.08)'
            : tone === 'amber'
              ? 'rgba(179,138,85,0.09)'
              : 'rgba(247,242,233,0.92)',
        color: 'var(--voyager-ink-1, #1B252C)',
        boxShadow: '0 1px 8px rgba(27,37,44,0.06)',
        maxWidth: 720,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'General Sans, Inter, ui-sans-serif, sans-serif',
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: tone === 'clay' ? '#9A5A50' : tone === 'amber' ? '#8A6D3B' : 'rgba(27,37,44,0.62)',
              }}
            >
              {title}
            </span>
            <span
              style={{
                fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
                fontSize: 10,
                letterSpacing: '0.06em',
                color: 'rgba(86,99,106,0.62)',
                background: 'rgba(27,37,44,0.06)',
                padding: '2px 6px',
                borderRadius: 6,
              }}
            >
              {error.code}
            </span>
            {error.retryable ? (
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#7A5E2E',
                  background: 'rgba(179,138,85,0.14)',
                  border: '1px solid rgba(179,138,85,0.22)',
                  padding: '2px 6px',
                  borderRadius: 6,
                  fontWeight: 600,
                }}
              >
                retryable
              </span>
            ) : null}
            {error.workflowState ? (
              <span style={{ fontSize: 10, letterSpacing: '0.06em', color: 'rgba(86,99,106,0.62)' }}>
                {error.workflowState}
              </span>
            ) : null}
          </div>
          <div
            style={{
              fontFamily: 'General Sans, Inter, ui-sans-serif, sans-serif',
              fontSize: 13,
              lineHeight: '18px',
              color: 'rgba(27,37,44,0.88)',
              wordBreak: 'break-word',
            }}
          >
            {error.message}
          </div>
          {showRecovery && error.recoveryQuestionId ? (
            <div
              data-testid="recovery-question-id"
              style={{
                fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
                fontSize: 11,
                color: 'rgba(86,99,106,0.68)',
              }}
            >
              Current question: {error.recoveryQuestionId}
            </div>
          ) : null}
          <div style={{ fontSize: 11, color: 'rgba(125,135,138,0.72)', display: 'none' }} aria-hidden>
            {formatBannerText(error)}
          </div>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss error"
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
      {error.retryable && onRetry ? (
        <div>
          <button
            type="button"
            onClick={onRetry}
            data-testid="error-retry"
            style={{
              background: 'var(--voyager-ink-0, #1B252C)',
              color: '#F7F2E9',
              border: '1px solid var(--voyager-ink-0, #1B252C)',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.04em',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      ) : null}
    </div>
  )
}

/** Compact inline variant for discovery/profile flows */
export function InlineError({ error, onRetry }: { error: SanitizedError | null; onRetry?: () => void }) {
  if (!error) return null
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="inline-error"
      data-code={error.code}
      style={{
        fontFamily: 'General Sans, Inter, ui-sans-serif, sans-serif',
        fontSize: 12,
        lineHeight: '16px',
        color: error.retryable ? '#7A5E2E' : '#9A5A50',
        background: error.retryable ? 'rgba(179,138,85,0.08)' : 'rgba(181,111,98,0.08)',
        border: `1px solid ${error.retryable ? 'rgba(179,138,85,0.18)' : 'rgba(181,111,98,0.18)'}`,
        borderRadius: 8,
        padding: '10px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span>
        {codeLabel(error.code)}: {error.message}
        {error.recoveryQuestionId ? ` — current question ${error.recoveryQuestionId}` : ''}
      </span>
      {error.retryable && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          style={{
            flexShrink: 0,
            background: 'transparent',
            border: '1px solid currentColor',
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: 11,
            cursor: 'pointer',
            color: 'inherit',
          }}
        >
          Retry
        </button>
      ) : null}
    </div>
  )
}

export default ErrorBanner
