# OzelAPP — Anonim Entegrasyon ve Production Release Derin Araştırması

**Araştırma kesim tarihi:** 3 Eylül 2026  
**Kapsam:** Ödeme, güvenlik, webhook/refund/mutabakat, manuel ve Paraşüt faturalama, Türkiye e-belge çerçevesi, belge güvenliği, transactional teslimat, API mimarisi, production operasyonu ve WordPress release.  
**Anonimlik:** Bu raporda yalnızca `OzelAPP` adı kullanılmış; gerçek ürün, kurum, domain, repository, müşteri, hesap veya credential bilgisi kullanılmamıştır.  
**Sınır:** Bu bir vergi/hukuk görüşü, PCI uygunluk belgesi, sağlayıcı sözleşmesi veya canlı entegrasyon kanıtı değildir.

Kullanılan zorunlu sınıflandırmalar: `CONFIRMED`, `DESIGN RECOMMENDATION`, `PROVIDER CONFIRMATION REQUIRED`, `LEGAL REVIEW REQUIRED`, `UNKNOWN`, `EXTERNAL DEPENDENCY`, `REJECTED`, `DEFERRED`.

## 1. Yönetici özeti

| Karar | Sınıflandırma | Sonuç | Production etkisi |
|---|---|---|---|
| İlk ödeme yolu | DESIGN RECOMMENDATION | iyzico Checkout Form gibi sağlayıcı-kontrollü hosted/redirect yüzey; OzelAPP sunucusu initialize eder, callback sonrası server-side retrieve ile kesinleştirir. | Canlı merchant ve capability kanıtı olmadan kapalı. |
| Callback güven sınırı | CONFIRMED | Tarayıcı dönüşü ödeme kanıtı değildir; CF sonucu initialize token’ıyla retrieve edilir. | Callback doğrudan fulfillment yaparsa release bloklanır. |
| iyzico webhook | CONFIRMED + PROVIDER CONFIRMATION REQUIRED | V3 HMAC-SHA256/HEX ve 15 dakikalık retry belgeli; canonical alan adı tuhaflıkları, freshness penceresi ve azami retry yayımlanmıyor. | Güncel SDK fixture + yazılı sağlayıcı doğrulaması gerekir. |
| PCI sınırı | CONFIRMED | Hosted çözüm PCI sorumluluğunu yok etmez; SAQ A uygunluğu tüm hesap verisi fonksiyonlarının dışarı alınmasına ve acquirer kararına bağlıdır. CVV yetkilendirme sonrası şifreli bile saklanamaz. | PAN/CVV’nin uygulama, log, APM, backup ve support kayıtlarına girmediği kanıtlanır. |
| Google Pay | REJECTED / PROVIDER CONFIRMATION REQUIRED | `DIRECT` reddedilir; güvenli varsayılan yalnız kanıtlı `PAYMENT_GATEWAY`. iyzico gateway değeri/capability’si açık kaynakta kanıtlanamadı. | Merchant ID, domain onayı, PSP capability ve gerçek charge kanıtı yoksa görünmez. |
| Paraşüt v4 | CONFIRMED + PROVIDER CONFIRMATION REQUIRED | Auth-code, contact/product/sales invoice, e-belge job ve PDF polling belgeli; PKCE/state/revoke, webhook, idempotency, formalize iptal ve imzalı UBL-TR indirme belgelenmiyor. | Auth/retry ve kanonik artifact boşlukları kapanmadan production kapısı kapalı. |
| GİB e-belge | CONFIRMED + LEGAL REVIEW REQUIRED | UBL-TR ve özgün imzalı artifact muhafazası esastır; PDF sunum kopyasıdır. Somut belge türü/vergi/ihracat/iade/iptal uygulaması uzman kararıdır. | 14 Eylül 2026’da devreye girecek düzeltilmiş paketler pinlenip hashlenir. |
| Bildirim | DESIGN RECOMMENDATION | Domain event + transactional outbox + at-least-once queue + idempotent dispatch + doğrulanmış provider webhook + suppression. | Marketing/campaign/list yönetimi DEFERRED. |
| Mimari | DESIGN RECOMMENDATION | Modüler monolit; para, fatura, belge ve teslimat state’leri ayrı; provider adapter ve append-only inbox/outbox. | Sınır testleri ve forbidden-dependency kontrolleri gerekir. |
| Production | DESIGN RECOMMENDATION | Secret manager, expand/contract migration, queue recovery, restore drill, kill switch, breaker, rate budget ve private object store hemen/pilot öncesi önceliklidir. | RPO/RTO ürün sahibi kararı UNKNOWN; restore drill olmadan backup iddiası kabul edilmez. |
| WordPress | DESIGN RECOMMENDATION | Secret-free public iframe/shortcode/block dağıtımı; özel API proxy’si yok; CSP/postMessage/origin allowlist. | WP/PHP/plugin matrisi, reproducible ZIP/hash/SBOM ve rollback testi gerekir. |

**Ana hüküm:** Araştırma, mimari ve release kapılarını tasarlamak için yeterli; canlı uygulamaya başlamak için repo/test envanteri, sağlayıcı hesap kanıtları, mali müşavir/hukuk onayı ve production operasyon kararları eksiktir. Bu nedenle araştırmanın bilgi boşlukları açıkça kapatılmış olsa da nihai statü `PARTIAL`dır.

## 2. Araştırma yöntemi

1. `CONFIRMED` — Önce resmi sağlayıcı, kamu kurumu, standart kuruluşu veya birincil teknik dokümanda açık ifade/şema arandı.
2. `PROVIDER CONFIRMATION REQUIRED` — Doküman sessizse “yok” sonucu çıkarılmadı; yazılı sağlayıcı yanıtı veya resmi contract fixture’ı istendi.
3. `DESIGN RECOMMENDATION` — Kaynak davranışından OzelAPP için çıkarılan state, idempotency, security ve rollback sınırı ayrı etiketlendi.
4. `LEGAL REVIEW REQUIRED` — Vergi, belge türü, süre, iptal/itiraz, ihracat, döviz ve saklama kararları otomatik vergi görüşüne çevrilmedi.
5. İlk dalga tüm konu ailelerini taradı; ikinci dalga yalnız production kararını değiştiren boşluklara yöneldi: iyzico canonical webhook, Paraşüt exact paths/UBL, GİB 2026 paketleri, OAuth BCP, PCI SAQ A, Google Pay DIRECT ve teslimat sağlayıcılarının webhook/suppression davranışları.
6. Çelişkiler saklandı: Paraşüt anlatımında `pending` varken job enum’unda görünmemesi; iyzico canonical listesinde `paymentId`/`iyziPaymentId` ad farkı; hosted kullanımın PCI kapsamını tamamen kaldırmaması; “provider accepted/delivered”ın inbox teslimi olmaması.
7. Kesim kuralı: Her araştırma ailesinde ya resmî kanıt ya açık boşluk, OzelAPP sınırı, test, canlı kapı ve rollback bulunduğunda tarama durduruldu.

### Araştırma boşluk matrisi sonucu

| Aile | Birincil kaynak | İkinci dalga sonucu | Kapanış |
|---|---|---|---|
| iyzico | Resmi CF/Webhook/Refund/Reporting sayfaları ve resmi SDK’lar | Canonical sıra ve 15 dakikalık tekrar doğrulandı; replay/azami retry/capability açık kaldı. | PROVIDER CONFIRMATION REQUIRED |
| Paraşüt | Resmi Swagger v4 | Exact endpoint/job/PDF doğrulandı; XML/UBL/webhook/idempotency/revoke/PKCE belgelenmedi. | PROVIDER CONFIRMATION REQUIRED |
| GİB | 509, e-Arşiv/e-Fatura kılavuzları, 2026 duyuruları | 14.09.2026 paket kapısı ve kanonik özgün artifact ilkesi doğrulandı. | LEGAL REVIEW REQUIRED |
| PCI/Google Pay | PCI SSC ve Google Pay resmi docs | SAQ A sınırı, CVV yasağı ve DIRECT’in PAN/PCI yükü doğrulandı. | EXTERNAL DEPENDENCY |
| Teslimat | IETF, AWS, sağlayıcı resmi webhook/suppression docs | At-least-once, outbox, DNS alignment ve provider boşlukları ayrıldı. | EXTERNAL DEPENDENCY |
| API/ops/WP | IETF/OAS/Kubernetes/PostgreSQL/AWS/OWASP/WordPress/MDN | Normatif sözleşme ile tasarım çıkarımı ayrıldı. | DESIGN RECOMMENDATION |

## 3. Kaynak güvenilirlik sınıfları

| Sınıf | Tanım | Kullanım | Örnek | Kısıt |
|---|---|---|---|---|
| A | Resmi kamu/standart kuruluşu normatif metni | Mevzuat, protokol ve güvenlik zorunluluğu | GİB, RFC Editor, PCI SSC, W3C, OAS | Somut vergi/hukuk sonucu yine LEGAL REVIEW REQUIRED. |
| B | Sağlayıcının resmi API/ürün dokümanı veya resmi SDK’sı | Endpoint, payload, state, kota, test/live davranışı | iyzico, Paraşüt Swagger, Google Pay, mail sağlayıcıları | Merchant/plan/country capability’si otomatik kanıtlanmaz. |
| C | Resmi platform/cloud operasyon dokümanı | Dayanıklılık ve işletim deseni | AWS, Kubernetes, PostgreSQL, WordPress | Ürüne özel RPO/RTO/limit sayılarını kanıtlamaz. |
| D | OWASP/MDN gibi güçlü ikincil teknik rehber | Uygulama güvenliği ve browser sınırı | OWASP cheat sheets, MDN CSP/CORS | Sağlayıcı sözleşmesi yerine geçmez. |
| E | Blog/forum/pazarlama içeriği | Yalnız keşif | Kullanılmadı | Tek başına kanıt olarak REJECTED. |

**CONFIRMED:** Kaynak yayımlanmış olsa bile erişim tarihi ve sürüm önemlidir. Özellikle Paraşüt Swagger’daki eski changelog ve GİB’in 2026 paket düzeltmeleri nedeniyle go-live günü yeniden doğrulama zorunludur.

## 4. Ana faz sırası ve sıralama gerekçesi

| Sıra | Faz | Değişmez gerekçe | Önceki kapı | Erken yapılırsa risk |
|---:|---|---|---|---|
| 1 | OzelAPP’ın kendi ödeme sistemi | Para ve provider boundary temel domain invariant’ıdır. | Yok; ancak hosted yönteme karar gerekir. | Sonraki fatura akışları sahte ödeme state’ine bağlanır. |
| 2 | Ödeme güvenliği, webhook, refund, reconciliation | Callback akışını finansal gerçeğe yakınsatır. | Faz 1 order/attempt kimliği. | Çifte teslim, çifte iade ve mutabakat körlüğü. |
| 3 | Manuel fatura | Paraşüt’ten bağımsız kanonik billing çekirdeği sağlar. | Mutabık ödeme. | Provider modeline kilitlenme. |
| 4 | Paraşüt v4 | Mevcut çekirdeğe adapter olur. | Manuel invoice/customer/product modeli. | OAuth/duplicate hatası muhasebe çekirdeğine sızar. |
| 5 | Belge güvenliği/document-ready | Provider success ile güvenli belge hazır olmayı ayırır. | E-belge job/artifact durumu. | PDF var diye hukuki artifact hazır sayılır. |
| 6 | Gerekli transactional bildirim | Yalnız doğru ve hazır olaylar gönderilir. | Ödeme/fatura/belge state’i. | Yanlış alıcıya erken/geçersiz belge. |
| 7 | Tüm zincir pilotu | Mock’tan canlı kanıta geçiştir. | Faz 1–6 güvenlik ve rollback kapıları. | Üretimde görünmeyen failure mode’lar. |
| 8 | Form/builder/UI/UX/export olgunluğu | Temel finans zinciri kanıtlandıktan sonra ürün yüzeyi genişler. | Pilot kabulü. | Güzel fakat yanlış/tehlikeli akış. |
| 9 | SaaS/tenant | En geniş blast radius en son açılır. | Tek-workspace ürün ve operasyon olgunluğu. | Cross-tenant veri/secret sızıntısı. |

### PLAN AMENDMENT REQUIRED

**Sonuç:** REJECTED — Ana sıra değiştirilmemelidir. 2026 GİB paket geçişi, OAuth BCP ve PCI script-attack koşulları ayrı “release kapıları” ekler; faz sırasını değiştirmez. Önerilen revizyon, Faz 4 öncesi güncel Swagger/PKCE/state kanıtı; Faz 5 öncesi imzalı UBL-TR artifact kanıtı; Faz 7 öncesi acquirer PCI doğrulaması ve 14 Eylül 2026 sonrası GİB paket hash’idir.

## 5. iyzico araştırması

> **Etiketleme kuralı:** Bu alt bölümde resmî kaynakla doğrudan doğrulanan sağlayıcı/standart davranışları `CONFIRMED`; OzelAPP'a özgü mimari, test ve rollback tercihleri `DESIGN RECOMMENDATION`; açık sağlayıcı doküman boşlukları `PROVIDER CONFIRMATION REQUIRED` veya `UNKNOWN`; somut vergi/hukuk kararları `LEGAL REVIEW REQUIRED`; dış hesap, sözleşme veya canlı kanıtlar `EXTERNAL DEPENDENCY` olarak okunur.

### Konu bazlı derin kanıt ve release matrisi

| Konu | Etiket | Resmi kaynak | Doğrulanan davranış | Doğrulanamayan davranış | OzelAPP sınırı | Güvenlik riski | Test | Canlı kapısı | Rollback |
|---|---|---|---|---|---|---|---|---|---|
| CF Initialize | CONFIRMED | https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation/cf-initialize | Server-side istek token ve hosted içerik/URL döndürür; conversationId, price/paidPrice, currency, basket, callback ve taksit alanları örneklenir. | Canlı hesapta para birimi/taksit ve price-paidPrice iş kuralları. | Tutar/currency yalnız iç order’dan; raw kart alanı yok. | Client amount manipülasyonu. | İç tutar farklıyken provider request iç değeri taşır. | Sandbox contract + merchant capability yazısı. | Feature flag kapat; order/attempt kayıtlarını koru. |
| CF Retrieve | CONFIRMED | https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation/cf-retrieve | Initialize token’ıyla sunucudan sonuç alınır. | Token ömrü ve güvenli tekrar sınırı. | Callback yalnız retrieve tetikler; fulfillment yapmaz. | Sahte callback/erken başarı. | Manipüle callback no-op; eşleşen retrieve state’i ilerletir. | Provider fixture ve negatif testler. | Return ekranını maintenance/processing’e al. |
| Callback | CONFIRMED | Aynı CF Retrieve kaynağı | Tarayıcı callback’e yönlenir. | Callback imzası/güvenilir finansal alan yayımlanmıyor. | URL/body yalnız opaque correlation; log/analytics’e token yok. | Token sızıntısı, CSRF, replay. | Tek kullanımlı local auth transaction; expired/reused callback reddi. | HTTPS exact allowlist + leak scan. | Callback’i yalnız durum sayfasına düşür. |
| V3 header/algoritma | CONFIRMED | https://docs.iyzico.com/en/advanced/webhook | `X-IYZ-SIGNATURE-V3`, HMAC-SHA256 ve HEX. | HEX case/test vector ve constant-time gereği belgelenmiyor. | Raw payload/alanlarla resmi canonical builder; constant-time compare. | Forged event. | Geçerli fixture, tek-byte body/header değişimi, case matrisi. | Güncel resmi SDK fixture. | Endpoint kapat; retrieve/reconciliation sürsün. |
| Doğrudan ödeme canonical | CONFIRMED + PROVIDER CONFIRMATION REQUIRED | https://docs.iyzico.com/ek-servisler/webhook | `secretKey+iyziEventType+paymentId+paymentConversationId+status`; aynı secret HMAC anahtarı. | Alışılmadık çift secret kullanımı için fixture. | Dokümanı “düzeltmeden” aynen implemente et. | Sessiz canonical sapma. | Resmi SDK ile golden vector. | Sağlayıcı yazılı teyit/fixture. | Webhook side-effect kapalı. |
| HPP/CF canonical | CONFIRMED + PROVIDER CONFIRMATION REQUIRED | Türkçe/İngilizce webhook kaynakları | `secretKey+iyziEventType+iyziPaymentId+token+paymentConversationId+status`. | Açıklamadaki paymentId ile canonical iyziPaymentId eşlemesi. | Provider event adapter’ında sürümlü alan haritası. | Yanlış alanla imza reddi/kabulü. | Her iki payload adını fixture’da fail-closed sınama. | Gerçek test webhook’u + yazılı teyit. | CF retrieve otoritesine dön. |
| Retry/duplicate | CONFIRMED + PROVIDER CONFIRMATION REQUIRED | https://docs.iyzico.com/en/advanced/webhook | 2xx gelene dek 15 dakikada bir tekrar. | Azami deneme, toplam süre, ordering, timeout. | Append-only inbox; account+environment+reference unique. | Tekrarlı fulfillment/refund. | Aynı event 10x → tek effect. | Production benzeri retry gözlemi. | Worker pause; inbox silinmez. |
| Replay | PROVIDER CONFIRMATION REQUIRED | Aynı webhook kaynağı | Event time alanı görülebilir. | Resmi freshness/tolerance penceresi yok. | İmza → dedupe → monotonic state; local retention/pencere politikası. | Geçerli eski event yeniden oynatma. | Eski ama imzalı fixture state geriletmez. | Sağlayıcı replay politikası veya risk kabulü. | Webhook side-effect kapat. |
| Kimlik eşleme | CONFIRMED | CF Retrieve + webhook | conversationId korelasyon; paymentId ödeme; iyziReferenceCode benzersiz referans olarak tanımlanır. | Referans benzersizliğinin hesap/ortam kapsamı. | order, attempt, conversationId, paymentId ayrı; tenant/account/env scope. | Yanlış siparişe ödeme. | Cross-account/environment mismatch. | Unique scope provider teyidi. | Exception kuyruğu; otomatik teslim yok. |
| Tutar/currency | CONFIRMED + PROVIDER CONFIRMATION REQUIRED | CF Initialize/Retrieve | price, paidPrice, currency taşınır. | Canlı currency listesi ve rounding. | Integer minor unit; iç order ile exact karşılaştırma. | Over/under fulfillment. | Rounding/büyük tutar/mismatch fixtures. | Merchant currency enablement. | Yöntemi gizle; manuel inceleme. |
| Tam/kısmi refund | CONFIRMED | https://docs.iyzico.com/en/advanced/refund-and-cancel | paymentTransactionId + price; tam/kısmi; toplam kalem tutarını aşamaz. | Retry, kur, varış hesabı, durum geçişi. | Yetkili refund ledger + cumulative limit + idempotency. | Çifte/aşırı iade. | Concurrent partial refunds. | Sandbox + düşük tutarlı canlı refund. | Yeni refund kapat; sonucu reconcile et. |
| Cancel/refund farkı | CONFIRMED + PROVIDER CONFIRMATION REQUIRED | Refund & Cancel resmi sayfası | Cancel paymentId; refund paymentTransactionId. | Kesim saati/settlement uygunluğu. | Capability sorgula; tahminle cancel çağırma. | Yanlış finansal operasyon. | Settlement öncesi/sonrası provider fixtures. | Merchant written cut-off. | Refund/manual operasyonuna yönlendir. |
| Settlement/reporting | CONFIRMED + PROVIDER CONFIRMATION REQUIRED | https://docs.iyzico.com/en/advanced/reporting-service ve /advanced/settlement-files | Son durum/fraud/refund ve ödemeler-iadeler-iptaller için rapor yüzeyi. | Dosya kanalı, kesim saati, timezone, SLA/komisyon kesinliği. | Kayan pencere reconciliation + exception ledger. | Orphan/eksik payout. | Orphan, duplicate, amount/currency mismatch. | Rapor erişimi ve örnek dosya. | Otomatik kapanışı durdur; manuel export. |
| Taksit | CONFIRMED + PROVIDER CONFIRMATION REQUIRED | CF Initialize/Sample | enabledInstallments örneklenir. | BIN/banka/sektör/mevzuat/merchant uygunluğu. | Yalnız runtime capability’den seçenek göster. | Sözleşmede kapalı taksit. | Unsupported installment fail-closed. | Merchant capability kanıtı. | Peşine dön. |
| Yabancı kart | CONFIRMED + PROVIDER CONFIRMATION REQUIRED | Resmi iyzipay GitHub SDK test kartları | Sandbox’ta non-Turkish kart örnekleri. | Canlı merchant yabancı kart kabulü. | Test kartını canlı capability kanıtı sayma. | Yanlış ödeme vaadi. | Sandbox cross-border + live preflight. | Yazılı merchant onayı. | Yöntemi gizle. |
| Test/live | CONFIRMED + EXTERNAL DEPENDENCY | Resmi iyzipay SDK’ları | Sandbox base URL ve test kartları. | Canlı endpoint/capability/anahtar dönüşümü ayrıntısı. | Secret manager; environment alanı; çapraz ortam ID reddi. | Test anahtarı prod’da veya tersi. | Env mismatch ve secret scan. | Key ceremony + smoke. | Kill switch. |
| Timeout/429/5xx | PROVIDER CONFIRMATION REQUIRED | Açık resmi dokümanda genel command retry sözleşmesi bulunamadı | Webhook retry ayrı belgeli. | Mutasyon idempotency ve Retry-After garantisi. | Blind retry yok; retrieve/report/reconcile-first. | Çifte tahsilat/iade. | Timeout after-commit simulation. | Yazılı retry matrisi + chaos test. | Queue park/manual review. |
| Hosted PCI etkisi | CONFIRMED + EXTERNAL DEPENDENCY | PCI SSC SAQ A kaynakları | Tam dış kaynak kullanım PCI yüzeyini daraltabilir; kapsamı yok etmez. | OzelAPP’ın exact SAQ’sı ve iyzico AOC/TPSP kanıtı. | PAN/CVV yok; hosted redirect tercih; script kontrolü. | Yanlış “PCI dışıyız” iddiası. | DOM/network/log/APM/backup PAN canary scan. | Acquirer/PCI danışmanı kapsam kararı. | Embedded’i kapat; full redirect. |

### Ayrıntılı iyzico sentezi

**Erişim tarihi:** 3 Eylül 2026  
**Kanıt notu:** Resmi iyzico dokümanları temel akışı doğrular. Merchant’a özel yabancı kart, taksit, para birimi, iptal cut-off ve bazı webhook ayrıntıları sözleşme/hesap üzerinden teyit edilmelidir.

#### Doğrudan sonuç

Türkiye’den ödeme alma hedefi için iyzico Checkout Form (CF), ilk pilotun en uygulanabilir hosted yöntemidir. OzelAPP CF’yi sunucuda initialize eder; dönen token/form içeriği veya ödeme sayfasını kullanıcıya sunar. `callbackUrl` sonucu ödeme kanıtı değildir: callback’teki token ile CF sonucu sunucudan retrieve edilmeli ve webhook varsa imza doğrulanmalıdır.

#### Minimum güvenli iyzico akışı

1. Sunucu kendi katalog/fiyat kaydından amount, currency ve basket’i üretir; istemci değerlerini doğrular.
2. `PaymentOrder` ile iyzico `conversationId` ilişkilendirilir; Checkout Form server-side initialize edilir.
3. Dönen `token` ve gerekiyorsa ödeme sayfası/form içeriği yalnız kısa ömürlü akışta kullanılır; kart verisi OzelAPP alanlarına girmez.
4. Kullanıcı callback’e döndüğünde sipariş `processing` kalır. Sunucu token ile CF result retrieve eder.
5. Merchant hesabında webhook etkinse `X-IYZ-SIGNATURE-V3` resmi güncel yönteme göre doğrulanır; event dedupe edilir. İmza kanonik veri sırası uygulamadan önce güncel tam doküman/SDK ile kanıtlanmalıdır.
6. Retrieve/webhook verisindeki payment ID, `conversationId`, iç sipariş, amount ve currency eşleşmeden fulfillment yapılmaz.
7. İade/iptal ayrı yetki, gerekçe, idempotency ve audit kaydıyla sunucudan yürütülür; sonuç daha sonra sorgulanır/mutabık edilir.

#### Checkout Form, 3DS ve callback

Checkout Form, hosted/sağlayıcı kontrollü kart alanı sağlayarak hassas verinin OzelAPP’a girişini azaltır. 3DS API entegrasyonu iki aşamalıdır; ancak MVP’de ayrı kart formu yerine CF’nin yönettiği akış daha küçük bir saldırı yüzeyi sunar. Callback parametreleri kullanıcı tarayıcısından geçtiği için güvenilir finansal veri değildir. Sağlayıcı retrieve sonucu veya doğrulanmış webhook otoritedir.

#### Refund, cancel, taksit ve currency

Resmi iyzico referansı tam/kısmi refund kabiliyetini gösterir. “Cancel” ile “refund”ın hangi gün/settlement kesitinde ayrıldığı ve timeout davranışları merchant sözleşmesine göre doğrulanmalıdır; sabit saat uydurulmamalıdır. Taksit seçenekleri kart BIN’i, anlaşmalı banka, ürün kategorisi, mevzuat ve merchant yeteneğine bağlıdır. Para birimi desteği endpoint/ürün/hesap bazlıdır; bazı dokümanlarda TRY yanında USD/EUR/GBP görünmesi OzelAPP hesabında hepsinin açık olduğunu kanıtlamaz. Yabancı kart kabulü de hesap temsilcisi onayı gerektirebilir.

#### Ortak provider adapter sözleşmesi

| Ortak operasyon | Normalize çıktı | Kural |
|---|---|---|
| `createCheckout(order, returnUrl)` | provider reference + redirect/form payload | Amount/currency server-side |
| `retrievePayment(reference)` | normalize status + provider snapshot | Callback sonrası zorunlu |
| `verifyWebhook(rawBody, headers)` | verified provider event | İmzasız event yan etki üretmez |
| `refund(paymentId, amountMinor?, key)` | refund reference/status | Toplam refund sınırı |
| `cancel(paymentId, key)` | cancel status | Capability/settlement şartına bağlı |
| `capabilities(context)` | wallet/currency/installment flags | Merchant ve ortam bazında |

##### Provider’a özel alanlar

- iyzico: Checkout Form token/HTML/page URL, `conversationId`, `paymentId`, `paymentTransactionId`, buyer/basket/address, installment, `X-IYZ-SIGNATURE-V3`.
- Stripe: Checkout Session/PaymentIntent/SetupIntent, `client_secret`, `next_action`, Stripe event/dispute ID ve `Stripe-Signature`.
- Google Pay: Ayrı para hareketi sağlayıcısı değil; seçilen PSP’nin capability’si.

Ortak çekirdek provider’ın ham payload’ını public API’ye yansıtmamalıdır. Ham provider snapshot şifreli/sınırlı erişimli audit alanında; normalize order durumu ayrı tutulur.

#### Güvenlik ve kanıt boşlukları

- **CONFIRMED:** CF initialize + callback + token ile retrieve modeli.
- **CONFIRMED:** 3DS API iki aşamalıdır; CF kullanımı bunu uygulama yüzeyinden soyutlar.
- **PROVIDER CONFIRMATION REQUIRED:** `X-IYZ-SIGNATURE-V3` vardır; fakat kanonikleştirme ve replay toleransı go-live öncesi güncel tam sayfa/SDK ile doğrulanmalıdır.
- **PROVIDER CONFIRMATION REQUIRED:** Full/partial refund vardır; cancel cut-off hesabı için yazılı kanıt gerekir.
- **EXTERNAL DEPENDENCY:** OzelAPP merchant hesabında yabancı kart, desteklenen currency, taksit, Google Pay ve settlement şartları.
- **UNKNOWN:** Açık resmi sayfadan CF’nin güncel PCI AOC/SAQ uygunluğu doğrulanamadı; iyzico ve acquirer’dan belge alınmalıdır.

#### Resmi kaynak kanıtı

| Kaynak başlığı | Kurum | URL | Kullanılan bölüm | Desteklediği karar |
|---|---|---|---|---|
| CF Initialize | iyzico | https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation/cf-initialize | Initialize response/token | Server-side CF başlatma |
| CF Retrieve | iyzico | https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation/cf-retrieve | Retrieve with token | Callback sonrası kesinleştirme |
| 3DS Implementation | iyzico | https://docs.iyzico.com/en/payment-methods/api/3ds/3ds-implementation | Two-step flow | 3DS yaşam döngüsü |
| Webhook | iyzico | https://docs.iyzico.com/en/advanced/webhook | Signature V3 | Origin/imza doğrulama |
| Refund and Cancel | iyzico | https://docs.iyzico.com/en/getting-started/preliminaries/api-reference-beta/refund-and-cancel | Full/partial refund | İade adapter’ı |
| Error codes | iyzico | https://docs.iyzico.com/ek-bilgiler/hata-kodlari | Foreign-card/account messages | Merchant yeteneğinin dış bağımlılık olması |

#### Karar kaydı

**Karar:** İlk pilotta iyzico Checkout Form kullanılacak; callback hiçbir zaman tek başına başarı kabul edilmeyecek, retrieve + varsa doğrulanmış webhook ile kesinleşecek.  
**Durum:** DESIGN RECOMMENDATION  
**Bağlı ana faz:** 1; güvenlik/refund/mutabakat faz 2  
**Bağımlılıklar:** Merchant onboarding, live anahtarlar, hesap yetenekleri, webhook V3 tam kanonikleştirme kanıtı.  
**Sektörel gerekçe:** Hosted ödeme yüzeyi kart verisini uygulamadan uzaklaştırır; sağlayıcı sonucu asenkron ve hesap bazlıdır.  
**Kaynak:** iyzico CF Initialize/Retrieve, 3DS, Webhook, Refund and Cancel resmi dokümanları.  
**Teknik gerekçe:** CF, kart formu ve 3DS karmaşıklığını sağlayıcıda tutar; ortak adapter çekirdek siparişi korur.  
**Güvenlik etkisi:** PAN/CVV yüzeyi küçülür; retrieve/imza/tutar eşleşmesi callback manipülasyonunu engeller.  
**Maliyet/karmaşıklık:** Orta; merchant’a özel capability keşfi ve mutabakat gerekir.  
**Yanlış uygulanırsa risk:** Sahte callback, yanlış tutar teslimi, çifte iade veya sözleşmede kapalı yöntemin gösterilmesi.  
**Minimum uygulanabilir çözüm:** CF initialize → kullanıcı → callback → server retrieve → idempotent PaymentOrder update.  
**İleride genişletme yolu:** Kanıtlı webhook V3, taksit/currency capability ekranı ve Google Pay’i provider yeteneği olarak ekleme.

### PaymentOrder ve reconciliation tamamlayıcı araştırması

**Erişim tarihi:** 3 Eylül 2026

#### Doğrudan sonuç

Tek bir ödeme `status` alanı finansal gerçeği doğru modellemez. Tahsilat yaşam döngüsü, iade, dispute ve provider/banka mutabakatı bağımsız eksenler olmalıdır. Tarayıcı dönüşü yalnız kullanıcı deneyimi sinyalidir; doğrulanmış provider webhook/retrieve sonucu ve mutabakat kayıtları finansal otoritedir.

#### Önerilen çok eksenli model

| Alan | Değerler | Anlam |
|---|---|---|
| `payment_phase` | `created`, `requires_method`, `requires_action`, `processing`, `requires_capture`, `succeeded`, `failed`, `canceled` | Tahsilatın provider-normalize yaşam döngüsü |
| `refund_phase` | `none`, `pending`, `partial`, `full`, `failed`, `canceled` | Tahsilat kaydını silmeden iade sonucu |
| `dispute_phase` | `none`, `needs_response`, `under_review`, `won`, `lost` | Chargeback/itiraz süreci |
| `settlement_phase` | `unreconciled`, `provider_matched`, `payout_matched`, `exception` | Provider ledger ve banka/payout eşleşmesi |

Kullanıcı promptundaki `refunded`, `partially_refunded`, `disputed` görünür birleşik statüler bu eksenlerden türetilir; `payment_phase=succeeded` geçmişi üzerine yazılmaz.

#### Durum geçişleri

| Mevcut | Olay/kanıt | Yeni | İzin | Yan etki |
|---|---|---|---|---|
| `created` | Checkout yaratıldı | `requires_method` / `processing` | Evet | Provider reference yaz |
| `requires_method` | Müşteri yöntem sundu | `requires_action` / `processing` | Evet | Fulfillment yok |
| `requires_action` | 3DS tamamlandı | `processing` / `succeeded` / `requires_method` | Provider kanıtıyla | Sonucu bekle |
| `processing` | Doğrulanmış başarılı nesne | `succeeded` | Tutar/currency/order eşleşirse | Tek fulfillment outbox |
| `processing` | Kesin provider failure/cancel | `failed` / `canceled` | İş kuralına göre | Kullanıcıya operasyon bildirimi |
| `succeeded` | Partial refund succeeded | `payment_phase` aynı, `refund_phase=partial` | Yetkili/auditli | Ledger ve bildirim |
| `succeeded`/`partial` | Toplam refund=tahsilat | `refund_phase=full` | Evet | Ledger ve bildirim |
| `succeeded` | Dispute created | `dispute_phase=needs_response` | Evet | Kanıt son tarihi işi |
| Herhangi | Eski/sırasız event | Geriye geçiş yok | Retrieve sonrası reducer | No-op/audit |

`failed` her provider deneme hatasında otomatik terminal yapılmamalıdır; Stripe örneğinde tekrar ödeme yöntemi istenebilir. İş siparişi ile provider payment attempt ayrı kayıtlardır.

#### Webhook–frontend yarışları

Callback önce gelirse UI “doğrulanıyor” gösterir ve server retrieve başlatabilir; webhook önce gelirse `PaymentOrder` zaten günceldir. İki yol aynı reducer ve aynı fulfillment idempotency anahtarını kullanır. Webhook, imza doğrulandıktan sonra `(tenant_id, provider_account_id, provider_event_id)` tekilliğiyle append-only inbox’a yazılır. Aynı nesne ve event type farklı event ID’lerle gelebileceğinden bu ikinci kombinasyon gözlem sinyalidir; kör unique constraint olmamalıdır.

Provider event oluşturma zamanı sıralama garantisi değildir. Geç veya şüpheli olayda provider nesnesi API’den yeniden okunur. Inbox yazıldıktan sonra hızlı `2xx`; uzun iş queue worker’da yürür.

#### Para ve idempotency

Tutar `int64 amount_minor + ISO 4217 currency` olarak saklanır; binary float kullanılmaz. Para birimi exponent/özel durum tablosu sürümlü adapter verisidir. Provider’dan gelen amount’ın internal order total ile aynı currency ve exact minor-unit değerde olması gerekir. Aksi halde `exception`.

Her logical mutation idempotency anahtarı ve request hash’iyle kaydedilir. Ağ timeout’unda aynı body + aynı key retry edilir. `conversationId` gibi korelasyon alanı, sağlayıcı açıkça garanti etmedikçe idempotency değildir.

#### Günlük ve refund mutabakatı

İki ayrı eşleme yapılır:

1. İç order/attempt/refund/dispute ↔ provider payment/refund/dispute ledger.
2. Provider balance transaction/settlement ↔ payout/banka hareketi.

Gerekli alanlar: tenant, provider account, internal order/attempt, provider payment/transaction/refund/dispute, balance transaction/payout, currency, gross, fee, net, occurred/available/settled time. Günlük job son birkaç günü kayan pencerede yeniden tarar; kesin pencere settlement SLA’sına göre belirlenir.

| İstisna | Tespit | İşlem |
|---|---|---|
| Orphan payment | Provider kaydı var, iç order yok | Otomatik fulfillment yok; inceleme kuyruğu |
| Duplicate provider ID | Bir provider payment birden fazla order’a bağlı | P0 alarm, işlemleri dondur |
| Eksik/fazla ödeme | Amount/currency uyuşmuyor | `exception`; manuel onay olmadan fatura yok |
| Bekleyen/başarısız refund | Refund ledger yakınsamıyor | Retry/sorgu; yeni kör refund yok |
| Payout mismatch | Gross-fee-net/banka farklı | Finans inceleme, immutable adjustment |

#### Resmi kaynak kanıtı

| Kaynak | Kurum | URL | Bölüm | Karar |
|---|---|---|---|---|
| PaymentIntent lifecycle | Stripe | https://docs.stripe.com/payments/paymentintents/lifecycle | Statuses | Normalize tahsilat fazları |
| Webhooks | Stripe | https://docs.stripe.com/webhooks | Duplicates/order/retries | Inbox, dedupe, retrieve |
| Idempotent requests | Stripe | https://docs.stripe.com/api/idempotent_requests | Key reuse/parameters | Mutation retry |
| Supported currencies | Stripe | https://docs.stripe.com/currencies | Minor units | Integer para modeli |
| Payout reconciliation | Stripe | https://docs.stripe.com/reports/payout-reconciliation | Gross/fee/net/IDs | İki aşamalı mutabakat |
| Reporting Service | iyzico | https://docs.iyzico.com/en/advanced/reporting-service | Payment/refund reports | iyzico ledger girdisi |
| Settlement Files | iyzico | https://docs.iyzico.com/en/advanced/settlement-files | Fee/payout references | Banka/payout eşleşmesi |

