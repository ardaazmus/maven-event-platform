# OzelAPP — Yaka Kartı QR Benzersiz ID ve PDF Adlandırma Araştırma Promptu

## Görev

Bu dosyayı tek ve bağlayıcı araştırma görevi olarak kabul et. OzelAPP; form oluşturan, katılımcı yanıtlarını yöneten ve kullanıcı tarafından sağlanan PDF arka planları üzerine kişi bazlı yaka kartı üreten anonim bir form platformudur.

Gerçek proje, şirket, kişi, müşteri, e-posta, vergi, API anahtarı veya gizli bilgi kullanma. `OzelAPP` yalnızca anonim proje adıdır.

## Araştırılacak ürün akışı

- Kullanıcı bir forma bağlı katılımcıları seçer.
- Yaka kartı için özel ölçülü, kullanıcı tarafından yüklenmiş bir PDF arka planı kullanılır.
- İsim, soyad, unvan/title, etkinlik veya iş adı ve tarih gibi alanlar yanıt verisinden güvenli biçimde yerleştirilir.
- QR kod tekil veya toplu üretilebilir.
- Tekil çıktı PDF olarak indirilebilir.
- Toplu çıktıdaki her katılımcı ayrı PDF dosyası olarak üretilir; klasör veya ZIP halinde teslim edilir.
- Matbaaya API gönderimi yapılmaz. Çıktı, matbaanın kullanabileceği baskıya hazır dosya paketi olarak verilir.
- Şablon tek yüzlü veya ön/arka çift yüzlü olabilir.

## Ana karar sorusu

Her yaka kartının QR koduna benzersiz bir kimlik eklemek ve aynı kimliği PDF dosya adının sonuna eklemek sektör açısından doğru mudur?

Bunu varsayılan olarak doğru kabul etme. Etkinlik teknolojileri, badge printing, PDF üretimi, QR güvenliği, doküman yönetimi ve baskı iş akışlarındaki kanıtlarla değerlendir.

Özellikle şu kimliklerin birbirinden ayrılmasını araştır:

- Katılımcı kimliği
- Form yanıtı/submission kimliği
- Yaka kartı kaydı kimliği
- Yaka kartı örneği/üretim kimliği
- QR token kimliği
- Toplu üretim işi kimliği
- PDF çıktı kimliği

Kimliklerin aynı olması gerekip gerekmediğini; hangi kimliğin QR içinde, hangisinin dosya adında, hangisinin veri tabanında ve hangisinin audit log’da kullanılacağını gerekçelendir.

## Karşılaştırılacak adlandırma stratejileri

Aşağıdaki seçenekleri güvenlik, kullanılabilirlik, çakışma riski, matbaa operasyonu, desteklenebilirlik ve gizlilik açısından karşılaştır:

1. Yalnızca insan okunabilir ad: `Ad-Soyad-EventAdi-FormAdi.pdf`
2. İnsan okunabilir ad + benzersiz kısa güvenli ID: `Ad-Soyad-EventAdi-FormAdi-ID.pdf`
3. Aynı ad/soyad varsa unvan ekleme: `Ad-Soyad-Title-EventAdi-FormAdi-ID.pdf`
4. Çakışma devam ederse yalnızca opak ID ile güvenli fallback adı
5. QR’daki kimlik ile dosya adındaki kimliğin aynı olması
6. QR için ayrı opak token, dosya adı için ayrı çıktı ID kullanılması

Windows ve ZIP uyumluluğunu dikkate al. Dosya adlarında `/`, `\\`, `:`, `*`, `?`, `"`, `<`, `>`, `|` kullanılmamalıdır. Türkçe karakter, emoji, çok uzun ad, boş değer, aynı ad-soyad-unvan ve yinelenen yanıt durumları için deterministik normalizasyon kuralı öner.

## QR güvenliği ve doğrulama

Şunları resmi standartlar ve birincil teknik kaynaklarla incele:

- QR içine PII, e-posta, telefon, açık katılımcı bilgisi veya ödeme bilgisi konulmalı mı?
- Opaque token, imzalı token, kısa URL ve sunucu tarafı doğrulama seçenekleri
- QR çözümleme, geçersiz kılma, yeniden üretme, süre sonu ve yetki kontrolü
- QR’ın başkasına kopyalanması durumunda riskler
- QR token’ın yaka kartı ID’siyle ilişkilendirilmesi
- Vector SVG/PDF üretimi ve raster kalite kaybı
- Quiet zone, minimum fiziksel boyut, hata düzeltme ve baskı kontrastı
- QR’ın tarama testi ve üretim öncesi preflight zorunluluğu
- QR verisinin loglarda ve export manifestinde görünmemesi gereken kısımlar

QR standardı, hata düzeltme ve baskı gerekliliklerini güncel resmi/standart kaynaklarla doğrula. Genel tavsiyeyi evrensel minimum gibi sunma; ölçüleri kullanım senaryosuna göre belirt.

