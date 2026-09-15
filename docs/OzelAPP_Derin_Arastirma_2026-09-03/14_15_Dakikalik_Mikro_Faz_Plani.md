# 14 — 15 Dakikalık Mikro-Faz Uygulama Planı

**Plan tarihi:** 3 Eylül 2026  
**Kullanım:** Her mikro-faz en fazla 15 dakikalık, tek doğrulanabilir değişikliktir. Repo görülmediği için gerçek dosya adları uydurulmamış; değişecek dosya türleri belirtilmiştir. Bir iş kırmızı→yeşil→güvenlik kontrolüyle kapanmadan sıradaki işe geçilmez.

## Genel geçiş kapısı

Her ana faz sonunda birlikte kanıtlanır: önceki ve yeni testler; güvenlik kontrolü; migration/rollback ile veri kaybı olmaması; public response/bundle/log secret-leak taraması; typecheck/lint/build; gerekli dış servis kanıtı. Mock ve sandbox canlı kanıt değildir. Dış kanıt yoksa durum `EXTERNAL DEPENDENCY` olarak kapalı kalır.

| Sıra | Faz | Amaç | Ön koşul | Kabul kapısı | Dış bağımlılık |
|---:|---|---|---|---|---|
| 1 | Ödeme | Hosted iyzico; koşullu Stripe/Google Pay adapter’ı | Merchant/capability araştırması | Doğrulanmış test akışı; canlı hesap ayrı | Stripe ülke hesabı, iyzico merchant, wallet onayı |
| 2 | Güvenlik/mutabakat | Webhook, refund, ledger ve reconciliation | Faz 1 modeli | Replay/duplicate/order/refund/mismatch testleri | Provider event/report erişimi |
| 3 | Manuel fatura | Seçim, güvenli export, dış belge importu | Mutabık payment | Duplicate/edit/audit/CSV güvenlik testleri | Muhasebe kolon sözleşmesi |
| 4 | Paraşüt v4 | OAuth, mapping, satış faturası, e-belge job | Faz 3 modeli | Contract test + rate limit + timeout duplicate kontrolü | Paraşüt client/test/live ve kanıt boşlukları |
| 5 | Belge güvenliği | Validate, immutable store, document-ready | Provider belge sonucu | Zararlı/cross-tenant/overwrite/link testleri | XML/PDF/AV/store/retention |
| 6 | Transactional e-posta | Outbox, auth domain, webhook/suppression | Document-ready + domain olayları | Tek mesaj, signed webhook, no promo/PII | Provider/DNS/DPA |
| 7 | Pilot | Uçtan uca kontrollü canlı doğrulama | Faz 1–6 kapıları | Finans+muhasebe+belge+mail kanıt paketi | Canlı küçük işlem ve paydaş onayı |
| 8 | Form/builder/embed | Public snapshot, responsive/a11y, WP | Pilot kabulü | Secret leak, 320px, keyboard, CSP/WP testleri | WP matrisi/anti-abuse |
| 9 | SaaS | Tenant/secret/askı/reactivation/abonelik | Faz 8 ve ürün kararı | Cross-tenant matrix, read-only/export/reactivate | Billing/retention/support policy |

## Faz 1 — OzelAPP ödeme sistemi

### F1.1 — Provider capability sözleşmesi

- **Faz kodu:** F1.1
- **Amaç:** Stripe/iyzico/Google Pay yeteneklerini ortak enum/DTO ile temsil etmek.
- **Ön koşul:** Yok; araştırma kararı onaylı.
- **Değişecek mimari alan:** Payment provider boundary.
- **Değişecek dosya türleri:** Domain type/interface, unit test.
- **Önce yazılacak test:** Bilinmeyen capability’nin güvenli `false` döndürmesi.
- **Beklenen kırmızı test:** Adapter capability metodu/enum’u yok.
- **Minimum üretim kodu:** `currency`, `installment`, `wallet`, `refund`, `partial_refund`, `live_eligible` alanlı sözleşme.
- **Yeşil test:** iyzico/Stripe stub’ları yalnız bildiğini bildirir.
- **Güvenlik kontrolü:** Capability payload’ında secret/account internal ID yok.
- **Geri dönüş planı:** Yeni interface/type dosyasını geri al; veri değişmez.
- **Kabul kriteri:** UI bilinmeyen yöntemi göstermiyor.
- **Sonraki faza geçiş kapısı:** Typecheck/lint/test yeşil.

### F1.2 — PaymentOrder çekirdek kaydı

- **Faz kodu:** F1.2
- **Amaç:** Sipariş ve provider attempt kimliğini ayırmak.
- **Ön koşul:** F1.1.
- **Değişecek mimari alan:** Payment domain/persistence.
- **Değişecek dosya türleri:** Migration, model, repository test.
- **Önce yazılacak test:** Aynı internal order altında iki attempt; provider ID tenant+account kapsamında tekil.
- **Beklenen kırmızı test:** Tablo/model/constraint yok.
- **Minimum üretim kodu:** UUID order, tenant, amount_minor, currency, provider, environment, attempt relation.
- **Yeşil test:** Integer tutar ve tenant-scoped uniqueness geçer.
- **Güvenlik kontrolü:** PAN/CVV/client secret kolonları yok.
- **Geri dönüş planı:** Yalnız boş yeni tabloları down migration ile kaldır.
- **Kabul kriteri:** Tutar float olmadan round-trip olur.
- **Sonraki faza geçiş kapısı:** Migration up/down + veri kaybı kontrolü.

### F1.3 — iyzico CF initialize sınırı

- **Faz kodu:** F1.3
- **Amaç:** Server-calculated order’dan CF initialize request üretmek.
- **Ön koşul:** F1.2; iyzico sandbox/test credential.
- **Değişecek mimari alan:** iyzico adapter.
- **Değişecek dosya türleri:** Adapter, request mapper, contract test fixture.
- **Önce yazılacak test:** Client amount farklıysa request internal amount’ı kullanır.
- **Beklenen kırmızı test:** Mapper/adapter yok.
- **Minimum üretim kodu:** Initialize çağrısı ve token/conversation mapping; raw card alanı yok.
- **Yeşil test:** Resmi fixture sözleşmesi ve amount/currency doğrulaması geçer.
- **Güvenlik kontrolü:** API secret/request body loglanmıyor.
- **Geri dönüş planı:** Adapter feature flag kapatılır.
- **Kabul kriteri:** Test ortamında hosted form tokenı alınır; bu canlı kanıt sayılmaz.
- **Sonraki faza geçiş kapısı:** Sandbox contract kanıtı + secret scan.

### F1.4 — Callback retrieve ve bekleme ekranı

