# EF-02B-R1 — Receipt

**Tarih:** 2026-09-20 | **Packet:** EF-02B-R1 | **Önceki:** EF-02A-EVENT-API (LOCAL_PASS, 2/2 FRESH)
**Amaç:** Stale-baseline gate nedeniyle verify edilemeyen EF-02B davranışını taze baseline ile kilitlemek ve `ux-event-list` POST yasağı çelişkisini Event-first sözleşmeye çözmek. View kodunda davranış değişikliği yoktur.

## Neden revizyon packet'i

- `EF-02B-EVENT-UI` check'leri bu oturumda gerçekten PASS verdi (`tsc` exit 0,
  `ef-event-create-ui` PASS, `context-check` PASS) ancak workflow verify
  `BLOCKED: out-of-scope change: yeni-plan.md` verdi (baseline sonrası kullanıcı
  dosyası drift'i; detay `docs/workflow/receipts/EF-02B-EVENT-UI.md` final bölümü).
- Kullanıcı dosyasına dokunmak yasak; gate aracını değiştirmek yasak; `verified.json`
  elle yazmak sahte kanıt olur. Emsal `UX-ABSTRACT-05-R1` ("orijinal baseline
  scope-dışı kaldı") aynen uygulandı: taze baseline'lı revizyon packet'i.
- `EF-02B-EVENT-UI` için `verified.json` mint edilmedi; bu packet onun yerine
  geçmez, davranışı + çözümü taze kanıtla kilitler.

## Değişen dosyalar

- `docs/workflow/packets/EF-02B-R1.json` (yeni)
- `tests/ux-event-list.test.mjs` (yalnız sözleşme satırı: POST yasağı → Event-first zorunluluğu)
- `docs/workflow/receipts/EF-02B-R1.md` (bu dosya)

## Yapılan iş

- `tests/ux-event-list.test.mjs:27-29` revize edildi: eski
  `!includes('POST') && !includes('method:')` yasağı kaldırıldı; yerine
  `method: 'POST'` + `'/api/events'` + `Yeni Etkinlik` pozitif sözleşmesi yazıldı.
  GET listesi, seçim akışı, loading/empty/error ve aria-label assertion'ları aynen durur.
- `src/components/mavenforms/views/event-list-view.tsx` dosyasına dokunulmadı
  (EF-02B hali + `tsc` temizliği korunur).
- `src/components/mavenforms/event-bar.tsx:18-20` çift-çözüm notu bu packet kapsamı
  dışındadır; dokunulmadı, takip iş olarak durur.

## Çalıştırılan kontroller (bu oturum, cwd `D:\project\mavenform-v2`)

- `node scripts/workflow.mjs begin docs/workflow/packets/EF-02B-R1.json` → READY, exit 0
  (previous EF-02A LOCAL_PASS + freshness kontrolü geçti).
- `node tests/ux-event-list.test.mjs` → PASS, exit 0.
- `node tests/ef-event-create-ui.test.mjs` → PASS, exit 0.
- `node tests/ux-event-dashboard.test.mjs` → PASS, exit 0.
- `node scripts/workflow.mjs verify docs/workflow/packets/EF-02B-R1.json` → bu receipt
  yazıldıktan sonra koşuldu; sonuç `artifacts/workflow/EF-02B-R1/verified.json` içindedir
  (verify içi: context-check + 3 hedef test + `tsc --noEmit`).

Bu receipt verify öncesi donduruldu; verify sonrası düzenlenmedi.

## Sonuç / kanıt sınıfı

- Sonuç: verify çıktısına bağlı; resmi kayıt `artifacts/workflow/EF-02B-R1/verified.json`
  (`LOCAL_PASS` ise kanıt sınıfı yerel check + source incelemesidir).
- Korunan davranış: liste/seçim/dashboard akışı aynen; test sayısı aynı dosyada +1 assertion.
- R-10 NO-GO aynen korunur; canlı render doğrulaması yok (UX-RENDER-01 notu geçerli).

## Sıradaki packet

- EF-02C-EVENT-SETUP (setup sırası + occurrence/venue-hall + readiness merkezi UI),
  `previous: [EF-02B-R1]`.
