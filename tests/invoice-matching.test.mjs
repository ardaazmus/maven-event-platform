import assert from 'node:assert/strict'
import { matchInvoiceImportRow } from '../src/lib/invoice-matching.ts'

const candidates = [
  {
    id: 'invoice_1',
    workspaceId: 'workspace_1',
    formId: 'form_1',
    rowId: 'row_1',
    paymentReference: 'payref_1',
    providerInvoiceId: 'stripe_invoice_1',
    invoiceUuid: '11111111-1111-4111-8111-111111111111',
    invoiceNumber: 'INV-001',
  },
  {
    id: 'invoice_2',
    workspaceId: 'workspace_1',
    formId: 'form_1',
    rowId: 'row_2',
    paymentReference: 'payref_2',
    providerInvoiceId: 'stripe_invoice_2',
    invoiceUuid: '22222222-2222-4222-8222-222222222222',
    invoiceNumber: 'INV-002',
  },
]

assert.deepEqual(matchInvoiceImportRow({
  workspaceId: 'workspace_1',
  formId: 'form_1',
  rowId: 'row_1',
  paymentReference: 'payref_1',
  providerInvoiceId: 'stripe_invoice_1',
}, candidates), {
  status: 'matched',
  strategy: 'row_id',
  candidateId: 'invoice_1',
})

assert.deepEqual(matchInvoiceImportRow({ workspaceId: 'workspace_1', formId: 'form_1', paymentReference: 'payref_2' }, candidates), {
  status: 'matched',
  strategy: 'payment_reference',
  candidateId: 'invoice_2',
})

assert.deepEqual(matchInvoiceImportRow({ workspaceId: 'workspace_1', formId: 'form_1', providerInvoiceId: 'stripe_invoice_1' }, candidates), {
  status: 'matched',
  strategy: 'provider_invoice_id',
  candidateId: 'invoice_1',
})

assert.deepEqual(matchInvoiceImportRow({ workspaceId: 'workspace_1', formId: 'form_1', invoiceUuid: '22222222-2222-4222-8222-222222222222' }, candidates), {
  status: 'matched',
  strategy: 'invoice_uuid',
  candidateId: 'invoice_2',
})

assert.deepEqual(matchInvoiceImportRow({ workspaceId: 'workspace_1', formId: 'form_1', invoiceNumber: 'INV-002', invoiceNumberApproved: true }, candidates), {
  status: 'matched',
  strategy: 'invoice_number',
  candidateId: 'invoice_2',
})

assert.deepEqual(matchInvoiceImportRow({ workspaceId: 'workspace_1', formId: 'form_1', invoiceNumber: 'INV-002' }, candidates), {
  status: 'unmatched',
  reason: 'no_stable_reference',
})

assert.deepEqual(matchInvoiceImportRow({
  workspaceId: 'workspace_1',
  formId: 'form_1',
  legalName: 'Ada Example',
  email: 'ada@example.com',
  invoiceDate: '2026-09-04',
  amountMinor: 12500,
}, candidates), {
  status: 'unmatched',
  reason: 'no_stable_reference',
})

assert.deepEqual(matchInvoiceImportRow({ workspaceId: 'workspace_1', formId: 'form_1', paymentReference: 'payref_1' }, [
  ...candidates,
  { ...candidates[1], id: 'invoice_duplicate', paymentReference: 'payref_1' },
]), {
  status: 'conflict',
  reason: 'ambiguous_reference',
})

assert.deepEqual(matchInvoiceImportRow({ workspaceId: 'workspace_1', formId: 'form_1', paymentReference: 'payref_other' }, [
  ...candidates,
  { ...candidates[0], id: 'invoice_other_workspace', workspaceId: 'workspace_2', formId: 'form_9', paymentReference: 'payref_other' },
]), {
  status: 'conflict',
  reason: 'scope_mismatch',
})

assert.deepEqual(matchInvoiceImportRow({ workspaceId: 'workspace_1', formId: 'form_1', rowId: 'row_1', paymentReference: 'payref_2' }, candidates), {
  status: 'conflict',
  reason: 'multiple_references_conflict',
})

const piiResult = matchInvoiceImportRow({ workspaceId: 'workspace_1', formId: 'form_1', email: 'secret@example.com', legalName: 'Secret Person', amountMinor: 1000 }, candidates)
assert(!JSON.stringify(piiResult).includes('secret@example.com'), 'match results must not echo PII')
assert(!JSON.stringify(piiResult).includes('Secret Person'), 'match results must not echo PII')

console.log('invoice-matching.test: PASS (INV/F-I-03-01)')
