# MavenForms — Full İşlevsel ve Release Hazır Olma Yol Haritası

**Belge türü:** Kanıt-temelli ürün, güvenlik ve operasyon yol haritası  
**Hazırlanma tarihi:** 2026-09-01  
**Kapsam:** `D:\project\mavenform` yerel çalışma ağacındaki mevcut durum  
**Mevcut karar:** **V1 iç kullanım geliştirmesi açık; V2 gerçek ödeme + manuel fatura pilotu production için BLOCKED**

**AI yürütme protokolü:** Bu yol haritasını küçük, kanıt zorunlu ve ardışık fazlarla uygulamak için [AI-RELEASE-EXECUTION-PLAN.md](D:/project/mavenform/AI-RELEASE-EXECUTION-PLAN.md) okunmalıdır. Önce Phase 00 baseline; sonra her fazın giriş/çıkış kapısı ve önceki fazların yeniden doğrulaması zorunludur.

**Düşünce bulutu yönlendirmesi:** Sonradan eklenen her fikir önce AI yürütme planındaki `INT-00..INT-04` doğrulama paketinden geçirilir; sektör/rakip/kullanıcı problemi, mimari, güvenlik ve release etkisi analiz edilerek mevcut ana fazlara bağlanır. Kabul edilen ara işler bağımsız yan proje olarak değil, ana faz içinde 15 dakikalık kanıtlı mikro-paketler ve geçiş kapıları olarak yürütülür.

**Fikir değişiklik kontrolü:** Kullanıcının her yeni mesajı önce fikir olarak sınıflandırılır; aynı iş tekrar edilmez ve doğrulanmamış bilgi plana alınmaz. Ajan mevcut kod/plan/test kanıtını, sektörün birincil kaynaklarını ve önceki kararları karşılaştırarak `ACCEPTED`, `SIMPLIFIED`, `DEFERRED`, `REJECTED` veya `SAFE-NOW` kararı verir. Fikir ana fazı veya bağımlılıkları etkiliyorsa plan, kabul kriteri ve 15 dakikalık paketler önce revize edilir. Etkilemiyorsa kullanıcıya açıkça “planı etkilemiyor, hemen yapılmasında sakınca yok” bildirildikten sonra hedefli doğrulamayla uygulanabilir.

**Güncel uygulama denetimi:** Önceki planın kaynak kodda hangi ölçüde uygulandığı, UI-only kalan özellikler, media upload/form-scope mimarisi, seçili form + istatistik + yanıt ekranı ve en küçük güvenli uygulama fazları için [IMPLEMENTATION-AUDIT-AND-MICROPHASE-PLAN.md](D:/project/mavenform/IMPLEMENTATION-AUDIT-AND-MICROPHASE-PLAN.md) okunmalıdır. `RELEASE-CHECKLIST.md` tek başına bağımsız release kanıtı sayılmaz.

**Güncel yürütme kararı — 2026-09-04:** PAY retrieve ve live-safety kod kapıları yerel olarak geçmiştir; gerçek Stripe/iyzico sandbox hesap çağrısı bu aşamada ürün sahibi kararıyla ertelenmiştir. Bu erteleme ödeme doğrulamasını tamamlanmış saymaz ve release kararını değiştirmez. Geliştirme, gerçek credential gerektirmeyen manuel fatura sözleşmesi ve veri bütünlüğü mikro-fazlarında sürdürülebilir. Sandbox doğrulaması, pilot öncesi geri dönülmesi zorunlu `RELEASE BLOCKER` olarak plana bağlı kalır; canlı ödeme açılmaz.

## 1. Yönetici özeti

MavenForms şu anda çalışan bir Next.js/Bun/Prisma/SQLite uygulama tabanı ve güçlü bir demo arayüzü içeriyor. Ancak “full işlevsel” ve güvenilir bir SaaS release’i için tamamlanması gereken kritik güvenlik, veri bütünlüğü, cloud çalışma zamanı, gerçek entegrasyon ve doğrulama işleri var.

Mevcut durum için ihtiyatlı iç değerlendirme: **42/100 — BLOCKED**. Bu bir dış sertifika veya güvenlik garantisi değil; release risklerini karşılaştırmak için kullanılan bir karar puanıdır. Aşağıdaki kritik bulgular çözülmeden puan yükseltilmemeli:

1. Sunucu tarafında merkezi rol/yetki denetimi görünmüyor; workspace erişimi ile eylem yetkisi aynı şey değil.
2. Submission güncelleme/silme uçlarında form kapsamı sorguya bağlanmadığı için IDOR ve tenant veri bütünlüğü riski var.
3. Prisma migration geçmişi yok; production paketleme `db:push --accept-data-loss` kullanıyor.
4. Cloud ortamındaki gerçek build, başlangıç, health/readiness ve rollback akışı henüz kanıtlanmış değil.
5. Bazı ekranlar SMTP, ödeme, Mailchimp, LDAP ve bildirim durumlarını gerçek backend entegrasyonu olmadan gösteriyor.
6. Uçtan uca release testi, CI kalite kapısı, backup/restore provası ve gözlemlenebilirlik eksik.
7. Uygulama içi canlı form, stabil public link, iframe/inline ve WordPress delivery contract’ı tamamlanmış değil.
8. Builder’ın zorunlu sürükle-bırak, bounded Grid/Bento layout ve template sistemi release seviyesinde kanıtlanmış değil; nested container ağacı ürün kapsamından çıkarıldı.
9. Publish sonrası public form ile authenticated app yüzeyi arasında kanıtlanmış bir data/response allowlist sınırı bulunmuyor.

Bu belge iki sonucu hedefler:

- Düşük/orta trafikli tek-instance pilot için güvenli bir **Release Candidate** üretmek.
- Ürün gerçek çok kiracılı SaaS olarak büyüyecekse, SQLite’tan PostgreSQL/MySQL sınıfı bir sunucu veritabanına geçişi planlı ve geri alınabilir hale getirmek.

## 2. Kanıt sınırı ve varsayımlar

### 2.1 İncelenen yerel yüzey

- `package.json`, `next.config.ts`, `Caddyfile`
- `prisma/schema.prisma`, `prisma/seed.ts`, mevcut SQLite veritabanı
- `src/app/api/**`, `src/lib/auth.ts`, `src/lib/api-client.ts`
- MavenForms view ve public form bileşenleri
- `.zscripts/build.sh`, `.zscripts/start.sh`, `.zscripts/database-runtime-build.sh`, `.zscripts/dev.sh`
- `tests/` altındaki mevcut script testleri ve `worklog.md`
- mevcut git çalışma ağacı ve uncommitted değişiklikler

### 2.2 Kesinleştirilmesi gereken ürün kararları

Bu kararlar verilmeden trafik, maliyet, SLA veya release tarihi uydurulmamalı:

- Hedef cloud sağlayıcısı, deploy yöntemi ve kalıcı disk davranışı
- Production domain, HTTPS/TLS ve DNS sahipliği
- Beklenen workspace/tenant sayısı, aylık submission sayısı ve eşzamanlı kullanıcı
- SQLite ile tek instance pilotun kabul edilip edilmediği
- E-posta, dosya yükleme, ödeme, webhook, LDAP ve üçüncü taraf entegrasyonlarının release kapsamı
- KVKK/GDPR kapsamı, veri saklama süresi, silme talepleri ve yedekleme politikası
- Desteklenen tarayıcılar, mobil hedef ve erişilebilirlik seviyesi
- Release sonrası SLA, incident müdahale süresi ve sorumlu kişi

### 2.3 Bu yol haritasının varsayılan senaryosu

Ürün kararları verilene kadar plan şu muhafazakâr varsayımla ilerler:

- İlk release tek bölgede, tek application instance ile düşük/orta trafik pilotudur.
- Hassas üretim verileri için otomatik backup ve restore provası zorunludur.
- Ödeme ve gerçek dış entegrasyonlar kapsam dışıysa UI’da “bağlı” gibi gösterilmez; feature flag ile kapatılır.
- Çok-instance veya yüksek yazma trafiği hedefleniyorsa SQLite kararı geçersiz sayılır ve server database fazı öne çekilir.

### 2.4 İlk release hedefi ve ileri ticari model

Kullanıcı kararıyla ödeme kapsamı iki ayrı ürün evresine ayrılmıştır; ilk hedef V2’nin Maven first-party gerçek ödeme ve manuel fatura pilotudur. Paraşüt ve SaaS bu ilk hedefin release önkoşulu değildir. Bu iki evre aynı anda tek bir merchant/hesap modeli gibi uygulanamaz.

**Evre 1 — MavenForms first-party merchant:**

- MavenForms kendi formlarının merchant'ı olarak öncelikle iyzico bağlantısını kullanır; V2’de gerçek ödeme açılması merchant, sandbox, webhook ve reconciliation kanıtlarına bağlıdır.
- Yurtiçi ödeme ilk V2 pilot hedefidir. Yurtdışı ödeme ve diğer provider’lar aynı PaymentOrder omurgasında ileride capability kanıtıyla açılır; doğrulanmamış kanal V2’yi tamamlanmış göstermez.
- V2 faturalama yolu muhasebecinin dış sistemde kestiği belgenin manuel yükleme, eşleştirme, yetkili onay ve ayrı billing sender ile manuel teslim edilmesidir. Paraşüt API v4 otomasyonu bu ilk release’in parçası değildir.
- MavenForms kart numarası, CVV veya provider secret saklamaz.
- Bu evrede tenant şirketlerin kendi müşterilerinden para topladığı marketplace/Connect modeli açılmaz.

**Evre 2 — SaaS tenant merchant:**

- Ürün başarılı olduktan sonra şirketler kendi Stripe/iyzico hesaplarını ve kendi muhasebe/Paraşüt bağlantılarını tanımlar.
- Her workspace yalnızca kendi provider, fatura, müşteri ve belge kayıtlarına erişir.
- MavenForms abonelik ücretini kendi merchant hesabıyla ayrıca tahsil eder; tenant müşteri ödemeleri ile MavenForms abonelik ödemesi karıştırılmaz.
- Her tenant için gelecekte manuel ve API faturalama seçenekleri aynı güvenlik, idempotency, audit ve document-ready kurallarını kullanır.
- Stripe Connect/iyzico Marketplace yalnızca MavenForms’ın tenant parası üzerinde platform tahsilatı veya dağıtımı yapması gerekirse ayrı bir karar fazı olarak kalır.

Bu karar `PAY-00` içinde yazılı iş modeli kapısıdır. Evre 1 tamamlanmadan Evre 2 tenant bağlantı UI’ı, Connect/Marketplace veya ortak merchant havuzu uygulanamaz.

### 2.5 SaaS tarafı: BYO provider / tenant-scoped direct merchant

SaaS evresinde MavenForms şirketler adına ödeme almaz, parayı tutmaz ve şirketlerin müşterilerine merchant olarak görünmez. Her şirket kendi bilgilerini ilgili provider ve muhasebe sistemine tanıtır; MavenForms yalnızca güvenli bağlantı ve form altyapısını sağlar.

```text
Tenant şirket
  ├── Kendi Stripe/iyzico hesabı
  ├── Kendi Paraşüt/muhasebe hesabı
  ├── Kendi müşteri ödemeleri ve faturaları
  └── MavenForms’a ayrı abonelik ödemesi
```

Zorunlu izolasyon kuralları:

- `ProviderConnection`, `PaymentOrder`, `InvoiceRecord`, `DeliveryIntent` ve tüm müşteri/fatura belgeleri `workspaceId` ile tenant-scoped olur.
- Tenant secret’ları yalnızca server-side encrypted secret reference olarak tutulur; browser, public snapshot, embed, WordPress, log, export ve audit payload’ına girmez.
- Her tenant’ın provider hesabı, webhook secret’ı, sender profile’ı, muhasebe bağlantısı ve belge deposu ayrı doğrulanır.
- Support veya platform admin erişimi varsayılan değildir; gerekiyorsa süreli, gerekçeli, onaylı ve audit kayıtlı olur.
- MavenForms abonelik faturası ayrı bir first-party billing domain’idir; tenant müşterilerinin ödeme/fatura kayıtlarıyla aynı merchant, connection veya invoice zincirinde birleştirilemez.
- Tenant kendi provider’ını bağlamadan public ödeme aktif gösterilemez; yalnızca form ve ödeme kapalı/başvuru bekliyor durumu gösterilir.

Bu mimari marketplace/Connect değildir. MavenForms’ın tenant parasını tahsil edip bölüştürmesi, payout yapması veya platform komisyonu kesmesi istenirse ayrı bir ticari/uyum kararı gerekir ve mevcut SaaS kapsamına dahil değildir.

