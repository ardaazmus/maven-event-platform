# FormMagix Yeni Nesil — Gereksinim, İşlev ve Kural Dokümanı

**Sürüm:** 1.0 — 01.09.2026  
**Amaç:** Mevcut FormMagix/MachForm tabanlı yönetim panelinin tüm mevcut kabiliyetlerini koruyarak; modern, güvenli, mobil öncelikli, çok kiracılı ve genişletilebilir bir form platformuna dönüştürülmesi.

> Bu belge, yetkili hesapla yapılan yüzeysel işlev envanteri ve ürün analizi üzerine hazırlanmıştır. Mevcut veritabanının gerçek şeması görülmediği için aşağıdaki yeni şema önerilen kanonik modeldir. Geçiş öncesi eski DB export'u ile tablo/alan bazında doğrulanmalıdır. Canlı verilerde değişiklik yapılmamalı; yalnızca okuma amaçlı keşif ve export kullanılmalıdır.

## 1. Mevcut ürünün doğrulanan kapsamı

Mevcut panelde aşağıdaki ana alanlar ve form bazlı işlemler bulunmaktadır:

- **Form Manager:** tüm formlar, klasörler, akıllı klasörler, arama/filtreleme, sıralama, sayfalama / daha fazla sonuç.
- **Form yaşam döngüsü:** yeni form oluşturma, düzenleme, silme, çoğaltma, etkinleştirme/devre dışı bırakma, bilgi görüntüleme, dışa aktarma, önizleme.
- **Form operasyonları:** Entries, Theme, Notifications, Embed Code, Payment, Logic, Integrations, Report, bazı formlarda Approval.
- **Yönetim:** Users, Settings, Account, oturum açma/çıkış, şifre kurtarma, remember-me.
- **Form örnekleri ve kullanım desenleri:** etkinlik/ziyaretçi kayıtları, katılım ve davetli formları, anket/değerlendirme, başvuru ve ödül formları, webinar, ödeme ve approval akışları.
- **Alan ailesi (yeni sürümde korunmalı):** kısa/uzun metin, e-posta, telefon, sayı, tarih-saat, seçim kutusu, radyo, çoklu seçim, açılır liste, dosya yükleme, adres, bölüm/açıklama, imza, captcha, gizli alan, sayfa/bölüm, tablo/rating ve hesaplanan alanlar.

## 2. Yeni ürün vizyonu

Form oluşturmayı; **tasarla → yayınla → yanıtları topla → otomatikleştir → raporla** zincirinde tek bir çalışma alanına dönüştürmek.

### Başarı ölçütleri

- Kullanıcı ilk formunu 5 dakika içinde yayınlayabilmeli.
- Masaüstü, tablet ve telefon ekranlarında tüm yönetim işlemleri kullanılabilir olmalı.
- Form yanıtlarının kaybolmaması, çift kayıt oluşmaması ve dışa aktarmanın deterministik olması.
- Mevcut formlar, alanlar, yanıtlar, tema ayarları, bildirimler, mantık, ödeme ve entegrasyonlar kayıpsız taşınmalı.
- Kritik işlemlerde denetim kaydı, rol kontrolü ve geri alma bulunmalı.

## 3. Bilgi mimarisi ve UI/UX

### Ana navigasyon

1. **Genel Bakış** — toplam form, bugün gelen yanıt, hata, ödeme ve son aktiviteler.
2. **Formlar** — liste, klasör, etiket, arama, filtre, toplu işlem.
3. **Form Oluşturucu** — sürükle-bırak alan paleti, canvas, özellikler paneli.
4. **Yanıtlar** — tablo, detay, filtre, kaydetme, dışa aktarma, toplu işlem.
5. **Raporlar** — grafik, pivot, karşılaştırma, paylaşım.
6. **Otomasyonlar** — bildirim, koşullu mantık, webhook, entegrasyon.
7. **Tema ve marka** — tasarım sistemi, renk, tipografi, özel CSS.
8. **Çalışma alanı ayarları** — kullanıcılar, roller, güvenlik, faturalama, loglar.

