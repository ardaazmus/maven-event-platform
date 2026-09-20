# Historical compatibility bridge — eski yürütme planı

> **LEGACY / NON-NORMATIVE:** Bu dosya yeni iş akışını, faz sırasını veya ürün domainini yönetmez.

Bu dosyanın özgün kaydı korunmuştur:

- [`docs/legacy/root-docs/AI-RELEASE-EXECUTION-PLAN.md`](docs/legacy/root-docs/AI-RELEASE-EXECUTION-PLAN.md)

Yeni işler için tek normatif kaynak:

- [`MavenForms Platform Core Master Plan`](docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/00_OKU_BENI.md)
- [`Kanonik kaynak ve migrasyon politikası`](docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/16_KANONIK_KAYNAK_VE_MIGRASYON_POLITIKASI_2026-09-18.md)
- [`Geliştirme kontrol sistemi`](docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/12_GELISTIRME_KONTROL_SISTEMI.md)

Bu köprü dosyası yalnız eski test/bağlantı yollarının kırılmaması içindir. Eski PAY → INV/F → Paraşüt → document → delivery → pilot → FORM-UX → SaaS metni tarihsel kayıttır; yeni ürün kapsamı Event Platform’un F0 → F9 ana planına göre değerlendirilir. `LOCAL_PASS` release onayı değildir; R-10 dış kanıt kapısı korunur.

## Tarihsel test uyumluluk işaretleri

Bu ifadeler yalnız arşivlenmiş kararların otomatik regresyon testlerinde aranabilmesi içindir; yeni iş akışı kuralı değildir: `manuel export veya Paraşüt fatura oluşturma`, `C-02 — Payment snapshot’a bağlama`, `PAYMENT_LIVE_ENABLED=true`.
