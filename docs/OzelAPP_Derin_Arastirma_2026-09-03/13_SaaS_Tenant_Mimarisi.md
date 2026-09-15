# 13 — SaaS Tenant Mimarisi Derin Araştırması

**Erişim tarihi:** 3 Eylül 2026  
**Faz sınırı:** Ürünleştirme ve abonelik faz 9’dadır. Geri dönüşü pahalı tenant/secret veri sınırı önceki fazlarda veri modeline işlenebilir; SaaS davranışı erkene alınmaz.

## Kimlik, workspace ve yetki

Global `User`; ayrı `Workspace/Tenant`; ikisi arasında status ve permission set içeren `Membership` kullanılır. Başlangıç rolleri kolay anlaşılır olsa da authorization açık permissionlarla çalışır:

| Rol | Varsayılan yetki | Yasak/ayrı onay |
|---|---|---|
| Owner | Ownership, billing, credential lifecycle, tenant deletion | Step-up/MFA ve ikinci onay |
| Admin | Üye, form, integration yönetimi | Ownership/deletion/billing varsayılan değil |
| Editor | Form/media/draft/publish | Credential plaintext, üye ve billing yok |
| Viewer | Form/stats/responses read | Full export ayrı `responses:export` |

Her request’te deny-by-default, server-verified user+membership+tenant context ve exact resource permission gerekir. Client tenant ID yalnız selector’dır; opaque UUID authorization değildir.

## Veri izolasyonu

Shared PostgreSQL modelinde her tenant-owned tabloda `tenant_id NOT NULL`; foreign key/unique/index tenant ile bileşiktir; RLS default-deny uygulanır. Request DB rolü superuser, table owner veya `BYPASSRLS` olmamalıdır. Tenant context transaction-local ayarlanır ve pool reuse test edilir. Regülasyon veya yüksek risk gerektiren tenant için hybrid/ayrı database seçeneği gelecekte mümkündür.

RLS yalnız DB’yi kapsar. Cache key, queue/job payload, idempotency key, search index, object prefix, export ve audit de tenant kimliği taşır. Background job server-verified tenant context olmadan çalışmaz. Cross-tenant negative test matrisi her resource+operation için zorunludur.

## Provider ve fatura bağlantıları

Her tenant kendi Stripe/iyzico/Paraşüt hesabını bağlar; OzelAPP tenant müşteri ödemesini kendi merchant hesabına yönlendirmez. `ProviderConnection` tenant, provider, environment, external account/company, capability ve credential reference taşır. Secret plaintext DB/UI/log/export/audit’te bulunmaz; secret manager/KMS’te tenant+provider encryption context ile tutulur. Context’e müşteri adı/PII yazılmaz çünkü KMS audit logunda görünebilir.

OAuth refresh rotasyonu atomiktir; disconnect local disable/revoke + provider-side revoke runbook’udur. Support kullanıcısı secret göremez veya kopyalayamaz. Provider hesabı değişikliği yeni connection version ve açık audit gerektirir.

## Abonelik askıya alma ve reactivation

`PROVISIONING → ACTIVE → SUSPENDED_READ_ONLY → REACTIVATING → ACTIVE`; iptalde `CANCELLED_RETAINED → DELETION_SCHEDULED → DELETED` ayrı süreçtir.

`SUSPENDED_READ_ONLY`:

- Dashboard okuma ve yetkili response Excel export açık.
- Yeni form oluşturma, edit, publish, delete ve integration/provider mutation kapalı.
- Public form yeni submission kabul etmez; kullanıcıya geçici kullanılamaz mesajı/ürünce seçilen HTTP davranışı döner.
- Veri ve secret silinmez. Queue işleri quiesce edilir; history event’leri reactivation’da tekrar oynatılmaz.

Reactivation entitlement ve provider health kontrolünden sonra son published snapshot’ları atomik açar. Tenant silme askıdan farklıdır: export, session/API key revoke, cooling/retention/legal hold, backup kapsamı ve açık owner onayı gerekir.