### Form liste ekranı

- Kart ve tablo görünümü; durum rozeti: Taslak, Yayında, Durduruldu, Arşiv.
- Arama: başlık, etiket, slug, sahip, oluşturucu.
- Filtre: klasör, durum, tarih, bugün yanıtı, toplam yanıt, dil.
- Toplu: klasöre taşı, etiketle, dışa aktar, yayınla/durdur, arşivle.
- Silme işlemi varsayılan olarak soft-delete ve onay modallı olmalı.
- Her satırda hızlı işlemler: Yanıtlar, Düzenle, Önizle, Kopyala, Kod, Ayarlar.

### Form oluşturucu

- Sol panel: arama yapılabilir alan paleti ve hazır şablonlar.
- Orta canvas: drag/drop, klavye ile sıralama, inline başlık düzenleme.
- Sağ panel: alan özellikleri; değişiklik geçmişi ve autosave.
- Üst bar: Geri al/ileri al, Önizle, Test, Kaydet, Yayınla.
- Önizleme: masaüstü/tablet/mobil, gerçek validation ve koşullu mantıkla aynı runtime.
- Her alan için benzersiz `field_key`; görünen sıra ile veri anahtarları birbirinden ayrılmalı.

### Yanıt ekranı

- Sabit kolon başlığı, sanal listeleme, hızlı filtre ve kaydedilmiş görünümler.
- Satıra tıklayınca yan panel; önceki/sonraki kayda geçiş.
- Durumlar: Yeni, İnceleniyor, Onaylandı, Reddedildi, Spam, Arşiv.
- CSV/XLSX/JSON/PDF dışa aktarma; tarih aralığı, kolon seçimi ve filtre destekli.

## 4. İşlevsel gereksinimler

### FR-01 Kimlik ve erişim

- E-posta/şifre, şifre sıfırlama, oturum yenileme, remember-me.
- MFA (TOTP/passkey), başarısız giriş limiti, cihaz/oturum listesi.
- Roller: Owner, Admin, Form Manager, Analyst, Reviewer, Viewer.
- Yetki kapsamı workspace/form/folder seviyesinde verilebilir.
- Her API isteği tenant ve yetki bağlamıyla filtrelenmeli; ID tahmini ile veri erişimi engellenmeli.

### FR-02 Form yönetimi

- CRUD, kopyalama, klasör/etiket, arama, sıralama, soft-delete, arşiv.
- Taslak/yayınlanmış sürüm ayrımı; yayınlanan sürüm immutable snapshot olarak saklanmalı.
- Yayın URL'si, özel slug, iframe/embed script, popup ve doğrudan bağlantı.
- Başlangıç/bitiş zamanı, yanıt limiti, kota, kapalı mesajı ve bakım modu.

### FR-03 Alan ve form tasarımı

- Alan tipi, label, açıklama, placeholder, varsayılan değer, zorunlu, görünürlük.
- Validation: tip, regex, min/max, dosya türü/boyutu, benzersizlik, tarih aralığı.
- Çok sayfalı form, ilerleme çubuğu, geri/ileri, taslak kaydetme.
- Dil bazlı label/mesaj; RTL hazır altyapı.
- Hesaplanan alanlar güvenilir sunucu tarafı tekrar hesaplamasıyla doğrulanmalı.

### FR-04 Koşullu mantık

- `all/any` grupları; alan değeri, skor, tarih ve kullanıcı bağlamına göre koşullar.
- Aksiyonlar: göster/gizle, etkinleştir/devre dışı bırak, zorunlu yap, sayfaya yönlendir, değer ata, bildirim tetikle.
- Döngü, çelişen kural ve erişilemeyen sayfa yayın öncesi uyarılmalı.
- Kural sırası deterministik; test simülatörü ve açıklanabilir log bulunmalı.

### FR-05 Yanıt, onay ve dosya

