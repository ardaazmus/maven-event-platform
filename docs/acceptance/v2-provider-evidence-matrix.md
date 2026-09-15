# V2 Provider Evidence Matrix

**Kapsam:** Yalnız first-party Maven merchant akışı. Bu belge teknik hazırlık ve kanıt kapısıdır; ödeme hesabı açmaz, live mutation etkinleştirmez.

## Durum sözlüğü

- `supported`: ürün/ülke/merchant için resmi veya hesap bazlı uygunluk kanıtı var mı?
- `sandbox_ready`: test hesabı, test anahtarı, callback ve webhook endpoint’i ile uçtan uca test hazır mı?
- `merchant_verified`: merchant onboarding/KYC ve ilgili sözleşme doğrulandı mı?
- `production_eligible`: teknik, provider, güvenlik ve operasyon kanıtlarının tamamı var mı?
- `decision`: `accepted`, `conditional`, `deferred`, `blocked`.

## Karar matrisi

| Provider/yöntem | supported | sandbox_ready | merchant_verified | production_eligible | decision | Açıklama |
|---|---|---|---|---|---|---|
| iyzico Checkout Form | conditional | unverified | unverified | no | accepted | Türkiye first-party için ilk hosted aday; hesap yetenekleri ve gerçek sandbox kanıtı zorunlu. |
| Stripe Checkout | conditional | unverified | no | no | deferred | Merchant ülke/hesap uygunluğu kanıtlanmadan Türkiye hesabı varsayılmaz. |
| Google Pay PAYMENT_GATEWAY | conditional | unverified | unverified | no | conditional | Bağımsız tahsilatçı değil; onaylı PSP capability’si, domain/merchant ve runtime uygunluğu gerekir. |
| Google Pay DIRECT | no | no | no | no | blocked | Direct token decrypt/anahtar/PCI programı bu V2 kapsamının dışındadır. |

## Zorunlu kanıt alanları

### Ortak

- Provider ve merchant hesap sahibi: yalnız güvenli deployment secret store’da; bu matriste kimlik/secret tutulmaz.
- Ortam: test ve live hesap/anahtar/webhook endpoint’i ayrı.
- İç `PaymentOrder`: server-side amount minor, currency, form/submission bağlama ve değişmeyen idempotency key.
- Callback: yalnız akış dönüşü; ödeme başarısı kanıtı değil.
- Webhook: raw body imzası, timestamp/replay, event dedupe, hızlı kabul ve worker idempotency.
- Kesinlik: provider account, internal order, tutar ve currency eşleşmeden `succeeded`/fulfillment yok.
- İade/chargeback: ödeme kaydını silmeden ayrı yetki, audit ve mutabakat akışı.
- PCI: PAN/CVV uygulama, log, DB, cache, export, queue veya backup’a girmez; hosted akış hedeflenir.

### iyzico Checkout Form

- Initialize endpoint ve imza üretimi güncel resmi doküman/SDK ile doğrulanmalı.
- Token, `conversationId`, payment reference ve callback/retrieve ilişkisi sentetik fixture ile test edilmeli.
- Callback sonrası server retrieve zorunlu; doğrulanmış webhook varsa ikinci kanıt olarak işlenmeli.
- `X-IYZ-SIGNATURE-V3` kanonik veri/replay davranışı güncel merchant dokümanı ile teyit edilmeli.
- Yabancı kart, currency, taksit, refund/cancel ve settlement yetenekleri hesap sözleşmesiyle kanıtlanmalı.

### Stripe Checkout

- Merchant’ın desteklenen ülkede hukuken uygun tüzel kişilik ve onaylı hesabı kanıtlanmalı.
- MVP yolu hosted Checkout/Checkout Sessions; Payment Element ancak ayrı script/PCI incelemesiyle.
- `Stripe-Signature` raw body doğrulama, event inbox ve provider retrieve/reconciliation testi.
- `requires_action`, `processing`, `succeeded`, refund ve dispute durumlarının normalize state map’i.
- Türkiye uygunluğu kanıtı yoksa UI’da canlı provider seçeneği gösterilmez.

### Google Pay

- Yalnız `PAYMENT_GATEWAY`; token Google Pay’den seçilmiş PSP’ye gider.
- Production merchant/domain kaydı, HTTPS, country/currency/PSP capability ve risk/3DS koşulları.
- Runtime `isReadyToPay` sonucu; uygun değilse standart hosted ödeme fallback’i.
- Test tokenı veya browser success callback’i tahsilat kanıtı değildir.
- `DIRECT` için ayrı QSA/PCI programı ve kriptografik anahtar yaşam döngüsü olmadan açılmaz.

## V2-00 çıkış kapısı

V2-00 yalnız karar matrisi ve evidence alanlarını tamamlar. Sonraki mikro-fazlar provider adapter’ını feature-flag ile sandbox sınırında bağlayabilir. Merchant doğrulaması, gerçek sandbox olayları, acquirer/QSA teyidi ve production deployment kanıtı gelmeden `production_eligible=no` ve global R-10 `NO-GO` kalır.

**Kaynak sınıfı:** `docs/OzelAPP_Derin_Arastirma_2026-09-03/01_Stripe.md`, `02_iyzico.md`, `03_Google_Pay.md`, `04_PCI_DSS_ve_Odeme_Guvenligi.md` ve bu araştırmalardaki resmi provider/PCI bağlantıları.

**V2-00A çalışma notu:** Provider contract testleri TypeScript path alias kullandığı için repository’nin Bun çalışma biçimiyle yürütülür; çıplak Node ile çalıştırmak geçerli bir proje doğrulaması sayılmaz.
