# 00 — Yönetici Özeti ve Ana Kararlar

**Tarih:** 3 Eylül 2026  
**Kanıt durumu:** Araştırma tamamlandı; üretim hesabı, sözleşme, sandbox ve canlı servis kanıtları ayrıca gerekir.

## 1. Yönetici özeti

OzelAPP için güvenli en kısa yol; Türkiye’de fiilen açılabilen bir iyzico hesabıyla hosted/Checkout Form tabanlı ödemeyi pilot sağlayıcı yapmak, Stripe adapter’ını ise desteklenen ülkede hukuken uygun hesap varlığı kanıtlanana kadar özellik bayrağı arkasında tutmaktır. Stripe’ın resmi küresel uygunluk listesinde Türkiye yoktur; bu, teknik entegrasyondan önce çözülmesi gereken ticari/hukuki bir blokajdır. Google Pay ilk sürümde doğrudan kart tokenı işlemek yerine yalnız uygun ödeme sağlayıcısının gateway entegrasyonu üzerinden sunulmalıdır.

Ödeme sonucu tarayıcı dönüşünden değil, doğrulanmış webhook ve sağlayıcı sorgusuyla kesinleşmelidir. Kart/PAN/CVV OzelAPP altyapısına hiç girmemeli; webhook’lar imza, zaman toleransı, replay/duplicate koruması ve asenkron işleme ile ele alınmalıdır. `PaymentOrder` ve değişmez bir provider-event günlüğü, iade ve günlük mutabakatın temeli olmalıdır.

Faturalama tarafında OzelAPP ilk aşamada “muhasebeye veri hazırlayan, resmi sonucu izleyen ve belgeyi güvenle aktaran orkestratör” olarak sınırlandırılmalıdır. Paraşüt v4’ün belgelenmiş müşteri/ürün/satış faturası/e-belge iş akışları kullanılabilir; dokümante edilmemiş sandbox, idempotency ve bağlantı iptali davranışları uydurulmamalı, Paraşüt’ten yazılı kanıt alınmalıdır. Vergisel senaryo, tevkifat, istisna, iptal ve saklama politikaları mali müşavir/hukuk incelemesine bağlıdır. GİB’in 14 Eylül 2026 tarihli paket değişikliği nedeniyle pilot öncesi UBL/XSD uyumu yeniden doğrulanmalıdır.

Public form yüzeyi yalnız yayımlanmış, sürümlenmiş bir snapshot görmelidir. Admin API, secret, provider bağlantı kimliği ve dahili ID hiçbir public payload’a konmamalıdır. Iframe güçlü CSS izolasyonu için varsayılan; inline embed ise gölge DOM veya ad alanlı stillerle ayrı bir seçenek olmalıdır. SaaS özellikleri faz 9’a bırakılır; ancak `tenant_id`, tenant-scope sorgu politikası ve secret şifreleme sınırı geri dönüşü pahalı olduğu için veri modeline baştan işlenmelidir.

## 2. OzelAPP ürün bağlamı

Ürün; form oluşturma, yayınlama, anonim yanıt toplama, raporlama, ödeme ve fatura akışını bir araya getirir. Public kullanıcı yalnız yayımlanmış formu görür ve veri yollar. Yönetim ekranları, taslaklar, bağlantılar, secret’lar, webhook ayrıntıları ve dahili hata çıktıları private alandadır. E-posta bir pazarlama ürünü değil, yalnız ödeme/fatura ve zorunlu operasyon olaylarının taşıma kanalıdır.

## 3. Değiştirilemez ana faz sırası

1. OzelAPP Stripe / iyzico / Google Pay ödeme sistemi
2. Ödeme güvenliği, webhook, refund ve reconciliation
3. Manuel fatura sistemi
4. Paraşüt API v4 faturalama
5. Fatura belge güvenliği ve document-ready
6. Zorunlu transactional bildirimler
7. Tüm zincirin pilot testi
8. Genel form sistemi, builder, UI/UX ve responsive geliştirmeler
9. En son SaaS abonelik sistemi

