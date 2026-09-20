import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const sidebar = readFileSync('src/components/mavenforms/sidebar.tsx', 'utf8')

// R4: behavior assertions — prop order in JSX is irrelevant
assert.match(sidebar, /onClick=\{toggleSidebar\}/, 'sidebar toggle needs click handler')
assert.match(sidebar, /aria-label=\{sidebarCollapsed \? 'Kenar çubuğunu genişlet' : 'Kenar çubuğunu daralt'\}/, 'sidebar toggle needs state-based accessible name')
assert.match(sidebar, /title=\{sidebarCollapsed \? 'Kenar çubuğunu genişlet' : 'Kenar çubuğunu daralt'\}/, 'sidebar toggle needs state-based tooltip')
assert.match(sidebar, /Daralt/, 'expanded sidebar must retain its visible collapse label')

console.log('form-ux-sidebar-toggle-a11y.test: PASS')
