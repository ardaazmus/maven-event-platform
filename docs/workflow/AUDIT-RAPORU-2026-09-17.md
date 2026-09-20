# Bağımsız Denetim Raporu — F0→F9 (2026-09-17)

Kapsam: `D:\project\mavenform - Kopya` çalışma ağacı (`HEAD` diff + untracked).
Plan: `docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/`.
Yöntem: önceki `LOCAL_PASS` beyanları kanıt sayılmadı; aşağıdaki komutlar bu turda taze çalıştırıldı.
F9-03 paketiyle yürütüldü (`begin` exit 0, `local-ready` PASS). Ek okuma: `src/app/api/persons/route.ts`,
`src/lib/auth.ts:85-133`, `src/lib/policy.ts:1-72`, `tests/form-ux-sidebar-toggle-a11y.test.mjs`,
`src/components/mavenforms/sidebar.tsx:243-245`.
Git push kapalı (`origin` push → `no_push`); commit/push yapılmadı.

## Taze kapı sonuçları

| Komut | Sonuç |
|---|---|
| `node scripts/context-check.mjs` | PASS (12 dosya, 384 READY packet) |
| `node scripts/local-ready.mjs` | PASS (`/api/ready` 200 `db:ok`) |
| `bun run lint` | exit 0 |
| `node node_modules/typescript/bin/tsc --noEmit` | exit 0 |
| `bun run build` | exit 0 |
| `node scripts/run-tests.mjs` (514 dosya) | **514/514 PASS** (bu tur; R4 düzeltmesi sonrası) |
| `bun scripts/f9-sweep.mjs` (166 yeni-faz dosyası) | 166/166 PASS (bu tur) |
| `bun tests/registration-orchestration.test.mjs` | PASS (bu tur) |
| `bun tests/security-regression.test.mjs` | PASS (bu tur) |
| `bun x prisma migrate status` | 58 migration, `up to date` |
| Canlı: `POST /api/auth/login` 200, `GET /api/auth/me` 200 | doğrulandı (sonrası logout ile oturum kapatıldı) |
| Canlı: `GET /api/events` anon 401, owner 200, viewer 200; `POST` geçersiz gövde 400 | doğrulandı |
| Canlı: `GET /api/public/forms/tekno-zirvesi-2026` 200, `webinar-ai` 403 | doğrulandı |
| Public sızıntı taraması (exact-key) | `workspaceId/ownerId/passwordHash/secret` absent; `token` eşleşmesi yalnız tema `tokens` alanı (tasarım verisi, sızıntı değil) |

Önceki turdaki tek başarısız (`form-ux-sidebar-toggle-a11y`, biçim-kırılganı regex) F1-23 ile
davranış assertion'ına çevrildi; bu tur tam süpürme 514/514 yeşil. Davranış (`aria-label`/`title`
durum-bazlı, `sidebar.tsx:243-245`) değişmedi.

## Faz hükümleri (plana göre)

- F0 — PASS. STATUS 6KB, context-check, registry+sözlük, tek runner (`test` scripti), backup log, sözlük+ADR, lint/tsc/build/ready kilidi taze doğrulandı.
- F1 — LOCAL_PASS (F9-04 ile kapatıldı). R1 (`persons.read/write`, F1-20), R2 (`x-workspace-id` claim, F1-21),
  R3 (binding tekilliği, F1-22), R4 (sidebar test onarımı, F1-23) ve R5 (shadow rehearsal, F1-25/26/27) tamamlandı.
- F2 — LOCAL_PASS geçerli. Order/payment/allocation/approval/reversal/summary/export zinciri testli; canlı mutabakat kapısı doğru şekilde dış bağımlılıkta.
- F3 — LOCAL_PASS geçerli (düzeltmeyle). F3-14'te tracked legacy `invoices/[id]/documents/route.ts` yanlışlıkla ezilmişti; F3-14A ile byte-birebir geri yüklendi (`git diff` temiz, bu tur doğrulandı), attach API `document-links` yoluna taşındı, legacy 2 test yeşil. Not: registry'deki `F3-manual-invoice` notu F3-14 receiptine (`changedFiles: documents/route.ts`) işaret ediyor; o receipt hatalı overwrite dönemine aittir, geçerli telafi F3-14A receiptidir.
- F4 — LOCAL_PASS geçerli. Ticket/credential/check-in/scan/badge/offline zinciri testli.
- F5 — LOCAL_PASS geçerli. Mapping/binding/hold/book/release/assign/sweep/runbook testli.
- F6 — Yerel kısım PASS; canlı kapılar doğru şekilde EXTERNAL_DEPENDENCY.
- F7 — Kayıt-dışı durum doğru (hesap/onay yok, manuel fallback korunuyor).
- F8 — Model+migration+kapsam PASS; UI/API yokluğu doğru (talep-gated).
- F9 — Freeze PASS; sweep notu: registry `166/166` kaydı sweep kapsamı için doğru, tam-süpürme gerçeği 511/512'dir.

## Kritik bulgular

**K-1 (kritik): viewer rolü kişi PII okuyabiliyor.**
`src/app/api/persons/route.ts:16` GET `can.readEvents`, `:33` POST `can.writeEvents` kullanıyor;
`viewer` dahil tüm roller `events.read` taşıyor (`src/lib/policy.ts:23-29`).
Canlı kanıt (önceki tur): viewer token ile `GET /api/persons` → 200 idi.
Kapanış (F1-20): ayrı capability + canlı viewer-GET 403 / owner-GET 200 doğrulandı.

**K-2 (kritik): sessiz workspace seçimi kodda duruyor.**
`src/lib/auth.ts:99-103` ilk aktif üyeliği sessiz seçiyor (`orderBy joinedAt asc`).
Kapanış (F1-21): `x-workspace-id` claim eklendi; çok üyelikte claimsiz/yanlış claim 401,
doğru claim 200, wrong-org kaynak 404 — hepsi canlı doğrulandı, sentetik satır kalıntısı 0.

**Ö-1 (kapandı, F1-22):** forma ikinci `registration` binding 409 ile reddediliyor; orchestration tekil sonuçta deterministik (`survey` serbest).

**Ö-2 (kapandı, F1-23):** sidebar testi davranış assertion'ına çevrildi; tam süpürme 514/514.

**N-1 (nitpick):** tema `tokens` alanı naive `token` taramasında eşleşir; tarama exact-key yapılmalı.
`src/middleware.ts` kullanılmayan `eslint-disable` uyarısı sürüyor. 30-gün session bilinen kabul (SESSION-POLICY).

## Sonuç

F0–F5, F6-yerel, F7-kayıt, F8-model, F9-freeze LOCAL_PASS hükümleri geçerlidir.
F1 hükmü LOCAL_PASS'a döndü (R1–R5 kapanış receiptleri: F1-20/21/22/23/25/26/27).
R5 shadow rehearsal kanıtı: `docs/workflow/pg-shadow-report.md` (73/73 tablo, hash eşit, restore 73).
Public SaaS kararı: NO-GO (değişmedi; R6/R7 dış bağımlılık + veri-satırı taşıma ayrı packet ister).
