import assert from 'node:assert/strict'
import { INVOICE_DOCUMENT_MAX_SIZE, validateInvoiceDocumentUpload } from '../src/lib/invoice-document-validation.ts'

const pdf = new TextEncoder().encode('%PDF-1.7\ninvoice')
const xml = new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><Invoice><ID>INV-1</ID></Invoice>')

const validPdf = validateInvoiceDocumentUpload({ filename: 'invoice.pdf', mime: 'application/pdf', size: pdf.byteLength, bytes: pdf })
assert.equal(validPdf.ok, true)
if (validPdf.ok) {
  assert.deepEqual({ kind: validPdf.kind, detectedMime: validPdf.detectedMime, size: validPdf.size }, { kind: 'pdf', detectedMime: 'application/pdf', size: pdf.byteLength })
  assert.match(validPdf.sha256, /^[a-f0-9]{64}$/)
}

const validXml = validateInvoiceDocumentUpload({ filename: 'invoice.xml', mime: 'application/xml', size: xml.byteLength, bytes: xml })
assert.equal(validXml.ok, true)
if (validXml.ok) {
  assert.deepEqual({ kind: validXml.kind, detectedMime: validXml.detectedMime, size: validXml.size }, { kind: 'xml', detectedMime: 'application/xml', size: xml.byteLength })
  assert.match(validXml.sha256, /^[a-f0-9]{64}$/)
}

assert.equal(validateInvoiceDocumentUpload({ filename: 'invoice.pdf', mime: 'application/pdf', size: xml.byteLength, bytes: xml }).ok, false, 'extension and magic must agree')
assert.equal(validateInvoiceDocumentUpload({ filename: 'invoice.xml', mime: 'application/pdf', size: xml.byteLength, bytes: xml }).ok, false, 'declared MIME and content must agree')
assert.equal(validateInvoiceDocumentUpload({ filename: 'invoice.pdf', mime: 'application/pdf', size: pdf.byteLength - 1, bytes: pdf }).ok, false, 'declared size must match bytes')
assert.equal(validateInvoiceDocumentUpload({ filename: 'invoice.pdf', mime: 'application/pdf', size: 5, bytes: new TextEncoder().encode('hello') }).ok, false, 'PDF magic bytes are required')
assert.equal(validateInvoiceDocumentUpload({ filename: '../invoice.pdf', mime: 'application/pdf', size: pdf.byteLength, bytes: pdf }).ok, false, 'path traversal filename must be rejected')
assert.equal(validateInvoiceDocumentUpload({ filename: 'invoice.pdf', mime: 'application/pdf', size: INVOICE_DOCUMENT_MAX_SIZE + 1, bytes: pdf }).ok, false, 'oversized documents must be rejected')

const external = new TextEncoder().encode('<!DOCTYPE Invoice SYSTEM "https://example.com/invoice.dtd"><Invoice/>')
assert.equal(validateInvoiceDocumentUpload({ filename: 'invoice.xml', mime: 'application/xml', size: external.byteLength, bytes: external }).ok, false, 'external XML entities must be rejected before parsing')

const invalidUtf8 = new Uint8Array([0x3c, 0x49, 0x6e, 0x76, 0x6f, 0x69, 0x63, 0x65, 0x3e, 0xff])
assert.equal(validateInvoiceDocumentUpload({ filename: 'invoice.xml', mime: 'application/xml', size: invalidUtf8.byteLength, bytes: invalidUtf8 }).ok, false, 'invalid XML encoding must fail closed')

const result = validateInvoiceDocumentUpload({ filename: 'invoice.xml', mime: 'application/xml', size: xml.byteLength, bytes: xml })
assert(!JSON.stringify(result).includes('<Invoice>'), 'validation result must not echo document content')

console.log('invoice-document-filetype.test: PASS (INV/F-U-00-01)')
