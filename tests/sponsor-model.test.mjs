import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
for (const m of ['model Sponsor {', 'model SponsorBooth {']) {
  assert(schema.includes(m), `${m} olmali`)
}
for (const f of ['tier', 'website', 'booths    SponsorBooth[]', 'sponsors      Sponsor[]', 'code', '@@unique([sponsorId, code])']) {
  assert(schema.includes(f), `${f} olmali`)
}

console.log('sponsor-model.test: PASS')
