# MavenForms e-Belge 15 Dakikalık Uygulama Paketleri

**Güncel yürütme işaretçisi (2026-09-05):** P-12B yerel doğrulaması PASS; sıradaki paket P-12C. P-12 genel teslimat/release kapısı henüz açık değildir. Aşağıdaki eski aktif-faz kayıtları tarihsel notlardır; bu işaretçi ve P-12 altındaki güncel alt-paketler esas alınır.

**R-10B karar işaretçisi (2026-09-06):** R-10 dış kanıtları hâlâ `NO-GO/BLOCKED` olduğu için genel canlı aktivasyon `SUSPENDED_BY_R10` durumunda tutulmuştur. Bu, yerel sözleşme ve testlerin iptali değildir. Form kayıt bildirimleri ile fatura teslimat e-postaları ayrı message class, sender profile, queue/idempotency ve audit sınırlarında tutulur; tek provider hesabı kullanılsa bile bu ayrım korunur.

**R-10C kapsam düzeltmesi (2026-09-06):** `R-10B`’nin blanket hold kararı yalnız global release, production/live mutation, gerçek dış alıcıya teslimat ve SaaS tenant tahsilatı için geçerlidir. Şirketimizin kendi first-party kapsamı için local/staging kontrollü capability ayrılmıştır: server-side merchant kimliği ve provider sandbox kanıtıyla payment sandbox; muhasebecinin dış sistemde kestiği faturanın private/quarantine upload → yetkili onay → `document_ready` → ayrı transactional billing sender akışı. Bu ayrım master sırayı değiştirmez; SaaS/BYO abonelik ve tenant merchant yolu yine en son fazdadır. Ayrıntı: [`r10-first-party-pilot-and-manual-invoice.md`](../../runbooks/r10-first-party-pilot-and-manual-invoice.md).

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Every package is a maximum 15-minute timebox and ends with its own verification gate.

**Goal:** Ödeme yapan kişilerin Paraşüt API v4, API’siz muhasebe Excel akışı veya muhasebeden gelen fatura belgesi ile güvenli ve denetlenebilir biçimde faturalandırılmasını sağlamak.

**Architecture:** Faturalama, ödeme durumundan ayrı bir `InvoiceRecord` yaşam döngüsü olarak çalışır. Ödeme sağlayıcısı yalnızca yetkili ödeme olayını sağlar; fatura adayı, muhasebe/Paraşüt sonucu, belge ve e-posta teslimatı ayrı durumlarla takip edilir. API, import, upload ve e-posta işlemleri aynı workspace/form authorization, idempotency ve audit kurallarını paylaşır.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, mevcut payment/outbox/storage yardımcıları, XLSX değişim dosyası, Paraşüt API v4 JSON:API/OAuth2.

**Spec:** [`2026-09-02-mavenforms-e-belge-parasut-v4-ve-api-siz-faturalama-yol-haritasi.md`](./2026-09-02-mavenforms-e-belge-parasut-v4-ve-api-siz-faturalama-yol-haritasi.md)
**E-posta teslim edilebilirlik spec’i:** [`2026-09-02-mavenforms-toplu-e-posta-teslim-edilebilirlik-ve-mail-platformlari.md`](./2026-09-02-mavenforms-toplu-e-posta-teslim-edilebilirlik-ve-mail-platformlari.md)
**Derin araştırma kanıt paketi:** [`OzelAPP_Derin_Arastirma_2026-09-03`](../../OzelAPP_Derin_Arastirma_2026-09-03/README.md) ve [`KAYNAK_LEDGERI.md`](../../OzelAPP_Derin_Arastirma_2026-09-03/KAYNAK_LEDGERI.md)

## Güncel yürütme durumu — 2026-09-05

Gerçek Stripe/iyzico sandbox hesabı ve gerçek test işlem kimliği henüz doğrulanmadı. Önceki `DEFERRED_BY_PRODUCT_OWNER` kaydı, kullanıcı kararıyla ödeme alma, fatura üretim/formalizasyonu ve fatura teslimatı canlı aktivasyonu için `SUSPENDED_BY_R10` olarak güncellenmiştir; mevcut yerel sözleşme, test ve veri modelleri korunur. Yalnız credential’sız ve synthetic fixture ile doğrulanabilen geliştirme çalışmaları yapılabilir. Synthetic ödeme kanıtı gerçek provider hesabı kanıtı yerine geçmez. `PAYMENT_LIVE_ENABLED=true` yapılamaz.

**Aktif paket:** `P-12C — Belge hazır olma ve teslimat bağlantısı`; `M-00`–`M-05`, C-00..C-04, X-00..X-06, I-00..I-06 ve U-00..U-05 yerel kapıları tamamlandı. I-00 quarantine, I-01 normalized schema, I-02 row validation, I-03 stable reference matching, I-04 read-only dry-run, I-05 approved/idempotent apply journal, I-06 fail-closed import gate, U-00 PDF/XML file-type gate, U-01 XLSX/ZIP security gate, U-02 authenticated private document upload, U-03 hash/duplicate idempotency, U-04 read-only document match preview ve U-05 fail-closed upload gate hazır. E-00 transactional fatura e-posta şablonu, E-01 document-ready idempotent kuyruklama, E-02 bounded worker retry/hata sınıflandırması, E-03 audit’li resend/suppression ve E-04 birleşik e-posta kapısı tamamlandı; P-00 provider-independent Paraşüt adapter, P-01A OAuth state/token sözleşmesi, P-01B server-side OAuth callback/start route ile transaction persistence, P-01C refresh rotation/CAS, P-02A company-scope health karar sözleşmesi, P-02B provider company discovery/health route ve P-03A contact lookup/resolution sözleşmesi tamamlandı. P-03B contact-create preparation/idempotency ve P-03C approved execution/reconcile sözleşmeleri tamamlandı; P-12A ve P-12B yerel kapıları da PASS durumunda. Provider POST yalnız server-only wiring ve canlı dış bağımlılık kapılarından sonra açılacak. Marketing/campaign akışı açılmayacak. Gerçek provider sandbox, AV release ve Paraşüt issue yolu hâlâ kapalıdır. Mali/hukuki belirsizlikler otomatik başarı sayılmayacak, `accounting_review_required` durumuna yönlendirilecektir.

