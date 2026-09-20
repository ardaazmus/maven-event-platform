# EF-00-MAPPING — Araştırma → Source/Test Eşleme Receipti

**Tarih:** 2026-09-19
**Packet:** EF-00-MAPPING (F0/EF kapısı, kod değişikliği yok)
**Kaynak önceliği:** master plan → AGENTS/PROJECT_CONTEXT/STATUS → packet → source/test → sentez raporu
**Araştırma girdileri (yalnız karar adayı, proje kanıtı değil):**
`D:\project\MAVEN_EVENT_MANAGEMENT_ORCHESTRATOR\research\2026-09-19\01-...md`
(R01, 115 sınıflandırma etiketi sayıldı),
`02-...md` (R02, SECTOR_PATTERN/VERIFIED_EXTERNAL_FACT/RECOMMENDATION/STANDARD_CONTROL etiketli),
`03-RESEARCH_SYNTHESIS.md` (SYN, §3–§6 karar adayları).

**Ortam notları (doğrulandı):**
- `git status` için `git -c safe.directory=D:/project/mavenform-v2` gerekir (sandbox kullanıcısı farklı);
  worktree'de 40+ kullanıcı değişikliği korunur, hiçbirine dokunulmadı.
- `node scripts/*.mjs` çağrıları yalnız komut-içi `Set-Location 'D:\project\mavenform-v2'` ile çalışır;
  araç `workdir` parametresi cwd'yi bozup node EISDIR üretir (2 denemede gözlendi).
- `context-check`: PASS (14 dosya, 470 READY packet). Test envanteri: `tests/*.test.mjs` = 566 dosya.
- F0-01..F0-06A `status: READY, timeboxMinutes: 15` taşır ancak `sourceOfTruth` boştur;
  `scripts/workflow.mjs loadPacket` kanonik source ister, bu yüzden bu halleriyle `begin` edilemezler (yapısal bulgu).
- Son doğrulanmış receipt: `artifacts/workflow/F9-11/verified.json` (`status: LOCAL_PASS`).

## Zorunlu eşleme tablosu

