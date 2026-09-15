# MavenForms e-Belge, Paraşüt API v4 ve API’siz Faturalama Yol Haritası

**Belge durumu:** Uygulama planı / araştırma sonucu
**Tarih:** 2026-09-02
**Kapsam:** Ödeme yapan kişilerin faturalandırılması, Paraşüt API v4, muhasebe ile API’siz çalışma, fatura belgesi yükleme, Excel alışverişi ve güvenli e-posta gönderimi
**Bağımlı ana plan:** [`2026-09-02-mavenforms-payment-security-compliance-roadmap.md`](./2026-09-02-mavenforms-payment-security-compliance-roadmap.md)
**15 dakikalık uygulama planı:** [`2026-09-02-mavenforms-e-belge-15-dakikalik-uygulama-paketleri.md`](./2026-09-02-mavenforms-e-belge-15-dakikalik-uygulama-paketleri.md)
**Toplu e-posta planı:** [`2026-09-02-mavenforms-toplu-e-posta-teslim-edilebilirlik-ve-mail-platformlari.md`](./2026-09-02-mavenforms-toplu-e-posta-teslim-edilebilirlik-ve-mail-platformlari.md)

> Bu belge kod yazıldığı veya hukuki uygunluk alındığı anlamına gelmez. GİB, mali müşavir, Paraşüt ve e-posta sağlayıcısı ile güncel sözleşme/teknik şartlar ayrıca doğrulanmalıdır. Belirsiz bir vergi kuralı kod içine varsayım olarak yazılamaz.

## 1. Amaç ve doğru ürün sınırı

### 1.0 İki aşamalı kullanım modeli

**İlk release — MavenForms first-party:** MavenForms kendi formlarından doğan ödemelerin merchant'ıdır. Aynı ödeme kaynağı üzerinden yurtiçi/yurtdışı ödeme alınır ve iki faturalama yöntemi birlikte açık tutulur: Paraşüt API v4 otomasyonu veya API'siz manuel muhasebe/Excel-belge akışı.

**Sonraki SaaS release — tenant-scoped direct merchant / BYO provider:** Her şirket kendi provider hesabını ve kendi muhasebe/Paraşüt bağlantısını workspace kapsamına tanımlar; MavenForms şirketler adına ödeme almaz, para tutmaz veya payout yapmaz. Şirketin müşteri faturaları ile MavenForms abonelik faturaları ayrı `PaymentOrder`, `InvoiceRecord`, recipient snapshot, belge ve teslimat yaşam döngüleridir. Bir tenant başka tenantın müşteri, ödeme, fatura, belge veya provider kaydını göremez.

MavenForms’ın tenant adına para topladığı/dağıttığı Connect veya Marketplace modeli bu iki evrenin varsayılanı değildir; yalnızca ayrı ticari ve uyum kararıyla `PAY-16` kapsamında açılabilir.

SaaS bağlantı güvenliği için provider ve muhasebe credential’ları workspace’e bağlı encrypted secret reference olarak tutulur. Tenant admin bağlantıyı test edebilir, rotate/revoke edebilir; public istemci bu credential’ları veya ham provider/muhasebe yanıtlarını hiçbir koşulda alamaz.

İlk SaaS pilotunda MavenForms aboneliği manuel kontrol edilebilir. Bu, tenant’ın müşteri ödemesini veya tenant faturasını temsil etmez; yalnızca MavenForms hizmet erişimi state’idir. Askıya alma durumunda tenant’ın fatura/ödeme verileri ve belgeleri korunur, public form yayınları kapanır ve yalnızca yetkili read-only/export erişimi kalır. Askıya alma anında yayınlanan formların son yayın sürümü resume snapshot’a alınır; abonelik yeniden açıldığında bu formlar aynı sürümle otomatik ve idempotent biçimde açılarak devam eden form işlerini sürdürür. Taslak, yayınlanmamış, arşivlenmiş veya operator tarafından resume dışında bırakılmış formlar açılmaz.

Bu SaaS abonelik akışı fatura planının son evresidir. Önce MavenForms first-party ödeme akışı, iki faturalama yöntemi, fatura belgesi güvenliği ve gerekli transactional teslimat uçtan uca kanıtlanır; ardından tenant aboneliği açılır. İlk dört evre için tasarlanan `PaymentOrder`, `InvoiceRecord`, bağlantı ve teslimat sözleşmeleri ileride platform scope ile workspace scope ayrımını taşıyabilecek şekilde tasarlanır, ancak tenant subscription billing davranışı erken eklenmez.

MavenForms ödeme alabilir; ancak ödeme alınması ile fatura düzenlenmesi aynı işlem değildir. Ödeme sağlayıcısının başarılı ödeme olayı, MavenForms içinde yalnızca muhasebe/faturalama sürecini başlatan doğrulanmış bir olaydır. Fatura numarası, fatura UUID’si, e-belge türü, vergi bilgisi, PDF/XML belgesi ve müşteriye gönderim durumu ayrı bir yaşam döngüsünde tutulmalıdır.

Hedeflenen üç çalışma modeli:

1. **Paraşüt API v4 ile otomatik akış**
   - Doğrulanmış ve yetkilendirilmiş ödeme `PaymentOrder` üzerinden fatura adayı oluşturur.
   - MavenForms, Paraşüt hesabına sunucu tarafında bağlanır.
   - Müşteri/ürün kayıtları bulunur veya yetkili kuralla oluşturulur.
   - Satış faturası oluşturulur.
   - Müşterinin e-Fatura alıcısı olup olmadığı VKN üzerinden kontrol edilir.
   - Uygun e-belge işlemi başlatılır; asenkron iş tamamlanınca belge alınır.
   - Belge güvenli özel depolamaya indirilir ve outbox üzerinden müşteriye gönderilir.

2. **API kullanılmayan muhasebe akışı**
   - Sadece gerçekten `paid` olan ve iade/itiraz/chargeback engeli bulunmayan ödeme siparişleri seçilir.
   - Tek kişi, seçili kişiler veya filtrelenmiş/toplu grup için sürümlü Excel dosyası üretilir.
   - Muhasebe bu dosyayı kullanarak faturaları düzenler.
   - Muhasebeden gelen fatura bilgisi Excel’i ve/veya PDF/XML belgeleri MavenForms’a geri alınır.
   - Satırlar yalnızca kararlı iç referanslar ile eşleştirilir; ad, e-posta veya tutar tek başına eşleştirme anahtarı olamaz.

3. **MavenForms dışında düzenlenmiş belgeyi teslim etme**
   - Muhasebenin hazırladığı tekil veya ZIP içindeki PDF/XML belgeleri kontrollü olarak yüklenir.
   - Önce karantina, dosya doğrulama, dry-run ve eşleştirme ön izlemesi yapılır.
   - Yetkili kullanıcı onayından sonra belge müşteriye e-posta ile gönderilir.

İlk sürümde amaç, tüm muhasebe senaryolarını otomatikleştirmek değil; ödeme → fatura adayı → muhasebe sonucu → doğrulanmış belge → teslimat zincirini kayıpsız, denetlenebilir ve tekrar çalıştırılabilir hale getirmektir.

