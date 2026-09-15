# 02 — iyzico Derin Araştırması

**Erişim tarihi:** 3 Eylül 2026  
**Kanıt notu:** Resmi iyzico dokümanları temel akışı doğrular. Merchant’a özel yabancı kart, taksit, para birimi, iptal cut-off ve bazı webhook ayrıntıları sözleşme/hesap üzerinden teyit edilmelidir.

## Doğrudan sonuç

Türkiye’den ödeme alma hedefi için iyzico Checkout Form (CF), ilk pilotun en uygulanabilir hosted yöntemidir. OzelAPP CF’yi sunucuda initialize eder; dönen token/form içeriği veya ödeme sayfasını kullanıcıya sunar. `callbackUrl` sonucu ödeme kanıtı değildir: callback’teki token ile CF sonucu sunucudan retrieve edilmeli ve webhook varsa imza doğrulanmalıdır.

## Minimum güvenli iyzico akışı

1. Sunucu kendi katalog/fiyat kaydından amount, currency ve basket’i üretir; istemci değerlerini doğrular.
2. `PaymentOrder` ile iyzico `conversationId` ilişkilendirilir; Checkout Form server-side initialize edilir.
3. Dönen `token` ve gerekiyorsa ödeme sayfası/form içeriği yalnız kısa ömürlü akışta kullanılır; kart verisi OzelAPP alanlarına girmez.
4. Kullanıcı callback’e döndüğünde sipariş `processing` kalır. Sunucu token ile CF result retrieve eder.
5. Merchant hesabında webhook etkinse `X-IYZ-SIGNATURE-V3` resmi güncel yönteme göre doğrulanır; event dedupe edilir. İmza kanonik veri sırası uygulamadan önce güncel tam doküman/SDK ile kanıtlanmalıdır.
6. Retrieve/webhook verisindeki payment ID, `conversationId`, iç sipariş, amount ve currency eşleşmeden fulfillment yapılmaz.
7. İade/iptal ayrı yetki, gerekçe, idempotency ve audit kaydıyla sunucudan yürütülür; sonuç daha sonra sorgulanır/mutabık edilir.

## Checkout Form, 3DS ve callback

Checkout Form, hosted/sağlayıcı kontrollü kart alanı sağlayarak hassas verinin OzelAPP’a girişini azaltır. 3DS API entegrasyonu iki aşamalıdır; ancak MVP’de ayrı kart formu yerine CF’nin yönettiği akış daha küçük bir saldırı yüzeyi sunar. Callback parametreleri kullanıcı tarayıcısından geçtiği için güvenilir finansal veri değildir. Sağlayıcı retrieve sonucu veya doğrulanmış webhook otoritedir.

## Refund, cancel, taksit ve currency

Resmi iyzico referansı tam/kısmi refund kabiliyetini gösterir. “Cancel” ile “refund”ın hangi gün/settlement kesitinde ayrıldığı ve timeout davranışları merchant sözleşmesine göre doğrulanmalıdır; sabit saat uydurulmamalıdır. Taksit seçenekleri kart BIN’i, anlaşmalı banka, ürün kategorisi, mevzuat ve merchant yeteneğine bağlıdır. Para birimi desteği endpoint/ürün/hesap bazlıdır; bazı dokümanlarda TRY yanında USD/EUR/GBP görünmesi OzelAPP hesabında hepsinin açık olduğunu kanıtlamaz. Yabancı kart kabulü de hesap temsilcisi onayı gerektirebilir.

## Ortak provider adapter sözleşmesi

| Ortak operasyon | Normalize çıktı | Kural |
|---|---|---|
| `createCheckout(order, returnUrl)` | provider reference + redirect/form payload | Amount/currency server-side |
| `retrievePayment(reference)` | normalize status + provider snapshot | Callback sonrası zorunlu |
| `verifyWebhook(rawBody, headers)` | verified provider event | İmzasız event yan etki üretmez |
| `refund(paymentId, amountMinor?, key)` | refund reference/status | Toplam refund sınırı |
| `cancel(paymentId, key)` | cancel status | Capability/settlement şartına bağlı |
| `capabilities(context)` | wallet/currency/installment flags | Merchant ve ortam bazında |

### Provider’a özel alanlar

