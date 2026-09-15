import type { EmailMessageClass } from '@/lib/email-policy'

const queueClasses: EmailMessageClass[] = ['transactional', 'notification', 'marketing']

/** Returns the processing priority that protects operational mail from campaigns. */
export function emailQueuePriority(queueClass: EmailMessageClass): number {
  if (queueClass === 'transactional') return 100
  if (queueClass === 'notification') return 50
  return 10
}

export function normalizeEmailQueueClass(value: string): EmailMessageClass {
  const normalized = value.trim().toLowerCase()
  if (!queueClasses.includes(normalized as EmailMessageClass)) throw new Error('invalid email queue class')
  return normalized as EmailMessageClass
}
