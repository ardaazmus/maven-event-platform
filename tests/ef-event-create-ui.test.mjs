import assert from 'node:assert'
import { readFileSync } from 'node:fs'

// EF-02B: EventListView create-action contract (serverless static assertions).
// Locks: primary action exists in header AND empty state, mutation wired to
// POST /api/events, loading/error/success/keyboard/label states present.

const view = readFileSync('src/components/mavenforms/views/event-list-view.tsx', 'utf8')

// Primary action visible in both non-empty and empty states
assert(view.includes('Yeni Etkinlik'), 'Yeni Etkinlik aksiyonu olmali')
assert(view.includes('aria-label="Yeni Etkinlik oluştur"'), 'header aksiyonu etiketli olmali')
assert(view.includes('aria-label="İlk etkinliği oluştur"'), 'bos-liste aksiyonu etiketli olmali')

// Mutation: POST /api/events with trimmed title, nullable description
assert(view.includes("'/api/events'"), 'events endpoint cagrilmali')
assert(view.includes("method: 'POST'"), 'POST method olmali')
assert(view.includes('title.trim()'), 'title trim edilmeli')
assert(view.includes('description: description.trim() || null'), 'description nullable olmali')

// Guard: empty title blocked client-side with message, submit disabled
assert(view.includes('Etkinlik adı gerekli.'), 'bos ad mesaji olmali')
assert(view.includes('disabled={saving || !title.trim()}'), 'kaydet guard olmali')

// Loading state: spinner + label, cancel disabled while saving
assert(view.includes('Oluşturuluyor...'), 'yukleniyor metni olmali')
assert(view.includes('disabled={saving}'), 'vazgec kayitta kilitli olmali')

// Error state: assertive, inline
assert(view.includes('role="alert"'), 'hata role=alert olmali')
assert(view.includes("err?.message || 'Etkinlik oluşturulamadı.'"), 'server hatasi gosterilmeli')

// Success: list refresh + select new event + open dashboard
assert(view.includes('selectEvent(created.id)'), 'yeni event secilmeli')
assert(view.includes("setView('event-dashboard')"), 'dashboard acilmali')

// GET unwrap: api() tek seviyeyi acar, cift body.data cozulmemeli
assert(view.includes('api<EventRow[]>'), 'liste GET tek-seviye cozulmeli')
assert(!view.includes('{ data: EventRow[] }'), 'cift data cozumu olmamali')

// Keyboard/labels: native labeled controls, Enter submits
assert(view.includes('htmlFor="event-create-title"'), 'title label bagli olmali')
assert(view.includes('htmlFor="event-create-description"'), 'description label bagli olmali')
assert(view.includes("event.key === 'Enter'"), 'Enter ile gonderim olmali')
assert(view.includes('maxLength={200}'), 'title 200 sinirli olmali')
assert(view.includes('maxLength={2000}'), 'description 2000 sinirli olmali')

// Existing behavior preserved: select flow and list states untouched
assert(view.includes("setView('event-dashboard')"), 'secim akisi korunmali')
assert(view.includes('data-testid="event-list"'), 'liste testid korunmali')
assert(view.includes('Etkinlikler yükleniyor...'), 'liste yukleniyor korunmali')

console.log('ef-event-create-ui: PASS')
