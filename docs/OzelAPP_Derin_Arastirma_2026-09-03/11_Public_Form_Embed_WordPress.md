# 11 — Public Form, Embed ve WordPress Derin Araştırması

**Erişim tarihi:** 3 Eylül 2026

## Güven sınırı

Publish işlemi mutable draft’tan bağımsız, hash’li ve sürümlü `published_snapshot` üretir. Public endpoint yalnız public-safe snapshot verir: form schema/theme, public asset referansları, sürüm ve submit kontratı. API key, webhook secret, provider/account/connection ID, admin/internal ID, draft, stack trace veya tenant secret hiçbir HTML/JS/REST payload’ında bulunmaz.

Public form ID gizli değildir ve authorization sayılamaz. Server, form→tenant→published version ilişkisini kendisi çözer. Anonymous submit cookie’siz olabilir; yine de schema, quota, abuse ve idempotency kontrollüdür.

## Iframe ve inline embed

Iframe ayrı origin’de varsayılandır: ana sayfa CSS/JS’sinden en iyi izolasyonu sağlar. Response CSP; dar `default-src`, `script-src`, `style-src`, `img-src`, `connect-src`, `form-action` ve yayın bazlı `frame-ancestors` içerir. `frame-ancestors`, `default-src`’den miras almaz ve meta etiketiyle verilemez; HTTP header olmalıdır.

Sandbox mümkünse `allow-forms allow-scripts` ile sınırlıdır. Aynı-origin frame’de `allow-scripts` ve `allow-same-origin` birlikte sandbox kaçışını güçlendirebilir. `postMessage` yalnız resize/success gibi minimum metadata taşır; exact `targetOrigin`, `event.origin`, `event.source` ve message schema doğrulanır, `*` kullanılmaz.

Inline embed ikinci seçenek: Web Component + Shadow DOM veya kesin prefixli CSS reset/token yüzeyi. Global selector, `!important` savaşı ve host DOM mutation yoktur. Shadow DOM tek başına veri/JS güvenlik boundary’si değildir; submit yine public API güvenliklerine tabidir.

## CORS, CSRF ve anonymous abuse

CORS tarayıcının response erişim politikasıdır; authorization veya CSRF koruması değildir. HTML formu cross-site POST yapabilir. Cookie’siz public submit’te CSRF kullanıcı yetkili oturumunu sömürmez; abuse/spam yine vardır. Admin/cookie endpoint’leri public submitten ayrı origin/route ve CSRF token/SameSite politikası kullanır.

Anonymous submit kontrolleri:

- Form/IP/session/fingerprint bazlı burst ve quota; pahalı downstream harcama tavanı.
- Strict JSON/schema/semantic validation; bilinmeyen alan reddi; body/field/file limitleri.
- Request idempotency key ve kısa replay penceresi.
- Honeypot/time-to-submit/risk skoru; gerektiğinde bot challenge.
- Turnstile gibi challenge kullanılırsa token backend’de doğrulanır; token kısa ömürlü ve tek kullanımlıdır, hostname/action kontrol edilir.
- Upload varsa quarantine/AV/type/size ve form-scoped media erişimi.
- Generic public hata; private correlation ID; queue/backpressure/circuit breaker.

## WordPress production-ready kontrol listesi

