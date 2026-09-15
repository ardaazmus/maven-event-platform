# 08 — Türkiye e-Fatura / e-Arşiv Derin Araştırması

**Erişim tarihi:** 3 Eylül 2026  
**Uyarı:** Bu bölüm hukuki/vergi tavsiyesi değildir. Şirket ve işlem bazlı uygulama mali müşavir ve gerektiğinde hukuk danışmanı tarafından doğrulanmalıdır.

## Temel ayrım

509 Sıra No’lu VUK Genel Tebliği’nin güncel metninde, e-Fatura uygulamasına kayıtlı alıcıya e-Fatura; ilgili kapsamda kayıtlı olmayan alıcıya e-Arşiv Fatura temel yönlendirmesi bulunur. Belgeler GİB Portalı, GİB’e bildirilen doğrudan entegrasyon veya onaylı özel entegratör kanalıyla oluşturulur/iletilir. Sıradan bir SaaS, yetki olmadan özel entegratör veya resmi belge üreticisi rolünü üstlenemez.

## Zorunlu veri ve belge formatı

Çekirdek alanlar belge numarası/tarihi; düzenleyen ve alıcının ad/unvan, adres, vergi dairesi ve VKN/TCKN bilgileri; mal/hizmet tanım/miktar/fiyat/tutar; vergi tür/oran/tutarı; gerekli teslim ve QR/barkod alanlarıdır. İşleme göre senaryo, tevkifat, istisna, ihracat, özel matrah ve ek kodlar gerekir.

E-Arşiv teknik kılavuzu temel formatı UBL-TR olarak tanımlar. Sınırlı izinli PDF düzenlemede bile PAdES imzası ve uygun UBL-TR XML eklenmesi öngörülür. Sonuç: PDF tek başına elektronik asıl değildir. OzelAPP imzalı/doğrulanabilir XML/UBL’yi kanonik belge, PDF’yi görüntüleme kopyası olarak ele almalıdır.

## Numara, tarih, senaryo ve vergi alanları

Belge numara sırası, düzenleme tarihi/süresi, TEMEL/TİCARİ/KAMU veya diğer senaryolar, tevkifat/istisna kodları ve işlem bazlı vergi hesabı uygulama koduna sabit varsayımla gömülmemelidir. Bunlar sürümlü `TaxProfile`/rule set + effective date ile temsil edilmeli; yayın öncesi müşavirce onaylanan test örnekleri kullanılmalıdır. Otomatik default’lar kullanıcıya vergi hükmü gibi gizlenmemeli, kaynak ve sürüm göstermelidir.

## Saklama, bütünlük, iptal ve itiraz

Elektronik nüsha doğrulanabilir, okunabilir, yazdırılabilir ve bütünlüğü korunmuş biçimde saklanır; kâğıt/PDF çıktıya indirgeme yeterli değildir. Güncel GİB metnindeki Türkiye’de saklama ve başkası adına saklama hizmeti koşulları, OzelAPP’ın storage bölgesi ve rolünü `LEGAL REVIEW REQUIRED` yapar. Yurt dışı kopya ancak birincil saklama yükümlülüğüyle uyumlu ikincil kopya olarak değerlendirilmelidir.

İptal, itiraz, düzeltme ve ikame yeni olay/ilişkili belge üretir; orijinal overwrite edilmez. GİB’in iptal/itiraz portal kılavuzundaki sekiz günlük süre belirli akışlar içindir ve bütün fatura ihtilaflarına genellenmemelidir.

## 2026 güncellik riski

GİB eBelge ana sayfası 27 Temmuz 2026 duyurusunda e-Fatura/e-Arşiv paket ve UBL kod listesi değişikliklerini 14 Eylül 2026’da yürürlüğe girecek şekilde yayımlamış, 11 Ağustos 2026’da e-Arşiv XSD düzeltmesi duyurmuştur. Bu araştırma 3 Eylül’de yapıldığı için pilot/go-live’da yürürlükteki XSD, Schematron ve kod listeleri yeniden indirilip hash’lenmeli ve regression fixture’ları güncellenmelidir.

## Yazılım gereksinimi / hukuki inceleme matrisi

