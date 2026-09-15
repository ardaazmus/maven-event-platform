import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')

assert(src.includes("/api/forms/${form.id}/notifications"), 'notification editor must create through the form-scoped endpoint')
assert(src.includes('onClick={() => setIsAdding((current) => !current)}'), 'Bildirim Ekle must open a real editor')
assert(src.includes('Bildirim türü') && src.includes('Alıcı / webhook URL'), 'notification editor must expose delivery settings')
assert(src.includes('Bildirimi kaydet'), 'notification editor must have an explicit save action')
assert(src.includes('Bildirim eklenemedi'), 'notification editor failures must be visible')

console.log('notification-create.test: PASS (AC-NOTIFICATION-CREATE-01)')
