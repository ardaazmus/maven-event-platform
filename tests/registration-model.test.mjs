import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
assert(schema.includes('model Registration '), 'Registration modeli olmalı')
assert(schema.includes('model RegistrationHistory ') || schema.includes('model RegistrationStatusHistory '), 'history modeli olmalı')
assert(schema.includes('model EventFormBinding '), 'EventFormBinding olmalı')
assert(schema.includes('formSnapshot'), 'form snapshot bağı olmalı')
assert(schema.includes('personId') || schema.includes('person '), 'person bağı olmalı')

console.log('registration-model.test: PASS')
