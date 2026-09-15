import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (file) => fs.readFileSync(file, 'utf8')
const shell = read('src/components/mavenforms/app-shell.tsx')
const sidebar = read('src/components/mavenforms/sidebar.tsx')
const topbar = read('src/components/mavenforms/topbar.tsx')
const store = read('src/lib/store.ts')

for (const view of ['dashboard', 'forms', 'builder', 'submissions', 'reports', 'settings', 'users', 'audit']) {
  assert.match(shell, new RegExp(`view === '${view}'`), `app shell must render ${view}`)
  assert.match(store, new RegExp(`view: AppView`), 'navigation state must use the shared AppView contract')
}

assert.match(sidebar, /navItems: NavItem\[\] = \[/, 'sidebar must keep a canonical primary navigation list')
assert.match(sidebar, /id: 'forms'[\s\S]*selectForm\(''\)[\s\S]*setView\(item\.id\)/, 'forms navigation must clear stale form selection before opening the list')
assert.match(sidebar, /secondaryItems = \[[\s\S]*id: 'users'[\s\S]*id: 'audit'/, 'secondary views must remain reachable from the sidebar')
assert.match(sidebar, /onClick=\{toggleSidebar\}/, 'sidebar collapse control must be wired to state')

assert.match(topbar, /viewTitles: Record<string, \{ title: string; subtitle: string \}>/, 'topbar title must use the shared view map')
assert.match(topbar, /Object\.entries\(viewTitles\)\.map\(\(\[id, item\]\)/, 'mobile menu must enumerate the complete view map')
assert.doesNotMatch(topbar, /Object\.entries\(viewTitles\)\.filter\(\(\[id\]\) => id !== 'audit'\)/, 'audit must not disappear from the mobile navigation')
assert.match(topbar, /if \(id === 'forms'\) useApp\.getState\(\)\.selectForm\(''\)/, 'mobile forms navigation must clear the selected form')
assert.match(topbar, /onClick=\{handleLogout\}/, 'logout control must call the server-backed logout handler')

console.log('form-ux-navigation.test: PASS')
