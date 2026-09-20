# RESET/QA Receipt — Temiz gelistirme verisi ve ucten uca kullanici kaniti

- Faz / packet: RESET-0 → RESET-3 + QA-1 → QA-5 (yeni-plan.md aktif kapilar)
- Amac: yalnisca `db/custom.db` hedefinde temiz Event-first DEMO verisi + kullanici kaniti
- Tarih: 2026-09-20 (UTC backup klasoru 2026-09-19T22-35-54-402Z)

## RESET-0 — hedef ve guvenlik kapisi
- Root: `D:\project\mavenform-v2` dogrulandi.
- `DATABASE_URL=file:../db/custom.db`, provider `sqlite` — yalnizca gelistirme hedefi.
- Port 3000'de proje `next dev` (PID 100996/94936) DB kilidi tutuyordu; normal durdurma yapildi.
- WAL/SHM yan dosyasi yok; migration: 62, schema `up to date`; schema SHA-256 `F2F8B799…D2C241`.

## RESET-1 — geri alinabilir arsiv
- Klasor: `db/backup-2026-09-19T22-35-54-402Z/custom.db` (WAL/SHM yoktu).
- SHA-256 kaynak = yedek: `F2DC18E3612989724B21DEC6DEA410645098AC0278CB1B7E5EC63CB5EA9317ED`.
- Okunabilirlik: header `SQLite format 3`, `PRAGMA integrity_check = ok`, 82 tablo, 62 migration.
- `.next` kopyalarina, baska DB'lere dokunulmadi.

## RESET-2 — temiz DB (`LOCAL_DB_RESET_PASS`, release degil)
- `prisma generate` PASS; `db/custom.db` silindi; `prisma migrate deploy` → 62 migration uygulandi.
- `migrate status` → `up to date`; yeni DB hash `1A7C5CD5…BEA34C` (eskiden farkli).
- Kanonik seed `bun prisma/seed.ts` → workspace `mavenforms-demo`, `demo@mavenforms.com`, 5 form.

## RESET-3 — deterministik DEMO senaryosu (`scripts/reset3-demo-seed.mjs`, idempotent x2)
- `evt_demo_summit26` (draft) → `occ_demo_day1` (DEMO Kongre Merkezi/Salon A)
- `form_demo_general` (standalone) + `form_demo_eventreg` (EventFormBinding/registration)
- `sub_demo_event_01` → 3 Person → reg_demo_01 (confirmed), reg_demo_02/03 (submitted)
- import/EFPS mapping (`import:demo-csv-row-003`, `efps:DEMO-PLAN-01`)
- `order_demo_01` (paid) + `pay_demo_01` (manuel bank_transfer confirmed) + allocation
- `ticket_demo_01` + `cred_demo_01` (DEMO-QR-0001) + outbox (transactional/sent)
- 3 MediaAsset sablon (pdf/png/jpeg, clean/private) + `checkin_demo_01` + floor binding + report
- 4 audit kaydi + `[TEST] viewer_test@mavenforms.com` (viewer guard fixturu)
- Kanonik publish API ile 5 forma published FormVersion (`scripts/publish-demo-forms.mjs`)

## QA-1 — yontemler (risk-based, journey, contract, regression, responsive, WCAG heuristic, visual)
- Full suite: `test-runner: PASS (590 files)`, sifir FAIL.
- `node_modules\.bin\tsc --noEmit` PASS; `npm run lint` PASS; `npm run build` PASS.
- `/api/health` 200, `/api/ready` 200.

## QA-2 — canli akislar (`scripts/qa2-live-flows.mjs`: 20/20 PASS)
- event list/create/occurrence/readiness + empty-title 400; genel/event public 200;
- cift registration binding 409; submit 200 + invalid 400; order paid; badge 200/404;
- check-in 201 → duplicate 409 → invalid 404 → unknown occurrence 404;
- plan-bindings DEMO-PLAN-01; draft public 403. Temp artefaktlar temizlendi.

## QA-3 — gorsel kanit (`/tmp/mfqa/shots/`, 16 kare, sifir konsol hatasi)
- 1440/1280/768/390 × login (form gorunur) → UI login → dashboard (sidebar) → events (DEMO event) → public form.
- Incelenen: 1440 dashboard (Event-first CTA + toast), 1440 events, 390 dashboard, 1440 public form.

## QA-4 — duzeltme dongusu (tamami ayni senaryoda yeniden kosuldu, yesil)
1. `viewer_test` yoklugu (person-api, security-regression) → RESET-3'e TEST fixturu eklendi.
2. Seed formlarinda published version yoklugu (e2e, security, orchestration public 403) → kanonik publish API ile 5 version.
3. Basarisiz kosu artiklari (6 F1-* event) → cascade temizlik; `event-binding.test` kendi formunu uretir hale geldi (intihar varsayimi kaldirildi).
4. `network-view.tsx` set-state-in-effect lint hatasi → effect-ici async `run()` + cancelled guard.

## QA-5 — kapi
- migration/generate/seed, target+full suite, typecheck, lint, build, contract/readiness,
  desktop+mobile smoke, screenshot, UX register, receipt: TAMAM.
- Fail-closed dis birakilanlar: gercek provider/odeme/e-posta/EFPS remote/AV/production deploy (EXTERNAL_DEPENDENCY).

## Degisen dosyalar
- `scripts/reset3-demo-seed.mjs` (yeni), `scripts/publish-demo-forms.mjs` (yeni), `scripts/qa2-live-flows.mjs` (yeni)
- `tests/event-binding.test.mjs` (kendi form setup/teardown)
- `src/components/mavenforms/views/network-view.tsx` (lint fix)
- `db/bac
...[truncated 615 chars]