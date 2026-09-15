# 01 — Stripe Derin Araştırması

**Erişim tarihi:** 3 Eylül 2026  
**Kapsam:** Checkout, Payment Element, PaymentIntent, SetupIntent, 3DS/SCA, webhook, idempotency, refund/dispute, test/live, PCI ve Google Pay.

## Doğrudan sonuç

Stripe teknik olarak güçlü bir adapter hedefidir; fakat Türkiye, Stripe’ın güncel “Payments supported countries” listesinde değildir. OzelAPP’ın Stripe-destekli bir ülkede hukuken uygun merchant tüzel kişiliği ve onaylı hesabı kanıtlanmadan üretim Stripe hattı uygulanabilir sayılamaz. Bu durum, Türkiye’ye ödeme gönderilebilen farklı Stripe ürünleriyle karıştırılmamalıdır.

Uygunluk sağlandığında en küçük güvenlik/PCI yüzeyi tam yönlendirmeli Stripe Checkout’tur. Stripe çoğu entegrasyon için Checkout Sessions API ile Payment Element’i önerir; doğrudan PaymentIntent entegrasyonu ancak özel checkout kontrolü gerçekten gerekliyse seçilmelidir. Tarayıcı dönüşü ödeme kanıtı değildir; fulfillment doğrulanmış webhook ve gerekirse provider retrieve sonucuna dayanır.

## Ürünlerin doğru sınırı

| Kavram | Rol | OzelAPP kararı |
|---|---|---|
| Checkout Session | Sepet/oturum ve ödeme yaşam döngüsünü üst seviyede yönetir | MVP için varsayılan |
| Payment Element | Stripe.js kontrollü, birden çok yöntemi sunabilen UI | Embedded UX gerekirse; script güvenliği yüküyle |
| PaymentIntent | Tek ödeme niyeti ve SCA/asenkron durum makinesi | Adapter’ın provider nesnesi; sipariş başına bir adet |
| SetupIntent | Anlık tahsilat olmadan gelecekte kullanım için ödeme credential’ını hazırlar | Yalnız açık iş ihtiyacı/izin varsa; MVP şartı değil |
| `requires_action` | 3DS gibi müşteri aksiyonu gerekir | İç durumda `requires_action`; fulfillment yok |
| `processing` | Sağlayıcı sonucu asenkron tamamlıyor | Bekle; webhook/retrieve ile yakınsa |
| `succeeded` | Provider ödeme niyetini başarılı saydı | Tutar/currency/order eşleşince iç `succeeded` |

## Minimum güvenli Stripe akışı

1. Sunucu ürün/katalog fiyatından `amount_minor` ve ISO currency’yi hesaplar; tarayıcı tutarını güvenmez.
2. İç `PaymentOrder` oluşturulur. Aynı siparişin ağ retry’larında değişmeyen bir idempotency key ile Checkout Session/PaymentIntent oluşturulur.
3. Kart alanları yalnız Checkout/Stripe.js yüzeyindedir; OzelAPP PAN/CVV almaz.
4. 3DS gerekiyorsa Intent `requires_action` olur; kullanıcı aksiyonu tamamlasa bile dönüş URL’si yalnız “sonuç doğrulanıyor” ekranı açar.
5. Webhook raw body, `Stripe-Signature` ve endpoint secret ile doğrulanır; imzasız/eski/tekrar event reddedilir veya no-op olur.
6. Handler hızlı `2xx` döner; doğrulanmış event inbox kaydı bir kuyruğa bırakılır. Stripe sıralama garantisi vermediğinden eksik nesne provider API’den alınır.
7. Provider merchant/account, iç sipariş referansı, tutar ve currency eşleşmeden `succeeded` ve fulfillment yazılmaz.
8. Refund/dispute olayları ayrı finansal kayıtlar üretir; ana ödeme kaydı geçmişi silinmez.
9. Test ve live anahtar, webhook endpoint secret, nesne ve dashboard erişimleri kesin ayrılır.

## İdempotency, webhook ve yeniden oynatma

- Mutasyon çağrılarında iş anlamlı key kullanın: `order:{uuid}:create`, `refund:{uuid}:{attempt}` gibi. Key’i rastgele her retry’da değiştirmek korumayı bozar.
- Stripe imza doğrulaması ham gövde ister. JSON parse/yeniden serialize edilmiş gövde imzayı bozabilir.
- Varsayılan beş dakikalık imza zaman toleransını sıfıra çekmeyin; güvenli saat senkronizasyonu kullanın.
- Event ID unique index’i birinci duplicate savunmasıdır. Aynı nesne+event type farklı event ID ile gelebileceği için ikinci iş-idempotency anahtarı da gerekir.
- Stripe live webhook’ları üç güne kadar tekrar deneyebilir ve sıra garanti etmez. Event’i al, kaydet, hızlı yanıtla, yan etkiyi queue worker’da uygula.

## Refund ve dispute

