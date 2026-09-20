# MavenForms kanonik workflow ve context sistemi

## Kaynak hiyerarşisi

1. `docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/` — tek normatif ürün/domain/faz kaynağı.
2. `AGENTS.md`, `PROJECT_CONTEXT.md`, `STATUS.md` — kısa root yönlendirme katmanı.
3. READY packet — görev kapsamı ve izinli dosyalar.
4. Kod, test, receipt ve evidence registry — gerçek mevcut kanıt.
5. `docs/legacy/root-docs/`, tarihsel planlar ve worklog — yalnız referans.

Legacy kaynaklar yeni işi bloke edemez, yeni faz sırası koyamaz veya local kanıtı production kanıtına çeviremez.

## Görev başlangıcı

1. `AGENTS.md`, `PROJECT_CONTEXT.md`, `STATUS.md` oku.
2. Git durumunu kontrol et; dirty worktree’yi koru.
3. `docs/workflow/packets/*.json` içinden `status: READY`, 15 dakika ve `sourceOfTruth` değeri master-plan klasörü olan packet’i seç.
4. Packet `reads`, `allowedFiles`, `acceptance`, `preflight` ve `checks` alanlarını doğrula.
5. `node scripts/workflow.mjs begin docs/workflow/packets/<ID>.json` çalıştır.
6. Yalnız ilgili kaynakları ve doğrudan bağımlılıkları oku.

## Packet kuralları

Packet tek ölçülebilir çıktı taşır. `sourceOfTruth` aşağıdaki değer olmalıdır:

`docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/`

Superseded packet’ler tarihsel olarak parse edilebilir ama çalıştırılamaz. Değişiklik yalnız `allowedFiles` kapsamındadır. `begin` baseline’dır; `verify` gerçek checks çalıştırmadan PASS değildir.

## Kanıt dili

- `SOURCE_CONFIRMED`: doğrudan kaynak kanıtı
- `LOCAL_PASS`: yerel check/test
- `PILOT_PASS`: kontrollü pilot
- `EXTERNAL_DEPENDENCY`: dış kanıt bekleniyor
- `UNVERIFIED`: doğrulanamadı
- `NO_GO`: production kapalı

`LOCAL_PASS` release onayı değildir.

## Context politikası

Uzun plan ve worklog otomatik context’e yüklenmez. İlgili packet `reads` alanında veya doğrudan doğrulama ihtiyacında okunur. Eski root planları `docs/legacy/root-docs/` altında korunur; yeni görev için normatif değildir.
