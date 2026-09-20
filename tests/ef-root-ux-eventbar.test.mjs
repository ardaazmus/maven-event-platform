import assert from 'node:assert/strict'
import fs from 'node:fs'

// EF-ROOT-UX-04: EventBar no-event durumunda Yeni Etkinlik akisina tasir.
// Bar mutation yapmaz; GET + labelled select sozlesmesi korunur.

const bar = fs.readFileSync('src/components/mavenforms/event-bar.tsx', 'utf8')

// No-event CTA events akisina acar
assert.match(bar, /Yeni Etkinlik/, 'bar must offer the new-event flow when no event is selected')
assert.match(bar, /setView\('events'\)/, 'bar CTA must enter the events workspace')
assert.match(bar, /aria-label="Yeni Etkinlik/, 'bar CTA must carry an accessible name')

// Mevcut sozlesme korunur
assert.match(bar, /Etkinlik seçilmedi/, 'no-selection state must remain')
assert.match(bar, /check-in, yaka kartı ve floor/, 'no-selection reason must remain')
assert.match(bar, /aria-label="Etkinlik seç"/, 'select must keep its accessible name')
assert.match(bar, /'\/api\/events'/, 'bar must keep reading the events endpoint')
assert.doesNotMatch(bar, /POST/, 'bar must not mutate')
assert.doesNotMatch(bar, /method:/, 'bar must stay GET-only')

console.log('EF-ROOT-UX-04 event bar checks passed')