| Araştırma bulgusu | MavenForms modülü/route | Mevcut kanıt | Gap | Karar | İlk küçük packet |
|---|---|---|---|---|---|
| Event-first omurga (R02 §1 SECTOR_PATTERN; SYN §3A) | `src/app/api/events/*`, `event-bar.tsx`, `store.ts`, `sidebar.tsx` | VERIFIED-KISMI: events CRUD + occurrences + readiness + bindings + holds + plan-bindings route'ları mevcut; `selectedEventId` + EventBar + shell render mevcut (`tests/ux-shell-event-bar.test.mjs`, `event-create/readiness/scope/model`, `ux-event-list/dashboard` testleri); sidebar düz liste; birincil aksiyon `Yeni Form` (`sidebar.tsx:112`, `dashboard-view.tsx:229`, `forms-list-view.tsx:551,650`); `Yeni Etkinlik` regex taramada 0 eşleşme | Event-first IA (workspace gruplama, birincil Yeni Etkinlik, setup sırası) yok | ACCEPTED (istikamet) | EF-01-DOMAIN → EF-02-EVENT-SETUP |
| Genel Form + Etkinlik Kayıt Formu (R02 §3 SECTOR_PATTERN; SYN §6.2) | `prisma/schema.prisma` (Form), `EventFormBinding`, `events/[id]/bindings` | VERIFIED-KISMI: Form modelinde mod alanı yok; binding `purpose=registration/survey` + unique(eventId,formId) mevcut (`tests/event-binding.test.mjs`) | Form açılışında zorunlu mod seçimi, eventId/mapping/duplicate-policy saklama, eski form uyumluluk adapter'ı yok | ACCEPTED | EF-03-FORM-MODE |
| Canonical intake (R02 §4 RECOMMENDATION; SYN §3B/§6.3) | `src/app/api/public/forms/[slug]/submissions/route.ts` (F1-17), `Submission`, CSV/XLSX/API/manuel girişler | VERIFIED-KISMI: `RegistrationIntake` kavramı yok (src regex 0); inline projection mevcut: binding-gated person find-or-create (email), tx içinde submission+registration+history+outbox (`route.ts:107-166`, `tests/registration-orchestration.test.mjs`); Registration'ta source/idempotency alanı yok; CSV/XLSX/API/manuel birleşik hat yok | Ortak validation/dedup/idempotency/source-metadata/audit sözleşmesi yok | ACCEPTED (hedef); mevcut inline akış korunur | EF-04-INTAKE |
| Person/Registration/Ticket ayrımı (R02 §3; SYN §3C/§6.4) | `Person/Registration/RegistrationHistory/Ticket/Credential`, `persons`, `registrations`, `registrations/[id]/ticket` route'ları | VERIFIED: modeller workspace+event scope'lu; CRUD route'ları auth+policy gate'li (`registrations/route.ts:14-69`); testler: `person-api/model`, `registration-api/model/inbox`, `checkin-model/scan` | Ayrım mevcut; intake hattına bağlanma EF-04 işi | ACCEPTED | EF-04-INTAKE |
| Badge PDF/PNG/JPEG (R02 §8 SECTOR_PATTERN+STANDARD_CONTROL; SYN §3H ihtiyat: "tamamı doğrulanmadı") | `src/lib/badge-template-contract.ts`, `badge-template-storage.ts`, badge template/generate/export route'ları | VERIFIED-KISMI: PDF-only zincir mevcut: `PDF_REQUIRED` + `%PDF-` signature + active-content reject + 25MB/1-2 sayfa + private manifest (`badge-template-contract.ts:47-60`); storage `mime: 'application/pdf'` sabit (`badge-template-storage.ts:44`); template/upload/storage/catalog testleri mevcut | PNG/JPEG/WebP template kabulü yok (yalnız `accept` değil, server validation yok) | ACCEPTED (hedef; user requirement ile uyumlu, test-gated) | EF-09-PILOT-GATE öncesi F4 badge packet'i |
| EFPS boundary (R02 §9 SECTOR_PATTERN; SYN §3E/§6.6) | `FloorPlanBinding`, `ExternalIdMapping`, `InventoryHold`, holds/plan-bindings/inventory route'ları | VERIFIED-KISMI: binding (externalPlanId+planVersion) + mapping (sourceSystem efps/import) + hold (TTL/status) modelleri ve `events/[id]/holds`, `holds/[id]/assign`, `inventory-bookings/releases/sweeps`, `events/[id]/plan-bindings` route'ları mevcut; `src/lib` içinde efps adapter sözleşmesi yok (regex 0) | Canonical ID mapping + hold/book/release + assignment contract testi yok | ACCEPTED | EF-07-EFPS-CONTRACT |
| Mobile boundary (R02 §7 SECTOR_PATTERN; SYN §5 mobile, offline P1 backlog) | `src/app/api/checkin/route.ts`, `CheckInEvent` (gate/deviceId/operatorId/occurredAt) | VERIFIED-KISMI: online backfill contract mevcut: geçmiş `occurredAt` 201, gelecek 400 (`tests/checkin-offline.test.mjs`); `offline/snapshot/replay/mobile-contract` için src'de yalnızca `globals.css` yorumu eşleşir | Gerçek offline snapshot/replay, device scope, badge reprint, gate/device contract yok | DEFERRED (önce online check-in; offline ayrı faz) | EF-08-MOBILE-CONTRACT |

## Karar kaydı

- R01 ihtiyat dili korunur: hiçbir dış bulgu mevcut özellik iddiası olarak kullanılmadı; her satır yukarıdaki
  source/test yoluyla doğrulandı veya gap olarak işaretlendi.
- Çelişki yoktur; SYN §4 zamanlama farkları (ödeme/manual-first, offline Faz-2, badge test-gated, pool+RLS sonra)
  mevcut kodla uyumludur: manuel ledger, provider test/live ayrımı ve workspace scope kodda mevcuttur.
- UNMAPPED bulgu yoktur; 7 bulgunun 7'si de modüle eşlendi.
- Yeni modül, geniş UI turu ve speculative refactor başlatılmadı (bu packet yalnızca receipt üretir).

## Dış bağımlılıklar

- Yok (yeni). R-10 NO-GO/BLOCKED aynen korunur; bu receipt production kanıtı değildir.

## Özellik kaybı kontrolü

- Kod değişikliği yok; Form Builder, public snapshot, submission, payment/manual invoice, badge, check-in,
  floor, embed, outbox, RBAC/audit davranışlarına dokunulmadı.

## Sıradaki packet

- EF-01-DOMAIN (domain/sahiplik sözlüğü + çelişki raporu), `previous: [EF-00-MAPPING]`.
