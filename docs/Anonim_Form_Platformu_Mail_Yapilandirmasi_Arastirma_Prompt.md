# Anonim Form Platformu — E-posta Yapılandırması Derin Araştırma Promptu

Bu dokümanı bir araştırma görevi olarak kabul et. Aşağıdaki talimatlara göre güncel, kaynaklı, anonim ve uygulamaya dönüştürülebilir bir araştırma hazırla.

## Anonimlik kuralı

Araştırma boyunca gerçek ürün adını, şirket adını, domaini, adresi, vergi bilgisini, kullanıcı adını, gerçek e-posta adresini, API anahtarını, token’ı veya özel proje kimliğini kullanma.

Üründen yalnızca **Anonim Form Platformu** olarak bahset.

Gerçek secret, kişisel veri, ödeme kartı verisi veya provider credential üretme. Örneklerde sentetik değerler kullan.

## Araştırma amacı

Anonim Form Platformu; form oluşturma, sürükle-bırak form builder, form yayınlama, public form, embed/WordPress bağlantısı, katılımcı yanıtları, manuel ödeme takibi, manuel fatura belgesi, provider adapter’ları, workspace/tenant izolasyonu ve transactional outbox altyapısı bulunan bir form uygulamasıdır.

Amaç genel bir mailing veya pazarlama kampanyası ürünü oluşturmak değildir.

Amaç şunları güvenli biçimde sağlayabilmektir:

- Form gönderimi sonrası katılımcıya otomatik operasyonel mail
- Tek bir katılımcıya manuel mail
- Seçilmiş katılımcılara kontrollü toplu mail
- Hazır mail şablonları
- Kullanıcının kendi mail şablonunu oluşturması
- Taslak mail ve şablonları kaydetme
- Şablon sürümleme ve arşivleme
- Önizleme ve test gönderimi
- Gönderim geçmişi ve delivery durumu
- Form maili ile fatura/ödeme mailinin ayrılması
- İleride tenant’ın kendi mail provider’ını kullanabilmesi

## Mevcut teknik bağlam

Uygulama aşağıdaki mimari yaklaşımı kullanır:

- Next.js App Router
- React
- TypeScript
- Bun
- Prisma
- SQLite pilot veritabanı
- Authenticated yönetim paneli
- Workspace/tenant scope
- Server-side API’ler
- Yayınlanmış form snapshot’ı
- Public write-only submission yüzeyi
- Provider-neutral payment adapter’ları
- Encrypted credential envelope
- Private/quarantine document storage
- Transactional outbox
- Email suppression ve delivery-state takibi

Public form yalnızca yayınlanmış snapshot’ın izinli alanlarını ve kayıt oluşturma yüzeyini görmelidir.

Public forma veya browser response’una hiçbir zaman şu bilgiler çıkmamalıdır:

- API key
- Secret
- Token
- Provider credential
- Workspace veya tenant bilgisi
- Internal database ID
- Admin bilgisi
- Fatura yönetim bilgisi
- Başka form veya tenant verisi
- Ham provider yanıtı
- Kart numarası, CVV, PAN veya ödeme sırrı

## Ürün sürüm ve faz sırası

Aşağıdaki ana sıra değiştirilemez:

1. First-party iç kullanım form sistemi
2. First-party online ödeme
3. Manuel fatura
4. Paraşüt/provider değerlendirmesi
5. Belge güvenliği ve document-ready
6. Gerekli transactional delivery
7. Pilot test
8. Form UI/UX geliştirmeleri
9. En son tenant tabanlı SaaS

Ürün sürümleri:

- V1: İç kullanım form ve katılımcı operasyonu
- V2: First-party online ödeme ve manuel fatura
- V3: Paraşüt ve alternatif provider değerlendirmesi
- V4: Tenant’ın kendi ödeme, muhasebe ve mail bağlantılarını kullandığı SaaS

R-10 durumu **NO-GO/BLOCKED** kabul edilmelidir. Gerçek provider, merchant, staging, domain, muhasebe, e-posta ve teslimat kanıtı olmadan production veya canlı gönderim önerme.

Mail özellikleri bu ana sırayı değiştirmemelidir.

## Mail kanalı ayrımı

### A. Form/katılımcı bildirimleri

Bu kanal aşağıdaki mesajları kapsar:

- Yanıtınız alınmıştır
- Katılımınız kaydedilmiştir
- Hoş geldiniz
- Ödemeniz bekleniyor
- Etkinlik bilgileri
- Başvurunuz inceleniyor
- Başvurunuz onaylandı
- Başvurunuz reddedildi
- Yöneticiye yeni yanıt bildirimi

