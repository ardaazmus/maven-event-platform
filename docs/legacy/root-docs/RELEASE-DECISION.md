# Release Decision — MavenForms (2026-09-02)

## R-10 kapsam revizyonu — 2026-09-08

Bu revizyon R-10’u tek bir ürün kilidi olmaktan çıkarıp sürüm ve ortam bazlı güvenlik kapısı olarak tanımlar. Güvenlik standardı gevşetilmez; yalnız V3 Paraşüt ve V4 SaaS’ın henüz kesinleşmemiş ileri hedefler olması nedeniyle V1/V2 ilk hedefini bloke etmemesi sağlanır.

| Kapı | İzin verilen kapsam | Eksik kanıtın sonucu |
|---|---|---|
| `R-10/V1` | Maven iç kullanım formları, public kayıt, yanıtlar, manuel ödeme takibi ve güvenli bildirim hazırlığı | V1 capability’si kapalı kalır; V1 iç geliştirmesi devam eder |
| `R-10/V2` | Maven first-party gerçek ödeme ve muhasebeci kontrollü manuel fatura pilotu | Gerçek ödeme mutation’ı, fatura teslimi veya production açılışı `NO-GO`; credential’sız geliştirme durmaz |
| `R-10/V3` | Kanıtlanırsa Paraşüt ve ileri provider adaylarının ayrı değerlendirilmesi | `DEFERRED/NO-GO`; V2 manuel yolunu bloke etmez |
| `R-10/V4` | Tenant’ın kendi bağlantılarıyla SaaS | Tenant/SaaS production açılmaz; V1/V2 hedefini etkilemez |

**İlk ürün hedefi:** V1 çalışan iç kullanım + V2 Maven first-party gerçek ödeme + manuel fatura gönderim pilotu. Paraşüt otomatik faturalama ve SaaS bu hedefe ulaşmanın şartı değildir.

## R-10 final release gate checkpoint — 2026-09-06

**Güncel karar:** `NO-GO` — V2 production/live ödeme ve fatura teslimi henüz açılmıyor; V1 iç kullanım ve V2’nin güvenli local/staging geliştirmesi blanket olarak durdurulmuyor.

## 2026-09-07 provider ve fatura kapsam kararı

Bu bölüm önceki checkpoint’in yerine geçmez; güncel V2 kapsam yorumunu netleştirir.

- Türkiye first-party ödeme için öncelik iyzico hosted checkout’tır. Gerçek merchant/sandbox, webhook, retrieve, refund ve reconciliation kanıtları olmadan ödeme live açılmaz.
- Banka Sanal POS araştırması ileri sürüm için korunur; hosted/3DS, yabancı kart/kur, MAC-hash, sorgu/iade, IP/TLS, sözleşme ve banka aktivasyon kanıtları sağlayıcı bazında tamamlanmadan V2’ye alınmaz.
- Stripe Türkiye merchant uygunluğu kanıtlanmadığı için V2’den ertelenmiştir; Stripe V3+ adaydır. Google Pay de desteklenen gateway/provider kanıtı olmadan direct ödeme yöntemi olarak açılmaz.
- V2’nin fatura yolu Paraşüt’e bağlı değildir: muhasebecinin dış sistemde kestiği fatura private/quarantine upload, eşleştirme, yetkili onay ve `document_ready` sonrasında ayrı billing sender ile yetkili manuel gönderilebilir.
- Otomatik/toplu fatura gönderimi ve Paraşüt otomatik faturalaması silinmemiştir; risk, resmi API/GİB, mali müşavir, teslimat ve reconciliation kanıtları tamamlanana kadar `DEFERRED/OPTIONAL` kalır.
- Erken mimari hazırlık provider-neutral port, normalized result, capability/evidence ve feature gate ile sınırlıdır. Bu portların varlığı Stripe, banka POS veya Paraşüt entegrasyonunun tamamlandığı anlamına gelmez.

## V2-09A first-party çıkış kapısı — 2026-09-07

V2’nin local/staging teknik zinciri iyzico-first first-party ödeme, muhasebecinin manuel fatura yüklemesi ve ayrı transactional billing sender sözleşmeleriyle doğrulanmıştır. Bu yerel kanıt production release veya gerçek provider teslimat kanıtı değildir.

**Karar:** `NO-GO` — V2 production/public release kapısı açılmadı.

