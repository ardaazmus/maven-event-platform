# EF-01-DOMAIN — Domain ve Sahiplik Sözlüğü + Çelişki Raporu

**Tarih:** 2026-09-19 | **Packet:** EF-01-DOMAIN | **Önceki:** EF-00-MAPPING (LOCAL_PASS)
**Normatif kaynak:** `docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/05,06`

## 1. Kanonik zincir (sabit)

```text
Organization(=Workspace 1:1) → Event → Occurrence/Venue → FormBinding
→ Person/Registration → Ticket/Order/Payment/Invoice
→ Credential/Badge → Check-in → Floor Plan → Reports → F8 modules → F9 gate
```

Kök nesne entegre modda `Event`'tir. `Submission` ham cevap kaydıdır; Person/Registration/Ticket/Payment/Invoice
yerine kullanılamaz (kodda `Submission` modeli ayrıdır; F1-17 projeksiyonu tx-içi ve binding-gated'dır).

## 2. Kavram ayrımları (sabit)

| Kavram | Tanım | Sahip | Kod durumu |
|---|---|---|---|
| Form (FormDefinition hedef adı) | Soru şeması + versiyon + snapshot | Maven Forms | MEVCUT (`Form`, `FormVersion`, `FormField`) |
| Genel Form (hedef mod) | Event gerektirmeyen bağımsız form | Maven Forms | YOK (mod alanı yok) → EF-03 |
| Etkinlik Kayıt Formu (hedef mod) | Event'siz publish edilemeyen kayıt formu | Maven Forms | YOK (yalnız binding var) → EF-03 |
| EventFormBinding | Form↔Event bağı, purpose=registration/survey | Maven Event Core | MEVCUT (model + `events/[id]/bindings`) |
| Submission | Ham cevap + dosya, source=web/embed/api/import | Maven Forms | MEVCUT |
| RegistrationIntake (hedef) | Tüm kaynakların ortak validation/dedup/idempotency/audit sözleşmesi | Maven Intake | YOK (yalnız F1-17 inline projeksiyon) → EF-04 |
| ExternalParticipantImport (hedef) | CSV/XLSX/API dış katılımcı hattı, intake'e dönüşür | Maven Intake | YOK (kavram yok) → EF-04 |
| Person | Tek gerçek kişi | Maven People | MEVCUT |
| Registration | Kişinin event'e katılım başvurusu + history | Maven People | MEVCUT (`submitted/pending_review/confirmed/...`) |
| Ticket | Verilmiş katılım hakkı (registration 1:1) | Maven People | MEVCUT (TicketType YOK, bkz. çelişki 2) |
| Credential | QR kimliği (ticket 1:1) | Maven Onsite | MEVCUT |
| BadgeSubject (hedef) | Badge üretiminin snapshot girdisi (canlı veri değil) | Maven Badge | KAVRAM YOK; snapshot contract kısmen mevcut (`badge-snapshot-contract.ts`) → F4 |
| CheckInEvent | Giriş/çıkış hareketi (gate/device/operator/occurredAt) | Maven Onsite | MEVCUT (online; offline deferred) |
| FloorPlanBinding | EFPS plan referansı (externalPlanId+version) | Maven (referans); EFPS (gerçek) | MEVCUT (adapter yok) → EF-07 |
| InventoryHold | Süreli tokenlı ayırma | Maven (EFPS sözleşmesine bağlı) | MEVCUT (model+route) → EF-07 |

## 3. Modül sahiplik ve çalışma modu

| Modül | Veri sahibi | Integrated | Standalone | Mevcut kanıt |
|---|---|---|---|---|
| Event Core | Maven | evet | hayır | routes `events/*`, `Event/Occurrence`, testler mevcut |
| Forms & Intake | Maven | evet (event formu) | evet (Genel Form hedefi) | Form/Submission mevcut; mod ayrımı EF-03 |
| Registration & People | Maven | evet | hayır | Person/Registration/Ticket/Credential + route/test mevcut |
| Commercial (Order/Payment/Invoice) | Maven | evet | hayır | Order/Payment/Invoice zinciri + ledger mevcut |
| Badge | Maven | evet | hayır | PDF-only zincir mevcut; PNG/JPEG gap |
| Check-in | Maven | evet | saha cihazı ayrı istemci | online mevcut; offline/replay yok |
| Floor Plan | EFPS (geometry/inventory); Maven (referans) | görünüm | EFPS ayrı app | binding/mapping/hold mevcut; adapter EF-07 |
| F8 (program/abstract/sponsor/survey/network) | Maven | evet | hayır | modeller + `events/[id]/*` route'ları mevcut |
| Mobile | — (gerçeklik üretmez) | hayır | saha istemcisi | contract yok → EF-08 (DEFERRED) |
| Tenant/Entitlement | Maven Platform | evet | hayır | workspace scope + `release-module.ts`/`tenant-entitlement.ts` kısmen mevcut → EF-06/F9 |

## 4. Mevcut kaynakla çelişki raporu (plan §06 vs kod)

1. **Organization/Workspace — UYUMLU.** Plan 1:1 map öngörür; kod `Workspace` kullanır, tüm event/finance
   modelleri `workspaceId` scope'ludur. Karar: ACCEPTED (yeniden adlandırma yok).
2. **TicketType — GAP.** Plan §06 çekirdek modelde `TicketType` vardır; `src`+`schema.prisma` regex taramada
   `TicketType|ticketType` 0 eşleşme; `Ticket` doğrudan `registrationId @unique` bağlıdır. Karar: REVISE —
   EF-04/F2 kapsamında katalog ihtiyacı ayrıca değerlendirilir, şimdilik Ticket korunur.
3. **FormDefinition adı — KABUL EDİLEN FARK.** Plan hedef adı `FormDefinition`; kod `Form`. Davranış farkı
   yoktur. Karar: SIMPLIFIED — yeniden adlandırma yapılmaz.
4. **Submission.paymentStatus — GEÇİŞ BEKLİYOR.** Plan "kaldırılacak projection" der; kodda alan mevcuttur.
   Karar: DEFERRED — F2/F6'da projection'a taşınır, şimdilik silinmez.
5. **PaymentOrder/InvoiceRecord ikiliği — GEÇİŞ BEKLİYOR.** Plan `Order+PaymentAttempt` ve `Invoice` hedefler;
   kodda eski+yeni modeller yan yanadır. Karar: DEFERRED — migration kararı F2/F3/F7 kapılarında.
6. **RegistrationIntake/BadgeSubject/ExternalParticipantImport — HEDEF KAVRAM.** Kodda 0 eşleşme; bu sözlükle
   tanımlanmıştır, implementasyon EF-04/F4 işidir. Karar: ACCEPTED (kavram), kod sonra.
7. **Module manifest — KISMEN MEVCUT.** `release-module.ts` (reason/scope), `tenant-entitlement.ts`,
   `v4-tenant-capability-gate.ts` mevcuttur; EF-06 manifest şeması (moduleId/version/requiredPermissions/
   supportedModes/input/output/feature-state) olarak yoktur. Karar: REVISE — mevcut gate'ler korunur, manifest EF-06'da eklenir.

## 5. Dış bağımlılık / risk

- Yeni dış bağımlılık yok. R-10 NO-GO korunur. Bu packet kod değiştirmez.

## 6. Sıradaki packet

- EF-02-EVENT-SETUP (Event oluşturma API/UI + setup readiness), `previous: [EF-01-DOMAIN]`.
