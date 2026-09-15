# MavenForms Sürümlü Modül, First-party ve SaaS Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MavenForms’ı önce şirketimizin etkinlik/kayıt operasyonunda, sonra Türkiye için iyzico öncelikli first-party gerçek ödeme ve muhasebeci kontrollü manuel fatura pilotunda çalışır hale getirmek; Paraşüt ve SaaS’ı V2’den sonra, kanıtlanırsa açılacak ileri sürümler olarak korumak.

**Architecture:** Çıkış sürümü ile teknik bağımlılık sırası ayrıdır. V1 yalnız kayıt/form operasyonunu açar; ödeme, fatura ve SaaS kodu server-side sözleşme olarak bulunabilir fakat entitlement/feature gate olmadan kullanıcıya ve public forma açılmaz. V2 yalnız şirketimizin kendi merchant hesabı, Türkiye için iyzico öncelikli ödeme ve muhasebecinin manuel fatura belgesiyle çalışır. Banka Sanal POS ve Stripe, yeni araştırmadaki sözleşme/merchant/ülke/aktivasyon belirsizlikleri nedeniyle V3 ve sonrasına ertelenir; V2 uluslararası ödeme sözü vermez. V3 Paraşüt bağlantısı aynı fatura sözleşmesinin risk ve resmi kanıt kapısından geçecek aday otomatik yoludur; geçmezse manuel yol korunur ve otomasyon açılmaz. V4 her tenant’ın kendi ödeme, muhasebe ve mail bağlantısını kullandığı, MavenForms’ın son müşteri parasını tenant adına toplamadığı çok kiracılı üründür.

**Tech Stack:** Next.js App Router, React, TypeScript, Bun, Prisma, SQLite pilot tabanı, server-side provider adapter’ları, encrypted credential envelope, private/quarantine document storage, transactional outbox ve mevcut workflow/phase gate sistemi.

**Spec:** Bu plan, `docs/superpowers/plans/2026-09-02-mavenforms-e-belge-15-dakikalik-uygulama-paketleri.md`, `docs/runbooks/r10-first-party-pilot-and-manual-invoice.md`, `docs/runbooks/r10-payment-invoice-hold-and-mail-separation.md`, `docs/OzelAPP_Derin_Arastirma_2026-09-03/`, `docs/Anonim_Teknik_Mimari_API_ve_Uygulama_Sozlesmesi.md`, 2026-09-07 teslim edilen anonim banka Sanal POS/Stripe alternatif araştırması ve `docs/research-sources/2026-09-07-mail-configuration-research-receipt.md` içindeki anonim mail araştırma raporunu sürümlü ürün planına bağlar. Dış araştırma karar kaynağıdır; resmi provider sözleşmesi, merchant aktivasyonu veya canlı test kanıtı yerine geçmez.

## Global Constraints

- V1 → V2 → V3 → V4 çıkış sırası değişmez.
- R-10 yatay bir ortak güvenlik standardıdır; yalnız V4 gereksinimi değildir fakat tek bir blanket geliştirme kilidi değildir. V1 iç kullanım, V2 first-party ödeme/manual fatura pilotu, V3 ileri provider ve V4 SaaS için ayrı kanıt kapıları uygulanır.
- İlk ürün hedefi V1 çalışan iç kullanım + V2 Maven first-party gerçek ödeme + manuel fatura gönderim pilotudur. V3 Paraşüt ve V4 SaaS bu hedefin önkoşulu değildir.
- Teknik güvenlik sırası `PAY → INV/F manuel → Paraşüt API v4 → document security/document-ready → gerekli transactional delivery → pilot → FORM-UX → SAAS/BILL` olarak korunur.
- V4 en ileri ürün safhasıdır. `V4-00..02` yalnız gelecekteki tenant izolasyonu, entitlement ve BYO bağlantı sınırlarını hazırlayan teknik sözleşmelerdir; `V4-03+` ancak V1/V2 ilk hedefi, first-party pilot, gerekli teslimat ve release kararları tamamlandıktan sonra yürütülebilir.
- Çıkış modülü açılmadan önce o modülün server-side entitlement, auth, workspace/tenant scope, idempotency, audit ve public/private sınırları geçmelidir.
- UI’da görünen buton veya ayar, server-side capability kararının yerine geçmez.
- V1’de gerçek payment provider çağrısı açılmaz; V2’de Paraşüt otomatik fatura ve tenant end-customer tahsilatı açılmaz; V3/V4 kendi kanıt kapıları geçmeden canlılaştırılmaz.
- Kart numarası, CVV/PAN, provider secret, access token, raw provider response, banka hesabı sırrı ve gerçek alıcı PII kaynak koduna, public DTO’ya, log’a veya test fixture’ına yazılmaz.
- Şirketimizin hukuki/merchant kimliği server-side yetkili yapılandırma olarak tutulur; gerçek değerler source, fixture ve anonim araştırma dosyalarına yazılmaz.
- Muhasebeci faturayı kendi yetkili sisteminde keser; MavenForms ilk manuel aşamada fatura düzenleyicisi değildir.
- Fatura maili ile form kayıt/karşılama bildirimi ayrı `messageClass`, sender profile, template namespace, queue, suppression, idempotency ve audit alanlarına sahiptir.
- V2’de fatura gönderimi otomatik tetiklenen toplu dispatch değildir: document-ready sonrası yetkili kullanıcı tarafından başlatılan, ayrı billing sender kullanan manuel gönderimdir. Otomatik fatura gönderimi ayrı bir risk/teslim edilebilirlik kararı olarak ertelenir.
- Katılımcıya tekil veya seçili toplu bilgi mesajı, fatura teslimatı değildir. Bu iki akış ayrı sender/profile, template namespace, queue, suppression, idempotency ve audit sözleşmeleriyle çalışır; toplu katılımcı bildirimi pazarlama kampanyası olarak varsayılamaz.
- `notification` ve `transactional` bu ürünün teknik sınıflarıdır; tek başlarına KVKK/İYS/GDPR/ePrivacy bakımından hukuki izin sonucu doğurmaz. Gerçek amaç ve içerik ayrıca değerlendirilir; operasyonel maile promosyon eklenirse hukuki sınıf değişebilir.
- DMARC için araştırma kaydındaki güncel RFC 9989/9990/9991 referansları kullanılır; DMARC pass teslim veya inbox garantisi değildir. SPF/DKIM/DMARC, domain reputation, provider acceptance ve alıcı filtreleri birlikte değerlendirilir.
- Provider özelliği ile gerçek hesapta etkin/approved özellik ayrıdır. Domain, DNS, KYC, quota, region, production access ve delivery kanıtı `EXTERNAL_DEPENDENCY` kalır; provider webhook doğrulaması HMAC kullanıyor varsayılmaz.
- 2026-09-07 kararına göre iyzico Türkiye için birincil ödeme adayıdır. Banka Sanal POS ve Stripe V3+ adaydır; resmi merchant/ülke/kanal/3DS/refund/reconciliation kanıtı olmadan UI’da aktif provider veya public mutation olamaz.
- Paraşüt otomatik faturalama silinmez; ancak V2 çıkış önkoşulu değildir ve V3’te risk, resmi entegrasyon ve mali müşavir kanıtı geçilene kadar `DEFERRED/OPTIONAL` kalır. Manuel fatura yolu korunur.
- Fatura eki sektör açısından riskli olduğundan varsayılan teslim biçimi süreli güvenli belge bağlantısıdır; ek gönderimi yalnız boyut/MIME/tarama/alıcı/provider sınırları geçilirse opsiyonel olarak açılır.
- Her mikro-faz en fazla 15 dakika, tek ölçülebilir çıktı ve kendi hedef testiyle tamamlanır.
- Bir fazın kapısı geçmezse sonraki faza geçilmez; eksik iş `PASS` olarak yazılmaz.
- `LOCAL_PASS`, gerçek provider, mali müşavir/hukuk, AV, production TLS, backup/restore veya release kanıtı değildir.
- İleri provider’lar için erken aşamada yalnız provider-neutral port, capability/evidence kaydı, normalized result ve feature-gate sözleşmesi kurulabilir. Sağlayıcıya özgü credential, endpoint, webhook varyantı, canlı mutation ve resmi API ayrıntısı ilgili ertelenmiş faza bırakılır; erken mimari hazırlık tamamlanmış entegrasyon sayılmaz.