SaaS geçiş kapısı: Evre 1’in gerçek sandbox/live kanıtı, tenant izolasyon testleri, secret rotation/revoke, provider webhook correlation, gizlilik/retention politikası ve abonelik-tenant ödeme ayrımı tamamlanmadan tenant onboarding production’da açılmaz.

**İlk SaaS pilotu için sade abonelik kontrolü:** Otomatik SaaS abonelik ödeme provider’ı ilk test evresinin ön koşulu değildir. Platform yöneticisi aboneliği manuel olarak `active`, `due_soon`, `grace`, `suspended` veya `ended` durumuna alır; panelde yaklaşan tarih görünür. `suspended/ended` durumunda tenant verileri silinmez: publish edilmiş formlar public erişime kapanır, yeni form oluşturma ve silme kapanır, mevcut veriler yalnızca yetkili read-only/export kapsamından erişilir. Askıya alma anında yayınlanmış her formun son yayın sürümü ve önceki etkin durumu resume snapshot olarak kaydedilir. Abonelik yeniden aktif edildiğinde bu snapshot’taki yayınlanmış formlar aynı sürümle idempotent biçimde otomatik açılır ve kaldığı yerden devam eder; taslak, yayınlanmamış veya arşivlenmiş formlar açılmaz.

## 2.6 Ürün çıkışları ve modüler capability sınırı

Yukarıdaki teknik fazlar, kullanıcıya sunulacak ürün sürümleriyle aşağıdaki şekilde eşleşir. Bu tablo mevcut teknik işleri yeniden başlatmaz; hangi işin hangi sürümde görünür ve kullanılabilir olacağını belirler.

| Ürün sürümü | MavenForms kullanım amacı | Açık capability’ler | Bilinçli olarak kapalı capability’ler |
| --- | --- | --- | --- |
| **V1 — Maven iç kullanım formları** | Maven etkinlikleri, araştırma formları ve quizler | Form oluşturma/yayınlama, public kayıt, yanıtlar, manuel ödeme alındı/alınmadı, yetkili bilgi mesajı, export | Online provider, otomatik fatura, tenant bağlantıları, SaaS abonelik |
| **V2 — Maven first-party ödeme + manuel fatura** | Maven’ın kendi merchant hesaplarıyla yurtiçi/yurtdışı tahsilat | Provider doğrulamalı ödeme, webhook/retrieve/refund review, muhasebecinin private fatura yüklemesi, onay sonrası ayrı fatura maili | Paraşüt otomatik fatura, tenant adına ödeme, Maven abonelik tahsilatı |
| **V3 — Maven Paraşüt otomasyonu** | Maven ödeme → muhasebe/fatura → document-ready zinciri | Paraşüt API v4 OAuth/company scope, contact/product resolution, satış faturası, e-Fatura/e-Arşiv karar ve job akışı | Tenant self-service bağlantıları, platform/marketplace tahsilatı |
| **V4 — SaaS BYO merchant** | Başarılı first-party ürünün dış şirketlere kiralanması | Tenant’ın kendi Stripe/iyzico/uygun provider, muhasebe/Paraşüt ve mail bağlantıları; modül entitlement; izinli destek erişimi; ayrı manuel abonelik durumu | MavenForms’ın tenant müşterisi adına para tutması veya tahsil etmesi |

V1, R-10 nedeniyle blanket olarak bloke edilmez; ödeme ve fatura capability’leri server-side kapalı şekilde iç kullanımda ilerler. **İlk ürün hedefi V1 + V2’dir:** V2, Maven’ın kendi merchant hesabıyla gerçek ödeme alma ve muhasebecinin manuel fatura teslim pilotunu tamamlamadan ilk hedefe ulaşmış sayılmaz. V2 production açılışı ilgili gerçek sağlayıcı, webhook/retrieve/refund/reconciliation, belge, teslimat ve staging kanıtları olmadan yapılmaz. Paraşüt V3, SaaS V4’tür; ikisi V2’yi bloke etmez, ancak kendi güvenlik ve dış kanıt kapıları geçmeden açılmaz. Ayrıntılı mikro-fazlar, packet dosyaları ve her fazın geçiş kapısı `docs/superpowers/plans/2026-09-06-mavenforms-release-modules-first-party-saas-roadmap.md` içindedir.

### İlk hedef release kapısı

İlk hedef için gerekli zincir şudur:

```text
V1 çalışan form
  → Maven first-party ödeme
  → server doğrulamalı ödeme durumu
  → muhasebecinin manuel fatura yüklemesi
  → eşleştirme ve yetkili onay
  → document_ready
  → ayrı fatura göndericiyle manuel teslim
  → kontrollü first-party pilot
```

Bu zincirin herhangi bir güvenlik veya veri bütünlüğü kapısı geçmezse ilgili capability `NO-GO` kalır; ancak Paraşüt veya SaaS işlerinin henüz yapılmamış olması V1/V2 geliştirmesini durdurma gerekçesi değildir.

## 2A. Ürün omurgası ve bağımlılık önceliği

MavenForms bir mailing programı değildir. E-posta; form, ödeme, fatura ve entegrasyon olaylarının gerektiğinde güvenli biçimde teslim edilmesini sağlayan çapraz kesen bir altyapı katmanıdır. E-posta planındaki paketlerin ilerlemiş olması, ödeme veya fatura işlevlerinin tamamlandığı anlamına gelmez.

### Kanonik iş akışı

```text
Published form + public submission
  → gerekirse PaymentOrder
  → sağlayıcı API/hosted checkout
  → imzalı ve idempotent authoritative payment event
  → InvoiceRecord / muhasebe adayı
  → Paraşüt API v4 veya API’siz muhasebe importu
  → issued + document_ready / yetkili harici belge
  → gerektiğinde DeliveryIntent
  → güvenli transactional e-posta veya diğer teslimat kanalı
```

Bu akışta form yanıtı, ödeme, fatura ve teslimat ayrı domain yaşam döngüleridir. Browser dönüşü, UI etiketi veya provider’ın ilk kabul cevabı tek başına ödeme/fatura/e-posta başarısı sayılamaz. Fatura e-postası belge `document_ready`, alıcı snapshot’ı doğrulanmış ve gönderim yetkisi mevcut olmadan üretilemez.

Ödeme sağlayıcıları (Stripe, Google Pay üzerinden seçilen gateway, iyzico), Paraşüt ve API’siz muhasebe importu kendi secret, yetki, retry, idempotency, audit ve hata yaşam döngülerini korur. E-posta worker tutar, vergi, kart veya provider secret hesaplamaz; yalnızca çekirdek domain tarafından üretilmiş sınırlı `DeliveryIntent` sözleşmesini teslim eder. Public form, embed ve WordPress istemcileri fatura kayıtlarına, müşteri listesine, provider secret’larına veya admin mail ayarlarına erişemez.

### Uygulama sırası kilidi

Bir ajan veya 15 dakikalık otomatik iş aşağıdaki sırayı atlayamaz:

1. `F/D`: form, publish, public payload ve tenant güvenliği.
2. `PAY-00`: önce MavenForms first-party merchant kararının yazılı kilidi; SaaS tenant merchant geçiş koşullarının ayrıca tanımlanması.
3. `PAY-02..PAY-10`: ödeme iş modeli, tutar, `PaymentOrder`, provider bağlantısı, authoritative webhook, reconciliation ve iade durumları.
4. `PAY-11..PAY-18`: Google Pay/iyzico, public/embed ödeme güvenliği, PCI/KVKK ve sandbox-live kapıları.
5. `INV/F`: `InvoiceRecord`, alıcı/vergi snapshot’ı, Paraşüt API v4 ve API’siz Excel/belge akışı.
6. `INT`: first-party veya tenant-scoped muhasebe/provider bağlantıları, token rotation, rate limit, hata ve audit akışları.
7. Yalnızca ilgili çekirdek fazın gerektirdiği `DELIVERY/MAIL` paketleri: makbuz, fatura, sistem bildirimi, suppression, domain health, outbox ve teslimat kanıtı.
8. Pilot: ödeme → fatura → document-ready → gerekli teslimat zincirinin kontrollü uçtan uca kanıtı.
9. `FORM-UX`: pilot sonrası form ürünü olgunlaştırma; responsive, builder, medya ve gerçek kontrol davranışları.
10. `SAAS`: tenant-scoped BYO provider/muhasebe bağlantıları, secret rotation, webhook izolasyonu ve MavenForms abonelik ayrımı.
11. Marketing e-postası, campaign/list yönetimi ve Mailchimp Marketing gibi ürün özellikleri; ödeme/fatura release’inin kritik yolunda değildir ve ayrı P2 kapsamıdır.

### 2B. Yaka kartı capability routing

Yaka kartı; form yanıtlarından tekil veya toplu, tek yüz veya isteğe bağlı çift yüz, custom ölçülü ve QR içeren matbaa çıktısı üretme capability'si olarak `FORM-UX` uzantısına eklenmiştir. İlk güvenli ürün davranışı export-first'tir: birleştirilmiş PDF, kişi başı PDF, ZIP, manifest ve proof/preflight çıktısı verilir. Matbaa API/SFTP veya doğrudan yazıcı gönderimi ilk sürümde otomatik açılmaz; dış veri aktarımı için ayrı adapter, onay, scope, retention ve gerçek baskı kanıtı gerekir.

Detaylı karar ve 15 dakikalık mikro-fazlar: [`docs/superpowers/plans/2026-09-09-mavenforms-badge-module-roadmap.md`](docs/superpowers/plans/2026-09-09-mavenforms-badge-module-roadmap.md). Bu capability ana `PAY → INV/F manuel → Paraşüt → belge → teslimat → pilot → FORM-UX → SAAS` sırasını değiştirmez ve V2/V4 release kapısı değildir.

Bir mail paketi, kendisini tetikleyen payment/invoice/integration kabul kriterini göstermeden başlatılamaz. Mail paketi gerekli değilse ertelenir; mevcut mail güvenlik altyapısı korunur ama yeni mail UI/provider özelliği açılmaz. Her teslimat fazından önce ilgili ödeme, fatura ve entegrasyon fazlarının tüm smoke testleri yeniden çalıştırılır.

## 2B. 2026-09-03 derin araştırma kanıt kapısı

Bu roadmap, `docs/OzelAPP_Derin_Arastirma_2026-09-03/` altındaki bağımsız araştırma paketi, `KAYNAK_LEDGERI.md` kaynak kayıtları, `docs/Anonim_Teknik_Mimari_API_ve_Uygulama_Sozlesmesi.md` anonim mimari/API araştırma sözleşmesi ve `docs/OzelAPP_Anonim_Entegrasyon_ve_Release_Arastirmasi.md` genişletilmiş anonim entegrasyon/release araştırması kullanılarak güncellenmiştir. Araştırma kodun çalıştığını kanıtlamaz; provider hesabı, sandbox/live ve hukuk kanıtları ayrıca alınmalıdır.

### Araştırmadan çıkan bağlayıcı kararlar

- İlk pilot ödeme sağlayıcısı olarak iyzico hosted/Checkout Form yolu esas alınır. Callback başarı kanıtı değildir; server-side retrieve ve doğrulanmış webhook sonucu gerekir.
- Stripe adapter’ı korunur; ancak resmi desteklenen ülke/merchant uygunluğu ve sözleşme kanıtı olmadan canlı Stripe açılmaz. Stripe özelliği bu kanıt gelene kadar feature flag ile kapalıdır.
- Google Pay doğrudan `DIRECT` token çözümleme yoluyla uygulanmaz. Yalnızca uygunluğu kanıtlanmış bir PSP gateway capability’si olarak açılır.
- PaymentOrder tutarı client’tan alınmaz; server-side published policy’den minor-unit olarak hesaplanır. Provider, mode, connection ve hesap seçimi public client’a bırakılamaz.
- Ödeme başarısı tarayıcı dönüşü veya UI etiketiyle kesinleşmez. Webhook raw-body imzası, timestamp/replay, duplicate dedupe, sırasız event reducer’ı ve gerektiğinde provider retrieve zorunludur.
- Kart/PAN/CVV hiçbir DB, log, cache, analytics, export, queue veya backup katmanına alınmaz. Hosted ödeme PCI kapsamını azaltır; acquirer/QSA SAQ doğrulamasının yerine geçmez.
- Faturalama ilk aşamada resmi vergi sonucu üreten sınırsız bir motor değil; ödeme sonucunu, muhasebe adayını, dış belgeyi ve document-ready akışını denetleyen orkestratördür.
- Paraşüt API v4 için yalnız resmi dokümanda doğrulanan endpoint ve davranışlar uygulanır. Sandbox, genel idempotency, revoke, e-belge callback veya imzalı XML davranışı yazılı kanıt yoksa `EXTERNAL DEPENDENCY` kalır.
- GİB şema/kod listeleri zaman duyarlıdır. Araştırmada belirtilen 14 Eylül 2026 değişiklik tarihi pilot öncesi güncel GİB paketleri ve mali müşavir doğrulamasıyla yeniden kontrol edilmeden release kriteri sayılamaz.
- E-posta yalnız ödeme/fatura/document-ready ile tetiklenen transactional teslimattır. SPF/DKIM/DMARC, outbox, signed delivery webhook, bounce/complaint suppression ve güvenli süreli belge linki gerekir; marketing/campaign kapsamı bu release’in kritik yolu değildir.
- Public form yalnız immutable published snapshot kullanır. Iframe varsayılan izolasyon sınırıdır; inline embed exact origin, CSS/DOM izolasyonu ve güvenli resize protokolü olmadan açılmaz. WordPress paketi secret içeremez.
- SaaS son fazdır. Buna rağmen `workspaceId`/gelecekteki `tenantId`, tenant-scoped sorgu/obje yolları, encrypted secret reference ve audit actor sınırı temel modellere baştan işlenir.

