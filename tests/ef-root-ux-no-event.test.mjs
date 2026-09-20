import assert from 'node:assert/strict'
import fs from 'node:fs'

// EF-ROOT-UX-03: event yoksa dashboard gorunur Ilk Etkinligi Olustur
// empty state gosterir; kullanici forms ekraninda birakilmaz.

const dashboard = fs.readFileSync('src/components/mavenforms/views/dashboard-view.tsx', 'utf8')

// Gorunur empty state + erisilebilir CTA
assert.match(dashboard, /data-testid="dashboard-no-event"/, 'dashboard must expose the no-event empty state')
assert.match(dashboard, /Henüz etkinliğiniz yok/, 'empty state must name the no-event condition')
assert.match(dashboard, /İlk Etkinliği Oluştur/, 'empty state must offer creating the first event')
assert.match(dashboard, /aria-label="İlk etkinliği oluştur"/, 'empty state CTA must carry an accessible name')

// CTA events akisina acar
assert.match(dashboard, /setView\('events'\)/, 'empty state CTA must enter the events workspace')
assert.match(dashboard, /mavenforms:new-event/, 'empty state CTA must open the event creation flow')

// Durum ayrimi: yukleme bitmeden ve hata durumunda kart gosterilmez
assert.match(dashboard, /'\/api\/events'/, 'dashboard must read the real events list')
assert.match(dashboard, /eventCount === 0/, 'card must render only when the loaded list is empty')
assert.match(dashboard, /eventsFailed/, 'fetch failure must suppress the empty-state card')

console.log('EF-ROOT-UX-03 no-event empty state checks passed')
