import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const view = readFileSync('src/components/mavenforms/views/survey-view.tsx', 'utf8')

// Olusturma formu kimligi ve alanlari
assert(view.includes('data-testid="survey-create-form"'), 'olusturma formu test kimligi tasimali')
assert(view.includes('Anket başlığı'), 'baslik girdisi olmali')
assert(view.includes('Anket açıklaması'), 'aciklama girdisi olmali')
assert(view.includes('Anket oluştur'), 'olusturma dugmesi olmali')

// Yanit formu kimligi ve alanlari
assert(view.includes('data-testid="survey-respond-form"'), 'yanit formu test kimligi tasimali')
assert(view.includes('Yanıtla'), 'yanit tetikleyici olmali')
assert(view.includes('Yanıt metni'), 'yanit girdisi olmali')
assert(view.includes('Yanıtlayan adı'), 'yanitlayan girdisi olmali')

// Gercek POST zincirleri + liste yenileme + hata
assert(view.includes("method: 'POST'"), 'POST ile yazmali')
assert(view.includes('/surveys'), 'survey endpointine gitmeli')
assert(view.includes('/responses'), 'yanit endpointine gitmeli')
assert(view.includes('answers: { text:'), 'yanit govdesi tasimali')
assert(view.includes('loadSurveys(selectedEventId)'), 'liste yenilenmeli')
assert(view.includes('Yanıt metni gerekli'), 'bos yanit guard olmali')

// Guard korunur; yalniz POST yazimi var
assert(view.includes('if (!selectedEventId) return'), 'erken-cikis guard seklinde olmali')
assert(!view.includes("method: 'PUT'"), 'PUT olmamali')
assert(!view.includes("method: 'DELETE'"), 'DELETE olmamali')

console.log('ux-survey-ui.test: PASS (anket UI kilitli)')
