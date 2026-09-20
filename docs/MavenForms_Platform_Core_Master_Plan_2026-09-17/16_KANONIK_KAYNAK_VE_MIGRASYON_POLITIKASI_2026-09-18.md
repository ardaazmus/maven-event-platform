# MavenForms → Maven Event Platform
## Kanonik kaynak, eski belge izolasyonu ve yeni iş akışı politikası

**Tarih:** 18 Eylül 2026  
**Durum:** Normatif çalışma politikası  
**Kapsam:** Root dokümanları, agent yönlendirmesi, workflow packet’leri, release kayıtları ve ürün iş akışı  
**Kanonik kaynak klasörü:** `docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/`

## 1. Tek normatif kaynak

MavenForms artık yalnız form hazırlama ve kayıt alma ürünü olarak yürütülmez. Ürün alanı, bu klasördeki ana planın kurduğu Maven Event Platform modelidir.

Bu klasörün dosyaları birlikte şu sırayı ve kapsamı tanımlar:

```text
Organization
  → Event
    → EventOccurrence / Venue / Program
      → FormDefinition + EventFormBinding
        → Person + Registration
          → Ticket / Order / Payment / Invoice
            → Credential / Badge
              → Check-in / Attendance
                → Floor Plan / Inventory / Assignment
                  → Reports / Communication / Integrations
                    → F8 Event Modules
                      → F9 Multi-Tenant gate
```

Kural:

- Root’taki eski roadmap, execution plan, checklist veya worklog bu domain modelini daraltamaz.
- Eski bir belge “form” kelimesini ürünün tamamı anlamında kullanıyorsa bu tarihsel bağlamdır; yeni işte Event Platform modeli esas alınır.
- Bir eski belgede yeni ana planla çelişen bir kapı varsa, çelişen eski kapı engel değildir; karar `11_YOL_HARITASI.md`, `12_GELISTIRME_KONTROL_SISTEMI.md`, `13_RISK_VE_KARAR_KAYDI.md` ve güncel `STATUS.md` ile verilir.

## 2. Okuma sırası

Her görevde minimum okuma:

1. `AGENTS.md`
2. `PROJECT_CONTEXT.md`
3. `STATUS.md`
4. İlgili READY packet
5. Packet’in `reads` alanı
6. Bu klasörde görevle ilgili ana plan dosyası
7. Doğrudan import/call site ve testler

Ürün kararında öncelik:

1. Bu klasördeki ana plan ve karar dosyaları
2. Güncel kod ve test kanıtı
3. Güncel workflow receipt/evidence registry
4. Resmî dış kaynaklar
5. `docs/legacy/root-docs/**` ve tarihsel worklog

Son madde yalnız geçmişi anlamak, neden kaydı veya geriye dönük kanıt için okunabilir; yeni işi yönetemez.

## 3. Eski dosyaların statüsü

Eski root belgeleri silinmez. Birebir kopyaları `docs/legacy/root-docs/` altında tutulur. Root’ta aynı isimle kalan dosyalar kısa compatibility bridge olarak yalnızca kanonik kaynağa yönlendirir.

Legacy belge:

- yeni feature kapsamı oluşturamaz;
- yeni faz sırası belirleyemez;
- yeni packet’i bloke edemez;
- mevcut Event/Person/Registration/Order/Payment/Invoice/Credential/Floor Plan modelini değiştiremez;
- eski “tamamlandı”, “GO”, “live”, “ready” ifadeleriyle güncel kanıt üretemez;
- yalnızca tarihsel karar, eski test beklentisi veya geçmiş uygulama kaydıdır.

Legacy kayıt ile güncel kanıt çelişirse güncel kod, test, registry ve bu klasördeki plan kazanır.

## 4. Yeni iş akışı

Yeni ürün işi aşağıdaki sırayla yürür:

### A. Domain kapısı

İşin sahibi belirlenir:

- Identity/Organization
- Event Core
- Forms
- Registration/Person
- Commerce/Payments
- Invoicing/Documents
- Onsite/Credential/Check-in
- Floor Plan/Inventory
- Messaging
- Event Modules
- Multi-Tenant

Aynı kavram başka tablo veya route ile taklit edilemez. `Submission`, Person veya Registration yerine kullanılamaz.

### B. Faz kapısı

Kanonik sıra:

```text
F0 Gerçeklik ve paket bütünlüğü
→ F1 Tek şirket Event Core
→ F2 Sipariş ve manuel ödeme
→ F3 Manuel fatura kontrolü
→ F4 İç pilot ve onsite
→ F5 Floor Editor entegrasyonu
→ F6 Canlı ödeme
→ F7 Otomatik fatura/e-belge
→ F8 Event modülleri
→ F9 Multi-Tenant son kapı
```

Bir sonraki faz, önceki fazın çıkış kanıtı olmadan production özelliği olarak açılamaz. Bu, kanıtlanabilir teknik bağımlılık kapısıdır; eski form dokümanlarında bulunan ek bir bloklayıcı liste bu sıraya eklenemez.