- V2 yalnız Maven’ın kendi first-party workspace/merchant kapsamı olarak tutulur; tenant adına ödeme ve SaaS abonelik tahsilatı bu sürümde yoktur.
- Gerçek iyzico sandbox/merchant, webhook/retrieve/refund/reconciliation, sender domain, AV/quarantine, staging test alıcısı ve mali müşavir kabul kanıtları tamamlanmadan live ödeme, production dispatch veya public release açılamaz.
- Manuel fatura zinciri `issued → private/quarantine → stable match → authorized approval → clean document_ready → ayrı transactional delivery` sırasını korur.
- Stripe, banka Sanal POS, Google Pay direct ve Paraşüt otomasyonu V2’de açılmaz; ilgili resmi provider, merchant, ülke/kanal, API/GİB, risk ve reconciliation kanıtlarıyla ileri fazlarda yeniden değerlendirilir.
- Yerel test, TypeScript, build ve readiness PASS sonucu production `GO` anlamına gelmez; V2 production kanıtı eksik olduğu sürece yalnız ilgili V2 mutation/delivery kapalı kalır.

## V3-05 Paraşüt otomatik faturalama çıkış kapısı — 2026-09-07

**Karar:** `NO-GO/DEFERRED` — Paraşüt otomatik faturalama bu aşamada açılmadı.

- V3-00..V3-04 yalnız provider-neutral OAuth, scope, resolution, payload, bounded formalization, document-ready ve manuel fallback sözleşmelerini local testlerle doğrular; bu testler gerçek provider entegrasyonu veya production kanıtı değildir.
- Gerçek Paraşüt sandbox/test company, OAuth yetkilendirmesi, satış faturası, e-Fatura/e-Arşiv, job/PDF, GİB/mali müşavir kabulü, reconciliation, AV/quarantine, sender domain ve deployment kanıtları tamamlanmadan otomatik faturalama mutation’ı çalıştırılamaz.
- V2 manuel yol zorunlu fallback’tir: muhasebecinin dış sistemde kestiği belge private/quarantine upload → stable match → yetkili approval → clean `document_ready` → ayrı transactional billing sender sırasını korur.
- Paraşüt geçici PDF URL’si public forma veya doğrudan mail body’sine taşınmaz; SaaS tenant’larına Paraşüt connection/company kapsamı açılmaz.
- Bu karar vergi veya hukuk görüşü değildir; resmi provider, GİB ve mali müşavir kanıtları gelirse ayrı release revision’ında tekrar değerlendirilir.

## R-10C first-party kapsam düzeltmesi — 2026-09-06

`NO-GO` kararı tüm geliştirmeyi durduran tek bir ürün kilidi olarak uygulanmayacaktır. Şirketimizin kendi adına, yalnız local/staging ve test alıcısı sınırında kontrollü pilot capability’si ayrılmıştır. Bu istisna production release, canlı provider mutation, gerçek müşteri teslimatı veya SaaS tenant tahsilatı izni değildir.

- Manuel fatura yolu: muhasebeci dış sistemde keser; yetkili kullanıcı doğru ödeme kaydına private/quarantine belge yükler; eşleştirme ve onaydan sonra `document_ready` olur; ayrı billing sender ile test alıcısına transactional mail kuyruğa alınabilir.
- Ödeme yolu: gerçek provider sandbox merchant kanıtı ve server-side şirket profili olmadan yalnız sentetik/local sözleşme testi yapılabilir. Browser callback başarı kanıtı değildir.
- SaaS yolu: tenant’ın kendi merchant hesabı ve kendi muhasebe/mail bağlantısı gelecekteki SaaS/BYO fazına aittir; bu düzeltme tenant adına para toplamaz.
- Global R-10 dış kanıtları eksik olduğu sürece `PAYMENT_LIVE_ENABLED=true`, production dispatch ve public release kapalı kalır.

Kanonik capability kararı: [`r10-first-party-pilot-and-manual-invoice.md`](docs/runbooks/r10-first-party-pilot-and-manual-invoice.md).

**Bu checkpoint’in doğruladığı ayrım:** R-00..R-09 için yerel sözleşme, test, TypeScript, build ve readiness kanıtları mevcut; bunlar gerçek provider, GİB, mali müşavir/hukuk, AV, e-posta teslimatı, production TLS veya backup/restore kanıtı değildir. Doğrulanmamış dış bağımlılık GO kararına çevrilmemiştir.

**V2 ilk hedefi için kalan zorunlu kapılar:**

- Gerçek iyzico first-party sandbox ödeme/webhook/retrieve/refund/reconciliation akışı, merchant hesabı ve imza doğrulaması.
- AV/quarantine, private document retrieval, transactional e-posta provider teslimatı ve gerçek webhook retry/dead-letter provası.
- Production TLS/proxy/HSTS, izole staging canary ve gerçek backup/restore tatbikatı.
- V1/V2 public form, embed/WordPress canlı kurulum matrisi ve 360/768/1280 responsive tarayıcı kanıtı.