## Sektör araştırması

En az şu kategori ve örnekleri incele; güncel özellikleri yalnızca doğrulanabilir kaynaklarla yaz:

- Etkinlik badge ve onsite printing platformları
- Cvent, vFairs, EventCreate, ClearEvent, EventMobi, Bizzabo, Whova, Swapcard ve benzeri rakipler
- PDF/baskı üretim araçları ve baskı öncesi iş akışları
- QR doğrulama ve erişim kontrol sistemleri
- Doküman depolama, export manifest ve toplu iş yönetimi uygulamaları

Rakiplerin gerçekten sunduğu özellikleri; pazarlama iddiası, dokümantasyon ve doğrulanmış ürün davranışı olarak ayrı sınıflandır. Kanıt bulunamayan özelliği varmış gibi yazma.

## Teknik mimari araştırması

OzelAPP için öneri üretirken şu konuları kapsa:

- Yaka kartı şablonunun PDF olarak saklanması ve güvenli ilişkilendirilmesi
- Sayfa boyutu, yön, bleed, safe area, trim/media box ve ön/arka sayfa sözleşmesi
- Dinamik alanların allowlist ile sınırlandırılması
- Font gömme, taşma, eksik font ve özel karakter davranışı
- Tekil üretim ile toplu üretimin aynı üretim motorunu kullanması
- Idempotency, tekrar üretim ve aynı katılımcının iki kez işlenmesi
- Büyük toplu işlemler için job, durum, hata, retry ve iptal modeli
- ZIP içeriği, klasör yapısı ve makinece okunabilir manifest
- Dosya adı ile içerik kimliğinin doğrulanması
- Tenant/form scope ve erişim kontrolü
- Geçici dosya, kalıcı saklama, silme ve indirme yetkileri
- PII minimizasyonu, audit log ve güvenli hata mesajları

Önerilen veri modeli ve API sözleşmesini kavramsal seviyede göster. Henüz sağlayıcıya veya gereksiz bir teknolojiye bağlanma.

## Ön/arka yüz ve matbaa çıktısı

Şu kararları araştırma kanıtlarına göre netleştir:

- Tek yüzlü kartta yalnızca bir PDF sayfası
- Çift yüzlü kartta ön ve arka yüzün iki sayfalı tek PDF olması
- Arka yüz yoksa boş sayfa üretilmemesi
- Uzun kenar/kısa kenar çevirme bilgisinin kullanıcıya gösterilmesi
- Baskı sırası, sayfa yönü, bleed ve safe area bilgisinin manifestte bulunması
- Tekil PDF, ayrı PDF klasörü, ZIP ve isteğe bağlı birleştirilmiş PDF farkları
- Matbaaya verilecek minimum teslim paketi
- İndirilen çıktının açılabilir, sayfa ölçüsünün doğru ve QR’ın taranabilir olduğunun doğrulanması

## Beklenen araştırma sonucu

Raporu tek bir Markdown dosyası olarak hazırla ve aşağıdaki sırayı koru:

1. Yönetici özeti
2. Araştırma kapsamı ve varsayımlar
3. Doğrulanmış sektör bulguları
4. Rakip/ürün karşılaştırma tablosu
5. QR benzersiz ID kararı ve gerekçesi
6. Katılımcı, submission, badge, QR ve output ID ayrımı
7. PDF dosya adlandırma kararı
8. Deterministik çakışma ve fallback algoritması
9. Tekil üretim akışı
10. Toplu üretim, klasör, ZIP ve manifest akışı
11. Tek yüz/çift yüz ve baskı öncesi kurallar
12. Güvenlik ve gizlilik tehditleri
13. Kavramsal veri modeli ve API sözleşmesi
14. Kullanıcı arayüzü ve hata önleme önerileri
15. Kabul kriterleri ve test matrisi
16. 15 dakikalık, birbirine bağlı mikro-faz planı
17. Açık riskler ve dış bağımlılıklar
18. Sonuçta uygulanacak karar: `ACCEPT`, `SIMPLIFY`, `DEFER` veya `REJECT`

## Zorunlu çıktı kuralları

- Her önemli iddia için doğrudan kaynak URL’si ver.
- Resmi standart, resmi ürün dokümanı ve rakip ürün kaynağını mümkün olduğunca ayır.
- Araştırma sonucu ile öneriyi ayrı yaz.
- Kanıtlanmamış bilgileri `doğrulanmadı` olarak işaretle.
- Kullanıcının önerisini yalnızca kanıt destekliyorsa kabul et.
- PII içeren QR veya dosya adlandırmasını varsayılan olarak önermeden önce riskini açıkla.
- Gerçek API anahtarı, gerçek müşteri verisi veya gizli proje bilgisi kullanma.
- Kod yazma; önce karar, sözleşme, güvenlik sınırı ve kabul kriterlerini üret.

