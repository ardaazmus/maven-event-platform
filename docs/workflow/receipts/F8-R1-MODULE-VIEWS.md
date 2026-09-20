# F8-R1-MODULE-VIEWS — Receipt

**Tarih:** 2026-09-20 | **Packet:** F8-R1-MODULE-VIEWS | **Önceki:** F6-R1-PROVIDER-GATE (LOCAL_PASS)
**Amaç:** 6 modül view'da 7 çağrıyı tek-seviye çözüme çevirmek + modül suit kilidi.
Görünüm değişmedi.

## Kök neden (CODE_FAILURE, düzeltildi)

- abstract/network/program/sponsor/survey liste GET'leri + program konuşmacı
  POST + reports binding okuma `api<{ data: ... }>` + `body.data` kullanıyordu →
  runtime'da listeler boş, konuşmacı `speakerId` tanımsız düşerdi.
- Düzeltme: tek-seviye generic + doğrudan tüketim (7 çağrı noktası).

## Değişen dosyalar

- `docs/workflow/packets/F8-R1-MODULE-VIEWS.json` (yeni)
- 6 view dosyası (abstract/network/program/reports/sponsor/survey, 2'şer satır;
  program 3 satır)
- `tests/f8-module-views.test.mjs` (yeni, 16 assertion)
- `docs/workflow/receipts/F8-R1-MODULE-VIEWS.md` (bu dosya)

## Çalıştırılan kontroller (bu oturum, cwd `D:\project\mavenform-v2`)

- `node scripts/workflow.mjs begin docs/workflow/packets/F8-R1-MODULE-VIEWS.json` → READY, exit 0.
- `bun tests/f8-module-views.test.mjs` → PASS, exit 0.
- 6 modül ux testi → 6/6 exit 0.
- `node scripts/workflow.mjs verify docs/workflow/packets/F8-R1-MODULE-VIEWS.json` →
  bu receipt yazıldıktan sonra koşuldu; sonuç
  `artifacts/workflow/F8-R1-MODULE-VIEWS/verified.json` içindedir (verify içi 10 check).

Bu receipt verify öncesi donduruldu; verify sonrası düzenlenmedi.

## Sonuç / kanıt sınıfı

- Sonuç: verify çıktısına bağlı; resmi kayıt
  `artifacts/workflow/F8-R1-MODULE-VIEWS/verified.json`.
- R-10 NO-GO korunur.

## Sıradaki packet

- F8-R2-ENTITLEMENT (modül manifest/entitlement + API mutation gate kilidi).
