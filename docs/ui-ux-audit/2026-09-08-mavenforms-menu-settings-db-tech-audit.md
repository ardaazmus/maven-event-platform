# MavenForms Menü, Ayarlar, UI/UX ve Veri Bağlantısı Denetimi

**Denetim tarihi:** 2026-09-08  
**Kapsam:** Yerel uygulama, http://localhost:3000/  
**Amaç:** Tüm ana ekranları canlı olarak görmek; menü, görünüm, API ve veritabanı bağlantılarını ayırmak; özellikle ayarlar bilgi mimarisi için sonraki UI/UX araştırmasına doğrulanabilir bir başlangıç vermek.

> Bu belge release onayı değildir. Canlı yerel ekran ve kaynak kod kanıtlarını ayırır. Bir kontrolün ekranda görünmesi onun server tarafında çalıştığını kanıtlamaz.

## 1. Kanıt sınırı ve yöntem

- Ana menü, ayarlar sekmeleri, form listesi, form builder, yanıtlar, raporlar, kullanıcılar, denetim ve public form ekranları yerel tarayıcıda açıldı.
- Her ekranın screenshot'ı alındı ve görsel olarak incelendi.
- Görsel iddialar screenshot ile; API/DB iddiaları ilgili React/Next route ve Prisma şeması ile eşleştirildi.
- Provider, SMTP, production/cloud, gerçek ödeme ve gerçek e-posta teslimatı bu denetimde kanıtlanmadı.
- Screenshot; klavye sırası, screen reader semantiği, gerçek focus halkası ve tüm kontrast durumlarını tek başına doğrulayamaz.

## 2. Screenshot arşivi

Tüm görseller **artifacts/ui-ux-audit-2026-09-08/** altında saklanmıştır.

### Ana ekranlar

| # | Ekran | Kanıt |
|---|---|---|
| 01 | Genel Bakış | [01-dashboard.png](../../artifacts/ui-ux-audit-2026-09-08/01-dashboard.png) |
| 02 | Formlar | [02-forms.png](../../artifacts/ui-ux-audit-2026-09-08/02-forms.png) |
| 03 | Yanıtlar | [03-submissions.png](../../artifacts/ui-ux-audit-2026-09-08/03-submissions.png) |
| 04 | Raporlar | [04-reports.png](../../artifacts/ui-ux-audit-2026-09-08/04-reports.png) |
| 05 | Ayarlar | [05-settings.png](../../artifacts/ui-ux-audit-2026-09-08/05-settings.png) |
| 06 | Kullanıcılar | [06-users.png](../../artifacts/ui-ux-audit-2026-09-08/06-users.png) |
| 07 | Denetim | [07-audit.png](../../artifacts/ui-ux-audit-2026-09-08/07-audit.png) |
| 08 | Builder - Alanlar | [08-builder-fields.png](../../artifacts/ui-ux-audit-2026-09-08/08-builder-fields.png) |
| 09 | Builder - Ayarlar | [09-builder-settings.png](../../artifacts/ui-ux-audit-2026-09-08/09-builder-settings.png) |
| 10 | Public form preview | [10-public-form-preview.png](../../artifacts/ui-ux-audit-2026-09-08/10-public-form-preview.png) |

### Ayarlar sekmeleri

| Sekme | Kanıt |
|---|---|
| Hesap | [05-settings-account.png](../../artifacts/ui-ux-audit-2026-09-08/05-settings-account.png) |
| Workspace | [05-settings-workspace.png](../../artifacts/ui-ux-audit-2026-09-08/05-settings-workspace.png) |
| Marka & Logo | [05-settings-branding.png](../../artifacts/ui-ux-audit-2026-09-08/05-settings-branding.png) |
| Güvenlik | [05-settings-security.png](../../artifacts/ui-ux-audit-2026-09-08/05-settings-security.png) |
| E-posta / SMTP | [05-settings-email-smtp.png](../../artifacts/ui-ux-audit-2026-09-08/05-settings-email-smtp.png) |
| LDAP / AD | [05-settings-ldap-ad.png](../../artifacts/ui-ux-audit-2026-09-08/05-settings-ldap-ad.png) |
| Tema / Görünüm | [05-settings-theme.png](../../artifacts/ui-ux-audit-2026-09-08/05-settings-theme.png) |
| Bildirimler | [05-settings-notifications.png](../../artifacts/ui-ux-audit-2026-09-08/05-settings-notifications.png) |
| Faturalama | [05-settings-billing.png](../../artifacts/ui-ux-audit-2026-09-08/05-settings-billing.png) |
| Sistem | [05-settings-system.png](../../artifacts/ui-ux-audit-2026-09-08/05-settings-system.png) |

## 3. Kullanılan teknoloji ve mimari

| Katman | Doğrulanmış teknoloji / yapı | Kanıt |
|---|---|---|
| Uygulama | Next.js 16.1.1, React 19 | package.json, src/app/page.tsx |
| Dil | TypeScript 5, strict ve noEmit | tsconfig.json |
| Çalıştırma | Bun scriptleri; development next dev -p 3000; production standalone server | package.json, next.config.ts |
| Server/API | Next.js App Router route handlers | src/app/api/**/route.ts |
| ORM | Prisma 6.11.1 | package.json, prisma/schema.prisma |
| Veritabanı | SQLite development datasource, DATABASE_URL | prisma/schema.prisma |
| Stil | Tailwind CSS 4, PostCSS, CSS değişkenleri, dark mode class | package.json, tailwind.config.ts |
| UI kit | Radix UI ve shadcn new-york | components.json, package.json |
| İkon | lucide-react / Lucide | components.json, kaynak importları |
| Client state | Zustand 5; UI tercihlerinde localStorage | src/lib/store.ts ve ilgili view dosyaları |
| Form doğrulama | React Hook Form, Zod, resolver paketleri | package.json |
| Drag/drop | @dnd-kit/core, sortable, utilities | package.json ve builder kaynakları |
| Grafik | Recharts 2.15.4 | package.json, reports-view.tsx |
| Animasyon / görsel | Framer Motion 12, Sharp | package.json |
| Kimlik | Custom session/cookie akışı AppShell ve API'lerde kullanılıyor; NextAuth paketi kurulu olsa da aktif olduğu doğrulanmadı | app-shell.tsx, src/lib/auth, API route'ları |