### Araştırma kaynaklarının uygulama sırasına etkisi

Araştırma paketi ana sırayı değiştirmemiş, her ana fazın kapısını sıkılaştırmıştır. Mevcut ödeme geliştirmesinde `PAY-06D-02` yalnız server-owned PaymentOrder snapshot ve published policy sözleşmesini ilerletebilir; gerçek iyzico/Stripe checkout çağrısı ilgili merchant capability, secret, sandbox ve signed callback kanıtları olmadan açılamaz. Manuel fatura, Paraşüt, document-ready, gerekli teslimat, pilot, FORM-UX ve SaaS kapıları aynı sırada kalır.

### Kaynak kullanma kuralı

Geliştirme ajanı provider, vergi, güvenlik, e-posta, embed veya SaaS kararı verirken önce ilgili konu dosyasını, sonra `KAYNAK_LEDGERI.md` kaydını okumalı; kaynağın söylemediği davranışı kesin kabul etmemelidir. Araştırma metni ile mevcut kod çelişirse kod durumu ayrıca doğrulanır, sessizce varsayım yapılmaz.

## 3. Mevcut durum analizi

| Alan | Gözlenen durum | Release etkisi | Karar |
|---|---|---|---|
| Uygulama | Next.js uygulama, API routes ve Prisma modelleri mevcut | Temel iyi; üretim doğrulaması eksik | Devam |
| Auth | scrypt tabanlı parola doğrulama, session/refresh tabloları ve Bearer akışı mevcut | Rate limit, reset, MFA ve güvenli token stratejisi eksik | P0/P1 |
| Tenant güvenliği | Form sorgularının bir bölümü workspace ile sınırlandırılıyor | Tüm mutation’larda merkezi policy ve negatif test yok | P0 |
| Submission | Public POST ve admin liste/detail uçları mevcut | Detail PATCH/DELETE kapsam riski, transaction/validation eksik | P0 |
| Form yönetimi | Form, field, logic, notification ve appearance modelleri mevcut | Builder’ın bazı özellikleri UI/demo seviyesinde | P1 |
| Public delivery | Public form route/renderer temeli mevcut | Direct URL, iframe, inline, versioning ve embed allowlist release contract’ı eksik | P0 |
| Builder layout | Form builder ekranı mevcut | Zorunlu pointer/touch/keyboard drag-drop, bounded Grid/Bento ve template isolation tamamlanmış değil; nested container kapsam dışı | P0 |
| Form card UX | Form listesi mevcut | 16:9 cover image, fallback, `…` ve sağ alt `Ayarlar` sözleşmesi eksik | P1 |
| WordPress | Doğrudan WordPress plugin/block kanıtı yok | Gutenberg, shortcode, enqueue, CSP ve compatibility testleri gerekiyor | P1 |
| Kullanıcı yönetimi | `users-view.tsx` içinde sabit kullanıcı/rol gösterimleri var | Gerçek davet, rol atama ve üyelik akışı kanıtlanmadı | P0/P1 |
| Entegrasyonlar | Ayar/builder ekranlarında SMTP, ödeme ve provider durumları görünüyor | Gerçek credential doğrulaması ve callback/webhook yok | P0/P1 |
| Database | SQLite mevcut, migration dizini yok | `db:push --accept-data-loss` rollback için uygun değil | P0 |
| Build | standalone output hedefleniyor; TypeScript build hataları ignore ediliyor | Cloud build henüz release gate değil | P0 |
| Runtime | Caddy + Next standalone + mini servis başlangıcı var | Readiness, graceful shutdown ve cloud uyumluluğu eksik | P0/P1 |
| Test | DB/Python paket script testleri ve geçmişte 33/33 API sonucu raporlanmış | Güncel kritik path E2E kanıtı yok | P0 |
| Operasyon | `/api/health` benzeri DB kontrollü readiness kanıtlanmadı | Incident teşhisi ve deploy doğrulaması zayıf | P1 |
| Dokümantasyon | `CLOUD-DEBUG-HANDOFF.md` mevcut; root README ve release runbook eksik | Başka ajan/cloud operatörü için yol ayrıntıları dağınık | P1 |

`worklog.md` içindeki eski “33/33 API” ve browser QA notları yararlı geçmiş kanıttır; mevcut commit, cloud ortamı ve release build’i için tek başına güncel kanıt sayılmamalıdır.

## 4. Release’i engelleyen kritik bulgular

### P0-01 — Merkezi authorization ve tenant isolation

**Sorun:** Session sahibi olmak, her workspace ve her eylem için yetkili olmak anlamına gelmez. Modelde owner/admin/form_manager/analyst/reviewer/viewer rolleri bulunmasına rağmen API mutation’larında tek bir merkezi capability kontrolü görünmüyor.

**Gerekli çözüm:**

- `getAuthContext()` benzeri tek bir auth context: user, session, workspace membership, role.
- Eylem bazlı capability matrisi: `forms.read`, `forms.write`, `submissions.read`, `submissions.update`, `submissions.delete`, `members.manage`, `settings.manage`, `integrations.manage`, `billing.manage`.
- Her protected route için sıralı kontrol: kimlik → workspace üyeliği → capability → kaynak ownership/tenant predicate.
- Deny-by-default; bilinmeyen veya pasif üyelik erişemez.
- Yetkisiz cevapları tutarlı `401/403`, kaynak yok/başka tenant için bilgi sızdırmayan `404` davranışına bağla.
- Audit log’a actor, action, target, workspace, request id ve sonuç yaz.

**Özel risk:** `src/app/api/forms/[id]/submissions/[subId]/route.ts` içindeki PATCH/DELETE akışları submission’ı `subId` ile bulup güncelliyor/siliyor; `formId: id` koşulu mutation sorgusuna bağlanmadığı için bilinen başka form submission ID’si üzerinde işlem yapılması mümkün olabilir.

### P0-02 — Submission veri bütünlüğü ve abuse kontrolü

Public submission POST akışı kaydı, değerleri ve sayaç güncellemesini ayrı işlemler halinde yapıyor. Ayrıca şu kontroller release öncesi tamamlanmalı:

- `prisma.$transaction` ile submission + values + counter tek atomik işlem olsun.
- Idempotency key için form kapsamında unique constraint ve concurrency testi ekle.
- Public token için kriptografik random üretim kullan; `Date.now() + Math.random()` yaklaşımını kaldır.
- Field type, required, max length, response limit, start/end date ve logic kurallarını server tarafında doğrula.
- JSON body boyutu, field sayısı ve tek submission payload üst sınırını belirle.
- IP/user-agent değerlerini “hash” adıyla ham saklama; gerçekten HMAC/hash ve retention politikası uygula.
- Rate limit, bot/spam koruması ve kötüye kullanım alarmı ekle.
- Başarısız partial write durumunda değerler/sayaçlar geride kalmamalı.

### P0-03 — Migration, backup ve rollback

`prisma/migrations/` dizini görünmüyor. Production build script’i `db:push --accept-data-loss` çalıştırıyor. Bu, release sırasında şema değişikliklerinin kontrollü, incelenebilir ve geri alınabilir olduğu anlamına gelmez.

**Hedef akış:**

1. Development’ta şema değişikliği `prisma migrate dev` ile migration üretir.
2. Migration review ve staging backup/restore provası yapılır.
3. CI veya release job production’da yalnızca `prisma migrate deploy` çalıştırır.
4. `db:push --accept-data-loss` production start/build akışından çıkarılır.
5. Her release öncesi timestamp’li DB backup, checksum ve restore test sonucu kaydedilir.
6. Migration başarısız olursa uygulama trafiğe alınmaz; rollback runbook’u önceki app paketi ve veri uyumluluğu ile test edilir.

Mevcut SQLite verisi için önce kopya üzerinde migration/baseline provası yapılmalı; canlı dosyanın üzerine otomatik yazma yapılmamalıdır.

### P0-04 — Deterministic cloud build ve startup

Cloud handoff belgesinde ayrıntıları bulunan runtime riskleri bu yol haritasının release gate’idir:

- `.zscripts/build.sh` içindeki hard-coded `/home/z/my-project` yolu ve Linux araç varsayımları hedef ortamla doğrulanmalı.
- `BUILD_ID` varsayılanı ve temp/build cleanup davranışı açıkça tanımlanmalı.
- `postinstall` ile `prisma generate` çalışsa da build pipeline bunu ayrıca doğrulamalı.
- `next.config.ts` içindeki `typescript.ignoreBuildErrors: true` kaldırılmalı veya en azından ayrı zorunlu typecheck kapısı konmalı.
- Standalone `server.js`, Prisma runtime, statik dosyalar, public assets, Caddy ve mini servisler temiz bir artifact içinde smoke test edilmeli.
- `start.sh` yalnızca process PID’sini değil, HTTP readiness endpoint’ini beklemeli.
- Port, hostname, forwarded headers, TLS termination ve external `DATABASE_URL` davranışı hedef cloud ile test edilmeli.
- `start` script’inde Unix’e özgü `tee` ve inline env kullanımının hedef runtime’da çalıştığı kanıtlanmalı.
- Graceful shutdown, child process cleanup ve crash sonrası restart davranışı test edilmeli.

### P0-05 — Session/token ve hesap güvenliği

Mevcut istemci `localStorage` içinde Bearer token tutuyor. Bu pratik yerel preview’da çalışsa da XSS oluştuğunda token’ın JavaScript tarafından okunabilmesi ciddi risk taşır.

**Tercih edilen release çözümü:** Aynı site/BFF akışı içinde `HttpOnly; Secure; SameSite=Lax veya Strict` session cookie kullanmak; mutation isteklerinde CSRF savunması uygulamak; token’ı frontend JavaScript’ine vermemek.

Minimum tamamlanacaklar:

- HTTPS production’da cookie `Secure` olmalı; mevcut `secure: false` varsayılanı production için kabul edilmemeli.
- Session rotation, revoke, expiry ve refresh replay koruması doğrulanmalı.
- Login rate limit, başarısız deneme görünürlüğü ve hesap kurtarma akışı eklenmeli.
- Forgot-password token’ı tek kullanımlık, süreli ve loglarda görünmez olmalı.
- Password policy ve MFA kapsam kararı yazılı olmalı; admin/owner için MFA tercih edilmeli.
- CSP, output encoding, HTML/custom CSS/URL sanitization ve dependency audit uygulanmalı.

### P0-06 — Sahte entegrasyon ve operasyon durumlarını ayırma

`users-view.tsx`, `settings-view.tsx`, `form-builder-view.tsx` ve `dashboard/route.ts` içinde sabit kullanıcılar, provider bağlantıları ve mock alert/notification durumları bulunuyor.

Release davranışı:

- Gerçek backend’e bağlı olmayan her özellik “Demo”, “Planlandı” veya “Yapılandırılmadı” olarak açıkça işaretlenmeli.
- “Stripe connected”, “Mailchimp connected” gibi durumlar yalnızca doğrulanmış Integration kaydından ve güvenli health check’ten sonra gösterilmeli.
- Dashboard’daki mock failed notifications/system alerts kaldırılmalı veya feature flag arkasına alınmalı.
- SMTP credential’ları hiçbir API response, HTML, log veya client state içinde gösterilmemeli.
- Ödeme kapsam dışıysa billing ekranı release build’inden çıkarılmalı; kapsam içiyse webhook imza doğrulama ve idempotency tamamlanmadan “ödeme alındı” denmemeli.

### P0-07 — Public form yayınlama ve dışarıdan çalıştırma sözleşmesi

