# MavenForms güncel çalışma durumu

Bu dosya kısa bootstrap durumudur; ayrıntı ve receipt özeti [status-history.md](docs/workflow/status-history.md) içindedir.

## Kanonik kararlar

- Sıra değişmez: PAY → manuel fatura → Paraşüt → belge güvenliği → teslimat → pilot → FORM-UX → SAAS.
- Ürün çıkışları: V1 iç kullanım; V2 first-party ödeme + manuel fatura; V3 Paraşüt hazırlığı/ileride değerlendirme; V4 tenant SaaS.
- R-10 ortak dış kanıt/güvenlik kapısıdır ve **NO-GO/BLOCKED** kalır. Production; canlı provider, AV/quarantine, sender-domain, staging ve hukuk/muhasebe kanıtı olmadan açılmaz.
- Secret, token, PAN/CVV, PII ve gerçek `.env` değeri kod, log, test veya MD’ye yazılmaz. Yerel/mock kanıtı release onayı değildir.

## Güncel fazlar

- Tarihsel kapılar `R-09`, `V2-08A`, `V2-09A` korunur; dış kanıt eksik, release açık değil.
- V2 ödeme/manual fatura, webhook/retrieve/reconciliation, document-ready ve ayrı transactional kanal sözleşmeleri: **LOCAL_PASS**; canlı merchant/provider açılmadı.
- R-00-06B ve R-00-07B: **LOCAL_PASS**; Stripe korelasyonu sabit, iyzico mutation resmi sözleşme olmadan fail-closed.
- V3-00, V3-04, V3-05: **LOCAL_PASS / PROVIDER_NEUTRAL veya NO_GO_DEFERRED**; Paraşüt otomatik fatura gerçek kanıtlar olmadan açılmaz, V2 manuel yol korunur.
- FORM-UX-00..69A: **LOCAL_PASS**; shell, builder, medya, responsive/a11y, görünüm-tema, ayar/navigasyon ve preview doğrulandı.
- BADGE-00-R1..43: **LOCAL_PASS**; QR/ID, template, tek/çift yüz, generation, scan, READY-only PDF/ZIP zinciri hazır; production kapalı.
- V4-00: **HELD_BY_R10_AND_PRODUCT_ORDER**; V1/yaka kartı/V2/V3 tamamlanmadan V4 yok; mevcut provider-neutral sözleşmeler korunur, tenant tahsilatı ve SaaS billing kapalı.
- V4-03: **LOCAL_PASS / TENANT_BYO_INVOICE_MAIL_BOUNDARY**; tenant scope, manuel/gelecekteki Paraşüt kaynağı ayrımı, document-ready ve verified transactional sender koşulları doğrulandı.
- V4-04: **LOCAL_PASS / SUPPORT_BREAK_GLASS_BOUNDARY**; operator deny-by-default, tenant onayı, scope, read-only allowlist, MFA/step-up, ticket, süre ve revocation doğrulandı. Gerçek support session açılmadı.
- V4-05: **LOCAL_PASS / EXTERNAL_MANUAL_SUBSCRIPTION_BOUNDARY**; platform aboneliği tenant end-customer payment domaininden ayrıldı, approval/reference/effective date matrisi doğrulandı; mutation kapalı.
- V4-06: **LOCAL_PASS / SUSPEND_REACTIVATE_DATA_PRESERVATION**; askıda public/publish/create/delete kapıları, izinli export, subscription kontrolü ve snapshot/idempotency koruması doğrulandı; silme ve SaaS mutation açılmadı.
- V4-07: **LOCAL_PASS / V4_RELEASE_NO_GO**; tenant/BYO/support/subscription/suspend gate’e bağlı; provider/mail, TLS, backup/restore, legal/DPA ve review olmadan production kapalı.
- Mail: **ACCEPTED_WITH_ROUTING**; form ve fatura kanalları ayrıdır; yerel şablon/consent/sender preflight hazır, canlı teslimat kanıtı yok.
- İleri otomasyon ve SaaS: **PARKED_BY_PRODUCT_ORDER**. `P-12B`, `P-12C`, `P-12D` bu durumdadır; release açık değil.
- Öncelik: **V1 → yaka kartı → V2 → V3**; V4 sonra. R-10 ortaktır.
- Workflow: `SUPERSEDED` packet'ler yeniden çalıştırılmaz; yalnız güncel `READY` packet yürütülür.