## 4. Menü → ekran → API → veritabanı tablosu

AppShell, ekranları client state ile değiştirir. Dolayısıyla aşağıdaki görünümler çoğunlukla aynı shell içinde çalışır; ayrı tarayıcı route'u olmaları gerekmez.

| Menü / ekran | Kullanıcıya amacı | Görünüm / erişim | Doğrulanmış API | İlişkili DB modelleri | Durum |
|---|---|---|---|---|---|
| Genel Bakış | Form, yanıt, teslimat ve aktivite özeti | view: dashboard | GET /api/dashboard | Workspace, Form, Submission, AuditLog, OutboxEvent, EmailProviderEvent, WorkspaceEmailProtection | Veri bağlantısı mevcut; KPI ayrıntıları ayrıca doğrulanmalı |
| Formlar | Form arama, klasör/tag, oluşturma, CRUD ve yayın | view: forms | /api/forms, /api/folders, /api/tags, /api/forms/:id/summary, /submissions; duplicate, publish, export, archive | Form, FormVersion, FormField, Folder, Tag, FormTag, Submission, ödeme/fatura ilişkileri | Ana akış bağlı; her aksiyon ayrı test edilmeli |
| Form Builder | Alan, görünüm, tema, mantık, bildirim, ödeme ve entegrasyon ayarı | view: builder | /api/forms/:id, /fields, /fields/:fieldId, /theme, /logic, /notifications, /publish, /appearance, /media, /embed-script | Form, FormVersion, FormField, Theme, FormAppearance, MediaAsset, LogicRule, Notification, FormPaymentConfig, Integration | Gerçek endpoint temeli var; interaction ve publish sonucu ayrıca kanıtlanmalı |
| Yanıtlar | Public yanıtları, durum/ödeme bilgisini ve export'u yönetmek | view: submissions; seçili form senkronu | /api/forms, /summary, /submissions; status/payment PATCH, export, delete | Submission, SubmissionValue, SubmissionFile, PaymentOrder, InvoiceRecipientSnapshot, InvoiceRecord | Seçili form geçişi canlı olarak doğrulandı; izin matrisi ayrı kapı |
| Raporlar | Formun gün/alan/yanıt özetleri | view: reports | /api/forms, /api/forms/:id/reports?days= | Report, Submission, SubmissionValue, FormField | Rapor verisi bağlı; export/share “yakında” |
| Ayarlar | Hesap, workspace, marka, güvenlik, e-posta, görünüm ve sistem | view: settings; 10 sekme | /api/auth/me, /api/branding, /api/workspace/dangerous-actions | User, Session, Workspace, WorkspaceMember, WorkspaceBranding, MediaAsset, DangerousActionChallenge, e-posta ve ödeme modelleri | Tek sayfada çok domain; sekme bazında durum farklı |
| Kullanıcılar | Workspace üyeleri ve roller | view: users | Bu görünümde API çağrısı yok | Şemada User, WorkspaceMember, Session var | Fixture/static; DB bağlantısı kanıtlanmadı; davet/satır aksiyonları çalışmıyor |
| Denetim | Audit kayıtlarını arama ve filtreleme | view: audit | GET /api/audit | AuditLog, User, Workspace | Liste bağlı; export “yakında” |
| Public form | Yayın formunu dış kullanıcıya sunmak ve yanıt almak | /forms/:slug ve preview query | /api/public/forms/:slug, /submissions, /media/:token, payment callback/status | Form, FormVersion, FormField, FormAppearance, MediaAsset, Submission, ödeme modelleri | Public/private route ayrımı var; production güvenliği bu denetimde kanıtlanmadı |

