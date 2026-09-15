import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')

assert(src.includes('Bildirimi düzenle'), 'notification editor must support editing an existing notification')
assert(src.includes('Bildirim güncellenemedi'), 'notification edit failures must be visible')
assert(src.includes('bildirimini düzenle'), 'notification edit control must have an accessible name')
assert(src.includes('bildirimini sil'), 'notification delete control must have an accessible name')
assert(src.includes('if (!confirm(`“${notification.name}” silinsin mi?`)) return'), 'notification delete must require confirmation')

console.log('notification-edit-delete.test: PASS (AC-NOTIFICATION-EDIT-DELETE-01)')
