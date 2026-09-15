# MavenForms Toplu E-posta Teslim Edilebilirlik ve Mail Platformları Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Her `MAIL-*` paketi en fazla 15 dakikalık tek bir çıktı ve ayrı doğrulama kapısıdır.

**Goal:** Ödeme, fatura ve entegrasyon akışlarının ihtiyaç duyduğu transactional/operasyonel iletileri doğru sınıflandırarak SPF/DKIM/DMARC, izin, unsubscribe, bounce/complaint suppression, rate limit, güvenli provider entegrasyonu ve izlenebilir teslimatı sağlamak. Pazarlama e-postası bu platformun ana ürünü değildir.

**Architecture:** Bu belge bir teslimat alt sistemidir; ürün önceliğini belirlemez. MavenForms üç ayrı mesaj sınıfı ve üç ayrı gönderim kuyruğu kullanır: zorunlu transactional (fatura/ödeme/form sonucu), operasyonel notification ve izinli marketing. Form kayıt bilgi e-postaları `notification` kanalında; fatura teslimat e-postaları `transactional` kanalında ayrı sender profile, template namespace, queue/idempotency ve audit sınırıyla çalışır. Tek provider hesabı kullanılması bu izolasyonu kaldırmaz. Mailchimp Marketing ile Mailchimp Transactional aynı ürün kabul edilmez; transactional gönderim ayrı sağlayıcı hesabı/akışı, pazarlama listesi ayrı izin ve unsubscribe akışı kullanır. Provider adapter’ları ortak sözleşme ve outbox üzerinden çalışır; provider başarı cevabı inbox teslimatı anlamına gelmez. Ödeme/fatura domain’i `DeliveryIntent` üretmeden bu belge canlı gönderim akışı başlatamaz.

Ödeme/fatura mesajlarının gönderen ve provider kapsamı da evreye göre ayrılır: ilk release’te MavenForms first-party merchant akışı, SaaS evresinde ise tenant-scoped provider ve sender profile kullanılır. MavenForms abonelik faturası tenant müşterisine ait fatura akışıyla aynı kuyruk kimliği veya belge kaydıyla birleştirilemez.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, mevcut `src/lib/outbox.ts` ve `src/lib/outbox-worker.ts`, provider adapter’ları, DNS sender authentication, signed unsubscribe token’ları ve audit/metric storage.

**Spec:** [`2026-09-02-mavenforms-e-belge-parasut-v4-ve-api-siz-faturalama-yol-haritasi.md`](./2026-09-02-mavenforms-e-belge-parasut-v4-ve-api-siz-faturalama-yol-haritasi.md) ve [`2026-09-07-mail-configuration-research-receipt.md`](../research-sources/2026-09-07-mail-configuration-research-receipt.md)

**Ana iş akışı:** Bu belge bağımsız bir yan proje değildir; `MAIL-00..MAIL-20` paketleri payment/invoice/integration/release grafiğine bağlı çapraz kesen işlerdir. Mevcut MAIL kimlikleri geçmiş kanıtları korumak için sabit kalır, fakat yürütme sırası değildir. Yeni e-posta fikri önce `INT-00..INT-04` değerlendirmesinden geçer ve ancak bir çekirdek fazın kabul kriteri olarak gerekçelendirilirse burada veya ana mikro-faz planında ilgili noktaya eklenir.

## 0A. Bağımlılık ve tetikleme sözleşmesi

```text
PAY authoritative event
  → ödeme makbuzu DeliveryIntent (opsiyonel)
  → INV paid_ready_for_invoicing
  → INV issued + document_ready
  → fatura DeliveryIntent
  → outbox/worker/provider delivery
```

- Payment webhook, browser callback veya Paraşüt job tamamlanması request içinde doğrudan e-posta göndermez; yalnızca güvenli domain event/outbox üretir.
- Fatura belgesi hazır değilse fatura maili yoktur. `issued` ile `document_ready` ve `sent` aynı durum değildir.
- API’siz muhasebe akışında mail ancak yetkili Excel/PDF/XML importu dry-run ve explicit approve kapısından geçtikten sonra açılır.
- Ödeme makbuzu ile fatura teslimatı ayrı `eventKey`/idempotency anahtarları ve ayrı durumlarla izlenir; birinin retry’si diğerini duplicate edemez.
- `MAIL-13..MAIL-15` gibi güvenlik altyapısı paketleri yalnızca ilgili çekirdek event’in teslimat gereksinimi kadar çalıştırılır. `MAIL-16` fatura domain’i `document_ready` sözleşmesini üretmeden uygulanamaz.
- Marketing listesi, campaign UI’ı ve Mailchimp Marketing canlı bağlantısı ödeme/fatura release’inin ön koşulu değildir; P2’ye ertelenir.

### Yürütme kuralı

Aktif faz sırası `PAY → INV/INT → gerekli DELIVERY/MAIL` şeklindedir. `MAIL` adı taşıyan bir iş, giriş kapısında hangi `PAY`, `INV` veya `INT` kabul kriterini karşıladığını, tükettiği `DeliveryIntent` şemasını ve neden çekirdek akışın parçası olduğunu yazmadan başlatılamaz.

### 0B. Fatura sender aktivasyon kapısı

Fatura gönderim profili, form kayıt bildirim profilinden bağımsızdır. `R-10=PASS`, seçilmiş manuel muhasebe veya Paraşüt API v4 yolunun tamamlanması, `issued + private + clean + document_ready`, geçerli alıcı snapshot’ı, doğrulanmış sender domain/provider health ve suppression kontrolleri birlikte sağlanmadan `enabled/live` olamaz. Eksik koşul `SUSPENDED_BY_R10`, `accounting_review_required` veya sınıflandırılmış `blocked` sonucudur. Bu kontrol server-side tekrar edilir; UI’daki disabled durumu güvenlik kanıtı değildir.

## Global Constraints