## 5. Ayarlar hiyerarşisi denetimi

### Mevcut yapı

~~~text
Ayarlar
├── Hesap
├── Workspace
├── Marka & Logo
├── Güvenlik
├── E-posta / SMTP
├── LDAP / AD
├── Tema / Görünüm
├── Bildirimler
├── Faturalama
└── Sistem
~~~

Bu yapı başlık olarak anlaşılırdır; fakat kişisel hesap, workspace politikası, form davranışı, entegrasyonlar ve sistem bakımı aynı yatay düzlemde duruyor. 1536px altındaki görünümde sekmeler yatay yoğunlaşıyor; bu, bulunabilirliği ve responsive davranışı zayıflatıyor.

### Sekme → bağlantı → gerçek durum

| Sekme | Kullanıcı amacı | API / DB bağlantısı | Görseldeki durum | Önerilen yön |
|---|---|---|---|---|
| Hesap | Profil, avatar, şifre, oturum | Avatar için /api/auth/me; User, MediaAsset, Session | Avatar bağlı; profil metin kaydı local toast; şifre/oturum disabled | Profil ile oturum güvenliğini ayrı alt bölümler yap |
| Workspace | Kurum, iletişim, kullanım | Workspace ve WorkspaceMember şemada; aktif kaydetme doğrulanmadı | Alanlar görünür, save disabled; kullanım değerleri fixture | Genel bilgiler, üyeler, kullanım olarak ayır |
| Marka & Logo | App ve public form markası | GET/PATCH /api/branding; global MediaAsset | Bağlı; global media picker ve URL fallback var | Global marka ile form-medya kapsamını açık ayır |
| Güvenlik | 2FA, KVKK, tehlikeli işlemler | Dangerous action API; DangerousActionChallenge ve MFA alanları | Bazı kontroller deferred; challenge akışı mevcut | Oturum, gizlilik, tehlikeli bölge olarak ayır |
| E-posta / SMTP | Sistem gönderici, test ve şablonlar | EmailProviderConnection, Event, Preference, Suppression, WorkspaceEmailProtection, OutboxEvent modelleri | Save/test disabled; gerçek teslimat kanıtı yok; şablonlar session seviyesinde | Sistem maili ile katılımcı/form mailini ayır |
| LDAP / AD | Kurumsal kimlik sağlayıcı | Bu görünümde bağlı API/model kanıtı yok | Alanlar ve test disabled | Kurulum gerekli / ileri entegrasyon olarak etiketle |
| Tema / Görünüm | Admin teması ve görünüm | Zustand/localStorage; Theme ve WorkspaceBranding ayrı | Admin tema tercihi çalışıyor | Admin görünümü ile public form temasını ayır |
| Bildirimler | Workspace bildirim tercihleri | Form Notification modeli builder'da var; global tercih API'si doğrulanmadı | Switch satırları static/disabled | Form bildirimini builder'a, workspace bildirimini ayarlara bağla |
| Faturalama | Plan, sağlayıcı, geçmiş | Ödeme/fatura modelleri var; aktif billing API doğrulanmadı | Plan ve sağlayıcı durumu görünür; işlemler planlı | Ödeme alma ayarını form builder'dan, SaaS faturalamasını ileri fazdan ayır |
| Sistem | Varsayılan, bakım, bilgi | Persistence API doğrulanmadı | Backup disabled; bazı değerler sabit | Sistem bilgisi salt okunur; form varsayılanını ayrı domain yap |

