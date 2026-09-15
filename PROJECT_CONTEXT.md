# MavenForms — kısa proje bağlamı

Bu belge başlangıç yönlendirmesidir; tarihsel kayıt değildir. Güncel karar `STATUS.md`, faz ayrıntısı `AI-RELEASE-EXECUTION-PLAN.md`, ürün/teknik gerekçe `RELEASE-ROADMAP.md` içindedir.

## Sistem sınırı

Next.js App Router + React + TypeScript + Bun + Prisma + SQLite pilot tabanı. Kimlik doğrulamalı uygulama, server API, public form snapshot/submission sınırı, ödeme/faturalama adapter’ları, özel belge depolama ve transactional outbox ayrı katmanlardır. Public form yalnız allowlist snapshot ve write-only submission yüzeyini görür; token, workspace bilgisi, admin verisi ve provider sırrı public’e çıkmaz.

## Ana faz ve mevcut yürütme

Ana teknik sıra değişmez: PAY → INV/F manuel → Paraşüt API v4 → document security/document-ready → transactional delivery → pilot → form UX → SaaS. R-10 V4’e özel bir kapı değil, V1/V2/V3 için de ortak güvenlik, release ve dış kanıt kapısıdır; V4 bu tabana tenant izolasyonu/BYO/SaaS koşullarını ekler. Kullanıcıya açılacak ürün sürümleri bu teknik sırayı bozmadan V1 Maven iç kullanım formları → V2 Maven first-party ödeme + manuel fatura → V3 Paraşüt/ertelenmiş provider değerlendirmesi → en son V4 tenant kendi bağlantılarıyla SaaS şeklindedir. V4-00..02 yalnız ileri SaaS izolasyonu için hazırlık sözleşmeleridir; V4-03 ve sonrası first-party ödeme, manuel fatura, transactional mail ve pilot kapıları kapanmadan başlatılamaz. Güncel provider kararı: V2’de Türkiye için iyzico birincildir; banka Sanal POS, Stripe ve Google Pay direct ileri faz adaylarıdır. Paraşüt ve otomatik/toplu fatura gönderimi silinmemiş, risk ve resmi kanıt kapısına bağlı ertelenmiştir. Erken fazlar yalnız provider-neutral port/capability/evidence sözleşmesi kurar. Sürümlü modül/entitlement ve geçiş kapıları için `docs/superpowers/plans/2026-09-06-mavenforms-release-modules-first-party-saas-roadmap.md`, provider karar kaydı için `docs/acceptance/v2-deferred-provider-decision.md`, güncel alt faz için `STATUS.md` okunur. Paraşüt P-00..P-11 yerel sözleşmeleri ve P-12A teslimat kapsam düzeltmesi geçmiştir; P-12 bütünü tamamlanmış değildir.

## Release hedefi

İlk gerçek ürün hedefi **V1 çalışan Maven iç kullanım formları + V2 Maven first-party gerçek ödeme alma + manuel fatura gönderim pilotudur**. Paraşüt otomatik faturalama ve SaaS bu hedefin önkoşulu değildir; ileride yeniden değerlendirilecek V3/V4 hedefleridir. R-10 ilk hedefi blanket olarak durdurmaz; V1 güvenli iç kullanım ve V2 kontrollü first-party ödeme/manual fatura pilotu için ayrı kanıt kapıları uygular. Gerçek production ödeme ancak ilgili merchant/provider, webhook, belge, teslimat ve operasyon kanıtları tamamlanınca açılır.

## Görev yönlendirmesi

| Görev | Önce okunacak kaynaklar |
| --- | --- |
| Public form, publish, embed, WordPress | `docs/OzelAPP_Derin_Arastirma_2026-09-03/11_Public_Form_Embed_WordPress.md`, `src/app/api/public/**`, ilgili test |
| Builder, UI/UX, responsive, medya | `docs/OzelAPP_Derin_Arastirma_2026-09-03/12_Form_Builder_ve_UX.md`, `src/components/**`, ilgili test |
| Ödeme | `docs/OzelAPP_Derin_Arastirma_2026-09-03/01_Stripe.md`, `02_iyzico.md`, `03_Google_Pay.md`, `04_PCI_DSS_ve_Odeme_Guvenligi.md`, PAY planı ve ilgili adapter/test |
| Manuel fatura/import/export | `docs/OzelAPP_Derin_Arastirma_2026-09-03/06_Manuel_Fatura_Sistemi.md`, `src/lib/invoice-*.ts`, ilgili test |
| Paraşüt/e-belge | `docs/OzelAPP_Derin_Arastirma_2026-09-03/07_Parasut_API_v4.md`, `08_Turkiye_eFatura_eArsiv.md`, `src/lib/providers/**`, `tests/parasut-*.mjs` |
| Belge hazır olma ve teslimat | `09_Document_Ready_ve_Belge_Guvenligi.md`, `10_Transactional_Epostalar.md`, ilgili `invoice-document-*`, `invoice-delivery-*` kaynakları; ana plandaki MAIL-00..08 kanal/şablon/toplu gönderim kapıları ve `docs/research-sources/2026-09-07-mail-configuration-research-receipt.md` |
| Tenant/SaaS | `13_SaaS_Tenant_Mimarisi.md`, `AI-RELEASE-EXECUTION-PLAN.md` içindeki SaaS bölümü, ilgili auth/policy testleri |
| Context/ajan yürütmesi | `AGENTS.md`, `docs/workflow/README.md`, görev packet’i, `scripts/workflow.mjs`, `scripts/context-check.mjs` |

## Okuma politikası

Kısa dosyalar her görevde okunabilir. Uzun plan, worklog veya araştırma dosyası yalnız doğrudan görev kaynağıysa ya da kod/test çelişkisini çözmek gerekiyorsa açılır. Proje geneli inceleme gerektiğinde engel yoktur; tamamı context’e yüklenmesi yerine `rg` ile sembol, route, model ve test izlenir.

## Gerçeklik ve güvenlik

Kaynak doküman, kod, test ve canlı davranış ayrı kanıtlardır. Test/mock/sandbox/provider dokümanı production kanıtı değildir. Gerçek provider credential’ı yoksa durum `EXTERNAL_DEPENDENCY` veya `UNVERIFIED` kalır. Secret, PII, ödeme kart verisi ve gerçek ortam değerleri context katmanına yazılmaz.
