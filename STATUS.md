# MavenForms güncel çalışma durumu

**Tarih:** 18 Eylül 2026  
**Normatif kaynak:** `docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/`

## Ana karar

MavenForms, yalnız form hazırlama/kayıt ürünü olarak yürütülmez. Güncel ürün kapsamı Maven Event Platform modelidir:

`Organization → Event → Registration → Person/Ticket → Credential/Badge → Check-in → Floor Plan → Reports`

Eski root planlar ve worklog’lar `docs/legacy/root-docs/` altında tarihsel referanstır; yeni iş akışını bloke etmez ve master planın yerine geçmez.

## Kanonik faz sırası

`F0 → F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8 → F9`

- F0: gerçeklik, context ve workflow bütünlüğü
- F1: Organization/Event/Occurrence/Person/Registration/FormBinding
- F2: order, catalog ve manuel ödeme
- F3: manuel fatura ve belge kontrolü
- F4: iç pilot, ticket, credential, badge ve check-in
- F5: Floor Editor entegrasyonu
- F6: canlı ödeme
- F7: otomatik fatura/e-belge
- F8: event modülleri
- F9: multi-tenant son kapı

## Mevcut kanıt

- Event/Person/Registration, order/payment/invoice, ticket/check-in/floor sözleşmeleri checkout’ta mevcut olabilir; her biri kendi source/test/receipt kanıtıyla değerlendirilir.
- FORM-UX ve BADGE sözleşmelerinin yerel kanıtları korunur; UI görünümü veya local/mock test production kanıtı değildir.
- Tarihsel UI gate kaydı: `FORM-UX-00..69A` yerel kanıtı korunur; `V4-00 HELD_BY_R10_AND_PRODUCT_ORDER` olarak tutulur.
- `F9-10`: Event-first UX, Badge Studio ve çoklu format yaka kartı çalışma dosyası `LOCAL_PASS` olarak kaydedildi.
- `F9-11`: root belge ve workflow kaynak izolasyonu `LOCAL_PASS`; legacy kayıtlar korunur, yeni runnable packet master plan `sourceOfTruth` taşır.
- UX turu `LOCAL_PASS` (30 receipt + kasa): badge allowlist paneli (BADGE-02) + effect lint borcu temizliği (LINT-01). Sıradaki: UX-RENDER-01 etkileşimli masaüstü oturumunda koşulacak (sandbox/uzaktan shell'de Chrome `ERR_NETWORK_ACCESS_DENIED` verir); kod hattında badge adım-3 (üretim önizleme) veya program/speaker görünümü.
- CTX kapanışı `LOCAL_PASS` yolunda (CTX-01-R1): bootstrap/adapter/faz kapıları registry'de; `bun` tam yetkili PATH'te doğrulandı.
- CTX-01-R3: belge hazirlik GET sozlesmesi korundu; upload testindeki stale POST-only satiri public-GET yasagi niyetiyle uzlastirildi (INV/F-U-02-01 + readiness + bola guard yesil).

## Release ve dış kanıt

- R-10: **NO-GO/BLOCKED**.
- Production release açık değil; local kanıt release onayı değildir.
- Gerçek provider, AV/quarantine, sender-domain, staging, backup/restore ve hukuk/muhasebe kanıtları olmadan production açılmaz.
- P-12B, P-12C, P-12D ve Paraşüt otomasyonu dış kanıt/karar kapılarına bağlıdır.
- Tarihsel release zinciri korunur: `R-09`, `V2-08A`, `V2-09A`, `V3-00`, `V3-04`, `V3-05`, `V4-03`, `V4-04`, `V4-05`, `V4-06`, `V4-07`.
- `LOCAL_PASS`, `PILOT_PASS`, `EXTERNAL_DEPENDENCY`, `UNVERIFIED` ve `NO_GO` birbirine çevrilmez.
- Secret, token, PAN/CVV, PII ve gerçek `.env` değerleri kod, log, test veya MD’ye yazılmaz.

## Yeni iş başlatma

Yeni iş yalnız şu özellikleri taşıyan READY packet ile başlar:

- `timeboxMinutes: 15`
- tek ölçülebilir çıktı
- `sourceOfTruth: docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/`
- açık `previous`, `reads`, `allowedFiles`, `acceptance`, `preflight`, `checks`

Superseded veya legacy packet’ler okunabilir tarihsel kayıttır; yeni iş için çalıştırılamaz.

## Doğrulama

Başlangıç: `AGENTS.md → PROJECT_CONTEXT.md → STATUS.md → git status → READY packet`.  
Kapanış: packet checks + uygun typecheck/lint/build/readiness + `node scripts/workflow.mjs verify <packet>`.