## 2. Araştırma sonucu: kesin bilgiler ve doğrulanması gerekenler

### 2.1 Paraşüt API v4 hakkında doğrulanmış teknik zemin

Resmi Paraşüt API v4 tanımında:

- API tabanı `https://api.parasut.com/v4` olarak tanımlıdır ve çağrılar şirket kimliği (`company_id`) altında yapılır.
- Yetkilendirme OAuth2 access token ve refresh token akışına dayanır. Access token süresi ve yenileme akışı uygulama içinde varsayımla değil, güncel Paraşüt dokümantasyonu ve yetkili hesapla doğrulanmalıdır.
- İsteklerde JSON:API sözleşmesi ve `application/vnd.api+json` içerik tipi kullanılır.
- Dokümantasyonda rate limit bilgisi yer alır; istemci sabit hızlı sonsuz tekrar yapmamalı, 429 ve geçici 5xx hatalarında kontrollü backoff kullanmalıdır.
- Satış faturası işleminden önce müşteri/contacts ve ürün/products ilişkileri gerekir.
- e-Fatura alıcısı kontrolü için VKN ile e-Fatura inbox araması yapılabilen endpoint vardır.
- e-Fatura ve e-Arşiv formalizasyonu asenkron Trackable Job olarak yürür; oluşturma cevabını nihai fatura başarısı saymak yanlıştır.
- Job durumu bekleme/çalışma/hata/tamamlanma olarak izlenmeli ve bounded polling ile takip edilmelidir.
- Fatura PDF erişimi geçici URL dönebilir; geçici URL müşteriye doğrudan gönderilmemeli, belge indirilip MavenForms özel depolamasına alınmalıdır.

Resmi sözleşme özetinin uygulamadaki karşılığı:

```text
OAuth token → şirket erişimi → contact/product eşleştirme
→ sales invoice oluşturma → e-Fatura inbox lookup
→ e-invoice veya e-archive job başlatma
→ Trackable Job polling → active e-document
→ PDF indirme → özel depolama → outbox e-posta
```

### 2.2 Kaynak metindeki düzeltilmesi gereken varsayımlar

Kullanıcının sağladığı araştırma başlangıç için değerlidir; fakat aşağıdaki noktalar doğrudan koda sabitlenmemelidir:

- Resmi Paraşüt Swagger’ında “addinvoice” adıyla uydurma bir endpoint kabul edilmemelidir. Gerçek endpoint ve JSON:API şeması resmi sözleşmeden alınmalıdır; satış faturası, e-Fatura ve e-Arşiv operasyonları ayrı kaynaklardır.
- “TCKN bilinmiyorsa sabit bir TCKN yaz” yaklaşımı uygulanamaz. Bilinmeyen kimlik bilgisi uydurulamaz; geçerli veri toplanır veya kayıt muhasebe incelemesine düşer.
- “Her durumda 7 gün içinde” gibi genel bir süre kod içine hukuki sabit olarak yazılamaz. Fatura tarihi, teslim/ödeme tarihi, belge türü ve güncel mevzuat mali müşavir tarafından onaylanmalıdır.
- E-Fatura/e-Arşiv seçimi yalnızca isim veya e-posta ile yapılamaz. VKN, alıcı tipi, e-Fatura inbox sonucu, Paraşüt hesabı yetkisi ve güncel mali kurallar birlikte değerlendirilmelidir.
- Döviz dönüşümünde sabit bir “TCMB alış kuru” varsayımı yapılamaz. Orijinal para birimi/tutarı korunmalı; kullanılan kur kaynağı, zaman damgası, kur tipi, yuvarlama ve muhasebeci onayı saklanmalıdır.
- Ödeme sağlayıcısının `paid` callback’i veya tarayıcıya dönen başarı sayfası fatura kesildiği anlamına gelmez.
- Muhasebe sisteminin Paraşüt ile birebir aynı alanları kullandığı varsayılmamalıdır. MavenForms Excel’i kendi sürümlü değişim sözleşmesidir; Paraşüt API payload’ı ayrı bir adaptör sözleşmesidir.

### 2.3 Hukuki ve operasyonel onay gerektiren maddeler

Kod başlamadan yazılı olarak doğrulanacaklar:

- İşletmenin e-Fatura/e-Arşiv mükellefiyet durumu ve hangi belge tiplerini düzenleyebileceği.
- Satılan ürün/hizmet, KDV oranları, istisna/tevkifat/indirim kuralları ve fatura senaryosu.
- Fatura tarihi, ödeme tarihi, iade/iptal ve chargeback durumlarının mali karşılığı.
- TCKN/VKN, vergi dairesi, unvan, adres ve e-posta alanlarının zorunlulukları.
- Dövizli satışlarda kur ve vergi hesaplama politikası.
- PDF/XML saklama, erişim, silme, yedek ve denetim gereksinimleri.
- Müşteriye e-posta gönderiminin işletme politikası, KVKK metni ve ret/geri dönüş yönetimi.
- Paraşüt planı, şirket yetkisi, OAuth uygulaması, şirket erişimi ve API kullanım limitleri.
- E-belgenin Paraşüt dışında düzenlenip MavenForms tarafından yalnızca teslim edilmesi durumunda sorumluluk sınırı.

Bu maddelerden biri bilinmiyorsa sistem “otomatik fatura hazır” dememeli; `accounting_review_required` durumuna düşmelidir.

## 3. Kaynak gerçekliğine dayalı teknik mimari

### 3.1 Yetkili veri kaynağı

Faturalama için yetkili kaynaklar aşağıdaki sıradadır:

1. İmzalı/ doğrulanmış ödeme sağlayıcısı webhook’u ve sunucu tarafındaki `PaymentOrder`.
2. Yayınlanmış form sürümünün ödeme ve ürün/fiyat snapshot’ı.
3. Fatura anında alınan müşteri fatura bilgisi snapshot’ı.
4. Paraşüt API veya yetkili muhasebe import sonucu.
5. UI state, başarı sayfası, eski `Submission.paymentStatus` veya e-posta metni **yetkili kaynak değildir**.

Özellikle mevcut projedeki legacy `Submission.paymentStatus` faturalama için kullanılmamalıdır. Fatura adayları `PaymentOrder.status`, provider event doğrulaması ve iade/itiraz durumu üzerinden üretilmelidir.

### 3.2 Önerilen alanlar ve ilişkiler

İsimler uygulama içi model adıdır; Prisma şeması uygulanmadan önce mevcut modellerle çakışma kontrolü yapılmalıdır.

#### `InvoiceRecipientSnapshot`

Fatura anındaki alıcı bilgilerini değişmez snapshot olarak tutar:

- `id`, `workspaceId`, `paymentOrderId`, `submissionId` nullable
- `recipientType`: `individual`, `company`, `foreign_business`, `unknown_review`
- `legalName`
- `taxNumber` şifreli veya erişim kontrollü alan
- `taxOffice` nullable
- `identityNumber` nullable ve en az ayrıcalıkla saklanır; bilinmiyorsa boş bırakılır
- `email` normalize edilmiş, teslimat için ayrı indeks gerekiyorsa hash/index stratejisi
- `billingAddress` yapılandırılmış alanlar veya şifreli JSON
- `countryCode`
- `source`: `form`, `payment`, `manual`, `accounting_import`
- `consent/notice` referansı gerekiyorsa ilgili sürüm kimliği
- `createdAt`

#### `InvoiceRecord`

Faturanın iş yaşam döngüsünü tutar:

- `id`, `workspaceId`, `formId`, `paymentOrderId`
- `recipientSnapshotId`
- `provider`: `parasut`, `manual`, `other_accounting`
- `documentType`: `e_invoice`, `e_archive`, `manual_invoice`, `credit_note`, `unknown_review`
- `status`: aşağıdaki durum makinesinden biri
- `currency`, `grossAmountMinor`, `netAmountMinor`, `taxAmountMinor`
- `exchangeRate`, `exchangeRateSource`, `exchangeRateAt` nullable; onaysız değer otomatik hesaplanmış sayılmaz
- `invoiceDate` nullable
- `invoiceNumber`, `invoiceUuid` nullable
- `providerCompanyId` nullable, gizli erişim alanı
- `providerResourceId`, `providerJobId` nullable
- `idempotencyKey` unique
- `createdAt`, `updatedAt`

#### `InvoiceLineSnapshot`

- `invoiceId`, `description`, `quantity`, `unitPriceMinor`
- `currency`, `taxRate`, `taxAmountMinor`, `lineTotalMinor`
- `productReference` nullable
- `discount` ve `withholding` yalnızca kural onaylandıysa

#### `InvoiceDocument`

- `invoiceId`, `storageKey`, `originalFilename`
- `mediaType`, `byteSize`, `sha256`
- `documentType`: `pdf`, `xml`, `xlsx`, `other_rejected`
- `source`: `parasut`, `accounting_upload`, `manual_upload`
- `scanStatus`: `quarantined`, `scanning`, `accepted`, `rejected`
- `downloadedAt`, `createdAt`
- Özel storage key içinde workspace/form/invoice scope bulunur; gerçek disk yolu veya bucket anahtarı müşteriye açılmaz.

#### `InvoiceBatch`

Tek kişi, kısmi grup veya toplu işlem için:

- `id`, `workspaceId`, `createdBy`, `selectionMode`
- `filterSnapshotJson` ve seçilen `paymentOrderIds` snapshot’ı
- `rowCount`, `totalGrossAmountMinor`, `currencySummary`
- `formatVersion`, `status`, `createdAt`, `approvedAt`
- Seçim sonradan değişse bile geçmiş export’un hangi kayıtlarla üretildiği korunur.

#### `InvoiceImportBatch` ve `InvoiceImportRow`

- Orijinal dosya ve hash
- Sürüm numarası
- Yükleyen kullanıcı
- Dry-run sonucu
- Satır bazlı hata kodları
- Eşleşen `paymentOrderId` / `invoiceId`
- Önceki ve yeni değerlerin audit özeti
- `pending_review`, `approved`, `applied`, `partially_applied`, `rejected` durumları

#### `InvoiceDelivery`

- `invoiceId`, `recipientEmailSnapshot`
- `status`: `queued`, `sent`, `failed`, `suppressed`
- outbox mesajı, deneme sayısı, son hata kodu
- `sentAt`, `lastAttemptAt`, `providerMessageId` nullable
- Yeniden gönderim idempotent olmalı; aynı invoice ve alıcı için bilinçsiz duplicate e-posta üretilmemelidir.

### 3.3 Fatura yaşam döngüsü

```text
not_started
  → paid_ready_for_invoicing
  → accounting_review_required (eksik/vergi/kur/ürün bilgisi)
  → queued
  → provider_draft_created
  → formalization_pending
  → issued
  → document_ready
  → delivery_queued
  → sent
```

Yan yollar:

```text
paid_ready_for_invoicing → blocked_payment_state
provider_draft_created → provider_error
formalization_pending → formalization_error
document_ready → delivery_failed → retry/suppressed
issued → refund_or_credit_note_review
```

`issued` durumuna geçmek, sağlayıcıdan belge UUID/numarası veya muhasebe tarafından doğrulanmış numara/UUID alınmadan mümkün olmamalıdır. `sent` durumuna geçmek de belge dosyası ve alıcı e-postası doğrulanmadan mümkün olmamalıdır.

## 4. Müşteri verisi ve form tasarımı

Faturalama alanları ödeme formunda yalnızca gerçekten gerekli olduğunda gösterilmelidir. Ödeme ekranına “Fatura bilgileri” seçeneği eklenir; seçilmediğinde sistem kişisel/şirket bilgisi uydurmaz.

Minimum alan grubu:

- Fatura tipi: bireysel / şirket / yurt dışı
- Ad soyad veya resmi unvan
- TCKN/VKN: seçilen tipe göre; format doğrulaması yapılır, değeri loglara yazılmaz
- Vergi dairesi: ilgili tipte gerekli ise
- Ülke ve adres
- Fatura e-postası
- Gerekli ise şehir/ilçe/postal code

UX ve doğruluk kuralları:

- “Fatura istiyorum” seçilmeden fatura alanları zorunlu hale getirilmez.
- Şirket seçildiğinde unvan, VKN ve vergi dairesi alanları açıkça ayrılır.
- Yurt dışı seçildiğinde Türkiye’ye özel zorunlu alanlar otomatik olarak zorlanmaz; muhasebe kuralı onaylanmadıysa incelemeye gönderilir.
- TCKN/VKN yanlışsa kullanıcıya alan bazlı açıklama verilir; sabit örnek değer kabul edilmez.
- Fatura bilgileri ödeme sonrası da yetkili kullanıcı tarafından güvenli biçimde tamamlanabilir; bu değişiklik audit log’a girer.
- Fatura snapshot’ı, form veya kullanıcı profilinin daha sonra değişmesinden etkilenmez.

## 5. API’siz muhasebe akışı

### 5.1 Seçim ve export kapsamı

Kullanıcı fatura merkezinde şu seçimleri yapabilir:

- Tek ödeme yapan kişi.
- Checkbox ile seçilmiş kısmi grup.
- Sayfa dışındaki tüm sonuçlar için açık filtre snapshot’ı.
- Sadece belirli form, tarih, para birimi, ödeme durumu veya fatura durumu.

“Tümünü seç” eylemi yalnızca görünen sayfayı değil, kullanıcıya açıkça gösterilen filtre snapshot’ını temsil etmelidir. Kaç kayıt ve hangi toplam tutarın export edileceği onaydan önce görünür.

Kayda dahil olma şartları:

- `PaymentOrder.status = paid` ve authoritative provider event doğrulanmış olmalı.
- İade, chargeback, dispute veya bekleyen provider reconciliation engeli olmamalı.
- Aynı `PaymentOrder` daha önce aynı fatura batch’inde başarıyla uygulanmamış olmalı.
- Alıcı bilgilerinin eksikliği export’u durdurmak yerine satır seviyesinde açık hata ile göstermeli; sessizce boş bırakılmamalı.

