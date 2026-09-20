# MavenForms → Maven Event Platform Ana Planı

**Rapor tarihi:** 17 Eylül 2026  
**İncelenen ana kaynak:** `mavenform-main-son.zip`  
**Amaç:** MavenForms'u kayıt/form ürünü sınırından çıkarıp Maven Event Platform'un güvenli çekirdeğine dönüştürmek; Event Floor Plan Studio ile ortak kavram, veritabanı sahipliği ve API/event sözleşmesi kurmak; manuel finans süreçlerinden canlı ödeme ve e-belgeye, en son da Multi-Tenant yapıya ilerlemek.


## Manuel fatura kontrolü — ilk sürüm

İlk sürüm e-belge üretmez. Platform fatura talebini ve kontrol zincirini yönetir; muhasebe dış sistemde belgeyi düzenler, PDF/XML veya referansı Maven'a yükler, ikinci kullanıcı eşleşmeyi onaylar ve gönderimi kontrollü yapar.

### Ayrılması gereken kavramlar

| Kavram | Anlam |
|---|---|
| InvoiceRequest | Kullanıcının/operasyonun belge talebi ve alıcı verisi |
| Invoice | Mali belgenin kanonik kaydı, numarası, UUID'si, tipi ve tutarı |
| InvoiceDocument | PDF/XML/UBL gibi özel dosya; hash, scan ve visibility taşır |
| InvoiceRelation | İptal, iade, credit/debit note veya replacement ilişkisi |
| InvoiceDelivery | Kime, hangi kanaldan, hangi belge sürümü gönderildiği |
| AccountingSync | Paraşüt/GİB durum eşleme ve provider kanıtı |

### Manuel akış

1. Paid veya onaylı post-pay order için fatura talebi açılır.
2. Alıcı tipi, unvan, vergi/TCKN alanları, adres, e-posta ve satır snapshot'ları server tarafında doğrulanır.
3. Muhasebe kuyruğu belge türünü ve vergi kararını kontrol eder.
4. Harici muhasebe sisteminde düzenlenen belge yüklenir; MIME/hash/AV/quarantine uygulanır.
5. Sistem tutar, currency, order ve alıcı eşleşmesi önerir; kullanıcı açıkça onaylar.
6. Belge `ready` olur; gönderim intent'i ayrı oluşturulur.
7. Teslimat sonucu provider evidence ile güncellenir; başarısızlık fatura durumunu geriye yazmaz.

## GİB/e-belge gerçeği

GİB'in resmî iptal/itiraz portalı fatura numarası ve tutar bilgisiyle imzalı talep ister. Bu bile belge yaşam döngüsünün `issued` sonrasında bitmediğini gösterir. İptal/itiraz süreleri, e-Fatura/e-Arşiv senaryoları, KDV/tevkifat/istisna ve belge tipi kararları kodlanmadan önce mali müşavir ve güncel resmî kılavuzla doğrulanmalıdır. Rapor, vergi hukuku kararı vermez; sistemin bu kararları snapshot ve audit ile taşımasını ister.

## Otomasyon fazları

| Alt faz | Kapsam | Go kapısı |
|---|---|---|
| F3A | Manuel request, alıcı/satır kontrolü, belge upload | İç muhasebe UAT |
| F3B | Güvenli belge gönderimi ve delivery evidence | Domain/sender doğrulaması |
| F7A | Paraşüt OAuth/connection health ve read-only lookup | Sandbox/staging kanıtı |
| F7B | Contact/product eşleme ve explicit approval | Muhasebe örnek seti |
| F7C | Sales invoice create + job polling + provider IDs | Canlı olmayan gerçek hesap kanıtı |
| F7D | e-Fatura/e-Arşiv formalization, PDF/XML inbox | Mali müşavir kabulü |
| F7E | İptal/iade/credit note reconciliation | Uçtan uca ledger mutabakatı |

## Mevcut koda özel değişiklikler

- `InvoiceRecord.paymentOrderId @unique` kaldırılmalı; invoice order/customer'a bağlanmalı.
- Invoice-payment ilişkisi gerektiğinde junction/allocation tablosu olmalı.
- `InvoiceRelation` eklenmeli.
- Document/Decision/Delivery modelleri korunmalı; organization ve immutable version bağı güçlendirilmeli.
- Invoice candidate, yalnız succeeded provider payment değil, order policy ve confirmed allocations üzerinden üretilmeli.
- Refund/chargeback sonrası otomatik belge iptali yapılmamalı; accounting review task açılmalı.
