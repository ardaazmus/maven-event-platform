# R-10/V4 bağımsız inceleme hazırlık paketi

Bu belge bağımsız güvenlik, hukuk/muhasebe, provider ve operasyon incelemesine
hazırlık içindir. Local receipt veya test sonucu review imzası, pilot onayı ya da
production release kanıtı değildir.

## İnceleme kapsamı

İnceleme V1 iç kullanım form sınırlarını, V2 first-party ödeme ve manuel fatura
pilotunu, V3 provider-neutral hazırlığı ve V4 tenant/BYO sınırlarını ayrı ayrı
değerlendirir. V4 canlı SaaS, tenant adına tahsilat, otomatik fatura ve production
provider mutation bu paketin kapsamı değildir.

## Kanıt kullanım kuralı

| Kanıt türü | Kullanım | Review imzası yerine geçer mi? |
|---|---|---|
| `LOCAL_PASS` receipt | Sözleşme/test/build/readiness davranışının yerel kanıtı | Hayır |
| Sandbox/sentetik fixture | Normalize state ve failure davranışı provası | Hayır |
| Dış doğrulanmış kanıt | Owner tarafından redacted ve hash’li teslim | Hayır; bağımsız review gerekir |
| Bağımsız review kararı | Kontrolün kapsam, yöntem ve bulgularının onayı | Evet, yalnız imzalanan kontrol için |

Hiçbir review paketi secret, token, PAN/CVV, PII, raw provider payload, gerçek
backup içeriği, geçici private URL veya canlı erişim bilgisi taşımaz. Kanıt dosyası
gerekiyorsa yalnız redacted kopya ve SHA-256 özeti paylaşılır.

## Kontrol matrisi

| ID | Kontrol | Beklenen kanıt sahibi | Yerel referans | Durum |
|---|---|---|---|---|
| IR-01 | Tenant/workspace/form/submission/document/asset scope ve IDOR/BOLA | Güvenlik incelemesi | `R10-V4-32` | OPEN_REVIEW |
| IR-02 | External URL, SSRF, redirect ve callback state güvenliği | Güvenlik + deployment | `R10-V4-33` | OPEN_REVIEW |
| IR-03 | Secret, token, PAN/CVV, PII ve raw provider redaction | Güvenlik | `R10-V4-34`, `R10-V4-42` | OPEN_REVIEW |
| IR-04 | Upload magic, MIME, boyut, polyglot, arşiv ve aktif içerik | AV/KMS sorumlusu | `R10-V4-35` | EXTERNAL_DEPENDENCY |
| IR-05 | Payment → invoice → document-ready → mail korelasyonu | Ürün sahibi + provider | `R10-V4-36` | EXTERNAL_DEPENDENCY |
| IR-06 | Worker lease, retry, duplicate, DLQ ve quarantine | Operasyon | `R10-V4-37` | OPEN_REVIEW |
| IR-07 | Backup checksum, disposable restore, migration ve readiness | DevOps | `R10-V4-38` | EXTERNAL_DEPENDENCY |
| IR-08 | Support break-glass ticket, MFA, TTL, read-only ve revoke | Güvenlik + ürün sahibi | `R10-V4-39` | OPEN_REVIEW |
| IR-09 | Provider/merchant, webhook, retrieve/refund/reconciliation | Ödeme hesabı sahibi | `R10-V4-40` | EXTERNAL_DEPENDENCY |
| IR-10 | Tenant entitlement, BYO connection ve V4 live sınırı | Ürün sahibi + güvenlik | `R10-V4-41` | OPEN_REVIEW |
| IR-11 | Kanıt owner, sınıf, expiry, SHA-256 ve karar ayrımı | Her kanıt sahibi | `R10-V4-42` | OPEN_REVIEW |
| IR-12 | Legal/DPA, mali müşavir, e-belge/GİB ve sender-domain | Hukuk/muhasebe/domain yöneticisi | R-10 P0 registry | EXTERNAL_DEPENDENCY |

## Review yürütme sırası

1. Bağımsız reviewer kapsamı ve tehdit modelini onaylar; scope dışı talep yeni
   kayıt olmadan pakete eklenmez.
2. Her kontrol için owner, environment, evidence class, expiry ve redacted
   artifact hash doğrulanır; `unknown`, `blocked`, `expired` veya hash’siz kayıt
   PASS’a yükseltilmez.
3. Reviewer kod/receipt ile dış kanıtı birbirinden bağımsız karşılaştırır.
4. Bulgu varsa severity, etkilenen sınır, tekrar adımı ve düzeltme önerisi
   secretsiz yazılır; canlı düzeltme bu paketten yapılmaz.
5. Restore ve provider testleri yalnız disposable/sandbox ortamında yapılır.
6. Reviewer imzası ve çözülmüş P0 kayıtları olmadan release kararı değiştirilmez.

## Açık karar

```text
R-10 production: NO-GO / BLOCKED
V4 live BYO/SaaS: DEFERRED / BLOCKED
productionMutationAllowed: false
Review hazırlığı: LOCAL_PASS, bağımsız inceleme tamamlanmış değil
```

Bu paket gerçek provider, AV/KMS, DNS/TLS, sender-domain, backup/restore,
GİB/mali müşavir/hukuk veya tenant erişimi açmaz.
