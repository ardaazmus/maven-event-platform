import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import {
  buildEfpsMappingKey,
  EFPS_CORE_TYPES,
  EFPS_SOURCE_SYSTEM,
  EFPS_SOURCE_TYPES,
  isEfpsCoreType,
  isEfpsSourceType,
  isValidEfpsMapping,
  parseEfpsMappingKey,
  validateEfpsCanonicalReference,
} from '../src/lib/efps-mapping.ts'

// F5-R2: EFPS adapter sözleşmesi gerçek unit testi.

// Sözlük sabitleri
assert.strictEqual(EFPS_SOURCE_SYSTEM, 'efps', 'kaynak sistemi efps olmali')
assert.deepStrictEqual(
  EFPS_SOURCE_TYPES,
  ['event', 'occurrence', 'venue', 'hall', 'plan', 'inventory', 'attendee'],
  'kaynak tur listesi sabit',
)
assert.deepStrictEqual(
  EFPS_CORE_TYPES,
  ['event', 'occurrence', 'person', 'registration', 'ticket'],
  'cekirdek tur listesi sabit',
)
assert.strictEqual(isEfpsSourceType('plan'), true, 'plan gecerli kaynak')
assert.strictEqual(isEfpsSourceType('geometry'), false, 'geometry kaynak degil')
assert.strictEqual(isEfpsCoreType('ticket'), true, 'ticket gecerli cekirdek')
assert.strictEqual(isEfpsCoreType('invoice'), false, 'invoice cekirdek degil')

// Key kurucu/çözücü round-trip + fail-closed
assert.strictEqual(
  buildEfpsMappingKey({ workspaceId: 'w1', sourceType: 'plan', sourceId: 'p9' }),
  'efps:w1:plan:p9',
  'key formati sabit',
)
assert.strictEqual(buildEfpsMappingKey({ workspaceId: 'w1', sourceType: 'geometry', sourceId: 'p9' }), null, 'gecersiz tur null')
assert.strictEqual(buildEfpsMappingKey({ workspaceId: 'w/1', sourceType: 'plan', sourceId: 'p9' }), null, 'yol karakteri null')
assert.deepStrictEqual(parseEfpsMappingKey('efps:w1:plan:p9'), { workspaceId: 'w1', sourceType: 'plan', sourceId: 'p9' }, 'key cozulmeli')
assert.strictEqual(parseEfpsMappingKey('efps:w1:plan'), null, 'eksik key null')
assert.strictEqual(parseEfpsMappingKey('x:w1:plan:p9'), null, 'yanlis sistem null')
assert.strictEqual(parseEfpsMappingKey(null), null, 'null key null')

// Satır üçlüsü
assert.strictEqual(
  isValidEfpsMapping({ workspaceId: 'w1', sourceType: 'attendee', sourceId: 'a1', coreType: 'person', coreId: 'c1' }),
  true,
  'gecerli esleme true',
)
assert.strictEqual(
  isValidEfpsMapping({ workspaceId: 'w1', sourceType: 'attendee', sourceId: 'a1', coreType: 'invoice', coreId: 'c1' }),
  false,
  'gecersiz cekirdek false',
)

// Kanonik referans: scope zorunlu, opsiyoneller güvenli ID
assert.deepStrictEqual(
  validateEfpsCanonicalReference({ organizationId: 'o1', eventId: 'e1', eventPlanId: 'ep1', ticketId: 't1' }),
  { ok: true },
  'tam referans ok',
)
assert.deepStrictEqual(validateEfpsCanonicalReference({ organizationId: '', eventId: 'e1' }), { ok: false, code: 'SCOPE_REQUIRED' }, 'org zorunlu')
assert.deepStrictEqual(
  validateEfpsCanonicalReference({ organizationId: 'o1', eventId: 'e1', hallId: 'h/1' }),
  { ok: false, code: 'REFERENCE_INVALID' },
  'bozuk referans reddedilmeli',
)

// Şema kilidi: mapping tablosu + unique + efps yorumu
const schema = readFileSync('prisma/schema.prisma', 'utf8')
assert(schema.includes('model ExternalIdMapping'), 'mapping modeli olmali')
assert(schema.includes('@@unique([workspaceId, sourceSystem, sourceType, sourceId])'), 'mapping unique olmali')

// Pure helper sözleşmesi
const source = readFileSync('src/lib/efps-mapping.ts', 'utf8')
assert(!source.includes('@/lib/db'), 'helper db import etmemeli')
assert(!source.includes('fetch('), 'helper fetch yapmamali')

console.log('efps-mapping: PASS')
