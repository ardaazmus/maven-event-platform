---
applyTo: "src/**/*.{ts,tsx},tests/**/*.mjs,prisma/**/*,scripts/**/*.mjs"
---

Kanonik kaynak `docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/` klasörüdür. Packet seçmeden düzenleme yapma. Event/Person/Registration/Order/Payment/Invoice/Credential/Floor Plan domain sahipliğini bozma. Server boundary’de auth, scope, input, idempotency, public/private ve audit doğrula. Legacy root belgelerini yeni kural gibi kullanma; packet checks ve workflow verify çalıştır.