### Önerilen hiyerarşi

~~~text
Ayarlar
├── Hesabım
│   ├── Profil ve avatar
│   ├── Şifre ve oturumlar
│   └── Kişisel bildirimler
├── Workspace
│   ├── Genel bilgiler
│   ├── Üyeler ve roller
│   ├── Kullanım ve limitler
│   └── Marka ve public kimlik
├── Güvenlik ve gizlilik
│   ├── Kimlik doğrulama
│   ├── KVKK / veri saklama
│   ├── API ve public form politikaları
│   └── Tehlikeli bölge
├── Teslimat ve entegrasyonlar
│   ├── Sistem e-postası
│   ├── Form katılımcı e-postası
│   ├── Webhook / entegrasyonlar
│   └── LDAP / AD
├── Form varsayılanları
│   ├── Yeni form ayarları
│   ├── Public görünüm
│   ├── Bildirim şablonları
│   └── Medya varsayılanları
└── Sistem
    ├── Tema
    ├── Sistem bilgisi
    └── Yedekleme / bakım
~~~

Bu öneri ödeme/fatura ana yol haritasını değiştirmez; yalnız ayarların bulunabilirliğini artırır.

## 6. Veritabanı ilişki haritası

| Domain | Ana tablolar | Bağlantı | UI tüketicisi |
|---|---|---|---|
| Kimlik/workspace | User, Session, RefreshToken, Workspace, WorkspaceMember | Kullanıcı workspace üyeliğiyle; session kullanıcıyla bağlı | AppShell, Hesap, Kullanıcılar, Güvenlik |
| Organizasyon | Folder, Tag, FormTag | Workspace → klasör/tag → form | Formlar, Sidebar |
| Form çekirdeği | Form, FormVersion, FormField | Form workspace'e; alan form'a; yayın sürümü form'a | Formlar, Builder, Public |
| Görsel görünüm | Theme, FormAppearance, MediaAsset | Form görünümü form'a; medya workspace'e ve opsiyonel form'a scope | Branding, Builder, Public, kartlar |
| Yanıt | Submission, SubmissionValue, SubmissionFile | Submission form'a; değer ve dosya submission'a | Yanıtlar, dashboard, raporlar |
| Davranış | LogicRule, Notification, Report | Kural/bildirim/rapor form'a bağlı | Builder, Raporlar, public akış |
| Ödeme | FormPaymentConfig, PaymentOrder, PaymentAttempt, PaymentProviderConnection, PaymentWebhookEvent | Form ödeme ayarı; order form/submission; provider workspace | Builder ödeme, Yanıtlar, ileri ödeme merkezi |
| Fatura | InvoiceRecipientSnapshot, InvoiceRecord, InvoiceLineSnapshot, InvoiceBatch, InvoiceDocument, InvoiceDeliveryIntent | Ödeme/yanıt sonrası belge zinciri | Yanıtlar, fatura merkezi, ileri teslimat |
| E-posta | EmailProviderConnection, EmailProviderEvent, EmailPreference, EmailSuppression, WorkspaceEmailProtection, OutboxEvent | Workspace gönderici/koruma ve teslimat olayları | Dashboard, SMTP, bildirim altyapısı |
| Denetim | AuditLog | Workspace ve actor ile kaynak değişikliği | Denetim, dashboard |

