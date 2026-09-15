# OzelAPP R-10/V4 Güvenli Entegrasyon, Wizard ve Simülasyon Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** R-10 ve V4 gerekliliklerini production’a açmadan, OzelAPP’a tenant-scoped belge/medya yükleme, müşteri bağlantısı, güvenli wizard ve gerçekçiliği yüksek sentetik test altyapısı kazandırmak.

**Architecture:** Mevcut V1→V2→V3 sırası korunur. R-10 ortak release control plane, V4 ise tenant’ın kendi bağlantılarını kullandığı ileri ürün katmanıdır. Önce mevcut sözleşmeler yeniden kullanılacak; yalnız gerçek boşluklar provider-neutral port, state machine, server-side policy, quarantine storage, inbox/outbox, wizard ve test fixture olarak eklenecek.

**Tech Stack:** Next.js App Router, React, TypeScript, Bun, Prisma, SQLite pilot tabanı, Zod, mevcut API/auth/policy katmanları ve proje workflow packet’leri.

**Spec:** `D:/project/mavenform/docs/research-sources/2026-09-11-ozelapp-r10-v4-guvenli-entegrasyon-research-receipt.md`; dış araştırma kaynağı `F:\Belgeler\OzelAPP_R10_V4_Guvenli_Entegrasyon_Wizard_Simulasyon_Arastirma_Raporu.md`.

## Global constraints

- Ana sıra değişmez: V1 iç kullanım → V2 first-party ödeme/manual fatura → V3 provider-neutral ileri hazırlık → en son V4 SaaS.
- R-10 production sonucu dış kanıtlar tamamlanana kadar `NO-GO/BLOCKED` kalır.
- Her mikro-faz tek ölçülebilir çıktı ve tam 15 dakikalık packet’tir.
- Her faz önce `PROJECT_CONTEXT.md`, `STATUS.md`, packet reads ve mevcut receipt’leri doğrular.
- Kod yalnız packet `allowedFiles` kapsamında değişir; mevcut `LOCAL_PASS` fazları tekrar çalıştırılmaz.
- Tenant, form, submission, document, asset, connection, webhook ve job sorguları server-side scope taşır.
- Secret, token, PAN/CVV, PII, gerçek provider cevabı ve gerçek `.env` değeri yazılmaz.
- Non-production ortamda live provider endpoint, live secret, gerçek dış alıcı ve kalıcı dış mutasyon server-side engellenir.
- Manuel fatura fallback’i korunur; otomatik e-belge ve tenant adına tahsilat bu planla açılmaz.
- `LOCAL_PASS`, sandbox veya fake provider kanıtı `PILOT_PASS`/`RELEASE_PASS` değildir.
- Her tamamlanan packet’te hedef test, TypeScript, readiness ve `workflow verify` kanıtı aranır.

## Mevcut durum ve tekrar etmeme kararı

Raporun M01–M63 listesi mevcut projeyle karşılaştırıldı. Tenant scope, manual invoice/document-ready, mail channel separation, badge correlation, support boundary, suspend/reactivate, V4 release no-go, payment connection ve upload/media sözleşmelerinin önemli bölümü mevcut `LOCAL_PASS` kayıtlarıyla doğrulanmış durumdadır. Bunlar yeniden yazılmayacak.

Yeni uygulama yalnız şu eksikleri hedefler: araştırma kaydının kanonik plana bağlanması, güvenli wizard yüzeylerinin birleşik UX’i, gerçekçi sentetik simülasyon harness’i, upload/connection evidence’ın tek görünümde sunulması ve mevcut sözleşmelerin R-10/V4 release registry’sine izlenebilir bağlanması.

## Faz sırası ve kararlar