Kullanıcının beklediği ana ürün davranışı yalnızca uygulama içindeki builder ekranı değildir: yayınlanmış form, uygulama içinde canlı açılmalı ve dışarıdaki bir sayfadan link/embed ile doldurulabilmelidir. Bu bir “sonradan eklenir” özelliği değil, ürünün release sözleşmesidir.

**Zorunlu yayın yüzeyleri:**

- Her yayınlanmış form için stabil public URL: örnek biçim `/f/<public-slug>`; gerçek route kararı domain/tenant tasarımıyla kesinleştirilmeli.
- Uygulama içi live preview; draft preview ile public published snapshot birbirinden ayrılmalı.
- Direct link/full-page görünüm.
- Responsive iframe embed.
- Inline JavaScript/custom element embed.
- WordPress Gutenberg block ve shortcode entegrasyonu.
- Kopyalanabilir HTML/JS kodu, önizleme ve “embed kodunu yenile” ekranı.
- İhtiyaç doğrulanırsa popup/modal ve button launcher; ilk release’te iframe/direct link kadar zorunlu değil.

**Yayın modeli:** Draft değişikliği public formu değiştirmemeli; kullanıcı açıkça Publish yaptığında yeni immutable published version aktif olmalı. Public link mevcut aktif sürümü göstermeli. Eski sürümün submission contract’ı bozulmadan yeni sürümle uyumluluk ve rollback davranışı test edilmeli.

**Güvenlik ve izolasyon:**

- Public render authentication token istememeli; admin/session verisi embed’e taşınmamalı.
- Draft/preview erişimi yalnızca yetkili kullanıcı veya kısa ömürlü imzalı preview token ile açılmalı.
- Formun hangi origin’lerde embed edilebileceği workspace/form bazında allowlist ile yönetilmeli.
- `frame-ancestors`, CORS, CSP, referrer policy ve form submission origin davranışı birlikte belgelenmeli.
- Iframe izinleri minimum tutulmalı; gereksiz `allow`, wildcard target origin veya sınırsız postMessage kabul edilmemeli.
- Public response yalnızca yayınlanmış formun gerekli render schema’sını dönmeli; secrets, internal notes, audit ve workspace private alanları dönmemeli.

### P0-08 — Embed CSS izolasyonu ve responsive sözleşmesi

“Başka sitede çalışıyor” yalnızca iframe’in açılması değildir. Host sitenin CSS’i formu bozmamalı, formun CSS’i host sayfayı bozmamalı ve küçük ekranlarda yatay taşma/ikinci scrollbar oluşmamalıdır.

**Varsayılan mimari:** En sağlam varsayılan iframe embed’dir. Inline mod, gerçekten sayfaya karışması istenen kullanım için ayrı bir versioned loader/custom element olarak sunulmalı; iframe ile aynı render contract’ını kullanmalı.

**Inline mod kuralları:**

- `mavenforms-embed` gibi custom element kökü veya Shadow DOM ile stil/DOM izolasyonu.
- Global `body`, `input`, `button`, `h1` gibi selector’ları dışarı sızdırmama.
- Host sayfanın reset/framework CSS’ine güvenmeme.
- Tasarım token’larını CSS custom properties ile sınırlı root üzerinde uygulama.
- Form instance ID’si ile event ve DOM namespace çakışmasını önleme.
- JS loader’ın duplicate yüklenmesinde ikinci form veya ikinci event listener oluşturmaması.

**Responsive kuralları:**

- Form root genişliği `100%`, `max-width` ve açık minimum genişlik davranışına sahip olmalı.
- Grid/columns daralınca yatay overflow üretmemeli; uzun label, error ve option metinleri taşmamalı.
- Breakpoint’ler yalnız viewport’a göre değil, embed container genişliğine göre de çalışmalı.
- Iframe yüksekliği sabit tahminle bırakılmamalı; içerik yüksekliği `ResizeObserver` + güvenli `postMessage` ile parent’a bildirilmeli. Sabit/fallback yükseklik ve parent JavaScript kapalı senaryosu da bulunmalı.
- Lazy loading, loading state, timeout ve embed error state tanımlı olmalı.
- Desktop, tablet, narrow mobile, zoom %200 ve reduced-motion senaryoları test edilmeli.
- Font, icon ve asset yüklenmesi host sayfaya bağımlı olmamalı; harici font başarısızlığında yerel fallback kullanılmalı.

**Release engeli:** Responsive/CSS isolation testleri geçmeyen dış embed release’te “çalışıyor” kabul edilmez.

### P0-09 — Sürükle-bırak builder ve kontrollü Grid/Bento layout sistemi

Builder yalnızca “alana tıkla ve listeye ekle” seviyesinde bırakılamaz. Form tasarımının temel etkileşimi pointer/touch/keyboard destekli sürükle-bırak olmalıdır. Alan modeli düz liste + güvenli Grid layout olarak kalır; nested container ağacı bu ürün kapsamından çıkarılmıştır.

**Canvas modeli:**

```text
Form fields (sortOrder)
  └─ normalized layout (desktop/tablet/mobile)
      └─ field decoration (builtin or form-scoped media)
```

**Zorunlu builder davranışları:**

- Sol panelden blok sürükleme; canvas üzerinde drop zone, insertion line ve geçerli/geçersiz hedef göstergesi.
- Var olan alanları yeniden sıralama ve geçerli konuma bırakma.
- Pointer, touch ve keyboard ile aynı işlemlerin yapılabilmesi; keyboard için move-before/move-after komutları.
- Undo/redo, duplicate, delete, multi-select kararı ve unsaved changes uyarısı.
- Autosave debounce, optimistic update failure recovery ve concurrent edit çatışma mesajı.
- Her alanda stable ID, `sortOrder`, güvenli layout değerleri, decoration ve responsive fallback bulunması.
- 1–12 kolon Grid span, semantik yükseklik, yeni satır ve mobile collapse ayarları.
- “Bento” görünümü yalnızca bounded preset ile eşit olmayan span dağılımı üretir; serbest koordinat veya nested grid yoktur.
- Preview ile published render’ın aynı normalize edilmiş field-layout renderer’ını kullanması; builder-only metadata public çıktıya sızmamalı.

**Hazır şablon sistemi:**

- Şablon, static HTML değil versioned block tree + varsayılan theme tokens + örnek field config olarak saklanmalı.
- İlk şablonlar: etkinlik kayıt/RSVP, konferans başvurusu, iletişim, lead capture, müşteri memnuniyeti, iş başvurusu.
- “Şablondan oluştur” yeni form üretmeli; kaynak şablonu sonradan değiştiğinde mevcut form sessizce değişmemeli.
- Kullanıcı kendi şablonunu kaydedebilmeli; paylaşım kapsamı workspace ile sınırlı olmalı.
- Şablonlarda required/validation, legal consent, success state ve responsive layout örneği bulunmalı.

**Release engeli:** Drag/drop, mobile collapse, bounded layout ve aynı field-layout sözleşmesinin public/embed render’ı kanıtlanmadan builder “tam işlevsel” kabul edilmez. Nested container tree bu kapının parçası değildir.

### P0-10 — Publish sonrası public/private güvenlik sınırı

Bu ürünün temel kuralı:

> Uygulama içindeki form builder ve yönetim ekranları authenticated/private’dır. Publish edilen form public olabilir; public kişi yalnızca izin verilen form görünümünü alır ve submission gönderir. Uygulamanın kritik bilgilerine, yönetim API’larına veya başka kullanıcı verilerine erişemez.

**Public GET’in döndürebileceği alanlar allowlist ile sınırlı olmalı:**

- Form başlığı, açıklaması ve yayınlanmış kullanıcıya gösterilecek metinler
- Field render schema: public field ID, label, type, options, placeholder, required ve kullanıcıya gösterilecek validation kuralları
- Public layout/style tokens: renk, font adı/token’ı, spacing, grid, cover image ve public success state
- Locale ve public consent/legal metni
- Submission için gereken opaque public form identifier veya slug

**Public GET/POST’un asla döndürmemesi veya kabul etmemesi gereken alanlar:**

- Admin/session/refresh/Bearer token, cookie değeri veya kullanıcı kimlik bilgisi
- Workspace ID’si, owner/member/user ID’si, internal database ID’si ve audit log bilgisi
- Draft schema, unpublished fields, internal notes, notification/integration config
- SMTP/API/payment credentials, webhook secrets, provider connection state
- Prisma modelinin ham JSON’u, stack trace, SQL/DB yolu ve uygulama konfigürasyonu
- Dashboard route’ları, admin mutation endpoint’leri veya submission liste/detail sorguları

**Önerilen sınır:**

```text
Authenticated app
  -> private admin API + draft editor + workspace data
  -> explicit Publish
  -> sanitized immutable PublicFormSnapshot
       -> public GET render
       -> public POST submit
       -> opaque success/receipt only
```

Publish sırasında server-side serializer yalnız public snapshot üretmeli; client’ın gönderdiği “public” işaretine güvenilmemeli. Her publish işleminde forbidden-key scan, schema validation ve snapshot diff yapılmalı.

**Export yöntemleri için aynı kural:** Direct link, iframe, inline loader, WordPress block/shortcode, popup veya başka siteye verilen HTML/JS kodu aynı public snapshot ve public submission API’sini kullanmalı. Export kodu yalnız public slug/config taşımalı; admin token veya private URL parametresi taşıyamaz.

**Public saldırı yüzeyi:** Public endpoint’ler authentication gerektirmese de rate limit, body/field limit, validation, anti-spam, origin/CORS politikası, XSS/custom CSS sanitization ve abuse logging uygulanmalı. Public submission başarılı olduğunda response yalnızca gereken success state veya opaque receipt dönmeli; submission verisi browser’a geri echo edilmemeli.

**Release engeli:** Public route response inspection, forbidden-field regression testleri ve cross-tenant/public-to-admin negatif testleri geçmeden hiçbir export modu production’da açılmaz.

## 5. Aşamalı geliştirme planı

Takvim gün sayısı yerine teslim kapıları kullanılmıştır. Ekip kapasitesi ve cloud seçimi kesinleşince her faza tarih atanmalıdır.

### Faz 0 — Release sözleşmesi ve karar kilidi

**Amaç:** Neyi release edeceğimizi ve neyi etmeyeceğimizi kesinleştirmek.

**İşler:**

- Hedef kullanıcı, workspace modeli, rol matrisi, veri sınıfları ve tenant sınırlarını yaz.
- P0/P1 kapsamını Product Requirements ve Acceptance Criteria ile onayla.
- Cloud sağlayıcısı, domain, TLS, kalıcı disk, backup hedefi ve deploy yöntemi için karar kaydı oluştur.
- “Pilot” ve “Public SaaS” release profillerini ayır.
- Demo-only özellikleri listele; release’te kapatılacakları belirle.

**Çıktılar:** `RELEASE-SCOPE.md`, `SECURITY-MODEL.md`, `DECISIONS.md`, sahipleri ve risk kayıtları.

**Kapı:** Bilinmeyen ürün kararları kritik teknik varsayım olarak işaretlenmiş olmalı; release kapsamı tek cümleyle anlatılabilmeli.

### Faz 1 — Auth, authorization ve tenant güvenliği

**Amaç:** Her kullanıcı yalnızca yetkili olduğu workspace ve kaynağa erişebilsin.

**İşler:**

- Merkezi auth context ve capability middleware/policy yaz.
- Form, field, logic, notification, appearance, branding, submission, member, settings ve integration route’larını policy üzerinden geçir.
- Submission PATCH/DELETE sorgularını form scope ile atomik bağla.
- Preview endpoint’inde `preview=true` için public draft erişimini kaldır; owner/admin veya imzalı, süreli preview token zorunlu yap.
- Workspace branding için public domain/workspace çözümlemesi tasarla; public GET içinde write-on-read davranışını kaldır.
- Üye daveti, rol değiştirme, üyelikten çıkarma ve pasif üyelik akışlarını gerçek API ile bağla.

**Çıktılar:** Authorization policy, audit events, negatif erişim testleri, gerçek user-management akışı.

**Kapı:** Her protected mutation için cross-tenant ve wrong-role testleri geçmeden sonraki faza geçilmez.

### Faz 2 — Veri modeli, migration ve dayanıklılık

**Amaç:** Şema değişiklikleri güvenli, izlenebilir ve geri alınabilir olsun.

**İşler:**

- Mevcut şemadan kontrollü initial migration/baseline üret.
- Unique/index/foreign key/cascade kurallarını iş kurallarıyla karşılaştır.
- Submission ve sayaç işlemlerini transaction içine al.
- Idempotency ve webhook event tabloları için unique constraint ekle.
- Backup, restore ve retention script/runbook oluştur.
- SQLite pilotu veya PostgreSQL/MySQL geçişi için karar ver.

