import assert from 'node:assert/strict'
import fs from 'node:fs'

// EF-ROOT-UX-01: sidebar birincil CTA Yeni Etkinlik sozlesmesi.
// Kilitler: birincil aksiyon Yeni Etkinlik + events akisi; Yeni Form
// birincil CTA degildir; Forms & Intake icinde ikincil/baglamsal kalir.

const sidebar = fs.readFileSync('src/components/mavenforms/sidebar.tsx', 'utf8')
const eventList = fs.readFileSync('src/components/mavenforms/views/event-list-view.tsx', 'utf8')
const forms = fs.readFileSync('src/components/mavenforms/views/forms-list-view.tsx', 'utf8')

// Birincil CTA: Yeni Etkinlik, events workspace + new-event akisi
assert.match(sidebar, /Yeni Etkinlik/, 'sidebar primary action must be labeled Yeni Etkinlik')
assert.match(sidebar, /mavenforms:new-event/, 'sidebar must fire the event creation flow')
assert.match(sidebar, /setView\('events'\)/, 'sidebar primary action must enter the events workspace')
assert.match(sidebar, /aria-label="Yeni Etkinlik/, 'sidebar primary action must carry an accessible name')

// Yeni Form birincil CTA olarak kalamaz
assert.doesNotMatch(sidebar, /mavenforms:new-form/, 'sidebar primary action must not open the form dialog')
assert.doesNotMatch(sidebar, /<span>Yeni Form<\/span>/, 'Yeni Form must not remain the sidebar primary label')

// Event listesi new-event akisini karsilar, POST /api/events korunur
assert.match(eventList, /mavenforms:new-event/, 'event list must listen to the sidebar creation flow')
assert.match(eventList, /setFormOpen\(true\)/, 'new-event flow must open the event create form')
assert.match(eventList, /method: 'POST'/, 'event creation mutation must remain wired')

// Yeni Form korunur: Forms & Intake icinde ikincil/baglamsal + dialog
assert.match(forms, /mavenforms:new-form/, 'forms list must keep the new-form dialog wiring')
assert.match(forms, /<Dialog open=\{newFormOpen\}/, 'new form dialog must remain wired')
assert.match(forms, /Yeni Form/, 'forms list must keep a contextual secondary create action')

console.log('EF-ROOT-UX-01 sidebar CTA checks passed')
