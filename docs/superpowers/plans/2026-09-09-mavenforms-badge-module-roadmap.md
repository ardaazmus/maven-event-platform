# MavenForms yaka kartı ve matbaa çıktısı yol haritası

## 1. Karar özeti

**Karar:** `ACCEPTED_WITH_SIMPLIFICATION`.

Yaka kartı; form yanıtındaki katılımcı bilgilerini, etkinlik bilgilerini ve güvenli bir QR kimliğini tasarım şablonuna işleyip tekil veya toplu üretmeye yarayan, form ürününü tamamlayan bir modül olarak kabul edilmiştir. İlk hedef matbaa hesabına sessizce veri gönderen bir entegrasyon değil, matbaanın kullanabileceği doğrulanmış ve açıklamalı çıktı paketidir. Böylece dış kuruma kişisel veri aktarımı, yazıcı sürücüsü uyumsuzluğu ve yanlış duplex ayarı ürünün temel akışına zorunlu bağımlılık yapmaz.

Bu iş akışı ana ürün sırasını değiştirmez:

`PAY → INV/F manuel → Paraşüt → belge güvenliği → transactional teslimat → pilot → FORM-UX → SAAS`

Yaka kartı, `FORM-UX` sonrasında veya mevcut dış kanıt bekleyişinde bağımsız bir `BADGE` iş akışı olarak ilerleyebilir. V2 ödeme, manuel fatura, R-10 veya V4 SaaS release kapısı yerine geçmez ve bunları bloke etmez.

## 2. Sektör kanıtı ve tasarım sonucu

### 2.1 Doğrudan doğrulanan davranışlar

| Konu | Kanıt | Tasarım sonucu |
|---|---|---|
| Tekil, toplu ve kapıda/on-demand üretim | Cvent, vFairs ve EventCreate ürün açıklamaları; toplu ön baskı ve kayıt anında baskı birlikte kullanılıyor | Modül tekil üretimi, seçili toplu işi ve ileride on-demand çıktıyı aynı render sözleşmesine bağlar |
| Dinamik ad, rol, şirket ve QR | Cvent ve EventCreate badge açıklamaları; alanlar katılımcı kaydından üretiliyor | Serbest metin kopyala-yapıştır yerine allowlist alan eşleştirme gerekir |
| Ön/arka tasarım | vFairs ve eventcloud açıklamaları; ön/arka düzen ve etkinlik bilgisi/harita/sponsor içeriği kullanımı | Tek sayfa tek yüz; iki sayfa veya side-A/side-B iki yüzlü şablon olarak modellenir |
| Millimetre hassas ölçü, özel stok ve baskı önizlemesi | eventcloud ve ClearEvent açıklamaları | Canvas pikseline güvenilmez; canonical ölçü mm/pt ile saklanır, baskı önizlemesi zorunludur |
| Matbaa/office printer için PDF | ClearEvent’in Avery/custom N-up PDF akışı ve Cvent’in badge printing akışı | İlk release’te PDF/ZIP/manifest export; matbaa API’si ayrı adapter olarak ertelenir |
| Bleed, trim, page boxes ve printer marks | Adobe Acrobat/InDesign resmi baskı belgeleri | TrimBox/BleedBox/MediaBox ve sağlayıcıya göre mark seçimi preflight kontrolüne girer |
| QR quiet zone, hata düzeltme ve üretim kalitesi | ISO/IEC 18004:2024, DENSO WAVE, GS1 kaynakları | QR vektör olarak üretilir; quiet zone korunur; düzeye ve baskı profiline göre tarama testi yapılır |

### 2.2 Kanıtın söylemediği şeyler

