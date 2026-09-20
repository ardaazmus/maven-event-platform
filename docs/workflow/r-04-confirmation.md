# R-04B — R-04 Kabul Doğrulaması (2026-09-18)

R-04'ün `previous` zinciri (R-03 receipt'i sonraki commit'lerle saptı) makine
hükmüyle verify edilemiyor. Bu rapor R-04'ün dört kabul maddesini güncel ağaç
üzerinde koşan testlere bağlar; kod değişikliği yoktur, ağaç F9-09 sonrası
hâlini korur.

## Kabul → kanıt eşlemesi (taze koşu: 2026-09-18)

1. Dar/masaüstü/tablet genişlikte yatay taşma ve görünmez kritik aksiyon yok:
   `tests/invoice-center-responsive.test.mjs` → PASS (R-04A),
   `tests/submissions-layout.test.mjs` → PASS (AC-FORM-03),
   `tests/ui-layout.test.mjs` → PASS.
2. Export/import/send ve PII aksiyonları rol/politika görünürlüğüne uyar,
   yetkisiz aktif kontrol render edilmez:
   `tests/policy.test.mjs` kapsamı + `tests/ui-dead-actions.test.mjs` →
   PASS (envanter kilitli); invoice view'da Gönder butonu `disabled` +
   gerekçeli `title` taşır.
3. Klavye odağı, etiketler, disabled gerekçeleri ve durum semantiği mevcut:
   `tests/responsive-a11y.test.mjs` → PASS (AC-A11Y-01); satırlar `dl/dt/dd`
   etiketli (F9-09), iade satırında tek cümlelik açıklama var.
4. Responsive değişiklikler veri sözleşmelerini değiştirmedi:
   `tests/invoice-center-read-model.test.mjs` kapsamı korunur; F9-09 yalnız
   `invoice-center-view.tsx` render katmanını değiştirdi, DTO aynı
   (`tests/invoice-relational-display.test.mjs` → PASS).

Ek: `tsc --noEmit` → 0 hata; `bun run build` (turbopack) → PASS (43 sayfa);
`local-ready` → PASS. Tam suit (`run-tests.mjs`) bu paketin dışında tutuldu;
dış-bağımlılıklı testler R-10 kapısına aittir.
