/**
 * useDiscovery — live discovery question/answer lifecycle over WsClient.
 *
 * Subscribes to `discovery.question` (via WsClient.subscribe) and
 * `profile.snapshot`, tracks sequence ordering, busy/feedback from
 * command.acks, and handles `question_not_current` recovery.
 *
 * Server is authoritative — no mockQuestions are used here. Mock fallback
 * (if WS never delivers a question) is handled at the screen layer.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getSharedWsClient } from '../ws/WsProvider'
import type { WsClient } from '../ws/client'
import {
  parseDiscoveryQuestion,
  parseProfileSnapshot,
  validateAnswer,
  type DiscoveryQuestion,
  type ProfileSnapshot as DiscoveryProfileSnapshot,
} from '../ws/discovery'

export type { DiscoveryQuestion }

export interface LiveProfile {
  revision: number
  sequence?: number
  profile: Record<string, unknown>
  state?: string
}

export interface UseDiscoveryReturn {
  question: DiscoveryQuestion | null
  profile: LiveProfile | null
  sequence: number | null
  sequenceTotal: number | null
  busy: boolean
  feedback: string | null
  connected: boolean
  sendAnswer: (args: {
    selected_option_ids: string[]
    free_text: string
    command_id?: string
  }) => { ok: boolean; error?: string }
  clearFeedback: () => void
}

function getClient(): WsClient {
  return getSharedWsClient()
}

export function useDiscovery(clientOpt?: WsClient): UseDiscoveryReturn {
  const client = clientOpt ?? getClient()

  const [question, setQuestion] = useState<DiscoveryQuestion | null>(null)
  const [sequence, setSequence] = useState<number | null>(null)
  const [profile, setProfile] = useState<LiveProfile | null>(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [connected, setConnected] = useState(() => client.getConnectionState() === 'open')

  const questionIdRef = useRef<string | null>(null)
  const lastSequenceRef = useRef<number | null>(null)
  const pendingCommandIdRef = useRef<string | null>(null)

  useEffect(() => {
    questionIdRef.current = question?.question_id ?? null
  }, [question?.question_id])

  useEffect(() => {
    const unsub = client.subscribe((env) => {
      const kind = (env as { kind: string }).kind
      const type = (env as { type: string }).type
      const seq = (env as { sequence?: number | null }).sequence ?? null
      const payload = (env as { payload: Record<string, unknown> }).payload ?? {}

      if (kind === 'event' && type === 'discovery.question') {
        const parsed = parseDiscoveryQuestion(payload)
        if (parsed) {
          if (seq != null && lastSequenceRef.current != null && seq < lastSequenceRef.current) {
            return
          }
          if (seq != null) {
            lastSequenceRef.current = seq
            setSequence(seq)
          }
          setQuestion(parsed)
          questionIdRef.current = parsed.question_id
          setBusy(false)
          pendingCommandIdRef.current = null
          setFeedback((prev) => {
            if (prev && prev.includes('no longer current')) return null
            return prev
          })
          setConnected(client.getConnectionState() === 'open')
        }
        return
      }

      if (kind === 'event' && type === 'profile.snapshot') {
        const parsed = parseProfileSnapshot(payload)
        if (parsed) {
          const snap: LiveProfile = {
            revision: parsed.revision,
            profile: parsed.profile as Record<string, unknown>,
            state: parsed.state,
            sequence: seq ?? parsed.sequence,
          }
          setProfile((prev) => {
            if (!prev || snap.revision > prev.revision) return snap
            return prev
          })
        }
        return
      }

      if (kind === 'ack') {
        const p = payload as {
          command_id?: string
          accepted?: boolean
          code?: string
          message?: string
          deduplicated?: boolean
          retryable?: boolean
        }
        const cid = (env as { command_id?: string }).command_id ?? p.command_id ?? null
        const isOurCommand = cid != null && cid === pendingCommandIdRef.current

        if (p.accepted === true) {
          if (p.deduplicated) {
            setBusy(false)
            pendingCommandIdRef.current = null
          }
          setFeedback(null)
          return
        }

        if (p.accepted === false) {
          setBusy(false)
          pendingCommandIdRef.current = null

          if (p.code === 'question_not_current') {
            setFeedback('That question is no longer current — showing the latest one.')
            return
          }
          if (p.code === 'command_id_conflict') {
            setFeedback(p.message ?? 'Duplicate submission — please retry with a fresh answer.')
            return
          }
          if (p.message) {
            setFeedback(p.message)
          } else if (p.code) {
            setFeedback(p.code)
          }
          return
        }
      }

      if (kind === 'event' && (type === 'session.ready' || type === 'session.expired' || type === 'session.superseded')) {
        setConnected(client.getConnectionState() === 'open')
      }
    })

    const timer = setInterval(() => {
      setConnected(client.getConnectionState() === 'open')
      const raw = client.getProfileSnapshot() as unknown as { revision?: number; state?: string; profile?: Record<string, unknown> } | null
      if (raw && typeof raw.revision === 'number') {
        setProfile((prev) => {
          if (!prev || raw.revision! > prev.revision) {
            return { revision: raw.revision!, state: raw.state, profile: (raw.profile as Record<string, unknown>) ?? {} }
          }
          return prev
        })
      }
    }, 1000)

    return () => {
      unsub()
      clearInterval(timer)
    }
  }, [client])

  const sendAnswer = useCallback(
    (args: { selected_option_ids: string[]; free_text: string; command_id?: string }) => {
      if (!question) {
        return { ok: false, error: 'No active question.' }
      }
      const v = validateAnswer(question, args.selected_option_ids, args.free_text)
      if (!v.valid) {
        setFeedback(v.message ?? v.code ?? 'Invalid answer.')
        return { ok: false, error: v.message ?? v.code ?? 'Invalid answer.' }
      }
      let ft = args.free_text ?? ''
      if (question.free_text_mode === 'disabled') ft = ''
      else if (question.free_text_mode === 'only_if_no_option' && args.selected_option_ids.length > 0 && ft.trim().length > 0) {
        ft = ''
      }

      setBusy(true)
      setFeedback(null)

      try {
        const cmdId = args.command_id
        const res = client.sendDiscoveryAnswer(
          {
            question_id: question.question_id,
            selected_option_ids: [...args.selected_option_ids],
            free_text: ft,
          },
          cmdId,
        )
        const cid = (res.envelope as { command_id?: string })?.command_id ?? cmdId ?? null
        if (cid) pendingCommandIdRef.current = cid as string

        if ((res as { conflict?: boolean }).conflict) {
          setBusy(false)
          pendingCommandIdRef.current = null
          const msg = 'This answer was already submitted with different content — please retry.'
          setFeedback(msg)
          return { ok: false, error: msg }
        }
        return { ok: true }
      } catch (e) {
        setBusy(false)
        pendingCommandIdRef.current = null
        const msg = e instanceof Error ? e.message : String(e)
        setFeedback(msg)
        return { ok: false, error: msg }
      }
    },
    [client, question],
  )

  const clearFeedback = useCallback(() => setFeedback(null), [])

  const value = useMemo<UseDiscoveryReturn>(
    () => ({
      question,
      profile,
      sequence,
      sequenceTotal: null,
      busy,
      feedback,
      connected,
      sendAnswer,
      clearFeedback,
    }),
    [question, profile, sequence, busy, feedback, connected, sendAnswer, clearFeedback],
  )

  return value
}

export default useDiscovery
