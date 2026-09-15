# 04 — PCI DSS ve Ödeme Güvenliği Derin Araştırması

**Erişim tarihi:** 3 Eylül 2026  
**Amaç:** OzelAPP’ın kart verisi kapsamını küçülten, denetlenebilir kuralları sınıflandırmak.

## SAQ A ve hosted ödeme

SAQ A, kart sahibi verisi fonksiyonlarını doğrulanmış üçüncü tarafa tamamen dış kaynaklayan ve kendi elektronik sistemlerinde CHD/SAD saklamayan, işlemeyen veya iletmeyen uygun e-ticaret merchant’ları içindir. Hosted/redirect yaklaşımı güçlü bir kapsam azaltma aracıdır; “PCI sorumluluğu yok” anlamına gelmez. Embedded iframe/payment element kullanılırsa PCI SSC’nin 2025 SAQ A uygunluk güncellemesi merchant sayfasının script saldırılarına açık olmadığını doğrulama veya compliant sağlayıcıdan teyit ister. Nihai validasyon yolunu acquirer/payment brand belirler.

## Normatif kontrol matrisi

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

## Secret management ve encryption

Secret’lar kod deposu/config bundle/veritabanı açık alanında değil, KMS/Vault kontrollü bir secret store’da tutulmalıdır. Uygulama yalnız runtime kimliğiyle ihtiyaç duyduğu provider/tenant secret’ını decrypt eder. Her şifreli kayıtta `key_version`, tenant/provider, created/rotated/revoked time bulunur. Key rotasyonu dual-read/new-write penceresiyle ve geri alma planıyla yapılır. TLS 1.2+ alt sınırı provider gereksinimleriyle doğrulanır; sertifika doğrulama kapatılmaz.

Şifreleme kapsamı ortadan kaldırmaz: decrypt edebilen veya key yöneten sistemler kapsamda kalır. Bu nedenle asıl kontrol gereksiz kart verisini hiç almamaktır.

## Webhook ve abuse güvenliği

1. Endpoint yalnız HTTPS ve sınırlı method/body size kabul eder.
2. Raw body limiti aşılırsa parse öncesi reddedilir.
3. Provider imzası constant-time doğrulanır; timestamp toleransı ve NTP izlenir.
4. `provider + account + event_id` unique constraint ile event inbox’a yazılır.
5. Hızlı `2xx`; iş kuyruğunda idempotent state transition.
6. Sırasız event’te provider nesnesi retrieve edilir; geriye durum düşürme yoktur.
7. IP allowlist yalnız ek katmandır; imzanın yerine geçmez.
8. Rate limit saldırganı değil provider retry’ını cezalandırmayacak şekilde provider/account bazlıdır.

## Log, audit, erişim ve yedek

Uygulama logu allowlist olmalı; request header/body’nin körlemesine loglanması yasaktır. API key, authorization header, webhook signature, Checkout token/client secret, PAN/CVV redaction testleri bulunmalıdır. Audit log; aktör, tenant, eylem, hedef, önce/sonra hash’i, zaman, request correlation ve gerekçeyi taşır; değiştirilemez/append-only tutulur. Refund ve secret görüntüleme/rotasyon için step-up authentication ve ayrık rol gerekir.

Backup’lar da aynı veri sınıflandırmasına tabidir. “Uygulama saklamıyor” iddiası log, crash dump, queue dead letter, APM ve backup taramasıyla kanıtlanmalıdır. Restore testi yalnız geri dönüşü değil, hassas verinin geri gelmediğini de doğrular.

## Güvenlik test kanıtı

| Risk | Senaryo | Koruma | Beklenen test kanıtı | Öncelik |
|---|---|---|---|---|
| CVV/PAN sızıntısı | Request/APM/backup kart alanı tutar | Hosted fields + allowlist logs + DLP scan | Seed edilen test marker’ı hiçbir store’da yok | P0 |
| Replay | Geçerli webhook tekrar gönderilir | Timestamp + event unique + iş idempotency | İkinci istek no-op, tek finansal yan etki | P0 |
| Sahte webhook | İmza yok/bozuk | Raw-body signature verify | `4xx`, durum değişmez | P0 |
| Secret leak | Public form/bundle/error API key döndürür | DTO allowlist + secret scanner | Snapshot/bundle/response taraması temiz | P0 |
| Yetkisiz refund | Editor iade dener | RBAC + step-up + audit | `403`, provider çağrısı yok | P0 |
| Key kaybı/rotasyon | Eski key devreden çıkar | Versioned envelope key + dual read | Eski kayıt okunur, yeni yazı yeni key | P1 |
| Backup sızıntısı | Log/queue dump sensitive marker içerir | Retention + redaction + scan | Backup DLP kontrolü temiz | P1 |

## Resmi kaynak kanıtı

| Kaynak başlığı | Kurum | URL | Kullanılan bölüm | Karar |
|---|---|---|---|---|
| SAQ A updates | PCI SSC | https://blog.pcisecuritystandards.org/important-updates-announced-for-merchants-validating-to-self-assessment-questionnaire-a | Eligibility criteria | SAQ A sınırı |
| FAQ clarifies SAQ A | PCI SSC | https://blog.pcisecuritystandards.org/faq-clarifies-new-saq-a-eligibility-criteria-for-e-commerce-merchants | Embedded scripts | Tam redirect/embedded farkı |
| FAQ 1280 | PCI SSC | https://www.pcisecuritystandards.org/faqs/1280/ | CVV storage | CVV MUST NOT |
| FAQ 1574 | PCI SSC | https://www.pcisecuritystandards.org/faqs/1574 | Sensitive authentication data | Authorization sonrası yasak |
| Merchant resources | PCI SSC | https://www.pcisecuritystandards.org/merchants | Scope/encryption | SAQ teyidi ve encryption sınırı |
| Stripe webhooks | Stripe | https://docs.stripe.com/webhooks | Signature, replay, duplicate, ordering | Webhook kontrol seti |
| OAuth 2.0 Security BCP | IETF | https://www.rfc-editor.org/rfc/rfc9700.html | Token/redirect/client security | Secret/token yaşam döngüsü |

## Karar kaydı

**Karar:** OzelAPP kart verisini tamamen sağlayıcı kontrollü yüzeye dış kaynaklayacak; SAQ A hedeflenecek fakat uygunluk acquirer/QSA kanıtına bağlanacak.  
**Durum:** ACCEPTED  
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

RESEARCH COMPLETE — READY FOR ARCHITECTURE REVIEW
