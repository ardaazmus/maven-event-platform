# 05 — PaymentOrder ve Mutabakat Derin Araştırması

**Erişim tarihi:** 3 Eylül 2026

## Doğrudan sonuç

Tek bir ödeme `status` alanı finansal gerçeği doğru modellemez. Tahsilat yaşam döngüsü, iade, dispute ve provider/banka mutabakatı bağımsız eksenler olmalıdır. Tarayıcı dönüşü yalnız kullanıcı deneyimi sinyalidir; doğrulanmış provider webhook/retrieve sonucu ve mutabakat kayıtları finansal otoritedir.

## Önerilen çok eksenli model

| Alan | Değerler | Anlam |
|---|---|---|
| `payment_phase` | `created`, `requires_method`, `requires_action`, `processing`, `requires_capture`, `succeeded`, `failed`, `canceled` | Tahsilatın provider-normalize yaşam döngüsü |
| `refund_phase` | `none`, `pending`, `partial`, `full`, `failed`, `canceled` | Tahsilat kaydını silmeden iade sonucu |
| `dispute_phase` | `none`, `needs_response`, `under_review`, `won`, `lost` | Chargeback/itiraz süreci |
| `settlement_phase` | `unreconciled`, `provider_matched`, `payout_matched`, `exception` | Provider ledger ve banka/payout eşleşmesi |

Kullanıcı promptundaki `refunded`, `partially_refunded`, `disputed` görünür birleşik statüler bu eksenlerden türetilir; `payment_phase=succeeded` geçmişi üzerine yazılmaz.

## Durum geçişleri

| Mevcut | Olay/kanıt | Yeni | İzin | Yan etki |
|---|---|---|---|---|
| `created` | Checkout yaratıldı | `requires_method` / `processing` | Evet | Provider reference yaz |
| `requires_method` | Müşteri yöntem sundu | `requires_action` / `processing` | Evet | Fulfillment yok |
| `requires_action` | 3DS tamamlandı | `processing` / `succeeded` / `requires_method` | Provider kanıtıyla | Sonucu bekle |
| `processing` | Doğrulanmış başarılı nesne | `succeeded` | Tutar/currency/order eşleşirse | Tek fulfillment outbox |
| `processing` | Kesin provider failure/cancel | `failed` / `canceled` | İş kuralına göre | Kullanıcıya operasyon bildirimi |
| `succeeded` | Partial refund succeeded | `payment_phase` aynı, `refund_phase=partial` | Yetkili/auditli | Ledger ve bildirim |
| `succeeded`/`partial` | Toplam refund=tahsilat | `refund_phase=full` | Evet | Ledger ve bildirim |
| `succeeded` | Dispute created | `dispute_phase=needs_response` | Evet | Kanıt son tarihi işi |
| Herhangi | Eski/sırasız event | Geriye geçiş yok | Retrieve sonrası reducer | No-op/audit |

`failed` her provider deneme hatasında otomatik terminal yapılmamalıdır; Stripe örneğinde tekrar ödeme yöntemi istenebilir. İş siparişi ile provider payment attempt ayrı kayıtlardır.

## Webhook–frontend yarışları

Callback önce gelirse UI “doğrulanıyor” gösterir ve server retrieve başlatabilir; webhook önce gelirse `PaymentOrder` zaten günceldir. İki yol aynı reducer ve aynı fulfillment idempotency anahtarını kullanır. Webhook, imza doğrulandıktan sonra `(tenant_id, provider_account_id, provider_event_id)` tekilliğiyle append-only inbox’a yazılır. Aynı nesne ve event type farklı event ID’lerle gelebileceğinden bu ikinci kombinasyon gözlem sinyalidir; kör unique constraint olmamalıdır.

Provider event oluşturma zamanı sıralama garantisi değildir. Geç veya şüpheli olayda provider nesnesi API’den yeniden okunur. Inbox yazıldıktan sonra hızlı `2xx`; uzun iş queue worker’da yürür.

## Para ve idempotency

Tutar `int64 amount_minor + ISO 4217 currency` olarak saklanır; binary float kullanılmaz. Para birimi exponent/özel durum tablosu sürümlü adapter verisidir. Provider’dan gelen amount’ın internal order total ile aynı currency ve exact minor-unit değerde olması gerekir. Aksi halde `exception`.