Stripe blokajı sırayı değiştirmez: faz 1 içinde iyzico ile kanıtlanabilir yol tamamlanır; Stripe dalı `EXTERNAL DEPENDENCY` olarak kapalı kalır.

## 4. Araştırma yöntemi

- Birincil kaynak sırası: sağlayıcı/API dokümanı → GİB/KVKK/PCI SSC/IETF/W3C/OWASP → resmi ürün/UX dokümanı.
- Her kritik iddia en az bir doğrudan URL ve erişim tarihiyle kaydedildi.
- Dokümanın söylemediği sandbox, idempotency, hukuki yorum veya ürün erişimi `UNKNOWN`/`EXTERNAL DEPENDENCY` olarak tutuldu.
- Güncel durum gerektiren kaynaklar 3 Eylül 2026’da yeniden kontrol edildi.
- Kod/repo görülmedi; çalışma test veya üretim kanıtı değildir.

## 5. Kaynak listesi

Toplu bibliyografya `KAYNAK_LEDGERI.md` dosyasındadır. Her konu raporu kullanılan kaynak, kurum, URL, erişim tarihi, bölüm ve desteklenen kararı ayrıca içerir.

## 6. Araştırma sonuçları — ana karar tablosu

| Konu | Gerçek | Kaynak | OzelAPP etkisi | Karar | Faz | Blokaj |
|---|---|---|---|---|---|---|
| Stripe uygunluğu | Türkiye resmi desteklenen hesap ülkeleri listesinde yok | [Stripe Global Availability](https://stripe.com/global) | Türkiye merkezli doğrudan Stripe hesabı varsayılamaz | DEFERRED | 1 | Desteklenen ülkede hukuken uygun hesap/sözleşme kanıtı |
| Stripe akışı | Stripe çoğu entegrasyon için Checkout Sessions + Payment Element önerir; Intent yaşam döngüsü ve webhook gerekir | [Payment Intents](https://docs.stripe.com/payments/payment-intents) | Hosted/sağlayıcı kontrollü UI ve server-side sonuç | SIMPLIFIED | 1–2 | Canlı hesap |
| iyzico | Checkout Form hosted/embedded akış, callback sonrası sonuç sorgulama gerektirir | [iyzico Checkout Form](https://docs.iyzico.com/en/payment-methods/checkoutform) | Türkiye pilotu için en uygulanabilir sağlayıcı | ACCEPTED | 1–2 | Merchant/onboarding ve canlı anahtar |
| Google Pay | DIRECT tokenı merchant tarafından doğrulama/decrypt ve PCI yükü getirir | [Google Pay cryptography](https://developers.google.com/pay/api/web/guides/resources/payment-data-cryptography) | Yalnız PSP gateway üzerinden açılmalı | SIMPLIFIED | 1 | Sağlayıcı/merchant/domain uygunluğu |
| PCI | CVV yetkilendirme sonrasında, şifreli olsa bile saklanamaz | [PCI SSC FAQ 1280](https://www.pcisecuritystandards.org/faqs/1280/) | Kart verisi OzelAPP’a hiç girmemeli | ACCEPTED | 1–2 | Acquirer/SAQ doğrulaması |
| Mutabakat | Stripe event sırası garanti etmez ve duplicate olabilir | [Stripe webhooks](https://docs.stripe.com/webhooks) | İdempotent event inbox + durum makinesi gerekir | ACCEPTED | 2 | Provider rapor erişimi |
| Paraşüt v4 | Resmi taban URL v4, oran sınırı 10 istek/10 saniye; e-belge async job’dır | [Paraşüt API](https://apidocs.parasut.com/) | Queue, throttle, polling ve per-tenant OAuth gerekir | ACCEPTED | 4 | Client onayı; bazı davranışlar yazılı teyit |
| e-belge | E-Arşiv temel formatı UBL-TR’dir; PDF tek başına elektronik asıl değildir | [GİB e-Arşiv Teknik Kılavuzu](https://ebelge.gib.gov.tr/dosyalar/kilavuzlar/e-Arsiv_Teknik_Kilavuzu_V.1.18.pdf) | XML asıl, PDF sunum kopyası olarak saklanır | ACCEPTED | 3–5 | Mali/hukuki doğrulama |
| GİB güncelliği | Yeni e-Fatura/e-Arşiv paketleri 14 Eylül 2026’da yürürlüğe girecek şekilde duyuruldu | [GİB eBelge](https://ebelge.gib.gov.tr/anasayfa.html) | Pilot öncesi XSD/kod listesi yeniden doğrulanmalı | ACCEPTED | 4–7 | Zaman duyarlı dış şema |
| Transactional e-posta | Operasyon bildirimi reklam içermediğinde ayrı rejimde değerlendirilebilir; yanlış alıcı veri ihlalidir | [Ticari İletişim Yönetmeliği](https://kayseri.ticaret.gov.tr/yayinlar/tuketici/ticari-iletisim-ve-ticari-elektronik-iletiler-hakkinda-yonetmelik), [KVKK 2020/966](https://www.kvkk.gov.tr/Icerik/6858/2020-966) | Şablonlarda promosyon yok; güvenli süreli link ve alıcı doğrulama | ACCEPTED | 6 | LEGAL REVIEW REQUIRED |
| Embed | CSP `frame-ancestors` izin verilen üst sayfaları belirler ve yalnız HTTP header’da etkilidir | [MDN frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors) | Yayın başına kesin origin allowlist | ACCEPTED | 8 | Müşteri originleri |
| Anonymous submit | Bot tokenı backend’de doğrulanmadıkça koruma sağlamaz | [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) | Rate limit + tek kullanımlı server doğrulaması gerekir | ACCEPTED | 8 | Seçilen anti-abuse sağlayıcısı |
| SaaS | Yetki ve veri kapsamı tenant bağlamında zorlanmalıdır | [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) | `tenant_id` ve policy her erişimde zorunlu | DEFERRED | 9 | SaaS ürün kararı |

## 7. Sektörel doğrular

1. Hosted ödeme sayfası PCI kapsamını azaltabilir, sorumluluğu sıfırlamaz.
2. Tarayıcı “başarılı” ekranı finansal kayıt için otorite değildir.
3. Para tutarı yalnız ISO para birimi + integer minor-unit olarak tutulur; kayan nokta kullanılmaz.
4. Provider event’i değişmez şekilde kaydedilir; iş etkisi idempotent uygulanır.
5. Resmi e-belgede XML/UBL asıl; PDF kullanıcı sunumudur.
6. Public yayın, mutable taslak değil, hash’li/sürümlü snapshot’tır.
7. Tenant secret’ı tarayıcıya, loga, export’a veya destek ekranına açık metin düşmez.

## 8. Önerilen teknik mimari

`PublicFormGateway` yalnız public snapshot ve submit endpoint’ine; `AdminAPI` taslak/yayın/raporlamaya; `PaymentOrchestrator` ortak provider adapter’ına; `BillingOrchestrator` manuel kuyruk ve Paraşüt adapter’ına; `DocumentVault` değişmez XML/PDF nesnelerine; `NotificationOutbox` zorunlu e-postalara erişir. Event inbox/outbox, iş kuyruğu, audit trail ve tenant-scope veri politikası çapraz altyapıdır.

## 9. Ödeme güvenliği sınırları

PAN/CVV kabul edilmez, loglanmaz, export/backup’a girmez. Provider client secret yalnız tarayıcıda gerekli minimum sürede kullanılır. Secret’lar KMS/envelope encryption ile şifreli, sürümlü ve rotasyona hazırdır. Webhook raw body üzerinde imza doğrulanır; event ID tekrarları no-op olur; iş kuyruğu hızlı `2xx` cevabından sonra çalışır.

## 10. Public/private veri ayrımı

Public DTO: yayın kimliği, sürüm, gösterilebilir şema, tema, süreli medya URL’leri ve submit tokenı. Private DTO: tenant/provider bağlantısı, secret, mali alan, admin ID, webhook kaydı, stack trace, taslak, response export bağlantısı. Public ID’ler tahmin edilemez; yine de yetkilendirme yerine kullanılmaz.

## 11. PaymentOrder durum makinesi

`created → requires_action|processing|succeeded|failed|canceled`; `succeeded → partially_refunded|refunded|disputed`; `partially_refunded → partially_refunded|refunded|disputed`. Terminal olmayan olaylarda provider sorgusuyla ileri yönlü yakınsama uygulanır. Ayrıntı `05_PaymentOrder_ve_Mutabakat.md` dosyasındadır.

## 12. Fatura ve belge akışı

Başarılı/mutabık ödeme → fatura hazırlama kaydı → müşteri/kalem doğrulama → manuel export veya Paraşüt gönderimi → async e-belge işi → XML/PDF indirme/doğrulama → hash’li `document_ready` → süreli kullanıcı linki → gönderim/audit. Vergisel alan değişikliği yeni sürüm ve yeniden onay gerektirir.

## 13. Transactional bildirim akışı

Domain olayı → outbox → şablon/politika kontrolü → sağlayıcı gönderimi → delivery/bounce/complaint webhook’u → suppression/retry → audit. Ek dosya yerine tek kullanımlı/süreli belge linki; promosyon içeriği yoktur.

## 14. WordPress ve embed gereklilikleri

Iframe varsayılan izolasyon; publish origin allowlist + `frame-ancestors`; mesajlaşmada kesin origin; responsive yükseklik mesajında nonce/session; WordPress shortcode/blok yalnız public form kimliğini taşır. Plugin secret tutmaz, WordPress nonce yetkilendirme yerine geçmez, uninstall kullanıcı verisini varsayılan olarak silmez.

## 15. Form builder/UI/UX gereklilikleri

Normalize edilmiş form ağacı, container/column/bento layout, keyboard eşdeğeri, autosave revision, undo/redo komut geçmişi, breakpoint önizleme, WCAG 2.2 AA odak/kontrast/hata akışı ve medya scope’u gerekir. Form, istatistik ve yanıtlar tek kalıcı bağlam başlığı altında sekmeli akıştır.

## 16. SaaS’a hazırlık gereklilikleri

Ürünleştirme faz 9’dadır. Buna rağmen her iş kaydı `tenant_id` taşır; tenant-scoped benzersiz indeksler, row/file path policy, per-tenant OAuth bağlantısı, şifreli token zarfı ve audit actor/tenant alanı baştan tasarlanır. OzelAPP tenant müşteri ödemesini kendi hesabında toplamaz.

## 17. Riskli veya hatalı fikirler

- Türkiye şirketinin doğrudan Stripe hesabı açabileceğini varsaymak.
- Google Pay `DIRECT` tokenını MVP’de işlemek.
- CVV’yi şifreleyerek saklamanın uygun olduğunu düşünmek.
- Frontend redirect’ini kesin ödeme sonucu saymak.
- Dokümanda olmayan Paraşüt endpoint/sandbox/idempotency davranışını uydurmak.
- PDF’i resmi e-belgenin tek aslı saymak.
- Transactional şablona pazarlama içeriği eklemek.
- WordPress paketine API secret gömmek.
- Askıya almada tenant verisini silmek veya tüm geçmiş erişimini kapatmak.

## 18. Karar kayıtları

### Ana mimari kararı

**Karar:** Sağlayıcı kontrollü ödeme yüzeyi, idempotent event inbox, fatura orkestrasyonu, değişmez belge kasası ve public/private sınırlarından oluşan katmanlı mimari kullanılacak.  
**Durum:** ACCEPTED  
**Bağlı ana faz:** 1–9 (sıra değişmeden)  
**Bağımlılıklar:** iyzico onboarding; Stripe ülke/hesap uygunluğu; Paraşüt client erişimi; GİB güncel şemaları; e-posta ve anti-abuse sağlayıcısı.  
**Sektörel gerekçe:** Ödeme ve e-belge sistemleri asenkron, tekrar üreten ve dış otoriteye bağlıdır.  
**Kaynak:** Stripe/iyzico/Paraşüt/GİB/PCI SSC/OWASP resmi kaynakları; ayrıntı konu raporlarında.  
**Teknik gerekçe:** Sağlayıcı farklarını adapter’da, tekrarları event inbox’ta, kullanıcı teslimini document-ready sınırında izole eder.  
**Güvenlik etkisi:** Kart verisi ve secret sızıntısı yüzeyi küçülür; tenant ve public sınırı denetlenebilir olur.  
**Maliyet/karmaşıklık:** Orta-yüksek; queue, audit ve secret yönetimi gerekir.  
**Yanlış uygulanırsa risk:** Çifte tahsilat/iade, yanlış fatura, veri ihlali, tenantlar arası erişim.  
**Minimum uygulanabilir çözüm:** Tek iyzico akışı + PaymentOrder/event inbox + manuel fatura + Paraşüt adapter + document vault + tek transactional e-posta sağlayıcısı.  
**İleride genişletme yolu:** Uygunluk kanıtıyla Stripe/Google Pay; faz 9’da tenant bağlantıları ve abonelik.

## 19. 15 dakikalık mikro-faz uygulama planı

Ayrı ve uygulanabilir plan `14_15_Dakikalik_Mikro_Faz_Plani.md` dosyasındadır. Her iş; önce test, beklenen kırmızı, minimum üretim değişikliği, yeşil test, güvenlik kontrolü, rollback, kabul ve kapı içerir.

## 20. Release kapıları

Her ana faz için zorunlu: önceki testlerin geçmesi; yeni davranış testi; güvenlik kontrolü; veri kaybı olmaması; public secret-leak testi; typecheck/lint/build; gerekli dış servis kanıtı. Sandbox/mock, canlı kanıt yerine geçmez. Kanıt yoksa kapı `EXTERNAL DEPENDENCY` olarak kapalıdır.

## 21. Dış bağımlılıklar

- Stripe desteklenen ülke ve merchant sözleşmesi.
- iyzico merchant kabulü, aktif ürünler, para birimi/taksit/uluslararası kart yetkileri.
- Google Pay gateway ve production merchant/domain onayı.
- PCI SAQ kapsamının acquirer/QSA ile teyidi.
- Paraşüt client kimliği, redirect URI, yetkiler ve belgelenmemiş sandbox/idempotency/revoke davranışları.
- Mali müşavir/hukuk tarafından GİB senaryo, tevkifat, istisna, saklama ve iptal doğrulaması.
- E-posta sağlayıcısı bölge/DPA/domain doğrulaması; WordPress dağıtım kanalı.

## 22. Açık sorular

1. OzelAPP’ın hukuki merchant ülkesi ve Stripe için uygun desteklenen ülke tüzel kişiliği var mı?
2. iyzico sözleşmesinde yurtdışı kart, para birimi, taksit ve Google Pay hangi kombinasyonlarda açık?
3. Paraşüt production client/onay süreci, test hesabı, idempotency ve token iptali için yazılı yanıt nedir?
4. Faturayı hukuken kim düzenleyecek; hangi e-belge senaryoları/tevkifat/istisnalar kapsanacak?
5. Belge ve yanıtlar için ülke/bölge, retention ve silme yükümlülüğü nedir?
6. Public form abuse eşiği ve dosya yükleme limitleri nelerdir?
7. Faz 9’da destek personelinin tenant verisine erişim için onay ve kayıt politikası nedir?

## 23. Son karar

Ana faz sırası uygulanabilir; ancak “Stripe Türkiye’den doğrudan alınır” varsayımı mevcut resmi uygunlukla uyuşmaz. İlk üretim hattı iyzico-hosted ödeme, güvenilir webhook/mutabakat, manuel fatura ve doğrulanmış Paraşüt/GİB akışı üzerinden kurulmalı; Stripe ve Google Pay uygunluk kanıtı gelene kadar koşullu kalmalıdır. SaaS özellikleri son fazdadır, fakat tenant/secret sınırı baştan modellenmelidir.

RESEARCH COMPLETE — READY FOR ARCHITECTURE REVIEW
