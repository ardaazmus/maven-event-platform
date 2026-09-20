import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
for (const m of ['model ProgramSession {', 'model Speaker {', 'model SessionSpeaker {']) {
  assert(schema.includes(m), `${m} olmalı`)
}

console.log('program-model.test: PASS')
