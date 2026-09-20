# MavenForms + Maven Event Management
## Kanıtlı UX/IA yeniden tasarım, iş akışı ve dinamik yaka kartı çalışma dosyası

**Tarih:** 18 Eylül 2026  
**Kapsam:** MavenForms arayüzünün Maven Event Management çekirdeğiyle birleşmesi, yaka kartı şablon yükleme ve dinamik kayıt basımı  
**Belge türü:** Uygulama öncesi karar ve çalışma planı  
**Durum:** Kanıtlı hedef UX/IA + F0–F9 yürütme planı; bu belge tek başına kod değişikliği emri değildir.  
**İlgili iş paketleri:** `F9-10` (tasarım kararı), `F9-12` (yürütme planı ve CLI protokolü)  
**Yürütme durumu:** `F9-12` yerel plan kanıtı hazır; uygulama fazları ilk gerçek eksik F0 packet’inden başlatılmalıdır.  

> Bu dosya ürün/production onayı değildir. Yerel kod, yerel test ve localhost davranışı “yerel kanıt”; canlı provider, gerçek AV/quarantine, gerçek saha, hukuk/mali müşavir ve staging kanıtı ise ayrı kapılardır.

---

## 1. Sonuç: Ne değişmeli?

MavenForms’un bugünkü ana problemi tek tek ekranların kötü olması değil, ürünün ana nesnesinin ve iş akışının kullanıcıya yanlış sırada gösterilmesidir.

Bugün kullanıcı ağırlıklı olarak **Formlar** ekranına giriyor. Oysa Maven Event Management bağlamında gerçek iş şu sıradadır:

```text
Organizasyon
  → Etkinlik
    → Etkinlik tarihi/oturumu/venue
      → Kayıt formu ve form sürümü
        → Kişi + kayıt
          → bilet/katılım hakkı
            → credential / yaka kartı
              → check-in / attendance
                → floor plan / atama
                  → rapor ve operasyon
```

Bu nedenle önerilen karar:

1. **Event birinci sınıf ürün nesnesi yapılmalı.** “Etkinlikler” yalnızca klasör veya etiket olarak kalmamalı.
2. **Form, etkinliğin kayıt/intake yüzeyi olarak konumlanmalı.** Form tek başına event, kişi, ödeme veya yaka kartının yerine geçmemeli.
3. **Formlar ekranındaki dağınık sihirbazlar ayrılmalı.** Form listesi; fatura, ödeme, medya güvenliği, evidence ve invoice center gibi birbirinden farklı operasyonları aynı anda render etmemeli.
4. **Event context seçici eklenmeli.** Kullanıcı hangi etkinlikte çalıştığını her ekranda görmeli.
5. **Yaka kartı, “Sonuçlar > Yaka kartı” içinde kaybolan bir ayar olmaktan çıkarılıp etkinlik operasyonunun bağımsız yüzeyi olmalı.** Form bağlantısı korunmalı, fakat kaynak veri `Registration/Person/Ticket/Event` zincirinden gelmeli.
6. **Yaka kartı template upload yalnız PDF’ye bağlı kalmamalı.** PDF, PNG, JPEG/JPG ve WebP için ayrı doğrulama yolu olmalı. SVG ilk sürümde kabul edilmemeli; aktif içerik ve renderer güvenliği netleşmeden eklenmemeli.
7. **Dinamik basım kayıt snapshot’ı üzerinden çalışmalı.** Her üretim hangi etkinlik, kayıt, credential, şablon sürümü ve veri snapshot’ı ile üretildiğini audit edebilmelidir.
8. **Yayınlama ve üretim “önizleme göründü” ile geçmemeli.** Mantık kapıları, eksik alan, taşan metin, QR okunabilirliği, izin, güvenlik taraması ve çıktı durumu açıkça geçilmelidir.

### Tasarım karar etiketleri

Bu dosyada her öneri şu etiketlerden biriyle okunmalıdır:

| Etiket | Anlamı |
|---|---|
| `MEVCUT_KANIT` | Kaynak kodu, test, plan veya yerel canlı UI’da doğrudan görüldü. |
| `SEKTÖR_KANITI` | Resmî ürün dokümanı veya standarttan çıkarılmış ortak desen. |
| `ÖNERİ` | MavenForms için hedef UX/IA veya teknik tasarım kararıdır. Mevcut özellik iddiası değildir. |
| `DÖNÜŞTÜR` | Mevcut yapı korunarak sınırı veya veri kaynağı değiştirilmelidir. |
| `YENİ` | Mevcut kanıtta bulunmayan ve ayrıca geliştirilmesi gereken parçadır. |
| `DEFERRED` | Doğru fikir olsa da mevcut ürün fazı veya dış kanıt hazır olmadığı için şimdi açılmamalıdır. |
| `UNVERIFIED` | Yerel kanıt varmış gibi production sonucu çıkarılamaz. |

---

## 2. İnceleme sınırı ve kullanılan kanıt

### 2.1 İncelenen yerel kaynaklar

- `PROJECT_CONTEXT.md`
- `STATUS.md`
- `docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/00_OKU_BENI.md`
- `docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/04_MAVENFORMS_KAPSAM_UYUMU.md`
- `docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/05_HEDEF_MIMARI.md`
- `docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/06_KANONIK_VERI_MODELI.md`
- `docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/11_YOL_HARITASI.md`
- `src/components/mavenforms/app-shell.tsx`
- `src/components/mavenforms/sidebar.tsx`
- `src/components/mavenforms/topbar.tsx`
- `src/components/mavenforms/views/forms-list-view.tsx`
- `src/components/mavenforms/views/form-builder-view.tsx`
- `src/app/api/forms/[id]/badges/templates/route.ts`
- `src/lib/badge-template-contract.ts`
- `src/lib/badge-template-storage.ts`
- `src/lib/badge-front-render-contract.ts`
- `src/lib/badge-field-mapping.ts`
- `src/app/api/forms/[id]/media/route.ts`
- `src/app/api/media/route.ts`
- `src/lib/file-policy.ts`
- ilgili badge, media, render, field-mapping ve UI testleri

### 2.2 Yerel canlı UI incelemesi

Yerel `localhost:3000` demo akışı gözlemlendi. Bu gözlem production davranışı değildir.

`Dashboard` ekranında:

- Genel bakış, yanıt trendi, form durumları ve operasyon kartları aynı yoğun grid içinde gösteriliyor.
- “Bekleyen onay” gibi KPI’lar görünür, fakat kullanıcıyı event/kayıt/işlem bağlamına taşıyan ana yol yok.
- Arama ve workspace seçimi var; event context yok.

`Formlar` ekranında:

- Formlar, klasörler ve etiketler var.
- “Etkinlikler” bir klasör/kategori olarak görünüyor; Event yaşam döngüsünün sahibi olarak görünmüyor.
- Form listesi, öne çıkarılmış form, canlı preview ve son yanıtlar aynı sayfada bulunuyor.
- Aynı sayfada manuel fatura, gelecekteki fatura API’si, transactional fatura maili, media/document safety, capability/evidence ve invoice center bölgeleri birlikte render ediliyor.
- Bu, kullanıcıya “form mu yönetiyorum, fatura mı, belge güvenliği mi?” sorusunu sorduran temel IA problemidir.

`FormBuilderView` içinde:

- Alanlar, görünüm, mantık, ayarlar, bildirim, ödeme, entegrasyon, WordPress, önizleme, yanıtlar, rapor ve yaka kartı sekmeleri aynı form çalışma alanına yükleniyor.
- Bu sekmelerin hepsi aynı yoğunlukta sunulduğunda form kurma, yayınlama ve etkinlik operasyonu birbirine karışıyor.
- Sürükle-bırak kolaylığı olsa dahi alan ekleme, sıralama ve ayar değiştirme için klavye eşdeğeri ayrıca korunmalıdır.

### 2.3 Planla uyum

Ana planın önemli kararları bu belgeye aynen korunmuştur:

- Faz sırası F0 → F9’dur; yeni UX fikri bu teknik sırayı değiştirmez.
- F1 hedefi Event, Occurrence, Person, Registration ve FormBinding çekirdeğidir.
- F4 hedefi Ticket, Credential, Badge binding ve temel Check-in akışıdır.
- F5 hedefi Floor Editor ile Event/participant ID birleşimi, hold/book/release ve assignment’tır.
- F9 tamamlanmadan SaaS provisioning, tenant billing veya BYO provider UI açılmaz.
- R-10 dış kanıt/güvenlik kapısı production açılışını hâlâ sınırlar.

---

## 3. Mevcut durum: ne var, ne yok?

### 3.1 Mevcut ve yeniden kullanılabilir parçalar

| Alan | Durum | Kanıt | Karar |
|---|---|---|---|
| Form listesi, form builder, preview | `MEVCUT_KANIT` | `app-shell`, `forms-list-view`, `form-builder-view` | Yeniden kullan; IA’yı event context’e bağla. |
| Workspace/auth/RBAC/audit | `MEVCUT_KANIT` | plan ve kaynak kod | Event ve operasyon permission’larına genişlet. |
| Event API/model dosyaları | `MEVCUT_KANIT` | mevcut checkout’ta `src/app/api/events`, event migration/test dosyaları | Canlı UX iddiası yapmadan UI read modeline bağla. |
| Person/Registration API/model dosyaları | `MEVCUT_KANIT` | mevcut checkout’ta ilgili route/test dosyaları | Form submission’dan canonical registration orchestration’ına taşı. |
| Ticket/Check-in route ve testleri | `MEVCUT_KANIT` | `src/app/api/tickets`, `src/app/api/checkin`, testler | Onsite ekranları için read/write sınırı oluştur. |
| Media upload | `MEVCUT_KANIT` | `/api/media`, `/api/forms/[id]/media`, Sharp metadata kontrolü | Badge template upload’tan ayrı olduğu açıkça anlatılmalı. |
| Badge PDF template upload | `MEVCUT_KANIT` | badge template route/contract/storage/testleri | PDF-only sınırını dönüştür. |
| Badge field mapping | `MEVCUT_KANIT` | `badge-field-mapping.ts` | Kanonik Person/Registration/Ticket alanlarına genişlet. |
| Badge front render contract | `MEVCUT_KANIT` | `badge-front-render-contract.ts` | Tek yüz ve statik placement sınırını sürümlü tasarım modeline taşı. |
| PDF/ZIP badge artifact | `MEVCUT_KANIT` | artifact storage contract/export route | PDF birincil baskı çıktısı olarak korunmalı. |
| Fatura/payment/invoice delivery sözleşmeleri | `MEVCUT_KANIT` | plan, route ve testler | Event UX’te ayrı Finance & Documents alanına taşınmalı. |

