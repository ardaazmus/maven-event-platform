# MavenForms → Maven Event Platform Ana Planı

**Rapor tarihi:** 17 Eylül 2026  
**İncelenen ana kaynak:** `mavenform-main-son.zip`  
**Amaç:** MavenForms'u kayıt/form ürünü sınırından çıkarıp Maven Event Platform'un güvenli çekirdeğine dönüştürmek; Event Floor Plan Studio ile ortak kavram, veritabanı sahipliği ve API/event sözleşmesi kurmak; manuel finans süreçlerinden canlı ödeme ve e-belgeye, en son da Multi-Tenant yapıya ilerlemek.


## Teknik envanter

Güncel ZIP'te 49 Prisma modeli, 70 API route handler, 389 TypeScript/TSX dosyası ve 456 adet `.mjs` test dosyası vardır. Test adlarında ödeme 75, fatura 77, badge 46, e-posta 36, Paraşüt 25 ve form UX 55 kez kapsanır; kategoriler çakışabilir. Kod tabanı küçük bir demo değildir.

## Korunacak güçlü parçalar

- Yayınlanmış form snapshot'ı ve public allowlist yaklaşımı.
- Workspace kapsamlı RBAC ve audit log temeli.
- PaymentOrder, PaymentAttempt, webhook inbox, retrieve/reconciliation ve idempotency sözleşmeleri.
- InvoiceRecipientSnapshot, line snapshot, belge quarantine/scan/decision ve delivery intent yaklaşımı.
- Transactional outbox, retry/lease/dead-letter düşüncesi.
- Dosya MIME/size/hash/archive bomb ve private visibility kontrolleri.
- Badge template, render, QR, PDF/ZIP, artifact ve READY-only dağıtım zinciri.
- Paraşüt bağlantı/sağlık/contact/product/invoice adapter hazırlıkları.

## Kritik sorunlar

| No | Seviye | Kod kanıtı | Etki | Gerekli değişiklik |
|---:|---|---|---|---|
| 1 | Kritik | `Submission.paymentStatus` yalnız string | Manuel tahsilat tutar, yöntem, tarih, referans, kanıt ve onay taşımaz. | Immutable PaymentEntry/Payment ledger. |
| 2 | Kritik | Manuel durum evaluator'ı `unpaid/paid/review/refunded`; API `pending/authorized/paid/failed/refunded/partially_refunded` | İki farklı ödeme dili vardır. | Tek kanonik ödeme durumu ve kaynak türü. |
| 3 | Kritik | Invoice candidate çoğunlukla `PaymentOrder.status=succeeded` ister | Manuel ödenmiş kayıt doğal biçimde fatura akışına giremez. | Order balance ve allocation tabanlı adaylık. |
| 4 | Yüksek | `InvoiceRecord.paymentOrderId @unique` | Avans, çoklu ödeme, iade faturası/credit note, replacement zinciri zorlaşır. | Invoice bağımsız aggregate + relation chain. |
| 5 | Yüksek | Form odaklı `PaymentOrder.formId` zorunlu | Sponsorluk, stand, konaklama, grup siparişi gibi form dışı kalemler finansı kullanamaz. | Order ve OrderItem ilk sınıf model. |
| 6 | Kritik | Event/Person/Registration/Ticket yok | Platform domain'i kurulmamış. | Canonical event core. |
| 7 | Yüksek | `OutboxEvent` form ve submission zorunlu | Floor plan, order, invoice, attendance event'leri genel outbox'ı kullanamaz. | Generic IntegrationOutbox. |
| 8 | Yüksek | Public submission idempotency `publicToken` global; payload hash yok | Aynı anahtar farklı form/payload ile sessiz duplicate olabilir. | Scope + request hash + stored response. |
| 9 | Yüksek | Response limit transaction öncesi `submissionCount` ile kontrol | Eşzamanlı istek kapasiteyi aşabilir. | DB transaction/lock veya inventory counter. |
| 10 | Yüksek | SQLite pilot tabanı | Finans eşzamanlılığı, worker ve gelecek RLS için zayıf hedef. | PostgreSQL migration rehearsal. |
| 11 | Yüksek | 30 günlük raw DB session token | Token sızıntısı ve iptal kontrolü riski. | Hashli session, kısa access, refresh rotation, explicit workspace. |
| 12 | Yüksek | İlk aktif workspace sessiz seçilir | Birden çok üyelikte yanlış bağlam riski. | Workspace/org claim ve kullanıcı seçimi. |
| 13 | Yüksek | `scripts/context-check.mjs`, bulunmayan `scripts/local-ready.mjs` ister | Resmî geliştirme kapısı güncel ZIP'te çalışmıyor; çok sayıda packet de aynı dosyaya bağlı. | Önce paket bütünlüğünü düzelt. |
| 14 | Orta | Package'da birleştirilmiş `test` scripti yok | 456 testin standart CI yürütümü belirsiz. | Tek kanonik runner ve CI matrisi. |
| 15 | Orta | STATUS `R10-V4-26-44 PASS` ve `R10-V4-44 WIP` der | Release gerçeği çelişkili. | Tek makine-okunur evidence registry. |
| 16 | Yüksek | Badge var, attendance/check-in domain'i yok | Badge scan adı dosya AV taramasıyla karışabilir; saha giriş kaydı yok. | CheckInEvent ve AccessPolicy. |
| 17 | Yüksek | Workspace tenant özellikleri erken büyümüş | Tek şirket çekirdeği bitmeden SaaS karmaşıklığı yaratıyor. | SaaS provisioning/release'i dondur, izolasyonu koru. |

## Yerel doğrulama sonucu

Seçili bağımsız testlerden `badge-contract`, `manual-payment-status`, `payment-state` ve `invoice-state` geçti. `invoice-manual-chain` doğrudan Node çalıştırmasında `@/lib` alias çözülmediği için çalışmadı; bu sonuç iş kuralı hatası kanıtı değildir, standart test harness eksikliğinin kanıtıdır. `context:check`, ZIP'te `scripts/local-ready.mjs` bulunmadığı için BLOCKED oldu. `node_modules` yoktu; build/lint/typecheck ve canlı servis çalıştırması yapılmadı.

## Release gerçeği

Repo'nun kendi `STATUS.md` dosyası üretimi `NO-GO/BLOCKED` olarak tanımlar. Canlı provider, AV/quarantine, sender domain, staging, backup/restore ve hukuk/muhasebe kanıtları olmadan “hazır” iddiası kurulamaz. Bu rapor da aynı ayrımı korur: sözleşme testi başarısı, gerçek tahsilat veya yasal e-belge gönderimi değildir.