## Sürüm karar tablosu

| Sürüm | Kullanıcı | Açılan iş | Kapalı kalan iş | Çıkış kanıtı |
|---|---|---|---|---|
| V1 — Maven Internal Forms | Maven ekipleri | Etkinlik kayıtları, katılımcılar, araştırma/quiz formları, manuel ödeme durumu, kontrollü bilgi mesajı | Online provider, otomatik fatura, SaaS | Form oluştur → yayınla → kayıt al → manuel ödeme durumu değiştir → izinli mesaj gönder |
| V2 — Maven Online Payment + Manual Invoice | Maven şirketi | Türkiye için iyzico öncelikli provider, doğrulanmış first-party ödeme, muhasebecinin yüklediği fatura, yetkili manuel fatura maili | Banka Sanal POS, Stripe V3+, Google Pay direct, Paraşüt otomatik fatura, otomatik/toplu fatura dispatch, tenant BYO | İyzico sandbox kanıtı → manuel belge → approval/document-ready → yetkili ayrı fatura teslimi |
| V3 — Deferred Provider and Paraşüt Evaluation | Maven şirketi + muhasebeci | Paraşüt ve banka Sanal POS/Stripe adaylarının resmi kanıt, risk ve pilot değerlendirmesi; manuel fallback | Kanıt geçmeden otomatik faturalama, otomatik fatura maili ve live provider mutation | Provider/merchant/ülke/3DS/refund/reconciliation + Paraşüt/GİB/mali müşavir kanıtı; aksi halde DEFERRED |
| V4 — SaaS BYO Merchant | Dış şirket tenant’ları | Modül bazlı kiralama, tenant’ın kendi provider/muhasebe/mail bağlantıları, destek için izinli break-glass | MavenForms’ın tenant müşterisi adına para toplaması | Tenant izolasyonu, BYO provider, tenant sender, subscription state ve suspend/reactivate testi |

## Önceki çalışmaların sürüm karşılığı

- Public form, publish snapshot, submission, builder, media, responsive ve response ekranları V1’in temelidir; yeniden yazılmaz.
- PAY-00..PAY sözleşmeleri, provider adapter’ları, webhook/refund/reconciliation ve R-00..R-10 güvenlik işleri V2’nin arka plan bağımlılıklarıdır; V1’de kapalı kalır.
- Manuel invoice/import/export, private document, quarantine, matching, approval ve `document_ready` işleri V2’nin fatura temelidir.
- Paraşüt P-00..P-12 işleri V3’e taşınır; manuel yol V3’te de fallback olarak korunur.
- `R-10C` first-party local/staging capability ayrımıdır; global production R-10 `NO-GO` kararını veya V4 SaaS kapısını açmaz.
- Eski `R-10B` kanal ayrımı geçerlidir; `R-10C` yalnız first-party pilotun blanket hold’dan ayrılan kapsamını ekler.

## Modül ve entitlement sözleşmesi

V1’den itibaren her workspace/form için modül kararı server-side tutulur. İlk sözleşme aşağıdaki sabit anahtarları kullanır:

```ts
export type ProductModule =
  | 'registration_forms'
  | 'manual_payment_tracking'
  | 'participant_notifications'
  | 'online_payments'
  | 'manual_invoices'
  | 'parasut_invoices'
  | 'transactional_invoice_delivery'
  | 'tenant_byo_connections'
  | 'support_break_glass'
  | 'subscription_billing'

export type ModuleDecision = {
  module: ProductModule
  enabled: boolean
  reason: 'version_entitlement' | 'admin_disabled' | 'security_gate' | 'external_dependency' | 'tenant_suspended'
  scope: 'workspace' | 'form' | 'tenant'
}
```

Her karar `evaluateModuleAccess({ workspaceId, formId, actor, module, environment })` benzeri server-side fonksiyondan geçer. `online_payments`, `manual_invoices`, `parasut_invoices` ve `transactional_invoice_delivery` R-10/R-10C koşullarını ayrıca çağırır. Tenant’ın V4 modülü açılması first-party merchant bilgilerini veya başka tenant verisini görünür yapmaz.

## Faz uygulama kuralları

Her faz için sıra:

1. Packet `READY`, önceki receipt `LOCAL_PASS` ve allowed files doğrulanır.
2. `node scripts/workflow.mjs begin <packet>` ile baseline alınır.
3. Yalnız packet `reads` ve doğrudan import/call-site bağımlılıkları okunur.
4. Önce hedef test yazılır; test çalıştırılarak beklenen başarısızlık kanıtlanır.
5. En küçük implementation yazılır.
6. Hedef test, önceki ilgili testler, TypeScript ve gerektiğinde build/readiness çalıştırılır.
7. `node scripts/workflow.mjs verify <packet>` çalıştırılır.
8. Receipt ve `STATUS.md` güncellenmeden sonraki faza geçilmez.

---

## V1 — Maven Internal Forms

V1, şirketimizin kendi etkinliklerinde katılımcı kaydı ve operasyon takibi için yayınlanır. V1’in para durumu yalnız yetkili kişi tarafından manuel işlenir; ödeme sağlayıcısı çağrısı veya otomatik fatura üretimi yapılmaz.

### V1-00 — Release profile ve kapalı modül matrisi

**Durum:** `V1-00A` revizyonu `LOCAL_PASS`; V1 modül matrisi uygulanmış ve doğrulanmıştır.

**Files:** Create `docs/workflow/packets/V1-00.json` (revizyon: `V1-00A`), `src/lib/release-module.ts`, `tests/release-module.test.mjs`; modify `STATUS.md`.

**Produces:** V1’de `registration_forms`, `manual_payment_tracking` ve `participant_notifications` açık; `online_payments`, `manual_invoices`, `parasut_invoices` ve SaaS modülleri kapalı server-side karar.

- [ ] Testte V1 için açık/kapalı modülleri tam obje eşitliğiyle doğrula.
- [ ] Server-side module resolver’da sürüm ve environment kontrolünü uygula; browser’dan gelen `version` değerini kabul etme.
- [ ] `V1-00` packet’ini ve receipt’i kaydet.

**Gate:** Targeted module test + TypeScript + workflow verify. Bu faz gerçek ödeme yolu açmaz.

### V1-01 — Katılımcı manuel ödeme durum sözleşmesi

**Durum:** `LOCAL_PASS`; manuel ödeme state graph, yetkili roller ve audit metadata sözleşmesi doğrulanmıştır.

**Files:** Create `src/lib/manual-payment-status.ts`, `tests/manual-payment-status.test.mjs`; modify the existing authenticated submission update route only after its call site is listed in the packet.

**Produces:** Her katılımcı kaydında `unpaid`, `paid`, `review`, `refunded` durumları; yalnız yetkili `accounting`/`admin`/`owner` rollerinin değişiklik yapabilmesi; actor/time/audit kaydı.

