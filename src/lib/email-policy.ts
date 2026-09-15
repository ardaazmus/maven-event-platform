export type EmailMessageClass = 'transactional' | 'notification' | 'marketing'

export type EmailEventKind =
  | 'invoice_ready'
  | 'invoice_preparation'
  | 'payment_receipt'
  | 'form_confirmation'
  | 'admin_notification'
  | 'integration_alert'
  | 'marketing_campaign'

export function classifyEmailEvent(eventKind: string): EmailMessageClass {
  switch (eventKind) {
    case 'invoice_ready':
    case 'invoice_preparation':
    case 'payment_receipt':
      return 'transactional'
    case 'form_confirmation':
    case 'admin_notification':
    case 'integration_alert':
      return 'notification'
    case 'marketing_campaign':
      return 'marketing'
    default:
      throw new Error('email_event_classification_unknown')
  }
}

export function requiresMarketingConsent(messageClass: EmailMessageClass): boolean {
  return messageClass === 'marketing'
}
