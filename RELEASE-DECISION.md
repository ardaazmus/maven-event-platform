# MavenForms güncel release karar köprüsü

> **CURRENT GATE / NON-NORMATIVE PRODUCT SOURCE:** Domain ve iş akışı için master plan klasörü; release kanıt özeti için bu kısa köprü ve `STATUS.md` kullanılır.

Özgün karar kaydı:

- [`docs/legacy/root-docs/RELEASE-DECISION.md`](docs/legacy/root-docs/RELEASE-DECISION.md)

## Güncel karar

**NO-GO / production-live açılışı kapalıdır.** Gerçek provider, AV/quarantine, sender-domain, staging, backup/restore ve hukuk/muhasebe kanıtları tamamlanmadan ödeme, fatura teslimi, Paraşüt veya SaaS production özelliği açılmaz.

Bu karar Event Platform domainini bloke etmez; yalnız kanıtı olmayan production mutation’larını kapatır. Yerel sözleşme/test sonucu `LOCAL_PASS` olabilir, fakat `PILOT_PASS`, `EXTERNAL_DEPENDENCY` çözümü veya production GO değildir.

## Korunan release sınırları

- R-10 final release gate: `NO-GO`.
- V1 iç kullanım ve V2 güvenli local/staging geliştirme devam edebilir.
- iyzico/diğer provider, Paraşüt/GİB ve mali müşavir kanıtı ayrı kapıdır.
- public snapshot allowlist sınırı korunur.
- media upload private, auth/scope, outbox, E2E ve backup restore kanıtları ayrı kontrol edilir.
- WordPress/embed yüzeyi public snapshot sınırını aşamaz.
- SaaS subscription billing ve tenant end-customer collection açık değildir.

## Korunan tarihsel kapı adları

`V2-09A first-party çıkış kapısı`, `V3-05 Paraşüt otomatik faturalama çıkış kapısı` ve `V4-07 SaaS release ve tenant isolation kapısı` tarihsel kanıt zincirinde korunur. Bu adların korunması, ilgili capability’nin production’da açık olduğu anlamına gelmez.

## Kanıt kontrol başlıkları

build network, public snapshot, media upload private, WordPress, outbox, E2E ve backup restore başlıkları ayrı kanıt olarak izlenir. Gerçek provider veya staging kanıtı yoksa karar `NO-GO` kalır.

Platform ile tenant son-müşteri tahsilatı ayrıdır: **tenant adına end-customer para tutmaz**. Live provider, backup/restore ve legal/DPA kanıtı olmadan V4 production açılmaz.

Bu dosyadaki özet yeni ürün domainini tanımlamaz. Yeni domain/iş sırası yalnız [`MavenForms Platform Core Master Plan`](docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/00_OKU_BENI.md) ve ilgili packet ile belirlenir.
