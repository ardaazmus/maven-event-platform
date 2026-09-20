# F2-R1-FINANCE — Receipt

**Tarih:** 2026-09-20 | **Packet:** F2-R1-FINANCE | **Önceki:** EF-04B-INBOX (LOCAL_PASS)
**Amaç:** F2 yeniden doğrulama: finans özeti runtime bugfix + order/manuel-payment
suit kanıtı (canlı approval/reversal dahil).

## Kök neden (CODE_FAILURE, düzeltildi)

- `FinanceView`, `api<{ data: { currencies } }>` + `body.data?.currencies`
  kullanıyordu; `api()` tek seviyeyi açtığı için özet runtime'da hep boş düşerdi.
- Düzeltme: `api<{ currencies }>` + `body?.currencies` (route `{ data: { currencies } }` döner).

## Değişen dosyalar

- `docs/workflow/packets/F2-R1-FINANCE.json` (yeni)
- `src/components/mavenforms/views/finance-view.tsx` (2 satır)
- `tests/f2-finance-contract.test.mjs` (yeni, 16 assertion)
- `docs/workflow/receipts/F2-R1-FINANCE.md` (bu dosya)

## Çalıştırılan kontroller (bu oturum, cwd `D:\project\mavenform-v2`)

- `node scripts/workflow.mjs begin docs/workflow/packets/F2-R1-FINANCE.json` → READY, exit 0.
- `node tests/f2-finance-contract.test.mjs` → PASS, exit 0.
- `node tests/ux-finance-view.test.mjs` → PASS, exit 0.
- `node scripts/workflow.mjs verify docs/workflow/packets/F2-R1-FINANCE.json` →
  bu receipt yazıldıktan sonra koşuldu; sonuç
  `artifacts/workflow/F2-R1-FINANCE/verified.json` içindedir (verify içi 12 check:
  context-check + f2-finance-contract + ux-finance-view + finance-summary +
  finance-export + order-api + order-model + payment-model + payment-record +
  bun payment-approval (canlı four-eyes) + bun payment-reversal (canlı) + tsc).

Bu receipt verify öncesi donduruldu; verify sonrası düzenlenmedi.

## Sonuç / kanıt sınıfı

- Sonuç: verify çıktısına bağlı; resmi kayıt
  `artifacts/workflow/F2-R1-FINANCE/verified.json`.
- Canlı testler koşan dev server + seed DB kullanır (kullanıcı/sistem süreci;
  durdurulmadı, yeniden başlatılmadı); testler sentetik satırları temizler.
- Korunan davranış: salt-okunur özet niyeti, 403 rol ayrımı, durum görünümleri.
- R-10 NO-GO korunur (canlı ödeme/merchant zaten kapalı).

## Sıradaki packet

- F3-R1-INVOICE (fatura hattı yeniden doğrulama + belge kontrolü).
