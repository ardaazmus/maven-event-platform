import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const files = readdirSync('tests')
  .filter((f) => f.endsWith('.test.mjs'))
  .filter((f) => /^(event|person|registration|outbox-generic|order|payment|finance|invoice|ticket|checkin|credential|id-mapping|plan-binding|hold|inventory|paid-booking|checkout|webhook-contract|live-gates|f7-gates|program|f8-scope|f9-freeze)-/.test(f))
  .sort()

let pass = 0
const failed = []
for (const f of files) {
  const r = spawnSync('bun', [`tests/${f}`], { encoding: 'utf8' })
  if (r.status === 0) {
    pass++
  } else {
    failed.push(f)
    console.log(`FAIL ${f}\n${(r.stdout || '') + (r.stderr || '')}`.slice(0, 500))
  }
}
console.log(`sweep: ${pass}/${files.length} PASS`)
if (failed.length) {
  console.error(`failed: ${failed.join(',')}`)
  process.exit(1)
}
