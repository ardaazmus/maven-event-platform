# R-10C — First-party piloti ve manuel fatura yolu

**Karar tarihi:** 2026-09-06  
**Durum:** `ACCEPTED / FIRST_PARTY_LIMITED`; global `R-10` release kararı hâlâ `NO-GO`  
**Amaç:** Türkiye’deki şirketimizin kendi merchant akışı ile ileride satılacak SaaS tenant akışını birbirine karıştırmadan, ilk ürün doğrulamasını kontrollü olarak açmak.

## 1. Düzeltmenin özü

Önceki `R-10B` kararı güvenlik açısından doğru biçimde canlı aktivasyonu durdurdu; ancak ilk kullanım hedefi ile gelecekteki SaaS modelini aynı kapıda tuttu. `R-10C` bu kararı geri almaz, iki ayrı kapsam oluşturur:

| Kapsam | Bu aşamadaki karar | Para nereye gider? | Fatura kimin işi? |
|---|---|---|---|
| `first_party` | local/staging kontrollü pilot capability | Şirketimizin kendi onaylı provider merchant hesabına | Muhasebeci kendi muhasebe sisteminde keser; uygulama belgeyi kabul eder, eşleştirir ve gönderir |
| `saas` | Kapalı/ertelenmiş | İleride tenant’ın kendi provider hesabına | Tenant’ın kendi muhasebe veya Paraşüt bağlantısına |

MavenForms, ilk aşamada şirketimizin merchant-of-record ve fatura düzenleyicisi gibi varsayılmayacaktır. Uygulama ödeme siparişini ve güvenli ilişkilendirmeyi yönetir; vergi belgesini muhasebecinin yetkili sistemi üretir. İleride SaaS açıldığında MavenForms son müşteriden tenant adına para toplamaz; yalnız tenant’ın kendi merchant bağlantısını ve abonelik bedelinin platforma, ayrı bir ticari süreç olarak yönetilmesini destekler.

## 2. Şirket bilgilerinin kullanım sınırı

Verilen resmi unvan, adres, vergi dairesi ve vergi numarası yalnız yetkili şirket/merchant onboarding ve fatura profilinin server-side yapılandırma girdisidir. Bu bilgiler:

- public form snapshot’ına, browser DTO’suna, embed koduna, log’a, test fixture’ına veya araştırma MD’sine yazılmaz;
- provider secret, access token, webhook secret, PAN/CVV veya tam alıcı PII ile birlikte tutulmaz;
- uygulama içinde yalnız yetkili admin/accounting rolünün, ihtiyaç duyduğu maskeli görünümle erişebileceği ayrı bir profil alanında tutulur;
- provider onboarding, vergi ve ticaret hukuku açısından muhasebeci/sağlayıcı tarafından ayrıca doğrulanır.

Gerçek şirket değerleri kaynak koda veya bu runbook’a eklenmeyecektir. Kod ve test yalnız redacted/sentetik kimlik kullanır.

## 3. İlk ödeme akışı

İlk teknik aday iyzico Checkout Form/sandbox’dur. Resmi iyzico dokümanı initialize çağrısının `token` ve hosted `paymentPageUrl`/form içeriği döndürdüğünü, sonucun token ile retrieve edilmesi gerektiğini ve callback URL’nin SSL gerektirdiğini belirtir. İyzico webhook’ları ödeme sonucunu server-to-server bildirir; V3 imzası etkinleştirilip doğrulanmadan mutasyon yapılmaz. Bu yüzden browser dönüşü yalnız kullanıcı arayüzü sonucudur.

Akış:

1. Server, yayınlanmış form snapshot’ından fiyatı ve para birimini üretir; browser tutarına güvenmez.
2. `PaymentOrder` oluşturulur; form, published version, workspace ve submission ile bağlanır.
3. İyzico hosted Checkout Form sandbox oturumu server’dan başlatılır. Kart bilgisi MavenForms API’sine girmez.
4. Callback veya kullanıcı dönüşü ödeme kanıtı sayılmaz; server retrieve ve imzalı webhook ile aynı provider/payment referansını, tutarı ve para birimini doğrular.
5. Yalnız doğrulanmış `succeeded/paid` sonucu fatura adayını oluşturur. Pending, failed, refund, cancel ve dispute otomatik başarı değildir.
6. İlk pilot gerçek merchant hesabı, sandbox kimliği, HTTPS callback ve test işlemi redacted kanıtı gelmeden canlıya çıkarılamaz.

Stripe Türkiye’de merchant hesap uygunluğu doğrulanmadan zorunlu ilk sağlayıcı olamaz; Stripe’ın ülke listesi ve hesap açma koşulları ayrıca doğrulanmalıdır. Google Pay tek başına merchant/acquirer değildir: HTTPS, Google merchant kaydı, uygun gateway veya PCI uyumlu direct akış ve production incelemesi gerekir. Bu nedenle ikisi ilk manuel fatura pilotunun ön koşulu yapılmaz.

## 4. Öncelikli manuel fatura akışı

Bu, ilk ürünün ana fatura yoludur; Paraşüt otomasyonu değildir:

```text
payment.succeeded doğrulandı
  -> form submission + encrypted invoice recipient snapshot
  -> muhasebeci dış muhasebe sisteminde faturayı keser
  -> yetkili kullanıcı Invoice Center'da doğru ödeme kaydını seçer
  -> PDF/XML private upload (quarantine)
  -> hash/type/size/AV ve tenant scope kontrolü
  -> payment/submission/invoice eşleştirme önizlemesi
  -> muhasebe veya yetkili reviewer onayı
  -> document_ready
  -> ayrı billing sender ile invoice.ready transactional mail
```

Uygulamanın sorumluluğu:

