# MavenForms AI Release Execution Plan

> **For agentic workers:** This is the execution companion for `RELEASE-ROADMAP.md`. Read both files before changing code. Execute one micro-phase at a time. After every micro-phase, run its required checks and the regression gate before continuing.

**Goal:** First deliver a verified Maven internal form product (V1), then reach the first real product target: Maven first-party online payment plus the accountant-led manual invoice delivery pilot (V2). Paraşüt automation and tenant SaaS remain later, optional release tracks and must not be treated as prerequisites for the V1/V2 target.

**Architecture:** Keep the authenticated application, draft editor, workspace data and admin APIs private. At publish time, create a versioned, immutable, allowlisted `PublicFormSnapshot`. Direct links and every export mode consume only that public snapshot and a write-only public submission endpoint. Use iframe as the default external delivery boundary; use a versioned custom-element loader with strict CSS/DOM isolation for inline delivery.

**Tech Stack:** Next.js 16 standalone output, React 19, Bun, TypeScript, Prisma 6, SQLite for the controlled pilot or PostgreSQL/MySQL for multi-instance/high-concurrency deployment, Caddy reverse proxy, Playwright for browser evidence, Zod for runtime input/schema validation.

**Spec:** `D:\project\mavenform\RELEASE-ROADMAP.md`

**Execution control:** `D:\project\mavenform\IMPLEMENTATION-AUDIT-AND-MICROPHASE-PLAN.md` Bölüm 10’daki phase manifest, previous-lock, allowed-files, evidence ve bağımsız verifier kuralları bu yürütme planının zorunlu kapısıdır. Bu kontrol sistemi kurulmadan M01 ve sonraki feature fazları başlatılamaz.

## 0A. Değişmez ürün sürümü sırası ve ilk hedef

Kullanıcıya açılacak sürüm sırası teknik bağımlılık sırasından ayrıdır ve değişmez: **V1 Maven iç kullanım formları → V2 Maven first-party online ödeme + manuel fatura pilotu → V3 isteğe bağlı Paraşüt API v4 değerlendirmesi/otomasyonu → V4 çok ileri tenant SaaS**. İlk hedef, V1 çalışan iç kullanım ile V2’nin Maven adına gerçek ödeme alma ve muhasebecinin manuel fatura gönderim pilotunun tamamlanmasıdır. Teknik yürütme sırası yine PAY → manuel fatura → Paraşüt hazırlığı/kararı → belge güvenliği/document-ready → gerekli transactional delivery → pilot → FORM-UX → SAAS olarak korunur; ancak V3 ve V4’ün henüz yapılmamış olması V1/V2 geliştirmesini bloke etmez.

Her yeni özellik önce bu sürüm matrisindeki capability’ye bağlanır, sonra tek bir 15 dakikalık packet’e bölünür. Kullanıcı fikri teknik sırayı değiştirmiyorsa mevcut faza kabul kriteri olarak eklenir; değiştiriyorsa önce plan revize edilir. Bir capability’nin UI’da görünmesi, server-side entitlement/auth/scope/idempotency/audit/public-private kapıları geçmeden tamamlanmış sayılmaz. Ayrıntılı V1–V4 planı: `docs/superpowers/plans/2026-09-06-mavenforms-release-modules-first-party-saas-roadmap.md`.

### 0A.1 R-10’un sürüm bazlı uygulanması

R-10 ortak güvenlik standardıdır; tek bir blanket geliştirme kilidi değildir. Kapı sonucu sürüm ve ortamla birlikte değerlendirilir:

- **R-10/V1:** Online ödeme ve fatura kapalıyken güvenli iç kullanım, public form, yanıt ve manuel ödeme takibi için local/staging geliştirme ve iç test devam edebilir.
- **R-10/V2:** Maven first-party ödeme ve manuel fatura pilotu için iyzico merchant/sandbox, server doğrulamalı webhook/retrieve, belge karantinası/onayı, ayrı fatura sender’ı ve staging kanıtı zorunludur. Bu kanıtlar yoksa pilot/production mutation `NO-GO` kalır; credential’sız kod, test ve güvenli sözleşme geliştirmesi durmaz.
- **R-10/V3:** Paraşüt ve diğer ileri provider’lar kendi resmi API, muhasebe, GİB ve reconciliation kanıtlarını geçmeden `DEFERRED/NO-GO` kalır; bu kapı V2’nin manuel fallback’ini durdurmaz.
- **R-10/V4:** Tenant izolasyonu, BYO bağlantılar, destek erişimi ve abonelik ayrımı ayrıca kanıtlanmadan SaaS production açılmaz; V4 V2’nin ilk hedefinden sonra gelir.

Bu modelde `LOCAL_PASS` yalnız yerel teknik doğrulama, `PILOT_PASS` kontrollü first-party pilot ve `RELEASE_PASS` production açılışı anlamına gelir. Bir üst seviye kanıt yoksa alt seviye sonucu üst seviyeye yükseltilmez.

## 0B. Kontrollü lokal bakım yetkisi

Ürün sahibinin açık yetkisiyle, bir mikro-fazın uygulanması veya doğrulanması dosya kilidi, Prisma migration/client üretimi, build cache bakımı ya da port/proses çakışması nedeniyle gerçekten gerektirirse yalnız bu çalışma alanındaki `localhost:3000` MavenForms geliştirme sunucusu kontrollü olarak durdurulabilir. Bu yetki production/cloud sunucusunu, veritabanı resetini, veri silmeyi veya dosya silmeyi kapsamaz. Durdurma öncesi süreç/port ve çalışma durumu kontrol edilir; işlem sonrası server yeniden başlatılır, `/api/ready` ile DB hazır olduğu doğrulanır ve ilgili test, TypeScript, lint ve build kapıları yeniden çalıştırılır. Faz tamamlanmadan ve kullanıcıya bildirilmeden lokal server kapalı bırakılmaz.

## 0C. Güncel yürütme durumu — 2026-09-04

**Yetkili güncel durum (2026-09-05, P-12A sonrası):** `P-00..P-11` yerel test kapıları ve `P-12A — Kalıcı belge/fatura kapsamıyla teslimat kuyruğu` geçti. Aktif sonraki mikro-paket `P-12B — Önceki Paraşüt adapterlarının birleşik sınır denetimi`. P-12 bütün olarak tamamlanmış değildir. P-12A sırasında enqueue işleminin yalnız çağıran kodun clean/document_ready beyanına güvenmesi düzeltildi: aynı transaction içinde gerçek invoice/workspace/payment/form/submission ilişkisi ve belgenin invoice bağlantısı, private/quarantined/clean durumu okunuyor; koşullu geçiş ve duplicate yarış kurtarması aynı kapsamla korunuyor. 227 test dosyası, TypeScript, hedef lint, production build, `/` ve `/api/ready` geçti. Yeni persistence testi transaction double kullanır; gerçek Paraşüt/AV veya üretim veritabanı yarış testi kanıtı değildir. P-11 PDF’leri `scanStatus=pending` olarak kalır. Gerçek provider → belge → outbox pilotu doğrulanmadan live mode açılamaz. Aşağıdaki eski tarihli aktif-faz ifadeleri geçmiş kayıtlarıdır; güncel yürütme işaretçisi bu paragraftır.

- `PAY-06D-41..PAY-06D-54` kapsamındaki server-side retrieve, lease/worker, Stripe/iyzico adapter sınırı, timeout/redirect/API-version ve live-disable kontrolleri yerel sözleşme/test/build kapılarından geçti.
- Gerçek Stripe veya iyzico sandbox hesabı, gerçek test ödeme kimliği/token’ı ve sağlayıcı hesabı uygunluğu bu çalışma ortamında doğrulanmadı. Bu nedenle dış doğrulama `DEFERRED_BY_PRODUCT_OWNER` olarak kaydedildi; ödeme fazı release açısından hâlâ `BLOCKED/UNVERIFIED` durumundadır.
- Ürün sahibinin açık kararıyla geliştirme durmayacak; ancak yalnızca credential’sız sözleşme, veri modeli, manuel faturalama ve güvenli import/export hazırlığı sürdürülecek. Synthetic fixture hiçbir zaman gerçek provider veya release kanıtı sayılamaz.
- Dış sandbox doğrulaması, pilot ve production açılışından önce geri dönülmesi zorunlu bir release kapısıdır. `PAYMENT_LIVE_ENABLED=true` bu aşamada açılamaz.
- Güncel aktif mikro-faz: `P-03D — Server-only command store/worker wiring`. `M-00`–`M-05`, C-00..C-04, X-00..X-06, I-00..I-06 ve U-00..U-05 yerel sözleşme/test/regresyon kapılarından geçti. Önceki kapılar korunarak izlenebilir durumda tutuldu. Import zinciri quarantine → normalized schema → row validation → stable reference matching → read-only dry-run → approved/idempotent apply journal → import gate → PDF/XML file-type gate → XLSX/ZIP security gate → authenticated private document upload → hash/duplicate idempotency → read-only document match preview → fail-closed upload gate seviyesindedir. E-00 transactional şablon sözleşmesi, E-01 document-ready enqueue, E-02 worker retry/hata sınıflandırması, E-03 audit’li resend/suppression ve E-04 birleşik e-posta kapısı tamamlandı; P-00 provider-independent Paraşüt adapter sözleşmesi, P-01A OAuth state/token sözleşmesi, P-01B server-side start/callback transaction persistence, P-01C refresh rotation/CAS, P-02A company-scope health karar sözleşmesi, P-02B provider company discovery/health route, P-03A contact lookup/resolution, P-03B contact-create preparation/idempotency ve P-03C approved execution/reconcile tamamlandı. P-03D provider çağrısının yalnız server-only wiring, kapsam ve conditional status geçişleriyle bağlanacağı kapıdır. Marketing/campaign akışı açılmayacaktır. Gerçek provider sandbox, AV release ve Paraşüt issue yolu hâlâ kapalıdır; mali/hukuki belirsizlikler otomatik fatura başarısı değil, `accounting_review_required` durumuyla modellenmeye devam edecektir.