### 3.2 Birinci sınıf eksikler

| Eksik | Neden kullanıcı problemi yaratıyor? | Öncelik |
|---|---|---:|
| Event context ve Event workspace | Formun hangi etkinliğe ait olduğu her yerde görünmüyor. | P0 |
| Kayıt/katılımcı inbox’ı | Submission, Person ve Registration ayrımı kullanıcıya görünmüyor. | P0 |
| Event setup/readiness merkezi | Kullanıcı yayın öncesi hangi bağımlılığın eksik olduğunu tek yerde göremiyor. | P0 |
| Badge Studio | Yaka kartı, form sonuç sekmesine sıkışıyor; template→mapping→preview→generate zinciri görünür değil. | P0 |
| Badge template format sözleşmesi | PDF dışı input reddediliyor; genel media hattı bu pipeline’a bağlı değil. | P0 |
| Template version ve publish state | Hangi şablon sürümüyle basım yapıldığı açık değil. | P0 |
| Check-in operasyon ekranı | Tarama, manuel arama, offline/duplicate/invalid ayrımları tek UI’da tanımlı değil. | P1 |
| Floor plan binding görünümü | Kayıt/katılımcı ile plan/seat/booth ilişkisi kullanıcıya bağlanmamış. | P1 |
| Yetki yüzeyleri | Event admin, registration reviewer, finance, badge operator ve check-in staff ayrımı görünür değil. | P1 |
| Dış kanıt/prod readiness | Yerel PASS, gerçek AV/provider/saha kanıtı değildir. | P0 release gate |

### 3.3 Yaka kartı yüklemesinin doğrulanmış kök nedeni

Bu bulgu doğrudan kaynak kodundan çıkarılmıştır:

1. `src/app/api/forms/[id]/badges/templates/route.ts` gelen dosyayı `PDFDocument.load` ile PDF olarak açıyor.
2. `src/lib/badge-template-contract.ts` `mime === application/pdf` ve `.pdf` uzantısı zorunluluğu koyuyor.
3. Aynı sözleşme PDF signature kontrolü, 1–2 sayfa sınırı, ölçü kontrolü ve JavaScript/OpenAction/EmbeddedFile gibi aktif içerik reddini uyguluyor.
4. `src/lib/badge-template-storage.ts` depolama anahtarını `source.pdf` olarak sabitliyor.
5. Generic media route PNG/JPEG/WebP kabul etse bile bu dosya otomatik olarak badge template kaydına dönüşmüyor.
6. `badge-artifact-storage-contract.ts` üretilmiş artifact için de yalnız `application/pdf` kabul ediyor.
7. `badge-field-mapping.ts` şu an sınırlı bir alan projeksiyonu sunuyor: ad, soyad, unvan, şirket ile event adı, event tarihi ve registration type.
8. `badge-front-render-contract.ts` `backPage` verisini reddediyor ve `faces: ['front']` döndürüyor.

**Sonuç:** Kullanıcı PNG/JPEG yüklediğinde sorun yalnız input `accept` değerinden kaynaklanmıyor; template API, sözleşme, storage manifest, preview/render ve output artifact katmanları da PDF varsayımı taşıyor. Çözüm tek satırlık `accept="image/png,image/jpeg"` değişikliği değildir.

---

## 4. Sektör ve standart doğruları

### 4.1 Dosya yükleme

