# EF-04A-INTAKE — Receipt

**Tarih:** 2026-09-20 | **Packet:** EF-04A-INTAKE | **Önceki:** EF-03B-FORM-CREATE (LOCAL_PASS)
**Amaç:** Canonical intake sözleşmesini kurmak: tüm kaynaklar için pure
normalizer/dedupe helper + gerçek unit test + persons hattında benimseme.

## Karar (ACCEPTED, dar kapsam)

- 5 kanonik kaynak sabitlendi: `form|csv|xlsx|api|manual` (`Submission.source`
  değerleri `web|embed|api|import` ham kanal bilgisidir; intake kaynağı değildir).
- Normalizasyon: email trim+lowercase, phone ayraç temizliği (+ korunur),
  isim trim+iç boşluk tekleme. Dedupe anahtarı email öncelikli, sonra phone.
- `POST /api/persons` artık dedup-lookup ve create öncesi normalize eder;
  `Test@X.com` / `test@x.com` kaçakları kapanır. Boş-normalize isim 400 verir.
- Kayıt statü akışı, 409 dedup-review kararı ve history zinciri değişmedi.

## Değişen dosyalar

- `docs/workflow/packets/EF-04A-INTAKE.json` (yeni)
- `src/lib/intake.ts` (yeni, pure; DB/fetch yok)
- `tests/ef-intake.test.mjs` (yeni, gerçek unit + route benimseme kilidi, 26 assertion)
- `src/app/api/persons/route.ts` (normalizer benimseme + boş-isim guard)
- `docs/workflow/receipts/EF-04A-INTAKE.md` (bu dosya)

## Çalıştırılan kontroller (bu oturum, cwd `D:\project\mavenform-v2`)

- `node scripts/workflow.mjs begin docs/workflow/packets/EF-04A-INTAKE.json` → READY, exit 0.
- `node tests/ef-intake.test.mjs` → PASS, exit 0 (2 test-tarafı beklenti
  hatası düzeltildi: telefon basamak yazımı + ham-email negatif assertion
  daraltması; helper kodu doğruydu).
- `node tests/person-model.test.mjs` → PASS, exit 0.
- `node tests/registration-model.test.mjs` → PASS, exit 0.
- `node tests/person-api.test.mjs` → PASS, exit 0 (route değişikliği sonrası).
- `node scripts/workflow.mjs verify docs/workflow/packets/EF-04A-INTAKE.json` →
  bu receipt yazıldıktan sonra koşuldu; sonuç
  `artifacts/workflow/EF-04A-INTAKE/verified.json` içindedir
  (verify içi: context-check + 3 hedef/regresyon test + `tsc --noEmit`).

Bu receipt verify öncesi donduruldu; verify sonrası düzenlenmedi.

## Sonuç / kanıt sınıfı

- Sonuç: verify çıktısına bağlı; resmi kayıt
  `artifacts/workflow/EF-04A-INTAKE/verified.json`.
- Sınır: canlı DB/server davranışı bu ortamda koşulmadı → live kapsam UNVERIFIED;
  CSV/XLSX/API/manuel importer uçları henüz bu helper'ı tüketmiyor (takip iş).
- R-10 NO-GO korunur.

## Sıradaki packet

- FAZ-3: F2/F3 doğrulama (order/manual payment/invoice + outbox/communication).
