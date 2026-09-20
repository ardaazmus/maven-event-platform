# ADR-0006 F8 modül sırası

Varsayılan sıra (iç müşteri talebiyle seçilir): Program/Speaker → Abstract/Review → Sponsor/Exhibitor/Booth → Surveys/Certificates → Networking/Lead Retrieval → Accommodation/Travel → Attendee Mobile.

- Program/Speaker çekirdekte başladı (F8-01/02).
- Her modül önce event core, permission, API, event ve analytics sözleşmesini tanımlar.
- Talep gelmeden modül kodu yazılmaz.
