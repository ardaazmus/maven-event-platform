# R-10B — Ödeme/fatura askısı ve ayrı e-posta kanalları

**Karar tarihi:** 2026-09-06  
**Durum:** `ACCEPTED / SUSPENDED_BY_R10`  
**Kapsam:** Plan ve güvenlik sözleşmesi; canlı provider veya production aktivasyonu değildir.

## 1. Kararın anlamı

R-10 dış kanıtları tamamlanmadığı için ödeme alma, fatura oluşturma/formalizasyonu ve fatura teslimatı canlıda açılmaz. Bu bir iptal veya geri alma değildir; mevcut yerel sözleşmeler, testler, migration’lar ve güvenlik kapıları korunur. R-10 tekrar değerlendirildiğinde yalnız kanıtları doğrulanmış akış açılabilir.

Bu karar ana sırayı değiştirmez:

```text
PAY → INV/F manuel → Paraşüt API v4 → document security/document-ready
→ gerekli transactional delivery/mail → pilot → FORM-UX → SAAS/BILL
```

R-10 kapalıyken sonraki release/pilot fazı açılmış sayılmaz. Bağımsız geliştirme yapılabilse bile ödeme, fatura, e-posta teslimatı veya release kapısını bypass edemez.

## 2. İki e-posta kanalının zorunlu ayrımı

Form kayıt bilgi e-postaları ile fatura e-postaları aynı ürün özelliği, aynı şablon alanı veya aynı teslimat niyeti değildir.

| Kanal | Mesaj sınıfı | Tetikleyici | Kaynak | Gönderen profili |
|---|---|---|---|---|
| Form kayıt bildirimi | `notification` | Başarılı form kaydı ve etkin form bildirimi | `Submission` + form notification ayarı | Form/operasyon bildirim profili |
| Fatura teslimatı | `transactional` | `issued` + doğrulanmış `document_ready` | `InvoiceRecord` + private temiz belge + alıcı snapshot | Ayrı fatura/billing profili |

Tek bir mail provider hesabı kullanılabilir; ancak şu kimlikler yine de ayrı olmalıdır:

- ayrı `messageClass`, template namespace ve queue/outbox policy;
- ayrı `senderProfileId`, `fromAddress` ve mümkünse ayrı `replyToAddress`;
- ayrı provider connection/secret reference veya en azından ayrı yetki kapsamı;
- ayrı idempotency/event anahtarı, retry, rate-limit ve suppression kararı;
- ayrı audit action ve teslimat/başarısızlık ekranı.

Önerilen kimlikler `forms@...`/`notify@...` ve `billing@...` şeklindedir. Bu adresler örnektir; doğrulanmamış bir domain veya adres varsayılan olarak etkinleştirilemez. Fatura mailinde form bildirimi metni, kampanya veya pazarlama içeriği bulunamaz.

Bir kanalın provider arızası diğer kanalın kuyruğunu veya durumunu değiştiremez. Form bildirimi başarısı fatura hazır olduğu anlamına gelmez; fatura mailinin gönderilmesi de fatura düzenlendiği anlamına gelmez.

## 3. Fatura göndereni için fail-closed kapı

Fatura sender profili aşağıdaki koşulların tamamı sağlanmadan `enabled/live` olamaz:

1. R-10 dış kanıtları `PASS` olmalı: gerçek payment sandbox, Paraşüt/GİB veya muhasebe kanıtı, AV/quarantine, transactional provider, staging/TLS ve backup/restore kanıtları.
2. Fatura kaynağı aşağıdakilerden biri olarak açıkça seçilmiş olmalı:
   - **Manuel muhasebe:** export → muhasebe işlemi → yetkili import/upload → dry-run → explicit approve/apply → belge eşleşmesi.
   - **Paraşüt API v4:** bağlantı/şirket kapsamı, OAuth/token sağlığı, contact/product, sales invoice, e-Fatura/e-Arşiv job ve document retrieval zinciri doğrulanmış olmalı.
3. Fatura kaydı `issued`, belge `private + quarantined + clean` ve karar `document_ready` olmalı.
4. Alıcı, form kaydı sırasında alınan fatura snapshot’ından server-side çözülmeli; browser payload’ı veya sonradan değişen profil fatura kanıtı sayılamaz.
5. Gönderici domaini ve TLS/provider health doğrulanmış olmalı; suppression ve geçerli alıcı kontrolleri geçmeli.

Eksik herhangi bir koşulda sonuç `SUSPENDED_BY_R10`, `accounting_review_required` veya sınıflandırılmış `blocked` olur. UI’de buton görünse bile server bu kararı yeniden doğrular; yalnızca UI’de disabled olması güvenlik kontrolü değildir.

## 4. Hesap ve ayar modeli

Aynı workspace içinde iki sender profili bulunabilir, fakat fatura profili form notification ayarından türetilmez:

```text
Workspace
 ├─ FormNotificationProfile / notification delivery
 └─ InvoiceDeliveryProfile / billing delivery
      ├─ manual_accounting | parasut_v4 source
      ├─ senderProfileId
      ├─ providerConnectionRef
      └─ r10Gate: suspended | verified
```

Fatura ayar ekranı; seçilen fatura yöntemini, sender profilini, `R-10 bekleniyor` durumunu ve eksik kapıları açıklamalıdır. Secret, token, PAN/CVV, PII ve provider raw response ekranda veya audit kaydında gösterilmez.

## 5. Uygulama ve doğrulama kuralları

- Public form yalnız form snapshot’ı ve write-only submission çağrısını kullanır; invoice sender, provider credential, müşteri listesi ve fatura belgesi public’e açılmaz.
- Fatura queue’su yalnız `InvoiceDeliveryIntent` üretir; form notification queue’su yalnız submission notification intent üretir.
- İki kanalın duplicate koruması farklı idempotency anahtarları kullanır.
- `accepted` provider cevabı `delivered` veya inbox placement kanıtı değildir; provider event’leri ayrı normalize edilir.
- Fatura teslimatında hard bounce/complaint/suppression sonrası sınırsız retry yapılmaz; güvenli manuel aksiyon gerekir.
- Bu rehber Mailchimp Marketing veya campaign özelliğini açmaz. Transactional fatura sağlayıcısı ile marketing sağlayıcısı ayrı değerlendirilir.

## 6. R-10 açma sırası

1. Dış kanıt rehberindeki her rol için redacted evidence teslim edilir.
2. R-10 final gate yeniden çalıştırılır; eksik tek kanıt varsa `NO-GO` korunur.
3. Önce seçilen manuel muhasebe veya Paraşüt zinciri staging’de gerçek test kimliğiyle doğrulanır.
4. Fatura sender profili yalnız doğrulanmış kaynak ve `document_ready` ile etkinleştirilir.
5. Form notification kanalı ayrı bir test alıcısıyla doğrulanır.
6. İki kanalın isolation, retry, suppression, audit ve public-boundary regresyonları çalıştırılır.
7. Pilot ve release kararı ayrıca verilir; R-10’un açılması tek başına production release değildir.

Bu belge bir canlı gönderim izni vermez. Dış kanıtlar tamamlanana kadar güvenli beklenen sonuç fatura gönderiminin kapalı olmasıdır.

**Yerel doğrulama notu:** Bu mikro-faz yalnız karar, kanal izolasyonu ve fail-closed politika kanıtıdır; gerçek provider hesabı, gerçek alıcı veya gerçek fatura gönderimi kanıtı değildir.
