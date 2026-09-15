# R-09 — Muhasebe / mali müşavir teknik kabul matrisi

**Tarih:** 2026-09-06  
**Kapsam:** MavenForms yerel faturalama zincirinin teknik kabul sınırları  
**Durum:** `TECHNICAL_ACCEPTANCE_PASS`; mali müşavir veya hukuk onayı değildir.

## Kullanım amacı

Bu rapor, ödeme sonrası fatura adayının hangi koşullarda otomatik sınıflandırılabildiğini ve hangi koşullarda muhasebe incelemesine park edildiğini gösterir. Fixture’lar sentetik/anonymized’tır; gerçek müşteri, VKN/TCKN, e-posta, provider yanıtı, credential veya belge içeriği içermez.

Teknik kabul şu iddiayı destekler: sistem belirsizliği sessizce belge türüne veya teslimata çevirmiyor. Teknik testin geçmesi, şirketin vergi mükellefiyeti, işlem senaryosu, tevkifat/istisna, tarih-numara, saklama veya GİB/özel entegratör yetkisi hakkında hukuki onay anlamına gelmez.

## Kabul matrisi

| Senaryo | Teknik giriş | Beklenen karar | Teslimat etkisi | Mali müşavir/hukuk notu |
| --- | --- | --- | --- | --- |
| TR şirket, geçerli VKN, inbox eşleşti | Alıcı doğrulandı, snapshot geçerli, otomatik sınıflandırma ve muhasebe onayı var | `classified / e_invoice` | Formalization ve `document_ready` kapıları geçilmeden mail yok | Senaryo, KDV ve belge alanları ayrıca doğrulanır |
| TR şirket, geçerli VKN, inbox eşleşmedi | Aynı kapılar, `found=false` snapshot | `classified / e_archive` | Aynı belge-ready kapıları | “Kayıt yok” sonucu tek başına tüm e-Arşiv hukuki koşullarının onayı değildir |
| TR bireysel müşteri | Alıcı doğrulama geçerli olabilir; mevcut otomatik policy bireysel alıcıyı desteklemez | `accounting_review_required` | Otomatik formalization/delivery yok | Kimlik, işlem tipi ve güncel mevzuat müşavirce belirlenir |
| Yurt dışı alıcı | Ülke TR değil veya yabancı kimlik eksik | `accounting_review_required` | Otomatik e-belge seçimi yok | İhracat, hizmet, KDV ve belge senaryosu ayrı incelenir |
| VKN veya vergi dairesi eksik | Alıcı doğrulaması `review_required` veya policy `tax_number_required` | Review/park | Teslimat yok | Eksik alanlar müşteri/muhasebe kanalından tamamlanır |
| Inbox lookup timeout/hata | Provider sonucu güvenilir değil | `accounting_review_required / lookup_failed` | Yeni kör POST yok; reconciliation/retry politikası uygulanır | Provider ve yetkili kanal durumu ayrıca teyit edilir |
| TRY veya USD ödeme | ISO-3 para birimi ve minor-unit tutarı | Mevcut para sözleşmesi korunur | Eksik/bozuk tutar veya currency importta reddedilir | Kur, KDV ve muhasebe çevrimi otomatik varsayılmaz |
| Refund, partial refund veya chargeback | Verified ödeme olayı | `refund_or_credit_note_review` | Delivery hold; belge private kalır | İptal/iadeye ilişkin belge türü ve süre müşavirce kararlaştırılır |
| Muhasebeden manuel PDF/XLSX | Batch/form eşleşmesi, quarantine, scan, stable match, approval | Belge `document_ready` olmadan yayınlanmaz | Private belge doğrulanmadan e-posta enqueue edilmez | Manuel belgenin resmi asıl niteliği işletme kanalına bağlıdır |

## Değişmez teknik kapılar

1. Alıcı, ödeme ve invoice kaydı aynı workspace ve aynı submission/payment zincirinden server tarafında bağlanır; client alanları karar kanıtı değildir.
2. Provider inbox sonucu tax number, `found` ve kontrol zamanı snapshot’ı doğrulanmadan sınıflandırma yapılmaz.
3. `accounting_review_required`, `reconciliation_required`, `refund_or_credit_note_review`, `provider_error` veya document-ready öncesi durumda otomatik teslimat yapılmaz.
4. `issued → document_ready → delivery_queued → sent` sırası korunur; geçici provider PDF URL’si müşteriye gönderilmez.
5. Manual import/export sabit kolon, minor-unit tutar ve ISO-3 currency sözleşmesini kullanır; formül, polyglot, yanlış batch ve duplicate kayıtlar güvenli şekilde reddedilir veya quarantine’de kalır.
6. İade/chargeback belgeyi silmez ve otomatik credit note/iptal iddiası üretmez; inceleme ve muhasebe kararı beklenir.
7. Rapor ve fixture içinde gerçek PII, PAN/CVV, provider secret, access token veya raw provider payload bulunmaz.

## Kanıt ve sınırlar

- `tests/accounting-acceptance-matrix.test.mjs` bu matrisi sentetik fixture’larla doğrular.
- Mevcut alıcı doğrulama, e-Fatura/e-Arşiv policy ve invoice state graph testleri R-09 hedef testleriyle birlikte çalıştırılır.
- Tam test, TypeScript, production build, `/api/ready` ve workflow verify yerel kalite kapılarıdır; gerçek Paraşüt/Stripe/iyzico hesabı, GİB yetkisi, gerçek AV, gerçek e-posta teslimatı ve production backup/restore kanıtı değildir.
- GİB paketleri, özel entegratör sözleşmesi, vergi oranları/eşikleri, işlem senaryosu, belge numarası/tarihi, iptal/itiraz ve saklama kuralları pilot/go-live öncesi güncel resmi kaynaklarla yeniden doğrulanmalıdır.

## Sonraki bağımlılık

R-09 teknik matrisi tamamlandıktan sonra R-10 final release gate’e geçilebilir; ancak R-10, gerçek provider sandbox/test hesabı ve mali müşavir/hukuk kabulünü otomatik olarak varsaymaz. Fatura production’da açılmadan önce bu dış kanıtlar ayrıca `EXTERNAL_DEPENDENCY` olarak kapatılmalıdır.
