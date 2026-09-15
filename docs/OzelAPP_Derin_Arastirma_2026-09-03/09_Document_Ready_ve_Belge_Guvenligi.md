# 09 — Document-ready ve Belge Güvenliği Derin Araştırması

**Erişim tarihi:** 3 Eylül 2026

## `document_ready` tanımı

`document_ready`, “provider bir URL döndürdü” değildir. Aşağıdaki koşullar tek bir dayanıklı iş akışında başarıyla tamamlanmalıdır:

1. Provider issuance job `done` veya eşdeğer doğrulanmış terminal başarıdadır.
2. Kanonik belge byte’ları OzelAPP backend’i tarafından indirilmiştir.
3. PDF ve gereken imzalı UBL/XML elde edilmiştir; eksik format doğrulama seviyesinde görünürdür.
4. Extension, MIME, magic/signature ve güvenli parser doğrulaması geçmiştir.
5. Malware/sandbox taraması geçmiştir.
6. Dosya tenant-bağlı, yeni version/key ile immutable depoya yazılmıştır.
7. SHA-256, byte size, provider/GİB ID, belge no/tarih ve kaynak kaydedilmiştir.
8. Görüntüleme ve gereken imza/schema doğrulama sonucu vardır.
9. Audit olayı kalıcıdır; ancak belge içeriği/token/secret logda değildir.

## Durum makinesi

`received/generated → quarantined → scanning → validating → stored_immutable → verified → document_ready`

`rejected` ve `error` ayrı terminal/yeniden deneme sonuçlarıdır. `superseded` veya `canceled` orijinali değiştirmez; yeni belge/olay ilişkisi kurar. Durum güncellemesi ile outbox/audit aynı transaction’da yazılır.

## Dosya doğrulama

- İzinli tür listesi: iş akışına göre PDF, XML/UBL; genel “her dosya” yok.
- `Content-Type` veya uzantıya tek başına güvenilmez; magic bytes ve parser kullanılır.
- XML’de external entity/DTD/network kapatılır; boyut, derinlik ve entity expansion sınırı uygulanır.
- PDF aktif içerik/ek/script politikası belirlenir; malware/CDR aracı risk bazlıdır.
- Kullanıcı dosya adı object key olmaz; Unicode/path traversal temizlenir, sunucu random key üretir.
- Quarantine objesi document download rolüne görünmez; başarısız örnek retention sonunda silinir.

## Değişmezlik, hash ve imza

Her resmi sürüm yeni object key/version ile yazılır; overwrite yasaktır. SHA-256 byte değişikliğini tespit eder fakat mali mühür/NES’nin hukuki özgünlük rolünün yerine geçmez. Hash kaydı belge metadata’sı ve audit zincirinde yer alır. Object Lock/WORM kullanılacaksa versioning zorunludur; governance bypass edilebilir, compliance modunda retention bitmeden root dahil silme mümkün olmayabilir. Mod ve süre geri döndürmesi zor karar olduğundan hukuk/retention onayı gerekir.

## Süreli indirme ve audit

Paraşüt’ün bir saatlik PDF URL’si kullanıcıya verilmez. OzelAPP exact tenant+document+version+method için kısa ömürlü GET yetkisi üretir. Signed URL bearer credential’dır: URL’de PII yok, TLS zorunlu, log/referrer sızıntısı sınırlandırılmış, isteğe göre tek kullanım veya server-side revoke vardır. Çok hassas belgede indirme öncesi oturum/step-up gerekir.

Audit: tenant, actor, action, document/version, önceki/yeni durum, timestamp, correlation, sonuç, IP/user-agent. İndirme olayı success/failure ve recipient context taşır; token veya belge içeriği taşımaz.

## Tenant izolasyonu ve retention

Object path/policy `tenant_id` içerir; client’tan gelen tenant yalnız selector’dır, server membership ile doğrulanır. Presign servisi exact object authorization olmadan URL üretmez. Export job’ları da tenant-scoped ve süreli çıktıdır.

