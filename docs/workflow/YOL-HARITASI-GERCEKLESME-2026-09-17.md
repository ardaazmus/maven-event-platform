# Yol Haritası Gerçekleşme Raporu (2026-09-17)

Kaynak: `docs/workflow/YOL-HARITASI-KALAN-2026-09-17.md` (R1–R7 + veri-satırı taşıma).
Yöntem: her madde için receipt/packet/komut kanıtı arandı; bulunamayan "yapılmadı" yazıldı.
F9-05 paketiyle üretildi; R-packetleri mevcut değil (aşağıda kanıtlı).

## Yapıldı

- R1 kişi PII yetki kapatması — YAPILDI. Receipt: `artifacts/workflow/F1-20/verified.json`
  (LOCAL_PASS, changedFiles: persons route, policy, person-api testi). Canlı viewer-GET 403.
- R2 explicit org context — YAPILDI. Receipt: `artifacts/workflow/F1-21/verified.json`
  (LOCAL_PASS). Claim siz istek çok-üyelikte 401, wrong-org kaynak 404, sentetik kalıntı 0.
- R3 binding tekilliği — YAPILDI. Receipt: `artifacts/workflow/F1-22/verified.json`
  (LOCAL_PASS). İkinci registration binding 409; orchestration regresyonu yeşil.
- R4 sidebar test onarımı — YAPILDI. Receipt: `artifacts/workflow/F1-23/verified.json`
  (LOCAL_PASS). Tam süpürme 514/514 yeşil.
- R5 Postgres shadow rehearsal — YAPILDI. Receiptler: `artifacts/workflow/F1-25/verified.json`,
  `artifacts/workflow/F1-26/verified.json`, `artifacts/workflow/F1-27/verified.json`
  (üçü LOCAL_PASS) + `docs/workflow/pg-shadow-report.md`.
  Ortam: `mf-pg-shadow` (127.0.0.1:5433, trust auth). Kanıt: 73/73 tablo, kolon hash eşitliği,
  dump→drop→restore 73 tablo. Repo şeması ve dev DB değişmedi.

## Yapılmadı

- R6 canlı kapılar (merchant staging, mutabakat, refund/settlement, POS UAT) — YAPILMADI.
  Neden: sağlayıcı hesabı ve staging erişimi yok. İhtiyaç: merchant hesabı + staging ortamı,
  her biri ayrı packet. Mevcut: F6-05/F7-01 EXTERNAL_DEPENDENCY kayıtları + F6-06 simülasyon
  yöntemi (fake-adapter + fixture + contract test; canlı kanıt sayılmaz).
- R7 F8 modülleri ve F9 RLS — YAPILMADI.
  Neden: iç müşteri talebi yok (F8 talep-gated) ve RLS Postgres kapısındaydı; R5 ortamı
  bu turda hazırlandığı için RLS artık packetsiz değil, packetsiz-yani sıradaki iş.
  İhtiyaç: talep kaydı + RLS packet zinciri (F9-01 freeze korunarak).
- Veri-satırı taşıma (seed kopyalama) — YAPILMADI.
  Neden: tip eşleme + PII redaksiyonu ayrı packet ister; F1-27 raporunda sınır olarak kayıtlı.
  Shadow PG bu yüzden boştur; sayım karşılaştırması şema düzeyinde yapıldı.
  İhtiyaç: redaksiyon kurallı ayrı taşıma packet'i.
