import assert from 'node:assert'
import { readFileSync } from 'node:fs'

// F3-R1: fatura + iletişim sözleşme kilidi (serverless static).
// queueClass ayrımı, delivery log, retry politikası, audit zinciri.

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const dispatch = readFileSync('src/lib/outbox-dispatch-worker.ts', 'utf8')
const worker = readFileSync('src/lib/outbox-worker.ts', 'utf8')
const retry = readFileSync('src/lib/invoice-delivery-retry.ts', 'utf8')
const deliveries = readFileSync('src/app/api/invoices/[id]/deliveries/route.ts', 'utf8')

// Outbox şeması: kuyruk sınıfı + teslimat + retry alanları
assert(schema.includes('queueClass'), 'outbox queueClass tasimali')
assert(schema.includes('deliveryStatus'), 'outbox deliveryStatus tasimali')
assert(schema.includes('attemptCount'), 'outbox attemptCount tasimali')
assert(schema.includes('lockedUntil'), 'outbox claim kilidi tasimali')
assert(schema.includes('providerMessageId'), 'outbox provider izi tasimali')
assert(schema.includes('model EmailProviderEvent'), 'provider event inbox olmali')
assert(schema.includes('marketingOptOut') || schema.includes('marketingPaused'), 'marketing opt-out korunmali')

// Dispatch worker: claim + batch sınırı + queueClass zorunluluğu
assert(dispatch.includes('claimOutboxEvents'), 'worker claim yapmali')
assert(dispatch.includes('MAX_BATCH_SIZE'), 'worker batch sinirli olmali')
assert(dispatch.includes('!event.queueClass'), 'worker sinifsiz eventi reddetmeli')
assert(dispatch.includes('completeOutboxEvent'), 'worker tamamlamayi yazmali')
assert(dispatch.includes('classifyInvoiceDeliveryFailure'), 'worker paylasilan retry politikasini kullanmali')
assert(worker.includes('export async function claimOutboxEvents') || worker.includes('claimOutboxEvents'), 'claim helper olmali')

// Retry politikası: retryable/permanent + terminal + deneme tavanı
assert(retry.includes("INVOICE_DELIVERY_MAX_ATTEMPTS = 5"), 'deneme tavani sabit olmali')
assert(retry.includes("'retryable' | 'permanent'"), 'iki sonuc sinifi olmali')
assert(retry.includes('terminal'), 'terminal karari olmali')
assert(retry.includes('provider_rejected'), 'provider reddi kalici sinifta olmali')

// Teslimat endpointi: issued-only + kanal şeması + yetki
assert(deliveries.includes("channel: z.enum(['email', 'manual'])"), 'kanal semasi sabit olmali')
assert(deliveries.includes('can.writeInvoices'), 'teslimat yazma yetkisi istemeli')
assert(deliveries.includes('Only issued invoices can be delivered'), 'issued-only kurali olmali')

// Geçmiş editlenerek silinmez: reversal/credit/new-version zinciri
assert(!deliveries.includes('deleteMany'), 'teslimat toplu silme yapmamali')

console.log('f3-invoice-contract: PASS')