### 5.2 MavenForms Excel değişim sözleşmesi

Dosya adı insan tarafından değiştirilebilir; kimliklendirme dosyanın içindeki metadata sayfasından yapılır. İlk satırda sürüm ve batch kimliği bulunur. Makro, dış bağlantı, formül veya gizli çalışma sayfası üretilmez.

Önerilen sütunlar:

```text
format_version
invoice_batch_id
invoice_row_id
workspace_reference
form_reference
payment_order_reference
submission_reference
payment_provider
payment_provider_reference
paid_at
recipient_type
legal_name
tax_number
tax_office
identity_number
email
country_code
billing_address
original_currency
original_gross_amount_minor
try_gross_amount_minor
exchange_rate
exchange_rate_source
exchange_rate_at
tax_rate
tax_amount_minor
invoice_date
invoice_type_requested
invoice_number
invoice_uuid
accounting_status
document_filename
notes
```

İç referanslar dışarıya açık tahmin edilebilir database ID’si olmak zorunda değildir; opaque ve tekrar kullanılabilir eşleştirme referansı olmalıdır. E-posta, TCKN/VKN ve adres exportta sadece yetkili muhasebe rolüne gösterilir.

### 5.3 Muhasebeden geri import

Import dört adım olmadan uygulanamaz:

1. **Upload:** yalnızca `.xlsx` veya izin verilen belge türleri; boyut, MIME ve dosya imzası kontrolü.
2. **Dry-run:** sürüm, kolon, veri tipi, zorunlu alan, para/tarih/kimlik formatı, duplicate ve referans kontrolü.
3. **Preview:** satır bazında `new`, `update`, `duplicate`, `unmatched`, `invalid`, `conflict` sonucu.
4. **Explicit approve/apply:** yalnızca uygun role sahip kişi uygular; işlem idempotent ve audit’li olur.

Aynı invoice row daha önce uygulanmışsa ikinci import yeni fatura üretmemeli; kullanıcıya “zaten işlendi” demelidir. Çakışan invoice number/UUID başka bir ödeme ile eşleşiyorsa import bütünüyle sessizce kabul edilmemeli, satır `conflict` olmalıdır.

## 6. Fatura belge upload ve müşteri e-posta gönderimi

### 6.1 Güvenli belge yükleme

İzin verilen ilk sürüm kapsamı: PDF, XML ve sürümlü XLSX. ZIP gerekiyorsa yalnızca güvenli arşiv içindeki izinli dosya türleri çıkarılır; path traversal, nested archive bomb, makro ve çalıştırılabilir içerik reddedilir.

Kontroller:

- Uzantıya güvenmeden magic byte ve MIME doğrulaması.
- Dosya boyutu, sayfa/satır ve arşiv açılma limiti.
- Karantina alanı; tarama bitmeden belge `document_ready` olamaz.
- PDF/XML parse kontrolü; zararlı aktif içerik, dış entity ve harici URL yükleme kapalı.
- XLSX makro ve dış bağlantı kontrolü; makro içeren dosya reddedilir.
- SHA-256 hash ile değişmezlik ve duplicate tespiti.
- Tenant/form/invoice yetki kontrolü; başka forma ait medya/fatura dosyası listelenemez.
- Özel depolama; public URL, tahmin edilebilir dosya yolu ve kalıcı provider URL yok.
- İndirme için yetkili, kısa ömürlü erişim veya sunucu üzerinden kontrollü stream.

### 6.2 Eşleştirme

Bir belgeyi müşteriye bağlamak için tercih sırası:

1. `invoice_row_id` veya MavenForms fatura kimliği.
2. `payment_order_reference` + workspace/form scope.
3. Doğrulanmış provider invoice ID/UUID.
4. Muhasebe importunun açıkça onayladığı invoice number.

Ad, e-posta, tarih veya tutar tek başına eşleştirme yapamaz. Birden fazla eşleşme varsa işlem durur ve manuel inceleme ister.

### 6.3 E-posta teslimatı

Toplu fatura ve bildirim e-postaları için ayrı teslim edilebilirlik ve provider güvenlik planı uygulanır: [`2026-09-02-mavenforms-toplu-e-posta-teslim-edilebilirlik-ve-mail-platformlari.md`](./2026-09-02-mavenforms-toplu-e-posta-teslim-edilebilirlik-ve-mail-platformlari.md). Fatura/transactional, operasyonel bildirim ve marketing aynı liste, consent, kuyruk veya reputation alanı olarak birleştirilemez.

- Sadece `document_ready` durumundaki belge outbox’a alınır.
- E-posta adresi snapshot’tan alınır; kullanıcı profilindeki sonradan değişiklik otomatik olarak fatura alıcısını değiştirmez.
- PDF ek olarak veya kısa ömürlü güvenli erişim bağlantısı olarak gönderilebilir; geçici Paraşüt URL’si doğrudan gönderilmez.
- Subject/body formun ve workspace’in güvenli şablonundan gelir; HTML injection temizlenir.
- Gönderimde PII ve belge içeriği loglanmaz; provider message ID ve durum tutulur.
- Geçici hata için bounded retry ve exponential backoff; kalıcı hata için `failed` ve kullanıcıya aksiyon.
- Resend açıkça tetiklenir, audit log’a yazılır ve duplicate gönderim uyarısı gösterir.
- E-posta gönderim başarısı fatura düzenleme başarısı değildir; iki ayrı durum gösterilir.

### 6.4 Çekirdek akışa bağlı teslimat kapısı

E-posta burada bağımsız bir ürün işi değil, fatura domain’inin sonradan çağırdığı bir teslimat adaptörüdür. Fatura planı aşağıdaki önceliği korur:

```text
verified PaymentOrder
  → paid_ready_for_invoicing
  → accounting review / Paraşüt API v4 veya API’siz import
  → issued
  → document_ready
  → InvoiceDeliveryIntent
  → transactional outbox
```

- Paraşüt access/refresh token’ı, muhasebe yükleme dosyası, PDF/XML belge ve fatura alıcı verisi e-posta worker’a değil fatura domain’ine aittir.
- `InvoiceDeliveryIntent` yalnızca fatura kimliği, doğrulanmış alıcı snapshot’ı, belge erişim referansı, message class ve idempotency anahtarı taşır; vergi hesaplaması veya provider API çağrısı içermez.
- API’siz akışta `Upload → dry-run → preview → explicit approve/apply` tamamlanmadan müşteri maili oluşturulmaz.
- Fatura gönderimi ile ödeme makbuzu gönderimi farklı intent ve event key kullanır; bir akışın retry’si diğerini yeniden gönderemez.
- Teslimat başarısızlığı fatura statüsünü geriye çeviremez; fatura kaydı korunur, teslimat ayrı `failed/retry/suppressed` durumunda görünür.

## 7. Paraşüt API v4 akışı

### 7.1 Bağlantı ve secret yönetimi