### C. Packet kapısı

Yeni runnable packet şunları taşımalıdır:

- `status: READY`
- `timeboxMinutes: 15`
- `sourceOfTruth: docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/`
- tek ölçülebilir çıktı
- `previous`
- `reads`
- `allowedFiles`
- `acceptance`
- `preflight`
- `checks`

`sourceOfTruth` olmayan veya başka planı normatif kaynak gösteren packet yeni iş için çalıştırılamaz.

### D. Kanıt kapısı

Her sonuç kanıt sınıfıyla raporlanır:

- `SOURCE_CONFIRMED`: kod/plan/test metni doğrudan doğrulandı;
- `LOCAL_PASS`: yerel test veya workflow kontrolü geçti;
- `PILOT_PASS`: kontrollü iç pilot/saha kanıtı;
- `EXTERNAL_DEPENDENCY`: provider, AV, sender, hukuk, muhasebe veya staging bekleniyor;
- `UNVERIFIED`: kanıt bulunamadı;
- `NO_GO`: production açılması yasak.

`LOCAL_PASS` hiçbir zaman `PILOT_PASS`, `EXTERNAL_DEPENDENCY` çözümü veya production onayı değildir.

## 5. Özellik kaybını önleme

Yeniden düzenleme sırasında mevcut özellikler kapatılmaz veya sessizce silinmez. Her mevcut feature için şu tablo tutulur:

| Feature | Yeni domain sahibi | UI yüzeyi | API/contract | Kanıt | Karar |
|---|---|---|---|---|---|
| Form builder | Forms | Event form / Forms | FormDefinition | test + source | korunur |
| Public form snapshot | Forms/Public | public registration | allowlist snapshot | contract | korunur |
| Submission | Forms intake | Registration detail içindeki cevaplar | submission route | source/test | ham kayıt korunur |
| Person | Event Core | People | Person API | source/test | canonical yapılır |
| Registration | Registration | Registrations | Registration API | source/test | canonical yapılır |
| Payment/manual invoice | Commerce/Finance | Finance & Documents | payment/invoice | local/external ayrımı | korunur, ayrı UI |
| Badge | Onsite/Credential | Badge Studio | template/generation | local/external ayrımı | event’e taşınır |
| Check-in | Onsite | Check-in | check-in API | saha ayrıca gerekir | korunur/geliştirilir |
| Floor Plan | Floor module | Floor Plan | binding/assignment | EFPS sahibi | duplicate owner yok |
| WordPress/embed | Public delivery | Publish/Share | embed route | source/test | korunur |
| Notifications/outbox | Messaging | Communication | outbox/delivery | source/test | korunur |
| RBAC/audit | Identity/Governance | Team/Audit | policy/audit | source/test | korunur |

Bir özellik yeni UI’da görünmüyorsa bu özellik kaybolmuş sayılmaz; önce yeni domain sahibi ve deep link’i tanımlanır. Backend feature’ın tamamlanması ayrıca kanıtlanır.

## 6. Root dosyaları için kural

Root bootstrap dosyaları kısa yönlendirme katmanıdır:

- `AGENTS.md`: çalışma kuralları ve okuma sırası;
- `PROJECT_CONTEXT.md`: sistem sınırı ve görev routing;
- `STATUS.md`: güncel durum ve release kanıt sınırı;
- `CLAUDE.md`, `GEMINI.md`, `.github/**`, `.cursor/**`: adapter;
- diğer eski root planları: compatibility bridge veya legacy referans.

Bir ajan root’ta eski uzun plan bulursa onu otomatik olarak normatif kabul etmez. Önce bu klasöre ve packet’in `sourceOfTruth` alanına döner.

## 7. Arayüz kuralı

Kullanıcı arayüzü Form-first değil Event-first çalışır:

- Event seçilmeden event-owned kayıt, badge, check-in veya floor mutation başlatılamaz.
- Formlar event’e bağlanabilir ama Event’in yerine geçemez.
- Submission ham cevap kaydıdır; Person, Registration, Ticket veya Payment yerine kullanılamaz.
- Finance, Documents, Badge, Check-in ve Floor Plan Forms listesine gömülmez; ayrı modül ekranına bağlanır.
- UI’da gösterilen bir buton backend yetkisi, idempotency, scope, audit ve kanıt olmadan “çalışıyor” sayılmaz.

## 8. Değişiklik ve geri dönüş

Bu politika eski kayıtları silmez. Değişiklik yapılırken:

1. mevcut dirty worktree korunur;
2. arşiv kopyası doğrulanır;
3. yalnız packet `allowedFiles` değişir;
4. uygulama koduna dokunulmadıysa bunu açıkça raporlanır;
5. context-check ve packet verify çalıştırılır;
6. gerekiyorsa bağımsız review açılır.

Bu dosya ürün özelliklerinin kendisini değil, hangi dosyanın yeni işe hükmedeceğini belirler.