- [ ] State transition testinde `unpaid → paid`, `paid → refunded`, belirsiz veya yetkisiz geçişleri doğrula.
- [ ] Ödeme durumu request body’sinden workspace, actor, amount ve provider id alma; bunları server-side kayıttan türet.
- [ ] Payment provider olmadığı için `paid` durumunun “online provider tarafından doğrulandı” anlamına gelmediğini UI ve audit copy’sinde ayır.

**Gate:** Manual status targeted test + auth/policy regression + TypeScript.

### V1-02 — Standart karşılama ve ödeme bekliyor mesajı

**Durum:** `LOCAL_PASS`; server-derived recipient, yetkili ödeme metni, notification sınıfı ve idempotency sözleşmesi doğrulanmıştır.

**Files:** Create `src/lib/participant-message-policy.ts`, `tests/participant-message-policy.test.mjs`; use existing notification outbox/suppression modules.

**Produces:** Form kaydı sonrası standart hoş geldiniz mesajı ve yetkili kişinin seçtiği “ödemeniz bekleniyor” bilgi mesajı. Ticari kampanya, gizli provider bilgisi ve yanlış alıcıya PII gönderimi engellenir.

- [ ] Template testinde form başlığı, kayıt yöntemi/sponsorluk açıklaması ve muhasebe tarafından izin verilen ödeme metnini allowlist ile doğrula.
- [ ] Recipient yalnız encrypted snapshot veya yetkili operasyon kaydından server-side çözülsün; browser recipient override reddedilsin.
- [ ] Banka hesap bilgisinin public form snapshot’ına değil, yetkili mesaj ayarına ait olduğunu belgeleyip log redaction testini ekle.

**Gate:** Targeted policy/outbox test + public boundary regression.

### V1-03 — Form, etkinlik, araştırma ve quiz kullanım profilleri

**Files:** Create `src/lib/form-use-profile.ts`, `tests/form-use-profile.test.mjs`; modify only existing form creation/update mapping files listed by the packet.

**Produces:** `event_registration`, `research_survey`, `quiz` profilleri; profil yalnız varsayılan alan/yardım metni/rapor görünümü seçer, güvenlik veya ödeme yetkisi vermez.

- [ ] Her profil için gerçek FormField şema örneğini sentetik fixture ile doğrula.
- [ ] Profil değiştirilince mevcut yayınlanmış snapshot’ın geriye dönük bozulmadığını test et.
- [ ] Quiz puanı ile ödeme/katılımcı onayı arasında otomatik mali karar kurulmadığını doğrula.

**Gate:** Profile test + publish snapshot regression + TypeScript.

### V1-04 — Form operasyon ekranı

**Files:** Modify existing form list, form detail, submissions and reports views; create `tests/v1-internal-forms-view.test.mjs`.

**Produces:** Form seçildiğinde form özeti, katılımcı sayısı, manuel ödeme durumu, son yanıtlar ve izinli mesaj eylemi aynı bağlamda görünür. Payment API/Paraşüt ayarları V1’de görünür “kilitli modül” açıklaması olabilir, çalışır buton olamaz.

- [ ] Responsive kart/table görünümünde ödeme durumu ve mesaj action’ının taşmadığını doğrula.
- [ ] Yetkisiz kullanıcıda durum değiştirme ve mesaj gönderme action’larının server yanıtıyla da reddedildiğini test et.
- [ ] Ekranda “manuel işaretlendi” ile “provider tarafından doğrulandı” ayrımını açıkça göster.

**Gate:** UI contract + auth regression + production build.

### V1-05 — V1 çıkış kapısı

**Files:** Create `docs/workflow/packets/V1-05.json`, `tests/v1-release-gate.test.mjs`; modify `RELEASE-DECISION.md`, `STATUS.md`.

**Produces:** V1 release checklist: form oluşturma, yayınlama, public kayıt, response listesi, manuel ödeme durumu, standart/izinli mesaj ve export.

- [ ] V1 testinde online provider, Paraşüt, fatura delivery ve SaaS capability’lerinin kapalı olduğunu tam obje olarak doğrula.
- [ ] 360/768/1280 ekran kanıtı ve public/private DTO kanıtını checklist’e bağla.
- [ ] `LOCAL_PASS` ile V1 production release approval arasındaki farkı karara yaz.

**Gate:** Full relevant regression + TypeScript + build + `/api/ready` + workflow verify. Eksik dış kanıt varsa V1 geliştirme devam eder, V2 live açılmaz.

---

## V2 — Maven Online Payment + Manual Invoice

V2 yalnız Maven’ın kendi first-party merchant hesabı için tasarlanır. Tenant/BYO ödeme yoktur. Yeni araştırma kararıyla iyzico Checkout Form Türkiye için birincil ve uygulanacak ilk provider’dır. V2 kapsamı, iyzico’nun resmi merchant/sandbox ve R-10 kanıtı tamamlanmadan live açılmaz; banka Sanal POS, Stripe ve Google Pay direct V2’den çıkarılmış ertelenmiş adaylardır. V2 uluslararası ödeme desteği taahhüt etmez. Manuel fatura yolu V2’nin çekirdek yoludur; Paraşüt otomasyonu ve otomatik/toplu fatura maili bu sürümün önkoşulu değildir.

### V2-00 — Provider ve ülke karar matrisi

**Files:** Create `docs/workflow/packets/V2-00.json`, `docs/acceptance/v2-provider-evidence-matrix.md`, `tests/v2-provider-matrix.test.mjs`; read existing PAY/R-10 docs and official provider sources.

**Produces:** Provider capability table with `supported`, `sandbox_ready`, `merchant_verified`, `production_eligible`, `deferred` states.

- [ ] İyzico hosted Checkout Form için initialize/token/retrieve/callback/webhook evidence alanlarını tanımla.
- [ ] Stripe için Türkiye merchant eligibility kanıtını zorunlu koşul yap; desteklenmeyen ülke varsayımıyla live açma.
- [ ] Google Pay’i PSP/gateway capability olarak modelle; merchant ID, HTTPS, risk/3DS ve production review kapılarını ekle.

**Gate:** Matrix test + official-source review. Matrix provider credentials içermez.

### V2-01 — First-party merchant kapsamı ve server gate wiring

**Files:** Modify `src/lib/r10-scope-gate.ts`, `src/lib/payment-connection-gate.ts`, payment worker caller; create `tests/v2-first-party-payment-gate.test.mjs`.

**Produces:** Yalnız server-side first-party workspace/merchant scope için sandbox payment capability. Public request ile first-party/SaaS scope seçilemez.

- [ ] Merchant identity, workspace id, environment ve provider connection ilişkisini server-side doğrula.
- [ ] `first_party` dışındaki scope’larda `paymentSandbox=false` ve production’da global R-10 kanıtı olmadan mutation=false dönmesini test et.
- [ ] R-10C `FIRST_PARTY_LIMITED` sonucunu gerçek live provider açma sinyali olarak kullanma.

**Gate:** Gate test + payment route truth + public payment security regression.

### V2-02 — İyzico hosted checkout

**Files:** Use existing `src/lib/iyzico-checkout-client.ts`, `src/lib/iyzico-checkout-orchestration.ts`, `src/app/api/public/forms/[slug]/payment-intents/route.ts`; create `tests/v2-iyzico-hpp-flow.test.mjs`.

**Produces:** Server-created PaymentOrder → hosted Checkout Form → opaque callback/retrieve flow. Card data MavenForms’a girmez.

