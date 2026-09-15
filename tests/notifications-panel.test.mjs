import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')

assert(src.includes("/api/forms/${form.id}/notifications/${id}"), 'notification toggles must use the form-scoped notification endpoint')
assert(src.includes('onCheckedChange={(enabled) => void toggleNotification(n.id, enabled)}'), 'notification switches must perform a real update')
assert(src.includes('Bildirim güncellenemedi'), 'notification update failures must be visible')
assert(src.includes('aria-label={`${n.name} bildirimini etkinleştir`}'), 'notification switches must have accessible names')

console.log('notifications-panel.test: PASS (AC-NOTIFICATIONS-TOGGLE-01)')
