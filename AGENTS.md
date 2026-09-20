# MavenForms çalışma kuralları

## Tek normatif kaynak

Ürün, domain, faz ve yeni iş akışı için tek normatif kaynak:

`docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/`

Özellikle `00_OKU_BENI.md`, `04_MAVENFORMS_KAPSAM_UYUMU.md`, `05_HEDEF_MIMARI.md`, `06_KANONIK_VERI_MODELI.md`, `11_YOL_HARITASI.md`, `12_GELISTIRME_KONTROL_SISTEMI.md`, `13_RISK_VE_KARAR_KAYDI.md`, `14_KABUL_TEST_MATRISI.md` ve `16_KANONIK_KAYNAK_VE_MIGRASYON_POLITIKASI_2026-09-18.md` birlikte okunur.

Root’taki uzun eski roadmap/execution/release/worklog belgeleri `docs/legacy/root-docs/` altında tarihsel olarak korunur. Yeni işi tanımlayamaz, faz sırasını değiştiremez veya master planın kapıları dışında yeni blocker üretemez.

Workflow ayrıntıları: `docs/workflow/README.md`; packet yürütücüsü: `scripts/workflow.mjs`.

## Her görevde başlangıç

1. `AGENTS.md`, `PROJECT_CONTEXT.md`, `STATUS.md` oku.
2. `git status --short` ile mevcut kullanıcı değişikliklerini koru.
3. `docs/workflow/packets/*.json` içinden `status: READY`, `timeboxMinutes: 15` ve `sourceOfTruth` değeri master plan klasörü olan packet’i seç.
4. Packet’in `reads`, `allowedFiles`, `acceptance`, `preflight` ve `checks` alanlarını doğrula.
5. `node scripts/workflow.mjs begin <packet>` çalıştır.
6. Yalnız packet kaynaklarını ve doğrudan import/call site bağımlılıklarını oku.

## Kanonik ürün modeli

MavenForms artık yalnız form hazırlama ürünü değildir:

`Organization → Event → Occurrence/Venue → FormBinding → Person/Registration → Ticket/Order/Payment/Invoice → Credential/Badge → Check-in → Floor Plan → Reports → F8 modules → F9 SaaS gate`

`Form`, Event’in kayıt/intake yüzeyidir. `Submission`, ham cevap kaydıdır; Person, Registration, Order, Payment, Invoice, Credential veya Check-in yerine kullanılamaz.

## Değişmez kurallar

- Kanonik faz sırası `F0 → F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8 → F9`’dur.
- Önceki fazın çıkış kanıtı olmadan sonraki production capability’si açılmaz.
- Her yeni domain kavramının tek sahibi, scope’u, API sözleşmesi, idempotency davranışı ve audit izi olmalıdır.
- Auth, organization/workspace scope, input validation, public/private sınırı ve tenant leakage server tarafında doğrulanır.
- Payment, invoice, document, mail, badge ve export geçmişi edit edilerek silinmez; düzeltme/reversal/audit zinciri kullanılır.
- UI’da görünen buton, backend mutation ve kanıt yoksa tamamlanmış özellik değildir.
- Secret, token, PAN/CVV, PII ve gerçek `.env` değeri kod, log, test veya MD’ye yazılmaz.
- `LOCAL_PASS` production onayı değildir. R-10 dış kanıt kapısı fail-closed kalır.
- Yeni fikir doğrudan koda dönüşmez; `ACCEPTED`, `SIMPLIFIED`, `DEFERRED`, `REJECTED` veya `BLOCKED` kararı alır.
- Değişiklik yalnız packet `allowedFiles` kapsamındadır.

## Arayüz kuralı

Arayüz Event-first olur. Event seçilmeden event-owned kayıt, badge, check-in veya floor mutation başlatılmaz. Forms, Finance, Documents, Badge, Check-in ve Floor Plan birbirine karışık tek ekran olarak render edilmez; aralarında açık deep link/read model kullanılır.

## Kapanış

Packet checks, uygun TypeScript/lint/build/readiness kontrolleri ve `node scripts/workflow.mjs verify <packet>` çalışmadan PASS raporlanmaz. Sonuçta changed files, kanıt sınıfı, kalan dış bağımlılıklar ve gerçek doğrulama sınırı yazılır.
