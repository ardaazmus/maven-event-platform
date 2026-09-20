# F4-R2-CHECKIN — Receipt

**Tarih:** 2026-09-20 | **Packet:** F4-R2-CHECKIN | **Önceki:** F4-R1-BADGE-STUDIO (LOCAL_PASS)
**Amaç:** Check-in runtime bugfix (iki çift-çözüm) + onsite tarama sözleşme kilidi.
Görünüm değişmedi.

## Kök neden (CODE_FAILURE, düzeltildi)

- Oturum listesi ve akış GET çağrıları `api<{ data: ... }>` + `body.data`
  kullanıyordu → runtime'da ikisi de boş düşerdi.
- Düzeltme: `api<OccurrenceOption[]>` + `api<FeedRow[]>` doğrudan tüketim.

## Değişen dosyalar

- `docs/workflow/packets/F4-R2-CHECKIN.json` (yeni)
- `src/components/mavenforms/views/checkin-view.tsx` (4 satır)
- `tests/f4-checkin-contract.test.mjs` (yeni, 18 assertion)
- `docs/workflow/receipts/F4-R2-CHECKIN.md` (bu dosya)

## Çalıştırılan kontroller (bu oturum, cwd `D:\project\mavenform-v2`)

- `node scripts/workflow.mjs begin docs/workflow/packets/F4-R2-CHECKIN.json` → READY, exit 0.
- `bun tests/f4-checkin-contract.test.mjs` → PASS, exit 0.
- `bun tests/ux-checkin-view.test.mjs` → PASS, exit 0.
- `node scripts/workflow.mjs verify docs/workflow/packets/F4-R2-CHECKIN.json` →
  bu receipt yazıldıktan sonra koşuldu; sonuç
  `artifacts/workflow/F4-R2-CHECKIN/verified.json` içindedir (verify içi 8 check:
  context-check + 6 checkin testi + tsc).

Bu receipt verify öncesi donduruldu; verify sonrası düzenlenmedi.

## Sonuç / kanıt sınıfı

- Sonuç: verify çıktısına bağlı; resmi kayıt
  `artifacts/workflow/F4-R2-CHECKIN/verified.json`.
- Kilitlenen sözleşme: event+occurrence gate, QR kimlik, duplicate 409,
  zaman penceresi, bounded akış, salt-okunur niyet.
- Gerçek saha cihazı kanıtı yok → saha kapsamı UNVERIFIED. R-10 NO-GO korunur.

## Sıradaki packet

- F4-R3-BADGE-FORMAT (PNG/JPEG şablon sözleşmesi + server-side doğrulama).