**P-02B durum düzeltmesi (2026-09-05):** P-02B PASS olarak tamamlandı. Resmi Paraşüt v4 Swagger’da doğrulanan `GET https://api.parasut.com/me?include=companies` şirket keşfi ve `GET https://api.parasut.com/v4/{company_id}/contacts?page[size]=1` kapsam sağlık kontrolü server-only istemciye bağlandı ([Paraşüt API v4 Swagger](https://apidocs.parasut.com/swagger.json)). Health route yalnız authenticated `integrations.manage` + MFA + same-origin isteği kabul ediyor; workspace/company kapsamı doğrulanmadan bağlantı `active` olmuyor. Token süresi dolmuşsa, provider 401/403/429/5xx veya ağ hatasında güvenli ve sınıflandırılmış durum dönüyor. Provider token, ham yanıt, credential envelope ve provider PII browser/audit response’a taşınmıyor; company seçimi otomatik yapılmıyor. Hedef test, tam runner `212 files`, TypeScript, lint ve production build PASS; `/api/ready` `200 {"status":"ready","db":"ok"}`. Gerçek Paraşüt hesabı/token ve canlı HTTP health çağrısı dış bağımlılık olarak hâlâ doğrulanmadı. Aktif sonraki mikro-faz `P-03A — Contact lookup/resolution`.

**P-03A durum düzeltmesi (2026-09-05):** P-03A PASS olarak tamamlandı. Resmi contacts GET/POST sözleşmesine uygun bounded lookup, allowlist candidate parsing ve VKN/e-posta/name resolution kararları uygulandı; yalnız tekil güçlü eşleşme otomatik bağlanabilir, sıfır sonuçta create kararı açık onay gerektirir, belirsiz sonuç manuel incelemedir. POST yalnız hazırlanır; provider yan etkisi açılmaz. Hedef test, tam runner `213 files`, TypeScript, lint ve production build PASS. Aktif sonraki mikro-faz `P-03B — Explicit contact create transaction preparation/idempotency`.

**P-03B durum düzeltmesi (2026-09-05):** P-03B PASS olarak tamamlandı. `ParasutContactCommand` migration/modeli workspace + request fingerprint benzersiz idempotency fence’i olarak eklendi. Açık `approvedById` ve `create_required` resolution olmadan command üretilemiyor; provider isteği/bearer token yalnız geçici execution değerinde kalıyor ve persist edilen command’a girmiyor. Unique-index yarışları duplicate olarak çözümleniyor; provider POST veya kör retry bu fazda açılmadı. Hedef test, tam runner `214 files`, TypeScript, lint, production build, Prisma validate/migration deploy/client generate ve `/api/ready` PASS; canlı e2e/security regresyonu da yeniden geçti. Aktif sonraki mikro-faz `P-03C — Approved provider contact create execution/reconcile`.

**P-03D durum düzeltmesi (2026-09-05):** P-03D PASS olarak tamamlandı. `src/lib/parasut-contact-command-store.ts` yalnız server boundary’de Prisma command adapterı sağlar; scope closure workspace, connection ve numeric company ID ile kurulur. `approved → submitted` claim’i ve submitted → confirmed/reconciliation_required/failed geçişleri aynı kapsam koşullarıyla conditional `updateMany` üzerinden yapılır; başka worker veya tenant kaydı claim edemez. Fake-client davranış testi scope, claim tekrarını ve confirmed replay’i doğruladı. Hedef test, tam runner `216 files`, TypeScript, lint ve production build PASS; `/api/ready` 200/db ok ve canlı e2e/security regresyonları PASS. Gerçek worker/route çağrısı bu fazda bağlanmadı. Aktif sonraki mikro-faz `P-03E — Server-only execution worker wiring`.

**P-03E durum düzeltmesi (2026-09-05):** P-03E PASS olarak tamamlandı. `src/lib/parasut-contact-worker.ts` command, connection, source snapshot ve provider lookup sınırlarını server-only orchestration içinde birleştiriyor. Command workspace/connection/company kapsamı ve connection `active` durumu doğrulanmadan credential çözülmüyor; credential yalnız geçici bellekte kullanılıyor. Güncel lookup ve `create_required` kararı P-03C execution’a aktarılıyor; provider çağrısı public route’a açılmıyor. Worker güvenli normalize durumlar döndürüyor ve raw provider ayrıntısı taşımıyor. Hedef test, tam runner `217 files`, TypeScript, lint, production build, canlı e2e/security ve `/api/ready` PASS. Gerçek Paraşüt hesabı/canlı contact POST’u dış bağımlılık olarak doğrulanmadı. Aktif sonraki mikro-faz `P-04 — Product lookup/create`.

**P-04A durum düzeltmesi (2026-09-05):** P-04A PASS olarak tamamlandı. `src/lib/providers/parasut-product.ts`, resmi Paraşüt v4 `/v4/{company_id}/products` GET/POST JSON:API sözleşmesine uygun bounded product lookup, yalnız resmi `code`/`name` filtreleri, maksimum 25 sayfalama, allowlist candidate parser ve güvenli product resolution kararı sağlıyor. Tekil exact code eşleşmesi bağlanabilir; isim eşleşmesi veya çoklu sonuç sessiz eşleşmeye çevrilmeyip `manual_review_required` döner; sonuç yoksa geçerli isim için yalnız açık onay gerektiren `create_required` kararı üretilir. Create request yalnız resmi yazılabilir alanları taşır; `stock_count`, `created_at` gibi read-only alanlar ve credential body’ye alınmaz. Bu mikro-faz provider POST çalıştırmıyor ve product command/worker yan etkisini açmıyor. Hedef test, tam test runner `218 files`, TypeScript, lint, production build ve `/api/ready` `200 {"status":"ready","db":"ok"}` PASS. Resmi dayanak [Paraşüt API v4 Swagger](https://apidocs.parasut.com/swagger.json); gerçek hesap/canlı product çağrısı dış bağımlılık olarak doğrulanmadı. Aktif sonraki mikro-faz `P-04B — Explicit product create preparation/idempotency`.

**Lokal bakım yetkisi:** `M-00` gibi bir paketin zorunlu üretim/verification adımı çalışan lokal server’ın dosya kilidi nedeniyle durursa, uygulama sahibi ayrıca onaylamasa da yalnız geliştirme ortamındaki lokal server kontrollü olarak durdurulabilir. Migration veya kullanıcı verisi silinmez; üretim/hosting ortamına müdahale edilmez. Komut tamamlandıktan sonra server yeniden açılır ve `/api/ready`, ilgili testler, lint, TypeScript ve build yeniden geçilir. Bu yetki faz sırasını veya release kapılarını atlama izni değildir.

**Güncel durum düzeltmesi (2026-09-05):** C-02, C-03, C-04, X-00..X-06, I-00..I-06 ve U-00..U-05 yerel kapıları tamamlandı. E-00..E-04, P-00, P-01A, P-01B, P-01C, P-02A, P-02B, P-03A, P-03B, P-03C, P-03D, P-03E, P-12A ve P-12B PASS olarak tamamlandı; yetkili aktif paket `P-12C — Belge hazır olma ve teslimat bağlantısı`dır. Hiçbir mikro-paket önceki kapıları atlayamaz. Dosya kilidi, migration/client üretimi, build cache veya port çakışması gerçekten gerektirirse ürün sahibinin açık yetkisiyle yalnız `localhost:3000` geliştirme server’ı kontrollü durdurulabilir; production/cloud durdurulamaz, veri resetlenemez ve silinemez. Durdurma öncesi durum kontrol edilir; işlem bitince server yeniden açılır, `/api/ready`, hedef test, TypeScript, lint, build ve önceki regresyon kapıları yeniden çalıştırılır. Faz tamamlanmadan lokal server kapalı bırakılmaz.

**Entegrasyon kuralı:** E-posta planı ayrı bir ürün/yan proje değildir. `MAIL-00..MAIL-20`, bu ana faturalama ve release akışının çapraz kesen mikro-paketleridir; ilgili `E`, `P` ve `R` paketlerinin giriş/çıkış kapılarına bağlı yürütülür.

**R-10B — ödeme/fatura askısı ve mail kanal ayrımı (2026-09-06):** R-10 dış kanıtları tamamlanana kadar ödeme alma, fatura üretim/formalizasyonu ve fatura teslimatı için canlı mutation/dispatch açılmaz. Form kayıt bilgi e-postası `notification` kanalında; fatura e-postası `transactional` kanalında yürür. Aynı provider hesabı seçilebilir, ancak `senderProfileId`, `from/reply-to`, template namespace, queue/rate-limit, suppression, idempotency/event key ve audit action ayrıdır. Fatura sender profili ancak `R-10=PASS` ve `manual_accounting` veya `parasut_v4` kaynak yolunun tamamı ile `document_ready` kanıtı birlikte sağlanırsa etkinleşir. Ayrıntılı sözleşme: [`r10-payment-invoice-hold-and-mail-separation.md`](../../runbooks/r10-payment-invoice-hold-and-mail-separation.md). Bu karar master sırayı değiştirmez ve sonraki release/pilot fazını açmaz.

**Öncelik düzeltmesi:** Bu planın aktif sırası `F/D → PAY → INV/F → INT → gerekli MAIL/DELIVERY` şeklindedir. E-posta paketleri yalnızca ödeme, fatura veya entegrasyon paketinin açık bir kabul kriteri onları gerektiriyorsa çalıştırılır. Mail güvenlik altyapısı korunur; fakat bu altyapı ödeme/fatura domain’inin yerine geçmez ve MavenForms’ı mailing ürünü yapmaz.

**Değişmez master sıra:** Uygulama boyunca temel ürün sırası `PAY → INV/F manuel → Paraşüt API v4 → document security/document-ready → gerekli transactional DELIVERY/MAIL → pilot → FORM-UX → SAAS/BILL` olarak kalır. Yeni bir düşünce bulutu bu sırayı değiştiremez; yalnızca etkilediği mevcut pakete bağlanır veya açıkça ertelenir. Sıra değişikliği için ayrı ürün sahibi kararı ve yeniden doğrulanmış bağımlılık/release kanıtı gerekir.

**Fikir kabul kuralı:** Bu planın dışından gelen her fatura, ödeme, muhasebe, provider veya mail fikri önce mevcut domain sözleşmesi ve faz bağımlılıklarıyla karşılaştırılır. Plan etkisi varsa ilgili `PAY`, `INV/F`, `INT` veya `MAIL/DELIVERY` mikro-paketleri revize edilmeden uygulama yapılmaz. Plan etkisi olmayan düşük riskli bir düzeltme ise `SAFE-NOW` olarak kaydedilir ve kullanıcıya hemen yapılmasında sakınca olmadığı bildirilir. Doğrulanmamış vergi/provider/hukuk varsayımı paket veya kabul kriteri olamaz.

**Araştırma kararı:** İlk doğrulanabilir ödeme hattı iyzico hosted/Checkout Form’dur. Stripe canlı aktivasyonu desteklenen ülke/merchant hesabı kanıtına, Google Pay ise uygun PSP gateway capability’sine bağlıdır. Callback/browser sonucu finansal otorite değildir; retrieve + imzalı webhook + idempotent event işleme gerekir. Paraşüt v4 ve GİB tarafında resmi dokümanda doğrulanmayan davranışlar `EXTERNAL DEPENDENCY` kalır. XML/UBL belge asıl, PDF sunum kopyası olarak ele alınır; e-posta yalnız `document_ready` sonrası transactional teslimattır.

```text
PaymentOrder + verified provider event
  → InvoiceRecord / accounting result
  → issued + document_ready
  → DeliveryIntent
  → transactional outbox/worker
```

`MAIL-*` kimlikleri geçmiş uygulama kayıtlarını bozmamak için değişmez. Buna rağmen ajanlar bunları bağımsız sıra olarak yorumlayamaz; her paket girişinde tetikleyen `PAY-*`, `INV/F-*` veya `INT-*` fazı, tüketilen sözleşme ve yeniden çalıştırılan önceki kapılar yazılı olmalıdır. Marketing/campaign çalışmaları bu faturalama planının dışında P2’dir.

## SaaS BYO provider mikro-fazları

SaaS evresinde şirketlerin kendi provider ve muhasebe hesaplarını bağlaması, MavenForms’ın şirketler adına ödeme alması olarak yorumlanamaz. Bu paketler Evre 1 first-party ödeme/fatura kanıtından sonra ve tenant izolasyon kapısıyla yürütülür.

- `SAAS-00`: Tenant direct-merchant ve MavenForms abonelik ayrımı karar kaydı.
- `SAAS-01`: Workspace-scoped provider/account/connection veri sözleşmesi.
- `SAAS-02`: Encrypted secret reference, rotation, revoke ve server-only erişim.
- `SAAS-03`: Tenant-scoped webhook URL, signature ve event correlation.
- `SAAS-04`: Tenant-scoped Paraşüt/muhasebe bağlantısı ve API/manual fatura seçimi.
- `SAAS-05`: Cross-tenant, public/embed/WordPress ve support-access negatif testleri.
- `SAAS-06`: Tenant onboarding, test connection, sandbox/live ayrımı ve güvenli hata mesajları.
- `SAAS-07`: Retention, export, audit, incident ve SaaS release kapısı.

`SAAS-00..SAAS-07` tamamlanmadan şirketlere kendi ödeme/muhasebe bağlantılarını production’da açan UI gösterilemez. MavenForms abonelik tahsilatı bu paketlerin dışında, ayrı first-party billing akışıdır.

## İlk SaaS pilotu manuel abonelik kontrol paketleri

İlk SaaS testinde otomatik abonelik provider’ı kurmak yerine platform operator kontrollü, silme yapmayan ve geri döndürülebilir bir erişim politikası uygulanır. Bu paketler tenant müşterilerinden ödeme alma akışına dokunmaz.

- `BILL-00`: Subscription state sözleşmesi: `active`, `due_soon`, `grace`, `suspended`, `ended`.
- `BILL-01`: Platform operator onayı, manuel ödeme/reference notu ve yaklaşan tarih göstergesi.
- `BILL-02`: Subscription state ile capability matrix; tenant admin dışı kullanıcıların billing kontrolüne erişememesi.
- `BILL-03`: Askıya alma transaction’ı; public form erişimini kapat, publish snapshot/veriyi koru, yeni form/publish/silme işlemlerini durdur.
- `BILL-04`: Read-only/export modu; mevcut yanıt ve izin verilen iş verilerinin Excel export’u, secret/provider bağlantılarının kapalı kalması.
- `BILL-05`: Resume snapshot ve reaktivasyon; askıya alma anında yayınlanmış formların `formId + publishedVersionId + previousStatus` kaydını al, yeniden aktivasyonda aynı yayın sürümünü idempotent biçimde otomatik aç ve yeni yanıt akışını kaldığı yerden sürdür.
- `BILL-06`: State transition audit, notification, restore/suspension replay ve tenant-isolation testleri.

`BILL-00..BILL-06` geçmeden otomatik SaaS subscription billing veya self-service plan değişikliği açılmaz. Bu paketler ana `F/D → PAY → INV/F → INT → gerekli MAIL/DELIVERY` sırasını değiştirmez; yalnızca gelecekteki tenant abonelik tasarımının mevcut domain’lerle uyumlu kalmasını sağlar. Silme işlemi bu akışın parçası değildir. Resume işlemi taslak/arşiv formu açamaz ve operator tarafından açıkça dışlanan formu geri getiremez.

## SaaS öncesi ürün tamamlama kapısı

First-party ödeme, fatura, gerekli transactional teslimat ve pilot kanıtından sonra; SaaS tenant/BILL uygulamasından önce `FORM-UX-00..FORM-UX-09` yürütülür. Bu paketler ana ödeme/fatura sırasını değiştirmez. Amaç, mevcut form ürününü release seviyesine getirmektir: gerçek builder drag/drop, kontrollü Grid/Bento/template renderer sözleşmesi, 16:9 kart medyası, form-scope medya upload/seçim, form detayında yayınlanmış form + istatistik + yanıtlar, ortak buton/tipografi token’ları, responsive direct/iframe/inline/WordPress çıktıları ve UI-only kalmış kontrollerin uçtan uca bağlanması. İç içe container ağacı ve serbest masonry bu kapsamdan çıkarılmıştır; alanlar düz modelde kalır.

- `FORM-UX-00`: UI-only ve çalışmayan kontrol envanteri; form, publish, public, media, response ve settings route matrisi.
- `FORM-UX-01`: ortak typography/spacing/button interaction token’ları ve görsel regression baseline’ı.
- `FORM-UX-02`: form kartı, detay, istatistik ve yanıt bilgi mimarisi; çift ayar/overlay/z-index taşmalarının giderilmesi.
- `FORM-UX-03`: workspace/form-scoped media picker + upload, file policy, alt text, preview ve authorization.
- `FORM-UX-04`: builder drag/drop, reorder, keyboard fallback ve persistence.
- `FORM-UX-05`: bounded Grid/Bento preset ve template layout contract’ının preview/public/embed renderer’larında eşit uygulanması; nested container ağacı kapsam dışıdır.
- `FORM-UX-06`: published form preview → statistics → response search/filter akışının tek detay deneyimi.
- `FORM-UX-07`: responsive desktop/tablet/mobile ve gerçek host-container embed testleri.
- `FORM-UX-08`: form settings, payment settings, invoice/delivery settings, integration ve WordPress ekranlarında gerçek işlev testleri.
- `FORM-UX-09`: accessibility, visual regression, build/typecheck/lint ve tüm önceki faz regression kapısı.

`FORM-UX` tamamlanmadan `SAAS-00..SAAS-07` ve `BILL-01..BILL-06` production tenant onboarding’e açılamaz. Pilot için zorunlu bir kontrol varsa kendi domain fazında uygulanır; bu kapı yalnızca sonradan yapılacak toplu ürün olgunlaştırmasını tanımlar.

## Global Constraints

- Her paket en fazla 15 dakikalık tek bir çıktıdır; kapsam büyürse paket bölünür, süre aşımı gizlenmez.
- Önceki bütün kapılar tekrar kontrol edilmeden sonraki paket başlatılamaz.
- Her paket: kanıt oku → tek değişiklik yap → hedefli test → regresyon kontrolü → rapor sırasını izler.
- `Submission.paymentStatus`, tarayıcı başarı sayfası ve UI etiketi faturalama için authoritative kaynak değildir.
- Fatura adayı yalnızca doğrulanmış `PaymentOrder` ve provider event/reconciliation sonucu ile oluşur.
- Kart numarası, CVV ve son kullanma tarihi MavenForms’a girmez ve saklanmaz.
- Public form, embed ve WordPress istemcisi fatura kayıtlarına, Paraşüt tokenına veya müşteri listesine erişemez.
- TCKN/VKN/adres/e-posta log, hata mesajı ve public response içinde redakte edilir.
- Bilinmeyen vergi kuralı, döviz kuru, belge türü veya kimlik bilgisi uydurulmaz; kayıt incelemeye alınır.
- Her import/upload/issue/send/resend/retry işlemi idempotent ve audit edilebilir olur.
- API endpoint’i, provider payload’ı ve secret işlemleri yalnızca server-side yürütülür.
- `issued`, `document_ready` ve `sent` aynı başarı durumu değildir.
- Fatura, notification ve marketing e-postaları ayrı message class, consent, suppression ve queue kuralları kullanır.

---

## Çalışma yöntemi ve geçiş kapıları

### Paket formatı

Her paket aşağıdaki forma göre yürütülür:

```text
Paket ID:
Giriş kapısı:
Tek çıktı:
Dosyalar:
Tükettiği sözleşme:
Ürettiği sözleşme:
Test:
Çıkış kapısı:
```

Bir paket başka bir paketin “yaklaşık” çıktısına dayanamaz. Dosya, export, migration, endpoint veya type adı burada farklıysa uygulayan ajan önce bu plandaki adı gerçek repo ile karşılaştırır ve o paketi durdurur.

### Her bağlantı kapısında zorunlu replay

`REPLAY-A` tamamlanmadan veri modeli, manuel akış, Paraşüt veya UI paketine geçilemez:

- Server `/api/health` ve `/api/ready` başarılı.
- Baseline test, typecheck, lint ve build sonucu kayıtlı.
- Önceki paketlerin testleri tekrar çalıştırılmış.
- `git diff` içinde başka ajanın/user değişiklikleri korunmuş.
- Public endpoint’lerin response’larında fatura/secret sızıntısı yok.
- Başarısız sonuç varsa sonraki paket `NO-GO` kalır.

### Yeni düşünce bulutlarının ana plana alınması

Kullanıcı tarafından sonradan eklenen her fikir önce ana yürütme planındaki `INT-00..INT-04` analizinden geçer. Ara iş kabul edilirse mevcut `F/D/M/C/X/I/U/E/P/R` veya `MAIL` zincirine en küçük 15 dakikalık paket olarak eklenir; ayrı bir domain modeli, ayrı bir release yolu veya önceki kapıları bypass eden özel akış oluşturulmaz. Sadeleştirilen, ertelenen veya reddedilen fikirler de karar ve gerekçesiyle izlenebilir kalır.

### 15 dakika kuralı

Paket içinde migration, çok sayıda dosya veya yeni kütüphane gereksinimi ortaya çıkarsa paket bölünür. Bir pakette aynı anda schema + API + UI yapılmaz. Kod yazmadan önce test dosyası ve hedeflenen tek davranış belirlenir. Test çalışmıyorsa ajan “tamamlandı” yazamaz.

## Dosya ve sorumluluk haritası

Paketler mevcut repo desenlerini esas alır; gerçek dosya satırı uygulama sırasında tekrar bulunur.

- `prisma/schema.prisma`: faturalama domain modelleri ve ilişkiler.
- `prisma/migrations/*`: yalnızca ayrı, geri alınabilir migration.
- `src/lib/payment-state.ts`, `src/lib/payment-money.ts`: authoritative payment ve miktar/para birimi kuralları.
- `src/lib/payment-webhook-processing.ts`, `src/lib/payment-webhook-signatures.ts`: provider event doğrulama ve inbox desenleri.
- `src/lib/xlsx-export.ts`: mevcut XLSX üretim desenleri; fatura değişim formatı burada karıştırılmadan yeni modüle ayrılır.
- `src/lib/outbox.ts`, `src/lib/outbox-worker.ts`: e-posta ve arka plan teslimatı.
- `src/lib/storage.ts`: mevcut tenant-scoped medya/depolama desenleri; fatura belgeleri ayrı kategori ile korunur.
- `src/lib/auth.ts`, `src/app/api/audit/route.ts`: oturum, workspace/rol ve audit.
- `src/app/api/payment-provider-connections/route.ts`: provider bağlantı desenleri.
- `src/app/api/forms/[id]/submissions/[subId]/route.ts`: legacy paymentStatus kaynağı; faturalama query’lerinden ayrılacak.
- `src/app/api/public/forms/[slug]/submissions/route.ts`: public sınır; fatura yönetimi burada açılmayacak.
- `src/components/mavenforms/views/*`: fatura merkezi, form yanıtları ve ayarlar UI’si.
- `tests/*`: her paketin hedefli regresyon testi.

---

## Paketler

### F-00 — Çalışma alanı ve plan doğrulaması

**Süre:** 10–15 dakika

**Dosyalar:** Okuma: `AGENTS.md`, ana ödeme planı, e-belge spec’i, `package.json`, `prisma/schema.prisma`, `.env.example`.

**Tek çıktı:** Uygulama günlüğüne mevcut repo gerçekliği, aktif server ve riskli değişiklikler yazılır.

**Adımlar:**

1. Talimat ve iki plan dosyasını oku.
2. `git status --short`, mevcut test komutları ve server URL’sini kontrol et.
3. Hassas dosyaların içeriğini yazdırmadan yalnızca mevcut olup olmadığını kaydet.

**Çıkış kapısı:** Proje yolu, server adresi, test komutları ve korunacak değişiklikler kayıtlı.

### F-01 — Baseline sağlık kanıtı

**Dosyalar:** `tests/*` yalnızca okuma; `artifacts/einv-baseline.md` oluşturulabilir.

**Tek çıktı:** Kod değişmeden baseline raporu.

**Adımlar:**

1. `/api/health` ve `/api/ready` çağrılarını yap.
2. Mevcut test, typecheck, lint ve build komutlarını çalıştır.
3. Mevcut başarısızlıkları yeni faturalama hatası gibi yorumlama.

**Çıkış kapısı:** Baseline sonuçları saklı; yeni paket baseline ile karşılaştırılabilir.

### F-02 — Mevcut ödeme kaynak haritası

**Dosyalar:** Okuma: `src/lib/payment-state.ts`, `src/lib/payment-webhook-processing.ts`, `src/app/api/payment-provider-connections/route.ts`, `prisma/schema.prisma`.

**Tek çıktı:** Fatura adayına girebilecek authoritative alanların listesi.

**Adımlar:**

1. `PaymentOrder` durumlarını ve unique alanlarını çıkar.
2. Provider event’in hangi noktada doğrulandığını bul.
3. `Submission.paymentStatus` ve dashboard tahminlerini “yasak kaynak” olarak kaydet.

**Çıkış kapısı:** Fatura adayı için gerekli `PaymentOrder` + provider kanıtı tanımlı.

### F-03 — Public ve rol sınırı haritası

**Dosyalar:** Okuma: `src/lib/auth.ts`, `src/app/api/public/forms/[slug]/submissions/route.ts`, `src/app/api/audit/route.ts`.

**Tek çıktı:** Owner/admin/accounting/operator/viewer/public yetki matrisi.

**Çıkış kapısı:** Public için yalnızca form submit; fatura, export, import, upload, Paraşüt ve e-posta yönetimi kapalı.

### F-04 — İlk geçiş kapısı

**Tek çıktı:** `F-00..F-03` kanıtlarıyla `EINV-GATE-00`.

**Çıkış kapısı:** Önceki paketlerden biri eksikse sonraki paketler çalıştırılmaz; soru sormak yerine eksik kanıt tamamlanır veya blokaj raporlanır.

---

### D-00 — İş ve mevzuat karar kaydı

**Dosyalar:** `docs/superpowers/plans/2026-09-02-mavenforms-e-belge-parasut-v4-ve-api-siz-faturalama-yol-haritasi.md` ve karar günlüğü.

**Tek çıktı:** Desteklenen, inceleme isteyen ve desteklenmeyen fatura senaryoları.

**Çıkış kapısı:** TCKN/VKN, e-Fatura/e-Arşiv, KDV, döviz ve fatura tarihi konusunda varsayım kalmıyor; bilinmeyenler kodlanabilir blok durumuna bağlanıyor.

### D-01 — Paraşüt v4 sözleşme sabitleme

**Dosyalar:** `src/lib/providers/parasut-v4-contract.ts` oluşturma planı ve hedef test.

**Tek çıktı:** Resmi Swagger’a dayalı endpoint/response notu.

**Kapsam:** `contacts`, `products`, `sales_invoices`, `e_invoice_inboxes`, `e_invoices`, `e_archives`, `trackable_jobs/{id}`, e-Fatura/e-Arşiv PDF yolları; OAuth2, JSON:API ve rate limit davranışı.

**Çıkış kapısı:** Uydurma `addinvoice` endpoint’i yok; provider payload’ı uygulama domain tiplerinden ayrı.

### D-02 — Durum makinesi sözleşmesi

**Dosyalar:** `src/lib/invoice-state.ts`, `tests/invoice-state.test.mjs`.

**Tek çıktı:** İzin verilen invoice state geçişleri.

**Kabul:** `paid_ready_for_invoicing → accounting_review_required/queued → provider_draft_created → formalization_pending → issued → document_ready → delivery_queued → sent`; hata, iade ve inceleme geçişleri reddedilmeden sessizce ilerleyemez.

### D-03 — İdempotency sözleşmesi

**Dosyalar:** `src/lib/invoice-idempotency.ts`, `tests/invoice-idempotency.test.mjs`.

**Tek çıktı:** Payment order + workspace + fatura amacı ile deterministik anahtar.

**Çıkış kapısı:** Aynı ödeme için ikinci draft, import, belge veya e-posta oluşmuyor.

### D-04 — Karar kapısı

**Çıkış kapısı:** `D-00..D-03` testleri geçmeden Prisma modeli eklenmez.

---

### M-00 — Recipient snapshot modeli

**Dosyalar:** `prisma/schema.prisma`, ayrı migration, `tests/invoice-recipient-schema.test.mjs`.

**Tek çıktı:** Fatura anındaki legal name, tax/identity, adres, e-posta ve kaynak snapshot’ı.

**Kurallar:** Bilinmeyen TCKN boş/inceleme; sabit sahte değer yok. Hassas alanlar public DTO’ya girmez.

**Çıkış kapısı:** Unique ve workspace scope kararı testte kanıtlı.

### M-01 — InvoiceRecord modeli

**Dosyalar:** `prisma/schema.prisma`, migration, `tests/invoice-record-schema.test.mjs`.

**Tek çıktı:** PaymentOrder, provider, document type, amount/tax/currency snapshot, provider IDs, invoice number/UUID ve state.

**Çıkış kapısı:** PaymentOrder olmadan invoice record oluşturulamıyor; provider ID nullable ama unique scope kurallı.

### M-02 — InvoiceLineSnapshot modeli

**Dosyalar:** `prisma/schema.prisma`, migration, `tests/invoice-line-schema.test.mjs`.

**Tek çıktı:** Ürün/hizmet, quantity, unit price, tax ve discount snapshot’ı.

**Çıkış kapısı:** Fatura sonradan form fiyatı değişse bile eski snapshot’tan yeniden üretilebilir.

### M-03 — Batch/import modeli

**Dosyalar:** `prisma/schema.prisma`, migration, `tests/invoice-batch-schema.test.mjs`.

**Tek çıktı:** Seçim filtresi, payment order ID snapshot’ı, format version, import row sonucu.

**Çıkış kapısı:** “Tümü” seçimi sayfa ile sınırlı değil; hangi kayıtların seçildiği tekrar üretilebilir.

### M-04 — Document/delivery modeli

**Dosyalar:** `prisma/schema.prisma`, migration, `tests/invoice-document-schema.test.mjs`.

**Tek çıktı:** Karantina/scan/hash/storage ve delivery/outbox ilişkileri.

**Çıkış kapısı:** `document_ready` olmadan delivery queued mümkün değil.

### M-05 — Migration replay

**Dosyalar:** `prisma/migrations/*`, mevcut seed/test yardımcıları.

**Tek çıktı:** Temiz database ve mevcut örnek database üzerinde migration kanıtı.

**Çıkış kapısı:** `M-00..M-04` replay geçer; mevcut ödeme ve medya verisi bozulmaz.

---

### C-00 — Fatura alanı form sözleşmesi

**Dosyalar:** Mevcut form builder types/schema dosyaları, `tests/invoice-fields-contract.test.mjs`.

**Tek çıktı:** Fatura isteğe bağlı bölümünün versioned config’i.

**Çıkış kapısı:** Fatura istemeyen form eski davranışını korur; fatura config’i public DTO’ya yalnızca güvenli allowlist ile girer.

### C-01 — Bireysel/şirket/yurt dışı validation

**Dosyalar:** `src/lib/invoice-recipient-validation.ts`, `tests/invoice-recipient-validation.test.mjs`.

**Tek çıktı:** Koşullu alan doğrulaması ve redakte edilmiş hata kodları.

**Çıkış kapısı:** Geçersiz kimlik/vergi numarası reddedilir; vergi kuralı bilinmiyorsa review olur.

### C-02 — Payment snapshot’a bağlama

**Dosyalar:** `src/lib/payment-submission-binding.ts`, public payment-intent/submission route’ları, Payment webhook worker handler’ı, `tests/payment-submission-binding.test.mjs`, `tests/public-payment-intent-submission-binding.test.mjs`, `tests/public-submission-payment-receipt.test.mjs`, `tests/payment-invoice-snapshot.test.mjs`.

**Tek çıktı:** Ödeme sırasında recipient ve line snapshot’ın aynı transaction/iş akışında kaydı.

**Çıkış kapısı:** Profil veya form sonradan değişince fatura verisi değişmiyor.

**Güncel ilerleme:** Transaction coordinator ve sözleşme testi hazırlandı. Public submission route artık yalnız opaque `submissionToken` receipt döndürüyor; payment-intent route, aynı form kapsamındaki token ile PaymentOrder’ı overwrite etmeden Submission’a bağlıyor ve cross-workspace/form bağını reddediyor. Gerçek payment webhook/order handler’ın doğrulanmış `succeeded` event sonrasında server-side encrypted recipient/line snapshot coordinator’ını aynı transaction’a çağırması bu fazın açık işidir. Public callback veya client tutarı coordinator’ı doğrudan çağıramaz; bu wiring tamamlanmadan C-02 tamamlanmış ve C-03 başlatılmış sayılamaz.

**Bağımlılık kapısı:** Mevcut `SubmissionValue.valueJson` kayıtları plaintext’tir ve `InvoiceFormConfig` içinde alıcı adı, vergi/kimlik, adres ve e-posta alanlarının kanonik `fieldKey` eşlemesi henüz yoktur. C-02’nin webhook wiring’i; server-side encrypted capture/mapping sözleşmesi, redakte test fixture’ı ve yalnız eşleşmiş alanlardan line/recipient snapshot üretimi tamamlanmadan uygulanamaz. Label/type tahminiyle alan seçmek, browser’dan gelen fatura tutarı veya PII’yi güvenilir kaynak saymak yasaktır.

**C-02 çıkış güncellemesi:** Bağımlılık kapısı karşılandı. `InvoiceFormConfig` açık mapping’i, AES-256-GCM capture’ı, server-owned line snapshot’ı ve doğrulanmış `succeeded` webhook handoff’u tamamlandı; mapping/key yoksa `accounting_review_required` açılıyor. C-02 yerel kapıları geçti ve aktif sonraki faz `C-03 — PII response ve authorization` oldu.

### C-03 — PII response ve authorization

**Dosyalar:** `src/lib/invoice-pii-dto.ts`, `src/app/api/invoices/[id]/route.ts`, `src/lib/policy.ts`, `src/lib/types.ts`, `src/components/mavenforms/views/users-view.tsx`, `tests/invoice-pii-boundary.test.mjs`.

**Tek çıktı:** Owner/admin/accounting için kontrollü görünüm; viewer/public için maskeli veya kapalı görünüm.

**Çıkış kapısı:** API ile doğrudan başka workspace ID’si kullanıldığında erişim yok.

**C-03 çıkış güncellemesi (2026-09-04):** PASS. `invoices.read` yalnız `owner`, `admin` ve `accounting` rolünde; bilinmeyen, viewer ve public erişim kapalı. Invoice route `findFirst` sorgusunu `id + ctx.workspace.id` ile yapıyor; başka workspace ID’si 404/erişimsiz sonuç veriyor. Response DTO’su encrypted PII, storage key ve workspace ID’yi çıkarıyor; şifre çözme yalnız authenticated ve yetkili server akışında gerçekleşiyor. Doğrulama: tam runner `180 files` PASS, TypeScript PASS, lint PASS, build PASS, `/api/ready` `200 {"status":"ready","db":"ok"}`. Aktif faz `C-04`; manuel export/Paraşüt yolu hâlâ kapalı.

### C-04 — Müşteri veri kapısı

**Çıkış kapısı:** `C-00..C-03` geçmeden manuel export veya Paraşüt fatura oluşturma açılmaz.

**C-04 çıkış güncellemesi (2026-09-04):** PASS yalnızca sıralı koruma kapısı olarak kaydedildi. C-04 sonrasında X-00..X-05 manuel export’un aday, seçim, metadata, mapper ve server endpoint adımlarını açtı; Paraşüt issue endpoint’i provider fazına kadar kapalıdır. `tests/invoice-customer-data-gate.test.mjs` C-04 geçmiş kapısını ve Paraşüt yolunun kapalı kalmasını doğrular.

---

### X-00 — Fatura adayı sorgusu

**Dosyalar:** `src/lib/invoice-candidates.ts`, `tests/invoice-candidates.test.mjs`.

**Tek çıktı:** Yalnızca doğrulanmış paid PaymentOrder’ları döndüren sorgu.

**Çıkış kapısı:** Pending, failed, refunded, disputed ve legacy paymentStatus kayıtları dışarıda.

**X-00 çıkış güncellemesi (2026-09-04):** PASS. `src/lib/invoice-candidates.ts` tenant-scoped ve server-confirmed `succeeded` PaymentOrder adaylarını seçiyor; pozitif minor amount, ISO para birimi, submission ve published version bağı zorunlu. Mevcut invoice, eksik bağ, ara/terminal durum ve legacy paymentStatus uyumsuzluğu dışarıda. `tests/invoice-candidates.test.mjs` PASS. Aktif sonraki mikro-faz `X-01 — Tekil ve selected seçim`dir.

### X-01 — Tekil ve selected seçim

**Dosyalar:** `src/lib/invoice-batch-selection.ts`, `tests/invoice-batch-selection.test.mjs`.

**Tek çıktı:** Tek kişi veya checkbox seçimi için ID snapshot’ı.

**Çıkış kapısı:** Yetkisiz/başka form/başka workspace ID’si seçilemiyor.

**X-01 çıkış güncellemesi (2026-09-04):** PASS. `src/lib/invoice-batch-selection.ts` X-00 adaylarından yalnız ID tabanlı, deterministik `rowNumber + paymentOrderIdSnapshot` üretiyor. Boş/duplicate/bilinmeyen ID ve başka workspace/form adayları reddediliyor; raw spreadsheet ve PII bu sınıra giremiyor. `tests/invoice-batch-selection.test.mjs` PASS. Aktif sonraki mikro-faz `X-02 — Filtrelenmiş toplu seçim`dir.

### X-02 — Filtrelenmiş toplu seçim

**Dosyalar:** Aynı seçim modülü, `tests/invoice-batch-filter-selection.test.mjs`.

**Tek çıktı:** Tarih/form/currency/status filtrelerinin immutable batch snapshot’ı.

**Çıkış kapısı:** “Tümünü seç” toplam sonuç sayısını ve tutar özetini doğru verir.

**X-02 çıkış güncellemesi (2026-09-04):** PASS. `invoice-batch-selection.ts` tarih, form, currency ve status filtrelerini canonical, immutable snapshot’a dönüştürüyor. Tenant-scoped adaylar deterministic row listesine alınırken `totalCount` ve `totalAmountMinor` güvenli şekilde hesaplanıyor; duplicate/bozuk filtre ve geçersiz tarih fail-closed. `tests/invoice-batch-filter-selection.test.mjs` PASS. Aktif sonraki mikro-faz `X-03 — Excel metadata üretimi`dir.

### X-03 — Excel metadata üretimi

**Dosyalar:** `src/lib/invoice-xlsx-export.ts`, `tests/invoice-xlsx-metadata.test.mjs`.

**Tek çıktı:** Format version, batch ID, row ID ve opaque payment references.

**Çıkış kapısı:** XLSX makro, dış bağlantı, formula ve gizli çalışma sayfası üretmiyor.

**X-03 çıkış güncellemesi (2026-09-04):** PASS. `src/lib/invoice-xlsx-export.ts` `invoice-batch-v1` metadata’sı, batch ID, deterministic row ID ve workspace bağlı opaque payment reference üretir. `createInvoiceMetadataXlsx` tek görünür metadata sheet’i kullanır; macro, external link, formula ve hidden sheet yoktur. `tests/invoice-xlsx-metadata.test.mjs` PASS. Aktif sonraki mikro-faz `X-04 — Excel satır mapper`dır.

### X-04 — Excel satır mapper

**Dosyalar:** `src/lib/invoice-xlsx-export.ts`, `tests/invoice-xlsx-columns.test.mjs`.

**Tek çıktı:** Spec’teki invoice interchange sütunlarının deterministic mapper’ı.

**Çıkış kapısı:** Amount minor, currency, tax, recipient ve provider alanları yanlış kaynaktan alınmıyor.

**X-04 çıkış güncellemesi (2026-09-04):** PASS. `mapInvoiceInterchangeRow` sabit `INVOICE_XLSX_COLUMNS` sırasıyla yalnız verified invoice snapshot ve açık recipient object’inden mapping yapıyor; client amount/form price input’a dahil değil. Null veriler kontrollü boş hücreye, formula operatörleri güvenli metne dönüştürülüyor. `tests/invoice-xlsx-columns.test.mjs` PASS. Aktif sonraki mikro-faz `X-05 — Export endpoint`dir.

### X-05 — Export endpoint

**Dosyalar:** Yeni invoice export route’u, route testi.

**Tek çıktı:** Owner/admin/accounting rolü için tekil/seçili/toplu download.

**Çıkış kapısı:** Export audit’i, hassas veri uyarısı ve batch hash’i var; public erişim yok.

**X-05 çıkış güncellemesi (2026-09-04):** PASS. `src/app/api/invoices/export/route.ts` authenticated `owner/admin/accounting` POST kapısıdır; body strict ve duplicate-safe doğrulanır, sorgu workspace + `succeeded` PaymentOrder + InvoiceRecord ile sınırlandırılır. Export server-side sabit XLSX sütunlarıyla üretilir; C-03 DTO sınırından çözülmüş recipient PII dışında encrypted alan dışarı çıkmaz. `InvoiceBatch` ve `invoice.export` audit kaydı aynı transaction’da tutulur; response `private, no-store`, attachment ve hassas müşteri verisi uyarısı taşır. `tests/invoice-export-route.test.mjs` ile route sözleşmesi doğrulandı; C-04 gate testi X-05’in açıldığını, Paraşüt issue yolunun kapalı kaldığını doğrular. Aktif sonraki mikro-faz `X-06 — Manuel export kapısı`dır.

### X-06 — Manuel export kapısı

**Çıkış kapısı:** `X-00..X-05` replay geçer; Excel’i aynı batch ile yeniden üretince içerik ve row reference stabil.

**X-06 çıkış güncellemesi (2026-09-04):** PASS. `createInvoiceInterchangeXlsx` sabit sütunlu workbook’u doğrulanmış satırlardan deterministic üretiyor; aynı batch snapshot’ı aynı metadata, opaque row/payment reference ve XLSX byte çıktısını veriyor. Uyuşmayan satır schema’sı fail-closed. `tests/invoice-export-replay.test.mjs` PASS; tam runner `188 files`, TypeScript, lint ve production build PASS. Aktif sonraki mikro-faz `I-00 — Import dosyası karantinası`dır.

---

### I-00 — Import dosyası karantinası

**Dosyalar:** Yeni invoice import route’u, storage helper, `tests/invoice-import-quarantine.test.mjs`.

**Tek çıktı:** XLSX upload’un karantinaya alınması ve hash’lenmesi.

**Çıkış kapısı:** Boyut, MIME ve magic byte kontrolü olmadan parse başlamıyor.

**I-00 çıkış güncellemesi (2026-09-04):** PASS. `InvoiceImportBatch` migration’ı tenant/uploader/hash/private storage/quarantine state alanlarını ekledi. `invoice-import-quarantine.ts` XLSX byte/MIME/size doğruluyor; `src/app/api/invoices/import/route.ts` yalnız owner/admin/accounting import capability’siyle dosyayı private quarantine storage’a yazıyor, batch ve audit’i transaction’da oluşturuyor; parser çalıştırmıyor. Duplicate hash, invalid input ve path traversal reddediliyor. Prisma validate, migration deploy, client generate, tam runner `189 files`, TypeScript, lint, build ve readiness PASS. Client üretimi sırasında Windows kilidi nedeniyle lokal server kontrollü durdurulup yeniden başlatıldı; production/cloud ve veri reseti yapılmadı. Aktif sonraki mikro-faz `I-01 — Import schema parser`dır.

### I-01 — Import schema parser

**Dosyalar:** `src/lib/invoice-xlsx-import.ts`, `tests/invoice-xlsx-import-schema.test.mjs`.

**Tek çıktı:** Format version, metadata ve required column validation.

**Çıkış kapısı:** Yanlış sürüm veri değiştirmiyor; hata satır/kolon koduyla dönüyor.

**I-01 çıkış güncellemesi (2026-09-04):** PASS. `invoice-xlsx-import.ts` canonical `invoice-batch-v1` worksheet sözleşmesini doğruluyor; duplicate/unknown/eksik kolon, satır genişliği, metadata ve sürüm hatalarını satır/kolon koduyla fail-closed döndürüyor. Bu faz karantina bytes parse etmiyor ve invoice/payment state değiştirmiyor. `tests/invoice-xlsx-import-schema.test.mjs` PASS; tam runner `190 files`, TypeScript, lint ve production build PASS. Aktif sonraki mikro-faz `I-02 — Import row validator`dır.

### I-02 — Import row validator

**Dosyalar:** `src/lib/invoice-xlsx-import.ts`, `tests/invoice-xlsx-import-validation.test.mjs`.

**Tek çıktı:** Tutar, currency, date, invoice number/UUID ve recipient validation.

**Çıkış kapısı:** Geçersiz veya eksik satır `invalid`; boş değer sessiz kabul değil.

**I-02 çıkış güncellemesi (2026-09-04):** PASS. Import row validator minor-unit tutar, tax, ISO currency, gerçek `YYYY-MM-DD` invoice date, invoice number/UUID ve recipient validation uyguluyor. Biçimsel yanlışlar `invalid`, hukuki/mali belirsizlikler `review_required`, yalnız tam uygun satır `valid`; hatalar PII echo etmiyor. `invoice_date` v1 export kolonlarını kırmadan I-01’de opsiyonel kabul edilip I-02’de zorunlu doğrulanıyor. `tests/invoice-xlsx-import-validation.test.mjs` PASS; tam runner `191 files`, TypeScript, lint ve production build PASS. Aktif sonraki mikro-faz `I-03 — Stable reference matcher`dır.

### I-03 — Stable reference matcher

**Dosyalar:** `src/lib/invoice-matching.ts`, `tests/invoice-matching.test.mjs`.

**Tek çıktı:** Row ID/payment reference/provider UUID öncelikli eşleştirme.

**Çıkış kapısı:** Ad, e-posta, tarih veya tutar tek başına eşleştirme yapamıyor.

**I-03 çıkış güncellemesi (2026-09-04):** PASS. `invoice-matching.ts` stable reference’ları `row_id → payment_reference → provider_invoice_id → invoice_uuid → muhasebe onaylı invoice_number` sırasıyla değerlendiriyor. Cross-workspace/form eşleşmesi `scope_mismatch`, aynı referans için birden çok aday `ambiguous_reference`, farklı referansların farklı adayı göstermesi `multiple_references_conflict` ile fail-closed duruyor. Ad/e-posta/tarih/tutar fallback’i yok ve sonuç PII echo etmiyor. `tests/invoice-matching.test.mjs` PASS; tam runner `192 files`, TypeScript, lint ve production build PASS. Aktif sonraki mikro-faz `I-04 — Dry-run preview`dır; gerçek parse, AV release, approve/apply ve Paraşüt issue yolu açılmadı.

**I-04 çıkış güncellemesi (2026-09-04):** PASS. `invoice-import-preview.ts` normalized/validated satırları ve I-03 matcher sonucunu yalnızca deterministik `new/update/duplicate/unmatched/invalid/conflict` DTO’suna çeviriyor. Mevcut source fingerprint ile duplicate/update ayrımı yapılıyor; invalid, unmatched veya conflict olduğunda `canApply=false`; row number sıralaması deterministik. Dry-run invoice/payment/quarantine state’i, audit veya e-posta değiştirmiyor. `tests/invoice-import-preview.test.mjs` PASS; tam runner `193 files`, TypeScript, lint ve production build PASS. Aktif sonraki mikro-faz `I-05 — Approve/apply transaction`dır; gerçek parse, AV release, approve/apply ve Paraşüt issue yolu açılmadı.

### I-04 — Dry-run preview

**Dosyalar:** Import route ve DTO, `tests/invoice-import-preview.test.mjs`.

**Tek çıktı:** `new/update/duplicate/unmatched/invalid/conflict` ön izlemesi.

**Çıkış kapısı:** Dry-run hiçbir fatura state’ini değiştirmiyor.

### I-05 — Approve/apply transaction

**Dosyalar:** Import apply route/service, `tests/invoice-import-apply.test.mjs`.

**Tek çıktı:** Yetkili onay sonrası satır bazlı idempotent uygulama.

**Çıkış kapısı:** Aynı dosya ikinci kez yeni fatura veya e-posta üretmiyor; kısmi başarı açıkça raporlanıyor.

**I-05 çıkış güncellemesi (2026-09-04):** PASS. InvoiceImportApplication migrationı batch/row başına durable idempotency journal ekledi. invoice-import-apply.ts yalnız approved ve canApply=true previewı kabul ediyor; her eligible rowda önce replay fence kontrolü, sonra caller-owned invoice mutation callbacki ve journal kaydı aynı transactionda yürütülüyor. Replay callbacki yeniden çağırmıyor; duplicate no-op, callback hatası failed, karışık sonuç partial; invalid/unmatched/conflict applya kapalı. E-posta veya delivery side effecti üretilmiyor. Migration deploy, Prisma validate/generate, hedef I-05 testi, tam runner 194 files, TypeScript, lint ve production build PASS. Lokal Prisma dosya kilidi için planlı bakım yetkisi kullanıldı ve server /api/ready ile tekrar doğrulandı. Aktif sonraki mikro-faz I-06 — Import kapısıdır; gerçek parse, AV release ve Paraşüt issue yolu açılmadı.

### I-06 — Import kapısı

**Çıkış kapısı:** `I-00..I-05` geçmeden fatura merkezinde “Uygula” aktif edilmiyor.

---

**I-06 çıkış güncellemesi (2026-09-04):** PASS. invoice-import-gate.ts I-00..I-05 fazlarının tamamının pass olmasını ve dry-run canApply=true olmasını zorunlu kılıyor; eksik, unverified, blocked veya bilinmeyen/fazladan faz durumunda Uygula aktif olmuyor. Bu presentation gate apply servisinin server-side approval/idempotency kontrollerinin yerine geçmiyor. invoice-import-gate.test.mjs PASS; tam runner 195 files, TypeScript, lint ve production build PASS. Aktif sonraki mikro-faz U-00 — PDF/XML dosya türü kontrolüdür; gerçek document parse, AV release, Paraşüt issue ve dış provider yolları kapalı.

**U-00 çıkış güncellemesi (2026-09-04):** PASS. invoice-document-validation.ts PDF/XML file-type boundary kuruyor: extension/MIME agreement, size/byte length, PDF %PDF- magic, UTF-8 XML başlangıcı ve SHA-256; DOCTYPE, ENTITY ve xml-stylesheet dış kaynak yüzeyi parse edilmeden reddediliyor. Parse, storage, document state, audit veya delivery side effecti yok. Hedef U-00 testi PASS; tam runner 196 files, TypeScript, lint ve production build PASS. Aktif sonraki mikro-faz U-01 — XLSX/ZIP güvenlik kontrolüdür; AV release ve document upload route’u açılmadı.

**U-01 çıkış güncellemesi (2026-09-04):** PASS. `validateInvoiceArchiveUpload` geçerli XLSX ZIP paketini bounded metadata/entry incelemesiyle kabul ediyor; ZIP64/multi-disk, merkezi dizin ve local header uyuşmazlığı, entry/toplam açılmış boyut ve compression ratio, duplicate/path traversal, encryption ve unsupported compression fail-closed. Macro/VBA/executable, nested archive ve XML dış relationship/harici referansları reddediliyor. Hedef U-01 testi PASS; tam runner 197 files, TypeScript, lint ve production build PASS. Worksheet parse, AV release, document upload route, document-ready ve delivery açılmadı. Aktif sonraki mikro-faz U-02 — Invoice document upload route.

**U-02 çıkış güncellemesi (2026-09-04):** PASS. Authenticated invoice document route workspace/payment/form scope’unu doğruluyor; PDF/XML ve XLSX doğrulama kapılarından geçmeyen dosyalar yazılmıyor. Private invoice-scoped quarantine key ve transaction audit oluşturuluyor; response storage key/public URL/ham içerik taşımıyor. AV release, parse, document-ready, public download ve delivery açılmadı. Hedef U-02 testi ve plan bütünlüğü testi PASS; tam runner 198 files, TypeScript, lint ve production build PASS. Aktif sonraki mikro-faz U-03 — Hash ve duplicate kontrolü.

### U-00 — PDF/XML dosya türü kontrolü

**Dosyalar:** `src/lib/invoice-document-validation.ts`, `tests/invoice-document-filetype.test.mjs`.

**Tek çıktı:** PDF/XML magic byte, MIME, boyut ve parse sınırı.

**Çıkış kapısı:** Uzantı değiştirerek dosya kabul edilemiyor; XML dış entity/harici URL işlenmiyor.

### U-01 — XLSX/ZIP güvenlik kontrolü

**Dosyalar:** Aynı doğrulama modülü, `tests/invoice-document-archive.test.mjs`.

**Tek çıktı:** Makro, dış bağlantı, path traversal, nested archive ve archive bomb reddi.

**Çıkış kapısı:** Çalıştırılabilir içerik karantinadan çıkamıyor.

### U-02 — Invoice document upload route

**Dosyalar:** Yeni document upload route’u, `tests/invoice-document-upload-route.test.mjs`.

**Tek çıktı:** Workspace/form/invoice scoped upload.

**Çıkış kapısı:** Başka form/tenant belgesi listelenemiyor veya yüklenemiyor; public URL yok.

**U-03 çıkış güncellemesi (2026-09-04):** PASS. Aynı `invoiceRecordId + artifactKind + sha256` kimliği upload öncesi yeniden kullanılıyor; response duplicate olarak dönüyor, yeni document/delivery yan etkisi oluşmuyor. Eşzamanlı `P2002` unique yarışında geçici dosya temizlenip mevcut güvenli kayıt döndürülüyor. Hedef U-03 testi, tam runner 199 files, TypeScript, lint ve production build PASS; `/api/ready` 200/db ok. Aktif sonraki mikro-faz U-04 — Belge-preview eşleştirmesi.

### U-03 — Hash ve duplicate kontrolü

**Dosyalar:** Storage/document service, `tests/invoice-document-hash.test.mjs`.

**Tek çıktı:** SHA-256 ve aynı invoice/document duplicate davranışı.

**Çıkış kapısı:** Aynı belge ikinci kez yeni teslimat başlatmıyor.

**U-04 çıkış güncellemesi (2026-09-04):** PASS. `invoice-document-matching.ts` yalnız stable reference matcher kullanıyor; ad/e-posta/tutar/tarih fallback’i yok. Unmatched/ambiguous sonuçlar fail-closed ve manuel onay zorunlu; ready gate ayrıca invoice `issued`, scan `clean` ve quarantined document ister. Authenticated match-preview route tenant/form/invoice/document scoped read-only preview döndürüyor, state/delivery değiştirmiyor. Hedef U-04 testi, tam runner 200 files, TypeScript, lint ve production build PASS; `/api/ready` 200/db ok. Aktif sonraki mikro-faz U-05 — Upload kapısı.

### U-04 — Belge-preview eşleştirmesi

**Dosyalar:** Matching service ve route, `tests/invoice-document-matching.test.mjs`.

**Tek çıktı:** Belge metadatası ile invoice row eşleşmesi ve manuel onay.

**Çıkış kapısı:** Ambiguous/unmatched belge `document_ready` olamıyor.

**U-05 çıkış güncellemesi (2026-09-04):** PASS. `invoice-document-upload-gate.ts` U-00..U-04 fazlarının tamamını exact `pass` ve `documentReadyAllowed=true` koşuluyla `canDownload`/`canDeliver` kararına bağlıyor; eksik, unverified, blocked veya bilinmeyen fazda fail-closed dönüyor. Gate yalnız sunum/erişim kararıdır; AV release, manuel approval mutation, document-ready state transition ve delivery worker açılmadı. Hedef U-05 testi, tam runner 201 files, TypeScript, lint ve production build PASS; `/api/ready` 200/db ok. Aktif sonraki mikro-faz E-00 — Fatura e-posta şablonu.

**E-00 çıkış güncellemesi (2026-09-04):** PASS. `src/lib/invoice-email.ts` yalnız `document_ready` ve `scanStatus=clean` koşullarında ortak transactional e-posta politikasını kullanarak normalize edilmiş alıcı, güvenli subject/body ve uygulama-origin belge linki üretiyor. HTML escape, CR/LF ve uzunluk sınırları uygulanıyor; raw provider URL, kampanya içeriği ve secret template alanları reddediliyor. Hedef E-00 testi, tam runner 202 files, TypeScript, lint ve production build PASS; `/api/ready` 200/db ok. Aktif sonraki mikro-faz E-01 — Document-ready enqueue.

**E-01 çıkış güncellemesi (2026-09-04):** PASS. `src/lib/invoice-delivery-enqueue.ts` yalnız `document_ready`, temiz tarama, private/quarantined belge ve geçerli alıcı ile güvenli transactional delivery command üretiyor. Deterministik invoice/document/channel anahtarıyla `InvoiceDeliveryIntent` ve `OutboxEvent` tek transaction’da yazılıyor; ikinci çağrı duplicate dönüyor ve `document_ready` yalnız beklenen state hâlâ geçerliyse `delivery_queued` oluyor. Provider gönderimi, retry worker ve gerçek dış servis doğrulaması bu pakette açılmadı. Hedef E-01 testi, tam runner 203 files, TypeScript, lint ve production build PASS; `/api/ready` 200/db ok. Aktif sonraki mikro-faz E-02 — Worker retry ve sınıflandırma.

**E-02 çıkış güncellemesi (2026-09-04):** PASS. `invoice-delivery-retry.ts` hata kodlarını güvenli biçimde sınıflandırıyor; bozuk payload/geçersiz alıcı/provider `rejected` veya `invalid` kalıcı dead-letter, bağlantı/HTTP/provider `failed` retryable kalıyor ve beşinci denemede retry terminal oluyor. `outbox-dispatch-worker.ts` tüm hata yollarında ortak sınıflandırmayı kullanıyor; provider secret veya ham hata loglamıyor. Hedef E-02 testi, mevcut dispatch-worker regresyonu, tam runner 204 files, TypeScript, lint ve production build PASS; `/api/ready` 200/db ok. Aktif sonraki mikro-faz E-03 — Resend ve suppression.

**E-03 çıkış güncellemesi (2026-09-04):** PASS. `invoice-delivery-resend.ts` yalnız yetkili kullanıcı, verified document-ready, temiz private/quarantined belge ve transactional alıcı koşullarında çalışıyor. `all` suppression fail-closed blokluyor; önceki teslimat açık onay yoksa duplicate warning dönüyor. `RESEND` sonrası yeni resend idempotency anahtarıyla intent/outbox ve audit aynı transaction’da oluşturuluyor; invoice/document state’i değiştirilmiyor. Hedef E-03 testi, suppression/protection ve E-00 regresyonları, tam runner 205 files, TypeScript, lint ve production build PASS; `/api/ready` 200/db ok. Aktif sonraki mikro-faz E-04 — E-posta kapısı.

**E-04 çıkış güncellemesi (2026-09-04):** PASS. `invoice-delivery-gate.ts` U-00..U-05 belge güvenliği ve E-00..E-03 e-posta geçmişini tek fail-closed kararda birleştiriyor. Verified document-ready, transactional sınıf, geçerli alıcı, suppression yokluğu, queued/sending delivery intent ve dispatch edilebilir outbox olmadan `canDeliver` açılmıyor. Hedef E-04 testi, belge/enqueue/resend regresyonları, tam runner 206 files, TypeScript, lint ve production build PASS; `/api/ready` 200/db ok. Aktif sonraki mikro-faz P-00 — Paraşüt adapter tipleri.

**P-00 çıkış güncellemesi (2026-09-05):** PASS. `src/lib/providers/parasut-v4.ts` Paraşüt v4 provider-independent adapter interface ve redacted result types tanımlıyor. Company scope, local idempotency, draft/formalization/job/document-ready ayrımı, normalized provider failure ve backend PDF bytes/hash sözleşmesi var; token, raw response ve geçici provider linki yok. Hedef P-00 testi, tam runner 207 files, TypeScript, lint ve production build PASS; `/api/ready` 200/db ok. Aktif sonraki mikro-faz P-01 — OAuth callback ve token yenileme.

### U-05 — Upload kapısı

**Çıkış kapısı:** `U-00..U-04` geçmeden e-posta gönderme ve belge download butonları açılmaz.

---

### E-00 — Fatura e-posta şablonu

**Dosyalar:** `src/lib/invoice-email.ts`, hedef test.

**Tek çıktı:** Form/workspace güvenli subject/body ve redakte edilmiş template değişkenleri.

**Çıkış kapısı:** HTML injection, raw provider URL, secret ve tam PII log’a girmiyor.

### E-01 — Document-ready enqueue

**Dosyalar:** Invoice service, `src/lib/outbox.ts`, `tests/invoice-delivery-enqueue.test.mjs`.

**Tek çıktı:** Sadece doğrulanmış `document_ready` için idempotent outbox mesajı.

**Çıkış kapısı:** Belgesiz, hash’siz veya alıcısız e-posta kuyruğa girmiyor.

### E-02 — Worker retry ve sınıflandırma

**Dosyalar:** `src/lib/outbox-worker.ts`, invoice delivery adapter, test.

**Tek çıktı:** Geçici/permanent hata ayrımı, bounded retry/backoff.

**Çıkış kapısı:** Worker restart duplicate gönderim üretmiyor; provider hata secret döndürmüyor.

### E-03 — Resend ve suppression

**Dosyalar:** Delivery route/service, `tests/invoice-delivery-resend.test.mjs`.

**Tek çıktı:** Yetkili açık resend, duplicate uyarısı ve suppressed durumu.

**Çıkış kapısı:** Her resend audit’li; invoice issued/document state delivery durumundan ayrı.

### E-04 — E-posta kapısı

**Çıkış kapısı:** `E-00..E-03` geçmeden Paraşüt PDF veya manuel belge müşteriye gönderilemez.

---

### P-00 — Paraşüt adapter tipleri

**Dosyalar:** `src/lib/providers/parasut-v4.ts`, `tests/parasut-v4-contract.test.mjs`.

**Tek çıktı:** Provider-independent adapter interface ve redacted result types.

**Üretilen sözleşmeler:** `findOrCreateContact`, `findOrCreateProduct`, `createSalesInvoice`, `lookupEInvoiceInbox`, `formalizeEInvoice`, `formalizeEArchive`, `getTrackableJob`, `downloadInvoicePdf`.

**Çıkış kapısı:** Raw provider response domain/UI’ye sızmıyor.

### P-01 — OAuth callback ve token yenileme

**Dosyalar:** Yeni server-side Paraşüt OAuth route’ları, secret helper, test.

**Tek çıktı:** Authorization code → encrypted token, refresh rotation, revoke.

**Çıkış kapısı:** Token browser, log, audit body veya exportta yok.

#### P-01A — OAuth state ve token envelope sözleşmesi

**Dosyalar:** `src/lib/parasut-oauth.ts`, `src/lib/parasut-credentials.ts`, `src/lib/env.ts`, `tests/parasut-oauth.test.mjs`.

**Tek çıktı:** Authorization-code-only, exact callback URI, server-bound state hash, workspace/user binding, 10 dakikalık expiry, tek kullanımlı consumption ve AES-256-GCM credential envelope.

**P-01A çıkış güncellemesi (2026-09-05):** PASS. Password grant reddediliyor; client secret authorization URL’ye girmiyor; access/refresh token seti yalnız authenticated envelope biçiminde saklanabilir. Gerçek provider hesabı, PKCE ve revoke davranışı doğrulanmadı; bunlar dış bağımlılık kapısı olarak kaldı. Hedef test, tam runner `208 files`, TypeScript, lint, production build ve `/api/ready` `200 {"status":"ready","db":"ok"}` PASS. Aktif sonraki mikro-faz `P-01B`.

#### P-01B — OAuth server route ve transaction persistence

**Dosyalar:** Server-side Paraşüt OAuth start/callback route’ları, Prisma authorization transaction/connection modeli ve migration, route testleri.

**Tek çıktı:** UI’ye yalnız authorization URL/status dönmesi; callback code’un atomik tek kullanımı; token exchange sonrası encrypted connection; refresh rotation için compare-and-swap hazırlığı.

**Çıkış kapısı:** Session/CSRF/integrations.manage, exact redirect allowlist, state replay/mix-up/cross-workspace reddi, token/code browser/log/audit/export dışında kalması ve duplicate callback’in yeni bağlantı üretmemesi.

**P-01B çıkış güncellemesi (2026-09-05):** PASS. `ParasutConnection` ve `ParasutOAuthTransaction` migration ile eklendi; state yalnız hash/binding olarak tutuluyor. Start route MFA + same-origin + `integrations.manage` ile exact redirect üzerinden authorization URL üretiyor; callback atomik tek kullanım yapıyor, token exchange sonucunu encrypted envelope’a yazıyor ve 303 ile token/code’suz sonuca dönüyor. Hedef route testi, Prisma validate/migration/client generate, tam runner `209 files`, TypeScript, lint, production build ve `/api/ready` `200 {"status":"ready","db":"ok"}` PASS. Gerçek provider exchange ve refresh rotation kanıtı bu fazda yapılmadı. Aktif sonraki mikro-faz `P-01C`.

#### P-01C — Refresh token rotation ve CAS

**Dosyalar:** Paraşüt credential version alanı/migration, refresh worker/service ve `tests/parasut-token-rotation.test.mjs`.

**Tek çıktı:** Yaklaşık iki saatlik access token süresi dolmadan bounded refresh; dönen access+refresh çiftinin beklenen credential version ile atomik compare-and-swap yazılması.

**Çıkış kapısı:** Paralel worker yarışında tek geçerli rotation, eski refresh token’ın tekrar kullanımı yok, provider başarısızlığında eski envelope korunuyor, plaintext token log/audit/response’a girmiyor.

**P-01C çıkış güncellemesi (2026-09-05):** PASS. `parasut-token-rotation.ts` refresh grant, 5 dakikalık bounded skew ve credential version compare-and-swap sözleşmesini sağlıyor; yeni access+refresh çifti encrypted envelope’a alınmadan yazılmıyor. Provider/yarış kaybında eski envelope korunuyor. `credentialVersion` migration ile eklendi. Hedef test, tam runner `210 files`, TypeScript, lint, production build ve `/api/ready` `200 {"status":"ready","db":"ok"}` PASS. Gerçek provider refresh çağrısı ve canlı token doğrulaması dış bağımlılıktır. Aktif sonraki mikro-faz `P-02`.

### P-02 — Company scope health check

**Dosyalar:** Paraşüt connection route/service, `tests/parasut-health.test.mjs`.

**Tek çıktı:** Company ID erişimi, token validity ve API health sonucu.

**Çıkış kapısı:** Sağlık kontrolü başarısız bağlantı UI’de bağlı görünmüyor.

#### P-02A — Company scope health karar sözleşmesi

**Dosyalar:** `src/lib/parasut-health.ts`, `tests/parasut-health.test.mjs`.

**Tek çıktı:** Workspace eşleşmesi, seçili company ID, provider company ID ve token health sonucunu `active` veya fail-closed durumlara normalize eden DTO.

**P-02A çıkış güncellemesi (2026-09-05):** PASS. Scope mismatch, company selection required, reauthorization required ve retryable/failed health durumları `canUse=false` bırakıyor; yalnız eşleşen ve token-valid sonuç `active` oluyor. Hedef test, tam runner `211 files`, TypeScript, lint, production build ve `/api/ready` `200 {"status":"ready","db":"ok"}` PASS. Aktif sonraki mikro-faz `P-02B`.

#### P-02B — Provider company discovery ve health route

**Dosyalar:** Paraşüt adapter health/discovery implementation, server route, connection status update ve route/adapter testleri.

**Tek çıktı:** Şifre çözme yalnız worker/server sınırında; Paraşüt’ten company listesi veya seçili company health kanıtı alınması; başarısız kontrolde connection `active` yapılmaması.

**Çıkış kapısı:** Company tenant binding, provider 401/403/429/5xx ayrımı, token refresh ihtiyacı, rate limit ve raw provider response/token sızıntısı testleri geçmeden P-03 açılmaz.

### P-03 — Contact lookup/create

**Dosyalar:** Paraşüt adapter, `tests/parasut-contact.test.mjs`.

**Tek çıktı:** VKN/e-posta/name filtreleme ile güvenli contact mapping.

**Çıkış kapısı:** Belirsiz contact otomatik seçilmiyor; duplicate create yok.

#### P-03A — Contact lookup ve resolution

**Dosyalar:** `src/lib/providers/parasut-contact.ts`, `tests/parasut-contact.test.mjs`.

**Tek çıktı:** Resmi `/{company_id}/contacts` GET filtresiyle bounded lookup, allowlist candidate parsing ve VKN/e-posta/name karar sözleşmesi.

**Kural:** Tekil güçlü VKN/e-posta eşleşmesi bağlanabilir; sıfır sonuç yalnız yeterli alıcı kimliği ve legal name varsa `create_required`; yalnız isim veya birden çok aday `manual_review_required` olur.

**Çıkış güncellemesi (2026-09-05):** PASS. Lookup URL/header/pagination, provider contact candidate allowlist, exact tax/e-mail resolution ve create-required/manual-review ayrımı test edildi. POST payload yalnız hazırlanıyor; otomatik contact oluşturma, kör retry ve provider yan etkisi açılmadı. Aktif sonraki mikro-faz P-03B.

#### P-03B — Explicit contact create transaction preparation/idempotency

**Dosyalar:** `src/lib/providers/parasut-contact.ts`, yeni server-side mapping/command persistence, `tests/parasut-contact-create.test.mjs`.

**Tek çıktı:** `create_required` kararından sonra açık muhasebe/operatör onayı, yeniden lookup fingerprint’i ve token içermeyen idempotent command kaydı; provider isteği yalnız bir sonraki execution fazına geçer.

**Çıkış kapısı:** Onaysız command, lookup yapılmadan command, aynı fingerprint ile duplicate command, timeout sonrası kör tekrar, cross-workspace/company mapping ve provider raw response/token sızıntısı fail-closed reddedilir. Bu fazda provider POST yapılmaması beklenen davranıştır; gerçek provider create işlemi `P-03C` test hesabı veya resmi mock kanıtı olmadan production başarı sayılmaz.

#### P-03C — Approved provider contact create execution/reconcile

**Dosyalar:** `src/lib/providers/parasut-contact.ts`, yeni server-only execution worker/route, `tests/parasut-contact-execution.test.mjs`.

**Tek çıktı:** Persist edilmiş approved command’ın workspace/company ve güncel contact lookup ile tekrar doğrulanması, provider `POST /v4/{company_id}/contacts` çağrısının tek kontrollü yürütülmesi, güvenli response allowlist’iyle `providerContactId` kaydı ve belirsiz timeout sonucunun `reconciliation_required` durumuna ayrılması.

**Çıkış kapısı:** Browser/provider client’a token çıkışı, public execution endpoint’i, stale lookup sonrası POST, duplicate provider create, timeout sonrası kör POST, cross-tenant/company command, raw response/PII loglama ve başarıyı callback ile varsayma reddedilir. Gerçek provider create hesabı veya resmi deterministic mock olmadan canlı başarı iddia edilmez.

#### P-03D — Server-only command store

**Dosyalar:** yeni server-only command store/worker adapterı, ilgili route/worker testleri.

**Tek çıktı:** Prisma `ParasutContactCommand` kaydının workspace/company kapsamlı okunması ve approved → submitted/confirmed/reconciliation_required/failed geçişlerinin conditional update ile bağlanması.

**Çıkış kapısı:** public/browser route, client bundle, response/audit/log içinde token veya raw provider body, workspace/company kapsamı olmadan command okuma, koşulsuz status update, ikinci worker’ın aynı approved komutu claim etmesi ve gerçek provider hesabı olmadan canlı başarı iddiası fail-closed reddedilir.

#### P-03E — Server-only execution worker wiring

**Dosyalar:** yeni server-only command execution worker/route, `tests/parasut-contact-worker.test.mjs`.

**Tek çıktı:** P-03D scoped store’dan claim edilen approved command’ın credential çözümleme, güncel lookup ve P-03C execution fonksiyonuna bağlanması; provider çağrısının yalnız server-side worker sınırında yapılması.

**Çıkış kapısı:** public POST, browser bundle, auth/MFA/capability ve tenant/company scope kontrolü olmadan execution, credential’ın queue/log/response’a yazılması, stale lookup sonrası POST, worker timeout’unda kör retry ve reconciliation durumunun kaybolması fail-closed reddedilir.

### P-04 — Product lookup/create

**Dosyalar:** Paraşüt adapter, `tests/parasut-product.test.mjs`.

**Tek çıktı:** Form ürün snapshot’ının Paraşüt products ilişkisine mapping’i.

**Çıkış kapısı:** Bilinmeyen ürün başka ürünle sessiz eşleşmiyor.

#### P-04A — Product lookup/resolution

**Tek çıktı:** `src/lib/providers/parasut-product.ts` ile yalnız resmi product lookup request’i, allowlist candidate parser ve `matched/create_required/manual_review_required` kararı.

**Çıkış kapısı:** Exact code dışında otomatik eşleşme yok; isim eşleşmesi, çoklu sonuç, provider’ın yanlış resource tipi veya numeric olmayan ID’si fail-closed; sayfa boyutu 25’i geçmiyor; raw provider payload ve credential dışarı taşınmıyor.

**Durum:** PASS — hedef product contract testi, tam runner `218 files`, TypeScript, lint, production build ve `/api/ready` geçti. Gerçek Paraşüt hesabı doğrulaması dış bağımlılık olarak açık kaldı.

#### P-04B — Explicit product create preparation/idempotency

**Tek çıktı:** P-04A `create_required` kararı ve açık muhasebe/yetkili onayı ile yalnız metadata tutan product-create command/fingerprint hazırlığı.

**Çıkış kapısı:** Provider POST yok; token/request kalıcı command’a yazılmıyor; workspace/connection/company scope ve unique fingerprint zorunlu; onaysız veya stale lookup create command üretemiyor.

**Durum:** PASS — `ParasutProductCommand` ve production Prisma store tamamlandı. P-04A `create_required`, lookup fingerprint ve açık `approvedById` olmadan command üretilemiyor; token/request persist edilmiyor; unique yarış duplicate olarak çözülüyor. Hedef test, tam runner `219 files`, TypeScript, lint, production build, Prisma validate/migrate status ve `/api/ready` geçti. Windows dosya kilidinde yalnız lokal MavenForms server’ı kontrollü kapatılıp işlem sonrası yeniden açıldı. Gerçek provider product POST’u bu fazda açılmadı.

#### P-04C — Approved product create execution/reconcile

**Tek çıktı:** P-04B command’ının server-only credential çözümü, güncel product lookup ve tek provider POST/reconciliation akışına bağlanması.

**Çıkış kapısı:** `approved` + güncel lookup + aynı request fingerprint olmadan claim yok; provider timeout/2xx belirsizliği `reconciliation_required`; 409 numeric product ID duplicate-safe confirmed; token/raw body/public route yok; otomatik kör retry yok.

**Durum:** PASS — `executeParasutProductCreateCommand` ve scoped store status geçişleri tamamlandı. Hedef test, tam runner `219 files`, TypeScript, lint, production build ve `/api/ready` geçti. Gerçek provider product POST dış bağımlılık olarak açık kaldı.

#### P-05 — Sales invoice payload

**Tek çıktı:** Doğrulanmış PaymentOrder + contact/product provider ID + immutable invoice line snapshot’tan yalnız provider draft payload’ı üreten, gönderim yapmayan adapter sözleşmesi.

**Çıkış kapısı:** PaymentOrder `succeeded` değilse, contact/product mapping kesin değilse, toplam/para birimi snapshot ile eşleşmiyorsa veya mali karar `accounting_review_required` ise draft payload üretilmez; provider POST ve issue/formalization bu pakette açılmaz.

### P-05 — Sales invoice payload

**Dosyalar:** `src/lib/providers/parasut-v4-mappers.ts`, `tests/parasut-sales-invoice-mapper.test.mjs`.

**Tek çıktı:** JSON:API `sales_invoices` payload mapper.

**Çıkış kapısı:** Contact/details relationships, line amount, tax, currency ve idempotency cross-check’ten geçiyor.

**Durum:** PASS — `src/lib/providers/parasut-v4-mappers.ts` yalnız draft payload üretir; payment succeeded, invoice state, contact/product numeric ID, line hesapları, currency, date ve foreign exchange kapıları uygulanır. Read-only alan, credential veya provider network çağrısı yoktur. Hedef mapper testi, tam runner `220 files`, TypeScript, lint, production build ve `/api/ready` geçti. Gerçek draft POST dış bağımlılık olarak açık kaldı.

**P-05 kapsam sınırı:** Provider `sales_invoices` POST’u ve timeout sonrası reconcile P-06’ya bırakıldı. Bu ayrım, payload doğrulanmadan mali/provider yan etkisinin açılmasını engeller.

### P-06 — Sales invoice draft create

**Dosyalar:** Paraşüt adapter/service, `tests/parasut-sales-invoice-create.test.mjs`.

**Tek çıktı:** `provider_draft_created` ve provider resource ID.

**Çıkış kapısı:** Timeout sonrası mevcut provider kaydı aranıyor; yeni draft körlemesine yaratılmıyor.

**Durum (2026-09-05):** PASS — `buildParasutSalesInvoiceCreateRequest` P-05 mapper çıktısını yalnız server-only, JSON:API `POST /v4/{company_id}/sales_invoices` sınırına bağlıyor; credential request header’da geçici kalıyor, payload veya sonuçta saklanmıyor. `InvoiceRecord` için tenant/provider scoped atomic claim (`queued → provider_draft_submitting`) ve sonuç geçişleri eklendi. Numeric `sales_invoices` resource ID ile `provider_draft_created`; timeout veya ID’siz 2xx/409 sonrası `invoice_id` verilmişse resmi bounded `GET /v4/{company_id}/sales_invoices?filter[invoice_id]=...` sorgusuyla tekil reconciliation deneniyor. Tekil numeric ID yoksa veya lookup başarısızsa `reconciliation_required`; auth/validation/rate-limit/unavailable hataları `provider_error` olarak ayrılıyor. Replay’de provider create tekrar çağrısı yapılmıyor. Hedef test, state testi, tam runner `221 files`, TypeScript, lint, production build ve `/api/ready` `200 {"status":"ready","db":"ok"}` geçti. Gerçek Paraşüt hesabına draft POST dış bağımlılık olarak doğrulanmadı. Resmi dayanak [Paraşüt API v4 Swagger](https://apidocs.parasut.com/swagger.json); aktif sonraki mikro-faz `P-07 — E-Fatura inbox lookup`.

**P-06 kapsam sınırı:** Bu faz draft oluşturma ve belirsiz sonucu güvenli reconciliation durumuna alma ile sınırlıdır. Formalization/issue, e-belge tipi kararı, provider sorgusu ve kullanıcıya açık worker/route P-07 ve devamındaki fazlara bırakıldı.

### P-07 — E-Fatura inbox lookup

**Dosyalar:** Paraşüt adapter, `tests/parasut-einvoice-inbox.test.mjs`.

**Tek çıktı:** VKN ile e-Fatura inbox sonucu ve lookup zamanı snapshot’ı.

**Çıkış kapısı:** Lookup error, otomatik e-Arşiv kararına dönüşmüyor.

**Durum (2026-09-05):** PASS — `src/lib/providers/parasut-einvoice-inbox.ts` resmi `GET /v4/{company_id}/e_invoice_inboxes` sözleşmesine göre yalnız 10 haneli VKN ve bounded page size 25 ile request üretiyor; JSON:API tip/ID doğrulanmadan found sonucu kabul edilmiyor. Başarılı sonuç internal `taxNumber/found/checkedAt` snapshot’ı, hatalar normalized `ParasutResult`; credential, raw provider response, public route ve otomatik e-Arşiv kararı yok. Hedef test, tam runner `222 files`, TypeScript, lint, production build ve `/api/ready` geçti. Gerçek hesap/canlı VKN lookup dış bağımlılık olarak doğrulanmadı. Aktif sonraki mikro-faz `P-08 — E-Fatura/e-Arşiv karar servisi`.

**P-07 kapsam sınırı:** Bu mikro-faz yalnız provider inbox lookup yapar. `found=false` veya lookup hatası belge türü kararı değildir; e-Fatura/e-Arşiv sınıflandırması, işletme politikası ve muhasebe onayı P-08’e bırakıldı.

### P-08 — E-Fatura/e-Arşiv karar servisi

**Dosyalar:** `src/lib/invoice-document-type-policy.ts`, test.

**Tek çıktı:** Provider sonucu + işletme/mali karar ile belge type classification.

**Çıkış kapısı:** Desteklenmeyen/ambiguous durumda `accounting_review_required`.

**Durum (2026-09-05):** PASS — `src/lib/invoice-document-type-policy.ts` provider inbox snapshot’ını alıcı türü, ülke, VKN, işletme capability’leri, otomatik sınıflandırma izni, muhasebe onayı ve isteğe bağlı belge türü talebiyle birlikte değerlendiriyor. Yalnız doğrulanmış TR şirketi + geçerli VKN + başarılı eşleşen snapshot sonrasında `e_invoice`/`e_archive` üretiyor. Bireysel/yurt dışı, lookup error, malformed snapshot, capability eksikliği, pending/rejected approval ve type conflict fail-closed `accounting_review_required` sonucuna gidiyor. `found=false` otomatik e-Arşiv kararı değildir. Hedef test, tam runner `223 files`, TypeScript, lint, production build ve `/api/ready` geçti. GİB dayanağı [e-Fatura uygulaması](https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Finfografikler%2Fpdfs%2F2025_e_fatura.pdf), [e-Arşiv uygulaması](https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Finfografikler%2Fpdfs%2Fe_arsiv_fatura.pdf). Aktif sonraki mikro-faz `P-09 — Formalization job create`.

**P-08 kapsam sınırı:** Bu karar yalnız belge türü classification üretir; provider formalization, issue, GİB raporlama, yurt dışı/ihracat istisnaları ve public kullanıcı akışı sonraki fazların sorumluluğundadır.

### P-09 — Formalization job create

**Dosyalar:** `src/lib/providers/parasut-formalization.ts`, `prisma/migrations/20260905040000_add_invoice_provider_job_id/migration.sql`, `tests/parasut-formalization.test.mjs`.

**Tek çıktı:** e-Fatura/e-Arşiv create request sonrası `formalization_pending` + job ID.

**Çıkış kapısı:** `201 Trackable Job` nihai issued sayılmıyor.

**Kapanış kanıtı (2026-09-05):** Hedef test, migration, TypeScript, lint, tam test runner `224 files`, production build ve `/api/ready` `200 {\"status\":\"ready\",\"db\":\"ok\"}` geçti. Build’te yalnız mevcut `middleware` → `proxy` convention uyarısı kaldı. Gerçek Paraşüt hesabı/canlı e-belge POST dış bağımlılık olarak doğrulanmadı.

**Durum (2026-09-05):** PASS — P-08 classification sonucundan resmi Paraşüt v4 e-Fatura/e-Arşiv POST isteği üretiliyor. E-Fatura `scenario` ve `to` alanları; e-Arşiv internet satışında HTTPS URL, ödeme tipi, ödeme aracısı platformu ve tarih güvenli biçimde doğrulanıyor. Yalnız `201` ve doğru JSON:API `trackable_jobs` numeric ID `formalization_pending` kabul ediliyor. `InvoiceRecord` üzerinde `providerJobId` ve `formalization_submitting` atomic claim eklendi; duplicate pending replay provider çağrısı yapmıyor. Timeout, 409 ve ID’siz 201 reconciliation gerektiriyor; auth, validation, rate-limit ve 5xx sonuçları normalized provider error. Credential/raw response public veya durable payload’a taşınmıyor. Hedef test ve migration uygulandı; tam test/build/readiness kapıları faz kapanışında raporlanacak. Gerçek Paraşüt hesabı/canlı e-belge POST dış bağımlılık olarak doğrulanmadı. Resmi dayanak [Paraşüt API v4 Swagger](https://apidocs.parasut.com/swagger.json). Aktif sonraki mikro-faz `P-10 — Bounded job polling`.

### P-10 — Bounded job polling

**Dosyalar:** `src/lib/providers/parasut-v4-jobs.ts`, `tests/parasut-job-polling.test.mjs`.

**Tek çıktı:** `pending/running/error/done`, backoff ve provider job kullanım penceresi içinde bounded worker.

**Çıkış kapısı:** Sonsuz polling, page refresh ile duplicate formalization ve sınırsız retry yok.

**Durum (2026-09-05):** PASS — `src/lib/providers/parasut-v4-jobs.ts`, resmi Trackable Job GET endpoint’ine server-only ve numeric company/job ID ile bağlanıyor. `providerJobCreatedAt` ve `formalization_polling` atomic claim’i ile provider job kullanım penceresi 15 dakika olarak bounded tutuluyor. `running` yeniden pending’e döner, `done` yalnız `issued` state’ine geçer, `error` `formalization_error` olur; 404, malformed veya ID uyuşmazlığı reconciliation gerektirir. Timeout retry kuyruğunu sınırsız büyütmeden reconciliation’a ayrılır; 429/5xx state’i pending’de tutar; expired job provider’a çağrı yapmadan reconciliation’a gider. Pending/issued replay provider’a yeniden gitmez. Hedef test `225 files`, TypeScript, lint, production build ve `/api/ready` kapanış kapıları geçti. Gerçek Paraşüt hesabı/canlı job polling dış bağımlılık olarak doğrulanmadı. Resmi dayanak [Paraşüt API v4 Swagger](https://apidocs.parasut.com/swagger.json). Aktif sonraki mikro-faz `P-11 — Active document ve PDF indirme`.
**P-10 timeout düzeltmesi:** Trackable Job GET yan etkisiz olduğu için timeout, pencere içindeyse state’i `formalization_pending` konumunda bırakıp bounded `unavailable` sonucu verir; dış yan etki belirsizliği olmadığı için gereksiz reconciliation terminaline taşımaz. Süre dolması veya job’ın bulunamaması reconciliation kapısıdır.

### P-11 — Active document ve PDF indirme

**Dosyalar:** `src/lib/providers/parasut-invoice-pdf.ts`, private storage service, `tests/parasut-invoice-pdf.test.mjs`.

**Tek çıktı:** `active_e_document` bilgisi ve provider PDF’nin özel storage’a indirilmesi.

**Çıkış kapısı:** Geçici provider URL müşteriye veya public response’a gitmiyor; hazır değil cevabı kontrollü retry.

**Durum (2026-09-05):** PASS — resmi Paraşüt `sales_invoices/{id}?include=active_e_document`, e-Fatura/e-Arşiv PDF endpoint’leri ve 204 not-ready sözleşmesi server-only adapter’a bağlandı. Active document tipi/ID’si allowlist ve numeric doğrulamasıyla seçiliyor; provider’ın geçici PDF URL’si yalnız bellekte kullanılıyor ve public/authenticated DTO’ya taşınmıyor. PDF HTTPS URL, süre sonu, content-type, `%PDF-` magic, boyut ve SHA-256 ile doğrulanıp private `InvoiceDocument` quarantine kaydına yazılıyor; `scanStatus=pending` kaldığı için AV/document-ready/delivery kapısı aşılmıyor. Duplicate hash güvenle yeniden kullanılıyor. Hedef test, tam test runner `226 files`, TypeScript, lint, production build ve `/api/ready` `200 {\"status\":\"ready\",\"db\":\"ok\"}` geçti. Build’te yalnız mevcut `middleware` → `proxy` convention uyarısı kaldı. Gerçek Paraşüt hesabı/canlı active document ve PDF çağrısı dış bağımlılık olarak doğrulanmadı. Resmi dayanak [Paraşüt API v4 Swagger](https://apidocs.parasut.com/swagger.json). Aktif sonraki mikro-faz `P-12 — Paraşüt teslimat kapısı`.

### P-12 — Paraşüt teslimat kapısı

**Çıkış kapısı:** `P-00..P-11` replay geçer; test hesabında ödeme → draft → job → belge → outbox zinciri kanıtlı olmadan live mode açılmaz.

**Durum (2026-09-05):** IN_PROGRESS. Yerel adapter testlerinin geçmesi çalışan gerçek entegrasyon veya release kanıtı sayılmaz. Kapı denetiminde bulunan kusurlar aşağıdaki bağımlı, en fazla 15 dakikalık paketlerde kapatılır. Her paketin girişinde önceki paketlerin regresyonu, çıkışında hedef test/kod inceleme/TypeScript/lint/build ve lokal readiness kontrolü gerekir. Genişleyen paket tekrar bölünür; doğrulanmayan iş PASS yazılmaz.

#### P-12A — Kalıcı belge/fatura kapsamıyla teslimat kuyruğu

**Durum:** LOCAL_PASS. **Dosyalar:** `src/lib/invoice-delivery-enqueue.ts`, `tests/invoice-delivery-persistence.test.mjs`.

**Bulgu:** Enqueue yalnız input içindeki `scanStatus=clean` ve `invoiceState=document_ready` beyanını kontrol ediyor, gerçek belge sahibi ve kalıcı scan durumunu tekrar okumuyordu. Fatura state güncellemesi de yalnız invoice ID ile sınırlıydı.

**Uygulama:** Intent/outbox transaction’ında invoice → paymentOrder → workspace/form/submission ilişkisini doğrula; belge ID’sinin bu invoice’a ait, private/quarantined ve clean olduğunu veritabanından kontrol et. Yeni enqueue için kalıcı invoice state document_ready olmalı. Aynı koşulları son conditional update’te ve P2002 duplicate kurtarmasında koru. Hata halinde transaction rollback; tekrar çağrıda ikinci outbox oluşmamalı. API ve manuel fatura aynı servisi kullanır.

**Kanıt:** Gerçek enqueue fonksiyonunu çalıştıran transaction double ile farklı workspace/form/submission/invoice/document, yanlış belge-fatura eşleşmesi, pending/infected/public belge, issued fatura, lost claim, outbox hatası, tekrar ve unique yarış senaryoları geçti. Tam runner 227 dosya, TypeScript, hedef lint ve production build PASS; `/` 200, `/api/ready` 200/db ok. Bu test double gerçek veritabanı eşzamanlılık veya canlı provider kanıtı değildir. Var olan middleware→proxy build uyarısı sürüyor.

#### P-12B — Önceki Paraşüt adapterlarının birleşik sınır denetimi

**Durum:** PASS. **Giriş:** P-12A ve tüm P-00..P-11 yerel testleri geçer.

**Tek çıktı:** Job/PDF sınırlarında doğrulanmış sözleşme ve kapsam kusurlarını kapatmak. Resmi güncel Swagger’dan job status değerlerini yeniden kontrol et: mevcut parser/test `pending` yanıtını reddediyor; belgelendirilmiş bir status ise test ve normalizasyon düzeltilmeli. PDF store’da duplicate aramasından ve dosya yazımından önce invoice/workspace/provider sahipliği doğrulanmalı; şu an scope parametresi doğrulanıyor fakat invoice kaydı okunmuyor. Provider document/sales invoice bağını, geçici URL ve indirme limitlerini incele; kapsam büyürse P-12B alt paketlerine böl.

**Çıkış:** Yanlış tenant/invoice ile hiçbir dosya veya duplicate ID alınamaz; geçerli bekleyen job hatalı terminal duruma gitmez; malformed cevap başarı sayılmaz. Resmi kaynak: https://apidocs.parasut.com/swagger.json. Kaynak tekrar okunmadan önceki araştırma notu kesin sözleşme kanıtı sayılmaz.

**P-12B çıkış kanıtı (2026-09-05):** Resmi Paraşüt API v4 Swagger’daki `pending`, `running`, `done` ve `error` job durumları doğrulandı; iç durum makinesi `pending` değerini terminal başarı/hataya çevirmeden `running` olarak normalize ediyor ve provider durumunu ayrı koruyor. PDF store, duplicate araması veya dosya yazımından önce kalıcı `invoiceRecord` kaydını `invoiceRecordId + workspaceId + provider + providerInvoiceId` ile doğruluyor; yanlış kapsamda transaction/audit/duplicate lookup başlamıyor. `providerDocumentId` ve `providerInvoiceId` numeric sınırları korunuyor. Hedef Paraşüt job/PDF testleri, tam runner `237 files`, TypeScript, production build ve `/api/ready` `200 {"status":"ready","db":"ok"}` PASS. Gerçek Paraşüt sandbox hesabı ve canlı PDF çağrısı dış bağımlılık olarak doğrulanmadı; live flag kapalı kalır. Kaynak: [Paraşüt API v4 Swagger](https://apidocs.parasut.com/swagger.json). Aktif sonraki mikro-faz `P-12C — Belge hazır olma ve teslimat bağlantısı`.

#### P-12C — Belge hazır olma ve teslimat bağlantısı

**Durum:** TODO; P-12B’ye bağlı. **Tek çıktı:** Gerçek belge tarama/matching/onay kaydı üzerinden issued → document_ready → ortak enqueue bağlantısının eksik kalan üretim yolunu tamamlamak. Önce mevcut worker/route/callsite envanterini çıkar, zaten çalışan bağlantıyı yeniden yazma. Yetkili onay ve tarama çıktısını kalıcı kayıttan oku; istek gövdesindeki clean/verified bayrağı ile kapı açma. Scan servisi yoksa pending korunur; simülasyon sadece izole testte kullanılır. Resend, alıcı/suppression ve özel belge erişimindeki aynı kayıt bağlarını bu bağlantının kapsam kontrolüne dahil et; büyük işi alt paketlere böl.

**İlk mikro-paket:** `P-12C-01` yalnız karar sözleşmesini kurar; kalıcı mutation ve ortak enqueue bağlantısı sonraki mikro-paketlerde yapılır.

**P-12C-01 çıkış kanıtı (2026-09-05):** PASS. `invoice-document-ready-transition.ts` eşleşme, açık onay, issued fatura, temiz tarama ve karantina koşullarını tek fail-closed kararda topluyor; mutation veya delivery enqueue yapmıyor. Hedef test, tam regresyon `238 files`, TypeScript, build ve `/api/ready` PASS.

**P-12C-02 çıkış kanıtı (2026-09-05):** PASS. `invoice-document-ready-persistence.ts` belge → fatura → workspace/paymentOrder kapsamını transaction içinde yeniden doğruluyor; yalnız matched candidate, approved actor, issued invoice, clean scan ve quarantined document için `readyAt` ile `issued → document_ready` geçişini yapıyor. Tekrar çağrı duplicate dönüyor; delivery enqueue bu mikro-fazda çalıştırılmıyor. Hedef test, tam regresyon, TypeScript, build ve `/api/ready` PASS. Gerçek AV/provider teslimatı doğrulanmadı. Aktif sonraki mikro-faz `P-12C-03 — document_ready sonrası ortak enqueue bağlantısı`.

**P-12C-03 çıkış kanıtı (2026-09-05):** PASS. `invoice-document-ready-delivery.ts` teslimat öncesi kalıcı belge/fatura/workspace kapsamını, `readyAt`, `document_ready`, private quarantine ve clean scan koşullarını yeniden okuyor; form/submission kapsamını kalıcı `PaymentOrder` kaydından alıp mevcut transaction/idempotency kullanan enqueue servisine devrediyor. Hazır olmayan belge enqueue edilmiyor; public route veya provider sırrı açılmadı. Hedef test, tam regresyon `239 files`, TypeScript, production build ve `/api/ready` PASS. Aktif sonraki mikro-faz `P-12C-04 — server-only approval/ready caller wiring`.

**P-12C-04 çıkış kanıtı (2026-09-05):** PASS. `invoice-document-ready-caller.ts` yalnız authenticated `invoices.import` yetkisine sahip server session’dan workspace ve approval actor kimliği alıyor; persistence tamamlanmadan delivery adapterına geçmiyor. Browser’dan workspace/actor kanıtı kabul edilmiyor; viewer/unauthenticated çağrılar fail-closed kalıyor. Hedef test, tam regresyon `240 files`, TypeScript, production build ve `/api/ready` PASS. Aktif sonraki mikro-faz `P-12C-05 — authenticated route wiring`.

**P-12C-05 çıkış kanıtı (2026-09-05):** PASS. `src/app/api/invoices/[id]/documents/[documentId]/ready/route.ts` session + `invoices.import` yetkisini doğruluyor, workspace/actor kimliğini server session’dan alıyor, bounded match/approval girdisini server caller’a iletiyor ve belge URL’sini yapılandırılmış app origin üzerinden üretiyor. Raw provider URL/token ve workspace/actor body’den alınmıyor. Hedef test, tam regresyon `241 files`, TypeScript, production build ve `/api/ready` PASS. Bu paket özel belge indirme handler’ını eklemedi; aktif sonraki mikro-faz `P-12C-06 — authenticated private document retrieval`.

**P-12C-06 çıkış kanıtı (2026-09-05):** PASS. `src/app/api/invoices/[id]/documents/[documentId]/route.ts` authenticated `invoices.read` kontrolüyle yalnız aynı workspace’teki, aynı invoice’a bağlı, `readyAt` atanmış, temiz ve private/quarantined belgeyi disk kökü altında güvenli biçimde sunuyor. Provider URL/token/storage key response’a taşınmıyor; bulunamayan veya yetkisiz kayıtlar aynı non-disclosing `Not found` yanıtını alıyor. Hedef test, tam regresyon `242 files`, TypeScript, production build ve `/api/ready` PASS. Aktif sonraki mikro-faz `P-12C-07 — durable match/approval decision record`.

**P-12C-07 çıkış kanıtı (2026-09-06):** PASS. `InvoiceDocumentDecision` modeli ve `invoice-document-decision-store.ts`, kararı workspace + belge + invoice kapsamına bağlıyor; eşleşme adayı ve onay aktörünü yalnız metadata olarak saklıyor, PII/provider sırrı kopyalamıyor. Belge kapsamı server transaction içinde doğrulanıyor; aynı karar duplicate, farklı karar replay/conflict olarak fail-closed dönüyor ve belge başına unique kayıt replay fence oluşturuyor. Prisma schema validate ve additive local migration deploy edildi. Hedef test, tam regresyon, TypeScript, production build ve `/api/ready` PASS. Bu mikro-faz ready mutation’a henüz bağlanmadı; aktif sonraki mikro-faz `P-12C-08 — durable decision zorunluluğunun ready akışına bağlanması`.

**P-12C-08 çıkış kanıtı (2026-09-06):** PASS. `invoice-document-ready-persistence.ts`, ready mutation’dan önce aynı workspace + belge + invoice için kalıcı `matched/approved` kararını zorunlu kılıyor; request body yalnız durable kararla tutarlılık kontrolü için kullanılıyor ve tek başına yetki vermiyor. Karar yoksa `decision_required`, farklıysa `decision_conflict` ile fail-closed dönüyor; duplicate ready idempotent kalıyor. Hedef test, caller/route testleri, tam regresyon, TypeScript, production build ve `/api/ready` PASS. Kararı oluşturacak authenticated approval yüzeyi henüz yok; aktif sonraki mikro-faz `P-12C-09 — server-side approval decision endpoint`.

**P-12C-09 çıkış kanıtı (2026-09-06):** PASS. Authenticated `decision` endpoint yalnız `invoices.write` yetkisiyle çalışıyor; workspace ve actor session'dan türetiliyor, belge ve aday invoice aynı workspace/paymentOrder kapsamında yeniden doğrulanıyor. Stable match strategy/candidate ve approval metadata'sı durable decision store'a yazılıyor; PII/provider secret kabul edilmiyor. Duplicate karar store sonucu korunuyor, farklı karar fail-closed kalıyor. Hedef approval/store/route testleri, tam regresyon, TypeScript, production build ve `/api/ready` PASS. Eşzamanlı unique-key yarışının kontrollü sonucu için aktif sonraki mikro-faz `P-12C-10`.

**P-12C-10 çıkış kanıtı (2026-09-06):** PASS. `invoice-document-decision-store.ts`, unique belge kararında Prisma unique-key yarışını yakalayıp yeni transaction içinde mevcut kararı yeniden okuyor; aynı payload duplicate, farklı payload `decision_conflict` dönüyor. Böylece eşzamanlı approval ikinci karar veya kontrolsüz 500 üretmiyor; tenant/document transaction kapsamı korunuyor. Hedef test, tam regresyon, TypeScript, production build ve `/api/ready` PASS. P-12C yerel karar/ready kapıları tamamlandı; aktif sonraki mikro-faz `P-12D-01 — zincir replay ve gerçek sandbox kanıtı`.

**P-12D-01 çıkış kanıtı (2026-09-06):** PASS. Yerel replay testi succeeded payment → invoice handoff referansını, persisted document-ready → outbox delivery sınırını, deterministic idempotency duplicate sonucunu, gecikmiş/uygunsuz belgeyi ve cross-tenant okumayı doğruladı. Handoff ve delivery servisleri değişmeden mevcut server-side scope kapıları kullanıldı. Hedef test, tam regresyon, TypeScript, production build ve `/api/ready` PASS. Bu yalnız synthetic/local kanıttır; Stripe/iyzico/Paraşüt/AV/e-posta provider sandbox sonucu değildir. Aktif sonraki mikro-faz `P-12D-02 — outbox claim/retry/dead-letter davranış kapıları`.

**P-12D-02 çıkış kanıtı (2026-09-06):** PASS. Outbox worker’ın lease (`lockedUntil/lockedBy`), attempt/backoff, permanent veya exhausted failure için dead-letter ve suppression/pause kontrolü mevcut davranış testleriyle doğrulandı; transactional sınıfın marketing pause/suppression’dan yanlışlıkla engellenmediği kanıtlandı. P-12D yerel replay kapıları tamamlandı; gerçek provider/AV/e-posta sandbox teslimatı hâlâ dış bağımlılıktır. Aktif sonraki mikro-faz `R-00-01 — refund/chargeback invoice state contract`.

**Çıkış:** Pending/failed scan, yanlış eşleşme, onaysız belge ve yetkisiz alıcı gönderilemez; hazır belge aynı transaction/idempotency kurallarıyla bir kez kuyruğa girer. Provider URL müşteriye taşınmaz. Bilinmeyen dış bağımlılıklar ayrı doğrulanmamış kayıt olarak kalır.

#### P-12D — Zincir replay ve gerçek sandbox kanıtı

**Durum:** TODO; P-12C’ye bağlı. **Tek çıktı:** Ödeme → draft → job → PDF → tarama/onay → document_ready → outbox zinciri için yerel replay ile gerçek test hesabı kanıtını ayrı kaydetmek. Retry, duplicate, gecikmiş belge ve cross-tenant senaryolarını mevcut servislerle çalıştır; test için alternatif başarı yolu yazma. Gerçek hesap/AV/teslimat yoksa P-12 yalnız LOCAL_PASS/PARTIAL kalır; live flag açılmaz. Daha önce ertelenmiş dış ödeme doğrulaması bu aşamadan önce geri çağrılır. R-00’a geçiş kararı bu kanıtla ve mevcut ürün sahibi erteleme sınırıyla yazılır; eksik entegrasyon sessizce atlanmaz.

---

### R-00 — Reconciliation ve refund incelemesi

**Dosyalar:** Payment reconciliation service, invoice state adapter, `tests/invoice-refund-reconciliation.test.mjs`.

**Tek çıktı:** Refund/chargeback durumunun invoice’i otomatik silmeden incelemeye alması.

**Çıkış kapısı:** İade “fatura yok” olarak işaretlenmiyor; credit note/iptal kararı mali kurala bırakılıyor.

**R-00-01 çıkış hedefi:** Refund/chargeback payment state’i invoice kaydını silmeden ve belgeyi public etmeksizin `review_required` inceleme durumuna taşınır; otomatik credit note/iptal iddiası üretilmez.

**R-00-01 çıkış kanıtı (2026-09-06):** PASS. `invoice-refund-reconciliation.ts`, yalnız verified payment state sözleşmesindeki `refunded`, `partially_refunded` veya `disputed` durumlarını kabul ediyor; refund/chargeback çelişkisini ve bilinmeyen state’leri fail-closed tutuyor. Invoice silme, public belge veya otomatik credit note/iptal iddiası üretmeden `refund_or_credit_note_review`, delivery hold ve manual accounting review sonucu veriyor. Hedef test, tam regresyon, TypeScript, production build ve `/api/ready` PASS. Bu contract henüz DB state mutation’a bağlanmadı; aktif sonraki mikro-faz `R-00-02`.

**R-00-02 çıkış kanıtı (2026-09-06):** PASS. `invoice-state.ts`, pending/provider/delivery durumlarından `refund_or_credit_note_review` geçişini açıkça izinli hale getirdi. `invoice-refund-reconciliation-persistence.ts`, verified refund/chargeback contract'ını workspace + invoice scope içinde transaction ve compare-and-set ile kalıcı review state'ine alıyor; tekrar çağrı duplicate, yarış state değişimi fail-closed, audit kaydı redacted metadata içeriyor. Belge public edilmiyor, credit note/iptal kararı otomatik verilmiyor. Hedef test, tam regresyon, TypeScript, production build ve `/api/ready` PASS. Payment webhook/retrieve caller bağlantısı aktif sonraki mikro-faz `R-00-03`.

**R-00-03 çıkış kanıtı (2026-09-06):** PASS. `payment-invoice-refund-handoff.ts`, yalnız verified payment state ve server-derived payment/invoice/workspace bağını kabul ederek `persistInvoiceRefundReview` sözleşmesine aktarım yapıyor. Cross-tenant, eksik invoice ve doğrulanmamış state fail-closed; PII/provider secret taşınmıyor; duplicate/review sonucu korunuyor. Hedef test, tam regresyon, TypeScript, production build ve `/api/ready` PASS. Adapter henüz retrieve reducer transaction'ına bağlanmadı; aktif sonraki mikro-faz `R-00-04`.

**R-00-04 çıkış kanıtı (2026-09-06):** PASS. Retrieve reducer, yalnız normalize edilmiş retrieve sonucundaki `refunded`, `partially_refunded` veya `disputed` payment state’lerinde invoice kaydını aynı payment transaction’ı içinde sorgulayıp `paymentOrderId + workspaceId` kapsamıyla handoff’a iletiyor. Invoice review geçişi transaction client üzerinde CAS ile `refund_or_credit_note_review` durumuna alınıyor ve redacted audit kaydı yazılıyor; handoff bloklanırsa hata transaction dışına taşınarak payment/lease/invoice değişikliklerinin birlikte rollback edilmesini sağlıyor. Non-refund retrieve yolu ve claim-loss davranışı korunuyor; fatura silme, belge public etme veya otomatik credit note iddiası yok. Hedef test, tam regresyon, TypeScript, production build ve `/api/ready` PASS. Provider webhook refund/chargeback mapping ve gerçek sandbox kanıtı bu mikro-fazın dışındadır; aktif sonraki mikro-faz `R-00-05`.

**R-00-05 hedefi:** Provider webhook inbox’ındaki doğrulanmış refund/chargeback olaylarını mevcut normalized payment transition ve R-00-04 handoff’una bağlamak; event mapping bilinmiyorsa fail-closed bırakmak. Bu faz provider dış çağrısı yapmaz ve gerçek sandbox kanıtı üretmez.

**R-00-05 çıkış kapısı:** Stripe/iyzico event metadata’sı imza ve payment/workspace kapsamı doğrulanmadan refund/chargeback state mutation yapamaz; duplicate webhook aynı sonucu verir; başarılı mapping mevcut transaction reducer/handoff yolunu kullanır; desteklenmeyen veya çelişkili event `ignored` kalır.

**R-00-05 çıkış kanıtı (2026-09-06):** PASS. `payment-webhook-processing.ts`, `charge.refunded` olayını yalnız `REFUNDED` veya `PARTIALLY_REFUNDED` provider status metadata’sı varsa normalize ediyor; `charge.dispute.created` olayını `disputed` durumuna normalize ediyor. Worker payment transition, workspace + provider payment identity ve signature-verified inbox koşullarını koruduktan sonra R-00-04 transaction-içi invoice handoff’unu çağırıyor; eksik refund sınıflandırması, duplicate veya çelişkili event fail-closed kalıyor. Hedef webhook/mapping testleri, tam regresyon, TypeScript, production build ve `/api/ready` PASS. Mevcut Stripe route charge event’lerinde `payment_intent` ve `amount_refunded` metadata’sını henüz canonical biçimde saklamadığı için gerçek Stripe charge refund korelasyonu R-00-06’ya bırakıldı.

**R-00-06 hedefi:** Stripe webhook inbox route’unda `charge.refunded` ve `charge.dispute.created` olayları için payment order ile eşleşen `payment_intent` kimliğini `providerPaymentId` olarak saklamak; refund event’inde `amount_refunded` ile `REFUNDED`/`PARTIALLY_REFUNDED` sınıflandırmasını üretmek. Charge kimliği veya refund miktarı güvenle çözülemiyorsa olay alınabilir ancak worker tarafından mutation’a sokulmaz.

**R-00-06 çıkış kapısı:** Stripe charge event’leri charge ID ile PaymentIntent ID’yi karıştırmaz; amount/currency ve signature kontrolleri korunur; raw payload persist edilmez; canonical correlation yoksa `payment_order_not_found`/`ignored` sonucu dışında state mutation oluşmaz.

**R-00-06 çıkış kanıtı (2026-09-06):** PASS. `src/app/api/webhooks/stripe/[connectionId]/route.ts`, refund/dispute charge olaylarında varsa `payment_intent` değerini canonical `providerPaymentId` olarak alıyor ve charge ID’ye fallback yapmıyor. `charge.refunded` için `amount_refunded` yalnız toplam tutarla sınırlandırılmış geçerli bir integer olduğunda `REFUNDED` veya `PARTIALLY_REFUNDED` metadata’sı üretiyor; eksik/geçersiz değer worker’ın refund mutation’ına girmiyor. Raw provider payload ve secret persist edilmiyor; imza, inbox idempotency ve non-charge extraction korunuyor. Hedef route/worker testleri, tam regresyon, TypeScript, production build ve `/api/ready` PASS. Gerçek Stripe sandbox kanıtı bu ortamda yok.

**R-00-07 hedefi:** iYzico refund/cancel/chargeback akışını resmi merchant sözleşmesi ve doğrulanmış provider event/retrieve/API capability kanıtı olmadan varsaymamak; mevcut iYzico başarı/başarısızlık yolunu bozmadan provider-specific refund mutation’ı fail-closed bir capability/contract kapısına almak. Bu faz canlı iYzico çağrısı yapmaz ve bilinmeyen event adını icat etmez.

**R-00-07 çıkış kapısı:** iYzico için yalnız doğrulanmış ödeme kimliği, workspace/connection kapsamı ve açıkça desteklenen refund/chargeback kanıtı ile normalize edilmiş sonuç işlenebilir; bilinmeyen event, cancel ile refund karışıklığı, eksik capability veya imzasız/tenant dışı kayıt `ignored`/blocked kalır. R-00-04 handoff’u dışında invoice silme, otomatik credit note/iptal veya public belge işlemi oluşmaz. Mevcut `SUCCESS`/`FAILURE` ve retrieve davranışı korunur; test, TypeScript, build, `/api/ready` ve workflow verify PASS olmadan faz kapanmaz.

**R-00-07A revizyon notu:** İlk `R-00-07` baseline’ı route-truth testinin allowed-files listesinde eksik olması nedeniyle workflow kapanışına ulaşmadı; mevcut canonical HPP token düzeltmesi korunarak yalnız revizyon paketiyle doğrulanıyor. Bu revizyon, resmi iYzico refund/cancel/chargeback event sözleşmesi doğrulanana kadar bu olayların mutation’a açılmaması için negatif regression test kapısını ekler.

**R-00-07A çıkış kapısı:** iYzico normalization yalnız doğrulanmış ödeme event allowlist’i ve `SUCCESS`/`FAILURE` statuslarında sonuç üretir; `REFUND`, `CANCEL`, `CHARGEBACK` ve bilinmeyen event/status değerleri `null`/ignored kalır. HPP order eşleştirmesi checkout token, direct order eşleştirmesi paymentId üzerinden yapılır. Hedef test, tam regresyon, TypeScript, production build, `/api/ready` ve workflow verify PASS olmadan `R-01` başlamaz.

**R-00-07A çıkış kanıtı (2026-09-06):** PASS. iYzico HPP webhook’ta payment order referansı Checkout Form initialize akışında persist edilen token’a, direct webhook’ta paymentId’ye canonical olarak bağlandı. Normalization allowlist’i yalnız doğrulanmış ödeme event’lerini ve `SUCCESS`/`FAILURE` statuslarını kabul ediyor; refund/cancel/chargeback ve bilinmeyen değerler fail-closed kalıyor. Hedef test, tam 251 dosyalık regresyon, TypeScript, production build, `/api/ready` ve workflow verify PASS. Resmi iYzico refund/cancel/chargeback merchant sözleşmesi veya gerçek sandbox sonucu doğrulanmadığı için bu mutation kapsamı açılmadı.

**R-01 hedefi:** Fatura, ödeme, belge, export/import, issue/send/resend ve provider connection olaylarının audit read modelini redacted biçimde sunmak. Actor e-postası, PII, token, secret, kart verisi, raw provider response ve belge içeriği UI/API çıktısına taşınmayacak.

**R-01 çıkış kapısı:** Audit route yalnız authenticated ve yetkili workspace kullanıcısına bounded, redacted DTO döndürür; actor email/PII ve JSON içindeki hassas anahtarlar maskelenir veya kaldırılır. Kaydetme tarafındaki güvenli metadata korunur; route parse hatasıyla 500 üretmez ve public endpoint audit verisi açmaz. Hedef test, tam regresyon, TypeScript, production build, `/api/ready` ve workflow verify PASS olmadan R-02 başlamaz.

**R-01 çıkış kanıtı (2026-09-06):** PASS. `audit-redaction.ts` yalnız tanımlı güvenli metadata anahtarlarını bounded derinlik/öğe/uzunluk sınırlarıyla döndürüyor; bilinmeyen anahtarlar, PII, token, secret ve belge içeriği çıkarılıyor; geçersiz JSON güvenli redacted işaretiyle dönüyor. Audit route actor kaydını yalnız internal id ile veriyor, ham JSON parse etmiyor ve mevcut authenticated workspace/policy/bounded query sınırını koruyor. Hedef audit/security testleri, tam 251 dosyalık regresyon, TypeScript, production build, `/api/ready` ve workflow verify PASS.

**R-02 hedefi:** Form, payment order, invoice record, invoice document/ready state, delivery state ve temel yanıt bağlamını tek authenticated invoice-center read modelinde birleştirmek; tüm sorguları aynı workspace scope ve bounded pagination/filter ile yapmak.

**R-02 çıkış kapısı:** Fatura merkezi DTO’su public kullanıcıya açılmaz; recipient PII yalnız mevcut authenticated invoice DTO/izin sınırıyla gerektiği kadar verilir; raw document/provider payload, secret ve token dönmez. Payment/refund/dispute, invoice/document ve delivery eksenleri tek bir “ödendi” alanına indirgenmez. Form seçimi form/ödeme/fatura/yanıt ilişkisini koparmaz; hedef test, tam regresyon, TypeScript, build, `/api/ready` ve workflow verify PASS olmadan R-03 başlamaz.

**R-02 çıkış kanıtı (2026-09-06):** PASS. `invoice-center-read-model.ts` form, submission, payment, invoice, document ve delivery durumlarını ayrı ve tenant-safe alanlarda birleştiriyor; query `workspaceId` ile scope ediliyor, `limit` bounded ve cursor ile devam ediyor. Recipient snapshot/PII, raw provider/document payload, secret ve token seçime alınmıyor; route yalnız authenticated `readInvoices` yetkisiyle ve `private, no-store` header’ı ile çalışıyor. Hedef read-model/PII testleri, tam 251 dosyalık regresyon, TypeScript, production build, `/api/ready` ve workflow verify PASS.

**R-03 hedefi:** Fatura merkezi UI’sında tekil, seçili ve filtrelenmiş toplu export/import/send aksiyonlarını gerçek handler ve server contract’larına bağlamak; payment/invoice/document/delivery uygunluk durumlarını kullanıcıya açık göstermek.

**R-03 çıkış kapısı:** UI hiçbir handler’sız veya kapsamı doğrulanmamış aksiyonu aktif göstermez. Pending/refunded/disputed, document-ready olmayan veya yetkisiz kayıtlar server tarafında tekrar reddedilir; toplu işlem öncesi seçili/uygun/engelli sayıları ve risk onayı görünür; duplicate idempotency korunur. Hedef component/UI contract testi, tam regresyon, TypeScript, build, `/api/ready` ve workflow verify PASS olmadan R-04 başlamaz.

**R-03 çıkış kanıtı (2026-09-06):** PASS. `InvoiceCenterView`, seçilen form workspace’ine bağlandı; gerçek export/import endpoint’lerini kullanıyor, seçim ve uygunluk sayımlarını gösteriyor, payment/invoice/document/delivery eksenlerini ayrı tutuyor. Refund-like veya succeeded olmayan kayıtlar export uygunluğundan çıkarılıyor; toplu gönderim server contract’ı hazır olmadığı için disabled ve nedeni UI’da belirtiliyor. Hedef UI/action ve ilgili fatura testleri, tam 251 dosyalık regresyon, TypeScript, production build, `/api/ready` ve workflow verify PASS.

**R-04 hedefi:** Fatura merkezi ve form yanıtları ekranlarını desktop/tablet/mobile viewport’larda taşmasız, keyboard erişilebilir ve rol sınırları görünür olacak şekilde doğrulamak ve gerekli küçük UI düzeltmelerini yapmak.

**R-04 çıkış kapısı:** Kart/tablolar, sağ panel ve action satırları yatay taşmaz; dar viewport’ta hiçbir kritik action görünmez kalmaz. Yetkisiz kullanıcıda export/import/send ve PII action’ları görünmez veya disabled nedeni ile açıklanır; focus/label/aria kontrolleri geçer. Browser test, tam regresyon, TypeScript, build, `/api/ready` ve workflow verify PASS olmadan R-05 başlamaz.

**R-04 revizyon notu (2026-09-06):** İlk `R-04` paketi, repository’de bulunmayan `tests/role-ui.test.mjs` dosyasını zorunlu read olarak içerdiği için workflow verify aşamasında kapatılmadı. R-03’ün doğrulanmış `invoice-center-view.tsx` kanıtı korunarak bu dosyaya yapılan geçici aria değişiklikleri geri alındı; eksik paket read’i düzeltilmiş `R-04A` ile yalnız `submissions-view.tsx` responsive toolbar yüzeyinde çalışılacak.

**R-04A hedefi:** R-04’ün eksik paket read sorununu düzeltmek; yanıtlar ekranındaki arama/durum/action toolbar’ının dar viewport’ta sarılmasını ve mevcut fatura merkezi responsive sözleşmesinin gerçek UI davranışıyla hizalanmasını sağlamak.

**R-04A çıkış kapısı:** `R-03` receipt dosyaları byte/hash olarak korunur; responsive toolbar dar ekranda yatay taşmaz; veri/API sözleşmelerine dokunulmaz; hedef responsive test, tam regresyon, TypeScript, production build, `/api/ready` ve workflow verify PASS olmadan `R-05` başlamaz.

**R-04A çıkış kanıtı (2026-09-06):** PASS. `submissions-view.tsx` yanıt arama alanına erişilebilir label eklendi ve response action grubu dar viewport’ta `flex-wrap` ile sarılıyor; ödeme/fatura/belge/teslimat veri sözleşmelerine dokunulmadı. R-03’ün doğrulanmış `invoice-center-view.tsx` hash’i korundu. Hedef responsive contract, mevcut responsive/a11y ve submissions layout testleri, tam 251 dosyalık regresyon, TypeScript, production build, `/api/ready` ve workflow verify PASS. Browser dar viewport gözleminde 390×844 ve 768×1024 için yatay taşma ve viewport dışı interactive action bulunmadı. Bağımsız role/release ve gerçek provider teslimat kapıları ayrıdır.

**R-05 hedefi:** Manuel ödeme/fatura akışının mevcut server sözleşmelerini tek local replay testiyle birleştirmek: yalnız uygun succeeded ödeme → export/import → document-ready → transactional delivery enqueue.

**R-05 çıkış kapısı:** Pending/refunded/disputed ödeme veya hazır olmayan belge zincire giremez; duplicate import/ready/enqueue yeni kalıcı kayıt oluşturmaz; recipient PII, provider secret ve raw payload test çıktısına yazılmaz. Hedef test, ilgili invoice zincir testleri, tam regresyon, TypeScript, production build, `/api/ready` ve workflow verify PASS olmadan `R-06` başlamaz.

**R-05 çıkış kanıtı (2026-09-06):** PASS. `invoice-manual-chain.test.mjs`, server aday seçimiyle yalnız succeeded/paid ve tenant kapsamındaki ödemeyi seçti; processing/refunded adayları dışarıda bıraktı. Onaylı import replay aynı batch/row idempotency fence’iyle ikinci invoice uygulaması üretmedi. Issued + approved + clean quarantine koşulları document-ready transition’dan transactional e-posta delivery command’ına bağlandı; document-ready olmayan state reddedildi ve sabit delivery idempotency anahtarı korundu. Hedef R-05 zincir testleri, ilgili import/document/delivery testleri, tam regresyon, TypeScript, production build, `/api/ready` ve workflow verify PASS. Provider sandbox, AV ve gerçek e-posta teslimatı bu kanıtın kapsamında değildir.

**R-06 hedefi:** Paraşüt API v4 sandbox sözleşmesiyle OAuth → contact/product → sales invoice → async job → active document/PDF → document-ready → transactional delivery akışını provider çağrısı açmadan doğrulanabilir bir adapter/replay kapısında birleştirmek.

**R-06 çıkış kapısı:** Gerçek sandbox veya resmi mock sözleşmesi olmadan provider mutation/live flag açılmaz; credential/raw response/PDF public veya log’a taşınmaz; OAuth, numeric company/job scope, polling timeout, PDF quarantine ve delivery idempotency korunur. Hedef test, tam regresyon, TypeScript, production build, `/api/ready` ve workflow verify PASS olmadan `R-07` başlamaz.

**R-06 çıkış kanıtı (2026-09-06):** PASS. `parasut-release-chain.test.mjs`, Paraşüt v4 server-only akışının sözleşme zincirini provider çağrısı yapmadan doğruladı: yalnız succeeded payment + `paid_ready_for_invoicing` payload hazırlanıyor; numeric company/contact/product/job kapsamı ve bounded async job durumları korunuyor; active document/PDF descriptor private app document URL’ye bağlanıyor; delivery yalnız `document_ready` + clean quarantine koşulunda transactional queue komutu üretiyor. Pending/refunded kayıtlar ve provider URL/token/raw response sızıntısı fail-closed kaldı. Hedef Paraşüt contract/mapper/job/PDF/OAuth ve delivery testleri, tam 251 dosyalık regresyon, TypeScript, production build, `/api/ready` ve workflow verify PASS. Gerçek Paraşüt sandbox/provider mutation bu kanıtın kapsamında değildir.

**R-07 hedefi:** Ödeme ve fatura entegrasyon yüzeylerinde güvenlik regresyon taraması: BOLA/IDOR, SSRF, PII/secret log-export, PDF/upload, rate-limit ve public/private sınırları.

**R-07 çıkış kapısı:** Kritik/yüksek güvenlik bulgusu çözülmeden sonraki faza geçilmez; bulgu yoksa kapsamı ve test kanıtı kaydedilir. Gerçek provider credential veya canlı mutation kullanılmaz. Hedef güvenlik testleri, tam regresyon, TypeScript, production build, `/api/ready` ve workflow verify PASS olmadan `R-08` başlamaz.

**R-07 bulgu notu (2026-09-06):** BLOCKED. `src/app/api/invoices/[id]/documents/[documentId]/route.ts` auth, invoice capability, workspace/record scope, `scanStatus=clean`, `readyAt` ve storage-root sınırlarını uyguluyor; ancak database `where` sorgusunda explicit `visibility: 'private'` koşulu yok. Bu, public unauthenticated erişimin kanıtı değildir; authenticated invoice-read sınırında private document invariant’ı için defense-in-depth açığıdır. R-07 güvenlik kapısı bu düzeltilmeden PASS sayılmayacaktır.

**R-07A hedefi:** Document retrieval sorgusuna explicit private visibility koşulu eklemek ve security contract testini bu koşula bağlamak.

**R-07A çıkış kapısı:** Sadece aynı workspace’teki, aynı invoice’a bağlı, `visibility=private`, quarantined, clean ve ready belge döner; testler, tam regresyon, TypeScript, build, `/api/ready` ve workflow verify PASS olmadan `R-08` açılmaz.

**R-07A çıkış kanıtı (2026-09-06):** PASS. `src/app/api/invoices/[id]/documents/[documentId]/route.ts` sorgusuna explicit `visibility: 'private'` koşulu eklendi. Auth, invoice capability, workspace/record scope, quarantined state, clean scan, readyAt, storage-root containment ve private no-store response kontrolleri birlikte korundu. Hedef security/document route testleri, public-forbidden testi, tam regresyon, TypeScript, production build, `/api/ready` ve workflow verify PASS.

**R-07B hedefi:** Document-ready delivery alıcısı, form title ve invoice metadata’sını durable invoice/paymentOrder/submission scope’undan server-side türetsin; request body yalnız izin verilen karar/approval kanıtı olsun.

**R-07B çıkış kapısı:** Client recipient değiştiremez; cross-tenant veya başka submission alıcısına delivery üretilemez; hedef route/contract testleri, tam regresyon, TypeScript, build, `/api/ready` ve workflow verify PASS olmadan R-07C başlamaz.

**R-07B çıkış kanıtı (2026-09-06):** PASS. Ready route artık recipientEmail, formTitle, invoiceNumber ve submissionId request body alanlarını okumuyor. `invoice-document-ready-caller.ts`, authenticated workspace bağlamında InvoiceRecord → PaymentOrder → Form ve encrypted InvoiceRecipientSnapshot kaydını server-side okuyor; form title, invoice number, submission ve alıcı e-postası kalıcı kayıtlardan türetiliyor. Snapshot workspace/submission eşleşmesi veya PII çözme başarısızsa akış outbox çağrısı yapmadan fail-closed kalıyor. Hedef caller/route/security testleri, 258 dosyalık tam regresyon, TypeScript, production build ve `/api/ready` PASS. Gerçek provider/e-posta teslimatı doğrulanmadı; R-07C production cookie/HSTS kapısıdır.

**R-07 güvenlik incelemesi ek bulguları (2026-09-06):** Bağımsız source review, `src/lib/auth.ts:138-146` production session cookie’sinde `Secure` koşulunun eksik olduğunu (CWE-614, medium/high confidence) ve `src/app/api/invoices/[id]/documents/[documentId]/ready/route.ts:41-59` recipientEmail/formTitle/invoiceNumber değerlerinin request body’den delivery zincirine taşındığını (CWE-639, medium/high confidence) bildirdi. Bunlar R-07A’ya yığılmayacak; sırasıyla R-07C ve R-07B mikro-fazlarına ayrıldı. Public unauthenticated belge erişimi kanıtlanmadı; bulgular mevcut auth/workspace/ready sınırlarıyla birlikte değerlendirilecek.

**R-07B hedefi:** Document-ready delivery alıcısı, form title ve invoice metadata’sını durable invoice/paymentOrder/submission scope’undan server-side türetsin; request body yalnız izin verilen karar/approval kanıtı olsun.

**R-07B çıkış kapısı:** Client recipient değiştiremez; cross-tenant veya başka submission alıcısına delivery üretilemez; hedef route/contract testleri, tam regresyon, TypeScript, build, `/api/ready` ve workflow verify PASS olmadan R-07C başlamaz.

**R-07C hedefi:** Session cookie’nin production HTTPS güvenlik niteliğini server-side koşulla garanti etmek; local development davranışı açıkça sınırlamak ve deployment/HSTS varsayımını belgelemek.

**R-07C çıkış kapısı:** Production cookie Secure olur; local-only istisna production’a sızmaz; auth/session regression, tam regresyon, TypeScript, build, `/api/ready` ve workflow verify PASS olmadan R-08 başlamaz.

**R-07C çıkış kanıtı (2026-09-06):** PASS. `src/lib/auth.ts` session cookie Secure niteliğini `NODE_ENV === 'production'` ile server-side zorunlu kılıyor; local HTTP istisnası production'a taşınmıyor. `src/middleware.ts` production response'larında `Strict-Transport-Security: max-age=31536000; includeSubDomains` gönderiyor ve uygulama rotalarını static asset hariç kapsıyor. Cookie/HSTS sözleşme testi, 259 dosyalık tam regresyon, TypeScript, production build, `/api/ready` ve workflow verify PASS. Gerçek production TLS sonlandırması, reverse-proxy trust ve domain deployment kanıtı bu ortamda doğrulanmadı; R-08 worker restart/restore provasıdır.

### R-01 — Audit olayları

**Dosyalar:** `src/app/api/audit/route.ts`, invoice services, test.

**Tek çıktı:** Export/import/apply/upload/issue/send/resend/connection olaylarının redacted audit kaydı.

**Çıkış kapısı:** PII, token veya belge içeriği audit mesajına yazılmıyor.

### R-02 — Fatura merkezi read model

**Dosyalar:** Invoice list route/query, test.

**Tek çıktı:** Form, ödeme, invoice, belge ve delivery durumlarını tek satırda birleştiren güvenli DTO.

**Çıkış kapısı:** Kullanıcı bir forma girdiğinde ödeme/fatura/yanıt bağlamı ayrışmıyor; public kullanıcı bu DTO’yu alamıyor.

### R-03 — Toplu işlem UI

**Dosyalar:** `src/components/mavenforms/views/*` içinde fatura merkezi bileşeni, component test.

**Tek çıktı:** Tekil/seçili/filtrelenmiş toplu export/import/send aksiyonları.

**Çıkış kapısı:** Butonlar handler’sız veya aktifmiş gibi görünmüyor; sonuç sayısı ve risk onayı var.

### R-04 — Responsive ve rol UI kontrolü

**Dosyalar:** Fatura merkezi ve form yanıtları ekranları, browser test.

**Tek çıktı:** Desktop/tablet/mobile layout, maskeli PII ve rol bazlı aksiyon görünürlüğü.

**Çıkış kapısı:** Kart/list/table overlap yok; yatay taşma ve görünmeyen action yok.

### R-05 — Uçtan uca manual akış

**Dosyalar:** E2E fixture/test.

**Tek çıktı:** Paid → selected export → muhasebe import → PDF upload → document ready → email sent.

**Çıkış kapısı:** Pending/refunded dışarıda; duplicate import/send yeni kayıt üretmiyor.

### R-06 — Uçtan uca Paraşüt test akışı

**Dosyalar:** Paraşüt sandbox/test adapter fixture ve E2E test.

**Tek çıktı:** OAuth → contact/product → sales invoice → inbox → async job → PDF → email.

**Çıkış kapısı:** Gerçek test hesabı veya resmi mock sözleşmesi ile her state kanıtlı; mock tek başına production uyumluluğu sayılmıyor.

### R-07 — Güvenlik ve veri sızıntısı taraması

**Dosyalar:** `tests/*`, security scan çıktıları.

**Tek çıktı:** BOLA/IDOR, SSRF, XXE, ZIP bomb, macro, PII log/export, secret exposure, rate limit ve upload kontrolleri.

**Çıkış kapısı:** Kritik/yüksek açık bulgu çözülmeden release yok.

### R-08 — Worker restart ve restore provası

**Dosyalar:** Runbook, test fixture, backup/restore kanıtı.

**Tek çıktı:** Worker durup başladığında invoice/job/outbox kaybı veya duplicate oluşmadığı kanıtı.

**Çıkış kapısı:** Recovery adımları yazılı ve tekrar edilebilir.

**R-08 çıkış kanıtı (2026-09-06):** PASS. `src/lib/outbox-worker.ts` expired lease taşıyan `sending` kayıtlarını claim sorgusuna dahil ediyor; mevcut `lockedUntil` compare-and-set lease kontrolü ve invoice/document idempotency fence korunuyor. `docs/runbooks/worker-restart-restore.md` disposable backup/checksum, restore `DATABASE_URL`, `prisma migrate deploy`, `/api/ready`, expired lease recovery, duplicate kontrolü ve production silme/reset yasağını yazılı hale getiriyor. Hedef recovery/worker/persistence testleri, 260 dosyalık tam regresyon, TypeScript, production build, `/api/ready` ve workflow verify PASS. Gerçek production backup/restore veya provider teslimatı doğrulanmadı; aktif sonraki mikro-faz `R-09`.

### R-09 — Mali müşavir kabul senaryosu

**Dosyalar:** Kabul raporu ve örnek anonymized fixture’lar.

**Tek çıktı:** Bireysel, şirket, e-Fatura, e-Arşiv, döviz, eksik veri, iade ve manuel belge senaryolarının iş onayı.

**Çıkış kapısı:** Mali/vergisel onay gerektiren noktalar yazılı; teknik testin hukuki onay yerine geçmediği belirtilmiş.

**R-09 çıkış kanıtı (2026-09-06):** PASS. `docs/acceptance/accounting-invoice-acceptance.md` sentetik/anonymized kabul matrisiyle TR şirket e-Fatura/e-Arşiv, bireysel/yurt dışı, eksik alıcı verisi, lookup hatası, TRY/USD minor-unit, iade/chargeback ve manuel belge senaryolarını mevcut policy/state/document-ready kapılarına bağladı. `tests/accounting-acceptance-matrix.test.mjs` ve ilgili alıcı/policy/state testleri geçti; tam regresyon `261 files`, TypeScript, production build, `/api/ready` ve workflow verify PASS. Gerçek mali müşavir/hukuk onayı, GİB güncel paketleri, provider sandbox/production, gerçek AV/e-posta ve backup/restore kanıtı dış bağımlılık olarak kaldı; teknik kabul bunların yerine geçmez. Aktif sonraki mikro-faz `R-10`.

### R-10 — Final release gate

**Çıkış kapısı:** `F-00..F-04`, `D-00..D-04`, `M-00..M-05`, `C-00..C-04`, `X-00..X-06`, `I-00..I-06`, `U-00..U-05`, `E-00..E-04`, `P-00..P-12`, `R-00..R-09` tamamlanmadan faturalama production’da açılmaz.

**R-10 çıkış kanıtı (2026-09-06):** NO-GO/BLOCKED. `RELEASE-DECISION.md` güncel final checkpoint olarak yerel kalite kanıtlarını gerçek dış bağımlılıklardan ayırıyor. Final gate testi, `release-decision` testi, tam regresyon `262 files`, TypeScript, production build ve `/api/ready` PASS; fakat gerçek Stripe/iyzico sandbox, Paraşüt/GİB ve mali müşavir/hukuk, AV/quarantine, gerçek transactional provider, production TLS/staging ve backup/restore kanıtları yok. Bu nedenle faturalama production’a açılmıyor ve sonraki release fazına izin verilmiyor.

**R-10A çıkış kanıtı (2026-09-06):** PASS. `docs/runbooks/r10-external-evidence-guide.md` dış doğrulama teslimini rol, belge, provider işlemi, redacted kanıt, ret koşulu ve güvenli paylaşım sınırlarıyla ayrıntılandırdı. `tests/r10-external-evidence-guide.test.mjs` rehber başlıklarını, secret/PII yasaklarını, `NO-GO`, `document_ready` ve `idempotency` kapılarını doğruluyor. Hedef test, tam regresyon `263 files`, TypeScript, production build, `/api/ready` ve workflow verify PASS. Bu rehber release’i açmaz; gerçek provider/GİB/mali-hukuki/AV/e-posta/deployment kanıtları gelene kadar R-10 NO-GO kalır.

### MAIL-GATE — Toplu e-posta release gate

**Çıkış kapısı:** [`2026-09-02-mavenforms-toplu-e-posta-teslim-edilebilirlik-ve-mail-platformlari.md`](./2026-09-02-mavenforms-toplu-e-posta-teslim-edilebilirlik-ve-mail-platformlari.md) içindeki `MAIL-00..MAIL-20` tamamlanmadan toplu fatura veya notification gönderimi production’da açılmaz.

---

## Ajanın her paket sonunda yazacağı rapor

```text
Paket: <ID>
Süre: <dakika>
Giriş kapısı: PASS/FAIL
Tek çıktı: <somut dosya, test veya karar>
Değişen dosyalar: <tam yollar>
Test komutu ve sonucu: <komut> → PASS/FAIL
Replay sonucu: <önceki paketler>
Güvenlik/PII sonucu: PASS/FAIL
Yeni risk: <yok veya somut risk>
Sonraki pakete izin: EVET/HAYIR
```

## Hata durumunda zorunlu davranış

- Test veya typecheck başarısızsa sonraki paket açılmaz.
- Provider timeout alınırsa aynı operation idempotency key ile önce mevcut sonuç aranır.
- Import conflict varsa otomatik çözüm yapılmaz.
- E-Fatura inbox lookup başarısızsa e-Arşiv seçimi otomatik yapılmaz.
- PDF hazır değilse geçici URL müşteriye gönderilmez.
- UI butonu endpoint’e bağlı değilse aktif görsel durum kaldırılır veya açıkça planlı gösterilir.
- Bir paket 15 dakikada bitmiyorsa kapsamı iki veya daha fazla pakete bölünür; eksik iş “tamamlandı” olarak raporlanmaz.

## Kaynak ve doğrulama

- [Paraşüt API v4 resmi dokümantasyonu](https://apidocs.parasut.com/)
- [Paraşüt API v4 resmi Swagger](https://apidocs.parasut.com/swagger.json)
- [GİB e-Arşiv Teknik Kılavuzu](https://ebelge.gib.gov.tr/dosyalar/kilavuzlar/e-Arsiv_Teknik_Kilavuzu_V.1.18.pdf)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP XML External Entity Prevention](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html)
- [OWASP Transaction Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)

## Planın tamamlanma ölçütü

Bu plan ancak tüm paketlerin kanıtları, hedefli test sonuçları, bağımsız güvenlik taraması, gerçek/test Paraşüt bağlantı doğrulaması, muhasebeci kabulü, rollback ve worker recovery raporu birlikte mevcutsa tamamlanmış sayılır. Sadece ekranın görünmesi, “Bağlandı” etiketi, mock response veya başarılı ödeme sonucu yeterli kanıt değildir.
