import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { invoiceAccessForRole, toInvoiceResponse } from '../src/lib/invoice-pii-dto.ts'
import { can } from '../src/lib/policy.ts'

const encryptedRecord = {
  id: 'invoice_1',
  workspaceId: 'workspace_1',
  paymentOrderId: 'order_1',
  provider: 'stripe',
  documentType: 'e_archive',
  amountMinor: 12500,
  currency: 'TRY',
  state: 'paid_ready_for_invoicing',
  providerInvoiceId: 'provider_invoice_1',
  invoiceNumber: null,
  invoiceUuid: null,
  recipientSnapshot: {
    recipientType: 'individual',
    legalNameEncrypted: 'enc-name',
    taxNumberEncrypted: null,
    taxOfficeEncrypted: null,
    identityNumberEncrypted: 'enc-identity',
    emailEncrypted: 'enc-email',
    billingAddressEncrypted: 'enc-address',
    countryCode: 'TR',
  },
  lines: [{ lineNumber: 1, description: 'Form kaydı', quantity: '1', lineTotalMinor: 12500, currency: 'TRY' }],
  documents: [{ id: 'document_1', state: 'ready', scanStatus: 'clean', storageKey: 'private/invoice.pdf' }],
}

assert.deepEqual(invoiceAccessForRole('owner'), { allowed: true, exposure: 'full' })
assert.deepEqual(invoiceAccessForRole('admin'), { allowed: true, exposure: 'full' })
assert.deepEqual(invoiceAccessForRole('accounting'), { allowed: true, exposure: 'full' })
assert.deepEqual(invoiceAccessForRole('viewer'), { allowed: false, exposure: 'closed' })
assert.deepEqual(invoiceAccessForRole('public'), { allowed: false, exposure: 'closed' })
assert.deepEqual(invoiceAccessForRole('unknown'), { allowed: false, exposure: 'closed' })

const accountingContext = { user: { id: 'accounting_1', email: 'accounting@example.com', name: 'Accounting', role: 'accounting' }, workspace: { id: 'workspace_1' } }
const viewerContext = { user: { id: 'viewer_1', email: 'viewer@example.com', name: 'Viewer', role: 'viewer' }, workspace: { id: 'workspace_1' } }
assert.equal(can.readInvoices(accountingContext).allowed, true)
assert.equal(can.readInvoices(viewerContext).allowed, false)

const dto = toInvoiceResponse(encryptedRecord, 'admin', value => `plain:${value}`)
assert.deepEqual(dto, {
  id: 'invoice_1',
  paymentOrderId: 'order_1',
  provider: 'stripe',
  documentType: 'e_archive',
  amountMinor: 12500,
  currency: 'TRY',
  state: 'paid_ready_for_invoicing',
  providerInvoiceId: 'provider_invoice_1',
  invoiceNumber: null,
  invoiceUuid: null,
  recipient: {
    recipientType: 'individual',
    legalName: 'plain:enc-name',
    taxNumber: null,
    taxOffice: null,
    identityNumber: 'plain:enc-identity',
    email: 'plain:enc-email',
    billingAddress: 'plain:enc-address',
    countryCode: 'TR',
  },
  lines: [{ lineNumber: 1, description: 'Form kaydı', quantity: '1', lineTotalMinor: 12500, currency: 'TRY' }],
  documents: [{ id: 'document_1', state: 'ready', scanStatus: 'clean' }],
})

const serialized = JSON.stringify(dto)
for (const forbidden of ['workspaceId', 'legalNameEncrypted', 'identityNumberEncrypted', 'emailEncrypted', 'storageKey']) {
  assert(!serialized.includes(forbidden), `response must not expose ${forbidden}`)
}

assert.throws(() => toInvoiceResponse(encryptedRecord, 'viewer', value => value), /invoice_access_denied/)
assert.throws(() => toInvoiceResponse(encryptedRecord, 'public', value => value), /invoice_access_denied/)

const route = readFileSync('src/app/api/invoices/[id]/route.ts', 'utf8')
assert(route.includes('can.readInvoices'), 'invoice API must use the dedicated invoice capability')
assert(route.includes('workspaceId: ctx.workspace.id'), 'invoice API must scope lookup to the session workspace')
assert(route.includes('toInvoiceResponse'), 'invoice API must use the redacting DTO boundary')
assert(route.includes('decryptInvoicePii'), 'invoice API must decrypt only inside the authorized server boundary')
assert(!route.includes('NextResponse.json({ data: invoice'), 'invoice API must not return the raw ORM record')

console.log('invoice-pii-boundary.test: PASS (INV/F-C-03-01)')
