# MavenForms → Maven Event Platform Ana Planı

**Rapor tarihi:** 17 Eylül 2026  
**İncelenen ana kaynak:** `mavenform-main-son.zip`  
**Amaç:** MavenForms'u kayıt/form ürünü sınırından çıkarıp Maven Event Platform'un güvenli çekirdeğine dönüştürmek; Event Floor Plan Studio ile ortak kavram, veritabanı sahipliği ve API/event sözleşmesi kurmak; manuel finans süreçlerinden canlı ödeme ve e-belgeye, en son da Multi-Tenant yapıya ilerlemek.


## Sektör ve standart kaynakları

- [Cvent — Online Event Registration Software](https://www.cvent.com/)
- [Cvent — Managing Payment Methods](https://support.cvent.com/s/communityarticle/Managing-Your-Payment-Methods)
- [Cvent — Recording Offline Payments](https://support.cvent.com/s/communityarticle/Processing-Offline-Payments)
- [Cvent — Importing Offline Payments](https://support.cvent.com/s/communityarticle/Importing-Offline-Payments)
- [Cvent — Applying Partial Payments](https://support.cvent.com/s/communityarticle/Applying-Partial-Payments)
- [Cvent — Online and Offline Orders](https://support.cvent.com/s/communityarticle/What-is-the-difference-between-online-and-offline-orders)
- [Cvent — Registration and Event Diagramming integration](https://release.cvent.com/)
- [EventsAir — Platform Overview](https://www.eventsair.com/)
- [Swoogo — Platform Overview](https://swoogo.events/platform/)
- [Swoogo — Integrations](https://swoogo.events/integrations/)
- [Swoogo Developer Documentation](https://developer.swoogo.com/)
- [Swapcard — Event Platform](https://www.swapcard.com/)
- [Swapcard — Exhibitor Center](https://www.swapcard.com/features/exhibitor-center)
- [Eventleaf — Event Management](https://www.eventleaf.com/)
- [Seats.io — Hold Token](https://docs.seats.io/docs/renderer/config-holdtoken/)
- [Seats.io — Book Objects](https://docs.seats.io/docs/api/book-objects/)
- [Seats.io — Release Objects](https://docs.seats.io/docs/api/release-objects/)
- [iyzico — Refund & Cancel](https://docs.iyzico.com/)
- [PCI SSC — SAQ A e-commerce eligibility clarification](https://blog.pcisecuritystandards.org/faq-clarifies-new-saq-a-eligibility-criteria-for-e-commerce-merchants)
- [Stripe — Idempotent Requests](https://docs.stripe.com/api/idempotent_requests)
- [Stripe — Webhooks](https://docs.stripe.com/webhooks)
- [Microsoft — Transactional Outbox Pattern](https://learn.microsoft.com/en-us/azure/architecture/databases/guide/transactional-out-box-cosmos)
- [OWASP — API Security Top 10 2023](https://api-security.owasp.org/editions/2023/en/0x11-t10/)
- [PostgreSQL — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [GİB — e-Fatura İptal/İtiraz Portalı](https://ebelgebasvuru.gib.gov.tr/)
- [Paraşüt — Tahsilat Makbuzu](https://www.parasut.com/)
- [Kişisel Verileri Koruma Kurumu](https://www.kvkk.gov.tr/)

## İncelenen repo kanıtları

Ana dosyalar: `prisma/schema.prisma`, `src/lib/auth.ts`, `src/lib/policy.ts`, `src/lib/manual-payment-status.ts`, public submission route, payment state/webhook/retrieve kodu, invoice candidate/snapshot/document/delivery kodu, badge sözleşmeleri, `AGENTS.md`, `STATUS.md`, `PROJECT_CONTEXT.md`, workflow packet'leri ve script'ler.

Floor Editor tarafında `prisma/schema.prisma`, `PROJECT_CONTEXT.md`, API route envanteri, Event/Venue/Hall/EventPlan/Company/Attendee/Seating modelleri incelendi.

## Sınırlar

- Kaynak ZIP'te bağımlılıklar yoktu; tam build/lint/typecheck yapılmadı.
- Canlı Stripe/iyzico/Paraşüt, SMTP, AV, object storage veya GİB çağrısı yapılmadı.
- Vergi, e-belge ve KVKK kararları hukuk/mali müşavir onayı gerektirir.
- Event Floor Plan Studio incelemesi çalışma alanındaki public repo kopyasına dayanır; yeni MavenForms ZIP'i yalnız MavenForms için güncel kaynak kabul edilmiştir.
- Süre tahminleri ekip büyüklüğü, mevcut test borcu ve provider erişimine göre değişir.
