# R-10 Dış Doğrulama ve Release Kanıt Teslim Rehberi

**Proje:** MavenForms  
**Amaç:** Yerel testleri gerçek ödeme, faturalama, belge, e-posta ve deployment kanıtlarından ayırarak R-10 kararını güvenli biçimde yeniden değerlendirmek.  
**Kural:** Bu rehber bir vergi/hukuk görüşü, provider sözleşmesi veya production onayı değildir. Her belirsizlik `EXTERNAL_DEPENDENCY` veya `LEGAL_REVIEW_REQUIRED` olarak kalır.

## 1. Önce bilinmesi gereken sınır

Yerel testlerin geçmesi şunları kanıtlar: kod sözleşmeleri, tenant sınırları, idempotency, state geçişleri, private belge kapıları, build ve readiness çalışıyor. Yerel testler şunları kanıtlamaz: gerçek merchant hesabı, gerçek provider webhook imzası, Paraşüt/GİB yetkisi, mali müşavir kararı, AV motoru, e-posta teslimatı, TLS/proxy kurulumu veya backup restore.

Hiçbir aşamada chat, issue, commit, log, fixture veya markdown içine secret, access/refresh token, webhook secret, PAN, CVV, gerçek TCKN/VKN, gerçek müşteri e-postası veya provider’ın ham yanıtı yazılmaz. Secret yalnız secret manager veya yerel `.env` mekanizmasına, gerekli kullanıcı tarafından ve redacted kanıtla yüklenir.

**Teslim sorumluluğu:** Bir kanıtın sahibi, sonucu `PASS` olarak bildirmeden önce kendi sistemindeki işlem ile MavenForms’un beklenen normalize state’ini karşılaştırır; yalnız ekran görüntüsü veya “bağlandı” etiketi teknik kabul sayılmaz.

## 2. Roller ve kimin ne sağlayacağı

| Rol | Sağlayacağı | Yapacağı işlem | MavenForms’a verilecek kanıt |
| --- | --- | --- | --- |
| Ürün sahibi / MavenForms yöneticisi | İş modeli, test kapsamı, kullanılacak ülke/para birimi, test formu | Test formunu ve staging origin’ini belirler; live açma yetkisi vermez | Redacted test planı, form/payment ID’leri ve sonuç tablosu |
| Ödeme sağlayıcısı hesabı sahibi | Stripe/iyzico merchant sandbox erişimi ve webhook yapılandırması | Test endpoint’lerini tanımlar, test işlemlerini çalıştırır, webhook’ları doğrular | Event ID, zaman, beklenen/gerçek normalize state, redacted ekran veya provider dashboard kanıtı |
| Mali müşavir / muhasebe | Mükellef, alıcı türü, belge senaryosu, KDV/istisna/tevkifat, tarih-numara ve saklama kararı | Manuel ve Paraşüt akışını iş açısından onaylar; belirsizliği review’a gönderir | İmzalı/onaylı senaryo matrisi veya güvenli iş onayı; gerçek PII içermeyen örnekler |
| Paraşüt hesap yöneticisi | Paraşüt OAuth uygulaması, company ID ve yetkili hesap | OAuth, şirket, müşteri/ürün ve test fatura işlemlerini test ortamında çalıştırır | Company ID’nin maskeli/opaque gösterimi, job/invoice ID, status zaman çizelgesi |
| GİB/özel entegratör yetkilisi | Güncel teknik paket ve yetkili kanal bilgisi | e-Fatura/e-Arşiv senaryosunu ve güncel XSD/Schematron/kod listesini doğrular | Sürüm/hash, yetkili kanal ve müşavir onayı; belge içeriği değil |
| E-posta/domain yöneticisi | Gönderici domain ve DNS erişimi | SPF/DKIM/DMARC, provider sender doğrulaması ve webhook ayarını yapar | Domain doğrulama durumu, redacted DNS kanıtı, delivery event tablosu |
| DevOps/hosting yöneticisi | Staging ve production deployment erişimi | TLS/proxy/HSTS, secret yönetimi, backup/restore ve izole staging’i kurar | URL/origin, config checklist, restore zamanı/hash ve log redaction sonucu |
| Güvenlik/AV sorumlusu | AV veya quarantine servisi | Zararlı/temiz/limit/timeout fixture’larını çalıştırır | Scan verdict, correlation ID ve süre; dosyanın kendisi veya zararlı örnek paylaşılmaz |

## 3. Kullanıcıdan MavenForms’a verilecek güvenli paket

Bu paket secret içermeyen bir `external-evidence-index.md` veya güvenli portal kaydı olmalıdır:

1. Test ortamı adı ve origin: ör. `staging`; production URL’si yalnız deployment yöneticisi tarafından doğrulanır.
2. Sağlayıcı adı ve ortamı: `stripe-sandbox`, `iyzico-sandbox`, `parasut-test` gibi; secret/token değil.
3. Olay kimlikleri: ödeme order ID, provider event ID, Paraşüt job/invoice ID; gerekiyorsa ortası maskeli.
4. UTC tarih-saat, beklenen sonuç, gözlenen normalize sonuç ve test sonucu.
5. Form/payment/invoice/document ilişkisinin workspace içi opaque ID’leri.
6. Kanıt dosyasının SHA-256 özeti; belge veya ekran görüntüsü gerekiyorsa PII redacted kopya.
7. Sorun varsa `EXTERNAL_DEPENDENCY`, `LEGAL_REVIEW_REQUIRED`, `PROVIDER_ERROR` veya `UNVERIFIED` etiketi ve tekrar üretme adımı.

Şunlar gönderilmez: `.env`, secret/token, webhook signing secret, kart numarası/CVV, gerçek müşteri listesi, Paraşüt raw JSON, geçici PDF URL’si, imzalı belge ham içeriği veya production veritabanı yedeği.

## 4. Ödeme sağlayıcıları: kurulum ve kanıt sırası

### 4.1 Ortak ön koşullar

- Sadece sandbox/test merchant hesabı kullanılır.
- Staging origin ve webhook URL’si provider dashboard’a tanımlanır.
- Webhook imzası gerçek test event’iyle doğrulanır; client callback başarı kanıtı olarak tek başına kabul edilmez.
- Her mutation için operation/idempotency key ve provider event ID kaydedilir; raw payload saklanmaz.
- Test matrisi: başarılı, başarısız, bekleyen, timeout, duplicate event, yanlış imza, cross-tenant event, tam iade, kısmi iade ve dispute/chargeback.
- Başarısız veya belirsiz retrieve sonucu yeni create/retry çağrısına körlemesine dönüştürülmez; reconciliation/manual review’a park edilir.

### 4.2 Stripe

**Hesap sahibinin yapacağı:** Stripe test hesabını ve test webhook endpoint’ini hazırlar; test event’lerini dashboard veya resmi test akışıyla üretir; payment intent/order, webhook, retrieve, refund ve dispute sonuçlarını karşılaştırır.

**MavenForms’a verilecek:** yalnız test event ID’leri, payment intent’in maskeli/opaque referansı, event türü, imza doğrulama sonucu, normalize state ve zaman çizelgesi. Secret key veya webhook secret verilmez; ortam secret manager üzerinden bağlanır.

**Kabul:** ödeme yalnız doğrulanmış server/provider sonucu ile succeeded olur; refund/dispute invoice’ı silmez, `refund_or_credit_note_review` durumuna taşır; duplicate event ikinci state/intent üretmez; public DTO’da provider secret veya kart bilgisi bulunmaz.

### 4.3 iyzico

**Hesap sahibinin yapacağı:** iyzico sandbox merchant ve resmi Checkout Form/direct test akışını açar; HPP token/paymentId eşleştirmesini, callback/webhook imzasını, retrieve ve desteklenen refund/chargeback sözleşmesini provider hesabında doğrular.

**MavenForms’a verilecek:** akış türü, test order/payment referansı, event/status, imza sonucu, retrieve sonucu ve provider sözleşme sürümü. API key/secret, raw callback ve müşteri kart verisi verilmez.

**Kabul:** HPP token veya direct paymentId doğru canonical referans olarak eşleşir; yalnız desteklenen `SUCCESS`/`FAILURE` ve doğrulanmış olaylar normalize edilir; bilinmeyen `REFUND/CANCEL/CHARGEBACK` davranışı varsayılmaz ve review/ignored kalır.

### 4.4 Google Pay

Google Pay yalnız seçilen ödeme sağlayıcısının desteklediği ve merchant/domain doğrulaması tamamlandığı durumda test kapsamına alınır. Merchant/domain doğrulama sonucu, browser/device matrisi, başarılı/başarısız ödeme ve webhook kanıtı gerekir. Google Pay token’ı MavenForms veritabanına veya log’a yazılmaz; kart verisi uygulamaya girmez.

## 5. Manuel fatura ve muhasebe handoff’u

### Muhasebeye gönderilecek veri

MavenForms’tan sabit kolonlu, PII erişimi yetkiyle sınırlı Excel/CSV çıkarılır:

- Opaque ödeme/submission referansı
- Fatura adayı ve form referansı
- Alıcı türü, legal name ve gerekli vergi/kimlik alanlarının doğrulama durumu
- `amount_minor`, `currency` ISO-3, vergi tutarı/oranı alanları
- Fatura numarası/UUID varsa durumu
- Manuel/API yolu ve beklenen belge türü
- İade/chargeback veya review flag’i

