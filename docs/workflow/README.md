# MavenForms AI çalışma ve context sistemi

Bu klasör, uzun sohbet geçmişini ve tekrar tekrar okunan büyük belgeleri görev paketlerine ayırır. Kanonik çalışma kuralları kökteki `AGENTS.md` içindedir; `PROJECT_CONTEXT.md` kısa mimari yönlendiricidir; `STATUS.md` yalnız güncel durumdur.

## Bir görev nasıl başlar?

1. `docs/workflow/packets/*.json` içinden ilgili `status: READY` paketi seçilir.
2. Paket `reads` alanındaki dosyalar açılır. Doğrudan import/call site veya güvenlik sınırı gerekiyorsa ek okuma yapılabilir ve kanıt olarak kaydedilir.
3. `node scripts/context-check.mjs` ile yönlendirme dosyaları ve kaynak yolları doğrulanır.
4. `node scripts/workflow.mjs begin docs/workflow/packets/<ID>.json` baseline alır ve önceki LOCAL_PASS kayıtlarını kontrol eder.
5. Değişiklik yalnız `allowedFiles` kapsamında yapılır.
6. `node scripts/workflow.mjs verify docs/workflow/packets/<ID>.json` gerçek checks komutlarını çalıştırır, kaynak hashlerini ve yalnız değişen dosyaları kaydeder.

`begin` fazı tamamlamaz; baseline’dır. `verify` sonucu yalnız `LOCAL_PASS` olabilir. Bağımsız review, gerçek provider/sandbox ve release kararı ayrı kapılardır.

## Context katmanları

| Katman | Ne zaman okunur? | Boyut amacı |
| --- | --- | --- |
| `AGENTS.md`, `PROJECT_CONTEXT.md`, `STATUS.md` | Her görev | Kısa ve stabil |
| görev packet’i + hedef kaynaklar | Her görev | En küçük ilgili yüzey |
| plan/araştırma raporları | İlgili domain veya çelişki varsa | Progressive disclosure |
| `worklog.md` ve tarihsel arşiv | Karar geçmişi veya kanıt takibi gerekiyorsa | Otomatik bootstrap dışında |

İhtiyaç halinde proje geneline bakmak serbesttir. Bu, context katmanını büyütme izni değil; doğru kararı vermek için kontrollü ek okumadır.

## IDE uyumluluğu

- Codex/OpenCode: `AGENTS.md`.
- Cursor: `.cursor/rules/mavenforms-core.mdc`.
- GitHub Copilot/VS Code: `.github/copilot-instructions.md` ve `.github/instructions/mavenforms.instructions.md`.
- Claude Code: `CLAUDE.md`.
- Gemini: `GEMINI.md`.

Bu dosyalar kısa adapter’dır; ayrıntılı kurallar kopyalanmaz. IDE kuralı okunmadığında veya araç kendi kural formatını kullanıyorsa `node scripts/workflow.mjs` zorunlu dış doğrulama olarak çalıştırılır.

## Kaynak arşivi

`docs/OzelAPP_Derin_Arastirma_2026-09-03/` anonim araştırma paketidir. `docs/Anonim_Teknik_Mimari_API_ve_Uygulama_Sozlesmesi.md` ve `docs/OzelAPP_Anonim_Entegrasyon_ve_Release_Arastirmasi.md` tamamlayıcı kaynaklardır. Kök planlar tarihsel/uygulama kayıtlarıdır; aynı metni yeni MD’lere kopyalama.
