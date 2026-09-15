import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const sidebar = readFileSync('src/components/mavenforms/sidebar.tsx', 'utf8')

assert.match(sidebar, /<button\n\s+onClick=\{toggleSidebar\}\n\s+aria-label=\{sidebarCollapsed \? 'Kenar çubuğunu genişlet' : 'Kenar çubuğunu daralt'\}\n\s+title=\{sidebarCollapsed \? 'Kenar çubuğunu genişlet' : 'Kenar çubuğunu daralt'\}/, 'sidebar toggle needs state-based accessible name and tooltip')
assert.match(sidebar, /Daralt/, 'expanded sidebar must retain its visible collapse label')

console.log('form-ux-sidebar-toggle-a11y.test: PASS')
