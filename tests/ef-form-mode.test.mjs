import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import {
  describeFormMode,
  FORM_MODES,
  isEventForm,
  isFormMode,
  resolveFormMode,
} from '../src/lib/form-mode.ts'

// EF-03A: form çalışma modu read-modeli gerçek unit testi.

// Uyumluluk: eski/binding-siz formlar genel formdur
assert.strictEqual(resolveFormMode([]), 'general', 'bos liste general olmali')
assert.strictEqual(resolveFormMode(null), 'general', 'null general olmali')
assert.strictEqual(resolveFormMode(undefined), 'general', 'undefined general olmali')

// Binding türetimi + registration önceliği
assert.strictEqual(
  resolveFormMode([{ eventId: 'e1', purpose: 'survey' }]),
  'event-survey',
  'survey binding event-survey olmali',
)
assert.strictEqual(
  resolveFormMode([{ eventId: 'e1', purpose: 'registration' }]),
  'event-registration',
  'registration binding event-registration olmali',
)
assert.strictEqual(
  resolveFormMode([
    { eventId: 'e1', purpose: 'survey' },
    { eventId: 'e1', purpose: 'registration' },
  ]),
  'event-registration',
  'registration surveyi ezmeli',
)

// Fail-closed: bilinmeyen purpose yok sayılır
assert.strictEqual(
  resolveFormMode([{ eventId: 'e1', purpose: 'mystery' }]),
  'general',
  'bilinmeyen purpose general olmali',
)
assert.strictEqual(
  resolveFormMode([
    { eventId: 'e1', purpose: 'mystery' },
    { eventId: 'e1', purpose: 'survey' },
  ]),
  'event-survey',
  'bilinmeyen purpose gecerli olani bozmamali',
)

// Yardımcılar
assert.strictEqual(isEventForm('general'), false, 'general event formu degil')
assert.strictEqual(isEventForm('event-registration'), true, 'registration event formu')
assert.strictEqual(isEventForm('event-survey'), true, 'survey event formu')
assert.strictEqual(isEventForm('mystery'), false, 'bilinmeyen mod event formu degil')
assert.strictEqual(isFormMode('general'), true, 'general gecerli mod')
assert.strictEqual(isFormMode('nope'), false, 'nope gecerli mod degil')
assert.deepStrictEqual(FORM_MODES, ['general', 'event-registration', 'event-survey'], 'mod listesi sabit')

// UI kopyası: Türkçe etiket + açıklama, bilinmeyende general fallback
const general = describeFormMode('general')
assert.strictEqual(general.label, 'Genel Form', 'genel etiket')
assert.ok(general.description.length > 0, 'genel aciklama bos olmamali')
const registration = describeFormMode('event-registration')
assert.strictEqual(registration.label, 'Etkinlik Kaydı Formu', 'kayit etiketi')
assert.ok(registration.description.length > 0, 'kayit aciklama bos olmamali')
assert.deepStrictEqual(describeFormMode('mystery'), general, 'bilinmeyen mod generala dusmeli')

// Pure helper sözleşmesi: DB/framework bağımlılığı yok
const source = readFileSync('src/lib/form-mode.ts', 'utf8')
assert(!source.includes('@/lib/db'), 'helper db import etmemeli')
assert(!source.includes('fetch('), 'helper fetch yapmamali')
assert(!source.includes('from \'react\''), 'helper react import etmemeli')

console.log('ef-form-mode: PASS')