- [ ] ZIP içinde tek plugin kök klasörü ve doğru ana plugin dosyası.
- [ ] Header: Name, Version, Requires at least, Requires PHP, License, Text Domain; özel dağıtımda `Update URI`.
- [ ] Shortcode ve Gutenberg block aynı render fonksiyonunu kullanır.
- [ ] Asset yalnız shortcode/block kullanılan sayfada enqueue edilir; version/cache busting vardır.
- [ ] Admin save: `current_user_can()` + nonce + sanitize/validate; output escape-late.
- [ ] Nonce auth/authorization değildir; guest submit için tek güvenlik sayılmaz.
- [ ] REST route versioned namespace, arg validation/sanitization ve her route’ta `permission_callback`.
- [ ] Public route yalnız bilinçli `true`; private route capability ister.
- [ ] Plugin bundle/HTML/JS/options/log içinde OzelAPP admin veya provider secret yok.
- [ ] Zorunlu server credential varsa site/tenant scoped, revocable/rotatable ve browser’a kapalı.
- [ ] Exact OzelAPP origin; iframe CSP/sandbox; `postMessage` origin/source/schema testi.
- [ ] Public snapshot version cache key/ETag; publish invalidation.
- [ ] 320px, keyboard/screen reader, classic/block theme, multisite ve network failure testleri.
- [ ] Deactivation veri silmez. `uninstall.php` root + `WP_UNINSTALL_PLUGIN` guard yalnız yerel option/cache temizler.
- [ ] SaaS tenant verisi uninstall ile silinmez; ayrı açık onaylı süreçtir.
- [ ] HTTPS update/migration/rollback; `Update URI` slug çakışmasını önler.
- [ ] PHPCS/WPCS, Plugin Check, WP/PHP destek matrisi ve install/activate/deactivate/uninstall CI.
- [ ] Yerel kişisel veri varsa privacy notice ve WordPress exporter/eraser hook’ları.

## Kaynak kanıtı

| Kaynak | Kurum | URL | Bölüm | Karar |
|---|---|---|---|---|
| CORS guide | MDN | https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS | Credentials/origins | CORS auth değildir |
| CSP frame-ancestors | MDN | https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors | Header/ancestor matching | Origin allowlist |
| iframe reference | MDN | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe | sandbox | Sandbox izinleri |
| Window.postMessage | MDN | https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage | exact target/origin | Güvenli resize mesajı |
| API4 Resource Consumption | OWASP | https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/ | Rate/body/downstream costs | Anonymous abuse |
| Input Validation | OWASP | https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html | Syntactic/semantic validation | Submit schema |
| Turnstile server validation | Cloudflare | https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ | Single-use/TTL/hostname | Bot token backend kontrolü |
| Nonces | WordPress | https://developer.wordpress.org/apis/security/nonces/ | CSRF/not authorization | Nonce sınırı |
| Adding Custom Endpoints | WordPress | https://developer.wordpress.org/rest-api/extending-the-rest-api/adding-custom-endpoints/ | namespace/permission callback | REST güvenliği |
| Header Requirements | WordPress | https://developer.wordpress.org/plugins/plugin-basics/header-requirements/ | Version/Update URI | Paket/update |
| Uninstall Methods | WordPress | https://developer.wordpress.org/plugins/plugin-basics/uninstall-methods/ | deactivation vs uninstall | Veri davranışı |

## Karar kaydı

**Karar:** Public yayın immutable snapshot olacak; ayrı-origin iframe varsayılan, inline Shadow DOM ikincil; WordPress plugin yalnız public embed kimliği taşıyacak ve hiçbir secret içermeyecek.  
**Durum:** ACCEPTED  
**Bağlı ana faz:** 8  
**Bağımlılıklar:** Public/admin origin ayrımı, CSP origin listesi, object/media policy, anti-abuse sağlayıcısı, WP dağıtım kanalı.  
**Sektörel gerekçe:** Embed kodu düşman/öngörülemez host sayfada çalışır; public ID güvenlik sınırı değildir.  
**Kaynak:** MDN CORS/CSP/iframe/postMessage; OWASP API/input; Cloudflare Turnstile; WordPress resmi handbook.  
**Teknik gerekçe:** Snapshot + iframe sınırı taslak/secret/CSS sızıntısını azaltır ve cache’lenebilir yayın üretir.  
**Güvenlik etkisi:** Secret leak, clickjacking/embed abuse, cross-tenant ve bot maliyet riski düşer.  
**Maliyet/karmaşıklık:** Orta; iki renderer seçeneği, CSP, resize protocol ve plugin yaşam döngüsü gerekir.  
**Yanlış uygulanırsa risk:** Admin verisi ifşası, ana site CSS bozulması, spam/harcama saldırısı, güvensiz WP proxy.  
**Minimum uygulanabilir çözüm:** Public snapshot + iframe + exact `frame-ancestors`/postMessage + rate/schema/idempotency + secret-free shortcode plugin.  
**İleride genişletme yolu:** Inline Web Component, adaptive abuse ve yönetilen private-site connector.

RESEARCH COMPLETE — READY FOR ARCHITECTURE REVIEW