- **Faz kodu:** F1.4
- **Amaç:** Callback’i başarı değil retrieve tetikleyicisi yapmak.
- **Ön koşul:** F1.3.
- **Değişecek mimari alan:** Public payment return + adapter retrieve.
- **Değişecek dosya türleri:** Route/controller, service, integration test, UI state.
- **Önce yazılacak test:** Sahte `success=true` callback fulfillment yapamaz.
- **Beklenen kırmızı test:** Mevcut callback doğrudan başarıya düşüyor veya route yok.
- **Minimum üretim kodu:** Token retrieve, order/provider/amount/currency match, `processing` ekranı.
- **Yeşil test:** Yalnız provider sonucu eşleşince normalize state güncellenir.
- **Güvenlik kontrolü:** Token URL/log/analytics’te kalıcı değil; generic hata.
- **Geri dönüş planı:** Return route’u bakım ekranına al; provider ödeme kaydı korunur.
- **Kabul kriteri:** Manipüle callback no-op; kullanıcı kesinleşmeyi poll eder.
- **Sonraki faza geçiş kapısı:** Negative callback testleri ve build yeşil.

### F1.5 — Stripe/Google Pay güvenli kapı

- **Faz kodu:** F1.5
- **Amaç:** Uygunluk yokken Stripe/Google Pay’i gösterilmez yapmak.
- **Ön koşul:** F1.1.
- **Değişecek mimari alan:** Feature/capability policy.
- **Değişecek dosya türleri:** Policy/config schema, UI test.
- **Önce yazılacak test:** Türkiye hesabı kanıtı yoksa Stripe/Google Pay butonu yok.
- **Beklenen kırmızı test:** Yöntem koşulsuz render ediliyor veya policy yok.
- **Minimum üretim kodu:** `live_eligible=false` default, kanıt referansı/tarih alanı.
- **Yeşil test:** Yalnız onaylı provider+domain+runtime capability’de wallet görünür.
- **Güvenlik kontrolü:** Google Pay `DIRECT` enum/config ile reddedilir.
- **Geri dönüş planı:** Feature flag kapalı kalır.
- **Kabul kriteri:** Yanlış konfigürasyon fail-closed.
- **Sonraki faza geçiş kapısı:** Canlı uygunluk belgesi yoksa `EXTERNAL DEPENDENCY`.

## Faz 2 — Ödeme güvenliği, webhook, refund ve reconciliation

### F2.1 — Raw webhook verification katmanı

- **Faz kodu:** F2.1
- **Amaç:** Parse öncesi provider imza kontrolü.
- **Ön koşul:** F1 PaymentOrder.
- **Değişecek mimari alan:** Webhook edge.
- **Değişecek dosya türleri:** Route/middleware, verifier, security test.
- **Önce yazılacak test:** Bozuk imza, değiştirilmiş body ve eski timestamp durum değiştirmez.
- **Beklenen kırmızı test:** Verifier yok/parsed body kullanılıyor.
- **Minimum üretim kodu:** Body size/method limit + provider verifier + constant-time compare.
- **Yeşil test:** Geçerli fixture kabul; üç negative vaka `4xx`.
- **Güvenlik kontrolü:** Signature/secret loglanmaz; TLS config doğrulanır.
- **Geri dönüş planı:** Endpoint disable; retrieve reconciliation ile kayıt korunur.
- **Kabul kriteri:** İmzasız hiçbir event inbox’a giremez.
- **Sonraki faza geçiş kapısı:** Provider’ın güncel imza fixture’ı; iyzico kanıtı yoksa blokaj.

### F2.2 — Append-only event inbox ve dedupe

- **Faz kodu:** F2.2
- **Amaç:** Tekrarlı webhook’u tek yan etkiye indirmek.
- **Ön koşul:** F2.1.
- **Değişecek mimari alan:** Event persistence/queue.
- **Değişecek dosya türleri:** Migration, repository, worker test.
- **Önce yazılacak test:** Aynı event iki kez gönderilince tek inbox/tek job.
- **Beklenen kırmızı test:** Duplicate constraint/idempotency yok.
- **Minimum üretim kodu:** Tenant+provider account+event ID unique inbox, request hash, received time.
- **Yeşil test:** İkinci teslim no-op `2xx`; ilk kayıt değişmez.
- **Güvenlik kontrolü:** Payload erişimi kısıtlı/retention; hassas alan redaction.
- **Geri dönüş planı:** Worker durdur; inbox verisini silme.
- **Kabul kriteri:** Replay finansal yan etki üretmez.
- **Sonraki faza geçiş kapısı:** Concurrency duplicate testi.

### F2.3 — Deterministik state reducer

- **Faz kodu:** F2.3
- **Amaç:** Sırasız event ve frontend yarışında ileri yönlü yakınsama.
- **Ön koşul:** F2.2.
- **Değişecek mimari alan:** Payment state service.
- **Değişecek dosya türleri:** Reducer, transition table, property/unit test.
- **Önce yazılacak test:** `succeeded` sonrası eski `processing` geri düşüremez; callback+webhook tek fulfillment.
- **Beklenen kırmızı test:** Son gelen event kör overwrite eder.
- **Minimum üretim kodu:** Allowed transition table + stale eventte provider retrieve hook’u.
- **Yeşil test:** Permütasyonlarda aynı son durum/tek outbox.
- **Güvenlik kontrolü:** Tenant/provider account mismatch reddedilir.
- **Geri dönüş planı:** Worker pause, inbox replay için korunur.
- **Kabul kriteri:** State permutation/property testleri yeşil.
- **Sonraki faza geçiş kapısı:** Fulfillment idempotency kanıtı.

### F2.4 — Refund command ledger

- **Faz kodu:** F2.4
- **Amaç:** Yetkili tam/kısmi iade ve retry güvenliği.
- **Ön koşul:** F2.3; `succeeded` ödeme.
- **Değişecek mimari alan:** Refund service/RBAC.
- **Değişecek dosya türleri:** Migration, command handler, adapter, authorization tests.
- **Önce yazılacak test:** Toplam refund tahsilatı aşar veya editor çağırırsa provider çağrısı yok.
- **Beklenen kırmızı test:** Limit/RBAC/idempotency kaydı yok.
- **Minimum üretim kodu:** Refund record, amount_minor, reason, actor, idempotency key, pending state.
- **Yeşil test:** Tek yetkili çağrı; timeout retry aynı key; sonucu webhook/retrieve yakınsar.
- **Güvenlik kontrolü:** Step-up/gerekçe/audit; CSRF private UI’da.
- **Geri dönüş planı:** Yeni refund creation disable; provider sonucu inbox ile izlenir.
- **Kabul kriteri:** Duplicate ve over-refund negative testleri yeşil.
- **Sonraki faza geçiş kapısı:** Sandbox refund üretim kanıtı sayılmaz; live pilot faz 7.

### F2.5 — Günlük reconciliation exception job’u

