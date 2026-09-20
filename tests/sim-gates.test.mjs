import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const note = readFileSync('docs/research-sources/2026-09-17-dis-bagimlilik-simulasyon-arastirmasi.md', 'utf8')
assert(note.includes('sandbox-merchant.iyzipay.com'), 'iyzico sandbox kaynagi yazmali')
assert(note.includes('Test Portal'), 'GIB test portal kaydi yazmali')
assert(note.includes('DOĞRULANAMADI'), 'Parasut erisilemezligi acikca yazmali')
assert(note.includes('fake-provider-adapter'), 'fake-adapter yontemi yazmali')
assert(note.includes('EXTERNAL_DEPENDENCY'), 'canli kapilar dis bagimlilik kalmali')

const adapter = readFileSync('src/lib/fake-provider-adapter.ts', 'utf8')
assert(adapter.includes('secret_forbidden'), 'adapter secret reddetmeli')
assert(adapter.includes('cardNumber'), 'adapter PAN reddetmeli')

console.log('sim-gates.test: PASS')
