import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
for (const m of ['model Abstract {', 'model AbstractReview {']) {
  assert(schema.includes(m), `${m} olmali`)
}
for (const f of ['authorName', 'status', 'score', 'reviewerId', 'abstracts     Abstract[]', 'reviews   AbstractReview[]']) {
  assert(schema.includes(f), `${f} olmali`)
}

console.log('abstract-model.test: PASS')
