# F4-R3-BADGE-FORMAT — Receipt

**Tarih:** 2026-09-20 | **Packet:** F4-R3-BADGE-FORMAT | **Önceki:** F4-R2-CHECKIN (LOCAL_PASS)
**Amaç:** Badge şablon sözleşmesini çok formata genişletmek (pure seviye):
PNG/JPEG/WebP MIME + extension + magic üçlü kontrolü, piksel tavanı,
format-bazlı storage key. PDF kuralları korunur.

## Karar (ACCEPTED)

- Kabul: `application/pdf|image/png|image/jpeg|image/webp` ×
  `.pdf|.png|.jpg|.jpeg|.webp` × magic (`%PDF-`, PNG-8, `FF D8 FF`, `RIFF....WEBP`).
- Üçü uyuşmazsa `FORMAT_MISMATCH`; bilinmeyen tür `FORMAT_REQUIRED`
  (eski `PDF_REQUIRED`/`PDF_SIGNATURE_INVALID` adları gömüldü; tek tüketici testti).
- Raster: `pageCount === 1` zorunlu, piksel tavanı 25MP (`PIXEL_COUNT_INVALID`).
- Başarı sonucu artık `format` taşır; storage key `source.<pdf|png|jpg|webp>`
  (varsayılan `pdf`, eski key'ler değişmez).
- Baskı çıktısı sözleşmesi (`badge-artifact-storage` PDF-only) aynen korunur.

## Değişen dosyalar

- `docs/workflow/packets/F4-R3-BADGE-FORMAT.json` (yeni)
- `src/lib/badge-template-contract.ts` (format motoru)
- `tests/badge-template-contract.test.mjs` (pdf korunum + 13 raster/key assertion)
- `docs/workflow/receipts/F4-R3-BADGE-FORMAT.md` (bu dosya)

## Çalıştırılan kontroller (bu oturum, cwd `D:\project\mavenform-v2`)

- `node scripts/workflow.mjs begin docs/workflow/packets/F4-R3-BADGE-FORMAT.json` → READY, exit 0.
- `bun tests/badge-template-contract.test.mjs` → PASS, exit 0.
- `bun tests/badge-template-catalog.test.mjs` → PASS, exit 0.
- `node tests/badge-template-upload-route.test.mjs` → PASS, exit 0.
- `node scripts/workflow.mjs verify docs/workflow/packets/F4-R3-BADGE-FORMAT.json` →
  bu receipt yazıldıktan sonra koşuldu; sonuç
  `artifacts/workflow/F4-R3-BADGE-FORMAT/verified.json` içindedir.

Bu receipt verify öncesi donduruldu; verify sonrası düzenlenmedi.

## Sonuç / kanıt sınıfı

- Sonuç: verify çıktısına bağlı; resmi kayıt
  `artifacts/workflow/F4-R3-BADGE-FORMAT/verified.json`.
- Sınır: decoder doğrulaması (pdf-lib/sharp) ve upload route benimsemesi
  bu packet'te YOK → F4-R4'e kalır; o olmadan raster yükleme açılmaz.
- R-10 NO-GO korunur.

## Sıradaki packet

- F4-R4-BADGE-UPLOAD (upload route + storage benimseme: sharp decoder + manifest).