#### Karar kaydı

**Karar:** PaymentOrder tahsilat, iade, dispute ve settlement eksenlerine ayrılacak; tüm provider olayları tenant-bağlı inbox ve idempotent reducer ile işlenecek.  
**Durum:** DESIGN RECOMMENDATION  
**Bağlı ana faz:** 2  
**Bağımlılıklar:** Provider webhook/retrieve, settlement/report erişimi, queue ve değişmez audit store.  
**Sektörel gerekçe:** Ödeme, iade, chargeback ve payout farklı zamanlarda ve tekrar/sırasız olaylarla ilerler.  
**Kaynak:** Stripe lifecycle/webhook/idempotency/currency/reconciliation; iyzico reporting/settlement.  
**Teknik gerekçe:** Bağımsız eksenler geçmişi korur ve idempotent yakınsamayı mümkün kılar.  
**Güvenlik etkisi:** Sahte callback, duplicate fulfillment/refund ve tenant/account karışması azalır.  
**Maliyet/karmaşıklık:** Orta-yüksek; ledger, queue, exception UI ve finans operasyonu gerekir.  
**Yanlış uygulanırsa risk:** Çifte teslim/iade, kayıp gelir, yanlış fatura ve açıklanamayan banka farkı.  
**Minimum uygulanabilir çözüm:** Çok eksenli order + event inbox + provider retrieve + günlük order/provider reconciliation.  
**İleride genişletme yolu:** Payout/banka otomatik eşleme, dispute evidence ve risk skorlama.

### Açıkça reddedilen anti-pattern’ler

| Anti-pattern | Etiket | Neden | Zorunlu kontrol |
|---|---|---|---|
| Tarayıcı callback’ini başarı saymak | REJECTED | Tarayıcı manipüle edilebilir; retrieve/webhook otoritesi gerekir. | Callback yalnız processing + retrieve. |
| İstemci amount/currency’ye güvenmek | REJECTED | Kullanıcı kontrolündeki veri finansal gerçek değildir. | Server-side catalog/order ve exact match. |
| Provider token’ını uzun süre saklamak/loglamak | REJECTED | Replay ve veri sızıntısı yüzeyi. | Kısa ömür, encrypted-at-rest gerekiyorsa, URL/log/analytics redaction. |
| İmzasız webhook | REJECTED | Sahte finansal state üretir. | Raw canonical + constant-time HMAC doğrulama. |
| Duplicate webhook’u yeniden işlemek | REJECTED | Çifte fulfillment/bildirim. | Unique inbox + idempotent reducer/outbox. |
| Refund toplamını kontrol etmemek | REJECTED | Tahsilatı aşan/çifte iade. | Transactional cumulative-refund invariant. |
| PAN/CVV almak | REJECTED | PCI kapsamı ve CVV saklama yasağı. | Hosted provider fields; canary/no-field scan. |

## 6. Paraşüt API v4 araştırması

> **Etiketleme kuralı:** Bu alt bölümde resmî kaynakla doğrudan doğrulanan sağlayıcı/standart davranışları `CONFIRMED`; OzelAPP'a özgü mimari, test ve rollback tercihleri `DESIGN RECOMMENDATION`; açık sağlayıcı doküman boşlukları `PROVIDER CONFIRMATION REQUIRED` veya `UNKNOWN`; somut vergi/hukuk kararları `LEGAL REVIEW REQUIRED`; dış hesap, sözleşme veya canlı kanıtlar `EXTERNAL DEPENDENCY` olarak okunur. “Scope” sütununda Swagger OAuth scope nesnesi boş olduğunda bu açıkça belirtilmiştir.

### Exact API operasyon matrisi

| İşlem | Endpoint | HTTP method | Gerekli scope | İstek alanları | Yanıt alanları | Async mi? | Rate limit | Idempotency | Belirsizlik | OzelAPP kararı |
|---|---|---|---|---|---|---|---|---|---|---|
| Kimlik/şirket/rol | `/v4/me?include=user_roles,companies,profile` | GET | Bearer; OAuth scope listesi boş | include | user, companies, user_roles, profile | Hayır | 10/10 sn global doküman; scope bilinmiyor | GET güvenli | e-belge action permission matrisi yok | /me sonucu ve accessible/role doğrulanmadan company bağlama yok |
| Contact liste | `/v4/{company_id}/contacts` | GET | Bearer; action scope belgelenmemiş | filter name/email/tax_number/tax_office/city/account_type; page size≤25 | JSON:API Contact list | Hayır | 10/10 sn | GET | Tax no/name uniqueness yok | Strong filter→0 create, 1 bind, >1 manual |
| Contact create | aynı | POST | Bearer; PROVIDER CONFIRMATION REQUIRED | type/attributes/relationships; resmi şemaya göre | Contact | Hayır | 10/10 sn | Belgelenmemiş | Concurrent duplicate | Local mapping + command fingerprint; blind retry yok |
| Contact show/update/delete | `/v4/{company_id}/contacts/{id}` | GET/PUT/DELETE | Bearer; action scope yok | id + Contact payload | Contact/başarı | Hayır | 10/10 sn | Belgelenmemiş mutasyon | Delete etkisi/retry | E-belge bağlı kaydı otomatik silme yok |
| Product liste/create | `/v4/{company_id}/products` | GET/POST | Bearer; action scope yok | filter name/code; page≤25; product payload | Product/list | Hayır | 10/10 sn | Create belgelenmemiş | Code uniqueness/arşiv görünümü | Local mapping; name-only auto merge yok |
| Product show/update/delete | `/v4/{company_id}/products/{id}` | GET/PUT/DELETE | Bearer; action scope yok | id/payload | Product/başarı | Hayır | 10/10 sn | Mutasyon belgelenmemiş | Silme/mali kayıt etkisi | Manual authorization + audit |
| Sales invoice list/create | `/v4/{company_id}/sales_invoices` | GET/POST | Bearer; sales_invoices role doğrulanmalı | contact, details/product; issue/due date, currency, exchange_rate, series/id, item_type, tax fields | SalesInvoice/list | Hayır | 10/10 sn | Belgelenmemiş | Duplicate/seri/mali dönem | integration_command unique fingerprint + reconcile-first |
| Sales invoice show/update | `/v4/{company_id}/sales_invoices/{id}` | GET/PUT | Bearer; role doğrulanmalı | id; attributes/relationships | SalesInvoice | Hayır | 10/10 sn | PUT belgelenmemiş | Formalize sonrası update hukuki etkisi | E-belge terminalse generic update REJECTED |
| Accounting cancel | `/v4/{company_id}/sales_invoices/{id}/cancel` | DELETE | Bearer; action scope yok | id | Başarı/hata | Hayır | 10/10 sn | Belgelenmemiş | E-belge hukuki iptali değildir | Provider + legal review olmadan formal e-doc için çağırma |
| Invoice payment ekle | `/v4/{company_id}/sales_invoices/{id}/payments` | POST | Bearer; accounts/role etkisi bilinmiyor | ödeme attributes/relationship | Payment | Hayır | 10/10 sn | Belgelenmemiş | Timeout duplicate payment | Local ledger ve post-timeout reconcile |
| e-Fatura inbox | `/v4/{company_id}/e_invoice_inboxes?filter[vkn]={vkn}` | GET | Bearer; action scope yok | VKN filter | address/inbox_type/registered_at | Hayır | 10/10 sn | GET | Etiket seçimi ve hukuki yeterlilik | Lookup snapshot sakla; belge türü LEGAL REVIEW REQUIRED |
| e-Fatura submit | `/v4/{company_id}/e_invoices` | POST | Bearer; action scope yok | invoice id, scenario, to address, common e-doc tax fields | TrackableJob | Evet | 10/10 sn | Belgelenmemiş | Retry/duplicate/formal iptal | Single-flight submit; timeoutta yeni POST yok |
| e-Fatura show | `/v4/{company_id}/e_invoices/{id}` | GET | Bearer | id/include | EInvoice; waiting/failed/successful | Hayır | 10/10 sn | GET | Terminal/retryable geçiş tablosu | Raw status + normalized state ayrı |
| e-Fatura PDF | `/v4/{company_id}/e_invoices/{id}/pdf` | GET | Bearer | id | 204 hazır değil veya URL/expires_at | Poll | 10/10 sn | GET | Byte hash/history yok; URL ~1 saat | Backend indirir; doğrudan müşteriyle URL paylaşılmaz |
| e-Arşiv submit | `/v4/{company_id}/e_archives` | POST | Bearer; action scope yok | invoice id; internet_sale/shipment ve common fields | TrackableJob | Evet | 10/10 sn | Belgelenmemiş | Retry/duplicate/cancel | Single-flight + legal field validation |
| e-Arşiv show | `/v4/{company_id}/e_archives/{id}` | GET | Bearer | id/include | EArchive; bounced/sent/printed/legalized | Hayır | 10/10 sn | GET | Status semantiği e-Fatura’dan farklı | Raw/normalized state ayrı |
| e-Arşiv PDF | `/v4/{company_id}/e_archives/{id}/pdf` | GET | Bearer | id | 204 veya URL/expires_at | Poll | 10/10 sn | GET | Canonical XML değil | Private intake + validate/hash/store |
| Job poll | `/v4/{company_id}/trackable_jobs/{id}` | GET | Bearer | job id | status/data/errors | Evet | 10/10 sn | GET | ID 15 dk; anlatım pending, enum eksik | Unknown/pending toleranslı adapter; bounded jitter |
| Active e-doc bağlama | `/v4/{company_id}/sales_invoices/{id}?include=active_e_document` | GET | Bearer | include | SalesInvoice + active_e_document | Hayır | 10/10 sn | GET | Job done hukuki ready değildir | Provider done → e-doc terminal → artifact ready ayrı |
| OAuth authorize/token | `https://api.parasut.com/oauth/authorize`; `/oauth/token` | GET/POST | client id/secret; auth code | grant_type, client_id, client_secret, code, redirect_uri; refresh grant | access_token, refresh_token, expires_in=7200 | Hayır | Kota belirtilmemiş | Auth transaction tek kullanımlı | state/PKCE/exact behavior/revoke belgelenmiyor | Auth-code + state; PKCE varsa S256; password REJECTED |
| XML/UBL indirme | Resmi Swagger’da endpoint belgelenmemiş | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Kritik canonical artifact boşluğu | PROVIDER CONFIRMATION REQUIRED; PDF ile ready yok |
| Webhook/subscription | Resmi Swagger’da endpoint belgelenmemiş | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Polling dışında resmi kanıt yok | Webhook var sayma; polling kullan |

### Ayrıntılı Paraşüt sentezi

**Erişim tarihi:** 3 Eylül 2026  
**Kanıt:** Resmi v4 Swagger ve Paraşüt dokümantasyonu. Swagger’ın görünür değişiklik geçmişi eski olduğundan canlı sözleşme testleri kapı şartıdır.

#### Doğrulanmış API sınırı

- API base: `https://api.parasut.com/v4`; şirket kapsamı `{company_id}`.
- Rate limit: 10 istek / 10 saniye.
- OAuth2 erişim tokenı yaklaşık 2 saat; refresh işleminde refresh token da yenilenir.
- Belgelenmiş kaynaklar: contacts, products, sales invoices, e-invoice inboxes, e-invoices, e-archives, trackable jobs ve e-belge PDF kaynakları.
- E-belge oluşturma asenkron job’dır: `pending/running/error/done`.
- Job tamamlanınca satış faturası `active_e_document` ilişkisiyle tekrar okunur.
- PDF isteği hazır değilse `204` dönebilir. Dönen PDF URL’si yaklaşık bir saat geçerlidir ve resmi doküman bu URL’nin son kullanıcıyla doğrudan paylaşılmamasını, uygulamanın dosyayı indirip kendisinin sunmasını ister.

#### Güvenli OAuth bağlantısı

Paraşüt dokümanı authorization code ve password grant yüzeyleri gösterse de OAuth 2.0 Security BCP (RFC 9700) resource owner password credentials grant’in kullanılmamasını şart koşar. OzelAPP authorization code kullanmalı; redirect URI exact match, `state`, mümkünse PKCE, kısa ömürlü authorization transaction ve tek kullanımlı callback uygulanmalıdır. Paraşüt’ün PKCE desteği mevcut dokümanda doğrulanamadı; yazılı teyit gerekir.

Access token yalnız worker runtime’da; refresh token KMS/envelope encryption ile tenant+company+provider context’ine bağlı tutulur. Refresh rotasyonu atomik compare-and-swap olmalıdır: yeni access+refresh birlikte yazılmadan eskisi geçersiz sayılmaz. Token veya authorization code loglanmaz. Disconnect UI’sı yerel credential’ı revoke/erişilemez yapar; provider-side revocation endpoint’i dokümante edilmediği için kullanıcıya “Paraşüt erişimini ayrıca kaldırın” adımı gösterilir.

#### Yalnız doğrulanmış iş akışı

1. OAuth authorization code ile tenant/company bağlantısı kur.
2. Müşteriyi vergi kimliği/external ID ile ara; kontrollü biçimde oluştur/eşleştir.
3. Ürün/hizmeti external mapping ile ara; yoksa oluştur.
4. Satış faturası oluştur; internal invoice ID’yi ilişkide/metadata’da kanıtlanmış alanla bağla.
5. Alıcı VKN’sini e-Fatura inbox listesinde sorgula.
6. Kayıtlıysa e-Fatura; değilse e-Arşiv create çağrısı yap.
7. Dönen job ID’yi rate limit dostu backoff ile `TrackableJobs` üzerinden izle.
8. `done` sonrası sales invoice’ı `active_e_document` ilişkisiyle tekrar oku.
9. PDF endpoint’ini hazır olana kadar sınırlı sorgula; `204` beklenen “hazır değil” durumudur.
10. Geçici URL’yi backend indirir; dosya `09` raporundaki validate/quarantine/immutable akışına girer.

#### Rate limit, retry ve yerel idempotency

10/10 saniye limiti tenant/company/adaptor bazlı token bucket ve queue ile korunmalıdır. `429`/`5xx`/network timeout’ta bounded exponential backoff+jitter; validation/auth `4xx`’te kör retry yoktur. Swagger resmi bir retry sözleşmesi veya `Retry-After` garantisi vermediği için bu politika OzelAPP dayanıklılık tasarımıdır.

Genel idempotency header belgelenmemiştir. Her create öncesi yerel operation kaydı, canonical request hash ve external mapping kullanılır. Timeout sonrası ikinci create çağrısından önce mümkünse list/get ile sonucu bulma; emin olunamıyorsa otomatik tekrar yerine inceleme kuyruğu. “Idempotency varmış gibi” header uydurulmaz.

#### Doğrulanamayan noktalar

| Konu | Durum | Release etkisi |
|---|---|---|
| Genel idempotency header/sözleşmesi | UNKNOWN | Paraşüt’ten yazılı yanıt + duplicate contract testi |
| Resmi sandbox | UNKNOWN | Test hesabı/izole company yazılı teyit |
| Token revocation endpoint’i | UNKNOWN | Disconnect çift taraflı operasyon runbook’u |
| Kanonik imzalı XML/UBL indirme endpoint’i | UNKNOWN | Yalnız PDF ile yasal belge akışı tamam sayılmaz |
| E-belge-ready webhook’u | UNKNOWN | Polling gerekir; webhook var sayılmaz |
| Resmi retry/backoff sözleşmesi | UNKNOWN | Bounded client politikası + destek teyidi |
| PKCE desteği | UNKNOWN | Auth code yine kullanılır; Paraşüt yazılı teyit |

#### Resmi kaynak kanıtı

| Kaynak | Kurum | URL | Bölüm | Karar |
|---|---|---|---|---|
| Paraşüt API v4 docs | Paraşüt | https://apidocs.parasut.com/ | Authentication/rate limit/resources | v4 ve 10/10s |
| Swagger 4.0.0 | Paraşüt | https://apidocs.parasut.com/swagger.json | OAuth2, paths, schemas | Doğrulanmış endpoint/async/PDF yüzeyi |
| OAuth 2.0 Security BCP, RFC 9700 | IETF | https://www.rfc-editor.org/rfc/rfc9700.html | Redirect, PKCE, password grant | Auth code seçimi; password grant reddi |

#### Karar kaydı

**Karar:** Paraşüt v4 yalnız resmi Swagger’da görülen authorization-code, contact/product/sales-invoice/e-document/job/PDF akışıyla entegre edilecek; dokümansız yetenekler dış bağımlılık kalacak.  
**Durum:** DESIGN RECOMMENDATION  
**Bağlı ana faz:** 4  
**Bağımlılıklar:** Paraşüt client ID/secret/redirect onayı, tenant company, test/live erişimi, GİB/müşavir kuralları.  
**Sektörel gerekçe:** E-belge üretimi asenkron ve yetkili muhasebe sağlayıcısı sonucuna bağlıdır.  
**Kaynak:** Paraşüt API v4 site/Swagger; IETF RFC 9700.  
**Teknik gerekçe:** Queue/throttle/job state ve yerel operation ledger timeout/duplicate riskini sınırlar.  
**Güvenlik etkisi:** Per-tenant şifreli refresh token, exact redirect ve public olmayan belge indirme tenant sızıntısını azaltır.  
**Maliyet/karmaşıklık:** Orta-yüksek; OAuth rotation, mapping, polling, rate limit ve belge doğrulama gerekir.  
**Yanlış uygulanırsa risk:** Çift fatura, kırılan token, rate-limit kilidi, yanlış e-belge türü ve geçici link sızıntısı.  
**Minimum uygulanabilir çözüm:** Auth code + contact/product mapping + sales invoice + inbox seçimi + trackable job + backend PDF alma.  
**İleride genişletme yolu:** Paraşüt’ün yazılı kanıtıyla idempotency/webhook/XML/revocation özellikleri.

### OAuth güvenlik hükmü

- **CONFIRMED:** RFC 9700, redirect URI karşılaştırmasında exact string match ister; public client’ta PKCE zorunlu, confidential client’ta tavsiye edilir; state tabanlı tek kullanımlık CSRF koruması gerekir; password grant MUST NOT be used. Kaynak: https://www.rfc-editor.org/rfc/rfc9700.html
- **REJECTED:** Paraşüt dokümanında görünse bile yeni OzelAPP entegrasyonunda resource-owner password grant kullanılmaz.
- **PROVIDER CONFIRMATION REQUIRED:** Paraşüt’ün state passthrough, PKCE S256, revoke, refresh-token reuse/grace ve exact redirect enforcement davranışı.
- **DESIGN RECOMMENDATION:** Atomik CAS refresh rotation, single-flight refresh, per-connection encrypted secret, disconnect runbook ve /me tabanlı role/company kontrolü.

## 7. Türkiye e-Fatura/e-Arşiv araştırması

> **Etiketleme kuralı:** Bu alt bölümde resmî kaynakla doğrudan doğrulanan sağlayıcı/standart davranışları `CONFIRMED`; OzelAPP'a özgü mimari, test ve rollback tercihleri `DESIGN RECOMMENDATION`; açık sağlayıcı doküman boşlukları `PROVIDER CONFIRMATION REQUIRED` veya `UNKNOWN`; somut vergi/hukuk kararları `LEGAL REVIEW REQUIRED`; dış hesap, sözleşme veya canlı kanıtlar `EXTERNAL DEPENDENCY` olarak okunur. Bu bölüm vergi görüşü değildir; bütün somut senaryo seçimleri `LEGAL REVIEW REQUIRED`tır.

### Senaryo karar matrisi

| Senaryo | Belge türü | Gerekli alanlar | OzelAPP otomasyonu | Manuel onay gerekir mi? | Hukuki belirsizlik | Release kapısı |
|---|---|---|---|---|---|---|
| Alıcı e-Fatura kayıtlı | Genellikle e-Fatura | VKN/TCKN, inbox/etiket, taraf ve mal/hizmet/vergi alanları | Anlık inbox lookup + snapshot; öneri üretir | Evet, sınır durumlarda | Kayıt anı/etiket/senaryo LEGAL REVIEW REQUIRED | Lookup kanıtı + müşavir senaryo onayı |
| Alıcı kayıtlı değil, vergi mükellefi | Genellikle e-Arşiv | Taraf, VKN, vergi/mal-hizmet, e-Arşiv zorunlu alanları | Kayıt yok snapshot’ı; taslak | Evet | 509 kapsamı ve 2026 geçişleri | Güncel 509 + mükellef sınıfı onayı |
| Bireysel müşteri | Genellikle e-Arşiv | Ad/soyad, adres/iletişim ve gereken kimlik/işlem alanları | Minimum veri + doğrulama | Evet, kimlik/minimizasyon | B2C tek başına yeterli kural değildir | Veri/kimlik politikası + müşavir |
| İnternet satışı | e-Arşiv internet satış alanları | URL, ödeme şekli/platform/tarih, ibare; sevkiyat varsa teslim bilgisi | Ödeme kaydından taslak ve schema validation | Evet | İşlemin internet satışı sayılması | GİB e-Arşiv v1.18 contract testi |
| Mal ihracı/gümrük | GİB ihracat e-Fatura senaryosu olabilir | Gümrük, alıcı, teslim, istisna ve ihracat alanları | Otomatik seçim yok; özel taslak | Kesinlikle | Mal/hizmet, bavul ticareti, gümrük ayrımı | LEGAL REVIEW REQUIRED + provider test |
| Yurt dışı hizmet | İşleme göre | Yabancı alıcı, ülke/adres, currency, hizmet/istisna | Yalnız veri toplar; belge türü seçmez | Kesinlikle | İhracat/hizmet/KDV/serbest bölge | Hukuk/müşavir yazılı matrisi |
| Dövizli işlem | Uygun e-belge | Currency, exchange rate, source/date, vergi matrahı | Rate alanını zorunlu ve provenance’lı kılar | Evet | Hangi kur/tarih/matrah | Mali politika + fixture |
| Standart KDV | Uygun e-belge | Oran, matrah, tutar, güncel code-list | Hesaplama/rounding testi; oran seçmez | Evet | İşleme uygulanacak oran | Müşavir onayı + güncel kod hash’i |
| Tevkifat | Uygun e-belge | withholding code/rate/amount ve ilişkili alanlar | Güncel kod listesine validate | Evet | Kod/oran/limit ve taraf koşulları | LEGAL REVIEW REQUIRED |
| İstisna | Uygun e-belge | istisna nedeni kodu ve gerekirse açıklama | Kod/şema doğrular; gerekçe seçmez | Evet | İstisna dayanağı | Yazılı uzman onayı |
| İade | İşleme göre iade belgesi | Orijinal UUID/no/tarih, satır/vergi ve iade nedeni | Orijinal belgeye referans zorunlu; taslak | Evet | Tüketici/mükellef/mal/hizmet ayrımı | LEGAL REVIEW REQUIRED + provider mapping |
| e-Fatura ticari ret | Ret Uygulama Yanıtı/harici kanal | Alım zamanı, UUID, ret gerekçesi, süre kanıtı | Deadline alarmı; otomatik hukuki işlem yok | Kesinlikle | 8 gün hesabı ve kanal | GİB v1.2 + hukuk onayı |
| Temel/diğer iptal/itiraz | Portal/harici hukuki yol | UUID, bildirim/itiraz kanıtı, taraf ve zaman | Case kaydı ve kanıt saklama | Kesinlikle | Portal bildirimi itirazın kendisi değildir | Hukuk runbook’u + provider capability |
| Belge tarihi/numarası | Belge türüne göre | issue date/time; seri/yıl/müteselsil numara | Provider’dan dönen değeri immutable saklar | Evet, seri kuralında | 7 gün/özel süre ve numara rezervasyonu | GİB schema + müşavir + concurrency testi |
| XML/UBL-TR ve PDF | Kanonik imzalı UBL-TR + sunum PDF | UUID, imza/mühür, paket/zarf/yanıt, hash/provenance | XML doğrula/hashle/immutable store; PDF ayrı representation | Evet, artifact yeterliliğinde | Paraşüt XML yüzeyi belgelenmiyor | Canonical artifact alınmadan document-ready yok |
| Saklama/ibraz | Kanonik artifact ve ilişkili kanıtlar | Bütünlük, imza, ilişkiler, retention/hold, erişim audit’i | Private WORM/versioned store + restore drill | Evet | Exact süre/rol/lokasyon | LEGAL REVIEW REQUIRED + restore kanıtı |
| Yeniden gönderim | Aynı transport veya yeni belge ayrımı | UUID/zarf/status/hata/numara | Timeoutta yeni belge yaratmaz; reconcile-first | Evet | Hangi hata kodunda resend/new issue | Provider + legal written runbook |

### Ayrıntılı GİB sentezi

**Erişim tarihi:** 3 Eylül 2026  
**Uyarı:** Bu bölüm hukuki/vergi tavsiyesi değildir. Şirket ve işlem bazlı uygulama mali müşavir ve gerektiğinde hukuk danışmanı tarafından doğrulanmalıdır.

#### Temel ayrım

509 Sıra No’lu VUK Genel Tebliği’nin güncel metninde, e-Fatura uygulamasına kayıtlı alıcıya e-Fatura; ilgili kapsamda kayıtlı olmayan alıcıya e-Arşiv Fatura temel yönlendirmesi bulunur. Belgeler GİB Portalı, GİB’e bildirilen doğrudan entegrasyon veya onaylı özel entegratör kanalıyla oluşturulur/iletilir. Sıradan bir SaaS, yetki olmadan özel entegratör veya resmi belge üreticisi rolünü üstlenemez.

#### Zorunlu veri ve belge formatı

Çekirdek alanlar belge numarası/tarihi; düzenleyen ve alıcının ad/unvan, adres, vergi dairesi ve VKN/TCKN bilgileri; mal/hizmet tanım/miktar/fiyat/tutar; vergi tür/oran/tutarı; gerekli teslim ve QR/barkod alanlarıdır. İşleme göre senaryo, tevkifat, istisna, ihracat, özel matrah ve ek kodlar gerekir.

E-Arşiv teknik kılavuzu temel formatı UBL-TR olarak tanımlar. Sınırlı izinli PDF düzenlemede bile PAdES imzası ve uygun UBL-TR XML eklenmesi öngörülür. Sonuç: PDF tek başına elektronik asıl değildir. OzelAPP imzalı/doğrulanabilir XML/UBL’yi kanonik belge, PDF’yi görüntüleme kopyası olarak ele almalıdır.

#### Numara, tarih, senaryo ve vergi alanları

Belge numara sırası, düzenleme tarihi/süresi, TEMEL/TİCARİ/KAMU veya diğer senaryolar, tevkifat/istisna kodları ve işlem bazlı vergi hesabı uygulama koduna sabit varsayımla gömülmemelidir. Bunlar sürümlü `TaxProfile`/rule set + effective date ile temsil edilmeli; yayın öncesi müşavirce onaylanan test örnekleri kullanılmalıdır. Otomatik default’lar kullanıcıya vergi hükmü gibi gizlenmemeli, kaynak ve sürüm göstermelidir.

#### Saklama, bütünlük, iptal ve itiraz

Elektronik nüsha doğrulanabilir, okunabilir, yazdırılabilir ve bütünlüğü korunmuş biçimde saklanır; kâğıt/PDF çıktıya indirgeme yeterli değildir. Güncel GİB metnindeki Türkiye’de saklama ve başkası adına saklama hizmeti koşulları, OzelAPP’ın storage bölgesi ve rolünü `LEGAL REVIEW REQUIRED` yapar. Yurt dışı kopya ancak birincil saklama yükümlülüğüyle uyumlu ikincil kopya olarak değerlendirilmelidir.

İptal, itiraz, düzeltme ve ikame yeni olay/ilişkili belge üretir; orijinal overwrite edilmez. GİB’in iptal/itiraz portal kılavuzundaki sekiz günlük süre belirli akışlar içindir ve bütün fatura ihtilaflarına genellenmemelidir.

#### 2026 güncellik riski

GİB eBelge ana sayfası 27 Temmuz 2026 duyurusunda e-Fatura/e-Arşiv paket ve UBL kod listesi değişikliklerini 14 Eylül 2026’da yürürlüğe girecek şekilde yayımlamış, 11 Ağustos 2026’da e-Arşiv XSD düzeltmesi duyurmuştur. Bu araştırma 3 Eylül’de yapıldığı için pilot/go-live’da yürürlükteki XSD, Schematron ve kod listeleri yeniden indirilip hash’lenmeli ve regression fixture’ları güncellenmelidir.

#### Yazılım gereksinimi / hukuki inceleme matrisi

| Alan | Yazılım gereksinimi | Durum |
|---|---|---|
| Alıcı yönlendirme | VKN inbox sorgusu; e-Fatura/e-Arşiv sonucu audit | CONFIRMED |
| UBL/XML | Kanonik imzalı dosya + görüntüleyici/doğrulama | CONFIRMED |
| PDF | Sunum kopyası; tek başına resmi asıl sayma | CONFIRMED |
| Zorunlu alanlar | Sürüm/işlem tipi bazlı schema validation | CONFIRMED |
| Senaryo | Müşavir onaylı allowlist/rule set | LEGAL REVIEW REQUIRED |
| Tevkifat/istisna | Kod, oran, dayanak ve test örnekleri | LEGAL REVIEW REQUIRED |
| Numara/tarih | Issuer/seri/yıl kilidi ve zaman kuralı | LEGAL REVIEW REQUIRED |
| Saklama | Türkiye primary region, immutable sürüm, retention schedule | LEGAL REVIEW REQUIRED |
| İptal/itiraz | Olay+ilişkili belge; kanal/süre kuralı | LEGAL REVIEW REQUIRED |
| KVKK | Amaç, rol, aydınlatma, aktarım, erişim/silme politikası | LEGAL REVIEW REQUIRED |

#### Resmi kaynak kanıtı

| Kaynak | Kurum | URL | Kullanılan bölüm | Karar |
|---|---|---|---|---|
| eBelge ana sayfası/duyurular | GİB | https://ebelge.gib.gov.tr/anasayfa.html | 27.07 ve 11.08.2026 duyuruları | 14.09.2026 schema kapısı |
| e-Fatura Mevzuat ve Teknik Mimari | GİB | https://ebelge.gib.gov.tr/efaturamevzuat.html | UBL ve uygulama yöntemleri | Yetkili kanal/elektronik belge |
| 509 Tebliğ, güncel dipnotlu metin | GİB | https://ebelge.gib.gov.tr/dosyalar/tebligler/Dipnotlu_Guncel_Sekli_ile_509_Sira_No%27lu_VUK_Genel_Tebligi.pdf | e-Fatura/e-Arşiv/alan/saklama | Temel yasal/teknik gereksinimler |
| 589 No’lu Değişiklik Tebliği | GİB | https://ebelge.gib.gov.tr/dosyalar/tebligler/Vergi_Usul_Kanunu_Genel_Tebligi_%28Sira_No_509%29%27nde_Degisiklik_Yapilmasina_Dair_Teblig_%28Sira_No_589%29.pdf | 31.12.2025 değişiklikleri | Güncel mevzuat |
| e-Arşiv Teknik Kılavuzu v1.18 | GİB | https://ebelge.gib.gov.tr/dosyalar/kilavuzlar/e-Arsiv_Teknik_Kilavuzu_V.1.18.pdf | UBL-TR/PDF/saklama | PDF yeterliliği |
| İptal/İtiraz Kılavuzu v1.2 | GİB | https://ebelge.gib.gov.tr/dosyalar/kilavuzlar/e-Fatura_Iptal_Ihtar_Itiraz_Bildirim_Kilavuzu_V_1.2.pdf | Portal olayları/süreler | İptal/itiraz akışı |
| KVKK Kanunu | KVKK | https://www.kvkk.gov.tr/Icerik/6649/Personal-Data-Protection-Law | Md.4, 9, 10, 12 | Minimizasyon/aktarım/güvenlik |

#### Karar kaydı

**Karar:** OzelAPP resmi e-belgeyi yetkili kanal sonucuna dayandıracak; imzalı UBL/XML’yi kanonik, PDF’yi sunum kopyası tutacak; vergi senaryolarını müşavir/hukuk onayına bağlayacak.  
**Durum:** DESIGN RECOMMENDATION  
**Bağlı ana faz:** 3–5; pilot doğrulaması faz 7  
**Bağımlılıklar:** GİB güncel paketleri, Paraşüt/özel entegratör, mali müşavir/hukuk, Türkiye saklama mimarisi.  
**Sektörel gerekçe:** E-belge formatı, kanal, imza ve işlem senaryosu düzenlenmiş alandır.  
**Kaynak:** GİB 509/589, e-Fatura teknik sayfası, e-Arşiv ve iptal/itiraz kılavuzları; KVKK.  
**Teknik gerekçe:** Sürümlü rule/schema ve immutable belge, zamanla değişen kuralları izlenebilir kılar.  
**Güvenlik etkisi:** Belge bütünlüğü, tenant erişimi ve veri minimizasyonu güçlenir.  
**Maliyet/karmaşıklık:** Yüksek; düzenleyici doğrulama, imza/XML görüntüleme ve retention gerekir.  
**Yanlış uygulanırsa risk:** Geçersiz belge, yanlış vergi, saklama/aktarım ihlali ve müşteriye yanlış fatura.  
**Minimum uygulanabilir çözüm:** Yetkili kanal + müşavir onaylı alan/senaryo seti + XML/PDF birlikte + iptal/itiraz audit’i.  
**İleride genişletme yolu:** Sürümlü vergi rule engine ve otomatik schema/Schematron regression seti.

### 2026 zorunlu güncellik kapısı

- **CONFIRMED:** GİB, 27 Temmuz 2026’da e-Fatura/e-Arşiv paketleri ve UBL-TR kod listesi güncellemelerinin 14 Eylül 2026’da devreye alınacağını duyurdu; 11 Ağustos’ta `earsiv.xsd`, 24 Ağustos’ta e-Fatura paketi eksikleri düzeltildi. Kaynak: https://ebelge.gib.gov.tr/duyurular.html
- **DESIGN RECOMMENDATION:** Go-live tarihi 14 Eylül 2026 veya sonrasıysa son düzeltilmiş paket indirilir, sürüm/URL/SHA-256 arşivlenir; pre/post transition contract fixtures ayrı koşturulur.
- **LEGAL REVIEW REQUIRED:** 2026 tutarsız/eşik kuralları, mükellef grubu, KDV faaliyet kodu ve somut belge seçimi mali müşavir/hukuk onayı olmadan otomatikleştirilmez.

## 8. PCI ve ödeme güvenliği

> **Etiketleme kuralı:** Bu alt bölümde resmî kaynakla doğrudan doğrulanan sağlayıcı/standart davranışları `CONFIRMED`; OzelAPP'a özgü mimari, test ve rollback tercihleri `DESIGN RECOMMENDATION`; açık sağlayıcı doküman boşlukları `PROVIDER CONFIRMATION REQUIRED` veya `UNKNOWN`; somut vergi/hukuk kararları `LEGAL REVIEW REQUIRED`; dış hesap, sözleşme veya canlı kanıtlar `EXTERNAL DEPENDENCY` olarak okunur.

**Erişim tarihi:** 3 Eylül 2026  
**Amaç:** OzelAPP’ın kart verisi kapsamını küçülten, denetlenebilir kuralları sınıflandırmak.

#### SAQ A ve hosted ödeme

SAQ A, kart sahibi verisi fonksiyonlarını doğrulanmış üçüncü tarafa tamamen dış kaynaklayan ve kendi elektronik sistemlerinde CHD/SAD saklamayan, işlemeyen veya iletmeyen uygun e-ticaret merchant’ları içindir. Hosted/redirect yaklaşımı güçlü bir kapsam azaltma aracıdır; “PCI sorumluluğu yok” anlamına gelmez. Embedded iframe/payment element kullanılırsa PCI SSC’nin 2025 SAQ A uygunluk güncellemesi merchant sayfasının script saldırılarına açık olmadığını doğrulama veya compliant sağlayıcıdan teyit ister. Nihai validasyon yolunu acquirer/payment brand belirler.

#### Normatif kontrol matrisi

