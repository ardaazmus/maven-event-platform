# Maven Event Platform

**Maven Event Management** ürün ailesinin ana deposu: etkinlikleri uçtan uca yöneten platform.

## Ürün ailesi

- **Maven Event Platform** — ana etkinlik yönetim uygulaması (bu depo)
- **Maven Event Management** — organizasyon/etkinlik operasyon katmanı
- **Maven Forms & Intake** — kayıt ve intake formları modülü (işlevsel olarak korunur)
- **Maven Event Floor** — salon/kat planı modülü
- **Maven Event Mobile** — mobil deneyim

## Kanonik akış

`Organization → Event → Occurrence/Venue → FormBinding → Person/Registration → Ticket/Order/Payment/Invoice → Credential/Badge → Check-in → Floor Plan → Reports → F8 modules → F9 SaaS gate`

Arayüz Event-first çalışır: etkinlik seçilmeden etkinliğe ait kayıt, rozet, yoklama veya salon değişikliği başlatılmaz.

## Teknoloji

Next.js App Router + React + TypeScript + Bun + Prisma (SQLite geliştirme, Hostinger VPS üretim).

## Hızlı başlangıç

```bash
bun install
bunx prisma generate
bun run dev
```

Ortam değişkenleri `.env` dosyasından okunur ve `.env*` dosyaları repoya girmez.

## Komutlar

| Komut | Açıklama |
|---|---|
| `bun run dev` | Geliştirme sunucusu (3000) |
| `bun run build` | Production derlemesi |
| `bun run lint` | ESLint |
| `bun run test` | Birim/entegrasyon testleri (`scripts/run-tests.mjs`) |
| `bun run context:check` | Context/bütünlük kontrolü |
| `node scripts/workflow.mjs begin <packet>` | Packet başlangıcı (baseline) |
| `node scripts/workflow.mjs verify <packet>` | Packet doğrulaması |

Typecheck için `bunx tsc --noEmit` kullanılır (ayrı script tanımlı değildir).

## Belgeler

- `AGENTS.md` — çalışma kuralları
- `PROJECT_CONTEXT.md` — kanonik proje bağlamı
- `STATUS.md` — güncel çalışma durumu
- `docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/` — tek normatif ürün/domain/faz kaynağı
- `docs/workflow/README.md` ve `docs/workflow/packets/` — 15 dakikalık READY packet sistemi
- `docs/legacy/root-docs/` — tarihsel referans (yeni işi tanımlamaz)

## Güvenlik notları

- Secret, token, parola, private key, PAN/CVV, PII ve gerçek `.env` değerleri koda, teste, loga veya belgeye yazılmaz.
- `node_modules`, `.next`, `dist`, `build`, `coverage`, yerel veritabanı (`db/*.db`), medya deposu ve geçici loglar repoya girmez.
- Ödeme/fatura/belge geçmişi düzenlenerek silinmez; düzeltme/reversal/audit zinciri kullanılır.

## Sürüm durumu

`LOCAL_PASS` production onayı değildir. R-10 dış kanıt kapısı fail-closed kalır; gerçek provider, staging, backup/restore ve hukuk/muhasebe kanıtları olmadan production açılmaz.
