import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const view = readFileSync('src/components/mavenforms/views/reports-view.tsx', 'utf8')

// Event-first form secimi
assert(view.includes('selectedEventId'), 'event baglami okunmali')
assert(view.includes('/bindings'), 'baglanti listesi okunmali')
assert(view.includes('firstBound'), 'ilk bagli form onceligi olmali')
assert(view.includes('setSelectedForm(firstBound)'), 'bagli form secilmeli')

// Fallback korunur: baglanti yoksa/hata ilk form
assert(view.includes('setSelectedForm(f[0].id)'), 'fallback ilk form korunmali')

// Olu etiketler ve grafikler degismedi
assert(view.includes('Export (yakında)'), 'export olu etiketi korunmali')
assert(view.includes('Paylaş (yakında)'), 'paylas olu etiketi korunmali')
assert(view.includes('ResponsiveContainer'), 'grafikler korunmali')
assert(view.includes('calculateTrendDelta'), 'trend hesabi korunmali')

console.log('ux-reports-event-scope.test: PASS (event-first rapor secimi kilitli)')