- **Faz kodu:** F2.5
- **Amaç:** Order↔provider ve provider↔payout farklarını listelemek.
- **Ön koşul:** F2.3–F2.4; provider report fixture/API.
- **Değişecek mimari alan:** Finance ledger/job.
- **Değişecek dosya türleri:** Importer, job, exception model, tests.
- **Önce yazılacak test:** Orphan, currency mismatch, duplicate ID ve failed refund exception üretir.
- **Beklenen kırmızı test:** Reconciliation modeli yok.
- **Minimum üretim kodu:** Kayan pencere importer + exact minor-unit matcher + exception record.
- **Yeşil test:** Fixture’daki dört fark doğru sınıflanır; eşleşenler `provider_matched`.
- **Güvenlik kontrolü:** Report tenant/account scoped; banka verisi rol sınırlı.
- **Geri dönüş planı:** Job disable; sonuçlar silinmez, manuel export sürer.
- **Kabul kriteri:** Aynı pencere rerun duplicate exception oluşturmaz.
- **Sonraki faza geçiş kapısı:** Provider report erişimi yoksa `EXTERNAL DEPENDENCY`.

## Faz 3 — Manuel fatura sistemi

### F3.1 — Invoice candidate/allocation modeli

- **Faz kodu:** F3.1
- **Amaç:** Yalnız mutabık ödemelerden değişebilir fatura adayı üretmek.
- **Ön koşul:** Faz 2 kapısı.
- **Değişecek mimari alan:** Billing domain.
- **Değişecek dosya türleri:** Migration, model, invariant tests.
- **Önce yazılacak test:** Unreconciled/currency-mismatch ödeme adaya ayrılamaz.
- **Beklenen kırmızı test:** Candidate/allocation yok.
- **Minimum üretim kodu:** Candidate, customer snapshot, payment allocation, status.
- **Yeşil test:** Allocation toplamı ve currency invariant’ı geçer.
- **Güvenlik kontrolü:** VKN/TCKN log maskesi ve role scope.
- **Geri dönüş planı:** Boş yeni tabloları down; ödeme kaydı değişmez.
- **Kabul kriteri:** Aynı payment amount aşırı tahsis edilemez.
- **Sonraki faza geçiş kapısı:** Migration/test/typecheck.

### F3.2 — Kısmi grup seçimi snapshot’ı

- **Faz kodu:** F3.2
- **Amaç:** Sayfalama/filtre değişse de seçimi deterministik tutmak.
- **Ön koşul:** F3.1.
- **Değişecek mimari alan:** Billing selection service/UI.
- **Değişecek dosya türleri:** Selection model, API/UI test.
- **Önce yazılacak test:** Filtre değişince kayıtlı selection ID listesi değişmez.
- **Beklenen kırmızı test:** UI yalnız current page state tutuyor.
- **Minimum üretim kodu:** Batch ID + selected candidate IDs/query snapshot/count.
- **Yeşil test:** Tekil/kısmi/tüm filtre seçimi açık count ile çalışır.
- **Güvenlik kontrolü:** Başka tenant candidate ID’si reddedilir.
- **Geri dönüş planı:** Batch draft silinebilir; candidate değişmez.
- **Kabul kriteri:** Export tam snapshot’tan üretilir.
- **Sonraki faza geçiş kapısı:** Cross-tenant negative test.

### F3.3 — Güvenli Excel/CSV export

- **Faz kodu:** F3.3
- **Amaç:** Sürümlü muhasebe handoff dosyası üretmek.
- **Ön koşul:** F3.2; muhasebe kolon sözleşmesi.
- **Değişecek mimari alan:** Export service.
- **Değişecek dosya türleri:** Serializer/template, golden fixture, security test.
- **Önce yazılacak test:** `=CMD()` benzeri değer formül olmaz; kolon/tutar/tarih deterministik.
- **Beklenen kırmızı test:** Escape/schema/hash yok.
- **Minimum üretim kodu:** UTF-8 CSV/XLSX serializer, schema version, file SHA-256.
- **Yeşil test:** Golden file ve formula injection testleri geçer.
- **Güvenlik kontrolü:** Yetkili role; süreli tenant link; export audit.
- **Geri dönüş planı:** Export template version’ını eskiye al; batch korunur.
- **Kabul kriteri:** Muhasebe fixture’ı içe alır; dosya e-belge olarak etiketlenmez.
- **Sonraki faza geçiş kapısı:** Dış muhasebe kabul kanıtı.

### F3.4 — Dış belge import/duplicate kilidi

- **Faz kodu:** F3.4
- **Amaç:** PDF/XML/ETTN’yi adaya güvenle bağlamak.
- **Ön koşul:** F3.1; izinli format kararı.
- **Değişecek mimari alan:** Invoice import.
- **Değişecek dosya türleri:** Upload route, metadata model, duplicate tests.
- **Önce yazılacak test:** Aynı tenant+issuer+ETTN ikinci kez ve cross-tenant dosya erişimi reddedilir.
- **Beklenen kırmızı test:** Unique/tenant/type kontrolü yok.
- **Minimum üretim kodu:** Quarantine reference, ETTN/no/date/type, candidate link, unique constraint.
- **Yeşil test:** Duplicate no-op/uyarı; orijinal belge değişmez.
- **Güvenlik kontrolü:** Size/type/magic/XXE/AV; PII loglanmaz.
- **Geri dönüş planı:** Import intake kapat; quarantine kayıtlarını retention’a bırak.
- **Kabul kriteri:** Issue sonrası in-place edit reddedilir; resend yalnız delivery yaratır.
- **Sonraki faza geçiş kapısı:** Faz 5 tam tarama gelene kadar `document_ready` verilmez.

## Faz 4 — Paraşüt API v4

### F4.1 — OAuth authorization transaction

- **Faz kodu:** F4.1
- **Amaç:** Per-tenant Paraşüt auth-code bağlantısı.
- **Ön koşul:** Paraşüt client/redirect onayı.
- **Değişecek mimari alan:** Integration identity/secrets.
- **Değişecek dosya türleri:** OAuth route/service, state store, security tests.
- **Önce yazılacak test:** State/redirect mismatch ve replay token yazamaz.
- **Beklenen kırmızı test:** Callback binding yok.
- **Minimum üretim kodu:** Exact redirect, state, one-time transaction, encrypted token reference.
- **Yeşil test:** Tek callback tenant bağlantısı kurar; ikinci replay reddedilir.
- **Güvenlik kontrolü:** Password grant yok; code/token loglanmaz; PKCE durumu görünür.
- **Geri dönüş planı:** Connector flag kapalı; local token revoke.
- **Kabul kriteri:** Test bağlantısı company scope ile doğrulanır.
- **Sonraki faza geçiş kapısı:** PKCE/revoke boşluğu yazılı `EXTERNAL DEPENDENCY`.

### F4.2 — Atomik refresh token rotasyonu

- **Faz kodu:** F4.2
- **Amaç:** Dönen refresh tokenı kaybetmeden güncellemek.
- **Ön koşul:** F4.1.
- **Değişecek mimari alan:** Secret lifecycle.
- **Değişecek dosya türleri:** Token service, concurrency/failure tests.
- **Önce yazılacak test:** DB write hata verince eski token kaybolmaz; eşzamanlı refresh tek kazanan.
- **Beklenen kırmızı test:** Token overwrite yarışı.
- **Minimum üretim kodu:** Version/CAS + encrypted new pair + transaction.
- **Yeşil test:** Failure injection ve concurrency testleri geçer.
- **Güvenlik kontrolü:** Plaintext yalnız process memory; audit’te reference/version.
- **Geri dönüş planı:** Connection degraded; manuel reconnect, secret dump yok.
- **Kabul kriteri:** Rotasyon sonrası tek aktif version.
- **Sonraki faza geçiş kapısı:** KMS ve recovery runbook kanıtı.

