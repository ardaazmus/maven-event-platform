import assert from 'node:assert/strict'
import { DEFAULT_CAPABILITY_EVIDENCE, summarizeCapabilityEvidence } from '../src/components/mavenforms/capability-evidence-checklist.tsx'
import { readFileSync } from 'node:fs'

assert.equal(summarizeCapabilityEvidence(), 'blocked')
assert.equal(DEFAULT_CAPABILITY_EVIDENCE.find(item => item.id === 'v2_payment')?.status, 'tested')
assert.equal(DEFAULT_CAPABILITY_EVIDENCE.find(item => item.id === 'manual_invoice')?.status, 'verified')
assert.equal(DEFAULT_CAPABILITY_EVIDENCE.find(item => item.id === 'parasut')?.status, 'blocked')
assert.equal(summarizeCapabilityEvidence([{ id: 'one', label: 'Tek', status: 'verified', detail: 'Yerel' }]), 'verified')
assert.equal(summarizeCapabilityEvidence([{ id: 'one', label: 'Tek', status: 'tested', detail: 'Yerel' }]), 'partial')

const center = readFileSync('src/components/mavenforms/views/invoice-center-view.tsx', 'utf8')
assert(center.includes("import { CapabilityEvidenceChecklist }"), 'invoice center must import capability checklist')
assert(center.includes('<CapabilityEvidenceChecklist />'), 'invoice center must expose capability checklist')

const source = readFileSync('src/components/mavenforms/capability-evidence-checklist.tsx', 'utf8')
for (const marker of ['Yerel test', 'Doğrulandı', 'Bloklu', 'Paraşüt API v4', 'R-10', 'production release onayı değildir']) {
  assert(source.includes(marker), `capability checklist missing ${marker}`)
}
assert.equal(source.includes('fetch('), false)
assert.equal(source.includes('db.'), false)
assert.equal(source.includes('credentialsEnvelope'), false)

console.log('capability-evidence-checklist.test: PASS (R10-V4-30)')
