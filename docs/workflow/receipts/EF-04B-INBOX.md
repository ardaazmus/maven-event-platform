# EF-04B-INBOX — Receipt

**Tarih:** 2026-09-20 | **Packet:** EF-04B-INBOX | **Önceki:** EF-04A-INTAKE (LOCAL_PASS)
**Amaç:** Kayıt inbox runtime bugfix (çift-çözüm) + event-bağlı liste sözleşme kilidi.
Görünüm değişmedi.

## Kök neden (CODE_FAILURE, düzeltildi)

- `api<T>` tek zarf seviyesini açar; inbox `api<{ data: InboxRow[] }>` +
  `body.data` kullanıyordu → runtime'da liste hep boş düşerdi.
- Düzeltme: `api<InboxRow[]>` + doğrudan dizi (EF-02C emsali).

## Değişen dosyalar

- `docs/workflow/packets/EF-04B-INBOX.json` (yeni)
- `src/components/mavenforms/views/registration-inbox-view.tsx` (2 satır)
- `tests/ef-registration-inbox.test.mjs` (yeni, 16 assertion)
- `docs/workflow/receipts/EF-04B-INBOX.md` (bu dosya)

## Çalıştırılan kontroller (bu oturum, cwd `D:\project\mavenform-v2`)

- `node scripts/workflow.mjs begin docs/workflow/packets/EF-04B-INBOX.json` → READY, exit 0.
- `node tests/ef-registration-inbox.test.mjs` → PASS, exit 0.
- `node tests/ux-registration-inbox-view.test.mjs` → PASS, exit 0.
- `node tests/registration-inbox.test.mjs` → PASS, exit 0.
- `node scripts/workflow.mjs verify docs/workflow/packets/EF-04B-INBOX.json` →
  bu receipt yazıldıktan sonra koşuldu; sonuç
  `artifacts/workflow/EF-04B-INBOX/verified.json` içindedir
  (verify içi: context-check + 3 hedef/regresyon test + `tsc --noEmit`).

Bu receipt verify öncesi donduruldu; verify sonrası düzenlenmedi.

## Sonuç / kanıt sınıfı

- Sonuç: verify çıktısına bağlı; resmi kayıt
  `artifacts/workflow/EF-04B-INBOX/verified.json`.
- Korunan davranış: event-gated liste, seçim-yok/hata/boş durumları, salt-okunur niyet.
- R-10 NO-GO korunur.

## Sıradaki packet

- F2-R1-FINANCE (finans özeti runtime bugfix + F2 süit yeniden doğrulama).
