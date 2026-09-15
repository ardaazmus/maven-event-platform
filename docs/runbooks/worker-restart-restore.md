# Worker restart ve restore provası

Bu runbook yalnız disposable/staging bir kopyada uygulanır. Production verisi üzerinde
silme, reset, `db push --accept-data-loss` veya canlı provider çağrısı yapılmaz.

## Güvenli prova sırası

1. Worker’ı kontrollü durdur ve mevcut process/log kimliğini kaydet. Outbox ve invoice
   satırlarını değiştirme.
2. Veritabanını uygulama durumu sabitken ayrı bir backup dosyasına kopyala ve SHA-256
   checksum üret. Gerçek secret, token veya PII backup çıktısına/log’a yazılmaz.
3. Backup’ı disposable restore yoluna kopyala; yalnız restore ortamının `DATABASE_URL`
   değerini bu kopyaya yönlendir. Production `.env` değerlerini paylaşma veya commit etme.
4. Restore ortamında `prisma migrate deploy` çalıştır ve ardından `/api/ready` yanıtının
   `status=ready` ve `db=ok` olduğunu doğrula. Migration hatasında worker başlatılmaz.
5. Restore edilmiş outbox içinde `status=sending` ve `lockedUntil` geçmişte olan
   sent olmayan sentetik bir kayıt bırak. Worker’ı yeniden başlat; kayıt yeniden claim
   edilmeli, yeni lease almalı ve aynı idempotency anahtarıyla sürmelidir.
6. Aynı worker’ı ikinci kez çalıştır. `InvoiceDeliveryIntent` unique fence nedeniyle
   ikinci intent/outbox oluşmamalı; sonuç `duplicate` veya mevcut tek teslimat olmalıdır.
7. Worker beklenen biçimde bitmeden restore kopyasını temizleme. Hata varsa snapshot’ı
   koru, provider çağrısını durdur ve `reconciliation_required` olarak raporla.
8. Başarılı disposable prova kanıtını checksum, migration sonucu, readiness sonucu,
   claim/duplicate sayaçları ve zaman damgası ile redacted olarak kaydet.

## Kabul ölçütü

- Expired `sending` lease yeniden claim edilir; aktif lease başka worker tarafından
  alınmaz.
- Restart veya restore tekrarında invoice/document delivery için ikinci intent/outbox
  oluşmaz.
- Backup checksum ve restore readiness doğrulanmadan recovery tamamlandı sayılmaz.
- Bu yerel sözleşme gerçek production backup, gerçek provider teslimatı veya hukuki/mali
  kabul kanıtı değildir.
