# F9-R2-TENANT — Receipt

**Tarih:** 2026-09-20 | **Packet:** F9-R2-TENANT | **Önceki:** F9-R1-MOBILE (LOCAL_PASS)
**Amaç:** Tenant son kapı kilidi: BOLA 16 uç + entitlement/freeze/provisioning/RLS
sözleşmesi. SaaS aktivasyonu kapalı. Kod değişikliği yok (test kilidi).

## Düzeltme notu

- Packet `acceptance` satırındaki "22" sayısı yanlıştır; doğrusu **16 uç (11+5)**.
  Packet `begin` sonrası değiştirilemediği için düzeltme burada kayıtlıdır.

## Kilitlenen sözleşme

- BOLA: 16 GET ucu (11 inbox + 5 modül) auth-önce + workspace-scope +
  istemci-scope-yasağı ile kilitli.
- Entitlement: tenant eşleşmesi/askısı/liste-dışı/kapalı 5 karar + V1 3-açık matris.
- Freeze: ADR-0007 `AÇILMAZ`, registry `F9-freeze LOCAL_PASS`, `tenants/` ve
  `billing/` API yüzeyi yok (yoklukla fail-closed).
- RLS rehearsal scripti shadow-only ve politika-itibariyle kilitli; bu oturumda
  docker `mf-pg-shadow` çalışmadığı için ÇALIŞTIRILAMADI → UNVERIFIED.

## Değişen dosyalar

- `docs/workflow/packets/F9-R2-TENANT.json` (yeni)
- `tests/inbox-bola-guard.test.mjs` (+5 modül GET)
- `tests/f9-tenant-gate.test.mjs` (yeni, unit + static, 16 assertion)
- `docs/workflow/receipts/F9-R2-TENANT.md` (bu dosya)

## Çalıştırılan kontroller (bu oturum, cwd `D:\project\mavenform-v2`)

- `node scripts/workflow.mjs begin docs/workflow/packets/F9-R2-TENANT.json` → READY, exit 0.
- `bun tests/f9-tenant-gate.test.mjs` → PASS, exit 0.
- `node tests/inbox-bola-guard.test.mjs` → PASS (16 uç), exit 0.
- `node scripts/workflow.mjs verify docs/workflow/packets/F9-R2-TENANT.json` →
  bu receipt yazıldıktan sonra koşuldu; sonuç
  `artifacts/workflow/F9-R2-TENANT/verified.json` içindedir (verify içi 6 check).

Bu receipt verify öncesi donduruldu; verify sonrası düzenlenmedi.

## Sonuç / kanıt sınıfı

- Sonuç: verify çıktısına bağlı; resmi kayıt
  `artifacts/workflow/F9-R2-TENANT/verified.json`.
- `UNVERIFIED`: RLS rehearsal (docker shadow yok). `EXTERNAL_DEPENDENCY`:
  tenant provisioning/billing/BYO (yüzey yok, kapalı). R-10 NO-GO korunur.

## Sıradaki packet

- FAZ-9: PILOT-R1-E2E (tek event pilot senaryosu + tam süit + release kararı).