| Sıra | Faz grubu | Amaç | Durum/karar |
|---:|---|---|---|
| 00 | Kaynak ve plan hizalama | Rapor hash’i, kararlar ve mikro-faz zinciri | `SAFE-NOW`, bu packet |
| 01 | Kanıt/kapı modeli | Evidence, environment, capability ve NO-GO görünümü | `ACCEPTED`, provider-neutral |
| 02 | Upload/document | Kullanıcı belgesi ve medya için quarantine-first UI/API bağı | `ACCEPTED`, mevcut upload sözleşmesi genişletilir |
| 03 | Connection/secret | BYO bağlantı wizard’ı ve secret lifecycle | `ACCEPTED`, live default off |
| 04 | Simülasyon | Fake provider, mail sink, replay, failure injection, sentetik kullanıcı | `ACCEPTED`, production kanıtı değil |
| 05 | Wizard UX | Ortak, payment, invoice, mail, media ve capability akışları | `ACCEPTED`, erişilebilir ve resumable |
| 06 | E2E/security | Cross-tenant, SSRF, upload, webhook, queue, restore ve production guard | `ACCEPTED`, fail-closed |
| 07 | R-10/V4 governance | External evidence registry ve release kararları | `BLOCKED` canlı açılış; local çalışma kabul |

## Packet yürütme protokolü

Her packet şu sırayı izler:

1. Önceki receipt ve scope doğrula.
2. Etkilenen route → service → DB → DTO → browser zincirini çıkar.
3. En küçük negatif testi yaz veya çalıştır.
4. Tek değişiklik yap.
5. Hedef testi çalıştır.
6. Gerekli regresyon, TypeScript, readiness ve build kontrollerini çalıştır.
7. Secret/PII/log/scope diff incelemesi yap.
8. `node scripts/workflow.mjs verify docs/workflow/packets/<ID>.json` ile receipt üret.
9. Dış kanıt eksikse sonucu `LOCAL_PASS`, `EXTERNAL_DEPENDENCY` veya `BLOCKED` olarak bırak.

## 15 dakikalık mikro-fazlar

Her satır ayrı packet olmalıdır. Aynı packet içinde iki bağımsız çıktı birleştirilmez.

### Grup 00 — Kaynak hizalama

| Packet | Tek çıktı | Dosya sınırı | Kabul kanıtı |
|---|---|---|---|
| `R10-V4-00` | Araştırma receipt’i, bu plan ve STATUS pointer’ı | plan, receipt, packet, `STATUS.md` | Kaynak hash’i, ürün sırası ve NO-GO korunur |

### Grup 01 — Evidence ve release control plane

| Packet | Tek çıktı | Hedef sözleşme/test | Sonuç |
|---|---|---|---|
| `R10-V4-01` | Evidence sınıfı ve durumlarının tek normalized modeli | `src/lib/r10-scope-gate.ts`, release gate testleri | E0–E6 ve `LOCAL_PASS`/`PILOT_PASS`/`RELEASE_PASS` ayrılır |
| `R10-V4-02` | Environment ve live-mutation guard’ın wizard/API ortak kararı | `src/lib/env.ts`, `src/lib/r10-scope-gate.ts`, guard testi | Non-production live endpoint/secret reddedilir |
| `R10-V4-03` | Capability snapshot read modelinin eksik-gate açıklaması | `src/lib/release-module.ts`, ilgili view-model testi | `unknown/unsupported/blocked` gizlenmez |
| `R10-V4-04` | External dependency registry şeması | `docs/runbooks/r10-external-evidence-guide.md`, release test | Owner, evidence class, expiry, scope ve status zorunlu |

### Grup 02 — Belge/medya upload ve güvenli depolama

| Packet | Tek çıktı | Hedef sözleşme/test | Sonuç |
|---|---|---|---|
| `R10-V4-05` | Asset purpose/state geçişlerinin ortak matrisi | `src/lib/media.ts`, `src/lib/file-policy.ts`, state testi | Form medya, belge, badge template ve sertifika ayrılır |
| `R10-V4-06` | Upload session’ın tenant/form/purpose scope doğrulaması | mevcut media route’ları, `tests/media-scope.test.mjs` | Client storage path veya tenant seçemez |
| `R10-V4-07` | Quarantine/scan/verified/ready UI state gösterimi | `src/components/mavenforms/media-picker.tsx`, UI testi | Yüklenen dosya taranmadan aktif görünmez |
| `R10-V4-08` | PDF/PNG/JPEG/WebP/XLSX güvenlik kararlarının wizard’a bağlanması | `src/lib/invoice-document-validation.ts`, upload testleri | Magic bytes, boyut ve arşiv sınırları görünür |
| `R10-V4-09` | Private preview/download token yaşam döngüsü | media serve route’ları, scope testleri | Expired/revoked/cross-tenant erişim fail-closed |
| `R10-V4-10` | Replace/version/archive/delete dependency görünümü | media/document/badge sözleşmeleri | Kullanımda olan asset sessizce silinmez |