- Idempotency key ile çift submit engeli; spam/rate limit/captcha.
- Kayıt zaman damgası, IP ve user-agent için KVKK/GDPR politikası.
- Dosyalar private storage'da; süreli imzalı URL; antivirüs ve MIME doğrulama.
- Approval akışı: adım, reviewer, SLA, yorum, karar, geri gönderme, audit trail.
- Kayıt silme/anonymize etme ve saklama süresi otomasyonu.

### FR-06 Bildirim ve otomasyon

- E-posta: alıcı, CC/BCC, koşul, şablon, yanıt özeti, ek/dosya bağlantısı.
- Kullanıcıya başarı/teşekkür mesajı ve otomatik e-posta.
- Webhook: imzalı payload, retry/backoff, dead-letter, teslimat logu.
- Entegrasyon framework'ü: OAuth/API key, bağlantı test etme, alan eşleme, hata tekrar deneme.
- Bildirim şablonlarında HTML sanitize, değişken whitelist ve dil fallback.

### FR-07 Ödeme

- Sağlayıcı soyutlaması (ilk sağlayıcılar konfigürasyonla); ödeme başlatma, callback/webhook, iade.
- Tutar/para birimi sunucuda hesaplanmalı; fiyat istemciden güvenilmemeli.
- Payment status: pending, authorized, paid, failed, refunded, partially_refunded.
- Kart verisi saklanmamalı; sağlayıcı tokenizasyonu ve webhook imza doğrulaması kullanılmalı.

### FR-08 Raporlama

- Yanıt sayısı, dönüşüm, terk, alan dağılımı, ödeme, approval ve zaman serisi.
- Filtrelenmiş rapor kaydetme, paylaşma ve salt okunur link.
- Büyük veri için async export job, ilerleme göstergesi ve indirme geçmişi.

## 5. Önerilen veritabanı modeli

PostgreSQL önerilir. Tüm tablolarda `id UUID`, `created_at`, `updated_at`, gerektiğinde `deleted_at`, `created_by`, `updated_by` bulunur. Tenant izolasyonu için tüm iş tablolarında `workspace_id` zorunludur.

### Çekirdek tablolar

- `workspaces(id, name, slug, locale, timezone, plan, status)`
- `users(id, email, name, password_hash, mfa_enabled, status, last_login_at)`
- `workspace_members(workspace_id, user_id, role, status)`
- `roles`, `permissions`, `role_permissions`
- `folders(id, workspace_id, parent_id, name, color, sort_order)`
- `tags(id, workspace_id, name)` / `form_tags(form_id, tag_id)`
- `forms(id, workspace_id, folder_id, owner_id, title, slug, status, settings_json, published_version_id)`
- `form_versions(id, form_id, version_no, schema_json, checksum, status, published_at)`
- `form_fields(id, form_version_id, field_key, type, label_json, config_json, sort_order)`
- `form_pages(id, form_version_id, title_json, sort_order)`
- `logic_rules(id, form_version_id, priority, conditions_json, actions_json, enabled)`
- `themes(id, workspace_id, form_id, tokens_json, custom_css, version)`

### Yanıt ve operasyon tabloları

- `submissions(id, form_id, form_version_id, public_token, status, locale, submitted_at, source, ip_hash, user_agent_hash)`
- `submission_values(id, submission_id, field_id, value_json, normalized_text)`
- `files(id, submission_id, field_id, storage_key, original_name, mime, size, checksum, scan_status)`
- `approval_flows`, `approval_steps`, `approval_instances`, `approval_actions`
- `notification_templates`, `notification_rules`, `notification_deliveries`
- `integration_connections`, `integration_mappings`, `integration_runs`, `webhook_deliveries`
- `payment_transactions`, `payment_events`, `refunds`
- `reports`, `report_widgets`, `export_jobs`
- `audit_logs(id, workspace_id, actor_id, action, resource_type, resource_id, before_json, after_json, ip_hash)`

**İndeksler:** `(workspace_id,status)`, `(form_id,submitted_at)`, `(form_id,deleted_at)`, unique `(workspace_id,slug)`, unique `(submission_id,field_id)`, GIN JSONB alanları. Yanıt değerleri yüksek hacimde partition edilebilir.

## 6. API sözleşmesi

