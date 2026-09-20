import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const view = readFileSync('src/components/mavenforms/views/program-view.tsx', 'utf8')

// Konusmacı formu kimligi ve alanlari
assert(view.includes('data-testid="program-speaker-form"'), 'form test kimligi tasimali')
assert(view.includes('Konuşmacı ekle'), 'ekleme tetikleyici olmali')
assert(view.includes('Konuşmacı adı'), 'ad girdisi olmali')
assert(view.includes('Konuşmacı unvanı'), 'unvan girdisi olmali')

// Olustur + ata zinciri gercek endpointlere gider
assert(view.includes('/program/speakers'), 'speaker olusturma endpointine gitmeli')
assert(view.includes('/speakers'), 'atama endpointine gitmeli')
assert(view.includes('speakerId'), 'atama ID tasimali')
assert(view.includes('loadProgram(selectedEventId)'), 'liste yenilenmeli')
assert(view.includes('Konuşmacı adı gerekli'), 'bos ad guard olmali')

// Guard korunur; yalniz POST yazimi var
assert(view.includes('if (!selectedEventId) return'), 'erken-cikis guard seklinde olmali')
assert(!view.includes("method: 'PUT'"), 'PUT olmamali')
assert(!view.includes("method: 'DELETE'"), 'DELETE olmamali')

console.log('ux-program-speaker-ui.test: PASS (konusmaci UI kilitli)')
