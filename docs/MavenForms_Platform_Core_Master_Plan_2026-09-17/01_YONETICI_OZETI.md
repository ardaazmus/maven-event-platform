# MavenForms → Maven Event Platform Ana Planı

**Rapor tarihi:** 17 Eylül 2026  
**İncelenen ana kaynak:** `mavenform-main-son.zip`  
**Amaç:** MavenForms'u kayıt/form ürünü sınırından çıkarıp Maven Event Platform'un güvenli çekirdeğine dönüştürmek; Event Floor Plan Studio ile ortak kavram, veritabanı sahipliği ve API/event sözleşmesi kurmak; manuel finans süreçlerinden canlı ödeme ve e-belgeye, en son da Multi-Tenant yapıya ilerlemek.


## Sonuç

MavenForms, Maven Event Platform'un **uygulama temeli ve operasyon çekirdeği** olabilir. `Form` nesnesi platformun merkezine konmamalıdır. Merkez; etkinlik, kişi, kayıt, sipariş ve finans zinciri olmalıdır. Form bu zincirde veri toplama aracıdır. Bu ayrım yapılmadan Floor Editor, biletleme, program, sponsor, konaklama ve mobil deneyim gibi modüller yine birbirinden kopar.

## Bugün ne kadarını karşılıyor?

| Alan | Durum | Karar |
|---|---|---|
| Form oluşturma, yayın snapshot'ı ve başvuru | Güçlü ve yeniden kullanılabilir | Registration intake motoru olur. |
| Kimlik, rol, audit | Kısmen güçlü | Tek şirket pilotunda korunur; oturum ve workspace seçimi sertleştirilir. |
| Ödeme altyapısı | Yerel sözleşme seviyesi güçlü, production kanıtı yok | `Order/Payment/Allocation` modeline taşınır. |
| Manuel ödeme | Yetersiz | Başvurudaki durum alanı yerine kalıcı finans hareketi gerekir. |
| Fatura belge güvenliği | Güçlü temel | Fatura tekil `PaymentOrder` eki olmaktan çıkarılır. |
| Paraşüt | Adapter ve sözleşme hazırlığı var | Canlı hesap/staging kanıtından önce açılmaz. |
| Badge | Üretim/export güvenliği güçlü | Ticket ve check-in modeli eklenmeden onsite modülü sayılmaz. |
| E-posta/outbox | Güçlü temel | Form bağımlılığı kaldırılıp genel domain outbox'a genişletilir. |
| Event/venue/session/speaker | Yok | Çekirdek yeniden kurulumunun parçasıdır. |
| Floor plan ve oturma | Ayrı projede kısmi | Platform çekirdeğine API/event ile bağlanır. |
| Multi-Tenant ürün | Erken sözleşmeler var, release yok | Son ürün kapısıdır. Veri izolasyonu kontrolleri baştan korunur. |

## Beş zorunlu mimari karar

1. **MavenForms kod tabanı evrimleştirilir; form şeması evrensel domain yapılmaz.**
2. **İlk sürüm tek şirket içindir.** Mevcut `Workspace`, sabit iç organizasyon adaptörü olarak kullanılabilir. Yeni kayıtlar yine `organizationId/workspaceId` taşır; bu gelecekte büyük veri göçünü önler.
3. **PostgreSQL ve modüler monolit ilk hedeftir.** Modüller aynı cluster'da ayrı şema/table ownership ile çalışır; başka modülün tablosuna doğrudan yazmaz.
4. **Finans zinciri:** `Order → Payment → PaymentAllocation → Invoice/Document → Delivery`. Manuel ve sağlayıcı ödemeleri aynı defterde farklı kaynak türleridir.
5. **Multi-Tenant son kapıdır.** Provisioning, tenant self-service, custom domain, tenant billing, tenant-a özgü provider hesabı ve RLS release'i ancak iç pilot, canlı ödeme, fatura gönderimi ve Floor Editor entegrasyonu kanıtlandıktan sonra açılır.

## İlk 90 günlük hedef

İlk 90 günde amaç genel Event Management ürününü bitirmek değildir. Çalışan ve ölçülebilir iç akış şu olmalıdır:

`Etkinlik oluştur → kayıt formu bağla → kişi/kayıt üret → sipariş çıkar → havale/nakit/çek/PO ödemesini kanıtıyla kaydet → kısmi/tam ödeme ve kalan bakiye hesapla → manuel fatura talebi ve belge kontrolü → badge üret → Floor Editor'da katılımcıyı/alanı eşleştir → audit ve raporla.`

Bu akış tamamlanmadan sanal POS, otomatik e-fatura veya Multi-Tenant açılması ürün borcunu büyütür.
