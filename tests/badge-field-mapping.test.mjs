import assert from 'node:assert/strict'
import { createBadgePersonFieldMapping, projectBadgeFields } from '../src/lib/badge-field-mapping.ts'

const fields = [
  { fieldKey: 'full_name', type: 'text' },
  { fieldKey: 'job_title', type: 'text' },
  { fieldKey: 'company_name', type: 'text' },
  { fieldKey: 'email', type: 'email' },
  { fieldKey: 'phone', type: 'phone' },
  { fieldKey: 'admin_note', type: 'text', adminOnly: true },
  { fieldKey: 'payment_amount', type: 'number' },
]

const mapping = createBadgePersonFieldMapping(fields, {
  firstName: 'full_name',
  title: 'job_title',
  company: 'company_name',
  lastName: 'email',
})

assert.deepEqual(mapping, {
  firstName: 'full_name',
  title: 'job_title',
  company: 'company_name',
})

const projection = projectBadgeFields({
  answers: {
    full_name: '  Ada\nLovelace  ',
    job_title: 'Matematikçi',
    company_name: 'Analitik <script>alert(1)</script>',
    email: 'ada@example.test',
    phone: '+90 555 000 00 00',
    payment_amount: 1250,
    admin_note: 'gizli',
    unexpected: 'çıktıya girmemeli',
  },
  mapping,
  context: {
    eventName: 'Teknoloji Zirvesi',
    eventDate: '2026-10-08',
    registrationType: 'VIP',
  },
})

assert.deepEqual(projection, {
  firstName: 'Ada Lovelace',
  title: 'Matematikçi',
  company: 'Analitik <script>alert(1)</script>',
  eventName: 'Teknoloji Zirvesi',
  eventDate: '2026-10-08',
  registrationType: 'VIP',
})
assert.equal('email' in projection, false)
assert.equal('phone' in projection, false)
assert.equal('payment_amount' in projection, false)

assert.deepEqual(
  projectBadgeFields({
    answers: { full_name: ['Ada'], job_title: { value: 'Gizli' } },
    mapping,
    context: { eventName: '   ', eventDate: null },
  }),
  {},
)

const longValue = projectBadgeFields({
  answers: { full_name: 'x'.repeat(300) },
  mapping,
})
assert.equal(longValue.firstName?.length, 160)

console.log('badge-field-mapping: all assertions passed')