### F4.3 — Contact/product mapping

- **Faz kodu:** F4.3
- **Amaç:** Müşteri ve hizmeti duplicate yaratmadan eşlemek.
- **Ön koşul:** F4.2.
- **Değişecek mimari alan:** Accounting adapter mapping.
- **Değişecek dosya türleri:** Mapping model, Paraşüt client, contract tests.
- **Önce yazılacak test:** Timeout sonrası aynı local entity ikinci external create’e kör gitmez.
- **Beklenen kırmızı test:** External mapping/operation hash yok.
- **Minimum üretim kodu:** tenant+company+type+local/external ID mapping ve canonical request hash.
- **Yeşil test:** Get/list sonrası mevcut nesne kullanılır; belirsiz durum exception.
- **Güvenlik kontrolü:** VKN araması tenant/company scoped ve maskeli log.
- **Geri dönüş planı:** Auto-create kapat; manuel mapping.
- **Kabul kriteri:** Mapping rerun idempotent davranır.
- **Sonraki faza geçiş kapısı:** Genel API idempotency yokluğu belgeli.

### F4.4 — Sales invoice ve e-document job

- **Faz kodu:** F4.4
- **Amaç:** Faturayı oluşturup inbox’a göre e-Fatura/e-Arşiv job’ı başlatmak.
- **Ön koşul:** F4.3; müşavir onaylı alanlar.
- **Değişecek mimari alan:** Billing orchestration.
- **Değişecek dosya türleri:** Adapter methods, operation state, contract fixtures.
- **Önce yazılacak test:** Inbox registered/unregistered doğru endpoint sınıfını; timeout duplicate exception’ı üretir.
- **Beklenen kırmızı test:** Routing/job state yok.
- **Minimum üretim kodu:** Sales invoice create, inbox query, e-document create, operation/job ID.
- **Yeşil test:** Her fixture doğru route ve `pending` operation kaydı üretir.
- **Güvenlik kontrolü:** Company/tenant mismatch ve tax field allowlist.
- **Geri dönüş planı:** Auto-issue kapat; manuel fatura akışına dön, yaratılmış external kayıt korunur.
- **Kabul kriteri:** Belirsiz create otomatik tekrarlanmaz.
- **Sonraki faza geçiş kapısı:** Test company kanıtı; canlı pilot faz 7.

### F4.5 — Throttled job/PDF poller

- **Faz kodu:** F4.5
- **Amaç:** 10/10s sınırında job ve PDF hazır oluşunu izlemek.
- **Ön koşul:** F4.4.
- **Değişecek mimari alan:** Queue/rate limiter.
- **Değişecek dosya türleri:** Worker, throttle/backoff config, time-based tests.
- **Önce yazılacak test:** `204`, `429`, `5xx` bounded reschedule; `4xx` kör retry değil.
- **Beklenen kırmızı test:** Tight loop/rate limiter yok.
- **Minimum üretim kodu:** Per company token bucket + jitter backoff + terminal job handling.
- **Yeşil test:** Sanal saatte limit aşılmaz, max attemptte exception.
- **Güvenlik kontrolü:** Provider PDF URL public payload/loga girmez.
- **Geri dönüş planı:** Worker pause; job ID kalıcı, sonra devam.
- **Kabul kriteri:** Done→invoice reread→backend download handoff.
- **Sonraki faza geçiş kapısı:** PDF var, XML endpoint yoksa hukuki blokaj görünür.

## Faz 5 — Fatura belge güvenliği ve document-ready

### F5.1 — Quarantine intake ve tür doğrulama

- **Faz kodu:** F5.1
- **Amaç:** Provider/import dosyasını görünmez quarantine’e almak.
- **Ön koşul:** F3.4/F4.5.
- **Değişecek mimari alan:** Document pipeline.
- **Değişecek dosya türleri:** Intake service, parser config, malicious fixtures.
- **Önce yazılacak test:** Sahte MIME, oversized, path traversal ve XXE rejected.
- **Beklenen kırmızı test:** Content-Type’a güveniliyor veya pipeline yok.
- **Minimum üretim kodu:** Random key, size/extension/magic allowlist, XXE-off parser.
- **Yeşil test:** Temiz fixture quarantined; zararlı fixture rejected.
- **Güvenlik kontrolü:** Quarantine public/presign rolüne kapalı.
- **Geri dönüş planı:** Intake disable; mevcut quarantine retention ile temizlenir.
- **Kabul kriteri:** Hiçbir doğrulanmamış dosya download edilemez.
- **Sonraki faza geçiş kapısı:** Malware scanner hazır.

### F5.2 — AV/validation ve metadata

- **Faz kodu:** F5.2
- **Amaç:** Temiz dosya, schema/imza seviyesini ve hash’i kaydetmek.
- **Ön koşul:** F5.1.
- **Değişecek mimari alan:** Scanner/validator.
- **Değişecek dosya türleri:** Worker, metadata model, fixtures.
- **Önce yazılacak test:** Malware veya geçersiz XML `verified` olamaz; PDF-only yasal seviye alamaz.
- **Beklenen kırmızı test:** Hash/validation-level yok.
- **Minimum üretim kodu:** AV result, SHA-256, bytes, MIME, XML/schema/signature status.
- **Yeşil test:** Fixture’lar doğru seviyeye ayrılır.
- **Güvenlik kontrolü:** Scanner timeout fail-closed; dosya içeriği loglanmaz.
- **Geri dönüş planı:** Worker pause; quarantine kayıtları korunur.
- **Kabul kriteri:** Validation kanıtı olmayan `document_ready` geçişi mümkün değil.
- **Sonraki faza geçiş kapısı:** GİB güncel schema fixture’ları.

### F5.3 — Immutable versioned storage

- **Faz kodu:** F5.3
- **Amaç:** Her resmi sürümü overwrite edilmeyen tenant object’e yazmak.
- **Ön koşul:** F5.2; retention/WORM kararı.
- **Değişecek mimari alan:** Object storage/document metadata.
- **Değişecek dosya türleri:** Storage adapter, policy/IaC, integration tests.
- **Önce yazılacak test:** Aynı key overwrite ve cross-tenant get/presign reddedilir.
- **Beklenen kırmızı test:** Mutable/shared path.
- **Minimum üretim kodu:** tenant/document/version random key, checksum condition, immutable policy.
- **Yeşil test:** Eski hash değişmez; yeni revision yeni key.
- **Güvenlik kontrolü:** Request rolü exact prefix/method; KMS context PII içermez.
- **Geri dönüş planı:** Yeni write kapat; immutable objeleri silmeye çalışma.
- **Kabul kriteri:** Restore/read checksum doğrular.
- **Sonraki faza geçiş kapısı:** Retention modu hukuk onayı yoksa governance/minimum güvenli karar.

