# 06 — Manuel Fatura Sistemi Derin Araştırması

**Erişim tarihi:** 3 Eylül 2026

## Doğrudan sonuç

Manuel modül, ilk aşamada “fatura kesen e-belge motoru” değil; ödemeleri seçen, fatura adayını doğrulayan, muhasebeye kontrollü Excel/CSV handoff üreten ve dışarıda düzenlenen PDF/XML belgeyi eşleyip teslim eden bir orkestrasyon modülü olmalıdır. Resmi e-Fatura/e-Arşiv ancak GİB Portalı, bildirilen doğrudan entegrasyon veya onaylı özel entegratör üzerinden oluşur.

## Önerilen akış ve veri modeli

`candidate → selected → exported_to_accounting → issued_external → imported → verified → document_ready → delivered`

| Kayıt | Zorunlu alanlar | Kontrol |
|---|---|---|
| Invoice candidate | tenant, payer/customer snapshot, payment allocations, amount/tax/currency | Yalnız mutabık başarılı ödemeler |
| Export batch | batch ID, selection query snapshot, row count, schema version, hash | Kısmi grup tekrar üretilebilir |
| External invoice | issuer, ETTN/UUID, document no/date/type, XML/PDF refs | Tenant+issuer+ETTN tekilliği |
| Allocation | payment/refund ↔ invoice amount | Fazla/eksik ve currency engeli |
| Delivery | recipient, document version, time/status | Süreli link ve audit |

## Tek tek/kısmi grup seçimi ve Excel

Liste seçimi filtre sonucunu değil seçilmiş payment/order ID snapshot’ını kaydetmelidir; sayfalama sırasında seçim kaybolmamalıdır. “Tüm filtre sonucunu seç” eylemi satır sayısını ve sorgu zamanını açık gösterir. Export; UTF-8 CSV/XLSX, sürümlü kolon şeması, minor-unit’ten kontrollü gösterim, ISO tarih/currency ve formül enjeksiyonuna karşı hücre escape’i içermelidir. Excel yalnız handoff/muhasebe girdisidir; e-belge değildir.

## Müşteri eşleştirme ve duplicate önleme

Vergi kimliği/VKN-TCKN hassas veridir; tam değer yalnız yetkili rolde, loglarda maskeli görünür. Eşleştirme sırası doğrulanmış vergi kimliği → muhasebe external customer ID → kontrollü manuel seçimdir; yalnız ad/e-posta ile otomatik kesin eşleşme yapılmaz.

Duplicate koruması katmanlıdır: tenant+issuer+ETTN/UUID kesin; belge no+yıl+tür güçlü sinyal; aynı payment allocation toplamı ve export row hash’i operasyon sinyali. Mali tekillik ve düzeltme/ikame ilişkisi `LEGAL REVIEW REQUIRED` olarak müşavirce doğrulanmalıdır.

## Edit, iptal ve yeniden gönderim

- `candidate/selected` aşamasında mali alan değişebilir ve auditlenir.
- `issued_external/imported` sonrası in-place edit yasaktır. Düzeltme/iptal/ikame ayrı kayıt ve ilişki oluşturur; orijinal korunur.
- “Yeniden gönder” aynı immutable belge sürümünü yeni delivery kaydıyla iletir; yeni fatura yaratmaz.
- “İptal” yalnız dış muhasebe/e-belge otoritesinin sonucuyla kesinleşir.
- Rol ayrımı: operator seç/export; accountant verify/import; finance approver cancel/refund; viewer read; admin yetki yönetir. Kritik eylemlerde yeniden doğrulama ve gerekçe gerekir.

## PDF/XML/Excel ayrımı

| Format | Rol | Resmi asıl? |
|---|---|---|
| Excel/CSV | Muhasebeye veri handoff’u | Hayır |
| PDF | İnsan-okunur görüntü/sunum | Tek başına hayır |
| İmzalı UBL/XML | E-belgenin kanonik elektronik içeriği | Yetkili kanal/validasyonla evet |

OzelAPP, XML/imza doğrulama kanıtı olmadan yalnız PDF importuna `document_ready_legal` anlamı vermemelidir. `document_ready` ürün durumu dahi kaynağı ve doğrulama seviyesini taşır.

## Audit ve kabul testleri

- Seçim/export batch’i aynı girdilerle deterministik ve hash’li.
- Aynı ETTN ikinci tenant belgesine bağlanamaz; cross-tenant lookup sonuç döndürmez.
- Issue sonrası edit denemesi reddedilir, orijinal hash değişmez.
- Refund sonrası invoice allocation exception üretir.
- CSV formül enjeksiyon payload’ı çalıştırılabilir formül olarak çıkmaz.
- Yeniden gönderim invoice duplicate oluşturmaz; delivery count artar.

## Resmi kaynak kanıtı

| Kaynak | Kurum | URL | Bölüm | Karar |
|---|---|---|---|---|
| e-Fatura Mevzuat ve Teknik Mimari | GİB | https://ebelge.gib.gov.tr/efaturamevzuat.html | Uygulama yöntemleri / UBL | Resmi üretim kanalı |
| 509 Sıra No’lu VUK Genel Tebliği, güncel metin | GİB | https://ebelge.gib.gov.tr/dosyalar/tebligler/Dipnotlu_Guncel_Sekli_ile_509_Sira_No%27lu_VUK_Genel_Tebligi.pdf | e-Fatura/e-Arşiv ve saklama | Elektronik asıl ve mükellef sorumluluğu |
| e-Arşiv Teknik Kılavuzu v1.18 | GİB | https://ebelge.gib.gov.tr/dosyalar/kilavuzlar/e-Arsiv_Teknik_Kilavuzu_V.1.18.pdf | UBL-TR/PDF | PDF’nin tek başına yeterli olmaması |
| CSV Injection | OWASP | https://owasp.org/www-community/attacks/CSV_Injection | Spreadsheet formulas | Güvenli export |

## Karar kaydı

**Karar:** Manuel modül fatura adayını, muhasebe handoff’unu, dış belge import/doğrulama ve teslimini yönetecek; yetkisiz biçimde resmi e-belge düzenleyicisi gibi davranmayacak.  
**Durum:** SIMPLIFIED  
**Bağlı ana faz:** 3  
**Bağımlılıklar:** Muhasebe kolon sözleşmesi, issuer/özel entegratör, mali müşavir onayı, belge doğrulama.  
**Sektörel gerekçe:** Excel/PDF ile resmi e-belge üretimi aynı işlem değildir; yetkili kanal ve elektronik asıl gerekir.  
**Kaynak:** GİB e-Fatura mevzuat/teknik mimari, 509 Tebliği, e-Arşiv kılavuzu.  
**Teknik gerekçe:** Handoff ve belge kayıtlarını ayırmak duplicate/edit/audit problemlerini yönetir.  
**Güvenlik etkisi:** Vergi kimliği ve belge içeriği rol/tenant kapsamında kalır; orijinal değişmez.  
**Maliyet/karmaşıklık:** Orta; seçim/export/import/verify UI ve audit gerekir.  
**Yanlış uygulanırsa risk:** Geçersiz/çift fatura, değişmiş resmi belge, yanlış alıcı ve vergi/kişisel veri ihlali.  
**Minimum uygulanabilir çözüm:** Aday seçimi + güvenli XLSX/CSV batch + dış belge ETTN/XML/PDF importu + duplicate/audit.  
**İleride genişletme yolu:** Faz 4 Paraşüt otomasyonu ve müşavir onaylı gelişmiş vergi senaryoları.

RESEARCH COMPLETE — READY FOR ARCHITECTURE REVIEW
