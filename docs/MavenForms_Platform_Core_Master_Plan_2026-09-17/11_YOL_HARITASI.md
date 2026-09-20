# MavenForms → Maven Event Platform Ana Planı

**Rapor tarihi:** 17 Eylül 2026  
**İncelenen ana kaynak:** `mavenform-main-son.zip`  
**Amaç:** MavenForms'u kayıt/form ürünü sınırından çıkarıp Maven Event Platform'un güvenli çekirdeğine dönüştürmek; Event Floor Plan Studio ile ortak kavram, veritabanı sahipliği ve API/event sözleşmesi kurmak; manuel finans süreçlerinden canlı ödeme ve e-belgeye, en son da Multi-Tenant yapıya ilerlemek.


## Faz planı

Süreler küçük bir ürün ekibine göre tahmindir; takvim taahhüdü değildir. Bir fazın çıkış kanıtı yoksa sonraki fazın production özelliği açılmaz.

| Faz | Yaklaşık süre | Teslim | Çıkış kapısı |
|---|---:|---|---|
| F0 — Gerçeklik ve paket bütünlüğü | 1-2 hf | Kanonik status, çalışan test runner, local-ready, CI, karar kayıtları | Context check + seçili gate'ler temiz |
| F1 — Tek şirket Event Core | 4-6 hf | Organization, Event, Occurrence, Person, Registration, FormBinding, Postgres | Kayıt formundan canonical registration oluşur |
| F2 — Sipariş ve manuel ödeme | 3-5 hf | Catalog/Price/Order/Item, Payment ledger, allocation, evidence, approval | Tam/kısmi/overpayment/reversal mutabakatı |
| F3 — Manuel fatura kontrolü | 3-5 hf | InvoiceRequest, Invoice, relation, document decision, controlled delivery | Muhasebe UAT ve export reconciliation |
| F4 — İç şirket pilotu ve onsite | 2-4 hf | Ticket, credential, badge binding, check-in temel akışı | Gerçek iç etkinlik dry-run, backup/restore |
| F5 — Floor Editor entegrasyonu | 4-6 hf | Event/participant ID birleşimi, plan binding, hold/book/release, assignment | Concurrency ve double-booking testleri |
| F6 — Canlı ödeme dalgası | 5-8 hf | Önce hosted iyzico; webhook/retrieve/refund; sonra banka sanal POS adapter'ı | Gerçek merchant staging/canary ve mutabakat |
| F7 — Otomatik fatura/e-belge | 5-8 hf | Paraşüt contact/product/invoice/job/PDF/XML/delivery; iptal/iade review | Mali müşavir + provider UAT + replay testleri |
| F8 — Event modülleri | Modül başına 3-12 hf | Program/speaker, abstract, sponsor/exhibitor, survey, analytics vb. | Her modül bağımsız capability gate |
| F9 — Multi-Tenant son kapı | 8-14 hf | Provisioning, RLS, tenant domain, BYO provider, tenant billing, support | Cross-tenant negatif test, restore, DPA/ops |

## F0 mikro teslimleri

- Eksik `scripts/local-ready.mjs` kararını çöz: geri getir veya packet'lerden kontrollü kaldır.
- `npm/bun test` için tek runner ve test sınıfları: unit, contract, DB integration, e2e, external evidence.
- `STATUS.md` çelişkisini makine-okunur release registry ile bitir.
- Current DB backup ve migration rehearsal kopyası oluştur.
- “live”, “ready”, “delivered”, “paid”, “issued” kelimeleri için kanıt sözlüğü yayınla.

## F1-F3 veri göç sırası

1. PostgreSQL hedef şema ve shadow migration.
2. Workspace→Organization map.
3. Event/Person/Registration tabloları; mevcut submission'lar değişmeden kalır.
4. EventFormBinding ile yeni kayıtlar dual-write değil transaction içi orchestration ile registration üretir.
5. Order/Payment/Allocation eklenir; eski PaymentOrder read adapter ile görüntülenir.
6. Invoice migration; eski unique bağlantı çözülür.
7. Eski scalar payment status yalnız read projection olur; write kapatılır.

## F6 ödeme sırası

1. Hosted/redirect iyzico ile kart verisini platform dışında tut.
2. Create intent idempotency ve server-calculated amount.
3. Signed webhook inbox; hızlı 2xx; async processing.
4. Retrieve ile basket/conversation/amount/currency eşleştir.
5. Full/partial refund ve transaction-level mapping.
6. Settlement/payout dosyası veya provider report ile günlük reconciliation.
7. Canary event ve tutar limitleri.
8. Banka sanal POS ancak aynı provider contract'ı karşılayan ayrı adapter olarak eklenir; provider özel durumlar core'a sızmaz.

## F8 modül önceliği

İç müşteri talebine göre seçilir. Varsayılan sıra: Program/Speaker → Abstract/Review → Sponsor/Exhibitor/Booth → Surveys/Certificates → Networking/Lead Retrieval → Accommodation/Travel → Attendee Mobile. Her modül önce event core, permission, API, event ve analytics sözleşmesini tanımlar.

## Multi-Tenant son kapı

Multi-Tenant geliştirmesi F9'a kadar product backlog'ta dondurulur. F9 öncesi yapılacak tek hazırlık organization scope, unique key'lerde organization, repository filtreleri ve tenant leakage testleridir. Bunlar güvenlik borcunu önler; SaaS UI/provisioning değildir.