**Çıktılar:** `prisma/migrations/`, migration CI job, backup/restore kanıtı, DB seçimi ADR’i.

**Kapı:** Temiz veritabanı kurulumu, mevcut fixture/data restore, upgrade ve rollback provası başarılı olmalı.

### Faz 3 — Çekirdek ürünün gerçek işlevselliği

**Amaç:** Form oluşturma → yayınlama → public doldurma → submission inceleme zincirini gerçek ve tutarlı yapmak.

**İşler:**

- Form builder’da alan ekleme, düzenleme, sıralama, silme ve autosave işlemlerini gerçek API’ye bağla.
- Drag/drop desteklenmiyorsa UI’da destekleniyor gibi göstermeden netleştir; desteklenecekse keyboard ve mobile alternatifini de yap.
- Alan tipi, required, default, option, validation ve conditional logic sözleşmesini tek bir shared schema ile kullan.
- Form versioning, draft/published ayrımı ve publish conflict davranışını belirle.
- Public form renderer’da erişilebilir label, error summary, inline validation, keyboard flow ve `alert()` yerine görünür status region kullan.
- Response limit, availability window ve duplicate submission iş kurallarını server/client birlikte uygula.
- Submission list/detail’de pagination, filter, search, export kapsamını netleştir.

**Çıktılar:** E2E happy path, validation matrix, version/publish runbook.

**Kapı:** Yeni workspace ile form oluşturma, yayınlama, farklı tarayıcıda public doldurma ve yetkili submission review akışı testte baştan sona geçmeli.

### Faz 3A — Public form delivery ve embed platformu

**Amaç:** Bir formu MavenForms içinde canlı açmak, URL ile paylaşmak ve başka sitelerde görünüm/işlev bozulmadan çalıştırmak.

**İşler:**

- Public form route’unu ve published-version resolver’ını oluştur.
- Direct-link sayfası için loading, unavailable, closed, success, error ve accessibility durumlarını tanımla.
- Embed API sözleşmesini version’la: `formId/publicSlug`, `mode`, `theme`, `locale`, `height`, `minHeight`, `maxWidth`, `redirect`, `allowedOrigin` gibi güvenli ve sınırlı parametreler.
- Dashboard’da paylaşım paneli oluştur: direct link, iframe, inline script, WordPress block/shortcode ve kopyalama doğrulaması.
- Iframe için responsive wrapper, `title`, `loading="lazy"`, `referrerpolicy`, minimum permissions ve auto-height handshake uygula.
- Parent/iframe mesaj protokolünü version’la: `ready`, `resize`, `submitted`, `closed`, `error`; alıcıda `origin` ve `source` doğrula; `targetOrigin` olarak `*` kullanma.
- Inline loader/custom element’i idempotent, lazy ve Shadow DOM/CSS scope ile çalıştır.
- Embed edilen formda admin token, cookie ve özel dashboard route’larının kullanılmadığını doğrula.
- Embed allowlist ve `frame-ancestors` ayarını form/workspace yönetimine bağla; ayar yoksa güvenli varsayılan uygula.
- Public asset/cache stratejisi kur; published snapshot değişince cache invalidation ve rollback davranışını test et.
- Embed contract testlerini temiz HTML, React/Next, WordPress ve agresif host CSS fixture’larıyla çalıştır.

**Çıktılar:** Embed SDK/loader, iframe snippet, public URL, versioned event contract, allowlist ayarı ve entegrasyon dokümantasyonu.

**Kapı:** Aynı yayınlanmış form direct link, iframe ve inline modda doldurulup aynı submission sözleşmesiyle dashboard’a düşmeli; test host CSS’i formu veya form CSS’i hostu bozamamalı.

### Faz 3B — Form kartı ve kullanım odaklı dashboard UX

**Amaç:** Formların listede hızlı ayırt edilmesi ve sık kullanılan ayarlara tutarlı erişim.

**Form kartı zorunlu tasarımı:**

- Her form kartının üst bölümünde sabit **16:9** cover image alanı.
- Resim yükleme/seçme, değiştir/kaldır, alt text, focal point ve fallback placeholder.
- Görsel `object-fit: cover` ile kartı bozmayacak; özgün oran farklı olsa da kart yüksekliği değişmeyecek.
- Lazy loading, ölçülendirilmiş image box ve placeholder ile layout shift azaltılacak.
- Etkinlik, kayıt, başvuru gibi form türleri için görselin amacı ve erişilebilir alt text’i desteklenecek.

**Ayar erişimi:**

- Kartın sağ üstündeki `…` menüsü: Aç, Preview, Publish, Share, Embed, Duplicate, Archive/Delete.
- Kartın sağ altındaki görünür **Ayarlar** aksiyonu: form settings ekranına doğrudan gider.
- Aynı aksiyon iki kez farklı isimle çoğaltılmayacak; `…` hızlı eylemler, sağ alt `Ayarlar` ise kalıcı ayar kısayolu olacak.
- Menü keyboard ile açılıp kapanmalı, focus geri dönmeli, mobilde dokunma hedefi yeterli olmalı.
- Delete/archive destructive action’ları açık onay, yetki kontrolü ve audit event gerektirmeli.

**Çıktılar:** Gerçek form metadata/image alanları, card component contract’ı, responsive dashboard card, accessible menu/settings flow.

**Kapı:** Kartta görsel/yok durumu, uzun başlık, küçük ekran, keyboard navigation ve rol bazlı menü görünürlüğü testleri geçmeli.

### Faz 3C — Drag/drop ve kontrollü Grid/Bento builder

**Amaç:** Form oluşturmayı gerçek bir görsel düzenleme deneyimine dönüştürmek; aynı düz field-layout modelini preview ve public render’da kayıpsız kullanmak.

**İş sırası:**

1. Field registry ve versioned field-layout/decoration sözleşmesini koru.
2. Pointer/touch drag sensors, drop collision/insertion calculation ve keyboard move commands ekle.
3. Canvas selection, properties panel, undo/redo ve autosave akışını tamamla.
4. Bounded Grid/Bento span, responsive overrides, mobile collapse ve overflow guard’larını ekle.
5. Template catalog ve template cloning/version isolation akışını ekle.
6. Preview/public/embed renderer’larının aynı normalize edilmiş field-layout sözleşmesini tükettiğini contract test ile kanıtla.

**Kapı:** Builder’da yapılan bir form düzeni kaydedilip sayfa yenilendikten sonra aynı kalmalı; desktop’taki bounded layout mobile’da kırılmamalı; builder preview ile published/embed çıktısı arasında field order, validation, theme ve submit davranışı farkı olmamalı.

### Faz 4 — Gerçek entegrasyonlar ve asenkron işler

**Amaç:** E-posta, dosya, webhook ve ödeme davranışlarını güvenilir hale getirmek veya kapsamdan çıkarmak.

**İşler:**

- SMTP provider adapter’ı, secret storage, connection test, timeout ve retry politikası.
- Notification/outbox tablosu ve worker: queued → sending → sent/failed/retry state machine.
- Retry için exponential backoff, max attempts, idempotency ve dead-letter görünümü.
- Dosya upload için boyut/tip sınırı, object storage, private URL/signed URL, malware scan ve retention.
- Webhook inbound için signature verification, replay protection, raw event redaction ve idempotent processing.
- Ödeme release kapsamındaysa provider SDK/API, test mode, verified webhook ve refund/cancel davranışı.
- Entegrasyon yoksa UI’daki durumları gerçek dışı “connected” göstermek yerine disabled/coming soon yap.

**Çıktılar:** Adapter contract’ları, integration test fixtures, retry dashboard, secret policy.

**Kapı:** Gerçek credential olmadan güvenli mock contract testleri; staging credential ile bir uçtan uca smoke; failure/retry/replay testleri.

### Faz 5 — Cloud runtime ve operasyon

**Amaç:** Temiz bir ortamda tekrarlanabilir build, güvenilir başlangıç ve gözlemlenebilir servis.

**İşler:**

- Runtime sürümlerini pinle: Bun/Node, Prisma, Caddy, OS/container image.
- Build artifact’i temiz ortamda oluştur; source tree’ye bağlı olmayan paket üret.
- Environment schema/validation ekle: required, format, secret/non-secret sınıfları.
- `/api/health` liveness ve DB kontrollü `/api/ready` endpoint’i ekle; secret/error leak etme.
- Reverse proxy’de Host, X-Forwarded-Proto/For, timeout, body size ve health check ayarlarını hedefe göre doğrula.
- Startup’ta HTTP readiness bekle; child process crash’ini ve shutdown sinyallerini yönet.
- Structured logs, request ID, error tracking, metrics, uptime alert ve deploy marker ekle.
- Backup success/failure, disk doluluğu, DB lock ve worker backlog alarmı ekle.

**Çıktılar:** Cloud deploy runbook, health/readiness kanıtı, log/alert dashboard, rollback prosedürü.

**Kapı:** Aynı artifact staging’e deploy edilir, smoke test geçer, rollback uygulanır ve servis beklenen sürede yeniden hazır olur.

### Faz 6 — QA, güvenlik ve performans kapısı

**Amaç:** Kritik davranışları release öncesi tekrar üretilebilir biçimde ölçmek.

**İşler:**

- Unit/integration/E2E test piramidini kur.
- Auth, role, cross-tenant, IDOR, CSRF, XSS, file, webhook replay ve rate-limit testleri.
- Public form için desktop/mobile keyboard ve screen-reader temel kontrolleri.
- Yük testi: login, form read, public submit, submission list; SQLite lock davranışını ayrıca ölç.
- Baseline ve hedefleri kaydet: error rate, p95 latency, startup time, DB lock, failed jobs.
- Dependency/license/audit taraması ve secret scan.
- TypeScript build errors ignore ayarını kaldır; lint, typecheck, test ve build CI’da zorunlu yap.

**Çıktılar:** Release QA report, security findings register, performance baseline.

**Kapı:** Açık P0 yok; P1’ler için owner ve kabul tarihi var; kritik E2E senaryoları yeşil.

### Faz 7 — Staged release ve pilot

**Amaç:** Kontrollü kullanıcı grubuna düşük riskle açılmak.

**İşler:**

- Staging’de production-like env ve sanitized data kullan.
- Canary workspace veya allowlist ile açılış yap.
- Deploy sonrası smoke: login, workspace, form CRUD, publish, public submit, submission review, logout.
- İlk saatler için log/metric/backup alarm nöbeti tanımla.
- Kullanıcı geri bildirimlerini bug, UX, feature request olarak ayır.
- Rollback karar eşiğini önceden yaz: auth failure, data corruption, sustained 5xx, payment/webhook mismatch, backup failure.

**Çıktılar:** Signed release checklist, pilot report, known limitations, rollback evidence.

**Kapı:** Pilot süresi ve başarı metrikleri ürün sahibi tarafından onaylanır; bundan sonra public release kararı verilir.

İlk SaaS pilotunda otomatik abonelik tahsilatı yerine `BILL-00..BILL-06` manuel kontrol paketleri kullanılabilir. Bu paketler tenant müşteri ödemelerini değiştirmez; yalnızca MavenForms aboneliğinin hizmet erişim durumunu yönetir.

### Faz 8 — Form ürünü olgunlaştırma ve UI/UX release kapısı

**Amaç:** Ödeme–fatura–gerekli teslimat zinciri pilotta kanıtlandıktan sonra, form ürününün tamamını üretim kalitesine getirmek. Bu faz yeni bir ödeme veya fatura önceliği değildir; pilotta bulunan ve kullanıcıların form oluşturma, düzenleme, yayınlama, yanıtlama ve yönetme deneyimini etkileyen eksikleri tek bir ürün olgunlaştırma kapısında toplar.

**Kapsam:**

- Form builder’ın gerçek sürükle-bırak davranışı, klavye erişimi, yeniden sıralama, undo/redo ve kaydetme çatışması.
- Kontrollü Grid/Bento düzeni, kolon kırılmaları, mobil davranış ve şablonların aynı public snapshot sözleşmesini kullanması. Nested container kapsam dışıdır.
- Form kartlarında 16:9 medya alanı, kart aksiyonları, istatistik/yanıt erişimi ve ayar menülerinin tekil ve tutarlı bilgi mimarisi.
- Bir forma girildiğinde yayınlanmış çalışan form önizlemesi, istatistikler ve yanıt arama/filtreleme akışının birlikte ve responsive gösterilmesi.
- Form, görünüm, tema, header/footer, ödeme, bildirim, entegrasyon, WordPress ve rapor ayarlarının kapsamlarının ayrıştırılması; aynı ayarın iki farklı yerde gösterilmemesi.
- Medya kütüphanesi ve upload UX’inin workspace/form kapsamı, izinleri, dosya türü–boyut kontrolü, alt metin ve önizleme akışıyla tutarlı hale getirilmesi.
- Ortak typography, spacing, button, hover/focus/active/disabled/loading/error token’ları; overlay, z-index, sticky ve küçük ekran taşmalarının düzeltilmesi.
- Direct, iframe, inline ve WordPress çıktılarının responsive, CSS/DOM izole ve kritik uygulama bilgilerini sızdırmayan gerçek host-container testleri.
- Form davranışları: validation, conditional logic, pagination, file upload, success/error state, draft/published version ayrımı ve refresh/retry idempotency.

