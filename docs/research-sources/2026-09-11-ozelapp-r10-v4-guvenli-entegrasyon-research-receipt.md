# OzelAPP R-10/V4 araştırma raporu kaynak kaydı

## Kaynak

- Kaynak dosya: `F:\Belgeler\OzelAPP_R10_V4_Guvenli_Entegrasyon_Wizard_Simulasyon_Arastirma_Raporu.md`
- SHA-256: `2B9FC8609B8E66D44361D5B694D47502C920262290BE3AD5CAA3D56B17E07C5B`
- Alınan tarih: `2026-09-11`
- Kullanım: R-10/V4 güvenli entegrasyon, upload, wizard, simülasyon ve release planı

## Kanıt ve kapsam kararı

Rapor, uygulama veya production kanıtı değil; birincil kaynaklara dayalı mimari ve release-gate girdisidir. Raporun kararları mevcut ürün sırasına şu şekilde bağlanır:

1. V1 iç kullanım ve form akışı korunur.
2. V2 first-party ödeme ve manuel fatura pilotu korunur.
3. V3 provider-neutral Paraşüt hazırlığı korunur; otomatik faturalama açılmaz.
4. R-10 ortak güvenlik/release kapısı olarak kalır.
5. V4 yalnız tenant-scoped BYO connection, entitlement, belge/medya ve simülasyon altyapısı olarak ilerleyebilir; canlı SaaS ve tenant adına para tahsilatı açılmaz.

## Araştırmadan alınan bağlayıcı kararlar

- `LOCAL_PASS` production kanıtı değildir.
- Dosya ve belge akışı quarantine-first olmalıdır: upload → quarantine → scan/verify → ready → in-use/archive.
- Secret, token, kart verisi ve ham provider yanıtı client, log, export, queue veya backup içine giremez.
- Connection yalnız server-side test, environment, capability ve kanıt kaydı sonrasında verified/enabled olabilir.
- Webhook imza, raw-body, replay, duplicate ve out-of-order kontrollerinden önce reducer’a ulaşamaz.
- Payment, invoice/document-ready ve mail üç ayrı state machine olarak kalır.
- Tenant scope server-side zorunludur; kullanıcıdan gelen tenant kimliği yetki kaynağı değildir.
- Local fake, contract test, sandbox ve staging ayrı kanıt sınıflarıdır; production mutasyonunu simüle eder ancak kanıtlamaz.
- R-10 P0 kapılarından biri eksikse production `NO-GO/BLOCKED` kalır.
- V4 production için R-10, provider, DNS/TLS, secret/KMS, AV/quarantine, mail, backup/restore, hukuk ve bağımsız inceleme kanıtları gerekir.

## Uygulama sınırı

Bu kayıt R-10 veya V4’ü production’da açmaz. Uygulama planı yalnız provider-neutral sözleşme, güvenli yerel wizard, sentetik test ve fail-closed release kanıtı üretebilir. Gerçek merchant/provider hesabı, gerçek müşteri belgesi, gerçek secret veya canlı veri kullanılmayacaktır.
