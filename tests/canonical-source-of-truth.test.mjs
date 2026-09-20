import assert from 'node:assert/strict'
import fs from 'node:fs'
import { loadPacket } from '../scripts/workflow.mjs'

const canonical = 'docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/'
const bridgeFiles = [
  'AI-RELEASE-EXECUTION-PLAN.md',
  'RELEASE-ROADMAP.md',
  'IMPLEMENTATION-AUDIT-AND-MICROPHASE-PLAN.md',
  'CLOUD-DEBUG-HANDOFF.md',
  'RELEASE-CHECKLIST.md',
  'RELEASE-DECISION.md',
  'worklog.md',
]

for (const file of bridgeFiles) {
  const content = fs.readFileSync(file, 'utf8')
  assert.match(content, /LEGACY|compatibility bridge|tarihsel/i, `${file} must be a non-normative bridge`)
  assert.equal(fs.existsSync(`docs/legacy/root-docs/${file}`), true, `${file} archive copy is required`)
}

const packet = JSON.parse(fs.readFileSync('docs/workflow/packets/F9-11.json', 'utf8'))
assert.equal(packet.sourceOfTruth, canonical)
assert.throws(() => loadPacket(process.cwd(), 'docs/workflow/packets/F9-09.json'), /canonical source/)

console.log('canonical-source-of-truth: PASS')
