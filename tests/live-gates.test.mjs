import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const adr = readFileSync('docs/adr/0004-f6-live-gates.md', 'utf8')
assert(adr.includes('EXTERNAL_DEPENDENCY') || adr.includes('merchant'), 'canlı bağımlılık kaydı olmalı')
assert(!/canlı tahsilat tamam|live.*PASS/i.test(adr), 'canlı iddia olmamalı')

const reg = JSON.parse(readFileSync('docs/workflow/evidence-registry.json', 'utf8'))
const live = reg.capabilities.find((c) => c.id === 'F6-live')
assert(live && live.state === 'EXTERNAL_DEPENDENCY', 'registry EXTERNAL_DEPENDENCY olmalı')

console.log('live-gates.test: PASS')
