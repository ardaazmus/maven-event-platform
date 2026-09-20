# MavenForms → Maven Event Platform Ana Planı

**Rapor tarihi:** 17 Eylül 2026  
**İncelenen ana kaynak:** `mavenform-main-son.zip`  
**Amaç:** MavenForms'u kayıt/form ürünü sınırından çıkarıp Maven Event Platform'un güvenli çekirdeğine dönüştürmek; Event Floor Plan Studio ile ortak kavram, veritabanı sahipliği ve API/event sözleşmesi kurmak; manuel finans süreçlerinden canlı ödeme ve e-belgeye, en son da Multi-Tenant yapıya ilerlemek.


## En önemli riskler

| Risk | Olasılık/Etki | Erken sinyal | Karşılık |
|---|---|---|---|
| Form-centric model geri gelir | Yüksek/Yüksek | Yeni özellikler Submission alanı olur | Domain review gate |
| Finans toplamı tutmaz | Orta/Kritik | UI ve export farklı bakiye | Immutable ledger + allocation invariant |
| Double booking | Orta/Kritik | Aynı seat/stand iki order'da | TTL hold, version, DB uniqueness, idempotency |
| Provider callback yanlış success üretir | Orta/Kritik | Callback sonrası amount mismatch | Signed inbox + retrieve |
| E-belge yanlış kişi/tutara gider | Orta/Kritik | Otomatik fuzzy match | Explicit approval, hash, two-person review |
| Workspace/tenant veri sızıntısı | Orta/Kritik | ID ile başka kaynağa erişim | Scope repository + BOLA tests; final RLS |
| Test sayısı kalite yanılsaması yaratır | Yüksek/Yüksek | Runner/CI çalışmıyor | Kanonik test harness + evidence classes |
| Repo belgeleri gerçeklikle ayrışır | Yüksek/Orta | PASS ve WIP aynı anda | Machine-readable registry |
| SQLite→Postgres göçü gecikir | Orta/Yüksek | Finans pilotu SQLite'da büyür | F1'de shadow migration |
| Modüller bağımsız çalışamaz | Orta/Yüksek | Cross-table import/write | Owned schema + contract tests |
| Multi-Tenant erken açılır | Orta/Yüksek | Tenant UI/backlog öne gelir | F9 gate ve feature freeze |
| KVKK amaçları karışır | Orta/Yüksek | Kayıt e-postası marketing'e dönüşür | Consent purpose ve retention matrix |

## Kanonik kararlar

| ID | Karar |
|---|---|
| D-01 | MavenForms kod tabanı çekirdek temelidir; Form platform root aggregate değildir. |
| D-02 | Tek şirket iç pilot önce gelir. |
| D-03 | PostgreSQL + modüler monolit ilk deployment'tır. |
| D-04 | Event/Person/Registration core otoritesidir. |
| D-05 | Floor Editor geometry/inventory otoritesidir. |
| D-06 | Order, Payment, Allocation ve Invoice ayrıdır. |
| D-07 | Manuel ödeme ve manuel fatura kontrolü canlı ödemeden önce gelir. |
| D-08 | Hosted iyzico ilk kart ödeme yoludur; banka vPOS adapter olarak sonra gelir. |
| D-09 | Paraşüt otomasyonu manuel fallback'i kaldırmaz. |
| D-10 | Multi-Tenant ürün fazı en sondur; isolation hygiene baştan sürer. |
