# MavenForms → Maven Event Platform Ana Planı

**Rapor tarihi:** 17 Eylül 2026  
**İncelenen ana kaynak:** `mavenform-main-son.zip`  
**Amaç:** MavenForms'u kayıt/form ürünü sınırından çıkarıp Maven Event Platform'un güvenli çekirdeğine dönüştürmek; Event Floor Plan Studio ile ortak kavram, veritabanı sahipliği ve API/event sözleşmesi kurmak; manuel finans süreçlerinden canlı ödeme ve e-belgeye, en son da Multi-Tenant yapıya ilerlemek.


## Faz kabul matrisi

| Faz | Zorunlu kabul kanıtları |
|---|---|
| F0 | Context/bootstrap çalışır; tek runner; CI; status çelişkisi yok; secret scan. |
| F1 | Event→form binding; duplicate person review; registration history; Postgres restore. |
| F2 | Full/partial/overpayment; split allocation; duplicate reference; reversal; audit; export equality. |
| F3 | Recipient/line validation; document quarantine; mismatch rejection; resend idempotency; invoice relation. |
| F4 | Ticket/badge mapping; duplicate scan policy; offline check-in conflict; device/operator audit. |
| F5 | Hold expiry; concurrent hold; idempotent book; early release protection; paid-booking failure recovery. |
| F6 | Provider signature; delayed/out-of-order/duplicate webhook; retrieve mismatch; partial refund; settlement reconciliation. |
| F7 | Contact/product ambiguity; provider retry; invoice job polling; PDF/XML hash; cancel/credit review. |
| F8 | Her modül için permissions, API, event, migration, analytics ve independent-run contract. |
| F9 | Cross-tenant BOLA, RLS default deny, owner bypass test, custom domain routing, tenant restore/delete/export. |

## Finans test veri seti

En az şu senaryolar fixture değil DB integration seviyesinde çalışır: TRY tam ödeme; TRY iki kısmi ödeme; tek ödeme iki order'a allocation; overpayment; duplicate reference; yanlış currency; onaysız yüksek tutar; reversed payment; partial refund; full refund; chargeback; payment sonrası fatura; ödeme öncesi fatura; credit note; belge mismatch; resend; provider timeout; event replay.

## Floor/onsite concurrency

- Aynı seat'e eşzamanlı iki hold: tek kazanan.
- Süresi dolmuş token ile booking: reddedilir.
- Aynı orderId ile retry: aynı sonuç.
- Paid order booking conflict: manual recovery task ve alarm.
- Plan version değişirken assignment: version conflict.
- Offline cihaz aynı credential'ı iki kez okur: policy'ye göre duplicate/exit/re-entry.

## Güvenlik

OWASP API Security 2023'e göre object-level, property-level ve function-level authorization her ID kullanan fonksiyonda değerlendirilir. Public formlar rate/resource limit, anti-automation ve idempotency conflict testlerine; internal worker'lar authentication, replay ve least privilege testlerine girer.
