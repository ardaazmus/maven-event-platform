# MavenForms → Maven Event Platform Ana Planı

**Rapor tarihi:** 17 Eylül 2026  
**İncelenen ana kaynak:** `mavenform-main-son.zip`  
**Amaç:** MavenForms'u kayıt/form ürünü sınırından çıkarıp Maven Event Platform'un güvenli çekirdeğine dönüştürmek; Event Floor Plan Studio ile ortak kavram, veritabanı sahipliği ve API/event sözleşmesi kurmak; manuel finans süreçlerinden canlı ödeme ve e-belgeye, en son da Multi-Tenant yapıya ilerlemek.


## Sektörde ortak ürün omurgası

Cvent, EventsAir, Swoogo, Swapcard ve Eventleaf'in resmî ürün yüzeyleri birlikte okunduğunda kapsam beş yaşam döngüsünde toplanır:

| Yaşam döngüsü | Sektör modülleri |
|---|---|
| Planlama | Etkinlik portföyü, bütçe, görev, venue/hall, tedarikçi, floor plan, envanter |
| Satış ve kayıt | Event site, kayıt, bilet/fiyat, promosyon, grup kaydı, waitlist, ödeme, fatura |
| İçerik | Program, session/track, speaker, abstract/CFP, hakemlik, doküman/proceedings |
| Saha | Check-in, badge, koltuk/masa/stant, erişim kontrolü, session attendance, kiosk/offline |
| Etkileşim ve gelir | Mobil uygulama, bildirim, networking, matchmaking, sponsor/exhibitor, lead retrieval, survey, analytics/CRM |

EventsAir; kayıt, bütçe, lojistik, speaker, abstract, sponsor/exhibitor, konaklama, check-in/badge, networking, analytics ve ödeme işlemesini aynı ürün ailesinde listeler. Swoogo; kayıt, event hub, lojistik, mobil uygulama, session/speaker, REST API, webhook ve çok sayıda ödeme gateway'ini birlikte sunar. Swapcard'ın odağı sponsor/exhibitor çalışma alanı, lead capture, networking ve ROI'dir. Bu dağılım, “Event Management”ın yalnız form+bilet olmadığını gösterir.

## Sektör doğruları ve platforma etkisi

1. **Başvuru, kişi ve kayıt farklıdır.** Bir kişi birden çok etkinliğe kayıt olabilir; aynı etkinlikte kayıt revize olabilir; bir grup siparişi birden çok katılımcı yaratabilir.
2. **Sipariş ödeme ile aynı şey değildir.** Sipariş borcu; ödeme tahsilatı; allocation ise ödemenin hangi borçlara dağıldığıdır. Cvent'in offline ödeme akışı ödeme detayını girip gerekirse dağıtmayı ayrı adımlar olarak ele alır.
3. **Offline ödeme bir istisna alanı değil, finans hareketidir.** Cvent çek, satın alma emri ve offline payment seçeneklerini; offline ödeme kaydı ve toplu importu; partial payment'ı ayrı yetenekler olarak sunar. Manuel kayıt mutabakat, düzeltme ve audit gerektirir.
4. **Fatura ile ödeme bağı gevşektir.** Fatura ödeme öncesi düzenlenebilir, kısmi tahsil edilebilir, iptal/itiraz/iade/credit note ilişkileri taşıyabilir. Tek PaymentOrder'a tek Invoice kısıtı gerçek yaşam döngüsünü karşılamaz.
5. **Badge check-in değildir.** Badge bir çıktı/tanıtıcıdır; check-in ise zaman, kapı, cihaz, operatör, event/session ve tekrar politikasına sahip attendance hareketidir.
6. **Floor plan satışla eşzamanlı envanter yönetir.** Seats.io örneğinde hold token, booking ve release farklı işlemlerdir. Erken release double-booking riski taşır. Maven'da `AVAILABLE/HELD/RESERVED/BOOKED/BLOCKED` ve süreli hold gerekir.
7. **API ve webhook ürün özelliğidir.** Swoogo 140+ REST endpoint ile event, registrant, session, speaker ve sponsor yönetimini; webhook ile kayıt ve check-in değişikliklerini entegrasyon yüzeyi sayar.
8. **Dağıtık akış en az bir kez teslim varsayar.** Webhook tekrar gelebilir ve sırası garanti edilmeyebilir. İdempotency, inbox/outbox, retrieve/reconciliation ve durum geçiş kontrolü zorunludur.
9. **Kart verisi platforma girmemelidir.** Hosted/redirect ödeme sayfası kapsamı azaltır; PCI SSC yine e-ticaret sayfasının script saldırılarına karşı korunmasını ister.
10. **Kişisel veri amacı event bağlamında tutulmalıdır.** Kayıt, badge, networking, pazarlama ve sponsor lead paylaşımı aynı amaç değildir; aydınlatma/tercih/saklama politikası ayrı tutulur.

## Rakiplerden alınacak ürün dersi

| Ürün | Güçlü sinyal | Maven kararı |
|---|---|---|
| Cvent | Registration + offline/partial payment + diagramming entegrasyonu | Sipariş/ödeme/floor envanteri aynı event kimliğine bağlanmalı. |
| EventsAir | Planlama, içerik, lojistik, konaklama, onsite tek ekosistem | Ana platform modül kataloğu geniş tutulmalı, teslim sırası dar tutulmalı. |
| Swoogo | Özelleştirilebilir kayıt + açık API/webhook + çok gateway | MavenForms form motoru korunur; public API ürünün erken parçası olur. |
| Swapcard | Exhibitor center, lead capture, networking ve ROI | Sponsor/exhibitor ayrı bounded context olmalı. |
| Eventleaf | Badge/check-in, booth sale, abstract, engagement | Badge mevcut gücünün yanına attendance ve booth inventory eklenmeli. |
| Seats.io | Hold/book/release ve orderId | Floor Editor bağlantısı süreli rezervasyon ve idempotent booking kullanmalı. |

Kaynakların tam listesi `15_KAYNAKLAR_VE_SINIRLAR.md` içindedir.
