# F4-R4-BADGE-UPLOAD — Receipt

**Tarih:** 2026-09-20 | **Packet:** F4-R4-BADGE-UPLOAD | **Önceki:** F4-R3-BADGE-FORMAT (LOCAL_PASS)
**Amaç:** Upload benimseme: route decoder ayrımı (pdf-lib/sharp) + formatlı
storage manifest. Katalog listeleme ve render guard F4-R5'e kalır.

## Yapılan iş

- Upload route: MIME/uzantı ön-ayrımı → PDF'de `PDFDocument.load` decoder,
  raster'da `sharp().metadata()` decoder + `metadata.format × MIME` çapraz kontrol;
  uyumsuzluk `FORMAT_MISMATCH` 415; yanıt `format` taşır.
- Storage: `storeBadgeTemplate` MIME alır, sözleşme `format`'ıyla
  `source.<ext>` yazar; manifest `format` taşır; `readBadgeTemplate` 4 format
  key'ini dener, formatsuz legacy PDF manifestini `pdf` varsayar.
- Overwrite koruması (`wx` → `WRITE_CONFLICT`) ve path traversal guard'ları korunur.

## Değişen dosyalar

- `docs/workflow/packets/F4-R4-BADGE-UPLOAD.json` (yeni)
- `src/app/api/forms/[id]/badges/templates/route.ts` (decoder ayrımı)
- `src/lib/badge-template-storage.ts` (mime + formatlı key/manifest + çoklu-key okuma)
- `tests/badge-template-upload-route.test.mjs` (+5 assertion)
- `tests/badge-template-storage.test.mjs` (yeni, gerçek fs round-trip, 20 assertion)
- `docs/workflow/receipts/F4-R4-BADGE-UPLOAD.md` (bu dosya)

## Çalıştırılan kontroller (bu oturum, cwd `D:\project\mavenform-v2`)

- `node scripts/workflow.mjs begin docs/workflow/packets/F4-R4-BADGE-UPLOAD.json` → READY, exit 0.
- `node tests/badge-template-upload-route.test.mjs` → PASS, exit 0.
- `bun tests/badge-template-storage.test.mjs` → PASS, exit 0.
- `node scripts/workflow.mjs verify docs/workflow/packets/F4-R4-BADGE-UPLOAD.json` →
  bu receipt yazıldıktan sonra koşuldu; sonuç
  `artifacts/workflow/F4-R4-BADGE-UPLOAD/verified.json` içindedir (verify içi 6 check:
  context-check + upload-route + storage + contract + catalog + tsc).

Bu receipt verify öncesi donduruldu; verify sonrası düzenlenmedi.

## Sonuç / kanıt sınıfı

- Sonuç: verify çıktısına bağlı; resmi kayıt
  `artifacts/workflow/F4-R4-BADGE-UPLOAD/verified.json`.
- Sınır: katalog hâlâ yalnız `source.pdf.json` arar (raster listelenmez);
  generate render PDF varsayar → ikisi de F4-R5'te kapanır. Canlı yükleme
  (multipart) bu ortamda koşulmadı. R-10 NO-GO korunur.

## Sıradaki packet

- F4-R5-BADGE-CATALOG (çok-formatlı katalog + render format guard).