Bu mesajlar `notification` sınıfında değerlendirilmelidir.

### B. Fatura ve ödeme mailleri

Bu kanal aşağıdaki mesajları kapsar:

- Ödemeniz başarıyla alındı
- Faturanız hazırlanıyor
- Faturanız hazırlandı
- Fatura belgeniz güvenli bağlantı ile hazır
- Manuel fatura incelemede
- Fatura gönderimi başarısız

Bu mesajlar `transactional` sınıfında değerlendirilmelidir.

Form bildirimleri ve fatura mailleri aşağıdaki alanlarda ayrı olmalıdır:

- Sender profile
- Template namespace
- Queue
- Suppression scope
- Idempotency key
- Audit log
- Delivery state
- Yetki
- Retention policy

Fatura maili; document-ready, belge güvenliği, yetkili işlem ve ayrı billing sender olmadan gönderilmemelidir.

## Form oluşturma sırasında otomatik mail kurgusu

Form hazırlanırken kullanıcıya açık bir seçim sunulmalıdır:

- Form gönderimi sonrası otomatik mail gönderilsin mi?
- Hangi hazır şablon kullanılacak?
- Kullanıcı kendi konu ve gövde metnini girecek mi?
- Hangi izinli değişkenler kullanılacak?
- Gönderici profili hangisi olacak?
- Test gönderimi yapılacak mı?

Otomatik gönderim sessizce açılmamalıdır. Güvenli varsayılan kapalı olmalı veya açık kullanıcı seçimi zorunlu olmalıdır.

Otomatik mail yalnız başarılı ve kabul edilmiş submission sonrasında kuyruğa alınmalıdır.

Şu durumlarda otomatik mail gönderilmemelidir:

- Submission validation başarısızsa
- Anti-abuse kontrolü reddetmişse
- E-posta alanı yoksa
- E-posta geçersizse
- Alıcı suppression/bounce/complaint durumundaysa
- Template yayınlanmış değilse
- Sender doğrulanmamışsa
- Form veya tenant kapsamı uyuşmuyorsa

Otomatik onay maili fatura, ödeme başarı kanıtı veya pazarlama izni değildir.

## Hazır şablon kütüphanesi

En az şu hazır şablonları araştır ve öner:

- Yanıtınız alınmıştır
- Katılımınız kaydedilmiştir
- Başvurunuz alınmıştır
- Hoş geldiniz
- Ödemeniz bekleniyor
- Etkinlik bilgileri
- Başvurunuz inceleniyor
- Başvurunuz onaylandı
- Başvurunuz reddedildi
- Yönetici bildirimi
- Fatura hazırlanıyor
- Fatura hazırlandı

Her şablon için şunları ver:

- Kullanım amacı
- Tetikleyen olay
- Alıcı
- Message class
- Sender profile
- Kullanılabilecek değişkenler
- Yasak değişkenler
- Varsayılan konu
- Varsayılan gövde
- Plain-text fallback
- Kullanıcının değiştirebileceği alanlar
- Güvenlik uyarısı
- Türkçe örnek içerik

Hazır şablonların zorunlu dayatma değil, güvenli başlangıç şablonu olarak sunulması gerektiğini değerlendir.

## Şablon ve taslak yaşam döngüsü

Aşağıdaki modeli araştır:

```text
draft → published → archived
```

Şu ayrımları kesinleştir:

- Kaydedilebilir taslak
- Yayınlanmış şablon
- Şablon sürümü
- Gönderim anındaki immutable snapshot
- Outbox mesajı
- Provider’a gönderilen normalize içerik
- Delivery event
- Kullanıcıya gösterilen gönderim geçmişi

Gönderilmiş mesajın kullandığı şablon sürümü sonradan değiştirilememeli veya geçmiş kayıt değiştirilmemelidir.

Şablon kapsamı şu sınırlarla değerlendirilmelidir:

- Workspace bazlı
- Form bazlı
- Message class bazlı
- Tenant bazlı
- Fatura şablonları için ayrı namespace

## Merge tag ve veri güvenliği

İzinli değişkenleri sınıflandır:

- Form adı
- Etkinlik adı
- Form açıklaması
- Katılım türü
- Tarih
- Konum
- Kayıt yöntemi
- Sponsorluk açıklaması
- Katılımcı adı
- Katılımcı e-posta adresi
- Telefon
- Şirket
- Ödeme durumu
- Tutar
- Para birimi
- Ödeme tarihi
- Fatura durumu
- Güvenli belge bağlantısı