- Fatura ve zorunlu işlem e-postası pazarlama kampanyası değildir; konuya reklam içeriği eklenmez.
- Pazarlama ve abonelikli bildirimlerde izin kanıtı, görünür unsubscribe ve uygun provider header’ları gerekir.
- Hiçbir provider “spam’e kesin düşmez” garantisi vermez; yalnızca gönderen ve alıcı sistemleri birlikte değerlendirir.
- Gmail’in güncel koşullarında gönderen alan adı için SPF veya DKIM; yüksek hacimde SPF+DKIM+DMARC, TLS, alignment ve uygun unsubscribe şartları vardır.
- Gmail Postmaster spam oranında `<0.10%` hedeflenir ve `0.30%` veya üzeri tehlikeli eşik olarak ele alınır; bunlar tüm sağlayıcılar için evrensel yasa değildir.
- SES’in `<5%` hard bounce ve `<0.1%` complaint değerleri “makul hedef” olarak dokümante edilir; evrensel provider kuralı değildir.
- Mailchimp Marketing yalnızca izinli/policy-compliant audience içindir. Mailchimp Transactional (Mandrill olarak da anılır) ayrı transactional üründür.
- Hard bounce adresine tekrar gönderim yapılmaz; complaint/suppression durumu kampanya türüne göre uygulanır.
- Provider API key, SMTP password, webhook secret ve domain doğrulama token’ı browser/log/export/audit payload’ına girmez.
- Her tenant’ın kendi gönderici domaini veya platform hesabı ayrı authorization ile yönetilir.
- Provider `accepted` sonucu yalnızca provider’ın mesajı kabul ettiğini gösterir; `delivered`, `bounced`, `complained`, `deferred` ve inbox placement ayrı sonuçlardır.
- `transactional` ve `notification` ürün/mimari sınıflarıdır; gerçek mesaj amacı veya içeriği promosyon niteliğindeyse yalnız sınıf adı hukuki değerlendirmeyi değiştirmez. İYS/KVKK/ePrivacy purpose/consent incelemesi ayrıca yapılır.
- DMARC pass, inbox veya teslim garantisi değildir. Raporlama ve uygulama standardı güncel RFC/sağlayıcı sözleşmesiyle doğrulanır; eski bir RFC referansı tek başına release kanıtı sayılmaz.
- KVKK, ticari elektronik ileti ve yurt dışı veri aktarımı değerlendirmesi hukuk/mali danışman tarafından ayrıca onaylanır; kod hukuki varsayım üretmez.

## Araştırma sonrası uygulama düzeltmeleri

- Client’tan gelen `formId`, `submissionId`, `templateId` veya `jobId` yalnız selector’dur; sahiplik/tenant/workspace/form authorization server-side doğrulanmadan kullanılmaz.
- İdempotency otomatik event, kullanıcı komutu ve batch recipient için ayrı modellenir. Aynı kullanıcı command’ı tekrarlandığında dedupe edilir; bilinçli resend yeni command olarak engellenmez.
- Provider webhook doğrulaması HMAC varsayımına bağlanmaz. Provider’ın kendi signature/auth sözleşmesi, timestamp/replay, duplicate event, external event id ve normalize state kapıları birlikte uygulanır.
- Open/click tracking operasyonel ve billing iletilerinde default-off kalır; açılması ayrı privacy, retention ve consent kararıdır.

---

## 1. Mesaj sınıfları

### 1.0 Mevcut repo kanıtı ve başlangıç blokajları

İlk uygulama paketinden önce yapılan read-only taramada şu durumlar görüldü:

- `src/lib/outbox-worker.ts` durable outbox olayını yalnızca `email` veya `webhook` olarak ayırıyor; transactional/notification/marketing sınıfı henüz yok.
- `src/lib/outbox.ts` test amaçlı in-memory kuyruk kullanıyor; toplu gönderim için tek başına production kaynağı kabul edilemez.
- `src/lib/outbox-worker.ts` lease ve retry durumlarını tutuyor; provider `delivered`, `bounced`, `complained`, `deferred` event modeli henüz yok.
- `src/app/api/dashboard/route.ts` içinde başarısız bildirim sayısı mock değer olarak üretiliyor; bu değer deliverability metriği değildir.
- `prisma/schema.prisma` içindeki `Notification.configJson` bildirim ayarlarını tutuyor; consent, suppression, sender profile ve provider message ID alanları henüz bunun yerine geçirilmemiş.
- Mailchimp Marketing için gerçek provider çağrısı ve iki provider için verified sender-domain health kanıtı hâlâ bulunmuyor. Mailchimp Transactional için server-only HTTP adapter mevcut; gerçek hesap/sandbox kanıtı ayrıca gereklidir.

Bu kanıtlar nedeniyle UI’de Mailchimp veya toplu gönderim “bağlı/hazır” gösterilemez. `MAIL-00..MAIL-15` temel sözleşmeleri kurulmuş olsa da gerçek provider/sandbox, outbox seçimi ve domain kanıtı tamamlanmadan live durum gösterilmemelidir.

### 1.1 Transactional fatura e-postası

Fatura, ödeme sonucu, resmi belge, rezervasyon/form onayı gibi kullanıcının işlemiyle doğrudan ilişkili zorunlu iletişimdir.

- Belirli alıcı ve belirli işlemle ilişkilidir.
- Pazarlama iznine bağlanmaz; pazarlama kampanyasına dahil edilmez.
- İçinde kampanya, çapraz satış veya üçüncü taraf reklamı bulunmaz.
- Teslim edilemezse fatura kaydı korunur ve güvenli alternatif teslim aksiyonu açılır.
- Hard bounce sonrası otomatik sonsuz retry yoktur.

### 1.2 Operasyonel bildirim

Form yanıtı, ödeme durumu, entegrasyon hatası ve yönetici uyarısı gibi sistem mesajlarıdır.

- Zorunlu ve isteğe bağlı bildirim tercihleri ayrıdır.
- İsteğe bağlı bildirimler preference center ve unsubscribe kurallarına bağlanır.
- Fatura, ödeme veya güvenlik bildirimi için teslimatı kesen bir unsubscribe davranışı varsayılmaz; iş ve hukuk politikası belirler.

### 1.3 Pazarlama e-postası

Newsletter, kampanya, ürün duyurusu ve ticari tanıtım mesajıdır.

- Ayrı consent kaydı, kaynak, policy version ve timestamp tutulur.
- Görünür unsubscribe ve provider one-click mekanizması gerekir.
- Unsubscribe sonrası yeni marketing gönderimi durur.
- Form doldurma veya satın alma otomatik marketing consent sayılmaz.

## 2. Domain ve gönderici izolasyonu

Önerilen domain yapısı:

```text
billing.example.com   → fatura, ödeme ve zorunlu işlem
notify.example.com    → operasyonel bildirim
news.example.com      → pazarlama / newsletter
bounce.example.com    → return-path ve feedback işleme
```

Bu ayrım her provider’ın zorunlu DNS kuralı değildir; reputation etkisini sınırlayan MavenForms ürün politikasıdır. Marketing problemi fatura teslimatını otomatik olarak bozmamalıdır.

Sender profile alanları:

- `workspaceId`, `messageClass`, `provider`, `fromAddress`, `replyToAddress`
- `sendingDomain`, `returnPathDomain`
- `spfStatus`, `dkimStatus`, `dmarcStatus`, `alignmentStatus`
- `tlsRequired`, `domainVerifiedAt`, `lastCheckedAt`
- `dailyLimit`, `perMinuteLimit`, `enabled`, `healthStatus`

Doğrulanmamış domain veya yanıltıcı From adresi ile gönderim açılmaz. Reply-To gerçek destek adresi olmalıdır; `no-reply` varsayılan çözüm yapılmaz.

## 3. SPF, DKIM, DMARC ve TLS

### SPF

- Provider’ın verdiği yetkili gönderim kaydı DNS’e eklenir.
- MavenForms mevcut SPF kaydını otomatik overwrite etmez.
- Birden fazla SPF kaydı health check’te hata olarak gösterilir.
- SPF sonucu sender profile ready koşuludur.

