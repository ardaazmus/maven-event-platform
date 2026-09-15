# OzelAPP — R-10 ve V4 Güvenli Entegrasyon, Wizard ve Gerçekçilik Simülasyonu Araştırma Promptu

## Kullanım talimatı

Bu dosyanın tamamını tek araştırma görevi olarak ele al. Araştırma sonucunu yine **tek bir Markdown dosyası** olarak üret. Dosya adı şu biçimde olsun:

`OzelAPP_R10_V4_Guvenli_Entegrasyon_Wizard_Simulasyon_Arastirma_Raporu.md`

Araştırma boyunca ürünün gerçek adını, şirket adını, müşteri adını, alan adını, gerçek kullanıcı verisini, gerçek adresi, vergi bilgisini, secret/token/API key değerini veya özel proje dosya yolunu kullanma. Ürünü yalnızca **OzelAPP** adıyla an. Gerçek sırları örnekleme; yalnızca açıkça sahte placeholder kullan:

- `EXAMPLE_API_KEY`
- `example-tenant-id`
- `synthetic-user-001`
- `https://example.invalid`

Bu görev bir **araştırma ve uygulanabilirlik raporu** görevidir. R-10 veya V4 üretim özelliklerini araştırma sonucuna bakmadan açma; araştırma, hangi kapıların hangi kanıtla açılabileceğini belirlemelidir.

## Bağlam ve hedef

OzelAPP çok kiracılı bir form platformudur. İlk ürün hedefi iç kullanım formları ve first-party ödeme/manual fatura akışıdır. V4, daha ileri bir SaaS modelidir: her müşteri kendi ödeme, fatura, e-posta ve medya/varlık bağlantılarını kendi şirket bilgileriyle yönetir; OzelAPP müşterinin ödeme veya fatura parasını kendi adına tahsil etmez. R-10, tüm sürümler için ortak güvenlik, dış kanıt, operasyon ve release kapısıdır.

Araştırmanın amacı şudur:

1. Kullanıcının kendi belgelerini, görsellerini, PDF’lerini ve gerekli iş kayıtlarını güvenli şekilde yükleyebildiği veya yalnız kendi tenant kapsamındaki medya klasöründen seçebildiği modeli tanımlamak.
2. Kullanıcının kendi ödeme, fatura, e-posta, medya veya başka iş API’lerine güvenli biçimde bağlanabildiği BYO (Bring Your Own) bağlantı modelini tanımlamak.
3. Bu bağlantıları teknik bilgisi sınırlı kullanıcıya güvenli biçimde kurduran wizard’ları tasarlamak.
4. Gerçek provider veya production verisi kullanmadan; gerçek server davranışını, webhook’ları, callback’leri, kullanıcı kayıtlarını, belge akışını ve hata durumlarını mümkün olduğunca gerçekçi simüle eden bir test/staging yaklaşımı belirlemek.
5. R-10 ve V4 için gerekli güvenlik, gizlilik, yetkilendirme, tenant izolasyonu, audit, secret yönetimi, veri yaşam döngüsü, geri alma ve release kanıtlarını çıkarmak.
6. Araştırma sonucunu mevcut V1/V2/V3 sırasını bozmadan, R-10 ve V4’ü erkene çekmeden, ileride uygulanabilir küçük mikro-fazlara çevirmek.

## Araştırma kuralları

- Öncelik sırası: resmi provider dokümanı, resmi güvenlik/standart kurumu, resmi mevzuat ve resmi SDK/API sözleşmesi; ardından güvenilir sektör rehberleri.
- Teknik iddialar için birincil kaynak kullan. Blog veya forumu tek başına kanıt kabul etme.
- Her önemli sonuç için doğrudan URL, erişim tarihi, kaynak türü ve kanıtın hangi kararı desteklediğini yaz.
- Her bulguyu açıkça sınıflandır: `CONFIRMED`, `PARTIALLY_CONFIRMED`, `ASSUMPTION`, `UNKNOWN`, `EXTERNAL_DEPENDENCY`, `NO-GO`.
- Güncel veya hesap/merchant sözleşmesine bağlı bilgileri genel doğru gibi yazma.
- Bir provider’ın sandbox’ı olması production uygunluğunu kanıtlamaz. Sandbox, mock, local fake ve replay testlerini ayrı sınıflandır.
- Gerçek ödeme kartı, PAN, CVV, gerçek kimlik belgesi, gerçek müşteri listesi, gerçek vergi belgesi, gerçek şirket sırrı veya gerçek e-posta hesabı kullanma.
- OzelAPP’ın müşteri adına ödeme almadığını ve müşterinin kendi provider hesabını kullandığını her akışta koru.
- R-10’u aşmak için alternatif başarı yolu, sahte onay, sessiz bypass veya blanket `admin` yetkisi önermeme.
- Kullanıcının istediği özellik teknik olarak yanlış, gereksiz veya tehlikeliyse bunu `SIMPLIFY`, `DEFER`, `REJECT` veya `BLOCKED` kararıyla gerekçelendir.

