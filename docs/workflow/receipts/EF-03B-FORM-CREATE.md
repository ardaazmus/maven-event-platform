# EF-03B-FORM-CREATE — Receipt

**Tarih:** 2026-09-20 | **Packet:** EF-03B-FORM-CREATE | **Önceki:** EF-03A-FORM-MODE (LOCAL_PASS)
**Amaç:** Yeni Form dialoguna çalışma modu seçimi eklemek (Genel / Etkinlik Kaydı +
event picker → registration binding). Yalnız eklemeli değişiklik; mevcut akış korunur.

## Değişen dosyalar

- `docs/workflow/packets/EF-03B-FORM-CREATE.json` (yeni)
- `src/components/mavenforms/views/forms-list-view.tsx` (ekleme: 4 state, 1 effect,
  handleCreate guard + binding adımı, dialog mod/event bloğu; silinen satır yok)
- `tests/ef-form-create-mode.test.mjs` (yeni, 27 assertion)
- `docs/workflow/receipts/EF-03B-FORM-CREATE.md` (bu dosya)

## Yapılan iş

- Dialogda `Form Modu *` radiogroup: `Genel Form` (etkinliksiz bağımsız) /
  `Etkinlik Kaydı Formu` (seçili etkinliğe kayıt üretir), açıklamalı ve etiketli.
- Event modunda `Etkinlik *` picker (shadcn Select, `/api/events` tek-seviye okuma,
  loading durumu, "etkinlik seçilmeden yayınlanamaz" uyarısı).
- Guard: etkinlik seçilmeden oluşturma toast ile engellenir (server'a gidilmez).
- Oluşturma sonrası `POST /api/events/[id]/bindings` (`purpose: registration`);
  binding hatası formu silmez, uyarı toast'u gösterir (form genel form olarak yaşar).
- Reset: mod `general` + eventId temizlenir. `useProfile`/onay/folder akışı aynen.

## Çalıştırılan kontroller (bu oturum, cwd `D:\project\mavenform-v2`)

- `node scripts/workflow.mjs begin docs/workflow/packets/EF-03B-FORM-CREATE.json` → READY, exit 0.
- `node tests/ef-form-create-mode.test.mjs` → PASS, exit 0.
- `node tests/form-ux-single-create-action.test.mjs` → PASS, exit 0.
- `node tests/form-create-confirmation.test.mjs` → PASS, exit 0.
- `node tests/form-ux-dialog-a11y.test.mjs` → PASS, exit 0.
- Dosyayı okuyan diğer 16 regresyon testi süpürüldü → 16/16 exit 0
  (badge-ui-entry-wiring, card-cover, card-interaction, appearance-theme-unification,
  final-gate, forms-entry-actions, forms-sort, forms-workspace, inventory-gate,
  list-navigation, responsive-a11y, settings-taxonomy, smart-filters,
  invoice-center-actions, responsive-a11y, v1-internal-forms-view).
- `node scripts/workflow.mjs verify docs/workflow/packets/EF-03B-FORM-CREATE.json` →
  bu receipt yazıldıktan sonra koşuldu; sonuç
  `artifacts/workflow/EF-03B-FORM-CREATE/verified.json` içindedir
  (verify içi: context-check + 5 hedef/regresyon test + `tsc --noEmit`).

Bu receipt verify öncesi donduruldu; verify sonrası düzenlenmedi.

## Sonuç / kanıt sınıfı

- Sonuç: verify çıktısına bağlı; resmi kayıt
  `artifacts/workflow/EF-03B-FORM-CREATE/verified.json`.
- Korunan davranış: genel form oluşturma akışı, dialog/a11y, onay seçeneği,
  19 okuyucu testin tamamı yeşil.
- Not: dosya CRLF; eklenen satırlar LF (karışık satır sonu, tsc/test etkilenmez).
- R-10 NO-GO korunur; canlı render yok.

## Sıradaki packet

- EF-04-INTAKE (canonical intake: submission/import/manuel → ortak sözleşme).