- Hiçbir sağlayıcı kaynağı bütün matbaalar için tek bir bleed, renk profili, duplex yönü veya stok standardı garanti etmez. Bu değerler `printProfile` ve matbaanın teknik föyüyle doğrulanmalıdır.
- GS1’in X-dimension aralıkları retail barkod bağlamına aittir; etkinlik yaka kartında evrensel minimum diye kullanılmaz. Uygulama QR alanını seçilen baskı profili ve tarama testine göre uyarır.
- “PDF hazır” etiketi gerçek baskı sonucu değildir. Test baskısı, ön/arka hizalama ve QR tarama kanıtı olmadan çıktı `PRINT_PROOF_REQUIRED` kalır.

## 3. Ürün davranışı

### 3.1 Üretim türleri

1. **Tekil:** Bir yanıt/katılımcı seçilir, veri anlık server snapshot’tan alınır, önizleme geçilir ve tek kart çıktısı üretilir.
2. **Seçili toplu:** Yanıt listesinde filtrelenmiş veya açıkça seçilmiş kayıtlar sabitlenir. Her kayıt için ayrı sonuç ve hata durumu tutulur.
3. **Etkinliğin tamamı:** Formun seçilmiş yayın/snapshot sürümündeki uygun katılımcılar generation job’a alınır. Taslak, silinmiş, erişimi olmayan veya gerekli alanı eksik kayıtlar sessizce dahil edilmez; nedenleri manifestte görünür.
4. **Matbaaya hazırlık:** Birleştirilmiş N-up PDF, kişi başı PDF klasörü, CSV/JSON manifest, proof sheet ve `README.txt`/`print-instructions.md` içeren ZIP üretilir.
5. **Doğrudan gönderim:** İlk sürümde yoktur. İleride `PrintDestinationAdapter` ile yalnız açık hedef, veri kapsamı, süreli yetki, alıcı matbaa ve aktarım onayı doğrulanır. E-posta veya genel URL’ye PII içeren dosya otomatik bırakılmaz.

### 3.2 Tek yüz ve çift yüz

| Durum | Şablon | Üretim |
|---|---|---|
| Tek yüz | yalnız `front` | kişi başı tek sayfa; N-up tek yüz; boş arka sayfa üretilmez |
| Çift yüz | `front` + `back` | kişi başı iki ardışık sayfa veya seçilen duplex imposition; back için açık flip/orientation profili |
| Katlanır kart | `front` + `back` + katlama yönü | ön/arka geometrisi yazıcı profilinde doğrulanır; otomatik ayna/döndürme varsayılmaz |
| Arka yüz yalnız tasarım | `back` var, dinamik alan yok | yine iki yüzlü çıktı; arka yüz statik olabilir |
| Eksik/uyumsuz arka yüz | back bekleniyor ama doğrulama geçmiyor | job `BLOCKED_PRINT_PREFLIGHT`; kullanıcı düzeltene kadar çıktı final sayılmaz |

Duplex ayarları kullanıcıya “uzun kenardan çevir” ve “kısa kenardan çevir” olarak gösterilir; yalnız teknik `flipEdge` değeri saklanmaz. Önizlemede ön ve arka yüz yan yana ve baskı sırasıyla gösterilir. Matbaa profili belirtilmemişse sistem güvenli olarak `preview_only` veya `manual_print_profile_required` durumuna geçer.

## 4. Veri ve güvenlik sözleşmesi

### 4.1 Kaynak alanlar

Dinamik alanlar server-side allowlist’ten gelir: katılımcı adı, soyadı, unvan/title, şirket, etkinlik/form adı, etkinlik tarihi, kayıt türü ve yetkili QR görünen kimliği. Ham yanıt JSON’u, e-posta, telefon, ödeme ayrıntısı veya KVKK açısından gereksiz alanlar varsayılan olarak badge’e bağlanmaz. Bir alanın badge’e alınması hem form alanı eşleşmesi hem de şablon sahibi yetkisi ile doğrulanır.

Her üretim job’ı şu snapshot’ı dondurur:

- `formId`, `publishedVersion` veya seçilen kayıt sürümü
- `templateId`, `templateVersion`, `printProfileId`
- allowlist alan eşleşmeleri ve boş değer politikası
- seçilen submission kimliklerinin server-side listesi
- QR token sürümü ve render seçenekleri

Katılımcı sonradan değişse bile aynı job’ın yeniden denenmesi farklı kişinin kartını üretmez. Yeni değer için yeni generation job gerekir.

### 4.2 QR tasarımı

QR içine ad, e-posta, telefon, ödeme tutarı veya form yanıtı gömülmez. QR; tahmin edilemez, form/etkinlik kapsamlı, iptal edilebilir bir badge token veya güvenli check-in referansı taşır. Token çözümleme server’da yetki, etkinlik, durum ve kullanım politikasıyla yapılır; kart üzerindeki QR tek başına katılımcı verisini ifşa etmez.

QR SVG olarak, kare modülleri bozulmadan ve etrafında en az dört modül quiet zone kalacak şekilde oluşturulur. Logo yerleştirilecekse finder pattern ve quiet zone üzerine binemez. Varsayılan hata düzeyi temiz baskı için M; kirlenme/hasar riski olan profil için Q/H ancak kod büyüklüğü ve tarama testi izin veriyorsa seçilir. Raster önizleme yalnız görsel kontrol içindir; final PDF’de vektör tercih edilir.

### 4.3 Dosya ve erişim

- Şablon PDF’i ve üretilen kartlar form/workspace medya ve belge kapsamına bağlı private storage’da tutulur.
- Public form, badge üretim job’ı, kişi listesi veya ZIP dosyasına erişemez.
- İndirme süreli ve scope’lu signed URL veya authenticated stream ile yapılır; URL’ye PII ve secret yazılmaz.
- Upload için PDF MIME/signature, sayfa sayısı, ölçü, boyut, font/resource ve zararlı içerik kontrolleri gerekir.
- Her üretim, indirme, yeniden üretim, başarısız kayıt ve dış hedef aktarımı audit event üretir.
- Matbaa gönderimi ileride açılırsa dış aktarım consent, veri minimizasyonu, retention ve geri alma/iptal durumu olmadan çalışmaz.

## 5. Şablon ve baskı preflight

### 5.1 Şablon kabulü

Şablon kaydı `customWidth`, `customHeight`, `unit`, `orientation`, `frontAsset`, `backAsset?`, `bleed`, `safeArea`, `cut/trim`, `printProfile`, `backgroundMode` ve `version` içerir. PDF arka planı ölçeklenerek sessizce kırpılmaz; oran/ölçü uyuşmazlığı `fit`, `crop`, `letterbox` seçenekleriyle görünür uyarı olarak gösterilir ve final üretimde kullanıcı onayı olmadan seçilmez.

### 5.2 Preflight kontrolleri

- MediaBox, TrimBox ve BleedBox ilişkisi geçerli mi?
- Custom bitmiş ölçü ve bleed, seçilen matbaa profilinde kabul ediliyor mu?
- Güvenli alan içinde dinamik metin/QR kalıyor mu?
- Fontlar gömülü veya izinli mi; fallback font metin taşmasına yol açıyor mu?
- Dinamik ad/title satır taşması, ellipsis veya otomatik küçültme politikasını geçiyor mu?
- QR yeterli modül/quiet zone, kontrast ve vektör niteliğine sahip mi?
- Ön/arka sayfa yönü, sayfa sırası ve flip edge seçimi açık mı?
- N-up sayfa kenarları, aralıklar, crop mark ve bleed toplam medya ölçüsüne sığıyor mu?
- Her kayıt benzersiz QR ve generation id ile eşleşiyor mu?
- Final PDF’de beklenmeyen public URL, token, ham PII veya gizli metadata var mı?

