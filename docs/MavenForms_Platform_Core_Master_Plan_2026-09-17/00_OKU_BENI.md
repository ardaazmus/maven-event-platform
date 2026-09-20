# MavenForms → Maven Event Platform Ana Planı

**Rapor tarihi:** 17 Eylül 2026  
**İncelenen ana kaynak:** `mavenform-main-son.zip`  
**Amaç:** MavenForms'u kayıt/form ürünü sınırından çıkarıp Maven Event Platform'un güvenli çekirdeğine dönüştürmek; Event Floor Plan Studio ile ortak kavram, veritabanı sahipliği ve API/event sözleşmesi kurmak; manuel finans süreçlerinden canlı ödeme ve e-belgeye, en son da Multi-Tenant yapıya ilerlemek.


## Teslimatın ana kararı

MavenForms **doğrudan bugünkü haliyle etkinlik platformu çekirdeği değildir**, fakat doğru bir yeniden sınırlandırmayla çekirdek için en güçlü başlangıç kod tabanıdır. Form yayınlama/snapshot, başvuru, RBAC, denetim kaydı, ödeme sağlayıcı sözleşmeleri, webhook/retrieve, özel belge güvenliği, transactional outbox, fatura belge akışı ve badge üretimi yeniden kullanılabilir. Eksik olan ana katman; `Event`, `Person`, `Registration`, `Order`, kalıcı manuel ödeme defteri ve muhasebe belgesi yaşam döngüsüdür.

Bu paket kaynak kodu değiştirmez. Kod envanterini, sorun kaydını, hedef veri modelini, entegrasyon sözleşmelerini, finans akışlarını, yönetim ekranlarını ve uygulanabilir faz planını teslim eder.

## Okuma sırası

1. `01_YONETICI_OZETI.md`
2. `03_GUNCEL_REPO_DENETIMI.md`
3. `04_MAVENFORMS_KAPSAM_UYUMU.md`
4. `05_HEDEF_MIMARI.md`
5. `06_KANONIK_VERI_MODELI.md`
6. `07_MANUEL_ODEME.md` ve `08_FATURA_EBELGE.md`
7. `09_FLOOR_EDITOR_ENTEGRASYONU.md`
8. `11_YOL_HARITASI.md`
9. `12_GELISTIRME_KONTROL_SISTEMI.md`

## Kanıt sınıfları

| Etiket | Anlamı |
|---|---|
| Kod kanıtı | ZIP içindeki şema, rota, test veya belge doğrudan incelendi. |
| Yerel doğrulama | Bağımlılık istemeyen seçili test komutu çalıştırıldı. |
| Sektör kanıtı | Resmî ürün, standart veya kamu kaynağına dayanır. |
| Öneri | Maven Event Platform için tasarım kararıdır; mevcut özellik iddiası değildir. |
| Canlı kanıt gerekli | Sağlayıcı hesabı, staging, mali müşavir/hukuk veya gerçek saha doğrulaması olmadan tamamlanmış sayılmaz. |

## Kaynak bütünlüğü

ZIP SHA-256: `9943a87ee88e0d55cd4dff1c936c5411c22194024a6e58ca8bb1ce60e19a1232`. Arşiv yorumunda `b314e07ca746d1cabfafc32da2d7c26ef3eda34f` değeri bulunur; `.git` verisi olmadığı için bu değer doğrulanmış commit iddiası olarak kullanılmamıştır.