**V2’yi bloke etmeyen ileri kapılar:** Paraşüt test hesabında OAuth → invoice → e-Fatura/e-Arşiv job → PDF/document-ready zinciri, güncel GİB paketleri ve mali müşavir onayı V3 kapısına aittir. Stripe, banka Sanal POS ve Google Pay kanıtları da ileri provider değerlendirmesidir.

**Açık olmayanlar:** Kart bilgisi veya provider secret tutulması açılmadı; geçici provider PDF URL’si public/maile taşınmıyor; belirsiz alıcı/belge/iade durumları fail-closed review olarak kalıyor. Bu karar teknik bir release denetimidir, vergi veya hukuk görüşü değildir.

**R-10 kontrol kuralı:** Bu dış kanıtlardan biri eksikken V2 production/live payment-invoice release’i açılmaz. Eksik kanıtlar ilgili sürüm kapısında tutulur; yalnız V3/V4’e ait kanıt eksikleri V1/V2 first-party geliştirmesini durdurmaz.

**Karar:** `NO-GO` — release kapısı açık değil

**NO-GO koşulları kontrolü:**
- build network olmadan geçiyor: **PASS** (M00.2 `next/font/google` kaldırıldı, `bun run build 0` offline)
- public snapshot/private boundary: **PARTIAL** (DTO allowlist ve published snapshot var; bağımsız release testi henüz kilitlenmedi)
- media upload private ve form scope: **PARTIAL** (scope/decoder/size kontrolleri var; harici antivirus/quarantine entegrasyonu yok)
- WordPress/embed credential sızmıyor: **PARTIAL** (yayınlanmış form, encoded slug ve origin/source kontrolü var; canlı WordPress kurulumu henüz doğrulanmadı)
- outbox kayıp/duplicate kontrolü: **PARTIAL** (DB transaction ve lease yardımcıları var; gerçek dispatcher/retry/dead-letter çalıştırma provası yok)
- E2E kritik akışları: **PASS (local smoke)** (35 test dosyası ve login/public submit akışı geçti; bağımsız responsive tarayıcı matrisi yok)
- backup restore: **NOT VERIFIED IN THIS CHECKPOINT** (yeni manifest altında restore kilidi üretilmedi)
- UI gerçek olmayan başarı: **PARTIAL** (kart/yanıt/export/media aksiyonları bağlandı; bento container/templates ve bazı entegrasyon dispatch işleri tamamlanmadı)

**Kalan V2 NO-GO kapıları:** yeni manifest altında ilgili M00.5–M12 kilitleri, gerçek 360/768/1280 tarayıcı matrisi, antivirus/quarantine, outbox dispatcher/retry/dead-letter, canlı WordPress testi ve backup/restore provası. Paraşüt otomasyonu ve SaaS kapıları bu listenin V2 önkoşulu değildir.

**Sonuç:** V1/V2 local geliştirme ve kontrollü first-party pilot capability’si `PASS`; V2 production/live payment-invoice release `NO-GO`; Paraşüt ve SaaS ileri safha olarak beklemede.

## V4-07 SaaS release ve tenant isolation kapısı

V4 yerel tenant sözleşmeleri V4-03–V4-06 ile doğrulanmıştır: tenant’ın kendi invoice/mail/payment bağlantıları, sınırlı destek onayı, harici/manual platform aboneliği ve suspend/reactivate veri koruması birbirinden ayrıdır. Bu kanıtlar production SaaS açılışı değildir.

**Karar:** `NO-GO` — V4 production release kapısı açık değil.

- MavenForms tenant adına end-customer para tutmaz veya tenant’ın müşterisine kendi merchant kimliğiyle ödeme almaz; tenant payment provider ve hesap kapsamı tenant’a aittir.
- MavenForms abonelik durumu tenant end-customer payment order’ından ayrı tutulur; ilk model operator-controlled reference/date/approval’dır ve provider tahsilatı yapılmaz.
- Tenant invoice/document/recipient PII’si operator read model’ine taşınmaz. Destek erişimi varsayılan `deny`, tenant onaylı, süreli, read-only, MFA/step-up ve ticket/reason kapsamındadır.
- Askıya alma form, public publish, yeni form ve silme aksiyonlarını kapatır; izinli export veri silmeden devam eder. Reactivation önceki snapshot/idempotency state’inin korunduğunu gerektirir.
- Live provider, gerçek e-posta teslimatı, production TLS, backup/restore, legal/DPA, incident response ve bağımsız tenant izolasyonu kanıtları bulunmadan V4 production veya tenant self-service billing açılmaz.
- R-10 `NO-GO/BLOCKED` olarak korunur; bu bölüm R-10 kapısını gevşetmez ve gerçek provider/session/data mutation çalıştırmaz.