### DKIM

- Provider selector ve DNS doğrulaması gösterilir.
- Domain ownership doğrulanmadan gönderim açılmaz.
- Selector rotasyonu ve doğrulama zamanı audit edilir.
- Private signing key uygulama kullanıcısına gösterilmez.

### DMARC

- İlk gözlem için `p=none`, hukuk/IT onayıyla kullanılır.
- Rapor alıcısı ve kişisel veri etkisi değerlendirilir.
- `quarantine/reject` geçişi otomatik değildir.
- SPF/DKIM alignment başarısızsa sender profile pause edilir.

### TLS ve DNS

SMTP/provider bağlantısı TLS olmadan gönderilmez. Kendi SMTP/IP altyapısı seçilirse forward/reverse DNS/PTR ve IP reputation ayrıca doğrulanır.

## 4. Hacim ve spam sınırları

“Günde şu kadar e-posta güvenlidir” şeklinde evrensel bir sayı yoktur. Gmail’in 5.000’den fazla Gmail hesabına günlük gönderim sınıfı için SPF+DKIM+DMARC, alignment ve one-click unsubscribe gibi ek gereksinimleri vardır. Bu sayı bütün sağlayıcılara veya bütün MavenForms workspace’lerine genellenemez.

MavenForms rate guard aşağıdaki değerlerin en küçüğünü kullanır:

```text
provider quota
workspace plan quota
sender profile limit
domain reputation guard
provider health state
```

Limit aşımında mesaj silinmez; `deferred_by_policy` olarak kuyruğa bırakılır. Yöneticiye alıcı sayısı, bekleme nedeni ve tahmini batch bilgisi gösterilir.

İç koruma eşikleri provider kuralı gibi sunulmaz. Provider dokümante eşikleri ile MavenForms’ın daha ihtiyatlı pause eşikleri ayrı alanlarda saklanır.

## 5. Consent, unsubscribe ve suppression

### 5.1 EmailConsent

Önerilen alanlar:

```text
workspaceId
recipientHash
emailType
state: granted | revoked | unknown | suppressed
source
policyVersion
grantedAt
revokedAt
```

Marketing gönderiminde `granted` kanıtı yoksa enqueue reddedilir. Fatura/transactional policy ayrı değerlendirilir.

### 5.2 Signed unsubscribe

Unsubscribe token’ı tenant/recipient scope’lu ve süreli olur; TCKN/VKN/tam e-posta içermez. Tek tık isteği suppression’a yazar, replay/CSRF kontrolü yapar ve kullanıcıya anlaşılır sonuç verir.

### 5.3 Suppression

```text
active
soft_bounce_retryable
hard_bounce_suppressed
complaint_suppressed
marketing_unsubscribed
invalid
manual_blocked
```

Hard bounce adresine tekrar gönderim yapılmaz. Complaint durumu marketing’i durdurabilir; transactional iletişimin etkilenmesi ayrıca onaylanır.

## 6. Provider sözleşmesi ve Mailchimp entegrasyonları

### 6.1 Ortak adapter

```ts
type EmailMessageClass = "transactional" | "notification" | "marketing";

type SendEmailInput = {
  workspaceId: string;
  messageId: string;
  class: EmailMessageClass;
  fromProfileId: string;
  to: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  attachmentKeys: string[];
  idempotencyKey: string;
};

type SendEmailResult =
  | { status: "accepted"; providerMessageId: string }
  | { status: "deferred"; providerCode: string }
  | { status: "rejected"; providerCode: string };
```

Raw provider response domain veya UI’ye dönmez. Webhook/event adapter’ı delivered, deferred, bounced, complained, unsubscribed ve rejected olaylarını normalize eder.

### 6.2 Mailchimp Marketing

Mailchimp Marketing yalnızca izinli audience/campaign için kullanılır:

- Opt-in kanıtı ve unsubscribe gerekir.
- Satın alınmış veya üçüncü taraf liste import edilmez.
- Ödeme müşterisi ayrı marketing consent vermediyse audience’a otomatik eklenmez.
- API key server-side ve minimum yetkiyle saklanır.
- Audience’a PII aktarımı öncesi veri işleme/yurt dışı aktarım değerlendirilir.
- Marketing unsubscribe ile fatura teslim suppression’ı tek alan yapılmaz.

### 6.3 Mailchimp Transactional

Mailchimp Transactional, eski adıyla Mandrill, transactional API/SMTP ürünüdür:

- API key yalnızca server-side tutulur.
- Gönderimden önce sending domain ownership ve DKIM doğrulaması yapılır.
- API, event/raporlama takibi için SMTP’ye göre tercih edilir.
- Bounce/reject/delivery event’leri webhook ile alınır.
- Provider’ın async bulk davranışı queue ve retry sözleşmesine bağlanır.
- API accepted sonucu delivered veya inbox anlamına gelmez.
- Marketing audience ve transactional recipient listesi ayrıdır.

### 6.4 Diğer provider’lar

SES, SendGrid, Mailgun, Resend veya başka provider eklenirken aynı adapter ve kabul dosyası kullanılır: domain verification, key rotation, quota, webhook, suppression, attachment limitleri, region/retention ve veri işleme şartları ayrı doğrulanır.

## 7. Outbox ve toplu gönderim

```text
invoice_outbox       priority high, marketing içermez
notification_outbox  priority normal
marketing_outbox     consent + unsubscribe + campaign guard
```

- BCC ile büyük liste gönderimi yok; her alıcı ayrı message ID alır.
- Batch provider limitinden küçük ve yapılandırılabilir olur.
- Per-domain/per-provider token bucket ve jitter kullanılır.
- Alıcı listesi batch başlangıcında yeniden consent/suppression kontrolünden geçer.
- Otomatik event için event key; kullanıcı başlatmalı gönderim için `clientCommandId`/`Idempotency-Key`; batch için `batchJobId + recipientSnapshotId` kullanılır. Aynı command dedupe edilir, bilinçli resend yeni command’dır.
- Queue pause/resume ve emergency kill switch owner/admin ile sınırlandırılır.
- Ani hacim artışı warm-up veya insan onayı olmadan gönderilmez.

İçerik kuralları:

- From/Reply-To yanıltıcı veya impersonation içermez.
- Fatura mailinde kampanya, gereksiz takip pikseli ve raw provider URL’si bulunmaz.
- Kullanıcı verisi HTML escape/sanitize edilir.
- Attachment filename ve güvenli indirme linkleri sanitize edilir.

## 8. Telemetri ve alarm

Dashboard şu durumları ayrı gösterir: accepted, delivered, deferred, hard bounce, soft bounce, rejected, complaint, unsubscribe, quota, domain health.