Export yalnız succeeded/paid, aynı workspace, submission’a bağlı ve henüz güvenli biçimde işlenmemiş adayları içerir. Excel formülü/overflow, duplicate, yanlış batch ve cross-tenant satır kabul edilmez. Gerçek PII gerekiyorsa güvenli muhasebe kanalında ayrıca paylaşılır; chat veya repo kullanılmaz.

### Muhasebeden geri alınacak sonuç

Muhasebe sabit kolon sözleşmesine uygun şekilde kişi bazlı, kısmi veya toplu sonuç döndürür:

- MavenForms opaque referansı veya batch hash’i
- Muhasebe belge numarası/UUID ve belge türü
- Belge tarihi, para birimi, tutar ve vergi alanlarının onay durumu
- Manuel PDF/XML/XLSX dosyası gerekiyorsa dosya hash’i ve açıklanan belge türü
- Satır sonucu: `approved`, `rejected`, `needs_correction`, `duplicate`
- Onaylayan rol ve zaman; gerçek imza/credential değil

MavenForms import sonucu önce quarantine’e alır; dosya türü, boyut, hash, batch eşleşmesi, satır şeması ve duplicate kontrolünden geçmeden uygulama veya mail başlatmaz. `approved` satır bile scan/match/document-ready kapılarını atlayamaz.

## 6. Paraşüt API v4 ve e-belge adımları

### Paraşüt hesabında yapılacaklar

1. Paraşüt test hesabında OAuth uygulaması ve yetkili şirket hesabı oluşturulur.
2. OAuth authorization/code/callback ve refresh rotation test edilir; token yalnız server secret store’da kalır.
3. Şirket/company scope health kontrolü yapılır.
4. Müşteri ve ürün lookup yapılır; exact tax/e-posta veya açık kimlik eşleşmesi yoksa create kararı otomatik verilmez.
5. Gerekirse mali müşavir onayıyla müşteri/ürün create hazırlığı ve idempotency doğrulanır.
6. Succeeded payment’a bağlı satış faturası draft payload’ı oluşturulur; tutar minor-unit, currency ve satır hesapları doğrulanır.
7. `e_invoice_inboxes` lookup ile alıcının e-Fatura kayıt durumu snapshot olarak alınır.
8. Yalnız geçerli TR şirketi, geçerli VKN, başarılı snapshot, işletme capability’si ve muhasebe onayı varsa e-Fatura/e-Arşiv policy sonucu kullanılır. Belirsiz/bireysel/yurt dışı durum review’a gider.
9. Submit sonrası trackable job ID alınır; timeout/409/ID’siz yanıt yeni create değildir, reconciliation’dır.
10. Bounded polling yapılır; job tamamlanmadan PDF alınmaz.
11. Active document/PDF backend’de indirilir; HTTPS geçici provider URL’si müşteriye verilmez.
12. PDF magic, content-type, boyut ve hash kontrolü; private quarantine, AV, stable match, onay ve `document_ready` geçişi yapılır.
13. `issued → document_ready → delivery_queued → sent` sırası tamamlanmadan transactional mail yoktur.

### Paraşüt/GİB’den alınacak kanıt

- Test company scope’un maskeli/opaque referansı
- OAuth/health sonucu ve UTC zamanları
- Contact/product lookup candidate count ve resolution sonucu
- Sales invoice/draft/job/document ID’lerinin maskeli/opaque referansı
- Job state zaman çizelgesi ve retry/reconciliation sonucu
- Active document tipi, PDF hash ve scan/document-ready kararı
- Kullanılan GİB teknik paket sürümü/hash’i ve mali müşavir onayı

Raw access token, raw JSON, geçici PDF URL’si, gerçek belge içeriği ve gerçek müşteri PII’si alınmaz.

## 7. Belge güvenliği ve document-ready

AV/quarantine sorumlusu aşağıdaki redacted test tablosunu sağlar:

| Test | Beklenen sonuç |
| --- | --- |
| Temiz PDF/XML | Private quarantine → clean → approved/matched → document-ready |
| Yanlış uzantı/MIME veya magic | Upload/import reddi |
| Zararlı veya şüpheli dosya | Quarantine’de kalır; delivery yok |
| ZIP/XML dış kaynak/ENTITY | Fail-closed reddi |
| Limit üstü dosya | Boyut sınırı reddi |
| Aynı hash | Duplicate sonucu; ikinci public/delivery kaydı yok |
| Yanlış invoice/workspace | Match reddi; cross-tenant erişim yok |

Kanıt olarak verdict, scan provider adı/sürümü, correlation ID, zaman ve hash verilir; zararlı örnek veya private belge paylaşılmaz.

## 8. Transactional fatura e-postası

E-posta/domain yöneticisi:

