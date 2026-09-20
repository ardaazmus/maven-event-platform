# F9-R1-MOBILE — Receipt

**Tarih:** 2026-09-20 | **Packet:** F9-R1-MOBILE | **Önceki:** F8-R3-MODULE-GATE-ALL (LOCAL_PASS)
**Amaç:** EF-08 mobil sözleşmesi: idempotent operasyon zarfı validator +
replay/duplicate kuralları + gerçek unit test. Saha istemcisi domain gerçeği üretmez.

## Karar (ACCEPTED)

- 4 operasyon: `checkin.scan|badge.reprint|gate.ping|floor.holdSync`;
  her biri zorunlu server referansı taşır (`credentialId|badgeInstanceId|gateId|holdId`).
- Zarf: `opId + deviceId` güvenli-ID, zaman penceresi checkin hattıyla aynı
  (7 gün geçmiş / 5 dk gelecek), bozuk girdi 6 kodla reddedilir.
- Replay: aynı `opId` → `{ replay: true, duplicateOf }`; saklama server tarafındadır.
- `person.create` gibi üretim operasyonları sözlükte yoktur (reddedilir).

## Değişen dosyalar

- `docs/workflow/packets/F9-R1-MOBILE.json` (yeni)
- `src/lib/mobile-contract.ts` (yeni, pure; saat dışarıdan girer)
- `tests/f9-mobile-contract.test.mjs` (yeni, gerçek unit test, 26 assertion)
- `docs/workflow/receipts/F9-R1-MOBILE.md` (bu dosya)

## Çalıştırılan kontroller (bu oturum, cwd `D:\project\mavenform-v2`)

- `node scripts/workflow.mjs begin docs/workflow/packets/F9-R1-MOBILE.json` → READY, exit 0.
- `bun tests/f9-mobile-contract.test.mjs` → PASS, exit 0.
- `node scripts/workflow.mjs verify docs/workflow/packets/F9-R1-MOBILE.json` →
  bu receipt yazıldıktan sonra koşuldu; sonuç
  `artifacts/workflow/F9-R1-MOBILE/verified.json` içindedir (verify içi 6 check:
  context-check + mobil + checkin offline/scan/model (offline CANLI) + tsc).

Bu receipt verify öncesi donduruldu; verify sonrası düzenlenmedi.

## Sonuç / kanıt sınıfı

- Sonuç: verify çıktısına bağlı; resmi kayıt
  `artifacts/workflow/F9-R1-MOBILE/verified.json`.
- Sınır: gerçek saha cihazı/uygulaması yok; operasyon upload endpointi ayrı iştir.
  R-10 NO-GO korunur.

## Sıradaki packet

- F9-R2-TENANT (tenant isolation + BOLA/RLS + restore/export/delete kilidi).