- Formda fatura için gereken alıcı alanlarını açıkça toplamak ve encrypted snapshot olarak dondurmak.
- Ödemeyi yalnız aynı workspace/form/submission kapsamındaki kayda bağlamak.
- Muhasebecinin kestiği belgeyi yalnız yetkili kullanıcıdan almak; public ziyaretçiye upload, belge listesi veya fatura ekranı açmamak.
- Yüklemeyi private + quarantine durumunda tutmak; tarama/validation/eşleştirme/onay tamamlanmadan indirme veya mail vermemek.
- `document_ready` sonrasında, yalnız snapshot’tan çözülen alıcıya süreli güvenli bağlantı taşıyan ayrı fatura maili üretmek.

Uygulamanın sorumluluğu olmayan işler:

- Vergi oranını veya fatura hukuki niteliğini tahmin etmek.
- Muhasebecinin yerine fatura düzenlemek.
- İade/chargeback’i otomatik kredi notu veya fatura iptali saymak.
- Provider’ın kabul cevabını teslim edildi veya GİB’de resmileşti diye yorumlamak.

## 5. Fatura maili ve form kayıt maili

İki mail aynı provider hesabını kullanabilir; fakat aynı kanal değildir:

- Form kayıt bilgisi: `notification`, form submission olayı, operasyon alıcısı.
- Fatura teslimi: `transactional`, `document_ready` olayı, ayrı `senderProfileId`, billing adresi, template namespace, queue/idempotency ve audit.

Fatura sender’ı ancak manual accounting yolu + yetkili onay + temiz `document_ready` belge + doğrulanmış alıcı snapshot + sağlıklı transactional sender koşulları ile etkinleşir. İlk non-production teslimatı yalnız allowlist test alıcısına yapılır. Pazarlama veya toplu kampanya bu akışa eklenmez.

## 6. R-10C capability matrisi

`src/lib/r10-scope-gate.ts` aynı server-side kararı test edilebilir hale getirir:

| Capability | First-party local/staging | First-party production | SaaS |
|---|---:|---:|---:|
| Manual invoice review | Gerekli workflow + muhasebe onayı varsa | Global R-10 kanıtı olmadan kapalı | Kapalı |
| Payment sandbox | Server-side merchant kimliği + gerçek sandbox kanıtı varsa | Global R-10 kanıtı olmadan kapalı | Kapalı |
| Invoice test delivery | `document_ready` + sağlıklı billing sender + test recipient allowlist | Global R-10 kanıtı olmadan kapalı | Kapalı |
| Live provider mutation | Kapalı | R-10 dış kanıtları tamamlanana kadar kapalı | Kapalı |
| Tenant end-customer payment | Kapalı | First-party release kapsamı dışı | SaaS/BYO fazına ertelenmiş |

Bu kod, gerçek provider kanıtı üretmez ve UI’de buton göstermekle capability açmaz. Sonraki wiring paketinde ödeme worker’ı ve invoice dispatch worker’ı bu kararı server-side çağırmadan mutasyon yapamayacak hale getirilecektir.

## 7. Dış kanıt ve kabul listesi

First-party staging pilotu için gerekenler:

1. Şirket tüzel kişilik/merchant başvurusu ve provider’ın onaylı sandbox/live durumu.
2. İyzico Checkout Form sandbox initialize → retrieve → webhook imza doğrulama test kaydı.
3. HTTPS callback/webhook endpoint’i; replay, duplicate ve idempotency testi.
4. Muhasebecinin manuel fatura kesme ve belge formatı/recipient eşleştirme kabulü.
5. Private upload için AV/quarantine sağlayıcısı veya kontrollü operasyon prosedürü.
6. Yetkili fatura sender domaini, SPF/DKIM/DMARC, suppression ve test alıcısı.
7. TLS/staging, backup/restore ve erişim/audit kanıtı.

Bunlardan biri yoksa sonuç `FIRST_PARTY_LIMITED` veya `BLOCKED` kalır; sentetik test sonucu canlı kanıt yerine geçmez.

## 8. Resmi araştırma dayanakları

- [iyzico Checkout Form initialize/retrieve](https://docs.iyzico.com/en/getting-started/preliminaries/api-reference-beta/payment-methods/checkoutform): hosted form, token, callback ve retrieve sözleşmesi.
- [iyzico webhook](https://docs.iyzico.com/en/advanced/webhook): HTTPS server-to-server bildirim, V3 imza ve retry davranışı.
- [iyzico refund/cancel](https://docs.iyzico.com/en/advanced/refund-and-cancel): cancel ile refund ayrımı ve kısmi refund sınırı.
- [Stripe Global Availability](https://stripe.com/global): merchant ülke uygunluğu.
- [Google Pay production yayınlama](https://developers.google.com/pay/api/web/guides/test-and-deploy/publish-your-integration): gateway/PCI, merchant profile ve production erişim gereği.
- [Google Pay integration checklist](https://developers.google.com/pay/api/web/guides/test-and-deploy/integration-checklist): fraud/3DS, tarayıcı matrisi ve production testleri.
- [PCI SSC SAQ A açıklaması](https://www.pcisecuritystandards.org/faqs/1438/): ödeme sayfası öğelerinin PCI doğrulanmış üçüncü taraftan gelmesi koşulu.
- [Paraşüt API v4](https://apidocs.parasut.com/): OAuth2, company scope, rate limit ve satış faturası/e-belge API yüzeyi.
- [KVKK yurt dışına aktarım](https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim): yabancı provider/posta altyapısı kullanılırken aktarım güvence incelemesi.

Bu runbook vergi, hukuk veya provider onayı değildir; teknik kararları ve eksik dış kanıtları ayırır.
