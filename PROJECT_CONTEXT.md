# MavenForms — kanonik proje bağlamı

## Kaynak hiyerarşisi

Ürün ve çalışma kararlarının tek normatif kaynağı:

`docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/`

Eski root belgeleri `docs/legacy/root-docs/` altında referanstır. Root compatibility bridge dosyaları yalnız yönlendiricidir. Eski bir belge master planla çelişirse eski belge engel veya yeni kural değildir.

## Sistem sınırı

Next.js App Router + React + TypeScript + Bun + Prisma tabanı; kimlik doğrulamalı uygulama, server API, public form snapshot/submission sınırı, Event/Person/Registration çekirdeği, commerce/finance, invoice/document, credential/check-in, floor plan binding, notification/outbox ve ileride event modülleri.

Public form yalnız allowlist snapshot ve write-only submission yüzeyini görür. Token, workspace bilgisi, admin verisi, provider sırrı ve özel belge public’e çıkmaz.

## Kanonik ürün akışı

`Organization → Event → Occurrence/Venue → FormDefinition + EventFormBinding → Person + Registration → Ticket/Order/Payment/Invoice → Credential/Badge → Check-in/Attendance → Floor Plan/Inventory → Reports/Communication → F8 modules → F9 Multi-Tenant gate`

Kanonik fazlar: `F0` gerçeklik/paket bütünlüğü, `F1` Event Core, `F2` order/manual payment, `F3` manual invoice, `F4` onsite/badge/check-in, `F5` Floor Editor, `F6` live payment, `F7` e-document, `F8` event modules, `F9` multi-tenant.

## Güncel kanıt sınırı

Yerel kod ve test sözleşmeleri mevcut olabilir; production/live özelliği sayılmaz. R-10 ortak dış kanıt kapısıdır. Gerçek provider, AV/quarantine, sender-domain, staging, backup/restore ve hukuk/muhasebe kanıtı yoksa release `NO-GO` veya `EXTERNAL_DEPENDENCY` kalır.

## Görev yönlendirmesi

| Görev | Önce okunacaklar |
|---|---|
| Event/Person/Registration | `05_HEDEF_MIMARI.md`, `06_KANONIK_VERI_MODELI.md`, `11_YOL_HARITASI.md`, ilgili API/test |
| Form/builder/public | `04_MAVENFORMS_KAPSAM_UYUMU.md`, ilgili builder/public planı ve source/test |
| Badge/check-in | `06_KANONIK_VERI_MODELI.md`, `11_YOL_HARITASI.md`, badge/onsite source/test |
| Floor plan | `09_FLOOR_EDITOR_ENTEGRASYONU.md`, event/floor source/test |
| Payment/invoice | `07_MANUEL_ODEME.md`, `08_FATURA_EBELGE.md`, R-10 kanıtları ve source/test |
| UI/UX | `MAVENFORMS_EVENT_MANAGEMENT_UX_REDESIGN_MASTER_PLAN_2026-09-18.md`, ilgili source/test |
| Workflow/context | `12_GELISTIRME_KONTROL_SISTEMI.md`, `16_KANONIK_KAYNAK_VE_MIGRASYON_POLITIKASI_2026-09-18.md`, packet, scripts |

## Okuma politikası

Tüm worklog veya eski root planları varsayılan context’e yüklenmez. Yalnız packet `reads` alanında ya da tarihsel karar doğrulaması için gerektiğinde okunur. Eski kayıtlardan güncel durum çıkarılmaz; kod, test, registry ve güncel planla yeniden doğrulanır.