- [ ] Tutar/para birimini yayınlanmış fiyat snapshot’ından server’da üret.
- [ ] Token/paymentPageUrl’yi yalnız gerekli public payment response’unda, kısa ömürlü ve scope bağlı taşı; secret/client credential taşıma.
- [ ] Callback’i yalnız pending UI sonucu say; retrieve + imzalı webhook + PaymentOrder correlation olmadan `succeeded` yazma.

**Gate:** Synthetic contract + route boundary + TypeScript. Gerçek sandbox kanıtı ayrıca external evidence olarak işaretlenir.

### V2-03 — Webhook, retrieve, refund ve reconciliation

**Files:** Existing payment webhook inbox/retrieve/refund modules; create `tests/v2-payment-chain.test.mjs`; modify only packet-listed call sites.

**Produces:** Verified payment state machine: `created → processing/requires_action → succeeded|failed`; refund/cancel/dispute ayrı review kayıtları.

- [ ] İyzico V3/Stripe imza, raw body, event duplicate, timestamp/replay ve provider/payment correlation testlerini çalıştır.
- [ ] Refund/cancel/dispute durumunu invoice silmeye veya otomatik credit-note kararına dönüştürme.
- [ ] Tutar, currency, merchant account ve internal order match olmadan fulfillment/fatura adımı başlatma.

**Gate:** Payment chain regression + full runner + build/readiness.

### V2-04 — Stripe conditional adapter — DEFERRED

**Files:** Existing Stripe adapter/contracts; create `tests/v2-stripe-conditional-gate.test.mjs` and provider evidence packet.

**Produces:** Stripe adapter source-level sözleşmesi korunur; ancak yeni araştırma kararıyla V3 ve sonrasına ertelenir. Türkiye merchant/ülke uygunluğu, hosted checkout, 3DS, webhook, refund, reconciliation ve R-10 kanıtları tamamlanmadan UI/provider mutation açılmaz.

- [ ] Test/live key ve webhook secret ayrımını doğrula.
- [ ] Checkout Session/hosted path’i varsayılan; Payment Element yalnız scope ve PCI review ile açılabilir.
- [ ] Stripe uygunluk kanıtı olmadan UI’da “aktif” provider gösterme.

**Gate:** Adapter contract + evidence gate. Bu faz Stripe production hesabı oluşturmaz.

### V2-05 — Google Pay gateway extension — DEFERRED

**Files:** Create `src/lib/google-pay-capability.ts`, `tests/v2-google-pay-gateway.test.mjs`; modify payment method presentation only after iyzico veya daha sonra kabul edilen gateway’in Google Pay desteği resmi olarak kanıtlanırsa.

**Produces:** Google Pay yalnız seçilmiş destekli PSP gateway’i doğrulanınca görünür; direct PAN processing yolu oluşturulmaz.

- [ ] `isReadyToPay` ve merchant/domain readiness olmadan buton göstermeme testini ekle.
- [ ] Gateway token’ını internal card data gibi persist etmeme; yalnız provider handoff correlation tut.
- [ ] HTTPS, merchant ID, browser/device, fraud/3DS ve Google production access checklist’ini bağla.

**Gate:** Capability test + public DTO test + provider evidence review.

### V2-06 — Ödeme sonrası fatura hazırlama olayı

**Files:** Existing payment-to-invoice snapshot modules; create `tests/v2-invoice-preparation-intent.test.mjs`.

**Produces:** Yalnız doğrulanmış `payment.succeeded` sonrası fatura hazırlama bildirimi; fatura henüz kesilmiş sayılmaz.

- [ ] Etkinlik adı, kayıt yöntemi/sponsorluk, ücret aşaması, amount/currency ve tax snapshot alanlarını allowlist ile üret.
- [ ] “Faturanız hazırlanıyor” mesajını invoice delivery ile karıştırma; invoice document-ready olmadan fatura eki/linki gönderme.
- [ ] Alıcı emailini encrypted invoice snapshot’tan server-side al.

**Gate:** Payment/invoice binding + email class regression.

### V2-07 — Manuel fatura yükleme, eşleştirme ve onay

**Files:** Existing invoice document upload/matching/approval routes and views; create `tests/v2-manual-invoice-flow.test.mjs`.

**Produces:** Muhasebecinin dış sistemde kestiği PDF/XML belgesinin ilgili ödeme/katılımcı kaydına private upload → quarantine → match → approval → `document_ready` akışı.

- [ ] Public participant’a invoice upload veya invoice listesi açma.
- [ ] Upload yapan actor, workspace, invoice record, payment order, submission ve document scope’unu server-side doğrula.
- [ ] Issuer/amount/tax/legal classification için otomatik tahmin yerine `accounting_review_required` kullan.

**Gate:** Document security + matching + approval + concurrency tests.

### V2-08 — Ayrı fatura sender ve yetkili manuel teslimat

**Files:** Existing sender/queue/outbox/invoice email modules; create `tests/v2-invoice-delivery-manual.test.mjs`.

**Produces:** Fatura sender’ı `document_ready` sonrası, form kayıt sender’ından bağımsız çalışır; gönderim yetkili kullanıcı eylemiyle başlar. Otomatik veya toplu fatura dispatch bu fazın dışında ve ertelenmiş karardır.

- [ ] Fatura mailinde secure link varsayılanı; attachment mode yalnız clean scan, size/MIME, sender health ve recipient validation geçerse izinli.
- [ ] `notification` form mesajı ile `transactional` invoice mailinin queue, idempotency ve suppression sınırlarını tam eşitlikle doğrula.
- [ ] Provider `accepted` durumunu `delivered` sayma; bounce/complaint/suppression durumlarını ayrı kaydet.

**Gate:** Email delivery gate + document-ready regression + public/private test.

### Mail yetenek genişletmesi — ana sürüm sırasına bağlı mikro-fazlar

Bu bölüm kullanıcı talebini plana alır; `V1 → V2 → V3 → V4` sırasını ve `PAY → INV/F manuel → Paraşüt → document-ready → transactional delivery → pilot → FORM-UX → SAAS` teknik bağımlılığını değiştirmez. Amaç MavenForms’ı genel amaçlı mailing/campaign ürünü yapmak değildir. Amaç, form yanıtı içindeki katılımcıya beklenen operasyonel bilgi mesajını tekil veya güvenli biçimde seçili toplu gönderebilmek, gönderilen içeriği saklamak ve tekrar kullanılabilir şablonlar yönetmektir.

**Kapsam kararı:** `ACCEPTED_WITH_ROUTING`.

- **Form katılımcı mesajı:** Hoş geldiniz, kayıt alındı, ödeme bekleniyor, etkinlik bilgisi veya yetkili operasyon bildirimi. `notification` sınıfı ve form kayıt sender’ı kullanır.
- **Gönderim sonrası otomatik onay:** Form oluşturulurken form sahibi tarafından açıkça etkinleştirilen “Yanıtınız alınmıştır”, “Katılımınız kaydedilmiştir” veya benzeri operasyonel onay; seçilen şablonun yayınlanmış sürümüyle, başarılı submission sonrasında outbox’a alınır.
- **Fatura/ödeme mesajı:** “Faturanız hazırlanıyor” ve yalnız `document_ready` sonrası yetkili manuel fatura teslimi. `transactional` sınıfı ve ayrı billing sender kullanır.
- **Pazarlama/kampanya:** Bu roadmap’in parçası değildir. Açılması için ayrı açık rıza, abonelikten çıkma, suppression, domain itibar ve kampanya sağlayıcısı kapıları gerekir; katılımcı toplu bilgi mesajı bu sınıfa otomatik dönüştürülmez.
- **Tenant yolu:** V4’te tenant kendi verified sender, domain, suppression ve provider bağlantısını kullanır; MavenForms tenant adına mail gönderen ortak kimlik veya ortak alıcı havuzu olmaz.

