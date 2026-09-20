# F5-R1-FLOOR — Receipt

**Tarih:** 2026-09-20 | **Packet:** F5-R1-FLOOR | **Önceki:** F4-R5-BADGE-CATALOG (LOCAL_PASS)
**Amaç:** Floor runtime bugfix (iki çift-çözüm) + plan/hold sözleşme kilidi.
Geometri kopyalanmaz.

## Kök neden (CODE_FAILURE, düzeltildi)

- `Promise.all` içindeki iki GET `api<{ data: ... }>` + `b.data`/`h.data`
  kullanıyordu → runtime'da binding ve hold listeleri boş düşerdi.
- Düzeltme: `api<Binding[]>` + `api<Hold[]>` doğrudan tüketim.

## Değişen dosyalar

- `docs/workflow/packets/F5-R1-FLOOR.json` (yeni)
- `src/components/mavenforms/views/floor-view.tsx` (3 satır)
- `tests/f5-floor-contract.test.mjs` (yeni, 17 assertion)
- `docs/workflow/receipts/F5-R1-FLOOR.md` (bu dosya)

## Çalıştırılan kontroller (bu oturum, cwd `D:\project\mavenform-v2`)

- `node scripts/workflow.mjs begin docs/workflow/packets/F5-R1-FLOOR.json` → READY, exit 0.
- `bun tests/f5-floor-contract.test.mjs` → PASS, exit 0.
- `bun tests/ux-floor-view.test.mjs` → PASS, exit 0.
- `node scripts/workflow.mjs verify docs/workflow/packets/F5-R1-FLOOR.json` →
  bu receipt yazıldıktan sonra koşuldu; sonuç
  `artifacts/workflow/F5-R1-FLOOR/verified.json` içindedir (verify içi 9 check).

Bu receipt verify öncesi donduruldu; verify sonrası düzenlenmedi.

## Sonuç / kanıt sınıfı

- Sonuç: verify çıktısına bağlı; resmi kayıt
  `artifacts/workflow/F5-R1-FLOOR/verified.json`.
- Kilitlenen sözleşme: metadata-only binding, hold 409 + token ayrımı + vade,
  event gate, geometri sınırı.
- Gerçek EFPS bağlantısı dış kapıdır → F5-R2'de sözleşme, canlı `EXTERNAL_DEPENDENCY`.
  R-10 NO-GO korunur.

## Sıradaki packet

- F5-R2-EFPS (EFPS adapter sözleşmesi: kanonik ID mapping + boundary).