### Medya kapsamı

MediaAsset üzerinde workspaceId ve nullable formId bulunması global medya ile form-medya ayrımı için doğru bir temel oluşturuyor:

- formId null: workspace geneli.
- formId belirli form: yalnız o form.
- Form picker: /api/forms/:id/media.
- Global picker: /api/media?scope=global.
- Branding route'u workspace-global medya ile sınırlandırıyor.
- Public medya token üzerinden servis ediliyor.

Araştırmada server tarafında ayrıca workspace/form sahipliği, MIME ve boyut, checksum/scan, silme referansı ve public token kapsamı doğrulanmalıdır.

## 7. Canlı görsel bulgular

### Güçlü taraflar

- Yanıtlar ekranında seçilen formun canlı public görünümü, istatistikleri ve yanıt listesi aynı çalışma alanında gösteriliyor.
- Form kartlarında 16:9 medya alanı; builder ayarlarında form-spesifik medya seçimi var.
- Builder; alan paleti, canvas ve alan ayar paneli olarak ayrılmış.
- Form-specific media ve global media endpoint'leri ayrılmış.
- Public form admin shell'den ayrı route'ta ve header görseli görünür.
- Dashboard ve raporlar API verisi tüketiyor.
- Tehlikeli işlemler challenge/confirm endpoint'i ile korunacak şekilde tasarlanmış.

### Risk ve araştırma öncelikleri

| Öncelik | Bulgu | Kanıt | Etki | Önerilen iş |
|---|---|---|---|---|
| P0 | Kullanıcılar fixture/static | users-view.tsx sabit kullanıcı dizisi; API çağrısı yok | Yanlış üye/rol bilgisi; davet gerçek değil | WorkspaceMember/User API, yetki, davet ve audit sözleşmesi |
| P0 | Görünür ama çalışmayan kontrol yoğunluğu | SMTP, LDAP, workspace save, password/session, backup, report/audit export disabled/deferred | Kullanıcı hazır özelliği ayırt edemez | active, setup-required, deferred, disabled-reason durumları |
| P1 | Ayarlar tek yatay düzlemde yoğun | 10 sekme; 1536px altında yatay yoğunluk | Bulunabilirlik/responsive zayıf | Desktop rail; mobil select/accordion; deep-link |
| P1 | Topbar bildirimleri sabit | Kaynakta sabit bildirim dizisi | Operasyon uyarısı yanlış olabilir | Bildirim/outbox özeti ve okunma state'i |
| P1 | Yanıt badge'i sabit | Sidebar badge 12 | Yeni yanıt sayısı yanlış | Workspace/form scope unread endpoint'i |
| P1 | Rapor export/share eksik | “Yakında”, disabled | Rapor işlevi tamam değil | Async export, izin, audit, download token |
| P1 | Arama global değil | Topbar araması forms görünümüne event gönderiyor | Kullanıcı tüm workspace'i aradığını sanabilir | Kapsamı adlandır veya gerçek global arama yap |
| P1 | Form işlemleri dağınık | Kart ayarları, builder, yanıtlar, fatura ve publish ayrı yüzeyler | Form ayarına ulaşmak zor | Canonical form detail: canlı form → özet → yanıtlar; ayarlar action menüsü |
| P1 | Drag/drop davranışı screenshot ile kanıtlanamaz | Palette/canvas görünür | Reorder/resize regresyonu saklı | Playwright pointer/keyboard + persistence |
| P2 | Medya ve URL fallback karmaşası | MediaPicker ve harici URL birlikte | Aktif kaynak belirsiz | Tek source selector: medya/yükle/URL; preview ve aktif rozet |
| P2 | Disabled dili tutarsız | Bazı düğmeler sadece disabled | Kullanıcı sebebi anlayamaz | Sebep, önkoşul ve sonraki adım göster |

## 8. UI/UX araştırmasına hazır brief

