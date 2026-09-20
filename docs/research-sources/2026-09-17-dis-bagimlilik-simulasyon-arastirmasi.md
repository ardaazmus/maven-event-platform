# Dış Bağımlılık Simülasyonu — TR Araştırma Notu (2026-09-17)

Amaç: R6/R7 canlı kapıları açılmadan dış bağımlılık davranışını yerelde simüle etme yöntemi.
Bu not araştırma/plan girdisidir; canlı provider kanıtı değildir.

## Doğrulanmış resmi kaynaklar (bu turda fetch edildi)

- iyzico: `docs.iyzico.com` yayında; `/on-hazirliklar/sandbox` sayfası sandbox hesabının
  `sandbox-merchant.iyzipay.com/auth/register` adresinden açıldığını, anahtarların
  `sandbox-` önekli API/SECRET KEY olduğunu ve sandbox SMS şifrelerinin her zaman
  `123456` olduğunu yazar. Sonuç: iyzico hosted akışı sandbox merchant hesabıyla
  denenebilir; hesap açılmadan canlı iddia kurulamaz.
- GİB e-Belge: `efatura.gov.tr` yayında; "e-Fatura Test Portalına Giriş" ve
  "e-Arşiv Test Portalına Giriş" bağlantıları mevcut. Test portallarına giriş için
  kayıtlı test mükellefi başvurusu ve elektronik imza aracı (mali mühür) gerekir;
  hesap/yetki olmadan e-belge gönderim kanıtı kurulamaz.
- Paraşüt: `developer.parasut.com` bu turda erişilemedi (transport hatası),
  `www.parasut.com/api` 404 döndü. Paraşüt sandbox koşulları DOĞRULANAMADI;
  repo içindeki `tests/parasut-*.test.mjs` sözleşme testleri yerel kapsamda kalır.

## Yöntem kararı: fake-adapter + fixture + contract test

- `src/lib/fake-provider-adapter.ts` (`runFakeProvider`): yalnız `stripe`/`iyzico`,
  senaryolar `success/timeout/rate_limited/server_error`; ağ, credential, persistence
  ve ham provider sınırı yok. `secretKey/apiKey/.../cardNumber/cvv/pan/rawResponse`
  anahtarlarını reddeder (`secret_forbidden`).
- Canlı kapılar (merchant staging, mutabakat, refund/settlement, POS UAT, Paraşüt
  sandbox, mali müşavir kabulü) EXTERNAL_DEPENDENCY kalır; simülasyon sonucu
  canlı kanıt olarak sunulamaz.
- Kural: simülasyon UI'da "bağlı/ödeme alındı" gibi gösterilmez; R-10 NO-GO korunur.