- Authentication failure → sender profile pause.
- Complaint/hard bounce artışı → marketing campaign pause ve admin alert.
- Provider review/rejection → ilgili queue pause.
- Webhook kaybı → accepted ile delivered ayrımı unknown kalır.
- Quota yaklaşımı → yeni batch deferred, mevcut mesajlar kaybolmaz.

Kullanıcıya “gönderildi” denmeden önce provider accepted ile delivered ayrımı gösterilir; inbox placement hiçbir provider cevabında kesin kabul edilmez.

## 9. UI bilgi notları

Mail ayarları ve toplu gönderim onay ekranı:

> **Teslim edilebilirlik garantisi yoktur.** SPF, DKIM ve DMARC doğrulaması olmadan toplu gönderim açılamaz. Sağlayıcılar bounce, complaint ve unsubscribe oranlarını izler; yüksek oranlar gönderimi yavaşlatabilir, incelemeye alabilir veya durdurabilir.

> **Fatura e-postaları pazarlama e-postası değildir.** Fatura, ödeme ve form sonucu bildirimleri ayrı kuyruktan gönderilir; pazarlama izni olmayan kişilere kampanya gönderilmez.

> **Kart bilgileri MavenForms’ta tutulmaz.** Fatura gönderiminde yalnızca doğrulanmış ödeme referansı ve fatura belgesi kullanılır.

Toplu işlem onayında mesaj sınıfı, alıcı sayısı, suppression nedeniyle atlananlar, provider/domain health, batch sayısı, marketing consent durumu ve fatura document-ready durumu görünür.

## 10. 15 dakikalık MAIL paketleri

Her paket başında `F/D/M/C/X/I/U/E/P/R` fatura paketleri ve önceki `MAIL-*` paketleri replay edilir. Başarısız paket sonraki pakete geçemez.

### MAIL-00 — Mesaj sınıfı kararı

Transactional/notification/marketing sabitlerini ve mevcut event mapping’ini tanımla. Çıkış: Her mevcut mail event’i tam olarak bir sınıfa atanmış.

### MAIL-01 — Sender profile modeli

Workspace, domain, provider, From, Reply-To ve health alanlarını ekle. Çıkış: Doğrulanmamış profile ready olamıyor.

### MAIL-02 — Consent modeli

Marketing consent, notification preference ve transactional policy ayrımını ekle. Çıkış: Consent kanıtı olmayan marketing enqueue reddediliyor.

### MAIL-03 — DNS health sözleşmesi

SPF/DKIM/DMARC/alignment status DTO ve doğrulama kaydını ekle. Çıkış: DNS health olmadan toplu gönderim aktif değil.

### MAIL-04 — Secret bağlantı sınırı

API key, SMTP secret ve webhook secret encrypted server-side storage’a bağla. Çıkış: Browser/log/audit/exportta secret yok.

Uygulama durumu (2026-09-02): `src/lib/email-credentials.ts` email sağlayıcı sırları için ayrı AES-256-GCM zarfı, aktif key-id kontrolü ve email’e özel AAD uyguluyor. `MAVENFORMS_EMAIL_ENCRYPTION_KEY` ve `MAVENFORMS_EMAIL_ENCRYPTION_KEY_ID` env sözleşmesine eklendi. `tests/email-credentials.test.mjs` round-trip, plaintext sızıntısı, tahrifat, eksik anahtar ve eski key-id reddini doğruluyor. Bu paket gerçek provider bağlantısını açmaz; sağlayıcı adapter’ları MAIL-11/12/13 paketlerinde bu sınırı kullanmak zorundadır.

### MAIL-05 — Suppression modeli

Hard bounce, complaint, unsubscribe ve manual block durumlarını ekle. Çıkış: Suppressed alıcı enqueue edilemiyor.

Uygulama durumu (2026-09-02): `src/lib/email-suppression.ts` normalize edilmiş adres, neden ve kapsam sözleşmesini ekliyor. Hard bounce/complaint varsayılan olarak `all`, unsubscribe varsayılan olarak `marketing`; manual block iki kapsamı da destekliyor. `canEnqueueEmail` bu kayıtları değerlendiriyor. Böylece pazarlama unsubscribe’ı transactional fatura/bildirim postasını yanlışlıkla kesmiyor. `tests/email-suppression.test.mjs` provider nedenleri, kapsam, adres normalizasyonu ve enqueue reddini doğruluyor. Kalıcı DB/event inbox kaydı MAIL-06 kapsamındadır.

### MAIL-06 — Provider event inbox

Delivery/bounce/reject/complaint event’lerini idempotent inbox ile kaydet. Çıkış: Aynı event duplicate state üretmiyor.

Uygulama durumu (2026-09-03): `src/lib/email-provider-event.ts` doğrulanmış provider olaylarını sınırlı event türlerine normalize ediyor ve workspace/provider/external-event kimliğiyle idempotency anahtarı üretiyor. `EmailProviderEvent` Prisma modeli ve migration’ı payload hash, recipient, signature/processing durumu ve lease alanlarını içeriyor; ham payload tutulmuyor. `tests/email-provider-event.test.mjs` sözleşme, imza zorunluluğu, dedupe ve şema kapılarını doğruluyor. Provider webhook route/worker state transition’ları sonraki bağlı alt pakettir.

### MAIL-07 — Queue ayrımı

Invoice, notification ve marketing outbox namespace/priority ayrımını yap. Çıkış: Marketing hacmi invoice kuyruğunu bloklamıyor.

Uygulama durumu (2026-09-03): `src/lib/email-queue.ts` transactional/notification/marketing sınıflarını ve 100/50/10 öncelik sırasını tanımlıyor. In-memory ve durable outbox bu sınıf/priority alanlarını taşıyor; worker yüksek önceliği önce claim/process ediyor. `OutboxEvent` migration’ı queue index’i ekliyor. `tests/email-queue.test.mjs` transactional işin marketing işinden önce işlendiğini ve şema kapısını doğruluyor. Gerçek provider rate/batch sınırları MAIL-08’dedir.

### MAIL-08 — Rate/batch guard

Provider/workspace/domain limitlerinin en küçüğünü uygulayan token bucket ekle. Çıkış: Limit aşımı mesaj silmeden deferred oluyor.

Uygulama durumu (2026-09-03): `src/lib/email-rate-guard.ts` provider/workspace/domain limitlerini ayrı değerlendiriyor, en düşük oranlı sınırı seçiyor ve herhangi bir boyut dolduğunda `deferred + retryAt` döndürüyor. Bozuk kullanım state’i fail-open olmaması için reddediliyor. `outbox-worker.ts` rate-limitli kaydı silmeden gelecekteki `availableAt` zamanına ve `queued` durumuna döndürüyor. `tests/email-rate-guard.test.mjs` seçim, erteleme, mutasyon yapmama ve fail-closed davranışını doğruluyor. Redis/multi-instance sayaç adaptörü ve gerçek provider limit konfigürasyonu, provider gönderim adapter’ı açılmadan önce zorunlu entegrasyon kapısıdır.

### MAIL-09 — Transactional template

