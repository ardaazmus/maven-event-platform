# F6-R1-PROVIDER-GATE — Receipt

**Tarih:** 2026-09-20 | **Packet:** F6-R1-PROVIDER-GATE | **Önceki:** F5-R2-EFPS (LOCAL_PASS)
**Amaç:** F6/F7 dış kapı kilidi: fail-closed canlı/provider/e-belge sözleşmesi +
gate suit yeniden doğrulama. Kod değişikliği yok.

## Kilitlenen sözleşme

- `canEnable` yalnız `test + sandbox + tutar` iken true; live-enable kodu yok;
  UI varsayılanı `Etkinleştirme kapalı`, live satırı `R-10 gerekli` yazar.
- Kart saklanmaz; hosted checkout + server webhook doğrulaması önkoşulu yazılı.
- Stripe/iyzico/mandrill webhook HMAC + `timingSafeEqual` + route-verify zinciri.
- Registry `F6-live` + `F7-auto` = `EXTERNAL_DEPENDENCY`; ADR-0004/0005 kayıtlı;
  F7 manuel fallback korunur; canlı iddia yok.

## Değişen dosyalar

- `docs/workflow/packets/F6-R1-PROVIDER-GATE.json` (yeni)
- `tests/f6-provider-gate.test.mjs` (yeni, 17 assertion)
- `docs/workflow/receipts/F6-R1-PROVIDER-GATE.md` (bu dosya)

## Çalıştırılan kontroller (bu oturum, cwd `D:\project\mavenform-v2`)

- `node scripts/workflow.mjs begin docs/workflow/packets/F6-R1-PROVIDER-GATE.json` → READY, exit 0.
- `node tests/f6-provider-gate.test.mjs` → PASS, exit 0.
- `node scripts/workflow.mjs verify docs/workflow/packets/F6-R1-PROVIDER-GATE.json` →
  bu receipt yazıldıktan sonra koşuldu; sonuç
  `artifacts/workflow/F6-R1-PROVIDER-GATE/verified.json` içindedir (verify içi 8 check).

Bu receipt verify öncesi donduruldu; verify sonrası düzenlenmedi.

## Sonuç / kanıt sınıfı

- Sonuç: verify çıktısına bağlı; resmi kayıt
  `artifacts/workflow/F6-R1-PROVIDER-GATE/verified.json`.
- `EXTERNAL_DEPENDENCY`: merchant staging, sender-domain, Paraşüt UAT,
  mali müşavir/hukuk kanıtı yok; canlı finans kapalı. R-10 NO-GO korunur.

## Sıradaki packet

- FAZ-7: F8-R1-MODULES (event modülleri unwrap + entitlement gate).
