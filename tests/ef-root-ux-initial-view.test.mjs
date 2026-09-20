import assert from 'node:assert/strict'
import fs from 'node:fs'

// EF-ROOT-UX-02: store + app-shell + ilk route + dashboard + mobil menu
// event-first acilis sozlesmesi. Yeni kullanici Forms ekranina dusmez.

const store = fs.readFileSync('src/lib/store.ts', 'utf8')
const shell = fs.readFileSync('src/components/mavenforms/app-shell.tsx', 'utf8')
const dashboard = fs.readFileSync('src/components/mavenforms/views/dashboard-view.tsx', 'utf8')
const eventDashboard = fs.readFileSync('src/components/mavenforms/views/event-dashboard-view.tsx', 'utf8')
const topbar = fs.readFileSync('src/components/mavenforms/topbar.tsx', 'utf8')

// Store: ilk view dashboard; forms-first acilis yok
assert.match(store, /view: 'dashboard'/, 'store initial view must be dashboard')
assert.doesNotMatch(store, /view: 'forms',/, 'store initial state must not open on the forms screen')
assert.doesNotMatch(store, /view: 'events',/, 'store initial view must stay dashboard (event entry via CTA, not forced route)')

// App-shell: ilk route dashboard; yetkisiz donus dashboard
assert.match(shell, /view === 'dashboard' && <DashboardView/, 'shell first route must render the dashboard')
assert.match(shell, /view: 'dashboard', initialized: true/, 'unauthorized fallback must return to dashboard')
assert.match(shell, /getStoredToken\(\)/, 'shell must restore the persisted session token')
assert.match(shell, /mavenforms-theme/, 'shell must restore the persisted theme')

// Dashboard: birincil CTA Yeni Etkinlik -> events akisi; banner form-first degil
assert.match(dashboard, /Yeni Etkinlik/, 'dashboard primary action must be Yeni Etkinlik')
assert.match(dashboard, /mavenforms:new-event/, 'dashboard must open the event creation flow')
assert.match(dashboard, /setView\('events'\)/, 'dashboard CTA must enter the events workspace')
assert.doesNotMatch(dashboard, /mavenforms:new-form/, 'dashboard must not fire the form dialog as primary action')

// Event Dashboard: secili eventten modullere baglanti
assert.match(eventDashboard, /data-testid="event-dashboard-modules"/, 'event dashboard must expose module links')
for (const target of ["setView('forms')", "setView('registrations')", "setView('finance')", "setView('badges')", "setView('checkin')", "setView('floor')"]) {
  assert.match(eventDashboard, new RegExp(target.replace(/[()']/g, (c) => `\\${c}`)), `event dashboard must link to ${target}`)
}

// Mobil menu: Etkinlikler erisilebilir
assert.match(topbar, /events: \{ title: 'Etkinlikler'/, 'mobile menu map must include events')
assert.match(topbar, /'event-dashboard': \{/, 'mobile menu map must include the event dashboard')
assert.match(topbar, /registrations: \{ title: 'Kayıtlar'/, 'mobile menu map must include registrations')

console.log('EF-ROOT-UX-02 initial view checks passed')
