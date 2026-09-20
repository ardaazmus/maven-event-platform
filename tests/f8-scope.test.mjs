import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const adr = readFileSync('docs/adr/0006-f8-module-order.md', 'utf8')
assert(adr.includes('Program/Speaker'), 'varsayılan sıra yazmalı')
assert(adr.includes('Talep gelmeden'), 'talep kuralı yazmalı')

const reg = JSON.parse(readFileSync('docs/workflow/evidence-registry.json', 'utf8'))
const f8 = reg.capabilities.find((c) => c.id === 'F8-program')
assert(f8 && f8.state === 'LOCAL_PASS', 'registry F8 LOCAL_PASS olmalı')

console.log('f8-scope.test: PASS')