Tam veya kısmi refund desteklenir; kısmi iadelerin toplamı orijinal tahsilatı aşamaz. Refund isteğinin kabulü ile fonların kesin sonucu ayrılmalı; `refund_requested`, `refund_succeeded`, `refund_failed` gibi alt kayıtlar tutulmalıdır. Dispute/chargeback, refund değildir: ayrı olay, kanıt son tarihi, tutar ve fon hareketi vardır. Yetkili rol, gerekçe, idempotency key ve audit actor olmadan refund çağrısı yapılmamalıdır.

## PCI ve kart verisi sınırı

Checkout/Elements kart verisini OzelAPP sunucusundan uzak tutar; bu PCI sorumluluğunu sıfırlamaz. PCI SSC’nin 1 Nisan 2025’te etkili SAQ A ölçütü, embedded ödeme sayfası için merchant sayfasının script saldırılarına açık olmadığının doğrulanmasını veya compliant PSP’den teyit alınmasını ister. Tam redirect, bu spesifik embedded-script ölçütünün dışında kalır. Nihai SAQ türünü acquirer/payment brand/QSA teyit etmelidir.

OzelAPP log, DB, cache, analytics ve backup’larında full PAN/CVV bulunmamalıdır. Stripe `client_secret` log, URL veya analytics’e yazılmamalıdır. Provider’ın brand/last4 gibi sınırlı metadata’sı ancak açık amaç ve retention ile tutulabilir.

## Resmi kaynak kanıtı

| Kaynak başlığı | Kurum | URL | Bölüm | Desteklediği karar |
|---|---|---|---|---|
| Global availability | Stripe | https://stripe.com/global | Supported countries | Türkiye hesap uygunluğu blokajı |
| Payment Intents | Stripe | https://docs.stripe.com/payments/payment-intents | Overview / best practices | Sipariş başına Intent; client secret güvenliği; webhook |
| PaymentIntent lifecycle | Stripe | https://docs.stripe.com/payments/paymentintents/lifecycle | Status transitions | `requires_action`, `processing`, `succeeded` |
| SetupIntents API | Stripe | https://docs.stripe.com/api/setup_intents | Overview | Gelecekte kullanım için credential hazırlama |
| Idempotent requests | Stripe | https://docs.stripe.com/api/idempotent_requests | Idempotency keys | Güvenli mutation retry |
| Receive Stripe events | Stripe | https://docs.stripe.com/webhooks | Verify, retries, ordering, duplicates | Raw body imza, replay, queue, dedupe |
| Refund and cancel payments | Stripe | https://docs.stripe.com/refunds | Full/partial refunds | İade kayıt modeli |
| Disputes API | Stripe | https://docs.stripe.com/api/disputes | Lifecycle/events | Chargeback’in ayrı süreç olması |
| API keys | Stripe | https://docs.stripe.com/keys | Test/live and key security | Ortam ayrımı ve secret yönetimi |
| SAQ A eligibility clarification | PCI SSC | https://blog.pcisecuritystandards.org/faq-clarifies-new-saq-a-eligibility-criteria-for-e-commerce-merchants | Embedded payment page criterion | Redirect/embedded güvenlik farkı |

## Karar kaydı

**Karar:** Stripe adapter’ı tasarlanacak; üretim aktivasyonu desteklenen ülkede hukuken uygun hesap ve canlı sözleşme kanıtına bağlanacak. Uygunluk sonrası varsayılan akış hosted Checkout/Checkout Sessions olacaktır.  
**Durum:** DEFERRED  
**Bağlı ana faz:** 1; webhook/refund/reconciliation faz 2  
**Bağımlılıklar:** Merchant kuruluş ülkesi, KYC/onboarding, live keys, webhook endpoint, acquirer/SAQ teyidi.  
**Sektörel gerekçe:** Provider erişimi ülke ve merchant uygunluğuna; ödeme kesinliği asenkron provider olaylarına bağlıdır.  
**Kaynak:** Stripe Global Availability, Payment Intents, Webhooks, Refunds, Disputes ve PCI SSC SAQ A kaynakları.  
**Teknik gerekçe:** Adapter modeli ülke blokajını çekirdek sipariş modelinden ayırır; hosted akış kart yüzeyini küçültür.  
**Güvenlik etkisi:** PAN/CVV OzelAPP’a girmez; imza/replay/idempotency kontrolü çift fulfillment riskini azaltır.  
**Maliyet/karmaşıklık:** Orta; Checkout düşük, özel Payment Element daha yüksek script/PCI operasyonu getirir.  
**Yanlış uygulanırsa risk:** Desteklenmeyen merchant faaliyeti, çifte tahsilat/teslim, secret sızıntısı ve PCI kapsam artışı.  
**Minimum uygulanabilir çözüm:** Feature-flagged Stripe adapter; uygunluk yokken kapalı; uygunluk gelince redirect Checkout + webhook inbox.  
**İleride genişletme yolu:** Payment Element, SetupIntent/off-session ve Google Pay yalnız ayrı risk/uygunluk kanıtıyla.

RESEARCH COMPLETE — READY FOR ARCHITECTURE REVIEW