| Seviye | Kural | Gerekçe/kanıt |
|---|---|---|
| MUST | Hosted/tokenized card entry kullan; tutar/currency/order’ı server-side doğrula | Kart yüzeyini küçültür; istemci manipüle edilebilir |
| MUST | Webhook raw body imzası, timestamp/replay toleransı, event dedupe ve iş idempotency uygula | Stripe resmi webhook güvenlik modeli |
| MUST | TLS; ortam ayrımı; least-privilege RBAC; audit trail; erişim ve secret rotasyonu uygula | PCI/sağlayıcı güvenlik ilkeleri |
| MUST | Acquirer/QSA ile geçerli SAQ kapsamını ve güncel formu doğrula | Merchant’ın kendi kendine varsayamayacağı validasyon |
| MUST NOT | CVV/CVC’yi authorization sonrasında, şifreli veya müşteri izinli olsa bile saklama | PCI SSC FAQ 1280/1574 |
| MUST NOT | Bu mimaride full PAN’ı DB, log, cache, analytics, export veya backup’ta tutma | SAQ A hedefi ve gereksiz veri minimizasyonu |
| MUST NOT | Client secret, API key, webhook secret veya kart auth verisini public payload/URL/log’a koyma | Secret ve PCI sızıntısı |
| MUST NOT | Browser success/callback’i ödeme kanıtı veya imzasız webhook’u durum değiştirici sayma | İstemci/girdi güvenilmez |
| MUST NOT | QSA-doğrulamalı ayrı program olmadan Google Pay DIRECT kullanma | Direct decrypt kart/PCl yükü getirir |
| SHOULD | En küçük kapsam için tam redirect; embedded ise CSP/script envanteri/değişiklik algılama | 2025 SAQ A script ölçütü |
| SHOULD | KMS/envelope encryption, sürümlü key ID, rotasyon ve break-glass logu | Secret at-rest ve operasyon güvenliği |
| SHOULD | Rate limit, bot/fraud sinyali, kuyruk, circuit breaker ve günlük mutabakat | Abuse ve dış servis arızası |
| SHOULD | Log şeması allowlist, maskeleme, kısa retention ve backup DLP taraması | Yan kanaldan veri birikmesini önler |
| MAY | Provider token/ID ve brand/last4/expiry gibi sınırlı metadata’yı iş amacı/retention ile tut | Kart tanıma ve destek; full PAN değildir |
| MAY | Embedded Payment Element/CF seç; ek script/tamper kontrolü ve SAQ teyidiyle | UX ile güvenlik operasyonu dengesi |

#### Secret management ve encryption

Secret’lar kod deposu/config bundle/veritabanı açık alanında değil, KMS/Vault kontrollü bir secret store’da tutulmalıdır. Uygulama yalnız runtime kimliğiyle ihtiyaç duyduğu provider/tenant secret’ını decrypt eder. Her şifreli kayıtta `key_version`, tenant/provider, created/rotated/revoked time bulunur. Key rotasyonu dual-read/new-write penceresiyle ve geri alma planıyla yapılır. TLS 1.2+ alt sınırı provider gereksinimleriyle doğrulanır; sertifika doğrulama kapatılmaz.

Şifreleme kapsamı ortadan kaldırmaz: decrypt edebilen veya key yöneten sistemler kapsamda kalır. Bu nedenle asıl kontrol gereksiz kart verisini hiç almamaktır.

#### Webhook ve abuse güvenliği

1. Endpoint yalnız HTTPS ve sınırlı method/body size kabul eder.
2. Raw body limiti aşılırsa parse öncesi reddedilir.
3. Provider imzası constant-time doğrulanır; timestamp toleransı ve NTP izlenir.
4. `provider + account + event_id` unique constraint ile event inbox’a yazılır.
5. Hızlı `2xx`; iş kuyruğunda idempotent state transition.
6. Sırasız event’te provider nesnesi retrieve edilir; geriye durum düşürme yoktur.
7. IP allowlist yalnız ek katmandır; imzanın yerine geçmez.
8. Rate limit saldırganı değil provider retry’ını cezalandırmayacak şekilde provider/account bazlıdır.

#### Log, audit, erişim ve yedek

Uygulama logu allowlist olmalı; request header/body’nin körlemesine loglanması yasaktır. API key, authorization header, webhook signature, Checkout token/client secret, PAN/CVV redaction testleri bulunmalıdır. Audit log; aktör, tenant, eylem, hedef, önce/sonra hash’i, zaman, request correlation ve gerekçeyi taşır; değiştirilemez/append-only tutulur. Refund ve secret görüntüleme/rotasyon için step-up authentication ve ayrık rol gerekir.

Backup’lar da aynı veri sınıflandırmasına tabidir. “Uygulama saklamıyor” iddiası log, crash dump, queue dead letter, APM ve backup taramasıyla kanıtlanmalıdır. Restore testi yalnız geri dönüşü değil, hassas verinin geri gelmediğini de doğrular.

#### Güvenlik test kanıtı

| Risk | Senaryo | Koruma | Beklenen test kanıtı | Öncelik |
|---|---|---|---|---|
| CVV/PAN sızıntısı | Request/APM/backup kart alanı tutar | Hosted fields + allowlist logs + DLP scan | Seed edilen test marker’ı hiçbir store’da yok | P0 |
| Replay | Geçerli webhook tekrar gönderilir | Timestamp + event unique + iş idempotency | İkinci istek no-op, tek finansal yan etki | P0 |
| Sahte webhook | İmza yok/bozuk | Raw-body signature verify | `4xx`, durum değişmez | P0 |
| Secret leak | Public form/bundle/error API key döndürür | DTO allowlist + secret scanner | Snapshot/bundle/response taraması temiz | P0 |
| Yetkisiz refund | Editor iade dener | RBAC + step-up + audit | `403`, provider çağrısı yok | P0 |
| Key kaybı/rotasyon | Eski key devreden çıkar | Versioned envelope key + dual read | Eski kayıt okunur, yeni yazı yeni key | P1 |
| Backup sızıntısı | Log/queue dump sensitive marker içerir | Retention + redaction + scan | Backup DLP kontrolü temiz | P1 |

#### Resmi kaynak kanıtı

| Kaynak başlığı | Kurum | URL | Kullanılan bölüm | Karar |
|---|---|---|---|---|
| SAQ A updates | PCI SSC | https://blog.pcisecuritystandards.org/important-updates-announced-for-merchants-validating-to-self-assessment-questionnaire-a | Eligibility criteria | SAQ A sınırı |
| FAQ clarifies SAQ A | PCI SSC | https://blog.pcisecuritystandards.org/faq-clarifies-new-saq-a-eligibility-criteria-for-e-commerce-merchants | Embedded scripts | Tam redirect/embedded farkı |
| FAQ 1280 | PCI SSC | https://www.pcisecuritystandards.org/faqs/1280/ | CVV storage | CVV MUST NOT |
| FAQ 1574 | PCI SSC | https://www.pcisecuritystandards.org/faqs/1574 | Sensitive authentication data | Authorization sonrası yasak |
| Merchant resources | PCI SSC | https://www.pcisecuritystandards.org/merchants | Scope/encryption | SAQ teyidi ve encryption sınırı |
| Stripe webhooks | Stripe | https://docs.stripe.com/webhooks | Signature, replay, duplicate, ordering | Webhook kontrol seti |
| OAuth 2.0 Security BCP | IETF | https://www.rfc-editor.org/rfc/rfc9700.html | Token/redirect/client security | Secret/token yaşam döngüsü |

#### Karar kaydı

**Karar:** OzelAPP kart verisini tamamen sağlayıcı kontrollü yüzeye dış kaynaklayacak; SAQ A hedeflenecek fakat uygunluk acquirer/QSA kanıtına bağlanacak.  
**Durum:** DESIGN RECOMMENDATION  
**Bağlı ana faz:** 1–2; kontroller sonraki fazların release kapısıdır  
**Bağımlılıklar:** Hosted PSP, acquirer/QSA, KMS/secret store, merkezi audit/log/DLP.  
**Sektörel gerekçe:** Kart verisini almamak, şifreleyip yönetmekten daha güçlü kapsam ve risk azaltımıdır.  
**Kaynak:** PCI SSC SAQ A ve CVV FAQ’ları; Stripe webhook; IETF OAuth Security BCP.  
**Teknik gerekçe:** Allowlist veri akışı ve event inbox, hassas veriyi ve tekrarlı yan etkileri sınırlar.  
**Güvenlik etkisi:** PCI yüzeyi küçülür; secret/replay/abuse ve insider riskleri denetlenir.  
**Maliyet/karmaşıklık:** Orta; KMS, audit, tarama ve operasyon prosedürü gerekir.  
**Yanlış uygulanırsa risk:** Kart/veri ihlali, yanlış SAQ beyanı, çifte finansal işlem ve düzenleyici/itibar zararı.  
**Minimum uygulanabilir çözüm:** Tam redirect hosted ödeme + hiç PAN/CVV almama + raw-body webhook doğrulama + KMS secret + log/backup tarama.  
**İleride genişletme yolu:** Embedded UI ancak script güvenliği kanıtı; per-tenant envelope keys ve sürekli compliance kontrolü.

### Güvenlik kontrol matrisi

| Kontrol | Etiket | OzelAPP kararı | Kanıt/test | Release kapısı |
|---|---|---|---|---|
| Hosted/redirect | DESIGN RECOMMENDATION | Tam redirect en dar script yüzeyi; embedded yalnız sağlayıcı teyidiyle. | Network/DOM canary; CSP; provider AOC. | Acquirer exact SAQ kararı. |
| SAQ | CONFIRMED + EXTERNAL DEPENDENCY | “PCI dışı” denmez; eligibility gerçek veri akışıyla kanıtlanır. | Data-flow diagram, ASV/SAQ evidence gerektiği ölçüde. | Acquirer/card brand/PCI uzmanı. |
| PAN/CVV | CONFIRMED / REJECTED | PAN alınmaz; CVV authorization sonrası şifreli bile saklanmaz. | Schema/log/APM/cache/backup/export canary scan. | Sıfır canary hit. |
| Secret management | DESIGN RECOMMENDATION | Secret manager, least privilege, runtime fetch/cache, rotation, no env dump. | Rotation drill ve redaction tests. | Çift-anahtar geçişi kanıtlı. |
| Credential encryption | DESIGN RECOMMENDATION | Envelope encryption; tenant+provider+environment AAD. | Wrong-context decrypt negative test. | KMS policy ve audit. |
| Log/backup/export | DESIGN RECOMMENDATION | Allowlist log; token/PAN/CVV/PII redaction; exportte spreadsheet injection savunması. | DLP canary + restore scan. | Sıfır hassas bulgu. |
| Webhook verify | DESIGN RECOMMENDATION | Raw canonical, algorithm/version allowlist, constant-time compare, size/method limit. | Golden/negative vectors. | Provider fixture. |
| Replay/idempotency | DESIGN RECOMMENDATION | Unique inbox, event time + received time, monotonic reducer, outbox uniqueness. | Old/reordered/duplicate concurrency tests. | Tek yan etki. |
| Rate/brute force | DESIGN RECOMMENDATION | IP+form+principal+tenant token bucket; enumeration-safe problem. | Burst/distributed abuse test. | 429/Retry-After sözleşmesi. |
| 3DS/SCA | PROVIDER CONFIRMATION REQUIRED | Provider capability; fallback/decline dürüst gösterilir. | Test cards + live low-value. | Merchant/acquirer config. |
| Chargeback | PROVIDER CONFIRMATION REQUIRED | Append-only dispute case/evidence timeline; otomatik refund değil. | Provider dispute fixture. | Finance/support runbook. |
| Refund auth | DESIGN RECOMMENDATION | RBAC, step-up, four-eyes threshold, reason, cumulative invariant. | IDOR/CSRF/concurrent refund tests. | Audit + pilot refund. |
| Admin RBAC/audit | DESIGN RECOMMENDATION | Deny-by-default; finance/support separation; immutable audit. | Role matrix and tamper tests. | Owner/approver matrisi. |
| Incident response | DESIGN RECOMMENDATION | Payment/delivery/provider kill switch; secret rotate; evidence preserve. | Tabletop + recovery drill. | On-call/owner tanımlı. |
| Veri minimizasyonu | CONFIRMED + DESIGN RECOMMENDATION | Yalnız muhasebe/teslim için gereken veri; raw provider payload private/retention’lı. | Field inventory and retention job. | Hukuk/operasyon onayı. |

### Kullanıcıya “kart bilgisi tutulmuyor” bildirimi

**DESIGN RECOMMENDATION:** Pazarlama iddiası yerine koşullu ve sistem tarafından kanıtlanabilir metin kullanılmalıdır: “Kart bilgilerinizi OzelAPP formunda istemiyoruz ve OzelAPP veritabanında saklamıyoruz. Kart alanları ödeme sağlayıcısının güvenli sayfasında işlenir. İşlem sonucu ve gerekli ödeme referansları kayıtlarımızda tutulur.” Bu metin ancak data-flow, schema, network, log/APM, backup/export ve support-ticket taramaları PAN/CVV akışı olmadığını gösteriyorsa yayınlanır. “Hiçbir şekilde tutulmaz” gibi mutlak ifade, provider/processor kayıtlarını da ima edebileceği için LEGAL REVIEW REQUIRED ve aksi halde REJECTED’dır.

## 9. Google Pay/yurtdışı ödeme

> **Etiketleme kuralı:** Bu alt bölümde resmî kaynakla doğrudan doğrulanan sağlayıcı/standart davranışları `CONFIRMED`; OzelAPP'a özgü mimari, test ve rollback tercihleri `DESIGN RECOMMENDATION`; açık sağlayıcı doküman boşlukları `PROVIDER CONFIRMATION REQUIRED` veya `UNKNOWN`; somut vergi/hukuk kararları `LEGAL REVIEW REQUIRED`; dış hesap, sözleşme veya canlı kanıtlar `EXTERNAL DEPENDENCY` olarak okunur.

### PAYMENT_GATEWAY ve DIRECT karşılaştırması

| Boyut | PAYMENT_GATEWAY | DIRECT | OzelAPP hükmü |
|---|---|---|---|
| Tokenization | Google destekli gateway ID + gatewayMerchantId | Merchant public key; ECv2 token | PAYMENT_GATEWAY güvenli varsayılan. |
| Decryption | PSP/gateway sorumluluğu | Merchant signature verify + decrypt + expiration | DIRECT REJECTED. |
| Payload | PSP’ye uygun token | Çözülünce PAN/expiry ve olası cryptogram/ECI | DIRECT PCI yüzeyini büyütür. |
| PCI | Gateway/PSP ile paylaşılan, daha dar olabilir | QSA doğrulanmış PCI ve güvenli payment credential altyapısı | OzelAPP bu şartları varsaymaz. |
| Merchant ID/domain | Gateway hesabı + Google production merchantId/domain review | Aynı + direct key/attestation | Kanıt yoksa feature kapalı. |
| Test/live | TEST tahsil edilebilir canlı veri değildir | Aynı; ayrıca key/crypto testleri | Test kanıtı canlı kanıt değildir. |
| Country/device | isReadyToPay yalnız cihaz/browser readiness | Aynı | PSP/account/network/authMethod/currency ayrıca doğrulanır. |
| Key rotation | PSP yönetebilir | Merchant yıllık rotation; overlap/old key gerekir | DIRECT operasyon yükü kabul edilmez. |
| Fallback | Hosted kart/PSP yöntemi | DIRECT’e sessiz düşüş tehlikeli | Google Pay yoksa hosted iyzico fallback. |
| iyzico capability | Resmi Google gateway listesinde kanıtlanamadı | Teknik olarak başka yol olsa da uygun değil | `gateway: iyzico` uydurmak REJECTED. |

**Erişim tarihi:** 3 Eylül 2026

#### Doğrudan sonuç

Google Pay, OzelAPP’ta bağımsız bir tahsilat sağlayıcısı değil Stripe/iyzico veya başka onaylı PSP’nin sunduğu bir cüzdan yeteneği olmalıdır. `PAYMENT_GATEWAY` tokenization modelinde token seçilen PSP’ye gider. `DIRECT`, OzelAPP’ın Google Pay payment token imzasını/expiry’sini doğrulamasını, ECv2 verisini decrypt etmesini, anahtar döndürmesini ve QSA-doğrulamalı PCI programını gerektirir. Bu yük MVP ile orantısızdır; `DIRECT` kullanılmamalıdır.

#### Doğru entegrasyon modeli

| Model | Veri yolu | PCI/operasyon etkisi | Karar |
|---|---|---|---|
| `PAYMENT_GATEWAY` | Google Pay → PSP tokenization → PSP tahsilatı | En küçük OzelAPP kart yüzeyi; yine merchant/PSP şartları var | DESIGN RECOMMENDATION |
| `DIRECT` | Şifreli kart tokenı → OzelAPP doğrulama/decrypt → processor | Kart verisi, crypto key lifecycle ve QSA doğrulaması | REJECTED (MVP) |

#### Merchant ID, domain ve ortam

Production’da geçerli Google merchant yapılandırması, onaylı domain ve chargeable payment method gerekir. PSP’nin ek domain kayıt süreci olabilir; test ve live domain/hesap kaydı ayrı ele alınmalıdır. `TEST` ortamı dummy/non-chargeable yöntem döndürebilir ve canlı tahsilat kanıtı değildir. Merchant adı, origin ve PSP merchant hesabı tutarlı olmalıdır.

#### Country/currency/browser/device

Destek statik bir “her yerde görünür” kural değildir. Browser’ın güvenli bağlam/HTTPS gereksinimi, desteklenen cihaz/browser, müşterinin uygun wallet/card’ı, merchant country/currency ve PSP capability’si birlikte belirleyicidir. UI açılışta `isReadyToPay` ve provider capability sonucuna göre butonu gösterir. Google Pay görünmez/başarısızsa standart hosted kart ödeme her zaman fallback kalır. Sabit bir ülke veya cihaz listesi koda gömülmemeli; güncel provider/Google dokümanı ve runtime capability esas alınmalıdır.

#### Güvenlik gereksinimleri

- Google Pay payload’ı OzelAPP public form modelinde veya analytics’te tutulmaz.
- Gateway tanımlayıcısı ve provider merchant config yalnız gerekli public yapılandırmayla sınırlandırılır; API secret değildir.
- Tutar/currency OzelAPP sunucusunda hesaplanır ve provider sonucuyla eşleştirilir.
- Test/live merchant, domain, PSP hesabı ve key’ler ayrı tutulur.
- Domain değişikliği deployment checklist’inde yeniden kayıt/doğrulama gerektirir.
- Wallet başarı callback’i fulfillment kanıtı sayılmaz; provider webhook/retrieve belirleyicidir.

#### Resmi kaynak kanıtı

| Kaynak başlığı | Kurum | URL | Bölüm | Desteklediği karar |
|---|---|---|---|---|
| Request objects | Google Pay | https://developers.google.com/pay/api/web/reference/request-objects | `TokenizationSpecification`, `MerchantInfo`, `PaymentOptions` | Gateway/direct ayrımı, Merchant ID |
| Payment data cryptography | Google Pay | https://developers.google.com/pay/api/web/guides/resources/payment-data-cryptography | ECv2 direct tokens | Direct decrypt/imza/PCI yükü |
| Web tutorial | Google Pay | https://developers.google.com/pay/api/web/guides/tutorial | `isReadyToPay` | Runtime browser/device uygunluğu |
| Setup | Google Pay | https://developers.google.com/pay/api/web/guides/setup | HTTPS/browser | Güvenli bağlam ve ortam şartı |
| Integration checklist | Google Pay | https://developers.google.com/pay/api/web/guides/test-and-deploy/integration-checklist | Test vs production | Test tokenının canlı kanıt olmaması |
| Express Checkout Element | Stripe | https://docs.stripe.com/elements/express-checkout-element | Wallet availability/domain registration | PSP üzerinden koşullu görünürlük |

#### Karar kaydı

**Karar:** Google Pay yalnız onaylı PSP’nin `PAYMENT_GATEWAY` entegrasyonu ve runtime capability sonucu üzerinden gösterilecek; `DIRECT` MVP’de yasaklanacak.  
**Durum:** SIMPLIFIED  
**Bağlı ana faz:** 1; ödeme kesinliği faz 2  
**Bağımlılıklar:** Stripe/iyzico capability, Google production merchant/domain onayı, country/currency ve cihaz uygunluğu.  
**Sektörel gerekçe:** Cüzdan erişimi merchant, PSP, domain ve kullanıcı ortamının birleşik yeteneğidir.  
**Kaynak:** Google Pay Request Objects, Cryptography, Tutorial, Setup ve Integration Checklist; Stripe Express Checkout.  
**Teknik gerekçe:** PSP gateway modeli mevcut PaymentOrder/provider adapter’ını kullanır; ayrı kart işleme altyapısı kurmaz.  
**Güvenlik etkisi:** Direct token decrypt/anahtar ve geniş PCI yüzeyi önlenir.  
**Maliyet/karmaşıklık:** Düşük-orta; domain/merchant onayı ve UI fallback gerekir.  
**Yanlış uygulanırsa risk:** Canlı olmayan tokenı başarı saymak, uygun olmayan kullanıcıya buton göstermek, kart verisi/PCl kapsamını istemeden almak.  
**Minimum uygulanabilir çözüm:** Provider capability + `isReadyToPay` + Google Pay butonu + standart checkout fallback + webhook kesinliği.  
**İleride genişletme yolu:** Yeni PSP/country desteğini capability matrisiyle eklemek; `DIRECT` yalnız ayrı QSA programıyla yeniden değerlendirilir.

### Yurtdışı ve Stripe notu

- **CONFIRMED (çıkarımlı):** Stripe’ın 3 Eylül 2026 tarihindeki resmi global destek listesinde Türkiye yer almamaktadır; resmi sayfa destek dışı bölgeler için “Payments not supported yet” notunu taşır: https://stripe.com/global
- **PROVIDER CONFIRMATION REQUIRED:** OzelAPP’ın hukuken/operasyonel olarak Stripe hesabı açmaya uygun bir desteklenen kuruluşu, settlement bankası ve sözleşmesi olduğu kanıtlanmamıştır. Türkiye’den doğrudan Stripe hesabı varmış gibi tasarım yapmak REJECTED’dır.
- **DESIGN RECOMMENDATION:** Provider selection `merchant_country + legal_entity + settlement_country + currency + payment_method + account_capability` bileşkesiyle fail-closed çalışır. Google Pay düğmesi yalnız Google `isReadyToPay`, PSP/account capability, currency/country/network ve production feature flag birlikte doğruysa görünür.

## 10. Transactional bildirim ve teslimat

> **Etiketleme kuralı:** Bu alt bölümde resmî kaynakla doğrudan doğrulanan sağlayıcı/standart davranışları `CONFIRMED`; OzelAPP'a özgü mimari, test ve rollback tercihleri `DESIGN RECOMMENDATION`; açık sağlayıcı doküman boşlukları `PROVIDER CONFIRMATION REQUIRED` veya `UNKNOWN`; somut vergi/hukuk kararları `LEGAL REVIEW REQUIRED`; dış hesap, sözleşme veya canlı kanıtlar `EXTERNAL DEPENDENCY` olarak okunur. Marketing/campaign/list yönetimi bu release için `DEFERRED`dır.

**Erişim tarihi:** 3 Eylül 2026  
**Kapsam sınırı:** Yalnız ödeme/fatura ve zorunlu operasyon bildirimleri; kampanya, bülten, lead nurturing yoktur.

#### İzinli olaylar ve akış

| Domain olayı | Alıcı amacı | Retry/suppression notu |
|---|---|---|
| `payment.succeeded` | Tahsilat alındı | Aynı event tek mesaj |
| `payment.failed` | İşlem tamamlanmadı, güvenli retry yolu | Kart/secret/hassas hata yok |
| `payment.pending` | Sonuç bekleniyor | Sıklık sınırı; başarıyla supersede |
| `invoice.ready` | Belge indirilebilir | Kısa ömürlü güvenli link |
| `invoice.sent` | Muhasebe/kanala gönderim kanıtı | “Düzenlendi” ile karıştırma |
| `refund.created/succeeded` | İade durumu | Tutar/currency ve referans |
| `accounting.sync_failed` | Yetkili operasyon kullanıcısı | Son kullanıcıya stack trace yok |
| `system.error` | On-call/operasyon | PII/secret redacted |

İş olayıyla aynı transaction’da `email_outbox` yazılır. Worker sağlayıcı adapter’ını çağırır; mesaj idempotency key’i `tenant+event+template_version+recipient` olur. Delivery/bounce/complaint webhook’u imza doğrulanmış inbox’a alınır.

Durumlar: `queued → accepted → delivered`; geçici durumda `deferred → delivered|failed`; kalıcı durumda `bounced|complained|suppressed|failed`. Hard bounce/complaint tekrar denenmez; transient hata bounded exponential backoff+jitter alır. Rate/quota hesap ve region bazında keşfedilir, sabit kodlanmaz.

#### Transactional–marketing ayrımı

Türkiye Ticari İletişim düzenlemesinde devam eden üyelik/abonelik, tahsilat/borç, bilgi güncelleme, satın alma ve teslimat bildirimleri belirli koşullarda önceden ticari ileti onayından ayrı değerlendirilebilir; bu mesajlar ürün/hizmet özendirmesi içermemelidir. Somut şablon ve hukuki dayanak `LEGAL REVIEW REQUIRED`dır. Marketing tercihleri ile zorunlu operasyon kategorileri aynı suppression kuralına körlemesine bağlanmamalıdır; buna karşılık hard bounce/complaint güvenlik ve deliverability nedeniyle her ikisini etkileyebilir.

Şablon lint’i promosyon CTA/indirim/çapraz satış alanlarını yasaklar. Her mesajın amacı, dayanağı, template version’ı ve retention’ı kayıtlıdır.

#### SPF, DKIM, DMARC ve tenant domain

Google sender guidelines tüm göndericiler için SPF veya DKIM, yüksek hacim için SPF+DKIM+DMARC ve alignment ister; operasyon ve promosyon trafiğini ayrı From adreslerinde tutmayı önerir. OzelAPP en baştan SPF, DKIM ve DMARC’ı birlikte hedeflemelidir.

Tenant domain state machine: `unconfigured → dns_pending → verified → degraded → revoked`. DNS kaydı periyodik doğrulanır. Doğrulanmamış tenant, OzelAPP’ın açık markalı ortak transactional alt alanından gönderir; başka tenant domain’ini kullanamaz. Provider migration’ında identity doğrulaması yeniden gerekir.

#### Güvenli fatura linki ve KVKK/GDPR

E-posta eki yerine opaque, PII içermeyen, kısa ömürlü, exact document/audience bağlı HTTPS linki tercih edilir. Token server-side revoke edilebilir; hassas belgede oturum veya step-up istenir. KVKK açısından amaçla sınırlılık, veri minimizasyonu, aydınlatma, güvenlik, saklama ve yurt dışı aktarımı; GDPR uygulanan durumda controller/processor, hukuki dayanak ve aktarım ayrıca incelenir. Provider region, DPA ve alt işleyen listesi procurement kapısıdır. Yanlış alıcıya kişisel veri gönderimi KVKK veri ihlali riski olduğundan alıcı doğrulaması ve teslim audit’i şarttır.

#### Sağlayıcı karşılaştırması

| Sağlayıcı | Güçlü senaryo | Dikkat |
|---|---|---|
| Postmark | Transactional-first, yalın akış/webhook | Region/DPA/fiyat/SLA yeniden doğrula |
| SendGrid | Geniş API ve event ekosistemi | Global unsubscribe operasyon postasını yanlış baskılamasın |
| Mailgun | API-first, domain/subaccount kontrolü | Tenant domain ve event adapter testi |
| Amazon SES | AWS-native, yüksek hacim/maliyet odağı | Sandbox çıkışı, region identity/quota, daha çok operasyon |
| Mailchimp Transactional | Zaten Standard/Premium + Mailchimp template süreci | Ücretli add-on, blok fiyatlama; MVP için gereksiz bağımlılık |

Mailchimp Transactional varsayılan seçim olmamalıdır. Mevcut Standard/Premium Mailchimp hesabı ve ortak template/operasyon ihtiyacı yoksa marketing ekosistemine, blok fiyatlamaya ve ayrı add-on’a bağlanmak OzelAPP’ın yalnız transactional kapsamına değer katmaz. İlk seçim tek provider ile yapılmalı, ancak adapter/outbox bağımlılığı taşınabilir tutmalıdır.

#### Resmi kaynak kanıtı

| Kaynak | Kurum | URL | Bölüm | Karar |
|---|---|---|---|---|
| Email sender guidelines | Google | https://support.google.com/mail/answer/81126?hl=en | Authentication/message categories | SPF/DKIM/DMARC ve trafik ayrımı |
| SPF RFC 7208 | IETF | https://www.rfc-editor.org/info/rfc7208 | Sender authorization | DNS sihirbazı |
| DMARC RFC 7489 | IETF | https://www.rfc-editor.org/info/rfc7489 | Alignment/policy/reporting | Domain durumu |
| Event Webhook | SendGrid | https://www.twilio.com/docs/sendgrid/for-developers/tracking-events/event | Delivery/bounce/deferred | Sağlayıcı feedback |
| Mailgun Events | Sinch/Mailgun | https://documentation.mailgun.com/docs/mailgun/user-manual/events/events | accepted/delivered/failed | Adapter status |
| Postmark Webhooks | ActiveCampaign/Postmark | https://postmarkapp.com/developer/webhooks/webhooks-overview | Delivery/bounce/complaint | Adapter status |
| SES sending quotas | AWS | https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas.html | Sandbox/rate quota | Dinamik limit |
| SES suppression | AWS | https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html | Bounce/complaint | Suppression kuralı |
| Mailchimp Transactional | Mailchimp | https://mailchimp.com/help/about-transactional-email/ | Add-on dependency | Varsayılan olmaması |
| Transactional pricing | Mailchimp | https://mailchimp.com/pricing/transactional-email/ | 25k blocks | Maliyet uyumsuzluğu |
| Ticari İletişim Yönetmeliği | Ticaret Bakanlığı | https://kayseri.ticaret.gov.tr/yayinlar/tuketici/ticari-iletisim-ve-ticari-elektronik-iletiler-hakkinda-yonetmelik | Md. 6 | Operasyon/promosyon sınırı |
| KVKK 2020/966 | KVKK | https://www.kvkk.gov.tr/Icerik/6858/2020-966 | Wrong-recipient breach | Güvenli link/alıcı kontrolü |

#### Karar kaydı

**Karar:** Yalnız sekiz izinli operasyon olayı provider-bağımsız outbox ile gönderilecek; transactional/marketing kimliği ayrılacak ve varsayılan provider Mailchimp olmayacak.  
**Durum:** DESIGN RECOMMENDATION  
**Bağlı ana faz:** 6  
**Bağımlılıklar:** Tek transactional provider, domain DNS doğrulaması, webhook güvenliği, DPA/region/hukuk incelemesi.  
**Sektörel gerekçe:** Teslimat asenkron ve domain reputation/suppression’a bağlıdır; operasyon postası pazarlama değildir.  
**Kaynak:** Gmail sender, IETF SPF/DMARC, provider webhook/suppression, Ticaret Bakanlığı, KVKK.  
**Teknik gerekçe:** Outbox/inbox tekrarları kontrol eder ve provider taşınabilirliği sağlar.  
**Güvenlik etkisi:** Spoofing, yanlış alıcı, secret/PII içeriği ve link sızıntısı azalır.  
**Maliyet/karmaşıklık:** Orta; DNS state, webhook, suppression ve deliverability operasyonu gerekir.  
**Yanlış uygulanırsa risk:** Fatura ulaşmaması, phishing görünümü, complaint/domain itibarı ve KVKK/ticari ileti ihlali.  
**Minimum uygulanabilir çözüm:** Tek provider + shared branded transactional domain + outbox + signed webhook + hard-bounce suppression + süreli link.  
**İleride genişletme yolu:** Tenant doğrulanmış domainleri, ikinci provider/failover ve bölgesel routing.

### Sağlayıcı karşılaştırması

| Sağlayıcı | Resmi kanıtlanan yüzey | Güçlü taraf | Kritik boşluk/risk | OzelAPP kararı |
|---|---|---|---|---|
| Postmark | Delivery/bounce/complaint/subscription webhooks; bazı webhook retry’ları | Transactional odak ve sade stream | Fiyat/SLA/region güncel sözleşme | Güçlü aday; DPA/region/quota EXTERNAL DEPENDENCY |
| Mailgun | Webhook imza/payload; 200/406 ve çoğu olay için 5m,10m,15m,1h,2h,4h retry | Açık retry takvimi | Delivery notification retry dışı; reconcile gerekir | Adapter + poll/reconciliation şart |
| SendGrid | Signed Event Webhook/OAuth; delivery ve suppression yüzeyi | Geniş olay ekosistemi | Ordering/retention; unique args/category PII riski | Metadata allowlist; transactional suppression ayrımı |
| Mailchimp Transactional | Event batch; en çok 1000 olay/batch; başarısız batch 20 kez 15–25 dk ve sonraki batch’leri bloklayabilir | Mevcut ekosistem entegrasyonu | Head-of-line blocking | Webhook hemen persist+200; async process |
| Amazon SES | SNS/event publishing; bounce/complaint/delivery; regional suppression | AWS-native/esnek | Kota/production exit/region operasyonu; Gmail complaint sinyali yok | Yüksek ops yükü kabul edilirse aday |

### Toplu fatura/bildirim güvenlik ve kapasite tablosu

| Boyut | Etiket | Güvenli başlangıç | Dinamik kontrol | Kullanıcıya kanıt |
|---|---|---|---|---|
| Sistem limiti | DESIGN RECOMMENDATION | Provider kotasının %50’sini aşmayan, tenant başına küçük batch; sabit sayı evrensel değildir | 429/latency/queue age ile AIMD benzeri azalt/artır | Bekleyen/gönderilen/baskılanan/hatalı sayıları |
| Batch | DESIGN RECOMMENDATION | Ör. 25 intent transactionı; dış sağlayıcıya tek tek idempotent dispatch | Provider batch max’ı ve payload boyu | Batch ID ve immutable recipient snapshot |
| Retry | DESIGN RECOMMENDATION | 5xx/408/429/network: bounded exponential backoff+jitter; permanent 4xx/suppression retry yok | Retry-After varsa uy | Attempt timeline ve next_retry_at |
| Provider rate | PROVIDER CONFIRMATION REQUIRED | Token bucket provider+tenant+stream scope | Kota header/API/console | Quota utilization |
| DNS | CONFIRMED | SPF+DKIM; DMARC alignment; TLS; PTR gerektiğinde; Gmail toplu şartları | DMARC report/spam rate | Domain status ekranı |
| Abuse | DESIGN RECOMMENDATION | Verified recipient, maskeli preview, çift onay, daily tenant cap, anomaly alarm | Bounce/complaint/suppression | Neden gönderilmedi açıklaması |
| Teslim kanıtı | CONFIRMED + DESIGN RECOMMENDATION | provider accepted ≠ inbox; delivered webhook server acceptance olabilir | webhook+reconcile | “Sağlayıcı kabul etti / teslim sinyali / bounce” ayrımı |
| Yanlış alıcı | CONFIRMED + LEGAL REVIEW REQUIRED | Normalize+verify, immutable recipient, send-time final check, revoke link | KVKK ilke kararı ve incident flow | Maskeli alıcı + onay |
| Link | DESIGN RECOMMENDATION | Random token, hash-at-rest, short expiry, HTTPS, no-referrer, revoke ledger | Entitlement + use/revoke status | Süre/revoke açıklaması |
| PII log | DESIGN RECOMMENDATION | request_id/delivery_id/provider ID/status; e-posta maskeli | DLP canary | Audit access; içerik/log ayrımı |

## 11. API mimarisi

> **Etiketleme kuralı:** Bu alt bölümde resmî kaynakla doğrudan doğrulanan sağlayıcı/standart davranışları `CONFIRMED`; OzelAPP'a özgü mimari, test ve rollback tercihleri `DESIGN RECOMMENDATION`; açık sağlayıcı doküman boşlukları `PROVIDER CONFIRMATION REQUIRED` veya `UNKNOWN`; somut vergi/hukuk kararları `LEGAL REVIEW REQUIRED`; dış hesap, sözleşme veya canlı kanıtlar `EXTERNAL DEPENDENCY` olarak okunur. Aşağıdaki tüm endpoint ve iç sınırlar `PROPOSED CONTRACT`tır; mevcut kodda uygulandıkları varsayılmaz.

### Modüler monolit sorumluluk matrisi

