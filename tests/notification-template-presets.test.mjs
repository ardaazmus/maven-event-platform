import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')

assert(src.includes('Hazır mesaj şablonu'), 'notification editor must expose a template selector')
assert(src.includes('Yönetici: Yeni yanıt'), 'notification editor must expose an admin notification preset')
assert(src.includes('Katılımcı: Yanıtınız alındı'), 'notification editor must expose a participant confirmation preset')
assert(src.includes('notificationType !== \'webhook\''), 'webhook notifications must not expose email presets')
assert(src.includes("setNotificationSubject('Yanıtınız alınmıştır: {form_title}')"), 'participant preset must use the supported form title tag')
assert(src.includes("setNotificationBody('Form yanıtınız başarıyla alındı.')"), 'participant preset must use a transactional body')
assert(src.includes("setNotificationBody('Yeni bir form yanıtı alındı.\\n{entry_data}')"), 'admin preset must use the server-resolved entry data tag')

console.log('notification-template-presets.test: PASS (AC-NOTIFICATION-TEMPLATE-PRESETS-01)')