Fatura/işlem şablonunda campaign linki, raw provider URL’si, PII logu ve HTML injection engelini uygula. Çıkış: Document-ready olmadan invoice mail queue’ya girmiyor.

Uygulama durumu (2026-09-03): `src/lib/email-template-policy.ts` transactional/notification sınıflarını marketing’den ayırıyor; kullanıcı metnini HTML’e escape ediyor, yalnızca app-origin doküman URL’sine izin veriyor, raw provider URL/campaign/UTM/unsubscribe içeriğini reddediyor ve log context’ini hassas alanlardan arındırıyor. `tests/email-template-policy.test.mjs` bu sınırları doğruluyor. Provider gönderim adapter’ı ve document-ready enqueue koşulu, provider entegrasyonundan önce zorunlu sonraki bağlama adımıdır.

### MAIL-10 — Marketing unsubscribe

Signed token, one-click endpoint ve preference update ekle. Çıkış: Unsubscribe sonrası yeni marketing maili gönderilmiyor.

Uygulama durumu (2026-09-03): `src/lib/email-unsubscribe-token.ts` e-posta adresini URL’ye koymadan workspace + HMAC alıcı hash’i + marketing scope + expiry içeren imzalı opaque token üretiyor. `EmailPreference` yalnızca workspace/hash/marketing opt-out tutuyor; `POST /api/public/email/unsubscribe` imzayı doğrulayıp idempotent opt-out yapıyor ve secret yoksa fail-closed 503 dönüyor. Transactional/notification tercihleri bu kayıttan etkilenmiyor. `tests/email-unsubscribe-token.test.mjs` ve `tests/email-unsubscribe-route.test.mjs` token/route/schema kapılarını doğruluyor. Provider’ın RFC 8058 one-click header üretimi ve provider adapter mapping’i MAIL-11/12 öncesi entegrasyon kontrolüdür.

### MAIL-11 — Mailchimp Marketing adapter

Consent’li audience/segment/campaign işlemini bağla. Çıkış: Fatura alıcısı marketing consent olmadan audience’a eklenmiyor.

Uygulama durumu (2026-09-03): `src/lib/mailchimp-marketing-adapter.ts` gerçek provider çağrısından önce çalışan fail-closed preflight sözleşmesini ekliyor. Audience üyeliği yalnızca marketing consent `granted`, suppression yok, marketing sender profile `healthy + enabled`, SPF/DKIM/DMARC/alignment/TLS health `healthy`, workspace/domain eşleşmesi ve server-side encrypted credential envelope hazır olduğunda `upsert_member` komutu olarak hazırlanıyor. Çıktı provider secret içermiyor ve bu paket dış HTTP çağrısı yapmıyor. `tests/mailchimp-marketing-adapter.test.mjs` consent, suppression, sender/domain health, secret ve workspace izolasyon kapılarını doğruluyor. Gerçek Mailchimp API çağrısı, credential decrypt sınırı ve provider response/event mapping’i MAIL-11’in sonraki bağlı paketidir; UI bu preflight olmadan “bağlı/hazır” gösteremez.

### MAIL-12 — Mailchimp Transactional adapter

Transactional API, domain check ve provider message ID mapping’ini bağla. Çıkış: Accepted delivered sayılmıyor.

Uygulama durumu (2026-09-03): `src/lib/mailchimp-transactional-adapter.ts` transactional/notification sınıfını marketing’den ayıran, sender profile + domain health + encrypted credential envelope kapılarını fail-closed uygulayan server-side preflight sözleşmesini ve server-only HTTP adapter’ını içeriyor. Resmî Mailchimp Transactional sözleşmesine göre çağrı sabit `https://mandrillapp.com/api/1.0/messages/send.json` endpoint’ine POST JSON olarak yapılır; `key` yalnızca server tarafında credential envelope decrypt edildikten sonra request body’ye konur. Gönderim gövdesi `html`, `text`, `subject`, `from_email`, `to`, güvenli MavenForms message metadata’sı ve opsiyonel `Reply-To` içerir. Provider cevabındaki tek kayıt `queued/sent` ise yalnızca `accepted + pending`, `rejected/invalid/failed` ise `rejected + not_delivered` olarak eşlenir; `delivered` durumu provider response’dan üretilmez, doğrulanmış webhook event’ine bırakılır. HTTP 200 dışı, aşırı büyük veya geçersiz cevaplar ham provider içeriği dışarı taşınmadan güvenli hata olarak reddedilir. `tests/mailchimp-transactional-adapter.test.mjs` ve `tests/mailchimp-transactional-client.test.mjs` sınıf/health/template kapılarını, decrypt sınırını, endpoint/request sözleşmesini, secret’ın sonuçta bulunmamasını ve accepted-delivered ayrımını doğruluyor. Bu paket canlı Mailchimp hesabına çağrı yapmaz; gerçek outbox worker/provider seçimi ve operasyonel sandbox kanıtı MAIL-16/18/19 kapılarıdır.

Uygulama durumu (2026-09-03, MAIL-12B): HTTP sınırında DB’den gelen sender profile tekrar doğrulanıyor; CR/LF içeren gönderen adı, mailbox veya Reply-To değeri request oluşturulmadan reddediliyor. Böylece normalize edilmiş profile varsayımına dayalı header injection riski azaltılıyor. `tests/mailchimp-transactional-client.test.mjs` kötü niyetli sender profile için dış çağrı yapılmadığını doğruluyor.

Uygulama durumu (2026-09-03, MAIL-12C): Provider response’taki `msg._id` kimliği, raw webhook saklanmadan `EmailProviderEvent.providerMessageId` alanına taşınıyor ve workspace/provider/message ID index’i ile sorgulanabilir hale geliyor. Bu kimlik, sonraki outbox correlation paketinde teslim/bounce event’ini doğru gönderim kaydına bağlamak için kullanılacak; henüz tek başına delivered üretmiyor. `tests/mailchimp-webhook.test.mjs` ve `tests/email-provider-event.test.mjs` kimlik aktarımını doğruluyor; `20260903230000_add_email_provider_message_identity` migrasyonu uygulandı.

Uygulama durumu (2026-09-03, MAIL-12D): `OutboxEvent` içine nullable `provider` ve `providerMessageId` alanları ile workspace/provider/message ID index’i eklendi. `src/lib/email-provider-correlation.ts` bu kimlik çiftini trim/lowercase, uzunluk ve CR/LF kontrolleriyle normalize ediyor. Bu paket henüz outbox kaydını sent veya delivered yapmıyor; provider çağrısı ve verified webhook event’i arasındaki ilişkilendirme için güvenli veri sözleşmesini hazırlıyor. `20260903231500_add_outbox_provider_identity` migration’ı ve `tests/email-provider-correlation.test.mjs` kapısı sonraki worker correlation fazına geçmeden önce zorunludur.

