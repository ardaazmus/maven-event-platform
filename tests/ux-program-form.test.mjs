import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const view = readFileSync('src/components/mavenforms/views/program-view.tsx', 'utf8')

// Form kimligi ve alanlari
assert(view.includes('data-testid="program-create-form"'), 'form test kimligi tasimali')
assert(view.includes('Oturum başlığı'), 'baslik girdisi olmali')
assert(view.includes('datetime-local'), 'tarih-saat girdisi olmali')
assert(view.includes('Salon'), 'salon girdisi olmali')
assert(view.includes('Oturum oluştur'), 'olusturma dugmesi olmali')

// Gercek POST + liste yenileme + hata
assert(view.includes("method: 'POST'"), 'POST ile yazmali')
assert(view.includes('/program'), 'program endpointine gitmeli')
assert(view.includes('toISOString'), 'ISO zaman gondermeli')
assert(view.includes('loadProgram(selectedEventId)'), 'liste yenilenmeli')
assert(view.includes('role="alert"'), 'hata gosterimi olmali')

// Guard korunur; yalniz POST yazimi var
assert(view.includes('if (!selectedEventId) return'), 'erken-cikis guard seklinde olmali')
assert(view.includes('Önce etkinlik seçin'), 'event-gerekcesi korunmali')
assert(!view.includes("method: 'PUT'"), 'PUT olmamali')
assert(!view.includes("method: 'DELETE'"), 'DELETE olmamali')

console.log('ux-program-form.test: PASS (oturum formu kilitli)')