## 1. R-10 ve V4 kapsam sınırı

Aşağıdakileri birbirinden ayırarak araştır:

### R-10 ortak güvenlik ve release kapıları

- Kimlik doğrulama, MFA/step-up ve oturum güvenliği.
- RBAC/ABAC, tenant/workspace/form/record/document scope.
- OzelAPP operatörünün müşteriye destek amacıyla erişimi: deny-by-default, izin, amaç/ticket, süre, salt-okuma allowlist’i, audit, revocation ve break-glass sınırları.
- Secret/token/API key saklama, envelope encryption, key rotation, redaction, erişim logları ve secret’ın client/log/backup/export içine sızmaması.
- SSRF, URL fetch, webhook forgery, replay, signature verification, redirect/callback manipulation, open redirect ve arbitrary file upload riskleri.
- PII, özel nitelikli veri, belge ve medya için veri minimizasyonu, retention, silme, export, legal hold ve erişim izleri.
- Backup/restore, incident response, malware/AV scanning, quarantine ve güvenli belge indirme.
- Rate limit, abuse prevention, DoS, queue/worker lease, idempotency ve duplicate event kontrolü.
- Production öncesi staging, DNS/TLS, domain/email, monitoring, alerting, rollback, disaster recovery ve bağımsız güvenlik incelemesi.

### V4 SaaS ve BYO bağlantı kapıları

- Tenant oluşturma, tenant suspend/reactivate ve verinin korunması.
- Tenant’ın kendi ödeme provider hesabını tanıtması; OzelAPP’ın müşteri parasını tahsil etmemesi.
- Tenant’ın kendi fatura/muhasebe sistemini tanıtması; manuel fatura ile otomatik fatura ayrımı.
- Tenant’ın kendi transactional mail/sender/domain ayarını kullanması; OzelAPP platform mailleri ile tenant maillerinin ayrımı.
- Tenant’a ait medya, belge, webhook, export ve audit verisinin başka tenant’a görünmemesi.
- OzelAPP platform abonelik ücretinin tenant’ın end-customer payment domaininden ayrılması.
- Feature entitlement/module flags ile ödeme, fatura, mail, belge ve yaka kartı gibi modüllerin ayrı ayrı açılıp kapanması.
- Tenant bağlantısı iptal edildiğinde public formların, mevcut kayıtların, belgelerin, export’un ve yeniden etkinleştirme davranışının doğru olması.
- Tenant kendi bağlantısını değiştirdiğinde eski credential, pending job, webhook ve outbox kayıtlarının güvenli yaşam döngüsü.

Her gereklilik için şu tabloyu üret:

| Gereklilik | R-10 mi V4 mü? | Uygulama kanıtı | Dış kanıt | Başarısızlık davranışı | Karar |
|---|---|---|---|---|---|

## 2. Kullanıcının belge ve medya yükleme modeli

Kullanıcının bilgisayarından veya yalnız kendi kapsamındaki medya klasöründen belge/görsel yüklemesini şu ayrımlarla araştır:

- Form medya alanı.
- Form görünüm/header/footer medya alanı.
- Yaka kartı arka plan PDF’i ve ön/arka yüz tasarımı.
- Fatura belgesi ve muhasebeden gelen dosya.
- Kullanıcı profil veya marka varlığı.
- API bağlantısı için yüklenen sertifika/metadata dosyası varsa bunun normal medya dosyasından ayrılması.
- Tekil yükleme, seçili kayıt yükleme ve toplu yükleme.
- Kullanıcının sadece kendi form/tenant/iş alanı varlıklarını görebilmesi.
- Upload sonrası quarantine → scan → verified → ready → archived/deleted durumları.
- PDF, PNG, JPEG, WebP, SVG, ZIP, XLSX gibi tiplerin her birinin gerçekten gerekli olup olmadığı.
- MIME sniffing, magic byte, uzantı aldatması, SVG script riski, PDF active content, decompression bomb, zip traversal, polyglot dosya, büyük dosya ve görsel boyut sınırları.
- Dosya adı normalizasyonu, path traversal, collision, content hash ve immutable object key.
- Public URL yerine yetkili süreli download endpoint’i ve access audit.
- Preview oluşturmanın orijinal belgeye güvenlik etkisi.
- Aynı dosyanın başka tenant’a veya yanlış forma bağlanmasını engelleyen scope modeli.