Uygulama durumu (2026-09-03, MAIL-12E): `buildProviderAcceptedOutboxData` ve `completeOutboxEmailAccepted` provider kabulünü outbox’a `status: sent` + provider/message identity ile yazar; lease alanlarını temizler. Bu `sent` değeri dashboard sözleşmesinde accepted olarak yorumlanır ve delivered anlamına çevrilmez. Kimlik normalization kapısı geçmeden DB update oluşturulmaz. Gerçek Mailchimp çağrısının outbox worker tarafından seçilmesi ve webhook event’inin bu ID ile eşleştirilmesi bir sonraki bağlı fazdır.

Uygulama durumu (2026-09-03, MAIL-13A): `buildEmailProviderEventCreateData` doğrulanmış event’i raw payload olmadan Prisma inbox create satırına dönüştürüyor; providerMessageId yoksa açıkça `null` yazıyor ve workspace boşsa reddediyor. Bu helper henüz webhook route açmıyor veya event state değiştirmiyor; route’un workspace secret çözümleme ve `skipDuplicates`/unique sınırını kullanacağı güvenli veri girişidir.

Uygulama durumu (2026-09-03, MAIL-13B): `EmailProviderConnection` workspace-scoped provider kaydı eklendi. API credential ve webhook secret yalnızca encrypted envelope alanlarında tutuluyor; `publicConfigJson` secret dışı allowlist metadata için ayrıldı. Workspace/provider unique ve status index’i var. Bu paket route veya UI’de bağlantıyı active göstermiyor; workspace secret çözümleme, role gate ve idempotent inbox yazımı sonraki mikro-fazdır.

Uygulama durumu (2026-09-03, MAIL-13C): `src/app/api/webhooks/mailchimp-transactional/[connectionId]/route.ts` yalnızca `active` workspace bağlantısını ve decrypt edilebilir encrypted webhook secret’ı kabul ediyor. Ham request body 5 MiB ile sınırlandırılıyor; tam URL + POST parametreleri ile `X-Mandrill-Signature` doğrulanmadan hiçbir DB yazımı yapılmıyor. Doğrulanmış event’ler `buildEmailProviderEventCreateData` ile raw payload olmadan `$transaction` içindeki compound `upsert` ile inbox’a alınıyor; replay işlenmiş event’i ezmiyor. Secret, raw payload ve provider cevabı response/log sınırına çıkmıyor. Route `received` kabulüyle sınırlı; suppression/delivered state değişimi worker fazının sorumluluğunda kalıyor. `tests/mailchimp-webhook-route.test.mjs` ve 92 dosyalık tam test kapısı geçti; production build, migration status ve `/api/ready` de başarılı. Gerçek Mailchimp hesabı/sandbox çağrısı hâlâ hesap kimlik bilgisi ve operasyonel doğrulama gerektirir.

Uygulama durumu (2026-09-03, MAIL-13D): Provider kabulü ile teslim kanıtı ayrı tutuldu. `OutboxEvent.deliveryStatus` nullable alanı ve `20260903234500_add_outbox_delivery_status` migration’ı eklendi; mevcut `status: sent` accepted anlamını koruyor. `src/lib/email-delivery-correlation.ts`, event türlerini ayrı delivery durumlarına map ediyor ve daha ağır kanıtın daha hafif kanıtla ezilmesini önleyen monotonic geçiş uyguluyor. `email-protection-worker`, doğrulanmış event’in provider/message ID’si ile aynı workspace’teki yalnızca email ve accepted outbox kaydını aynı transaction içinde güncelliyor; provider ID yoksa veya event unsubscribe/open ise outbox delivery state’i değişmiyor. Bu paket delivered state’i provider response’dan üretmiyor; yalnızca doğrulanmış webhook inbox event’i sonrası kanıt yazar. 93 dosyalık test, TypeScript, lint, production build, migration status ve readiness kapıları başarılıdır. Gerçek provider hesabı/sandbox kanıtı hâlâ ayrı bir operasyonel kapıdır.

Uygulama durumu (2026-09-03, MAIL-13E): `src/app/api/internal/workers/email-protection/route.ts`, cloud scheduler’ın email protection worker’ını çağırması için korumalı POST giriş noktası sağlar. Dedicated `MAVENFORMS_EMAIL_WORKER_SECRET` yoksa route `503` ile fail-closed kalır; yanlış header `401`, limit dışı batch `400` döner. Secret karşılaştırması `timingSafeEqual` ile yapılır ve batch 50 ile sınırlandırılır. Worker sonucu yalnızca sayaç olarak döner; event ID, payload, recipient ve secret response’a yazılmaz. Canlı lokal çağrı secret eksikken `503 {"error":"worker_unavailable"}` döndürdü. 94 dosyalık tam test, TypeScript, lint, production build, migration status ve readiness kapıları başarılıdır. Scheduler yapılandırması ve gerçek provider hesabı/sandbox kanıtı ayrı operasyonel kapılardır.

Uygulama durumu (2026-09-03, MAIL-13F): Outbox worker’ın mevcut üretim kodunda provider adapter çağrısını yapan bir dispatch seam’i olmadığı doğrulandı. Bu nedenle gerçek provider gönderimi bu mikro-fazda açılmadı ve UI/metric tarafında gönderildi iddiası üretilmedi. Gerçek dispatch öncesi outbox payload’ının subject/text/recipient/message ID taşıması, active workspace provider bağlantısının çözülmesi, sender/domain/template health kapılarının yeniden çalıştırılması ve provider kabulünün `completeOutboxEmailAccepted` ile correlation alanlarına yazılması zorunludur. Provider çağrısı yalnızca TDD + fake fetch sözleşmesi + gerçek sandbox kanıtı birlikte geçtikten sonra açılacaktır.

Uygulama durumu (2026-09-03, MAIL-13G): `src/lib/mailchimp-connection-config.ts` public provider bağlantı metadata’sı için strict allowlist uyguluyor; yalnızca `appOrigin`, `senderProfile` ve `domainHealth` kabul ediliyor. API key, webhook secret ve bilinmeyen alanlar public config’e giremiyor. Origin, workspace/provider, sender profile (`healthy + enabled`) ve SPF/DKIM/DMARC/alignment/TLS/domain health koşulları doğrulanmadan config dispatch’e açılmıyor. `tests/mailchimp-connection-config.test.mjs` normalization, workspace mismatch, secret sızıntısı ve pending sender kapılarını doğruluyor. 95 dosyalık tam test, TypeScript, lint, production build, 20 migration ve `/api/ready` kapıları başarılıdır; gerçek Mailchimp hesabı/sandbox çağrısı hâlâ operasyonel bir kapıdır.

