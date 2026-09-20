# Kalan İşler Yol Haritası (2026-09-17 denetimi sonrası)

Önceki: F0–F9 iskeleti LOCAL_PASS; R1–R5 kapandı (F9-04 ile doğrulandı). Kalanlar 15'er dakikalık packet'lerle, sırayla.

## Durum (F9-04)

- KAPANDI: R1 (F1-20), R2 (F1-21), R3 (F1-22), R4 (F1-23), R5 (F1-25/26/27 + pg-shadow-report).
- AÇIK: R6/R7 dış bağımlılık (merchant/muhasebe erişimi bekleniyor) + veri-satırı taşıma (ayrı packet ister).
Her madde ayrı packet olur; packet açılmadan kod/test değişmez.

## R1 — Kişi PII yetki kapatması (kritik, F1)

- `GET /api/persons` ayrı `persons.read` capability (veya en az `form_manager` üstü) ister; viewer liste kapatılır.
- Test: viewer 403, owner 200, anon 401 (canlı negatif dahil).
- Kabul: rol-matrisi niyeti + least-privilege karşılanır.

## R2 — Explicit organization context (kritik, F1)

- `getSessionFromCookie` sessiz `findFirst` kaldırılır; session + explicit `workspaceId` claim zorunlu.
- Test: çift üyelikte claimsiz istek 401/404, wrong-org 404.
- Kabul: F1-03 acceptance'ı gerçekten karşılanır; ADR-0003 kodla eşleşir.

## R3 — Orchestration binding belirsizliği (F1)

- Forma 2. binding’de ya hata (409) ya açık `eventId` parametresi; `findFirst` sessiz seçim kalkar.
- Test: çoklu-binding 409 / explicit seçim 201.
- Kabul: `registration-orchestration` genişletilmiş hali yeşil.

## R4 — Sidebar a11y test onarımı (kalite)

- Test davranışa çevrilir (state-bazlı `aria-label`/`title` varlığı); biçim regex'i kaldırılır.
- Kabul: tam süpürme 512/512.

## R5 — PostgreSQL shadow rehearsal (F1)

- F1-02 ADR'si gerçeğe dönüştürülür: hedef şema → boş Postgres → sayım/hash karşılaştırma → restore provası.
- Kabul: rapor + `EXTERNAL_DEPENDENCY` değil, ortam kanıtı (ayrı packet, ayrı ortam).

## R6 — Canlı kapılar (F6/F7, dış bağımlılık)

- Merchant staging, webhook retrieve/mutabakat, refund/settlement, POS UAT, Paraşüt sandbox, mali müşavir kabulü.
- Her biri sağlayıcı/hesap erişimiyle ayrı packet; o zamana kadar manuel fallback korunur.

## R7 — F8 modülleri ve F9 RLS

- İç müşteri talebiyle sıradan: Abstract → Sponsor → Survey → diğerleri; her modül capability gate'li.
- RLS Postgres kapısında; SQLite'da workspace-scope negatifleri kilitli kalır.

Sıra: R1 → R2 → R3 → R4 → R5 → R6 → R7. R1/R2 bitmeden F1 kapatılmaz.