REST `/api/v1` veya GraphQL; öneri REST:

- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/forgot-password`
- `GET/POST /workspaces/{id}/forms`, `GET/PATCH/DELETE /forms/{id}`
- `POST /forms/{id}/versions`, `POST /forms/{id}/publish`, `POST /forms/{id}/duplicate`
- `GET/POST /forms/{id}/submissions`, `GET /submissions/{id}`, `PATCH /submissions/{id}`
- `GET /forms/{id}/entries/export`, `GET/POST /forms/{id}/logic`
- `GET/PATCH /forms/{id}/notifications`, `/payment`, `/integrations`, `/reports`
- Public: `GET /public/forms/{slug}`, `POST /public/forms/{slug}/submit`

Standart cevap: `{data, meta, error}`. Pagination cursor tabanlı; mutation'larda `Idempotency-Key`; optimistic locking için `version`/ETag; tüm hata kodları dokümante.

## 7. Güvenlik, KVKK ve kalite kuralları

- Şifreler Argon2id; TLS, güvenli cookie, CSRF, CSP, HSTS, XSS/SQLi koruması.
- Tenant ve RBAC kontrolü servis katmanında ve DB sorgusunda.
- Hassas alanlar şifrelenebilir; loglara parola, token, kart veya ham kişisel veri yazılmaz.
- KVKK: aydınlatma/onay checkbox'ı, amaç bazlı rıza, erişim/düzeltme/silme talebi, veri saklama politikası, veri işleme envanteri.
- Backup şifreli, geri yükleme tatbikatı ve RPO/RTO hedefleri tanımlı.
- WCAG 2.2 AA: klavye, focus, kontrast, label, hata özeti, ekran okuyucu ve reduced-motion.
- Test piramidi: unit, API/integration, migration, E2E, accessibility, load, security ve restore testi.

## 8. Geçiş planı

1. Salt-okunur keşif: mevcut tablolar, ilişkiler, dosya depolama, cron ve webhook envanteri.
2. Eski sistemden şema + veri export'u; parola hash'leri taşınamıyorsa zorunlu şifre yenileme.
3. Mapping tablosu oluşturma: form, alan, seçenek, yanıt, tema, bildirim, mantık, ödeme, kullanıcı.
4. Staging import ve toplam kayıt/hash karşılaştırması.
5. Eski form public URL'leri için redirect/uyumluluk katmanı.
6. Pilot workspace, read-only paralel çalışma, kullanıcı kabul testi.
7. Kademeli cutover; hata halinde eski sisteme geri dönüş.
8. 30 gün gözlem, export ve yanıt sayısı mutabakatı; ardından legacy arşiv.

## 9. Kabul kriterleri

- Mevcut form örnekleri yeni sistemde açılabiliyor, düzenlenebiliyor ve yayınlanabiliyor.
- Her eski alan tipi doğru değer, validation ve görünümle çalışıyor.
- Yeni yanıt hem listede hem detayda doğru gösteriliyor; CSV/XLSX export kayıpsız.
- Koşullu görünürlük, approval, bildirim, embed ve ödeme uçtan uca testten geçiyor.
- Yetkisiz kullanıcı başka workspace/form verisini göremiyor.
- Mobil Lighthouse/erişilebilirlik hedefleri ve performans bütçeleri karşılanıyor.
- Silme, anonimleştirme, audit log ve geri alma denetlenebilir.

## 10. MVP ve sonraki fazlar

**MVP:** kimlik/RBAC, form CRUD, builder, tüm temel alanlar, yayın/embed, yanıtlar, CSV, tema, e-posta, temel mantık, audit log, migration.  
**Faz 2:** approval, ödeme, webhook/entegrasyon marketplace, gelişmiş rapor, çoklu dil, async export.  
**Faz 3:** SSO/SCIM, gelişmiş workflow engine, mobil uygulama, AI destekli form/rapor önerileri, bölgesel veri depolama.

## 11. Açık kararlar

- Hangi ödeme ve e-posta sağlayıcıları kullanılacak?
- Mevcut özel entegrasyonlar ve webhook URL'leri hangileri?
- KVKK saklama süreleri, veri lokasyonu ve DPA gereksinimleri nedir?
- Eski public URL'lerin tamamı korunacak mı?
- Workspace/organizasyon yapısı ve kullanıcı sayısı/yanıt hacmi hedefleri nedir?
- Marka sistemi, renk/font, desteklenen diller ve özel rapor beklentileri nedir?

Bu doküman geliştirme başlamadan önce ürün sahibi, teknik lider ve veri güvenliği sorumlusu tarafından onaylanmalı; ardından OpenAPI, ERD, wireframe ve migration mapping dokümanlarına ayrıştırılmalıdır.

# 12. Ekran–menü–iş akışı spesifikasyonu

Bu bölüm, uygulamayı üretecek yapay zekânın her ekranı hangi veriyle ve hangi eylemle oluşturacağını tanımlar.

## 12.1 Giriş ve oturum akışı

`/login` ekranında logo, e-posta, parola, Beni hatırla, Giriş yap ve Şifremi unuttum bulunur. Başarılı girişte kullanıcının son workspace'i ve `/dashboard` açılır. Hatalı girişte kullanıcı varlığı açığa çıkarılmaz; rate-limit uygulanır. Şifre kurtarmada tek kullanımlık, süreli bağlantı gönderilir. Oturum süresi bitince kaydedilmemiş builder değişikliği korunur ve yeniden kimlik doğrulama istenir.

## 12.2 Genel Bakış `/dashboard`

Kartlar: Toplam Form, Yayındaki Form, Bugünkü Yanıt, Bekleyen Onay, Başarısız Bildirim, Ödeme Toplamı. Alt bölümde son formlar, son yanıtlar, sistem uyarıları ve aktivite günlüğü bulunur. Her kart ilgili filtrelenmiş ekrana link verir. Tarih aralığı ve workspace filtresi tüm kartları birlikte değiştirir.

## 12.3 Formlar `/forms`

Sol üstte **Yeni Form**; yanında içe aktarma ve görünüm seçici bulunur. Sol sidebar:

- **Tüm Formlar:** workspace içindeki erişilebilir tüm formlar.
- **Akıllı Klasörler:** kayıtlı sorgular; örn. `status=published AND submissions_today>0`.
- **Klasörler:** hiyerarşik, sürüklenebilir klasörler.
- **Yeni Klasör:** ad, renk, üst klasör.

Liste satırı: form adı, durum, etiketler, klasör, bugün/toplam yanıt, oluşturulma tarihi, son değişiklik, sahip. Satır menüsü:

- **Yanıtlar:** `/forms/:id/submissions`
- **Düzenle:** builder açılır.
- **Tema:** görünüm editörü.
- **Bildirimler:** e-posta ve webhook.
- **Kod:** embed ve paylaşım.
- **Ödeme:** ödeme sağlayıcısı ve fiyat.
- **Mantık:** koşullu görünürlük/aksiyon.
- **Entegrasyonlar:** dış servis bağlantıları.
- **Rapor:** grafik ve analiz.
- **Bilgi:** form meta bilgisi ve public link.
- **Önizle:** public renderer.
- **Çoğalt:** formun yeni taslak sürümü; yanıtlar kopyalanmaz.
- **Etkinleştir/Durdur:** public endpoint erişimini değiştirir.
- **Dışa aktar:** form şeması veya yanıtlar.
- **Sil:** önce arşiv; kalıcı silme yalnız Owner ve saklama kuralından sonra.

## 12.4 Yeni form akışı

**Yeni Form** tıklanınca boş form, şablondan form, JSON içe aktar veya mevcut formu çoğalt seçenekleri açılır. Başlık, açıklama, dil, zaman dilimi ve slug alınır. Oluşturma sonrası builder açılır ve otomatik ilk taslak kaydedilir.

## 12.5 Builder `/forms/:id/builder`

### Alan ekleme

`Add Field` paneli arama ve kategoriler içerir. Alan canvas'a tıklanarak veya sürüklenerek eklenir. Her alanın `id`, `field_key`, tipi, etiketi ve sırası oluşturulur. Alan seçilince sağdaki özellik paneli değişir. Sıralama, gizleme, çoğaltma ve silme desteklenir. Silinen alan geri alınabilir; yayınlanmış sürümde alan silinirse eski yanıt kolonları korunur.

### Desteklenen alanların davranışları

- **Single Line Text:** maksimum uzunluk, küçük/orta/büyük boy, password veya website görünümü, pattern.
- **Paragraph Text:** satır sayısı, maksimum uzunluk, zengin metin opsiyonu.
- **Number:** min/max, ondalık, binlik ayırıcı, hesaplama kaynağı.
- **Email:** e-posta biçimi ve ikinci e-posta ile doğrulama.
- **Name:** ad/soyad; normal veya unvanlı format.
- **Phone:** uluslararası veya `###-###-####` formatı.
- **Address:** adres satırları, şehir, eyalet, posta kodu, ülke; gösterilecek alt alanlar seçilebilir.
- **Date:** tarih formatı, min/max sabit veya göreli tarih, geçmiş/gelecek kapatma, haftanın günlerini kapatma, aynı tarihin seçilme limiti.
- **Time:** saniye gösterimi ve 12/24 saat.
- **Checkboxes:** çoklu seçim, kolon sayısı, başka seçenek ekleme, seçenekleri karıştırma, minimum/maksimum/tam seçim limiti.
- **Multiple Choice:** tek seçim, seçenek metni/değeri, kolon düzeni, randomize.
- **Drop Down:** tek seçim, seçenek arama, placeholder, diğer seçenek.
- **Rating:** 1–10 arası üst değer, varsayılan, düşük/yüksek etiket, yıldız/kalp/sayı görünümü.
- **Price:** sabit veya seçime bağlı tutar; ödeme toplamına bağlanır.
- **Matrix Choice:** satır/sütun bulk insert, satır başına tek veya çoklu cevap.
- **File Upload:** izinli MIME/uzantı, dosya adedi/boyutu, virüs taraması, private download URL.
- **Section Break:** başlık/açıklama; veri üretmez.
- **Page Break:** çok adımlı form; sayfa başlığı, ilerleme tipi.
- **Signature:** çizim, touch/pointer desteği, PNG/SVG saklama ve rıza metni.
- **Media:** image, video veya PDF; URL/storage ve responsive görünüm.
- **Hidden:** kampanya, kaynak, kullanıcı veya entegrasyon değeri; public kullanıcı değiştiremez.

