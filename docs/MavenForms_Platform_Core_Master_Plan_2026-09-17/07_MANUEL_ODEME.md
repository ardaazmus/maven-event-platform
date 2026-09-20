# MavenForms → Maven Event Platform Ana Planı

**Rapor tarihi:** 17 Eylül 2026  
**İncelenen ana kaynak:** `mavenform-main-son.zip`  
**Amaç:** MavenForms'u kayıt/form ürünü sınırından çıkarıp Maven Event Platform'un güvenli çekirdeğine dönüştürmek; Event Floor Plan Studio ile ortak kavram, veritabanı sahipliği ve API/event sözleşmesi kurmak; manuel finans süreçlerinden canlı ödeme ve e-belgeye, en son da Multi-Tenant yapıya ilerlemek.


## Neden ilk ürün fazı olmalı?

Şirket içi pilotta banka havalesi/EFT, nakit, çek, satın alma emri, proforma sonrası ödeme veya harici POS gibi yöntemler gerçek hayatın parçasıdır. Cvent'in offline payment yaklaşımı ödeme türü, tutar ve dağıtımı ayrı yönetir; Paraşüt'te de tahsilat ve kısmi tahsilat kavramları vardır. Mevcut MavenForms yalnız “paid” işareti tutabildiği için mutabakat yapamaz.

## Manuel Payment kaydı

Zorunlu alanlar: organization, payer/customer, currency, amount, method, value date, recorded date, reference, source, status, recorder, approver, evidence hash ve idempotency key. Bank transfer için banka/işlem referansı; çek için numara/vade; nakit için kasa/receipt; PO için sipariş belgesi ve beklenen ödeme tarihi eklenir. Hassas banka verileri gereksiz kopyalanmaz.

## Akış

1. Finans kullanıcısı açık siparişi seçer.
2. Ödeme yöntemi, tutar, tarih ve referans girer; belge yükler.
3. Sistem aynı referans+tutar+tarih kombinasyonunda olası duplicate uyarısı verir.
4. `recorded` hareket, yetki matrisine göre ikinci onay ister.
5. Onaylayan kişi kaydı `confirmed` yapar; aynı kullanıcı yüksek tutarlı kaydı hem oluşturup hem onaylayamaz.
6. PaymentAllocation ile tutar bir veya daha çok order'a dağıtılır.
7. Order balance transaction içinde güncellenir; partial/paid projection üretilir.
8. Yanlış kayıt editlenmez; reversal ve yeni doğru payment oluşturulur.

## Kabul senaryoları

- Tam havale tek order'a ayrılır ve order `paid` olur.
- Kısmi havale order'ı `partially_paid` yapar; kalan bakiye görünür.
- Tek ödeme bir grup siparişinin birden çok item/registration'ına dağıtılır.
- Aynı banka referansı tekrar girilirse duplicate/review akışına düşer.
- Fazla ödeme `unallocatedAmount` olarak kalır; otomatik gelir yazılmaz.
- Farklı currency allocation reddedilir veya onaylı FX snapshot ister.
- Reversal, bakiyeyi geri açar ve audit zincirini korur.
- Refund, özgün payment'a bağlı yeni hareket olarak kaydedilir.
- Belgesiz ödeme, belirlenen eşik üstünde onaylanamaz.
- Export toplamı ledger toplamıyla aynı çıkar.

## Admin ekranları

`Finans > Açık Bakiyeler`, `Ödeme Kaydet`, `İnceleme Kuyruğu`, `Dağıtılmamış Ödemeler`, `Mutabakat`, `İade/Düzeltme`, `Kanıt Belgeleri` ve `Audit` ekranları gerekir. Dashboard yalnız “paid” sayısı değil; tahsil edilen, açık, kısmi, incelemede, iade ve dağıtılmamış tutarları para birimine göre gösterir.

## Faz kapısı

İç pilotta hiçbir canlı provider gerekmez. Ancak dört göz onayı, duplicate kontrolü, reversal, allocation, export/reconciliation ve backup/restore kanıtı olmadan manuel finans fazı tamamlanmış sayılmaz.
