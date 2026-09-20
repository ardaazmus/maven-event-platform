# Release Checklist — MavenForms (Pilot)

**Artifact:** `next build` 0, `prisma migrate deploy` up to date, `health/ready` 200
**Date:** 2026-09-01 20:20 +03 Europe/Istanbul
**Decision:** GO_WITH_CAVEATS — tek-instance pilot

## Gates
- [x] M00 lint 0 tsc 0 build 0, smoke login/me/public 200, backup sha256 9faab...
- [x] M01 DTO forbidden 0, IDOR 404, preview 403/401, policy viewer 403/owner 200, session docs/SESSION-POLICY.md
- [x] M02 transaction atomic, crypto token, HMAC ip/ua, validation, migrate 20260901201631_baseline_init, backup restore SQLite OK
- [x] M03 publish version + sanitizePublicForm parity
- [x] M04 dnd-kit basic + bounded Grid/Bento field layout (nested container intentionally out of scope)
- [x] M05 card 16:9 + Ayarlar, M06 iframe referrer origin + wordpress plugin stub
- [x] M07 outbox enqueue after commit + processOutboxOnce (ponytail: DB table when volume), file 5MB/type check, integrations redacted
- [x] M08 health 200 ready 200 (SELECT 1), Caddy :81, middleware x-request-id, backup drill
- [x] M09 perf p95 16ms err 0 (40 samples), security: IDOR/preview/forbidden 0, a11y: label/required/alt present
- [x] M10 staging: local prod build smoke pass (see health/ready), rollback: previous .next artifact + db backup

## Caveats (NO-GO for public SaaS until)
- Bounded Grid/Bento responsive + template isolation tam E2E yok
- Mail/webhook gerçek provider + retry dead-letter Dashboard yok (in-memory outbox)
- Playwright E2E harness yok (manuel smoke var)
- Staging canary ayrı ortamda değil, aynı DB üzerinde

## Rollback
`db/backup-*.db` + `prisma migrate deploy` önceki migration, `start.sh` önceki tar.gz
