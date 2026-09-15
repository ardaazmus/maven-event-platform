# MavenForms çalışma kuralları

Bu dosya kısa giriş kapısıdır. Her görevde tamamını yeniden okumak yerine önce görev yönlendirmesini, sonra yalnız ilgili kaynakları aç.

## Başlangıç sırası

1. `PROJECT_CONTEXT.md` içindeki görev yönlendirmesini oku.
2. `STATUS.md` içindeki güncel faz ve blocker durumunu kontrol et.
3. `git status --short` ile mevcut kullanıcı değişikliklerini koru.
4. Göreve ait `docs/workflow/packets/*.json` paketini bul; `status: READY`, 15 dakika, allowed files, reads, acceptance ve checks alanlarını doğrula.
5. Önce `node scripts/workflow.mjs begin <packet>` ile baseline al; web/e2e kontrolü olan paketlerde `node scripts/local-ready.mjs` ile `localhost:3000` ve DB readiness bekle; sonra yalnız paketin `reads` ve doğrudan import/call site bağımlılıklarını oku.

## Zorunlu uygulama kuralları

- Ana teknik faz sırası değişmez: PAY → manuel fatura → Paraşüt → belge güvenliği → gerekli transactional teslimat → pilot → FORM-UX → SAAS. Ürün çıkışları bu teknik bağımlılığı koruyarak V1 Maven iç kullanım formları → V2 Maven first-party ödeme + manuel fatura → V3 Paraşüt otomasyonu → V4 tenant’ın kendi bağlantılarını kullandığı SaaS şeklindedir; yeni fikirler bu sırayı değiştiremez.
- Yeni fikir doğrudan kod kapsamı değildir. Mevcut faza `ACCEPTED`, `SIMPLIFIED`, `DEFERRED` veya `REJECTED` kararıyla bağlanır.
- Bir mikro-faz tek ölçülebilir çıktı ve en fazla 15 dakika olmalıdır. Büyüyen işi böl; eksik işi tamamlandı sayma.
- Önceki faz kilitleri doğrulanmadan yeni faz başlamaz. `scripts/phase-gate.mjs` ve `scripts/workflow.mjs` kurallarını atlama.
- Değişiklik yalnız implementation packet içindeki dosyalarda yapılır. Gerekli yeni dosya pakete eklenmeden yazılmaz.
- Input, auth, tenant/workspace, idempotency ve public/private sınırları server tarafında doğrulanır. UI görünmesi işlev kanıtı değildir.
- Provider secret, token, PAN/CVV, raw provider yanıtı, PII ve gerçek `.env` değeri kod, log, test çıktısı veya MD içine yazılmaz.
- Test, TypeScript, lint, build ve uygun `/api/ready` kanıtı olmadan PASS raporlanmaz. Mock veya synthetic fixture gerçek provider kanıtı değildir.
- Sadece `localhost:3000` MavenForms geliştirme sunucusu; port, migration/client kilidi için gerekirse kontrollü durdurulup yeniden açılabilir. Production/cloud, veri reseti ve veri silme bu yetkinin dışındadır.

## Context ve IDE kuralı

- Bu dosya, `PROJECT_CONTEXT.md` ve `STATUS.md` kısa bootstrap katmanıdır. Uzun `worklog.md`, ana planlar ve araştırma arşivi yalnız görev paketinin `reads` alanı veya doğrudan bağımlılık gerektiğinde açılır.
- Bir fazın doğruluğu için proje geneline veya başka kaynaklara bakmak gerekiyorsa bu serbesttir; okuma kapsamı packet kaydına yazılır ve gereksiz dosyalar yüklenmez.
- Dosya büyüklüğü çözüm değildir: büyük modülü görev sınırında böl, ortak sözleşmeyi kanonik dosyada tut, aynı bilgiyi farklı MD’lerde kopyalama.
- Diğer IDE’ler bu dosyayı veya kendi ince adapter dosyalarını okuyabilir; adapter kuralları burada yazan kanonik kurallarla çelişemez.
- Uygulama paketleri, context katmanları ve IDE uyumluluğu için `docs/workflow/README.md` okunur.

## Kapanış

`node scripts/workflow.mjs verify <packet>` çalıştır. Sonuçta changed files, checks, kalan dış bağımlılıklar ve gerçek doğrulama sınırı raporlanır. `LOCAL_PASS` release onayı değildir.
