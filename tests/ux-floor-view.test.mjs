import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const view = readFileSync('src/components/mavenforms/views/floor-view.tsx', 'utf8')
const types = readFileSync('src/lib/types.ts', 'utf8')
const sidebar = readFileSync('src/components/mavenforms/sidebar.tsx', 'utf8')
const shell = readFileSync('src/components/mavenforms/app-shell.tsx', 'utf8')

// Tip + menu + shell baglantisi
assert(types.includes("| 'floor'"), 'AppView floor tasimali')
assert(sidebar.includes("id: 'floor'") && sidebar.includes('Floor Plan'), 'sidebar Floor Plan ogesi tasimali')
assert(shell.includes('<FloorView />'), 'shell floor gorunumunu render etmeli')

// Surum + hold rozetleri, geometri yok
assert(view.includes('/plan-bindings'), 'baglanti listesi gercek API olmali')
assert(view.includes('/holds'), 'hold listesi gercek API olmali')
assert(view.includes('Sürüm'), 'surum gosterilmeli')
assert(view.includes('Vade:'), 'vade gosterilmeli')
assert(view.includes('Floor Editor'), 'sahiplik notu olmali')
assert(!view.includes('svg') && !view.includes('canvas'), 'geometri uretilmemeli')

// Secim-yok gerekcesi; mutation yok
assert(view.includes('Önce etkinlik seçin'), 'secim-yok gerekcesi olmali')
assert(!view.includes('POST') && !view.includes('method:'), 'gorunum yalniz GET yapmali')

console.log('ux-floor-view.test: PASS (floor gorunumu kilitli)')
