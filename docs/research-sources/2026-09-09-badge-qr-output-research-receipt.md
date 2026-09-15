# Yaka kartı QR ve PDF çıktı araştırması — kaynak kaydı

- Kaynak dosyası: `OzelAPP_Yaka_Karti_QR_Benzersiz_ID_ve_PDF_Adlandirma_Ayrintili_Arastirma_Raporu(2).md`
- Kaynak SHA-256: `606B0208DB0A38BC67204C448F9394779C4F04EE5E6BE9DA1D66A436CDD66DEE`
- Karar: `SIMPLIFY`
- Kapsam: PDF arka planlı yaka kartı, dinamik katılımcı alanları, tekil/toplu export, tek/çift yüz, QR ve matbaa handoff.

## Bağlayıcı kararlar

- Benzersiz kimlikler kullanılacak; participant, submission, badge, QR token, generation job ve PDF output kimlikleri birbirinden ayrılacak.
- QR token ile PDF output ID aynı değer olmayacak.
- QR modları ayrı yaşam döngülerine sahip olacak: `NONE`, `PUBLIC_CARD_URL`, `INLINE_VCARD`, `SECURE_TOKEN`; public kartvizit ve secure check-in tek payload’da birleştirilmeyecek.
- PDF dosya adı insan okunabilir bölüm ve ayrı kısa opak output ID içerecek; Windows/ZIP yasak karakterleri, reserved names, Unicode normalizasyonu ve case-insensitive çakışma kontrolü uygulanacak.
- QR içine varsayılan olarak PII, ödeme, e-posta, telefon veya ham form yanıtı konulmayacak; public kartvizit açıkça seçilebilir ve allowlist ile sınırlandırılacak.
- PDF export private form/workspace scope’unda kalacak; üretim snapshot’ı, template version, print profile, preflight ve idempotency korunacak.
- İlk sürüm export-first’tir: tekil PDF, kişi başı PDF ZIP’i, birleşik/N-up çıktı, manifest ve proof/handoff paketi vardır; matbaa API’si ve doğrudan yazıcı entegrasyonu ertelenmiştir.
- R-10 ödeme/fatura kapısı bu FORM-UX uzantısını bloke etmez; ancak badge güvenliği, tenant/form scope ve private output kuralları korunur.

## Uygulama sınırı

Bu kayıt araştırmanın tam metnini kopyalamaz. Tam rapor kullanıcı tarafından sağlanan kaynak dosyasıdır; burada yalnızca uygulama kararlarını ve doğrulanacak kaynak bütünlüğünü sabitler.