Bağlantı kurulumu yalnızca workspace owner/admin rolünde açılır. Access token, refresh token, client secret ve şirket erişim bilgileri:

- Browser’a gönderilmez.
- UI state, export, audit message veya hata metnine yazılmaz.
- KMS/secret manager veya mevcut encrypted secret store ile saklanır.
- Token yenileme yarışını tek flight/lock ile yönetir.
- Revocation, bağlantı silme ve yeniden bağlama audit edilir.
- Provider cevabı normalize edilir; raw token/headers/body kaydedilmez.

Bağlantı sağlık kontrolü şunları kanıtlamalıdır: token geçerli, company ID yetkili, API erişimi var, hesap e-belge işlemlerine uygun ve gerekli referans verileri okunabiliyor. “Bağlı” etiketi yalnızca son doğrulanmış sağlık kontrolü ile gösterilir.

### 7.2 Veri hazırlama

Paraşüt’e gönderilecek fatura öncesi:

1. `PaymentOrder` authoritative olarak paid ve reconciled kontrol edilir.
2. Form yayın snapshot’ındaki ürün/fiyat ile ödeme order snapshot’ı karşılaştırılır.
3. Fatura alıcısı snapshot’ı doğrulanır.
4. Paraşüt’te eşleşen contact bulunur; yoksa oluşturma gereksinimi için muhasebe onayı alınır.
5. Ürün/hizmet eşleşmesi bulunur; bilinmeyen ürün sessizce başka ürüne bağlanmaz.
6. Net, vergi ve brüt tutarların decimal/minor unit hesapları cross-check edilir.
7. Döviz/kur kararı yoksa `accounting_review_required` durumuna düşülür.

### 7.3 Satış faturası ve e-belge formalizasyonu

Resmi API sözleşmesine göre uygulanacak kavramsal sıra:

1. `sales_invoices` kaynağı ile satış faturası oluşturma.
2. Müşterinin VKN’si mevcutsa e-Fatura inbox lookup.
3. Inbox sonucu ve işletme kuralına göre e-Fatura veya e-Arşiv formu hazırlanması.
4. İlgili e-belge endpoint’ine formalizasyon isteği.
5. Dönen Trackable Job kimliğini `InvoiceRecord.providerJobId` olarak saklama.
6. Bounded polling: durum, deneme sayısı, son kontrol zamanı ve provider hata kodu.
7. Başarılı işten sonra `active_e_document` ile güncel belge bilgisi alınması.
8. Geçici PDF URL’sinden belgeyi özel storage’a indirme.
9. Hash ve belge türü doğrulaması.
10. Outbox ile müşteri teslimatı.

### 7.3A. Resmi v4 endpoint sözleşme matrisi

Bu tablo uygulama adapter’ının doğrulama referansıdır. Path, gövde ve alanlar kod içinde elle uydurulmaz; resmi Swagger sürümü güncellendiğinde tekrar karşılaştırılır.

| İş | Resmi v4 yolu | Beklenen sonuç | MavenForms kuralı |
|---|---|---|---|
| Müşteri listele/ara | `/{company_id}/contacts` | JSON:API contact listesi | VKN/e-posta/name ile arama yapılabilir; tek başına isimle otomatik eşleşme yok |
| Ürün listele/ara | `/{company_id}/products` | JSON:API product listesi | Ürün kodu/ID mapping’i snapshot ile saklanır |
| Satış faturası oluştur | `/{company_id}/sales_invoices` | Satış faturası kaydı | `contact` ve `details` relationships doğrulanmadan gönderilmez |
| e-Fatura gelen kutusu | `/{company_id}/e_invoice_inboxes?filter[vkn]=...` | Gelen kutusu listesi | VKN lookup sonucu audit’e yazılır; hata “e-Arşiv” kararı değildir |
| e-Fatura formalizasyonu | `/{company_id}/e_invoices` | `201` ve Trackable Job | `issued` değil `formalization_pending` oluşturulur |
| e-Arşiv formalizasyonu | `/{company_id}/e_archives` | `201` ve Trackable Job | Mali kural ve alıcı tipi onayı gerekir |
| Job sorgusu | `/{company_id}/trackable_jobs/{id}` | `pending/running/error/done` | Bounded polling; 15 dakikalık provider kullanım penceresi dikkate alınır |
| e-Fatura PDF | `/{company_id}/e_invoices/{id}/pdf` | PDF erişim bilgisi veya hazır değil cevabı | Provider URL doğrudan paylaşılmaz; MavenForms’a indirilir |
| e-Arşiv PDF | `/{company_id}/e_archives/{id}/pdf` | PDF erişim bilgisi veya hazır değil cevabı | Hazır değilse tekrar kontrollü denenir; public URL tutulmaz |

Resmi Swagger’da satış faturası oluşturma cevabı ile e-Fatura/e-Arşiv oluşturma cevabı aynı şey değildir: e-belge oluşturma işlemi Trackable Job döndürür. Bu nedenle adapter dönüş tipleri ayrılmalıdır:

```ts
type DraftInvoiceCreated = {
  providerInvoiceId: string;
  status: "provider_draft_created";
};

type FormalizationAccepted = {
  providerJobId: string;
  status: "formalization_pending";
};

type DocumentReady = {
  providerDocumentId: string;
  storageKey: string;
  status: "document_ready";
};
```

Bu örnekler gerçek Paraşüt payload’ının yerine geçmez; uygulama sınırında provider’dan bağımsız normalize edilmiş sonuç sözleşmesini gösterir.

Job için sonsuz polling, her sayfa yenilemede yeni fatura üretimi, provider timeout sonrası bilinçsiz retry ve geçici PDF URL’sini saklama yasaktır.

### 7.4 İdempotency ve tekrar çalıştırma

Her ödeme/fatura adayı için deterministik bir iç idempotency key kullanılır. Provider resource veya job oluşturma sonucu kaybolursa önce aynı işlem için mevcut provider referansı aranır; bulunmadan yeni kayıt açılmaz.

Retry sınıfları:

- `4xx_validation`: otomatik tekrar yok, kullanıcı/muhasebe düzeltmesi.
- `401/403`: token yenileme veya bağlantı yeniden doğrulama; sınırlı tekrar.
- `409_duplicate`: mevcut kaydı sorgula, yeni üretme.
- `429`: provider rate limit backoff.
- `5xx/timeout`: sınırlı retry, sonra inceleme.
- `job_error`: provider mesajı redakte edilerek kayda alınır; payload’ı değiştirmeden tekrar deneme yok.

## 8. Fatura merkezi kullanıcı deneyimi

Fatura merkezi ayrı bir kopuk ekran değil; ödeme/yanıtlar bağlamından erişilebilir olmalıdır.

Önerilen düzen:

- Form seçici ve form özeti.
- “Fatura bekleyen ödemeler”, “Muhasebe incelemesi”, “Belgesi hazır”, “Gönderildi”, “Hatalı” sayaçları.
- Liste üstünde tekil, seçili ve filtrelenmiş toplu işlem.
- Her satırda ödeme durumu, müşteri, tutar, fatura durumu, belge ve e-posta durumu.
- Formun cevapları ekranından ilgili ödeme ve fatura kaydına gidilebilir.
- Fatura satırında gizli PII varsayılan olarak maskeli; yetkili kullanıcı açabilir.
- Paraşüt bağlantısı, manuel Excel akışı ve belge importu aynı merkezden; yöntem farkı açıkça görünür.