#### MAIL-00 — Kanal ve yetki sözleşmesi

**Produces:** Form bildirimi, fatura teslimatı ve kampanya sınıfları için ayrılmış `messageClass`, sender profile, template namespace, authorization, tenant/form scope ve audit sözleşmesi.

- Form sahibi/authorized operator yalnız kendi workspace ve formundaki submission kayıtlarından alıcı seçebilir.
- Browser’dan serbest `to`, `from`, payment amount veya ownership override’ı kabul edilmez. `formId`, `submissionId`, `templateId` ve `jobId` yalnız selector olarak gelebilir; her biri server-side workspace/tenant/form/object authorization’dan geçirilir.
- Form bildirimine promosyon, çapraz satış veya kampanya içeriği eklenirse yalnız `notification` etiketi yeterli sayılmaz; İYS/KVKK/ePrivacy purpose/consent incelemesi gerekir.
- Fatura sender’ı ve fatura şablonları form bildirim ekranından seçilemez; `document_ready` ve V2-08 yetkisi olmadan fatura akışı oluşturulamaz.

**Gate:** Policy testleri; cross-form/cross-workspace, public route ve invoice boundary regression.

#### MAIL-01 — Şablon ve taslak yaşam döngüsü

**Produces:** Kullanıcının mail taslağı oluşturduğu, kaydettiği, kopyaladığı, sürümlediği, önizlediği, yayınladığı ve arşivlediği güvenli şablon modeli.

- `draft → published → archived` yaşam döngüsü; gönderilmiş mesajın kullandığı şablon sürümü immutable snapshot olarak saklanır.
- Şablon form/workspace/message class kapsamına bağlıdır; başka form veya tenant şablonu listelenmez.
- Kaydedilmiş taslak ile gönderilmiş mesaj ayrıdır; gönderilmiş mesaj sonradan düzenlenerek geçmiş kaydı değiştiremez.

**Gate:** Template CRUD, version immutability, scope and audit tests.

#### MAIL-02 — Güvenli değişken ve içerik sözleşmesi

**Produces:** Kullanıcının form bağlamına göre izinli merge tag’leri seçebildiği, server-side render edilen şablon içeriği.

- Yalnız allowlist tag’leri açılır: form adı, etkinlik adı, katılımcı adı, kayıt yöntemi/sponsorluk açıklaması, ödeme durumu ve yetkili olarak izin verilen tarih/yer bilgileri.
- Provider secret, token, internal id, raw provider payload, banka sırrı, kart verisi ve gereksiz PII tag olarak sunulmaz.
- HTML güvenli biçimde sanitize/escape edilir; script, remote tracking injection, provider URL ve yetkisiz attachment engellenir.

**Gate:** Render allowlist, escaping/sanitization, PII redaction and public/private tests.

#### MAIL-03 — Kullanıcı dostu şablon düzenleyici, önizleme ve test gönderimi

**Produces:** Form ayarlarında veya yanıt operasyonunda şablon oluşturma/düzenleme, gerçek form verisiyle güvenli önizleme ve sınırlı test alıcısına test gönderimi. Form sahibi için hazır operasyonel örnek şablonlar ve alanın ne işe yaradığını açıklayan görsel yardım metinleri bulunur.

- Düzenleyicide konu, gövde, izinli değişken seçimi, plain-text fallback ve gönderici profilinin ayrı gösterimi bulunur.
- Hazır başlangıç şablonları en az `Yanıtınız alınmıştır`, `Katılımınız kaydedilmiştir`, `Ödemeniz bekleniyor` ve `Etkinlik bilgisi` amaçlarını açıkça ayırır; kullanıcı bunları kopyalayıp düzenleyebilir, ancak otomatik kampanya gibi sunulmaz.
- Şablon seçim ekranı, “hangi olayda gönderilir”, “hangi alıcıya gider”, “hangi değişkenler kullanılabilir” ve “fatura değildir” açıklamalarını kısa görsel rehber/kılavuz kartlarıyla gösterir.
- Önizleme hiçbir zaman gerçek gönderim sayılmaz; test gönderimi yalnız yetkili iç test adreslerine ve ayrı idempotency anahtarına gider.
- UI’da görünen “Gönder” butonu server capability, template published state, sender health ve recipient policy geçmeden aktif görünmez.

**Gate:** UI/API contract, responsive states, authorization, preview/test-send separation and outbox tests.

#### MAIL-03A — Form oluştururken gönderim sonrası otomatik mail seçimi

**Produces:** Yeni veya düzenlenen formda, otomatik onay mailinin gönderilip gönderilmeyeceği, hangi operasyonel şablonun kullanılacağı ve içeriğin form sahibinden alınacağı açık bir kurulum adımı.

- Varsayılan güvenli değer `kapalı` veya açık kullanıcı seçimi olur; sessiz opt-in yapılmaz.
- Kullanıcı otomatik gönderimi açtığında konu ve gövde zorunlu hale gelir veya yayınlanmış bir hazır şablon seçmesi istenir. Boş/yalnız placeholder içerik kaydedilemez.
- Form publish öncesi özet onayı gösterilir: olay `submission.accepted`, alıcı server-derived katılımcı e-postası, sender profile, template version, message class `notification` ve gönderim kapısı.
- Başarısız/anti-abuse reddedilmiş submission için onay maili kuyruğa alınmaz; aynı submission ve template version için idempotency korunur.
- E-posta alanı olmayan, geçersiz veya suppression durumundaki katılımcıya gönderim yapılmaz; form yanıtı yine güvenli biçimde işlenir.
- Bu otomatik onay maili fatura, ödeme başarı kanıtı veya pazarlama izni değildir; ödeme ve fatura durumları yalnız doğrulanmış ayrı olaylardan gelir.

**Gate:** Form create/update/publish contract, default-off/explicit-consent, recipient derivation, validation, idempotency and public-boundary tests.

#### MAIL-04 — Tekil katılımcıya kontrollü gönderim

**Produces:** Yanıt detayından seçilen tek katılımcıya, server-derived recipient ile operasyonel bilgi mesajı gönderimi.

- Seçim `submissionId` üzerinden yapılır; alıcı e-posta değeri request body’den alınmaz.
- Gönderim öncesi form publish/scope, katılımcı e-postası, suppression/bounce/complaint durumu, template published version ve sender health yeniden doğrulanır.
- Otomatik olaylarda event/idempotency kaydı; kullanıcı başlatmalı tekil gönderimde `clientCommandId` veya `Idempotency-Key`; bilinçli resend’de yeni command; batch’te `batchJobId + recipientSnapshotId` kullanılır. Aynı command tekrarı engellenir, yeni bilinçli resend kalıcı olarak bloke edilmez.
- Gönderim ve teslimat durumları `queued`, `accepted`, `delivered`, `bounced`, `complained`, `suppressed`, `failed` olarak ayrılır; provider `accepted` sonucu `delivered` sayılmaz.

**Gate:** Single-recipient auth, idempotency, suppression and delivery-state tests.

#### MAIL-05 — Seçili toplu gönderim işi

**Produces:** Kullanıcının yanıt listesinden tek tek seçtiği veya server-side filtreyle sınırlandırdığı katılımcılara bounded batch job oluşturması; her alıcının sonucu ayrı izlenir.

