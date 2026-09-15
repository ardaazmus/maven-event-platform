# OzelAPP Bağımsız Derin Araştırma Paketi

**Araştırma tarihi:** 3 Eylül 2026  
**Kapsam:** Ödeme, faturalama, belge güvenliği, zorunlu bildirimler, public form/embed/WordPress, form builder UX ve gelecekteki SaaS tenant mimarisi.  
**Kanıt standardı:** Öncelik resmi sağlayıcı/kamu/standart dokümanlarındadır. Doğrulanamayan noktalar `UNKNOWN`, `EXTERNAL DEPENDENCY` veya `LEGAL REVIEW REQUIRED` olarak işaretlenmiştir.

Bu paket, verilen 13 araştırma maddesini ayrı Markdown raporları halinde sunar. `00_Yonetici_Ozeti_ve_Ana_Kararlar.md` dosyası istenen 23 bölümlü birleşik görünümü; `14_15_Dakikalik_Mikro_Faz_Plani.md` ise değiştirilemez ana faz sırasını koruyan uygulama planını içerir.

## Dosya haritası

| Dosya | İçerik |
|---|---|
| `00_Yonetici_Ozeti_ve_Ana_Kararlar.md` | Yönetici özeti, ana karar/güvenlik/uygulama tabloları, sınıflandırmalar ve 23 bölümlü sonuç |
| `01_Stripe.md` | Checkout, Payment Element, Intent yaşam döngüsü, SCA, webhook, refund/dispute ve Türkiye uygunluğu |
| `02_iyzico.md` | Checkout Form, 3DS, callback, sorgu, iade/iptal, taksit ve ortak provider adapter’ı |
| `03_Google_Pay.md` | Gateway/direct tokenization, merchant ve domain doğrulama, cihaz/ülke/fallback/PCI |
| `04_PCI_DSS_ve_Odeme_Guvenligi.md` | SAQ A, PAN/CVV, secret, şifreleme, log, erişim, yedek ve MUST/SHOULD/MAY/MUST NOT matrisi |
| `05_PaymentOrder_ve_Mutabakat.md` | Durum makinesi, event ordering, idempotency, minor-unit ve günlük/refund mutabakatı |
| `06_Manuel_Fatura_Sistemi.md` | Seçim/export/import, eşleştirme, tekrar önleme, audit, rol ve belge sınırları |
| `07_Parasut_API_v4.md` | Doğrulanmış v4 yüzeyi, OAuth, 10/10 saniye limiti, e-belge işleri ve kanıt boşlukları |
| `08_Turkiye_eFatura_eArsiv.md` | GİB, UBL-TR/XML, PDF sınırı, saklama, iptal/itiraz ve hukuki inceleme alanları |
| `09_Document_Ready_ve_Belge_Guvenligi.md` | Değişmez belge, hash/versiyon, süreli link, tenant izolasyonu ve retention |
| `10_Transactional_Epostalar.md` | Yalnız zorunlu olaylar, teslimat güvenilirliği, SPF/DKIM/DMARC ve sağlayıcı seçimi |
| `11_Public_Form_Embed_WordPress.md` | Anonymous submit, snapshot, CSP/CORS/CSRF, iframe/inline ve üretim WordPress kontrol listesi |
| `12_Form_Builder_ve_UX.md` | Builder bilgi mimarisi, responsive model, medya ayrımı, erişilebilirlik ve durum tasarımı |
| `13_SaaS_Tenant_Mimarisi.md` | Tenant/rol/secret sınırları, askıya alma, export, destek erişimi ve reactivation |
| `14_15_Dakikalik_Mikro_Faz_Plani.md` | En fazla 15 dakikalık bağımsız iş paketleri ve geçiş kapıları |
| `KAYNAK_LEDGERI.md` | Raporlarda kullanılan temel resmi kaynakların toplu listesi |

## Okuma sırası

1. Önce yönetici özeti ve ana kararları okuyun.
2. İlgili konu raporunda ayrıntılı kanıt ve karar gerekçesine inin.
3. Mimari karar kaydı oluştururken `Durum`, doğrulama etiketi ve dış bağımlılıkları aynen taşıyın.
4. Uygulamayı mikro-faz planındaki sırayla yürütün; dış servis kanıtı bulunmayan kapıyı geçmiş saymayın.

## Kanıt sınırı

Bu çalışma kod veya özel repo incelemesi değildir. Bir özelliğin uygulanmış, test edilmiş ya da üretimde çalışıyor olduğu iddia edilmez. Mock, sandbox ve doküman keşfi üretim kanıtı değildir. Resmi dokümanın sessiz kaldığı noktalar tahminle doldurulmamıştır.

RESEARCH COMPLETE — READY FOR ARCHITECTURE REVIEW
