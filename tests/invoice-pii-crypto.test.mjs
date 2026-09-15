import assert from 'node:assert/strict'
import { decryptInvoicePii, encryptInvoicePii } from '../src/lib/invoice-pii-crypto.ts'

const env = {
  MAVENFORMS_INVOICE_PII_KEY: 'a'.repeat(64),
  MAVENFORMS_INVOICE_PII_KEY_ID: 'invoice-v1',
}

const first = encryptInvoicePii('very private recipient data', env)
const second = encryptInvoicePii('very private recipient data', env)
assert.match(first, /^v1:invoice-v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/)
assert.notEqual(first, second, 'encryption must use a fresh IV')
assert.equal(decryptInvoicePii(first, env), 'very private recipient data')
assert.throws(() => decryptInvoicePii(first.replace(/.$/, 'A'), env))
assert.throws(() => encryptInvoicePii('data', {}), /required/)

console.log('invoice-pii-crypto.test: PASS (INV/F C-02)')
