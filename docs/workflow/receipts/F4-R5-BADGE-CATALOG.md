# F4-R5-BADGE-CATALOG — Receipt

**Tarih:** 2026-09-20 | **Packet:** F4-R5-BADGE-CATALOG | **Önceki:** F4-R4-BADGE-UPLOAD (LOCAL_PASS)
**Amaç:** Çok-formatlı katalog listeleme + raster üretim guard. Render hâlâ PDF-only.

## Yapılan iş

- Katalog `readCatalogItem`: 4 format key'ini (`source.pdf|png|jpg|webp`) dener;
  manifest `format`'u key ile eşleşmeli; formatsuz legacy PDF `pdf` varsayılır;
  `format/key` uyumsuzluğu reddedilir.
- Generate route: `template.format !== 'pdf'` ise
  `409 RENDER_FORMAT_UNSUPPORTED` (raster byte'lar PDF hattına sokulmaz).
- `BadgeTemplateCatalogItem` artık `format` taşır.

## Değişen dosyalar

- `docs/workflow/packets/F4-R5-BADGE-CATALOG.json` (yeni)
- `src/lib/badge-template-catalog.ts` (çok-key tarama + format)
- `src/app/api/forms/[id]/badges/generate/route.ts` (1 guard satırı)
- `tests/badge-template-catalog.test.mjs` (raster + legacy + mismatch)
- `tests/badge-generation-route.test.mjs` (+1 assertion)
- `docs/workflow/receipts/F4-R5-BADGE-CATALOG.md` (bu dosya)

## Çalıştırılan kontroller (bu oturum, cwd `D:\project\mavenform-v2`)

- `node scripts/workflow.mjs begin docs/workflow/packets/F4-R5-BADGE-CATALOG.json` → READY, exit 0.
- `bun tests/badge-template-catalog.test.mjs` → PASS, exit 0.
- `node tests/badge-generation-route.test.mjs` → PASS, exit 0.
- `node scripts/workflow.mjs verify docs/workflow/packets/F4-R5-BADGE-CATALOG.json` →
  bu receipt yazıldıktan sonra koşuldu; sonuç
  `artifacts/workflow/F4-R5-BADGE-CATALOG/verified.json` içindedir (verify içi 6 check).

Bu receipt verify öncesi donduruldu; verify sonrası düzenlenmedi.

## Sonuç / kanıt sınıfı

- Sonuç: verify çıktısına bağlı; resmi kayıt
  `artifacts/workflow/F4-R5-BADGE-CATALOG/verified.json`.
- Sınır: raster render (sharp kompozit) ayrı packet ister; o kapı kapalı.
  Saha cihazı kanıtı yok. R-10 NO-GO korunur.

## Sıradaki packet

- FAZ-5: F5-R1-FLOOR (EFPS adapter sözleşmesi + floor unwrap).
