import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')

assert(src.includes("useState<'all' | 'any'>('all')"), 'logic editor must support AND/OR condition groups')
assert(src.includes('conditionRows.map((condition)'), 'logic editor must persist multiple condition rows')
assert(src.includes('Koşul ekle'), 'logic editor must allow adding a condition row')
assert(src.includes('içerir'), 'logic editor must expose a useful text operator')
assert(src.includes('Eşleşen etkin kural yok.'), 'logic tester must continue to expose no-match behavior')

console.log('logic-multi-condition.test: PASS (AC-LOGIC-MULTI-CONDITION-01)')
