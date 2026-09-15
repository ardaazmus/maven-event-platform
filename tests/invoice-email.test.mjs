import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildInvoiceReadyEmail } from '../src/lib/invoice-email.ts'

const routeContract = readFileSync('src/lib/invoice-email.ts', 'utf8')
assert(routeContract.includes('buildTransactionalEmail'), 'invoice email must use the shared transactional policy')
assert(routeContract.includes('document_ready'), 'invoice email must require document-ready state')
assert(routeContract.includes('clean'), 'invoice email must require a clean scan')
assert(routeContract.includes('recipientEmail'), 'invoice email must have an explicit recipient')

const rendered = buildInvoiceReadyEmail({
  recipientEmail: '  Person@Example.com ',
  formTitle: 'Etkinlik <2026>',
  invoiceNumber: 'INV-001',
  invoiceState: 'document_ready',
  scanStatus: 'clean',
  documentUrl: 'https://app.example.com/invoices/documents/doc-1',
  appOrigin: 'https://app.example.com',
})
assert.equal(rendered.recipientEmail, 'person@example.com')
assert.equal(rendered.email.messageClass, 'transactional')
assert(rendered.email.subject.includes('INV-001'))
assert(rendered.email.html.includes('Etkinlik &lt;2026&gt;'), 'form title must be HTML escaped')
assert(rendered.email.html.includes('https://app.example.com/invoices/documents/doc-1'))

assert.throws(() => buildInvoiceReadyEmail({
  recipientEmail: 'person@example.com', formTitle: 'Form', invoiceNumber: null,
  invoiceState: 'issued', scanStatus: 'clean', documentUrl: 'https://app.example.com/doc', appOrigin: 'https://app.example.com',
}), /document_ready required/)
assert.throws(() => buildInvoiceReadyEmail({
  recipientEmail: 'person@example.com', formTitle: 'Form', invoiceNumber: null,
  invoiceState: 'document_ready', scanStatus: 'pending', documentUrl: 'https://app.example.com/doc', appOrigin: 'https://app.example.com',
}), /clean scan required/)
assert.throws(() => buildInvoiceReadyEmail({
  recipientEmail: 'person@example.com', formTitle: 'Form', invoiceNumber: null,
  invoiceState: 'document_ready', scanStatus: 'clean', documentUrl: 'https://provider.example.com/doc', appOrigin: 'https://app.example.com',
}), /document URL must belong to the app origin/)
assert.throws(() => buildInvoiceReadyEmail({
  recipientEmail: 'invalid', formTitle: 'Form', invoiceNumber: null,
  invoiceState: 'document_ready', scanStatus: 'clean', documentUrl: 'https://app.example.com/doc', appOrigin: 'https://app.example.com',
}), /recipient email invalid/)

assert(!JSON.stringify(rendered.email).includes('provider_secret'))
console.log('invoice-email.test: PASS (INV/F-E-00-01)')
