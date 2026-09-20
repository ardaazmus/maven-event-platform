import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import {
  buildDedupeKey,
  INTAKE_SOURCES,
  isIntakeSource,
  normalizeEmail,
  normalizeIntakeIdentity,
  normalizeName,
  normalizePhone,
} from '../src/lib/intake.ts'

// EF-04A: canonical intake sözleşmesi gerçek unit testi + route benimseme kilidi.

// Email: trim + lowercase, boş → null
assert.strictEqual(normalizeEmail('  Test@X.com '), 'test@x.com', 'email normalize olmali')
assert.strictEqual(normalizeEmail(null), null, 'null email null kalmali')
assert.strictEqual(normalizeEmail('   '), null, 'bos email null olmali')
assert.strictEqual(normalizeEmail(undefined), null, 'undefined email null olmali')

// Phone: ayraç temizliği, + korunur, boş → null
assert.strictEqual(normalizePhone('+90 (532) 111-22-33'), '+905321112233', 'telefon normalize olmali')
assert.strictEqual(normalizePhone('0532 111 22 33'), '05321112233', 'bassyildizli telefon korunmali')
assert.strictEqual(normalizePhone('   '), null, 'bos telefon null olmali')
assert.strictEqual(normalizePhone(null), null, 'null telefon null kalmali')
assert.strictEqual(normalizePhone('+'), null, 'yalniz + null olmali')

// Name: trim + iç boşluk tekleme
assert.strictEqual(normalizeName('  Ali   Veli  '), 'Ali Veli', 'isim normalize olmali')
assert.strictEqual(normalizeName(null), '', 'null isim bos olmali')

// Toplu kimlik normalizasyonu
assert.deepStrictEqual(
  normalizeIntakeIdentity({ fullName: '  Ali   Veli ', email: ' ALI@X.COM ', phone: '(532) 111 22 33' }),
  { fullName: 'Ali Veli', email: 'ali@x.com', phone: '5321112233' },
  'kimlik toplu normalize olmali',
)

// Dedupe anahtarı: email öncelikli, sonra phone, yoksa null
assert.strictEqual(
  buildDedupeKey('w1', { email: ' A@x.com ', phone: '532' }),
  'email:w1:a@x.com',
  'email anahtari oncelikli olmali',
)
assert.strictEqual(
  buildDedupeKey('w1', { email: null, phone: '(532) 1' }),
  'phone:w1:5321',
  'email yoksa phone anahtari olmali',
)
assert.strictEqual(buildDedupeKey('w1', { email: null, phone: null }), null, 'anahtarsiz null olmali')

// Kaynak sözlüğü: 5 kanonik kaynak, fail-closed
assert.deepStrictEqual(INTAKE_SOURCES, ['form', 'csv', 'xlsx', 'api', 'manual'], 'kaynak listesi sabit')
assert.strictEqual(isIntakeSource('csv'), true, 'csv gecerli kaynak')
assert.strictEqual(isIntakeSource('web'), false, 'web kanonik kaynak degil')
assert.strictEqual(isIntakeSource(null), false, 'null kaynak degil')

// Route benimseme: persons hattı normalizer kullanır
const route = readFileSync('src/app/api/persons/route.ts', 'utf8')
assert(route.includes("from '@/lib/intake'"), 'route intake helper import etmeli')
assert(route.includes('normalizeIntakeIdentity('), 'route toplu normalizer cagirmali')
assert(route.includes('identity.email'), 'route normalize edilmis email kullanmali')
assert(route.includes('identity.fullName'), 'route normalize edilmis isim kullanmali')
assert(route.includes('identity.phone'), 'route normalize edilmis telefon kullanmali')
const rawEmailUses = route.split('parsed.data.email').length - 1
assert.strictEqual(rawEmailUses, 1, 'ham email yalniz normalizer girdisinde olmali')

// Pure helper sözleşmesi
const source = readFileSync('src/lib/intake.ts', 'utf8')
assert(!source.includes('@/lib/db'), 'helper db import etmemeli')
assert(!source.includes('fetch('), 'helper fetch yapmamali')

console.log('ef-intake: PASS')