- “Tümünü gönder” kör eylemi yoktur; kapsam, toplam alıcı sayısı, şablon sürümü, sender ve message class gönderim öncesi açıkça onaylanır.
- Alıcı listesi gönderim anında server-side snapshot alınarak dondurulur; sayfalama veya filtre değişikliği çalışan işi değiştirmez.
- Job `pending → queued → sending → completed|partial|cancelled|failed` durumlarına sahiptir; duraklatma/iptal, bounded batch, rate limit ve concurrency fence uygulanır.
- Her alıcı için `sent`, `suppressed`, `invalid`, `failed`, `retrying` sonucu saklanır; tek bir hata bütün işi başarı göstermiş saydırmaz.
- Uygulamanın batch cap’i provider’ın request/quota limitinden ayrı bir abuse/security politikasıdır; pilot cap’i ürün kararı olarak konfigüre edilir ve provider standardı diye sunulmaz.
- Toplu katılımcı bildirimi operasyonel beklenen mesaj ise `notification` sınıfında kalır; pazarlama kapsamı ve açık rıza yoksa kampanya sağlayıcısına aktarılmaz.

**Gate:** Batch selection snapshot, per-recipient idempotency, rate limit, cancel/retry/dead-letter and audit tests.

#### MAIL-06 — Teslim edilebilirlik, suppression ve gözlemlenebilirlik

**Produces:** Gönderici domain health, SPF/DKIM/DMARC durumu, bounce/complaint/suppression listesi, bounded retry, dead-letter ve operatör raporu.

- Form bildirimleri ile fatura teslimatının suppression ve audit kayıtları ayrı namespace’lerde tutulur; invoice gönderimi için ayrı billing sender zorunludur.
- Hard bounce/complaint/suppressed alıcıya yeniden deneme yapılmaz; temporary failure için bounded exponential retry ve ardından review/dead-letter kullanılır.
- Loglarda raw provider response, token, tam e-posta içeriği ve gereksiz PII tutulmaz; yalnız correlation/idempotency ve normalize durum saklanır.
- Toplu işlerde günlük/işlem başı hacim, provider rate limit, domain reputation ve kullanıcıya gösterilen uyarı eşikleri konfigüre edilir.
- Open/click tracking operasyonel ve billing maillerinde varsayılan olarak kapalıdır; açılması ayrı privacy, retention ve consent kararıdır.
- Webhook imza/auth yöntemi provider’a göre seçilir; timestamp/replay, duplicate event, provider event id ve normalize state doğrulanmadan teslimat/suppression değişmez.

**Gate:** Deliverability policy, suppression, retry/dead-letter, redaction and operational metrics tests.

#### MAIL-07 — V1/V2 first-party kullanım kapısı

**Produces:** V1’de kontrollü standart/özel katılımcı bildirimi; V2’de ödeme sonrası “faturan hazırlanıyor” ve document-ready sonrası yetkili manuel fatura tesliminin ayrı akışlarda çalışması.

- V1 participant notification modülü, MAIL-00..03A doğrulanmadan gönderim sonrası otomatik onay veya toplu gönderim özelliği açmaz.
- V2-08 fatura teslimi, MAIL-00 ve MAIL-06 ile birlikte çalışır; `document_ready`, billing sender ve yetkili action yoksa fatura mesajı kurulmaz.
- Otomatik/toplu fatura dispatch bu kapıda açılmaz; V3 Paraşüt ve resmi mali/teslim edilebilirlik kanıtlarına bağlı `DEFERRED/OPTIONAL` karardır.
- Form kayıt/karşılama maili ile fatura maili ayrı ekran, ayrı şablon seçimi, ayrı sender ve ayrı audit görünümünde kalır.
- Operasyonel sınıf, mesajın gerçek amacını değiştirmez: içerik pazarlama/upsell niteliği taşıyorsa ayrı purpose/consent ve suppression incelemesi gerekir.

**Gate:** V1/V2 relevant regression + R-10/R-10C + document-ready + mail separation + purpose/consent review + `/api/ready`.

#### MAIL-08 — V4 tenant sender ve BYO sınırı

**Produces:** Tenant kendi verified domain/sender/provider bağlantısını tanımlar; template, recipient, outbox, suppression ve audit kayıtları tenant scope içinde kalır.

- MavenForms tenant müşterileri adına ödeme veya ortak mailing sender’ı kullanmaz.
- Tenant abonelik faturası/uyarısı, tenant’ın katılımcı form mailinden ayrı platform billing kanalında tutulur.
- Break-glass destek yalnız açık izin, süreli scope, MFA/step-up ve audit kaydı ile çalışır; normal operator erişimi tenant alıcılarına ve içeriklerine açılmaz.

**Gate:** V4-00..04 tenant isolation, sender verification, BYO connection and support-access tests.

#### Mail araştırması sonrası mikro-faz eşlemesi

`2026-09-07-mail-configuration-research-receipt.md` raporu mevcut MAIL-00..08 başlıklarını bozmaz; uygulama paketlerinde daha küçük alt kapılar kullanılabilir:

- `MAIL-00..03A`: kanal/RBAC, şablon yaşam döngüsü, immutable snapshot, merge allowlist/sanitize, default-off otomatik mail ve hazır şablon/görsel yardım.
- `MAIL-04..05`: server-authorized tekil gönderim, doğru command idempotency ve recipient snapshot tabanlı bounded batch.
- `MAIL-06`: suppression, provider’a özel webhook auth/replay/duplicate doğrulaması, rate limit, retry/dead-letter ve varsayılan kapalı tracking.
- `MAIL-07`: V1/V2 first-party kullanım, manuel fatura `document_ready` ve ayrı billing sender kapısı; otomatik/toplu fatura dispatch hâlâ ertelenmiş.
- `MAIL-08`: V4 tenant BYO sender/provider sınırı; tenant verisi ve bağlantısı MavenForms ortak sender’ına karışmaz.

Bu eşleme yalnız uygulama sıralamasını netleştirir; araştırma, canlı provider erişimi veya release onayı vermez.

### V2-09 — V2 first-party çıkış kapısı

**Files:** Create `docs/workflow/packets/V2-09.json`, `tests/v2-release-gate.test.mjs`; modify `RELEASE-DECISION.md`, `STATUS.md`.

**Produces:** V2 sadece Maven first-party merchant için release decision.

- [ ] Gerçek iyzico sandbox, merchant/iş modeli ve webhook/retrieve/refund/reconciliation kanıtı olmadan `NO-GO` kal; Stripe veya banka POS kanıtı V2 için varsayılan alternatif sayılamaz.
- [ ] Muhasebeci manuel fatura kabulü, AV/quarantine, document-ready, sender domain ve staging test alıcısını zorunlu kanıt yap.
- [ ] Yetkili manuel fatura gönderimi kanıtlanmadan otomatik/toplu fatura maili açma.
- [ ] Katılımcı toplu bilgi mesajı için MAIL-00..07 kapıları geçmeden fatura teslimatıyla aynı queue/sender/şablon yolunu kullanma.
- [ ] V2’nin SaaS tenant hesabı veya Maven abonelik tahsilatı olmadığını test ve dokümana yaz.

**Gate:** Full payment/invoice/mail regression + TypeScript + build + `/api/ready` + external evidence review.

---

## V3 — Deferred Provider and Paraşüt Evaluation

V3, V2’de çalışan first-party ödeme ve manuel fatura yolunu silmez. Bu sürümün ilk işi derin provider entegrasyonu yazmak değil, ertelenen adayların resmi gerekliliklerini doğrulamak ve mevcut provider-neutral portlara uyup uymadığını kanıtlamaktır. Paraşüt, yalnız risk, resmi API/GİB ve mali müşavir kabul kapıları geçerse muhasebecinin onaylı manuel yoluna alternatif otomatik provider adapter’ı olur; aksi durumda yalnız `DEFERRED` kalır. Banka Sanal POS ve Stripe değerlendirmesi de aynı sınırda yürür.