Her veri alanında **Required, No Duplicates, Read Only, Visible/Hidden/Admin Only, encrypted** seçenekleri bulunur. Required validation hem istemcide hem sunucuda çalışır. Admin Only alan public response'ta görünmez.

### Form özellikleri

Form adı/açıklaması, logo, başarı mesajı veya redirect URL, submit butonu metni, hata metinleri, dil, timezone, anti-spam, captcha, yanıt kotası, açık-kapalı tarihleri, taslak yanıt, kullanıcı düzenleme linki ve PDF üretimi burada ayarlanır. `Save` yalnız taslak kaydeder; `Publish` validation + kural derleme + sürüm immutable snapshot işlemlerini yapar.

## 12.6 Tema `/forms/:id/theme`

Hazır temalar: Vibrant, Dark, Light, Blue ve özel tema. Renk token'ları (primary, background, text, error, success), font, radius, gölge, spacing, label konumu, kolon genişliği, buton stili, progress bar, logo, background image ve custom CSS düzenlenir. Önizleme gerçek form renderer ile aynı olmalıdır. Kontrast kontrolü yayına çıkmadan uyarı verir.

## 12.7 Yanıtlar `/forms/:id/submissions`

Tabloda sistem kolonları (`id`, oluşturulma, güncellenme, durum, payment status) ve form alanları bulunur. Kolon göster/gizle, sıralama, filtre, tarih aralığı, etiket ve kaydedilmiş görünüm vardır. Filtreler: eşittir, içerir, boş, aralık, çoklu seçim. Detay drawer'ı tüm alanları, yüklenen dosyaları, notları, payment ve approval geçmişini gösterir. Eylemler: durum değiştir, spam, arşiv, sil/anonymize, PDF indir, yazdır, e-posta gönder, export'a dahil et.

