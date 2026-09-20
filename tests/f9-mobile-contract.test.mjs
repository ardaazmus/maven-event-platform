import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import {
  classifyMobileReplay,
  hasMobileRequiredRefs,
  isMobileOperation,
  MOBILE_FUTURE_SKEW_MS,
  MOBILE_OPERATIONS,
  MOBILE_PAST_WINDOW_MS,
  mobileRequiredRefs,
  validateMobileEnvelope,
} from '../src/lib/mobile-contract.ts'

// F9-R1: mobil sözleşme gerçek unit testi.

const NOW = Date.parse('2026-09-20T12:00:00.000Z')
const base = {
  opId: 'op-1',
  deviceId: 'device-7',
  operation: 'checkin.scan',
  occurredAt: new Date(NOW - 1000).toISOString(),
  refIds: { credentialId: 'cred-1' },
}

// Operasyon sözlüğü + pencere sabitleri
assert.deepStrictEqual(MOBILE_OPERATIONS, ['checkin.scan', 'badge.reprint', 'gate.ping', 'floor.holdSync'], 'operasyon listesi sabit')
assert.strictEqual(MOBILE_PAST_WINDOW_MS, 7 * 24 * 3600_000, 'gecmis pencere 7 gun')
assert.strictEqual(MOBILE_FUTURE_SKEW_MS, 5 * 60_000, 'gelecek tolerans 5 dakika')
assert.strictEqual(isMobileOperation('badge.reprint'), true, 'reprint gecerli')
assert.strictEqual(isMobileOperation('person.create'), false, 'mobil kisi uretemez')

// Zarf: geçerli + 6 red yolu
assert.deepStrictEqual(validateMobileEnvelope(base, NOW), { ok: true, operation: 'checkin.scan' }, 'gecerli zarf ok')
assert.deepStrictEqual(validateMobileEnvelope({ ...base, opId: '' }, NOW), { ok: false, code: 'ENVELOPE_INVALID' }, 'opId zorunlu')
assert.deepStrictEqual(validateMobileEnvelope({ ...base, deviceId: 'd/1' }, NOW), { ok: false, code: 'ENVELOPE_INVALID' }, 'cihaz guvenli olmali')
assert.deepStrictEqual(validateMobileEnvelope({ ...base, operation: 'person.create' }, NOW), { ok: false, code: 'OPERATION_UNKNOWN' }, 'bilinmeyen op reddedilmeli')
assert.deepStrictEqual(validateMobileEnvelope({ ...base, occurredAt: 'degil' }, NOW), { ok: false, code: 'TIMESTAMP_INVALID' }, 'bozuk zaman reddedilmeli')
assert.deepStrictEqual(
  validateMobileEnvelope({ ...base, occurredAt: new Date(NOW + 3600_000).toISOString() }, NOW),
  { ok: false, code: 'TIMESTAMP_FUTURE' },
  'gelecek zaman reddedilmeli',
)
assert.deepStrictEqual(
  validateMobileEnvelope({ ...base, occurredAt: new Date(NOW - 8 * 24 * 3600_000).toISOString() }, NOW),
  { ok: false, code: 'TIMESTAMP_TOO_OLD' },
  'cok eski zaman reddedilmeli',
)
assert.deepStrictEqual(validateMobileEnvelope({ ...base, refIds: { credentialId: '' } }, NOW), { ok: false, code: 'REF_INVALID' }, 'bos referans reddedilmeli')

// Replay: aynı opId ikinci kez duplicate
assert.deepStrictEqual(classifyMobileReplay('op-1', new Set(['op-1'])), { replay: true, duplicateOf: 'op-1' }, 'tekrar replay olmali')
assert.deepStrictEqual(classifyMobileReplay('op-2', new Set(['op-1'])), { replay: false, duplicateOf: null }, 'yeni op replay degil')

// Zorunlu referanslar: her op server ID'sine bağlanır, üretim yok
assert.deepStrictEqual(mobileRequiredRefs('checkin.scan'), ['credentialId'], 'tarama referansi')
assert.deepStrictEqual(mobileRequiredRefs('badge.reprint'), ['badgeInstanceId'], 'reprint referansi')
assert.deepStrictEqual(mobileRequiredRefs('gate.ping'), ['gateId'], 'gate referansi')
assert.deepStrictEqual(mobileRequiredRefs('floor.holdSync'), ['holdId'], 'hold referansi')
assert.strictEqual(hasMobileRequiredRefs('checkin.scan', { credentialId: 'c1' }), true, 'referans tamamsa true')
assert.strictEqual(hasMobileRequiredRefs('checkin.scan', {}), false, 'referans eksikse false')

// Checkin hattı tutarlılığı: deviceId + occurredAt + duplicate
const route = readFileSync('src/app/api/checkin/route.ts', 'utf8')
assert(route.includes('deviceId'), 'checkin deviceId tasimali')
assert(route.includes('Duplicate scan'), 'checkin duplicate 409 olmali')
assert(route.includes('Future timestamp') && route.includes('Timestamp too old'), 'checkin zaman penceresi olmali')

// Pure helper sözleşmesi
const source = readFileSync('src/lib/mobile-contract.ts', 'utf8')
assert(!source.includes('@/lib/db'), 'helper db import etmemeli')
assert(!source.includes('Date.now()'), 'helper saati disaridan almali')

console.log('f9-mobile-contract: PASS')