### V3-00 — Paraşüt connection ve OAuth kapsamı

**Files:** Existing `src/lib/parasut-oauth.ts`, `parasut-credentials.ts`, `parasut-health.ts`; create `tests/v3-parasut-connection-gate.test.mjs`.

**Produces:** Encrypted OAuth token, refresh rotation, numeric company scope, authenticated health ve revocation state.

- [ ] Token yalnız server memory/credential envelope; browser/audit/raw response içine çıkmaz.
- [ ] Company seçimini otomatik tahmin etme; yetkili kullanıcı seçimi ve health kanıtı iste.
- [ ] Rate limit ve token expiry durumunu bounded retry/review olarak modelle.

**Gate:** OAuth/health/security test + TypeScript.

### V3-01 — Contact/product resolution

**Files:** Existing Paraşüt contact/product adapters and command stores; create `tests/v3-parasut-resolution.test.mjs`.

**Produces:** VKN/email/name/code ile bounded lookup; güçlü tek eşleşme, ambiguous/manual review ve explicit create preparation.

- [ ] Belirsiz eşleşmeyi sessizce bağlama.
- [ ] Create command için explicit approval ve workspace/company idempotency fence kullan.
- [ ] Provider POST başarısızlığında internal invoice state’i otomatik issued yapma.

**Gate:** Lookup/create preparation/replay tests.

### V3-02 — Satış faturası oluşturma komutu

**Files:** Existing `src/lib/parasut-sales-invoice-create.ts` and command worker; create `tests/v3-parasut-sales-invoice.test.mjs`.

**Produces:** Verified payment + approved invoice snapshot’tan Paraşüt v4 JSON:API satış faturası command’ı.

- [ ] Company/contact/product, amount, currency, tax and line snapshot’ını server-side validate et.
- [ ] Provider request idempotency ve command replay fence kullan.
- [ ] Paraşüt response’u yalnız allowlist normalize state’e çevir; raw payload saklama.

**Gate:** Mapper + command + worker scope tests.

### V3-03 — e-Fatura/e-Arşiv ve document-ready

**Files:** Existing formalization/job/PDF/document-ready modules; create `tests/v3-parasut-document-ready.test.mjs`.

**Produces:** Provider job polling → active document/PDF descriptor → private immutable document → clean scan → `document_ready`.

- [ ] E-Fatura/e-Arşiv ayrımını provider/GİB/mali müşavir evidence olmadan tahmin etme.
- [ ] Temporary provider URL’yi public forma veya mail body’ye taşımama; own-domain private retrieval kullan.
- [ ] XML/UBL asıl, PDF sunum kopyası ayrımını document metadata’da koru.

**Gate:** Job polling, document security, matching and delivery tests.

### V3-04 — Manuel fallback ve reconciliation

**Files:** Existing manual invoice import/export and reconciliation modules; create `tests/v3-manual-fallback.test.mjs`.

**Produces:** Paraşüt health/error/limit durumunda manuel muhasebe yolu korunur; duplicate invoice/delivery side effect oluşmaz.

- [ ] `parasut_unavailable`, `accounting_review_required`, `manual_ready` ve `provider_reconciliation_required` durumlarını ayrı tut.
- [ ] Paraşüt retry ile manuel upload aynı invoice record’da idempotent birleşsin.
- [ ] İade/chargeback sonrasında belge teslimatını hold/review’e al.

**Gate:** Provider failure/replay/concurrency regression.

### V3-05 — V3 otomatik faturalama çıkış kapısı

**Files:** Create `docs/workflow/packets/V3-05.json`, `tests/v3-release-gate.test.mjs`; modify `STATUS.md`, `RELEASE-DECISION.md`.

**Produces:** First-party Paraşüt otomasyon release decision; manuel fallback zorunlu kalır.

- [ ] Gerçek Paraşüt sandbox/test company, OAuth, invoice/e-document/PDF ve mali müşavir acceptance evidence olmadan `NO-GO` kal.
- [ ] E-posta delivery yalnız V2 document-ready/sender kapısından geçsin.
- [ ] Paraşüt bağlantısı veya company id’nin SaaS tenant’larına açılmadığını doğrula.
- [ ] Resmi kanıt ve risk kabulü yoksa Paraşüt, banka Sanal POS ve Stripe adaylarını `DEFERRED` olarak bırak; provider-neutral portun varlığı entegrasyon tamamlandı anlamına gelmez.

**Gate:** Full relevant regression + build/readiness + external evidence.

---

## V4 — SaaS BYO Merchant ve modül bazlı kiralama — EN SON SAFHA

V4, önceki three-stage first-party ürünün ve pilotun üstüne kurulur; ana geliştirme sırasında parkta tutulur. Dış şirket kendi ödeme sağlayıcısını, muhasebesini ve mail sender’ını tanımlar; MavenForms tenant’ın son müşterilerinden para toplamaz. MavenForms abonelik ücreti ilk sürümde harici/manual şirketler arası süreçle takip edilebilir. V2/V3, transactional mail ve pilot kapanmadan V4-03+ başlatılamaz.

### V4-00 — Tenant ve veri sahipliği sınırı

**Files:** Existing Prisma Workspace/RBAC models; create `docs/workflow/packets/V4-00.json`, `tests/v4-tenant-boundary.test.mjs`; add migration only if packet explicitly includes it.

**Produces:** Workspace’ın tenant olarak açık sahiplik sınırı; `tenantId/workspaceId` olmadan payment, invoice, document, mail ve export read/write yapılamaz.

- [ ] Her provider connection, invoice, document, sender profile, outbox ve audit kaydında tenant scope testini çalıştır.
- [ ] Maven operator varsayılan olarak tenant verisini okuyamaz.
- [ ] Public form yalnız tenant’ın yayınlanmış snapshot’ını ve write-only submit yüzeyini görür.

**Gate:** Cross-tenant security regression + schema validation.

### V4-01 — Tenant modül entitlement ve paketler

**Files:** Extend `src/lib/release-module.ts`; create `src/lib/tenant-entitlement.ts`, `tests/v4-tenant-entitlement.test.mjs`.

**Produces:** `registration_forms`, `manual_payment_tracking`, `online_payments`, `manual_invoices`, `parasut_invoices`, `transactional_invoice_delivery` modülleri tenant bazında aç/kapat.

- [ ] Paket değişikliği geçmiş yayınlanmış form snapshot’ını veya mevcut yanıtları silmesin.
- [ ] Modül disabled olduğunda server mutation reddetsin; UI yalnız açıklama göstererek uyumlu kalsın.
- [ ] Bir tenant’ın enabled module kararı başka tenant’a kopyalanmasın.

**Gate:** Entitlement mutation/read/cross-tenant tests.

### V4-02 — Tenant kendi ödeme hesabını bağlar

**Files:** Existing payment provider connection routes/workers; create `tests/v4-tenant-byo-payment.test.mjs`.

**Produces:** Tenant kendi iyzico/uygun Stripe/gateway bağlantısını server-side encrypted credential olarak tanımlar; ödeme merchant hesabı tenant’a ait olur.

- [ ] MavenForms platform hesabı ile tenant merchant hesabını aynı connection olarak kabul etme.
- [ ] Tenant payment event’i yalnız tenant workspace/payment order ile eşleşirse işlenir.
- [ ] Provider dashboard, secret ve account identifier public/public embed DTO’ya çıkmaz.

