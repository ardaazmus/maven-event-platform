import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import {
  EVENT_MODULES,
  eventModuleMutationDecision,
  getEventModuleManifest,
  isEventModuleEnabled,
  isEventModuleId,
  parseDisabledEventModules,
} from '../src/lib/event-module-gate.ts'

// F8-R2: event modül gate gerçek unit testi + route benimseme kilidi.

// Manifest registry: 7 modül, sabit sürüm/kapsam/yetki
assert.deepStrictEqual(
  EVENT_MODULES,
  ['program', 'abstracts', 'speakers', 'sponsors', 'surveys', 'leads', 'reports'],
  'modul listesi sabit',
)
for (const id of EVENT_MODULES) {
  const manifest = getEventModuleManifest(id)
  assert(manifest, `${id} manifest tasimali`)
  assert.strictEqual(manifest.version, 1, `${id} surum 1 olmali`)
  assert.strictEqual(manifest.requiredCapability, 'events.write', `${id} yetki events.write olmali`)
  assert.strictEqual(manifest.scope, 'event', `${id} scope event olmali`)
  assert.deepStrictEqual(manifest.supportedModes, ['integrated', 'standalone'], `${id} iki mod desteklemeli`)
}
assert.strictEqual(getEventModuleManifest('nope'), null, 'bilinmeyen manifest null')
assert.strictEqual(isEventModuleId('surveys'), true, 'surveys gecerli')
assert.strictEqual(isEventModuleId('billing'), false, 'billing modul degil')

// Gate: varsayılan açık, kapalı liste + bilinmeyen kapalı (fail-closed)
assert.strictEqual(isEventModuleEnabled('program'), true, 'varsayilan acik')
assert.strictEqual(isEventModuleEnabled('program', []), true, 'bos liste acik')
assert.strictEqual(isEventModuleEnabled('program', ['program']), false, 'listelenen kapali')
assert.strictEqual(isEventModuleEnabled('nope'), false, 'bilinmeyen kapali')
assert.strictEqual(isEventModuleEnabled('program', ['abstracts']), true, 'diger modul etkilenmez')

// Mutation kararı: 403 + sabit hata
assert.deepStrictEqual(eventModuleMutationDecision('abstracts'), { allowed: true }, 'acik modul izinli')
assert.deepStrictEqual(
  eventModuleMutationDecision('abstracts', ['abstracts']),
  { allowed: false, status: 403, error: 'Module disabled' },
  'kapali modul 403',
)
assert.deepStrictEqual(
  eventModuleMutationDecision('nope'),
  { allowed: false, status: 403, error: 'Module disabled' },
  'bilinmeyen 403',
)

// Env ayrıştırma: csv + boşluk + bilinmeyen-düşürme
assert.deepStrictEqual(parseDisabledEventModules('program, surveys'), ['program', 'surveys'], 'csv cozulmeli')
assert.deepStrictEqual(parseDisabledEventModules('program,program,, billing'), ['program'], 'tekrar/bilinmeyen temizlenmeli')
assert.deepStrictEqual(parseDisabledEventModules(''), [], 'bos dize bos liste')
assert.deepStrictEqual(parseDisabledEventModules(undefined), [], 'undefined bos liste')
assert.deepStrictEqual(parseDisabledEventModules(42), [], 'sayi bos liste')

// Route benimseme: abstracts + program POST gate çağırır
const abstracts = readFileSync('src/app/api/events/[id]/abstracts/route.ts', 'utf8')
const program = readFileSync('src/app/api/events/[id]/program/route.ts', 'utf8')
for (const [name, source, id] of [['abstracts', abstracts, 'abstracts'], ['program', program, 'program']]) {
  assert(source.includes("from '@/lib/event-module-gate'"), `${name} gate import etmeli`)
  assert(source.includes(`eventModuleMutationDecision('${id}'`), `${name} mutation karari almali`)
  assert(source.includes('EVENT_MODULES_DISABLED'), `${name} server-owned listeyi okumali`)
}

// Route benimseme: kalan 7 POST (F8-R3)
const adoptions = [
  ['src/app/api/events/[id]/sponsors/route.ts', 'sponsors'],
  ['src/app/api/events/[id]/sponsors/[sponsorId]/booths/route.ts', 'sponsors'],
  ['src/app/api/events/[id]/surveys/route.ts', 'surveys'],
  ['src/app/api/events/[id]/surveys/[surveyId]/responses/route.ts', 'surveys'],
  ['src/app/api/events/[id]/program/speakers/route.ts', 'speakers'],
  ['src/app/api/events/[id]/program/sessions/[sessionId]/speakers/route.ts', 'speakers'],
  ['src/app/api/events/[id]/abstracts/[abstractId]/reviews/route.ts', 'abstracts'],
]
for (const [file, id] of adoptions) {
  const source = readFileSync(file, 'utf8')
  assert(source.includes("from '@/lib/event-module-gate'"), `${file} gate import etmeli`)
  assert(source.includes(`eventModuleMutationDecision('${id}'`), `${file} mutation karari almali`)
}

// Pure helper sözleşmesi
const lib = readFileSync('src/lib/event-module-gate.ts', 'utf8')
assert(!lib.includes('@/lib/db'), 'helper db import etmemeli')
assert(!lib.includes('process.env'), 'helper env okumamali (route okur)')

console.log('f8-module-gate: PASS')