Preflight sonucu `PASS`, `WARN_REQUIRES_CONFIRMATION`, `BLOCKED` veya `PRINT_PROOF_REQUIRED` olur. Sadece `PASS` veya açıkça onaylanmış uyarı final export’a izin verir; `BLOCKED` kartı üretim kuyruğundan çıkarmaz, nedenini düzeltme için gösterir.

## 6. Çıktı paketi

### Tekil

- kişi başı `badge-{opaqueId}.pdf`
- ön/arka görsel proof
- QR tarama sonucu ve preflight özeti
- seçilen print profile ve flip edge bilgisi

### Toplu

- `combined-front.pdf` veya tek yüz N-up PDF
- çift yüz için eşleşmiş sayfa sıralı `combined-duplex.pdf`
- kişi başı PDF’ler içeren ZIP
- PII’yi gereksiz yere tekrarlamayan manifest: opaque badge id, submission reference, template version, status, warnings
- matbaaya verilecek ölçü/bleed/safe area/flip/readme bilgisi
- başarısız kayıtların nedeni; başarılı sayısı, atlanan sayısı ve yeniden üretilebilir job id

Toplu job idempotent’tir. Aynı `jobId + templateVersion + snapshotHash + printProfile` yeniden çalıştırıldığında aynı çıktı veya mevcut sonuç döner; yeni üretim ancak bilinçli reprint/revision ile yapılır.

## 7. Mikro-fazlar — her biri en fazla 15 dakika

Her fazın kapısı: önceki `LOCAL_PASS`, hedefli test, TypeScript/build/context-check ve workflow verify. Bir faz tek ölçülebilir çıktı üretir; “UI görünüyor” tek başına kabul değildir.

| Faz | Tek çıktı | Durum / kapı |
|---|---|---|
| `BADGE-00` | Bu karar ve faz sözleşmesi | READY; bu belge ile kapanır |
| `BADGE-01` | Badge/template/print-profile state ve capability taslağı | Kod yoksa yalnız sözleşme; schema olmadan UI yok |
| `BADGE-02` | Private template upload + PDF signature/size/page/dimension gate | Public route reddi |
| `BADGE-03` | Form field → badge field allowlist mapping | Ham answer ve PII sızıntısı testi |
| `BADGE-04` | Front-only single render contract | Vector text/QR ve overflow preflight |
| `BADGE-05` | Optional back render ve single/dual-page semantics | Back yoksa blank page yok |
| `BADGE-06` | Front/back preview ve print-profile flip controls | Uzun/kısa kenar belirsizliği yok |
| `BADGE-07` | Single preview → authenticated download | Private scope/signed retrieval |
| `BADGE-08` | Frozen submission snapshot | Değişen yanıt job sonucunu değiştiremez |
| `BADGE-09` | Selected/all attendee bounded batch job | Lease, retry, idempotency, per-record result |
| `BADGE-10` | Combined PDF + per-person ZIP + manifest | N-up/page order consistency |
| `BADGE-11` | Preflight report/proof sheet | BLOCKED/WARN/PASS ayrımı |
| `BADGE-12` | QR scan/security and no-PII regression suite | Opaque token, revoke, scope |
| `BADGE-13` | Reprint/audit and template versioning | Eski çıktı immutable |
| `BADGE-14` | Badge UI: form detail/response selection entry | Yetki ve empty state |
| `BADGE-15` | Matbaa handoff download screen | Direct external send kapalı |
| `BADGE-16` | Accessibility/responsive visual regression | Builder ve export ekranı kırılmaz |
| `BADGE-17` | Internal pilot: one-sided then duplex proof | Gerçek matbaa/print proof external dependency |
| `BADGE-18` | Capability gate and release note | V1/V2 davranışı bozulmadan açılır |

## 8. İleriye ertelenen entegrasyonlar

Şunlar bu iş akışının ilk çıktısına dahil değildir, fakat port tasarımında yer ayrılır:

- matbaa API/SFTP/portal teslim adapter’ı;
- yazıcı kuyruğu, Zebra/Epson/termal cihaz doğrudan sürücü entegrasyonu;
- check-in cihazı ve offline tarama;
- NFC/RFID;
- kişiye otomatik badge e-postası;
- SaaS tenant’larının kendi matbaa veya badge provider bağlantısı.

Bu özellikler için ileride hedef, `BadgeRenderer`, `PrintImpositionAdapter`, `PrintDestinationAdapter` ve `BadgeScanResolver` gibi portlar olur. Adapter bulunması provider entegrasyonu tamamlandı anlamına gelmez; credentials, veri aktarım onayı, sandbox/proof ve gerçek operasyon kanıtı ayrıca gerekir.

## 9. Kabul kriterleri

- Form seçilmeden ve yetkili oturum olmadan yaka kartı üretilemez.
- Tekil ve etkinliğin tamamı akışları aynı snapshot/render sözleşmesini kullanır.
- Tek yüz çıktı bir sayfa; çift yüz çıktı açık front/back sırası ve flip profili taşır.
- Arka yüz yoksa boş sayfa, ikinci QR veya yanlış duplex talimatı üretilmez.
- Uzun ad/title, eksik alan, yanlış ölçü, düşük kontrast, QR quiet zone ve sayfa taşması final preflight’ta görünür.
- Final PDF/ZIP private kalır; public form yalnız normal form snapshot’ını görür.
- Matbaa için indirilen paket, dosya listesi, ölçü, bleed, safe area, yön ve proof bilgilerini içerir.
- Yeniden üretim aynı katılımcıya/şablon sürümüne bağlıdır; eski çıktıyı sessizce değiştirmez.
- Ödeme, fatura ve V4/SaaS kararları bu modül nedeniyle erkene çekilmez.

## 10. Kaynaklar

