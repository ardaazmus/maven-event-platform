# Mail araştırması kaynak kaydı

## Kaynak

- Kaynak dosya: `C:\Users\nefer\Downloads\Anonim_Form_Platformu_Mail_Yapilandirmasi_Uygulama_Arastirmasi.md`
- Araştırma tarihi: 2026-09-07
- SHA-256: `63EFDF2D5C339ED77047573B3AFEEEBC9C91C03840853A041F9FA892DA009C39`
- Durum: `ACCEPTED_AS_RESEARCH_SOURCE`
- Kapsam: Form katılımcı mailleri, şablonlar, tekil/toplu gönderim, fatura maili ayrımı, deliverability, provider/webhook güvenliği ve 15 dakikalık MAIL fazları.

## Kullanım sınırı

Bu belge kaynak raporunun tamamının projeye kopyası değildir; context maliyetini koruyan kısa bir receipt’tir. Raporun resmi URL ve kaynakça iddiaları, canlı provider veya production kanıtı sayılmaz. Gerçek hesap, DNS, domain, staging, teslimat ve hukuki kanıt yoksa R-10 `NO-GO/BLOCKED` kalır.

## Plana aktarılan düzeltmeler

- `notification` ve `transactional` ürün/mimari sınıflarıdır; tek başlarına KVKK, İYS, GDPR veya ePrivacy sonucu doğurmaz. Gerçek mesaj amacı ve içeriği ayrıca incelenir.
- DMARC referansı rapordaki güncel RFC 9989/9990/9991 kaynaklarına bağlanır; DMARC pass inbox veya teslim garantisi değildir.
- Client’tan gelen object ID selector olabilir; sahiplik ve yetki kanıtı değildir. Her kullanım server-side object/workspace/tenant authorization’dan geçer.
- Tekil idempotency otomatik olay, kullanıcı komutu ve batch recipient için ayrılır; bilinçli manual resend kalıcı olarak bloke edilmez.
- Provider webhook doğrulaması provider’a özgüdür; HMAC kullandığı varsayılmaz. İmza/auth, timestamp/replay, duplicate ve normalize event kapısı zorunludur.
- Provider özelliği ile gerçek hesapta aktif/approved özellik ayrıdır; provider, DNS, KYC, quota, region ve production evidence `EXTERNAL_DEPENDENCY` olarak kalır.
- Operasyonel ve billing mailinde click/open tracking varsayılan olarak kapalıdır; açılması ayrı privacy/retention kararıdır.
- Form onay mailine promosyon eklenirse iç `notification` etiketi hukuki değerlendirmeyi değiştirmez; İYS/KVKK/izin incelemesi gerekir.