Önerilen fakat kanıtlanması gereken yaşam döngüsünü değerlendir:

`upload_request → quarantined → scanned → verified → ready → in_use → archived/deleted`

Her geçiş için aktör, yetki, idempotency, audit ve geri dönüş davranışını belirt.

## 3. BYO API ve bağlantı wizard’ları

OzelAPP içinde kullanıcıyı adım adım yönlendirecek wizard’ları provider’dan bağımsız bir çekirdekle tasarla. Her wizard için ekran, veri, server action, doğrulama, hata, geri alma ve tamamlanma koşullarını yaz.

### Ortak bağlantı wizard’ı

1. Kullanım amacı seçimi: ödeme, fatura, e-posta, medya veya başka bağlantı.
2. Tenant ve ortam seçimi: test/sandbox veya live; live varsayılan olmamalı.
3. Provider seçimi ve capability açıklaması.
4. Gerekli credential alanlarının açıklanması; secret değerinin tekrar gösterilmemesi.
5. OAuth, API key, certificate veya webhook secret yöntemlerinin ayrımı.
6. Redirect URI/state/PKCE/nonce ve callback güvenliği.
7. Server-side connection test; browser’dan başarı kabul edilmemesi.
8. Webhook URL ve imza doğrulama testi.
9. Capability matrix: currency, payment method, refund, invoice, email, file, webhook ve rate limit.
10. Test event/replay sonucu.
11. İnsan onayı gereken noktalar.
12. Enable/disable ve rotation planı.
13. Final özet: tenant, provider, environment, scope, capabilities, son test ve kalan risk.

### Ödeme bağlantı wizard’ı

- Hosted checkout/redirect kullanımı ve kart verisinin OzelAPP’a girmemesi.
- Merchant hesabı, ortam, para birimi, 3DS ve yabancı kart capability’si.
- PaymentOrder, callback, retrieve, webhook, reconciliation ve idempotency bağları.
- Refund/cancel/chargeback yetenekleri doğrulanmadan mutation kapısı.
- Payment success ile invoice/document-ready/mail gönderiminin birbirine karıştırılmaması.

### Fatura bağlantı wizard’ı

- Manuel fatura modu.
- Gelecekteki provider/API modu.
- Muhasebecinin belge yükleme ve form yanıtıyla eşleştirme akışı.
- E-fatura/e-arşiv gibi resmi belge türlerinin ayrımı.
- Document-ready olmadan müşteriye gönderim yapılmaması.
- Otomatik fatura kesmenin ancak provider, hesap ve hukuki kanıtla açılması.

### Mail bağlantı wizard’ı

- Form kayıt/onay/bildirim maili ile fatura/transactional mail ayrımı.
- SMTP, transactional provider, marketing platformu ve Mailchimp benzeri sistemlerin görev ayrımı.
- Sender identity, domain authentication, SPF/DKIM/DMARC, bounce/complaint/suppression ve unsubscribe sınırları.
- Toplu mailin transactional olaylarla karıştırılmaması.
- Mail gönderiminden önce belge-ready ve alıcı uygunluğu kontrolü.

### Medya/belge bağlantı wizard’ı

- Tenant medya klasörü seçimi.
- Bilgisayardan upload.
- Scan/quarantine sonucu.
- Public/private kullanım amacı.
- Kullanım yeri ve scope özeti.
- Değiştirme, kaldırma, arşivleme ve referans kırılmasının yönetimi.

Her wizard için bu tablo zorunlu:

| Adım | Kullanıcıya görünen alan | Server doğrulaması | Saklanan veri | Yetki/scope | Hata ve geri dönüş | Test kanıtı |
|---|---|---|---|---|---|---|

## 4. Gerçek server davranışını güvenli biçimde simüle etme

Gerçek production’a dokunmadan şu ortam modelini araştır ve öner:

| Ortam | Amaç | Veri | Provider | Secret | Dış erişim | Release anlamı |
|---|---|---|---|---|---|---|

En az şu seçenekleri karşılaştır:

- Local deterministic fake provider.
- Contract test server.
- Webhook event replay fixture.
- Sandboxed integration environment.
- Provider sandbox hesabı.
- Ephemeral preview/staging environment.
- Test database ve disposable object storage.
- Mail sink/capture server.
- AV/quarantine test double.
- Failure injection: timeout, 429, 5xx, invalid signature, duplicate, out-of-order, stale lease, partial failure.

Simülasyonun sahte başarı vermemesi için:

- Her test event’i `synthetic` olarak işaretlenmeli.
- Mock başarı production/provider kanıtı sayılmamalı.
- Provider adapter contract testleri ile gerçek sandbox testleri ayrı raporlanmalı.
- Gerçek endpoint’e çıkış allowlist ve environment guard ile kapatılmalı.
- Test secret’ları production credential formatına benzese bile gerçek olmamalı.
- Test veritabanı ve object storage production’dan fiziksel veya mantıksal olarak ayrılmalı.
- Test kullanıcıları, tenant’lar ve belgeler sentetik olmalı.
- Dış webhook replay’i imza doğrulamasını atlamamalı.
- Test sonunda disposable veri silinmeli veya otomatik expiration uygulanmalı.

İstenen test senaryoları:

1. Tenant oluşturma ve izolasyon.
2. Synthetic user form kaydı.
3. Public snapshot üzerinden form gösterimi.
4. Hosted payment redirect ve callback.
5. Retrieve ile ödeme kesinleştirme.
6. Webhook duplicate/replay/out-of-order.
7. Tutar/para birimi/correlation uyuşmazlığı.
8. Manuel fatura belgesi upload → quarantine → verified → document-ready.
9. Belgenin doğru katılımcıya tekil eşleştirilmesi.
10. Tekil ve toplu export’un tenant scope içinde kalması.
11. Fatura maili ile form kayıt mailinin ayrı sender/channel olması.
12. Mail sink üzerinde alıcı, ek, template ve audit doğrulaması.
13. Yaka kartı PDF’inin sentetik katılımcı alanlarıyla üretilmesi.
14. Aynı ad-soyad/title ve benzersiz ID çakışması.
15. Tenant bağlantısı iptali, credential rotation ve re-enable.
16. Unauthorized cross-tenant read/download/write denemesi.
17. Expired link, revoked access ve deleted/archived asset.
18. Worker restart, expired lease ve idempotent replay.
19. Backup/restore sonrası scope, hash ve audit korunumu.
20. Production guard’ın test ortamından live mutasyonu engellemesi.

## 5. Sentetik gerçek kullanıcı ve kayıt üretimi

Gerçek kişi verisi kullanmadan gerçekçi fixture üretimini araştır:

- Sentetik Türkçe ve uluslararası ad-soyad/title üretimi.
- E-posta ve telefonların gerçek kişiye gitmeyecek domain/numara aralıkları.
- PaymentOrder, submission, invoice, document, mail, badge ve audit kayıtlarının correlation ID ilişkisi.
- Aynı isim-soyad, aynı title, eksik title, Türkçe karakter, uzun ad ve collision senaryoları.
- QR içeriğinde kişisel verinin azaltılması; tahmin edilebilir ID yerine opaque veya imzalı referans.
- Fixture seed’inin tekrarlanabilirliği ve testler arası izolasyon.
- Sentetik verinin log, screenshot, export ve artifact içinde açıkça işaretlenmesi.

Örnek fixture kimlikleri yalnızca şu biçimde olsun:

`synthetic-tenant-001`, `synthetic-form-001`, `synthetic-submission-001`, `synthetic-payment-001`, `synthetic-document-001`.

## 6. Güvenlik tehdit modeli

STRIDE ve abuse-case yaklaşımıyla şu varlıkları değerlendir:

- Tenant ve workspace.
- Form snapshot ve public submission.
- PaymentOrder/payment attempt.
- Provider connection ve secret envelope.
- Webhook inbox ve event reducer.
- Invoice/document/media asset.
- Mail template, recipient ve outbox.
- Badge template, rendered PDF ve QR.
- Worker, queue, replay ve audit log.
- OzelAPP support/operator erişimi.

Her tehdit için:

| Varlık | Saldırgan | Saldırı yolu | Etki | Mevcut kontrol | Eksik kontrol | Test | Öncelik | Karar |
|---|---|---|---|---|---|---|---|---|

