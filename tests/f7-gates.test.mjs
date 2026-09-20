import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const adr = readFileSync('docs/adr/0005-f7-gates.md', 'utf8')
for (const k of ['F7A', 'F7B', 'F7C', 'F7D', 'F7E']) assert(adr.includes(k), `${k} kaydı olmalı`)
assert(adr.includes('fallback'), 'manuel fallback kuralı olmalı')

const reg = JSON.parse(readFileSync('docs/workflow/evidence-registry.json', 'utf8'))
const f7 = reg.capabilities.find((c) => c.id === 'F7-auto')
assert(f7 && f7.state === 'EXTERNAL_DEPENDENCY', 'registry F7 EXTERNAL_DEPENDENCY olmalı')

console.log('f7-gates.test: PASS')
