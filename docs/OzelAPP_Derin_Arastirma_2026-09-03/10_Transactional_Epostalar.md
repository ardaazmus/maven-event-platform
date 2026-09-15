# 10 — Transactional E-postalar Derin Araştırması

**Erişim tarihi:** 3 Eylül 2026  
**Kapsam sınırı:** Yalnız ödeme/fatura ve zorunlu operasyon bildirimleri; kampanya, bülten, lead nurturing yoktur.

## İzinli olaylar ve akış

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

## Transactional–marketing ayrımı

Türkiye Ticari İletişim düzenlemesinde devam eden üyelik/abonelik, tahsilat/borç, bilgi güncelleme, satın alma ve teslimat bildirimleri belirli koşullarda önceden ticari ileti onayından ayrı değerlendirilebilir; bu mesajlar ürün/hizmet özendirmesi içermemelidir. Somut şablon ve hukuki dayanak `LEGAL REVIEW REQUIRED`dır. Marketing tercihleri ile zorunlu operasyon kategorileri aynı suppression kuralına körlemesine bağlanmamalıdır; buna karşılık hard bounce/complaint güvenlik ve deliverability nedeniyle her ikisini etkileyebilir.

Şablon lint’i promosyon CTA/indirim/çapraz satış alanlarını yasaklar. Her mesajın amacı, dayanağı, template version’ı ve retention’ı kayıtlıdır.

## SPF, DKIM, DMARC ve tenant domain

Google sender guidelines tüm göndericiler için SPF veya DKIM, yüksek hacim için SPF+DKIM+DMARC ve alignment ister; operasyon ve promosyon trafiğini ayrı From adreslerinde tutmayı önerir. OzelAPP en baştan SPF, DKIM ve DMARC’ı birlikte hedeflemelidir.

Tenant domain state machine: `unconfigured → dns_pending → verified → degraded → revoked`. DNS kaydı periyodik doğrulanır. Doğrulanmamış tenant, OzelAPP’ın açık markalı ortak transactional alt alanından gönderir; başka tenant domain’ini kullanamaz. Provider migration’ında identity doğrulaması yeniden gerekir.

## Güvenli fatura linki ve KVKK/GDPR

E-posta eki yerine opaque, PII içermeyen, kısa ömürlü, exact document/audience bağlı HTTPS linki tercih edilir. Token server-side revoke edilebilir; hassas belgede oturum veya step-up istenir. KVKK açısından amaçla sınırlılık, veri minimizasyonu, aydınlatma, güvenlik, saklama ve yurt dışı aktarımı; GDPR uygulanan durumda controller/processor, hukuki dayanak ve aktarım ayrıca incelenir. Provider region, DPA ve alt işleyen listesi procurement kapısıdır. Yanlış alıcıya kişisel veri gönderimi KVKK veri ihlali riski olduğundan alıcı doğrulaması ve teslim audit’i şarttır.

## Sağlayıcı karşılaştırması

| Sağlayıcı | Güçlü senaryo | Dikkat |
|---|---|---|
| Postmark | Transactional-first, yalın akış/webhook | Region/DPA/fiyat/SLA yeniden doğrula |
| SendGrid | Geniş API ve event ekosistemi | Global unsubscribe operasyon postasını yanlış baskılamasın |
| Mailgun | API-first, domain/subaccount kontrolü | Tenant domain ve event adapter testi |
| Amazon SES | AWS-native, yüksek hacim/maliyet odağı | Sandbox çıkışı, region identity/quota, daha çok operasyon |
| Mailchimp Transactional | Zaten Standard/Premium + Mailchimp template süreci | Ücretli add-on, blok fiyatlama; MVP için gereksiz bağımlılık |

Mailchimp Transactional varsayılan seçim olmamalıdır. Mevcut Standard/Premium Mailchimp hesabı ve ortak template/operasyon ihtiyacı yoksa marketing ekosistemine, blok fiyatlamaya ve ayrı add-on’a bağlanmak OzelAPP’ın yalnız transactional kapsamına değer katmaz. İlk seçim tek provider ile yapılmalı, ancak adapter/outbox bağımlılığı taşınabilir tutmalıdır.

## Resmi kaynak kanıtı

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

## Karar kaydı

**Karar:** Yalnız sekiz izinli operasyon olayı provider-bağımsız outbox ile gönderilecek; transactional/marketing kimliği ayrılacak ve varsayılan provider Mailchimp olmayacak.  
**Durum:** ACCEPTED  
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

RESEARCH COMPLETE — READY FOR ARCHITECTURE REVIEW
