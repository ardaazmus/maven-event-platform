# F3-R1-INVOICE — Receipt

**Tarih:** 2026-09-20 | **Packet:** F3-R1-INVOICE | **Önceki:** F2-R1-FINANCE (LOCAL_PASS)
**Amaç:** F3 kilit packet'i: fatura + iletişim sözleşme kilidi ve suit yeniden
doğrulama. Kod değişikliği yok (EF-02A emsali lock packet).

## Kilitlenen sözleşme

- Outbox: `queueClass` (transactional/notification/marketing), `deliveryStatus`,
  `attemptCount`, claim kilidi, provider izi; `EmailProviderEvent` inbox;
  marketing opt-out/pause korunur.
- Dispatch worker: claim + batch tavanı + sınıfsız-event reddi + paylaşılan
  retry politikası.
- Retry: `retryable|permanent`, terminal kararı, 5 deneme tavanı, provider
  reddi kalıcı sınıfta.
- Teslimat: issued-only, `email|manual` kanal şeması, writeInvoices yetkisi,
  toplu silme yok.

## Değişen dosyalar

- `docs/workflow/packets/F3-R1-INVOICE.json` (yeni)
- `tests/f3-invoice-contract.test.mjs` (yeni, 20 assertion)
- `docs/workflow/receipts/F3-R1-INVOICE.md` (bu dosya)

## Çalıştırılan kontroller (bu oturum, cwd `D:\project\mavenform-v2`)

- `node scripts/workflow.mjs begin docs/workflow/packets/F3-R1-INVOICE.json` → READY, exit 0.
- `bun tests/f3-invoice-contract.test.mjs` → PASS, exit 0.
- `node scripts/workflow.mjs verify docs/workflow/packets/F3-R1-INVOICE.json` →
  bu receipt yazıldıktan sonra koşuldu; sonuç
  `artifacts/workflow/F3-R1-INVOICE/verified.json` içindedir (verify içi 11 check:
  context-check + 9 F3/outbox testi (bun) + tsc).

Bu receipt verify öncesi donduruldu; verify sonrası düzenlenmedi.

## Sonuç / kanıt sınıfı

- Sonuç: verify çıktısına bağlı; resmi kayıt
  `artifacts/workflow/F3-R1-INVOICE/verified.json`.
- Gerçek e-belge/Paraşüt/provider teslimatı dış kapıdır (FAZ-6); bu packet
  yalnız yerel sözleşme kilididir. R-10 NO-GO korunur.

## Sıradaki packet

- FAZ-4: F4-R1-BADGE (badge studio sözleşme çelişkisi + check-in unwrap).
