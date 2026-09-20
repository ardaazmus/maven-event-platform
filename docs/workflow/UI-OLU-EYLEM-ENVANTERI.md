# UI Ölü-Eylem Envanteri (F9-07)

Kural: yeni fikir doğrudan kod kapsamı değildir; her satır mevcut faza ACCEPTED / SIMPLIFIED / DEFERRED / REJECTED kararıyla bağlıdır. Dış bağımlılık gerektirenler açılmaz; dürüst etiket korunur.

## SIMPLIFIED (sıradaki paketlerde bağlanacak, yerel, dış bağımlılık yok)

- `src/components/mavenforms/views/reports-view.tsx:153-154` Export (yakında) → yüklü rapor verisinin CSV indirilmesi
- `src/components/mavenforms/views/reports-view.tsx:156-157` Paylaş (yakında) → rapor linki kopyalama (public değil, yerel pano)
- `src/components/mavenforms/views/audit-view.tsx:93-94` Export (yakında) → yüklü logların CSV indirilmesi

## DEFERRED (dürüst etiketli, kapalı kalır; sahte başarı yok)

- `src/components/mavenforms/views/users-view.tsx:64-65` Kullanıcı Davet Et (yakında) + `users-view.tsx:207-209` satır işlemleri (yakında) → üye API yok; `users-view.tsx:30-38` statik liste + `users-view.tsx:69-71` dürüst banner korunur
- `src/components/mavenforms/views/settings-view.tsx:277,299-300,339-340` Parola/Session/Workspace kaydet → parola/session API yok
- `src/components/mavenforms/views/settings-view.tsx:475,487,498,506,514` TOTP/Passkey/giriş-limiti/IP/otomatik-çıkış → güvenlik yol haritası, kapsam dışı
- `src/components/mavenforms/views/settings-view.tsx:558,565,818,895` KVKK/bildirim/captcha varsayılanları → merkezi politika yok
- `src/components/mavenforms/views/settings-view.tsx:329,840` Plan yükseltme → F9 SaaS dondurma (11_YOL_HARITASI.md:58-60)
- `src/components/mavenforms/views/settings-view.tsx:723,726-727` LDAP → harici dizin (dış bağımlılık)
- `src/components/mavenforms/views/settings-view.tsx:918,924-925` Yedekleme → yedek altyapısı yok
- `src/components/mavenforms/views/form-builder-view.tsx:423,426` Geri al/İleri al (yakında) → history implementasyonu yok
- `src/components/mavenforms/views/invoice-center-view.tsx:144` Gönder (disabled, başlıkta faz bilgisi) → delivery fazı ayrı packet
- `src/components/mavenforms/views/wordpress-embed-panel.tsx:204-207` Üretim ZIP (disabled + açıklama) → paketleme fazı ayrı

## ACCEPTED (olduğu gibi doğru)

- `src/components/mavenforms/views/form-builder-view.tsx:1144-1172` ComingSoonPanel sarmalayıcı (tüm sekmelerin gerçek paneli var; `theme` koşulu zararsız)
- `src/components/mavenforms/views/form-builder-view.tsx:1932-1962` Payment/Integrasyon `Planlandı` rozetleri (F6/F7 dış bağımlılık, sahte `connected` yok)
- `src/components/mavenforms/views/login-view.tsx:231` Şifre sıfırlama demo pasif toastı (dürüst)
- `src/components/mavenforms/views/dashboard-view.tsx:272,280` + `src/app/api/dashboard/route.ts:66,70` failedNotifications gerçek metrik, paymentTotal null→çizgi (dürüst)
- `src/components/mavenforms/views/submissions-view.tsx:206-220,402-406` Export CSV/XLSX gerçek indirme
- `src/components/mavenforms/views/invoice-center-view.tsx:116-117` import/export gerçek fetch (`/api/invoices/...`)