## Kanıt ve yürütme kapıları

- Her mikro-faz 15 dakika, tek ölçülebilir çıktı, READY packet ve `previous` kilidi ile yürür.
- Başlangıç: `AGENTS.md` → `PROJECT_CONTEXT.md` → `STATUS.md` → git → packet reads; sonra `workflow begin`.
- Kapanış: paket checks, TypeScript/lint/build/readiness uygunluğu ve `node scripts/workflow.mjs verify <packet>`.
- Değişiklik yalnız packet `allowedFiles` kapsamındadır; UI görünmesi işlev kanıtı değildir. Server auth/input, tenant scope, public/private ve idempotency korunur.
- R-10 değişmez; V4 provider-neutral, production ayrı kapıdır.

## Çalışma kanıtı

- Workflow receipt’leri: `artifacts/workflow/<FAZ>/verified.json`
- Tarihsel kararlar: [docs/workflow/status-history.md](docs/workflow/status-history.md)
- Packet kuralları: [docs/workflow/README.md](docs/workflow/README.md)
- Sunucu: `localhost:3000`; production/cloud, gerçek provider mutation ve veri silme kapsam dışı.

## 2026-09-11 R-10/V4 güvenli entegrasyon araştırma planı

- Yeni anonim rapor kaynak kaydı: `docs/research-sources/2026-09-11-ozelapp-r10-v4-guvenli-entegrasyon-research-receipt.md`.
- Uygulama planı: `docs/superpowers/plans/2026-09-11-r10-v4-guvenli-entegrasyon-wizard-simulasyon-mikro-faz-plani.md`.
- `R10-V4-00`: **LOCAL_PASS / PLAN_ALIGNED**; kaynak hash’i, 15 dakikalık packet zinciri ve mevcut faz sırası kaydedildi.
- `R10-V4-01`: **LOCAL_PASS / EVIDENCE_MODEL**; E0-E6 ile LOCAL/PILOT/RELEASE ayrımı normalize edildi.
- `R10-V4-02`: **LOCAL_PASS / LIVE_GUARD**; non-prod live endpoint/secret ve R-10’suz prod live reddedilir.
- `R10-V4-03`: **LOCAL_PASS / CAPABILITY_SNAPSHOT**; entitlement ve runtime kanıtı ayrıdır.
- `R10-V4-04`: **LOCAL_PASS / EXTERNAL_EVIDENCE_REGISTRY**; dış kanıt registry şeması.
- `R10-V4-04-R1`: **IN_PROGRESS / REVALIDATION**; metadata eşitleniyor.
- `R10-V4-05`: **LOCAL_PASS / ASSET_PURPOSE_STATE**; medya purpose/state matrisi.
- `R10-V4-06`: **LOCAL_PASS / MEDIA_SCOPE**; upload/attach server-owned.
- `R10-V4-07`: **LOCAL_PASS / MEDIA_STATE_UI**; pending aktif değil.
- R10-V4-08: PASS / SECURE_FILE_POLICY.
- R10-V4-09: PASS / MEDIA_TOKEN_LIFECYCLE.
- R10-V4-10: PASS / MEDIA_LIFECYCLE.
- R10-V4-11: PASS / CONNECTION_PURPOSES.
- R10-V4-12: PASS / SECRETS.
- R10-V4-13: PASS / VERIFY.
- R10-V4-14: PASS / LIFECYCLE; hash revalidated.
- R10-V4-15: PASS / PKCE.
- R10-V4-16: PASS / CREDENTIAL_METHODS.
- R10-V4-17: PASS / FAKE_PROVIDER.
- R10-V4-18: PASS / WEBHOOK_FIXTURES.
- R10-V4-19: PASS / DISPOSABLE_TEST_PROFILE.
- R10-V4-20: PASS / SYNTHETIC_GRAPH.
- R10-V4-21: PASS / FAILURE_MATRIX.
- R10-V4-22: PASS / EPHEMERAL_STAGING.
- R10-V4-23: PASS / PRODUCTION_GUARD_NEGATIVE.
- R10-V4-24: PASS / WIZARD_SHELL.
- R10-V4-25: PASS / PAY_WIZARD.
- R10-V4-26-44: PASS.
- R10-V4-44: WIP.
- R-10/V4 live: `NO-GO`; dış kanıt bekler.