### Grup 03 — BYO connection ve secret lifecycle

| Packet | Tek çıktı | Hedef sözleşme/test | Sonuç |
|---|---|---|---|
| `R10-V4-11` | `ConnectionPurpose`/environment/state ortak DTO’su | `src/lib/payment-provider-contract.ts`, tenant adapter’ları | Payment, invoice, mail, media ayrı bağlantıdır |
| `R10-V4-12` | Secret metadata/version/rotation sözleşmesi | `src/lib/payment-credentials.ts`, email/parasut credential modülleri | Plaintext secret model veya DTO’ya girmez |
| `R10-V4-13` | Server-side verify evidence kaydı | provider connection API ve test | `draft → verifying → verified → enabled` açık geçişlerle yürür |
| `R10-V4-14` | Revocation, disable ve pending job davranışı | worker/job gate testleri | Eski credential ile yeni iş başlatılamaz |
| `R10-V4-15` | OAuth PKCE/state/callback wizard sözleşmesi | Paraşüt OAuth route’ları ve connection testleri | Exact redirect, state, PKCE ve same-tenant binding |
| `R10-V4-16` | API-key/certificate/manual credential alternatif akışı | yeni connection contract/test | Secret yalnız server boundary’de alınır; UI masked metadata görür |

### Grup 04 — Gerçekçi fakat güvenli simülasyon

| Packet | Tek çıktı | Hedef sözleşme/test | Sonuç |
|---|---|---|---|
| `R10-V4-17` | Fake provider success/timeout/429/5xx adapter | yeni test adapter’ı, contract test | Deterministik normalize edilmiş sonuç |
| `R10-V4-18` | Webhook signed/replay/duplicate/out-of-order fixture seti | webhook inbox ve signature testleri | İmzasız payload reducer’a ulaşmaz |
| `R10-V4-19` | Disposable DB/object-storage/mail-sink profile’ı | `scripts/local-ready.mjs`, test harness | Test alıcısı dışına mail çıkmaz |
| `R10-V4-20` | Sentetik kullanıcı/form/ödeme/fatura graph’ı | fixture helper ve schema test | ID, domain, IP ve e-posta açıkça sentetiktir |
| `R10-V4-21` | Failure injection matrisi | worker/retry/DLQ testleri | Crash, timeout, duplicate ve stale lease güvenle toparlanır |
| `R10-V4-22` | Ephemeral staging smoke profile’ı | staging runbook ve readiness test | Live secret/provider yok; cleanup kontrollü |
| `R10-V4-23` | Production guard negatif entegrasyon testi | `tests/r10-*`, payment/invoice route testleri | Non-prod live mutation hard deny |

### Grup 05 — Wizard UX ve rehber

| Packet | Tek çıktı | Hedef sözleşme/test | Sonuç |
|---|---|---|---|
| `R10-V4-24` | Resumable ortak connection wizard shell’i | yeni `src/components/mavenforms/connection-wizard.tsx` | Step, back, cancel, refresh ve draft state korunur |
| `R10-V4-25` | Payment wizard | builder integration view ve payment testleri | Hosted checkout, amount/currency ve provider evidence görünür |
| `R10-V4-26` | Manual invoice wizard | invoice center ve document upload akışı | Upload → match → approval → document-ready sırası korunur |
| `R10-V4-27` | Future invoice/API wizard | provider-neutral invoice adapter | Otomatik e-belge default-off ve legal evidence yoksa blocked |
| `R10-V4-28` | Transactional mail wizard | `src/components/mavenforms/email-template-editor.tsx` ve mail testleri | Form notification ile billing/document mail ayrıdır |
| `R10-V4-29` | Media/document wizard | `media-picker.tsx`, upload routes | Scope, scan, preview, alt text ve retention anlaşılır |
| `R10-V4-30` | Capability/evidence checklist görünümü | release module view ve UI testleri | “Bağlandı” yerine tested/verified/blocked ayrımı |
| `R10-V4-31` | Hata, erişilebilirlik ve responsive wizard standardı | UI contract/snapshot/a11y testleri | Keyboard, focus, loading, error, retry, mobile davranışı |

