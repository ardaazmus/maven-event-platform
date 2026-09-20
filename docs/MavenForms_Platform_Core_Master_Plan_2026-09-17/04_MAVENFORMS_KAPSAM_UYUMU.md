# MavenForms → Maven Event Platform Ana Planı

**Rapor tarihi:** 17 Eylül 2026  
**İncelenen ana kaynak:** `mavenform-main-son.zip`  
**Amaç:** MavenForms'u kayıt/form ürünü sınırından çıkarıp Maven Event Platform'un güvenli çekirdeğine dönüştürmek; Event Floor Plan Studio ile ortak kavram, veritabanı sahipliği ve API/event sözleşmesi kurmak; manuel finans süreçlerinden canlı ödeme ve e-belgeye, en son da Multi-Tenant yapıya ilerlemek.


## Ölçüm yöntemi

Her ihtiyaç dört seviyeden biriyle değerlendirilmiştir: **Yeniden kullan**, **Dönüştür**, **Yeni geliştir**, **Canlı kanıt bekliyor**. Bu bir pazarlama yüzdesi değil, iş paketleme karar aracıdır.

| Event Platform ihtiyacı | Mevcut karşılık | Seviye | Hedef |
|---|---|---|---|
| Organizasyon, kullanıcı, rol | Workspace/Member/RBAC | Dönüştür | Tek şirket modu; final fazda tenant provisioning. |
| Event katalog/occurrence | Yok | Yeni geliştir | Event, occurrence, timezone, status, owner. |
| Venue/hall/floor plan | Ayrı EFPS | Dönüştür | EFPS sahibi; core Event ID kullanır. |
| Kişi/kurum/contact | Submission values, EFPS Company/Attendee | Yeni geliştir | Canonical Person/OrganizationParty. |
| Form/builder | Güçlü | Yeniden kullan | FormDefinition + EventFormBinding. |
| Registration | Submission kısmi | Dönüştür | Registration aggregate, history, approval, group. |
| Ticket/entitlement | Yok | Yeni geliştir | TicketType, Entitlement, Ticket. |
| Pricing/promo/tax | Form pricing JSON kısmi | Dönüştür | PriceList, PriceRule, Discount, TaxSnapshot. |
| Order/order item | PaymentOrder ödeme odaklı | Yeni geliştir | Order, OrderItem, balance. |
| Manuel ödeme | Scalar status | Yeni geliştir | PaymentEntry + evidence + approval + allocation. |
| Online ödeme | Stripe/iyzico hazırlığı | Dönüştür + canlı kanıt | Hosted checkout, webhook, retrieve, refund. |
| Fatura kontrol | Güçlü belge akışı, dar ilişki | Dönüştür | Invoice aggregate, document chain, delivery. |
| e-Fatura/e-Arşiv | Paraşüt hazırlığı | Canlı kanıt bekliyor | Provider adapter, inbox, PDF/XML, legal reconciliation. |
| Badge | Güçlü üretim zinciri | Yeniden kullan | Ticket/participant snapshot'tan üret. |
| Check-in/attendance | Yok | Yeni geliştir | Event/session/door movement, offline sync. |
| Program/session/speaker | Yok | Yeni geliştir | Content module. |
| Abstract/review | Formla başlanabilir | Yeni geliştir | Submission/review/scheduling bounded context. |
| Sponsor/exhibitor/lead | EFPS Company kısmi | Yeni geliştir | Contract/package/booth/lead consent. |
| Communication | Email/outbox güçlü | Dönüştür | Event audience, consent, template, channel. |
| Survey/poll | Form motoru kullanılabilir | Dönüştür | Event/session survey binding + analytics. |
| Analytics/export | Form raporu kısmi | Dönüştür | Event metrics/read models; financial reconciliation. |
| CRM/integration API | Webhook türü kısmi | Dönüştür | Versioned API, inbox/outbox, external ID map. |
| Accommodation/travel | Yok | Yeni geliştir | İhtiyaç doğrulanırsa ayrı modül. |
| Mobile attendee app | Yok | Yeni geliştir | Sonraki ürün dalgası. |
| Multi-Tenant SaaS | Erken modeller/gates | Final faz | Tenant lifecycle, billing, custom domain, RLS. |

## MavenForms'un çekirdekte karşılayabileceği kesin kapsam

Doğru refactor sonrasında MavenForms şu çekirdekleri doğrudan taşıyabilir: kimlik ve yetki, form şeması ve yayınlama, kayıt intake, sipariş/ödeme/fatura workflow'ları, güvenli dosya, bildirim/outbox, badge üretimi, audit ve entegrasyon adaptörleri. Program, abstract, sponsor/exhibitor, floor plan, onsite attendance ve mobil deneyim ayrı modüllerdir; MavenForms bunların kimlik/olay/finans servislerini sağlar.

## Çekirdek olamayacağı durum

Eğer `Submission` kişi, kayıt, sipariş, bilet ve fatura yerine kullanılmaya devam ederse MavenForms yalnız bir form uygulaması olarak kalır. Dönüşümün başarı ölçütü yeni ekran sayısı değil, bu kavramların bağımsız kimlik ve yaşam döngüsüne sahip olmasıdır.
