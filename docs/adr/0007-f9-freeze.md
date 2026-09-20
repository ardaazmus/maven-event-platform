# ADR-0007 F9 freeze (D-10)

- Provisioning, tenant self-service, custom domain, tenant billing, BYO provider bu fazda AÇILMAZ.
- SQLite dev'de workspace scope negatif testleri kilitlidir (events/persons/orders/payments/invoices/holds).
- PostgreSQL RLS default-deny, F1-02 shadow planındaki Postgres kapısında uygulanır.
- SaaS UI/backlog donduruldu; isolation hygiene (organization scope, unique keylerde organization) yeni tablolarda korunur.