### Grup 06 — Uçtan uca security ve operasyon kanıtı

| Packet | Tek çıktı | Hedef test | Sonuç |
|---|---|---|---|
| `R10-V4-32` | Cross-tenant upload/connection/document/export negatif matrisi | tenant boundary suite | IDOR/BOLA ve yanlış tenant 403/404 |
| `R10-V4-33` | SSRF, redirect ve callback abuse matrisi | API/security suite | Private IP, open redirect ve state bypass reddedilir |
| `R10-V4-34` | Secret redaction ve access audit canary | logging/audit tests | Secret hiçbir response/log/export’a çıkmaz |
| `R10-V4-35` | Upload abuse matrisi | media/document tests | Polyglot, path traversal, bomb, macro ve invalid magic reddedilir |
| `R10-V4-36` | Payment → invoice → document-ready → mail correlation replay’i | existing payment/invoice/mail tests | Başarılı ödeme fatura veya mail anlamına gelmez |
| `R10-V4-37` | Worker restart/lease/retry/DLQ replay’i | worker restart restore testleri | Duplicate ve kayıp iş yok; bilinmeyenler quarantine |
| `R10-V4-38` | Backup/restore scope ve integrity tatbikatı | restore runbook/test | Tenant scope, hash, audit ve secret ayrımı korunur |
| `R10-V4-39` | Incident response ve support break-glass tatbikatı | support/access tests | Ticket, purpose, TTL, MFA, read-only ve revoke zorunlu |

### Grup 07 — R-10/V4 release yönetimi

| Packet | Tek çıktı | Hedef belge/test | Sonuç |
|---|---|---|---|
| `R10-V4-40` | R-10 P0 gate registry | `RELEASE-DECISION.md`, final gate test | Bir P0 eksikse production `NO-GO` |
| `R10-V4-41` | V4 tenant/BYO/entitlement gate registry | V4 release testleri | R-10’a bağımlı, canlı mutation kapalı |
| `R10-V4-42` | External evidence intake ve expiry politikası | external evidence runbook | Provider, DNS/TLS, AV/KMS, legal ve review kanıtı ayrı tutulur |
| `R10-V4-43` | Final local evidence report | status/history ve workflow receipt | Local sonuçlar production iddiasına yükseltilmez |
| `R10-V4-44` | Bağımsız review hazırlık paketi | checklist, threat model, restore evidence | Review imzası olmadan release açılmaz |

## Dış bağımlılık ve açık kapılar

Şunlar kodla üretilemez ve ilgili kanıt gelene kadar `EXTERNAL_DEPENDENCY/BLOCKED` kalır: gerçek merchant/provider hesabı ve sözleşmesi, gerçek OAuth/API/certificate doğrulaması, canlı webhook/retrieve/refund/reconciliation, AV/KMS production servisi, production DNS/TLS/HSTS, sender-domain SPF/DKIM/DMARC, GİB/e-belge ve mali müşavir onayı, KVKK/DPA/hukuk değerlendirmesi, gerçek backup/restore tatbikatı ve bağımsız güvenlik incelemesi.

## Son kabul ölçütü

Bu planın local packet’leri geçse bile:

```text
R-10 production: BLOCKED / NO-GO until external evidence
V4 live BYO/SaaS: DEFERRED / BLOCKED until R-10 and V4 gates
Local fake/contract/sandbox/staging work: ACCEPTED with evidence labels
Manual invoice/document-ready flow: ACCEPTED subject to existing R-10 controls
Automatic e-document mutation: BLOCKED by default
```

## Gözden geçirme kontrolü

- [ ] Raporun upload, connection, simulation, wizard, threat, API/DB, backup/restore ve release bölümleri bir packet’e bağlandı.
- [ ] Mevcut `LOCAL_PASS` sözleşmeleri tekrar uygulama kapsamına alınmadı.
- [ ] Hiçbir faz V1/V2/V3 sırasını veya V4’ün son konumunu değiştirmiyor.
- [ ] Gerçek secret, PII, provider cevabı veya canlı mutasyon gerektiren hiçbir kabul kriteri local PASS olarak tanımlanmadı.
- [ ] Her packet tek çıktı, 15 dakika, allowed-files ve test kanıtı ile sınırlandı.
