# UX Issue Register — RESET/QA 2026-09-20

| # | Sinif | Gorev/engel | Kanit | Durum |
|---|-------|-------------|-------|-------|
| 1 | DATA | Testler kanonik seed'de olmayan `viewer_test` kullanicisina bagimliydi | person-api/security-regression FAIL → RESET-3 fixturu sonrası PASS | Kapandi |
| 2 | DATA | Public snapshot 403: seed formlarinda published version yoktu | e2e FAIL → kanonik publish sonrası PASS | Kapandi |
| 3 | INTEGRATION | Yarim kosu artiklari (F1-* event) binding 409 uretti | registration-orchestration FAIL → temizlik + test izolasyonu sonrası PASS | Kapandi |
| 4 | UX | `network-view.tsx` set-state-in-effect (lisansli lint gate) | eslint 1 error → effect-ici async guard sonrası PASS | Kapandi |

Heuristic tarama (1440/390 ekran goruntuleri): birincil `Yeni Etkinlik` CTA, event context bar, login toast,
etkinlik listesi `Seç` aksiyonu, public form alanlari — anlasilir ve calisir bulundu. Otomatik axe taramasi
kosulmadi (proje bagimliligi yok, kurulmadi) — WCAG degerlendirmesi label/kontrast/klavye sezgiseldir.
Bloklayan UX sorunu kalmadi.
