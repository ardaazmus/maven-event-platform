# MavenForms — Uygulama Denetimi ve İşlevsel Release Mikro-Faz Planı

**Belge türü:** Kaynak-kod kanıtlı uygulama denetimi, mimari düzeltme planı ve diğer ajanların faz atlamasını önleyen yürütme sözleşmesi  
**Tarih:** 2026-09-02  
**Kapsam:** `D:\project\mavenform`  
**Ana karar:** **BLOCKED — public SaaS release yapılmamalı**  
**İlişkili belgeler:** [RELEASE-ROADMAP.md](D:/project/mavenform/RELEASE-ROADMAP.md), [AI-RELEASE-EXECUTION-PLAN.md](D:/project/mavenform/AI-RELEASE-EXECUTION-PLAN.md), [CLOUD-DEBUG-HANDOFF.md](D:/project/mavenform/CLOUD-DEBUG-HANDOFF.md), [RELEASE-CHECKLIST.md](D:/project/mavenform/RELEASE-CHECKLIST.md)

Bu belge, önceki planın gerçekten uygulanıp uygulanmadığını ve UI’da bulunan özelliklerin backend ile tamamlanıp tamamlanmadığını ayırır. `RELEASE-CHECKLIST.md` bir ajan raporudur; bağımsız kanıt değildir. Bu belgedeki her **PASSED** ifadesi yeniden çalıştırılmış komut, test çıktısı veya canlı tarayıcı davranışı ile kanıtlanmalıdır.

## 0. Diğer ajanlar için zorunlu çalışma sözleşmesi

Bu dosya ve Bölüm 10’daki kontrol sistemi okunmadan kod değiştirilmez. Her ajan aşağıdaki sırayı korur:

1. Çalışma ağacını ve mevcut değişiklikleri oku; kullanıcı değişikliklerini silme, resetleme veya üzerine yazma.
2. Önce **M00 baseline** fazını çalıştır.
3. Her mikro fazdan önce bütün önceki fazların kısa regresyon kontrolünü çalıştır.
4. Her mikro fazda yalnızca fazın dosya sınırı içindeki değişiklikleri yap.
5. Test yazmadan “çalışıyor” deme. Testin yalnızca helper’ı değil gerçek route/UI akışını doğrulamasını sağla.
6. Faz çıkış kanıtını bu belgenin sonunda verilen şablonla kaydet.
7. Giriş kapısı başarısızsa sonraki faza geçme; önce kök nedeni düzelt, aynı kapıyı yeniden çalıştır.
8. Bir özelliğin UI’da görünmesi, işlevsel kabul edilmesi için yeterli değildir. Aşağıdaki dört katman birlikte doğrulanır:
   - veri modeli ve migration,
   - server route/service ve yetki,
   - uygulama UI akışı,
   - public/export/cloud davranışı.
9. Public yüzeye hiçbir Prisma nesnesi doğrudan gönderilmez. Public DTO allowlist ile oluşturulur.
10. “Mock”, “demo”, “placeholder”, “yakında”, “connected” veya “export başlatıldı” gibi ifadeler gerçek provider/işlem kanıtı yoksa release UI’sında kullanılamaz.

### 0.1 Faz durumları

| Durum | Anlamı |
|---|---|
| `NOT_STARTED` | Faz için kanıt yok. |
| `IN_PROGRESS` | Kod değişikliği veya doğrulama sürüyor. |
| `BLOCKED` | Giriş/çıkış kapısı geçmedi; sonraki faz yasak. |
| `PASSED` | Tüm zorunlu testler ve kanıtlar mevcut. |
| `DEFERRED` | Sadece açıkça kapsam dışı bırakılmış, UI’da pasif gösterilen iş. |
| `REJECTED` | Güvenlik, veri bütünlüğü veya kullanıcı beklentisi nedeniyle mevcut yaklaşım kabul edilmedi. |

### 0.2 Her fazın değişmez çıkış kapısı

Her ajan fazın sonunda şunları raporlar:

```md
## Faz kanıtı
- Faz: Mxx.y
- Durum: PASSED | BLOCKED | DEFERRED
- Değişen dosyalar:
- Çalıştırılan komutlar:
- Test sonucu ve exit code:
- Browser/HTTP kanıtı:
- Önceki faz regresyon sonucu:
- Kalan risk:
- Sonraki faza geçiş: İZİN VAR | İZİN YOK
```

## 1. 2026-09-02 gerçek durum denetimi

### 1.1 Taze doğrulama sonucu

Bu turda yapılan doğrulamalar:

| Kontrol | Sonuç | Kanıt / yorum |
|---|---|---|
| `bun run lint` | **PASSED WITH WARNING** | Exit `0`; `src/middleware.ts` içinde kullanılmayan `eslint-disable` uyarısı var. |
| `bunx tsc --noEmit` | **PASSED** | Exit `0`. |
| politika/public DTO/outbox test çağrısı | **PARTIAL** | Test dosyaları PASS mesajı verdi; `bun test ...` ayrıca `D:\project\` için `EPERM` uyarısı verdi ve 0 test raporladı. Komut sözleşmesi M00.5’te düzeltilmeden güvenilir test kapısı sayılmaz. |
| `bun run build` | **FAILED** | Next build, `next/font/google` üzerinden Inter ve JetBrains Mono indirmeye çalışırken ağ erişimi yokluğu nedeniyle başarısız. |
| canlı `/` | **PASSED FOR LOAD** | Dashboard yükleniyor; görünen bazı değerlerin gerçek backend verisi olduğu ayrıca doğrulanmalı. |
| canlı `Yanıtlar` | **PARTIAL** | Form seçici, filtre, tablo ve detail drawer görünüyor; form + istatistik + yanıtların aynı seçili-form bağlamında birlikte görünmesi yok. |
| canlı `Formlar` | **PARTIAL** | 16:9 media alanı, `Ayarlar` ve gizli `…` menüsü görünüyor; medya seçme/yükleme akışı yok. |

### 1.2 Mevcut gerçek ile hedeflenen gerçek arasındaki ayrım

| Alan | Kaynak kanıtı | Sınıf | Release kararı |
|---|---|---|---|
| Form/workspace policy | `src/lib/policy.ts`, çok sayıda API route | Kısmen uygulanmış | Route bazlı negatif test matrisi tamamlanana kadar `BLOCKED`. |
| Public DTO | `src/lib/public-dto.ts` | Helper mevcut, public snapshot güvenli değil | `BLOCKED`; canlı public page aynı allowlist’i kullanmıyor. |
| Publish version | `FormVersion`, `publishedVersionId`, `src/app/api/forms/[id]/publish/route.ts` | Kısmen uygulanmış | `BLOCKED`; public GET canlı Form ilişkilerini okuyor, version snapshot’ı değil. |
| Public form | `src/app/forms/[slug]/page.tsx`, renderer | Çalışan demo/temel akış | `BLOCKED`; internal `form.id` client’a geçiyor, CSS/URL sanitization yok. |
| Yanıt POST | `src/app/api/forms/[id]/submissions/route.ts` | Çalışan temel kayıt | `BLOCKED`; rate limit, güvenilir idempotency kapsamı, form version doğrulaması, dosya ve kötüye kullanım koruması eksik. |
| Yanıt listesi | `src/app/api/forms/[id]/submissions/route.ts`, `submissions-view.tsx` | Çalışan temel liste | `BLOCKED`; sayfa sınırları ve export gerçek değil, seçili form özet paneli yok. |
| Raporlar | `src/app/api/forms/[id]/reports/route.ts`, `reports-view.tsx` | Büyük ölçüde gerçek sorgu, bazı butonlar pasif | `BLOCKED`; export/share ve metrik tanımları kanıtlanmalı. |
| Form card image | `forms-list-view.tsx:600+` | UI görünümü | `BLOCKED`; `settings.coverImageUrl` ham URL, MediaAsset/upload yok. |
| Appearance image | `appearance-panel.tsx` | URL text input | `BLOCKED`; kullanıcı local/form medya alanından seçemiyor. |
| Media upload | `src/lib/file-policy.ts` yalnızca helper | **Yok** | P0; route, storage, DB, scope, private serving yok. |
| Form-scoped media | Prisma’da `MediaAsset`/eşdeğeri yok | **Yok** | P0; mimari önce kurulmalı. |
| Outbox | `src/lib/outbox.ts` bellekte array | Demo helper | `BLOCKED`; process restart ile event kaybı ve çoklu worker yarış koşulu var. |
| WordPress | `wordpress/mavenforms/*`, embed panel | Stub / başlangıç | `BLOCKED`; `block.js` paketi yok, default URL `example.com`, inline loader sözleşmesi doğrulanmamış. |
| Embed | iframe ve script üreten UI | Kısmen uygulanmış | `BLOCKED`; generated script ile gerçek route uyumsuzluğu ve origin güvenliği tamamlanmalı. |
| Builder drag/drop | `@dnd-kit/*`, `BuilderCanvas` | Temel sıralama | `BLOCKED`; bounded Grid/Bento, keyboard/touch ve template izolasyonu ayrıca kanıtlanmalı; nested container ürün kapsamı dışıdır. |
| Payment/integrations | `form-builder-view.tsx:860+`, `:923+` | UI-only | Release’te “bağlı” gösterilemez; gerçek provider yoksa `DEFERRED`/pasif. |
| Dashboard alerts | `src/app/api/dashboard/route.ts` | Mock | Gerçek event/health verisi olmadan gösterilemez. |
| Build | `next/font/google` | Cloud/network bağımlı | P0; build dış ağa bağımlı olmamalı. |

### 1.3 Mantık hataları ve doğrudan çözüm kararları

1. **Yayınlanan form canlı taslaktan okunuyor.** `src/app/api/public/forms/[slug]/route.ts` ve `src/app/forms/[slug]/page.tsx` `db.form` ile canlı alanları okuyor. Yayın sonrası değişen taslak public formu etkileyebilir. Çözüm: public GET yalnızca `publishedVersionId` üzerinden immutable snapshot okur; cover/theme/appearance/media referansları snapshot içine dahil edilir.
2. **Public DTO ile public page aynı sözleşmeyi kullanmıyor.** API’de `sanitizePublicForm` kullanılsa da page doğrudan Prisma formunu map ediyor. Çözüm: tek `buildPublicFormSnapshot()` service ve aynı serializer hem API hem server page hem iframe için zorunlu.
3. **İç kimlik public renderer’a geçiyor.** Page renderer props içinde `id: form.id` var; public submission URL’si internal ID ile kuruluyor. Çözüm: public submission endpoint’i opaque `publicKey` veya slug/version contract kullanmalı; internal CUID client’a verilmemeli.
4. **`customCss`, image URL ve sosyal URL’ler allowlist’siz.** Public CSS ve URL alanları kullanıcı kontrollü olduğu için CSS injection, phishing/link ve istenmeyen dış kaynak yükleme riski vardır. Çözüm: CSS token sistemi + güvenli URL scheme/domain politikası; raw custom CSS yalnızca güvenlik incelemesi ve açık feature flag ile.
5. **JSON parse işlemleri tutarlı değil.** Publish route’unda `JSON.parse` doğrudan; bozuk config publish’i 500’e düşürebilir. Çözüm: schema validation ve tek güvenli parse helper; bozuk config publish kapısı olarak reddedilir.
6. **Dosya politikası gerçek upload değildir.** `validateFile` MIME ve magic bytes kontrol etmiyor; upload route/storage/private serve mevcut değil. Çözüm: byte signature, MIME, uzantı, boyut, checksum, scan status ve authz ile tam MediaAsset akışı.
7. **Outbox kalıcı değil.** `src/lib/outbox.ts` module-level array kullanıyor. Restart, birden fazla instance ve iki worker durumunda event kaybolabilir/çift gönderilebilir. Çözüm: Prisma `OutboxEvent`, claim/lease, idempotency, backoff ve dead-letter görünümü.
8. **Yanıt API’sinde pagination sınırlandırılmamış.** `page` ve `pageSize` `parseInt` ile alınmış; negatif, NaN veya aşırı değerler kabul edilebilir. Çözüm: Zod ile `page >= 1`, `1 <= pageSize <= 100`, search uzunluğu ve status enum doğrulaması.
9. **UI başarı mesajı gerçek işi temsil etmiyor.** Submissions export yalnızca toast gösteriyor; Payment/Integration kartları sabit veri gösteriyor; WordPress download generated stub üretiyor. Çözüm: işlem gerçekleşene kadar buton “planlandı/pasif” olarak görünmeli veya gerçek API’ye bağlanmalıdır.
10. **Seçili form bağlamı yalnızca yanıt listesine daraltılmış.** Form adı ve count sidebar’da var; form önizleme, publish durumu, cover, gerçek KPI ve yanıtlar birleşik workspace’te yok. Çözüm: seçili form için BFF/summary + stats + responses sözleşmesi.
11. **Build dış ağdan font indiriyor.** `src/app/layout.tsx` `next/font/google` kullanıyor. Çözüm: self-hosted font asset veya sistem font fallback; release build network olmadan tekrarlanabilir olmalı.
12. **Test komutunun exit davranışı yanıltıcı.** Test çağrısında `EPERM` görülmesine rağmen exit `0` ve “0 test” raporu var. Çözüm: test runner script’i explicit dosya çalıştıracak şekilde düzenlenmeli ve sıfır test/runner warning failure sayılmalı.

## 2. Sektörel ve teknik doğruların mimari karşılığı

Bu bölüm ürün fikri değil, release mimarisinde korunacak doğrulanabilir ilkeleri tanımlar.

### 2.1 Public/private ayrımı

- Public kişi yalnızca yayınlanmış form şemasını, güvenli görsel türevlerini ve gönderim sonucunu görür.
- Public kişi workspace, owner, member, audit, integration, token, internal ID, draft veya database bilgisini görmez.
- Editör taslağı ile yayınlanmış snapshot farklı yaşam döngülerine sahiptir.
- Preview authenticated bir route’tur; public route değildir.
- Form durdurulursa public GET/POST aynı yayın politikasıyla tutarlı davranır.
- Public POST server-side schema ile doğrulanır; client validation yalnızca kullanıcı deneyimidir.
- Public dosya download URL’si storage path değildir; kısa ömürlü, scope kontrollü URL veya authenticated proxy’dir.

OWASP ASVS, güvenlik kontrollerinin test edilebilir doğrulama gerektirdiği bir temel olarak kullanılacaktır: [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/). Session ve CSRF kararları ayrıca [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) ve [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/CSRF_Prevention_Cheat_Sheet.html) ile karşılaştırılacaktır.

### 2.2 Dosya ve medya doğrusu

Medya için “link alanı” yeterli değildir. Kullanıcı şu iki işlemi aynı noktada yapabilmelidir:

1. mevcut yetkili medya varlığını seçmek,
2. yeni dosyayı yüklemek ve yükleme tamamlanınca onu seçmek.

Fiziksel dosya yolu public web root altında tutulmaz. Geliştirme için:

```text
storage/
  media/
    .gitkeep
    workspaces/<workspace-id>/
      global/<asset-id>/original
      forms/<form-id>/<asset-id>/original
      forms/<form-id>/<asset-id>/derived/<variant>
```

`storage/media` içeriği `.gitignore` ile dışarıda tutulur; cloud’da kalıcı volume veya object storage ile `MEDIA_ROOT` üzerinden bağlanır. Kullanıcının verdiği dosya adı storage key olarak kullanılmaz.

Önerilen `MediaAsset` alanları:

| Alan | Zorunluluk | Amaç |
|---|---:|---|
| `id` | Evet | Internal asset kimliği; public payload’a çıkmaz. |
| `workspaceId` | Evet | Tenant sınırı. |
| `formId` | Hayır | `null` global workspace medya, değer form-medya alanı. |
| `storageKey` | Evet | Internal fiziksel/object storage adresi. |
| `publicUrl` | Hayır | Sadece güvenli published derivative için, ham private key değil. |
| `originalName` | Evet | Kullanıcıya görünen isim. |
| `mime` | Evet | Server tespitli MIME. |
| `size` | Evet | Server ölçümü. |
| `width`, `height` | Hayır | Resim boyutu ve 16:9 validation. |
| `checksum` | Evet | Duplicate ve bütünlük kontrolü. |
| `altText` | Hayır | Erişilebilirlik. |
| `scanStatus` | Evet | `pending`, `clean`, `infected`, `failed`. |
| `visibility` | Evet | `private`, `published`. |
| `createdById`, timestamps | Evet | Audit ve lifecycle. |

Varsayılan picker davranışı: form içinde açılan picker yalnızca aynı formun varlıklarını gösterir. Workspace global medya ayrıca “Ortak medya” filtresiyle açıkça seçilebilir; global varlığın form içine kullanılması snapshot sırasında referanslanır ve form silinmesi global asset’i silmez. Böylece form A, form B’nin private medyasını göremez.

### 2.3 Embed ve WordPress doğrusu

- Iframe en güçlü izolasyon seçeneğidir; parent CSS’i formu bozamaz.
- Inline/custom element kullanılırsa Shadow DOM veya prefix’li CSS, CSP ve strict origin `postMessage` contract gerekir.
- `postMessage('*')` yalnızca kontrollü local geliştirme fallback’i olabilir; production’da allowlist origin zorunludur.
- WordPress shortcode ve Gutenberg block aynı public slug/mode sözleşmesini kullanmalıdır.
- WordPress plugin içine workspace secret/API key gömülmez.
- Embed code yalnızca yayınlanmış form için üretilir; draft için preview URL ve auth gerekir.

Kaynaklar: [MDN iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe), [MDN postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage), [MDN Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM), [WordPress Shortcodes](https://developer.wordpress.org/plugins/shortcodes/), [WordPress Block API](https://developer.wordpress.org/block-editor/reference-guides/block-api/) ve [WordPress script enqueue](https://developer.wordpress.org/plugins/javascript/enqueuing/).

### 2.4 Responsive ve 16:9 doğrusu

Form card cover alanı `aspect-ratio: 16 / 9`, `object-fit: cover`, güvenli fallback ve alt metinle çalışır. 16:9 yalnızca card stilinde değil; asset seçme/preview, public metadata, template ve responsive testlerinde aynı contract’tır. CSS `aspect-ratio` için [MDN aspect-ratio](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/aspect-ratio) kullanılacaktır. Bento container responsive davranışı için [MDN container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries) referans alınacaktır.

## 3. Mimari sıralama ve bağımlılık kapıları

```text
M00 Baseline + gate controller
  -> M01 public/private + authz contract
  -> M02 immutable publish snapshot
  -> M03 media data/storage/scope
  -> M04 media API/security
  -> M05 picker/uploader integration
  -> M06 form card + appearance media UX
  -> M07 selected-form workspace (form + stats + responses)
  -> M08 public delivery + iframe/inline/WordPress
  -> M09 builder drag/drop + container/Bento/templates
  -> M10 real settings/integrations/outbox
  -> M11 cloud/runtime/migration/backup
  -> M12 independent E2E/security/responsive release audit
```

M03, M04 ve M05 tamamlanmadan card veya appearance URL input’larını “upload destekliyor” diye işaretleme. M01 ve M02 tamamlanmadan public/embed release etme. M08 tamamlanmadan dış siteye embed kodu vermek yalnızca geliştirme örneği olarak kalmalıdır.

## 4. En küçük uygulanabilir mikro fazlar

### M00 — Baseline, kanıt ve yanlış pozitiflerin temizlenmesi

#### M00.1 Çalışma ağacı ve mevcut değişiklik envanteri

**Amaç:** Ajanın kullanıcı değişikliklerini kaybetmeden gerçek başlangıç noktasını sabitlemesi.

**Adımlar:**

1. `git status --short --branch`, `git diff --stat`, untracked dosya listesi alın.
2. `RELEASE-ROADMAP.md`, `AI-RELEASE-EXECUTION-PLAN.md`, `RELEASE-CHECKLIST.md`, `CLOUD-DEBUG-HANDOFF.md` okunur.
3. `.env` içeriği loglanmaz; yalnızca gerekli değişken isimleri listelenir.
4. `db/custom.db` ve backup dosyaları kopyalanmadan, hash ve boyut bilgisi kaydedilir.
5. Değişiklik listesi ajanın değiştirebileceği ve dokunamayacağı dosyalar olarak ayrılır.

**Giriş kapısı:** Proje kökü ve çalışma durumu kesin.  
**Çıkış kapısı:** Envanter dosyası veya faz raporu var; destructive komut çalıştırılmadı.  
**Durma koşulu:** Proje kökü belirsizse veya mevcut değişiklikler listelenemiyorsa `BLOCKED`.

#### M00.2 Build’i ağdan bağımsızlaştırma

**Kök neden:** `src/app/layout.tsx` `next/font/google` ile build sırasında Google Fonts’a erişiyor; `bun run build` exit `1`.

**Adımlar:**

1. Font kararını seç: repository içinde lisansı uygun self-hosted dosya veya sistem font fallback.
2. `next/font/google` importlarını kaldır veya local font ile değiştir.
3. CSS variable isimlerini (`--font-geist-sans`, `--font-geist-mono`) koru; görsel layout gereksiz değişmesin.
4. Network kapalı build çalıştır.
5. Build artifact’ında font/asset path’lerini kontrol et.

**Dosya sınırı:** `src/app/layout.tsx`, `src/app/globals.css`, font asset yolu ve ilgili test/README.  
**Test:** `bun run lint`, `bunx tsc --noEmit`, `bun run build`.  
**Çıkış:** Build network olmadan exit `0`; `.next/standalone/server.js` ve static asset’ler mevcut.  
**İzin:** M00.2 geçmeden hiçbir feature fazına geçilemez.

#### M00.3 Route ve UI truth table

Her ekran/route için şu tablo oluşturulur: route, auth, role/capability, workspace scope, public/private, DB source, mutation, test, status.

Minimum yüzey: auth, forms, fields, appearance, theme, logic, notifications, submissions, reports, dashboard, branding, integrations, public form, preview, embed-script, WordPress.

**Çıkış:** Her route’un “gerçek”, “kısmen gerçek”, “UI-only”, “mock”, “yok” durumu kaynak satırıyla yazılır.

#### M00.4 UI-only envanterinin üründen ayrılması

Şu alanlar gerçek backend kanıtı olmadan bağlı görünemez:

- `form-builder-view.tsx` Payment panelindeki sabit Stripe connected durumu,
- Integrations panelindeki sabit Mailchimp connected durumu,
- Dashboard system alerts ve failed notification mock verileri,
- settings-view içindeki SMTP/LDAP/billing alanları,
- submissions export toast’ları,
- reports Export/Paylaş butonları,
- generated WordPress plugin ve default `https://example.com`,
- fake `/api/forms/{id}/embed.js` kodu; gerçek route şu anda `embed-script`.

Her biri için karar `IMPLEMENT`, `DISABLE`, `DEFERRED` veya `REJECTED` olarak yazılır. UI’da disabled ise nedeni görünür ve kullanıcıya başarı mesajı verilmez.

#### M00.5 Test runner güvenilirliği

`bun test tests/...` çağrısının `EPERM` ve `0 test` üretip exit `0` vermesi giderilir. Projede explicit scriptler tanımlanır; sıfır test ve test discovery warning failure sayılır.

**Minimum test komutları:**

```text
bun run lint
bunx tsc --noEmit
bun run build
bun tests/policy.test.mjs
bun tests/public-forbidden.test.mjs
bun tests/outbox.test.mjs
```

**M00 çıkış kapısı:** Build exit `0`, test runner gerçek assertion sayısını raporluyor, warning/zero-test başarısız sayılıyor, canlı `/`, `/forms/<published-slug>`, public GET ve public POST smoke kanıtı var.

#### M00.6 Faz kapısı ve kanıt denetleyicisi

Bu mikro faz, diğer ajanların bir sonraki faza geçmesini metinle değil makinece doğrulanmış kanıtla sınırlar. Bu faz tamamlanmadan M01’e geçiş yasaktır.

**Oluşturulacak dosyalar:**

- `phase-manifest.json` veya `.agents/mavenforms-phase-manifest.json`: fazların sırası, bağımlılıkları, izinli dosyaları, zorunlu komutları ve kabul testlerini tanımlar.
- `scripts/phase-gate.mjs`: faz başlatma, preflight, verify ve lock işlemlerini yapar.
- `scripts/phase-evidence.mjs`: komut sonucu, diff özeti, dosya hash’leri ve browser/HTTP kanıtını bounded JSON olarak yazar.
- `tests/phase-gate.test.mjs`: atlama, eksik kanıt, izin dışı dosya, başarısız test ve sahte PASSED durumlarını reddeder.
- `artifacts/phases/.gitkeep`: kanıt klasörü; secret, cookie, token ve kişisel veri burada tutulmaz.
- `.gitignore`: `artifacts/phases/*` ignore edilir; yalnızca schema/example marker dosyaları tutulur.

**Faz manifestosu zorunlu alanları:**

```json
{
  "id": "M03.2",
  "previous": ["M00.6", "M01.1", "M02.3", "M03.1"],
  "allowedFiles": ["prisma/schema.prisma", "prisma/migrations/**", "tests/**"],
  "forbiddenFiles": [".env*", "db/*.db", "public/**"],
  "requiredCommands": ["bunx prisma validate", "bunx tsc --noEmit"],
  "requiredEvidence": ["test", "diff", "scope", "review"],
  "acceptanceIds": ["AC-MEDIA-DB-01"]
}
```

**Controller kuralları:**

1. `start Mxx.y` yalnızca `previous` listesindeki tüm fazların `PASSED` lock dosyası varsa çalışır.
2. `start` mevcut çalışma ağacındaki önceki faz kanıtı ile yeni ajan başlangıç snapshot’ını ayırır.
3. Ajan yalnızca `allowedFiles` altında değişiklik yapabilir; scope dışı dosya tespit edilirse verify otomatik `BLOCKED` olur.
4. `verify` required command’ları kendisi çalıştırır; ajan “test geçti” diye JSON yazamaz.
5. Her required command exit `0` dönmeli; `0 test`, `EPERM`, warning-as-error veya atlanan test `PASSED` sayılamaz.
6. `finish` test kanıtı, diff scope, acceptance kanıtı ve bağımsız review olmadan lock üretemez.
7. Bir faz `BLOCKED` ise aynı fazın düzeltme turu dışında sonraki faz ID’si reddedilir.
8. Faz tamamlandıktan sonra sonradan dosya değişirse lock geçersizleşir; yeniden verify gerekir.
9. Controller secret, cookie, bearer token, `.env`, DB dump ve submission PII’sini kanıta yazmaz; redaction failure hard failure’dır.
10. Ajan “ortam çalışmadı” diyorsa durum `BLOCKED`; `PASSED` veya `DEFERRED` yazamaz. `DEFERRED` yalnızca ürün sahibi kapsam kararını belgelediğinde kullanılabilir.

**Faz lock örneği:**

```json
{
  "phase": "M00.6",
  "status": "PASSED",
  "manifestSha256": "<controller-generated>",
  "workspaceSha256": "<controller-generated>",
  "commands": [{"run": "bun run lint", "exitCode": 0, "assertions": 1}],
  "changedFiles": ["scripts/phase-gate.mjs", "tests/phase-gate.test.mjs"],
  "acceptance": [{"id": "AC-GATE-01", "evidence": "artifacts/phases/M00.6/..."}],
  "review": {"executor": "agent-A", "verifier": "agent-B", "sameAgent": false}
}
```

`<controller-generated>` alanlarını ajan metinle dolduramaz; gerçek controller hash üretir. `sameAgent: true`, eksik review veya unknown acceptance ID lock üretimini engeller.

**M00.6 çıkış kapısı:** Manifesto var, controller gerçek komut çalıştırıyor, scope dışı değişiklik reddediliyor, previous lock olmadan start reddediliyor, test runner 0 testte başarısız oluyor, secret redaction testi geçiyor ve en az bir bağımsız verifier akışı kanıtlı.

### M01 — Public/private ve authorization contract

#### M01.1 Typed session ve merkezi authorization

`any` tabanlı `SessionContext` kaldırılır veya sınırlandırılır. Her protected route capability check sonrası aynı workspace scoped query’yi kullanır. Auth check ile resource scope aynı katmandan kopuk bırakılmaz.

**Negatif matris:** anonymous `401`; başka workspace resource `404`; yetkisiz role `403`; yetkili owner/admin `200`/`2xx`.

#### M01.2 Public DTO güvenlik sınırı

1. Public response interface typed yapılır.
2. `id`, `formId`, workspace, token, audit, internal, secret, credentials ve private storage key recursive test edilir.
3. `config` ve settings schema ile allowlist edilir.
4. Bozuk JSON kontrollü `400`/publish validation failure üretir; anonim public GET `500` üretmez.
5. URL’ler yalnızca `https:` veya açıkça gerekli `mailto:`/`tel:` scheme’leriyle normalize edilir.
6. `customCss` raw injection olmaktan çıkarılır; MVP’de kaldırılabilir veya yalnızca izinli selector/token subset’i kabul edilir.

#### M01.3 Public endpoint’in internal ID’siz contract’ı

Public renderer’a internal form ID verilmez. Gönderim route’u yayınlanmış opaque public key/slug ile çalışır; server bu anahtarı workspace/form ID’ye çevirir. Public payload’da internal ID bulunmadığını browser ve JSON testleri kanıtlar.

#### M01.4 Preview/public ayrımı

Preview sadece authenticated + workspace scoped kalır. Draft/paused/archived public GET ve POST için beklenen status kodları test edilir. Public GET, preview snapshot’ı kullanamaz.

**M01 çıkış kapısı:** DTO, authz, preview, IDOR ve public forbidden-field testleri gerçek HTTP route’larda geçer.

### M02 — Immutable publish snapshot

#### M02.1 Snapshot şeması

`FormVersion.schemaJson` aşağıdakileri tutar: form metadata, normalized fields, field configs, settings, theme tokens, appearance, public media derivative refs, publish policy ve checksum. Internal DB IDs yalnızca server-side migration/debug metadata olarak kalır.

#### M02.2 Publish transaction

Publish şu atomik işlem olmalıdır:

1. form workspace scope ile okunur,
2. tüm JSON ve media referansları validate edilir,
3. immutable snapshot hazırlanır,
4. checksum hesaplanır,
5. `FormVersion` oluşturulur,
6. önceki published version archived edilir,
7. Form `publishedVersionId` güncellenir,
8. audit event yazılır.

Her adım başarısız olursa form eski yayın sürümünde kalır.

#### M02.3 Public read parity

API route, server page, iframe loader ve WordPress embed aynı snapshot builder’dan beslenir. Taslakta yapılan değişiklik yayın yapılana kadar public sayfada görünmemelidir; republish sonrası yeni checksum görünmelidir.

**M02 çıkış:** publish sonrası draft mutation public’i değiştirmiyor; republish değiştiriyor; public payload internal alan içermiyor.

### M03 — Media domain, klasör ve veri modeli

#### M03.1 Storage sözleşmesi

`storage/media/.gitkeep` iskeleti eklendi; gerçek yüklenen dosyalar ignore edilir. Bu klasör tek başına upload özelliği değildir. `MEDIA_ROOT` zorunlu config olur. Production’da local disk tek instance dışında desteklenmez; object storage adapter contract’ı tanımlanır.

#### M03.2 `MediaAsset` migration

Prisma model ve migration eklenir. `workspaceId`, optional `formId`, storageKey, metadata, checksum, scanStatus, visibility, altText, createdById ve timestamps bulunur. `(workspaceId, formId)` ve checksum için uygun index/unique stratejisi yazılır.

#### M03.3 Scope service

Tek service fonksiyonları:

- `listWorkspaceMedia(ctx, formId, mode)`;
- `assertMediaReadable(ctx, assetId, formId)`;
- `assertMediaWritable(ctx, formId)`;
- `attachMediaToForm(assetId, formId)`;
- `detachMediaFromForm(assetId, formId)`.

Kurallar: form A, form B asset’ini okuyamaz; global asset yalnızca açık global scope ile listelenir; asset ID tahmin edilse bile 404.

#### M03.4 Lifecycle

Form silinince form-scoped asset’ler soft delete/retention politikasına girer; global asset’ler korunur. Bir asset yayınlanmış snapshot’ta kullanılıyorsa silme önce referans kontrolü yapar veya yeni version gerektirir.

**M03 çıkış:** migration backup ile uygulanıyor, form scope negatif testleri geçiyor, storage path traversal testi geçiyor.

### M04 — Güvenli media API ve upload

#### M04.1 Listeleme ve metadata API

`GET /api/media?scope=form&formId=...` yalnızca yetkili kullanıcıya; `GET /api/forms/:id/media` form scoped; response DTO yalnızca UI metadata. Storage key, secret ve private filesystem path dönmez.

#### M04.2 Multipart upload

`POST /api/forms/:id/media` multipart ile çalışır. Server:

1. content-length ve stream boyut limitini kontrol eder,
2. uzantıya güvenmez,
3. MIME + magic bytes doğrular,
4. resim decode edip width/height okur,
5. checksum hesaplar,
6. güvenli random storage key üretir,
7. private original kaydeder,
8. scan status `pending` yazar,
9. metadata döner.

İlk release destek listesi açıkça sınırlandırılır: `png`, `jpeg`, `webp` ve gerekiyorsa `pdf`; SVG ve aktif içerik taşıyabilecek formatlar varsayılan olarak reddedilir.

#### M04.3 Private serve ve derivative

Orijinal dosya `/public` altında sunulmaz. Editor preview authenticated proxy veya signed URL ile; published form yalnızca güvenli derivative ile çalışır. Response `Content-Disposition`, `Content-Type`, cache ve abuse kontrolleriyle ayarlanır.

#### M04.4 Anti-abuse

Upload rate limit, workspace quota, form quota, duplicate checksum, scan timeout ve failed upload cleanup eklenir. Malware scan yoksa dosya `clean` kabul edilmez; public’e çıkmaz.

**M04 çıkış:** gerçek multipart HTTP testinde yükleme, reddetme, scope denial, private read ve published derivative davranışı kanıtlı.

### M05 — Media picker/uploader’ın bütün UI alanlarına bağlanması

#### M05.1 Ortak `MediaPicker`

Tek bileşen şunları sağlar: form scope badge, mevcut asset listesi, arama, preview, alt text, upload, upload progress, retry, remove, seçimi temizle, erişilebilir keyboard flow.

#### M05.2 Form card cover

`settings.coverImageUrl` yerine `coverMediaId`/published media reference kullanılır. Card 16:9 alanı:

- `aspect-ratio: 16 / 9`,
- `object-fit: cover`,
- image yoksa deterministic fallback,
- alt text/title,
- broken image fallback,
- mobile ve uzun başlık testleri.

#### M05.3 Appearance header/footer/login branding

`appearance-panel.tsx` ve workspace branding alanlarında raw URL text input yerine picker + isteğe bağlı güvenli external URL policy kullanılır. Kullanıcı aynı formun media klasörünü görür; upload sırasında yeni dosya doğrudan seçili forma bağlanır.

#### M05.4 Builder media block

`media` field, form içeriğinde kullanılacak asset reference tutar; public snapshot yalnızca yayınlanmış asset metadata’sını içerir. Submission file upload ile authoring media birbirine karıştırılmaz; iki ayrı domain olarak kalır.

**M05 çıkış:** card, appearance, builder media ve branding alanlarında link-only akış kalmamış; upload/select/replace/delete ve scope testleri geçmiştir.

### M06 — Form card, `…` ve sağ alt Ayarlar UX sözleşmesi

#### M06.1 Card interaction

Card gövdesi form detayına; sağ üst `…` menüsü eylemlere; sağ alt `Ayarlar` form ayarlarına gider. Button propagation, keyboard focus ve mobile overflow test edilir.

#### M06.2 Eylem doğruluğu

Her menü eylemi gerçek route’a bağlanır: edit, preview, public, embed, submissions, duplicate, pause/publish, archive. API başarısızsa card state optimistic olarak kalıcılaşmaz.

#### M06.3 Fallback ve responsive

16:9 görsel, eksik görsel, çok uzun form adı, dar viewport, reduced motion ve screen reader label test edilir.

**M06 çıkış:** screenshot/DOM ve E2E’de bütün card eylemleri gerçek sonuç üretiyor.

### M07 — Seçili form: form + istatistik + yanıtlar aynı bağlamda

#### M07.1 Backend summary contract

Yeni bir BFF veya açık üç endpoint contract’ı belirlenir:

```text
GET /api/forms/:id/summary
GET /api/forms/:id/stats?from=&to=
GET /api/forms/:id/submissions?page=&pageSize=&status=&search=
```

Summary: id yalnızca authenticated app içinde, title, slug, status, cover metadata, published version, updatedAt, field count. Stats: total, today, pending, approved, rejected, completion/conversion yalnızca ölçüm tanımı varsa, trend. Responses: pagination ve gerçek field values.

#### M07.2 Frontend state machine

Seçim değişince:

1. eski request abort edilir,
2. selectedFormId tek kaynaktan güncellenir,
3. page/filter resetlenir,
4. summary/stats/responses loading state birlikte gösterilir,
5. biri hata verirse diğerleri sessizce eski form verisini göstermeden error state verir.

#### M07.3 Görsel yerleşim

Yanıtlar ekranı üç seviyeli olmalıdır:

1. üstte seçili form hero/card: cover, başlık, status, public/preview/edit actions,
2. KPI/stat cards ve kısa trend,
3. filtrelenebilir yanıt tablosu + detail drawer.

Form selector yine kalabilir; selector değiştiğinde üç bölüm aynı form için yenilenir. Kullanıcı ayrı Raporlar ekranına gitmeden temel karar verici bilgiyi görür.

#### M07.4 Gerçek export

CSV/XLSX butonları toast değil API job/stream sonucudur. Export yetkisi, filtre snapshot’ı, pagination dışı bütün sonuç, kolon allowlist, PII audit ve dosya retention tanımlanır.

**M07 çıkış:** canlı browser’da form değiştirince cover/summary/KPI/yanıtlar birlikte değişiyor; stale data görünmüyor; export gerçek dosya veya açıkça pasif.

### M08 — Public URL, iframe, inline ve WordPress delivery

#### M08.1 Public URL

Yayınlanmamış form için 404/403 policy; yayınlanmış form için snapshot render. `robots`, canonical, cache ve closed form davranışı tanımlanır.

#### M08.2 Iframe

Üretilen iframe:

- HTTPS public URL,
- `title`, `loading`, `referrerpolicy`,
- gerektiği kadar `sandbox`,
- responsive wrapper,
- parent CSS izolasyonu,
- strict origin resize/submitted messages.

Parent origin, workspace/form allowlist ile eşleşmiyorsa mesaj gönderilmez. `'*'` production kabul kriterini geçemez.

#### M08.3 Inline/custom element

Inline yalnızca iframe ile aynı public API contract’ını kullanır. CSS Shadow DOM/prefix ile izole edilir; loader duplicate initialization, CSP, destroy/re-init ve multiple forms per page test edilir.

#### M08.4 WordPress plugin

`wordpress/mavenforms` paketinde:

- gerçek `block.js` veya server-rendered block edit deneyimi,
- shortcode attribute validation,
- admin settings nonce/capability kontrolü,
- base URL validation,
- enqueue yalnızca block/shortcode kullanıldığında,
- no secret in plugin,
- iframe/inline mode seçimi,
- versioned asset/cache busting,
- WP 6.x smoke test.

Default `example.com` production çıkışında bulunamaz; settings yoksa plugin kontrollü hata döndürür.

**M08 çıkış:** aynı public published form direct URL, iframe, inline ve WordPress shortcode/block içinde responsive çalışıyor; app credential veya internal data sızmıyor.

### M09 — Gerçek drag/drop, container, Bento ve templates

#### M09.1 Veri modeli

Alanlar düz liste olmaktan çıkarılacaksa migration ve backward-compatible normalizer gerekir. Önerilen node modeli: `id`, `type`, `parentId`, `order`, `layout`, `props`, `visibilityRules`. Eski düz `sortOrder` verisi deterministik root node’a çevrilir.

#### M09.2 Container

Container özellikleri: nested child list, max depth, responsive columns, gap, alignment, empty state, keyboard focus, delete/move safeguards. Cycle ve orphan node server/client validation ile reddedilir.

#### M09.3 Bento 12-column layout

Desktop 12 kolon; tablet/mobile breakpoint’lerde 6/4/1 veya ürün kararıyla belirlenen grid. Her node için min/max span, no-overflow ve content min-width. CSS grid ile uygulanır; absolute pixel koordinatlara bağlanmaz.

#### M09.4 Drag/drop accessibility

Pointer, touch ve keyboard aynı reducer/action contract’ını kullanır. Keyboard için pick-up, move, drop, cancel ve live region mesajları gerekir. Reduced motion ve focus restore test edilir. dnd-kit kurulu olması tek başına kabul kanıtı değildir.

#### M09.5 Template system

Template immutable seed + clone-on-use ile çalışır. Template içindeki media asset’ler private/global scope ile yeniden eşlenir; başka workspace asset ID’si kopyalanmaz. Template preview public publish snapshot’ı değildir.

**M09 çıkış:** container nesting, 12-col responsive Bento, keyboard/touch/pointer, template clone, undo/redo veya açıkça desteklenmeyen davranışlar E2E ile kanıtlı.

### M10 — Gerçek ayarlar, integrations ve kalıcı outbox

#### M10.1 Settings truthfulness

SMTP, billing, LDAP, payment ve integration ayarları ya gerçek provider contract’ına bağlanır ya da release UI’sında `DEFERRED` gösterilir. Secret değerler tekrar response’a dönmez; test connection sonucu credential sızdırmadan kaydedilir.

#### M10.2 Prisma OutboxEvent

Önerilen alanlar: id, workspaceId, formId, submissionId, type, payloadJson, status, attemptCount, availableAt, lockedUntil, lockedBy, lastError, createdAt, sentAt. Submission transaction içinde outbox row aynı transaction’da oluşturulur; transaction commit olmadan dispatch yapılmaz.

#### M10.3 Worker güvenliği

Claim lease, exponential backoff, max attempt, dead-letter, idempotency key, provider timeout ve structured redacted logs gerekir. `processOutboxOnce` memory helper olarak kalamaz.

#### M10.4 Email/webhook

Gerçek provider adapter interface’i, timeout/retry contract’ı ve test provider oluşturulur. Webhook SSRF allowlist, signing secret, response status policy ve replay protection ile çalışır.

**M10 çıkış:** process restart, iki worker, provider timeout, duplicate delivery ve dead-letter senaryoları testli.

### M11 — Cloud çalışma zamanı ve release operasyonu

#### M11.1 Config ve build

Production env schema, missing secret fail-fast, no `db:push --accept-data-loss`, deterministic build ve artifact checksum. Next standalone self-hosting için [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting) ve deployment rehberi [Next.js deploying](https://nextjs.org/docs/app/getting-started/deploying) izlenir.

#### M11.2 Database

Release migration `prisma migrate deploy` ile uygulanır; Prisma migration deploy dokümanı [Prisma migrate deploy](https://docs.prisma.io/docs/cli/migrate/deploy) temel alınır. SQLite yalnızca tek-instance pilot kararı açıkça onaylanırsa kalır; çok-instance/yoğun yazma hedefinde PostgreSQL migration fazı öne alınır. SQLite kullanım sınırı için [SQLite When To Use](https://www.sqlite.org/whentouse.html) incelenir.

#### M11.3 Health/readiness

`health` process liveness; `ready` database, migration, storage ve gerekli provider dependency readiness kontrolüdür. 200/503 sözleşmesi, timeout ve secret redaction test edilir. Reverse proxy’de HTTPS, body limit, timeout ve header policy [Caddy reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) ile doğrulanır.

#### M11.4 Backup/restore/rollback

DB backup checksum, restore dry-run, media backup, previous artifact, migration rollback stratejisi ve operator runbook gerçek staging ortamında denenir. “Dosya var” backup kanıtı değildir; restore edilebildiği gösterilir.

**M11 çıkış:** ayrı staging, migration, seed-free smoke, health/ready, backup restore, rollback ve log correlation ID kanıtlı.

### M12 — Bağımsız release audit

Bu fazı önceki fazları yapan ajan değil, mümkünse ayrı bir ajan/kişi yürütür.

#### M12.1 Browser E2E

Playwright ile şu akışlar gerçek route/UI üzerinden test edilir: login/logout, form create/edit/publish, media upload/select/scope, cover, appearance, drag/drop, selected-form workspace, public direct, iframe, inline, WordPress fixture, submission, status update, export.

Playwright trace ve best practices kullanılmalıdır: [Trace Viewer](https://playwright.dev/docs/trace-viewer-intro), [Best Practices](https://playwright.dev/docs/best-practices), [Test use options](https://playwright.dev/docs/test-use-options).

#### M12.2 Security regression

- cross-workspace form/media/submission IDOR,
- public forbidden keys,
- draft-after-publish leakage,
- malformed JSON,
- CSS/URL injection,
- file path traversal and polyglot/magic-byte mismatch,
- upload and submission rate limit,
- webhook SSRF,
- iframe message origin,
- WordPress secret exposure.

#### M12.3 Responsive/a11y

Viewport minimumleri: 360x800, 768x1024, 1280x800, 1440x900. Keyboard-only navigation, focus visibility, labels, required announcement, image alt, error summary, reduced motion ve iframe overflow doğrulanır.

#### M12.4 Release decision

Şu koşullardan biri varsa karar `NO-GO`:

- build network olmadan geçmiyor,
- public snapshot/private boundary kanıtlanmamış,
- media upload private değil veya form scope yok,
- WordPress/embed credential sızdırıyor,
- outbox kayıp/duplicate kontrolsüz,
- E2E kritik akışları yok,
- backup restore denenmemiş,
- UI gerçek olmayan başarı/bağlantı gösteriyor.

## 5. Media uygulama ayrıntısı

### 5.1 Kullanıcı akışları

#### Form oluştururken

1. Form taslağı oluşturulur.
2. Form media alanı otomatik oluşturulmazsa ilk upload’ta oluşturulur.
3. Card cover, header logo, header background, footer logo ve media block aynı form scope picker’ını açar.
4. Kullanıcı “Bu form medyası” ve “Ortak workspace medyası” kaynaklarını ayrı görür.
5. Upload tamamlanmadan asset seçilmiş sayılmaz.
6. Save/publish sırasında seçilen asset’ler scope ve scan status ile doğrulanır.

#### Form kopyalarken

Kaynak formun cover ve media block referansları körlemesine ID kopyalamaz. Ürün kararı:

- global asset aynı global asset olarak referanslanabilir,
- form-scoped asset clone edilir veya yeni formda bilinçli olarak “kopyala” seçilir,
- private asset başka form scope’una izinsiz bağlanamaz.

#### Form silerken

Soft delete; published snapshot referansları, retention ve restore kararı kontrol edilmeden fiziksel silme yapılmaz.

### 5.2 API hata sözleşmesi

| Durum | Status | Client davranışı |
|---|---:|---|
| Boyut fazla | 413 | Dosyayı yüklemeden açık hata. |
| Tip/magic mismatch | 415 | “Dosya tipi doğrulanamadı”; retry yok. |
| Scan pending | 202 | Asset seçilebilir değil; polling/event. |
| Infected | 422 | Asset reddedilir; private quarantine. |
| Form scope denial | 404 | Asset yokmuş gibi davranılır. |
| Quota | 409/413 | Workspace quota mesajı. |
| Storage unavailable | 503 | Retry/backoff; kısmi DB kaydı temizlenir. |

## 6. Seçili form ekranı için kabul kriterleri

- `AC-FORM-01`: Seçili form değişince form hero, cover, status, summary, stats ve response table aynı form ID/snapshot ile eşleşir.
- `AC-FORM-02`: Eski formun yavaş response’u yeni seçilen formun tablosunu ezemez.
- `AC-FORM-03`: Form cover yoksa fallback görünür; bozuk URL/asset public görünümü bozmaz.
- `AC-FORM-04`: KPI değerleri DB sorgusundan gelir; hard-coded conversion veya süre gösterilmez.
- `AC-FORM-05`: Filtre/page/search değişince yalnızca seçili form scope’unda sorgu yapılır.
- `AC-FORM-06`: Detail drawer başka workspace/submission verisini açamaz.
- `AC-FORM-07`: CSV/XLSX eylemi gerçek dosya üretir veya açıkça disabled ve gerekçelidir.
- `AC-FORM-08`: 360px viewport’ta selector, summary, stats ve table taşma yapmadan kullanılabilir.

## 7. Public/export güvenlik kabul kriterleri

- `AC-PUBLIC-01`: Anonymous GET yalnızca published immutable snapshot döner.
- `AC-PUBLIC-02`: Public page, API, iframe, inline ve WordPress aynı allowlist DTO’yu kullanır.
- `AC-PUBLIC-03`: Response içinde internal `id`, `formId`, workspace, owner, token, integration, secret, private storage key yoktur.
- `AC-PUBLIC-04`: Draft değişikliği republish olmadan public’i değiştirmez.
- `AC-PUBLIC-05`: Public submission internal form ID’sine bağımlı değildir veya ID public payload’a sızmaz.
- `AC-PUBLIC-06`: Custom CSS/URL alanları saldırı payload’ı ile test edilmiştir.
- `AC-PUBLIC-07`: Iframe parent mesajları strict origin ile sınırlıdır.
- `AC-PUBLIC-08`: Export response’ları yetki, tenant scope, kolon allowlist ve PII politikası ile sınırlıdır.
- `AC-PUBLIC-09`: WordPress plugin hiçbir app secret/API credential içermez.
- `AC-PUBLIC-10`: Public asset yalnızca clean/published derivative üzerinden sunulur.

## 8. Diğer ajan için tam yürütme prompt’u

Aşağıdaki metin her mikro faz için doğrudan başka ajana verilebilir. `{FAZ}` ve `{DOSYA SINIRI}` alanları doldurulmadan çalıştırılmamalıdır.

```text
Türkçe çalış. MavenForms projesinde yalnızca {FAZ} fazını uygula.

Öncelik sırası:
1) Önce D:\project\mavenform\IMPLEMENTATION-AUDIT-AND-MICROPHASE-PLAN.md dosyasını tamamen oku.
2) Çalışma ağacını ve mevcut uncommitted değişiklikleri koru; reset, checkout, geniş kapsamlı silme yapma.
3) Bu fazın giriş kapısını ve bütün önceki fazların regresyon kontrollerini çalıştır.
4) Önce gözlenen gerçekleri, sonra ürün varsayımlarını ayır. Kaynak kod kanıtı olmadan “uygulandı” deme.
5) Değişiklik sınırı: {DOSYA SINIRI}. Bunun dışındaki dosyalara dokunma; zorunlu bağımlılık çıkarsa dur ve raporla.
6) Özellik UI’da görünüyor diye çalışıyor kabul etme. Model/migration, server route, authz/scope, UI, public/export/cloud davranışını ayrı doğrula.
7) Test-first ilerle: önce başarısız kabul testini veya route contract testini ekle, sonra minimum kodu yaz.
8) Public yüzeye Prisma nesnesi, internal ID, workspace/owner, token, secret, audit, private storage key çıkarma.
9) Media varsa form/workspace scope, private storage, magic-byte/MIME/size, checksum, scanStatus ve delete/restore davranışını doğrula.
10) Her API inputunu schema ile doğrula; page/pageSize/rate-limit/URL/CSS/upload sınırlarını açıkça uygula.
11) Her UI başarı mesajını gerçek server sonucuna bağla. Mock/placeholder/connected/done sonucu gerçek kanıt yoksa gösterme.
12) Faz sonunda şu komutları çalıştır: {TEST KOMUTLARI}. Komut exit code ve gerçek assertion sayısını raporla.
13) İlgili browser akışını Playwright ile çalıştır; failure trace/screenshot yolunu yaz.
14) Faz çıkış kapısı başarısızsa sonraki faza geçme. Kök neden, güvenli düzeltme ve yeniden test sonucu yaz.
15) Son raporu şu başlıklarla ver:
   - Gözlenen başlangıç durumu
   - Yapılan değişiklikler
   - Değişen dosyalar
   - Testler ve exit code
   - Browser/HTTP kanıtı
   - Güvenlik ve tenant-scope sonucu
   - Önceki faz regresyonu
   - Kalan riskler
   - Faz durumu: PASSED/BLOCKED/DEFERRED
   - Sonraki faza izin: VAR/YOK
```

## 9. İlk uygulanacak sıra ve durdurma kararı

Bu proje için sonraki ajanlara verilecek ilk görev listesi:

1. **M00.2:** network bağımsız build’i düzelt ve `bun run build` exit `0` kanıtla.
2. **M00.5:** test runner’ın `EPERM`/0 test false-positive davranışını düzelt.
3. **M00.6:** faz manifestosu ve makinece doğrulanan gate controller’ı kur; bu tamamlanmadan M01 başlatma.
4. **M01.2–M02.3:** public page/API/snapshot parity ve internal ID sızıntısını kapat.
5. **M03.1–M04.4:** media klasörü, MediaAsset, form scope, upload ve private serving.
6. **M05.1–M06.3:** tüm resim alanlarını picker/upload’a bağla; card 16:9/`…`/Ayarlar davranışını gerçek eylemlere bağla.
7. **M07.1–M07.4:** seçili form form+istatistik+yanıt birleşik ekranı.
8. **M08:** public direct/iframe/inline/WordPress.
9. **M09:** Bento/container/template builder.
10. **M10–M12:** gerçek entegrasyon, outbox, cloud, bağımsız E2E ve release audit.

**Şu anki nihai karar:** Uygulama lokal olarak yükleniyor ve bazı temel API/UI akışları çalışıyor; fakat build, public snapshot güvenliği, media upload/scope, birleşik seçili-form ekranı, WordPress/embed, kalıcı outbox ve bağımsız E2E release kapıları geçmediği için full functional/release-ready değildir.

## 10. Ajanların işi atlamasını önleyen zorunlu kontrol sistemi

Bu bölüm, üstteki faz listesinin nasıl uygulanacağını tanımlar. Amaç ajanı cezalandırmak değil; eksik işin “tamamlandı” diye raporlanmasını teknik olarak mümkün olduğunca engellemektir. LLM öz-beyanı hiçbir kapının tek kanıtı değildir.

### 10.1 Kontrol ilkeleri

1. **Tek fazlık görev:** Bir ajan aynı görevde yalnızca bir `Mxx.y` fazı yürütür. “Tüm release’i düzelt” prompt’u kullanılmaz.
2. **Önce kanıt, sonra değişiklik:** Başlangıç snapshot’ı ve giriş testleri kaydedilmeden kod değiştirilemez.
3. **Önceki faz kilidi:** Her fazın `previous` listesi vardır. Eksik veya geçersiz lock varsa faz controller tarafından başlatılmaz.
4. **İzinli dosya kapsamı:** Faz manifestosundaki `allowedFiles` dışına çıkan tek dosya bile otomatik failure’dır.
5. **Sahte başarı yasağı:** Ajanın yazdığı `status: PASSED` metni geçerli değildir; controller komutları yeniden çalıştırır.
6. **Bağımsız doğrulama:** Executor ve verifier aynı ajan olamaz. Verifier yalnızca raporu değil kodu, testi ve canlı davranışı okur.
7. **Gerçek sistem kanıtı:** Mock helper testi, gerçek route/UI/provider kanıtı yerine kullanılamaz.
8. **İlerleme kilidi:** `BLOCKED` faz çözülmeden sonraki faza geçiş ve sonraki faz dosyalarına değişiklik yasaktır.
9. **Yeni değişiklik invalidation:** Lock alındıktan sonra tracked/untracked dosya farkı oluşursa lock otomatik geçersizdir.
10. **Eksik ortam = BLOCKED:** Cloud credential, gerçek provider, browser veya migration ortamı yoksa ajan işi atlamaz; `BLOCKED` ve engel raporu verir.

### 10.2 Üç ajanlı çalışma modeli

| Rol | Yapabileceği iş | Yapamayacağı iş |
|---|---|---|
| `executor` | Yalnızca atanmış fazın testini ve minimum kodunu değiştirir. | Kendi fazını onaylayamaz; sonraki faza dokunamaz. |
| `verifier` | Diff, test, route/UI ve acceptance kanıtını bağımsız inceler. | Executor adına feature kodu yazamaz; eksik kanıtı tamamlanmış sayamaz. |
| `release-auditor` | M12’de bütün zinciri baştan çalıştırır ve NO-GO kararını verebilir. | Önceki faz lock’larını geriye dönük değiştiremez. |

Tek ajanlı ortamda `verifier` rolü ayrı bir otomatik controller/test süreci olmalıdır; aynı modelin kendi yazdığı açıklamayı tekrar okuması bağımsız review kabul edilmez.

### 10.3 Faz durum makinesi

```text
NOT_STARTED
   | start: previous locks + clean preflight
   v
IN_PROGRESS
   | verify: all commands + scope + acceptance + review
   +---------------------> PASSED -> next phase allowed
   |
   +---------------------> BLOCKED -> only same-phase repair allowed
   |
   +---------------------> DEFERRED -> product-owner decision + UI disabled
```

Controller şu geçişleri reddeder:

- `NOT_STARTED -> PASSED`,
- `BLOCKED -> next phase`,
- `IN_PROGRESS -> DEFERRED` yalnızca owner kararı olmadan,
- `PASSED -> next phase` required evidence olmadan,
- lock sonrası dosya değişikliğiyle yeniden verify olmadan.

### 10.4 Her faz için zorunlu preflight

Controller veya ajan, faz koduna dokunmadan aşağıdakileri çalıştırır:

```text
1. Proje kökü doğrula.
2. Manifesto ID ve checksum doğrula.
3. Önceki fazların lock dosyalarını doğrula.
4. Çalışma ağacı başlangıç snapshot’ını üret.
5. Secret/PII loglanmadığını doğrula.
6. Atanmış dosya allowlist’ini yazdır.
7. Required baseline testlerini çalıştır.
8. Browser/HTTP dependency erişilebilir değilse BLOCKED kaydet.
```

Preflight’ta hata varsa ajan feature koduna geçmez. Hata, “sonraki fazda düzeltilir” diye ertelenemez.

### 10.5 Kabul kriterlerini test kimliğiyle bağlama

Her acceptance criterion bir veya daha fazla gerçek test kimliğine bağlanır:

```json
{
  "id": "AC-PUBLIC-04",
  "tests": [
    "tests/public-publish-parity.test.mjs: draft_does_not_change_public_snapshot",
    "e2e/public-form.spec.ts: published_snapshot_is_stable"
  ],
  "evidenceType": ["http", "browser", "db-readback"]
}
```

Test kimliği çalıştırılmadan acceptance `passed` olamaz. “Manuel baktım” yalnızca görsel kanıt olabilir; server security acceptance’ını geçemez.

### 10.6 Kanıtın kötüye kullanılmasını önleme

Controller şu durumları hard failure yapar:

- test dosyasının assertion içermemesi,
- testin yalnızca mock function çağırması ve gerçek route’a gitmemesi,
- `try/catch` ile assertion failure’ın yutulması,
- `process.exit(0)` ile failure’ın maskelenmesi,
- `@ts-ignore`, `eslint-disable`, `as any` ile kapı hatasının bastırılması,
- `TODO`, `FIXME`, `ComingSoon`, `mock`, `demo`, `placeholder` veya sabit `connected` durumunun production path’inde kalması,
- browser testinde gerçek buton yerine yalnızca component render snapshot’ı kullanılması,
- public JSON testinin yalnızca helper output’unu inceleyip `/api/public/**` veya server page’i incelememesi,
- provider bağlanmadan provider’ın connected gösterilmesi,
- cloud çalışmadığında local başarı raporunun cloud kanıtı diye yazılması.

Bu tarama false positive üretirse ajan taramayı kapatmaz; kuralı dosya/line bazında allowlist’e alır ve verifier onayı ister.

### 10.7 Dosya kapsamı ve diff kapısı

Her faz için:

1. başlangıç dosya hash listesi alınır,
2. bitişte değişen dosyalar çıkarılır,
3. her dosya manifest allowlist ile eşleştirilir,
4. migration/generated file gibi zorunlu yan etkiler manifestte açıkça tanımlı değilse failure verilir,
5. `.env`, DB dump, `public/` private media veya credentials değişikliği otomatik `BLOCKED` olur.

Git kullanılmayan ortamlarda aynı iş `Get-FileHash`/manifest snapshot ile yapılır. Git commit tek başına gate değildir; commit edilmiş hatalı kod da failure’dır.

### 10.8 Önceki fazların yeniden doğrulama matrisi

Her yeni faz şu sınırlı ama gerçek regresyon setini yeniden çalıştırır:

| Sonraki faz | Yeniden çalışacak kontroller |
|---|---|
| M01 | M00 build/lint/tsc/test/smoke |
| M02 | M00 + M01 authz/DTO/IDOR |
| M03 | M00–M02 + publish/public parity |
| M04 | M00–M03 + migration/rollback/scope |
| M05 | M00–M04 + upload/private serve |
| M06 | M00–M05 + card/appearance media |
| M07 | M00–M06 + selected form and response APIs |
| M08 | M00–M07 + public direct/embed/WordPress |
| M09 | M00–M08 + public/export security |
| M10 | M00–M09 + integration/outbox failure cases |
| M11 | M00–M10 + production build/health/backup |
| M12 | M00–M11 bağımsız tam audit |

Regresyon setinden biri geçmezse yeni fazın kendi testi geçse bile faz `BLOCKED` kalır.

### 10.9 “Yaptım” raporu yerine zorunlu kanıt paketi

Her faz şu dosya/çıktı paketini üretir:

```text
artifacts/phases/<phase>/
  preflight.json
  commands.json
  changed-files.json
  acceptance-results.json
  http-smoke.json              # token/PII redacted
  browser-summary.json         # trace path only, secret yok
  review.json
  result.json
```

Kanıt dosyaları bounded olmalı; response body, cookie, bearer token, form submission değeri ve `.env` kopyalanmaz. Kanıt üretimi redaction kontrolünü geçemezse faz başarısızdır.

### 10.10 Ajan prompt’unda kullanılacak zorunlu ek talimat

Mevcut Bölüm 8 prompt’una aşağıdaki metin eklenir ve çelişki halinde bu bölüm önceliklidir:

```text
KENDİ RAPORUNU KANIT SAYMA.
Faz controller’ı çalıştırmadan ve previous lock’ları doğrulamadan hiçbir dosyayı değiştirme.
Sadece manifestteki allowedFiles alanına dokun.
Bir test çalışmadıysa, browser/cloud/provider erişilemediyse veya test runner 0 assertion döndürdüyse PASSED yazma; BLOCKED yaz.
Bir sonraki fazın koduna, testine, migration’ına veya docs’una dokunma.
UI’da görünen özelliği backend, yetki, veri, public/export ve gerçek HTTP/browser akışıyla kanıtlamadan tamamlandı kabul etme.
Mock, demo, placeholder, ComingSoon, sabit connected veya yalnızca toast davranışını gerçek işlev yerine raporlama.
Faz sonunda controller’ın ürettiği result.json dışında başarı iddiasında bulunma.
Bağımsız verifier onayı olmadan lock üretme ve sonraki faza geçme.
```

### 10.11 Human/owner kararına ayrılan tek alan

Ajan ürün kapsamı hakkında kendi başına “bunu atlayalım” kararı veremez. Yalnızca şu üç durumda `DEFERRED` yazabilir:

1. özellik açıkça release kapsamı dışında tanımlanmış,
2. UI’da pasif/kapalı ve kullanıcıya tamamlanmış izlenimi vermiyor,
3. owner kararı ve sonraki hedef fazı kanıt paketinde bulunuyor.

Güvenlik, tenant isolation, public leakage, migration, backup/restore, build, authentication veya form submission doğruluğu `DEFERRED` olamaz; bunlar `BLOCKED`/`NO-GO`’dur.

### 10.12 Bu revizyonun ilk zorunlu uygulaması

Bir sonraki ajan doğrudan M01’e başlamaz. Sıra:

1. M00.2 build düzeltmesi,
2. M00.5 test runner düzeltmesi,
3. M00.6 controller + manifest + gate testleri,
4. controller ile M00 lock üretimi,
5. yalnızca bundan sonra M01.1.

M00.6 kodlanana kadar diğer ajanlar yalnızca read-only audit yapabilir. Böylece planın kendisi uygulanmadan planın sonraki adımlarının uygulanmış gibi raporlanması engellenir.
