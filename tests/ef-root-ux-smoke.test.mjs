import assert from 'node:assert/strict'
import fs from 'node:fs'

// EF-ROOT-UX-05: canli smoke kancalari. Bu dosya statik baglantiyi kilitler;
// gercek desktop + dar mobil smoke scripts/render-check.mjs ile canli kosar
// ve kaniti /tmp altinda saklar (receipt: docs/workflow/receipts/EF-ROOT-UX-05-LIVE-SMOKE.md).

const shell = fs.readFileSync('src/components/mavenforms/app-shell.tsx', 'utf8')
const sidebar = fs.readFileSync('src/components/mavenforms/sidebar.tsx', 'utf8')
const topbar = fs.readFileSync('src/components/mavenforms/topbar.tsx', 'utf8')
const bar = fs.readFileSync('src/components/mavenforms/event-bar.tsx', 'utf8')
const eventList = fs.readFileSync('src/components/mavenforms/views/event-list-view.tsx', 'utf8')
const eventDashboard = fs.readFileSync('src/components/mavenforms/views/event-dashboard-view.tsx', 'utf8')
const dashboard = fs.readFileSync('src/components/mavenforms/views/dashboard-view.tsx', 'utf8')

// Smoke hedefleri render edilir
for (const [name, source, marker] of [
  ['shell/event-bar', shell, '<EventBar />'],
  ['shell/sidebar', shell, '<Sidebar />'],
  ['shell/dashboard', shell, '<DashboardView />'],
  ['shell/events', shell, '<EventListView />'],
  ['shell/registrations', shell, '<RegistrationInboxView />'],
  ['bar-testid', bar, 'data-testid="event-bar"'],
  ['event-list-testid', eventList, 'data-testid="event-list"'],
  ['event-dashboard-testid', eventDashboard, 'data-testid="event-dashboard"'],
  ['event-modules-testid', eventDashboard, 'data-testid="event-dashboard-modules"'],
  ['dashboard-no-event-testid', dashboard, 'data-testid="dashboard-no-event"'],
]) {
  assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `smoke target must render: ${name}`)
}

// Desktop sidebar + mobil menu kirilimi
assert.match(sidebar, /hidden flex-col[\s\S]*md:flex/, 'sidebar must collapse below desktop widths')
assert.match(topbar, /md:hidden/, 'mobile menu trigger must exist on narrow viewports')

// Smoke etkilesim kancalari: sidebar CTA -> events + create formu
assert.match(sidebar, /Yeni Etkinlik/, 'smoke must find the primary CTA label')
assert.match(eventList, /data-testid="event-create-form"/, 'smoke must find the event create form')

console.log('EF-ROOT-UX-05 smoke hook checks passed')