Buton doğrulukları:

- “Fatura oluştur” yalnızca gerekli alanlar ve geçerli payment state varsa aktif.
- “Excel dışa aktar” sonuç sayısı ve hassas veri uyarısı ile onaylı.
- “İçe aktar” dry-run bitmeden uygula seçeneğini göstermez.
- “Müşteriye gönder” belge ve e-posta doğrulanmadan aktif değil.
- “Tekrar gönder” son teslimat durumunu gösterir; gizli duplicate e-posta üretmez.
- Paraşüt’te “bağlandı” görünen kart, son sağlık kontrolü başarısızsa uyarılı görünür.

## 9. Güvenlik, KVKK ve denetim

Fatura verileri ödeme verisinden farklı olsa da yüksek hassasiyetli kişisel ve ticari veri içerir.

- Workspace/form/rol bazlı authorization her API çağrısında yapılır; UI gizleme güvenlik değildir.
- Public form ve embed istemcisi hiçbir fatura, muhasebe, Paraşüt tokenı, invoice ID veya müşteri listesi okuyamaz.
- Kart numarası, CVV ve expiry MavenForms’ta tutulmaz; fatura akışı yalnızca doğrulanmış ödeme referansını kullanır.
- TCKN/VKN/adres/e-posta loglarda redakte edilir; export ve import auditlerinde değerlerin kendisi yerine özet tutulur.
- Dosya storage tenant scope ile ayrılır; bir form başka formun asset veya fatura belgesini listeleyemez.
- Audit log: export, download, import, approve, apply, issue, upload, send, resend, delete, connection change.
- Silme geri alınamazsa owner/admin ve mevcut güvenli tehlikeli işlem doğrulaması gerekir; fatura kayıtlarında yasal saklama/retention politikası ayrıca uygulanır.
- Arka plan worker’ları kullanıcı isteğinden ayrı idempotent çalışır; duplicate job ve e-posta için unique constraint gerekir.
- Rate limiting, CSRF/origin, SSRF engeli, XML entity güvenliği, ZIP bomb koruması ve antivirus/karantina release gate’e bağlanır.
- Erişim anahtarları ve müşteri belgeleri backup’larda da şifreli olmalıdır.

## 10. En küçük uygulanabilir fazlar

> Bu bölümdeki `EINV-00..EINV-17` başlıkları konu epikleridir. Uygulama sırasında bu epikler tek parça yapılmayacak; zorunlu sıra, replay ve geçiş kapıları için [`2026-09-02-mavenforms-e-belge-15-dakikalik-uygulama-paketleri.md`](./2026-09-02-mavenforms-e-belge-15-dakikalik-uygulama-paketleri.md) içindeki `F/D/M/C/X/I/U/E/P/R` paketleri kullanılacaktır.

Her fazın tamamlanması “kod yazıldı” ile değil, exit gate’teki kanıtların tamamlanmasıyla kabul edilir. Bir fazın gate’i geçmiyorsa sonraki faza geçilmez.

### EINV-00 — Kapsam ve hukuki karar kapısı

**Amaç:** Otomasyonun hangi belge türlerini ve hangi işletme modeli için desteklediğini kilitlemek.

**Yapılacaklar:**

- Paraşüt hesabı/şirketi ve yetkili kullanıcıyı doğrula.
- e-Fatura/e-Arşiv mükellefiyetini ve muhasebe kurallarını yazılı kaydet.
- İlk sürümde desteklenmeyen istisna, tevkifat, iade ve yabancı vergi senaryolarını açıkça blokla.
- Ödeme para birimleri, kuru ve yuvarlamayı mali müşavir onayına bağla.

**Çıkış kapısı:** Onaylı karar kaydı, bilinmeyen listesi, desteklenen/desteklenmeyen matris ve rollback kararı.

### EINV-01 — Mevcut ödeme sistemini fatura için doğrula

**Amaç:** Legacy submission status veya UI success gibi yanlış kaynakların fatura zincirine girmesini engellemek.

**Yapılacaklar:**

- `PaymentOrder` state ve provider webhook/reconciliation kanıtını haritala.
- `Submission.paymentStatus` kullanımını fatura query’lerinden çıkar.
- İade, dispute, duplicate ve pending durumlarını test fixture’ları ile kanıtla.

**Çıkış kapısı:** Her fatura adayının bir `PaymentOrder` ve doğrulanmış provider event’i var; sahte ödeme ile aday oluşmuyor.

### EINV-02 — Veri sözleşmesi ve migration tasarımı

**Amaç:** Fatura, snapshot, belge, batch, import ve delivery modelini geriye uyumlu tasarlamak.

**Yapılacaklar:**

- Yukarıdaki modelleri mevcut Prisma şemasıyla çakışma analizi yaparak tasarla.
- Unique/idempotency/index/tenant scope kararlarını yaz.
- Migration rollback ve mevcut veriye etkisini prova et.

**Çıkış kapısı:** Şema review, migration dry-run, typecheck ve tenant isolation testi.

### EINV-03 — Fatura bilgisi form alanları

**Amaç:** Kullanıcıdan doğru ve açık biçimde fatura alıcı verisi toplamak.

**Yapılacaklar:**

- Fatura isteğe bağlı bölümünü ödeme akışına ekle.
- Bireysel/şirket/yurt dışı koşullu alanlarını uygula.
- Validasyon, maskeli gösterim, snapshot ve eksik veri inceleme durumunu ekle.

**Çıkış kapısı:** Geçersiz TCKN/VKN reddediliyor; bilinmeyen değer uydurulmuyor; public response fatura sırrı döndürmüyor.

### EINV-04 — Tekil/selected/toplu export

**Amaç:** Muhasebeye güvenli, tekrar üretilebilir Excel göndermek.

**Yapılacaklar:**

- Seçim ve filtre snapshot’ı oluştur.
- Sadece authoritative paid order’ları al.
- Sürümlü Excel metadata ve satır referanslarını üret.
- PII role check, export audit ve dosya hash’ini ekle.

**Çıkış kapısı:** Aynı snapshot deterministik sonuç verir; ödeme durumu olmayan kayıt exportlanmaz; makro/formül üretilmez.

### EINV-05 — Muhasebe Excel import dry-run

**Amaç:** Muhasebeden gelen sonucu güvenli ve ön izlemeli almak.

**Yapılacaklar:**

- Sürüm/kolon/schema doğrula.
- Row-level validation ve eşleştirme kodlarını üret.
- `new/update/duplicate/unmatched/conflict` ön izlemesi yap.
- Approve/apply ayrımını uygula.

**Çıkış kapısı:** Hatalı dosya veri değiştirmiyor; duplicate yeni fatura üretmiyor; uygulama audit log’a yazılıyor.