Vergisel immutable kaydın retention’ı ile geçici quarantine/cache/email kopyalarının retention’ı ayrıdır. Hukuki sebep sona erdiğinde KVKK silme/yok etme/anonimleştirme süreci çalışır; diğer kanunların saklama yükümlülükleri saklıdır. Backup/object versions/legal hold dahil uçtan uca envanter gerekir.

## Güvenlik test tablosu

| Risk | Senaryo | Koruma | Test kanıtı | Öncelik |
|---|---|---|---|---|
| Cross-tenant belge | Tenant A, B object ID dener | Server tenant policy + random ID | A isteği `404/403`, presign oluşmaz | P0 |
| Sahte tür/XXE | XML diye zararlı payload | Magic/parser/XXE off/limit | Parser network açmaz; quarantine | P0 |
| Geçici URL sızıntısı | Provider URL e-postaya yazılır | Backend download + kendi URL’si | Public DTO/log taramasında provider URL yok | P0 |
| Overwrite | Aynı key’e yeni belge yazılır | Version/new key/immutable policy | Yazma reddedilir; eski hash aynı | P0 |
| Malware | Zararlı PDF import edilir | Quarantine + AV/sandbox | Download görünmez; rejected audit | P1 |
| Token replay | Süreli link tekrar kullanılır | TTL/audience/revoke/opsiyonel one-time | Politika sonrası ikinci kullanım reddedilir | P1 |

## Kaynak kanıtı

| Kaynak | Kurum | URL | Bölüm | Karar |
|---|---|---|---|---|
| File Upload Cheat Sheet | OWASP | https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html | Type/name/storage/AV | Upload doğrulama |
| Multi-Tenant Security Cheat Sheet | OWASP | https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html | Storage/object authorization | Tenant scope |
| S3 Object Lock | AWS | https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html#object-lock-overview | WORM/versioning/modes | Değişmezlik mekanizması |
| Presigned URLs | AWS | https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html | Bearer/time limits | Süreli indirme |
| Paraşüt Swagger | Paraşüt | https://apidocs.parasut.com/swagger.json | e-document PDF | Geçici provider URL sınırı |
| KVKK silme/yok etme/anonimleştirme | KVKK | https://www.kvkk.gov.tr/Icerik/8363/Kisisel-Verilerin-Silinmesi-Yok-Edilmesi-Veya-Anonim-Hale-Getirilmesi | Retention end | Silme politikası |

## Karar kaydı

**Karar:** Belge yalnız doğrulanıp tarandıktan, hash’lenip tenant-bağlı immutable depoya alındıktan ve audit kaydı yazıldıktan sonra `document_ready` olacak.  
**Durum:** ACCEPTED  
**Bağlı ana faz:** 5  
**Bağımlılıklar:** Provider document-ready kanıtı, XML/PDF erişimi, AV/parser, object store/KMS, hukuk onaylı retention.  
**Sektörel gerekçe:** Geçici URL veya okunabilir PDF resmi belgenin bütünlük ve saklama kanıtı değildir.  
**Kaynak:** OWASP upload/multitenant, AWS Object Lock/presigned URL, Paraşüt Swagger, KVKK.  
**Teknik gerekçe:** Quarantine→validate→immutable state machine yanlış/zararlı/eksik belge teslimini keser.  
**Güvenlik etkisi:** Tenant sızıntısı, malware, overwrite ve bearer link riskleri azaltılır.  
**Maliyet/karmaşıklık:** Orta-yüksek; tarama, doğrulama, WORM ve audit operasyonu gerekir.  
**Yanlış uygulanırsa risk:** Zararlı/bozuk belge teslimi, resmi asıl kaybı, yanlış tenant erişimi ve saklama ihlali.  
**Minimum uygulanabilir çözüm:** Backend download + allowlist/AV/XML güvenliği + SHA-256 + immutable version + süreli own-domain link.  
**İleride genişletme yolu:** İmza/Schematron otomasyonu, compliance WORM ve tenant’a özel retention/legal hold.

RESEARCH COMPLETE — READY FOR ARCHITECTURE REVIEW
