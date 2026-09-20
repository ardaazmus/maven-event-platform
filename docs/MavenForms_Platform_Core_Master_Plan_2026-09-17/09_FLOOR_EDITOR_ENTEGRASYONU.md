# MavenForms → Maven Event Platform Ana Planı

**Rapor tarihi:** 17 Eylül 2026  
**İncelenen ana kaynak:** `mavenform-main-son.zip`  
**Amaç:** MavenForms'u kayıt/form ürünü sınırından çıkarıp Maven Event Platform'un güvenli çekirdeğine dönüştürmek; Event Floor Plan Studio ile ortak kavram, veritabanı sahipliği ve API/event sözleşmesi kurmak; manuel finans süreçlerinden canlı ödeme ve e-belgeye, en son da Multi-Tenant yapıya ilerlemek.


## Mevcut çakışma

Event Floor Plan Studio bugün kendi `Organization`, `User`, `Event`, `Company`, `Attendee`, `Venue`, `Hall`, `EventPlan`, `Stand`, seating hierarchy ve subscription modellerine sahiptir. Bu yapı bağımsız demo için anlaşılırdır; platform birleşiminde Event ve Attendee için ikinci gerçek kaynağa dönüşür.

## Hedef sahiplik

| Kavram | Otorite |
|---|---|
| Organization/User/Role | Maven Platform Core |
| Event/Occurrence/Person/Registration/Ticket | Maven Platform Core |
| Company master | Core Party/CRM; Floor modülü sınırlı projection |
| Venue/Hall | Floor modülü yönetebilir; Core event reference yayınlar |
| EventPlan/PlanVersion/Canvas/Geometry | Floor Editor |
| Stand/Seat/Table/Section inventory | Floor Editor |
| Order/Payment/Invoice | Commerce/Finance core |
| Assignment/booking kararı | Core order + Floor inventory sözleşmesi |
| Badge/credential/check-in | Onsite module; core participant ID |

## Entegrasyon API'si

| İşlem | Sözleşme |
|---|---|
| Plan bağlama | `POST /v1/events/{eventId}/floor-plan-bindings` |
| Yayınlı planı oku | `GET /v1/floor-plans/{planId}/published` |
| Uygun envanter | `GET /v1/events/{eventId}/inventory?type=seat|booth` |
| Süreli hold | `POST /v1/inventory-holds` + idempotency + TTL |
| Hold uzatma/expire | Açık policy; sınırlı retry |
| Booking doğrula | `POST /v1/inventory-bookings` orderId + holdToken |
| Release | `POST /v1/inventory-releases`; permission ve reason zorunlu |
| Katılımcı atama | `PUT /v1/seats/{seatId}/assignment` ticketId/version |
| Booth atama | `PUT /v1/spaces/{spaceId}/assignment` orderItemId/companyId |

## Domain event'leri

`EventCreated`, `EventUpdated`, `RegistrationConfirmed`, `TicketIssued`, `OrderPaid`, `FloorPlanPublished`, `InventoryHeld`, `HoldExpired`, `InventoryBooked`, `InventoryReleased`, `SeatAssigned`, `BoothAssigned`, `AssignmentRevoked`.

Floor Editor bu event'lerden local projection tutabilir; kişi e-posta/telefonunu kopyalamak yerine `personId`, `registrationId`, `ticketId` ve gerektiğinde isim/badge label snapshot'ı taşır.

## Satış ve envanter akışı

1. Kullanıcı koltuk/stand seçer; Floor module süreli hold üretir.
2. Commerce order ve item yaratır; hold token order'a bağlanır.
3. Manuel veya online payment confirmed olur.
4. Commerce `OrderPaid` yayınlar; orchestration idempotent booking çağırır.
5. Booking başarısızsa order otomatik “tamamlandı” sayılmaz; operasyon task ve refund/reassignment politikası çalışır.
6. İptalde finans ve inventory ayrı compensating actions kullanır.

Seats.io'nun resmî modeli hold token ile seçimi korur; booking held seat'i token sahibiyle doğrular; erken release'in double booking doğurabileceğini açıkça belirtir. Maven entegrasyonu aynı concurrency disiplinini taşımalıdır.

## EFPS göç adımları

1. EFPS `Event` ve `Attendee` tabloları için source-of-truth dondurulur.
2. Core ID mapping tablosu oluşturulur: `sourceSystem/sourceType/sourceId → coreType/coreId`.
3. Event kayıtları core'a aktarılır; çakışma raporu üretilir.
4. Attendee kayıtları person+registration'a dedup kurallarıyla taşınır; otomatik merge yapılmaz.
5. EFPS tabloları read projection'a çevrilir veya `coreEventId/coreParticipantId` taşır.
6. Yeni write yalnız core API üzerinden yapılır.
7. Plan/geometry verisi EFPS'de kalır; canvas JSON core DB'ye kopyalanmaz.

## Tekil çalışabilme

Floor Editor standalone modda local demo identity ve stub event catalog kullanabilir. Entegre modda core OIDC/session ve API kullanır. İki mod aynı build-time interface'i uygular; üretimde demo adapter'ı kapalıdır.
