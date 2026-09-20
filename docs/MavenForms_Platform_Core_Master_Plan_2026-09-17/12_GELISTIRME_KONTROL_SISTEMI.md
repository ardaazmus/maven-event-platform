# MavenForms → Maven Event Platform Ana Planı

**Rapor tarihi:** 17 Eylül 2026  
**İncelenen ana kaynak:** `mavenform-main-son.zip`  
**Amaç:** MavenForms'u kayıt/form ürünü sınırından çıkarıp Maven Event Platform'un güvenli çekirdeğine dönüştürmek; Event Floor Plan Studio ile ortak kavram, veritabanı sahipliği ve API/event sözleşmesi kurmak; manuel finans süreçlerinden canlı ödeme ve e-belgeye, en son da Multi-Tenant yapıya ilerlemek.


## Vibe coding ve halüsinasyon kontrolü

Yeni özellik istemi doğrudan koda dönüşmemelidir. Her iş aşağıdaki küçük kanıt paketinden geçer:

1. **Problem ve kullanıcı:** Kim, hangi event akışında, hangi kararı veriyor?
2. **Domain sahibi:** Kavram hangi modüle ait? Aynı kavram başka tabloda var mı?
3. **Invariant:** Hangi durum asla oluşmamalı?
4. **Sözleşme:** API request/response, event schema, idempotency ve permission.
5. **Veri etkisi:** Migration, backfill, rollback, retention ve PII.
6. **Kabul örnekleri:** En az bir success, duplicate/retry, unauthorized ve failure/recovery.
7. **Kanıt türü:** Local test mi, staging mi, canlı provider mı, muhasebe/hukuk onayı mı?

## Çalışma birimi

Mevcut repo'nun 15 dakikalık READY packet yaklaşımı korunabilir; fakat packet ürün fazı değildir. Her packet tek invariant veya tek sözleşme değiştirir. `allowedFiles`, `reads`, bağımlılık, migration etkisi, test komutu ve beklenen kanıt içerir. Yapay zekâ yalnız READY packet üzerinde çalışır; yeni ihtiyaç görürse kod yerine issue/ADR açar.

## Definition of Done

- Domain terimi sözlükte tek anlam taşır.
- Server validation ve authorization vardır.
- Organization scope negatifi test edilmiştir.
- Idempotency duplicate ve payload conflict'i ayırır.
- Mutation + outbox aynı transaction'dadır.
- Migration forward ve rollback/restore provası vardır.
- UI gerçek provider durumunu taklit eden optimistic “başarılı” metin yazmaz.
- Audit hassas veriyi/log secret'ı sızdırmaz.
- Runbook ve ölçüm/alert tanımlıdır.
- Production iddiası yalnız ilgili evidence registry kaydıyla yapılır.

## Yasaklı kısayollar

- `Submission`a yeni bir string alan ekleyip ayrı domain'i taklit etmek.
- UI butonu ekleyip provider/mutation yokken tamamlandı saymak.
- Başka modül tablosuna route içinden doğrudan write yapmak.
- Payment/fatura kaydını edit ederek geçmişi silmek.
- Webhook'u tek gerçek kaynak kabul etmek.
- Test fixture sonucunu canlı provider kanıtı olarak sunmak.
- Multi-Tenant UI açıp izolasyon ve restore kanıtını sonraya bırakmak.

## Karar yönetimi

Her büyük karar ADR alır: canonical IDs, PostgreSQL, form-registration sınırı, order/payment model, invoice lifecycle, Floor ownership, payment provider contract ve Multi-Tenant gate. ADR değişebilir; değişiklik nedeni ve migration etkisi kaybolmaz.