### EINV-06 — Belge karantina ve güvenli upload

**Amaç:** Muhasebenin PDF/XML/XLSX belgelerini tenant güvenliğiyle almak.

**Yapılacaklar:**

- MIME/magic byte/limit/antivirus/parse pipeline.
- ZIP güvenlik sınırları ve makro reddi.
- SHA-256, özel storage ve kısa ömürlü download.

**Çıkış kapısı:** Zararlı/uygunsuz/başka tenant dosyası kabul edilmiyor; public URL oluşmuyor.

### EINV-07 — Fatura belge-eşleştirme

**Amaç:** Belgenin doğru ödeme ve müşteriye bağlanmasını sağlamak.

**Yapılacaklar:**

- Opaque internal reference-first matching.
- Ambiguous/unmatched/conflict durumları.
- Manuel düzeltme ve onay akışı.

**Çıkış kapısı:** Ad/e-posta/tutar tek başına eşleştirmiyor; yanlış form/tenant eşleşmesi testte engelleniyor.

### EINV-08 — Fatura e-posta outbox

**Amaç:** Doğrulanmış belgeyi güvenilir ve tekrar çalıştırılabilir göndermek.

**Yapılacaklar:**

- `document_ready` sonrası outbox enqueue.
- Retry/backoff, permanent failure, resend ve delivery audit.
- Güvenli template ve attachment/link politikası.

**Çıkış kapısı:** Belgesiz e-posta gönderilmiyor; worker restart duplicate göndermiyor; teslimat durumu faturadan ayrı.

### EINV-09 — Paraşüt OAuth ve secret bağlantısı

**Amaç:** Paraşüt’ü gerçek sağlık kontrolüyle bağlamak.

**Yapılacaklar:**

- OAuth callback server-side.
- Token encryption/refresh lock/revocation.
- Company scope ve read-only health check.
- Redacted provider errors.

**Çıkış kapısı:** Token browser/log/exportta yok; geçersiz bağlantı “bağlı” görünmüyor; health check kanıtı audit’li.

### EINV-10 — Paraşüt contact/product mapping

**Amaç:** Fatura oluşturmadan önce müşteri ve ürün ilişkilerini doğru kurmak.

**Yapılacaklar:**

- Contact/product lookup adapter.
- Create/update izin politikasını muhasebe onayına bağla.
- MavenForms ürün snapshot’ı ile Paraşüt ürününü eşleştir.

**Çıkış kapısı:** Eksik müşteri/ürün sessizce başka kayıtla eşleşmiyor; duplicate contact/product kontrolü var.

### EINV-11 — Paraşüt sales invoice draft

**Amaç:** Ödeme snapshot’ından Paraşüt satış faturası taslağı üretmek.

**Yapılacaklar:**

- JSON:API payload mapper.
- Decimal/rounding/tax cross-check.
- Provider idempotency/recovery.
- Draft kaydı ve provider resource ID saklama.

**Çıkış kapısı:** Test hesabında beklenen satır/tutar/para birimi oluşuyor; amount mismatch işlemi durduruyor.

### EINV-12 — e-Fatura inbox ve belge türü yönlendirme

**Amaç:** E-Fatura/e-Arşiv seçimini doğrulanabilir provider sonucu ile yapmak.

**Yapılacaklar:**

- VKN format ve veri varlığı kontrolü.
- Paraşüt e-invoice inbox query.
- Sonuç yok/hata/ambiguous durumlarında otomatik belge kesme yerine inceleme.
- Mali müşavir kuralı ve alıcı tipi kararını kaydet.

**Çıkış kapısı:** Lookup sonucu olmayan kişi yanlışlıkla e-Fatura olarak işaretlenmiyor; e-Arşiv de hukuki varsayımla otomatik seçilmiyor.

### EINV-13 — Asenkron e-belge job worker

**Amaç:** Formalizasyonu Trackable Job yaşam döngüsüyle tamamlamak.

**Yapılacaklar:**

- e-invoice/e-archive request adapter.
- Bounded poll/backoff/timeout.
- Job error normalization ve operator action.
- Worker restart ve duplicate request testleri.

**Çıkış kapısı:** `issued` yalnızca başarılı nihai belge bilgisiyle; timeout yeni belge üretmiyor.

### EINV-14 — Paraşüt belge indirme ve teslimat

**Amaç:** Geçici provider URL’sini özel belgeye dönüştürüp teslim etmek.

**Yapılacaklar:**

- `active_e_document` sorgusu.
- PDF indirme, hash/format kontrolü, private storage.
- EINV-08 outbox ile bütünleşme.

**Çıkış kapısı:** Geçici provider URL’si müşteriye gitmiyor; belge indirilemezse `document_ready` olmuyor.

### EINV-15 — Reconciliation, refund ve düzeltme

**Amaç:** Ödeme iadesi ile fatura düzeltmesini birbirine karıştırmadan yönetmek.

**Yapılacaklar:**

- Refund/chargeback geldiğinde fatura kaydını `refund_or_credit_note_review` durumuna al.
- Otomatik iptal/credit note yapma kararını mali kurala bağla.
- Provider ve muhasebe sonuçlarını reconcile et.

**Çıkış kapısı:** İade otomatik olarak “fatura silindi” sayılmıyor; mali işlem için açık aksiyon ve audit var.

### EINV-16 — Fatura merkezi ve rol matrisi

**Amaç:** Kullanıcının tüm fatura yöntemlerini anlaşılır ve güvenli tek ekranda yönetmesi.

**Yapılacaklar:**

- Invoice center, batch, import, upload, delivery durumlarını ekle.
- Owner/admin/accounting/operator rol ayrımını uygula.
- Hassas veri maskeleme ve confirmation modal’ları ekle.

**Çıkış kapısı:** UI butonları gerçek endpoint’e bağlı; yetkisiz kullanıcı API ile de erişemiyor; responsive ekranlar desktop/tablet/mobile testinden geçiyor.

### EINV-17 — Bağımsız güvenlik ve release kapısı

**Amaç:** Faturalama özelliklerini ödeme release’iyle birlikte güvenli biçimde yayınlamak.

**Yapılacaklar:**

- Threat model ve attack-path scan.
- Authz/BOLA, SSRF, XXE, ZIP bomb, macro, upload, export, PII log testleri.
- Paraşüt sandbox/test hesabı ile gerçek adapter testi.
- Backup/restore ve worker recovery provası.
- Mali müşavir örnek faturalarıyla uçtan uca acceptance.

**Çıkış kapısı:** Security bulguları triage edilmiş, kritik/açık bulgu yok; tüm testler, audit kanıtları, runbook ve rollback planı hazır; production için ayrı yazılı onay var.

## 11. Her faz için ajan çalışma protokolü

Bu belgeyi uygulayan bir ajan aşağıdaki sırayı değiştiremez:

