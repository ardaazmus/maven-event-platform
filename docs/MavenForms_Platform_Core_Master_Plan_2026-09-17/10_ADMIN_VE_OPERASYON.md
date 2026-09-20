# MavenForms → Maven Event Platform Ana Planı

**Rapor tarihi:** 17 Eylül 2026  
**İncelenen ana kaynak:** `mavenform-main-son.zip`  
**Amaç:** MavenForms'u kayıt/form ürünü sınırından çıkarıp Maven Event Platform'un güvenli çekirdeğine dönüştürmek; Event Floor Plan Studio ile ortak kavram, veritabanı sahipliği ve API/event sözleşmesi kurmak; manuel finans süreçlerinden canlı ödeme ve e-belgeye, en son da Multi-Tenant yapıya ilerlemek.


## Admin bilgi mimarisi

| Ana alan | Alt ekranlar |
|---|---|
| Etkinlikler | Genel bilgi, tarihler, ekip, venue/hall, modül durumu |
| Kayıt | Formlar, kayıtlar, onay/waitlist, grup kayıtları, duplicate kişiler |
| Ürün ve fiyat | Ticket, paket, stand/sponsor, fiyat, indirim, vergi snapshot |
| Siparişler | Order, item, müşteri, bakiye, cancellation |
| Finans | Açık bakiye, manuel ödeme, allocation, mutabakat, refund |
| Faturalar | Talep, veri kontrolü, belge, gönderim, iptal/iade inceleme |
| Floor plan | Plan, yayın, inventory, holds, assignments |
| Onsite | Badge, credential, check-in, cihaz, offline sync |
| Program | Session, track, room, speaker, abstract |
| İletişim | Template, audience, consent, queue, delivery |
| Raporlar | Kayıt funnel, gelir, tahsilat, attendance, sponsor ROI |
| Ayarlar | Kullanıcı/rol, entegrasyon, güvenlik, audit, saklama |

## Rol matrisi

| Rol | Ana yetki |
|---|---|
| Platform Admin | Teknik operasyon; finans içeriğini varsayılan olarak görmez. |
| Event Owner | Event yapılandırması ve ekip atama. |
| Registration Manager | Form, kayıt, onay ve katılımcı işlemleri. |
| Finance Recorder | Manuel ödeme kaydı ve belge yükleme. |
| Finance Approver | Ödeme/fatura onayı ve reversal. |
| Floor Planner | Plan/geometry/inventory; finans erişimi yok. |
| Onsite Operator | Check-in ve badge; sınırlı PII. |
| Analyst | Maskeli read-only rapor. |
| Support | Süreli, ticket'lı, read-only break-glass. Multi-Tenant fazında. |

## Operasyonel gerçeklik ekranları

Her async iş için `queued/processing/retry/dead` görünümü, correlation id, son hata, sonraki deneme ve güvenli replay butonu bulunmalıdır. Dashboard “gönderildi” ile “provider kabul etti/delivered” ayrımını; “ödeme callback geldi” ile “retrieve ile doğrulandı” ayrımını göstermelidir.

## Hata çözme runbook'ları

- Banka referansı duplicate.
- Payment confirmed, booking failed.
- Booking succeeded, ödeme sonradan disputed.
- Fatura belgesi order ile tutarsız.
- E-posta teslim edilemedi/suppressed.
- Floor plan yeni sürümde assigned seat silindi.
- Offline check-in cihazı conflict üretti.
- Provider webhook kayıp; retrieve/reconciliation gerekli.
