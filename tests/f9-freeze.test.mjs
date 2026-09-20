import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const adr = readFileSync('docs/adr/0007-f9-freeze.md', 'utf8')
assert(adr.includes('AÇILMAZ'), 'freeze kaydı olmalı')
assert(adr.includes('RLS'), 'RLS duruşu olmalı')

const reg = JSON.parse(readFileSync('docs/workflow/evidence-registry.json', 'utf8'))
const f9 = reg.capabilities.find((c) => c.id === 'F9-freeze')
assert(f9 && (f9.state === 'LOCAL_PASS' || f9.state === 'EXTERNAL_DEPENDENCY'), 'registry F9 olmalı')

console.log('f9-freeze.test: PASS')