1. [Cvent — Event Badge Printing](https://www.cvent.com/en/event-marketing-management/event-badge-printing) — badge designer, attendee alanları, role/template yaklaşımı ve on-demand/bulk davranışı.
2. [vFairs — Onsite Event Badge Printing](https://www.vfairs.com/event-management-platform/onsite-event-badge-printing/) — tek/çift yüz, toplu ön baskı ve check-in anında üretim.
3. [EventCreate — Event Name Badge Printing](https://www.eventcreate.com/features/event-badge-printing) — kayıt verisinden isim/title/şirket/QR ve toplu veya on-demand baskı.
4. [ClearEvent Badge Maker](https://badge.clearevent.com/) — custom ölçü, front/back, N-up ve print-ready PDF akışı.
5. [Adobe — Printer marks and hairlines](https://helpx.adobe.com/acrobat/using/printer-marks-hairlines-acrobat-pro.html) — Media/Trim/Bleed box ve printer marks.
6. [Adobe — Produce print-ready PDF files](https://helpx.adobe.com/indesign/desktop/print/print-production-and-file-creation/produce-print-ready-pdf-files.html) — PDF/X, bleed, gömülü font ve raster çözünürlük preflight başlıkları.
7. [ISO/IEC 18004:2024](https://www.iso.org/standard/83389.html) — QR semboloji, boyut, hata düzeltme ve üretim kalite gerekliliklerinin standardı.
8. [DENSO WAVE — Error correction](https://www.qrcode.com/en/about/error_correction.html) — hata düzeyi seçimi ve baskı/hasar koşulları.
9. [DENSO WAVE — QR code area](https://www.qrcode.com/en/howto/code.html/index.html) — quiet zone ve kod alanı.
10. [GS1 Ireland — QR size](https://resources.gs1ie.org/helpdesk/how-big-should-a-qr-code-powered-by-gs1-be) — modül sayısı, quiet zone ve boyutun baskı koşuluna bağlılığı; retail bağlamı nedeniyle etkinlik kartına doğrudan evrensel minimum olarak aktarılmaz.

**Durum:** `ACCEPTED_WITH_SIMPLIFICATION / FORM-UX_EXTENSION / EXPORT_FIRST`. Gerçek matbaa gönderimi, donanım, dış aktarım ve pilot baskı kanıtı gelene kadar `EXTERNAL_DEPENDENCY` olarak kalır.

## 11. 9 Eylül 2026 araştırma revizyonu — bağlayıcı uygulama kararı

Sağlanan ayrıntılı araştırma raporu `SIMPLIFY` kararıyla kabul edilmiştir. Bu revizyon, önceki planın özelliklerini kaldırmaz; kimlik anlamlarını, QR modlarını ve export sınırlarını kesinleştirir.

### Kimlik ayrımı

`participantId`, `submissionId`, `badgeId`, `badgeInstanceId`, `qrTokenId`, `generationJobId` ve `outputId` ayrı alanlardır. QR dışına çıkabilecek değer `qrTokenId` veya onun çözümlenen opak tokenıdır; PDF dosya adındaki kısa değer `outputIdShort` olur. QR token’ın PDF adına yazılması ve iki kimliğin aynı yapılması reddedilmiştir.

Varsayılan dosya adı şu biçimdedir:

`Ad-Soyad-EventAdi-FormAdi-outputIdShort.pdf`

İnsan okunabilir bölüm güvenli normalize edilir. Aynı ad/soyad/title tekrar ederse çakışma çözümü yeni bir QR token üretmekle değil, output ID ile yapılır. `outputIdShort` sır değildir ve QR yetkisi yerine geçmez. Çakışma halinde ad bölümüne title eklenebilir; yine çakışırsa yalnızca deterministik opak output ID fallback olarak kullanılabilir.

### QR policy

İlk uygulama sözleşmesinde `NONE`, `PUBLIC_CARD_URL`, `INLINE_VCARD` ve `SECURE_TOKEN` modları ayrı tutulur. `PUBLIC_CARD_URL` public dijital kartvizit için birincil networking yaklaşımıdır; `INLINE_VCARD` yalnızca açık opt-in ve alan allowlist’iyle kullanılabilir. Check-in/erişim için `SECURE_TOKEN` opak, server-side doğrulanan ve iptal edilebilir olmalıdır. Public kartvizit ve secure check-in tek QR payload’ında birleştirilmez; iki ihtiyaç varsa şablonda iki ayrı QR slotu bulunur.

QR içine ham PII, ödeme, e-posta, telefon veya form yanıtı varsayılan olarak girmez. Public kart sayfası ayrı scope ve yaşam döngüsüyle kapatılabilir. QR SVG olarak üretilir; quiet zone, hata düzeyi, kontrast ve gerçek tarama testi print profile/preflight kapsamındadır.

### Ürün sırası ve etki analizi

Yaka kartı, mevcut FORM-UX uzantısı olarak ilerler ve `PAY → INV/F manuel → Paraşüt → belge güvenliği → transactional teslimat → pilot → FORM-UX → SAAS` ana sırasını değiştirmez. R-10’un merchant, provider, staging veya muhasebe dış kanıtı bulunmaması bu modülün kontrat/izole export geliştirmesini durdurmaz; R-10 gerektiren ödeme/fatura/tenant davranışları badge modülüne eklenmez. V2 ödeme ve manuel fatura çıktıları yalnızca gelecekte seçilebilir dinamik alan sözleşmesi üzerinden bağlanabilir; ödeme kanıtı veya fatura PDF’i yaka kartı QR’ına konulmaz.

### Uygulama sırası güncellemesi

`BADGE-01` artık önce kimlik ve capability sözleşmesini kurar; `BADGE-02` private PDF şablon kabulünü, `BADGE-03` allowlist mapping’i, `BADGE-04..13` üretim/preflight/export güvenliğini, `BADGE-14..18` UI, handoff ve pilot kapılarını uygular. Public kartvizit ve secure check-in endpoint’leri, temel private export sözleşmesi geçmeden açılmaz.
