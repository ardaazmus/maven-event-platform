import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const doc = readFileSync('docs/runbooks/paid-booking-failure.md', 'utf8')
assert(doc.includes('release YOK') || doc.includes('early-release'), 'early-release koruması yazmalı')
assert(doc.includes('reassign') || doc.includes('refund'), 'recovery adımı yazmalı')
assert(doc.includes('editlenmez') || doc.includes('immutable'), 'immutable kural yazmalı')
assert(doc.includes('task'), 'operasyon task yazmalı')

console.log('paid-booking-runbook.test: PASS')