Uygulama durumu (2026-09-03, MAIL-13H): `src/lib/submission-email-intents.ts` enabled admin bildirimlerini form ayarındaki doğrulanmış `to` adreslerine, user confirmation bildirimlerini yalnızca başvuru sahibine çözümlüyor; webhook bildirimleri email kuyruğuna karışmıyor. Konu ve text gövdesi de explicit intent payload’ına taşınıyor. `enqueueSubmissionOutbox` intent başına ayrı email outbox kaydı ve ortak webhook kaydı üretiyor; intent alanı olmayan eski çağrılar için geriye dönük fallback korunuyor. Geçersiz admin ayarı veya email’siz kullanıcı onayı ilgili intent’i atlıyor ve public form yanıtını başarısız kılmıyor. `tests/submission-email-intents.test.mjs` ve public submission contract testi bu ayrımı doğruluyor.

Uygulama durumu (2026-09-03, MAIL-13I): `src/lib/outbox-mailchimp-dispatch.ts` claimed email outbox payload’ını active workspace Mailchimp bağlantısının strict public config’i, encrypted credential varlığı ve sender/domain health kapılarıyla provider-safe `prepareMailchimpTransactionalSend` komutuna çeviriyor. Outbox ID stabil message ID olarak kullanılıyor; credential provider command’a konulmuyor ve helper ağ çağrısı yapmıyor. Inactive/mismatched connection, invalid payload ve unhealthy sender/domain fail-closed bloklanıyor. `tests/outbox-mailchimp-dispatch.test.mjs` healthy command, secret ayrımı ve inactive connection kapılarını doğruluyor. Gerçek provider çağrısı, bounded retry/dead-letter ve sandbox kanıtı bir sonraki bağlı fazdır.

Uygulama durumu (2026-09-03, MAIL-13J): Aynı `src/lib/outbox-mailchimp-dispatch.ts` içindeki `sendOutboxMailchimpEmail` yalnızca server-only HTTP adapter’a yönlendirme yapıyor; public/browser yüzeyine bağlanmıyor. Fake provider testinde `sent` kabulü `accepted + pending` ve provider message ID ile doğrulandı. Decrypt edilmiş API key yalnızca request gövdesinde kullanılıyor; command ve normalized sonuçta görünmüyor. Bu henüz durable outbox worker entegrasyonu değildir: claim sonrası persistence, acceptance update, bounded retry/dead-letter, protected scheduler ve gerçek sandbox kanıtı sonraki kapılardır.

Uygulama durumu (2026-09-03, MAIL-13K): `src/lib/outbox-dispatch-worker.ts`, lease ile claim edilmiş email outbox kayıtlarını active workspace Mailchimp bağlantısı üzerinden server-only adapter’a gönderiyor. Accepted response `completeOutboxEmailAccepted` ile provider/message identity ve `sentAt` alanlarına yazılıyor; provider response delivered anlamına çevrilmiyor. Kalıcı provider rejection permanent dead-letter’a, bağlantı/ağ/preflight hataları maksimum 5 denemeli bounded backoff’a gidiyor. `src/app/api/internal/workers/email-dispatch/route.ts` dedicated worker secret + timing-safe header ile korunuyor, batch 50 ile sınırlı ve response yalnızca sayaç döndürüyor. `tests/email-dispatch-worker.test.mjs` route/worker sözleşmesini doğruluyor; 98 test, TypeScript, lint, production build, 20 migration ve readiness kapıları başarılı. Secret yokken canlı route `503 worker_unavailable` döndürüyor. Gerçek provider hesabı/sandbox ve scheduler yapılandırması hâlâ operasyonel kapıdır.

Uygulama durumu (2026-09-03, MAIL-13K-R): Review sırasında email dispatch worker’ın webhook kayıtlarını email gibi işleyip dead-letter’a taşıma riski bulundu. `claimOutboxEvents` geriye dönük `all` varsayılanını koruyarak event type filtresi aldı; email dispatch worker açıkça yalnızca `email` kayıtlarını claim ediyor. Böylece webhook outbox’ı email worker’dan izole edildi. Bu release-blocker düzeltmesinden sonra TypeScript, lint, 98 dosyalık tam test, production build, migration ve readiness kapıları yeniden başarılıdır.

Uygulama durumu (2026-09-03, MAIL-13L): `src/lib/internal-worker-auth.ts` email dispatch ve email protection route’ları için ortak timing-safe worker secret ve bounded batch parser sağlıyor. İki route aynı helper’ı kullanıyor; default 10, maksimum 50 batch, secret yoksa `503`, yanlış secret `401`, geçersiz limit `400` korunuyor. Public form/webhook yüzeyleri bu internal route’lara bağlanmıyor. `tests/internal-worker-auth.test.mjs` ile ortak helper; güncellenen route testleri ile kullanım doğrulandı. 99 test, TypeScript, lint, production build, 20 migration ve readiness kapıları başarılıdır. Lokal env’de worker secret yokluğu nedeniyle iki worker route’u beklenen `503 worker_unavailable` davranışını sürdürüyor.

### MAIL-13 — Mailchimp event webhook

Delivery/bounce/reject/complaint event’lerini signature ve idempotency ile al. Çıkış: Sahte webhook state değiştiremiyor.

Uygulama durumu (2026-09-03): `src/lib/mailchimp-webhook.ts` Mailchimp Transactional’ın `X-Mandrill-Signature` sözleşmesini (tam webhook URL’si + alfabetik sıralı POST parametreleri + binary HMAC-SHA1/base64) doğruluyor. `mandrill_events` batch’i 1.000 event sınırıyla parse ediliyor; ham payload döndürülmüyor. `delivered`, `hard_bounce`, `soft_bounce`, `reject`, `spam` ve `unsub` olayları iç inbox türlerine normalize ediliyor; desteklenmeyen open/click gibi olaylar delivery state değiştirmiyor. Workspace/provider/event ID dedupe anahtarıyla aynı batch içindeki tekrarlar tekilleştiriliyor. `tests/mailchimp-webhook.test.mjs` geçerli/tahrif edilmiş imza, yanlış anahtar, event mapping, batch limiti davranışının temel sınırı ve duplicate event kapılarını doğruluyor. Prisma inbox yazımı ve idempotent state transition MAIL-13’ün sonraki bağlı route/worker paketidir.

### MAIL-14 — Otomatik koruma

Hard bounce suppression, complaint marketing pause ve admin alert kuralını ekle. Çıkış: Hard bounce retry edilmiyor.

Uygulama durumu (2026-09-03): `src/lib/email-protection.ts` doğrulanmış provider event’ini koruma kararına çeviriyor. Hard bounce `all` suppression + alıcı retry stop + admin alert; complaint `all` suppression + alıcı retry stop + marketing pause + admin alert; unsubscribe yalnızca `marketing` suppression olarak işleniyor. Delivered/reject event’leri suppression veya pause üretmiyor. Koruma gerektiren event’lerde recipient yoksa fail-closed hata dönüyor; DB yazımı, workspace pause ve admin bildirim gönderimi henüz worker bağlama paketidir. `tests/email-protection.test.mjs` bu ayrımı ve imzasız event reddini doğruluyor.

