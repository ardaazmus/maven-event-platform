# F1-01 envanter (read-only)

- Datasource: `sqlite`, `env(DATABASE_URL)`; 49 model
- Mevcut: Workspace/WorkspaceMember, Form/FormVersion/FormField, Submission/SubmissionValue/SubmissionFile, PaymentOrder, Invoice*, Payment*, OutboxEvent
- Yok: Organization, Event/EventOccurrence, Person, Registration, Order/OrderItem, Payment/PaymentAllocation, Ticket
- Map notu: Workspace→Organization 1:1; Submission ham cevap korunur, registration ayrı aggregate olur
- Shadow plan: Postgres hedef şema + shadow migration F1-02'de; bu fazda schema/migration/veriye dokunulmadı