| Alan | Yazılım gereksinimi | Durum |
|---|---|---|
| Alıcı yönlendirme | VKN inbox sorgusu; e-Fatura/e-Arşiv sonucu audit | CONFIRMED |
| UBL/XML | Kanonik imzalı dosya + görüntüleyici/doğrulama | CONFIRMED |
| PDF | Sunum kopyası; tek başına resmi asıl sayma | CONFIRMED |
| Zorunlu alanlar | Sürüm/işlem tipi bazlı schema validation | CONFIRMED |
| Senaryo | Müşavir onaylı allowlist/rule set | LEGAL REVIEW REQUIRED |
| Tevkifat/istisna | Kod, oran, dayanak ve test örnekleri | LEGAL REVIEW REQUIRED |
| Numara/tarih | Issuer/seri/yıl kilidi ve zaman kuralı | LEGAL REVIEW REQUIRED |
| Saklama | Türkiye primary region, immutable sürüm, retention schedule | LEGAL REVIEW REQUIRED |
| İptal/itiraz | Olay+ilişkili belge; kanal/süre kuralı | LEGAL REVIEW REQUIRED |
| KVKK | Amaç, rol, aydınlatma, aktarım, erişim/silme politikası | LEGAL REVIEW REQUIRED |

## Resmi kaynak kanıtı

| Kaynak | Kurum | URL | Kullanılan bölüm | Karar |
|---|---|---|---|---|
| eBelge ana sayfası/duyurular | GİB | https://ebelge.gib.gov.tr/anasayfa.html | 27.07 ve 11.08.2026 duyuruları | 14.09.2026 schema kapısı |
| e-Fatura Mevzuat ve Teknik Mimari | GİB | https://ebelge.gib.gov.tr/efaturamevzuat.html | UBL ve uygulama yöntemleri | Yetkili kanal/elektronik belge |
| 509 Tebliğ, güncel dipnotlu metin | GİB | https://ebelge.gib.gov.tr/dosyalar/tebligler/Dipnotlu_Guncel_Sekli_ile_509_Sira_No%27lu_VUK_Genel_Tebligi.pdf | e-Fatura/e-Arşiv/alan/saklama | Temel yasal/teknik gereksinimler |
| 589 No’lu Değişiklik Tebliği | GİB | https://ebelge.gib.gov.tr/dosyalar/tebligler/Vergi_Usul_Kanunu_Genel_Tebligi_%28Sira_No_509%29%27nde_Degisiklik_Yapilmasina_Dair_Teblig_%28Sira_No_589%29.pdf | 31.12.2025 değişiklikleri | Güncel mevzuat |
| e-Arşiv Teknik Kılavuzu v1.18 | GİB | https://ebelge.gib.gov.tr/dosyalar/kilavuzlar/e-Arsiv_Teknik_Kilavuzu_V.1.18.pdf | UBL-TR/PDF/saklama | PDF yeterliliği |
| İptal/İtiraz Kılavuzu v1.2 | GİB | https://ebelge.gib.gov.tr/dosyalar/kilavuzlar/e-Fatura_Iptal_Ihtar_Itiraz_Bildirim_Kilavuzu_V_1.2.pdf | Portal olayları/süreler | İptal/itiraz akışı |
| KVKK Kanunu | KVKK | https://www.kvkk.gov.tr/Icerik/6649/Personal-Data-Protection-Law | Md.4, 9, 10, 12 | Minimizasyon/aktarım/güvenlik |

## Karar kaydı

**Karar:** OzelAPP resmi e-belgeyi yetkili kanal sonucuna dayandıracak; imzalı UBL/XML’yi kanonik, PDF’yi sunum kopyası tutacak; vergi senaryolarını müşavir/hukuk onayına bağlayacak.  
**Durum:** ACCEPTED  
**Bağlı ana faz:** 3–5; pilot doğrulaması faz 7  
**Bağımlılıklar:** GİB güncel paketleri, Paraşüt/özel entegratör, mali müşavir/hukuk, Türkiye saklama mimarisi.  
**Sektörel gerekçe:** E-belge formatı, kanal, imza ve işlem senaryosu düzenlenmiş alandır.  
**Kaynak:** GİB 509/589, e-Fatura teknik sayfası, e-Arşiv ve iptal/itiraz kılavuzları; KVKK.  
**Teknik gerekçe:** Sürümlü rule/schema ve immutable belge, zamanla değişen kuralları izlenebilir kılar.  
**Güvenlik etkisi:** Belge bütünlüğü, tenant erişimi ve veri minimizasyonu güçlenir.  
**Maliyet/karmaşıklık:** Yüksek; düzenleyici doğrulama, imza/XML görüntüleme ve retention gerekir.  
**Yanlış uygulanırsa risk:** Geçersiz belge, yanlış vergi, saklama/aktarım ihlali ve müşteriye yanlış fatura.  
**Minimum uygulanabilir çözüm:** Yetkili kanal + müşavir onaylı alan/senaryo seti + XML/PDF birlikte + iptal/itiraz audit’i.  
**İleride genişletme yolu:** Sürümlü vergi rule engine ve otomatik schema/Schematron regression seti.

RESEARCH COMPLETE — READY FOR ARCHITECTURE REVIEW
