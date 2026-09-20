# F5-R2-EFPS — Receipt

**Tarih:** 2026-09-20 | **Packet:** F5-R2-EFPS | **Önceki:** F5-R1-FLOOR (LOCAL_PASS)
**Amaç:** EFPS adapter sözleşmesi: kanonik ID mapping pure helper + gerçek unit test.
Canlı EFPS bağlantısı dış kapıdır.

## Karar (ACCEPTED)

- Maven yalnızca `ExternalIdMapping` referansı tutar; plan/geometri/envanter
  EFPS'te kalır, API/event adapter sınırından tüketilir.
- Kaynak türleri: `event|occurrence|venue|hall|plan|inventory|attendee`;
  çekirdek türleri: `event|occurrence|person|registration|ticket`.
- Key formatı `efps:<workspace>:<sourceType>:<sourceId>`; bozuk girdi fail-closed null.
- Kanonik referans: organizationId + eventId zorunlu, 7 opsiyonel ID güvenli-formatlı.

## Değişen dosyalar

- `docs/workflow/packets/F5-R2-EFPS.json` (yeni)
- `src/lib/efps-mapping.ts` (yeni, pure)
- `tests/efps-mapping.test.mjs` (yeni, gerçek unit test, 24 assertion)
- `docs/workflow/receipts/F5-R2-EFPS.md` (bu dosya)

## Çalıştırılan kontroller (bu oturum, cwd `D:\project\mavenform-v2`)

- `node scripts/workflow.mjs begin docs/workflow/packets/F5-R2-EFPS.json` → READY, exit 0.
- `bun tests/efps-mapping.test.mjs` → PASS, exit 0.
- `node scripts/workflow.mjs verify docs/workflow/packets/F5-R2-EFPS.json` →
  bu receipt yazıldıktan sonra koşuldu; sonuç
  `artifacts/workflow/F5-R2-EFPS/verified.json` içindedir (verify içi 6 check).

Bu receipt verify öncesi donduruldu; verify sonrası düzenlenmedi.

## Sonuç / kanıt sınıfı

- Sonuç: verify çıktısına bağlı; resmi kayıt
  `artifacts/workflow/F5-R2-EFPS/verified.json`.
- `EXTERNAL_DEPENDENCY`: gerçek EFPS endpoint/credential/yetki yok; hold/book/release
  yerel envanter hattında kanıtlı, EFPS senkronu kapalı. R-10 NO-GO korunur.

## Sıradaki packet

- FAZ-6: F6-R1-PROVIDER-GATE (canlı provider/e-belge dış kapı sözleşmesi).
