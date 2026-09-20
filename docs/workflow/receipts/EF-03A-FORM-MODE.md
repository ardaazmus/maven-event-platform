# EF-03A-FORM-MODE — Receipt

**Tarih:** 2026-09-20 | **Packet:** EF-03A-FORM-MODE | **Önceki:** EF-02C-EVENT-SETUP (LOCAL_PASS)
**Amaç:** Form çalışma modu read-modelini binding-türetimli pure helper + gerçek unit test ile kilitlemek. Schema değişikliği yok; eski formlar `general` döner.

## Karar (ACCEPTED, dar kapsam)

- Mevcut `useProfile` (event_registration/research_survey/quiz) editör varsayımıdır;
  Genel/Etkinlik ayrımı değildir. Yeni eksen binding'ten türetilir, `useProfile` korunur.
- `Form` satırına mod kolonu eklenmedi (migration/DB riski yok): mod
  `EventFormBinding` satırlarından `resolveFormMode` ile türetilir.
- Öncelik: registration > survey > general; bilinmeyen purpose fail-closed yok sayılır.

## Değişen dosyalar

- `docs/workflow/packets/EF-03A-FORM-MODE.json` (yeni)
- `src/lib/form-mode.ts` (yeni, pure; DB/fetch/react yok)
- `tests/ef-form-mode.test.mjs` (yeni, gerçek unit test: node `.ts` import, 20 assertion)
- `docs/workflow/receipts/EF-03A-FORM-MODE.md` (bu dosya)

## Çalıştırılan kontroller (bu oturum, cwd `D:\project\mavenform-v2`)

- `node scripts/workflow.mjs begin docs/workflow/packets/EF-03A-FORM-MODE.json` → READY, exit 0.
- `node tests/ef-form-mode.test.mjs` → PASS, exit 0 (MODULE_TYPELESS uyarısı benign).
- `node tests/form-use-profile.test.mjs` → PASS, exit 0.
- `node scripts/workflow.mjs verify docs/workflow/packets/EF-03A-FORM-MODE.json` →
  bu receipt yazıldıktan sonra koşuldu; sonuç
  `artifacts/workflow/EF-03A-FORM-MODE/verified.json` içindedir
  (verify içi: context-check + 2 hedef test + `tsc --noEmit`).

Bu receipt verify öncesi donduruldu; verify sonrası düzenlenmedi.

## Sonuç / kanıt sınıfı

- Sonuç: verify çıktısına bağlı; resmi kayıt
  `artifacts/workflow/EF-03A-FORM-MODE/verified.json`.
- Korunan davranış: eski/binding-siz form = `general` (mevcut davranış);
  `useProfile` akışı aynen; API/DB değişikliği yok.
- R-10 NO-GO korunur.

## Sıradaki packet

- EF-03B-FORM-CREATE (form oluşturma UI: Genel / Etkinlik Kaydı seçimi + event picker → binding).