1. Gönderici domain için SPF, DKIM ve DMARC durumunu doğrular.
2. Transactional sender/provider hesabını staging’de doğrular.
3. Fatura mailinin yalnız document-ready ve suppression kontrolü geçince kuyruğa girdiğini test eder.
4. Accepted, delivered, bounced, complaint, suppressed, retry ve dead-letter olaylarını üretir.
5. Duplicate delivery idempotency, unsubscribe/marketing ayrımı ve alıcı doğrulamasını kontrol eder.

MavenForms’a verilecek kanıt: provider event ID, message correlation ID, normalize delivery state, zaman, redacted sender/domain ve suppression sonucu. API key, SMTP password, raw provider event ve alıcı listesi verilmez. Fatura mailinde geçici provider PDF URL’si bulunmaz; uygulama içi yetkili private document linki kullanılır.

## 9. Staging, production ve backup kanıtı

DevOps yöneticisi şu sırayı izler:

1. Staging database production’dan ayrılır; test verisi sentetik tutulur.
2. TLS/proxy/origin ve production session cookie/HSTS ayarları doğrulanır.
3. Secret’lar environment/secret manager’da tutulur; build/log içine girmez.
4. Migration disposable staging yedeği üzerinde uygulanır; reset/delete komutu production’da çalıştırılmaz.
5. Backup alınır, checksum kaydedilir, izole ortama restore edilir.
6. Restore sonrası `prisma migrate deploy`, `/api/ready`, invoice/outbox idempotency ve worker expired lease recovery doğrulanır.
7. Rollback ve incident iletişim adımı prova edilir.

Kanıt: ortam adı, migration sürümü, backup/restore zamanları, checksum, readiness sonucu ve redacted log. Production veritabanı yedeği chat veya repo’ya yüklenmez.

## 10. Kanıt dosyası şablonu

Her kanıt için aşağıdaki alanlar yeterlidir:

```text
Evidence-ID: EXT-YYYYMMDD-###
Owner: <rol>
Environment: <sandbox|staging>
Provider/System: <isim>
Scope: <payment|invoice|parasut|document|email|deployment>
Tested-at-UTC: <timestamp>
Input-reference: <opaque/masked id>
Expected: <normalize sonuç>
Observed: <normalize sonuç>
Security-checks: <signature|tenant|idempotency|PII|private-document>
Artifact-SHA256: <hash>
Decision: PASS | FAIL | EXTERNAL_DEPENDENCY | LEGAL_REVIEW_REQUIRED | UNVERIFIED
Notes: <raw secret/PII olmadan kısa not>
```

## 10.1 Dış bağımlılık registry kaydı

Her provider veya operasyonel bağımlılık için aşağıdaki alanlar tek bir
registry kaydında zorunludur. Bu kayıt kanıtın varlığını izler; provider
bağlantısı kurmaz ve tek başına release onayı vermez.

```text
Dependency-ID: DEP-<opaque-id>
Owner: <rol>
Provider/System: <isim>
Environment: sandbox | staging | production
Scope: payment | invoice | parasut | document | email | deployment
Evidence-Class: E0 | E1 | E2 | E3 | E4 | E5 | E6
Evidence-Status: verified | unknown | unsupported | blocked | expired
Expires-At-UTC: <timestamp veya NONE>
Last-Verified-At-UTC: <timestamp>
Input-Reference: <opaque/masked id>
Artifact-SHA256: <hash veya NONE>
Decision: PASS | FAIL | EXTERNAL_DEPENDENCY | LEGAL_REVIEW_REQUIRED | UNVERIFIED
Notes: <secret/PII/raw payload olmadan kısa not>
```

`Evidence-Status` ile `Decision` ayrı tutulur: `verified` yalnız kanıtın
doğrulandığını, `PASS` ise ilgili yerel kabul ölçütünün geçildiğini belirtir.
`unknown`, `unsupported`, `blocked` veya `expired` kayıtlar eksik kanıt olarak
görünür kalır ve production kararında PASS’a yükseltilemez. `production`
ortamı için ayrıca R-10 release kanıtı gerekir; registry kaydı bunu bypass
etmez.

## 11. R-10’u ne açar, ne açmaz?

`R-10` ancak her dış bağımlılık için gerçek ve redacted kanıt, gerekli mali/hukuki onay, deployment/backup kanıtı ve başarılı tekrar testi geldikten sonra yeniden değerlendirilebilir. Yerel testlerin tekrar geçmesi tek başına R-10’u açmaz.

Kanıt eksikliği, provider sözleşmesi belirsizliği, mevzuat değişikliği, scan/e-posta teslimatının yokluğu veya gerçek hesap olmaması `NO-GO` olarak kalır. Bu rehber hazır olduğu için otomatik provider çağrısı, live flag, production migration, gerçek mail gönderimi veya fatura yayınlama yapılmaz.