Özellikle şu saldırıları araştır:

- Cross-tenant IDOR/BOLA.
- Stolen session ve refresh token.
- OAuth authorization code interception ve confused deputy.
- SSRF ile internal metadata veya private endpoint erişimi.
- Webhook signature bypass, replay ve event poisoning.
- File upload malware, active content, zip traversal ve resource exhaustion.
- PDF/SVG/XLSX içeriğiyle istemci veya server saldırısı.
- Secret exposure in logs, errors, traces, backups, exports and client bundles.
- Public/private document link tahmini.
- Duplicate payment, duplicate invoice, duplicate mail ve duplicate badge.
- Queue poisoning ve worker privilege escalation.
- Admin/support break-glass misuse.
- Data retention ihlali ve tenant silme/suspend sonrası erişim.

## 7. API ve veri mimarisi

Provider-neutral bir port/adapter mimarisi öner; ancak mevcut çekirdeği gereksiz büyütme. Aşağıdakileri tanımla:

- Connection, capability, environment, scope ve health modeli.
- Secret metadata ile encrypted secret değerinin ayrımı.
- OAuth token rotation ve revocation.
- Credential versioning.
- Webhook endpoint ve event inbox.
- Idempotency key, request hash ve replay policy.
- Payment, invoice, document, mail ve badge arasında yalnız güvenli correlation.
- Raw provider payload’ın public API’ye ve gereksiz kalıcı alana girmemesi.
- DTO/allowlist ile public/private sınırı.
- Audit read model ve redaction.
- Upload session, asset status, scan result, document-ready ve download authorization.
- Async job state, lease, retry, dead-letter/quarantine ve operator review.

Önerilen API sözleşmelerini tablo veya örnek JSON ile ver. Örneklerde gerçek secret/PII kullanma. Her endpoint için auth, tenant scope, input schema, idempotency, rate limit, error category ve audit alanlarını yaz.

## 8. Wizard UI/UX araştırması

Sektördeki güçlü örnekleri inceleyerek şu UX kararlarını ver:

- Wizard mı, settings formu mu, guided checklist mi; hangi işte hangisi?
- Kullanıcıya secret alanlarını ne zaman ve nasıl gösterme?
- Test başarısının yalnız server kanıtıyla gösterilmesi.
- Capability ve eksik yapılandırmanın açık gösterilmesi.
- Test/sandbox/live ayrımının renk, metin ve onayla görünür olması.
- İleri düzey alanların saklanması ama erişilebilir olması.
- Her adımda kaydetme, geri dönme, devam etme ve iptal davranışı.
- Başarısız testte çözüm önerisi ve tekrar deneme.
- Credential değişiminde eski bağlantının etkisinin açıklanması.
- Kullanıcının oluşturduğu belgenin gerçekten hangi form/tenant alanına bağlı olduğunun görünmesi.
- Mobil/tablet responsive davranışı.
- Keyboard, screen reader, focus, error summary ve destructive action onayı.
- “Bağlandı” ifadesinin yalnız gerçek test kanıtından sonra kullanılması.
- Sahte veya mock testin UI’da açıkça belirtilmesi.

Her wizard için ekran akışını metin tabanlı wireflow olarak yaz:

`Giriş → kapsam → ortam → credential → server test → capability → webhook → örnek olay → onay → etkinleştirme → durum/geri alma`

## 9. Uygulama sırası ve küçük mikro-faz planı

Araştırma sonunda OzelAPP’ın mevcut V1/V2/V3 önceliğini değiştirmeden, R-10 ve V4’ü erken ürüne dönüştürmeden bir uygulama planı çıkar.

Her mikro-faz:

- En fazla 15 dakika.
- Tek ölçülebilir çıktı.
- Açık allowed files.
- Gerekli reads.
- Preflight.
- Acceptance criteria.
- Rollback.
- Test ve kanıt.
- `ACCEPTED`, `SIMPLIFIED`, `DEFERRED`, `REJECTED` veya `BLOCKED` kararı.

Plan en az şu katmanları ayrı değerlendirsin:

1. Mevcut V1/V2 güvenli sözleşmelerine dokunmadan ortak asset/connection sınırları.
2. Local fake provider ve synthetic fixture altyapısı.
3. Upload/quarantine/scan/document-ready sözleşmesi.
4. BYO connection metadata ve secret lifecycle.
5. Server-side connection test ve capability read model.
6. Webhook/replay/failure injection test harness.
7. Manuel fatura ve belge eşleştirme.
8. Mail channel separation ve mail sink.
9. Yaka kartı PDF ve QR correlation testleri.
10. Wizard UI yalnız gerçek server kanıtına bağlandığında.
11. Staging/observability/backup/recovery kanıtları.
12. R-10 bağımsız review ve external evidence.
13. V4 tenant entitlement/BYO/suspend-reactivate.

R-10 dış kanıtı, gerçek merchant/provider hesabı, production TLS/DNS, AV/quarantine servisi, backup/restore tatbikatı, hukuki/DPA onayı veya bağımsız review yoksa planı `LOCAL_PASS` ile production release olarak raporlama.

## 10. Beklenen rapor formatı

Çıktı tek Markdown dosyası olmalı ve şu sırayı korumalı:

1. Yönetici özeti.
2. Kapsam, kapsam dışı ve varsayımlar.
3. Kaynak yöntemi ve kanıt sınıfları.
4. R-10 gereklilik matrisi.
5. V4 gereklilik matrisi.
6. Belge/medya upload ve güvenli yaşam döngüsü.
7. BYO API/connection wizard tasarımları.
8. API/DB/secret/queue mimarisi.
9. Local fake, sandbox, staging ve gerçek server simülasyon karşılaştırması.
10. Sentetik kullanıcı ve fixture stratejisi.
11. Webhook/payment/invoice/mail/document/badge uçtan uca test matrisi.
12. STRIDE ve abuse-case tehdit modeli.
13. UI/UX ve responsive wizard kararları.
14. Gözlemlenebilirlik, audit, backup/restore ve incident response.
15. R-10 kapı listesi.
16. V4 kapı listesi.
17. 15 dakikalık mikro-faz uygulama planı.
18. Kabul edilmeyen veya ertelenen istekler.
19. Açık sorular ve dış bağımlılıklar.
20. Kaynakça ve her kaynak için doğrudan URL/erişim tarihi.

Her bölümün sonunda şu mini özeti ver:

| Karar | Gerekçe | Uygulama etkisi | Güvenlik etkisi | Faz | Kanıt durumu |
|---|---|---|---|---|---|

## 11. Rapor kalite kapıları

Rapor aşağıdaki koşulları sağlamıyorsa tamamlandı sayılmamalı:

- OzelAPP adı dışında gerçek ürün/şirket kimliği sızdırılmamış.
- Her güncel veya kritik iddia kaynakla ilişkilendirilmiş.
- Kaynak dokümanı ile gerçek test kanıtı birbirine karıştırılmamış.
- R-10 ile V4 gereklilikleri ayrı fakat bağlantılı gösterilmiş.
- Upload, API, webhook, secret, tenant, document, mail ve worker sınırları birlikte ele alınmış.
- Gerçek server simülasyonu ile gerçek production kanıtı ayrılmış.
- Sentetik kullanıcıların gerçek kişilere mail/ödeme/erişim oluşturmadığı kanıtlanmış.
- Wizard’ların yalnız UI görünümü değil server-side doğrulama ve rollback davranışı yazılmış.
- Cross-tenant, IDOR, SSRF, upload ve secret sızıntısı testleri bulunuyor.
- Her risk için owner/kanıt/karar/öncelik belirtilmiş.
- Kullanıcı isteği sektör veya güvenlik doğrusu ile çelişiyorsa doğrudan düzeltilmiş.
- V1/V2/V3 sırası korunmuş; R-10/V4 erkene çekilmemiş.
- Üretim açma önerisi yalnız gerçek dış kanıtlar tamamlandıysa verilmiş; aksi halde açıkça `NO-GO`, `BLOCKED` veya `DEFERRED` yazılmış.

## Son talimat

Eksik bilgi varsa uydurma. Önce kanıtlanabilen minimum güvenli mimariyi çıkar, sonra belirsizlikleri ve hangi gerçek kullanıcı/merchant/provider belgesine ihtiyaç olduğunu listele. OzelAPP’ın gerçek koduna doğrudan değişiklik önermek yerine, uygulanabilir küçük fazlar, doğrulama testleri, wizard akışları ve release kapıları üret. Araştırma sonucu bir özellik listesi değil; güvenli biçimde uygulanabilir, test edilebilir ve ileride denetlenebilir bir teknik karar raporu olmalıdır.
