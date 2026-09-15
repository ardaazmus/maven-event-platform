import assert from 'node:assert/strict'
import { buildSubmissionEmailIntents } from '../src/lib/submission-email-intents.ts'

const result = buildSubmissionEmailIntents({
  formTitle: 'Yıllık Teknoloji Zirvesi',
  submissionId: 'sub_123',
  submitterEmail: 'katilimci@example.com',
  submittedAt: '2026-09-08T05:00:00.000Z',
  entryData: 'Ad Soyad: Test Kullanıcı',
  notifications: [
    {
      id: 'notification_admin',
      type: 'admin',
      enabled: true,
      config: { to: 'kayit@example.com, ikinci@example.com', subject: 'Yeni kayıt', body: 'Yeni başvuru: {entry_data}' },
    },
    {
      id: 'notification_user',
      type: 'user_confirmation',
      enabled: true,
      config: { subject: 'Başvurunuz alındı', body: 'Başvurunuz alınmıştır.' },
    },
    {
      id: 'notification_disabled',
      type: 'admin',
      enabled: false,
      config: { to: 'kapali@example.com' },
    },
    {
      id: 'notification_webhook',
      type: 'webhook',
      enabled: true,
      config: { to: 'webhook@example.com' },
    },
  ],
})

assert.deepEqual(result.intents, [
  {
    notificationId: 'notification_admin',
    notificationType: 'admin',
    recipientEmail: 'kayit@example.com',
    subject: 'Yeni kayıt',
    textBody: 'Yeni başvuru: Ad Soyad: Test Kullanıcı',
  },
  {
    notificationId: 'notification_admin',
    notificationType: 'admin',
    recipientEmail: 'ikinci@example.com',
    subject: 'Yeni kayıt',
    textBody: 'Yeni başvuru: Ad Soyad: Test Kullanıcı',
  },
  {
    notificationId: 'notification_user',
    notificationType: 'user_confirmation',
    recipientEmail: 'katilimci@example.com',
    subject: 'Başvurunuz alındı',
    textBody: 'Başvurunuz alınmıştır.',
  },
])
assert.deepEqual(result.skipped, [])

const noSubmitter = buildSubmissionEmailIntents({
  formTitle: 'Anket',
  submissionId: 'sub_456',
  submitterEmail: null,
  notifications: [{ id: 'user_only', type: 'user_confirmation', enabled: true, config: {} }],
})
assert.deepEqual(noSubmitter, { intents: [], skipped: [{ notificationId: 'user_only', reason: 'submitter_email_missing' }] })

console.log('submission-email-intents.test: PASS (MAIL-13H)')