OWASP güvenli upload için allowlist, sunucu tarafı tür doğrulama, Content-Type’a güvenmeme, uygulama tarafından üretilen dosya adı, boyut sınırı, yetki ve uygulama hostundan ayrıştırılmış depolama öneriyor: [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

Tarayıcıdaki `accept` yalnız dosya seçicisine rehberlik eder; doğrulama değildir. Kullanıcı dosya seçicide filtreyi aşabilir, bu nedenle sunucu doğrulaması zorunludur: [MDN `accept`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/accept).

MavenForms sonucu:

- client `accept` kullanıcı deneyimini yönlendirir;
- server uzantı + MIME + signature/magic bytes + güvenilir parser/decoder doğrular;
- dosya adı depolama anahtarı olarak kullanılmaz;
- orijinal dosya private/quarantine alanda tutulur;
- tarama tamamlanmadan “aktif şablon” yapılmaz;
- başarısızlık nedeni kullanıcıya teknik ama anlaşılır bir dille gösterilir.

### 4.2 Form ve builder erişilebilirliği

WCAG 2.2 otomatik algılanan input hatasında hatalı alanın metinle belirtilmesini ve kullanıcıya düzeltme bilgisi verilmesini ister: [WCAG 2.2 Input Assistance](https://www.w3.org/TR/WCAG22/).

Builder için doğrudan uygulanacak kurallar:

- Alan ekleme, silme, taşıma, sıralama ve özellik değiştirme klavye ile yapılmalı.
- Sürükle-bırak tek işlem yolu olmamalı; yukarı/aşağı taşı, önceye/sonraya ekle, sırayı sayı ile düzenle alternatifleri bulunmalı.
- Her input’un görünür label’ı ve gerekiyorsa örnek formatı olmalı; placeholder label yerine geçmemeli.
- Hata yalnız kırmızı kenarlıkla gösterilmemeli; alan adı, neden ve düzeltme önerisi metinle verilmelidir.
- Modal açıldığında odak modal içine alınmalı, `Escape` ile kapanmalı, kapanınca çağıran kontrole dönmelidir: [WAI-ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
- Tab listeleri aktif sekme, `aria-controls`, `aria-selected` ve ok tuşlarıyla anlamlı çalışmalıdır: [WAI-ARIA Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).

### 4.3 Etkinlik yönetimi ortak akışları

Resmî etkinlik ürünü akışlarında ortak görülen düzen:

```text
Event details
  → ticket/registration options
    → order form / attendee questions
      → checkout or offline/manual payment
        → confirmation + ticket/QR
          → check-in by scan or search
            → attendance/reporting/export
```

Eventbrite’ın etkinlik oluşturma akışı etkinlik detayları, biletler, order form, onay ve yayınlama adımlarını ayırıyor: [Event creation](https://www.eventbrite.com/help/da/articles/551351/how-to-create-an-event/). Kayıt akışı bilet seçimi, kayıt bilgileri, ödeme ve bilet erişimini ayırıyor: [Checkout](https://www.eventbrite.com/help/en-us/articles/333111/). Check-in akışı QR tarama yanında manuel aramayı ve geçersiz/önceden check-in edilmiş durumları ayrı ele alıyor: [Check-in](https://www.eventbrite.com/help/en-us/articles/741083/how-to-check-in-attendees-at-the-event-with-eventbrite-organizers/).

Ekip yetkilerinde yalnız check-in yapacak personelin tüm yönetici haklarını almaması gerektiği de ürün akışının parçasıdır: [Eventbrite roles and permissions](https://www.eventbrite.com/help/en-us/articles/509534/).

Bu kaynaklardan MavenForms için çıkarım `ÖNERİ`dir; başka ürünlerin tüm özelliklerinin MavenForms’a kopyalanması değildir.

---

## 5. Önerilen bilgi mimarisi

### 5.1 İki bağlamlı shell

#### Global workspace seviyesi

Sol menü:

1. **Genel Bakış**
2. **Etkinlikler**
3. **Formlar**
4. **Kişiler ve Kayıtlar**
5. **Operasyon**
   - Check-in
   - Yaka Kartları
   - Floor Plan / Atamalar
6. **Finans ve Belgeler**
7. **Raporlar**
8. **Ekip ve Ayarlar**

“Kullanıcılar” ve “Denetim” workspace seviyesinde kalabilir. “Yaka kartı” ve “Check-in” yalnız event seçiliyken aktifleşmeli; event seçilmemişse kullanıcıya neden pasif olduğu açıklanmalıdır.

#### Event seviyesi

Event seçildiğinde shell’in üstünde kalıcı bir event bar görünmelidir:

```text
[Etkinlik seçici]  Maven Teknoloji Zirvesi 2026
[Taslak / Hazırlık]  [Yayın öncesi kontrol]  [Preview]  [Daha fazla]
```

Event içi sekmeler:

```text
Özet · Kurulum · Kayıtlar · Katılımcılar · Biletler · Yaka Kartları · Check-in · Floor Plan · İletişim · Raporlar · Event Ayarları
```

Finans ve belgeler event içi özet gösterebilir ama master ekranı global Finance & Documents altında kalmalıdır. Böylece aynı invoice işlemi form listesine tekrar gömülmez.

### 5.2 Menüde feature gate davranışı

Henüz production dışı özellikler menüde sahte aktif buton gibi görünmemelidir.

| Durum | UI davranışı |
|---|---|
| Hazır ve yerel olarak kullanılabilir | Normal link + gerçek durum. |
| Planlandı fakat faz kapısı açık değil | Link yerine “Planlandı” etiketi + açıklama + preview yok. |
| Dış bağımlılık bekliyor | “Dış kanıt bekliyor” etiketi; kullanıcı canlı açılmış zannetmemeli. |
| Yetki yok | Görünür fakat disabled yerine izin açıklaması veya rol bazlı gizleme; kritik işlemlerde server deny-by-default. |
| Event seçilmedi | Event’e bağlı menü öğesi bağlam seçme çağrısı yapmalı. |

### 5.3 Forms ekranının yeni görevi

Forms ekranı yalnız şu soruları cevaplamalıdır:

- Hangi form var?
- Hangi event’e bağlı?
- Taslak/yayında/durduruldu mu?
- Son sürüm ne zaman güncellendi?
- Kaç kayıt alındı?
- Hangi yayın öncesi kapı eksik?

Forms ekranından çıkarılacak içerikler:

- Invoice center
- manuel invoice wizard
- transactional delivery wizard
- provider/evidence alanları
- genel media safety yönetiminin tamamı

Bu içerikler kendi context ekranlarına taşınmalı; form kartında yalnız ilgili durum özeti ve derin link bulunmalıdır.

---

## 6. Ana iş akışı ve mantık kapıları

### 6.1 Event yaşam döngüsü

```text
G0 Workspace/Organization
  ↓
G1 Event oluşturma
  ↓
G2 Event kurulumunun tamamlanması
  ↓
G3 Form + EventFormBinding + yayın öncesi doğrulama
  ↓
G4 Kayıt / kişi / bilet kuralları
  ↓
G5 Ödeme veya manuel ödeme / onay / belge
  ↓
G6 Credential ve yaka kartı üretimi
  ↓
G7 Check-in / attendance
  ↓
G8 Floor plan / assignment
  ↓
G9 Raporlama / arşiv
```

### 6.2 Kapı tablosu

| Kapı | Geçmek için gerekli | Kullanıcıya gösterilecek | Geçemezse izin verilen işlem |
|---|---|---|---|
| G0 | workspace, actor, rol | “Çalışma alanınız” | yalnız yetkili ayarlar |
| G1 | event adı, timezone, tarih/occurrence, owner | event temel bilgileri | taslak kaydetme |
| G2 | venue veya online bilgisi, kayıt politikası, iletişim | kurulum checklist’i | eksik parçayı tamamlama |
| G3 | published form snapshot, EventFormBinding, zorunlu alanlar | yayın öncesi denetim | form düzenleme/preview |
| G4 | registration type, ticket/limit, duplicate policy | kayıt ayarları | test kayıt / taslak |
| G5 | fiyat/manuel ödeme seçimi, invoice policy, external evidence durumu | ödeme ve belge durumu | manuel review / draft |
| G6 | credential id, badge template version, mapping, test record | yaka kartı readiness | template düzenleme/test |
| G7 | scan/search, device/gate, duplicate policy, permission | check-in paneli | geçersiz bileti açıklama |
| G8 | plan binding, inventory/assignment, hold policy | plan ve atama durumu | taslak assignment |
| G9 | immutable audit, export policy, retention | rapor/export | yalnız izinli read/export |

### 6.3 Yayınlama kapısı

“Yayınla” butonu aşağıdakileri tek seferde kontrol etmelidir:

- form adı ve public slug;
- en az bir aktif alan;
- public snapshot üretimi;
- gerekli consent/izin metinleri;
- event binding;
- registration type ve kapasite/limit;
- ödeme varsa tutarın server tarafında hesaplanması;
- webhook veya provider durumu production kapısı değilse açık uyarı;
- bildirim sender/şablon durumu;
- PII alanlarının public snapshot’a yanlış taşınmaması;
- yaka kartı gerekiyorsa template/mapping readiness;
- bütün hata mesajlarının belirli alan ve aksiyona bağlanması.

Bu checklist’in tamamı `PASS` olmadan “yayında” statüsü verilmemelidir. Production açılışı ayrıca R-10 ve dış kanıt kapılarına bağlıdır.

---

## 7. Ekran bazlı hedef UX

### 7.1 Genel Bakış: operasyon cockpit’i

Dashboard “form sayısı” merkezli değil “bugün ne yapılmalı?” merkezli olmalıdır.

Üst bölüm:

- event seçici veya “tüm etkinlikler”;
- tarih/occurrence filtresi;
- kritik iş sayısı;
- güvenlik ve dış kanıt uyarısı.

Birincil kartlar:

1. Yayın öncesi bekleyenler
2. Yeni kayıtlar
3. İnceleme bekleyen kayıtlar
4. Ödeme/manual ödeme bekleyenler
5. Yaka kartı üretim kuyruğu
6. Bugünkü check-in
7. Floor assignment çatışmaları
8. Başarısız bildirim veya belge teslimleri

Her kartın bir gerçek aksiyonu olmalıdır. Sadece sayı gösteren kartlar azaltılmalıdır.

### 7.2 Event listesi

Tablo kolonları:

- Event adı
- tarih/occurrence
- durum
- kayıt / kapasite
- ödeme veya manuel onay özeti
- yaka kartı readiness
- check-in yüzdesi
- son değişiklik
- hızlı aksiyon

Kart görünümü yalnız mobilde veya kullanıcı seçtiğinde kalmalıdır. Varsayılan tablo, operasyonel karşılaştırmayı kolaylaştırır.

### 7.3 Event kurulum wizard’ı

Kurulum tek uzun form olmamalıdır. Beş küçük adım:

1. **Temel bilgiler:** ad, kısa açıklama, timezone, tarih/occurrence.
2. **Yer ve program:** venue, hall, online/hybrid, bağlantılı floor plan.
3. **Kayıt:** registration types, kapasite, approval, duplicate policy.
4. **Form:** mevcut form seç, yeni form oluştur veya şablondan başlat.
5. **Operasyon:** credential, badge, check-in, ekip ve rapor.

Her adımın sağ panelinde:

- tamamlananlar;
- bloklayanlar;
- “neden gerekli?” açıklaması;
- sonraki adıma geçiş koşulu bulunmalıdır.

### 7.4 Event dashboard

Ana amaç event’in sağlık durumunu tek bakışta vermektir.

```text
Event adı / durum / tarih
├─ Kurulum readiness: 8/10
├─ Kayıtlar: 248 toplam · 31 inceleme · 12 bekleme listesi
├─ Finans: 180 confirmed · 22 manuel review · 0 reconciliation exception
├─ Badge: 200 eligible · 185 generated · 15 missing mapping
├─ Check-in: 0/248
├─ Floor: 120 assigned · 4 conflict
└─ Son operasyon olayları
```

Sayılar örnektir; gerçek veri iddiası değildir.

### 7.5 Kayıtlar ve katılımcılar

İki görünüm olmalı:

- **Kayıtlar:** registration lifecycle, form cevabı, approval, ticket, payment/invoice projection.
- **Kişiler:** canonical Person, aynı kişinin event’ler arası görünümü, izinli alanlar.

Bir satırın detay drawer’ı şu bölümleri içermeli:

1. Kişi kimliği ve iletişim özeti
2. Bu event’teki registration
3. Form cevapları
4. Ticket/credential
5. Ödeme ve belge projection’ları
6. Badge preview ve template version
7. Check-in history
8. Audit timeline

Submission ham verisi kaybolmamalı; fakat kullanıcıya iş akışındaki canonical kaydın yerine geçiyormuş gibi sunulmamalıdır.

### 7.6 Form builder hedefi

Form builder üç çalışma moduna ayrılmalı:

#### A. İçerik

- alan ekle
- sıralama
- zorunluluk
- açıklama
- koşullu mantık
- validation

#### B. Görünüm

- tema
- logo/görseller
- responsive preview
- public accessibility

#### C. Event bağlantısı

- hangi event/occurrence
- hangi registration type
- hangi Person alanına map edilecek
- ticket/credential üretilecek mi
- approval ve notification politikası

Ödeme, fatura, integration ve badge operation builder’ın içine gömülmemeli; ilgili modüle bağlanan özet kartlar olmalıdır.

### 7.7 Yaka Kartları: Badge Studio

Badge Studio ayrı ana ekran olmalı ve şu yatay adımları göstermeli:

```text
1 Şablon
→ 2 Alanlar
→ 3 Eşleme
→ 4 Test kaydı
→ 5 Doğrulama
→ 6 Yayınla
→ 7 Üret
```

Sol panel: şablon/versiyon/layer listesi.  
Orta panel: canvas/preview.  
Sağ panel: seçili layer özellikleri ve data binding.  
Alt sabit bar: validation summary, kayıt sayısı, son üretim ve primary action.

### 7.8 Check-in ekranı

Check-in ekranı admin dashboard gibi görünmemeli; saha operatörünün hızlı karar vermesine göre tasarlanmalıdır.

- event/occurrence/gate seçimi;
- kamera QR scan;
- manuel ad, soyad, e-posta veya credential code araması;
- büyük, renk dışı da anlaşılır sonuçlar: Geçerli, Daha önce giriş yaptı, Bu event’e ait değil, İptal, Yetkisiz;
- badge print/reprint yetkisi ayrı;
- bağlantı koptuğunda açık offline durumu;
- son işlemler ve geri alma değil, kontrollü reversal/incident akışı;
- cihaz ve operator audit’i.

### 7.9 Floor Plan

Floor Plan ekranı event içindeki katılımcı ve inventory bağlamını göstermeli:

- plan sürümü;
- seat/booth/space durumu;
- hold/book/release;
- seçili registration/person/ticket;
- çakışma açıklaması;
- Floor Editor bağlantısının authoritative sahibi.

MavenForms kendi içinde ikinci bir floor plan gerçeği üretmemeli. Planın sahibi hangi modülse UI bunu açıkça belirtmelidir.

---

## 8. Dinamik yaka kartı sistemi

### 8.1 Girdi formatları

#### İlk sürümde kabul edilecekler

| Format | Kullanım | Doğrulama |
|---|---|---|
| PDF | baskı arka planı, tek/çift yüz | PDF parser, signature, page count, dimension, aktif içerik reddi |
| PNG | şeffaf veya lossless arka plan | PNG signature, decoder, dimensions, pixel limit |
| JPEG/JPG | fotoğrafik/flattened arka plan | JPEG signature/decoder, dimensions, EXIF normalize |
| WebP | web/modern tasarım girdisi | RIFF/WEBP signature, decoder, dimensions |

#### İlk sürümde ertelenecekler

- SVG: XML/aktif içerik/harici kaynak/renderer güvenliği için ayrı sanitize ve render politikası gerekir.
- PSD/AI/INDD: server renderer veya kullanıcı tarafı export kontratı yoksa doğrudan açılmamalı.
- Office dokümanları: badge template kullanım amacı için gereksiz genişleme.

### 8.2 Girdi ve çıktı ayrımı

Bu ayrım özellikle korunmalı:

- **Template input:** PDF/PNG/JPEG/WebP.
- **Print output:** PDF, birincil çıktı.
- **Digital output:** PNG, tekil badge veya preview.
- **Optional image output:** JPEG, yalnız kullanıcı seçerse; QR ve küçük metin için PNG/PDF önerilir.
- **Batch output:** ZIP içinde çıktı dosyaları + güvenli manifest/CSV; manifest PII politikasıyla sınırlı olmalı.

JPEG’i varsayılan çıktı yapmak doğru değildir; kayıplı sıkıştırma QR ve küçük metin kalitesini bozabilir. Baskı için PDF, dijital görsel için PNG birincil öneridir.

### 8.3 Şablon nesnesi

Önerilen kavramsal model:

```text
BadgeTemplate
├─ templateId
├─ eventId / formId binding
├─ name
├─ status: DRAFT | VALIDATED | PUBLISHED | ARCHIVED
├─ activeVersionId
└─ versions[]
   ├─ versionId
   ├─ sourceAsset
   │  ├─ originalMime
   │  ├─ originalName
   │  ├─ checksum
   │  └─ private storage key
   ├─ normalizedAsset
   │  ├─ mime
   │  ├─ widthPx/heightPx or widthPt/heightPt
   │  ├─ pageCount
   │  └─ print metadata
   ├─ canvas
   ├─ safeArea
   ├─ faces: front/back
   ├─ layers[]
   ├─ fieldMappings[]
   ├─ validationSummary
   └─ publishedAt / publishedBy
```

Orijinal asset değişmez; normalize edilmiş render asset’i yeniden üretilebilir olmalıdır. Template version immutable olmalıdır. Yeni tasarım mevcut sürümü overwrite etmez, yeni version oluşturur.

### 8.4 Layer türleri

Minimum layer seti:

| Layer | Açıklama |
|---|---|
| `static_text` | Şablonda her badge için aynı kalan metin |
| `static_image` | logo veya sabit grafik |
| `dynamic_text` | registration/person/event verisinden gelen metin |
| `dynamic_image` | izinli profile/logo asset referansı; default fallback gerekli |
| `qr` | credential/ticket doğrulama kodu; vector üretim |
| `barcode` | yalnız gerçek ihtiyaç ve scanner testi varsa |
| `conditional_group` | registration type/role gibi güvenli koşula göre görünürlük |
| `shape` | çerçeve, arka plan, ayraç |

İlk sürümde arbitrary HTML/CSS veya kullanıcı tarafından çalıştırılan script layer’ı kabul edilmemelidir.

### 8.5 Dinamik alan sözleşmesi

Şablonun doğrudan ham submission JSON’una bağlanması yerine güvenli canonical binding kullanılmalıdır.

Örnek data tag’ler:

```text
{{event.name}}
{{event.occurrenceDate}}
{{person.firstName}}
{{person.lastName}}
{{person.company}}
{{person.title}}
{{registration.type}}
{{registration.id}}
{{ticket.code}}
{{credential.qr}}
{{floor.assignmentLabel}}
```

Bağlama kuralları:

- e-posta, telefon, ödeme, kart, parola, token, admin/internal ve encrypted alanlar varsayılan olarak yaka kartı field palette’inde görünmemeli;
- raw answer yalnız yetkili mapping ile güvenli public/display alanına dönüşmeli;
- her alan için fallback, maksimum karakter, satır sayısı, overflow stratejisi bulunmalı;
- “truncate” sessizce uygulanmamalı; preview ve batch validation’da raporlanmalı;
- `<script>` gibi metinler escaped veya plain text olarak render edilmeli;
- değer yoksa boş alan mı, fallback mi, üretimi bloke mi kararı layer üzerinde explicit olmalı.

### 8.6 Snapshot ilkesi

Yaka kartı üretildiği anda şu snapshot tutulmalıdır:

- event ve occurrence;
- Person canonical ID;
- Registration ID ve registration status;
- Ticket/Credential ID;
- template ID + version ID;
- field mapping sürümü;
- render input checksum;
- üretim zamanı ve actor/job ID.

Kişinin daha sonra adı değiştiğinde eski basılmış badge kendiliğinden geriye dönük değişmemeli. Yeniden basım explicit bir iş emri olmalıdır.

### 8.7 Yaka kartı üretim durumları

```text
TEMPLATE_DRAFT
  → TEMPLATE_VALIDATED
    → TEMPLATE_PUBLISHED
      → RECORD_ELIGIBLE
        → PREVIEW_READY
          → GENERATION_QUEUED
            → GENERATED
              → SCAN_PASSED
                → READY
```

Hata durumları:

- `UPLOAD_REJECTED`
- `SCAN_PENDING`
- `ACTIVE_CONTENT_REJECTED`
- `MAPPING_MISSING`
- `VALUE_MISSING`
- `TEXT_OVERFLOW`
- `QR_RENDER_FAILED`
- `OUTPUT_BLOCKED`
- `DELIVERY_FAILED`

İşlem butonu yalnız üstteki durumdan izin verilen bir sonraki adıma geçmelidir. Renk tek başına durum anlamı taşımamalıdır.

---

## 9. Yaka kartı upload UX’i

### 9.1 Upload paneli

Panel kullanıcıya ilk bakışta şunları söylemeli:

```text
Şablon dosyası yükle
PDF, PNG, JPG/JPEG veya WebP
Maksimum boyut: ürün politikası içindeki değer
Tek veya çift yüz tasarımı desteklenir
Dosya özel alanda tutulur ve doğrulama tamamlanmadan kullanıma açılmaz
```

Sürükle-bırak yanında normal “Dosya seç” butonu olmalıdır. `accept` yalnız rehberdir; server sonucu asıl karardır.

### 9.2 Yükleme sonrası dört görünür durum

| Durum | Kullanıcı mesajı | Aksiyon |
|---|---|---|
| Yükleniyor | “Dosya alınıyor” | iptal mümkünse kontrollü iptal |
| Doğrulanıyor | “Dosya türü ve tasarım ölçüsü kontrol ediliyor” | bekle; tekrar upload etme |
| Tarama bekliyor | “Güvenlik taraması tamamlanmadan kullanılamaz” | başka ayara geçilebilir, aktif edilemez |
| Hazır | “Şablon kullanılabilir” | preview, field mapping, yeni version |
| Reddedildi | neden + düzeltme | yeni dosya yükle |

### 9.3 Reddedilme mesajları

Kullanıcıya yalnız “415” veya “PDF gerekli” gösterilmemeli.

Örnekler:

- “Bu dosyanın uzantısı JPEG, içeriği JPEG olarak doğrulanamadı.”
- “PDF içinde etkin içerik bulunduğu için şablon olarak kullanılamadı.”
- “Dosyanın görsel boyutu ürün sınırını aşıyor.”
- “Şablonda 3 sayfa var; bu akış en fazla 2 yüz kabul ediyor.”
- “Dosya yüklendi, fakat güvenlik taraması tamamlanmadı. Şimdi kullanıma açılamaz.”

### 9.4 Preview

Preview gerçek bir örnek registration ile çalışmalıdır:

- boş/default değerli preview yalnız yerleşim içindir;
- “örnek kayıt” preview’si gerçek kayıt olarak saklanmamalı;
- bir gerçek yetkili registration seçildiğinde PII uyarısı ve audit yazılmalı;
- front/back toggle;
- 100% ve fit-to-screen görünümü;
- text overflow, missing mapping ve QR contrast uyarıları;
- PDF/PNG output preview;
- JPEG ancak export seçildiğinde gösterilmeli.

---

## 10. Güvenli dosya sözleşmesi

### 10.1 Server doğrulama sırası

```text
1. auth + workspace/event/form scope
2. request size / quota / rate limit
3. allowlisted extension
4. raw bytes signature
5. MIME consistency check (kanıt değil, ek kontrol)
6. parser/decoder load
7. dimensions/page count/pixel limit
8. active content / embedded content policy
9. checksum
10. private quarantine storage
11. AV/safety scan status
12. normalized render derivative
13. manifest + immutable version
14. yalnız READY ise aktif template
```

### 10.2 Dosya manifest’i

Önerilen manifest alanları:

```text
assetId
templateId
versionId
workspaceId
eventId / formId
originalName (display only)
originalMime
detectedMime
extension
sizeBytes
sha256
widthPx / heightPx
widthPt / heightPt
pageCount
orientation
sourceStorageKey
normalizedStorageKey
scanStatus
visibility
validationStatus
createdBy
createdAt
```

`originalName` storage path veya SQL identifier olmamalıdır. Storage key uygulama tarafından oluşturulmalıdır.

### 10.3 Görsel normalizasyonu

PNG/JPEG/WebP için:

- EXIF orientation normalize edilmeli;
- mümkünse renk profili render çıktısında deterministik hale getirilmeli;
- çok büyük pixel canvas reddedilmeli veya ürün politikasıyla kontrollü küçültülmeli;
- alpha/transparent background davranışı explicit olmalı;
- WebP/JPEG kaynak için baskı PDF’ine dönüştürülürken resolution/quality politikası test edilmeli;
- normalized asset checksum’u ayrı tutulmalı.

Bu dönüşüm “güvenlik taraması” yerine geçmez.

---

## 11. Önerilen API ve veri sınırı

Bu bölüm implementasyon emri değil, yeni packet’ler için minimal sözleşme taslağıdır.

### 11.1 Mevcut route’ların dönüşümü

| Mevcut | Hedef |
|---|---|
| `POST /api/forms/:id/badges/templates` | Form scope korunur; PDF/image input ortak validator’dan geçer. |
| `GET /api/forms/:id/badges/templates/catalog` | Sürüm ve validation/readiness özeti döner. |
| `POST /api/forms/:id/badges/templates/selection` | Aktif template version event/form binding ile birlikte seçilir. |
| badge mapping endpoint’leri | Mapping canonical field palette ve allowed source ile doğrulanır. |
| badge generation/export | output format explicit; PDF/PNG/JPEG/ZIP policy ile ayrılır. |
| `/api/media` | genel medya; badge template kaydı değildir. UI bunu ayırır. |

### 11.2 Yeni ihtiyaçlar

Önerilen yeni komut/query yüzeyleri:

- `GET /api/events/:id/readiness`
- `GET /api/events/:id/registrations`
- `GET /api/events/:id/badge-templates`
- `POST /api/events/:id/badge-templates/:templateId/versions`
- `POST /api/events/:id/badge-templates/:templateId/validate`
- `POST /api/events/:id/badge-templates/:templateId/preview`
- `POST /api/events/:id/badges/generate`
- `GET /api/events/:id/badges/jobs/:jobId`

İsimler değişebilir; önemli olan `formId`’ye sıkışmış yaka kartı işleminin Event/Registration/Person/Credential bağlamına taşınmasıdır.

### 11.3 Idempotency ve audit

Şablon publish, batch generate, reprint ve check-in mutation’larında:

- actor;
- organization/workspace/event scope;
- idempotency key;
- correlation ID;
- template version;
- input/output checksum;
- audit event;
- retry sonucu

olmalıdır. Üretim iki kez çağrıldığında duplicate credential veya duplicate artifact oluşmamalıdır.

---

## 12. Tasarım sistemi ve kullanıcı dostu davranış

### 12.1 Yoğunluk

Event operations veri yoğundur; fakat her şeyi aynı kartta göstermek kullanıcı dostu değildir.

- liste ekranlarında tablo varsayılanı;
- detayda drawer veya iki kolon;
- önemli primary action tek tane;
- ikincil aksiyonlar “Daha fazla” altında;
- aynı ekran içinde en fazla bir modal akışı;
- connection wizard’ları bağımsız sayfa veya drawer;
- breadcrumb: Workspace → Event → Modül → Kayıt.

### 12.2 Durum dili

“Hazır”, “Yerel olarak doğrulandı”, “Dış kanıt bekliyor”, “Kullanıma kapalı”, “Üretim bekliyor” birbirinden farklıdır.

Şu kelimeler tek başına kullanılmamalı:

- live
- delivered
- paid
- issued
- secure
- ready

Her biri kanıt sözlüğündeki tanımı ve UI açıklamasıyla kullanılmalıdır.

### 12.3 Empty/loading/error/success

Her liste ve wizard şu dört hali tasarlanmış olarak teslim edilmeli:

- empty: neden boş ve ilk aksiyon;
- loading: hangi veri bekleniyor;
- error: yeniden dene + hata kimliği + kullanıcı aksiyonu;
- success: ne değişti, hangi kaynağa gidilebilir.

Toast yalnız başına iş akışı sonucu olmamalı; özellikle upload, publish, payment, generation ve check-in sonuçları kalıcı inline status da taşımalıdır.

### 12.4 Responsive davranış

- Desktop: sidebar + event context + tablo/canvas.
- Tablet: daraltılmış sidebar + iki kolon.
- Mobile: operasyon odaklı büyük action’lar, scan/search, liste ve detay stack.
- Badge Studio’nun tam canvas düzenleme deneyimi mobile’a zorlanmamalı; mobilde preview, mapping doğrulama ve üretim durumu desteklenmeli.
- Check-in mobile-first olmalı.

### 12.5 Erişilebilirlik hedefi

İlk kabul hedefi WCAG 2.2 AA’ya yaklaşan ürün içi gate’lerdir; yalnız screenshot ile tam WCAG uyumluluğu iddia edilmez.

Zorunlu testler:

- keyboard-only builder;
- visible focus;
- modal focus lifecycle;
- table row/details keyboard path;
- live region ile upload/scan/generation status;
- text + icon + pattern ile status;
- 200% zoom ve reflow;
- minimum pointer target ve touch spacing;
- form labels, errors, instructions;
- reduced motion.

---

## 13. Uygulama fazları

Bu sıra mevcut F0–F9 yol haritasının yerine geçmez; UX uygulama dilimidir.

### UX-0 — Gerçeklik ve IA kilidi

**Amaç:** Yeni ekran yazmadan sınırları kesinleştirmek.

Çıktılar:

- Event-first sitemap;
- global/event context ayrımı;
- current screen → target screen mapping;
- status language dictionary;
- feature gate matrix;
- mevcut route/model yeniden kullanım tablosu;
- ekranlarda aynı anda render edilen ilgisiz wizard envanteri.

Kabul:

- hiçbir yeni ana navigation öğesi plansız eklenmez;
- F1–F5 domain sahipleriyle çelişki yok;
- V4/SaaS ekranı açılmaz;
- plan ayrı bir implementation packet’e bağlanır.

### UX-1 — Shell ve Event context

**Amaç:** Kullanıcının nerede çalıştığını her zaman anlaması.

Kapsam:

- Event list;
- event switcher;
- global/event breadcrumb;
- feature gate status;
- topbar title ve search context;
- sidebar’daki forms-only varsayımının kaldırılması.

Kabul:

- event seçmeden event-owned mutation yapılamaz;
- URL/deep-link event context’i kaybetmez;
- yetki yoksa server ve UI aynı sonucu verir;
- mevcut form URL’leri bozulmaz veya kontrollü redirect edilir.

### UX-2 — Event setup/readiness

**Amaç:** Event oluşturma ve yayınlama kapılarını tek checklist’te toplamak.

Kapsam:

- event wizard;
- occurrence/venue;
- form binding;
- registration settings;
- readiness endpoint/read model;
- publish preflight.

Kabul:

- her blocker gerçek bir kaynağa bağlanır;
- “yayınla” eksik kapıyı açıklamadan geçmez;
- test/mock sonucu live/provider kanıtı diye etiketlenmez.

### UX-3 — Registration ve Person görünümü

**Amaç:** Submission’ı canonical registration’ın yerine kullanma hatasını bitirmek.

Kapsam:

- registration inbox;
- person detail;
- form response drawer;
- ticket/order/payment/invoice projection;
- approval/rejection/waitlist aksiyonları.

Kabul:

- PII görünürlükleri role göre uygulanır;
- raw submission korunur;
- lifecycle state ile finance state karıştırılmaz;
- audit timeline vardır.

### UX-4 — Badge Studio ve çoklu format

**Amaç:** PDF-only, tek yüz, sabit alan sınırından güvenli ve dinamik template pipeline’a geçmek.

Kapsam:

- template input allowlist;
- parser/decoder validation;
- private/quarantine/scan/ready states;
- template version;
- canvas/layers;
- canonical field mapping;
- front/back;
- test registration preview;
- PDF + PNG primary outputs;
- optional JPEG export;
- batch generation job.

Kabul:

- PNG/JPEG/WebP gerçek test fixture ile kabul edilir;
- hatalı signature/MIME/parser/size/dimension reddedilir;
- active PDF content reddedilir;
- image template file path ve manifest extension’ı doğru tutulur;
- mapping eksikliği üretimi bloklar veya explicit fallback gösterir;
- QR vector/quiet zone/contrast kontrolü vardır;
- eski PDF akışı geriye dönük bozulmaz;
- artifact state READY olmadan download açılmaz.

### UX-5 — Check-in ve Floor Plan

**Amaç:** Event günü operasyonunu admin CRUD’dan ayırmak.

Kapsam:

- scan/search;
- duplicate/invalid;
- device/gate;
- offline sınırı;
- badge reprint permission;
- floor plan assignment ve conflict.

Kabul:

- check-in personeli event admin yetkisine sahip olmak zorunda değildir;
- aynı credential iki kez işlem gördüğünde durum açıklanır;
- Floor Editor authoritative sahibi korunur;
- offline gerçekliği ayrıca test edilir.

### UX-6 — Finance, documents, reports

**Amaç:** Form ekranını invoice/finance ekranından ayırmak.

Kapsam:

- order/payment/invoice projection;
- manual payment review;
- document-ready/delivery;
- event report/export;
- reconciliation exception.

Kabul:

- payment, invoice, delivery ayrı durum olarak görünür;
- dış provider yoksa “local pass” ile paid/issued denmez;
- export PII ve role policy’sini uygular.

### UX-7 — QA ve saha kanıtı

**Amaç:** Yeni arayüzün yalnız güzel görünmesini değil, gerçek akışta çalışmasını doğrulamak.

Kapsam:

- desktop/tablet/mobile screenshot;
- keyboard/a11y;
- upload fixture matrix;
- badge print/scan test;
- check-in dry run;
- backup/restore;
- gerçek kullanıcı pilotu;
- R-10 dış kanıtları.

Kabul:

- local PASS, pilot PASS, provider PASS ve production GO ayrı raporlanır;
- test fixture ile gerçek müşteri verisi karıştırılmaz;
- başarısız senaryo da raporlanır.

---

## 14. Test ve kanıt matrisi

### 14.1 Badge template fixture matrisi

| Fixture | Beklenen |
|---|---|
| geçerli tek sayfa PDF | kabul, private manifest |
| geçerli iki yüz PDF | kabul, face/page metadata |
| PDF JavaScript/OpenAction | red |
| geçerli PNG | kabul, normalized image |
| geçerli JPEG/JPG | kabul, EXIF normalize |
| geçerli WebP | kabul, decoder metadata |
| extension PNG, bytes JPEG | policy kararı; sessiz kabul yok |
| MIME image/png, bytes PDF | red veya explicit canonical detected MIME |
| bozuk PNG/JPEG | red |
| oversized bytes | red |
| oversized pixel canvas | red |
| 3 sayfa PDF | red veya ürün kararı; sessizce ilk sayfayı alma yok |
| path traversal filename | storage key etkilenmemeli |
| duplicate upload | checksum/version policy açık olmalı |
| scan pending | aktif seçim/download kapalı |
| missing mapped value | preview warning; batch policy uygulanır |
| text overflow | preview ve generation gate |
| QR düşük contrast/quiet zone | gate fail |

### 14.2 UI akış matrisi

| Akış | Masaüstü | Mobil | Klavye | Yetki | Audit |
|---|---:|---:|---:|---:|---:|
| Event oluşturma | ✓ | temel | ✓ | ✓ | ✓ |
| Form bind etme | ✓ | temel | ✓ | ✓ | ✓ |
| Registration approve | ✓ | ✓ | ✓ | ✓ | ✓ |
| Template upload | ✓ | ✓ | ✓ | ✓ | ✓ |
| Mapping | ✓ | preview | ✓ | ✓ | ✓ |
| Badge batch generate | ✓ | durum | ✓ | ✓ | ✓ |
| QR check-in | ✓ | ✓ | temel | ✓ | ✓ |
| Manual search check-in | ✓ | ✓ | ✓ | ✓ | ✓ |
| Floor assignment | ✓ | durum | ✓ | ✓ | ✓ |
| Finance review | ✓ | read-only | ✓ | ✓ | ✓ |

### 14.3 Production dışı sınırlar

Şu ifadeler test sonucu olarak yazılmamalıdır:

- “PDF üretildi, o halde yazıcıda doğru basılır.”
- “QR render edildi, o halde saha scanner’ı kabul eder.”
- “Local scanStatus clean, o halde gerçek AV taraması yapıldı.”
- “Provider-neutral adapter var, o halde ödeme alınabilir.”
- “UI’da buton görünüyor, o halde işlem yetkili ve çalışır.”

Her rapor `LOCAL_PASS`, `PILOT_PASS`, `EXTERNAL_DEPENDENCY`, `UNVERIFIED`, `NO_GO` ayrımını korumalıdır.

---

## 15. Karar kaydı: kabul, sadeleştirme, erteleme

### ACCEPTED

- Event-first navigation ve event context.
- Formların EventFormBinding ile bağlanması.
- Registration/Person/Ticket/Credential/Check-in ayrımının UI’da görünür olması.
- Yaka kartının ayrı Badge Studio akışı.
- PDF korunarak PNG/JPEG/WebP template input desteği.
- Private/quarantine/scan/ready upload durumları.
- Immutable template version.
- Canonical dynamic field mapping ve record snapshot.
- PDF primary print output; PNG primary digital output.
- Keyboard, error identification, focus, modal ve labels gate’leri.
- Check-in rolünün event admin’den ayrılması.

### SIMPLIFIED

- İlk badge Studio’da arbitrary freeform design editor yerine güvenli layer/placement modeli.
- İlk sürümde sınırlı field palette; raw JSON token erişimi yok.
- İlk sürümde PDF/PNG ana çıktı; JPEG yalnız explicit export.
- İlk sürümde WebP input var, SVG yok.
- Dashboard tam analitik ürünü değil, readiness + action cockpit.
- Floor Plan UI, Floor Editor’ın authoritative modelini çoğaltmıyor.

### DEFERRED

- SVG/PSD/AI/INDD doğrudan template import.
- SaaS tenant provisioning, custom domain, tenant billing.
- Canlı Paraşüt otomasyonu.
- Tam mobil attendee app.
- Advanced abstract/review, sponsor/exhibitor ve networking modülleri.
- Tam drag-and-drop design system ile arbitrary style scripting.
- Gerçek zamanlı çok kullanıcılı canvas collaboration.

### BLOCKED / EXTERNAL_DEPENDENCY

- Gerçek AV/quarantine servisi.
- Gerçek object storage ve signed URL altyapısı.
- Gerçek yazıcı profili/print UAT.
- Saha QR scanner ve offline cihaz testi.
- Canlı payment/provider, sender-domain ve e-belge kanıtı.
- Hukuk/mali müşavir onayı: KVKK saklama, belge ve iletişim politikaları.

---

## 16. Riskler ve doğru sadeleştirme

### Risk: Her şeyi tek büyük redesign sprintine almak

**Karar:** `DEFERRED`. Önce shell + event context + readiness; sonra badge. Tüm ekranları aynı anda değiştirmek regresyon ve kanıt kaybı yaratır.

### Risk: Yaka kartını generic media ile çözmek

**Karar:** `REJECTED`. Generic media asset, template version, field mapping, page face, print dimension ve generation job kavramlarını taşımaz.

### Risk: PDF’yi resme çevirip her şeyi çözmek

**Karar:** `SIMPLIFIED`, fakat sınırı var. PDF background’ı rasterize etmek preview’ı kolaylaştırabilir; ancak baskı kalitesi, text/vector semantics, page size ve active content policy ayrıca korunmalıdır.

### Risk: Her form alanını badge’e açmak

**Karar:** `REJECTED`. PII, payment, admin ve internal alanların accidental export riski vardır. Allowlist mapping gerekir.

### Risk: Canlı veriyi sürekli badge’e yansıtmak

**Karar:** `REJECTED`. Üretilmiş badge snapshot tabanlı olmalı; yeniden basım explicit aksiyon olmalıdır.

### Risk: “Local PASS” ile production hazır demek

**Karar:** `BLOCKED`. Mevcut STATUS.md’de de R-10 NO-GO ve production kapalıdır; yeni UX bunu aşamaz.

### Risk: Büyük menü eklemek

**Karar:** `SIMPLIFIED`. Menüde yalnız gerçek kullanıcı iş akışları ve gate durumları gösterilir; her domain için erken ekran açılmaz.

---

## 17. Uygulama öncesi dosya/packet önerisi

Bu belge tek başına kod değişikliği emri değildir. Uygulama başlamadan önce aşağıdaki küçük packet’ler ayrı ayrı açılmalıdır:

| Packet | Tek ölçülebilir çıktı | Muhtemel ana dosyalar |
|---|---|---|
| `UX-SHELL-01` | Event context ve global/event navigation | `app-shell`, `sidebar`, `topbar`, store/router testleri |
| `UX-EVENT-01` | Event list + readiness read model | event route/read model, event views, contract test |
| `UX-REG-01` | Registration/person detail görünümü | registration/person DTO ve view/test |
| `BADGE-INPUT-01` | PDF/PNG/JPEG/WebP validator + storage manifest | badge contract/storage/upload route/tests |
| `BADGE-STUDIO-01` | Template version + layer/mapping UX | badge view/components, mapping contract/tests |
| `BADGE-OUTPUT-01` | PDF/PNG export + snapshot/job | artifact contract/generation tests |
| `ONSITE-01` | Check-in operator screen | check-in view/routes/tests |
| `FLOOR-01` | Event/participant plan binding view | floor integration view/contract tests |
| `UX-QA-01` | Responsive, keyboard, upload fixture and dry-run evidence | tests, screenshots, receipts |

Her packet:

- en fazla tek ölçülebilir çıktı;
- 15 dakikalık mikro dilim;
- explicit `allowedFiles`;
- gerçek kaynak/test reads;
- acceptance ve fail path;
- `workflow begin` ve `workflow verify`;
- local PASS ile external evidence ayrımı

taşımalıdır.

---

## 18. Uygulanmaması gerekenler

- Formlar ekranına yeni bir “Event” sekmesi ekleyip eski bilgi mimarisini aynen bırakmak.
- Yaka kartı upload’ında yalnız `accept` özelliğini değiştirmek.
- PNG/JPEG’i PDF dosya adına kaydetmek.
- Görünen preview’ı güvenlik taraması yerine saymak.
- Event ve registration yerine `folderId` ve `Submission` üzerinden kalıcı ürün modelini sürdürmek.
- Fatura/ödeme/evidence wizard’larını forms listesinde aynı anda göstermek.
- Tüm data field’larını tek dropdown’da açmak.
- Her çıktıyı JPEG üretmek.
- Template’i overwrite ederek geçmiş badge’lerin hangi tasarımla üretildiğini kaybetmek.
- “Yayınla”yı yalnız alan sayısı > 0 kontrolüyle açmak.
- Check-in personeline admin yetkisi vermek.
- F9/SaaS UI’sını R-10 ve önceki fazlar kapanmadan açmak.

---

## 19. Son karar

MavenForms için gerekli iş bir “renk/font değişikliği” değil, **event-first IA ve operasyon akışının yeniden sınırlandırılmasıdır**.

Doğru minimum ürün sırası:

```text
1. Event context ve shell
2. Event readiness
3. Registration/Person görünümü
4. Form–Event binding
5. Badge Studio + güvenli çoklu format upload
6. Dinamik snapshot tabanlı badge üretimi
7. Check-in
8. Floor plan binding
9. Ayrı Finance/Documents/Reports
10. Pilot ve dış kanıt
```

Yaka kartı özelinde net cevap:

- PDF desteği korunacak.
- PNG/JPEG/JPG/WebP template input desteği eklenecek.
- Generic media upload ile badge template upload ayrılacak.
- Server signature/decoder/size/dimension/active content doğrulaması yapılacak.
- Dosya private/quarantine/scan/ready zincirinden geçecek.
- Template version immutable olacak.
- Alanlar canonical event/person/registration/ticket/credential kaynaklarına map edilecek.
- Gerçek kayıtla preview yapılacak.
- PDF baskı, PNG dijital çıktı; JPEG yalnız explicit export olacak.
- Her batch üretim template version + mapping + record snapshot ile auditlenecek.

Bu çalışma dosyasından sonraki güvenli adım, `UX-SHELL-01` ve `BADGE-INPUT-01` için ayrı READY packet açıp önce bilgi mimarisi ve template validator sözleşmesini küçük, ölçülebilir dilimlerde uygulamaktır. Bu öneri mevcut production açılış kararını değiştirmez.

---

## 20. Kaynaklar

### Yerel ana plan ve kod kanıtı

- [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md)
- [`STATUS.md`](STATUS.md)
- [`MavenForms ana planı – oku beni`](docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/00_OKU_BENI.md)
- [`MavenForms kapsam uyumu`](docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/04_MAVENFORMS_KAPSAM_UYUMU.md)
- [`Hedef mimari`](docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/05_HEDEF_MIMARI.md)
- [`Kanonik veri modeli`](docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/06_KANONIK_VERI_MODELI.md)
- [`Yol haritası`](docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/11_YOL_HARITASI.md)
- [`Badge template upload route`](src/app/api/forms/[id]/badges/templates/route.ts)
- [`Badge template contract`](src/lib/badge-template-contract.ts)
- [`Badge template storage`](src/lib/badge-template-storage.ts)
- [`Badge field mapping`](src/lib/badge-field-mapping.ts)
- [`Badge front render contract`](src/lib/badge-front-render-contract.ts)
- [`Form media route`](src/app/api/forms/[id]/media/route.ts)

### Resmî standart ve ürün kaynakları

- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WAI-ARIA Dialog Modal Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [WAI-ARIA Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [MDN `accept` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/accept)
- [W3C PNG Specification](https://www.w3.org/TR/png-3/)
- [ISO 32000-1 PDF 1.7](https://www.iso.org/standard/51502.html)
- [ITU-T T.81 JPEG reference](https://www.itu.int/ITU-T/recommendations/rec.aspx?id=2633)
- [Eventbrite event creation](https://www.eventbrite.com/help/da/articles/551351/how-to-create-an-event/)
- [Eventbrite checkout](https://www.eventbrite.com/help/en-us/articles/333111/)
- [Eventbrite check-in](https://www.eventbrite.com/help/en-us/articles/741083/how-to-check-in-attendees-at-the-event-with-eventbrite-organizers/)
- [Eventbrite roles and permissions](https://www.eventbrite.com/help/en-us/articles/509534/)
- [Cvent Event Badge Printing](https://www.cvent.com/en/event-marketing-management/event-badge-printing)

**Araştırma tarihi:** 18 Eylül 2026. Resmî ürün dokümanlarının plan/sürüm/ülke koşulları değişebilir; bu nedenle ürün desenleri MavenForms için doğrudan özellik taahhüdü değil, karar girdisidir.

---

## 21. F0–F9 sırasını koruyan yürütme planı

Bu bölüm, yukarıdaki UX kararlarını ana planın teknik fazlarına bağlar. `UX-0…UX-7` bir ürün fazı değildir; ilgili F0–F9 fazının içinde yürüyen kullanıcı arayüzü ve operasyon dilimidir. Ana sıra değişmez:

```text
F0 Gerçeklik ve paket bütünlüğü
→ F1 Tek şirket Event Core
→ F2 Sipariş ve manuel ödeme
→ F3 Manuel fatura kontrolü
→ F4 İç şirket pilotu ve onsite
→ F5 Floor Editor entegrasyonu
→ F6 Canlı ödeme dalgası
→ F7 Otomatik fatura/e-belge
→ F8 Event modülleri
→ F9 Multi-Tenant son kapı
```

### 21.1 Her mikro faz için değişmez çalışma döngüsü

Her satır ayrı bir READY packet veya onun altında 15 dakikalık alt packet olarak yürütülür. Bir packet tek invariant, tek sözleşme veya tek görünür kullanıcı çıktısı taşır.

1. `begin`: packet baseline’ı alınır; dirty worktree korunur.
2. `read`: yalnız packet `reads` alanı, doğrudan import/call site ve ilgili test okunur.
3. `test`: önce başarısız veya eksik davranışı gösteren en küçük test/fixture yazılır.
4. `implement`: mevcut contract ve helper yeniden kullanılarak en küçük güvenli değişiklik yapılır.
5. `verify`: typecheck/lint/test/build/readiness ve packet checks çalıştırılır.
6. `evidence`: değişen dosyalar, komutlar, sonuçlar, kanıt sınıfı ve kalan dış bağımlılık receipt’e yazılır.
7. `close`: yalnız kabul şartları sağlandıysa `LOCAL_PASS`; aksi halde aynı fazda düzeltme veya açık `UNVERIFIED` kaydı.
8. `next`: yalnız önceki fazın yerel çıkış kapısı geçildiyse bir sonraki faza geçilir.

Bir UI ekranı, mock, local fixture veya başarılı HTTP cevabı tek başına ürün özelliği kanıtı değildir. Server authorization, scope, idempotency, audit ve gerçek mutation zinciri yoksa iş “arayüz tamamlandı” diye kapatılamaz.

### 21.2 Kanıt statüleri

| Statü | Ne demektir? | Sonraki faza etkisi |
|---|---|---|
| `SOURCE_CONFIRMED` | Kod, plan veya contract doğrudan bulundu. | Tasarım girdisidir; tamamlanma değildir. |
| `LOCAL_PASS` | Yerel test/check/build ve packet kabulü geçti. | Yerel sonraki dilime izin verir. |
| `PILOT_PASS` | Kontrollü iç etkinlik veya saha dry-run’ı geçti. | İlgili pilot kapısını açar. |
| `EXTERNAL_DEPENDENCY` | Provider, AV, storage, sender, muhasebe, hukuk veya staging gerekir. | Dış kanıt bekler; local implementasyon tamamlanabilir, production açılmaz. |
| `UNVERIFIED` | Yeterli kanıt yok. | Faz kapısı geçmez. |
| `NO_GO` | Açılması yasak veya güvenli değil. | Tüm production/tenant açılışını fail-closed tutar. |

`LOCAL_PASS`, `PILOT_PASS` veya production `GO` yerine kullanılamaz. Dış bağımlılık bekleyen bir faz için yerel contract, hata/ready durumları, testler ve UI açıklamaları tamamlanabilir; dış sistem kanıtı uydurulamaz.

### 21.3 Faz ve küçük çıktı sırası

| Ana faz | Küçük çıktı sırası | Yerel tamamlanma çıktısı | Zorunlu doğrulama ve çıkış kapısı |
|---|---|---|---|
| **F0** | `F0-UX-01` gerçeklik envanteri; `F0-UX-02` Event-first route/domain sözlüğü; `F0-UX-03` test/evidence sınıfları; `F0-UX-04` UI baseline ve erişilebilirlik smoke | Kanonik kaynak, feature-preservation matrisi, test sınıfları ve başlangıç ekran kanıtı | `context-check`, test runner, secret scan, ilgili UI smoke; F0 status çelişkisi kalmaz. |
| **F1** | `F1-UX-01` global shell + workspace; `F1-UX-02` event context; `F1-UX-03` event list/create; `F1-UX-04` readiness read model; `F1-UX-05` Form–Event binding; `F1-UX-06` Person/Registration inbox/detail | Event seçilmeden event-owned mutation yapılamayan, event/form/person/registration ilişkisi açık Event workspace | API contract, organization scope negatifleri, binding/snapshot, duplicate/retry/unauthorized/failure testleri, Postgres restore kanıtı |
| **F2** | `F2-UX-01` ticket/catalog/order görünümü; `F2-UX-02` manual payment review; `F2-UX-03` allocation; `F2-UX-04` duplicate/partial/overpayment/reversal ekran durumları; `F2-UX-05` Finance ayrımı | Form ekranından ayrılmış, order/payment ledger ve review durumlarını gösteren Finance yüzeyi | DB integration: tam/kısmi/overpayment, split allocation, duplicate reference, reversal, audit/export equality |
| **F3** | `F3-UX-01` Invoice Request merkezi; `F3-UX-02` recipient/line validation; `F3-UX-03` document quarantine/decision; `F3-UX-04` controlled delivery/resend; `F3-UX-05` invoice relation/export | Finance & Documents içinde manuel fatura yaşam döngüsü; forms listesine gömülmeyen belge durumu | mismatch rejection, resend idempotency, relation integrity, document decision ve export reconciliation |
| **F4** | `F4-UX-01` ticket/credential/badge binding; `F4-UX-02` PDF/PNG/JPEG/WebP validator; `F4-UX-03` private/quarantine/scan/ready manifest; `F4-UX-04` Badge Studio versioning; `F4-UX-05` allowlist field mapping; `F4-UX-06` preview/overflow/QR gates; `F4-UX-07` snapshot batch generation; `F4-UX-08` check-in scan/search; `F4-UX-09` operator audit | Badge Studio, güvenli çoklu format upload, dinamik snapshot üretimi ve temel onsite ekranı | Fixture + contract + route + UI tests; duplicate/invalid/offline check-in; credential mapping; gerçek iç dry-run dış kanıt olarak ayrıca tutulur |
| **F5** | `F5-UX-01` event/participant plan binding; `F5-UX-02` inventory/assignment; `F5-UX-03` hold/book/release; `F5-UX-04` conflict/recovery görünümü | Floor Plan UI, Floor Editor’ın authoritative modelini çoğaltmadan event/participant kimliğiyle bağlanır | hold expiry, concurrent hold, idempotent book, early release, paid-booking recovery, version conflict testleri |
| **F6** | `F6-UX-01` hosted payment readiness; `F6-UX-02` webhook inbox/status; `F6-UX-03` retrieve/refund states; `F6-UX-04` reconciliation dashboard; `F6-UX-05` canary gate | Provider-neutral UI, signed webhook/retrieve/refund/reconciliation contract’ları ve güvenli bekleme durumları | signature, delayed/out-of-order/duplicate webhook, retrieve mismatch, partial refund, settlement testleri; gerçek merchant staging `EXTERNAL_DEPENDENCY` |
| **F7** | `F7-UX-01` e-document readiness; `F7-UX-02` contact/product ambiguity; `F7-UX-03` invoice job/poll/retry; `F7-UX-04` PDF/XML/hash; `F7-UX-05` cancel/credit/review | Provider-neutral e-belge job, hata, retry, quarantine ve teslimat UI/contract’ları | provider retry, PDF/XML hash, cancel/credit review, delivery replay; Paraşüt/mali müşavir UAT `EXTERNAL_DEPENDENCY` |
| **F8** | `F8-UX-01` capability/module shell; sonra yalnız seçilmiş modül için `permissions → API → event → migration → analytics → UI → independent test` | Modül açılmadan önce capability gate, event scope ve bağımsız çalıştırma sözleşmesi | Her modül kendi acceptance matrix’i ile kapanır; seçilmemiş modül için hayali özellik veya UI üretilmez. |
| **F9** | `F9-UX-01` organization scope hazırlığı; `F9-UX-02` BOLA/RLS negatifleri; `F9-UX-03` tenant route/domain contract; `F9-UX-04` restore/export/delete kanıtı; `F9-UX-05` BYO provider/billing gate | Tenant UI ancak core, isolation, restore ve operasyon kanıtları hazırsa görünür; öncesinde yalnız güvenli hazırlık | Cross-tenant negatifleri, RLS default deny, owner bypass, restore/delete/export; provisioning/domain/billing/DPA dış kanıtı bekler |

### 21.4 Faz geçiş mantığı

- F0 kapanmadan hiçbir ürün UI’sı “hazır” olarak etiketlenmez.
- F1 kapanmadan F2–F9 işlevleri Event bağlamı dışında açılamaz.
- F2 ve F3 kapanmadan Finance, Payment veya Invoice akışları production özelliği olarak yayınlanmaz.
- F4 kapanmadan Badge Studio, check-in veya credential işlemleri saha hazır kabul edilmez.
- F5 Floor Editor’ın sahipliğini değiştirmez; yalnız canonical event/participant ID ve assignment contract’ına bağlanır.
- F6 ve F7’de dış provider yoksa provider-neutral yerel contract ve tüm hata durumları tamamlanır; canlı ödeme/e-belge açılmaz.
- F8’de talep edilmemiş event modülleri yazılmaz; shared capability shell dışında kapsam icat edilmez.
- F9, R-10 ve önceki tüm kanıt kapıları geçmeden SaaS provisioning, tenant billing, custom domain veya BYO provider UI açılmaz.

### 21.5 Özellik kaybı kontrolü

Her fazın packet’i aşağıdaki feature map’ten en az bir satırı açıkça taşımalıdır: Form Builder, public snapshot, submission, Person, Registration, Payment/manual invoice, Badge, Check-in, Floor Plan, WordPress/embed, notifications/outbox ve RBAC/audit. Bir özellik yeni ekranda görünmüyorsa packet şu üç şeyi belirtir: yeni domain sahibi, yeni deep link/read model ve mevcut API/contract/test kanıtı. Bunlardan biri yoksa özellik taşınmış değil, yalnızca gizlenmiş sayılır.

---

## 22. Faz başına test, kanıt ve doğrulama sözleşmesi

Her küçük işte aşağıdaki dört kanıt katmanı bulunur:

| Katman | Zorunlu içerik |
|---|---|
| **Behavior** | En az bir başarı, duplicate/retry, unauthorized ve failure/recovery senaryosu. |
| **Boundary** | Input, auth, organization/event scope, idempotency, PII/secret ve public/private sınırı. |
| **UI** | Loading, empty, error, success, disabled/permission, keyboard ve responsive davranışı. |
| **Receipt** | Çalıştırılan komut, sonuç, değişen dosya, kanıt sınıfı, kalan dış bağımlılık ve gerçek limit. |

Özel zorunluluklar:

- Badge input: signature/magic bytes, MIME, extension, decoder/parser, byte/pixel/page ölçüsü, active content, quarantine ve version.
- Badge output: template version, mapping version, record snapshot, artifact checksum, output format ve yeniden üretim kaydı.
- Check-in: scan/search, invalid, duplicate, offline conflict, operator permission ve audit.
- Payment/invoice: immutable ledger, reversal/credit, idempotent retry, export equality ve provider-neutral state.
- Floor: concurrency, hold expiry, version conflict ve recovery task.
- Multi-tenant: BOLA, RLS default deny, owner bypass, restore/export/delete ve scope leakage.

Bir test “mock provider başarılı oldu” diyorsa kanıt sınıfı `LOCAL_PASS` olabilir; gerçek provider doğrulaması değildir. Receipt bunu açıkça yazar.

---

## 23. Diğer CLI için durmadan yürütme promptu

Aşağıdaki prompt başka bir CLI’ye tek parça verilebilir. CLI bu dosyayı, ana plan klasörünü ve mevcut workflow kurallarını okuyarak F0’dan başlayıp sırayı bozmadan yerel olarak tamamlanabilecek tüm işleri yürütmelidir.

```text
Sen MavenForms → Maven Event Platform dönüşümünün sürekli yürütme ajanısın.

AMAÇ
MavenForms’u yalnız Form Builder olarak değil, ana plandaki Event Platform modeliyle uyumlu şekilde çalıştır. F0’dan F9’a kadar işleri faz sırasını bozmadan, dış kaynak gerektirmeyen tüm yerel kod, contract, UI, test, migration/rehearsal, receipt ve doğrulama işlerini gerçekten tamamla. Provider, gerçek AV/quarantine, object storage, merchant staging, sender-domain, mali müşavir/hukuk, saha cihazı veya production hesabı gerektiren kanıtları asla uydurma; bunları açık EXTERNAL_DEPENDENCY/NO_GO olarak kaydet.

KAYNAK ÖNCELİĞİ
1. docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/
2. AGENTS.md, PROJECT_CONTEXT.md, STATUS.md ve docs/workflow/README.md
3. İlgili READY packet’in reads/allowedFiles/acceptance/checks alanları
4. Güncel kaynak kodu, testler, receipt ve evidence registry
5. MAVENFORMS_EVENT_MANAGEMENT_UX_REDESIGN_MASTER_PLAN_2026-09-18.md
6. docs/legacy/root-docs/** yalnız tarihsel referanstır; yeni işi yönetemez.

ANA SIRA — ASLA ATLAMA
F0 Gerçeklik ve paket bütünlüğü
→ F1 Tek şirket Event Core
→ F2 Sipariş ve manuel ödeme
→ F3 Manuel fatura kontrolü
→ F4 İç şirket pilotu ve onsite
→ F5 Floor Editor entegrasyonu
→ F6 Canlı ödeme dalgası
→ F7 Otomatik fatura/e-belge
→ F8 Event modülleri
→ F9 Multi-Tenant son kapı

UX DİLİMLERİ BU SIRANIN ALTINDA YÜRÜR
F0: gerçeklik, route/domain sözlüğü, test/evidence ve UI baseline.
F1: shell, workspace, event context, event list, readiness, form binding, Person/Registration.
F2: ticket/order/payment ledger ve Finance review.
F3: Invoice Request, document decision, quarantine, delivery ve export.
F4: credential/badge binding, PDF/PNG/JPEG/WebP upload, Badge Studio, allowlist mapping, snapshot generation, check-in.
F5: floor binding, inventory, assignment, hold/book/release ve conflict recovery.
F6: provider-neutral hosted payment, webhook/retrieve/refund/reconciliation durumları.
F7: provider-neutral e-document job/retry/hash/cancel/credit durumları.
F8: capability/module shell; yalnız açıkça seçilmiş modül için tam uygulama.
F9: organization scope, isolation, RLS/BOLA, restore/export/delete ve son tenant gate.

DEĞİŞMEZ KURALLAR
- Her görevden önce AGENTS.md, PROJECT_CONTEXT.md, STATUS.md, ilgili READY packet ve reads alanını oku.
- git status --short ile dirty worktree’yi gör; kullanıcı değişikliklerini silme, resetleme veya üstüne yazma.
- Her iş için status READY, timeboxMinutes 15, canonical sourceOfTruth ve explicit allowedFiles şarttır.
- Packet tek ölçülebilir çıktı taşır. Büyük işi daha küçük packet’lere böl.
- Packet yoksa önce yalnız packet oluştur; packet kapsamı dışında kod yazma.
- Her packet için begin → failing/target test → minimal implementation → checks → verify → receipt sırasını uygula.
- Önce mevcut helper, contract, route, component ve testleri ara; aynı davranışı yeniden yazma.
- Server validation, authorization, organization/event scope, idempotency, audit ve public/private sınırları zorunludur.
- UI butonu backend mutation ve kanıt olmadan tamamlanmış özellik değildir.
- Event seçilmeden event-owned registration, badge, check-in veya floor mutation başlatılamaz.
- Submission Person, Registration, Ticket, Payment veya Invoice yerine kullanılamaz.
- Finance, Documents, Badge, Check-in ve Floor Plan Forms listesine gömülmez; ayrı domain yüzeyleridir.
- Payment, invoice, credential, badge, check-in, assignment ve delivery geçmişini edit ederek silme; reversal/credit/new version/audit kullan.
- Secret, token, PAN/CVV, raw provider response, PII ve gerçek .env değeri dosyaya/log’a/test çıktısına yazma.
- Mock veya synthetic fixture yalnız yerel kanıttır; provider/saha/production kanıtı değildir.
- Uygulama verisi silme, migration resetleme, production/cloud değişikliği, hesap/credential kullanımı ve public push için dur ve kullanıcı onayı iste.
- Bilinmeyen bir gereksinimi uydurma; ACCEPTED, SIMPLIFIED, DEFERRED, EXTERNAL_DEPENDENCY veya NO_GO olarak kaydet.

HER PACKET İÇİN UYGULAMA PROTOKOLÜ
1. Faz ve packet’in önceki bağımlılıklarını doğrula.
2. begin çalıştır ve baseline’ı sakla.
3. İlgili kaynakları ve doğrudan çağrı zincirini oku.
4. Önce hedef davranışı kanıtlayan en küçük testi yaz/çalıştır; hata bekleniyorsa hata nedenini kaydet.
5. En küçük mevcut-pattern uyumlu değişikliği yap.
6. Başarı + duplicate/retry + unauthorized + failure/recovery testlerini tamamla.
7. UI varsa desktop + mobile temel akışı, loading/empty/error/success, keyboard/focus/label ve permission durumlarını doğrula.
8. Typecheck/lint/test/build/readiness ve packet checks çalıştır.
9. workflow verify çalıştır.
10. Receipt’e changed files, commands, exact result, evidence class, limitations ve next dependency yaz.
11. Yalnız kabul şartları geçerse packet’i LOCAL_PASS olarak kapat; sonra sıradaki READY packet’e geç.

FAZ KAPILARI
- F0: context/bootstrap, tek test runner, status/evidence sözlüğü ve baseline geçmeden F1’e geçme.
- F1: canonical Event→FormBinding→Person/Registration ve scope/restore kanıtı olmadan F2’ye geçme.
- F2: immutable order/payment ledger ve tüm ödeme mutabakat senaryoları olmadan F3’e geçme.
- F3: invoice relation, document decision/quarantine, resend idempotency ve export equality olmadan F4’e geçme.
- F4: badge/credential/check-in contract ve güvenli template fixture gate’leri olmadan F5’e geçme.
- F5: concurrency/double-booking/hold recovery testleri olmadan F6’ya geçme.
- F6: provider-neutral signature/retrieve/refund/reconciliation contract’ları yerel olarak tamamlanmadan canlı ödeme açma.
- F7: provider-neutral invoice job/hash/retry/cancel contract’ları yerel olarak tamamlanmadan e-belge açma.
- F8: her seçilmiş modülün permission/API/event/migration/analytics/independent-run kabulü olmadan modülü tamamlandı sayma.
- F9: cross-tenant negatifleri, RLS/BOLA, restore ve export/delete kanıtı olmadan tenant UI/provisioning/billing açma.

DIŞ BAĞIMLILIK YÖNETİMİ
Dış kaynak gerekiyorsa işi bırakıp uydurma sonuç yazma. Önce dış bağımlılıktan bağımsız contract, state machine, error path, retry/idempotency, audit, UI readiness ve testleri tamamla. Sonra receipt’te EXTERNAL_DEPENDENCY olarak yaz ve production özelliğini kapalı tut. Dış bağımlılık çözülmeden yalnız gerçekten bağımsız sonraki yerel işleri yürüt; bağımlı faz kapısını geçme.

ÖZELLİK KORUMA
Her faz sonunda Form Builder, public snapshot, submission, Person, Registration, payment/manual invoice, Badge, Check-in, Floor Plan, WordPress/embed, notifications/outbox ve RBAC/audit için owner + deep link/read model + API/contract/test kanıtını kontrol et. Yeni UI’da görünmeyen özellik kaybolmuş sayılmaz; ancak yeni sahibi ve erişim yolu yazılı ve testli değilse taşınmış sayılmaz.

DURMA KOŞULLARI
- Aynı yerel hata üç denemede kök neden bulunmadan sürerse: exact error, dosya, çağrı zinciri ve önerilen güvenli sonraki adımı yaz; başka faza atlama.
- Eksik kullanıcı kararı ürün kapsamını maddi biçimde değiştiriyorsa yalnız bir net soru sor ve bekle.
- Yetki, secret, dış hesap, destructive migration, production veya public push gerekiyorsa dur ve onay iste.
- Bunun dışındaki durumlarda planı kendin böl, packet’i oluştur, uygula, test et, doğrula ve sıradaki faza devam et.

RAPORLAMA
Her packet sonunda kısa ama kanıtlı rapor ver:
Faz/packet, amaç, değişen dosyalar, çalıştırılan kontroller, sonuç, kanıt sınıfı, açık dış bağımlılık, özellik kaybı kontrolü ve bir sonraki packet. “Bitti” yalnız kabul maddeleri gerçekten geçince yazılabilir. Production GO yalnız ayrı release/evidence kapısıdır; LOCAL_PASS yazarken bu sınırı tekrar belirt.

ŞİMDİ BAŞLA
Önce F0 durumunu ve mevcut READY packet’leri doğrula. Son kapanmış fazı tespit et. İlk eksik yerel packet’i seç veya gerekli packet’i oluştur. F0’dan başlayarak yukarıdaki sırayı koru; her packet’i gerçekten uygula ve doğrula. Tasarım belgesini tekrar anlatmakla yetinme; kaynak kod, test, receipt ve workflow kanıtı üret.
```

Bu prompt’un amacı CLI’yi sonsuz ve kontrolsüz bir döngüye sokmak değildir. “Durmadan” ifadesi, kullanıcıdan her mikro adımda onay beklememesi; yalnızca yetki, dış hesap, destructive işlem veya ürün kapsamını değiştiren zorunlu kararda durması anlamına gelir.
