import assert from 'node:assert/strict'
import fs from 'node:fs'

const legacyIds = [
  'BADGE-00', 'BADGE-01', 'FORM-UX-04', 'FORM-UX-05', 'FORM-UX-05A',
  'FORM-UX-15', 'FORM-UX-15-R1', 'FORM-UX-24', 'FORM-UX-30', 'FORM-UX-69',
  'V1-00', 'V1-04', 'V2-00', 'V2-04C', 'V2-09', 'V3-01A', 'V3-01B',
  'F0-06', 'F1-24', 'F9-08',
]

const workflow = fs.readFileSync('scripts/workflow.mjs', 'utf8')
assert.match(workflow, /packet\.lifecycle === 'SUPERSEDED'/, 'workflow must reject superseded packets')

for (const id of legacyIds) {
  const packet = JSON.parse(fs.readFileSync(`docs/workflow/packets/${id}.json`, 'utf8'))
  assert.equal(packet.status, 'READY', `${id} must remain structurally valid`)
  assert.equal(packet.lifecycle, 'SUPERSEDED', `${id} must be marked as superseded`)
  assert.ok(packet.supersededBy, `${id} must point to its replacement`)
}

console.log('workflow-legacy-packets: PASS')
