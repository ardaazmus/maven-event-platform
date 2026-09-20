import assert from 'node:assert'
import { readFileSync } from 'node:fs'

// EF-03B: Yeni Form dialogu çalışma modu sözleşmesi (serverless static assertions).
// Locks: Genel / Etkinlik Kaydı seçimi zorunlu + açıklayıcı, event guard,
// oluşturma sonrası registration binding, genel akış korunur.

const view = readFileSync('src/components/mavenforms/views/forms-list-view.tsx', 'utf8')
const bindings = readFileSync('src/app/api/events/[id]/bindings/route.ts', 'utf8')

// Mod seçimi: iki açıklamalı radio, zorunlu grup
assert(view.includes('Form Modu *'), 'mod basligi olmali')
assert(view.includes('role="radiogroup"'), 'mod radiogroup olmali')
assert(view.includes('aria-label="Form modu"'), 'mod grubu etiketli olmali')
assert(view.includes('Genel Form'), 'genel secenegi olmali')
assert(view.includes('Etkinlik Kaydı Formu'), 'etkinlik secenegi olmali')
assert(view.includes('Etkinliksiz bağımsız veri toplama'), 'genel aciklamasi olmali')
assert(view.includes('Seçili etkinliğe kayıt üretir'), 'etkinlik aciklamasi olmali')
assert(view.includes("aria-checked={formMode === 'general'}"), 'genel secim durumu olmali')
assert(view.includes("aria-checked={formMode === 'event'}"), 'etkinlik secim durumu olmali')

// Etkinlik picker: yalnız event modunda, etiketli, loading durumlu
assert(view.includes('Etkinlik *'), 'etkinlik basligi olmali')
assert(view.includes('aria-label="Etkinlik seç"'), 'picker etiketli olmali')
assert(view.includes('Etkinlikler yükleniyor...'), 'picker yukleniyor durumu olmali')
assert(view.includes('etkinlik seçilmeden yayınlanamaz'), 'yayin uyarisi olmali')
assert(view.includes("api<Array<{ id: string; title: string }>>('/api/events')"), 'event listesi tek-seviye okunmali')

// Guard: etkinlik seçilmeden oluşturma engellenir
assert(view.includes("if (formMode === 'event' && !eventId)"), 'event guard olmali')
assert(view.includes('Etkinlik seçin'), 'guard mesaji olmali')

// Binding: oluşturma sonrası registration bağlantısı kurulur
assert(view.includes('/bindings'), 'binding endpoint cagrilmali')
assert(view.includes("purpose: 'registration'"), 'binding registration amacli olmali')
assert(view.includes('formId: created.id'), 'binding yeni forma baglanmali')
assert(view.includes('etkinlik bağlantısı kurulamadı'), 'binding hatasi gosterilmeli')
assert(bindings.includes("purpose: z.enum(['registration', 'survey'])"), 'server purpose sozlesmesi korunmali')

// Korunan davranış: genel akış, dialog, onay seçeneği
assert(view.includes("'/api/forms'"), 'form olusturma korunmali')
assert(view.includes('Oluştur ve Düzenle'), 'olustur aksiyonu korunmali')
assert(view.includes('<Dialog open={newFormOpen}'), 'dialog korunmali')
assert(view.includes('enableUserConfirmation: newForm.enableUserConfirmation'), 'onay secimi korunmali')
assert(view.includes("setFormMode('general')"), 'mod sifirlamasi olmali')

console.log('ef-form-create-mode: PASS')
