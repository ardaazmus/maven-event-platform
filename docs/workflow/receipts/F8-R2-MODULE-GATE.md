# F8-R2-MODULE-GATE — Receipt

**Tarih:** 2026-09-20 | **Packet:** F8-R2-MODULE-GATE | **Önceki:** F8-R1-MODULE-VIEWS (LOCAL_PASS)
**Amaç:** Event modül gate: 7 modül manifest registry + fail-closed mutation
kararı + abstracts/program POST benimseme. Pilot varsayılanı tüm modüller açık.

## Karar (ACCEPTED)

- Manifest: `moduleId/version/requiredCapability/scope/supportedModes`;
  yetki `events.write`, scope `event`, modlar `integrated+standalone`.
- Karar: bilinmeyen modül kapalı; kapalı liste server-owned
  (`EVENT_MODULES_DISABLED` CSV); kapalıysa mutation 403 `Module disabled`.
- Yetki kontrolünden SONRA, DB işinden ÖNCE çalışır (ucuz red).

## Değişen dosyalar

- `docs/workflow/packets/F8-R2-MODULE-GATE.json` (yeni)
- `src/lib/event-module-gate.ts` (yeni, pure)
- `tests/f8-module-gate.test.mjs` (yeni, gerçek unit + benimseme kilidi, 30 assertion)
- `src/app/api/events/[id]/abstracts/route.ts` (import + 2 guard satırı)
- `src/app/api/events/[id]/program/route.ts` (import + 2 guard satırı)
- `docs/workflow/receipts/F8-R2-MODULE-GATE.md` (bu dosya)

## Çalıştırılan kontroller (bu oturum, cwd `D:\project\mavenform-v2`)

- `node scripts/workflow.mjs begin docs/workflow/packets/F8-R2-MODULE-GATE.json` → READY, exit 0
  (packet JSON yazım hatası 1 denemede düzeltildi).
- `bun tests/f8-module-gate.test.mjs` → PASS, exit 0.
- `bun tests/ux-abstract-submit.test.mjs` → PASS, exit 0.
- `bun tests/ux-program-create.test.mjs` → PASS, exit 0.
- `node scripts/workflow.mjs verify docs/workflow/packets/F8-R2-MODULE-GATE.json` →
  bu receipt yazıldıktan sonra koşuldu; sonuç
  `artifacts/workflow/F8-R2-MODULE-GATE/verified.json` içindedir (verify içi 7 check).

Bu receipt verify öncesi donduruldu; verify sonrası düzenlenmedi.

## Sonuç / kanıt sınıfı

- Sonuç: verify çıktısına bağlı; resmi kayıt
  `artifacts/workflow/F8-R2-MODULE-GATE/verified.json`.
- Sınır: speakers/sponsors/surveys/leads/reports + alt route (review/booth/response)
  benimsemesi F8-R3'e kalır. R-10 NO-GO korunur.

## Sıradaki packet

- F8-R3-MODULE-GATE-ALL (kalan modül mutation gate benimsemesi + tam modül suit).