1. Form builder ve admin console alanında ayarlar hangi domain gruplarıyla düzenleniyor? Hesap, workspace, güvenlik, teslimat, form varsayılanları ve sistem ayırımı karşılaştırılsın.
2. Typeform, Jotform, Tally, Fillout, Formstack ve HubSpot Forms ürünlerinin resmî kaynakları incelensin; ayar erişimi, form detay layout'u, setup-required durumları, medya picker ve builder pattern'leri karşılaştırılsın.
3. Responsive builder'da serbest piksel boyutu ile 12 kolon/kap davranışı; erişilebilirlik, mobil dönüşüm ve CSS güvenilirliği açısından değerlendirilsin.
4. Global asset, form asset, public token, alt metin, crop/cover ve dosya güvenliği karşılaştırılsın.
5. Beta, kurulum gerekli, plan gerekir, yetki gerekir, yakında ve devre dışı durumlarının ürün dilindeki kullanımı araştırılsın.
6. Her öneri için screenshot, API/DB etkisi, risk, minimum değişiklik ve kabul kriteri ayrı yazılsın.

Araştırmacı şu ayrımı zorunlu yapmalıdır:

- **Doğrulanmış:** Kaynakta veya canlı uygulamada doğrudan görülen.
- **Çıkarım:** Birden fazla kanıttan türetilen.
- **Hipotez:** Kullanıcı testiyle doğrulanması gereken.
- **Öneri:** Ürün kararı; otomatik gereksinim değildir.

## 9. En küçük araştırma ve düzeltme sırası

| Faz | Tek çıktı | Başarı kapısı |
|---|---|---|
| UI-AUD-01 | Screenshot + route/view envanteri | 10 ana ekran ve 10 ayar sekmesi arşivde |
| UI-AUD-02 | Menü → API → DB matrisi | Her satır verified/static/deferred |
| UI-AUD-03 | Ayar hiyerarşisi seçenekleri | En az 3 alternatif ve görev karşılaştırması |
| UI-AUD-04 | Kullanıcılar bağlantı kararı | Fixture açık; API/yetki sözleşmesi hazır |
| UI-AUD-05 | Disabled/setup-required dili | Her görünür kontrolün sebebi ve sonraki adımı var |
| UI-AUD-06 | Responsive ayar shell'i | Desktop/tablet/mobil screenshot ve overflow kontrolü |
| UI-AUD-07 | Form canonical layout | Canlı form → istatistik → yanıtlar ve form senkronu |
| UI-AUD-08 | Media source UX | Medya/yükleme/URL, preview, aktif durum, alt metin tek akış |
| UI-AUD-09 | Builder regression | Ekleme, taşıma, boyut, kaydetme, publish Playwright ile doğrulandı |
| UI-AUD-10 | UI/UX release gate | API, DB, auth, responsive, public/private sınırları geçti |

## 10. Sonuç

Uygulama yalnızca statik ekranlardan oluşmuyor: form CRUD, builder alanları, public form, medya kapsamı, yanıtlar, dashboard, raporlar ve audit için gerçek API/DB temelleri var. Ancak bazı ekranlarda gerçek bağlantılar fixture/deferred kontrollerle aynı görsel yüzeyde karışıyor.

En kritik bulgular: Ayarlar ekranının tek yatay düzlemde fazla domain taşıması ve Kullanıcılar ekranının DB'ye bağlı görünmesine rağmen fixture olmasıdır. UI/UX araştırmasından önce bu iki konu, disabled durumlarının açık etiketlenmesi ve bu menü/API/DB matrisinin kanonik tutulması gerekir.

Bu belge sonraki araştırma modelinin kanıt paketidir; ürünün release-ready olduğunu ilan etmez.

## 11. Tüm ekran ve alt ekran screenshot envanteri

Önceki ana ekran kanıtlarına ek olarak Builder alt ekranları ve giriş ekranı canlı açılarak kaydedildi.

