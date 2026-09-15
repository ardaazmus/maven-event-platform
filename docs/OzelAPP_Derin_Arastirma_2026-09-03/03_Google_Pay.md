# 03 — Google Pay Derin Araştırması

**Erişim tarihi:** 3 Eylül 2026

## Doğrudan sonuç

Google Pay, OzelAPP’ta bağımsız bir tahsilat sağlayıcısı değil Stripe/iyzico veya başka onaylı PSP’nin sunduğu bir cüzdan yeteneği olmalıdır. `PAYMENT_GATEWAY` tokenization modelinde token seçilen PSP’ye gider. `DIRECT`, OzelAPP’ın Google Pay payment token imzasını/expiry’sini doğrulamasını, ECv2 verisini decrypt etmesini, anahtar döndürmesini ve QSA-doğrulamalı PCI programını gerektirir. Bu yük MVP ile orantısızdır; `DIRECT` kullanılmamalıdır.

## Doğru entegrasyon modeli

| Model | Veri yolu | PCI/operasyon etkisi | Karar |
|---|---|---|---|
| `PAYMENT_GATEWAY` | Google Pay → PSP tokenization → PSP tahsilatı | En küçük OzelAPP kart yüzeyi; yine merchant/PSP şartları var | ACCEPTED |
| `DIRECT` | Şifreli kart tokenı → OzelAPP doğrulama/decrypt → processor | Kart verisi, crypto key lifecycle ve QSA doğrulaması | REJECTED (MVP) |

## Merchant ID, domain ve ortam

Production’da geçerli Google merchant yapılandırması, onaylı domain ve chargeable payment method gerekir. PSP’nin ek domain kayıt süreci olabilir; test ve live domain/hesap kaydı ayrı ele alınmalıdır. `TEST` ortamı dummy/non-chargeable yöntem döndürebilir ve canlı tahsilat kanıtı değildir. Merchant adı, origin ve PSP merchant hesabı tutarlı olmalıdır.

## Country/currency/browser/device

Destek statik bir “her yerde görünür” kural değildir. Browser’ın güvenli bağlam/HTTPS gereksinimi, desteklenen cihaz/browser, müşterinin uygun wallet/card’ı, merchant country/currency ve PSP capability’si birlikte belirleyicidir. UI açılışta `isReadyToPay` ve provider capability sonucuna göre butonu gösterir. Google Pay görünmez/başarısızsa standart hosted kart ödeme her zaman fallback kalır. Sabit bir ülke veya cihaz listesi koda gömülmemeli; güncel provider/Google dokümanı ve runtime capability esas alınmalıdır.

## Güvenlik gereksinimleri

- Google Pay payload’ı OzelAPP public form modelinde veya analytics’te tutulmaz.
- Gateway tanımlayıcısı ve provider merchant config yalnız gerekli public yapılandırmayla sınırlandırılır; API secret değildir.
- Tutar/currency OzelAPP sunucusunda hesaplanır ve provider sonucuyla eşleştirilir.
- Test/live merchant, domain, PSP hesabı ve key’ler ayrı tutulur.
- Domain değişikliği deployment checklist’inde yeniden kayıt/doğrulama gerektirir.
- Wallet başarı callback’i fulfillment kanıtı sayılmaz; provider webhook/retrieve belirleyicidir.

## Resmi kaynak kanıtı

| Kaynak başlığı | Kurum | URL | Bölüm | Desteklediği karar |
|---|---|---|---|---|
| Request objects | Google Pay | https://developers.google.com/pay/api/web/reference/request-objects | `TokenizationSpecification`, `MerchantInfo`, `PaymentOptions` | Gateway/direct ayrımı, Merchant ID |
| Payment data cryptography | Google Pay | https://developers.google.com/pay/api/web/guides/resources/payment-data-cryptography | ECv2 direct tokens | Direct decrypt/imza/PCI yükü |
| Web tutorial | Google Pay | https://developers.google.com/pay/api/web/guides/tutorial | `isReadyToPay` | Runtime browser/device uygunluğu |
| Setup | Google Pay | https://developers.google.com/pay/api/web/guides/setup | HTTPS/browser | Güvenli bağlam ve ortam şartı |
| Integration checklist | Google Pay | https://developers.google.com/pay/api/web/guides/test-and-deploy/integration-checklist | Test vs production | Test tokenının canlı kanıt olmaması |
| Express Checkout Element | Stripe | https://docs.stripe.com/elements/express-checkout-element | Wallet availability/domain registration | PSP üzerinden koşullu görünürlük |

## Karar kaydı

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

RESEARCH COMPLETE — READY FOR ARCHITECTURE REVIEW
