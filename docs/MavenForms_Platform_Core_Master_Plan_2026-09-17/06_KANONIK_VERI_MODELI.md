# MavenForms → Maven Event Platform Ana Planı

**Rapor tarihi:** 17 Eylül 2026  
**İncelenen ana kaynak:** `mavenform-main-son.zip`  
**Amaç:** MavenForms'u kayıt/form ürünü sınırından çıkarıp Maven Event Platform'un güvenli çekirdeğine dönüştürmek; Event Floor Plan Studio ile ortak kavram, veritabanı sahipliği ve API/event sözleşmesi kurmak; manuel finans süreçlerinden canlı ödeme ve e-belgeye, en son da Multi-Tenant yapıya ilerlemek.


## Çekirdek model

| Entity | Sorumluluk | Ana ilişki |
|---|---|---|
| Organization | Veri ve politika kapsamı | Users, Events, provider connections |
| Event | Ürün/operasyon üst kimliği | Occurrences, forms, price lists, plans |
| EventOccurrence | Tarih, saat, timezone, venue/hall | sessions, inventory, check-in |
| Person | Tek gerçek kişi kaydı | registrations, contacts, credentials |
| Registration | Kişinin event'e katılım başvurusu | form snapshot, answers, status history |
| TicketType | Satılabilir/atanabilir katılım hakkı tipi | price, capacity, entitlements |
| Ticket | Verilmiş katılım hakkı | registration/order item/check-in |
| Order | Alacak/borç ve müşteri bağlamı | items, payments, invoices |
| OrderItem | Fiyat/tax/discount snapshot | ticket, booth, sponsorship, service |
| Payment | Manuel veya provider tahsilat/çıkış hareketi | attempts, evidence, refunds |
| PaymentAllocation | Ödemenin sipariş/faturaya dağılımı | amount and reversal chain |
| Invoice | Mali belge iş akışı | lines, relations, documents, delivery |
| InvoiceRelation | İptal/iade/credit/debit/replacement bağı | source and target invoice |
| InventoryItem | Seat, booth, table, capacity bucket | hold/reservation/booking |
| InventoryHold | Süreli ve tokenlı ayırma | order/session |
| Credential | QR/badge kimliği | ticket/person/event |
| CheckInEvent | Giriş/çıkış/attendance hareketi | credential, gate, device, occurrence |

## Mevcut modelden hedefe geçiş

| Mevcut | Hedef | Göç kararı |
|---|---|---|
| Workspace | Organization | İlk aşamada 1:1 map; ID korunabilir. |
| Form | FormDefinition | EventFormBinding ile event/purpose eklenir. |
| Submission | Submission + Registration | Ham cevap korunur; başarılı dönüşüm registration üretir. |
| Submission.paymentStatus | Kaldırılacak projection | Payment/Allocation bakiyesinden hesaplanır. |
| PaymentOrder | Order + PaymentAttempt | Eski kayıtlar migration source olarak tutulur. |
| InvoiceRecord | Invoice | PaymentOrder unique bağı çözülür. |
| InvoiceLineSnapshot | InvoiceLine | Snapshot yaklaşımı korunur. |
| InvoiceDocument/Decision/Delivery | Aynı bounded context | Büyük ölçüde yeniden kullanılır. |
| OutboxEvent | IntegrationOutbox + MessageDelivery | Form/submission zorunluluğu kaldırılır. |
| EFPS Event | Core Event reference | EFPS'de authoritative kopya kaldırılır veya read projection olur. |
| EFPS Attendee | Participant projection | `registrationId/personId/ticketId` referansı; sınırlı display snapshot. |

## Durum makineleri

**Registration:** `draft → submitted → pending_review → confirmed | rejected | waitlisted → cancelled`. Finans durumu registration statüsüne gömülmez.

**Order:** `draft → open → partially_paid → paid → fulfilled`; ayrıca `cancelled`, `refunding`, `refunded`. Bakiye hesaplanmış projection'dır.

**Payment:** `recorded/pending → under_review → confirmed → allocated`; hata/düzeltme için `rejected`, `reversed`, `partially_refunded`, `refunded`, `disputed`. Manuel ödeme provider authorization durumlarını taklit etmez.

**Invoice:** `requested → data_review → approved_for_issue → issued → delivered`; ayrıca `rejected`, `delivery_failed`, `cancel_requested`, `cancelled`, `credited`, `replaced`. “PDF yüklendi” ile “yasal belge düzenlendi” aynı durum değildir.

**Inventory:** `available → held → reserved/booked`; `blocked` ve `released`. Hold TTL dolunca otomatik release; paid order sonrası idempotent booking.

## Finansal invariantlar

- Para birimi tutarları minor unit ve ISO currency ile tutulur.
- Order total; item snapshots toplamıdır, sonradan fiyat kataloğundan tekrar hesaplanmaz.
- Allocation toplamı payment net tutarını aşamaz.
- Confirmed/reversed hareketler güncellenmez; düzeltme karşı hareketle yapılır.
- Refund, özgün payment/transaction ve order item bağı taşır.
- Invoice ve payment mutabakatı ayrı projection'dır; biri diğerinin varlığını otomatik kanıtlamaz.
- Tüm mutation'larda organization scope ve optimistic concurrency vardır.