| Modül | Sorumlu | Sorumlu değil | Girdi/çıktı | İzinli çağrı | Yasak bağımlılık | Veri sınırı | Transaction | Test | Rollback |
|---|---|---|---|---|---|---|---|---|---|
| Public Form | Published snapshot gösterme ve anonymous submit komutu | Admin draft/provider secret | public form ID → allowlisted DTO/submission ID | Publish, anti-abuse facade | Admin DB model serialization | Public snapshot/submission | Kısa submit tx + outbox | Mass assignment, rate, stale version | Publish flag/offline form |
| Admin | Yetkili operasyon/approval/read model | Finansal provider protocol | actor+command → audited result | Application services | Adapter raw secret/payload | Role-scoped views | Command tx | IDOR/CSRF/RBAC | Permission/feature flag |
| Form Builder | Draft tree, validation, revision | Public serving ve ödeme | edit command → immutable revision | Publish | Payment/provider | Draft/revision | Optimistic version tx | reorder/a11y/conflict | Restore revision |
| Publish | Draft→immutable public snapshot | Draft editing | revision → snapshot/version | Builder read, Public Form consume | Provider calls | Snapshot | Atomic publish pointer | concurrent publish/cache | Previous snapshot pointer |
| Payment | Order/attempt/normalized state | Kart verisi, invoice tax | order command/provider event → state/outbox | Provider adapter, Event inbox | UI/client amount authority | Payment ledger | Unique/idempotent tx | permutation/concurrency | Kill new create; reconcile |
| Provider Adapter | Provider request/response normalize/verify | Domain fulfillment | typed port ↔ provider payload | HTTP client, secret broker | Direct DB/domain mutation | Encrypted raw evidence | No cross-domain tx | contract/golden/timeout | Disable adapter |
| Invoice | Candidate/invoice/allocation state | GİB hukuki yorum | reconciled payments/customer snapshot → invoice | Manual accounting, Paraşüt port | Payment provider raw | Billing ledger | Allocation invariants | duplicate/currency/rounding | Draft cancel/forward fix |
| Manual Accounting | Selection/export/import/mapping | E-belge formalization | batch snapshot ↔ safe file/artifact | Invoice, Document vault | Direct provider | Manual batch/audit | Batch state tx | CSV injection/duplicate | Revoke batch/import version |
| Paraşüt Integration | OAuth/mapping/command/job polling | Kanonik domain truth/hukuk | invoice command ↔ provider IDs/status | Invoice, Vault, secret broker | Public/UI direct call | Connection/mapping/job | Local command/outbox | contract/rate/timeout | Disconnect/park/reconcile |
| Document Vault | Quarantine, validate, hash, immutable version, entitlement | Belge üretme/vergi kararı | artifact bytes+metadata → version/read link | Invoice/delivery entitlement | Public object key guess | Private object+metadata | Metadata tx; object staged | malware/cross-tenant/overwrite | Revoke link; preserve version |
| Transactional Delivery | Intent/outbox/dispatch/webhook/suppression | Marketing/list/campaign | domain event → delivery state | Provider adapter, Vault link service | Payment/invoice mutation | Delivery ledger | Outbox tx + worker | duplicate/bounce/wrong recipient | Pause stream/provider |
| Embed/WordPress | Secret-free public distribution | Private proxy/admin/payment secret | public embed config → iframe/block | Public Form only | Admin/Provider private API | WP public config | WP local option only | CSP/CORS/postMessage/WP matrix | Previous ZIP/config |
| Tenant/SaaS | Workspace/membership/policy/secret namespace | Core finance semantics | actor+workspace → scope | All app facades through context | Unscoped repository | tenant_id everywhere | Tenant-scoped tx | cross-tenant matrix/RLS | Suspend/read-only; no delete |

### REST ve OpenAPI kuralları

| Kural | Etiket | PROPOSED CONTRACT |
|---|---|---|
| Versioning/naming | DESIGN RECOMMENDATION | Noun resources under `/v1`; provider adı public contract’a sızmaz; breaking change yeni version. |
| OpenAPI | CONFIRMED + DESIGN RECOMMENDATION | OAS latest 3.2.0 (2025-09-19), ancak toolchain test edilene dek desteklenen sürüme pinlenir. |
| Errors | CONFIRMED | RFC 9457 `application/problem+json`; stable type/title; status HTTP ile aynı; validation `errors[pointer,code,detail]`. |
| Status | CONFIRMED + DESIGN RECOMMENDATION | 400 syntax, 401/403, tenant-safe 404, 409 conflict/idempotency fingerprint, 410 expired/revoked link, 422 semantic, 429+Retry-After, 502/503/504 upstream/capacity ayrımı. |
| Pagination | DESIGN RECOMMENDATION | Finans listelerinde opaque signed cursor; deterministic `created_at,public_id`; filter/sort cursor’a bağlı. |
| Idempotency-Key | DESIGN RECOMMENDATION | Resmi RFC değil; tenant+operation+key+canonical fingerprint; payload mismatch 409; completed replay same result. |
| Correlation | CONFIRMED + DESIGN RECOMMENDATION | W3C traceparent internal; dışa opaque request_id; PII/tenant adı baggage/ID’ye konmaz. |
| Rate response | CONFIRMED + DESIGN RECOMMENDATION | 429 + Retry-After normatif; draft RateLimit alanları RFC diye sunulmaz. |
| Surface | DESIGN RECOMMENDATION | Public/private/admin route grupları ayrı auth, schema, rate ve audit policy’sine sahiptir. |
| Secrets/IDs | DESIGN RECOMMENDATION | Secret public DTO’ya hiç girmez; public opaque IDs; raw provider ID yalnız yetkili internal/admin görünüm. |
| DTO/schema | DESIGN RECOMMENDATION | Explicit allowlist; unknown field reject; format/length/range/cross-field validation; provider payload passthrough yok. |
| Audit | DESIGN RECOMMENDATION | Actor/action/target/before-after hash/request_id/reason; secret/PII body yok; finansal olay append-only. |

### Ayrıntılı mimari ve API sözleşmesi

#### 6. Kod mimarisi

##### 6.1 Modül sözleşmeleri

| Modül | Sorumluluk / sorumlu değil | Girdi → çıktı | İzin verilen / yasak çağrı | Güvenlik sınırı | Test sınırı |
|---|---|---|---|---|---|
| Public Form | Yayın snapshot’ını gösterir; draft/admin verisi bilmez. | public key, locale → public DTO | Publish read model, Submission service / Admin repo, secret | Anonymous abuse, CSP, payload allowlist | snapshot, 404/410, 320px, no-leak |
| Admin | Yetkili komut/query orkestrasyonu; domain kuralı taşımaz. | principal, command → admin DTO | application services / provider adapter’a doğrudan çağrı | session, CSRF, RBAC, tenant | her capability için pozitif/negatif |
| Form Builder | Draft düzenleme, ağaç invariant’ları, undo; publish etmez. | edit command → FormVersion draft | Form Publish / Payment, Invoice | schema validation, cycle/nesting | pointer/touch/keyboard, property test |
| Form Publish | Draft doğrular ve immutable public snapshot üretir; canlı snapshot’ı yerinde değiştirmez. | draft version → snapshot/public key | Media metadata, Audit / provider | private alan allowlist’i | deterministic snapshot, rollback pointer |
| Payment | Order/attempt/state/refund invariant’ı; PSP protokolü bilmez. | order/refund command, normalized event → state/outbox | Adapter interface, Audit, Invoice candidate / React | money integer, idempotency, locks | state permutations, over-refund |
| Payment Provider Adapter | Sağlayıcı request/response/signature/status dönüşümü; domain state yazmaz. | typed request/raw webhook → normalized result | Provider HTTP / repository doğrudan | secrets, TLS, signature, timeout | official fixtures + contract tests |
| Invoice | Payment allocation ve invoice lifecycle; vergi yorumunu UI’a bırakmaz. | settled allocation → InvoiceRecord | Manual veya Paraşüt orchestrator, Vault | tenant/amount/currency invariant | allocation concurrency, lifecycle |
| Manual Accounting | Seçim snapshot, güvenli CSV/XLSX, dönüş belge importu; e-belge üretmez. | invoice candidates → export/import result | Invoice, Vault, Audit / Paraşüt | formula injection, upload quarantine | snapshot repeat, duplicate import |
| Paraşüt Integration | OAuth, mapping, API/job polling; manuel yolun state’ini sahiplenmez. | InvoiceRecord → external refs/status | Integration secrets, Invoice, Vault / UI doğrudan token | OAuth state/PKCE, token encryption | Swagger fixtures, 429/timeout/duplicate |
| Document Vault | Quarantine, validate, hash, immutable store, signed download; fatura kararını vermez. | bytes+metadata → document ref/ready | AV/parser/object store, Audit / email provider | MIME/signature, tenant key, malware | polyglot, overwrite, cross-tenant |
| Transactional Delivery | DeliveryIntent/outbox/provider/webhook/suppression; campaign veya audience yok. | allowed domain event → delivery state | provider adapter, Audit / Payment state write | template allowlist, recipient minimization | duplicate, bounce, DLQ, webhook signature |
| Integration | ProviderConnection/WebhookSubscription/secret ref yaşam döngüsü; domain orchestration yapmaz. | admin capability command → connection health | secret manager, adapters, Audit / secret plaintext serialize | envelope encryption, rotation | revoke/rotate/tenant mismatch |
| Audit | Append-only actor/action/target/correlation kaydı; iş state’i değildir. | security/domain event → redacted record | sink/storage / hiçbir domain mutation | tamper/access/PII minimization | completeness, redaction, failure |
| Tenant/SaaS | Workspace üyelik/entitlement/suspend/subscription; tenant müşteri ödemesini sahiplenmez. | membership/subscription event → policy | all module policy façades, Audit / tenant data bypass | RLS, default deny, support access | cross-tenant matrix, suspend/reactivate |

##### 6.2 Katman kuralları

| Katman | Yapabilir | Yapamaz | Zorunlu test |
|---|---|---|---|
| Route/controller | HTTP parse, correlation, service çağrısı, status/header | İş kuralı, SQL, provider state kararı | method/content/auth/error mapping |
| DTO/schema validation | Tip, biçim, boyut, allowlist, unknown-field policy | DB’ye bağlı iş invariant’ı | boundary/fuzz/schema |
| Authorization/policy | principal + workspace + resource + capability kararı | Sadece UI gizlemeye güvenmek | her endpoint cross-tenant negatif |
| Application service | Use-case sırası, transaction, outbox, adapter sonucu orkestrasyonu | HTTP framework DTO’sunu domaine taşımak | unit + transaction integration |
| Domain rules | Saf state transition, para/allocation/nesting invariant’ı | I/O, clock/random global, provider alanı | table/property tests |
| Repository | Tenant-scoped query, lock, constraint mapping | Yetki kararı, HTTP/provider çağrısı | gerçek DB constraint/concurrency |
| Provider adapter | Timeout/retry/signature/normalize/capability | Domain tablo yazma, secret döndürme | official fixture + contract |
| Queue/worker | Claim, idempotent handle, backoff, DLQ | Sonsuz retry, tenant bağlamı olmadan iş | crash/replay/poison message |
| Serializer | Role’a özel explicit allowlist DTO | ORM entity veya secret serialize | snapshot/no-leak contract |
| Audit/observability | Redacted structured olay/metric/trace | PAN/CVV/token/body dump, iş sonucu değiştirme | redaction ve sink-failure |

Bağımlılık yönü `route → application → domain/repository port`; adapter ve repository portları içeri doğru implemente eder. React yalnız DTO ve etkileşim state’i bilir. Route’ta ödeme/fatura state switch’i, adapter’da domain repository çağrısı, serializer’da ORM otomatik serileştirme ve worker’da authz bypass yasaktır.

##### 6.3 Transaction sınırları

| Olay | Aynı DB transaction | Transaction dışında / outbox-worker | Concurrency/idempotency |
|---|---|---|---|
| Form submission | submission + idempotency kaydı + outbox | bot doğrulaması önceden; delivery/payment sonra | snapshot ID + client key; duplicate no-op |
| PaymentOrder oluşturma | order + ilk attempt niyeti + audit/outbox | PSP checkout çağrısı; sonucu ayrı kısa tx | tenant+operation key ve request hash |
| Webhook kabulü | doğrulanmış event inbox insert | hızlı `2xx`; reducer worker | provider account+event ID unique |
| Payment state güncelleme | row lock/reducer + state + audit + outbox | eksik/sırasızsa retrieve önce, sonuç sonra tx | forward-only transition; tek fulfillment |
| Refund | authz/step-up önceden; refund command + idempotency + audit | provider çağrısı ve sonuç inbox/retrieve | kilitli refundable total; same key/same body |
| Invoice candidate | allocation lock + candidate + audit/outbox | dış muhasebe çağrısı | settled amount, currency, unique allocation |
| Belge importu | upload intent/metadata/quarantine state | byte upload/AV/parser/object store; sonra finalize tx | checksum+tenant+source unique |
| Document-ready | immutable object ref + hash + validation results + state + audit/outbox | bildirim gönderimi | compare-and-set; eksik kontrol varsa ready yok |
| Transactional mail | business state + DeliveryIntent/outbox | render/send; delivery webhook ayrı inbox | event+template+recipient unique |
| Tenant suspension/reactivation | workspace state/version + audit + quiesce/reactivate outbox | provider revoke, cache purge, public route disable, health probes | version/CAS; reactivation aynı snapshot pointer |

Transaction içinde dış HTTP, e-posta, object upload veya uzun parser çalışmaz. Serializable kullanılan bloklar `40001` için tüm use-case’i bounded jitter ile yeniden dener; yan etkiler outbox’a kadar ertelenir.

#### 7. API sözleşmeleri