Toplu seçimde export, silme, durum güncelleme ve e-posta gönderme async job olarak çalışır. Export tamamlanınca kullanıcıya süreli indirme linki gönderilir.

## 12.8 Bilgi `/forms/:id/info`

Form ID, sürüm, oluşturucu, sahip, slug, durum, public URL, toplam/bugünkü yanıt, son yanıt, oluşturulma/değişme zamanı, bağlı tema, bildirim, ödeme ve entegrasyon özeti gösterilir. Buradaki public URL ve `view` eylemi formu yeni sekmede açar.

## 12.9 Kod `/forms/:id/embed`

Kullanıcı bir tip seçer:

1. Önerilen JavaScript embed — placeholder div + async script; responsive yükseklik.
2. Iframe — width 100%, title, sandbox ve fallback link.
3. PHP server-side embed — yalnız aynı sunucuda çalışan paket.
4. PHP form kodu — mevcut PHP sayfasına ekleme.
5. Tıklanabilir bağlantı.
6. Popup bağlantısı.
7. Plain URL.

Her sonuçta **Kopyala**, **İndir**, test et ve alan yüksekliğini yenile seçenekleri vardır. Embed runtime postMessage ile yükseklik, başarı ve hata olaylarını üst sayfaya bildirir; origin allowlist uygulanır.

