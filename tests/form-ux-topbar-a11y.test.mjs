import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const topbar = readFileSync('src/components/mavenforms/topbar.tsx', 'utf8')

assert.match(topbar, /className="h-9 w-9" aria-label=\{`Tema: \$\{themeLabels\[theme\]\}`\}/, 'theme icon button needs a current-state accessible name')
assert.match(topbar, /className="h-9 w-9 relative" aria-label="Bildirimler"/, 'notification icon button needs an accessible name')
assert.match(topbar, /setTheme\(t\)/, 'theme action must remain wired')
assert.match(topbar, /setView\('submissions'\)/, 'notification action must remain wired')

console.log('form-ux-topbar-a11y.test: PASS')