Kesinlikle açılmaması gerekenleri belirt:

- API key
- Secret
- Token
- Provider raw response
- Kart numarası
- CVV/PAN
- Internal ID
- Workspace ID
- Tenant ID
- Database ID
- Admin e-postası
- Private storage path
- Başka katılımcı bilgisi

Şu tabloyu oluştur:

| Tag | Kaynak | Hassasiyet | Public mailde kullanılabilir mi | Server doğrulaması | Açıklama |
|---|---|---|---|---|---|

HTML sanitize, escaping, script engelleme, remote tracking ve yetkisiz attachment konularını araştır.

## Tekil katılımcıya mail gönderimi

Şu akışı tasarla:

1. Kullanıcı yanıtı açar
2. Katılımcıya mail gönder seçilir
3. Form/submission scope doğrulanır
4. Alıcı server-side bulunur
5. Yayınlanmış şablon seçilir
6. Önizleme gösterilir
7. Hassas alanlar maskelenir
8. Yetkili kullanıcı gönderimi onaylar
9. Outbox job oluşturulur
10. Delivery durumu takip edilir
11. Mail geçmişine kayıt eklenir

Browser’dan recipient, sender, template ownership, ödeme tutarı, fatura durumu veya internal ID alınmaması gerektiğini kanıtla.

Tekil gönderimde idempotency anahtarını değerlendir:

```text
templateVersionId + submissionId + messageClass + eventKind
```

## Seçili toplu katılımcı maili

Toplu gönderim genel kampanya sistemi olarak değil, seçilmiş form katılımcılarına operasyonel bildirim olarak tasarlanmalıdır.

Araştır:

- Satır seçimi
- Server-side filtre ile seçim
- Gönderim öncesi alıcı özeti
- Alıcı snapshot’ı
- Template version snapshot’ı
- Gönderim kapsamı onayı
- Maksimum batch sınırı
- Rate limit
- Queue/job modeli
- Pause/cancel
- Retry
- Dead-letter
- Her alıcı için ayrı sonuç
- Partial success
- Duplicate prevention
- Bounce/complaint sonrası davranış
- Yetkisiz toplu gönderim engeli

Kontrolsüz “tümünü gönder” action’ının risklerini ve gerekli ek kapıları açıkla.

Job state:

```text
pending
queued
sending
completed
partial
cancelled
failed
```

Recipient state:

```text
eligible
suppressed
invalid
queued
sent
accepted
delivered
bounced
complained
failed
retrying
```

## Fatura ve ödeme maili

Mevcut manuel fatura akışını şu sıraya göre araştır:

1. Ödeme doğrulandı
2. Faturanız hazırlanıyor bildirimi
3. Muhasebeci faturayı kendi sisteminde keser
4. Belge sisteme yüklenir
5. Quarantine
6. Güvenlik taraması
7. Katılımcı/ödeme ile eşleştirme
8. Yetkili onayı
9. Document-ready
10. Ayrı billing sender ile manuel gönderim

Fatura mailinde güvenli belge bağlantısı ile attachment seçeneklerini karşılaştır.

Otomatik veya toplu fatura gönderiminin neden ayrı bir risk ve release kararı olması gerektiğini açıkla.

## Provider ve SMTP araştırması

Şu seçenekleri resmi kaynaklarla karşılaştır:

- SMTP
- Amazon SES
- Postmark
- SendGrid
- Mailgun
- Brevo
- Mailchimp Transactional
- Provider-neutral adapter

Her biri için araştır:

- Transactional mail uygunluğu
- Kontrollü toplu operasyonel mail uygunluğu
- API/Webhook desteği
- Bounce/complaint desteği
- Suppression
- Rate limit
- Retry
- SPF/DKIM/DMARC
- Domain doğrulama
- Avrupa veri bölgesi
- Türkiye’den kullanım
- Secret yönetimi
- Test/production ayrımı
- Vendor lock-in
- İşletme doğrulaması
- Gerçek entegrasyon için harici kanıtlar

Provider durumlarını şu değerlerle sınıflandır:

- VERIFIED
- PARTIAL
- UNVERIFIED
- DEFERRED
- EXTERNAL_DEPENDENCY

## Güvenlik tehdit modeli

Şu saldırıları ayrı ayrı analiz et:

- Başka katılımcıya mail gönderme
- Başka formun şablonunu kullanma
- Cross-tenant template erişimi
- Recipient override
- Template ID manipulation
- HTML/script injection
- Header injection
- SSRF
- Open redirect
- Provider secret sızıntısı
- Fatura belgesinin yanlış kişiye gönderilmesi
- Toplu mail abuse
- Rate-limit bypass
- Webhook replay
- Sahte delivery event
- Suppression bypass
- Duplicate mail
- Yetkisiz test gönderimi
- PII leakage
- Loglara tam mail içeriği yazılması

Her tehdit için şu formatı kullan:

- Saldırı senaryosu
- Etki
- Server-side önlem
- Test senaryosu
- Release gate
- Kullanıcıya gösterilecek hata

## Veri modeli

Aşağıdaki varlıkları değerlendir:

- EmailTemplate
- EmailTemplateVersion
- EmailDraft
- EmailMessage
- EmailMessageSnapshot
- EmailBatchJob
- EmailRecipientSnapshot
- EmailSenderProfile
- EmailProviderConnection
- EmailDeliveryEvent
- EmailSuppression
- EmailAuditLog
- FormNotificationConfig

Her alan için yaz:

- Alan adı
- Veri tipi
- Zorunlu/opisyonel
- Tenant/workspace/form scope
- PII durumu
- Encryption gereksinimi
- Public API’ye çıkıp çıkmayacağı
- Retention
- Idempotency
- Audit gereksinimi

## API mimarisi

Aşağıdaki endpoint’leri provider-neutral olarak tasarla:

```text
GET    /api/forms/:id/email-templates
POST   /api/forms/:id/email-templates
PATCH  /api/forms/:id/email-templates/:templateId
POST   /api/forms/:id/email-templates/:templateId/publish
POST   /api/forms/:id/email-templates/:templateId/preview
POST   /api/forms/:id/email-templates/:templateId/test-send

GET    /api/forms/:id/email-messages
POST   /api/forms/:id/submissions/:submissionId/email
POST   /api/forms/:id/email-batches
GET    /api/forms/:id/email-batches/:jobId
POST   /api/forms/:id/email-batches/:jobId/cancel
GET    /api/forms/:id/email-batches/:jobId/recipients

POST   /api/internal/email/provider-events
GET    /api/forms/:id/email-suppressions
```

Her endpoint için belirt:

- Auth
- Role
- Workspace/tenant scope
- Form scope
- Public/private durumu
- Input validation
- Idempotency
- Rate limit
- Hata kodları
- Audit
- PII redaction
- Retry davranışı

Public API ile internal/admin API’yi kesinlikle ayır.

## Kullanıcı deneyimi

Mevcut form builder ve form ayarları ekranına göre şu ekranları tasarla:

- Form oluşturma sırasında otomatik mail seçimi
- Hazır şablon kartları
- “Bu şablon ne işe yarar?” bilgi kartı
- Şablon editörü
- Merge tag seçici
- Preview paneli
- Test gönderimi
- Tekil mail action’ı
- Seçili toplu mail action’ı
- Gönderim geçmişi
- Delivery status
- Suppression açıklaması
- Fatura maili için ayrı ekran

Responsive kurallar:

- Desktop, tablet ve mobilde taşma olmamalı
- Sağ panelde aşağı taşan kontroller görünür olmalı
- Uzun şablon metinleri taşmamalı
- Butonlar ortak tasarım token’larını kullanmalı
- Gönderim aksiyonları yanlışlıkla tetiklenmemeli
- Toplu gönderim onayı erişilebilir olmalı
- Disabled/locked özellikler neden kapalı olduğunu açıklamalı

## 15 dakikalık mikro-faz planı

Her faz en fazla 15 dakika sürmeli ve tek ölçülebilir çıktı üretmelidir.

Her faz için şu alanlar zorunludur:

- Faz ID
- Faz adı
- Ana faza bağlantısı
- Ön koşul
- Tek ölçülebilir çıktı
- Okunacak dosyalar
- Değiştirilebilecek dosyalar
- Önce yazılacak test
- Beklenen RED kanıtı
- En küçük implementation
- Regression testleri
- TypeScript/build/readiness kontrolleri
- Security gate
- Kabul kriterleri
- BLOCKED şartları
- Sonraki faz

Önerilen sıra:

```text
MAIL-00  Kanal ve yetki sözleşmesi
MAIL-01  Template ve draft veri modeli
MAIL-02  Template version ve immutable snapshot
MAIL-03  Merge tag allowlist ve sanitize
MAIL-03A Form oluştururken otomatik onay maili seçimi
MAIL-03B Hazır şablonlar ve görsel yardım kartları
MAIL-04  Template editörü ve preview
MAIL-05  Test-send ayrımı
MAIL-06  Tekil katılımcı maili
MAIL-07  Tekil gönderim idempotency ve audit
MAIL-08  Seçili toplu gönderim job modeli
MAIL-09  Batch cancel/retry/dead-letter
MAIL-10  Suppression, bounce, complaint ve rate-limit
MAIL-11  Form bildirimi ile fatura maili ayrımı
MAIL-12  V1 participant notification gate
MAIL-13  V2 manuel fatura delivery gate
MAIL-14  Provider adapter ve webhook evidence gate
MAIL-15  V4 tenant BYO mail sender sınırı
```

Fazların ana fazlara bağlantısı:

- MAIL-00..05: V1/V2 mimari hazırlık ve form bildirimi
- MAIL-06..10: Transactional delivery altyapısı
- MAIL-11..13: V2 manuel fatura ve document-ready
- MAIL-14: V3 provider değerlendirmesi
- MAIL-15: V4 tenant BYO sender

Her yeni fazdan önce geçmiş fazların tüm testlerinin çalıştığını ve önceki fazın receipt’inin PASS olduğunu zorunlu kapı yap.

## Karar sınıflandırması

Her özelliği şu değerlerden biriyle değerlendir:

- ACCEPTED
- ACCEPTED_WITH_ROUTING
- SIMPLIFIED
- DEFERRED
- BLOCKED
- REJECTED

Şunları ayrı değerlendir:

- Form sonrası otomatik “yanıtınız alınmıştır” maili
- Form sonrası otomatik “katılımınız kaydedilmiştir” maili
- Kullanıcının kendi konu/gövde metnini girmesi
- Hazır mail şablonları
- Şablon kaydetme
- Şablon sürümleme
- Önizleme
- Test gönderimi
- Tekil katılımcı maili
- Seçili toplu katılımcı maili
- Pazarlama kampanyası
- Otomatik fatura maili
- Toplu fatura maili
- Ayrı billing sender
- Tenant’ın kendi mail provider’ı

## Kaynak ve doğruluk kuralları

Resmi ve birincil kaynaklara öncelik ver:

- Provider resmi dokümanları
- RFC dokümanları
- SPF/DKIM/DMARC standartları
- OWASP
- KVKK/GDPR ve ticari ileti kuralları
- Sağlayıcıların resmi webhook, rate-limit, bounce ve suppression belgeleri
- Rakiplerin resmi ürün dokümanları

Her iddiayı şu sınıflardan biriyle işaretle:

- VERIFIED
- INFERENCE
- UNVERIFIED
- EXTERNAL_DEPENDENCY

Mock, synthetic fixture, local test veya provider dokümanı gerçek production kanıtı değildir. Bu ayrımı açıkça koru.

## Beklenen çıktı

Sonucu tek bir Markdown dosyası olarak üret.

Dosya adı:

```text
Anonim_Form_Platformu_Mail_Yapilandirmasi_Uygulama_Arastirmasi.md
```

Çıktı bölümleri:

1. Yönetici özeti
2. Anonimlik ve araştırma sınırları
3. Mevcut mimariye uyarlama
4. Mevcut ve eksik mail yetenekleri
5. Sektör/rakip karşılaştırması
6. Form sonrası otomatik mail modeli
7. Hazır şablon kütüphanesi
8. Özel şablon ve taslak sistemi
9. Merge tag güvenliği
10. Tekil katılımcı maili
11. Seçili toplu mail
12. Fatura/ödeme maili ayrımı
13. SMTP/provider karşılaştırması
14. Güvenlik tehdit modeli
15. Veri modeli
16. API sözleşmeleri
17. UI/UX ekran önerileri
18. 15 dakikalık mikro-fazlar
19. Karar matrisi
20. Test matrisi
21. Release kapıları
22. Açık dış bağımlılıklar
23. Uygulamaya aktarılmaya hazır kararlar
24. Henüz uygulanmaması gerekenler
25. Kaynakça

Kod yazma. Yalnızca gerekli yerlerde TypeScript benzeri pseudocode, veri sözleşmesi ve API şeması öner.

Mevcut ana faz sırasını değiştirme. Genel amaçlı mailing/campaign ürünü önerme. Fatura maillerini form bildirimlerinden ayrı tut. Kaynak bulunamayan bilgileri kesin gerçek olarak yazma.
