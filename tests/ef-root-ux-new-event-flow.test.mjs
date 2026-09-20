import assert from 'node:assert/strict'
import fs from 'node:fs'

// EF-ROOT-UX-04B: cross-view Yeni Etkinlik yarisi pending-intent sozlesmesi.
// setView sonrasi dispatch, henuz mount olmamis EventListView tarafindan
// kacirilmamali; ayni gorunumde hizli yol calismaya devam eder.

const sidebar = fs.readFileSync('src/components/mavenforms/sidebar.tsx', 'utf8')
const dashboard = fs.readFileSync('src/components/mavenforms/views/dashboard-view.tsx', 'utf8')
const eventList = fs.readFileSync('src/components/mavenforms/views/event-list-view.tsx', 'utf8')

// CTA siteleri pending intent yazar + ayni-gorunum dispatch korunur
for (const [name, source] of [['sidebar', sidebar], ['dashboard', dashboard]]) {
  assert.match(source, /mavenforms:new-event-pending/, `${name} must write the pending create intent`)
  assert.match(source, /mavenforms:new-event/, `${name} must keep the same-view dispatch`)
}
assert.match(sidebar, /setView\('events'\)/, 'sidebar must still enter the events workspace')

// Liste mount aninda intent tuketir, ayni-gorunum dinleyici korunur
assert.match(eventList, /getItem\('mavenforms:new-event-pending'\)/, 'event list must consume the pending intent on mount')
assert.match(eventList, /removeItem\('mavenforms:new-event-pending'\)/, 'pending intent must be cleared on consume')
assert.match(eventList, /addEventListener\('mavenforms:new-event'/, 'event list must keep the same-view listener')

// Durduk yere acilis yok: form baslangicta kapali
assert.match(eventList, /useState\(false\)/, 'create form must start closed')
assert.match(eventList, /method: 'POST'/, 'event creation mutation must remain wired')

console.log('EF-ROOT-UX-04B new-event flow checks passed')