**Küçük kapılar:**

1. `FORM-UX-00`: mevcut form ekranları, routes, schema ve UI-only alanların envanteri; test edilemeyen her özellik işaretlenir.
2. `FORM-UX-01`: ortak design token ve button/action sözleşmesi; görsel regresyon baseline’ı alınır.
3. `FORM-UX-02`: kart ve form detay bilgi mimarisi; istatistik–yanıt–ayar çakışmaları kaldırılır.
4. `FORM-UX-03`: medya seçme/upload, form-scope erişim ve alt metin akışı.
5. `FORM-UX-04`: builder drag/drop ve temel reorder sözleşmesi.
6. `FORM-UX-05`: container/Bento/template veri sözleşmesi ve renderer uyumu.
7. `FORM-UX-06`: yayınlanmış form, istatistik ve yanıtların birlikte görünmesi.
8. `FORM-UX-07`: responsive desktop/tablet/mobile ve host-container embed testleri.
9. `FORM-UX-08`: tüm form ayarları ve entegrasyon ekranlarında işlevsel uçtan uca test.
10. `FORM-UX-09`: accessibility, visual regression, build ve release regression kapısı.

**Kapı:** Her görünür kontrol gerçek bir state/API/DB davranışına bağlı olmalı; UI-only veya sahte başarı kalmamalı; public snapshot ve secret sınırları korunmalı; kritik desktop/mobile/embed senaryoları yeşil olmalı. Bu kapı geçmeden SaaS tenant onboarding’i ve self-service abonelik UI’ı açılmaz.

**Sıralama kararı:** Pilot sonrası bu faz, SaaS’tan önce gelir. Ancak ödeme veya pilotun çalışması için zorunlu tekil bir UX düzeltmesi bekletilmez; ilgili `PAY`, `INV/F`, `INT` veya `DELIVERY` mikro-fazının içinde uygulanır ve Faz 8’de tekrar kapsamlı biçimde doğrulanır.

### 2.6 SaaS fikrinin ana plana etkisi

SaaS aboneliği ve manuel abonelik kontrolü yeni bir fikir olarak kaydedilmiştir; mevcut ana geliştirme önceliklerini ve faz sırasını değiştirmez. Bu fikir yalnızca ilerideki tasarımın bugünkü ödeme, fatura, entegrasyon ve teslimat domain’lerini bozmayacağı şekilde modellenir.

**Değişmez master sıra kuralı:** Bu sıra, konuşma sırasında gelen yeni fikirler, UI talepleri, provider önerileri, SaaS talepleri veya ara işler nedeniyle değiştirilemez. Sıra ancak ayrı bir ürün sahibi kararıyla ve tüm bağımlılık, güvenlik, veri ve release etkileri yeniden yazılıp onaylanırsa değişebilir. Normal fikir mesajları bu kural için değişiklik talebi sayılmaz.

Korunan ana sıra:

1. `F/D`: form, publish, public payload ve tenant güvenliği.
2. `PAY`: ödeme iş modeli, tutar, `PaymentOrder`, provider bağlantısı, authoritative webhook, reconciliation ve iade durumları.
3. `INV/F`: `InvoiceRecord`, alıcı/vergi snapshot’ı, Paraşüt API v4 ve API’siz Excel/belge akışı.
4. `INT`: provider/muhasebe bağlantıları, token rotation, rate limit, hata ve audit akışları.
5. Yalnızca ihtiyaç duyulan `DELIVERY/MAIL`: makbuz, fatura, sistem bildirimi, outbox ve teslimat kanıtı.
6. `FORM-UX`: pilot sonrası form ürünü, UI/UX, responsive, builder, medya ve davranış olgunlaştırması.
7. `SAAS/BILL`: en son tenant onboarding, BYO provider ve MavenForms abonelik kontrolü.

Kısa referans sırası: `PAY → INV/F manuel → Paraşüt API v4 → document security/document-ready → gerekli transactional DELIVERY/MAIL → pilot → FORM-UX → SAAS/BILL`.

SaaS tenant bağlantısı ve MavenForms abonelik kontrolü, ana ödeme/fatura/teslimat zincirinden sonra ve `FORM-UX` kapısı geçtikten sonra gelir. Yalnızca mevcut domain sözleşmelerinde platform scope ile workspace scope ayrımının korunmasını gerektirir. `BILL-00` geleceğe dönük saf state sözleşmesidir; `BILL-01..BILL-06` veya `SAAS-00..SAAS-07` ana fazların ya da `FORM-UX` kapısının önüne alınamaz.

## 6. Kabul kriterleri

| ID | Kabul kriteri | Kanıt |
|---|---|---|
| AC-001 | Temiz kurulumda tek komutla dependency, Prisma client, migration ve build tamamlanır | CI log + artifact checksum |
| AC-002 | Production build TypeScript hatalarını yok saymadan başarılı olur | `typecheck` ve build sonucu |
| AC-003 | Yeni kullanıcı login olur; yanlış parola güvenli ve tutarlı hata verir; brute-force rate limit çalışır | Auth integration test |
| AC-004 | Workspace dışı form, field, submission, branding ve member ID’leri okunamaz/değiştirilemez/silinemez | Cross-tenant negative tests |
| AC-005 | Viewer/reviewer/analyst/form_manager/admin/owner capability matrisi API’da zorlanır | Role matrix test report |
| AC-006 | Submission PATCH/DELETE yalnızca URL’deki formun submission’ını etkiler | IDOR regression test |
| AC-007 | Submission values ve sayaç tek transaction’da tutarlı kalır | Failure injection + DB assertions |
| AC-008 | Aynı idempotency key eşzamanlı tekrarda tek submission üretir | Concurrency test |
| AC-009 | Public draft preview yalnızca yetkili veya imzalı preview akışıyla açılır | Preview access test |
| AC-010 | Form validation server tarafında required/type/limit/date/logic kurallarını uygular | Validation matrix |
| AC-011 | Migration production’da `migrate deploy` ile uygulanır; `db:push --accept-data-loss` release yolunda yoktur | Build/deploy grep + migration log |
| AC-012 | Backup alınır, restore edilir ve restore edilen DB ile uygulama açılır | Restore drill record |
| AC-013 | Health liveness ve DB readiness ayrıdır; DB kapalıyken readiness başarısız olur | Smoke test |
| AC-014 | App crash/child process failure kullanıcıya başarı gibi raporlanmaz ve servis alert üretir | Fault injection + alert |
| AC-015 | Gerçek olmayan provider/payment/SMTP durumu bağlı gibi gösterilmez | UI/API contract test |
| AC-016 | E-posta/webhook işleri retry ve idempotency ile güvenli işlenir | Worker integration test |
| AC-017 | Token JavaScript erişimli kalacaksa risk kabulü ve CSP/XSS kontrolleri yazılıdır; tercihen HttpOnly cookie kullanılır | Security review |
| AC-018 | Kritik public form akışı keyboard, mobil viewport ve temel erişilebilirlik kontrolünden geçer | Browser QA evidence |
| AC-019 | p95/error-rate/startup/DB-lock hedefleri staging yük testinde ölçülür | Performance report |
| AC-020 | Deploy, rollback, incident, backup restore ve secret rotation runbook’ları başka bir ajan tarafından uygulanabilir | Dry-run sign-off |

### Public form, embed ve builder kabul kriterleri

| ID | Kabul kriteri | Kanıt |
|---|---|---|
| AC-021 | Published form, auth gerektirmeden stabil direct URL üzerinden açılır; draft aynı URL’den görünmez | Public route E2E + preview denial test |
| AC-022 | Aynı published form iframe snippet ile dış HTTPS sayfada açılır ve form gönderimi dashboard’a ulaşır | Static host fixture + integration test |
| AC-023 | Inline custom element/loader ikinci kez başlatıldığında duplicate form, duplicate listener veya duplicate submission üretmez | Browser contract test |
| AC-024 | Iframe ve inline render, host sayfanın CSS reset/framework stillerinden etkilenmez; kendi stilleri host DOM’a sızmaz | Host CSS torture fixture + screenshot/manual review |
| AC-025 | Embed genişliği narrow mobile dahil 100% davranır; yatay overflow, kesilmiş label/error ve ikinci scrollbar oluşmaz | Playwright viewport matrix |
| AC-026 | Form yüksekliği değiştiğinde embed parent güvenli event ile yeni yüksekliği alır; event origin/source doğrulanır ve `*` target origin kullanılmaz | postMessage security test |
| AC-027 | Embed başarısızlığında loading/error/Retry görünür; JavaScript kapalı veya network yavaşken kullanıcı belirsiz boş alan görmez | Network throttling + manual UX review |
| AC-028 | Form sahibi izin verilen embed origin’lerini yönetir; allowlist dışı frame isteği reddedilir | CSP/frame-ancestors integration test |
| AC-029 | WordPress için Gutenberg block ve shortcode üretilir; gerekli script yalnız form kullanılan sayfada enqueue edilir | WordPress fixture/plugin test |
| AC-030 | WordPress shortcode attribute’ları sanitize edilir, çıktı escape edilir, shortcode yan etki üretmez | PHP/static analysis + security test |
| AC-031 | Form kartında cover image alanı tam 16:9 oranını korur; resim yoksa fallback; alt text/focal point saklanır | Component test + visual regression |
| AC-032 | Kart sağ üst `…` menüsü hızlı eylemleri, sağ alt `Ayarlar` kalıcı settings kısayolunu sunar; rolü olmayan destructive action’ı göremez | Role UI test + keyboard review |
| AC-033 | Builder sol panelden canvas’a, canvas içi container’lar arasında pointer/touch ile blok sürüklenip bırakılabilir | Browser drag/drop E2E |
| AC-034 | Builder aynı taşıma işlemlerini keyboard ile gerçekleştirebilir ve focus kaybolmaz | Keyboard E2E + accessibility review |
| AC-035 | Container sistemi nested tree, grid span, gap, padding, breakpoint ve mobile collapse değerlerini kaydeder ve tekrar üretir | Schema round-trip test |
| AC-036 | Bento layout, eşit olmayan column/row span’lerini desktop/tablet/mobile’de taşma olmadan render eder | Visual regression + responsive matrix |
| AC-037 | Hazır şablon yeni versioned block tree üretir; şablon sonradan güncellendiğinde oluşturulmuş form kendiliğinden değişmez | Template isolation integration test |
| AC-038 | Builder preview, app live form, direct URL, iframe ve inline mod aynı published render schema’sını kullanır | Cross-render snapshot/contract test |
| AC-039 | Draft kaydedilirken public published snapshot değişmez; Publish sonrası cache invalidation ile yeni sürüm görünür | Versioning integration test |
| AC-040 | Embed URL’lerinde admin token, private cookie, secret ve internal model alanı bulunmaz | Response inspection + secret scan |
| AC-041 | Form card image upload type/size/alt/fallback kontrollerini uygular; geçersiz asset kart layout’unu bozamaz | Upload validation test |
| AC-042 | WordPress, static HTML ve React/Next host örnekleri tek kopyala-yapıştır dokümanıyla çalışır | Three-host smoke report |
| AC-043 | Publish işlemi draft’tan yalnız public allowlist alanlarını içeren immutable snapshot üretir | Snapshot serializer unit/integration test |
| AC-044 | Public GET response’unda token, cookie, workspace/member/user ID, internal DB ID, draft, secret, audit ve stack trace bulunmaz | Forbidden-field response scan |
| AC-045 | Public POST yalnız yayınlanmış formun public slug/opaque ID’si ve geçerli field payload’ını kabul eder; admin/private route’a yönlenemez | Route contract + negative test |
| AC-046 | Public submission response yalnız başarı/hata durumu veya opaque receipt döndürür; gönderilen kişisel veriyi geri echo etmez | Response body assertion |
| AC-047 | Direct link, iframe, inline ve WordPress export aynı sanitized published snapshot’ı kullanır | Cross-mode snapshot equality test |
| AC-048 | Public form browser storage/cookie içinde admin/session/refresh token oluşturmaz ve authenticated dashboard API’sini çağırmaz | Browser network/storage inspection |
| AC-049 | Draft save, publish, unpublish/close ve version rollback public URL’de yalnız beklenen snapshot’ı görünür kılar | Version lifecycle E2E |
| AC-050 | Public endpoint’ler auth’suz olsa bile rate limit, payload limit, field validation ve anti-spam kurallarını uygular | Abuse/validation integration test |
| AC-051 | Inline CORS yalnız public route ve izin verilen origin’ler için çalışır; credentials ve private API erişimi açılmaz | CORS matrix test |
| AC-052 | Custom HTML/CSS/metin içeriği sanitization sonrası render edilir; arbitrary script, event handler ve CSS escape kabul edilmez | XSS/CSS injection regression test |
| AC-053 | Public formun CSP/frame policy’si izin verilen embed host’larını kapsar; allowlist dışı host frame edemez | Browser headers + frame test |
| AC-054 | Public route, public asset, submission ve embed event loglarında secret/token/ham hassas veri tutulmaz | Log redaction test |

