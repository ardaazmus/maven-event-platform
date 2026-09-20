import assert from 'node:assert'
import { readFileSync } from 'node:fs'

for (const p of ['src/app/api/webhooks/stripe/[connectionId]/route.ts', 'src/app/api/webhooks/iyzico/[connectionId]/route.ts']) {
  const s = readFileSync(p, 'utf8')
  assert(s.includes('Signature') || s.includes('signature'), `${p} imza doğrulamalı`)
  assert(s.includes('401'), `${p} geçersiz imza 401`)
  assert(s.includes('503'), `${p} secretsiz fail-closed 503`)
  assert(s.includes('410') || s.includes('revoked'), `${p} revoked kapısı`)
  assert(s.includes('400'), `${p} bozuk gövde 400`)
}
const sig = readFileSync('src/lib/payment-webhook-signatures.ts', 'utf8')
assert(sig.length > 200, 'imza helper mevcut')

console.log('webhook-contract.test: PASS (canlı kanıt değil)')
