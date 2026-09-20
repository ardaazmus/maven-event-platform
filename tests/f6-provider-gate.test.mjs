import assert from 'node:assert'
import { readFileSync } from 'node:fs'

// F6-R1: canlı/provider/e-belge dış kapı kilidi (serverless static).
// Hiçbir yerel kanıt canlı ödeme veya canlı e-belge açamaz.

const wizard = readFileSync('src/components/mavenforms/payment-connection-wizard.tsx', 'utf8')
const sigs = readFileSync('src/lib/payment-webhook-signatures.ts', 'utf8')
const stripe = readFileSync('src/app/api/webhooks/stripe/[connectionId]/route.ts', 'utf8')
const iyzico = readFileSync('src/app/api/webhooks/iyzico/[connectionId]/route.ts', 'utf8')
const registry = JSON.parse(readFileSync('docs/workflow/evidence-registry.json', 'utf8'))
const adr4 = readFileSync('docs/adr/0004-f6-live-gates.md', 'utf8')
const adr5 = readFileSync('docs/adr/0005-f7-gates.md', 'utf8')

// Canlı etkinleştirme kod-seviyesinde imkansız: yalnız test+sandbox
assert(wizard.includes("mode === 'test' && evidenceStatus === 'sandbox'"), 'enable yalniz test+sandbox olmali')
assert(wizard.includes('Etkinleştirme kapalı'), 'varsayilan kapali metni olmali')
assert(wizard.includes('Live · R-10 gerekli'), 'live R-10 sarti yazmali')
assert(wizard.includes('Kart bilgileri MavenForms'), 'kart saklanmama taahhudu olmali')
assert(wizard.includes('webhook doğrulaması olmadan ödeme açılmaz'), 'webhook onkosulu yazmali')
assert(!wizard.includes("mode === 'live' && evidenceStatus === 'verified'"), 'live-enable yolu olmamali')

// Webhook imzası: HMAC + timing-safe + provider başına verify
assert(sigs.includes('timingSafeEqual'), 'timing-safe karsilastirma olmali')
assert(sigs.includes('export function verifyStripeWebhookSignature'), 'stripe verify olmali')
assert(sigs.includes('export function verifyIyzicoV3WebhookSignature'), 'iyzico verify olmali')
assert(stripe.includes('verifyStripeWebhookSignature'), 'stripe route verify cagirmali')
assert(iyzico.includes('verifyIyzicoV3WebhookSignature'), 'iyzico route verify cagirmali')

// Registry + ADR: dış kapılar açıkça EXTERNAL_DEPENDENCY
const live = registry.capabilities.find((c) => c.id === 'F6-live')
const auto = registry.capabilities.find((c) => c.id === 'F7-auto')
assert(live && live.state === 'EXTERNAL_DEPENDENCY', 'F6-live dis kapi olmali')
assert(auto && auto.state === 'EXTERNAL_DEPENDENCY', 'F7-auto dis kapi olmali')
assert(adr4.includes('EXTERNAL_DEPENDENCY') || adr4.includes('merchant'), 'F6 ADR dis kayit tasimali')
for (const k of ['F7A', 'F7B', 'F7C', 'F7D', 'F7E']) assert(adr5.includes(k), `F7 ADR ${k} tasimali`)
assert(adr5.includes('fallback'), 'F7 manuel fallback korunmali')

// Canlı iddia yasağı
assert(!/canlı tahsilat tamam|live.*PASS/i.test(adr4), 'F6 ADR canli iddia tasimamali')

console.log('f6-provider-gate: PASS')