| # | Ekran / alt ekran | Kanıt |
|---|---|---|
| 00 | Giriş | [00-login.png](../../artifacts/ui-ux-audit-2026-09-08/00-login.png) |
| 11 | Builder - Alanlar | [11-builder-fields-full.png](../../artifacts/ui-ux-audit-2026-09-08/11-builder-fields-full.png) |
| 12 | Builder - Ayarlar | [12-builder-settings-full.png](../../artifacts/ui-ux-audit-2026-09-08/12-builder-settings-full.png) |
| 13 | Builder - Görünüm | [13-builder-appearance.png](../../artifacts/ui-ux-audit-2026-09-08/13-builder-appearance.png) |
| 14 | Builder - Tema | [14-builder-theme.png](../../artifacts/ui-ux-audit-2026-09-08/14-builder-theme.png) |
| 15 | Builder - Yanıtlar | [15-builder-submissions.png](../../artifacts/ui-ux-audit-2026-09-08/15-builder-submissions.png) |
| 16 | Builder - Mantık | [16-builder-logic.png](../../artifacts/ui-ux-audit-2026-09-08/16-builder-logic.png) |
| 17 | Builder - Bildirim | [17-builder-notifications.png](../../artifacts/ui-ux-audit-2026-09-08/17-builder-notifications.png) |
| 18 | Builder - WordPress | [18-builder-wordpress.png](../../artifacts/ui-ux-audit-2026-09-08/18-builder-wordpress.png) |
| 19 | Builder - Ödeme | [19-builder-payment.png](../../artifacts/ui-ux-audit-2026-09-08/19-builder-payment.png) |
| 20 | Builder - Entegrasyon | [20-builder-integrations.png](../../artifacts/ui-ux-audit-2026-09-08/20-builder-integrations.png) |
| 21 | Builder - Rapor | [21-builder-report.png](../../artifacts/ui-ux-audit-2026-09-08/21-builder-report.png) |

Kaynakta kullanıcı arayüzü için iki Next page route'u vardır: / ve /forms/[slug]. Dashboard, Formlar, Yanıtlar, Raporlar, Ayarlar, Kullanıcılar, Denetim ve Builder sekmeleri / içindeki AppShell görünümleridir.

## 12. Tıklanabilir öğe ve ikon davranış özeti