1. Önce repo talimatlarını, mevcut planı, `git diff`, package manifestini, Prisma şemasını ve server health durumunu oku.
2. Fazın giriş kapısındaki önceki tüm kanıtları kontrol et.
3. Faza başlamadan “amaç, etkilenen dosyalar, riskler, test planı ve rollback” kaydı oluştur.
4. Sadece o fazın izin verilen dosya/sözleşme sınırında değişiklik yap.
5. Önce kırmızı test veya doğrulama senaryosunu ekle; sonra minimum kodu yaz.
6. Migration varsa dry-run ve mevcut veriye etkisini kontrol et.
7. Typecheck, lint, ilgili test, API health ve mümkünse canlı tarama çalıştır.
8. Her çıkış maddesine somut kanıt yolu/komut/sonuç ekle.
9. Bir kapı başarısızsa sonraki fazı uygulama; kök nedeni yaz ve önceki faza dön.
10. UI’de görünen ama handler’ı bulunmayan hiçbir fatura özelliğini tamamlanmış sayma.

Faz sonu raporunda zorunlu alanlar:

```text
Faz:
Giriş kapısı sonucu:
Değişen dosyalar:
Değişmeyen fakat riskli alanlar:
Testler ve sonuçları:
Güvenlik/PII kontrolü:
Canlı akış kanıtı:
Bilinen eksikler:
Rollback:
Sonraki faza izin: EVET/HAYIR
```

## 12. Kabul testleri ve örnek uçtan uca senaryolar

### Manuel Excel senaryosu

1. İki paid, bir pending, bir refunded ödeme oluştur.
2. Sadece paid ikisini seç ve batch üret.
3. Excel’de iki satır ve metadata sürümü görünür; pending/refunded yoktur.
4. Muhasebe bir satıra fatura number/UUID/PDF ekler, bir satırı eksik bırakır.
5. Dry-run bir satırı kabul, bir satırı hata gösterir.
6. Apply yalnızca onaylı satırı işler.
7. Aynı dosya tekrar import edilince duplicate olur, yeni fatura/e-posta oluşmaz.
8. PDF güvenli depoda tutulur; müşteriye belge gönderimi yalnızca `document_ready` sonrası kuyruğa girer.

### Paraşüt senaryosu

1. Test hesabı ile OAuth bağlantısı kur.
2. Bağlantı sağlık kontrolünü doğrula.
3. Paid payment order için contact/product eşleştir.
4. Satış faturası isteği gönder ve provider resource ID sakla.
5. VKN ile e-Fatura inbox sonucunu al.
6. E-belge job’ını başlat; pending → running → done veya error durumlarını test et.
7. Done sonrası active document al ve PDF’yi indir.
8. Provider timeout sonrası retry yeni invoice üretmemeli.
9. PDF gönderimi başarısız olursa fatura `issued/document_ready`, teslimat `failed` kalmalı; yeniden gönderim mümkün olmalı.

### Yetki ve sızıntı senaryosu

- Public form GET/POST hiçbir invoice, provider token, accounting row veya müşteri listesi dönmez.
- Workspace A kullanıcısı Workspace B invoice ID’si ile çağrı yaptığında 404/403 güvenli sonucu alır.
- Viewer rolü fatura tutarını görebilir ama TCKN/VKN/PDF export yetkisi yoksa erişemez.
- Log, hata toast’ı, analytics ve audit ekranında token, kart bilgisi ve tam kimlik numarası bulunmaz.

## 13. Uygulama sıralaması ve bağımlılık kapıları

```text
PAY-01/PAY-02/PAY-03
        ↓
EINV-00 → EINV-01 → EINV-02
        ↓
EINV-03 → EINV-04 → EINV-05
        ↓                  ↘
EINV-06 → EINV-07 → EINV-08   EINV-09 → EINV-10 → EINV-11
                                                   ↓
                                           EINV-12 → EINV-13 → EINV-14
        EINV-15 → EINV-16 → EINV-17
```

Ödeme release gate’leri geçmeden Paraşüt faturası canlı alınmaz. Paraşüt bağlantısı hazır değilse API’siz Excel + belge upload akışı yine kullanılabilir; ancak iki akış aynı `InvoiceRecord` ve aynı idempotency/authorization kurallarını paylaşmalıdır.

Faturalama release’i şu üç şeyi birbirinden ayrı raporlar:

1. Ödeme başarılı mı?
2. Fatura düzenlendi mi?
3. Fatura müşteriye ulaştı mı?

Bu üçü tek bir “başarılı” etiketi altında birleştirilemez.

## 14. Kaynaklar

Birincil teknik ve mevzuat kaynakları:

1. [Paraşüt API resmi dokümantasyonu](https://apidocs.parasut.com/)
2. [Paraşüt API v4 resmi OpenAPI/Swagger tanımı](https://apidocs.parasut.com/swagger.json)
3. [GİB e-Arşiv Teknik Kılavuzu](https://ebelge.gib.gov.tr/dosyalar/kilavuzlar/e-Arsiv_Teknik_Kilavuzu_V.1.18.pdf)
4. [GİB mevzuat ve e-Belge duyuruları](https://ebelge.gib.gov.tr/)
5. [GİB e-Fatura mevzuat sayfası](https://gib.gov.tr/mevzuat/kanun/434/teblig/8014)
6. [KVKK veri güvenliğine ilişkin yükümlülükler](https://www.kvkk.gov.tr/Icerik/2040/Veri-Guvenligine-Iliskin-Yukumlulukler)
7. [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
8. [OWASP XML External Entity Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html)
9. [OWASP Transaction Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)

Ödeme tarafıyla birlikte okunacak mevcut belge:

- [`2026-09-02-mavenforms-payment-security-compliance-roadmap.md`](./2026-09-02-mavenforms-payment-security-compliance-roadmap.md)

## 15. Definition of Done

Bu özellik release-ready sayılmadan önce aşağıdakilerin tamamı kanıtlanır:

- Paraşüt API v4 endpoint, şema, OAuth ve şirket erişimi resmi kaynakla doğrulanmış.
- API’siz export/import akışı aynı fatura veri modelini kullanıyor.
- Tekil, seçili ve filtrelenmiş toplu işlem çalışıyor.
- Muhasebe dönüşü dry-run → preview → approve → apply olmadan veri değiştirmiyor.
- PDF/XML/XLSX upload karantina, parse, hash ve tenant scope kontrollerinden geçiyor.
- Belge eşleşmesi stabil iç referansla çalışıyor; belirsiz eşleşme duruyor.
- E-posta yalnızca doğrulanmış belge hazır olduktan sonra gönderiliyor.
- Retry, resend, duplicate ve worker restart davranışları test edilmiş.
- Public/embed/WordPress kullanıcıları uygulama kritik bilgilerine erişemiyor.
- TCKN/VKN/adres/e-posta ve sağlayıcı secret’ları log/export/screenshot sızıntısı testinden geçmiş.
- GİB/mali müşavir onayı gerektiren kurallar koda varsayım olarak gömülmemiş.
- UI’deki her buton gerçek handler’a sahip; “yakında” özellikleri aktif gibi gösterilmiyor.
- Desktop/tablet/mobile responsive kabul testleri tamamlanmış.
- Runbook, hata çözüm adımları, rollback, backup/restore ve audit raporu teslim edilmiş.