### F5.4 — `document_ready` atomik geçiş ve süreli link

- **Faz kodu:** F5.4
- **Amaç:** Tüm koşullarla belgeyi hazır edip güvenli indirmek.
- **Ön koşul:** F5.3.
- **Değişecek mimari alan:** Document state/access.
- **Değişecek dosya türleri:** State service, download authorization, audit tests.
- **Önce yazılacak test:** Eksik XML/AV/audit/storage koşulu ready olamaz; cross-tenant link yok.
- **Beklenen kırmızı test:** URL var diye ready oluyor.
- **Minimum üretim kodu:** Guarded transaction + exact GET presign/token + download audit.
- **Yeşil test:** Tüm koşullarda tek outbox; expired/revoked link reddedilir.
- **Güvenlik kontrolü:** Provider URL, PII ve token log/referrer’da yok.
- **Geri dönüş planı:** Link generation disable; immutable belge korunur.
- **Kabul kriteri:** Hazır durum yeniden çalıştırmada duplicate bildirim üretmez.
- **Sonraki faza geçiş kapısı:** Faz 6 outbox.

## Faz 6 — Transactional bildirimler

### F6.1 — İzinli event/template registry

- **Faz kodu:** F6.1
- **Amaç:** Yalnız sekiz operasyon olayını ve sürümlü şablonu tanımlamak.
- **Ön koşul:** F5.4/domain olayları.
- **Değişecek mimari alan:** Notification domain.
- **Değişecek dosya türleri:** Enum/schema/templates/lint tests.
- **Önce yazılacak test:** Bilinmeyen/marketing CTA içeren template build’i bozsun.
- **Beklenen kırmızı test:** Allowlist/lint yok.
- **Minimum üretim kodu:** Event→template mapping, required variables, content policy.
- **Yeşil test:** Sekiz olay geçer; promo fixture reddedilir.
- **Güvenlik kontrolü:** Secret/card/stack trace değişkenleri şemada yok.
- **Geri dönüş planı:** Template version önceki sürüme pinlenir.
- **Kabul kriteri:** Her mesaj purpose/template version taşır.
- **Sonraki faza geçiş kapısı:** Hukuk şablon incelemesi işaretli.

### F6.2 — Transactional outbox/worker

- **Faz kodu:** F6.2
- **Amaç:** Domain transaction’ıyla tek idempotent mesaj kuyruğu.
- **Ön koşul:** F6.1.
- **Değişecek mimari alan:** Outbox/queue.
- **Değişecek dosya türleri:** Migration, worker, adapter, retry tests.
- **Önce yazılacak test:** Aynı event/recipient/template iki kez tek send çağrısı; transient retry bounded.
- **Beklenen kırmızı test:** Direct send veya dedupe yok.
- **Minimum üretim kodu:** Outbox unique key, status/attempt/next-at, provider adapter.
- **Yeşil test:** Crash-after-send simülasyonu duplicate kullanıcı etkisini sınırlar.
- **Güvenlik kontrolü:** Recipient/template vars allowlist; log redaction.
- **Geri dönüş planı:** Worker pause; outbox veri kaybetmeden bekler.
- **Kabul kriteri:** Domain commit olup mesaj kaybolmaz.
- **Sonraki faza geçiş kapısı:** Provider test acceptance; canlı deliverability ayrı.

### F6.3 — SPF/DKIM/DMARC domain state

- **Faz kodu:** F6.3
- **Amaç:** Gönderen kimliğini fail-closed doğrulamak.
- **Ön koşul:** Provider account/domain.
- **Değişecek mimari alan:** Email identity.
- **Değişecek dosya türleri:** Domain model, DNS verifier, UI/test.
- **Önce yazılacak test:** Doğrulanmamış tenant domain From olarak seçilemez.
- **Beklenen kırmızı test:** Arbitrary From kabulü.
- **Minimum üretim kodu:** DNS pending/verified/degraded/revoked; shared-domain fallback.
- **Yeşil test:** Fixture DNS state doğru; revoked fail-closed.
- **Güvenlik kontrolü:** Tenant A, B domainini seçemez; DNS değerinde secret yok.
- **Geri dönüş planı:** Shared branded domain’e dön.
- **Kabul kriteri:** SPF/DKIM/DMARC evidence time kaydı.
- **Sonraki faza geçiş kapısı:** Production DNS doğrulaması.

### F6.4 — Delivery webhook ve suppression

- **Faz kodu:** F6.4
- **Amaç:** Delivery/bounce/complaint durumunu güvenilir kılmak.
- **Ön koşul:** F6.2; provider webhook secret/key.
- **Değişecek mimari alan:** Email webhook inbox.
- **Değişecek dosya türleri:** Verifier, event mapper, suppression model/tests.
- **Önce yazılacak test:** Sahte/duplicate webhook no-op; hard bounce yeniden denenmez.
- **Beklenen kırmızı test:** İmza/suppression yok.
- **Minimum üretim kodu:** Signed inbox, provider message ID map, reason/category suppression.
- **Yeşil test:** Deferred retry; bounce/complaint terminal.
- **Güvenlik kontrolü:** Marketing tercihleri ve operasyon category açık ayrılır; hukuk review.
- **Geri dönüş planı:** Webhook intake pause; provider dashboard reconciliation.
- **Kabul kriteri:** Tek event tek state transition; audit mevcut.
- **Sonraki faza geçiş kapısı:** Live signed webhook kanıtı faz 7.

## Faz 7 — Tüm zincirin pilot testi

### F7.1 — Pilot veri ve rollback runbook’u

- **Faz kodu:** F7.1
- **Amaç:** Küçük tutar, test müşterisi, roller ve geri alma sınırını tanımlamak.
- **Ön koşul:** Faz 1–6 kapıları.
- **Değişecek mimari alan:** Operasyon/release.
- **Değişecek dosya türleri:** Runbook, checklist, test data manifest.
- **Önce yazılacak test:** Eksik owner/refund/contact/on-call alanlı manifest kabul edilmez.
- **Beklenen kırmızı test:** Pilot manifest validator/checklist yok.
- **Minimum üretim kodu:** Gerekliyse salt-okunur readiness endpoint; asıl çıktı runbook.
- **Yeşil test:** Dry-run tüm bağımlılıkları `ready/blocked` verir.
- **Güvenlik kontrolü:** Gerçek kart/vergi/PII fixture’a yazılmaz; erişim sürelidir.
- **Geri dönüş planı:** Feature flags kapat, queue drain, provider işlemlerini silme.
- **Kabul kriteri:** Finans+muhasebe+security sorumluları imzalı.
- **Sonraki faza geçiş kapısı:** Dış servis kanıtları tamam.

### F7.2 — Küçük canlı ödeme→fatura→belge→mail

