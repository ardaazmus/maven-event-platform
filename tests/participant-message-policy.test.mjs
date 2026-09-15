import assert from 'node:assert/strict'
import { buildParticipantMessage } from '../src/lib/participant-message-policy.ts'

const baseInput = {
  kind: 'welcome',
  workspaceId: 'workspace-1',
  formId: 'form-1',
  submissionId: 'submission-1',
  formTitle: 'Yıllık Teknoloji Zirvesi',
  registrationLabel: 'Standart katılım',
  recipient: { email: 'Participant@example.com', source: 'server_snapshot' },
}

assert.deepEqual(buildParticipantMessage(baseInput), {
  status: 'ready',
  messageClass: 'notification',
  eventKind: 'admin_notification',
  template: 'participant_welcome',
  idempotencyKey: 'participant:submission-1:welcome:v1',
  recipientEmail: 'participant@example.com',
  subject: 'Kaydınız alındı: Yıllık Teknoloji Zirvesi',
  textBody: 'Merhaba,\n\nYıllık Teknoloji Zirvesi formundaki kaydınız alınmıştır.\nKayıt türü: Standart katılım\n\nHoş geldiniz.',
})

assert.deepEqual(buildParticipantMessage({
  ...baseInput,
  kind: 'payment_pending',
  paymentInstruction: 'Ödemeniz bekleniyor. Yetkili ekip tarafından paylaşılmış ödeme bilgilerini kullanın.',
  paymentInstructionSource: 'authorized_message_setting',
}), {
  status: 'ready',
  messageClass: 'notification',
  eventKind: 'admin_notification',
  template: 'payment_pending',
  idempotencyKey: 'participant:submission-1:payment_pending:v1',
  recipientEmail: 'participant@example.com',
  subject: 'Ödeme bilgisi: Yıllık Teknoloji Zirvesi',
  textBody: 'Merhaba,\n\nYıllık Teknoloji Zirvesi kaydınız alınmıştır.\nKayıt türü: Standart katılım\n\nÖdeme durumu: Ödeme bekleniyor.\nÖdemeniz bekleniyor. Yetkili ekip tarafından paylaşılmış ödeme bilgilerini kullanın.',
})

assert.deepEqual(
  buildParticipantMessage({ ...baseInput, recipient: { email: 'other@example.com', source: 'browser_request' } }),
  { status: 'deny', reason: 'recipient_not_server_derived' },
)

assert.deepEqual(
  buildParticipantMessage({ ...baseInput, kind: 'payment_pending', paymentInstruction: 'Ödeme bilgisi', paymentInstructionSource: 'browser_request' }),
  { status: 'deny', reason: 'payment_instruction_not_authorized' },
)

assert.deepEqual(
  buildParticipantMessage({ ...baseInput, formTitle: '' }),
  { status: 'deny', reason: 'input_invalid' },
)

console.log('participant-message-policy.test: PASS (V1-02)')