## Support erişimi ve impersonation

Kullanıcı parolası/session cookie’si alınmaz. Support erişimi ayrı support identity ile ticket/reason, exact tenant/resource, tenant onayı veya açık politika, süre sonu, varsayılan read-only ve görünür banner taşır. Her erişim append-only audit’e düşer. Write gereksinimi ayrı step-up/onaydır; billing/credential/deletion gibi işlemler support modunda varsayılan yasaktır. “Impersonation” yerine delegated support session terimi ve gerçek aktör+temsil edilen user ikilisinin loglanması tercih edilir.

## Export, retention ve audit

Export ayrı permission, step-up, amaç, filtre/satır sayısı, oluşturma ve download audit’i gerektirir; dosya kısa ömürlü, tenant-scoped ve şifrelidir. Audit tenant, gerçek actor, delegated actor, action, target, time, correlation, result ve reason içerir. Merkezi audit store olabilir, fakat tenant read’i scoped; platform cross-tenant okuma explicit permission’dır.

Retention/deletion active store, cache, object versions, replicas, exports ve backups’ı kapsar. Yasal saklama ve legal hold silme politikasından ayrılır. Askı veri retention süresini otomatik başlatmaz; cancellation/offboarding başlatabilir.

## Kaynak kanıtı

| Kaynak | Kurum | URL | Bölüm | Karar |
|---|---|---|---|---|
| Multi-Tenant Application Security | OWASP | https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html | Context, DB, storage, audit, offboarding | Tenant-scope model |
| Authorization Cheat Sheet | OWASP | https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html | Least privilege/default deny/every request | Permission modeli |
| Row Security Policies | PostgreSQL | https://www.postgresql.org/docs/current/ddl-rowsecurity.html | Default deny/bypass roles | RLS sınırı |
| Secrets Manager best practices | AWS | https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html | KMS/TLS/rotation/least privilege | Secret store |
| KMS encryption context | AWS | https://docs.aws.amazon.com/kms/latest/developerguide/encrypt_context.html | AAD/audit visibility | Tenant+provider bağlama |
| Access Transparency | Google Cloud | https://cloud.google.com/security/products/access-transparency | Ticket/request/approval/access | Support audit prensibi |

## Karar kaydı

**Karar:** SaaS faz 9’da açılacak; tenant-scoped veri/RLS/cache/queue/object/secret/audit sınırları ve read-only askı yaşam döngüsü uygulanacak.  
**Durum:** DEFERRED  
**Bağlı ana faz:** 9; yalnız geri döndürülemez `tenant_id`/secret boundary altyapısı önce modellenir  
**Bağımlılıklar:** Abonelik/entitlement kararı, KMS/secret manager, DB RLS, provider OAuth, retention/hukuk ve support policy.  
**Sektörel gerekçe:** Multi-tenant izolasyon tek bir query filtresi değil tüm veri/iş kuyruğu/depolama/operasyon zinciridir.  
**Kaynak:** OWASP Multi-Tenant/Authorization, PostgreSQL RLS, AWS Secrets/KMS, Google Access Transparency.  
**Teknik gerekçe:** Server-verified context ve permission tabanlı model tenant karışmasını ve rol büyümesini kontrol eder.  
**Güvenlik etkisi:** Cross-tenant erişim, secret ifşası ve görünmez support erişimi azaltılır.  
**Maliyet/karmaşıklık:** Yüksek; policy coverage, negative tests, secret lifecycle ve offboarding gerekir.  
**Yanlış uygulanırsa risk:** Tenant veri/ödeme/fatura karışması, veri kaybı, yetkisiz impersonation ve regülasyon ihlali.  
**Minimum uygulanabilir çözüm:** Tenant/membership/permission + RLS + tenant-scoped object/job/cache + KMS secret + suspend-read-only/export.  
**İleride genişletme yolu:** Hybrid database isolation, fine-grained ABAC, JIT support approval ve automated offboarding.

RESEARCH COMPLETE — READY FOR ARCHITECTURE REVIEW
