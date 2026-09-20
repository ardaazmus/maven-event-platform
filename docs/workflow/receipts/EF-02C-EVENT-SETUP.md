# EF-02C-EVENT-SETUP — Receipt

**Tarih:** 2026-09-20 | **Packet:** EF-02C-EVENT-SETUP | **Önceki:** EF-02B-R1 (LOCAL_PASS)
**Amaç:** Event context bar + readiness merkezini runtime-doğru hale getirmek
(çift-çözüm bugfix) ve readiness/occurrence sözleşmesini kilitlemek.
Görünümde değişiklik yoktur.

## Kök neden (CODE_FAILURE, düzeltildi)

- `api<T>` tek zarf seviyesini açar (`src/lib/api-client.ts:100-106`,
  `return data.data as T`); route'lar `{ data: ... }` döner.
- `event-bar.tsx` ve `event-dashboard-view.tsx`, EF-02B öncesi pattern ile
  `api<{ data: ... }>` + `body.data` kullanıyordu → runtime'da `body.data`
  `undefined` düşer, bar listesi hep boş, dashboard hep `null` olurdu.
- Statik testler bu hatayı yakalayamıyordu (yalnız dize varlığı bakıyorlardı).

## Değişen dosyalar

- `docs/workflow/packets/EF-02C-EVENT-SETUP.json` (yeni)
- `src/components/mavenforms/event-bar.tsx` (2 satır: `api<EventOption[]>` + doğrudan dizi)
- `src/components/mavenforms/views/event-dashboard-view.tsx` (2 satır: `api<Readiness>` + doğrudan nesne)
- `tests/ef-event-setup-contract.test.mjs` (yeni, 20 assertion)
- `docs/workflow/receipts/EF-02C-EVENT-SETUP.md` (bu dosya)

## Çalıştırılan kontroller (bu oturum, cwd `D:\project\mavenform-v2`)

- `node scripts/workflow.mjs begin docs/workflow/packets/EF-02C-EVENT-SETUP.json` → READY, exit 0.
- `node tests/ef-event-setup-contract.test.mjs` → PASS, exit 0.
- `node tests/ux-shell-event-bar.test.mjs` → PASS, exit 0.
- `node tests/ux-event-dashboard.test.mjs` → PASS, exit 0.
- `node tests/event-readiness.test.mjs` → PASS, exit 0.
- `node tests/occurrence-list.test.mjs` → PASS, exit 0.
- `node scripts/workflow.mjs verify docs/workflow/packets/EF-02C-EVENT-SETUP.json` →
  bu receipt yazıldıktan sonra koşuldu; sonuç
  `artifacts/workflow/EF-02C-EVENT-SETUP/verified.json` içindedir
  (verify içi: context-check + 6 hedef test + `tsc --noEmit`).

Bu receipt verify öncesi donduruldu; verify sonrası düzenlenmedi.

## Sonuç / kanıt sınıfı

- Sonuç: verify çıktısına bağlı; resmi kayıt
  `artifacts/workflow/EF-02C-EVENT-SETUP/verified.json`.
- Korunan davranış: bar/dashboard görünüm ve akışı aynen; yalnız runtime veri akışı düzeltildi.
- Kapsam dışı (bilinen bulgu, dokunulmadı): `api<{ data: ... }>` + `body.data`
  pattern'i 13 başka view dosyasında daha var (abstract, badge-studio, checkin,
  finance, floor, network, program, registration-inbox, reports, sponsor, survey).
  Her biri ilgili domain packet'inde (FAZ-2..7) kendi testiyle düzeltilecek;
  toplu kör refactor yapılmadı.
- Canlı server testleri (`event-occurrence`, `event-detail`) koşan server + seed
  gerektirir → o kapsam UNVERIFIED. R-10 NO-GO korunur.

## Sıradaki packet

- EF-03-FORM-MODE (Genel Form / Etkinlik Kayıt Formu ayrımı + eski form uyumluluğu).