| Ekran | İkon / kontrol grubu | Beklenen iş | API veya state | DB etkisi | Durum |
|---|---|---|---|---|---|
| Giriş | Parola göz ikonu, hatırla, giriş, demo giriş | Görünürlük, login tercihi ve oturum açma | POST /api/auth/login; local state | User, Session, RefreshToken | Giriş API bağlı; şifre sıfırlama demo pasif |
| Shell | Menü, klasör, daralt oku, tema, bildirim, kullanıcı menüsü | View, filtre, shell ve oturum işlemleri | Zustand/local state; logout API | Workspace, Session | Bildirim listesi ve badge fixture |
| Dashboard | KPI, son form, tümünü gör, yeni form | İlgili ekrana veya form builder'a geçiş | view state, selectForm, form event | Form, Submission, AuditLog | Çalışan navigasyon; KPI server verisi |
| Formlar | Yeni form, klasör, arama, durum, kart/tablo, sırala | Listeyi filtrele ve form oluştur | GET/POST /api/forms, folders, tags | Form, Folder, Tag, FormTag | Bağlı |
| Form kartı | Kart, ayarlar dişlisi/chevron, yanıtlar, düzenle | Formu aç, ayar menüsünü ve işlemleri göster | selectForm; publish/duplicate/archive/delete API'leri | Form, FormVersion, Submission, AuditLog | Çoğu bağlı; silme confirmation testi gerekli |
| Form kartı | Önizle, embed, yayınla, durdur, çoğalt, arşivle, sil | Form yaşam döngüsü ve paylaşım | Form CRUD/publish/embed endpoint'leri | Form, FormVersion, Integration | Durum/izin regression testi gerekli |
| Fatura merkezi | Upload/import, export, gönder | Muhasebe dosyası al, uygun kayıtları çıkar | Invoice import/export; gönder disabled | InvoiceImportBatch, InvoiceRecord, InvoiceDeliveryIntent | Import/export bağlı; gönder deferred |
| Yanıtlar | Form seçici, yeni sekmede aç, filtre, satır, durum, ödeme | Form ve yanıtı yönet | Summary/submissions; PATCH status/payment | Submission, SubmissionValue, PaymentOrder | Bağlı; provider ödeme kanıtı değildir |
| Yanıtlar | CSV/XLSX, e-posta, yazdır, sil | Dışa aktar, mail/print ve yanıt sil | Export/delete API; print browser | Submission, OutboxEvent, AuditLog | Export/print bağlı; mail teslimatı kanıtlanmadı |
| Builder üst bar | Geri, cihaz, preview, kaydet, yayınla | Builder'a dön, responsive görünüm, yaz/yayınla | Form/fields/theme/appearance/publish API | FormVersion ve alt modeller | API temeli var |
| Builder alanları | Palette, preset, yukarı/aşağı, çoğalt, sil, kolon ayırıcı | Alan ekle/sırala/boyutlandır | Fields API; local drag state | FormField | Etkileşim persistence testi gerekli |
| Builder ayarları | Genel/doğrulama/düzen/gelişmiş, ikon, medya | Alan davranışı ve görsel kaynağı | Field PATCH; form media API | FormField, MediaAsset | Bağlı; kaynak seçimi UX iyileştirilmeli |
| Builder sekmeleri | Görünüm, Tema, Mantık, Bildirim | Public görünüm ve form davranışı | appearance/theme/logic/notifications API | FormAppearance, Theme, LogicRule, Notification | Çoğu bağlı |
| Builder entegrasyon | WordPress sekmeleri ve kod kopyalama | Shortcode, iframe, JS ve URL paylaşımı | Embed script/form URL | Form, Integration | Kod kopyalama var; plugin düğmesi deferred |
| Builder ödeme | Provider/test/Google Pay kontrolleri | Gelecek ödeme yapılandırması | Payment routes; bazı kontroller disabled | FormPaymentConfig, PaymentProviderConnection, PaymentOrder | Ödeme alma aktif kanıtı yok |
| Ayarlar | 10 sekme | Ayar panelini değiştir | Tabs state; bazı domain API'leri | İlgili workspace/user modelleri | Bilgi mimarisi yoğun |
| Ayarlar | Avatar, profil, marka, tehlikeli işlem | Profil/marka ve challenge yönetimi | /api/auth/me, /api/branding, dangerous-actions | User, MediaAsset, WorkspaceBranding, DangerousActionChallenge | Kısmi/bağlı |
| Ayarlar | SMTP, LDAP, 2FA, workspace save, backup, billing | Yapılandırma ve operasyon ayarları | Çoğu disabled/deferred | E-posta, Workspace, ödeme modelleri | UI görünür; çalışır kabul edilmemeli |
| Kullanıcılar | Rol seçici, davet, satır üç nokta | Üye filtrele/yönet | Bu görünümde API yok | User/WorkspaceMember şemada | Fixture; davet ve aksiyonlar eksik |
| Denetim/Raporlar | Arama, filtre, form/dönem seç, export/share | Kayıt/rapor kapsamını değiştir | Audit/reports API; export disabled | AuditLog, Report, Submission | Liste/rapor bağlı; export deferred |
| Public form | Submit, file upload, radio/select/rating, sosyal linkler | Dış kullanıcı yanıtı ve iletişim | Public form/submission/media route'ları | Submission, SubmissionValue, SubmissionFile | Public write path; güvenlik testi gerekli |

## 13. API ve DB sahipliği için doğrulama kuralı

Bir ikonun veya düğmenin onClick içermesi tek başına çalıştığı anlamına gelmez. Araştırma ve sonraki geliştirme testinde aynı senaryoda şu dört kanıt birlikte aranmalıdır: beklenen HTTP çağrısı, başarılı/başarısız kullanıcı geri bildirimi, beklenen DB değişikliği ve yetkisiz/yanlış workspace erişiminin reddi.

Static fixture, disabled, deferred ve yalnız local state kullanan öğeler raporda çalışan özellik olarak işaretlenmemelidir. Public form yalnız yayınlanmış sürümü ve izinli alanları döndürmeli; admin menüleri, workspace bilgileri, provider secret'ları ve iç API ayrıntıları dış kullanıcıya taşınmamalıdır.

Bu eklemeden sonra kanıt paketi giriş, ana shell ekranları, ayar sekmeleri, Builder'ın tüm çalışma sekmeleri ve public formu; ayrıca her tıklanabilir kontrol ailesinin API/DB karşılığını kapsamaktadır.
