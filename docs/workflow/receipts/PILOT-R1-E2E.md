# PILOT-R1-E2E — Receipt

**Tarih:** 2026-09-20 | **Packet:** PILOT-R1-E2E | **Önceki:** F9-R2-R1 (LOCAL_PASS)
**Amaç:** FAZ-9 pilot: tek event uçtan uca canlı senaryo + tam süit + release kararı.

## Pilot zinciri (CANLI, koşan server + seed DB)

`Event → Occurrence → Form/Binding → Person → Registration → Ticket → Check-in → Hold → Readiness`

- 201'ler (form 200 — route sözleşmesi): event, occurrence, binding, person,
  registration, ticket, checkin, hold.
- Readiness: `setup` occurrence sonrası, `hold` hold sonrası açıldı; kayıt sayıldı.
- Intake kanıtı: karışık-case email + boşluklu isim normalize saklandı.
- Audit: `registrationHistory` satırı yazıldı.
- Negatif: duplicate checkin 409.
- Temizlik: çocuk→ebeveyn sırasıyla silindi; başarısız ilk koşunun artıkları
  (2 event + 2 form) ayrı betikle temizlendi.

## Değişen dosyalar

- `docs/workflow/packets/PILOT-R1-E2E.json` (yeni)
- `tests/pilot-e2e.test.mjs` (yeni, canlı, self-cleaning)
- `docs/workflow/receipts/PILOT-R1-E2E.md` (bu dosya)

## Çalıştırılan kontroller (bu oturum, cwd `D:\project\mavenform-v2`)

- `node scripts/workflow.mjs begin docs/workflow/packets/PILOT-R1-E2E.json` → READY, exit 0.
- `bun tests/pilot-e2e.test.mjs` → PASS, exit 0 (1 test-tarafı beklenti
  düzeltmesi: form 200).
- `node scripts/workflow.mjs verify docs/workflow/packets/PILOT-R1-E2E.json` →
  bu receipt yazıldıktan sonra koşuldu; sonuç
  `artifacts/workflow/PILOT-R1-E2E/verified.json` içindedir (verify içi 4 check:
  context-check + pilot-e2e + **tam süit run-tests.mjs** + tsc).

Bu receipt verify öncesi donduruldu; verify sonrası düzenlenmedi.

## Release kararı: NO-GO (R-10 korunur)

- Pilot yerel kanıtı (`LOCAL_PASS`) production/pilot onayı değildir.
- Açık dış kapılar: merchant staging, sender-domain, Paraşüt UAT, mali müşavir/hukuk,
  EFPS canlı, saha cihazı, AV/quarantine, backup/restore, RLS rehearsal (docker yok).
- SaaS/multi-tenant aktivasyonu kapalı (freeze). Canlı ödeme/e-belge kapalı.

## Özellik koruma kontrolü (FAZ-9 kapanışı)

Form Builder, public snapshot, Submission, Person, Registration, Payment/manuel
invoice, Badge, Check-in, Floor Plan, WordPress/embed, Notifications/outbox,
RBAC/audit: sahipleri + deep link/read model + API/test kanıtı korunur; bu oturumda
silinen özellik yok (yalnız eklemeli değişiklik + sözleşme revizyonu).
