# V2 provider ve fatura karar kaydı

**Karar tarihi:** 2026-09-07  
**Kaynak:** Kullanıcı tarafından teslim edilen anonim araştırma: `Anonim_Form_Platformu_Banka_Sanal_POS_Stripe_Alternatifi_Derin_Arastirma.md`  
**Kanıt seviyesi:** Araştırma girdisi; resmi merchant sözleşmesi, provider sandbox/live testi, banka aktivasyonu, GİB veya mali müşavir/hukuk onayı değildir.
**Uygulama packet’i:** `V2-04C-A` — provider binding ve karar kaydı.
**Yeniden doğrulama:** `V2-04C-B` — önceki receipt korunarak karar ve binding tekrar doğrulanıyor.
**V2-06 yeniden doğrulama:** `V2-06-A` — fatura hazırlama intent’i STATUS güncellemesi sonrası tekrar doğrulanıyor.

## Bağlayıcı ürün kararı

1. V2 first-party ödeme yolunda Türkiye için iyzico birincil provider’dır.
2. V2’de public route provider, merchant, workspace, mode, tutar, currency veya callback seçmez. Değerler yayın snapshot’ı ve server-side workspace connection’dan türetilir.
3. Banka Sanal POS, Stripe ve Google Pay direct V3 ve sonrası için ertelenmiş adaylardır. Resmi uygunluk, sözleşme/aktivasyon, hosted/3DS, webhook, retrieve, refund ve reconciliation kanıtı olmadan gösterilemez veya mutation başlatamaz.
4. V2 uluslararası ödeme desteği taahhüt etmez. İyzico’nun yabancı kart/para birimi kapsamı ayrıca resmi hesap kanıtıyla doğrulanmadan varsayım yapılamaz.
5. V2 fatura yolu manuel kalır: muhasebeci dış sistemde keser; private/quarantine yükleme, eşleştirme, yetkili onay ve `document_ready` sonrasında ayrı billing sender ile yetkili kullanıcı gönderir.
6. Otomatik/toplu fatura maili ve Paraşüt otomatik faturalaması silinmez; risk, resmi API/GİB, mali müşavir, belge ve teslimat kanıtları tamamlanana kadar `DEFERRED/OPTIONAL` kalır.

## Erken mimari sınır

Erken fazlarda yalnız şu provider-neutral parçalar hazırlanabilir:

- provider adapter portu ve normalized sonuç sözleşmesi,
- capability/evidence kaydı ve server-side feature gate,
- PaymentOrder, webhook/retrieve/refund/reconciliation sınırları,
- secret/token/PAN/CVV/raw provider response dışarı sızmayan opaque public DTO,
- manuel fatura ve otomatik aday yollarını ayıran invoice state/outbox sınırı.

Sağlayıcıya özel credential, endpoint, webhook varyantı, banka MAC/hash ayrıntısı, canlı mutation ve resmi entegrasyon testi ilgili ertelenmiş fazın packet’i açılmadan uygulanmaz.

## Faz yönlendirmesi

- **V2:** iyzico hosted checkout + doğrulanmış ödeme + manuel fatura + yetkili manuel fatura gönderimi.
- **V3+:** banka Sanal POS ve Stripe uygunluk/aktivasyon araştırması; yalnız kanıt geçerse derin adapter uygulaması.
- **V3 Paraşüt adayı:** OAuth/company/contact/product/invoice/e-belge akışı ancak risk ve resmi kabul kapılarından sonra.
- **V4 SaaS:** tenant’ın kendi provider/muhasebe/mail bağlantıları; MavenForms tenant müşterisi adına para toplamaz.

Bu kayıt, ham araştırma metninin yerine geçmez; ham metin yeniden okunmadan kararın korunmasını sağlar. Bir faz provider’a özgü ayrıntı gerektirirse yalnız o fazın `reads` alanına ham kaynak ve resmi provider dokümanı eklenir.