## 12.10 Bildirimler `/forms/:id/notifications`

İki ana workflow vardır:

- **Admin notification:** yeni kayıt olduğunda ekip adresine gönderilir.
- **User confirmation:** formdaki Email alanına gönderilir.

Alanlar: etkin/pasif, alıcı, CC/BCC, from name/email, reply-to, konu, HTML/plain text, PDF eki, PDF içeriği, koşul ve merge tag. Merge tag örnekleri: `{entry_data}`, `{field_key}`, `{form_title}`, `{submission_id}`. Custom recipient alanı güvenlik nedeniyle whitelist edilir. Teslimat logunda queued/sent/failed, provider message id, hata ve retry görülür.

Ayrıca **Send Form Data to Another Website** workflow'ü URL, POST/GET/PUT, HTTP auth, custom headers, key-value veya raw JSON, retry ve imza secret'ı destekler.

## 12.11 Mantık `/forms/:id/logic`

Kural oluşturma ekranı: `IF` koşulları ve `THEN` aksiyonları. Örnek: `attendance = no` ise `hotel_fields` gizle; `country != TR` ise `passport` göster; `ticket_type = VIP` ise `company` required yap; `score >= 80` ise approval başlat. Kural testçisi örnek değerlerle sonucu ve etkilenen alanları gösterir. Çakışan kural önceliği sayı ile belirlenir. Sunucu aynı sonucu tekrar hesaplar.

## 12.12 Ödeme `/forms/:id/payment`

Bölümler: **Merchant Settings**, **Payment Options**, **Define Prices**. Sağlayıcılar: PayPal Standard, Stripe, Authorize.net, Braintree, Check/Cash. Test mode zorunlu varsayılandır. API secret'ları şifreli secret vault'ta saklanır ve UI'da tekrar gösterilmez.

Payment Options: para birimi (TRY dahil), toplamın üst/alt/ikisi, vergi, tek seferlik/recurring ödeme, trial, setup fee, indirim yüzdesi/tutarı, kupon kodu, kullanım limiti/bitiş tarihi, Apple Pay/Google Pay, fatura/teslimat adresi, ödeme sonrası bildirim. Prices: sabit miktar veya alan seçimine göre değişken miktar. Toplam sunucuda hesaplanır. Callback ve provider webhook imzası doğrulanmadan ödeme başarılı işaretlenmez.

## 12.13 Entegrasyonlar `/forms/:id/integrations`