- iyzico: Checkout Form token/HTML/page URL, `conversationId`, `paymentId`, `paymentTransactionId`, buyer/basket/address, installment, `X-IYZ-SIGNATURE-V3`.
- Stripe: Checkout Session/PaymentIntent/SetupIntent, `client_secret`, `next_action`, Stripe event/dispute ID ve `Stripe-Signature`.
- Google Pay: Ayrı para hareketi sağlayıcısı değil; seçilen PSP’nin capability’si.

Ortak çekirdek provider’ın ham payload’ını public API’ye yansıtmamalıdır. Ham provider snapshot şifreli/sınırlı erişimli audit alanında; normalize order durumu ayrı tutulur.

## Güvenlik ve kanıt boşlukları

- **CONFIRMED:** CF initialize + callback + token ile retrieve modeli.
- **CONFIRMED:** 3DS API iki aşamalıdır; CF kullanımı bunu uygulama yüzeyinden soyutlar.
- **PARTIALLY CONFIRMED:** `X-IYZ-SIGNATURE-V3` vardır; fakat kanonikleştirme ve replay toleransı go-live öncesi güncel tam sayfa/SDK ile doğrulanmalıdır.
- **PARTIALLY CONFIRMED:** Full/partial refund vardır; cancel cut-off hesabı için yazılı kanıt gerekir.
- **EXTERNAL DEPENDENCY:** OzelAPP merchant hesabında yabancı kart, desteklenen currency, taksit, Google Pay ve settlement şartları.
- **UNKNOWN:** Açık resmi sayfadan CF’nin güncel PCI AOC/SAQ uygunluğu doğrulanamadı; iyzico ve acquirer’dan belge alınmalıdır.

## Resmi kaynak kanıtı

| Kaynak başlığı | Kurum | URL | Kullanılan bölüm | Desteklediği karar |
|---|---|---|---|---|
| CF Initialize | iyzico | https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation/cf-initialize | Initialize response/token | Server-side CF başlatma |
| CF Retrieve | iyzico | https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation/cf-retrieve | Retrieve with token | Callback sonrası kesinleştirme |
| 3DS Implementation | iyzico | https://docs.iyzico.com/en/payment-methods/api/3ds/3ds-implementation | Two-step flow | 3DS yaşam döngüsü |
| Webhook | iyzico | https://docs.iyzico.com/en/advanced/webhook | Signature V3 | Origin/imza doğrulama |
| Refund and Cancel | iyzico | https://docs.iyzico.com/en/getting-started/preliminaries/api-reference-beta/refund-and-cancel | Full/partial refund | İade adapter’ı |
| Error codes | iyzico | https://docs.iyzico.com/ek-bilgiler/hata-kodlari | Foreign-card/account messages | Merchant yeteneğinin dış bağımlılık olması |

## Karar kaydı

**Karar:** İlk pilotta iyzico Checkout Form kullanılacak; callback hiçbir zaman tek başına başarı kabul edilmeyecek, retrieve + varsa doğrulanmış webhook ile kesinleşecek.  
**Durum:** ACCEPTED  
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

RESEARCH COMPLETE — READY FOR ARCHITECTURE REVIEW

## 2026-09-03 yeniden doğrulama — HMACSHA256 ve CF endpoint

Resmi iyzico dokümanındaki güncel sayfa yeniden kontrol edildi. CF Initialize endpoint’i `POST /payment/iyzipos/checkoutform/initialize/auth/ecom` olarak, `Authorization: IYZWSv2 <base64>` ve `Content-Type: application/json` ile tanımlanıyor. Authorization imzası için `x-iyzi-rnd + uri.path + request.body` girdisinin `secretKey` ile HMAC-SHA256 özeti, ardından `apiKey`, `randomKey` ve `signature` alanlarının Base64 kodlanması belirtiliyor.

Bu doğrulama yalnız request signing algoritmasını doğrular; merchant hesabının canlı yetkisini, desteklenen currency/taksit/yabancı kart kapsamını veya üretim onayını doğrulamaz. Bu nedenle canlı aktivasyon kapısı aynen korunur.

**Yeni resmi kaynaklar:**

- HMACSHA256 Kimlik Doğrulama: https://docs.iyzico.com/en/getting-started/preliminaries/authentication/hmacsha256-auth
- CF Initialize: https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation/cf-initialize
- Webhook V3: https://docs.iyzico.com/en/advanced/webhook