- **Faz kodu:** F7.2
- **Amaç:** Tek kontrollü canlı işlemi uçtan uca izlemek.
- **Ön koşul:** F7.1; açık onay ve yasal test alıcısı.
- **Değişecek mimari alan:** Yok; kanıt toplama.
- **Değişecek dosya türleri:** Evidence record/checklist; üretim kodu değişmez.
- **Önce yazılacak test:** Correlation/order/provider/invoice/document/message ID zinciri eksikse pilot başarısız.
- **Beklenen kırmızı test:** Canlı kanıt yok.
- **Minimum üretim kodu:** Kod yok; gözlemlenebilirlikte eksik correlation varsa en küçük ekleme ayrı mikro-faz olur.
- **Yeşil test:** Tek işlem doğru PaymentOrder, belge hash’i ve delivery sonucu üretir.
- **Güvenlik kontrolü:** Public/log/analytics secret/PAN/CVV/PII taraması temiz.
- **Geri dönüş planı:** Yetkili refund/iptal; orijinal audit silinmez.
- **Kabul kriteri:** Banka/provider ve fatura/belge sonucu eşleşir.
- **Sonraki faza geçiş kapısı:** Sandbox değil canlı düşük riskli kanıt.

### F7.3 — Failure/replay/rollback tatbikatı

- **Faz kodu:** F7.3
- **Amaç:** Duplicate, timeout, provider down ve mail bounce davranışını doğrulamak.
- **Ön koşul:** F7.2.
- **Değişecek mimari alan:** Test/operasyon.
- **Değişecek dosya türleri:** Failure injection tests, incident notes.
- **Önce yazılacak test:** Aynı webhook/refund komutu çift finansal yan etki üretmez.
- **Beklenen kırmızı test:** Tatbikat kanıtı yok veya açık bulunur.
- **Minimum üretim kodu:** Bulgu varsa tek kontrol fix’i ayrı mikro-faz; aksi halde kod yok.
- **Yeşil test:** Queue resume/replay yakınsar; data loss yok.
- **Güvenlik kontrolü:** Break-glass/support erişimleri auditli.
- **Geri dönüş planı:** Feature flag off, worker pause/resume runbook.
- **Kabul kriteri:** Kritik açık yok; kalan risk owner/date ile kabul.
- **Sonraki faza geçiş kapısı:** Pilot sign-off; sonra faz 8.

## Faz 8 — Genel form, builder, UI/UX ve responsive

### F8.1 — Public/private snapshot serializer

- **Faz kodu:** F8.1
- **Amaç:** Draft’tan immutable public-safe yayın üretmek.
- **Ön koşul:** Faz 7 kabulü.
- **Değişecek mimari alan:** Form publish/read model.
- **Değişecek dosya türleri:** Schema, serializer, snapshot tests.
- **Önce yazılacak test:** Secret/internal/provider/admin field seed edilse public JSON’da yok; draft edit yayını değiştirmez.
- **Beklenen kırmızı test:** Draft doğrudan servis ediliyor veya allowlist yok.
- **Minimum üretim kodu:** Version/hash/public DTO allowlist snapshot.
- **Yeşil test:** Golden snapshot temiz ve immutable.
- **Güvenlik kontrolü:** Recursive secret scanner + object/media tenant scope.
- **Geri dönüş planı:** Önceki published version pointer’ına atomik dön.
- **Kabul kriteri:** Public yalnız explicit alanları görür.
- **Sonraki faza geçiş kapısı:** Secret-leak kapısı yeşil.

### F8.2 — Anonymous submit guard’ları

- **Faz kodu:** F8.2
- **Amaç:** Cookie’siz submitte schema/replay/abuse sınırı.
- **Ön koşul:** F8.1.
- **Değişecek mimari alan:** Public API edge.
- **Değişecek dosya türleri:** Validator, limiter, idempotency store, abuse tests.
- **Önce yazılacak test:** Unknown field, oversized, replay, disabled/suspended form ve invalid bot token reddedilir.
- **Beklenen kırmızı test:** Endpoint serbest payload alıyor.
- **Minimum üretim kodu:** Body/field limit, schema allowlist, form quota, idempotency, optional server challenge verify.
- **Yeşil test:** Normal submit tek response; dört saldırı no side effect.
- **Güvenlik kontrolü:** Origin yalnız sinyal; admin cookie route ayrı; no secret errors.
- **Geri dönüş planı:** Submit feature flag/queue pause; snapshot read açık kalabilir.
- **Kabul kriteri:** Downstream maliyet tavanı ve alarmı var.
- **Sonraki faza geçiş kapısı:** Load/abuse kanıtı.

### F8.3 — Iframe CSP/sandbox/postMessage

- **Faz kodu:** F8.3
- **Amaç:** CSS/JS izolasyonlu responsive embed.
- **Ön koşul:** F8.1–F8.2; allowed origin.
- **Değişecek mimari alan:** Embed renderer/headers/SDK.
- **Değişecek dosya türleri:** Header policy, embed script, browser security tests.
- **Önce yazılacak test:** Yetkisiz parent frame alamaz; `*` message yok; kötü origin resize gönderemez.
- **Beklenen kırmızı test:** `frame-ancestors`/origin/source kontrolü yok.
- **Minimum üretim kodu:** HTTP CSP, minimal sandbox, nonce/session-bound resize protocol.
- **Yeşil test:** Allowlisted parent çalışır; diğerleri engellenir; host CSS etkilemez.
- **Güvenlik kontrolü:** `allow-scripts+allow-same-origin` risk kombinasyonu yok/kanıtlı.
- **Geri dönüş planı:** Embed origin allowlist kapat; public URL çalışır.
- **Kabul kriteri:** Browser security suite ve 320px resize yeşil.
- **Sonraki faza geçiş kapısı:** CSP raporu/secret scan.

### F8.4 — Builder tree ve erişilebilir reorder

- **Faz kodu:** F8.4
- **Amaç:** Page/container/grid/block ve drag olmayan alternatif.
- **Ön koşul:** Snapshot schema.
- **Değişecek mimari alan:** Builder state/UI.
- **Değişecek dosya türleri:** Domain tree, components, keyboard/a11y tests.
- **Önce yazılacak test:** Drag ve “öncesine taşı” aynı kanonik ağaç; keyboard focus korunur.
- **Beklenen kırmızı test:** Non-drag operation yok.
- **Minimum üretim kodu:** Tree move command + handle/drop indicator + move menu.
- **Yeşil test:** Mouse/touch/keyboard/non-drag sonuçları eşit.
- **Güvenlik kontrolü:** Block config schema allowlist; HTML/script injection sanitize.
- **Geri dönüş planı:** Advanced move UI kapat; basit up/down kalır.
- **Kabul kriteri:** WCAG 2.5.7 manuel+otomatik kanıt.
- **Sonraki faza geçiş kapısı:** Accessibility review.

### F8.5 — Autosave/revision/publish conflict