**Gate:** BYO connection, webhook, refund/reconciliation and isolation tests.

### V4-03 — Tenant kendi muhasebe ve mail bağlantısını kullanır

**Files:** Existing Paraşüt/manual invoice/sender profile modules; create `tests/v4-tenant-byo-invoice-mail.test.mjs`.

**Produces:** Tenant’ın kendi Paraşüt veya manuel muhasebe yolu ve kendi verified billing sender’ı; MavenForms ortak sender’ı zorunlu değildir.

- [ ] Tenant invoice document ve recipient PII’si operator read model’ine girmez.
- [ ] Tenant domain verification, SPF/DKIM/DMARC, DPA/region ve suppression state’i bağımsız tutulur.
- [ ] Form kayıt maili ile tenant billing maili yine ayrı kanal sözleşmelerini korur.

**Gate:** Sender, document and tenant isolation tests.

### V4-04 — Destek için izinli super-admin/break-glass erişim

**Files:** Existing dangerous-action/admin-verification/audit modules; create `src/lib/support-access-policy.ts`, `tests/v4-support-break-glass.test.mjs`.

**Produces:** Tenant yetkilisinin açık izni, süreli scope, MFA/step-up, amaç ve ticket/reference ile sınırlı destek erişimi.

- [ ] Varsayılan operator erişimi `deny`.
- [ ] İzin yalnız belirlenen tenant/workspace ve süre için geçerli; tüm PII belge ve provider secret’larını otomatik görünür yapma.
- [ ] Support session’da read/write action, actor, tenant, reason, start/end ve revocation audit’i tutulur.
- [ ] Tehlikeli silme işlemleri hesap admin e-posta kodu ve ayrı onay olmadan çalışmaz.

**Gate:** RBAC, expiry, revocation, dangerous-action and audit tests.

### V4-05 — Harici/manual SaaS abonelik durumu

**Files:** Existing subscription-state/domain models; create `tests/v4-external-subscription.test.mjs`.

**Produces:** MavenForms abonelik bedeli için `active`, `due_soon`, `grace`, `suspended`, `ended`; ilk sürümde provider payment API’ye bağlanmadan operator-controlled reference/date/approval.

- [ ] SaaS subscription payment ile tenant’ın kendi end-customer payment order’ını ayrı domain ve ledger olarak tut.
- [ ] Tenant’a yaklaşan tarih ve durum bildirilir; MavenForms hesabı adına son müşteri tahsilatı yapılmaz.
- [ ] Subscription state değişikliği tenant audit’ine ve operator audit’ine uygun şekilde yazılır.

**Gate:** State transition, role and separation tests.

### V4-06 — Suspend/reactivate ve veri koruma

**Files:** Existing subscription/capability policy; create `tests/v4-suspend-reactivate.test.mjs`.

**Produces:** `suspended` durumda publish form’lar deactive, yeni form/publish/silme kapalı, izinli Excel export açık; reactivate durumda mevcut snapshot ve devam eden işler kaldığı yerden açılır.

- [ ] Suspend transaction’ı form data, response, invoice document veya audit kaydı silmesin.
- [ ] Public published route durumunu server-side kontrol edip deactive yanıtı versin.
- [ ] Reactivate sonrası önceki publishedVersion, payment/invoice state ve outbox idempotency kayıtları değişmeden korunur.
- [ ] Tenant admin dışı kullanıcılar subscription ve suspend action’larına erişemez.

**Gate:** Capability matrix, public route, export and replay tests.

### V4-07 — SaaS release ve tenant isolation kapısı

**Files:** Create `docs/workflow/packets/V4-07.json`, `tests/v4-release-gate.test.mjs`; modify `STATUS.md`, `RELEASE-DECISION.md`.

**Produces:** V4 production adayının tenant izolasyonu, BYO payment/invoice/mail, support consent ve subscription state kanıtı.

- [ ] Bir tenant’ın provider secret, invoice document, recipient PII, payment status veya sender profile’ının başka tenant’a erişemediğini test et.
- [ ] MavenForms’ın tenant adına end-customer para tutmadığını ve platform aboneliğinin ayrı olduğunu release kararına yaz.
- [ ] Live provider, real email, production TLS, backup/restore, legal/DPA ve incident response kanıtı olmadan SaaS release `NO-GO` kalır.

**Gate:** Full security/regression + tenant test matrix + build/readiness + independent release review.

---

## Context ve diğer IDE çalışma düzeni

- Kısa bootstrap: `AGENTS.md`, `PROJECT_CONTEXT.md`, `STATUS.md`.
- Sürüm kararı: bu dosya.
- Teknik fatura/ödeme sözleşmesi: ilgili domain planı ve R-10 runbook’ları.
- Dış araştırma: yalnız ihtiyaç duyulan sağlayıcı dosyası ve resmi source ledger.
- Her agent önce packet’in `reads` alanını okur; tüm `AI-RELEASE-EXECUTION-PLAN.md` veya `worklog.md` dosyasını varsayılan context’e yüklemez.
- Agent yalnız packet `allowedFiles` içinde değişiklik yapar.
- Bir agent tamamlanmamış fazı `PASS` yazamaz; çıktı `BLOCKED`, `EXTERNAL_DEPENDENCY`, `LOCAL_PASS` veya `RELEASE_PASS` olarak ayrılır.
- Başka IDE’ler `AGENTS.md`, `.cursor/rules/mavenforms-core.mdc`, `.github/instructions/mavenforms.instructions.md`, `CLAUDE.md` ve `GEMINI.md` adapter’larını okur; kanonik karar bu plandır.

## Kapsam kontrolü

Bu plan dört sürümü kapsar: V1 kayıt/operasyon, V2 first-party payment + manuel fatura, V3 Paraşüt otomasyonu, V4 SaaS/BYO. Kullanıcının üç aşamalı first-party kurgusu korunmuştur; SaaS ayrı son sürümdür. Önceki payment, invoice, document, mail, UI ve R-10 çalışmaları silinmez; sürümlerin kapalı/açık capability bağımlılıkları olarak yeniden etiketlenir. Ek olarak V2’de otomatik fatura yerine muhasebeci tarafından kesilen belgenin upload/onay/teslim yolu, V4’te tenant’ın kendi provider/muhasebe/mail bağlantısı ve harici/manual abonelik yolu açıkça tanımlanmıştır.

## Resmi kaynak dayanakları

- [iyzico Checkout Form](https://docs.iyzico.com/en/getting-started/preliminaries/api-reference-beta/payment-methods/checkoutform)
- [iyzico webhook ve V3 imza](https://docs.iyzico.com/en/advanced/webhook)
- [iyzico refund/cancel](https://docs.iyzico.com/en/advanced/refund-and-cancel)
- [Stripe Global Availability](https://stripe.com/global)
- [Google Pay production yayınlama](https://developers.google.com/pay/api/web/guides/test-and-deploy/publish-your-integration)
- [Google Pay integration checklist](https://developers.google.com/pay/api/web/guides/test-and-deploy/integration-checklist)
- [PCI SSC SAQ A](https://www.pcisecuritystandards.org/faqs/1438/)
- [Paraşüt API v4](https://apidocs.parasut.com/)
- [KVKK yurt dışına aktarım](https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim)

**Plan durumu:** `ACCEPTED / VERSIONED_PRODUCT_ARCHITECTURE`; gerçek provider, mali müşavir/hukuk, AV, domain, production ve tenant kabul kanıtları geldikçe ilgili sürüm kapısında ayrıca doğrulanır.
