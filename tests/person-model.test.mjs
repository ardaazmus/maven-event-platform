import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
assert(schema.includes('model Person '), 'Person modeli olmalı')
assert(schema.includes('workspaceId'), 'workspace scope olmalı')
assert(schema.includes('email'), 'contact email olmalı')

console.log('person-model.test: PASS')
