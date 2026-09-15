import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')

assert(src.includes('notificationBody'), 'notification editor must keep a dedicated body draft')
assert(src.includes('config = { to: notificationTo.trim(), subject: notificationSubject.trim() || \'Yeni Kayıt: {form_title}\', body: notificationBody.trim() }'), 'notification save must send the custom body as config.body')
assert(src.includes('Bildirim gövdesi'), 'notification editor must expose the message body')
assert(src.includes('notificationType !== \'webhook\''), 'webhook notifications must not expose an email body control')
assert(src.includes('setNotificationBody(\'\')'), 'new notification flow must reset the body draft')

console.log('notification-body-editor.test: PASS (AC-NOTIFICATION-BODY-01)')
