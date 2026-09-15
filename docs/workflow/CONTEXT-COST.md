# Context maliyeti ve okuma politikası

Bu kayıt, context optimizasyonunun ölçüm sınırını belirtir. Token hesabı yaklaşık olarak UTF-8 karakter sayısının dörde bölünmesiyle yapılır; model tokenizer ölçümü değildir.

Son yerel ölçüm: 2026-09-05.

| Katman | Yaklaşık karakter | Varsayılan okuma |
| --- | ---: | --- |
| `AGENTS.md` | 2.950 | Her görev |
| `PROJECT_CONTEXT.md` | 2.914 | Her görev |
| `STATUS.md` | 1.358 | Her görev |
| `docs/workflow/README.md` | 2.517 | Ajan workflow görevi |
| `worklog.md` | 208.863 | Yalnız tarihsel kanıt/karar gerektiğinde |
| Ana planlar ve araştırma raporları | Göreve bağlı | Yalnız ilgili packet `reads` veya doğrudan bağımlılık |

Yeni kısa bootstrap katmanı yaklaşık 9.739 karakter, yani 2.435 token eder. Eski worklog tek başına yaklaşık 52.216 token eder. Bu karşılaştırma, çalışma ağacındaki dosya içerikleri değiştikçe yeniden ölçülmelidir.

## Okuma kararı

Önce kısa bootstrap, sonra görev packet’i, sonra hedef dosya ve doğrudan import/call site. Güvenlik, veri modeli, provider sözleşmesi veya release kararı bütün sistemin incelenmesini gerektiriyorsa ajan proje geneline bakabilir. Bu geniş okuma gerekçesi ve okunan yollar kanıta eklenir; tüm arşiv otomatik context’e yüklenmez.

## Saklama kararı

Planlar, araştırma raporları ve worklog korunur. Tarihsel metinler kısa dosyalara kopyalanmaz. Yeni karar önce `STATUS.md` veya ilgili planın güncel durumuna, kalıcı gerekçe ilgili araştırma/karar belgesine yazılır.

## Doğrulama

`node scripts/context-check.mjs` kısa katmanı, packet yollarını, manifest bağımlılıklarını ve adapterları kontrol eder. `node scripts/workflow.mjs begin <packet>` önceki kanıtı ve baseline’ı kontrol eder. `verify` en az bir kapsam içi değişiklik, gerçek checks komutları, kapsam sınırı ve kaynak hashleri olmadan geçmez.