- **Faz kodu:** F8.5
- **Amaç:** Sessiz overwrite/veri kaybını engellemek.
- **Ön koşul:** F8.4.
- **Değişecek mimari alan:** Draft persistence/versioning.
- **Değişecek dosya türleri:** Revision model, save API, UI status tests.
- **Önce yazılacak test:** Eski revision save conflict; offline hata görünür; restore yeni revision.
- **Beklenen kırmızı test:** Last-write-wins sessiz.
- **Minimum üretim kodu:** Revision number/ETag, debounce save, conflict response, status UI.
- **Yeşil test:** Concurrent edit veri kaybetmez; publish hash sabit.
- **Güvenlik kontrolü:** Revision tenant/form scoped; unpublished içerik public değil.
- **Geri dönüş planı:** Autosave off; explicit save + mevcut revisions korunur.
- **Kabul kriteri:** Saving/Saved/Offline/Conflict/Error durumları testli.
- **Sonraki faza geçiş kapısı:** Recovery/restore testi.

### F8.6 — Form medya alanı ve 16:9 kart

- **Faz kodu:** F8.6
- **Amaç:** Form-scope picker/upload/URL, alt text ve 16:9 crop.
- **Ön koşul:** Tenant/form object policy.
- **Değişecek mimari alan:** Media service/UI.
- **Değişecek dosya türleri:** Storage policy, media model, picker/card components, tests.
- **Önce yazılacak test:** Form A, B media liste/get edemez; invalid file quarantine; informative alt boş kalamaz.
- **Beklenen kırmızı test:** Global media listesi veya scope yok.
- **Minimum üretim kodu:** `form-media`/`app-media` ayrımı, upload/select/URL tabs, aspect/focal/alt.
- **Yeşil test:** Cross-form negative, 16:9 visual, alt/decorative akışı.
- **Güvenlik kontrolü:** SSRF-safe URL import, magic/AV, süreli media URL.
- **Geri dönüş planı:** URL import kapat; mevcut media read-only.
- **Kabul kriteri:** Media access matrix ve responsive image testi.
- **Sonraki faza geçiş kapısı:** Faz 8 full typecheck/lint/build/a11y.

### F8.7 — WordPress minimum plugin

- **Faz kodu:** F8.7
- **Amaç:** Secret-free shortcode/block ve güvenli yaşam döngüsü.
- **Ön koşul:** F8.3 embed URL/protocol.
- **Değişecek mimari alan:** WordPress integration.
- **Değişecek dosya türleri:** PHP/JS/CSS, plugin metadata, WP integration tests.
- **Önce yazılacak test:** Bundle/option/HTML secret scan; admin save capability+nonce; REST permission callback.
- **Beklenen kırmızı test:** Plugin/policy yok.
- **Minimum üretim kodu:** Header/Update URI, shortcode+block render, conditional assets, safe settings, uninstall guard.
- **Yeşil test:** Install/activate/render/deactivate/uninstall; data not deleted by deactivation.
- **Güvenlik kontrolü:** WPCS/Plugin Check; no API key; exact origin.
- **Geri dönüş planı:** Önceki signed/versioned ZIP; DB migration rollback.
- **Kabul kriteri:** Desteklenen WP/PHP/theme/multisite matrisi yeşil.
- **Sonraki faza geçiş kapısı:** Production package checksum/release evidence.

## Faz 9 — SaaS abonelik ve tenant mimarisi

### F9.1 — Tenant/membership/permission temeli

- **Faz kodu:** F9.1
- **Amaç:** User’dan ayrı workspace ve explicit permission kurmak.
- **Ön koşul:** Faz 8; SaaS ürün kararı.
- **Değişecek mimari alan:** Identity/authorization.
- **Değişecek dosya türleri:** Migration, policy, permission matrix tests.
- **Önce yazılacak test:** Viewer export/publish; editor credential/billing; nonmember read reddedilir.
- **Beklenen kırmızı test:** Global role/tenant filtresi yok.
- **Minimum üretim kodu:** Tenant, Membership, Owner/Admin/Editor/Viewer permission mapping, default deny.
- **Yeşil test:** User/resource/operation matrisi geçer.
- **Güvenlik kontrolü:** Client tenant ID server membership olmadan etkisiz.
- **Geri dönüş planı:** SaaS flag kapalı; tek internal tenant mevcut veriyi taşır.
- **Kabul kriteri:** Her request exact tenant+resource policy’den geçer.
- **Sonraki faza geçiş kapısı:** Authorization negative suite.

### F9.2 — RLS ve çapraz katman tenant scope

- **Faz kodu:** F9.2
- **Amaç:** DB/cache/queue/object/export izolasyonu.
- **Ön koşul:** F9.1.
- **Değişecek mimari alan:** Data platform.
- **Değişecek dosya türleri:** Migration/RLS, repository, queue/cache/storage policies, tests.
- **Önce yazılacak test:** Tenant A’nın B satır/object/job/cache anahtarına erişimi her operasyon için reddedilir.
- **Beklenen kırmızı test:** Unscoped query veya privileged DB role.
- **Minimum üretim kodu:** `tenant_id NOT NULL`, composite FK/index, default-deny RLS, tenant-prefixed keys.
- **Yeşil test:** Cross-tenant matrix; pool/job context leak yok.
- **Güvenlik kontrolü:** Runtime rol superuser/owner/BYPASSRLS değil.
- **Geri dönüş planı:** SaaS traffic off; migration veri kopyası ve verified down path.
- **Kabul kriteri:** Policy coverage raporu %100 tenant-owned tablo.
- **Sonraki faza geçiş kapısı:** Data-loss/restore ve secret-leak testi.

### F9.3 — Per-tenant provider secret zarfı

- **Faz kodu:** F9.3
- **Amaç:** Her tenantın Stripe/iyzico/Paraşüt bağlantısını izole etmek.
- **Ön koşul:** F9.2; KMS/secret manager.
- **Değişecek mimari alan:** Integration credentials.
- **Değişecek dosya türleri:** Connection model, secret adapter, rotation/audit tests.
- **Önce yazılacak test:** Tenant A reference ile B decrypt olmaz; UI/log/export plaintext göstermez.
- **Beklenen kırmızı test:** Shared/plain credential.
- **Minimum üretim kodu:** Tenant+provider+environment connection, secret reference, encryption context/version.
- **Yeşil test:** Encrypt/decrypt/rotate/revoke ve negative context testleri.
- **Güvenlik kontrolü:** KMS context PII’siz; support secret okuyamaz.
- **Geri dönüş planı:** New connection disable; mevcut encrypted versions korunur.
- **Kabul kriteri:** Rotation recovery ve disconnect runbook’u.
- **Sonraki faza geçiş kapısı:** Provider tenant account live kanıtı.

### F9.4 — Askıya alma/read-only policy

