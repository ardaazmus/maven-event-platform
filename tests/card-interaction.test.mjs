import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/views/forms-list-view.tsx','utf8')
assert(src.includes('FormCard'), 'must have FormCard')
assert(src.includes('Ayarlar'), 'must have Ayarlar button')
assert(!src.includes('absolute bottom-3 right-3'), 'card must not overlay controls over footer text')
assert((src.match(/ayarlarını aç/g) || []).length >= 1, 'card settings must have an accessible name')
assert(src.includes('type="button"'), 'settings must be a button, not a card navigation side effect')
assert(src.includes('onAction') && src.includes('settings'), 'Ayarlar must call onAction settings')
assert(src.includes('aspectRatio') && src.includes('16 / 9'), 'card must have 16/9')
assert(src.includes('FocusedFormWorkspace') && src.includes('Öne çıkan form'), 'forms screen must keep the focused form visible')
assert(src.includes('onOpenResponses') && src.includes('Son yanıtlar'), 'focused form must show stats and recent responses together')
assert(src.includes('FormSettingsMenu'), 'settings must use the shared tab menu')
assert(src.includes('DropdownMenuLabel') && src.includes('WordPress / Embed'), 'settings menu must expose comprehensive form tabs')
assert(src.includes('Formu yönet') && src.includes('Formu düzenle'), 'focused form must use one management entry point with a direct edit action')
assert(src.includes('formSettingsGroups') && src.includes('Paylaşım ve bağlantılar'), 'form settings must be visibly grouped')
assert(src.includes('max-h-[min(70vh,32rem)]'), 'form management menu must have a bounded viewport height')
assert(src.includes('settings:'), 'settings menu selections must open the selected form tab')
assert(src.includes('onClick={(event) => event.stopPropagation()}'), 'settings menu must not trigger the card navigation handler')
assert(src.includes("tab === 'submissions'"), 'responses menu item must open the selected form responses')

console.log('card-interaction.test: PASS (AC-CARD-01)')