Uygulama durumu (2026-09-03, MAIL-14B): `src/lib/email-protection-worker.ts` provider inbox event’ini lease ile claim edip aynı transaction içinde suppression upsert’i, workspace marketing pause upsert’i, PII içermeyen `AuditLog` admin uyarısı ve event’in `processed` geçişini yapıyor. Aynı event replay edildiğinde işlenmiş state tekrar uygulanmıyor; hash secret yoksa event `failed` kalıyor ve koruma uygulanmış gibi gösterilmiyor. `tests/email-protection-worker.test.mjs` persistence planının hash-only ve idempotent payload sınırlarını doğruluyor. Outbox retry’ının suppression’a bakarak durdurulması sonraki MAIL-14C bağlama paketidir.

Uygulama durumu (2026-09-03, MAIL-14C): `src/lib/email-delivery-guard.ts` durable suppression scope ve workspace marketing pause’a göre dispatch kararını veriyor; `src/lib/outbox-worker.ts` email claim’inden önce explicit `recipientEmail` payload’ını çıkarıp suppression/marketing pause kontrolü yapıyor. Blocked kayıtlar retry edilmemesi için `dead` durumuna, hash secret veya veri sözleşmesi eksikleri fail-closed durumuna alınıyor. Marketing unsubscribe scope’u transactional/notification kuyruğunu durdurmuyor. `tests/email-delivery-guard.test.mjs` ve `tests/outbox-worker.test.mjs` bu bağın temel kapılarını doğruluyor. Gerçek provider gönderim çağrısı ve outbox payload’larına recipient contract’ının tüm çağrı noktalarında eklenmesi sonraki MAIL-12/MAIL-16 bağlama kapısıdır.

Uygulama durumu (2026-09-03, MAIL-14C recipient contract): Public submission route, form snapshot içindeki ilk geçerli email alanını normalize ederek notification outbox payload’ına `recipientEmail` olarak açıkça ekliyor. Email olmayan formlarda null kabul ediliyor; bozuk explicit değer guard tarafından fail-closed reddediliyor. Böylece suppression kontrolü “gizli alan tahmini” yerine açık outbox sözleşmesiyle çalışıyor. `tests/public-submission-outbox-recipient.test.mjs` route’un bu contract’ı ve notification sınıfını koruduğunu doğruluyor. Fatura/transactional toplu gönderim çağrıları henüz ayrı invoice recipient contract’ı ile bağlanmadı.

### MAIL-15 — Deliverability dashboard

Domain health, queue, accepted/delivered/bounce/complaint ve pause sebebini göster. Çıkış: Gönderildi/teslim edildi ayrımı görünür.

Uygulama durumu (2026-09-03): `src/lib/email-deliverability-metrics.ts` durable outbox ve işlenmiş provider event kayıtlarından queued/sending/accepted/failed/delivered/bounced/rejected/complaints/unsubscribes metriklerini hesaplıyor; accepted yalnızca outbox provider kabulünü, delivered yalnızca doğrulanmış event’i temsil ediyor. `/api/dashboard` artık `failedNotifications` için mock değer kullanmıyor, workspace email protection pause durumunu ve deliverability özetini döndürüyor. Dashboard sistem uyarıları fabricated Stripe/backup/feature metinleri yerine yalnızca gerçek marketing pause ve delivery failure durumlarını gösteriyor. `dashboard-view.tsx` kabul/teslim/bekleyen/hatalı ayrımını ve kanıt yok durumunu görünür kılıyor. `tests/email-deliverability-metrics.test.mjs` ve `tests/dashboard-deliverability.test.mjs` bu sözleşmeyi doğruluyor. Provider-specific rate/domain ayrıntılı deliverability ekranı MAIL-15’in sonraki mikro paketidir.

### MAIL-16 — Toplu fatura gönderim ekranı

Document-ready faturaları tekil/seçili/toplu gönder; suppression ve rate özetini göster. Çıkış: Belgesiz veya yetkisiz kayıt gönderilemiyor.

### MAIL-17 — Toplu notification ekranı

Mesaj sınıfı, preference ve alıcı özetini göster. Çıkış: Marketing consent notification akışında yanlış kullanılmıyor.

### MAIL-18 — Provider sandbox testleri

Başarılı, hard/soft bounce, complaint, reject, rate-limit ve webhook replay fixture’larını çalıştır. Çıkış: Her event doğru state’e geçiyor.

### MAIL-19 — Deliverability acceptance

SPF/DKIM/DMARC pass, TLS, alignment, unsubscribe ve test mailbox teslimatını doğrula. Çıkış: DNS/provider kanıtı olmadan live yok.

### MAIL-20 — KVKK/policy/release kapısı

Data processor, retention, yurt dışı aktarım, ticari ileti ve provider sözleşmesi kanıtlarını topla. Çıkış: Teknik ve hukuki/iş onayı olmadan live değil.

**Öncelik notu:** MAIL-18..MAIL-20, kendisini tetikleyen ödeme/fatura/provider sandbox kanıtı olmadan bağımsız release fazı değildir. Fatura ve ödeme çekirdeği tamamlanmadan bu paketler yalnızca genel teslimat sözleşmesi ve credential’sız fixture düzeyinde kalır; canlı toplu fatura veya bildirim gönderimi açılamaz.

## 11. Definition of Done

- Fatura, notification ve marketing sınıfları ayrılmış.
- Mailchimp Marketing ve Mailchimp Transactional ayrı adapter/izin modeli kullanıyor.
- SPF, DKIM, DMARC, alignment ve TLS health kontrolü var.
- Toplu gönderim quota/rate/batch ile kontrollü.
- Hard bounce, complaint, unsubscribe ve rejection işleniyor.
- Accepted/delivered/inbox placement ayrımı gösteriliyor.
- Queue retry, idempotency, pause/resume ve webhook signature test edilmiş.
- API key, SMTP secret, webhook secret ve PII log/exportta yok.
- Gerçek DNS doğrulaması, provider test hesabı, acceptance ve rollback hazır.

## 12. Birincil kaynaklar

- [Gmail Email sender guidelines](https://support.google.com/mail/answer/81126)
- [Gmail sender guidelines FAQ](https://support.google.com/mail/answer/14229414)
- [Mailchimp marketing compliance](https://mailchimp.com/help/about-compliance-for-email-marketing/)
- [Mailchimp Acceptable Use Policy](https://mailchimp.com/legal/acceptable_use/)
- [Mailchimp Transactional fundamentals](https://mailchimp.com/developer/transactional/docs/fundamentals/)
- [Mailchimp Transactional SMTP integration](https://mailchimp.com/developer/transactional/docs/smtp-integration/)
- [Mailchimp Transactional authentication and delivery](https://mailchimp.com/developer/transactional/docs/authentication-delivery/)
- [Amazon SES sender reputation](https://docs.aws.amazon.com/ses/latest/dg/monitor-sender-reputation.html)
- [Amazon SES email program success metrics](https://docs.aws.amazon.com/ses/latest/dg/success-metrics.html)
- [OWASP Transaction Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)
