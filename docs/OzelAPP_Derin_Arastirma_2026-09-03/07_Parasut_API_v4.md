# 07 — Paraşüt API v4 Derin Araştırması

**Erişim tarihi:** 3 Eylül 2026  
**Kanıt:** Resmi v4 Swagger ve Paraşüt dokümantasyonu. Swagger’ın görünür değişiklik geçmişi eski olduğundan canlı sözleşme testleri kapı şartıdır.

## Doğrulanmış API sınırı

- API base: `https://api.parasut.com/v4`; şirket kapsamı `{company_id}`.
- Rate limit: 10 istek / 10 saniye.
- OAuth2 erişim tokenı yaklaşık 2 saat; refresh işleminde refresh token da yenilenir.
- Belgelenmiş kaynaklar: contacts, products, sales invoices, e-invoice inboxes, e-invoices, e-archives, trackable jobs ve e-belge PDF kaynakları.
- E-belge oluşturma asenkron job’dır: `pending/running/error/done`.
- Job tamamlanınca satış faturası `active_e_document` ilişkisiyle tekrar okunur.
- PDF isteği hazır değilse `204` dönebilir. Dönen PDF URL’si yaklaşık bir saat geçerlidir ve resmi doküman bu URL’nin son kullanıcıyla doğrudan paylaşılmamasını, uygulamanın dosyayı indirip kendisinin sunmasını ister.

## Güvenli OAuth bağlantısı

Paraşüt dokümanı authorization code ve password grant yüzeyleri gösterse de OAuth 2.0 Security BCP (RFC 9700) resource owner password credentials grant’in kullanılmamasını şart koşar. OzelAPP authorization code kullanmalı; redirect URI exact match, `state`, mümkünse PKCE, kısa ömürlü authorization transaction ve tek kullanımlı callback uygulanmalıdır. Paraşüt’ün PKCE desteği mevcut dokümanda doğrulanamadı; yazılı teyit gerekir.

Access token yalnız worker runtime’da; refresh token KMS/envelope encryption ile tenant+company+provider context’ine bağlı tutulur. Refresh rotasyonu atomik compare-and-swap olmalıdır: yeni access+refresh birlikte yazılmadan eskisi geçersiz sayılmaz. Token veya authorization code loglanmaz. Disconnect UI’sı yerel credential’ı revoke/erişilemez yapar; provider-side revocation endpoint’i dokümante edilmediği için kullanıcıya “Paraşüt erişimini ayrıca kaldırın” adımı gösterilir.

## Yalnız doğrulanmış iş akışı

1. OAuth authorization code ile tenant/company bağlantısı kur.
2. Müşteriyi vergi kimliği/external ID ile ara; kontrollü biçimde oluştur/eşleştir.
3. Ürün/hizmeti external mapping ile ara; yoksa oluştur.
4. Satış faturası oluştur; internal invoice ID’yi ilişkide/metadata’da kanıtlanmış alanla bağla.
5. Alıcı VKN’sini e-Fatura inbox listesinde sorgula.
6. Kayıtlıysa e-Fatura; değilse e-Arşiv create çağrısı yap.
7. Dönen job ID’yi rate limit dostu backoff ile `TrackableJobs` üzerinden izle.
8. `done` sonrası sales invoice’ı `active_e_document` ilişkisiyle tekrar oku.
9. PDF endpoint’ini hazır olana kadar sınırlı sorgula; `204` beklenen “hazır değil” durumudur.
10. Geçici URL’yi backend indirir; dosya `09` raporundaki validate/quarantine/immutable akışına girer.

## Rate limit, retry ve yerel idempotency

10/10 saniye limiti tenant/company/adaptor bazlı token bucket ve queue ile korunmalıdır. `429`/`5xx`/network timeout’ta bounded exponential backoff+jitter; validation/auth `4xx`’te kör retry yoktur. Swagger resmi bir retry sözleşmesi veya `Retry-After` garantisi vermediği için bu politika OzelAPP dayanıklılık tasarımıdır.

Genel idempotency header belgelenmemiştir. Her create öncesi yerel operation kaydı, canonical request hash ve external mapping kullanılır. Timeout sonrası ikinci create çağrısından önce mümkünse list/get ile sonucu bulma; emin olunamıyorsa otomatik tekrar yerine inceleme kuyruğu. “Idempotency varmış gibi” header uydurulmaz.

## Doğrulanamayan noktalar

| Konu | Durum | Release etkisi |
|---|---|---|
| Genel idempotency header/sözleşmesi | UNKNOWN | Paraşüt’ten yazılı yanıt + duplicate contract testi |
| Resmi sandbox | UNKNOWN | Test hesabı/izole company yazılı teyit |
| Token revocation endpoint’i | UNKNOWN | Disconnect çift taraflı operasyon runbook’u |
| Kanonik imzalı XML/UBL indirme endpoint’i | UNKNOWN | Yalnız PDF ile yasal belge akışı tamam sayılmaz |
| E-belge-ready webhook’u | UNKNOWN | Polling gerekir; webhook var sayılmaz |
| Resmi retry/backoff sözleşmesi | UNKNOWN | Bounded client politikası + destek teyidi |
| PKCE desteği | UNKNOWN | Auth code yine kullanılır; Paraşüt yazılı teyit |

## Resmi kaynak kanıtı

| Kaynak | Kurum | URL | Bölüm | Karar |
|---|---|---|---|---|
| Paraşüt API v4 docs | Paraşüt | https://apidocs.parasut.com/ | Authentication/rate limit/resources | v4 ve 10/10s |
| Swagger 4.0.0 | Paraşüt | https://apidocs.parasut.com/swagger.json | OAuth2, paths, schemas | Doğrulanmış endpoint/async/PDF yüzeyi |
| OAuth 2.0 Security BCP, RFC 9700 | IETF | https://www.rfc-editor.org/rfc/rfc9700.html | Redirect, PKCE, password grant | Auth code seçimi; password grant reddi |

## Karar kaydı

**Karar:** Paraşüt v4 yalnız resmi Swagger’da görülen authorization-code, contact/product/sales-invoice/e-document/job/PDF akışıyla entegre edilecek; dokümansız yetenekler dış bağımlılık kalacak.  
**Durum:** ACCEPTED  
**Bağlı ana faz:** 4  
**Bağımlılıklar:** Paraşüt client ID/secret/redirect onayı, tenant company, test/live erişimi, GİB/müşavir kuralları.  
**Sektörel gerekçe:** E-belge üretimi asenkron ve yetkili muhasebe sağlayıcısı sonucuna bağlıdır.  
**Kaynak:** Paraşüt API v4 site/Swagger; IETF RFC 9700.  
**Teknik gerekçe:** Queue/throttle/job state ve yerel operation ledger timeout/duplicate riskini sınırlar.  
**Güvenlik etkisi:** Per-tenant şifreli refresh token, exact redirect ve public olmayan belge indirme tenant sızıntısını azaltır.  
**Maliyet/karmaşıklık:** Orta-yüksek; OAuth rotation, mapping, polling, rate limit ve belge doğrulama gerekir.  
**Yanlış uygulanırsa risk:** Çift fatura, kırılan token, rate-limit kilidi, yanlış e-belge türü ve geçici link sızıntısı.  
**Minimum uygulanabilir çözüm:** Auth code + contact/product mapping + sales invoice + inbox seçimi + trackable job + backend PDF alma.  
**İleride genişletme yolu:** Paraşüt’ün yazılı kanıtıyla idempotency/webhook/XML/revocation özellikleri.

RESEARCH COMPLETE — READY FOR ARCHITECTURE REVIEW
