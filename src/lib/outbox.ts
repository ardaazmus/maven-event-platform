// ponytail: in-memory outbox, DB table (OutboxEvent) when volume/retries matter
import { emailQueuePriority, normalizeEmailQueueClass } from '@/lib/email-queue'
import type { EmailMessageClass } from '@/lib/email-policy'

export type OutboxStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'dead'

export type OutboxEnqueueOptions = {
  queueClass?: EmailMessageClass
}

export interface OutboxEvent {
  id: string
  formId: string
  submissionId: string
  type: 'email' | 'webhook'
  queueClass: EmailMessageClass | null
  priority: number
  payload: any
  status: OutboxStatus
  attempts: number
  nextAttemptAt: number | null
  createdAt: number
}

const outbox: OutboxEvent[] = []
let seq = 0

export function enqueue(formId: string, submissionId: string, type: OutboxEvent['type'], payload: any, options: OutboxEnqueueOptions = {}): OutboxEvent {
  const queueClass = type === 'email' ? normalizeEmailQueueClass(options.queueClass || 'notification') : null
  const ev: OutboxEvent = {
    id: `ob_${Date.now()}_${++seq}`,
    formId,
    submissionId,
    type,
    queueClass,
    priority: queueClass ? emailQueuePriority(queueClass) : 0,
    payload,
    status: 'queued',
    attempts: 0,
    nextAttemptAt: Date.now(),
    createdAt: Date.now(),
  }
  outbox.push(ev)
  // Never log payload personal data — only ids
  console.log(JSON.stringify({ msg: 'outbox enqueue', id: ev.id, formId, submissionId, type }))
  return ev
}

export function getOutbox() { return [...outbox] }
export function clearOutbox() { outbox.length = 0; seq = 0 }

// Worker step (idempotent): sending → sent/failed with backoff
export async function processOutboxOnce(send: (ev: OutboxEvent)=>Promise<void>) {
  const pending = outbox
    .filter(e => e.status === 'queued' || e.status === 'failed')
    .sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt)
  for (const ev of pending) {
    if (ev.nextAttemptAt && ev.nextAttemptAt > Date.now()) continue
    ev.status = 'sending'
    ev.attempts++
    try {
      await send(ev)
      ev.status = 'sent'
    } catch {
      ev.status = ev.attempts >= 5 ? 'dead' : 'failed'
      ev.nextAttemptAt = Date.now() + Math.pow(2, ev.attempts)*1000
    }
  }
}
