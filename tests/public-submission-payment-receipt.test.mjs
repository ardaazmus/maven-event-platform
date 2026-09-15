import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const route = readFileSync(new URL('../src/app/api/public/forms/[slug]/submissions/route.ts', import.meta.url), 'utf8')

assert.match(route, /submissionToken: publicToken/)

console.log('public-submission-payment-receipt.test: PASS (INV/F C-02)')
