import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const view = readFileSync('src/components/mavenforms/views/abstract-view.tsx', 'utf8')

// Gonderme formu kimligi ve alanlari
assert(view.includes('data-testid="abstract-submit-form"'), 'gonderme formu test kimligi tasimali')
assert(view.includes('Yazar adı'), 'yazar girdisi olmali')
assert(view.includes('Bildiri başlığı'), 'baslik girdisi olmali')
assert(view.includes('Bildiri gövdesi'), 'govde girdisi olmali')
assert(view.includes('Bildiri gönder'), 'gonderme dugmesi olmali')

// Degerlendirme formu kimligi ve alanlari
assert(view.includes('data-testid="abstract-review-form"'), 'degerlendirme formu test kimligi tasimali')
assert(view.includes('Değerlendir'), 'degerlendirme tetikleyici olmali')
assert(view.includes('Skor 0-100'), 'skor girdisi olmali')

// Gercek POST zincirleri + liste yenileme + hata
assert(view.includes("method: 'POST'"), 'POST ile yazmali')
assert(view.includes('/abstracts'), 'abstract endpointine gitmeli')
assert(view.includes('/reviews'), 'review endpointine gitmeli')
assert(view.includes('loadAbstracts(selectedEventId)'), 'liste yenilenmeli')
assert(view.includes('0-100 arası tam sayı'), 'skor guard olmali')

// Guard korunur; yalniz POST yazimi var
assert(view.includes('if (!selectedEventId) return'), 'erken-cikis guard seklinde olmali')
assert(!view.includes("method: 'PUT'"), 'PUT olmamali')
assert(!view.includes("method: 'DELETE'"), 'DELETE olmamali')

console.log('ux-abstract-ui.test: PASS (bildiri UI kilitli)')
