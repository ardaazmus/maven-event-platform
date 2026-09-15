# OzelAPP Kaynak Ledgeri

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

## Yerel anonim araştırma girdileri

| Kaynak | Dosya | Kullanım sınırı | Plana etkisi |
|---|---|---|---|
| Anonim teknik mimari, API ve uygulama sözleşmesi | `D:\project\mavenform\docs\Anonim_Teknik_Mimari_API_ve_Uygulama_Sozlesmesi.md` | Araştırma ve tasarım kararı; repository veya canlı entegrasyon kanıtı değildir. | Ana sıra, modül sınırları, API sözleşmesi ve mikro-faz kapıları. |
| Anonim entegrasyon ve production release derin araştırması | `D:\project\mavenform\docs\OzelAPP_Anonim_Entegrasyon_ve_Release_Arastirmasi.md` | Araştırma ve release kapısı girdisi; vergi/hukuk görüşü, provider sözleşmesi veya canlı sistem kanıtı değildir. | iyzico/Paraşüt/GİB/PCI/Google Pay/transactional delivery/production/WP kanıtlarını derinleştirir; ana sıra değişmez. |

## Kanıt boşlukları

- OzelAPP’ın kuruluş ülkesi/Stripe hesap uygunluğu ve canlı sözleşmesi.
- iyzico merchant capability’leri, CF AOC/SAQ belgesi, webhook V3 tam canonical string/replay kuralı ve cancel cut-off.
- Paraşüt sandbox, genel idempotency, PKCE, token revoke, e-belge-ready webhook ve imzalı XML indirme sözleşmesi.
- Şirket özelinde GİB senaryo/tevkifat/istisna/numara/tarih/saklama ve iptal/itiraz uygulaması.
- E-posta sağlayıcı fiyat/SLA/region/DPA/dedicated IP ve Yahoo sender kuralının yeniden doğrulanması.
- WordPress özel updater paketi için seçilecek imza/integrity standardı.

RESEARCH COMPLETE — READY FOR ARCHITECTURE REVIEW