Her logical mutation idempotency anahtarı ve request hash’iyle kaydedilir. Ağ timeout’unda aynı body + aynı key retry edilir. `conversationId` gibi korelasyon alanı, sağlayıcı açıkça garanti etmedikçe idempotency değildir.

## Günlük ve refund mutabakatı

İki ayrı eşleme yapılır:

1. İç order/attempt/refund/dispute ↔ provider payment/refund/dispute ledger.
2. Provider balance transaction/settlement ↔ payout/banka hareketi.

Gerekli alanlar: tenant, provider account, internal order/attempt, provider payment/transaction/refund/dispute, balance transaction/payout, currency, gross, fee, net, occurred/available/settled time. Günlük job son birkaç günü kayan pencerede yeniden tarar; kesin pencere settlement SLA’sına göre belirlenir.

| İstisna | Tespit | İşlem |
|---|---|---|
| Orphan payment | Provider kaydı var, iç order yok | Otomatik fulfillment yok; inceleme kuyruğu |
| Duplicate provider ID | Bir provider payment birden fazla order’a bağlı | P0 alarm, işlemleri dondur |
| Eksik/fazla ödeme | Amount/currency uyuşmuyor | `exception`; manuel onay olmadan fatura yok |
| Bekleyen/başarısız refund | Refund ledger yakınsamıyor | Retry/sorgu; yeni kör refund yok |
| Payout mismatch | Gross-fee-net/banka farklı | Finans inceleme, immutable adjustment |

## Resmi kaynak kanıtı

| Kaynak | Kurum | URL | Bölüm | Karar |
|---|---|---|---|---|
| PaymentIntent lifecycle | Stripe | https://docs.stripe.com/payments/paymentintents/lifecycle | Statuses | Normalize tahsilat fazları |
| Webhooks | Stripe | https://docs.stripe.com/webhooks | Duplicates/order/retries | Inbox, dedupe, retrieve |
| Idempotent requests | Stripe | https://docs.stripe.com/api/idempotent_requests | Key reuse/parameters | Mutation retry |
| Supported currencies | Stripe | https://docs.stripe.com/currencies | Minor units | Integer para modeli |
| Payout reconciliation | Stripe | https://docs.stripe.com/reports/payout-reconciliation | Gross/fee/net/IDs | İki aşamalı mutabakat |
| Reporting Service | iyzico | https://docs.iyzico.com/en/advanced/reporting-service | Payment/refund reports | iyzico ledger girdisi |
| Settlement Files | iyzico | https://docs.iyzico.com/en/advanced/settlement-files | Fee/payout references | Banka/payout eşleşmesi |

## Karar kaydı

**Karar:** PaymentOrder tahsilat, iade, dispute ve settlement eksenlerine ayrılacak; tüm provider olayları tenant-bağlı inbox ve idempotent reducer ile işlenecek.  
**Durum:** ACCEPTED  
**Bağlı ana faz:** 2  
**Bağımlılıklar:** Provider webhook/retrieve, settlement/report erişimi, queue ve değişmez audit store.  
**Sektörel gerekçe:** Ödeme, iade, chargeback ve payout farklı zamanlarda ve tekrar/sırasız olaylarla ilerler.  
**Kaynak:** Stripe lifecycle/webhook/idempotency/currency/reconciliation; iyzico reporting/settlement.  
**Teknik gerekçe:** Bağımsız eksenler geçmişi korur ve idempotent yakınsamayı mümkün kılar.  
**Güvenlik etkisi:** Sahte callback, duplicate fulfillment/refund ve tenant/account karışması azalır.  
**Maliyet/karmaşıklık:** Orta-yüksek; ledger, queue, exception UI ve finans operasyonu gerekir.  
**Yanlış uygulanırsa risk:** Çifte teslim/iade, kayıp gelir, yanlış fatura ve açıklanamayan banka farkı.  
**Minimum uygulanabilir çözüm:** Çok eksenli order + event inbox + provider retrieve + günlük order/provider reconciliation.  
**İleride genişletme yolu:** Payout/banka otomatik eşleme, dispute evidence ve risk skorlama.

RESEARCH COMPLETE — READY FOR ARCHITECTURE REVIEW