Bu bölümdeki yollar mevcut bir sisteme ait olduğu iddiası taşımayan **PROPOSED OzelAPP contract**’tır. OpenAPI belgesi tek kaynak olmalı ve toolchain contract testiyle sürümü sabitlenmelidir. En güncel yayın [OpenAPI 3.2.0](https://spec.openapis.org/oas/latest.html) olmakla birlikte generator/gateway uyumu `NOT VERIFIED`’dır.

Ortak kurallar:

- JSON başarı zarfı kaynak DTO’sudur; hatalar `application/problem+json` ve RFC 9457 alanlarını kullanır. `instance` tahmin edilemez olay URI’sidir; stack/SQL/provider body içermez.
- Public kimlikler rastgele/opaque’tır fakat authorization yerine geçmez. Private kaynakta principal + workspace membership + capability + resource scope birlikte kontrol edilir.
- OzelAPP `Idempotency-Key` sözleşmesi: tenant/principal/operation ile scope edilir, canonical request hash saklanır; aynı key + aynı body önceki sonucu döndürür, farklı body `409`; TTL ürün policy’sidir (`UNKNOWN`) ve API dokümanında sürümlenir.
- Rate politikaları: `RL-PUBLIC-READ`, `RL-PUBLIC-WRITE`, `RL-PAYMENT-MUTATION`, `RL-WEBHOOK-PROVIDER`, `RL-ADMIN`, `RL-EXPORT`, `RL-INTEGRATION`. Sayısal değerler hacim testi sonrası config; aşım `429`, mümkünse `Retry-After`.
- Güvenli retry: yalnız GET veya idempotency/inbox ile korunan mutation; `400/401/403/404/409/422` otomatik denenmez; `429/5xx/timeout` jitter + üst sınır; belirsiz provider mutation retrieve edilmeden yeniden yaratılmaz.
- Public DTO denylist’i: `secret`, token/refresh/access/client-secret, admin session, provider connection ID, internal DB ID, workspace/tenant özel verisi, webhook bilgisi, özel fatura/muhasebe bağlantısı, SMTP, stack trace, draft schema, internal notes, raw provider payload, storage key.

Tablolarda “PII” hassas veri; “Yok” ise public cevabın PII/secret taşımadığı anlamındadır. Her satırda istenen 16 alan bulunur.

##### 7.1 Public form görüntüleme

| Endpoint adı | Metot | URL | Public/private | Authentication | Authorization/capability | Tenant kapsamı | Request schema | Response schema | Hata kodları | Idempotency | Rate limit | Audit olayı | Hassas veri | Retry davranışı | Test gerekliliği |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Published form view | GET | `/v1/public/forms/{publicFormKey}` | Public | Yok | Snapshot `published` ve workspace aktif | Anahtardan server-side çözülür; tenant parametresi yok | Path opaque key; `locale?`; `If-None-Match?` | `publicKey,snapshotVersion,title,fields,layout,theme,mediaRefs,submitCapability,etag` allowlist | 404,410,429,500 | GET doğal; ETag | RL-PUBLIC-READ | `public_form.viewed` örneklenmiş | Yok; private/draft alan yok | 429/5xx bounded; contract+snapshot+no-leak+inactive test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |
| Published media read | GET | `/v1/public/media/{mediaKey}` | Public | Yok | Yalnız aktif snapshot referansı | Media key → aynı workspace | Path key; size variant allowlist | Redirect veya bytes; güvenli MIME/cache header | 404,410,416,429 | GET doğal | RL-PUBLIC-READ | Aggregate access metric | Public asset; EXIF yok | CDN retry; orphan/cross-tenant/MIME/cache test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |

##### 7.2 Public submission

| Endpoint adı | Metot | URL | Public/private | Authentication | Authorization/capability | Tenant kapsamı | Request schema | Response schema | Hata kodları | Idempotency | Rate limit | Audit olayı | Hassas veri | Retry davranışı | Test gerekliliği |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Create submission | POST | `/v1/public/forms/{publicFormKey}/submissions` | Public | Bot token + optional submission session | Published snapshot accepts responses | Key’den scope; body tenant alamaz | `snapshotVersion,answers,consents,clientSubmissionId,botToken`; strict limits | `submissionKey,status,nextAction`; payment secret yok | 400,404,409,410,413,415,422,429,503 | Header + clientSubmissionId + snapshot; body conflict 409 | RL-PUBLIC-WRITE | `submission.accepted/rejected` redacted | PII olabilir; loglanmaz | Yalnız idempotent retry; duplicate/concurrency/bot/size/schema/no-leak test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |

##### 7.3 Payment intent/order oluşturma

| Endpoint adı | Metot | URL | Public/private | Authentication | Authorization/capability | Tenant kapsamı | Request schema | Response schema | Hata kodları | Idempotency | Rate limit | Audit olayı | Hassas veri | Retry davranışı | Test gerekliliği |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Create payment order | POST | `/v1/public/submissions/{submissionKey}/payment-orders` | Public-session | Signed short-lived submission capability | Snapshot payment config; amount server hesaplı | Submission’dan; body tenant yok | `offerKey,currency,providerPreference?`; amount kabul edilmez | `paymentOrderKey,status,amountMinor,currency,availableMethods,expiresAt` | 400,404,409,410,422,429,503 | Zorunlu key; submission+offer unique active order | RL-PAYMENT-MUTATION | `payment_order.created/reused` | PII yok; iç/provider ID yok | Same-key retry; altered amount/provider/cross-form/concurrency test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |

##### 7.4 Provider checkout başlatma

| Endpoint adı | Metot | URL | Public/private | Authentication | Authorization/capability | Tenant kapsamı | Request schema | Response schema | Hata kodları | Idempotency | Rate limit | Audit olayı | Hassas veri | Retry davranışı | Test gerekliliği |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Start hosted checkout | POST | `/v1/public/payment-orders/{paymentOrderKey}/checkout-sessions` | Public-session | Order-bound short capability | Provider canlı/eligible + order payable | Order’dan | `method,returnContext`; arbitrary return URL yok | `checkoutAction:{type,redirectUrl-or-hostedToken},attemptKey,expiresAt`; yalnız client-safe | 400,404,409,410,422,429,502,503 | Key → aynı attempt; belirsiz timeout retrieve | RL-PAYMENT-MUTATION | `payment_attempt.started/failed` | Hosted token hassas; kısa ömür, log yok | Kör provider create retry yok; URL allowlist/capability/timeout/duplicate test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |

##### 7.5 Provider callback

| Endpoint adı | Metot | URL | Public/private | Authentication | Authorization/capability | Tenant kapsamı | Request schema | Response schema | Hata kodları | Idempotency | Rate limit | Audit olayı | Hassas veri | Retry davranışı | Test gerekliliği |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Checkout return | GET/POST | `/v1/payments/providers/{provider}/return` | Public callback | Provider token/state; ödeme kanıtı değil | Kayıtlı attempt+provider+state eşleşmesi | Server mapping; tenant input yok | Provider allowlist query/form; body size limit | 303 ile `/pay/{paymentOrderKey}/status`; başarı iddiası yok | 400,404,409,413,429 | Tekrar güvenli; retrieve job dedupe | RL-PUBLIC-WRITE | `provider_return.received/rejected` | Token olabilir; URL/log/analytics redaction | Kullanıcı tekrar dönebilir; fake success/state mismatch/no-fulfillment test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |

##### 7.6 Webhook

| Endpoint adı | Metot | URL | Public/private | Authentication | Authorization/capability | Tenant kapsamı | Request schema | Response schema | Hata kodları | Idempotency | Rate limit | Audit olayı | Hassas veri | Retry davranışı | Test gerekliliği |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Payment webhook | POST | `/v1/webhooks/payments/{provider}/{subscriptionKey}` | Provider-public | TLS + raw-body signature + timestamp/replay | Aktif WebhookSubscription ve event allowlist | Subscription’dan; payload tenant’a güvenilmez | Raw bytes + signature headers; strict size/type | Boş `2xx` kabul/duplicate; ayrıntı sızmaz | 400,401,404,413,415,429,503 | account+event ID unique inbox; duplicate 2xx | RL-WEBHOOK-PROVIDER + provider IP sinyal, tek başına auth değil | `webhook.accepted/duplicate/rejected` | Raw payload restricted; signature/secret log yok | Provider retry eder; signed fixture/tamper/replay/duplicate/order test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |
| Delivery webhook | POST | `/v1/webhooks/delivery/{provider}/{subscriptionKey}` | Provider-public | Provider signature | Aktif subscription + event allowlist | Subscription + provider message map | Raw signed event | Boş `2xx` | 400,401,404,413,415,429,503 | provider event/message ID inbox | RL-WEBHOOK-PROVIDER | `delivery_webhook.*` | Recipient PII olabilir; redacted | Duplicate/suppression/signature/DLQ test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |

##### 7.7 Payment retrieve

| Endpoint adı | Metot | URL | Public/private | Authentication | Authorization/capability | Tenant kapsamı | Request schema | Response schema | Hata kodları | Idempotency | Rate limit | Audit olayı | Hassas veri | Retry davranışı | Test gerekliliği |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Public payment status | GET | `/v1/public/payment-orders/{paymentOrderKey}` | Public-session | Order capability | Yalnız sahibinin order’ı | Order’dan | Path key; conditional request | `status,nextPollAfter,receiptAvailable`; provider/iç ID yok | 404,410,429,503 | GET doğal | RL-PUBLIC-READ | Aggregate poll metric | Yok | 429/5xx; terminal-state/no-leak/enumeration test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |
| Force provider retrieve | POST | `/v1/admin/payment-orders/{paymentOrderKey}/retrieve` | Private | Admin session + MFA/CSRF | `payments.reconcile` | URL key → membership doğrula | `reason` | `operationKey,status=queued` | 401,403,404,409,422,429 | Key; tek aktif retrieve | RL-ADMIN | `payment.retrieve_requested` actor/reason | Provider ref iç kullanım | Queue retry; RBAC/cross-tenant/timeout/stale-event test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |

##### 7.8 Refund

| Endpoint adı | Metot | URL | Public/private | Authentication | Authorization/capability | Tenant kapsamı | Request schema | Response schema | Hata kodları | Idempotency | Rate limit | Audit olayı | Hassas veri | Retry davranışı | Test gerekliliği |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Create refund | POST | `/v1/admin/payment-orders/{paymentOrderKey}/refunds` | Private | Session + CSRF + step-up/MFA | `payments.refund` | Membership + resource scope | `amountMinor,reasonCode,note?`; currency order’dan | `refundKey,status,amountMinor,currency,createdAt` | 400,401,403,404,409,422,429,502 | Zorunlu key; request hash; provider key türetilir | RL-PAYMENT-MUTATION | `refund.requested/denied/completed` | Note PII içerebilir; minimize | Timeout retrieve; over-refund/race/RBAC/duplicate/CSRF test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |

##### 7.9 Reconciliation

| Endpoint adı | Metot | URL | Public/private | Authentication | Authorization/capability | Tenant kapsamı | Request schema | Response schema | Hata kodları | Idempotency | Rate limit | Audit olayı | Hassas veri | Retry davranışı | Test gerekliliği |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Start reconciliation | POST | `/v1/admin/reconciliation-runs` | Private | Session + MFA/CSRF | `finance.reconcile` | Explicit authorized workspace | `provider,dateWindow,mode` allowlist | `runKey,status=queued` | 400,401,403,409,422,429,503 | workspace+provider+window unique active run | RL-ADMIN | `reconciliation.started` | Finansal veri private | Job bounded retry; overlap/window/provider/cross-tenant test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |
| List exceptions | GET | `/v1/admin/reconciliation-exceptions` | Private | Session | `finance.read` | Mandatory workspace context | cursor, status/type/date filters | redacted paged exception DTO | 401,403,422,429 | GET doğal | RL-ADMIN | `reconciliation.viewed` sampled | Private finance | Safe GET; pagination/filter/export-auth test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |

##### 7.10 Manuel fatura

| Endpoint adı | Metot | URL | Public/private | Authentication | Authorization/capability | Tenant kapsamı | Request schema | Response schema | Hata kodları | Idempotency | Rate limit | Audit olayı | Hassas veri | Retry davranışı | Test gerekliliği |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Freeze manual invoice selection | POST | `/v1/admin/manual-invoice-batches` | Private | Session + CSRF | `invoices.prepare` | Workspace mandatory | candidate keys + filter snapshot + locale | `batchKey,rowCount,snapshotHash,status` | 401,403,404,409,422,429 | Key; candidate allocation unique | RL-ADMIN | `manual_batch.frozen` | Fatura/PII private | Same-key; concurrent allocation/filter drift test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |
| Import accounting result | POST | `/v1/admin/manual-invoice-batches/{batchKey}/imports` | Private | Session + CSRF | `invoices.import` | Batch tenant | uploadIntentKey, manifest, expected batch hash | `importKey,status=quarantined` | 400,401,403,404,409,413,415,422,429 | file hash+batch unique | RL-EXPORT | `manual_import.received` | Belge/PII | Async scan; formula/polyglot/duplicate/wrong-batch test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |

##### 7.11 Excel/CSV export

| Endpoint adı | Metot | URL | Public/private | Authentication | Authorization/capability | Tenant kapsamı | Request schema | Response schema | Hata kodları | Idempotency | Rate limit | Audit olayı | Hassas veri | Retry davranışı | Test gerekliliği |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Build batch export | POST | `/v1/admin/manual-invoice-batches/{batchKey}/exports` | Private | Session + CSRF | `invoices.export` | Batch tenant | `format=csv-or-xlsx,columnContractVersion` | `exportKey,status=queued` | 401,403,404,409,422,429 | batch+format+contract+hash reuse | RL-EXPORT | `invoice_export.requested/downloaded` | PII/finance | Job retry; CSV formula escaping/encoding/roundtrip/access test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |
| Download export | GET | `/v1/admin/exports/{exportKey}/content` | Private | Session | `invoices.export` | Resource scope | No arbitrary object key | Stream/short same-origin redirect, attachment headers | 401,403,404,410,429 | GET; one-time policy optional | RL-EXPORT | `export.downloaded` | PII/finance | Expiry retry regenerate; cross-tenant/cache/content-disposition test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |

##### 7.12 Paraşüt OAuth

| Endpoint adı | Metot | URL | Public/private | Authentication | Authorization/capability | Tenant kapsamı | Request schema | Response schema | Hata kodları | Idempotency | Rate limit | Audit olayı | Hassas veri | Retry davranışı | Test gerekliliği |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Start connection | POST | `/v1/admin/integrations/parasut/oauth/authorizations` | Private | Session + CSRF + MFA | `integrations.manage` | Workspace membership | redirect target enum; no caller URL | `authorizationUrl,expiresAt`; state server-bound | 401,403,409,422,429,503 | Tek aktif authorization per workspace/user | RL-INTEGRATION | `parasut.oauth_started` | URL geçici; token yok | No blind retry; state/redirect/PKCE availability test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |
| OAuth callback | GET | `/v1/integrations/parasut/oauth/callback` | Provider-public | Code + state + initiating session binding | Exact state, redirect, workspace, single use | State’den | `code,state,error?` strict | 303 admin connection result; token dönmez | 400,401,409,410,429,502 | State single-use; code exchange duplicate denied | RL-INTEGRATION | `parasut.oauth_connected/failed` | Code/token redacted/encrypted | Exchange belirsizse status/restart; CSRF/replay/mix-up test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |
| Revoke connection | DELETE | `/v1/admin/integrations/parasut/connection` | Private | Session+CSRF+MFA | `integrations.manage` | Workspace | reason | `status=revocation_pending-or-revoked` | 401,403,404,409,429,502 | Operation key/header | RL-INTEGRATION | `parasut.connection_revoked` | Secret refs private | Provider revoke `PROVIDER CONFIRMATION REQUIRED`; local deny first test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |

##### 7.13 Paraşüt invoice

| Endpoint adı | Metot | URL | Public/private | Authentication | Authorization/capability | Tenant kapsamı | Request schema | Response schema | Hata kodları | Idempotency | Rate limit | Audit olayı | Hassas veri | Retry davranışı | Test gerekliliği |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Submit invoice | POST | `/v1/admin/invoices/{invoiceKey}/parasut-submissions` | Private | Session + CSRF | `invoices.issue` + healthy connection | Invoice tenant | mappingVersion, documentScenario, confirmation | `submissionKey,status=queued` | 401,403,404,409,422,429,503 | Invoice+provider connection unique; request hash | RL-INTEGRATION | `parasut.invoice_queued/submitted` | Fatura/PII | Queue respects 10/10s; timeout retrieve/search before recreate; fixture/duplicate/mapping test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |

##### 7.14 E-fatura/e-arşiv sonucu

| Endpoint adı | Metot | URL | Public/private | Authentication | Authorization/capability | Tenant kapsamı | Request schema | Response schema | Hata kodları | Idempotency | Rate limit | Audit olayı | Hassas veri | Retry davranışı | Test gerekliliği |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Refresh e-document result | POST | `/v1/admin/invoices/{invoiceKey}/e-document-refreshes` | Private | Session + CSRF | `invoices.reconcile` | Invoice tenant | `reason` | `operationKey,status=queued` | 401,403,404,409,422,429 | Tek aktif refresh; job ID dedupe | RL-INTEGRATION | `edocument.refresh_requested/status_changed` | Fatura özel | Poll 204/pending, 429/backoff; expired job/new-query tests | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |
| Read invoice status | GET | `/v1/admin/invoices/{invoiceKey}` | Private | Session | `invoices.read` | Invoice tenant | include allowlist | Invoice status, external display refs, document readiness; token/URL yok | 401,403,404,429 | GET doğal | RL-ADMIN | `invoice.viewed` sampled | Fatura/PII | Safe GET; status mapping/no-temp-URL/cross-tenant test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |

##### 7.15 Belge upload/download

| Endpoint adı | Metot | URL | Public/private | Authentication | Authorization/capability | Tenant kapsamı | Request schema | Response schema | Hata kodları | Idempotency | Rate limit | Audit olayı | Hassas veri | Retry davranışı | Test gerekliliği |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Create upload intent | POST | `/v1/admin/documents/upload-intents` | Private | Session + CSRF | `documents.upload` | Workspace | type, size, declaredMime, checksum, invoiceKey? | upload key/instructions/expiry; storage key gizli | 401,403,404,409,413,415,422,429 | checksum+purpose+tenant | RL-EXPORT | `document.upload_intent_created` | Metadata/PII | Expired intent recreate; size/MIME/purpose/cross-tenant test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |
| Finalize upload | POST | `/v1/admin/documents/{documentKey}/finalizations` | Private | Session + CSRF | `documents.upload` | Document tenant | checksum, upload nonce | `status=quarantined-or-validating` | 401,403,404,409,422,429 | document+checksum one finalize | RL-EXPORT | `document.uploaded/validation_queued` | Document private | Async validation; mismatch/malware/polyglot/overwrite test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |
| Download document | GET | `/v1/admin/documents/{documentKey}/content` | Private | Session, optional step-up | `documents.read` | Resource tenant | disposition enum | Stream veya çok kısa same-origin signed handoff | 401,403,404,410,429 | GET | RL-EXPORT | `document.downloaded` actor/purpose | Yüksek hassasiyet | Expiry retry; no-store/cross-tenant/bearer-leak/range test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |

##### 7.16 Transactional delivery

| Endpoint adı | Metot | URL | Public/private | Authentication | Authorization/capability | Tenant kapsamı | Request schema | Response schema | Hata kodları | Idempotency | Rate limit | Audit olayı | Hassas veri | Retry davranışı | Test gerekliliği |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Read delivery status | GET | `/v1/admin/deliveries/{deliveryKey}` | Private | Session | `deliveries.read` | Resource tenant | path key | template/event/status/attempts/last error class; body/recipient masked | 401,403,404,429 | GET | RL-ADMIN | `delivery.viewed` | Masked recipient | Safe GET; masking/cross-tenant/state test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |
| Retry delivery | POST | `/v1/admin/deliveries/{deliveryKey}/retries` | Private | Session + CSRF | `deliveries.retry` | Resource tenant | reason; destination değişmez | `status=queued` | 401,403,404,409,422,429 | Key; suppression/terminal conflict | RL-ADMIN | `delivery.retry_requested/denied` | PII masked | Only transient class; suppression/permanent failure/duplicate test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |

##### 7.17 Embed/iframe

| Endpoint adı | Metot | URL | Public/private | Authentication | Authorization/capability | Tenant kapsamı | Request schema | Response schema | Hata kodları | Idempotency | Rate limit | Audit olayı | Hassas veri | Retry davranışı | Test gerekliliği |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Iframe document | GET | `/embed/v1/forms/{publicFormKey}` | Public | Yok | Published + embed enabled + ancestor allowlist policy | Key’den | locale/theme variant allowlist; host param auth değil | HTML shell + CSP `frame-ancestors`; snapshot API client | 404,410,429 | GET/ETag | RL-PUBLIC-READ | `embed.loaded` aggregate | Yok | Browser retry; CSP/ancestor/sandbox/320px/200% zoom test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |
| Resize message | postMessage contract | `window.postMessage` | Public browser protocol | Origin+source+channel nonce | Parent exact allowed origin | Snapshot/handshake’den | `{v,type='resize',height,channel}` bounded | ACK optional; no data payload | Invalid ignored | Sequence+channel dedupe | Client throttle | Security metric only | Yok | Burst coalesce; wildcard-origin/spoof/source/height-bound test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |

##### 7.18 Inline loader

| Endpoint adı | Metot | URL | Public/private | Authentication | Authorization/capability | Tenant kapsamı | Request schema | Response schema | Hata kodları | Idempotency | Rate limit | Audit olayı | Hassas veri | Retry davranışı | Test gerekliliği |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Versioned loader | GET | `/embed/v1/loader.js` | Public | Yok | Published form fetch only; no admin capability | Runtime key lookup | Script attributes `data-form-key`, version, locale | Cacheable JS with fixed integrity/version policy; secret yok | 404,410,429 | GET immutable version | RL-PUBLIC-READ/CDN | Aggregate version metric | Yok | Backoff once; CSP/SRI-policy/global-collision/host-CSS/unmount test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |

##### 7.19 WordPress

| Endpoint adı | Metot | URL | Public/private | Authentication | Authorization/capability | Tenant kapsamı | Request schema | Response schema | Hata kodları | Idempotency | Rate limit | Audit olayı | Hassas veri | Retry davranışı | Test gerekliliği |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Public plugin config | GET | `/v1/public/forms/{publicFormKey}/embed-config` | Public | Yok | Published + embed enabled | Key’den | plugin version, mode | public title/aspect/loader version/allowed mode; secret yok | 404,410,426,429 | GET/ETag | RL-PUBLIC-READ | `wp.embed_config` aggregate | Yok | Cache retry; version matrix/no-secret/deactivated form test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |
| WP admin validation | POST | `/v1/admin/embed-validations` | Private OzelAPP | OzelAPP admin session; WP nonce yalnız WP-local CSRF | `forms.publish` | Authorized workspace | public key + claimed origin; no WP secret | allowed/denied reasons | 401,403,404,409,422,429 | Key | RL-ADMIN | `embed.origin_validated` | Origin private olabilir | No unsafe retry; SSRF/origin/capability test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |

##### 7.20 SaaS tenant

| Endpoint adı | Metot | URL | Public/private | Authentication | Authorization/capability | Tenant kapsamı | Request schema | Response schema | Hata kodları | Idempotency | Rate limit | Audit olayı | Hassas veri | Retry davranışı | Test gerekliliği |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Create workspace | POST | `/v1/workspaces` | Private | Account session + CSRF | `workspaces.create`; subscription entitlement | Yeni tenant; actor ownership | displayName, region option if supported | `workspaceKey,state,role` | 401,403,409,422,429 | Account+key/request hash | RL-ADMIN | `workspace.created` | Workspace private | Same-key; quota/name/collision/default-RLS test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |
| Suspend workspace | POST | `/v1/workspaces/{workspaceKey}/suspensions` | Private | Session + MFA/CSRF | owner/billing/support constrained policy | Target membership; support needs ticket | reason, mode; version | `state=suspending,operationKey` | 401,403,404,409,422,429 | Workspace+version operation | RL-ADMIN | `workspace.suspension_requested` | High impact | Queue retry; public-off/read-only/export/support/cross-tenant test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |
| Reactivate workspace | POST | `/v1/workspaces/{workspaceKey}/reactivations` | Private | Session + MFA/CSRF | owner/billing policy + entitlement | Target tenant | expected suspended version | `state=reactivating,operationKey` | 401,403,404,409,422,429,503 | Workspace+version | RL-ADMIN | `workspace.reactivation_requested` | Private | Health-check then same snapshot pointer; expired-secret/no-duplicate-publication test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |
| Export tenant data | POST | `/v1/workspaces/{workspaceKey}/exports` | Private | Session + MFA/CSRF | `workspace.export` | Exact workspace | scope/date/purpose | `exportKey,status=queued` | 401,403,404,409,422,429 | Scope+request hash | RL-EXPORT | `workspace.export_requested/downloaded` | Çok yüksek PII | Async bounded retry; authorization/redaction/expiry/large-data test | Zorunlu: satırdaki contract, güvenlik ve negatif senaryolar |

#### 8. Veri modeli

İstek “17 model” dese de adlandırılmış listede `Workspace/Tenant` tek model sayıldığında **18 model** vardır. Sessizce birini atlamak yerine 18’inin tamamı kapsanır. Aşağıdaki alanlar asgari sözleşmedir; gerçek ORM/DB envanteri `NOT VERIFIED`’dır. Para `amount_minor` tamsayı + ISO currency ile tutulur; float yasaktır. Public anahtar ile iç primary key ayrıdır.

##### 8.1 Alan, ilişki, index, unique ve state

| Model | Temel alanlar | İlişkiler | Index ve unique constraint | State / invariant |
|---|---|---|---|---|
| PaymentOrder | `id,public_key,workspace_id,submission_id,amount_minor,currency,status,version,expires_at,created_at` | 1-N Attempt/Refund/Allocation/Event | UQ `public_key`; IX workspace+created/status; UQ workspace+submission+offer+active discriminator | `created→checkout_pending→processing→succeeded/failed/expired`; terminal geriye dönmez; amount >0 |
| PaymentAttempt | `id,order_id,provider,environment,provider_account_ref,provider_payment_ref,status,normalized_code,started_at,updated_at` | N-1 order; N-1 connection | UQ workspace+provider+environment+account_ref+provider_payment_ref (nullable-safe); IX order+started | Tek attempt sonucu order’ı kör overwrite etmez; provider state normalize edilir |
| PaymentEventInbox | `id,workspace_id,provider,account_ref,event_id,event_type,body_ciphertext_or_object_ref,body_hash,received_at,processed_at,error_class` | Event → Attempt/Order dolaylı | UQ provider+environment+account_ref+event_id; IX unprocessed+received | Append-only; accepted→processing→processed/quarantined; payload update yok |
| Refund | `id,public_key,workspace_id,order_id,amount_minor,currency,status,reason_code,actor_id,idempotency_key,provider_ref,created_at` | N-1 Order | UQ public_key; UQ workspace+operation+idempotency_key; IX order+status | requested→submitted→pending→succeeded/failed; succeeded toplam ≤ captured |
| ReconciliationException | `id,workspace_id,run_id,type,severity,order_id,provider_ref,expected_json,actual_json,status,owner_id,resolution,detected_at` | Run/Order/Refund | UQ workspace+run+fingerprint; IX workspace+status+severity | open→investigating→resolved/accepted_risk; finans state’ini otomatik değiştirmez |
| InvoiceRecord | `id,public_key,workspace_id,type,scenario,status,currency,total_minor,tax_summary,customer_snapshot,issue_date,provider,external_ref,version` | N-N Order via Allocation; 1-N Document | UQ public_key; UQ workspace+provider+external_ref; IX workspace+status+issue_date | candidate→prepared→submitted→issued/failed/cancelled; issued alanlar immutable correction flow |
| InvoiceAllocation | `id,workspace_id,invoice_id,payment_order_id,amount_minor,currency,created_at` | Join Invoice–PaymentOrder | UQ invoice+order; IX order; constraint amount>0 | Aynı settled tutar iki invoice’a fazla tahsis edilemez; kilit/Serializable gerekir |
| ExternalDocument | `id,public_key,workspace_id,invoice_id,type,status,canonical,object_version_ref,sha256,size,mime,validator_version,scan_result,source_ref,ready_at` | N-1 Invoice; delivery references | UQ public_key; UQ workspace+type+sha256+source_ref; IX invoice+type/status | upload_pending→quarantined→validating→ready/rejected; ready ref/hash immutable |
| DeliveryIntent | `id,public_key,workspace_id,event_key,template_key,template_version,channel,recipient_ciphertext,recipient_hash,status,attempt_count,next_attempt_at,provider_message_ref` | Domain event/Document | UQ workspace+event_key+template+recipient_hash; IX claim(status,next_attempt) | pending→sending→accepted→delivered/failed/suppressed/dead; terminal duplicate no-op |
| ProviderConnection | `id,workspace_id,provider,environment,status,secret_ref,key_version,capabilities_json,account_fingerprint,last_verified_at` | 1-N Attempt/Subscription | UQ workspace+provider+environment+account_fingerprint; IX status | pending→active→degraded→revoked; plaintext secret kolonu yok |
| WebhookSubscription | `id,workspace_id,provider,environment,connection_id,public_subscription_key,secret_ref,status,event_allowlist,rotated_at` | N-1 connection; 1-N inbox | UQ public_subscription_key; UQ connection+purpose; IX active | pending→active→rotating→revoked; eski/yeni secret kısa kontrollü pencere |
| AuditEvent | `id,workspace_id,occurred_at,actor_type,actor_key,action,target_type,target_key,result,reason_code,correlation_id,metadata_redacted,prev_hash?` | Mantıksal, FK’ye aşırı bağlanmaz | IX workspace+occurred; IX correlation; immutable partition | Append-only; audit iş state’i değildir; erişim ayrıca auditlenir |
| Form | `id,public_key,workspace_id,name,status,current_draft_version_id,published_snapshot_id,created_at` | 1-N FormVersion/Snapshot | UQ public_key; UQ workspace+normalized name (policy); IX workspace+status | active→archived; draft/published pointer atomik; hard delete policy’ye bağlı |
| FormVersion | `id,form_id,workspace_id,version_no,schema_json,schema_version,status,created_by,created_at` | N-1 Form; 0-1 Snapshot origin | UQ form+version_no; IX workspace+status | draft mutable optimistic-lock; superseded/published-origin immutable |
| PublicFormSnapshot | `id,public_key,workspace_id,form_id,form_version_id,payload_json,payload_hash,status,published_at,retired_at` | N-1 Form/Version; refs Media | UQ public_key; UQ form+payload_hash; IX status+public_key | published immutable; active pointer değişir; retired snapshot submission referansı için korunur |
| MediaAsset | `id,public_key,workspace_id,object_version_ref,sha256,mime,size,width,height,duration?,alt_text,status,scan_result` | FormVersion/Snapshot refs | UQ public_key; UQ workspace+sha256+purpose; IX workspace+status | quarantined→processing→ready/rejected; kullanılan version immutable |
| Workspace/Tenant | `id,public_key,name,state,region_policy,retention_policy_version,entitlement_version,created_at,suspended_at` | Tüm scoped tablolar; SubscriptionState | UQ public_key; IX state; isim global kimlik değildir | provisioning→active→suspending→suspended→reactivating→active/closed |
| SubscriptionState | `id,workspace_id,plan_key,status,current_period_end,grace_until,provider,external_subscription_ref,version,updated_at` | 1-1 Workspace; OzelAPP billing ledger | UQ workspace; UQ provider+external_ref; IX status+period | trialing/active/past_due/grace/suspended/cancelled; tenant müşteri ödemesinden ayrı |

##### 8.2 Scope, yaşam döngüsü, migration, backup ve veri sınıfı

| Model | Tenant scope ve çapraz-tenant risk | Soft delete / immutable | Retention | Migration / rollback | Backup/restore | PII ve şifreli alan |
|---|---|---|---|---|---|---|
| PaymentOrder | Zorunlu workspace; public key bilmek yetmez; yanlış order fulfillment kritik | Finansal çekirdek hard-delete yok; redaction ayrı | `LEGAL REVIEW REQUIRED`; finans/audit policy | Expand-add, dual-read doğrula, constraint validate; status geri dönüş mapping’i | Point-in-time + ledger checksum; restore reconcile | Submission ref dolaylı PII; hassas metadata field-level encrypt |
| PaymentAttempt | Order tenant’ı ile eşleşmeli; provider account karışması kritik | Append-history; provider display metadata redact edilebilir | Provider/finans policy | Provider enum önce toleranslı; rollback unknown status’u korur | Order ile tutarlı restore; provider retrieve | Provider refs hassas, token/secret yok |
| PaymentEventInbox | Subscription’dan tenant; payload’a güvenilmez | Append-only; raw body ayrı sıkı nesne | Minimum incident/replay + legal policy; sınırsız değil | Yeni event schema raw’ı koruyarak normalize; worker rollback/replay | Şifreli, erişim ayrı; restore sonrası dedupe korunur | Raw payload PII olabilir; ciphertext/object encryption |
| Refund | Order tenant; actor başka tenant olamaz | Finansal immutable kayıt; status eventlerle ilerler | Finans/legal policy | Yeni durum forward-compatible; down migration terminal veri silmez | Order+refund birlikte, restore retrieve | Reason/note PII olabilir; note encrypted/minimized |
| ReconciliationException | Workspace filter zorunlu; destek görünürlüğü riskli | Resolution append/audit; archive edilebilir | Operasyon + finans policy | Type enum tolerant; rollback JSON kanıtı korur | Rapor yeniden üretilebilir ama insan kararı yedeklenir | expected/actual private; gerekli alan encrypt |
| InvoiceRecord | Workspace ve customer snapshot; en yüksek sızıntı etkisi | Issued immutable; düzeltme/iptal ayrı kayıt | `LEGAL REVIEW REQUIRED` GİB/vergi/KVKK | Şema version; backfill shadow; rollback eski reader | Kanonik belge ile tutarlılık/hash manifest | Customer/tax PII; snapshot encrypted, arama alanı tokenized |
| InvoiceAllocation | Her iki uç aynı workspace/currency | Immutable; ters kayıtla düzelt | Invoice/order retention ile | Constraint önce NOT VALID/backfill/validate; rollback veri bırakır | Ledger restore ve toplam doğrulama | Doğrudan PII yok |
| ExternalDocument | Object key tenant prefix değil tek auth; DB scope zorunlu | Ready object version/hash immutable; legal hold | `LEGAL REVIEW REQUIRED`; tür/policy bazlı | Metadata expand; object rewrite yok; validator version sakla | Cross-region kararı legal; hash+version restore testi | Çok yüksek PII; at-rest encryption + tenant-bound context |
| DeliveryIntent | Workspace + event ownership; recipient leak riski | Durum geçmişi; body/template snapshot kısıtlı immutable | Teslim kanıtı kadar; içerik erken silinebilir (`LEGAL REVIEW REQUIRED`) | Provider enum tolerant; rollback pending’leri kaybetmez | Outbox/intents restore, provider reconcile | Recipient field encryption; hash lookup; message body minimize |
| ProviderConnection | Workspace-owned BYO; shared connection varsayılan yok | Revoke soft state; secret eski sürüm imha policy | Bağlantı+audit ihtiyacı; plaintext yok | Secret version rotasyonu; eski reader fallback kısa | Secret manager backup/DR ayrı test | Secret_ref/fingerprint hassas; secret KMS envelope |
| WebhookSubscription | Connection tenant; public key enumeration-safe | Revoked saklanır; secrets rotate/delete policy | Güvenlik/audit policy | Dual-secret rotate; rollback eski secret yalnız güvenli pencere | Secret manager + subscription mapping | Secret yalnız manager; event allowlist private |
| AuditEvent | Workspace; platform-security eventleri ayrı restricted scope | Append-only/WORM seçeneği | `LEGAL REVIEW REQUIRED`; güvenlik gereği ölçülü | Yeni metadata schema tolerant; event silinmez | Immutable/tamper-evident restore doğrulaması | PII minimize/redact; gerekirse encrypted metadata |
| Form | Workspace; public serializer ayrı | Archive soft; legal delete workflow | Ürün/KVKK policy | Public key backfill + dual read; pointer CAS | Versions/snapshots ile consistent | İsim PII olabilir; genelde encryption gereği risk analizi |
| FormVersion | Form tenant eşitliği; draft public’e çıkamaz | Draft optimistic mutable; historical immutable | Form lifecycle + submission referansları | JSON schema version/migrator; orijinal payload korunur | Schema hash ve fixture restore | Form soruları PII sınıfı içerebilir; schema private |
| PublicFormSnapshot | Key’den tenant çözülür; allowlist şart | Immutable; retire/rollback pointer | Bağlı submission süresi; public cache purge | Yeni renderer önce eski sürümü okuyabilmeli | Payload hash + active pointer restore | Tasarım gereği PII/secret içermez; testle kanıt |
| MediaAsset | Tenant + public snapshot ref; object URL auth değildir | Ready version immutable; unreferenced cleanup | Reference + policy; EXIF erken sil | Derivative versioned; rollback origin’i korur | Origin+hash, derivative yeniden üretilebilir | EXIF/filename PII olabilir; strip/encrypt metadata |
| Workspace/Tenant | Root scope; yanlış context tüm sistemi etkiler | Close tombstone/audit; purge ayrı legal workflow | Contract/KVKK/legal hold | İlk günden ekle; RLS policy shadow/canary; rollback RLS’i sessiz kapatmaz | Tenant-level restore/export drill; key mapping | Name/admin refs PII; seçili metadata encrypt |
| SubscriptionState | Workspace; OzelAPP billing ile tenant customer ledger karışmamalı | Append event/history; current projection | Vergi/contract policy | Ayrı namespace/table/provider account; rollback entitlement snapshot | Restore sonrası provider reconcile, entitlement fail-safe | Billing contact PII ayrı model/ref; provider ref private |

##### 8.3 Veri invariant’ları

- Bütün unique constraint’ler tenant/provider account/environment scope’unu açıkça taşır; provider ID tek başına global varsayılmaz.
- Foreign key’nin referanslayan kolonlarında sorgu/lock ihtiyacına göre explicit index vardır.
- `Refund` toplamı ve `InvoiceAllocation` toplamı cross-row olduğundan `CHECK` ile çözülemez. PaymentOrder satırı `FOR UPDATE` ile kilitlenir veya Serializable transaction tüm hesaplamayı tekrarlar.
- Inbox/audit/issued invoice/ready document üzerinde soft-delete bayrağı geçmişi görünmez yapmamalıdır. Erasure, referans bütünlüğünü koruyan redaction/crypto-shredding ve hukuki politika ile yürür.
- Backup başarısı “job completed” değildir: restore, hash manifest, tenant izolasyonu, provider reconcile ve public snapshot pointer testiyle kanıtlanır.

#### 9. Ödeme adapterleri

##### 9.1 Ortak port

Ortak port provider’ın en küçük ortak paydasına indirgenmez; `getCapabilities` ile koşullu özellik taşır. Tipler provider DTO’su değil OzelAPP domain değerleridir.

```text
PaymentProviderAdapter
  getCapabilities(context) -> CapabilitySet
  createCheckout(order, returnPolicy, idempotency) -> CheckoutResult
  retrievePayment(providerReference) -> ProviderPayment
  verifyWebhook(rawBody, headers, subscription) -> VerifiedEvent
  refund(paymentReference, amountMinor, reason, idempotency) -> RefundResult
  normalizeStatus(providerObject) -> NormalizedPaymentStatus
```

Adapter ayrıca timeout sınıfı, retryability, provider request ID ve redacted error code döndürür; secret, ham response veya kullanıcıya gösterilecek string döndürmez. `normalizeStatus` bilinmeyen değeri başarıya çeviremez; `unknown/provider_action_required` olarak fail-closed kalır.

##### 9.2 Sağlayıcı karşılaştırması

| Başlık | iyzico | Stripe | Google Pay |
|---|---|---|---|
| Rol | PSP/hosted Checkout Form | PSP; PaymentIntent/Checkout | Wallet/tokenization; tahsilatı PSP yapar |
| Faz 1 önerisi | Birincil aday; merchant onayı şart | Adapter hazır olabilir, live kapalı | Yalnız aktif PSP gateway capability’si |
| Başlatma | Server CF initialize; hosted token/form | Stripe artık çoğu kullanımda Checkout Sessions + Payment Element önerir; kesin ürün seçimi contract test | `isReadyToPay` + gateway tokenization; HTTPS/domain/merchant onayı |
| Kesin durum | Callback sonrası server CF retrieve; webhook ile yakınsama | İmzalı webhook; eksikte retrieve | PSP sonucu; wallet UI sonucu tahsilat kanıtı değil |
| Webhook | V3 belgelenmiş; tam canonical/replay detayı `PROVIDER CONFIRMATION REQUIRED` | Raw-body imza, timestamp/replay, duplicate ve order belgelidir | OzelAPP’a doğrudan finans webhook’u değil; PSP webhook’u |
| Refund | Tam/kısmi dokümante; cancel zaman kesiti merchant/işlem özel | Tam/kısmi; idempotent request + webhook/retrieve | PSP refund capability’si |
| Reconciliation | Reporting/settlement dosyaları | Payout reconciliation raporları | PSP üzerinden |
| Ülke/currency/taksit | Merchant capability `PROVIDER CONFIRMATION REQUIRED` | OzelAPP tüzel ülke uygunluğu `EXTERNAL DEPENDENCY`; Türkiye listede yok | Gateway+merchant+device/runtime kesişimi |
| Secret/PCI | Server keys; hosted akış AOC/SAQ kanıtı istenir | Secret server-only; hosted element kapsamı acquiring/QSA ile | `DIRECT` reddedildi; gateway yolu |
| Canlı kanıt | Live küçük ödeme/refund/report ve signed webhook | Uygun hesap sözleşmesi + live kanıt | Production merchant/domain + gateway live test |

Resmi dayanaklar: [iyzico CF Initialize](https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation/cf-initialize), [CF Retrieve](https://docs.iyzico.com/en/payment-methods/checkoutform/cf-retrieve), [Webhook](https://docs.iyzico.com/en/advanced/webhook), [Refund/Cancel](https://docs.iyzico.com/en/getting-started/preliminaries/api-reference-beta/refund-and-cancel), [Stripe PaymentIntents](https://docs.stripe.com/payments/payment-intents), [idempotent requests](https://docs.stripe.com/api/idempotent_requests), [global availability](https://stripe.com/global), [Google Pay tutorial](https://developers.google.com/pay/api/web/guides/tutorial) ve [integration checklist](https://developers.google.com/pay/api/web/guides/test-and-deploy/integration-checklist).

##### 9.3 Capability sözleşmesi

`currency`, `country`, `wallet`, `installment`, `partial_refund`, `cancel`, `refund`, `3ds`, `webhook_signature`, `reporting`, `live_eligible` alanları üç değerli olmalıdır: `supported`, `unsupported`, `unknown`. `unknown` UI’da gizlenir ve backend’de reddedilir. Capability kaydı kanıt URL/tarihi, environment, provider account fingerprint ve expiry taşır. UI yalnız backend capability cevabını kullanır; hard-coded provider logosu işlev kanıtı değildir.

## 12. Production/cloud/operasyon

> **Etiketleme kuralı:** Bu alt bölümde resmî kaynakla doğrudan doğrulanan sağlayıcı/standart davranışları `CONFIRMED`; OzelAPP'a özgü mimari, test ve rollback tercihleri `DESIGN RECOMMENDATION`; açık sağlayıcı doküman boşlukları `PROVIDER CONFIRMATION REQUIRED` veya `UNKNOWN`; somut vergi/hukuk kararları `LEGAL REVIEW REQUIRED`; dış hesap, sözleşme veya canlı kanıtlar `EXTERNAL DEPENDENCY` olarak okunur.

### Önceliklendirilmiş operasyon matrisi

| Kontrol | Sınıf | OzelAPP uygulama kararı | Test/kanıt | Rollback/recovery |
|---|---|---|---|---|
| Secret manager/least privilege | Hemen gerekli | Env dump/log yok; runtime fetch/cache; rotation; per-service IAM | Wrong-service deny, rotation drill, leak scan | Eski+yeni secret overlap; kill switch |
| Migration | Hemen gerekli | Expand→dual/backfill→switch→contract; tek deployda destructive değişiklik yok | Up/down veya forward-fix, old/new version coexist | App rollback DB’yi otomatik geri almaz |
| DB pool budget | Hemen gerekli | Toplam replica/worker/admin pool < max_connections; reserve | Saturation/load ve wait alarmı | Worker concurrency azalt |
| Health endpoints | Hemen gerekli | Startup/liveness/readiness ayrı; optional provider outage readiness’i düşürmez | Dependency failure matrix | Traffic drain |
| Queue recovery | Hemen gerekli | At-least-once, visibility heartbeat, graceful shutdown, DLQ | Kill worker mid-dispatch; duplicate/no-loss | Pause/visibility release/redrive review |
| Logs/metrics/traces | Hemen gerekli | Structured allowlist; OTel; request/order/job/delivery correlation | PII/secret canary; trace continuity | Sampling azalt; audit korunur |
| Rate/abuse | Hemen gerekli | Token bucket principal+tenant+route/provider budget | Burst/distributed abuse | Fail-closed/düşük limit |
| Object store/signed URL | Hemen gerekli | Private bucket; entitlement sonra kısa TTL; bearer/reusable gerçeği | Cross-tenant/revoke/expiry | Link revoke; object erişimi private |
| Backup | Pilot öncesi | Encrypted, versioned, ayrı failure domain; job success tek başına yeterli değil | Checksum/count restore | Restore to clean env |
| Restore/RPO/RTO | Pilot öncesi | İş etki analizi olmadan sayı uydurma yok | Tam restore drill ve measured RPO/RTO | Documented failback |
| Provider timeout | Pilot öncesi | Bounded timeout; retry budget; mutation reconcile-first | After-commit timeout chaos | Queue park/manual exception |
| Circuit breaker | Pilot öncesi | Provider/operation scoped closed/open/half-open; probe | Timeout storm | Force-open/close audited |
| Kill switch | Pilot öncesi | New payment/refund/invoice/send ayrı; read/reconcile açık | Tabletop/on-call | Toggle + staged reenable |
| Alerts/runbook | Pilot öncesi | SLO symptom, oldest queue age, DLQ, mismatch, restore; owner/escalation | Page drill | Manual mode |
| Deploy/canary | Production öncesi | Immutable artifact, staged rollout, automatic health abort | Canary + rollback | Previous artifact/config |
| Feature flags | Production öncesi | Scoped, expiry/owner/audit; financial default false | Misconfig fail-closed | Global/tenant flag off |
| Reconciliation schedule | Production öncesi | Kayan pencere + daily close + exception owner | Orphan/duplicate fixture | Auto-close pause |
| Dependency/SBOM | Production öncesi | Lock/pin, CVE/license scan, provenance | Clean rebuild | Previous signed artifact |
| CDN/cache | Production öncesi | Public snapshots only; private docs no shared cache; cache key version/origin | Cache poisoning/stale snapshot | Bypass/purge |
| On-call/incident | Production öncesi | Severity, evidence preservation, secret rotate, customer comms | Tabletop | Degraded/manual mode |
| Tenant quota/isolation | SaaS öncesi | Per-tenant payment/delivery/storage/job limits; noisy-neighbor controls | Cross-tenant/load matrix | Suspend tenant only |
| Per-tenant encryption/key context | SaaS öncesi | Tenant/provider/env AAD and access policy | Wrong-tenant decrypt deny | Rewrap/rotate |
| Tenant backup/export/delete | SaaS öncesi | Scope/retention/legal hold; async export | Cross-tenant export/restore | Cancel job; preserve audit |
| Multi-region active-active | Daha sonraya | Ödeme/webhook/queue consistency çözülmeden açma | Region failover duplicate tests | Single-region authority |
| Advanced autoscaling | Daha sonraya | Queue age ve provider quota ile; retry stormu büyütme | Load/chaos | Static safe cap |

### Operasyonel hata akışı

1. **DESIGN RECOMMENDATION:** Provider alarmı → ilgili command kill switch → breaker open → noncritical batch pause → queue backpressure.
2. **DESIGN RECOMMENDATION:** Read/reconcile yüzeyi açık kalır; yeni blind mutation yoktur.
3. **DESIGN RECOMMENDATION:** Recovery probe sınırlı; sonra kontrollü drain; duplicate/mismatch reconciliation raporu.
4. **UNKNOWN:** RPO/RTO, on-call aracı, cloud region ve retention sayıları ürün sahibi/altyapı kararı olmadan yazılamaz.
5. **DEFERRED:** Aktif-aktif multi-region, sıfır RPO veya otomatik cross-region write failover ilk release’e eklenmez.

#### 16. Gözlemlenebilirlik

| Alan | Uygulama sözleşmesi | Alarm/kanıt |
|---|---|---|
| Structured logs | `timestamp,level,service,environment,correlation_id,trace_id,workspace_pseudonym,event,error_class`; allowlist | Secret/PII/card log scan; log injection ve sink-failure test |
| Traces | HTTP→service→DB/outbox→worker→provider spans; baggage’e PII yok | Payment/invoice chain örnek trace; sampling finans hata span’ini korur |
| Metrics | Low-cardinality status/provider/environment; tenant/user/order ID label olmaz | Queue age, webhook reject/duplicate, provider latency/error, reconcile open age |
| Correlation | User request, webhook event, job ve audit aynı opaque correlation lineage | Bir order uçtan uca bulunur; public correlation bilgi sızdırmaz |
| Health | `/live` process/deadlock; `/ready` DB + migration compatibility + outbox claim; `/startup` warmup | Optional provider outage readiness’i düşürmez; provider health ayrı degrade |
| Queue | Depth, oldest age, attempts, poison class, lease expiry | Age/SLO threshold `UNKNOWN`; ölçüm sonrası policy |
| Webhook | Signature failure, stale/replay, unknown event, inbox lag, reducer error | Ani signature failure rotasyon/attack alarmı |
| Reconciliation | Run completeness, orphan/mismatch counts/age, report lateness | Eksik günlük run ve high-severity exception page |
| DLQ/retry | Reason class, first/last seen, next attempt, owner/runbook | Sonsuz retry yok; authorized re-drive audit |
| Audit | Append-only, redacted, actor/reason/result; erişim de olay | Gap/tamper ve export verification |
| Backup/restore | Encrypted backup + manifest + düzenli restore | RPO/RTO `UNKNOWN`; restore ledger/hash/tenant isolation testi |
| Migration | Expand/contract, backward-compatible deploy, lock/time budget, shadow validation | Down/forward-fix plan; large table rehearsal |
| Flags/kill switch | Provider/method/tenant/environment; owner, expiry, audit | Flag drift, expired flag; checkout stop while webhook stays open |
| Environment | Dev/test/staging/prod secrets, provider accounts, buckets, queues ve webhook endpoints ayrı | Prod secret non-prod’da çalışmaz; test/live ref karışımı alarm |
| Release smoke | Public view/submit, hosted checkout, signed webhook fixture, retrieve, refund gate, invoice, document, delivery, embed, tenant negative | Her deploy sonrası read-only/synthetic; gerçek para yalnız kontrollü pilot |

[OpenTelemetry Signals](https://opentelemetry.io/docs/concepts/signals/) trace, metrics ve logs ayrımını; [OTLP](https://opentelemetry.io/docs/specs/otlp/) telemetry aktarım sözleşmesini destekler. Exact vendor, SLO, sample ve retention değerleri `UNKNOWN` olup ölçüm/riske göre karar verilir.

Operasyon runbook’ları: provider kesintisi (yeni checkout flag off, webhook/retrieve açık), imza rotasyonu (dual-secret kısa pencere), stuck outbox, DLQ re-drive, reconciliation mismatch, belge validator regresyonu, yanlış alıcı, cross-tenant şüphesi, migration rollback/forward-fix ve restore. Güvenlik olayı finans kayıtlarını silmez; erişimi daraltır ve evidence’i korur.

## 13. WordPress plugin release

> **Etiketleme kuralı:** Bu alt bölümde resmî kaynakla doğrudan doğrulanan sağlayıcı/standart davranışları `CONFIRMED`; OzelAPP'a özgü mimari, test ve rollback tercihleri `DESIGN RECOMMENDATION`; açık sağlayıcı doküman boşlukları `PROVIDER CONFIRMATION REQUIRED` veya `UNKNOWN`; somut vergi/hukuk kararları `LEGAL REVIEW REQUIRED`; dış hesap, sözleşme veya canlı kanıtlar `EXTERNAL DEPENDENCY` olarak okunur.

**Erişim tarihi:** 3 Eylül 2026

#### Güven sınırı

Publish işlemi mutable draft’tan bağımsız, hash’li ve sürümlü `published_snapshot` üretir. Public endpoint yalnız public-safe snapshot verir: form schema/theme, public asset referansları, sürüm ve submit kontratı. API key, webhook secret, provider/account/connection ID, admin/internal ID, draft, stack trace veya tenant secret hiçbir HTML/JS/REST payload’ında bulunmaz.

Public form ID gizli değildir ve authorization sayılamaz. Server, form→tenant→published version ilişkisini kendisi çözer. Anonymous submit cookie’siz olabilir; yine de schema, quota, abuse ve idempotency kontrollüdür.

#### Iframe ve inline embed

Iframe ayrı origin’de varsayılandır: ana sayfa CSS/JS’sinden en iyi izolasyonu sağlar. Response CSP; dar `default-src`, `script-src`, `style-src`, `img-src`, `connect-src`, `form-action` ve yayın bazlı `frame-ancestors` içerir. `frame-ancestors`, `default-src`’den miras almaz ve meta etiketiyle verilemez; HTTP header olmalıdır.

Sandbox mümkünse `allow-forms allow-scripts` ile sınırlıdır. Aynı-origin frame’de `allow-scripts` ve `allow-same-origin` birlikte sandbox kaçışını güçlendirebilir. `postMessage` yalnız resize/success gibi minimum metadata taşır; exact `targetOrigin`, `event.origin`, `event.source` ve message schema doğrulanır, `*` kullanılmaz.

Inline embed ikinci seçenek: Web Component + Shadow DOM veya kesin prefixli CSS reset/token yüzeyi. Global selector, `!important` savaşı ve host DOM mutation yoktur. Shadow DOM tek başına veri/JS güvenlik boundary’si değildir; submit yine public API güvenliklerine tabidir.

#### CORS, CSRF ve anonymous abuse

CORS tarayıcının response erişim politikasıdır; authorization veya CSRF koruması değildir. HTML formu cross-site POST yapabilir. Cookie’siz public submit’te CSRF kullanıcı yetkili oturumunu sömürmez; abuse/spam yine vardır. Admin/cookie endpoint’leri public submitten ayrı origin/route ve CSRF token/SameSite politikası kullanır.

Anonymous submit kontrolleri:

- Form/IP/session/fingerprint bazlı burst ve quota; pahalı downstream harcama tavanı.
- Strict JSON/schema/semantic validation; bilinmeyen alan reddi; body/field/file limitleri.
- Request idempotency key ve kısa replay penceresi.
- Honeypot/time-to-submit/risk skoru; gerektiğinde bot challenge.
- Turnstile gibi challenge kullanılırsa token backend’de doğrulanır; token kısa ömürlü ve tek kullanımlıdır, hostname/action kontrol edilir.
- Upload varsa quarantine/AV/type/size ve form-scoped media erişimi.
- Generic public hata; private correlation ID; queue/backpressure/circuit breaker.

#### WordPress production-ready kontrol listesi

- [ ] ZIP içinde tek plugin kök klasörü ve doğru ana plugin dosyası.
- [ ] Header: Name, Version, Requires at least, Requires PHP, License, Text Domain; özel dağıtımda `Update URI`.
- [ ] Shortcode ve Gutenberg block aynı render fonksiyonunu kullanır.
- [ ] Asset yalnız shortcode/block kullanılan sayfada enqueue edilir; version/cache busting vardır.
- [ ] Admin save: `current_user_can()` + nonce + sanitize/validate; output escape-late.
- [ ] Nonce auth/authorization değildir; guest submit için tek güvenlik sayılmaz.
- [ ] REST route versioned namespace, arg validation/sanitization ve her route’ta `permission_callback`.
- [ ] Public route yalnız bilinçli `true`; private route capability ister.
- [ ] Plugin bundle/HTML/JS/options/log içinde OzelAPP admin veya provider secret yok.
- [ ] Zorunlu server credential varsa site/tenant scoped, revocable/rotatable ve browser’a kapalı.
- [ ] Exact OzelAPP origin; iframe CSP/sandbox; `postMessage` origin/source/schema testi.
- [ ] Public snapshot version cache key/ETag; publish invalidation.
- [ ] 320px, keyboard/screen reader, classic/block theme, multisite ve network failure testleri.
- [ ] Deactivation veri silmez. `uninstall.php` root + `WP_UNINSTALL_PLUGIN` guard yalnız yerel option/cache temizler.
- [ ] SaaS tenant verisi uninstall ile silinmez; ayrı açık onaylı süreçtir.
- [ ] HTTPS update/migration/rollback; `Update URI` slug çakışmasını önler.
- [ ] PHPCS/WPCS, Plugin Check, WP/PHP destek matrisi ve install/activate/deactivate/uninstall CI.
- [ ] Yerel kişisel veri varsa privacy notice ve WordPress exporter/eraser hook’ları.

#### Kaynak kanıtı

| Kaynak | Kurum | URL | Bölüm | Karar |
|---|---|---|---|---|
| CORS guide | MDN | https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS | Credentials/origins | CORS auth değildir |
| CSP frame-ancestors | MDN | https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors | Header/ancestor matching | Origin allowlist |
| iframe reference | MDN | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe | sandbox | Sandbox izinleri |
| Window.postMessage | MDN | https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage | exact target/origin | Güvenli resize mesajı |
| API4 Resource Consumption | OWASP | https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/ | Rate/body/downstream costs | Anonymous abuse |
| Input Validation | OWASP | https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html | Syntactic/semantic validation | Submit schema |
| Turnstile server validation | Cloudflare | https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ | Single-use/TTL/hostname | Bot token backend kontrolü |
| Nonces | WordPress | https://developer.wordpress.org/apis/security/nonces/ | CSRF/not authorization | Nonce sınırı |
| Adding Custom Endpoints | WordPress | https://developer.wordpress.org/rest-api/extending-the-rest-api/adding-custom-endpoints/ | namespace/permission callback | REST güvenliği |
| Header Requirements | WordPress | https://developer.wordpress.org/plugins/plugin-basics/header-requirements/ | Version/Update URI | Paket/update |
| Uninstall Methods | WordPress | https://developer.wordpress.org/plugins/plugin-basics/uninstall-methods/ | deactivation vs uninstall | Veri davranışı |

#### Karar kaydı

**Karar:** Public yayın immutable snapshot olacak; ayrı-origin iframe varsayılan, inline Shadow DOM ikincil; WordPress plugin yalnız public embed kimliği taşıyacak ve hiçbir secret içermeyecek.  
**Durum:** DESIGN RECOMMENDATION  
**Bağlı ana faz:** 8  
**Bağımlılıklar:** Public/admin origin ayrımı, CSP origin listesi, object/media policy, anti-abuse sağlayıcısı, WP dağıtım kanalı.  
**Sektörel gerekçe:** Embed kodu düşman/öngörülemez host sayfada çalışır; public ID güvenlik sınırı değildir.  
**Kaynak:** MDN CORS/CSP/iframe/postMessage; OWASP API/input; Cloudflare Turnstile; WordPress resmi handbook.  
**Teknik gerekçe:** Snapshot + iframe sınırı taslak/secret/CSS sızıntısını azaltır ve cache’lenebilir yayın üretir.  
**Güvenlik etkisi:** Secret leak, clickjacking/embed abuse, cross-tenant ve bot maliyet riski düşer.  
**Maliyet/karmaşıklık:** Orta; iki renderer seçeneği, CSP, resize protocol ve plugin yaşam döngüsü gerekir.  
**Yanlış uygulanırsa risk:** Admin verisi ifşası, ana site CSS bozulması, spam/harcama saldırısı, güvensiz WP proxy.  
**Minimum uygulanabilir çözüm:** Public snapshot + iframe + exact `frame-ancestors`/postMessage + rate/schema/idempotency + secret-free shortcode plugin.  
**İleride genişletme yolu:** Inline Web Component, adaptive abuse ve yönetilen private-site connector.

### Production plugin release matrisi

| Konu | Etiket | Zorunlu karar/test | Risk kapısı |
|---|---|---|---|
| Header | CONFIRMED | Plugin Name, semver Version, tested Requires at least/PHP, Text Domain, license; dış dağıtımda özgün Update URI | Sürüm matrisi test edilmeden UNKNOWN |
| Shortcode | CONFIRMED + DESIGN RECOMMENDATION | Callback echo değil return; attrs allowlist/sanitize; context escape | XSS/duplicate asset |
| Block | CONFIRMED + DESIGN RECOMMENDATION | `block.json` ile PHP+JS registration; sadece kullanıldığında asset | Editor/frontend parity |
| Iframe | DESIGN RECOMMENDATION | Public OzelAPP origin; minimal sandbox; CSP frame-ancestors HTTP header | allow-scripts+same-origin kombinasyonu özel review |
| CORS | CONFIRMED | iframe render CORS istemez; inline fetch varsa exact origin, credentialed `*` yok, Vary: Origin | Origin reflection REJECTED |
| postMessage | CONFIRMED | exact targetOrigin; event.origin+source+schema | `*` ve type confusion REJECTED |
| Nonce/capability | CONFIRMED | Nonce auth/authz/replay değildir; her admin mutation current_user_can | Guest nonce kritik veri için kullanılamaz |
| REST permission | CONFIRMED | Her route permission_callback; public ise explicit __return_true; admin capability check | Custom public private-proxy açma REJECTED |
| Secret-free | DESIGN RECOMMENDATION | Yalnız public form/embed ID ve allowlisted base URL; provider/admin secret yok | WP compromise blast radius |
| Proxy abuse | DESIGN RECOMMENDATION | WP PHP private OzelAPP API proxy’si yok; public endpointte server-side rate/abuse ve public key scope | Open relay/SSRF/credential theft |
| Conflict/cache/minify | DESIGN RECOMMENDATION | Unique namespace/handles/root CSS; wp_enqueue; cache/minify/security/page-builder matrix | Double library/global CSS |
| Multisite/RTL/i18n | CONFIRMED + DESIGN RECOMMENDATION | Site-scoped default; network only explicit; gettext/text domain; RTL data | Büyük ağ uninstall batch |
| Deactivate/uninstall | CONFIRMED | Deactivate veri silmez; uninstall.php guard; yalnız local plugin data, remote OzelAPP değil | Senkron büyük network cleanup REJECTED |
| ZIP | DESIGN RECOMMENDATION | Deterministic order/timestamp, allowlist, clean-room rebuild, SHA-256 | WordPress’in genel zorunluluğu diye sunulmaz |
| SBOM/pinning | DESIGN RECOMMENDATION | SPDX/CycloneDX, lockfile, exact deps, license/CVE scan | Supply-chain gap |
| Update/rollback | CONFIRMED + DESIGN RECOMMENDATION | All stable code in package; executable remote code yok; previous ZIP/config preserved | Staging update + rollback test |

## 14. Doğrulanmış bilgiler tablosu

| Kimlik | CONFIRMED bilgi | Birincil kaynak | Tasarım etkisi |
|---|---|---|---|
| C-01 | iyzico CF initialize/retrieve tokenlı hosted akış sağlar. | iyzico CF resmi docs | Callback değil retrieve otoritesi. |
| C-02 | iyzico V3 webhook HMAC-SHA256/HEX ve 2xx’e kadar 15 dakikalık retry kullanır. | iyzico Webhook | Raw verify + dedupe. |
| C-03 | iyzico refund paymentTransactionId; cancel paymentId kullanır. | iyzico Refund & Cancel | Ayrı command/permission. |
| C-04 | PCI SAQ A tamamen dış kaynak alınan account-data functions ve acquirer kararına bağlıdır. | PCI SSC 2025 | “PCI dışı” iddiası yok. |
| C-05 | CVV authorization sonrası şifreli bile saklanamaz. | PCI SSC FAQ | Schema/log/backup yasağı. |
| C-06 | Google Pay DIRECT ECv2 decrypt ve QSA doğrulanmış PCI gerektirir; çözülmüş veri PAN içerir. | Google Pay official | DIRECT REJECTED. |
| C-07 | Paraşüt v4 base, Bearer, JSON:API ve 10 istek/10 sn dokümante. | Swagger 4.0.0 | Throttle/adapter. |
| C-08 | Paraşüt auth code ve 7200 sn access token; refresh yeni refresh token döndürür. | Swagger v4 | Atomic rotation. |
| C-09 | Paraşüt e-doc create TrackableJob; ID 15 dk; PDF ready değilse 204; URL ~1 saat ve doğrudan paylaşılmamalı. | Swagger v4 | Poll/backend ingest. |
| C-10 | RFC 9700 exact redirect, state/PKCE ve password grant yasağını günceller. | RFC 9700, Jan 2025 | Auth-code + security gate. |
| C-11 | GİB UBL-TR özgün/imzalı artifact ve bütünlük ilişkili saklamayı esas alır. | GİB kılavuzları | PDF canonical değil. |
| C-12 | GİB 14.09.2026 paket/code-list geçişi ve Ağustos düzeltmeleri duyurdu. | GİB Duyurular | Pinned final package/hash. |
| C-13 | Transactional outbox iş verisiyle aynı transactionda yazılmalı; queue tekrar teslim edebilir. | AWS official | Idempotent consumer. |
| C-14 | Gmail all-sender SPF veya DKIM; bulk SPF+DKIM+DMARC/alignment ve düşük spam oranı ister. | Gmail sender guidelines | Domain release gate. |
| C-15 | RFC 9457 problem+json; RFC 6585 429; RFC 9110 status semantiği sağlar. | IETF | Public API contract. |
| C-16 | WP nonce auth/authz/replay koruması değildir; REST route permission_callback ister. | WordPress official | Capability check. |
| C-17 | CSP frame-ancestors HTTP header ile frame origin sınırlar; postMessage origin/source doğrulaması gerekir. | MDN/W3C behavior | Secret-free iframe. |

## 15. Doğrulanamayan bilgiler tablosu

| Kimlik | Etiket | Doğrulanamayan bilgi | Gereken kanıt | Açılabilecek en erken kapı |
|---|---|---|---|---|
| U-01 | PROVIDER CONFIRMATION REQUIRED | iyzico V3 gerçek CF payload alan adı/golden vector | Resmi SDK fixture/yazılı destek | Faz 2 webhook |
| U-02 | PROVIDER CONFIRMATION REQUIRED | iyzico replay penceresi, azami retry/ordering | Yazılı webhook sözleşmesi | Faz 2 |
| U-03 | PROVIDER CONFIRMATION REQUIRED | Canlı foreign-card/currency/installment/Google Pay capability | Merchant dashboard + written support + live preflight | Faz 1/7 |
| U-04 | PROVIDER CONFIRMATION REQUIRED | iyzico general idempotency/429/5xx/timeout matrix | Provider docs/support | Faz 1/2 |
| U-05 | EXTERNAL DEPENDENCY | OzelAPP exact PCI SAQ/AOC gereği | Acquirer/card brand/PCI danışmanı | Faz 7 |
| U-06 | PROVIDER CONFIRMATION REQUIRED | Paraşüt state passthrough, PKCE S256, revoke | Resmi provider response + contract test | Faz 4 OAuth |
| U-07 | PROVIDER CONFIRMATION REQUIRED | Paraşüt 429/Retry-After/timeout/idempotency | Yazılı contract/fixtures | Faz 4 command retry |
| U-08 | PROVIDER CONFIRMATION REQUIRED | Paraşüt webhook/subscription | Resmi current API docs | Faz 4; yoksa polling |
| U-09 | PROVIDER CONFIRMATION REQUIRED | İmzalı özgün UBL-TR/zarf/yanıt indirme | Exact endpoint/export SLA ve fixture | Faz 5 CRITICAL |
| U-10 | PROVIDER CONFIRMATION REQUIRED + LEGAL REVIEW REQUIRED | Formal e-doc cancel/correct/resend | Provider + GİB/hukuk runbook | Faz 4/5 |
| U-11 | LEGAL REVIEW REQUIRED | Somut belge türü, KDV/tevkifat/istisna/iade/ihracat, tarih/süre | Müşavir/hukuk yazılı karar matrisi | Faz 3/4 |
| U-12 | LEGAL REVIEW REQUIRED | Retention/lokasyon/ibraz ve role göre sorumluluk | Müşavir/hukuk/KVKK değerlendirmesi | Faz 5/production |
| U-13 | UNKNOWN | Mevcut repo, test, deployment ve veri modeli | Repo/test/infra discovery | Her uygulama mikro-fazı |
| U-14 | EXTERNAL DEPENDENCY | E-posta provider fiyat/SLA/DPA/region/quota | Güncel ticari sözleşme | Faz 6 |
| U-15 | UNKNOWN | RPO/RTO, on-call, recovery owner | Business impact analysis/tabletop | Pilot/production |
| U-16 | UNKNOWN | Desteklenen WP/PHP/browser/plugin matrisi | CI matrix ve cihaz/browser smoke | Faz 8 |

## 16. Risk matrisi

| Risk | Olasılık | Etki | Sınıflandırma | Önleme | Algılama | Owner/kapı |
|---|---|---|---|---|---|---|
| Sahte callback fulfillment | Orta | Kritik | DESIGN RECOMMENDATION | Retrieve/webhook-only reducer | Callback negative + mismatch alarm | Payment; Faz 1 |
| Forged/replayed webhook | Orta | Kritik | PROVIDER CONFIRMATION REQUIRED | Canonical HMAC, inbox unique, monotonic state | Signature/replay metrics | Security; Faz 2 |
| Duplicate charge/refund/invoice | Orta | Kritik | PROVIDER CONFIRMATION REQUIRED | Local command fingerprint, reconcile-first, single-flight | Duplicate/mismatch ledger | Finance; Faz 2/4 |
| PAN/CVV leakage | Düşük-Orta | Kritik | CONFIRMED | Hosted redirect, no fields, log/DLP controls | Canary scan | Security/PCI; Faz 1/7 |
| Yanlış e-belge türü/vergi | Orta | Kritik | LEGAL REVIEW REQUIRED | Rules as versioned expert-approved data; manual approval | Audit/sample review | Finance/legal; Faz 3/4 |
| PDF’yi canonical saymak | Yüksek | Kritik | PROVIDER CONFIRMATION REQUIRED | UBL-TR gate; layered ready-state | Artifact completeness report | Invoice/Vault; Faz 5 |
| Yanlış alıcıya belge | Orta | Yüksek | LEGAL REVIEW REQUIRED | Verify, masked preview, snapshot, second approval, revoke | Bounce/incident/audit | Delivery; Faz 6 |
| Retry storm/provider outage | Orta | Yüksek | DESIGN RECOMMENDATION | Retry budget, jitter, breaker, kill switch, backpressure | Queue age/error/breaker alarms | Ops; pilot |
| Secret/log leakage | Orta | Kritik | DESIGN RECOMMENDATION | Secret manager, redaction, least privilege, no env dump | DLP/canary/audit | Security; immediate |
| Cross-tenant access | Düşük-Orta | Kritik | DEFERRED until Faz 9 | tenant context, RLS, scoped object/secret | Cross-tenant matrix | SaaS; Faz 9 |
| Backup cannot restore | Orta | Kritik | UNKNOWN | Versioned encrypted backup + restore drill | Measured restore/checksum | Ops; pilot |
| WP proxy abuse/XSS | Orta | Yüksek | DESIGN RECOMMENDATION | No private proxy, iframe/CSP/origin/schema, escaping | WAF/rate/plugin matrix | Embed; Faz 8 |
| GİB package drift | Yüksek near 14.09.2026 | Yüksek | CONFIRMED | Pin final corrected package/hash; regression fixtures | Contract CI | Invoice; pre-live |

## 17. Bağımlılık matrisi

| Bağımlılık | Sağlayan | Tüketen faz | Kanıt | Yoksa davranış | Etiket |
|---|---|---|---|---|---|
| iyzico merchant + live capability | iyzico/acquirer | 1,2,7 | Written profile/dashboard + live preflight | Yöntem görünmez; sandbox only | EXTERNAL DEPENDENCY |
| Webhook V3 fixture | iyzico | 2 | Official SDK/sample + test event | Webhook side-effect off; retrieve reconcile | PROVIDER CONFIRMATION REQUIRED |
| PCI scope | Acquirer/QSA | 1,7 | SAQ/AOC decision | Production payment blocked | EXTERNAL DEPENDENCY |
| Muhasebe/vergi karar matrisi | Mali müşavir/hukuk | 3–5 | Signed/versioned rules | Manual draft only | LEGAL REVIEW REQUIRED |
| Paraşüt client/test company/roles | Paraşüt/account owner | 4 | OAuth, /me, role evidence | Adapter disabled | EXTERNAL DEPENDENCY |
| Paraşüt UBL-TR artifact | Paraşüt/entegratör | 5 | Signed original + envelope/responses | ARTIFACT_BLOCKED | PROVIDER CONFIRMATION REQUIRED |
| GİB final 2026 packages | GİB | 4,5,7 | URL/version/SHA-256 | Go-live blocked after effective date | CONFIRMED |
| Object store/AV/KMS | Cloud/security | 5 | Policies, scan, restore | document-ready off | EXTERNAL DEPENDENCY |
| Delivery provider/DNS | Provider/domain owner | 6 | API/webhook/DNS/DPA/quota | Queue/manual send; no false delivered | EXTERNAL DEPENDENCY |
| Live low-value pilot authority | Product/finance/ops | 7 | Approved script/budget/owners | Sandbox only | EXTERNAL DEPENDENCY |
| WP/browser test matrix | Product/QA | 8 | CI/e2e evidence | Plugin beta/not production | UNKNOWN |
| Tenant policies | Product/legal/security | 9 | Membership, retention, suspension, support | Single workspace only | DEFERRED |

## 18. Güvenlik kapıları

| Kapı | Zorunlu kanıt | Fail sonucu | Rollback/degraded mode |
|---|---|---|---|
| SG-01 No card data | DOM/network/schema/log/APM/backup/export PAN/CVV canary sıfır | Payment release blocked | Full hosted redirect only |
| SG-02 Order integrity | Server-side minor amount/currency/product snapshot ve mismatch tests | Fulfillment blocked | Manual exception |
| SG-03 Webhook authenticity | Golden vectors, constant-time compare, secret rotation overlap | Webhook side-effect off | Retrieve/reconciliation |
| SG-04 Replay/idempotency | Duplicate/reordered/concurrent event tests; single outbox effect | Worker paused | Inbox preserved/replay later |
| SG-05 Refund authorization | RBAC/step-up/reason/cumulative/concurrency/audit | Refund command disabled | Manual provider portal with audit |
| SG-06 OAuth | exact redirect/state, PKCE capability, token rotation/leak tests | Paraşüt connection disabled | Manual invoice |
| SG-07 Tax/legal | Versioned expert-approved rules and sample invoices | Automatic formalization disabled | Manual draft/review |
| SG-08 Canonical artifact | Original signed UBL-TR + envelope/response/hash/immutable store | document-ready false | PDF view only with warning |
| SG-09 Document access | Tenant entitlement, malware/type/size, short link/revoke, audit | Download off | Admin controlled recovery |
| SG-10 Delivery | DNS auth, recipient verify, webhook verify, suppression, no PII logs | Auto-send paused | Manual secure delivery |
| SG-11 Ops recovery | Restore drill, kill switches, breaker, queue redrive, incident owner | Pilot/production blocked | Read/reconcile mode |
| SG-12 WordPress | Secret-free, no private proxy, CSP/origin/schema, plugin matrix/hash | ZIP not released | Previous ZIP/config |
| SG-13 Tenant | Cross-tenant API/job/object/secret/audit matrix | SaaS blocked | Single workspace |

## 19. 15 dakikalık mikro-faz önerileri

**DESIGN RECOMMENDATION:** Aşağıdaki 43 iş birer test-first, tek doğrulanabilir değişikliktir. Repo görülmediği için gerçek dosya adları uydurulmamış; dosya türleri bölüm 20’de belirtilmiştir. Bir iş 15 dakikada kapanmazsa daha küçük kırmızı→yeşil dilimlere bölünür; kapsam büyütülmez.

### Faz 1 — OzelAPP’ın kendi ödeme sistemi

| Faz kimliği | Mikro-faz | Bağımlılık özeti | Kullanıcı etkisi |
|---|---|---|---|
| F1.1 | Provider capability sözleşmesi | Yok; araştırma kararı onaylı. | Kullanıcıya yansıyan Provider capability sözleşmesi davranışı ölçülebilir ve fail-closed olur. |
| F1.2 | PaymentOrder çekirdek kaydı | F1.1. | Kullanıcıya yansıyan PaymentOrder çekirdek kaydı davranışı ölçülebilir ve fail-closed olur. |
| F1.3 | iyzico CF initialize sınırı | F1.2; iyzico sandbox/test credential. | Kullanıcıya yansıyan iyzico CF initialize sınırı davranışı ölçülebilir ve fail-closed olur. |
| F1.4 | Callback retrieve ve bekleme ekranı | F1.3. | Kullanıcı sahte/erken başarı yerine dürüst bir “işleniyor” durumu görür. |
| F1.5 | Stripe/Google Pay güvenli kapı | F1.1. | Kullanıcıya yansıyan Stripe/Google Pay güvenli kapı davranışı ölçülebilir ve fail-closed olur. |

### Faz 2 — Ödeme güvenliği, webhook, refund ve reconciliation

| Faz kimliği | Mikro-faz | Bağımlılık özeti | Kullanıcı etkisi |
|---|---|---|---|
| F2.1 | Raw webhook verification katmanı | F1 PaymentOrder. | Kullanıcıya yansıyan Raw webhook verification katmanı davranışı ölçülebilir ve fail-closed olur. |
| F2.2 | Append-only event inbox ve dedupe | F2.1. | Kullanıcıya yansıyan Append-only event inbox ve dedupe davranışı ölçülebilir ve fail-closed olur. |
| F2.3 | Deterministik state reducer | F2.2. | Kullanıcıya yansıyan Deterministik state reducer davranışı ölçülebilir ve fail-closed olur. |
| F2.4 | Refund command ledger | F2.3; `succeeded` ödeme. | Yetkili iade görünür ve izlenebilir olur; çifte iade önlenir. |
| F2.5 | Günlük reconciliation exception job’u | F2.3–F2.4; provider report fixture/API. | Kullanıcıya yansıyan Günlük reconciliation exception job’u davranışı ölçülebilir ve fail-closed olur. |

### Faz 3 — Manuel fatura sistemi

| Faz kimliği | Mikro-faz | Bağımlılık özeti | Kullanıcı etkisi |
|---|---|---|---|
| F3.1 | Invoice candidate/allocation modeli | Faz 2 kapısı. | Fatura/belge durumu daha doğru, güvenli ve tekrar üretilebilir olur. |
| F3.2 | Kısmi grup seçimi snapshot’ı | F3.1. | Kullanıcıya yansıyan Kısmi grup seçimi snapshot’ı davranışı ölçülebilir ve fail-closed olur. |
| F3.3 | Güvenli Excel/CSV export | F3.2; muhasebe kolon sözleşmesi. | Kullanıcıya yansıyan Güvenli Excel/CSV export davranışı ölçülebilir ve fail-closed olur. |
| F3.4 | Dış belge import/duplicate kilidi | F3.1; izinli format kararı. | Fatura/belge durumu daha doğru, güvenli ve tekrar üretilebilir olur. |

### Faz 4 — Paraşüt API v4 faturalama sistemi

| Faz kimliği | Mikro-faz | Bağımlılık özeti | Kullanıcı etkisi |
|---|---|---|---|
| F4.1 | OAuth authorization transaction | Paraşüt client/redirect onayı. | Kullanıcıya yansıyan OAuth authorization transaction davranışı ölçülebilir ve fail-closed olur. |
| F4.2 | Atomik refresh token rotasyonu | F4.1. | Kullanıcıya yansıyan Atomik refresh token rotasyonu davranışı ölçülebilir ve fail-closed olur. |
| F4.3 | Contact/product mapping | F4.2. | Kullanıcıya yansıyan Contact/product mapping davranışı ölçülebilir ve fail-closed olur. |
| F4.4 | Sales invoice ve e-document job | F4.3; müşavir onaylı alanlar. | Fatura/belge durumu daha doğru, güvenli ve tekrar üretilebilir olur. |
| F4.5 | Throttled job/PDF poller | F4.4. | Kullanıcıya yansıyan Throttled job/PDF poller davranışı ölçülebilir ve fail-closed olur. |

### Faz 5 — Belge güvenliği ve document-ready

| Faz kimliği | Mikro-faz | Bağımlılık özeti | Kullanıcı etkisi |
|---|---|---|---|
| F5.1 | Quarantine intake ve tür doğrulama | F3.4/F4.5. | Kullanıcıya yansıyan Quarantine intake ve tür doğrulama davranışı ölçülebilir ve fail-closed olur. |
| F5.2 | AV/validation ve metadata | F5.1. | Kullanıcıya yansıyan AV/validation ve metadata davranışı ölçülebilir ve fail-closed olur. |
| F5.3 | Immutable versioned storage | F5.2; retention/WORM kararı. | Kullanıcıya yansıyan Immutable versioned storage davranışı ölçülebilir ve fail-closed olur. |
| F5.4 | `document_ready` atomik geçiş ve süreli link | F5.3. | Fatura/belge durumu daha doğru, güvenli ve tekrar üretilebilir olur. |

### Faz 6 — Gerekli transactional ödeme/fatura bildirimleri

| Faz kimliği | Mikro-faz | Bağımlılık özeti | Kullanıcı etkisi |
|---|---|---|---|
| F6.1 | İzinli event/template registry | F5.4/domain olayları. | Kullanıcıya yansıyan İzinli event/template registry davranışı ölçülebilir ve fail-closed olur. |
| F6.2 | Transactional outbox/worker | F6.1. | Kullanıcıya yansıyan Transactional outbox/worker davranışı ölçülebilir ve fail-closed olur. |
| F6.3 | SPF/DKIM/DMARC domain state | Provider account/domain. | Bildirim teslimatı izlenir; yanlış alıcı ve spam riski azalır. |
| F6.4 | Delivery webhook ve suppression | F6.2; provider webhook secret/key. | Bildirim teslimatı izlenir; yanlış alıcı ve spam riski azalır. |

### Faz 7 — Tüm zincirin pilot testi

| Faz kimliği | Mikro-faz | Bağımlılık özeti | Kullanıcı etkisi |
|---|---|---|---|
| F7.1 | Pilot veri ve rollback runbook’u | Faz 1–6 kapıları. | Gerçek para/belge akışının kontrollü kanıtı elde edilir. |
| F7.2 | Küçük canlı ödeme→fatura→belge→mail | F7.1; açık onay ve yasal test alıcısı. | Fatura/belge durumu daha doğru, güvenli ve tekrar üretilebilir olur. |
| F7.3 | Failure/replay/rollback tatbikatı | F7.2. | Kullanıcıya yansıyan Failure/replay/rollback tatbikatı davranışı ölçülebilir ve fail-closed olur. |

### Faz 8 — Form, builder, UI/UX ve dışa aktarma olgunlaştırması

| Faz kimliği | Mikro-faz | Bağımlılık özeti | Kullanıcı etkisi |
|---|---|---|---|
| F8.1 | Public/private snapshot serializer | Faz 7 kabulü. | Anonim form/embed deneyimi güvenli ve erişilebilir hâle gelir. |
| F8.2 | Anonymous submit guard’ları | F8.1. | Anonim form/embed deneyimi güvenli ve erişilebilir hâle gelir. |
| F8.3 | Iframe CSP/sandbox/postMessage | F8.1–F8.2; allowed origin. | Anonim form/embed deneyimi güvenli ve erişilebilir hâle gelir. |
| F8.4 | Builder tree ve erişilebilir reorder | Snapshot schema. | Anonim form/embed deneyimi güvenli ve erişilebilir hâle gelir. |
| F8.5 | Autosave/revision/publish conflict | F8.4. | Kullanıcıya yansıyan Autosave/revision/publish conflict davranışı ölçülebilir ve fail-closed olur. |
| F8.6 | Form medya alanı ve 16:9 kart | Tenant/form object policy. | Kullanıcıya yansıyan Form medya alanı ve 16:9 kart davranışı ölçülebilir ve fail-closed olur. |
| F8.7 | WordPress minimum plugin | F8.3 embed URL/protocol. | Anonim form/embed deneyimi güvenli ve erişilebilir hâle gelir. |

### Faz 9 — SaaS ve tenant sistemi

| Faz kimliği | Mikro-faz | Bağımlılık özeti | Kullanıcı etkisi |
|---|---|---|---|
| F9.1 | Tenant/membership/permission temeli | Faz 8; SaaS ürün kararı. | Çapraz tenant sızıntısı ve yetkisiz destek erişimi azaltılır. |
| F9.2 | RLS ve çapraz katman tenant scope | F9.1. | Çapraz tenant sızıntısı ve yetkisiz destek erişimi azaltılır. |
| F9.3 | Per-tenant provider secret zarfı | F9.2; KMS/secret manager. | Çapraz tenant sızıntısı ve yetkisiz destek erişimi azaltılır. |
| F9.4 | Askıya alma/read-only policy | F9.1–F9.3; entitlement states. | Çapraz tenant sızıntısı ve yetkisiz destek erişimi azaltılır. |
| F9.5 | Reactivation ve geçmiş olay koruması | F9.4. | Çapraz tenant sızıntısı ve yetkisiz destek erişimi azaltılır. |
| F9.6 | Süreli support erişimi | F9.1 permission; support policy. | Çapraz tenant sızıntısı ve yetkisiz destek erişimi azaltılır. |

## 20. Her mikro-faz için test ve kabul kriteri

**Zorunlu kapı sırası:** (1) mevcut kod/testleri incele, (2) önceki smoke, (3) kırmızı test, (4) minimum değişiklik, (5) yeşil test, (6) lint/typecheck/build, (7) security/leak, (8) diff/scope, (9) evidence pack, (10) ancak sonra sonraki mikro-faz. Her önceki fazın testleri yeniden geçmeden yeni faz kapanmış sayılmaz.

### F1.1 — Provider capability sözleşmesi

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F1.1 |
| Faz adı | Provider capability sözleşmesi |
| Bağımlılıkları | Yok; araştırma kararı onaylı. |
| Amaç | Stripe/iyzico/Google Pay yeteneklerini ortak enum/DTO ile temsil etmek. |
| Dokunulacak mimari alan | Payment provider boundary. |
| Değişecek dosya türleri | Domain type/interface, unit test. |
| Önce yazılacak test | Bilinmeyen capability’nin güvenli `false` döndürmesi. |
| Beklenen kırmızı test | Adapter capability metodu/enum’u yok. |
| Minimum uygulanabilir değişiklik | `currency`, `installment`, `wallet`, `refund`, `partial_refund`, `live_eligible` alanlı sözleşme. |
| Yeşil test | iyzico/Stripe stub’ları yalnız bildiğini bildirir. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Capability payload’ında secret/account internal ID yok. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Yeni interface/type dosyasını geri al; veri değişmez. |
| Başarı kriteri | UI bilinmeyen yöntemi göstermiyor. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Typecheck/lint/test yeşil. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Kullanıcıya yansıyan Provider capability sözleşmesi davranışı ölçülebilir ve fail-closed olur. |

### F1.2 — PaymentOrder çekirdek kaydı

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F1.2 |
| Faz adı | PaymentOrder çekirdek kaydı |
| Bağımlılıkları | F1.1. |
| Amaç | Sipariş ve provider attempt kimliğini ayırmak. |
| Dokunulacak mimari alan | Payment domain/persistence. |
| Değişecek dosya türleri | Migration, model, repository test. |
| Önce yazılacak test | Aynı internal order altında iki attempt; provider ID tenant+account kapsamında tekil. |
| Beklenen kırmızı test | Tablo/model/constraint yok. |
| Minimum uygulanabilir değişiklik | UUID order, tenant, amount_minor, currency, provider, environment, attempt relation. |
| Yeşil test | Integer tutar ve tenant-scoped uniqueness geçer. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | PAN/CVV/client secret kolonları yok. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Yalnız boş yeni tabloları down migration ile kaldır. |
| Başarı kriteri | Tutar float olmadan round-trip olur. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Migration up/down + veri kaybı kontrolü. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Kullanıcıya yansıyan PaymentOrder çekirdek kaydı davranışı ölçülebilir ve fail-closed olur. |

### F1.3 — iyzico CF initialize sınırı

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F1.3 |
| Faz adı | iyzico CF initialize sınırı |
| Bağımlılıkları | F1.2; iyzico sandbox/test credential. |
| Amaç | Server-calculated order’dan CF initialize request üretmek. |
| Dokunulacak mimari alan | iyzico adapter. |
| Değişecek dosya türleri | Adapter, request mapper, contract test fixture. |
| Önce yazılacak test | Client amount farklıysa request internal amount’ı kullanır. |
| Beklenen kırmızı test | Mapper/adapter yok. |
| Minimum uygulanabilir değişiklik | Initialize çağrısı ve token/conversation mapping; raw card alanı yok. |
| Yeşil test | Resmi fixture sözleşmesi ve amount/currency doğrulaması geçer. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | API secret/request body loglanmıyor. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Adapter feature flag kapatılır. |
| Başarı kriteri | Test ortamında hosted form tokenı alınır; bu canlı kanıt sayılmaz. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Sandbox contract kanıtı + secret scan. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Kullanıcıya yansıyan iyzico CF initialize sınırı davranışı ölçülebilir ve fail-closed olur. |

### F1.4 — Callback retrieve ve bekleme ekranı

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F1.4 |
| Faz adı | Callback retrieve ve bekleme ekranı |
| Bağımlılıkları | F1.3. |
| Amaç | Callback’i başarı değil retrieve tetikleyicisi yapmak. |
| Dokunulacak mimari alan | Public payment return + adapter retrieve. |
| Değişecek dosya türleri | Route/controller, service, integration test, UI state. |
| Önce yazılacak test | Sahte `success=true` callback fulfillment yapamaz. |
| Beklenen kırmızı test | Mevcut callback doğrudan başarıya düşüyor veya route yok. |
| Minimum uygulanabilir değişiklik | Token retrieve, order/provider/amount/currency match, `processing` ekranı. |
| Yeşil test | Yalnız provider sonucu eşleşince normalize state güncellenir. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Token URL/log/analytics’te kalıcı değil; generic hata. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Return route’u bakım ekranına al; provider ödeme kaydı korunur. |
| Başarı kriteri | Manipüle callback no-op; kullanıcı kesinleşmeyi poll eder. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Negative callback testleri ve build yeşil. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Kullanıcı sahte/erken başarı yerine dürüst bir “işleniyor” durumu görür. |

### F1.5 — Stripe/Google Pay güvenli kapı

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F1.5 |
| Faz adı | Stripe/Google Pay güvenli kapı |
| Bağımlılıkları | F1.1. |
| Amaç | Uygunluk yokken Stripe/Google Pay’i gösterilmez yapmak. |
| Dokunulacak mimari alan | Feature/capability policy. |
| Değişecek dosya türleri | Policy/config schema, UI test. |
| Önce yazılacak test | Türkiye hesabı kanıtı yoksa Stripe/Google Pay butonu yok. |
| Beklenen kırmızı test | Yöntem koşulsuz render ediliyor veya policy yok. |
| Minimum uygulanabilir değişiklik | `live_eligible=false` default, kanıt referansı/tarih alanı. |
| Yeşil test | Yalnız onaylı provider+domain+runtime capability’de wallet görünür. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Google Pay `DIRECT` enum/config ile reddedilir. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Feature flag kapalı kalır. |
| Başarı kriteri | Yanlış konfigürasyon fail-closed. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Canlı uygunluk belgesi yoksa `EXTERNAL DEPENDENCY`. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Kullanıcıya yansıyan Stripe/Google Pay güvenli kapı davranışı ölçülebilir ve fail-closed olur. |

### F2.1 — Raw webhook verification katmanı

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F2.1 |
| Faz adı | Raw webhook verification katmanı |
| Bağımlılıkları | F1 PaymentOrder. |
| Amaç | Parse öncesi provider imza kontrolü. |
| Dokunulacak mimari alan | Webhook edge. |
| Değişecek dosya türleri | Route/middleware, verifier, security test. |
| Önce yazılacak test | Bozuk imza, değiştirilmiş body ve eski timestamp durum değiştirmez. |
| Beklenen kırmızı test | Verifier yok/parsed body kullanılıyor. |
| Minimum uygulanabilir değişiklik | Body size/method limit + provider verifier + constant-time compare. |
| Yeşil test | Geçerli fixture kabul; üç negative vaka `4xx`. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Signature/secret loglanmaz; TLS config doğrulanır. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Endpoint disable; retrieve reconciliation ile kayıt korunur. |
| Başarı kriteri | İmzasız hiçbir event inbox’a giremez. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Provider’ın güncel imza fixture’ı; iyzico kanıtı yoksa blokaj. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Kullanıcıya yansıyan Raw webhook verification katmanı davranışı ölçülebilir ve fail-closed olur. |

### F2.2 — Append-only event inbox ve dedupe

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F2.2 |
| Faz adı | Append-only event inbox ve dedupe |
| Bağımlılıkları | F2.1. |
| Amaç | Tekrarlı webhook’u tek yan etkiye indirmek. |
| Dokunulacak mimari alan | Event persistence/queue. |
| Değişecek dosya türleri | Migration, repository, worker test. |
| Önce yazılacak test | Aynı event iki kez gönderilince tek inbox/tek job. |
| Beklenen kırmızı test | Duplicate constraint/idempotency yok. |
| Minimum uygulanabilir değişiklik | Tenant+provider account+event ID unique inbox, request hash, received time. |
| Yeşil test | İkinci teslim no-op `2xx`; ilk kayıt değişmez. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Payload erişimi kısıtlı/retention; hassas alan redaction. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Worker durdur; inbox verisini silme. |
| Başarı kriteri | Replay finansal yan etki üretmez. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Concurrency duplicate testi. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Kullanıcıya yansıyan Append-only event inbox ve dedupe davranışı ölçülebilir ve fail-closed olur. |

### F2.3 — Deterministik state reducer

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F2.3 |
| Faz adı | Deterministik state reducer |
| Bağımlılıkları | F2.2. |
| Amaç | Sırasız event ve frontend yarışında ileri yönlü yakınsama. |
| Dokunulacak mimari alan | Payment state service. |
| Değişecek dosya türleri | Reducer, transition table, property/unit test. |
| Önce yazılacak test | `succeeded` sonrası eski `processing` geri düşüremez; callback+webhook tek fulfillment. |
| Beklenen kırmızı test | Son gelen event kör overwrite eder. |
| Minimum uygulanabilir değişiklik | Allowed transition table + stale eventte provider retrieve hook’u. |
| Yeşil test | Permütasyonlarda aynı son durum/tek outbox. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Tenant/provider account mismatch reddedilir. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Worker pause, inbox replay için korunur. |
| Başarı kriteri | State permutation/property testleri yeşil. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Fulfillment idempotency kanıtı. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Kullanıcıya yansıyan Deterministik state reducer davranışı ölçülebilir ve fail-closed olur. |

### F2.4 — Refund command ledger

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F2.4 |
| Faz adı | Refund command ledger |
| Bağımlılıkları | F2.3; `succeeded` ödeme. |
| Amaç | Yetkili tam/kısmi iade ve retry güvenliği. |
| Dokunulacak mimari alan | Refund service/RBAC. |
| Değişecek dosya türleri | Migration, command handler, adapter, authorization tests. |
| Önce yazılacak test | Toplam refund tahsilatı aşar veya editor çağırırsa provider çağrısı yok. |
| Beklenen kırmızı test | Limit/RBAC/idempotency kaydı yok. |
| Minimum uygulanabilir değişiklik | Refund record, amount_minor, reason, actor, idempotency key, pending state. |
| Yeşil test | Tek yetkili çağrı; timeout retry aynı key; sonucu webhook/retrieve yakınsar. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Step-up/gerekçe/audit; CSRF private UI’da. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Yeni refund creation disable; provider sonucu inbox ile izlenir. |
| Başarı kriteri | Duplicate ve over-refund negative testleri yeşil. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Sandbox refund üretim kanıtı sayılmaz; live pilot faz 7. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Yetkili iade görünür ve izlenebilir olur; çifte iade önlenir. |

### F2.5 — Günlük reconciliation exception job’u

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F2.5 |
| Faz adı | Günlük reconciliation exception job’u |
| Bağımlılıkları | F2.3–F2.4; provider report fixture/API. |
| Amaç | Order↔provider ve provider↔payout farklarını listelemek. |
| Dokunulacak mimari alan | Finance ledger/job. |
| Değişecek dosya türleri | Importer, job, exception model, tests. |
| Önce yazılacak test | Orphan, currency mismatch, duplicate ID ve failed refund exception üretir. |
| Beklenen kırmızı test | Reconciliation modeli yok. |
| Minimum uygulanabilir değişiklik | Kayan pencere importer + exact minor-unit matcher + exception record. |
| Yeşil test | Fixture’daki dört fark doğru sınıflanır; eşleşenler `provider_matched`. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Report tenant/account scoped; banka verisi rol sınırlı. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Job disable; sonuçlar silinmez, manuel export sürer. |
| Başarı kriteri | Aynı pencere rerun duplicate exception oluşturmaz. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Provider report erişimi yoksa `EXTERNAL DEPENDENCY`. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Kullanıcıya yansıyan Günlük reconciliation exception job’u davranışı ölçülebilir ve fail-closed olur. |

### F3.1 — Invoice candidate/allocation modeli

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F3.1 |
| Faz adı | Invoice candidate/allocation modeli |
| Bağımlılıkları | Faz 2 kapısı. |
| Amaç | Yalnız mutabık ödemelerden değişebilir fatura adayı üretmek. |
| Dokunulacak mimari alan | Billing domain. |
| Değişecek dosya türleri | Migration, model, invariant tests. |
| Önce yazılacak test | Unreconciled/currency-mismatch ödeme adaya ayrılamaz. |
| Beklenen kırmızı test | Candidate/allocation yok. |
| Minimum uygulanabilir değişiklik | Candidate, customer snapshot, payment allocation, status. |
| Yeşil test | Allocation toplamı ve currency invariant’ı geçer. |
| API contract kontrolü | API değişikliği yoksa kanıt paketine “API contract etkisi yok” yazılır; varsa DTO allowlist ve şema uyumluluğu test edilir. |
| Güvenlik kontrolü | VKN/TCKN log maskesi ve role scope. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Boş yeni tabloları down; ödeme kaydı değişmez. |
| Başarı kriteri | Aynı payment amount aşırı tahsis edilemez. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Muhasebe alan sözleşmesi; belge türü/vergi/saklama için uzman onayı (LEGAL REVIEW REQUIRED). |
| Yeni faza geçiş kapısı | Migration/test/typecheck. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Muhasebe alan sözleşmesi; belge türü/vergi/saklama için uzman onayı (LEGAL REVIEW REQUIRED). |
| Kullanıcı etkisi | Fatura/belge durumu daha doğru, güvenli ve tekrar üretilebilir olur. |

### F3.2 — Kısmi grup seçimi snapshot’ı

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F3.2 |
| Faz adı | Kısmi grup seçimi snapshot’ı |
| Bağımlılıkları | F3.1. |
| Amaç | Sayfalama/filtre değişse de seçimi deterministik tutmak. |
| Dokunulacak mimari alan | Billing selection service/UI. |
| Değişecek dosya türleri | Selection model, API/UI test. |
| Önce yazılacak test | Filtre değişince kayıtlı selection ID listesi değişmez. |
| Beklenen kırmızı test | UI yalnız current page state tutuyor. |
| Minimum uygulanabilir değişiklik | Batch ID + selected candidate IDs/query snapshot/count. |
| Yeşil test | Tekil/kısmi/tüm filtre seçimi açık count ile çalışır. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Başka tenant candidate ID’si reddedilir. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Batch draft silinebilir; candidate değişmez. |
| Başarı kriteri | Export tam snapshot’tan üretilir. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Tenant politikası, retention, support erişimi ve abonelik kararları (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Cross-tenant negative test. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Tenant politikası, retention, support erişimi ve abonelik kararları (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Kullanıcıya yansıyan Kısmi grup seçimi snapshot’ı davranışı ölçülebilir ve fail-closed olur. |

### F3.3 — Güvenli Excel/CSV export

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F3.3 |
| Faz adı | Güvenli Excel/CSV export |
| Bağımlılıkları | F3.2; muhasebe kolon sözleşmesi. |
| Amaç | Sürümlü muhasebe handoff dosyası üretmek. |
| Dokunulacak mimari alan | Export service. |
| Değişecek dosya türleri | Serializer/template, golden fixture, security test. |
| Önce yazılacak test | `=CMD()` benzeri değer formül olmaz; kolon/tutar/tarih deterministik. |
| Beklenen kırmızı test | Escape/schema/hash yok. |
| Minimum uygulanabilir değişiklik | UTF-8 CSV/XLSX serializer, schema version, file SHA-256. |
| Yeşil test | Golden file ve formula injection testleri geçer. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Yetkili role; süreli tenant link; export audit. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Export template version’ını eskiye al; batch korunur. |
| Başarı kriteri | Muhasebe fixture’ı içe alır; dosya e-belge olarak etiketlenmez. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Muhasebe alan sözleşmesi; belge türü/vergi/saklama için uzman onayı (LEGAL REVIEW REQUIRED). |
| Yeni faza geçiş kapısı | Dış muhasebe kabul kanıtı. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Muhasebe alan sözleşmesi; belge türü/vergi/saklama için uzman onayı (LEGAL REVIEW REQUIRED). |
| Kullanıcı etkisi | Kullanıcıya yansıyan Güvenli Excel/CSV export davranışı ölçülebilir ve fail-closed olur. |

### F3.4 — Dış belge import/duplicate kilidi

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F3.4 |
| Faz adı | Dış belge import/duplicate kilidi |
| Bağımlılıkları | F3.1; izinli format kararı. |
| Amaç | PDF/XML/ETTN’yi adaya güvenle bağlamak. |
| Dokunulacak mimari alan | Invoice import. |
| Değişecek dosya türleri | Upload route, metadata model, duplicate tests. |
| Önce yazılacak test | Aynı tenant+issuer+ETTN ikinci kez ve cross-tenant dosya erişimi reddedilir. |
| Beklenen kırmızı test | Unique/tenant/type kontrolü yok. |
| Minimum uygulanabilir değişiklik | Quarantine reference, ETTN/no/date/type, candidate link, unique constraint. |
| Yeşil test | Duplicate no-op/uyarı; orijinal belge değişmez. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Size/type/magic/XXE/AV; PII loglanmaz. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Import intake kapat; quarantine kayıtlarını retention’a bırak. |
| Başarı kriteri | Issue sonrası in-place edit reddedilir; resend yalnız delivery yaratır. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Muhasebe alan sözleşmesi; belge türü/vergi/saklama için uzman onayı (LEGAL REVIEW REQUIRED). |
| Yeni faza geçiş kapısı | Faz 5 tam tarama gelene kadar `document_ready` verilmez. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Muhasebe alan sözleşmesi; belge türü/vergi/saklama için uzman onayı (LEGAL REVIEW REQUIRED). |
| Kullanıcı etkisi | Fatura/belge durumu daha doğru, güvenli ve tekrar üretilebilir olur. |

### F4.1 — OAuth authorization transaction

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F4.1 |
| Faz adı | OAuth authorization transaction |
| Bağımlılıkları | Paraşüt client/redirect onayı. |
| Amaç | Per-tenant Paraşüt auth-code bağlantısı. |
| Dokunulacak mimari alan | Integration identity/secrets. |
| Değişecek dosya türleri | OAuth route/service, state store, security tests. |
| Önce yazılacak test | State/redirect mismatch ve replay token yazamaz. |
| Beklenen kırmızı test | Callback binding yok. |
| Minimum uygulanabilir değişiklik | Exact redirect, state, one-time transaction, encrypted token reference. |
| Yeşil test | Tek callback tenant bağlantısı kurar; ikinci replay reddedilir. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Password grant yok; code/token loglanmaz; PKCE durumu görünür. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Connector flag kapalı; local token revoke. |
| Başarı kriteri | Test bağlantısı company scope ile doğrulanır. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Paraşüt client/test company, yetki ve resmi contract kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | PKCE/revoke boşluğu yazılı `EXTERNAL DEPENDENCY`. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Paraşüt client/test company, yetki ve resmi contract kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Kullanıcıya yansıyan OAuth authorization transaction davranışı ölçülebilir ve fail-closed olur. |

### F4.2 — Atomik refresh token rotasyonu

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F4.2 |
| Faz adı | Atomik refresh token rotasyonu |
| Bağımlılıkları | F4.1. |
| Amaç | Dönen refresh tokenı kaybetmeden güncellemek. |
| Dokunulacak mimari alan | Secret lifecycle. |
| Değişecek dosya türleri | Token service, concurrency/failure tests. |
| Önce yazılacak test | DB write hata verince eski token kaybolmaz; eşzamanlı refresh tek kazanan. |
| Beklenen kırmızı test | Token overwrite yarışı. |
| Minimum uygulanabilir değişiklik | Version/CAS + encrypted new pair + transaction. |
| Yeşil test | Failure injection ve concurrency testleri geçer. |
| API contract kontrolü | API değişikliği yoksa kanıt paketine “API contract etkisi yok” yazılır; varsa DTO allowlist ve şema uyumluluğu test edilir. |
| Güvenlik kontrolü | Plaintext yalnız process memory; audit’te reference/version. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Connection degraded; manuel reconnect, secret dump yok. |
| Başarı kriteri | Rotasyon sonrası tek aktif version. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Tenant politikası, retention, support erişimi ve abonelik kararları (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | KMS ve recovery runbook kanıtı. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Tenant politikası, retention, support erişimi ve abonelik kararları (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Kullanıcıya yansıyan Atomik refresh token rotasyonu davranışı ölçülebilir ve fail-closed olur. |

### F4.3 — Contact/product mapping

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F4.3 |
| Faz adı | Contact/product mapping |
| Bağımlılıkları | F4.2. |
| Amaç | Müşteri ve hizmeti duplicate yaratmadan eşlemek. |
| Dokunulacak mimari alan | Accounting adapter mapping. |
| Değişecek dosya türleri | Mapping model, Paraşüt client, contract tests. |
| Önce yazılacak test | Timeout sonrası aynı local entity ikinci external create’e kör gitmez. |
| Beklenen kırmızı test | External mapping/operation hash yok. |
| Minimum uygulanabilir değişiklik | tenant+company+type+local/external ID mapping ve canonical request hash. |
| Yeşil test | Get/list sonrası mevcut nesne kullanılır; belirsiz durum exception. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | VKN araması tenant/company scoped ve maskeli log. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Auto-create kapat; manuel mapping. |
| Başarı kriteri | Mapping rerun idempotent davranır. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Paraşüt client/test company, yetki ve resmi contract kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Genel API idempotency yokluğu belgeli. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Paraşüt client/test company, yetki ve resmi contract kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Kullanıcıya yansıyan Contact/product mapping davranışı ölçülebilir ve fail-closed olur. |

### F4.4 — Sales invoice ve e-document job

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F4.4 |
| Faz adı | Sales invoice ve e-document job |
| Bağımlılıkları | F4.3; müşavir onaylı alanlar. |
| Amaç | Faturayı oluşturup inbox’a göre e-Fatura/e-Arşiv job’ı başlatmak. |
| Dokunulacak mimari alan | Billing orchestration. |
| Değişecek dosya türleri | Adapter methods, operation state, contract fixtures. |
| Önce yazılacak test | Inbox registered/unregistered doğru endpoint sınıfını; timeout duplicate exception’ı üretir. |
| Beklenen kırmızı test | Routing/job state yok. |
| Minimum uygulanabilir değişiklik | Sales invoice create, inbox query, e-document create, operation/job ID. |
| Yeşil test | Her fixture doğru route ve `pending` operation kaydı üretir. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Company/tenant mismatch ve tax field allowlist. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Auto-issue kapat; manuel fatura akışına dön, yaratılmış external kayıt korunur. |
| Başarı kriteri | Belirsiz create otomatik tekrarlanmaz. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Paraşüt client/test company, yetki ve resmi contract kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Test company kanıtı; canlı pilot faz 7. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Paraşüt client/test company, yetki ve resmi contract kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Fatura/belge durumu daha doğru, güvenli ve tekrar üretilebilir olur. |

### F4.5 — Throttled job/PDF poller

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F4.5 |
| Faz adı | Throttled job/PDF poller |
| Bağımlılıkları | F4.4. |
| Amaç | 10/10s sınırında job ve PDF hazır oluşunu izlemek. |
| Dokunulacak mimari alan | Queue/rate limiter. |
| Değişecek dosya türleri | Worker, throttle/backoff config, time-based tests. |
| Önce yazılacak test | `204`, `429`, `5xx` bounded reschedule; `4xx` kör retry değil. |
| Beklenen kırmızı test | Tight loop/rate limiter yok. |
| Minimum uygulanabilir değişiklik | Per company token bucket + jitter backoff + terminal job handling. |
| Yeşil test | Sanal saatte limit aşılmaz, max attemptte exception. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Provider PDF URL public payload/loga girmez. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Worker pause; job ID kalıcı, sonra devam. |
| Başarı kriteri | Done→invoice reread→backend download handoff. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | PDF var, XML endpoint yoksa hukuki blokaj görünür. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Kullanıcıya yansıyan Throttled job/PDF poller davranışı ölçülebilir ve fail-closed olur. |

### F5.1 — Quarantine intake ve tür doğrulama

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F5.1 |
| Faz adı | Quarantine intake ve tür doğrulama |
| Bağımlılıkları | F3.4/F4.5. |
| Amaç | Provider/import dosyasını görünmez quarantine’e almak. |
| Dokunulacak mimari alan | Document pipeline. |
| Değişecek dosya türleri | Intake service, parser config, malicious fixtures. |
| Önce yazılacak test | Sahte MIME, oversized, path traversal ve XXE rejected. |
| Beklenen kırmızı test | Content-Type’a güveniliyor veya pipeline yok. |
| Minimum uygulanabilir değişiklik | Random key, size/extension/magic allowlist, XXE-off parser. |
| Yeşil test | Temiz fixture quarantined; zararlı fixture rejected. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Quarantine public/presign rolüne kapalı. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Intake disable; mevcut quarantine retention ile temizlenir. |
| Başarı kriteri | Hiçbir doğrulanmamış dosya download edilemez. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Malware scanner hazır. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Kullanıcıya yansıyan Quarantine intake ve tür doğrulama davranışı ölçülebilir ve fail-closed olur. |

### F5.2 — AV/validation ve metadata

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F5.2 |
| Faz adı | AV/validation ve metadata |
| Bağımlılıkları | F5.1. |
| Amaç | Temiz dosya, schema/imza seviyesini ve hash’i kaydetmek. |
| Dokunulacak mimari alan | Scanner/validator. |
| Değişecek dosya türleri | Worker, metadata model, fixtures. |
| Önce yazılacak test | Malware veya geçersiz XML `verified` olamaz; PDF-only yasal seviye alamaz. |
| Beklenen kırmızı test | Hash/validation-level yok. |
| Minimum uygulanabilir değişiklik | AV result, SHA-256, bytes, MIME, XML/schema/signature status. |
| Yeşil test | Fixture’lar doğru seviyeye ayrılır. |
| API contract kontrolü | API değişikliği yoksa kanıt paketine “API contract etkisi yok” yazılır; varsa DTO allowlist ve şema uyumluluğu test edilir. |
| Güvenlik kontrolü | Scanner timeout fail-closed; dosya içeriği loglanmaz. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Worker pause; quarantine kayıtları korunur. |
| Başarı kriteri | Validation kanıtı olmayan `document_ready` geçişi mümkün değil. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Muhasebe alan sözleşmesi; belge türü/vergi/saklama için uzman onayı (LEGAL REVIEW REQUIRED). |
| Yeni faza geçiş kapısı | GİB güncel schema fixture’ları. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Muhasebe alan sözleşmesi; belge türü/vergi/saklama için uzman onayı (LEGAL REVIEW REQUIRED). |
| Kullanıcı etkisi | Kullanıcıya yansıyan AV/validation ve metadata davranışı ölçülebilir ve fail-closed olur. |

### F5.3 — Immutable versioned storage

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F5.3 |
| Faz adı | Immutable versioned storage |
| Bağımlılıkları | F5.2; retention/WORM kararı. |
| Amaç | Her resmi sürümü overwrite edilmeyen tenant object’e yazmak. |
| Dokunulacak mimari alan | Object storage/document metadata. |
| Değişecek dosya türleri | Storage adapter, policy/IaC, integration tests. |
| Önce yazılacak test | Aynı key overwrite ve cross-tenant get/presign reddedilir. |
| Beklenen kırmızı test | Mutable/shared path. |
| Minimum uygulanabilir değişiklik | tenant/document/version random key, checksum condition, immutable policy. |
| Yeşil test | Eski hash değişmez; yeni revision yeni key. |
| API contract kontrolü | API değişikliği yoksa kanıt paketine “API contract etkisi yok” yazılır; varsa DTO allowlist ve şema uyumluluğu test edilir. |
| Güvenlik kontrolü | Request rolü exact prefix/method; KMS context PII içermez. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Yeni write kapat; immutable objeleri silmeye çalışma. |
| Başarı kriteri | Restore/read checksum doğrular. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Muhasebe alan sözleşmesi; belge türü/vergi/saklama için uzman onayı (LEGAL REVIEW REQUIRED). |
| Yeni faza geçiş kapısı | Retention modu hukuk onayı yoksa governance/minimum güvenli karar. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Muhasebe alan sözleşmesi; belge türü/vergi/saklama için uzman onayı (LEGAL REVIEW REQUIRED). |
| Kullanıcı etkisi | Kullanıcıya yansıyan Immutable versioned storage davranışı ölçülebilir ve fail-closed olur. |

### F5.4 — `document_ready` atomik geçiş ve süreli link

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F5.4 |
| Faz adı | `document_ready` atomik geçiş ve süreli link |
| Bağımlılıkları | F5.3. |
| Amaç | Tüm koşullarla belgeyi hazır edip güvenli indirmek. |
| Dokunulacak mimari alan | Document state/access. |
| Değişecek dosya türleri | State service, download authorization, audit tests. |
| Önce yazılacak test | Eksik XML/AV/audit/storage koşulu ready olamaz; cross-tenant link yok. |
| Beklenen kırmızı test | URL var diye ready oluyor. |
| Minimum uygulanabilir değişiklik | Guarded transaction + exact GET presign/token + download audit. |
| Yeşil test | Tüm koşullarda tek outbox; expired/revoked link reddedilir. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Provider URL, PII ve token log/referrer’da yok. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Link generation disable; immutable belge korunur. |
| Başarı kriteri | Hazır durum yeniden çalıştırmada duplicate bildirim üretmez. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Faz 6 outbox. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Fatura/belge durumu daha doğru, güvenli ve tekrar üretilebilir olur. |

### F6.1 — İzinli event/template registry

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F6.1 |
| Faz adı | İzinli event/template registry |
| Bağımlılıkları | F5.4/domain olayları. |
| Amaç | Yalnız sekiz operasyon olayını ve sürümlü şablonu tanımlamak. |
| Dokunulacak mimari alan | Notification domain. |
| Değişecek dosya türleri | Enum/schema/templates/lint tests. |
| Önce yazılacak test | Bilinmeyen/marketing CTA içeren template build’i bozsun. |
| Beklenen kırmızı test | Allowlist/lint yok. |
| Minimum uygulanabilir değişiklik | Event→template mapping, required variables, content policy. |
| Yeşil test | Sekiz olay geçer; promo fixture reddedilir. |
| API contract kontrolü | API değişikliği yoksa kanıt paketine “API contract etkisi yok” yazılır; varsa DTO allowlist ve şema uyumluluğu test edilir. |
| Güvenlik kontrolü | Secret/card/stack trace değişkenleri şemada yok. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Template version önceki sürüme pinlenir. |
| Başarı kriteri | Her mesaj purpose/template version taşır. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Tenant politikası, retention, support erişimi ve abonelik kararları (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Hukuk şablon incelemesi işaretli. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Tenant politikası, retention, support erişimi ve abonelik kararları (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Kullanıcıya yansıyan İzinli event/template registry davranışı ölçülebilir ve fail-closed olur. |

### F6.2 — Transactional outbox/worker

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F6.2 |
| Faz adı | Transactional outbox/worker |
| Bağımlılıkları | F6.1. |
| Amaç | Domain transaction’ıyla tek idempotent mesaj kuyruğu. |
| Dokunulacak mimari alan | Outbox/queue. |
| Değişecek dosya türleri | Migration, worker, adapter, retry tests. |
| Önce yazılacak test | Aynı event/recipient/template iki kez tek send çağrısı; transient retry bounded. |
| Beklenen kırmızı test | Direct send veya dedupe yok. |
| Minimum uygulanabilir değişiklik | Outbox unique key, status/attempt/next-at, provider adapter. |
| Yeşil test | Crash-after-send simülasyonu duplicate kullanıcı etkisini sınırlar. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Recipient/template vars allowlist; log redaction. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Worker pause; outbox veri kaybetmeden bekler. |
| Başarı kriteri | Domain commit olup mesaj kaybolmaz. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Provider test acceptance; canlı deliverability ayrı. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Kullanıcıya yansıyan Transactional outbox/worker davranışı ölçülebilir ve fail-closed olur. |

### F6.3 — SPF/DKIM/DMARC domain state

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F6.3 |
| Faz adı | SPF/DKIM/DMARC domain state |
| Bağımlılıkları | Provider account/domain. |
| Amaç | Gönderen kimliğini fail-closed doğrulamak. |
| Dokunulacak mimari alan | Email identity. |
| Değişecek dosya türleri | Domain model, DNS verifier, UI/test. |
| Önce yazılacak test | Doğrulanmamış tenant domain From olarak seçilemez. |
| Beklenen kırmızı test | Arbitrary From kabulü. |
| Minimum uygulanabilir değişiklik | DNS pending/verified/degraded/revoked; shared-domain fallback. |
| Yeşil test | Fixture DNS state doğru; revoked fail-closed. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Tenant A, B domainini seçemez; DNS değerinde secret yok. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Shared branded domain’e dön. |
| Başarı kriteri | SPF/DKIM/DMARC evidence time kaydı. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Production DNS doğrulaması. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Bildirim teslimatı izlenir; yanlış alıcı ve spam riski azalır. |

### F6.4 — Delivery webhook ve suppression

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F6.4 |
| Faz adı | Delivery webhook ve suppression |
| Bağımlılıkları | F6.2; provider webhook secret/key. |
| Amaç | Delivery/bounce/complaint durumunu güvenilir kılmak. |
| Dokunulacak mimari alan | Email webhook inbox. |
| Değişecek dosya türleri | Verifier, event mapper, suppression model/tests. |
| Önce yazılacak test | Sahte/duplicate webhook no-op; hard bounce yeniden denenmez. |
| Beklenen kırmızı test | İmza/suppression yok. |
| Minimum uygulanabilir değişiklik | Signed inbox, provider message ID map, reason/category suppression. |
| Yeşil test | Deferred retry; bounce/complaint terminal. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Marketing tercihleri ve operasyon category açık ayrılır; hukuk review. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Webhook intake pause; provider dashboard reconciliation. |
| Başarı kriteri | Tek event tek state transition; audit mevcut. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Live signed webhook kanıtı faz 7. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Bildirim teslimatı izlenir; yanlış alıcı ve spam riski azalır. |

### F7.1 — Pilot veri ve rollback runbook’u

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F7.1 |
| Faz adı | Pilot veri ve rollback runbook’u |
| Bağımlılıkları | Faz 1–6 kapıları. |
| Amaç | Küçük tutar, test müşterisi, roller ve geri alma sınırını tanımlamak. |
| Dokunulacak mimari alan | Operasyon/release. |
| Değişecek dosya türleri | Runbook, checklist, test data manifest. |
| Önce yazılacak test | Eksik owner/refund/contact/on-call alanlı manifest kabul edilmez. |
| Beklenen kırmızı test | Pilot manifest validator/checklist yok. |
| Minimum uygulanabilir değişiklik | Gerekliyse salt-okunur readiness endpoint; asıl çıktı runbook. |
| Yeşil test | Dry-run tüm bağımlılıkları `ready/blocked` verir. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Gerçek kart/vergi/PII fixture’a yazılmaz; erişim sürelidir. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Feature flags kapat, queue drain, provider işlemlerini silme. |
| Başarı kriteri | Finans+muhasebe+security sorumluları imzalı. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Dış servis kanıtları tamam. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Gerçek para/belge akışının kontrollü kanıtı elde edilir. |

### F7.2 — Küçük canlı ödeme→fatura→belge→mail

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F7.2 |
| Faz adı | Küçük canlı ödeme→fatura→belge→mail |
| Bağımlılıkları | F7.1; açık onay ve yasal test alıcısı. |
| Amaç | Tek kontrollü canlı işlemi uçtan uca izlemek. |
| Dokunulacak mimari alan | Yok; kanıt toplama. |
| Değişecek dosya türleri | Evidence record/checklist; üretim kodu değişmez. |
| Önce yazılacak test | Correlation/order/provider/invoice/document/message ID zinciri eksikse pilot başarısız. |
| Beklenen kırmızı test | Canlı kanıt yok. |
| Minimum uygulanabilir değişiklik | Kod yok; gözlemlenebilirlikte eksik correlation varsa en küçük ekleme ayrı mikro-faz olur. |
| Yeşil test | Tek işlem doğru PaymentOrder, belge hash’i ve delivery sonucu üretir. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Public/log/analytics secret/PAN/CVV/PII taraması temiz. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Yetkili refund/iptal; orijinal audit silinmez. |
| Başarı kriteri | Banka/provider ve fatura/belge sonucu eşleşir. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Sandbox değil canlı düşük riskli kanıt. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Fatura/belge durumu daha doğru, güvenli ve tekrar üretilebilir olur. |

### F7.3 — Failure/replay/rollback tatbikatı

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F7.3 |
| Faz adı | Failure/replay/rollback tatbikatı |
| Bağımlılıkları | F7.2. |
| Amaç | Duplicate, timeout, provider down ve mail bounce davranışını doğrulamak. |
| Dokunulacak mimari alan | Test/operasyon. |
| Değişecek dosya türleri | Failure injection tests, incident notes. |
| Önce yazılacak test | Aynı webhook/refund komutu çift finansal yan etki üretmez. |
| Beklenen kırmızı test | Tatbikat kanıtı yok veya açık bulunur. |
| Minimum uygulanabilir değişiklik | Bulgu varsa tek kontrol fix’i ayrı mikro-faz; aksi halde kod yok. |
| Yeşil test | Queue resume/replay yakınsar; data loss yok. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Break-glass/support erişimleri auditli. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Feature flag off, worker pause/resume runbook. |
| Başarı kriteri | Kritik açık yok; kalan risk owner/date ile kabul. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Pilot sign-off; sonra faz 8. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Kullanıcıya yansıyan Failure/replay/rollback tatbikatı davranışı ölçülebilir ve fail-closed olur. |

### F8.1 — Public/private snapshot serializer

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F8.1 |
| Faz adı | Public/private snapshot serializer |
| Bağımlılıkları | Faz 7 kabulü. |
| Amaç | Draft’tan immutable public-safe yayın üretmek. |
| Dokunulacak mimari alan | Form publish/read model. |
| Değişecek dosya türleri | Schema, serializer, snapshot tests. |
| Önce yazılacak test | Secret/internal/provider/admin field seed edilse public JSON’da yok; draft edit yayını değiştirmez. |
| Beklenen kırmızı test | Draft doğrudan servis ediliyor veya allowlist yok. |
| Minimum uygulanabilir değişiklik | Version/hash/public DTO allowlist snapshot. |
| Yeşil test | Golden snapshot temiz ve immutable. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Recursive secret scanner + object/media tenant scope. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Önceki published version pointer’ına atomik dön. |
| Başarı kriteri | Public yalnız explicit alanları görür. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Secret-leak kapısı yeşil. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Anonim form/embed deneyimi güvenli ve erişilebilir hâle gelir. |

### F8.2 — Anonymous submit guard’ları

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F8.2 |
| Faz adı | Anonymous submit guard’ları |
| Bağımlılıkları | F8.1. |
| Amaç | Cookie’siz submitte schema/replay/abuse sınırı. |
| Dokunulacak mimari alan | Public API edge. |
| Değişecek dosya türleri | Validator, limiter, idempotency store, abuse tests. |
| Önce yazılacak test | Unknown field, oversized, replay, disabled/suspended form ve invalid bot token reddedilir. |
| Beklenen kırmızı test | Endpoint serbest payload alıyor. |
| Minimum uygulanabilir değişiklik | Body/field limit, schema allowlist, form quota, idempotency, optional server challenge verify. |
| Yeşil test | Normal submit tek response; dört saldırı no side effect. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Origin yalnız sinyal; admin cookie route ayrı; no secret errors. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Submit feature flag/queue pause; snapshot read açık kalabilir. |
| Başarı kriteri | Downstream maliyet tavanı ve alarmı var. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Muhasebe alan sözleşmesi; belge türü/vergi/saklama için uzman onayı (LEGAL REVIEW REQUIRED). |
| Yeni faza geçiş kapısı | Load/abuse kanıtı. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Muhasebe alan sözleşmesi; belge türü/vergi/saklama için uzman onayı (LEGAL REVIEW REQUIRED). |
| Kullanıcı etkisi | Anonim form/embed deneyimi güvenli ve erişilebilir hâle gelir. |

### F8.3 — Iframe CSP/sandbox/postMessage

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F8.3 |
| Faz adı | Iframe CSP/sandbox/postMessage |
| Bağımlılıkları | F8.1–F8.2; allowed origin. |
| Amaç | CSS/JS izolasyonlu responsive embed. |
| Dokunulacak mimari alan | Embed renderer/headers/SDK. |
| Değişecek dosya türleri | Header policy, embed script, browser security tests. |
| Önce yazılacak test | Yetkisiz parent frame alamaz; `*` message yok; kötü origin resize gönderemez. |
| Beklenen kırmızı test | `frame-ancestors`/origin/source kontrolü yok. |
| Minimum uygulanabilir değişiklik | HTTP CSP, minimal sandbox, nonce/session-bound resize protocol. |
| Yeşil test | Allowlisted parent çalışır; diğerleri engellenir; host CSS etkilemez. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | `allow-scripts+allow-same-origin` risk kombinasyonu yok/kanıtlı. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Embed origin allowlist kapat; public URL çalışır. |
| Başarı kriteri | Browser security suite ve 320px resize yeşil. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Muhasebe alan sözleşmesi; belge türü/vergi/saklama için uzman onayı (LEGAL REVIEW REQUIRED). |
| Yeni faza geçiş kapısı | CSP raporu/secret scan. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Muhasebe alan sözleşmesi; belge türü/vergi/saklama için uzman onayı (LEGAL REVIEW REQUIRED). |
| Kullanıcı etkisi | Anonim form/embed deneyimi güvenli ve erişilebilir hâle gelir. |

### F8.4 — Builder tree ve erişilebilir reorder

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F8.4 |
| Faz adı | Builder tree ve erişilebilir reorder |
| Bağımlılıkları | Snapshot schema. |
| Amaç | Page/container/grid/block ve drag olmayan alternatif. |
| Dokunulacak mimari alan | Builder state/UI. |
| Değişecek dosya türleri | Domain tree, components, keyboard/a11y tests. |
| Önce yazılacak test | Drag ve “öncesine taşı” aynı kanonik ağaç; keyboard focus korunur. |
| Beklenen kırmızı test | Non-drag operation yok. |
| Minimum uygulanabilir değişiklik | Tree move command + handle/drop indicator + move menu. |
| Yeşil test | Mouse/touch/keyboard/non-drag sonuçları eşit. |
| API contract kontrolü | API değişikliği yoksa kanıt paketine “API contract etkisi yok” yazılır; varsa DTO allowlist ve şema uyumluluğu test edilir. |
| Güvenlik kontrolü | Block config schema allowlist; HTML/script injection sanitize. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Advanced move UI kapat; basit up/down kalır. |
| Başarı kriteri | WCAG 2.5.7 manuel+otomatik kanıt. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Desteklenecek tarayıcı/WP/PHP/plugin matrisi ve yayın origin listesi (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Accessibility review. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Desteklenecek tarayıcı/WP/PHP/plugin matrisi ve yayın origin listesi (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Anonim form/embed deneyimi güvenli ve erişilebilir hâle gelir. |

### F8.5 — Autosave/revision/publish conflict

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F8.5 |
| Faz adı | Autosave/revision/publish conflict |
| Bağımlılıkları | F8.4. |
| Amaç | Sessiz overwrite/veri kaybını engellemek. |
| Dokunulacak mimari alan | Draft persistence/versioning. |
| Değişecek dosya türleri | Revision model, save API, UI status tests. |
| Önce yazılacak test | Eski revision save conflict; offline hata görünür; restore yeni revision. |
| Beklenen kırmızı test | Last-write-wins sessiz. |
| Minimum uygulanabilir değişiklik | Revision number/ETag, debounce save, conflict response, status UI. |
| Yeşil test | Concurrent edit veri kaybetmez; publish hash sabit. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Revision tenant/form scoped; unpublished içerik public değil. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Autosave off; explicit save + mevcut revisions korunur. |
| Başarı kriteri | Saving/Saved/Offline/Conflict/Error durumları testli. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Muhasebe alan sözleşmesi; belge türü/vergi/saklama için uzman onayı (LEGAL REVIEW REQUIRED). |
| Yeni faza geçiş kapısı | Recovery/restore testi. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Muhasebe alan sözleşmesi; belge türü/vergi/saklama için uzman onayı (LEGAL REVIEW REQUIRED). |
| Kullanıcı etkisi | Kullanıcıya yansıyan Autosave/revision/publish conflict davranışı ölçülebilir ve fail-closed olur. |

### F8.6 — Form medya alanı ve 16:9 kart

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F8.6 |
| Faz adı | Form medya alanı ve 16:9 kart |
| Bağımlılıkları | Tenant/form object policy. |
| Amaç | Form-scope picker/upload/URL, alt text ve 16:9 crop. |
| Dokunulacak mimari alan | Media service/UI. |
| Değişecek dosya türleri | Storage policy, media model, picker/card components, tests. |
| Önce yazılacak test | Form A, B media liste/get edemez; invalid file quarantine; informative alt boş kalamaz. |
| Beklenen kırmızı test | Global media listesi veya scope yok. |
| Minimum uygulanabilir değişiklik | `form-media`/`app-media` ayrımı, upload/select/URL tabs, aspect/focal/alt. |
| Yeşil test | Cross-form negative, 16:9 visual, alt/decorative akışı. |
| API contract kontrolü | API değişikliği yoksa kanıt paketine “API contract etkisi yok” yazılır; varsa DTO allowlist ve şema uyumluluğu test edilir. |
| Güvenlik kontrolü | SSRF-safe URL import, magic/AV, süreli media URL. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | URL import kapat; mevcut media read-only. |
| Başarı kriteri | Media access matrix ve responsive image testi. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Desteklenecek tarayıcı/WP/PHP/plugin matrisi ve yayın origin listesi (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Faz 8 full typecheck/lint/build/a11y. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Desteklenecek tarayıcı/WP/PHP/plugin matrisi ve yayın origin listesi (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Kullanıcıya yansıyan Form medya alanı ve 16:9 kart davranışı ölçülebilir ve fail-closed olur. |

### F8.7 — WordPress minimum plugin

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F8.7 |
| Faz adı | WordPress minimum plugin |
| Bağımlılıkları | F8.3 embed URL/protocol. |
| Amaç | Secret-free shortcode/block ve güvenli yaşam döngüsü. |
| Dokunulacak mimari alan | WordPress integration. |
| Değişecek dosya türleri | PHP/JS/CSS, plugin metadata, WP integration tests. |
| Önce yazılacak test | Bundle/option/HTML secret scan; admin save capability+nonce; REST permission callback. |
| Beklenen kırmızı test | Plugin/policy yok. |
| Minimum uygulanabilir değişiklik | Header/Update URI, shortcode+block render, conditional assets, safe settings, uninstall guard. |
| Yeşil test | Install/activate/render/deactivate/uninstall; data not deleted by deactivation. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | WPCS/Plugin Check; no API key; exact origin. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Önceki signed/versioned ZIP; DB migration rollback. |
| Başarı kriteri | Desteklenen WP/PHP/theme/multisite matrisi yeşil. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Desteklenecek tarayıcı/WP/PHP/plugin matrisi ve yayın origin listesi (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Production package checksum/release evidence. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Desteklenecek tarayıcı/WP/PHP/plugin matrisi ve yayın origin listesi (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Anonim form/embed deneyimi güvenli ve erişilebilir hâle gelir. |

### F9.1 — Tenant/membership/permission temeli

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F9.1 |
| Faz adı | Tenant/membership/permission temeli |
| Bağımlılıkları | Faz 8; SaaS ürün kararı. |
| Amaç | User’dan ayrı workspace ve explicit permission kurmak. |
| Dokunulacak mimari alan | Identity/authorization. |
| Değişecek dosya türleri | Migration, policy, permission matrix tests. |
| Önce yazılacak test | Viewer export/publish; editor credential/billing; nonmember read reddedilir. |
| Beklenen kırmızı test | Global role/tenant filtresi yok. |
| Minimum uygulanabilir değişiklik | Tenant, Membership, Owner/Admin/Editor/Viewer permission mapping, default deny. |
| Yeşil test | User/resource/operation matrisi geçer. |
| API contract kontrolü | API değişikliği yoksa kanıt paketine “API contract etkisi yok” yazılır; varsa DTO allowlist ve şema uyumluluğu test edilir. |
| Güvenlik kontrolü | Client tenant ID server membership olmadan etkisiz. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | SaaS flag kapalı; tek internal tenant mevcut veriyi taşır. |
| Başarı kriteri | Her request exact tenant+resource policy’den geçer. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Muhasebe alan sözleşmesi; belge türü/vergi/saklama için uzman onayı (LEGAL REVIEW REQUIRED). |
| Yeni faza geçiş kapısı | Authorization negative suite. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Muhasebe alan sözleşmesi; belge türü/vergi/saklama için uzman onayı (LEGAL REVIEW REQUIRED). |
| Kullanıcı etkisi | Çapraz tenant sızıntısı ve yetkisiz destek erişimi azaltılır. |

### F9.2 — RLS ve çapraz katman tenant scope

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F9.2 |
| Faz adı | RLS ve çapraz katman tenant scope |
| Bağımlılıkları | F9.1. |
| Amaç | DB/cache/queue/object/export izolasyonu. |
| Dokunulacak mimari alan | Data platform. |
| Değişecek dosya türleri | Migration/RLS, repository, queue/cache/storage policies, tests. |
| Önce yazılacak test | Tenant A’nın B satır/object/job/cache anahtarına erişimi her operasyon için reddedilir. |
| Beklenen kırmızı test | Unscoped query veya privileged DB role. |
| Minimum uygulanabilir değişiklik | `tenant_id NOT NULL`, composite FK/index, default-deny RLS, tenant-prefixed keys. |
| Yeşil test | Cross-tenant matrix; pool/job context leak yok. |
| API contract kontrolü | API değişikliği yoksa kanıt paketine “API contract etkisi yok” yazılır; varsa DTO allowlist ve şema uyumluluğu test edilir. |
| Güvenlik kontrolü | Runtime rol superuser/owner/BYPASSRLS değil. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | SaaS traffic off; migration veri kopyası ve verified down path. |
| Başarı kriteri | Policy coverage raporu %100 tenant-owned tablo. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Tenant politikası, retention, support erişimi ve abonelik kararları (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Data-loss/restore ve secret-leak testi. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Tenant politikası, retention, support erişimi ve abonelik kararları (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Çapraz tenant sızıntısı ve yetkisiz destek erişimi azaltılır. |

### F9.3 — Per-tenant provider secret zarfı

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F9.3 |
| Faz adı | Per-tenant provider secret zarfı |
| Bağımlılıkları | F9.2; KMS/secret manager. |
| Amaç | Her tenantın Stripe/iyzico/Paraşüt bağlantısını izole etmek. |
| Dokunulacak mimari alan | Integration credentials. |
| Değişecek dosya türleri | Connection model, secret adapter, rotation/audit tests. |
| Önce yazılacak test | Tenant A reference ile B decrypt olmaz; UI/log/export plaintext göstermez. |
| Beklenen kırmızı test | Shared/plain credential. |
| Minimum uygulanabilir değişiklik | Tenant+provider+environment connection, secret reference, encryption context/version. |
| Yeşil test | Encrypt/decrypt/rotate/revoke ve negative context testleri. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | KMS context PII’siz; support secret okuyamaz. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | New connection disable; mevcut encrypted versions korunur. |
| Başarı kriteri | Rotation recovery ve disconnect runbook’u. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Provider tenant account live kanıtı. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Çapraz tenant sızıntısı ve yetkisiz destek erişimi azaltılır. |

### F9.4 — Askıya alma/read-only policy

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F9.4 |
| Faz adı | Askıya alma/read-only policy |
| Bağımlılıkları | F9.1–F9.3; entitlement states. |
| Amaç | Veriyi silmeden yazma ve public submission’ı durdurmak. |
| Dokunulacak mimari alan | Subscription authorization/public gateway. |
| Değişecek dosya türleri | State machine, policy middleware, UI/API tests. |
| Önce yazılacak test | Suspended tenant read/export yapar; create/edit/publish/delete/provider mutation/submit yapamaz. |
| Beklenen kırmızı test | Boolean active tüm erişimi kesiyor veya yazmayı açık bırakıyor. |
| Minimum uygulanabilir değişiklik | `ACTIVE`, `SUSPENDED_READ_ONLY`, `REACTIVATING` policy matrisi; queue quiesce. |
| Yeşil test | Operation matrix ve açık public unavailable sonucu. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Export step-up/audit; askı secret silmez/göstermez. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Önceki entitlement state’e atomik dön; veri migration yok. |
| Başarı kriteri | Askı sırasında yeni yan etki yok, mevcut veri indirilebilir. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Reactivation testleri. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Çapraz tenant sızıntısı ve yetkisiz destek erişimi azaltılır. |

### F9.5 — Reactivation ve geçmiş olay koruması

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F9.5 |
| Faz adı | Reactivation ve geçmiş olay koruması |
| Bağımlılıkları | F9.4. |
| Amaç | Son yayınları atomik açıp eski işleri tekrar oynatmamak. |
| Dokunulacak mimari alan | Entitlement orchestration. |
| Değişecek dosya türleri | Reactivation service, queue tests, audit. |
| Önce yazılacak test | Eski payment/email job’ı yeniden yan etki üretmez; son snapshotlar ya hep ya hiç açılır. |
| Beklenen kırmızı test | Resume tüm queue’yu replay ediyor. |
| Minimum uygulanabilir değişiklik | Provider health gate, snapshot activation transaction, cutoff/checkpoint. |
| Yeşil test | Failure injectionte state read-only kalır; retry güvenli. |
| API contract kontrolü | İlgili endpoint OpenAPI’de `PROPOSED CONTRACT` olarak tanımlanır; request/response, auth, problem+json ve idempotency contract testi alınır. |
| Güvenlik kontrolü | Yalnız Owner/Admin onayı; audit/correlation. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | `SUSPENDED_READ_ONLY`e atomik dön. |
| Başarı kriteri | Aktifleşme sonrası yeni submit alınır, geçmiş duplicate yok. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | E2E tenant reactivation kanıtı. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Sağlayıcı sandbox/canlı hesabı, resmi contract fixture’ı ve hesap capability kanıtı (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Çapraz tenant sızıntısı ve yetkisiz destek erişimi azaltılır. |

### F9.6 — Süreli support erişimi

| Alan | Ayrıntılı mikro-faz sözleşmesi |
|---|---|
| Faz kimliği | F9.6 |
| Faz adı | Süreli support erişimi |
| Bağımlılıkları | F9.1 permission; support policy. |
| Amaç | Parola/session taklidi olmadan denetlenebilir destek. |
| Dokunulacak mimari alan | Support identity/access. |
| Değişecek dosya türleri | Delegation model, UI banner, audit/security tests. |
| Önce yazılacak test | Süresi geçmiş/onaysız/ticketsiz erişim ve credential/billing/delete işlemi reddedilir. |
| Beklenen kırmızı test | Admin impersonation sınırsız. |
| Minimum uygulanabilir değişiklik | Ticket/reason/tenant/resource/expiry/read-only delegated session, gerçek actor logu. |
| Yeşil test | Banner, expiry, revoke ve append-only audit geçer. |
| API contract kontrolü | API değişikliği yoksa kanıt paketine “API contract etkisi yok” yazılır; varsa DTO allowlist ve şema uyumluluğu test edilir. |
| Güvenlik kontrolü | MFA/step-up; müşteri session cookie/parola kopyası yok. |
| Regression kontrolü | Önceki tüm faz testleri zorunludur: mevcut test envanteri → önceki smoke → yeni kırmızı → minimum değişiklik → yeni yeşil → lint/typecheck/build → security/leak → diff/scope → kanıt paketi → sonraki kapı. |
| Migration/rollback kontrolü | Tüm support sessions revoke; normal tenant sessions etkilenmez. |
| Başarı kriteri | Her support access ticket→approval→action zincirinde. |
| Kanıt gerekliliği | Kırmızı/yeşil test çıktısı, önceki smoke, build/lint/typecheck, diff özeti, secret/PII taraması ve rollback sonucu. Tenant politikası, retention, support erişimi ve abonelik kararları (EXTERNAL DEPENDENCY). |
| Yeni faza geçiş kapısı | Security/legal/support sign-off. |
| Blokaj durumu | Dış kanıt/onay gelmeden canlıya geçiş BLOKE; kodlama ancak mock/contract sınırında ilerleyebilir. |
| Dış bağımlılık | Tenant politikası, retention, support erişimi ve abonelik kararları (EXTERNAL DEPENDENCY). |
| Kullanıcı etkisi | Çapraz tenant sızıntısı ve yetkisiz destek erişimi azaltılır. |

## 21. Rollback ve recovery planı

| Faz | Tetikleyici | İlk durdurma | Veri koruma | Reconciliation/recovery | Yeniden açma kapısı |
|---|---|---|---|---|---|
| 1 Ödeme | mismatch, provider timeout, secret/callback ihlali | New checkout kill switch | Order/attempt/provider evidence append-only | Retrieve/report ve manual exceptions | Golden+live smoke+no leak |
| 2 Güvenlik/iade | signature/replay/duplicate/over-refund | Webhook/refund worker pause | Inbox/refund ledger silinmez | Fixed reducer ile replay; provider reconcile | Negative/concurrency tests |
| 3 Manuel fatura | yanlış selection/export/import | Batch seal/revoke | Candidate/payment unchanged; versioned files | Yeni corrected batch; audit relation | Finance sample approval |
| 4 Paraşüt | OAuth refresh race, 429/outage, timeout create | Adapter commands park; polling bütçeli | Command/mapping/job IDs korunur | /me/get/list/job reconcile; blind retry yok | Provider contract and quota smoke |
| 5 Belge | malware/hash/type/canonical eksik | document-ready off; download revoke | Quarantine/original evidence preserve | Re-fetch, rescan, new immutable version | UBL/PDF/hash/access tests |
| 6 Delivery | bounce/complaint/provider outage/wrong recipient | Stream/tenant/provider pause | Intent/attempt/webhook/suppression preserve | Reconcile provider events; revoke links | DNS/webhook/suppression gate |
| 7 Pilot | canlı zincir sapması | Tüm new mutation kill switches | Finans ve artifact kanıtları preserve | Finance+invoice+delivery joint reconciliation | Incident close + owner approval |
| 8 UI/WP | XSS/CSP/origin/cache/plugin conflict | Publish/embed/plugin flag off | Published previous snapshot/ZIP preserved | Purge cache; restore prior snapshot/ZIP | Browser/WP/security matrix |
| 9 SaaS | cross-tenant access/secret/suspend fault | SaaS onboarding off; affected tenant suspend | No destructive delete; audit/keys preserve | Scope audit, rewrap, targeted restore | Full cross-tenant regression |

### Veri tabanı ve artifact rollback ilkeleri

- **DESIGN RECOMMENDATION:** Finansal/e-belge/audit kayıtları silinerek rollback yapılmaz; yeni komutlar durdurulur, yanlış türetilmiş view/state forward-fix ile düzeltilir.
- **DESIGN RECOMMENDATION:** Expand/contract migration kullanılır; app rollback’in DB şemasını geri aldığı varsayılmaz.
- **DESIGN RECOMMENDATION:** Queue/DLQ redrive kör değildir; düzeltme sürümü, idempotency ve seçili message set kanıtıyla yapılır.
- **DESIGN RECOMMENDATION:** Object key immutable ve versioned; “düzeltme” yeni version üretir, eski artifact legal hold/retention’a göre korunur.
- **UNKNOWN:** Hedef RPO/RTO iş etki analiziyle belirlenir; measured restore drill olmadan ilan edilmez.

## 22. Açık sorular ve dış kanıt gereksinimleri

| Öncelik | Soru/kanıt | Sahip | Etiket | Bloke ettiği kapı |
|---:|---|---|---|---|
| P0 | OzelAPP merchant profili için iyzico currency, foreign card, installment, cancel cut-off, Google Pay gateway ve settlement şartları nedir? | iyzico/acquirer | PROVIDER CONFIRMATION REQUIRED | Faz 1/2/7 |
| P0 | iyzico CF V3 golden payload/canonical değerleri, replay/azami retry ve reference uniqueness scope nedir? | iyzico | PROVIDER CONFIRMATION REQUIRED | Webhook production |
| P0 | Exact PCI SAQ/AOC ve embedded/script-protection sorumluluğu nedir? | Acquirer/QSA | EXTERNAL DEPENDENCY | Payment production |
| P0 | Paraşüt state/PKCE/revoke ve refresh reuse/grace davranışı nedir? | Paraşüt | PROVIDER CONFIRMATION REQUIRED | OAuth production |
| P0 | Paraşüt mutation idempotency, 429/Retry-After, timeout/5xx ve duplicate sonucu nedir? | Paraşüt | PROVIDER CONFIRMATION REQUIRED | Invoice automation |
| P0 | İmzalı özgün UBL-TR, zarf ve uygulama/sistem yanıtları hangi exact API/exportla alınır? | Paraşüt/entegratör | PROVIDER CONFIRMATION REQUIRED | document-ready |
| P0 | E-belge cancel/correct/resend’in provider ve hukuki exact runbook’u nedir? | Paraşüt+müşavir/hukuk | LEGAL REVIEW REQUIRED | Cancellation release |
| P0 | Belge türü, KDV/tevkifat/istisna/iade/yurtdışı/döviz/tarih/numara için versiyonlu karar matrisi nedir? | Müşavir/hukuk | LEGAL REVIEW REQUIRED | Faz 3–5 |
| P0 | 14.09.2026 sonrası kullanılacak son GİB package/XSD/code-list hash’leri nedir? | Engineering+finance | EXTERNAL DEPENDENCY | Pilot/go-live |
| P1 | Delivery sağlayıcısı region, DPA, SLA, quota, suppression ve webhook retry sözleşmesi hangisi? | Ops/legal | EXTERNAL DEPENDENCY | Faz 6 |
| P1 | RPO/RTO, backup retention, on-call owner ve incident communication hedefi nedir? | Product/ops | UNKNOWN | Pilot/production |
| P1 | Mevcut kod/test/deployment/veri modelinin keşif sonucu nedir? | Engineering | UNKNOWN | Uygulama başlangıcı |
| P2 | Desteklenecek WP/PHP/browser/builder/cache/security plugin matrisi nedir? | Product/QA | UNKNOWN | Faz 8 release |
| P2 | Tenant membership/retention/suspension/support/export politikası nedir? | Product/legal/security | DEFERRED | Faz 9 |

## 23. Kaynak ledger’i

**Erişim tarihi:** Aksi belirtilmedikçe 3 Eylül 2026. Kaynak başlığı/kurum/URL, desteklediği iddia ve boşluk birlikte tutulmuştur. Güncel tarih/sürüm isteyen her kaynak go-live günü yeniden kontrol edilmelidir.

### Bu araştırmada kritik birincil kaynaklar

| Kaynak | Kurum | URL | Desteklediği konu | Sınır |
|---|---|---|---|---|
| CF Initialize/Retrieve | iyzico | https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation/cf-initialize ve https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation/cf-retrieve | Hosted akış, token, callback-retrieve | Merchant capability/retry değil |
| Webhook | iyzico | https://docs.iyzico.com/en/advanced/webhook ve https://docs.iyzico.com/ek-servisler/webhook | V3 HMAC/canonical/retry | Replay/azami retry boşluk |
| Refund/Reporting/Settlement | iyzico | https://docs.iyzico.com/en/advanced/refund-and-cancel ; /advanced/reporting-service ; /advanced/settlement-files | Refund/cancel/mutabakat yüzeyi | Cut-off/SLA/account şartları boşluk |
| Paraşüt Swagger 4.0.0 | Paraşüt | https://apidocs.parasut.com/swagger.json | OAuth, exact endpointler, 10/10s, job/PDF | Changelog eski; XML/webhook/idempotency yok |
| OAuth Security BCP | IETF | https://www.rfc-editor.org/rfc/rfc9700.html | Exact redirect, state/PKCE, password reject, refresh | Paraşüt capability’sini kanıtlamaz |
| 509 Güncel Tebliğ | GİB | https://ebelge.gib.gov.tr/dosyalar/tebligler/Dipnotlu_Guncel_Sekli_ile_509_Sira_No%27lu_VUK_Genel_Tebligi.pdf | e-Fatura/e-Arşiv, saklama, kapsam | Somut tax opinion değil |
| e-Arşiv v1.18 | GİB | https://ebelge.gib.gov.tr/dosyalar/kilavuzlar/e-Arsiv_Teknik_Kilavuzu_V.1.18.pdf | internet satış, numara/tarih/currency/schema | İşlem seçimi legal review |
| İptal/İtiraz v1.2 | GİB | https://ebelge.gib.gov.tr/dosyalar/kilavuzlar/e-Fatura_Iptal_Ihtar_Itiraz_Bildirim_Kilavuzu_V_1.2.pdf | Ret/iptal/itiraz akışı | Somut süre/kanal legal review |
| Özel Entegrasyon v1.14 | GİB | https://ebelge.gib.gov.tr/dosyalar/kilavuzlar/e-Fatura_Uygulamasi_Ozel_Entegrasyon_Kilavuzu_v1.14.pdf | UBL-TR/GİB merkezi/entegratör | Paraşüt sözleşme zinciri boşluk |
| GİB duyuruları | GİB | https://ebelge.gib.gov.tr/duyurular.html | 2026 paket güncellemeleri | Go-live günü yeniden kontrol |
| SAQ A update/FAQ | PCI SSC | https://blog.pcisecuritystandards.org/important-updates-announced-for-merchants-validating-to-self-assessment-questionnaire-a ve https://blog.pcisecuritystandards.org/faq-clarifies-new-saq-a-eligibility-criteria-for-e-commerce-merchants | SAQ A/script sınırı | Exact SAQ acquirer kararı |
| Google Pay Request/Crypto/Publish | Google | https://developers.google.com/pay/api/web/reference/request-objects ; https://developers.google.com/pay/api/web/guides/resources/payment-data-cryptography ; https://developers.google.com/pay/api/web/guides/test-and-deploy/publish-your-integration | Gateway/DIRECT/ECv2/merchant go-live | PSP capability boşluk |
| Gmail sender guidelines | Google | https://support.google.com/mail/answer/81126?hl=en | SPF/DKIM/DMARC/alignment/bulk | Transactional unsubscribe yorumu dikkat |
| RFC 9457/9110/6585 | IETF | https://www.rfc-editor.org/rfc/rfc9457.html ; https://www.rfc-editor.org/rfc/rfc9110.html ; https://www.rfc-editor.org/rfc/rfc6585.html | Problem details, HTTP, 429 | OzelAPP policy çıkarımı ayrı |
| Transactional outbox/retry/breaker | AWS | https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html ; /retry-backoff.html ; /circuit-breaker.html | Outbox/idempotency/retry/circuit breaker | Product limit sayılarını vermez |
| WordPress Nonces/REST/Header/Uninstall | WordPress | https://developer.wordpress.org/apis/security/nonces/ ; https://developer.wordpress.org/rest-api/extending-the-rest-api/adding-custom-endpoints/ ; https://developer.wordpress.org/plugins/plugin-basics/header-requirements/ ; https://developer.wordpress.org/plugins/plugin-basics/uninstall-methods/ | WP güvenlik/release | Destek matrisi ayrıca test |
| CSP/CORS/postMessage | MDN | https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors ; https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS ; https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage | Embed/browser güven sınırı | Server auth yerine geçmez |

### Geniş kaynak envanteri

**Erişim tarihi:** Aksi belirtilmedikçe 3 Eylül 2026.  
**Not:** URL’ler doğrudan resmi dokümana gider. Canlı dokümanlar go-live öncesi yeniden kontrol edilmelidir.

| # | Kaynak başlığı | Kurum | Doğrudan URL | Kullanılan bölüm/kanıt | Desteklenen karar |
|---:|---|---|---|---|---|
| 1 | Global availability | Stripe | https://stripe.com/global | Supported countries | Türkiye merchant blokajı |
| 2 | Payment Intents | Stripe | https://docs.stripe.com/payments/payment-intents | Overview/best practices | Intent/Checkout/webhook yaklaşımı |
| 3 | PaymentIntent lifecycle | Stripe | https://docs.stripe.com/payments/paymentintents/lifecycle | Status transitions | 3DS/`requires_action`/processing |
| 4 | SetupIntents API | Stripe | https://docs.stripe.com/api/setup_intents | Overview | Gelecekte kullanım credential’ı |
| 5 | Idempotent requests | Stripe | https://docs.stripe.com/api/idempotent_requests | Key behavior | Güvenli mutation retry |
| 6 | Webhooks | Stripe | https://docs.stripe.com/webhooks | Raw-body verify, retry, duplicate, ordering | Event inbox/replay koruması |
| 7 | Refunds | Stripe | https://docs.stripe.com/refunds | Full/partial refund | Refund ledger |
| 8 | Disputes API | Stripe | https://docs.stripe.com/api/disputes | Dispute lifecycle | Ayrı dispute ekseni |
| 9 | API keys | Stripe | https://docs.stripe.com/keys | Test/live/security | Ortam ve secret ayrımı |
| 10 | Supported currencies | Stripe | https://docs.stripe.com/currencies | Minor units | Integer para modeli |
| 11 | Payout reconciliation | Stripe | https://docs.stripe.com/reports/payout-reconciliation | Gross/fee/net/payout | Günlük mutabakat |
| 12 | Express Checkout Element | Stripe | https://docs.stripe.com/elements/express-checkout-element | Wallet/domain availability | Google Pay koşullu sunum |
| 13 | CF Initialize | iyzico | https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation/cf-initialize | Token/form response | Hosted ödeme başlangıcı |
| 14 | CF Retrieve | iyzico | https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation/cf-retrieve | Token retrieve | Callback sonrası kesinlik |
| 15 | 3DS Implementation | iyzico | https://docs.iyzico.com/en/payment-methods/api/3ds/3ds-implementation | Two-step flow | 3DS modeli |
| 16 | Webhook | iyzico | https://docs.iyzico.com/en/advanced/webhook | V3 signature/retries | Webhook doğrulama |
| 17 | Refund and Cancel | iyzico | https://docs.iyzico.com/en/getting-started/preliminaries/api-reference-beta/refund-and-cancel | Full/partial | İade/iptal adapter’ı |
| 18 | Reporting Service | iyzico | https://docs.iyzico.com/en/advanced/reporting-service | Payment/refund reports | Provider mutabakatı |
| 19 | Settlement Files | iyzico | https://docs.iyzico.com/en/advanced/settlement-files | Fee/payout references | Payout/banka eşleşmesi |
| 20 | Error Codes | iyzico | https://docs.iyzico.com/ek-bilgiler/hata-kodlari | Foreign-card/account errors | Capability dış bağımlılığı |
| 21 | Request objects | Google Pay | https://developers.google.com/pay/api/web/reference/request-objects | Tokenization/MerchantInfo | Gateway/direct ve merchant ID |
| 22 | Payment data cryptography | Google Pay | https://developers.google.com/pay/api/web/guides/resources/payment-data-cryptography | ECv2 direct token | Direct PCI/crypto yükü |
| 23 | Web tutorial | Google Pay | https://developers.google.com/pay/api/web/guides/tutorial | `isReadyToPay` | Runtime capability/fallback |
| 24 | Setup | Google Pay | https://developers.google.com/pay/api/web/guides/setup | HTTPS/browser | Güvenli bağlam |
| 25 | Integration checklist | Google Pay | https://developers.google.com/pay/api/web/guides/test-and-deploy/integration-checklist | Test/production | Test canlı kanıt değildir |
| 26 | SAQ A update | PCI SSC | https://blog.pcisecuritystandards.org/important-updates-announced-for-merchants-validating-to-self-assessment-questionnaire-a | Eligibility | Hosted/SAQ sınırı |
| 27 | SAQ A FAQ clarification | PCI SSC | https://blog.pcisecuritystandards.org/faq-clarifies-new-saq-a-eligibility-criteria-for-e-commerce-merchants | Embedded script criterion | Redirect/embedded farkı |
| 28 | FAQ 1280 | PCI SSC | https://www.pcisecuritystandards.org/faqs/1280/ | CVV storage | CVV saklama yasağı |
| 29 | FAQ 1574 | PCI SSC | https://www.pcisecuritystandards.org/faqs/1574 | Sensitive authentication data | Authorization sonrası yasak |
| 30 | Merchant resources | PCI SSC | https://www.pcisecuritystandards.org/merchants | Scope/encryption | SAQ teyidi |
| 31 | Paraşüt API docs | Paraşüt | https://apidocs.parasut.com/ | Auth/rate/resources | v4 yüzeyi |
| 32 | Swagger 4.0.0 | Paraşüt | https://apidocs.parasut.com/swagger.json | OAuth/paths/schemas | Doğrulanmış API akışı |
| 33 | OAuth 2.0 Security BCP, RFC 9700 | IETF | https://www.rfc-editor.org/rfc/rfc9700.html | Redirect/PKCE/password grant | Auth code; password grant reddi |
| 34 | eBelge ana sayfası | GİB | https://ebelge.gib.gov.tr/anasayfa.html | 2026 duyuruları | 14.09.2026 şema kapısı |
| 35 | e-Fatura Mevzuat ve Teknik Mimari | GİB | https://ebelge.gib.gov.tr/efaturamevzuat.html | UBL/uygulama yöntemleri | Yetkili kanal |
| 36 | 509 Tebliğ, güncel dipnotlu metin | GİB | https://ebelge.gib.gov.tr/dosyalar/tebligler/Dipnotlu_Guncel_Sekli_ile_509_Sira_No%27lu_VUK_Genel_Tebligi.pdf | e-Fatura/e-Arşiv/alan/saklama | Hukuki-teknik gereksinimler |
| 37 | 589 No’lu değişiklik | GİB | https://ebelge.gib.gov.tr/dosyalar/tebligler/Vergi_Usul_Kanunu_Genel_Tebligi_%28Sira_No_509%29%27nde_Degisiklik_Yapilmasina_Dair_Teblig_%28Sira_No_589%29.pdf | 31.12.2025 değişiklikleri | Güncel metin kontrolü |
| 38 | e-Arşiv Teknik Kılavuzu v1.18 | GİB | https://ebelge.gib.gov.tr/dosyalar/kilavuzlar/e-Arsiv_Teknik_Kilavuzu_V.1.18.pdf | UBL/PDF/saklama | PDF tek başına yeterli değil |
| 39 | e-Fatura İptal/İtiraz Kılavuzu v1.2 | GİB | https://ebelge.gib.gov.tr/dosyalar/kilavuzlar/e-Fatura_Iptal_Ihtar_Itiraz_Bildirim_Kilavuzu_V_1.2.pdf | Portal/süre | İptal/itiraz workflow |
| 40 | Personal Data Protection Law | KVKK | https://www.kvkk.gov.tr/Icerik/6649/Personal-Data-Protection-Law | Md.4/9/10/12 | Minimizasyon/aktarım/güvenlik |
| 41 | Silme/Yok Etme/Anonimleştirme | KVKK | https://www.kvkk.gov.tr/Icerik/8363/Kisisel-Verilerin-Silinmesi-Yok-Edilmesi-Veya-Anonim-Hale-Getirilmesi | Retention end | Silme politikası |
| 42 | İlke Kararı 2020/966 | KVKK | https://www.kvkk.gov.tr/Icerik/6858/2020-966 | Wrong recipient | Belge linki/alıcı doğrulama |
| 43 | Ticari İletişim Yönetmeliği | Ticaret Bakanlığı | https://kayseri.ticaret.gov.tr/yayinlar/tuketici/ticari-iletisim-ve-ticari-elektronik-iletiler-hakkinda-yonetmelik | Md.6 | Transactional/promosyon sınırı |
| 44 | File Upload Cheat Sheet | OWASP | https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html | Validation/storage/AV | Belge/media güvenliği |
| 45 | Multi-Tenant Security Cheat Sheet | OWASP | https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html | Context/DB/storage/audit | Tenant izolasyonu |
| 46 | Authorization Cheat Sheet | OWASP | https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html | Default deny/every request | Permission modeli |
| 47 | API4 Resource Consumption | OWASP | https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/ | Rate/body/cost | Anonymous abuse |
| 48 | Input Validation Cheat Sheet | OWASP | https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html | Syntax/semantic validation | Public submit |
| 49 | Turnstile server-side validation | Cloudflare | https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ | Single-use/TTL/hostname | Bot token doğrulama |
| 50 | CORS | MDN | https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS | Cross-origin read | CORS auth değil |
| 51 | CSP `frame-ancestors` | MDN | https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors | Header/ancestor | Embed allowlist |
| 52 | iframe | MDN | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe | sandbox | Iframe isolation |
| 53 | Window.postMessage | MDN | https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage | exact origin/source | Resize protocol |
| 54 | WordPress Nonces | WordPress | https://developer.wordpress.org/apis/security/nonces/ | CSRF/not auth | Nonce sınırı |
| 55 | Adding Custom Endpoints | WordPress | https://developer.wordpress.org/rest-api/extending-the-rest-api/adding-custom-endpoints/ | permission callback | REST güvenliği |
| 56 | Plugin Header Requirements | WordPress | https://developer.wordpress.org/plugins/plugin-basics/header-requirements/ | Version/Update URI | Paket/update |
| 57 | Uninstall Methods | WordPress | https://developer.wordpress.org/plugins/plugin-basics/uninstall-methods/ | Deactivate/uninstall | Veri davranışı |
| 58 | WCAG 2.2 Dragging Movements | W3C WAI | https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html | SC 2.5.7 | Non-drag alternatif |
| 59 | WCAG 2.2 Reflow | W3C WAI | https://www.w3.org/WAI/WCAG22/Understanding/reflow.html | SC 1.4.10 | 320px responsive |
| 60 | Labels or Instructions | W3C WAI | https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html | SC 3.3.2 | Alan talimatları |
| 61 | Error Identification | W3C WAI | https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html | SC 3.3.1 | Metinsel hata |
| 62 | Jotform Revision History | Jotform | https://www.jotform.com/help/294-How-to-view-form-revision-history/ | Revisions | UX karşılaştırması |
| 63 | Tally Columns | Tally | https://tally.so/help/columns | Mobile stack | UX karşılaştırması |
| 64 | Google Forms Help | Google | https://support.google.com/docs/answer/6281888?hl=en | Edit/publish | UX karşılaştırması |
| 65 | Google Forms responses | Google | https://support.google.com/docs/answer/2917686?hl=en | Response flow | UX karşılaştırması |
| 66 | Gmail sender guidelines | Google | https://support.google.com/mail/answer/81126?hl=en | SPF/DKIM/DMARC/categories | E-posta kimliği |
| 67 | SPF RFC 7208 | IETF | https://www.rfc-editor.org/info/rfc7208 | Sender authorization | Domain doğrulama |
| 68 | DMARC RFC 7489 | IETF | https://www.rfc-editor.org/info/rfc7489 | Alignment/policy | Domain doğrulama |
| 69 | SendGrid Event Webhook | Twilio | https://www.twilio.com/docs/sendgrid/for-developers/tracking-events/event | Delivery/bounce/deferred | E-posta inbox |
| 70 | Mailgun Events | Sinch | https://documentation.mailgun.com/docs/mailgun/user-manual/events/events | Delivery/failure | E-posta inbox |
| 71 | Postmark Webhooks | ActiveCampaign | https://postmarkapp.com/developer/webhooks/webhooks-overview | Delivery/bounce/complaint | E-posta inbox |
| 72 | SES quotas | AWS | https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas.html | Sandbox/rates | Dinamik rate limit |
| 73 | SES suppression | AWS | https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html | Bounce/complaint | Suppression |
| 74 | Mailchimp Transactional | Mailchimp | https://mailchimp.com/help/about-transactional-email/ | Add-on | Varsayılan seçilmemesi |
| 75 | Mailchimp Transactional pricing | Mailchimp | https://mailchimp.com/pricing/transactional-email/ | Blocks | Maliyet sınırı |
| 76 | PostgreSQL Row Security | PostgreSQL | https://www.postgresql.org/docs/current/ddl-rowsecurity.html | Default deny/bypass | RLS modeli |
| 77 | Secrets Manager best practices | AWS | https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html | KMS/TLS/rotation | Tenant secret’ı |
| 78 | KMS encryption context | AWS | https://docs.aws.amazon.com/kms/latest/developerguide/encrypt_context.html | AAD/audit | Tenant-provider bağlama |
| 79 | S3 Object Lock | AWS | https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html#object-lock-overview | WORM/versioning | Belge değişmezliği |
| 80 | S3 presigned URLs | AWS | https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html | Bearer/time limits | Süreli belge linki |
| 81 | Access Transparency | Google Cloud | https://cloud.google.com/security/products/access-transparency | Ticket/approval/access | Support audit prensibi |

#### Kanıt boşlukları

- OzelAPP’ın kuruluş ülkesi/Stripe hesap uygunluğu ve canlı sözleşmesi.
- iyzico merchant capability’leri, CF AOC/SAQ belgesi, webhook V3 tam canonical string/replay kuralı ve cancel cut-off.
- Paraşüt sandbox, genel idempotency, PKCE, token revoke, e-belge-ready webhook ve imzalı XML indirme sözleşmesi.
- Şirket özelinde GİB senaryo/tevkifat/istisna/numara/tarih/saklama ve iptal/itiraz uygulaması.
- E-posta sağlayıcı fiyat/SLA/region/DPA/dedicated IP ve Yahoo sender kuralının yeniden doğrulanması.
- WordPress özel updater paketi için seçilecek imza/integrity standardı.

## 24. Son öz-denetim raporu

| Kontrol | Sonuç | Kanıt/not |
|---|---|---|
| Tek anonim ürün adı | PASS | Yalnız OzelAPP; gerçek domain/repo/müşteri/account/credential yok. |
| 24 zorunlu üst bölüm | PASS | 1–24 sıralı; ek üst seviye numara yok. |
| Değişmez ana faz sırası | PASS | Bölüm 4 ve 19’da 1→9 korunuyor. |
| PLAN AMENDMENT | PASS | Sıra değişikliği reddedildi; yalnız release kapıları eklendi. |
| Tüm sınıflandırmalar | PASS | CONFIRMED, DESIGN RECOMMENDATION, PROVIDER CONFIRMATION REQUIRED, LEGAL REVIEW REQUIRED, UNKNOWN, EXTERNAL DEPENDENCY, REJECTED, DEFERRED kullanıldı. |
| iyzico her konu | PASS | Bölüm 5’te kaynak, kanıt/boşluk, sınır, risk, test, canlı kapısı, rollback matrisi. |
| Anti-pattern’ler | PASS | Yedi anti-pattern açıkça REJECTED. |
| Paraşüt exact operasyon tablosu | PASS | 11 zorunlu sütun ve resmi exact v4 yolları; eksikler provider confirmation. |
| GİB senaryo tablosu | PASS | 7 zorunlu sütun; vergi görüşü yok; legal review kapıları. |
| PCI/Google Pay | PASS | SAQ/PAN-CVV/hosted/embedded ve gateway-vs-direct/country/device/merchant kanıtı ayrıldı. |
| Transactional sınır | PASS | Marketing/campaign/list DEFERRED; outbox/queue/DLQ/suppression/DNS/provider/bulk kanıtı var. |
| API/modül sözleşmesi | PASS | Tüm endpointler PROPOSED CONTRACT; modül sorumluluk/forbidden/transaction/test/rollback var. |
| Production sınıflandırması | PASS | Hemen/Pilot/Production/SaaS/Daha sonraya ayrıldı. |
| WordPress | PASS | Secret-free; proxy abuse/CSP/CORS/postMessage/nonce/capability/multisite/ZIP/SBOM/rollback var. |
| Mikro-faz exact 20 alan | PASS | 43 mikro-fazın her birinde aynı 20 alan var. |
| Önceki test kapısı | PASS | Bölüm 20’de 10 adım ve tüm önceki testlerin zorunluluğu var. |
| Kaynak güncelliği | PASS WITH GATE | Erişim 2026-09-03; GİB 14.09.2026 geçişi ve go-live revalidation açık. |
| Private key talebi | PASS | Hiçbir gerçek credential istenmedi/yazılmadı. |

### Son karar soruları

| Soru | Yanıt |
|---|---|
| Araştırma mimari karar için yeterli mi? | Evet; DESIGN RECOMMENDATION düzeyinde yeterli. |
| Uygulama başlamaya hazır mı? | Hayır; repo/test discovery UNKNOWN ve P0 kanıtlar eksik. |
| Sağlayıcı kanıtı gerekli mi? | Evet; iyzico webhook/capability/retry ve Paraşüt OAuth/idempotency/UBL/cancel için. |
| Hukuki/mali onay gerekli mi? | Evet; belge türü, vergi, ihracat, iade, süre, iptal/itiraz ve retention için. |
| Canlı credential gerekli mi? | Araştırma/kod için hayır; production gate ve Faz 7 pilot için task-scoped credential ceremony gerekir. |
| Ana blokajlar neler? | PCI scope, merchant capabilities, Paraşüt imzalı UBL-TR erişimi, GİB/müşavir karar matrisi, DNS/provider ve restore/pilot kanıtı. |
| Neler ertelendi? | Marketing/campaign/list, aktif-aktif multi-region ve Faz 9 SaaS/tenant ürünleşmesi. |
| Faz sırası değişti mi? | Hayır; 1→9 aynen korundu. |

RESEARCH STATUS: PARTIAL
