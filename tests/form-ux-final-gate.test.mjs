import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')

const shell = read('src/components/mavenforms/app-shell.tsx')
const sidebar = read('src/components/mavenforms/sidebar.tsx')
const topbar = read('src/components/mavenforms/topbar.tsx')
const builder = read('src/components/mavenforms/views/form-builder-view.tsx')
const forms = read('src/components/mavenforms/views/forms-list-view.tsx')
const publicRenderer = read('src/components/mavenforms/public-form-renderer.tsx')

for (const view of ['DashboardView', 'FormsListView', 'FormBuilderView', 'SubmissionsView', 'ReportsView', 'SettingsView', 'AuditView', 'UsersView']) {
  assert.match(shell, new RegExp(`<${view} ?/?>`), `app shell must render ${view}`)
}

assert.match(sidebar, /onClick=\{\(\) => \{[\s\S]*setView\('forms'\)/, 'new form action must enter the forms workspace')
assert.match(sidebar, /onClick=\{toggleSidebar\}/, 'sidebar collapse action must remain wired')
assert.match(topbar, /aria-label="Menüyü aç"/, 'mobile menu must have an accessible name')
assert.match(topbar, /onClick=\{\(\) => useApp\.getState\(\)\.setView\('settings'\)\}/, 'account settings action must navigate to settings')
assert.match(builder, /aria-pressed=\{device === d\.id\}/, 'builder device switch must expose selected state')
assert.match(forms, /onClick=\{onOpen\}/, 'form card must open the selected form workspace')
assert.match(publicRenderer, /\/api\/public\/forms\/\$\{form\.slug\}\/submissions/, 'public form submit must use the public server route')

// A visible control without an action must be explicit about its deferred state.
assert.match(topbar, /disabled[\s\S]{0,80}aria-label="Yardım \(yakında\)"/, 'unimplemented help control must be visibly deferred')
assert.match(topbar, /disabled>[\s\S]{0,220}Yeni workspace/, 'SaaS workspace creation must remain explicitly deferred')
assert.match(sidebar, /disabled[\s\S]{0,160}Planı Yükselt/, 'SaaS upgrade control must remain explicitly deferred')
assert.match(builder, /title="Geri al"[\s\S]{0,100}disabled/, 'unwired undo control must not appear active')
assert.match(builder, /title="İleri al"[\s\S]{0,100}disabled/, 'unwired redo control must not appear active')

console.log('form-ux-final-gate.test: PASS')
