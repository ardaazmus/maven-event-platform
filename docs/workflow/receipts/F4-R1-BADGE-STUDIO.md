# F4-R1-BADGE-STUDIO — Receipt

**Tarih:** 2026-09-20 | **Packet:** F4-R1-BADGE-STUDIO | **Önceki:** F3-R1-INVOICE (LOCAL_PASS)
**Amaç:** Stale test sözleşmesini düzeltip tam süiti yeşile döndürmek.
View kodunda değişiklik yok.

## Kök neden (TEST_FAILURE, test tarafı düzeltildi)

- `ux-badge-studio.test.mjs:23`, adım-1'de "yükleme yok" niyetiyle
  `!includes('<input')` yasaklıyordu. Sonraki meşru çalışmayla (üretim önizleme
  adım-3) eklenen `aria-label="Önizleme kayıt ID"` metin girdisi bu yasağa
  takıldı → tam süitteki tek FAIL (571 PASS + 1 FAIL).
- View'da `type="file"` yoktur; niyet "dosya yükleme yok"tur. Assertion
  dosya-yüklemeye daraltıldı, önizleme girdisi pozitif kilitlendi.

## Değişen dosyalar

- `docs/workflow/packets/F4-R1-BADGE-STUDIO.json` (yeni)
- `tests/ux-badge-studio.test.mjs` (1 assertion revizyonu + 1 pozitif kilit)
- `docs/workflow/receipts/F4-R1-BADGE-STUDIO.md` (bu dosya)

## Çalıştırılan kontroller (bu oturum, cwd `D:\project\mavenform-v2`)

- `node scripts/workflow.mjs begin docs/workflow/packets/F4-R1-BADGE-STUDIO.json` → READY, exit 0.
- `bun tests/ux-badge-studio.test.mjs` → PASS, exit 0.
- `bun tests/ux-badge-mapping.test.mjs` → PASS, exit 0.
- `bun tests/ux-badge-preview.test.mjs` → PASS, exit 0.
- `node scripts/workflow.mjs verify docs/workflow/packets/F4-R1-BADGE-STUDIO.json` →
  bu receipt yazıldıktan sonra koşuldu; sonuç
  `artifacts/workflow/F4-R1-BADGE-STUDIO/verified.json` içindedir.

Bu receipt verify öncesi donduruldu; verify sonrası düzenlenmedi.

## Sonuç / kanıt sınıfı

- Sonuç: verify çıktısına bağlı; resmi kayıt
  `artifacts/workflow/F4-R1-BADGE-STUDIO/verified.json`.
- Tam süit durumu: bu düzeltmeyle 572/572 hedeflenir (FAZ-9'da tam süit tekrar koşulacak).
- R-10 NO-GO korunur.

## Sıradaki packet

- F4-R2-CHECKIN (check-in runtime bugfix + onsite sözleşme kilidi).