**P-02B durum düzeltmesi (2026-09-05):** P-02B PASS olarak tamamlandı. Resmi Paraşüt v4 Swagger’da doğrulanan `GET https://api.parasut.com/me?include=companies` şirket keşfi ve `GET https://api.parasut.com/v4/{company_id}/contacts?page[size]=1` kapsam sağlık kontrolü server-only istemciye bağlandı ([Paraşüt API v4 Swagger](https://apidocs.parasut.com/swagger.json)). Health route yalnız authenticated `integrations.manage` + MFA + same-origin isteği kabul ediyor; workspace/company kapsamı doğrulanmadan bağlantı `active` olmuyor. Token süresi dolmuşsa, provider 401/403/429/5xx veya ağ hatasında güvenli ve sınıflandırılmış durum dönüyor. Provider token, ham yanıt, credential envelope ve provider PII browser/audit response’a taşınmıyor; company seçimi otomatik yapılmıyor. Hedef test, tam runner `212 files`, TypeScript, lint ve production build PASS; `/api/ready` `200 {"status":"ready","db":"ok"}`. Gerçek Paraşüt hesabı/token ve canlı HTTP health çağrısı dış bağımlılık olarak hâlâ doğrulanmadı. Aktif sonraki mikro-faz `P-03A — Contact lookup/resolution`.

**P-03A durum düzeltmesi (2026-09-05):** P-03A PASS olarak tamamlandı. `src/lib/providers/parasut-contact.ts`, resmi `/v4/{company_id}/contacts` GET/POST JSON:API yüzeyine uygun güvenli lookup request’i, VKN/e-posta/name/tax office/city filtreleri, sayfalama üst sınırı, allowlist candidate parser ve deterministic contact resolution kararı sağlıyor. Tekil güçlü VKN/e-posta eşleşmesi bağlanabilir; sıfır sonuç yalnız yeterli alıcı kimliği ve hukuki ad ile `create_required` döner; belirsiz veya yalnız isim eşleşmesi manuel incelemeye gider. POST payload hazırlanabilir olsa da otomatik oluşturma ve kör retry yapılmadı; P-03B açık onaylı transaction hazırlığıdır. `ParasutContactRef` email eşleşmesini de taşıyacak şekilde güncellendi. Hedef test, tam runner `213 files`, TypeScript, lint ve production build PASS. Aktif sonraki mikro-faz `P-03B — Explicit contact create transaction preparation/idempotency`.

**P-03B durum düzeltmesi (2026-09-05):** P-03B PASS olarak tamamlandı. `ParasutContactCommand` migration/modeli workspace + request fingerprint benzersiz idempotency fence’i olarak eklendi. `prepareParasutContactCreateCommand` yalnız P-03A’nın `create_required` sonucundan ve açık `approvedById` bilgisinden sonra command metadata’sı üretiyor; provider isteği ve bearer token yalnız geçici execution değeri olarak kalıyor, persist edilebilir command nesnesine girmiyor. Persist katmanı unique-index yarışını duplicate olarak güvenle çözüyor; provider POST, kör retry ve dış yan etki bu mikro-fazda çalıştırılmadı. Hedef test, tam runner `214 files`, TypeScript, lint ve production build PASS. Prisma validate/migration deploy/client generate PASS; Windows dosya kilidi nedeniyle yalnız `localhost:3000` MavenForms geliştirme server’ı plan yetkisiyle kontrollü durdurulup işlem sonrası yeniden açıldı. `/api/ready` ve canlı `e2e`/security regresyon kontrolleri PASS. Gerçek Paraşüt hesabı/token/create çağrısı dış bağımlılık olarak doğrulanmadı. Aktif sonraki mikro-faz `P-03C — Approved provider contact create execution/reconcile`.

**P-03C durum düzeltmesi (2026-09-05):** P-03C PASS olarak tamamlandı. `parseParasutCreatedContactId` provider yanıtını yalnız JSON:API `contacts` tipindeki numeric ID’ye indirger. `executeParasutContactCreateCommand` yalnız status’u `approved`, güncel lookup fingerprint’i eşleşen ve request fingerprint’i yeniden hesaplandığında aynı olan komutu atomic claim sonrası tek kez çalıştırır. Başarılı 2xx + ID confirmed olur; 2xx ama belirsiz gövde, timeout/ağ istisnası veya claim yarışındaki belirsizlik `reconciliation_required`; 401/403 authentication, 429 rate limit, 5xx unavailable olarak sınıflanır ve otomatik retry yapılmaz. Provider raw body, error detail ve token sonuç DTO’suna girmez. Hedef test, tam runner `215 files`, TypeScript, lint, production build, canlı e2e/security ve `/api/ready` PASS. Gerçek Paraşüt contact create hesabı/canlı çağrısı dış bağımlılık olarak doğrulanmadı. Aktif sonraki mikro-faz `P-03D — Server-only command store/worker wiring`.

**Yetkili güncel aktif mikro-faz (2026-09-05):** `P-03E — Server-only execution worker wiring`. P-03D yalnız scoped command store olarak tamamlandı; P-03E başlamadan gerçek worker/route üzerinden provider çağrısı yapılmayacaktır.

**P-03D durum düzeltmesi (2026-09-05):** P-03D PASS olarak tamamlandı. `src/lib/parasut-contact-command-store.ts` yalnız server boundary’de Prisma command adapterı sağlar; scope closure workspace, connection ve numeric company ID ile kurulur. `approved → submitted` claim’i ve submitted → confirmed/reconciliation_required/failed geçişleri aynı kapsam koşullarıyla conditional `updateMany` üzerinden yapılır; başka worker veya tenant kaydı claim edemez. Fake-client davranış testi scope, claim tekrarını ve confirmed replay’i doğruladı. Hedef test, tam runner `216 files`, TypeScript, lint ve production build PASS; `/api/ready` 200/db ok ve canlı e2e/security regresyonları PASS. Gerçek worker/route çağrısı bu fazda bağlanmadı. Aktif sonraki mikro-faz `P-03E — Server-only execution worker wiring`.

**P-03E durum düzeltmesi (2026-09-05):** P-03E PASS olarak tamamlandı. `src/lib/parasut-contact-worker.ts` command, connection, source snapshot ve provider lookup sınırlarını server-only orchestration içinde birleştiriyor. Command workspace/connection/company kapsamı ve connection `active` durumu doğrulanmadan credential çözülmüyor; credential yalnız geçici bellekte kullanılıyor. Güncel lookup ve `create_required` kararı P-03C execution’a aktarılıyor; provider çağrısı public route’a açılmıyor. Worker `not_found`, `scope_mismatch`, `connection_unavailable`, `credential_unavailable`, `source_unavailable` ve `lookup_failed` durumlarını raw ayrıntı taşımadan döndürüyor. Hedef test, tam runner `217 files`, TypeScript, lint, production build, canlı e2e/security ve `/api/ready` PASS. Gerçek Paraşüt hesabı/canlı contact POST’u dış bağımlılık olarak doğrulanmadı. Aktif sonraki mikro-faz `P-04 — Product lookup/create`.

**P-04A durum düzeltmesi (2026-09-05):** P-04A PASS olarak tamamlandı. `src/lib/providers/parasut-product.ts`, resmi Paraşüt v4 `/v4/{company_id}/products` GET/POST JSON:API sözleşmesine uygun bounded product lookup, yalnız resmi `code`/`name` filtreleri, maksimum 25 sayfalama, allowlist candidate parser ve güvenli product resolution kararı sağlıyor. Tekil exact code eşleşmesi bağlanabilir; isim eşleşmesi veya çoklu sonuç sessiz eşleşmeye çevrilmeyip `manual_review_required` döner; sonuç yoksa geçerli isim için yalnız açık onay gerektiren `create_required` kararı üretilir. Create request yalnız yazılabilir alanları taşır; `stock_count`, `created_at` gibi read-only alanlar ve credential body’ye alınmaz. Bu mikro-faz provider POST çalıştırmıyor ve product command/worker yan etkisini açmıyor. Hedef test, tam test runner `218 files`, TypeScript, lint, production build ve `/api/ready` `200 {"status":"ready","db":"ok"}` PASS. Resmi dayanak [Paraşüt API v4 Swagger](https://apidocs.parasut.com/swagger.json); gerçek hesap/canlı product çağrısı dış bağımlılık olarak doğrulanmadı. Aktif sonraki mikro-faz `P-04B — Explicit product create preparation/idempotency`.

**P-04B durum düzeltmesi (2026-09-05):** P-04B PASS olarak tamamlandı. `ParasutProductCommand` migration/modeli ve `src/lib/parasut-product-command.ts` yalnız P-04A’nın `create_required` kararından, güncel lookup fingerprint’inden ve açık `approvedById` bilgisinden sonra metadata-only product command üretiyor. `src/lib/parasut-product-command-store.ts` gerçek Prisma adapter’ını workspace/connection/company scope ve unique request fingerprint ile bağlıyor; unique yarış duplicate olarak çözülüyor. Provider request/token yalnız geçici hazırlık değeridir; kalıcı command, response veya log’a yazılmaz. Provider product POST, worker ve otomatik retry bu mikro-fazda açılmadı. Ürün oluşturma işlemi onay olmadan ilerleyemez. Hedef test, tam test runner `219 files`, TypeScript, lint, production build, Prisma validate/migrate status, canlı e2e/security ve `/api/ready` PASS. Prisma client üretiminde Windows dosya kilidi oluştuğunda yalnız `localhost:3000` MavenForms geliştirme server’ı plan yetkisiyle kontrollü durduruldu, üretim tamamlanınca yeniden açıldı ve readiness doğrulandı. Gerçek Paraşüt hesabı/canlı product create dış bağımlılık olarak doğrulanmadı. Aktif sonraki mikro-faz `P-04C — Approved product create execution/reconcile`.

**P-04C durum düzeltmesi (2026-09-05):** P-04C PASS olarak tamamlandı. `executeParasutProductCreateCommand`, yalnız approved command, güncel `create_required` lookup kararı ve yeniden hesaplanan request fingerprint eşleşmesinden sonra atomic claim ile tek provider POST’a izin veriyor. 2xx/409 yalnız JSON:API `products` tipindeki numeric ID ile confirmed; 2xx belirsiz gövde ve timeout/ağ hatası `reconciliation_required`; 401/403 authentication, 429 rate limit, 5xx unavailable olarak normalize ediliyor. `ParasutProductCommand` scoped store’unda approved → submitted → confirmed/reconciliation_required/failed geçişleri workspace/connection/company koşullu update ile korunuyor. Token, raw provider body/error ve public execution route yok; blind retry yok. Hedef test, tam test runner `219 files`, TypeScript, lint, production build ve `/api/ready` PASS. Gerçek Paraşüt hesabı/canlı product POST’u dış bağımlılık olarak doğrulanmadı. Aktif sonraki mikro-faz `P-05 — Sales invoice payload`.

**P-05 durum düzeltmesi (2026-09-05):** P-05 PASS olarak tamamlandı. `src/lib/providers/parasut-v4-mappers.ts`, resmi `/v4/{company_id}/sales_invoices` JSON:API yapısında yalnız provider draft payload’ı üretir; contact relationship, product/detail relationship, ödeme `succeeded` durumu, `paid_ready_for_invoicing` kararı, immutable line toplamları, para birimi, miktar, KDV oranı ve tarih kontrollerini birlikte doğrular. Minor-unit değerleri kontrollü major-unit sayılara dönüştürülür; quantity × unit price + tax − discount ve line toplamı uyuşmazsa fail-closed kalır. Read-only invoice alanları, provider credential, raw response ve ağ çağrısı yoktur; yabancı para için exchange rate, order_no/order_date çifti ve tüm mapping koşulları zorunlu kapılara bağlıdır. Hedef mapper testi ve tam test runner `220 files`, TypeScript, lint, production build, canlı e2e/security ve `/api/ready` PASS. Resmi dayanak [Paraşüt API v4 Swagger](https://apidocs.parasut.com/swagger.json); gerçek draft POST dış bağımlılık olarak doğrulanmadı. Aktif sonraki mikro-faz `P-06 — Sales invoice draft create`.

**P-06 durum düzeltmesi (2026-09-05):** P-06 PASS olarak tamamlandı. `src/lib/parasut-sales-invoice-create.ts`, P-05 payload’ını resmi satış faturası draft POST sınırına bağlıyor; access token yalnız geçici Authorization header’da kullanılıyor. `InvoiceRecord` scoped atomic claim ile `queued → provider_draft_submitting` geçişi sağlayarak eşzamanlı worker’ın ikinci POST atmasını engelliyor. Numeric JSON:API `sales_invoices` ID’si ile `provider_draft_created`; timeout veya ID’siz 2xx/409 sonrasında yalnız `invoice_id` verilmişse resmi `GET /v4/{company_id}/sales_invoices?filter[invoice_id]=...` ile tekil kayıt reconciliation’ı deneniyor. Tekil numeric ID bulunamazsa `reconciliation_required`; reconciliation sorgusu hatası da aynı güvenli duruma düşüyor. 401/403, 422, 429 ve 5xx güvenli hata sınıflarına ayrılıyor. Başarılı replay provider’a yeniden gitmiyor. Hedef test, invoice state testi, tam test runner `221 files`, TypeScript, lint, production build ve `/api/ready` PASS. Gerçek Paraşüt hesabı/canlı draft POST dış bağımlılık olarak doğrulanmadı. Resmi dayanak [Paraşüt API v4 Swagger](https://apidocs.parasut.com/swagger.json); aktif sonraki mikro-faz `P-07 — E-Fatura inbox lookup`.

**P-07 durum düzeltmesi (2026-09-05):** P-07 PASS olarak tamamlandı. `src/lib/providers/parasut-einvoice-inbox.ts`, resmi `GET /v4/{company_id}/e_invoice_inboxes` endpoint’ini yalnız 10 haneli VKN, sayfa 1 ve maksimum 25 kayıtla bounded biçimde çağırıyor. JSON:API `e_invoice_inboxes` kaynakları doğrulanmadan `found=true` üretilmiyor; malformed response, auth, rate limit, provider unavailable ve network hataları normalized `ParasutResult` olarak ayrılıyor. Başarılı sonuç yalnız internal `taxNumber/found/checkedAt` snapshot’ı; public route, otomatik e-Arşiv kararı ve credential/raw provider response yok. Hedef test, tam test runner `222 files`, TypeScript, lint, production build ve `/api/ready` PASS. Resmi dayanak [Paraşüt API v4 Swagger](https://apidocs.parasut.com/swagger.json); gerçek Paraşüt hesabı/canlı VKN lookup dış bağımlılık olarak doğrulanmadı. Aktif sonraki mikro-faz `P-08 — E-Fatura/e-Arşiv karar servisi`.

**P-08 durum düzeltmesi (2026-09-05):** P-08 PASS olarak tamamlandı. `src/lib/invoice-document-type-policy.ts`, yalnız şirket + TR + geçerli 10 haneli VKN, başarılı ve eşleşen e-Fatura inbox snapshot’ı, işletmenin e-Fatura/e-Arşiv yetenekleri, otomatik sınıflandırma izni ve muhasebe onayı birlikte sağlandığında `e_invoice` veya `e_archive` sınıflandırması veriyor. Bireysel/yurt dışı/eksik VKN, lookup hatası, bozuk snapshot, yetenek eksikliği, bekleyen/reddedilmiş onay veya istenen tür çelişkisi `accounting_review_required` ile kapanıyor. `found=false` tek başına otomatik e-Arşiv kararı değil; yabancı satış/ihracat istisnaları bu fazda varsayılmıyor. Hedef test, tam test runner `223 files`, TypeScript, lint, production build ve `/api/ready` PASS. GİB dayanağı [e-Fatura uygulaması](https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Finfografikler%2Fpdfs%2F2025_e_fatura.pdf), [e-Arşiv uygulaması](https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Finfografikler%2Fpdfs%2Fe_arsiv_fatura.pdf); aktif sonraki mikro-faz `P-09 — Formalization job create`.

**P-09 durum düzeltmesi (2026-09-05):** P-09 PASS olarak tamamlandı. `src/lib/providers/parasut-formalization.ts`, P-08 classification sonucunu resmi Paraşüt v4 `POST /{company_id}/e_invoices` veya `POST /{company_id}/e_archives` sınırına bağlıyor. e-Fatura için yalnız `basic/commercial` senaryo ve doğrulanmış inbox adresi; e-Arşiv internet satışı veriliyorsa HTTPS URL, desteklenen ödeme tipi, ödeme aracısı için platform ve tarih doğrulanıyor. Yalnız HTTP `201` + JSON:API `trackable_jobs` numeric ID sonucu `formalization_pending` sayılıyor; nihai `issued` sonucu üretilmiyor. `InvoiceRecord` scoped atomic claim ile `provider_draft_created → formalization_submitting → formalization_pending` akışı ve `providerJobId` kalıcı olarak tutuluyor; timeout, 409 veya bozuk 201 sonucu `reconciliation_required`, auth/validation/rate-limit/5xx güvenli hata sınıflarına gidiyor. Credential yalnız geçici Authorization header’da, provider raw response kalıcı kayıtta değil. Hedef test, Prisma migration, TypeScript ve state geçişleri doğrulandı; tam test/build/live readiness kapıları bu fazın sonunda çalıştırılıyor. Resmi dayanak [Paraşüt API v4 Swagger](https://apidocs.parasut.com/swagger.json); gerçek Paraşüt hesabı/canlı e-belge oluşturma dış bağımlılık olarak doğrulanmadı. Aktif sonraki mikro-faz `P-10 — Bounded job polling`.

**C-02 durum düzeltmesi:** `C-02 PASS` olarak güncellenmiştir. `submissionToken` binding, yayınlanmış sürüm mapping’i, AES-256-GCM recipient capture, güvenli line snapshot ve doğrulanmış `succeeded` webhook transaction handoff’u çalışır durumdadır. Aktif sonraki mikro-faz `C-03 — PII response ve authorization`dır. Mapping veya PII encryption anahtarı yoksa otomatik fatura yerine `accounting_review_required` kullanılır.

**C-03 durum düzeltmesi:** `C-03 PASS` olarak güncellenmiştir. `invoices.read` yalnız `owner`, `admin` ve dar kapsamlı `accounting` rolüne verildi; `src/app/api/invoices/[id]/route.ts` sorguyu oturum workspace’iyle sınırlar ve public fatura endpoint’i açmaz. `invoice-pii-dto.ts` yalnız yetkili server sınırında kontrollü recipient görünümü üretir; encrypted envelope, storage key ve workspace ID response’a taşınmaz. `tests/invoice-pii-boundary.test.mjs`, tam test runner `180 files`, TypeScript, lint, production build ve `/api/ready` kapıları geçti. Aktif sonraki mikro-faz `C-04 — Müşteri veri kapısı`dır; manuel export veya Paraşüt fatura oluşturma C-00..C-04 tamamlanmadan açılmaz.

**C-04 durum düzeltmesi:** `C-04 PASS` müşteri-verisi özelliklerinin C-00..C-03 tamamlanmadan açılamayacağını kaydeden koruma kapısıdır. Bu kapı geçildikten sonra X-00..X-05 sıralı olarak manuel export hazırlığına ve kontrollü export endpoint’ine izin verdi; Paraşüt fatura oluşturma endpoint’i hâlâ açılmadı. `tests/invoice-customer-data-gate.test.mjs` bu geçmiş kapıyı ve Paraşüt yolunun kapalı kalmasını doğrular.

**X-00 durum düzeltmesi:** `X-00 PASS` yerel sözleşme olarak tamamlandı. `src/lib/invoice-candidates.ts` yalnız aynı workspace’teki doğrulanmış `PaymentOrder.status === succeeded` kayıtlarını, bağlı submission/yayın sürümü ve pozitif güvenli tutarla aday yapıyor; legacy payment status uyuşmazlığı, mevcut invoice, eksik bağ ve diğer terminal/ara durumlar dışarıda. Aktif sonraki mikro-faz `X-01 — Tekil ve selected seçim`dir.

**X-01 durum düzeltmesi:** `X-01 PASS` yerel sözleşme olarak tamamlandı. `invoice-batch-selection.ts` tekil veya selected ID’leri yalnız aynı workspace/form kapsamındaki X-00 adaylarından deterministik row snapshot’a çeviriyor; boş, duplicate, bulunamayan ve cross-scope seçimleri fail-closed reddediyor. Aktif sonraki mikro-faz `X-02 — Filtrelenmiş toplu seçim`dir.

**X-02 durum düzeltmesi:** `X-02 PASS` yerel sözleşme olarak tamamlandı. X-00 adaylarına tarih/status metadata’sı eklendi; `selectInvoiceBatchByFilter` tarih, form, currency ve status filtrelerini canonical snapshot’a çevirerek aynı workspace adaylarını deterministic row listesi, doğru adet ve minor-unit toplamıyla döndürüyor. Aktif sonraki mikro-faz `X-03 — Excel metadata üretimi`dir.

**X-03 durum düzeltmesi:** `X-03 PASS` yerel sözleşme olarak tamamlandı. `invoice-xlsx-export.ts` batch format sürümü, batch ID, türetilmiş row ID ve workspace bağlı opaque payment reference üretiyor; metadata-only XLSX tek görünür sheet ile oluşturuluyor. Macro, external link, formula ve hidden sheet yüzeyi reddedildi. Aktif sonraki mikro-faz `X-04 — Excel satır mapper`dır.

**X-04 durum düzeltmesi:** `X-04 PASS` yerel sözleşme olarak tamamlandı. `mapInvoiceInterchangeRow` yalnız doğrulanmış invoice snapshot’ından sabit interchange sütunları üretiyor; amount/tax/currency/provider/recipient alanlarında client veya form fiyatı kullanılmıyor. Spreadsheet formula başlangıçları güvenli metne dönüştürülüyor. Aktif sonraki mikro-faz `X-05 — Export endpoint`dir.

**X-05 durum düzeltmesi:** `X-05 PASS` olarak tamamlandı. `src/app/api/invoices/export/route.ts` yalnız authenticated `owner/admin/accounting` kullanıcılarına POST ile açılıyor; istek ve kayıtlar `ctx.workspace.id` ile tenant-scope ediliyor, yalnız `PaymentOrder.status === succeeded` ve seçilmiş `InvoiceRecord` kayıtları export ediliyor. XLSX server-side oluşturuluyor; batch, row snapshot hash’i ve `invoice.export` audit kaydı transaction içinde yazılıyor. Response `private, no-store`, attachment ve hassas müşteri verisi uyarısı taşıyor. Public ve Paraşüt route’u açılmadı. `tests/invoice-export-route.test.mjs` ve güncellenmiş müşteri-verisi gate testi PASS; TypeScript, lint ve production build PASS. Aktif sonraki mikro-faz `X-06 — Manuel export kapısı`dır.

**X-06 durum düzeltmesi:** `X-06 PASS` olarak tamamlandı. `createInvoiceInterchangeXlsx` sabit interchange sütunlarıyla aynı batch snapshot’ından aynı XLSX byte çıktısını üretir; `buildInvoiceXlsxMetadata` aynı batch/row snapshot için aynı opaque row ID ve payment reference değerlerini üretir. Satır uzunluğu/şema uyuşmazlığı fail-closed reddedilir. `tests/invoice-export-replay.test.mjs` metadata, row/reference, byte replay ve negatif schema senaryolarını doğrular; tam runner `188 files`, TypeScript, lint ve production build PASS. Aktif sonraki mikro-faz `I-00 — Import dosyası karantinası`dır. Paraşüt issue yolu açılmamıştır.

**I-00 durum düzeltmesi:** `I-00 PASS` olarak tamamlandı. `InvoiceImportBatch` tenant, uploader, private storage key, SHA-256, MIME, size ve quarantine state alanlarıyla migration’a eklendi. `src/lib/invoice-import-quarantine.ts` XLSX uzantısı, boyut, declared MIME, byte uzunluğu ve ZIP magic signature doğrulamasını parse etmeden yapıyor; route dosyayı `storage/invoice-imports/.../quarantine` altında private olarak yazıyor ve aynı transaction’da quarantine batch + audit kaydı oluşturuyor. Yalnız `owner/admin/accounting` ve `invoices.import` capability’siyle açılıyor; duplicate hash, invalid input ve path traversal fail-closed. Prisma validate/migration/client generate tamamlandı; gerekli Windows dosya kilidi nedeniyle yalnız 3000 portundaki lokal server kontrollü durdurulup yeniden açıldı. Tam runner `189 files`, TypeScript, lint, production build ve `/api/ready` PASS. Aktif sonraki mikro-faz `I-01 — Import schema parser`dır; dosya parse/AV release/uygulama hâlâ açılmadı.

**I-01 durum düzeltmesi:** `I-01 PASS` olarak tamamlandı. `src/lib/invoice-xlsx-import.ts` normalized worksheet için yalnız `invoice-batch-v1` ve canonical `INVOICE_REQUIRED_COLUMNS` sözleşmesini kabul ediyor; duplicate/unknown kolon, boş/yanlış metadata, satır genişliği ve sürüm hataları satır/kolon koduyla fail-closed dönüyor. Parser karantina dosyasını okumuyor ve invoice/payment state değiştirmiyor. `tests/invoice-xlsx-import-schema.test.mjs` PASS; tam runner `190 files`, TypeScript, lint ve production build PASS. Aktif sonraki mikro-faz `I-02 — Import row validator`dır; gerçek parse, AV taraması, approve/apply ve Paraşüt yolu hâlâ kapalı.

**I-02 durum düzeltmesi:** `I-02 PASS` olarak tamamlandı. `validateInvoiceImportRows` minor-unit tutarı, tax alanlarını, ISO currency, gerçek `YYYY-MM-DD` invoice date, invoice number/UUID ve recipient bilgisini doğruluyor. Biçimsel hata `invalid`, vergi/kimlik gibi mali belirsizlikler `review_required`, yalnız tam uygun satır `valid`; hata çıktısı değer/PII echo etmiyor. `invoice_date` mevcut v1 şemasını kırmadan I-01’de izinli opsiyonel kolon olarak tanındı ve I-02’de zorunlu hale getirildi. `tests/invoice-xlsx-import-validation.test.mjs` PASS; tam runner `191 files`, TypeScript, lint ve production build PASS. Aktif sonraki mikro-faz `I-03 — Stable reference matcher`dır; parse/AV/approve/apply ve Paraşüt yolu kapalı.

**I-03 durum düzeltmesi:** `I-03 PASS` olarak tamamlandı. `invoice-matching.ts` yalnız server-issued `row_id`, workspace/form kapsamlı `payment_reference`, doğrulanmış `provider_invoice_id`, `invoice_uuid` ve açıkça muhasebe tarafından onaylanmış `invoice_number` ile eşleştiriyor. Birden çok aday, tenant/form kapsam uyuşmazlığı veya farklı kararlı referansların farklı adaylara işaret etmesi fail-closed conflict döndürüyor; ad, e-posta, tarih ve tutar tek başına hiç kullanılmıyor. `tests/invoice-matching.test.mjs` PASS; tam runner `192 files`, TypeScript, lint ve production build PASS. Aktif sonraki mikro-faz `I-04 — Dry-run preview`dır; parse/AV/approve/apply ve Paraşüt yolu kapalı.

**I-04 durum düzeltmesi:** `I-04 PASS` olarak tamamlandı. `invoice-import-preview.ts` normalized/validated satır ve I-03 matcher sonucunu yalnızca deterministik `new/update/duplicate/unmatched/invalid/conflict` DTO’suna çeviriyor; mevcut fingerprint ile duplicate/update ayrımı yapıyor, eşleşmeyen/invalid/conflict satırlarda `canApply=false` bırakıyor. Girdi sırasını değiştirmeden row number’a göre deterministik sonuç veriyor, invoice/payment state, quarantine state, audit veya e-posta değiştirmiyor. `tests/invoice-import-preview.test.mjs` PASS; tam runner `193 files`, TypeScript, lint ve production build PASS. Aktif sonraki mikro-faz `I-05 — Approve/apply transaction`dır; gerçek XLSX parse, AV release, approve/apply ve Paraşüt yolu kapalı.

**I-05 durum düzeltmesi:** I-05 PASS olarak tamamlandı. InvoiceImportApplication batch/row idempotency journal modeli ve migrationı eklendi. invoice-import-apply.ts yalnız approvedById bulunan, canApply=true dry-run sonucunu satır bazında transaction içinde uygular; ilk çalışmada application callback ve journal aynı transaction sınırındadır, replayde journal bulununca callback tekrar çağrılmaz. Duplicate satırlar no-op olarak kaydedilir; callback hataları failed, karışık sonuçlar partial olarak raporlanır. Invalid/unmatched/conflict preview applya kapalıdır; servis e-posta veya delivery üretmez. Migration deploy, Prisma validate/client generate, hedef test, tam runner 194 files, TypeScript, lint ve production build PASS. Prisma client üretimi Windows dosya kilidi nedeniyle planlı lokal bakım yetkisiyle yalnız 3000 portundaki dev server durdurulup yeniden açıldı; readiness doğrulandı. Aktif sonraki mikro-faz I-06 — Import kapısıdır; gerçek XLSX parse, AV release ve Paraşüt issue yolu kapalı.

**I-06 durum düzeltmesi:** I-06 PASS olarak tamamlandı. invoice-import-gate.ts I-00, I-01, I-02, I-03, I-04 ve I-05 fazlarının tamamının pass olmasını ve dry-run canApply=true olmasını zorunlu kılıyor; eksik, unverified, blocked veya bilinmeyen/fazladan faz durumunda Uygula aktif olmuyor. Bu sunum kapısı apply servisinin server-side approval/idempotency kontrollerinin yerine geçmiyor. invoice-import-gate.test.mjs PASS; tam runner 195 files, TypeScript, lint ve production build PASS. Aktif sonraki mikro-faz U-00 — PDF/XML dosya türü kontrolüdür; gerçek document parse, AV release, Paraşüt issue ve dış provider yolları kapalı.

**U-00 durum düzeltmesi:** U-00 PASS olarak tamamlandı. invoice-document-validation.ts yalnız PDF/XML upload boundary kuruyor: extension/MIME eşleşmesi, boyut ve byte length, PDF %PDF- magic, UTF-8 XML başlangıcı ve SHA-256 doğrulanıyor; DOCTYPE, ENTITY ve xml-stylesheet dış kaynak yüzeyi parse edilmeden reddediliyor. Dosya parse edilmiyor, storage/document state/audit/delivery değiştirilmiyor. Hedef test, tam runner 196 files, TypeScript, lint ve production build PASS. Aktif sonraki mikro-faz U-01 — XLSX/ZIP güvenlik kontrolüdür; AV release ve document upload route’u kapalı.

**U-01 durum düzeltmesi:** U-01 PASS olarak tamamlandı. `invoice-document-validation.ts` XLSX ZIP paketini bounded biçimde doğruluyor: merkezi dizin/EoCD, ZIP64 ve multi-disk reddi, entry/toplam uncompressed limitleri, compression ratio, local-central header tutarlılığı, duplicate/path traversal, şifreleme ve unsupported compression kontrolleri var. VBA/macro-enabled content, executable entry, nested archive ve XML dış relationship/harici referansları fail-closed reddediyor; geçerli XLSX kabul ediliyor. Worksheet parse, AV release, document storage/state/audit/delivery açılmadı. `tests/invoice-document-archive.test.mjs` PASS; tam runner 197 files, TypeScript, lint ve production build PASS. Aktif sonraki mikro-faz U-02 — Invoice document upload route; `/api/ready` 200/db ok.

- Geçmiş faz kanıtı korunur: `C-02 — Payment snapshot’a bağlama` yürütme kaydı ve bağımlılıkları silinemez; sonraki mikro-fazlar bu kapıyı yeniden doğrular.

**U-02 durum düzeltmesi:** U-02 PASS olarak tamamlandı. `src/app/api/invoices/[id]/documents/route.ts` authenticated `owner/admin/accounting` ve `invoices.import` yetkisiyle invoice workspace/payment/form scope’unu doğruluyor; PDF/XML ve XLSX dosyalarını ilgili güvenlik kapılarından geçmeden yazmıyor. `invoice-document-storage.ts` yalnız private workspace/invoice/quarantine key üretiyor. Belge `pending` scan + `quarantined` state ile yazılıyor, audit transaction içinde tutuluyor ve response storage key/public URL/ham içerik taşımıyor. AV release, parse, document-ready, public download ve delivery açılmadı. Hedef U-02 testi ve plan bütünlüğü testi PASS; tam runner 198 files, TypeScript, lint, production build ve `/api/ready` 200/db ok. Aktif sonraki mikro-faz U-03 — Hash ve duplicate kontrolü.

**U-03 durum düzeltmesi:** U-03 PASS olarak tamamlandı. Invoice document upload route aynı `invoiceRecordId + artifactKind + sha256` kimliğini önce sorguluyor; mevcut belge varsa `duplicate: true` ile yeniden kullanıyor ve yeni delivery üretmiyor. Eşzamanlı unique constraint (`P2002`) yarışında geçici dosya temizlenip mevcut belge döndürülüyor. `tests/invoice-document-hash.test.mjs` ve U-02 testi PASS; tam runner 199 files, TypeScript, lint, production build ve `/api/ready` 200/db ok. Aktif sonraki mikro-faz U-04 — Belge-preview eşleştirmesi.

**U-04 durum düzeltmesi:** U-04 PASS olarak tamamlandı. `invoice-document-matching.ts` stable reference matcher ve fail-closed ready gate sağlıyor; ad/e-posta/tutar/tarih fallback’i yok, unmatched/ambiguous sonuçlar manuel onay gerektiriyor. `match-preview` route authenticated tenant/form/invoice/document scope’unda yalnız read-only preview döndürüyor ve state/delivery değiştirmiyor. Hedef U-04 testi PASS; tam runner 200 files, TypeScript, lint, production build ve `/api/ready` 200/db ok. Aktif sonraki mikro-faz U-05 — Upload kapısı.

**U-05 durum düzeltmesi:** U-05 PASS olarak tamamlandı. `invoice-document-upload-gate.ts` U-00..U-04 fazlarının tamamını exact `pass` ve `documentReadyAllowed=true` koşuluyla `canDownload`/`canDeliver` kararına bağlıyor; eksik, unverified, blocked veya bilinmeyen fazda fail-closed dönüyor. Gate yalnız sunum/erişim kararıdır; AV release, manuel approval mutation, document-ready state transition ve delivery worker açılmadı. Hedef U-05 testi PASS; tam runner 201 files, TypeScript, lint, production build ve `/api/ready` 200/db ok. Aktif sonraki mikro-faz E-00 — Fatura e-posta şablonu.

**E-00 durum düzeltmesi:** E-00 PASS olarak tamamlandı. `src/lib/invoice-email.ts` yalnız `document_ready` ve `scanStatus=clean` için transactional subject/body üretir; alıcı e-postasını normalize eder, başlık/gövdeyi sınırlar ve ortak `buildTransactionalEmail` politikasını kullanır. Form başlığı HTML olarak escape edilir; raw provider URL, kampanya içeriği ve secret template alanları kabul edilmez. Hedef E-00 testi, tam runner 202 files, TypeScript, lint ve production build PASS; `/api/ready` 200/db ok. Aktif sonraki mikro-faz E-01 — Document-ready enqueue.

**E-01 durum düzeltmesi:** E-01 PASS olarak tamamlandı. `invoice-delivery-enqueue.ts` güvenli E-00 çıktısını kullanarak yalnız `document_ready`, `scanStatus=clean`, private/quarantined belge ve açık alıcı koşullarında transactional delivery command üretir. Deterministik invoice/document/channel idempotency anahtarıyla `InvoiceDeliveryIntent` ve `OutboxEvent` aynı database transaction’ında oluşturulur; invoice yalnız beklenen mevcut state hâlâ `document_ready` ise `delivery_queued` olur. Önceden oluşmuş intent duplicate döner, provider gönderimi veya worker bu fazda çalışmaz. Hedef E-01 testi, tam runner 203 files, TypeScript, lint ve production build PASS; `/api/ready` 200/db ok. Aktif sonraki mikro-faz E-02 — Worker retry ve sınıflandırma.

**E-02 durum düzeltmesi:** E-02 PASS olarak tamamlandı. `invoice-delivery-retry.ts` güvenli hata kodu ve bounded retry sınıflandırması sağlıyor: bozuk payload/geçersiz alıcı/provider `rejected` veya `invalid` kalıcı dead-letter, bağlantı/HTTP/provider `failed` geçici retry; beşinci denemede her retry terminal oluyor. `outbox-dispatch-worker.ts` tüm failure yollarında bu ortak kararı kullanıyor ve provider ayrıntısı/secret loglamıyor. Hedef E-02 testi, mevcut dispatch-worker regresyonu, tam runner 204 files, TypeScript, lint ve production build PASS; `/api/ready` 200/db ok. Aktif sonraki mikro-faz E-03 — Resend ve suppression.

**E-03 durum düzeltmesi:** E-03 PASS olarak tamamlandı. `invoice-delivery-resend.ts` yalnız yetkili kullanıcı, verified document-ready, temiz private/quarantined belge ve transactional alıcı koşullarında çalışır. `all` suppression alıcıyı fail-closed durdurur; önceki teslimat açık onay yoksa `duplicate_warning` döner. `RESEND` onayı yeni resend idempotency anahtarıyla intent/outbox oluşturur ve aynı transaction’da audit yazar; invoice/document state’i değiştirilmez. Hedef E-03 testi, suppression/protection ve E-00 regresyonları, tam runner 205 files, TypeScript, lint ve production build PASS; `/api/ready` 200/db ok. Aktif sonraki mikro-faz E-04 — E-posta kapısı.

**E-04 durum düzeltmesi:** E-04 PASS olarak tamamlandı. `invoice-delivery-gate.ts` U-00..U-05 belge geçmişini ve E-00..E-03 e-posta geçmişini fail-closed biçimde birleştiriyor; verified document-ready, transactional sınıf, geçerli alıcı, suppression yokluğu, queued/sending delivery intent ve dispatch edilebilir outbox olmadan `canDeliver` açılmıyor. Hedef E-04 testi, ilgili belge/enqueue/resend regresyonları, tam runner 206 files, TypeScript, lint ve production build PASS; `/api/ready` 200/db ok. Aktif sonraki mikro-faz P-00 — Paraşüt adapter tipleri.

**P-00 durum düzeltmesi:** P-00 PASS olarak tamamlandı. `src/lib/providers/parasut-v4.ts` Paraşüt v4 için provider-independent adapter interface ve redacted result types sağlıyor; company scope, local idempotency, draft/formalization/job/document-ready ayrımı, normalized provider failure ve backend PDF bytes/hash sınırları tanımlı. Access/refresh token, raw response ve geçici provider linki domain sözleşmesine girmiyor. Hedef P-00 testi, tam runner 207 files, TypeScript, lint ve production build PASS; `/api/ready` 200/db ok. Aktif sonraki mikro-faz P-01 — OAuth callback ve token yenileme. Gerçek Paraşüt client/test company ve provider confirmation gerektiren davranışlar hâlâ dış bağımlılıktır.

**P-01A durum düzeltmesi:** P-01A PASS olarak tamamlandı. `src/lib/parasut-oauth.ts` authorization-code, exact callback URI, server-bound state hash, workspace/user binding, 10 dakikalık süre ve tek kullanımlı tüketim sözleşmesini sağlıyor; password grant fail-closed reddediliyor. `src/lib/parasut-credentials.ts` access+refresh token setini AES-256-GCM authenticated envelope olarak yalnız server sınırında saklanabilir hale getiriyor; token, code, client secret URL/response/log/audit DTO’suna alınmıyor. `src/lib/env.ts` Paraşüt şifreleme değişkenlerini tanıyor. Hedef P-01A testi, tam runner 208 files, TypeScript, lint ve production build PASS; `/api/ready` 200/db ok. P-01A provider hesabı veya gerçek token doğrulaması değildir. Aktif sonraki mikro-faz `P-01B — OAuth server route ve transaction persistence`dir.

**P-01B durum düzeltmesi:** P-01B PASS olarak tamamlandı. `ParasutConnection` ve `ParasutOAuthTransaction` migration ile eklendi; state plaintext değil hash/binding olarak tutuluyor. `/api/integrations/parasut/oauth/start` yalnız authenticated MFA + `integrations.manage` + same-origin istekte exact callback URI ile authorization URL üretip transaction/audit kaydı oluşturuyor. Callback state’i atomik `updateMany` ile tek kullanımlı tüketiyor; provider token exchange sonrası token setini encrypted envelope’a yazıyor ve kullanıcıya yalnız 303 sonuç yönlendirmesi dönüyor. Token/code raw response, log, audit body ve export DTO’suna girmiyor. Hedef route testi, Prisma validate/migration/client generate, tam runner 209 files, TypeScript, lint ve production build PASS; `/api/ready` 200/db ok. Gerçek provider exchange ve refresh rotation bu kanıtın dışında bırakıldı. Aktif sonraki mikro-faz `P-01C — Refresh token rotation ve CAS`dir.

**P-01C durum düzeltmesi:** P-01C PASS olarak tamamlandı. `parasut-token-rotation.ts` yalnız refresh grant request üretir; access token süresi için 5 dakikalık bounded skew kullanır. Yeni access+refresh çifti AES-256-GCM envelope’a alınmadan ve credential version atomik compare-and-swap ile doğrulanmadan eski bağlantı yazılmaz; yarışan worker stale/no-op olur, provider başarısızlığında eski envelope korunur. `ParasutConnection.credentialVersion` migration ile eklendi. Hedef rotasyon testi, tam runner 210 files, TypeScript, lint ve production build PASS; `/api/ready` 200/db ok. Gerçek refresh provider çağrısı ve canlı token doğrulaması dış bağımlılıktır. Aktif sonraki mikro-faz `P-02 — Company scope health check`dir.

**P-02A durum düzeltmesi:** P-02A PASS olarak tamamlandı. `parasut-health.ts` yalnız workspace eşleşmesi, seçili company ID, provider’dan dönen company ID ve token health sonucunu kullanarak `active`, `scope_mismatch`, `company_selection_required`, `reauthorization_required`, retryable/failed health kararları üretiyor. Başarılı karar dışında `canUse` açılmıyor; provider token/ham response DTO’ya girmiyor. Hedef health testi, tam runner 211 files, TypeScript, lint ve production build PASS; `/api/ready` 200/db ok. Provider company discovery ve gerçek health çağrısı dış bağımlılıktır. Aktif sonraki mikro-faz `P-02B — Provider company discovery ve health route`dur.

- Geçmiş faz kanıtı korunur: `C-02 — Payment snapshot’a bağlama` yürütme kaydı ve bağımlılıkları silinemez; sonraki mikro-fazlar bu kapıyı yeniden doğrular.

## Global Constraints

- The Turkish product requirements in `RELEASE-ROADMAP.md` are authoritative; do not silently narrow public delivery, publish security, drag/drop, container, Bento, template, 16:9 card image or settings requirements.
- Read-only discovery comes before every change. Never infer a business rule from a variable name or a mock screen.
- A phase is not complete because a page opens, one endpoint returns `200`, lint passes, or another agent says it is complete.
- Every claim must include a fresh command, test, browser observation, or review artifact and its exit/result.
- Never edit unrelated dirty files. Before editing, record `git status --short` and the exact files in scope.
- Never reset, checkout, delete, overwrite, seed, migrate, or upload production data without an explicitly identified safe environment and approval.
- Never print or save secrets, tokens, passwords, private cookies, real production payloads or unredacted personal data in evidence.
- One micro-phase has one objective, one owner, one file boundary and one verification cycle. Do not bundle “while here” refactors.
- Do not start the next micro-phase while the current phase has a failing required check, an unexplained warning affecting the scope, or an unresolved security/data decision.
- When a test fails, follow root-cause investigation before any fix: reproduce, read the complete error, inspect recent changes, trace the data across boundaries, form one hypothesis, make the smallest testable change, then re-run.
- After three failed fix attempts for the same root cause, stop and record an architecture review instead of attempting a fourth patch.
- Public code must never reuse a private admin serializer or private admin endpoint merely because it already returns similar fields.
- Authentication is not authorization. Every protected mutation needs identity, membership, capability and resource-tenant checks.
- Published data is immutable by version. Saving a draft must not change the public form until an explicit publish operation succeeds.
- External export code may contain only public identifiers and non-sensitive display options. It must never contain admin tokens, session tokens, private cookies, workspace secrets or internal database IDs.
- Responsive behavior is measured in the host container, not only in the application viewport.
- Tests that require real external credentials run only in a safe staging environment. Synthetic contract tests must exist without credentials.
- If the cloud provider, persistent disk model, expected traffic, retention policy or compliance scope is unknown, record it as a blocking decision; do not invent a release date.
- Every new user “thought cloud” is a hypothesis to validate, not an automatic product requirement. It must be routed through the idea-validation protocol below and then attached to the existing phase graph.
- A validated intermediate requirement is not a separate side project: it becomes a bounded task inside the affected main phase, or a cross-cutting gate with explicit dependencies and no duplicated domain model.
- MavenForms is not a mailing product. The execution spine is `form/publish → payment → provider API/webhook → invoice/accounting → document-ready → required delivery`; email work is subordinate delivery infrastructure. A mail phase cannot start without naming the triggering `PAY`, `INV` or `INT` acceptance criterion and its `DeliveryIntent` contract.
- Payment success is not invoice issuance, invoice issuance is not document readiness, and document readiness is not email delivery. These states require separate authoritative records, idempotency keys, retries and gates.
- Marketing/campaign/list-provider work is outside the payment and invoice critical path and remains deferred until the core payment, invoice and integration gates pass.
- The product-wide form UI/UX hardening phase is ordered after the first-party payment, invoice, required-delivery and pilot gates, and before SaaS. It may not reorder the core chain. Its scope is `FORM-UX-00..FORM-UX-09`: builder behavior, containers/Bento/templates, media scope/upload, card/detail information architecture, responsive/embed behavior, accessibility and real control-to-state verification.
- A payment/pilot-blocking UI fix stays in its owning `PAY`, `INV/F`, `INT` or `DELIVERY` micro-phase; it is not postponed to `FORM-UX`. `FORM-UX` is the post-pilot product completion gate, not a substitute for domain correctness.
- The master order is immutable during ordinary execution: `PAY → INV/F manual → Paraşüt API v4 → document security/document-ready → required transactional DELIVERY/MAIL → pilot → FORM-UX → SAAS/BILL`. New thoughts, UI requests, provider suggestions or side jobs may refine an existing phase but may not promote, skip, merge or reorder phases. Only a separately recorded product-owner decision with dependency, security, data and release impact evidence can change this order.
- **Kontrollü lokal bakım yetkisi:** Bir fazın ilerlemesi çalışan lokal server’ın tuttuğu dosya kilidi, migration sonrası üretilmesi gereken client/runtime çıktısı veya benzeri yerel çalışma bağımlılığı nedeniyle duruyorsa, bu yetki kapsamında lokal server kontrollü olarak durdurulabilir. Durdurma yalnızca `D:\project\mavenform` geliştirme ortamında, production/cloud sürecine dokunmadan ve veri silmeden yapılır. İşlem tamamlandıktan sonra server yeniden başlatılır; `/api/ready`, ilgili testler, lint, TypeScript ve build kapıları geçmeden faz tamamlanmış sayılmaz. Bu kural, açık kullanıcı isteği beklemeden zorunlu teknik bakım işlemlerinin yapılmasına izin verir; phase order, güvenlik kapıları ve dış sağlayıcı doğrulama şartları yine değişmez.

## 0A. Yeni fikir ve düşünce bulutu değişiklik kontrolü

Kullanıcının konuşma sırasında eklediği her madde önce fikir olarak değerlendirilir; otomatik olarak hemen uygulanacak görev veya doğrudan roadmap maddesi sayılmaz. Ajan aşağıdaki kontrolü tamamlamadan kod yazamaz:

1. **Mevcut durumu çıkar:** İstenen davranışın mevcut kodda, testlerde ve planlarda bulunup bulunmadığını kontrol et. Zaten yapılmış işi tekrar planlama veya tekrar uygulama.
2. **Etki alanını bul:** Form, publish/public, ödeme, provider API, fatura/muhasebe, teslimat, güvenlik, responsive UI, storage veya release kapılarından hangilerini etkilediğini yaz.
3. **Doğruluğu kontrol et:** Güncel ve değişebilir sektör/provider kuralı varsa birincil resmi kaynağı; kullanıcı problemi varsa mevcut UX/bug kanıtını; mimari etkide mevcut şema/API sözleşmesini esas al. Bilinmeyen bilgiyi varsayım olarak plana koyma.
4. **Önceki bağlamla karşılaştır:** Aynı iş, çelişen iş veya daha önce reddedilmiş/sadeleştirilmiş iş var mı kontrol et. Tekrarlanan ihtiyaç mevcut domain modeline bağlanır; ikinci bir paralel model oluşturulmaz.
5. **Karar ver:** Her fikir açıkça `ACCEPTED`, `SIMPLIFIED`, `DEFERRED`, `REJECTED` veya `SAFE-NOW` durumlarından biriyle sonuçlandırılır.
6. **Plan etkisi varsa:** Etkilenen ana faz, bağımlılık, kabul kriteri, dosya sınırı, güvenlik kapısı ve 15 dakikalık mikro-paket planı güncellenir; plan güncellenmeden uygulama başlatılmaz.
7. **Plan etkisi yoksa:** Düşük riskli, mevcut sözleşmeyle uyumlu ve bağımsız bir değişiklikse kullanıcıya açıkça “planı etkilemiyor, hemen yapılmasında sakınca yok” denir; yine de hedefli test ve regresyon kapısı uygulanır.
8. **Belirsizlik veya çelişki varsa:** Fikir doğrudan plana eklenmez. Gerekçe, kanıt eksikliği, risk ve güvenli alternatif kaydedilir; gerekiyorsa `BLOCKED` bırakılır.

Bu kontrol, özellikle ödeme→fatura→entegrasyon→gerekli teslimat sırasını, public güvenlik sınırını, admin yetkilerini, tenant izolasyonunu ve veri kaybı korumalarını bypass etmek için kullanılamaz. Kullanıcının fikri değerli olsa bile doğrulanmamış provider, vergi, hukuk, güvenlik veya sektör varsayımı kod ve release şartı haline getirilemez.
- Sector and competitor research must use current primary/official product, technical, policy or standards sources where available; competitor UI is a reference for behavior and trade-offs, not a copy target.

## 0B. Imported deep-research decision gate

The current evidence package is stored at `D:\project\mavenform\docs\OzelAPP_Derin_Arastirma_2026-09-03\`. The imported anonymous architecture/API research contract is `D:\project\mavenform\docs\Anonim_Teknik_Mimari_API_ve_Uygulama_Sozlesmesi.md`, and the expanded anonymous integration/release research is `D:\project\mavenform\docs\OzelAPP_Anonim_Entegrasyon_ve_Release_Arastirmasi.md`. Before making a provider, invoice, document, delivery, embed or SaaS decision, read the relevant topic file, both anonymous contracts, and `KAYNAK_LEDGERI.md`. These files are research evidence, not proof that the repository, an account, sandbox or production service is working.

The research-derived constraints are binding for execution:

- iyzico hosted/Checkout Form is the first pilot payment path; callback alone never fulfills payment, and server retrieve plus verified webhook is authoritative.
- Stripe remains an adapter target but live activation is conditional on supported-country/legal-merchant/account evidence; it must not be shown as connected without that evidence.
- Google Pay must be PSP-gateway capability only; direct token decrypt is out of the MVP security boundary.
- PaymentOrder amount/currency/provider/mode must be server-owned and idempotent; client input can provide form values and an idempotency key only.
- PAN/CVV/card data must not enter database, log, cache, analytics, export, queue or backup. Hosted payment reduces PCI scope but does not replace acquirer/QSA validation.
- Paraşüt v4 behavior is limited to documented endpoints. Undocumented sandbox, idempotency, revoke, e-document callback or signed XML behavior remains `EXTERNAL DEPENDENCY` until written evidence exists.
- GİB schema/code-list changes are time-sensitive; the reported 14 September 2026 change must be rechecked before pilot and legally reviewed.
- Transactional email is subordinate delivery infrastructure, triggered only by payment/invoice/document-ready domain events; marketing/campaign work remains outside the critical path.
- Public forms consume immutable published snapshots only. Iframe is the default external boundary; inline and WordPress require exact-origin, CSS/DOM isolation and secret-leak evidence.
- SaaS remains last, while tenant/workspace scope, encrypted secret references and audit actor boundaries must be preserved in earlier domain models.

If the research package and an external provider account disagree, stop at the earliest affected gate and record `EXTERNAL_DEPENDENCY` or `LEGAL_REVIEW_REQUIRED`; never resolve the conflict by weakening a security control or inventing an API behavior.

## 1. How an AI agent must work

### 1.1 Required reading order

Before any implementation agent starts:

1. Read this file completely.
2. Read `D:\project\mavenform\RELEASE-ROADMAP.md` completely.
3. Read `D:\project\mavenform\CLOUD-DEBUG-HANDOFF.md` completely.
4. Read `D:\project\mavenform\docs\Anonim_Teknik_Mimari_API_ve_Uygulama_Sozlesmesi.md` and `D:\project\mavenform\docs\OzelAPP_Anonim_Entegrasyon_ve_Release_Arastirmasi.md`, then the relevant file under `D:\project\mavenform\docs\OzelAPP_Derin_Arastirma_2026-09-03\` and verify its entries in `KAYNAK_LEDGERI.md` before any external integration or compliance decision.
5. Inspect `package.json`, `next.config.ts`, `Caddyfile`, `prisma/schema.prisma`, `src/lib/auth.ts`, `src/lib/api-client.ts` and the files listed by the current micro-phase.
6. Inspect current changes with `git status --short` and `git diff --stat`.
7. Run Phase 00 baseline. No feature phase is allowed before Phase 00 has a signed evidence record.

### 1.2 The non-negotiable micro-phase loop

Every micro-phase follows this exact loop:

```text
A. Entry gate: revalidate all previous phases
B. Scope lock: list files, routes, schema and non-goals
C. Baseline: prove the affected behavior before editing
D. Inspect: trace input -> handler -> database -> response -> browser
E. Test first: add or run the smallest failing regression/contract test
F. One change: implement only the current objective
G. Targeted verification: run the exact test for the objective
H. Regression verification: rerun every prior gate required by the phase
I. Diff/code review: inspect changed lines, security, logs and API shape
J. Evidence record: write commands, exit codes, outputs, risks and decision
K. Exit gate: PASS or BLOCKED; never “probably pass”
```

If step C cannot prove the old behavior, the agent must not pretend it knows the regression surface. It must add a safe reproduction or mark the behavior as unverified and stop at the gate.

### 1.3 Thought-cloud validation and integration protocol

When the user adds an intermediate idea, the supervising agent must spend one bounded analysis package before implementation. The package may be split into smaller packages, but it cannot be skipped:

```text
INT-00  Capture the request and remove duplicate wording
INT-01  Identify the user problem, affected role and measurable outcome
INT-02  Verify current sector practice and competitor/provider behavior
INT-03  Trace architecture, data, security, compliance and responsive impact
INT-04  Choose ACCEPT / SIMPLIFY / DEFER / REJECT and attach it to the phase graph
```

Decision rules:

- **ACCEPT:** Add the smallest testable task to the existing phase, define its input/output contract, and update the affected release gate.
- **SIMPLIFY:** Preserve the user outcome with less risk/cost; document the removed complexity and why the outcome remains covered.
- **DEFER:** Keep a traceable backlog item with the reason, dependency and trigger for reopening; do not add UI that pretends it works.
- **REJECT:** Record the concrete conflict with security, law, data integrity, provider contract or user outcome; do not silently discard the idea.

The intake record must contain:

```text
Idea ID and original intent
User problem and affected personas
Evidence from current code and live behavior
Sector/competitor sources and date checked
Architecture/data/security/compliance impact
Decision: ACCEPT/SIMPLIFY/DEFER/REJECT
Main phase and micro-task IDs
Dependencies and new exit-gate assertions
What must not change
Verification evidence required
```

The agent must not ask the user between ordinary phases. It should make the safest documented assumption and continue. It may stop only for a material external decision that cannot be discovered locally, such as legal approval, provider account ownership, production credentials or destructive data authority.

### 1.4 Agent output contract

At the end of every micro-phase, the agent must report:

```text
Micro-phase: exact ID and title
Scope files: exact absolute paths
Baseline: command + exit code + observed result
Change: one-sentence root-cause-driven change
Targeted checks: command + exit code + pass/fail count
Regression checks: command + exit code + pass/fail count
Security/data review: exact result or unresolved risk
Diff review: files changed and unexpected changes
Evidence: path to redacted report/artifact
Decision: PASS or BLOCKED
Idea decision: not applicable or exact INT decision and linked phase/task IDs
Next phase: allowed only if PASS
```

An agent report is not evidence by itself. The supervising agent must inspect the diff and rerun the required checks before accepting the phase.

### 1.5 Failure protocol

When a required check fails:

1. Preserve the failure output without replacing it with a generic error.
2. Reproduce the same failure once in the same environment.
3. Record the boundary where it fails: browser → route, route → auth, auth → database, database → response, build → artifact, or proxy → app.
4. Compare with a known working path in the repository.
5. Write one hypothesis in the evidence record.
6. Add or run one focused test for that hypothesis.
7. Apply one minimal change and rerun the focused test.
8. Rerun the phase gate and all prior gates.
9. If the same root cause fails three attempts, stop with `BLOCKED_ARCHITECTURE_REVIEW`.

Never fix a cloud symptom by weakening authentication, disabling type checks, adding a wildcard CORS rule, exposing a private response, or using `db:push --accept-data-loss`.

## 2. Phase gates and evidence rules

### 2.1 Previous-phase revalidation gate

Before opening any phase N+1, the supervising agent must:

- Read the phase N evidence record.
- Verify the phase N changed-file list against the actual diff.
- Re-run the phase N targeted test, not only a later broad test.
- Re-run the stable functionality smoke suite.
- Re-run `bun run lint`.
- Run a typecheck command once it exists; until then record typecheck as missing evidence, not as passed.
- Confirm no open `BLOCKED` decision was silently converted to a warning.
- Confirm no public response, route, schema, migration or runtime contract changed outside the phase scope.

If any previous gate fails, the current phase is not started. Return to the earliest failing phase and follow the failure protocol.

### 2.2 Stable functionality smoke suite

The smoke suite must eventually verify all of the following against a disposable local/staging database:

1. App root opens with HTTP `200`.
2. Synthetic demo user can log in.
3. `/api/auth/me` works with the expected authenticated mechanism.
4. Logout invalidates the session/token according to the chosen strategy.
5. Authenticated user can create/read/update a form in its workspace.
6. Authenticated user can publish a form.
7. Anonymous user can open the published direct form.
8. Anonymous user can submit valid data.
9. Invalid/oversized/closed submissions are rejected without partial writes.
10. Authorized workspace user can see the submission.
11. A second workspace cannot read, update or delete it.
12. Draft changes do not alter the published snapshot before publish.
13. Iframe and inline exports submit to the same public contract.
14. Public browser network/storage contains no admin route, private token or sensitive response.

The suite must use synthetic values and a disposable database. It must not use a production database or real customer data.

### 2.3 Code review gate

For every phase, the reviewer checks:

- changed files are inside the declared scope;
- no route bypasses the shared auth/capability policy;
- all resource queries contain the correct tenant predicate;
- public DTOs are explicit allowlists;
- input is validated at the server boundary;
- writes that must be atomic are transactional;
- repeated requests are idempotent where applicable;
- errors do not expose secrets, SQL, file paths, stack traces or personal data;
- logs are redacted and carry a request/correlation ID;
- new dependencies are justified and lockfile/build impact is known;
- no `ignoreBuildErrors`, wildcard CORS, wildcard postMessage target, or `accept-data-loss` was added to bypass a gate;
- accessibility and responsive behavior are tested for any changed UI.

## 3. Phase 00 — Baseline before development

**Status at plan creation:** Required and blocking. The current repository has a running local development path and historical API/browser notes, but a current clean release build, current E2E suite, migration history and cloud artifact are not yet proven.

**Allowed outcome:** `BASELINE_PASS`, `BASELINE_PARTIAL`, or `BASELINE_BLOCKED`. Only `BASELINE_PASS` can open Phase 01. `BASELINE_PARTIAL` is a diagnostic result, not permission to develop features.

### M00.1 — Context and dirty-worktree inventory

**Objective:** Establish facts without editing code.

**Read:** `package.json`, `next.config.ts`, `Caddyfile`, `.env` names only, `prisma/schema.prisma`, `prisma/seed.ts`, `src/app/api/**`, `src/components/mavenforms/**`, `.zscripts/**`, `tests/**`.

**Actions:**

- Record branch, status, changed files and untracked files.
- Confirm whether `README.md`, migration files, CI workflows, Playwright config and typecheck script exist.
- Record the exact runtime versions available.
- Map route families into private app, public form, auth, submission, integration and runtime health.
- Do not print `.env` values; record only variable names and whether each required variable is set.

**Verification:** inventory report with exact paths; no file modification; `git diff --check` result.

**Gate:** `PASS` only when the agent can state which files are user-owned dirty changes and which files each later phase may touch.

### M00.2 — Current local functionality smoke

**Objective:** Prove whether the existing application works before any new feature work.

**Actions:**

- Start the documented local server using the existing local-safe path.
- Check root, auth login, auth me, logout and one public form route.
- Use synthetic demo credentials already documented by the project; never print the resulting token.
- Record status code, response shape, browser console error, network failure and database side effect.
- If a server is already running, identify its process/port and test it rather than starting a competing server.

**Minimum commands:**

```powershell
bun run lint
git diff --check
```

HTTP checks may use PowerShell or a repository-approved test script, but the evidence must include endpoint, status and redacted response keys.

**Gate:** Root/login/me/logout/public-form behavior is either proven or has a reproducible failure with a root-cause investigation record. Do not proceed while the baseline failure is unexplained.

### M00.3 — Current code and build health

**Objective:** Find code-level blockers before changing product behavior.

**Actions:**

- Run `bun run lint` from the repository root.
- Run the available TypeScript compiler check; if no script exists, run the repository-approved `bunx tsc --noEmit` only after inspecting `tsconfig.json`.
- Run `bun run build` in a safe local environment and record whether the Unix-specific copy/start commands work on the target OS.
- Inspect whether `.next/standalone/server.js`, Prisma client runtime files, static assets and `public` assets are produced.
- Run every existing test script under `tests/` without modifying the database used by the running app.
- Search for `ignoreBuildErrors`, `db:push`, `accept-data-loss`, hard-coded paths, mock/connected status text, token/localStorage use, `preview=true`, `Math.random`, raw IP/user-agent storage and unscoped submission mutations.

**Gate:** A clean baseline report exists. A failed build is a Phase 00 blocker; it is not bypassed by disabling the build check.

### M00.4 — Baseline gate review

**Reviewer checklist:**

- [ ] M00.1 evidence exists and matches the current worktree.
- [ ] M00.2 proves current app behavior or contains a reproducible blocker.
- [ ] M00.3 has fresh lint, typecheck, build and existing-test outputs.
- [ ] Every failure has a boundary, hypothesis and next diagnostic step.
- [ ] No implementation phase was started before this review.
- [ ] Synthetic data and secrets policy were followed.

**Exit:** `BASELINE_PASS` opens M01. Any missing required evidence is `BASELINE_PARTIAL` and blocks feature development.

## 4. Phase 01 — Public/private security contract

**Goal:** Establish the security boundary before adding public delivery or builder features.

**Files to inspect first:** `src/lib/auth.ts`, `src/lib/api-client.ts`, `src/app/api/public/forms/[slug]/route.ts`, `src/app/api/forms/[id]/preview/route.ts`, `src/app/api/forms/[id]/publish/route.ts`, `src/app/api/forms/[id]/submissions/[subId]/route.ts`, `src/app/api/forms/[id]/submissions/route.ts`, `prisma/schema.prisma`.

### M01.1 — Public data classification and forbidden-field contract

**Deliver:** a checked-in public DTO/schema and a forbidden-field regression test.

**Allowed scope:** public render response, public submit response, shared public schema/test files. Do not refactor all routes in this micro-phase.

**Steps:**

1. Capture the current public GET and POST response keys using synthetic data.
2. List each key as `PUBLIC_REQUIRED`, `PUBLIC_OPTIONAL`, `PRIVATE_FORBIDDEN` or `UNDECIDED`.
3. Define the public DTO explicitly; do not spread a Prisma object into it.
4. Add a test that fails if token, cookie, Authorization, workspace/member/user/internal IDs, draft fields, integration settings, secrets, audit data, DB paths or stack traces appear.
5. Add a test that confirms public submit response does not echo submitted personal data.
6. Run the test against the current code and record the failure.
7. Implement only the serializer/DTO boundary.
8. Run the focused test, then M00.2 smoke and M00.3 lint/typecheck.

**Gate:** Public GET/POST response has an allowlist, forbidden-field test is green, and admin API response is not reused.

### M01.2 — Auth context and capability policy

**Deliver:** one private auth context and one capability policy without changing every route yet.

**Required concepts:** authenticated user, session, workspace membership, role, capability, active/inactive membership.

**Steps:**

1. Enumerate existing roles from `src/lib/types.ts` and existing membership fields from `prisma/schema.prisma`.
2. Write the intended capability matrix in a test fixture.
3. Add tests for anonymous, expired, inactive-member, wrong-workspace and wrong-role requests.
4. Add a policy API with named capability calls; avoid boolean positional parameters.
5. Run the tests red first.
6. Implement the smallest policy/context module following existing auth conventions.
7. Run all policy tests and inspect error status/data disclosure.

**Gate:** Policy tests prove deny-by-default and no private resource data is returned on denial.

### M01.3 — Route authorization migration in small slices

**Deliver:** protected route families use the shared policy.

**Slices, in order:**

1. Form list/create: `src/app/api/forms/route.ts`.
2. Form read/update/delete/publish/preview: `src/app/api/forms/[id]/route.ts`, `publish/route.ts`, `preview/route.ts`.
3. Fields/logic/notifications/appearance/theme/reports routes.
4. Submissions list/detail routes.
5. Branding, folders, tags, integrations, audit and dashboard routes.

For each slice: run its baseline, add wrong-role and cross-tenant tests, change only the slice, run its tests, run previous-slice regression, inspect all query predicates, and write a gate record. Never migrate all slices in one patch.

**Gate:** Every protected mutation has identity → membership → capability → tenant resource check.

### M01.4 — Submission IDOR regression

**Deliver:** regression tests and a minimal fix for cross-form PATCH/DELETE.

**Scenario:** Workspace A has Form A and Submission A. Workspace A also has Form B. A request addressed to Form B with Submission A’s ID must not update or delete Submission A. A request from Workspace B must not access either submission.

**Steps:**

1. Create synthetic forms/submissions in an isolated database.
2. Run GET/PATCH/DELETE with matching and mismatched `formId/subId` pairs.
3. Assert status and final database object, not only response status.
4. Run the regression red against the current code.
5. Change the mutation query to enforce both submission ID and form ID/tenant scope atomically.
6. Run the focused test, full submission route tests and stable smoke.

**Gate:** AC-006 and AC-004 pass; no decrement is applied to the wrong form’s counters.

### M01.5 — Preview and publish boundary

**Deliver:** preview is private/signed; public route never exposes draft.

**Steps:**

- Reproduce `?preview=true` with anonymous, wrong-workspace and authorized requests.
- Choose and document either authenticated preview or short-lived signed preview token; do not accept a public query flag as authorization.
- Add tests for expired, replayed, wrong-form and wrong-workspace preview tokens if signed preview is chosen.
- Ensure public GET resolves only `published` snapshot state.
- Ensure unpublish/close invalidates public access according to the documented lifecycle.

**Gate:** Anonymous users cannot obtain draft fields through URL, query, header or predictable ID.

### M01.6 — Session and public browser storage policy

**Deliver:** documented session decision and regression evidence.

**Preferred path:** HttpOnly + Secure + SameSite cookie for authenticated app/BFF, with CSRF protection for cookie-authenticated mutations.

**If Bearer/localStorage remains temporarily:** record a risk acceptance, enforce short expiry/rotation/revoke, CSP/XSS controls, logout invalidation and a migration issue. Do not describe it as equivalent to HttpOnly cookies.

**Tests:** login, refresh/revoke, logout, expired session, public browser storage, public network headers, CSRF and cross-origin behavior.

**Gate:** Public forms never receive or create admin/session/refresh tokens.

## 5. Phase 02 — Data correctness and safe persistence

### M02.1 — Published snapshot persistence

**Deliver:** schema/model for immutable public snapshots or an equivalent versioned storage contract.

**Required fields:** opaque public form identifier/slug, snapshot version, sanitized render schema, status, published timestamp, allowed embed origins, public appearance, cover image metadata and schema version.

**Steps:** inspect existing `FormVersion` and publish behavior; write round-trip tests; define unique/index/foreign-key rules; add migration in development; test draft save, publish, unpublish and rollback. Do not mutate the existing production DB.

**Gate:** Draft edits cannot alter the current published snapshot; published snapshot can be read without private joins.

### M02.2 — Server-side public schema validation

**Deliver:** runtime validator generated from the published snapshot contract.

**Must validate:** field type, field ID allowlist, required, length, numeric/date bounds, options, response limit, availability window, consent/legal fields, unknown keys and payload size.

**Steps:** add boundary tests for valid, missing, extra, malformed, oversized and closed-form payloads; run red; implement schema validation; assert no DB write on rejection; run transaction/data tests.

**Gate:** Client-side validation can improve UX but cannot weaken server validation.

### M02.3 — Atomic submission transaction

**Deliver:** submission record, values, files metadata and counters remain consistent after success/failure.

**Steps:** reproduce failure between each current write; write failure-injection test; wrap related writes in the smallest supported transaction; verify counters and values; test SQLite lock/transaction behavior in the chosen pilot; run full submission regression.

**Gate:** No partial submission or incorrect counter remains after an injected failure.

### M02.4 — Idempotency and public abuse controls

**Deliver:** concurrency-safe duplicate prevention and bounded public intake.

**Steps:** define form-scoped idempotency key; add unique constraint/migration; replace time/random public token generation with cryptographic randomness; run concurrent duplicate test; add payload/field/body limits; add rate limit and anti-spam interface; test retry after timeout.

**Gate:** concurrent same-key requests produce one intended side effect and a safe repeat response; no raw secret or payload is logged.

### M02.5 — Migration baseline and backup drill

**Deliver:** reviewed migration history and safe backup/restore procedure.

**Steps:** inspect whether `prisma/migrations/` exists; create the initial migration/baseline on a copied disposable DB; compare row counts/relations; replace production build/start `db:push --accept-data-loss` path with `prisma migrate deploy`; create backup/checksum/restore evidence; test app against restored copy; document rollback compatibility.

**Gate:** No production release while migration, backup or restore evidence is missing. Never run this against live data without explicit approval.

## 6. Phase 03 — Core form lifecycle

### M03.1 — Canonical public renderer

**Deliver:** one renderer for app live preview, direct URL, iframe and inline modes.

**Steps:** define render input as published snapshot only; implement explicit field/block registry; render loading/closed/error/success states; replace browser `alert()` with accessible status region; add snapshot/contract tests; compare app and public output keys.

**Gate:** Renderer has no private API dependency, no admin navigation and no private model spread.

### M03.2 — Direct public form route

**Deliver:** stable direct URL for a published form.

**Tests:** public published form opens anonymously; draft/unpublished/closed forms show controlled state; invalid slug does not reveal tenant existence; narrow mobile and desktop layouts work; submission reaches the correct form/workspace.

**Gate:** Direct link is the reference behavior for all export modes.

### M03.3 — Publish lifecycle and cache invalidation

**Deliver:** draft → publish → unpublish/close → rollback state machine.

**Steps:** write state-transition tests; define who may publish; create immutable snapshot; invalidate public cache only after transaction success; test old embed after new publish; test rollback; test concurrent publish conflict.

**Gate:** No mixed draft/published fields, stale private data or public access after a closed form’s policy requires closure.

## 7. Phase 04 — Builder layout, drag/drop and bounded Grid/Bento

### M04.1 — Versioned field-layout contract and registry

**Deliver:** Stable field identity, versioned field-layout/decoration contract and shared renderer registry.

**Validation invariants:** unique field IDs, preserved `sortOrder`, bounded Grid spans, semantic height tokens, safe responsive overrides and form-scope decoration references.

**Gate:** Layout round-trip test preserves field order, config and identity; invalid layout values are rejected before persistence.

### M04.2 — Pointer/touch drag/drop

**Deliver:** real palette-to-canvas and canvas-to-canvas drag/drop.

**Steps:** inspect existing `src/components/mavenforms/builder/canvas.tsx` and `field-palette.tsx`; write tests for add, move, reorder and invalid drop; implement drop target/insertion indicator; persist only after valid state; run browser E2E and reload round-trip.

**Gate:** No click-only fallback may be presented as drag/drop completion.

### M04.3 — Keyboard drag/drop and accessibility

**Deliver:** keyboard-equivalent movement and announcements.

**Required operations:** pick up, move before/after, cancel, drop, undo and redo. There is no “move inside” operation because nested containers are not part of the product model.

**Gate:** keyboard-only test passes, focus returns to the moved block, screen-reader status announces the operation, and pointer implementation remains functional.

### M04.4 — Bento responsive layout

**Deliver:** bounded Grid/Bento presets, field column span, semantic height and breakpoint/mobile collapse.

**Steps:** define supported column counts and responsive override schema; write visual fixtures for unequal spans, long labels and empty states; implement CSS media fallback; test 12/8/4-column equivalents, narrow sidebar and 200% zoom. Presets must not create a nested tree or freeform masonry coordinates.

**Gate:** no horizontal overflow, clipped errors, layout-dependent field loss or second scrollbar.

### M04.5 — Templates and reusable blocks

**Deliver:** versioned form-template catalog and independent template cloning.

**Initial templates:** event RSVP, conference registration, contact, lead capture, satisfaction survey and job application.

**Steps:** store templates as theme tokens + flat field configuration + bounded layout; create from template; edit created form; update source template; assert existing form is unchanged; add workspace-only custom template permissions.

**Gate:** Template source changes never silently modify existing forms.

### M04.6 — Autosave, undo/redo and preview parity

**Deliver:** recoverable editing state and identical public render contract for the flat field layout.

**Tests:** debounce saves, refresh recovery, failed save, concurrent edit conflict, undo/redo, preview/publish parity and unsaved-change warning.

**Gate:** Every builder change has a durable state or an explicit recoverable error; preview and published form use the same validated field-layout contract.

## 8. Phase 05 — Card image and settings UX

### M05.1 — Form cover image metadata and asset flow

**Deliver:** form card cover image with 16:9 rendering.

**Fields:** `coverImageUrl`, `coverImageAlt`, optional focal X/Y in `0..1`, fit mode and fallback state.

**Steps:** define upload/storage boundary; validate MIME/size/dimensions; save alt/focal metadata; render `aspect-ratio: 16 / 9`, `object-fit: cover`; test missing/invalid/slow/large image and layout shift.

**Gate:** Card height remains stable and meaningful images have alt text; invalid asset cannot inject HTML/CSS or break the card.

### M05.3 — Media source and metadata interaction contract

**Deliver:** a source-first media interaction that does not expose unrelated controls in the default state.

**Required behavior:**

- Initial state shows only the current selection (if any) and two source actions: `Medyadan seç` and `Bilgisayardan yükle`.
- The existing-media search field and empty state appear only after `Medyadan seç` opens the scoped library. An empty library message must say that the current form/workspace has no image; it must not look like a broken generic field.
- Upload accepts the file first. Alt text is requested after a successful selection/upload, never as an unexplained prerequisite before the user has an image.
- Alt text belongs to the selected asset by default and can be edited and saved. A form-instance override remains available where the rendered component needs a different context-specific alternative.
- External HTTPS is retained as an explicit secondary source labelled `Harici görsel URL'si (alternatif)`. Selecting an asset clears the external source; entering an external source clears the asset reference. The two sources must not appear to be one duplicated field.
- `Kaldır/Temizle`, loading, focus, hover, active, upload failure and save failure states are real actions with accessible names.
- Form-scoped pickers can read only the selected form's media; workspace/global pickers can read only the workspace's shared media. A picker must never silently widen scope.
- Persistence contract: form appearance uses `headerLogoMediaId`, `headerBgMediaId` and `footerLogoMediaId`; workspace branding uses dedicated `*MediaId` fields. The existing `*Url` fields remain only for external HTTPS fallbacks, so a local `/api/media/...` path can never reappear as an editable external URL.

**Tests:** initial closed state, open-library search, empty state, select existing asset, upload then alt metadata save, clear, external-source precedence, form/global authorization, keyboard/focus, narrow container and failed upload.

**Gate:** No search or empty-library noise is visible before a source action; no alt field is shown without a selected asset; each source has one unambiguous owner and the public renderer receives only the resulting safe asset/URL reference.

### M05.2 — Card actions and settings placement

**Deliver:** accessible and role-aware card actions.

- Top-right `…`: Open, Preview, Publish, Share, Embed, Duplicate, Archive/Delete as permitted.
- Bottom-right visible `Ayarlar`: direct form settings shortcut.
- `…` is for quick actions; `Ayarlar` is the stable settings entry, not a duplicate destructive command.

**Tests:** keyboard open/close, Escape, focus return, mobile touch target, long title, role visibility, confirmation and audit event.

**Gate:** Viewer/restricted roles cannot see or invoke forbidden mutation actions through hidden DOM/API calls.

## 9. Phase 06 — External delivery and WordPress

### M06.1 — Iframe public endpoint

**Deliver:** responsive iframe export using only the public renderer.

**Snippet contract:** public slug/opaque ID, explicit `title`, safe loading/referrer policy, width/height wrapper and no credentials.

**Tests:** plain HTML host, aggressive global CSS, narrow sidebar, HTTPS host, network delay, closed form, submit and retry.

**Gate:** Host CSS cannot alter form internals; form CSS cannot alter host page; admin API is never called.

### M06.2 — Secure auto-height protocol

**Deliver:** versioned `ready`, `resize`, `submitted`, `closed`, `error` events.

**Steps:** observe form height with `ResizeObserver`; send only low-sensitivity state; require exact target origin; parent checks event origin/source/schema; add fallback fixed height and internal scroll; test malicious origin/source/wrong schema.

**Gate:** No wildcard target origin, unvalidated message or personal data in an embed event.

### M06.3 — Inline custom element loader

**Deliver:** `mavenforms-form`-style inline integration for host pages.

**Steps:** define loader version and lifecycle; ensure duplicate script/element initialization is idempotent; use Shadow DOM or strict namespace; avoid global selectors/events; use credentialless public requests; test React/Next/plain HTML hosts and host CSS torture fixtures.

**Gate:** Inline loader does not create duplicate forms/listeners/submissions and does not access private APIs.

### M06.4 — WordPress Gutenberg block

**Deliver:** installable block that selects a public form and renders the documented public embed.

**Steps:** define block attributes as public slug/mode/theme/width; register block; use dynamic rendering where appropriate; enqueue scripts only on pages containing the block; test editor preview and frontend render; test cache and CSP.

**Gate:** Block cannot store or expose admin credentials in post content or rendered HTML.

### M06.5 — WordPress shortcode

**Deliver:** namespaced shortcode with a minimal documented attribute API.

**Steps:** whitelist attributes; sanitize input; escape output; always return markup without side effects; reject private URLs/tokens; test classic editor, block shortcode block, invalid attributes and multiple forms on one page.

**Gate:** Shortcode meets WordPress security/compatibility rules and loads only necessary assets.

### M06.6 — Export panel and examples

**Deliver:** dashboard share/export panel and working host examples.

**Export modes:** direct link, iframe, inline, WordPress block, shortcode and optional popup/button.

**Examples:** plain static HTML, WordPress, React/Next and narrow sidebar host. Each example must show copy, paste, load, responsive layout, submit and error recovery.

**Gate:** All required modes point to the same public DTO and submission behavior; no mode gets a private fallback.

### M06.7 — WordPress production package and ZIP delivery

**Deliver:** one installable, versioned `mavenforms` plugin package; never a form-specific generated PHP file presented as a production plugin.

**Required package:**

- one top-level folder `mavenforms/` in the ZIP;
- one prefixed/ namespaced main plugin file with complete WordPress headers (`Plugin Name`, version, minimum WordPress/PHP, license, text domain and update identity);
- `readme.txt`, GPL-compatible licensing, changelog and installation/upgrade documentation;
- Gutenberg block metadata/editor code and server-side render path;
- namespaced shortcode with a documented allowlist of public attributes only;
- settings page with capability checks, nonce, sanitization and HTTPS base URL validation;
- frontend assets enqueued only when the block or shortcode is present;
- no workspace secret, session token, admin URL, internal database ID or private API response in post content, block attributes, HTML or JavaScript;
- iframe/inline delivery uses the published public route and exact postMessage origin/source/schema checks.

**Packaging steps:** validate PHP syntax where the PHP runtime is available; run static security checks; build a reproducible ZIP into `dist/`; verify all archive entries use forward slashes, exactly one top-level plugin folder, no `.env`, database, `.next`, node_modules or development files; reconcile ZIP version, main plugin header and `readme.txt` stable tag.

**Tests:** fresh WordPress install/activation/deactivation, settings save and invalid URL, shortcode/block render, two forms on one page, unpublished slug, multiple host themes, CSP/referrer behavior, responsive iframe/inline submit, upgrade from previous version and ZIP structure inspection.

**Gate:** The ZIP installs without manual file moves, renders only published public forms, passes the WordPress security/readme checks and has a recorded PHP/WordPress compatibility matrix. If PHP/WordPress cannot be run locally, the package remains `UNVERIFIED`, not `release-ready`.

## 10. Phase 07 — Real integrations and background delivery

### M07.1 — Notification outbox

**Deliver:** submission transaction records an outbox event; worker handles delivery.

**Tests:** queued/sent/failed/retry/max-attempt/dead-letter, duplicate event and provider timeout. No request reports email sent before durable enqueue/provider confirmation according to contract.

### M07.2 — SMTP/provider secrets

**Deliver:** secret-backed connection test and redacted operational result.

**Gate:** Credential values never enter public DTO, client state, HTML, logs or exported snippets.

### M07.3 — File uploads

**Deliver:** bounded private object/file storage with type/size/scan/retention rules.

**Gate:** Public submission cannot retrieve another submission’s file; file URLs are signed/private according to product policy.

### M07.4 — Payment/webhooks, only if in release scope

**Deliver:** verified signature, replay protection, idempotent event processing and explicit failure state.

**Gate:** If not in scope, remove “connected/paid” claims and disable the UI. Never simulate payment success in production.

## 11. Phase 08 — Cloud build, runtime and operations

### M08.1 — Deterministic production build

**Files:** `package.json`, `next.config.ts`, `.zscripts/build.sh`, `.zscripts/start.sh`, `.zscripts/database-runtime-build.sh`, `Caddyfile`.

**Steps:** remove or separately gate `typescript.ignoreBuildErrors`; eliminate hard-coded project paths; verify runtime versions; generate Prisma client; run migration job separately from build; verify standalone server, static assets, public assets and runtime dependencies in a clean artifact; test artifact in a clean directory.

**Gate:** Clean build exits `0` without bypasses and produces the exact files startup requires.

### M08.2 — Startup, health and readiness

**Deliver:** liveness and DB readiness endpoints plus condition-based startup wait.

**Tests:** app process starts, readiness waits for HTTP, DB unavailable causes readiness failure, child process crash alerts, graceful SIGTERM and restart. Do not treat `kill -0` alone as application readiness.

### M08.3 — Proxy and external form behavior

**Deliver:** Caddy/reverse proxy contract for direct, iframe and inline public routes.

**Tests:** Host/X-Forwarded headers, HTTPS origin, frame policy, CORS matrix, request body limit, timeout, static assets, multiple embed instances and public form submission.

**Gate:** Target cloud’s TLS termination, persistent disk and port model are evidenced; if unknown, stay blocked.

### M08.4 — Logs, metrics, backup and rollback

**Deliver:** structured redacted logs, request IDs, error tracking, uptime/readiness alerts, backup alerts and rollback runbook.

**Tests:** secret/token redaction, DB lock alert, backup failure alert, restored database startup, previous artifact rollback and public snapshot compatibility.

## 12. Phase 09 — QA, security and performance

### M09.1 — Browser E2E harness

**Deliver:** Playwright project with deterministic seed/fixtures, isolated test data, screenshots on failure and trace on first retry.

**Required project groups:** private app, public direct, iframe host, inline host, WordPress fixture, mobile, keyboard and security.

**Gate:** Tests are independent, do not rely on order, do not share mutable production data and provide trace/report artifacts for failures.

### M09.2 — Security regression suite

**Coverage:** IDOR, cross-tenant, wrong-role, preview bypass, public forbidden fields, token/cookie leak, CSRF, CORS, XSS/custom CSS, file access, webhook replay, rate limit, brute force and log redaction.

**Reference:** Use OWASP ASVS as the verification checklist and map each applicable control to a test or manual review. Do not claim an OWASP certification.

### M09.3 — Responsive and accessibility suite

**Viewports/contexts:** desktop, tablet, narrow mobile, 320px-class width, embedded narrow sidebar, 200% zoom, reduced motion, keyboard only and basic screen-reader semantics.

**Coverage:** field labels/errors, focus order, drag/drop alternative, card 16:9, settings menu, iframe height, inline CSS isolation, long text and failed assets.

### M09.4 — Performance and concurrency baseline

**Measure:** public form TTFB/p95, submit p95, error rate, startup readiness, JS/CSS size, image size, DB lock duration, worker backlog and concurrent submission behavior.

**Gate:** Set product-owned thresholds before declaring pass. If no threshold is supplied, record measured baseline and leave the decision open rather than inventing “fast”.

## 13. Phase 10 — Staged release

### M10.1 — Staging release candidate

**Steps:** build one immutable artifact; run migration against staging copy; deploy; run full smoke; inspect public network/storage/response; run embed hosts; test backup/restore and rollback.

**Gate:** No P0, no unexplained required test failure, no secret leak, no mixed version, no missing backup evidence.

### M10.2 — Canary workspace

**Steps:** allowlist one synthetic/canary workspace; monitor 5xx, auth failures, submit failures, DB locks, worker backlog, public asset failures and embed errors; collect feedback without mixing feature requests and incidents.

**Gate:** Product owner signs the canary result and the rollback decision remains executable.

### M10.3 — Public release decision

**GO requires:**

- Phase 00–10 required gates revalidated;
- public/private forbidden-field scan clean;
- direct, iframe, inline and selected WordPress paths proven;
- drag/drop, keyboard alternative, bounded Grid/Bento layout and templates proven; nested container is not a release requirement;
- 16:9 card image and top-right/bottom-right settings UX proven;
- migration, backup, restore and rollback evidence present;
- cloud runtime, readiness, logs and alerts proven;
- release scope and known limitations explicitly published.

Any missing item is `NO-GO` or `GO-WITH-CAVEATS` only if the risk is explicitly accepted by the product owner and does not violate a P0 security/data gate.

## 14. Per-micro-phase evidence template

Create one redacted evidence file per phase under `release-evidence/<phase-id>/` only when the repository workflow permits generated evidence. Use synthetic values and do not store tokens or personal data.

```markdown
# Phase Evidence: M00.1

Decision: PASS | BLOCKED
Date: record the actual execution date and timezone
Agent: record the actual agent identifier
Scope: list exact absolute file paths

## Entry gate
- Previous phases revalidated: yes/no
- Open blockers: list exact IDs or none

## Baseline
- Command/check:
- Exit code:
- Observed result:

## Change
- Root cause:
- Minimal change:
- Files changed:

## Verification
- Targeted command:
- Exit code:
- Result/count:
- Regression command:
- Exit code:
- Result/count:

## Security/data review
- Public/private impact:
- Tenant predicate review:
- Secrets/log review:
- Migration/rollback impact:

## Diff review
- Unexpected files: none or exact list
- Reviewer decision:

## Gate
- PASS or BLOCKED:
- If BLOCKED, earliest phase to reopen and reason:
```

## 15. Supervisor checklist before allowing the next phase

- [ ] The previous phase’s exact evidence file exists.
- [ ] The previous phase’s changed files match the actual diff.
- [ ] The targeted test was run fresh after the final change.
- [ ] The stable functionality smoke suite was rerun.
- [ ] Lint and available typecheck were rerun.
- [ ] Build was rerun when runtime/config/dependency files changed.
- [ ] Database migration/backup gate was rerun when schema/data code changed.
- [ ] Browser responsive/security inspection was rerun when public/UI/embed code changed.
- [ ] No secret, token, raw PII or production payload entered evidence.
- [ ] No unresolved P0 or architecture blocker is hidden as a warning.
- [ ] The next phase has a smaller declared scope and no overlapping unreviewed file edits.
- [ ] Supervisor, not the worker’s prose, made the PASS decision.

## 16. Official research basis

- [Next.js Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting): reverse proxy, standalone runtime, multi-instance coordination and graceful shutdown.
- [Next.js Deploying](https://nextjs.org/docs/app/getting-started/deploying): production build/start and standalone output.
- [Prisma `migrate deploy`](https://docs.prisma.io/docs/cli/migrate/deploy): applying pending production migrations.
- [Prisma local-to-production migration guidance](https://docs.prisma.io/docs/orm/prisma-client/deployment/deploy-migrations-from-a-local-environment): automated migration delivery and production safety.
- [SQLite Appropriate Uses](https://www.sqlite.org/whentouse.html): one-writer and concurrency limits relevant to the pilot/database decision.
- [MDN `iframe`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe): loading, referrer policy, sandbox and permissions.
- [MDN `postMessage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage): exact target origin and sender validation for cross-origin communication.
- [MDN Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM): DOM/CSS encapsulation for custom elements.
- [MDN CSS `aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/aspect-ratio): stable responsive media boxes such as the 16:9 card image.
- [MDN CSS container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries): container-size responsive behavior for embedded/nested layouts.
- [WordPress Block API](https://developer.wordpress.org/block-editor/reference-guides/block-api/): blocks, dynamic rendering and extension points.
- [WordPress Templates](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-templates/): nested templates, template locking and block trees.
- [WordPress Shortcodes](https://developer.wordpress.org/plugins/shortcodes/): sanitization, escaping and side-effect-free shortcode output.
- [WordPress JavaScript enqueuing](https://developer.wordpress.org/plugins/javascript/enqueuing/): scoped frontend script loading and loading strategies.
- [WordPress Media Add New](https://wordpress.org/documentation/article/media-add-new-screen/): upload/select separation, progress and post-upload media details.
- [WordPress Header Requirements](https://developer.wordpress.org/plugins/plugin-basics/header-requirements/): required plugin metadata and versioning fields.
- [WordPress Plugin Readmes](https://developer.wordpress.org/plugins/wordpress-org/how-your-readme-txt-works/): `readme.txt`, stable tag and release metadata rules.
- [WordPress Plugin Submission](https://developer.wordpress.org/plugins/wordpress-org/planning-submitting-and-maintaining-plugins/): complete ready-to-install ZIP requirement.
- [Elementor image insertion](https://elementor.com/help/add-graphic-element/): media-library selection/upload followed by attachment details and alt text.
- [Typeform image tools](https://help.typeform.com/hc/en-us/articles/360052429631-Add-images-and-GIFs-to-your-forms): upload/library search, image-specific settings and alt/decorative handling.
- [Webflow Assets panel](https://help.webflow.com/hc/en-us/articles/33961269934227-Assets-panel): asset-level alt text, decorative state and asset reuse.
- [W3C Decorative Images](https://www.w3.org/WAI/tutorials/images/decorative/): empty alternative for genuinely decorative imagery.
- [Typeform Embed SDK](https://www.typeform.com/developers/embed/): direct link, inline, full-page, popup, slider, popover and side-tab delivery patterns.
- [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer-intro): reproducible failure evidence with DOM, network and action timeline.
- [Playwright Best Practices](https://playwright.dev/docs/best-practices): CI trace strategy and debugging evidence.
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/): structured web application security verification requirements.
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): token storage and cookie protections.
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/CSRF_Prevention_Cheat_Sheet.html): CSRF tokens/custom headers and defense in depth.
- [GitHub deployment environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments): protected environments, approvals, branch restrictions and environment secrets.

## 17. First execution order

The first worker must execute only these items, in order:

1. M00.1 context inventory.
2. M00.2 local functionality smoke.
3. M00.3 code/build health.
4. M00.4 supervisor baseline gate.
5. If and only if `BASELINE_PASS`: M01.1 public DTO/forbidden-field contract.
6. M01.2 auth/capability policy.
7. M01.3 route slices, beginning with forms.
8. M01.4 submission IDOR regression.
9. M01.5 preview/publish boundary.
10. M01.6 session/public browser storage decision.

No builder, WordPress, inline embed, card polish, integration or cloud packaging work is allowed before the security and baseline gates pass. This ordering prevents an agent from polishing or exporting an unsafe data path.

## 18. Completion statement

The plan is complete only when every required micro-phase has a PASS evidence record, all previous-phase revalidation gates are green, the public browser receives only the published allowlist DTO, all selected exports share the same public contract, and a supervisor has independently verified the final artifact, tests, runtime and rollback path.