Bağlantı katalogdan seçilir; OAuth veya API key ile bağlanır. Alan eşleme ekranı kaynak alan → hedef alan seçtirir; test payload'ı ve bağlantı testi bulunur. Her çalıştırma request/response özeti, süre, durum, retry ve hata ile loglanır. Secret alanları maskelenir.

## 12.14 Rapor `/forms/:id/reports`

Widget ekleme: toplam yanıt, tarih serisi, seçim dağılımı, rating ortalaması, ödeme, approval, dönüşüm ve terk. Grafikler form sürümü ve filtre snapshot'ı ile çalışır. CSV/PDF export ve salt okunur paylaşım linki bulunur.

## 12.15 Kullanıcılar `/users`

Kullanıcı ekle/davet et, rol ata, form/klasör kapsamı ver, pasifleştir, yeniden davet et ve oturumları sonlandır. Davet bağlantısı tek kullanımlı ve süreli. Rol matrisi UI'da açıkça gösterilir; Viewer mutation göremez, Analyst yanıtları anonimleştirilmiş görebilir, Reviewer yalnız approval alanına erişir.

## 12.16 Sistem Ayarları `/settings`

- SMTP: sunucu, port, auth, TLS/SSL, kullanıcı/parola, test e-postası.
- LDAP/Active Directory: host, port, encryption, Base DN, suffix, required groups, exclusive mode.
- Zaman dilimi ve locale.
- Varsayılan form ayarları, dosya limitleri, captcha, saklama ve audit politikası.
- Marka, logo, varsayılan tema, sistem e-posta adı.

Ayar kaydı değişiklik öncesi/sonrası audit'e yazılır. SMTP ve LDAP secret'ları şifreli tutulur.

## 12.17 Hesap `/account`

E-posta değiştirme, parola değiştirme, 2 adımlı doğrulama etkinleştirme/doğrulama, aktif oturumlar, tema seçimi (Vibrant/Dark/Light/Blue), dil ve bildirim tercihleri. MFA kaldırma için mevcut MFA veya recovery code gerekir.

# 13. Uçtan uca örnek senaryolar

## Etkinlik kayıt formu

1. Owner `Yeni Form > Etkinlik Kaydı` seçer.
2. Name, Firma, E-posta, Telefon, Katılım, Konaklama ve KVKK alanları eklenir.
3. Katılım `Hayır` ise konaklama alanı gizlenir; ülke yurt dışıysa pasaport alanı gösterilir.
4. Tema ve teşekkür mesajı ayarlanır; user confirmation e-postası yazılır.
5. Önizleme ile mobil test edilir, Publish yapılır.
6. Embed kodu etkinlik sitesine eklenir.
7. Yanıtlar filtrelenir; onay bekleyenler reviewer'a gönderilir; XLSX export alınır.

## Ücretli kayıt

1. Price alanı veya fiyat seçenekleri eklenir.
2. Stripe test bağlantısı kurulur, TRY seçilir, toplam ve kupon yapılandırılır.
3. Başarılı ödeme olmadan kayıt `payment_pending` kalır ve onay akışı başlamaz.
4. İmzalı webhook alınca transaction `paid`, submission `confirmed` olur; kullanıcıya makbuz e-postası gider.
5. İade durumunda submission ve rapor yeniden hesaplanır.

# 14. Yapay zekâya verilecek uygulama üretim talimatı

Bu dokümanı uygularken eksik bırakma: önce PostgreSQL migration'larını, seed rollerini, OpenAPI sözleşmesini, ardından backend servislerini, public renderer'ı ve admin frontend'i üret. Her mutation için yetki, validation, audit ve transaction uygula. Builder şemasını sürümle; public form daima yayınlanmış snapshot okur. İstemci validation'ına güvenme. Her menüde loading, empty, error, permission-denied ve success durumlarını tasarla. Her ekran mobilde çalışmalı. E2E testleri en az login, form oluşturma, alan ekleme, publish, public submit, koşullu mantık, notification, export, payment test mode ve RBAC senaryolarını kapsamalı. Mevcut form ve yanıt migration'ı için dry-run, mapping raporu, checksum ve rollback üret.
