# EF-02A-EVENT-API — Receipt

**Tarih:** 2026-09-19 | **Packet:** EF-02A-EVENT-API | **Önceki:** EF-01-DOMAIN (LOCAL_PASS)
**Amaç:** Event oluşturma API sözleşmesini sunucusuz contract testiyle kilitlemek; davranış değiştirmedi.

## Doğrulanan sözleşme (`src/app/api/events/route.ts`, okundu)

- POST: session yoksa 401 → `can.writeEvents` gate → zod `createEventSchema`
  (title 1..200, description ≤2000, timezone default Europe/Istanbul) → geçersizse 400 →
  `db.event.create({ workspaceId: ctx.workspace.id, createdById: ctx.user.id })` → 201 `{ data: { id, title } }`.
- GET: `can.readEvents` + `where: { workspaceId }` scope'lu liste.
- Canlı davranış testleri `tests/event-create.test.mjs` içinde zaten mevcuttur (server + seed gerektirir,
  bu packet'te koşulmadı); bu packet kaynak-sözleşme kilididir, davranış değişikliği yoktur.

## Değişen dosyalar

- `tests/ef-event-create-contract.test.mjs` (yeni, 16 assertion)
- `docs/workflow/receipts/EF-02A-EVENT-API.md` (bu dosya)

## Çalıştırılan kontroller

- `node tests/ef-event-create-contract.test.mjs` → PASS
- `node scripts/context-check.mjs` → PASS (verify içinde)
- `node scripts/workflow.mjs verify docs/workflow/packets/EF-02A-EVENT-API.json` → LOCAL_PASS

## Sonuç / kanıt sınıfı

- Sonuç: LOCAL_PASS. Kanıt sınıfı: yerel contract test + source incelemesi.
- Korunan davranış: route/lib koduna dokunulmadı; mevcut testler aynen durur.

## Kalan dış bağımlılıklar / sınırlar

- Canlı server testi (`event-create.test.mjs`) bu ortamda koşulmadı (koşan server + seed DB gerekir) → o kapsam UNVERIFIED.
- R-10 NO-GO aynen korunur.

## Sıradaki packet

- EF-02B-EVENT-UI (`Yeni Etkinlik` birincil aksiyon + setup sırası + empty state), `previous: [EF-02A-EVENT-API]`.
