import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const view = readFileSync('src/components/mavenforms/views/sponsor-view.tsx', 'utf8')

// Olusturma formu kimligi ve alanlari
assert(view.includes('data-testid="sponsor-create-form"'), 'olusturma formu test kimligi tasimali')
assert(view.includes('Sponsor adı'), 'ad girdisi olmali')
assert(view.includes('Sponsor seviyesi'), 'seviye secimi olmali')
assert(view.includes('Sponsor oluştur'), 'olusturma dugmesi olmali')

// Stand formu kimligi ve alanlari
assert(view.includes('data-testid="sponsor-booth-form"'), 'stand formu test kimligi tasimali')
assert(view.includes('Stand ata'), 'atama tetikleyici olmali')
assert(view.includes('Stand kodu'), 'kod girdisi olmali')

// Gercek POST zincirleri + liste yenileme + hata
assert(view.includes("method: 'POST'"), 'POST ile yazmali')
assert(view.includes('/sponsors'), 'sponsor endpointine gitmeli')
assert(view.includes('/booths'), 'stand endpointine gitmeli')
assert(view.includes('loadSponsors(selectedEventId)'), 'liste yenilenmeli')
assert(view.includes('Stand kodu gerekli'), 'kod guard olmali')

// Guard korunur; website metin; yalniz POST yazimi var
assert(view.includes('if (!selectedEventId) return'), 'erken-cikis guard seklinde olmali')
assert(!view.includes('<a '), 'harici baglanti olmamali')
assert(!view.includes("method: 'PUT'"), 'PUT olmamali')
assert(!view.includes("method: 'DELETE'"), 'DELETE olmamali')

console.log('ux-sponsor-ui.test: PASS (sponsor UI kilitli)')