## 7. Önerilen teknik mimari kararlar

### 7.1 Database

**Pilot seçeneği:** Tek instance, düşük yazma eşzamanlılığı, kalıcı disk, düzenli backup ve restore alarmı ile SQLite kullanılabilir. Bu bir ölçekleme çözümü değil, kontrollü pilot varsayımıdır.

**SaaS seçeneği:** Birden fazla instance, yüksek submission yazma trafiği, çok sayıda tenant veya daha güçlü operasyonel beklenti varsa PostgreSQL/MySQL sınıfı server database’e geçişi release öncesi öne al. SQLite tek writer kısıtı ve network/high-concurrency sınırları nedeniyle bu senaryoda risklidir.

### 7.2 Request authorization sırası

Her protected handler aşağıdaki sabit akışı izlemeli:

```text
request
  -> request id / size / rate limit
  -> session authentication
  -> workspace membership
  -> capability authorization
  -> resource query with tenant predicate
  -> input/schema validation
  -> transaction or idempotent write
  -> audit event / structured result
```

Bu katmanlardan birinin route içinde unutulması code review’da P0 bulgusu olmalı.

### 7.3 Session

Tercih edilen hedef, frontend’in token okuyamadığı HttpOnly Secure cookie + CSRF savunmasıdır. Mevcut Bearer/localStorage yaklaşımı geçici olarak korunacaksa bu açık bir risk kabulü olmalı; kısa expiry, rotation, CSP, XSS sanitization, dependency audit ve logout/revoke testleri olmadan public release’e taşınmamalıdır.

### 7.4 Async delivery

Bildirim, e-posta ve webhook gönderimini request içinde doğrudan dış provider’a bağlamak yerine outbox/worker modeli kullan. Submission transaction’ı önce kesinleşsin; dış gönderim daha sonra retry edilsin. Aynı event’in iki kez işlenmesi iş sonucu değiştirmemeli.

### 7.5 Public/private sınırı

Public endpoint yalnızca formun yayınlanmış ve public olması gereken alanlarını döndürmeli. Draft, internal notes, provider secret, workspace bilgisi, audit detayları ve gereksiz model alanları response’a taşınmamalı. Public branding için URL/host → workspace çözümlemesi açık ve test edilebilir olmalı.

### 7.6 Published form ve embed contract

Tek bir canonical render pipeline kullan:

```text
Flat form-field draft
  -> schema validation
  -> published immutable snapshot
  -> public renderer
       ├─ direct URL
       ├─ iframe endpoint
       └─ inline custom element loader
```

Her public form için en az şu kimlik/versiyon alanları tasarlanmalı:

- `publicSlug` veya public ID: tahmin edilmesi zor, URL-safe ve workspace içinde benzersiz.
- `publishedVersionId`: draft’tan bağımsız aktif snapshot.
- `embedSchemaVersion`: loader/renderer geriye dönük uyumluluğu için.
- `status`: draft, published, paused, closed, archived.
- `allowedEmbedOrigins`: boşsa güvenli varsayılan; wildcard ancak bilinçli ürün kararıyla.
- `coverImage`, `coverImageAlt`, `coverImageFocalPoint`.

Embed kodu yalnız public identifier ve güvenli görünüm parametreleri içermeli. Admin session, Bearer token, workspace secret veya internal database ID’si embed snippet’e konulmamalı.

### 7.7 Iframe ve inline uygulama politikası

**Iframe:** İlk release’in önerilen ve varsayılan embed türü. Farklı origin’de çalışır, host CSS’inden doğal olarak ayrılır ve hosted formu başka sitelere taşımayı kolaylaştırır. `title`, `loading`, `referrerpolicy`, minimum `allow` ve gerekiyorsa sınırlı `sandbox` değerleri üretici tarafından kontrol edilmeli.

**Auto-height:** Child form, `ResizeObserver` ile yükseklik değişimini izleyip versioned mesaj gönderir. Parent yalnız beklenen `origin`, beklenen `source` ve beklenen mesaj şemasını kabul eder. Parent JavaScript yoksa fallback height ve iç scroll davranışı belgelenir.

**Inline custom element:** Host DOM’a `mavenforms-form` gibi tek bir element bırakır; loader formu Shadow DOM veya sıkı CSS namespace ile render eder. Global CSS selector, global font veya global event kullanmaz. Bu mod iframe kadar güçlü izolasyon sunmadığı için agresif host CSS/JS fixture’larında ayrıca doğrulanır.

**Popup/modal:** İlk release’te optional. Açılış butonu, focus trap, ESC ile kapanma, scroll lock, mobile full-screen ve submit sonrası focus restoration tamamlanmadan etkinleştirilmez.

### 7.8 WordPress entegrasyon yüzeyi

WordPress için üç katmanlı teslim planı:

1. **Gutenberg block:** Kullanıcı block ekler, form seçer, görünüm/width/theme seçeneklerini ayarlar; frontend’de canonical iframe veya inline loader render edilir.
2. **Shortcode:** `[mavenforms_form id="public-slug" mode="iframe"]` benzeri kısa API; attribute’lar whitelist + sanitize, çıktı escape edilir.
3. **Plugin package:** Admin’de MavenForms base URL/API key yerine güvenli public form seçimi, block registration, shortcode, frontend script enqueue ve connection/help ekranları.

Plugin yalnız form kullanılan sayfada script yüklemeli; her sayfaya global bundle eklememeli. Public form verisini WordPress veritabanına kopyalamak yerine varsayılan olarak MavenForms hosted endpoint’inden almalı; cache/consent/privacy davranışı ayrıca belgelenmeli. Plugin, admin token’ını public HTML’ye koymamalı.

**WordPress release kapsamı:** İlk teslim sırası Gutenberg block + shortcode + dokümante iframe, ardından aynı Release Candidate içinde inline loader. Inline loader ikinci teknik alt adım olabilir ancak public release kapsamından ertelenmemeli. Plugin sürümleme, WordPress minimum sürümü, PHP minimum sürümü, uninstall davranışı ve backward compatibility testleri release checklist’ine eklenmeli.

### 7.9 Form card image ve settings contract

`Form` veya ilişkili appearance metadata’da cover image alanı aşağıdaki davranışı desteklemeli:

```text
coverImageUrl       required only when an image is chosen
coverImageAlt       required for meaningful image
coverImageFocalX/Y  optional 0..1
coverImageFit       cover | contain (card default: cover)
```

Dashboard card CSS hedefi:

```css
.form-card__media {
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.form-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

`…` menüsü ile `Ayarlar` kısayolu aynı komutları çoğaltmamalı. Ekran okuyucu label’ları, focus ring, click-away, Escape, mobile bottom sheet ve destructive action confirmation testleri ortak component sözleşmesine alınmalı.

### 7.10 Container/Bento schema contract

Builder state’i yalnızca koordinat veya HTML string olarak saklanmamalı. Versioned JSON block tree önerisi:

```json
{
  "schemaVersion": 1,
  "root": {
    "type": "page",
    "children": [
      {
        "type": "container",
        "layout": { "kind": "grid", "columns": 12, "gap": "md" },
        "responsive": { "mobile": { "columns": 1 } },
        "children": []
      }
    ]
  }
}
```

Gerçek uygulamada schema validator şu invariant’ları enforce etmeli: root tek, child ID’leri unique, parent ilişkisi tutarlı, cycle yok, field block yalnız izin verilen container’da, style values whitelist’te, breakpoint override’ları sınırlı, maksimum nesting depth tanımlı. Bu schema builder, live preview, direct URL, iframe ve inline renderer tarafından ortak kullanılmalı.

### 7.11 Public payload ve export security contract

Public renderer için admin API response’unu yeniden kullanma. Ayrı DTO/serializer ve ayrı route ailesi kullan:

```text
/api/...                         private authenticated API
/api/public/forms/:slug          public published render DTO
/api/public/forms/:slug/submit   public write-only submission endpoint
/f/:slug                         public direct render
/embed/:slug                     iframe render shell
/embed/loader.js                 versioned inline loader
```

Route isimleri uygulama sözleşmesiyle kesinleştirilebilir; kritik kural public ve private serializer/handler’ın ayrılmasıdır. Public render DTO’su compile-time schema + runtime validation ile allowlist’ten üretilmeli.

**Public formun bilmesi gerekenler:**

- Hangi field’ın nasıl çizileceği
- Hangi kullanıcı girdisinin nasıl doğrulanacağı
- Hangi theme/layout token’larının kullanılacağı
- Submission’ın hangi public endpoint’e gönderileceği

**Public formun bilmemesi gerekenler:**

- Bu formun hangi workspace’e ait olduğu
- Formu kimin yönettiği
- Diğer submission’lar ve kullanıcılar
- Uygulamanın deployment, DB, provider veya auth ayrıntıları

Public browser’ın admin API’a erişmesini yalnız UI’dan gizlemek yeterli değildir. Network loglarında admin route çağrısı, private cookie, Authorization header, dashboard chunk’ı veya private response görülmemeli. Public route’lar mümkünse ayrı `forms.<domain>` origin’inde; aynı origin kullanılacaksa route/middleware/CSP sınırıyla çalıştırılmalı.

**Submission security:** Browser’dan gelen payload güvenilir değildir. Server field schema’yı published snapshot’tan tekrar yükleyip allowlist, type, required, size, date/logic, rate limit ve idempotency uygular. Server response kişisel veriyi yansıtmaz. Public user’a yalnız `submitted`, `closed`, `invalid`, `rate_limited` gibi sınırlı hata/başarı durumları verilir.

**Export security:**

- Snippet içine secret, admin token, signed private URL veya süresiz erişim anahtarı koyma.
- Inline loader `credentials: omit` veya eşdeğer credential’sız public akış kullanmalı; authenticated private API’a fallback yapmamalı.
- CORS yalnız public GET/POST endpoint’leri için ve tanımlı origin listesine göre açılmalı.
- Iframe embed’de `postMessage` event’leri yalnız form state/resize/success gibi düşük hassasiyetli verileri taşımalı; exact target origin ve sender validation uygulanmalı.
- Unpublish/close/disable sonrası direct link, iframe ve inline aynı public policy ile kapanmalı; cache/edge katmanında stale public snapshot süresi tanımlı olmalı.

Bu ayrımın amacı public formu “gizli admin ekranı” yapmak değil, publish edilmiş minimum veri sözleşmesiyle çalışan bir public write surface olarak tasarlamaktır.

## 8. Test stratejisi

### 8.1 Zorunlu test katmanları

- **Contract:** request/response status, schema ve error shape
- **Unit:** validation, capability policy, token/idempotency yardımcıları
- **Integration:** Prisma transaction, migration, auth, route authorization
- **E2E:** browser üzerinden login → form → publish → public submit → review
- **Security regression:** IDOR, cross-tenant, role bypass, CSRF, XSS, SSRF/file/webhook abuse
- **Operational:** clean build, startup, readiness, crash, backup, restore, rollback
- **Performance:** public read/submit, dashboard, submission list, DB lock ve p95

### 8.2 Minimum kritik E2E senaryosu

1. Workspace A owner yeni form oluşturur.
2. Form field’ları ekler, required/validation ayarlar ve publish eder.
3. Anonymous kullanıcı public formu doldurur.
4. Aynı idempotency key tekrar gönderilir; tek submission kalır.
5. Workspace A analyst submission’ı görür; viewer mutation yapamaz.
6. Workspace B kullanıcısı aynı ID’lerle veri okuyamaz/değiştiremez/silemez.
7. Yetkili kullanıcı submission durumunu günceller; audit event oluşur.
8. DB/provider hatası simüle edilir; partial write ve sahte başarı oluşmaz.
9. Logout sonrası eski session/token ile protected route reddedilir.
10. Backup restore sonrası form, field ve submission ilişkileri korunur.

### 8.3 Embed ve builder test matrisi

| Yüzey | Host/viewport | Zorunlu kontrol |
|---|---|---|
| Direct link | MavenForms app, desktop/mobile | published/draft, loading, success, error, close |
| Iframe | plain HTML, aggressive global CSS | width/height, CSS isolation, postMessage, retry |
| Iframe | WordPress block/shortcode | enqueue, cache, CSP, editor preview, frontend render |
| Inline | plain HTML + React/Next | custom element lifecycle, Shadow DOM, duplicate loader |
| Inline | mobile/narrow sidebar | container query, no overflow, focus order |
| Builder | desktop pointer/touch | add, move, nest, reorder, duplicate, undo/redo |
| Builder | keyboard-only | pick up/move/drop, focus restoration, announcements |
| Bento | 12/8/4 column equivalents | span, gap, row height, collapse, long content |
| Card | desktop/mobile | 16:9 image, fallback, alt text, `…`, Ayarlar |
| Versioning | draft/published/cache | publish boundary, old embed, rollback, no stale mixed schema |
| Public boundary | browser network/storage/response | no admin API, token, private cookie, internal IDs or sensitive fields |
| Export parity | direct/iframe/inline/WordPress | same public DTO, same validation, same submission result |

Embed test hostları uygulamanın kendi sayfası ile sınırlı tutulmamalı. Gerçekçi fixture’larda Tailwind reset, Bootstrap benzeri global selector’lar, yüksek `z-index`, dar sidebar, dark theme, `box-sizing` değişimi ve host CSP senaryoları bulunmalı.

## 9. Cloud release checklist

### Build öncesi

- [ ] Hedef cloud, domain, TLS, port ve persistent disk kararı kaydedildi.
- [ ] Production secret’ları yalnızca cloud secret/env mekanizmasında.
- [ ] `.env`, token, password, DB dosyası ve backup artifact’e yanlışlıkla girmiyor.
- [ ] `DATABASE_URL` hedef runtime’da doğrulanıyor; local `/home/z/...` yolu yok.
- [ ] Migration dosyaları mevcut ve review edildi.
- [ ] Backup alındı; restore sonucu kaydedildi.
- [ ] Temiz ortamda dependency install, Prisma generate, typecheck ve build başarılı.

### Deploy sırasında

- [ ] Migration job uygulama trafiğinden önce kontrollü çalışıyor.
- [ ] Migration başarısızsa eski/uyumsuz app trafiğe alınmıyor.
- [ ] Artifact checksum ve release commit’i kaydedildi.
- [ ] Startup readiness HTTP ile doğrulanıyor.
- [ ] Caddy/reverse proxy Host ve forwarded headers doğru geçiriyor.
- [ ] Loglarda secret, auth token, password, SMTP credential ve ham kişisel veri yok.

### Deploy sonrası

- [ ] `/api/health` liveness başarılı.
- [ ] `/api/ready` DB ile başarılı.
- [ ] Login ve logout smoke testi başarılı.
- [ ] Form create/update/publish smoke testi başarılı.
- [ ] Public submit + submission review smoke testi başarılı.
- [ ] Cross-tenant negatif smoke testi başarılı.
- [ ] Error tracking, uptime, backup ve disk/DB lock alarmları çalışıyor.
- [ ] Rollback komutu staging’de daha önce denenmiş durumda.

## 10. Önceliklendirilmiş iş listesi

### P0 — Release kapatır

- [ ] P0-01 merkezi authorization ve tenant isolation
- [ ] P0-02 submission IDOR, transaction, validation, idempotency ve abuse koruması
- [ ] P0-03 Prisma migration + backup/restore + rollback
- [ ] P0-04 temiz cloud build/start/readiness
- [ ] P0-05 session/token güvenliği, login rate limit ve reset kararı
- [ ] P0-06 sahte entegrasyon/operasyon durumlarını ayırma
- [ ] P0-PAY koşullu ödeme kapsamı: PaymentOrder, server-side amount, signed webhook, idempotency ve reconciliation
- [ ] P0-INV koşullu fatura kapsamı: ödeme→fatura adayı→muhasebe/Paraşüt→document_ready yaşam döngüsü
- [ ] P0-07 public URL, published version ve direct/iframe/inline delivery
- [ ] P0-08 responsive embed, CSS/DOM isolation ve secure resize protocol
- [ ] P0-09 zorunlu drag/drop, bounded Grid/Bento field layout ve template isolation (nested container iptal edildi)
- [ ] P0-10 publish sonrası public/private payload ve export security boundary
- [ ] Güncel kritik E2E ve security regression suite
- [ ] CI’da typecheck/lint/test/build zorunluluğu

### P1 — Release candidate için yüksek değer

- [ ] Gerçek user-management/invite/role UI ve API
- [ ] Form builder autosave, versioning, publish conflict ve daha fazla field type
- [ ] Çekirdek fazların gerektirdiği transactional delivery: outbox/worker/retry/suppression; bağımsız mailing özelliği değil
- [ ] Dosya storage, private access, size/type/scan/retention
- [ ] Public form erişilebilirlik ve mobil UX
- [ ] WordPress Gutenberg block, shortcode/plugin paketleme ve dokümantasyon
- [ ] Form card 16:9 image metadata/upload/fallback ve card action UX
- [ ] Hazır şablon kataloğu, workspace template save ve version isolation
- [ ] Embed SDK event/resize/error contract ve örnek host repository
- [ ] Submission pagination/filter/export
- [ ] Structured logging, request ID, metrics ve alerts
- [ ] Domain-based workspace/branding çözümlemesi
- [ ] SQLite → PostgreSQL/MySQL migration planı veya uygulanması

### P2 — Public release sonrası

- [ ] MFA enforcement ve gelişmiş admin güvenlik politikaları
- [ ] SSO/SAML/LDAP, gerçek ihtiyaç doğrulanırsa
- [ ] Gelişmiş raporlama, analytics ve data warehouse export
- [ ] Çok-region, horizontal scaling ve distributed cache
- [ ] Gelişmiş billing/plan/usage metering
- [ ] Plugin marketplace veya geniş provider kataloğu
- [ ] Marketing/campaign/list yönetimi ve Mailchimp Marketing ürünleştirmesi

## 11. Yapılmaması gerekenler

- Production’da `db:push --accept-data-loss` çalıştırma.
- “Tüm endpoint’ler 200 dönüyor” sonucunu authorization, validation veya gerçek entegrasyon kanıtı sayma.
- Static/demo provider durumlarını gerçek bağlantı gibi yayınlama.
- Cross-tenant test olmadan çok kiracılı SaaS release yapma.
- SQLite ile horizontal scaling varsayımını aynı release’te sessizce yapma.
- Secrets veya local DB dosyasını artifact/log/issue içine koyma.
- Cloud sağlayıcısı, beklenen yük ve compliance kararı verilmeden kesin release tarihi ilan etme.

## 12. Resmi teknik referanslar

Bu kararlar güncel resmi dokümantasyonla uyumludur:

- [Next.js Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting): reverse proxy, standalone runtime, multi-instance cache/tag koordinasyonu ve graceful shutdown konuları.
- [Next.js Deploying](https://nextjs.org/docs/app/getting-started/deploying): production build/start akışı ve standalone output.
- [Prisma `migrate deploy`](https://docs.prisma.io/docs/cli/migrate/deploy): production/staging pending migration uygulama yaklaşımı.
- [Prisma local-to-production migration guidance](https://docs.prisma.io/docs/orm/prisma-client/deployment/deploy-migrations-from-a-local-environment): migration’ı otomatik CI/CD akışına koyma ve production URL’lerini elle değiştirmeme uyarısı.
- [SQLite Appropriate Uses](https://www.sqlite.org/whentouse.html): tek writer, çoklu client, yüksek concurrency ve client/server DB sınırları.
- [Caddy `reverse_proxy`](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy): proxy header ve upstream health-check davranışları.
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): localStorage erişimi, HttpOnly/Secure/SameSite cookie ve `__Host-` önerileri.
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html): custom header/token ve SameSite savunması.
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html): MFA ve güvenli authentication kontrolleri.
- [WordPress Shortcodes](https://developer.wordpress.org/plugins/shortcodes/): shortcode attribute’larını sanitize etme, çıktıyı escape etme ve yan etkisiz return davranışı.
- [WordPress Block API](https://developer.wordpress.org/block-editor/reference-guides/block-api/): block, dynamic render, nested block ve template/pattern genişletilebilirliği.
- [WordPress Templates](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-templates/): nested template, template locking ve block tree yaklaşımı.
- [WordPress JavaScript enqueuing](https://developer.wordpress.org/plugins/javascript/enqueuing/): script’leri yalnız ihtiyaç olan frontend sayfalarında enqueue etme ve `defer/async` stratejileri.
- [MDN `iframe`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe): `loading`, `referrerpolicy`, sandbox/allow izinleri ve cross-origin embed sınırları.
- [MDN `postMessage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage): cross-origin iframe iletişimi, exact target origin, `origin`/`source` doğrulaması.
- [MDN CSS `aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/aspect-ratio): responsive 16:9 media box ve layout shift azaltma.
- [MDN CSS container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries): component’in bulunduğu container genişliğine göre responsive davranış.
- [MDN Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM): inline custom element içinde DOM/CSS encapsulation.
- [Typeform Embed SDK](https://www.typeform.com/developers/embed/): direct link yanında inline, full-page, popup, slider, popover ve side-tab embed modelleri.
- [Typeform Inline Embed](https://www.typeform.com/developers/embed/inline/): container tabanlı inline render ve host container ölçüsüne uyum modeli.
- [Jotform iframe embed](https://www.jotform.com/help/how-to-add-and-set-up-the-iframe-embed-widget-on-your-form/): iframe’in başka içerikle birlikte kullanımında HTTPS, width/height ve desktop/mobile test gereksinimleri.

## 13. İlk uygulanacak dar paket

Release’e en hızlı ve güvenli ilerleme için ilk geliştirme paketi şu sınırda tutulmalı:

1. Submission PATCH/DELETE tenant kapsamını düzelt.
2. Merkezi authorization helper ve role capability testleri ekle.
3. Public preview erişimini güvenli hale getir.
4. Submission transaction/idempotency/validation temelini tamamla.
5. Migration ve backup/restore akışını kur; production `db:push` yolunu kaldır.
6. `/api/health` + `/api/ready`, temiz build ve cloud startup smoke testini ekle.
7. Published form için direct URL, iframe ve responsive inline delivery contract’ını kur.
8. Iframe auto-height/postMessage güvenliğini ve CSS/DOM isolation test fixture’larını ekle.
9. Zorunlu pointer/touch/keyboard drag-drop, bounded Grid/Bento layout ve template isolation temelini kur; nested container ağacını ekleme.
10. Form card 16:9 cover image metadata/fallback ve `…`/`Ayarlar` action sözleşmesini uygula.
11. WordPress Gutenberg block + shortcode + iframe dokümantasyon paketini staging’de doğrula.
12. Public serializer/DTO allowlist, response forbidden-field scan ve public-to-admin negatif testlerini ekle.
13. Demo entegrasyonlarını feature flag veya “hazır değil” durumuna taşı.
14. Bu paketin tamamı için CI’da kritik E2E/security/responsive embed kapısını çalıştır.

Bu paket tamamlanmadan görsel polish, yeni provider ekleme veya kapsam genişletme release riskini azaltmaz; önce güvenlik ve veri güvenilirliği kapıları geçilmelidir.

## 14. Release kararı formatı

Her release adayı için aşağıdaki kısa karar kaydı doldurulmalı:

```text
Release: <version/commit>
Profile: pilot | public-saas
Decision: GO | NO-GO | GO-WITH-CAVEATS
Open P0: <none or list>
Open P1: <owner + due date>
Build: <artifact/checksum>
Migration: <status + backup id>
Restore drill: <pass/fail + evidence>
E2E: <pass count / total>
Security: <finding summary>
Performance: <p95/error/startup summary>
Rollback: <last tested commit and result>
Owner: <name>
Decision time: <timestamp>
```

**Final release şartı:** P0 bulgusu yok; migration/backup/rollback kanıtı var; kritik E2E/security senaryoları geçiyor; cloud runtime temiz artifact ile çalışıyor; published form direct URL, iframe, inline ve WordPress kapsamındaki seçilmiş modlarda responsive olarak çalışıyor; drag/drop + nested Bento builder aynı render schema’sını üretiyor; 16:9 card image ve settings UX’i doğrulanıyor; public browser network/storage/response incelemesinde app’in kritik bilgileri sızmıyor; kapsam dışı özellikler kullanıcıya gerçekmiş gibi sunulmuyor.