- **Faz kodu:** F9.4
- **Amaç:** Veriyi silmeden yazma ve public submission’ı durdurmak.
- **Ön koşul:** F9.1–F9.3; entitlement states.
- **Değişecek mimari alan:** Subscription authorization/public gateway.
- **Değişecek dosya türleri:** State machine, policy middleware, UI/API tests.
- **Önce yazılacak test:** Suspended tenant read/export yapar; create/edit/publish/delete/provider mutation/submit yapamaz.
- **Beklenen kırmızı test:** Boolean active tüm erişimi kesiyor veya yazmayı açık bırakıyor.
- **Minimum üretim kodu:** `ACTIVE`, `SUSPENDED_READ_ONLY`, `REACTIVATING` policy matrisi; queue quiesce.
- **Yeşil test:** Operation matrix ve açık public unavailable sonucu.
- **Güvenlik kontrolü:** Export step-up/audit; askı secret silmez/göstermez.
- **Geri dönüş planı:** Önceki entitlement state’e atomik dön; veri migration yok.
- **Kabul kriteri:** Askı sırasında yeni yan etki yok, mevcut veri indirilebilir.
- **Sonraki faza geçiş kapısı:** Reactivation testleri.

### F9.5 — Reactivation ve geçmiş olay koruması

- **Faz kodu:** F9.5
- **Amaç:** Son yayınları atomik açıp eski işleri tekrar oynatmamak.
- **Ön koşul:** F9.4.
- **Değişecek mimari alan:** Entitlement orchestration.
- **Değişecek dosya türleri:** Reactivation service, queue tests, audit.
- **Önce yazılacak test:** Eski payment/email job’ı yeniden yan etki üretmez; son snapshotlar ya hep ya hiç açılır.
- **Beklenen kırmızı test:** Resume tüm queue’yu replay ediyor.
- **Minimum üretim kodu:** Provider health gate, snapshot activation transaction, cutoff/checkpoint.
- **Yeşil test:** Failure injectionte state read-only kalır; retry güvenli.
- **Güvenlik kontrolü:** Yalnız Owner/Admin onayı; audit/correlation.
- **Geri dönüş planı:** `SUSPENDED_READ_ONLY`e atomik dön.
- **Kabul kriteri:** Aktifleşme sonrası yeni submit alınır, geçmiş duplicate yok.
- **Sonraki faza geçiş kapısı:** E2E tenant reactivation kanıtı.

### F9.6 — Süreli support erişimi

- **Faz kodu:** F9.6
- **Amaç:** Parola/session taklidi olmadan denetlenebilir destek.
- **Ön koşul:** F9.1 permission; support policy.
- **Değişecek mimari alan:** Support identity/access.
- **Değişecek dosya türleri:** Delegation model, UI banner, audit/security tests.
- **Önce yazılacak test:** Süresi geçmiş/onaysız/ticketsiz erişim ve credential/billing/delete işlemi reddedilir.
- **Beklenen kırmızı test:** Admin impersonation sınırsız.
- **Minimum üretim kodu:** Ticket/reason/tenant/resource/expiry/read-only delegated session, gerçek actor logu.
- **Yeşil test:** Banner, expiry, revoke ve append-only audit geçer.
- **Güvenlik kontrolü:** MFA/step-up; müşteri session cookie/parola kopyası yok.
- **Geri dönüş planı:** Tüm support sessions revoke; normal tenant sessions etkilenmez.
- **Kabul kriteri:** Her support access ticket→approval→action zincirinde.
- **Sonraki faza geçiş kapısı:** Security/legal/support sign-off.

## Kesin sınıflandırma

### Release öncesi kesinlikle yapılmalı

- Server-side amount/currency/order doğrulama; hosted kart girişi; PAN/CVV’nin tüm store/log/backuplardan dışlanması.
- Webhook raw-body imza, replay/duplicate/order koruması ve fulfillment idempotency.
- Payment/refund/dispute/settlement eksenleri; exact minor-unit.
- Fatura adayı ile resmi belgeyi ayırma; issue sonrası immutable geçmiş.
- Paraşüt token encryption/rotation, rate limit ve job state.
- Belge quarantine/type/XXE/AV/hash/tenant/immutable/süreli link.
- Transactional outbox, domain auth, signed delivery webhook ve hard-bounce/complaint suppression.
- Public secret-leak, typecheck/lint/build ve veri kaybı/rollback kapıları.

### Pilot öncesi yapılmalı

- iyzico merchant capability ve canlı anahtar/webhook doğrulaması.
- Acquirer/QSA ile SAQ A ve güncel AOC teyidi.
- Paraşüt test/live client, XML/UBL ve idempotency/revoke boşluklarının yazılı cevabı.
- GİB 14 Eylül 2026 paket/XSD/kod listesi regression doğrulaması.
- Mali müşavir/hukuk onaylı fatura senaryo/tevkifat/istisna/retention.
- E-posta domain production DNS ve DPA/region; kontrollü canlı deliverability.
- Düşük tutarlı uçtan uca ödeme→mutabakat→fatura→belge→mail ve rollback tatbikatı.

### Pilot sonrası yapılmalı

- İkinci e-posta sağlayıcısı/failover, gelişmiş deliverability panosu.
- Banka hareketi otomasyonu, dispute evidence yardımcıları, adaptive fraud/abuse.
- Inline Web Component, ileri builder presets/collaboration ve template genişlemesi.

### SaaS aşamasına bırakılmalı

- Tenantların kendi payment/accounting connector UI’sı.
- Abonelik billing/entitlement, suspended read-only/reactivation ve offboarding.
- Per-tenant domain, fine-grained ABAC/hybrid DB ve JIT support approval.

### Şimdilik yapılmamalı

- Google Pay `DIRECT` token decrypt.
- Türkiye şirketi için uygunluk kanıtı olmadan Stripe canlılaştırma.
- CVV/PAN saklama; frontend callback’i ödeme kanıtı sayma.
- Resmi endpoint olmayan Paraşüt özelliğini uydurma.
- PDF/Excel’i tek başına resmi e-belge sayma.
- Transactional e-postaya promosyon/marketing ekleme.
- WordPress bundle’a admin/provider secret koyma.

### Doğrulanamadı

- iyzico merchant’a özel yabancı kart/currency/taksit/cancel cut-off ve CF AOC/SAQ; V3 canonical signature ayrıntısı.
- Paraşüt sandbox, genel idempotency, PKCE, token revoke, e-document webhook ve imzalı XML download.
- WordPress özel updater için evrensel Core paket imzası.
- Seçilecek sağlayıcıların procurement anındaki fiyat/SLA/region/quota koşulları.

### Hukuki inceleme gerekli

- Stripe merchant tüzel kişi/sözleşme modeli; PCI SAQ validasyonu.
- Şirketin e-Fatura/e-Arşiv yükümlülüğü, senaryo, vergi kodu, tarih/numara, tevkifat/istisna, iptal/itiraz.
- Belge/yanıt retention, Türkiye’de saklama, başka mükellef adına saklama ve KVKK/GDPR aktarım/rol/dayanak.
- Transactional şablonların Ticari İletişim ve veri koruma dayanağı.
- SaaS offboarding, legal hold ve support erişim politikası.

RESEARCH COMPLETE — READY FOR ARCHITECTURE REVIEW
