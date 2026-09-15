# MavenForms — Bulut Ortamı Sorun Giderme ve Devir Dokümanı

Bu belge, MavenForms projesinin bulut ortamında verdiği hatayı başka bir ajanın güvenli ve kanıta dayalı biçimde teşhis edip çözebilmesi için hazırlanmıştır.

## 1. Görev

Bulut ortamında uygulamanın neden çalışmadığını veya giriş akışının neden başarısız olduğunu bul, kök nedeni düzelt ve aynı bulut ortamında gerçek HTTP doğrulaması yap.

Çözüm yalnızca localde çalışıyor diye tamamlanmış sayılmamalıdır. Cloud build çıktısı, runtime ortamı, veritabanı dosyası, proxy ve gerçek public URL birlikte doğrulanmalıdır.

## 2. Çalışma kuralları

- Türkçe sonuç raporu ver.
- Önce teşhis et, sonra tek kök neden için en küçük düzeltmeyi yap.
- Gerçek cloud URL’si, provider adı, log veya credential verilmediyse bunları uydurma.
- Kullanıcıya ait mevcut değişiklikleri silme. Git reset, checkout veya geniş kapsamlı temizleme yapma.
- .env, veritabanı, token, parola ve deployment secret’larını loga yazdırma.
- Production response gövdesine stack trace ekleme.
- Demo hesabını yalnızca bu ortamda kullanılması güvenliyse kullan.
- Gerçek kullanıcı parolası gerekiyorsa shell history ve loglara yazma.
- Veritabanını resetleme veya db push --accept-data-loss komutunu canlı production verisine karşı çalıştırma.
- Bir test başarısız olduğunda rastgele ikinci bir değişiklik yapma; yeni kanıt topla.

## 3. Proje hakkında doğrulanmış bilgiler

### 3.1 Teknoloji ve portlar

- Next.js 16.x + TypeScript
- React 19
- Prisma 6.x
- SQLite datasource
- Bun package/runtime kullanımı
- Next.js standalone output
- Caddy reverse proxy
- Next uygulaması varsayılan olarak 3000 portunda
- Caddyfile 81 portunu dinliyor

Kaynak dosyalar:

- package.json
- next.config.ts
- prisma/schema.prisma
- Caddyfile

### 3.2 Auth akışı

Güncel amaçlanan akış:

~~~
LoginView
  -> POST /api/auth/login
  -> response.data.token alınır
  -> localStorage["mavenforms_token"] içine yazılır
  -> sonraki isteklerde Authorization: Bearer <token>
  -> GET /api/auth/me
  -> kullanıcı + workspace alınır
  -> Zustand store init edilir
  -> dashboard gösterilir
~~~

İlgili davranış:

- src/components/mavenforms/views/login-view.tsx:50-98 login, token saklama ve /api/auth/me adımlarını yürütür.
- src/lib/api-client.ts:45-50 token varsa Authorization: Bearer header’ı ekler.
- src/lib/auth.ts:57-78 önce Authorization header’ını, sonra cookie’yi kontrol eder.
- src/app/api/auth/login/route.ts:36-45 token’ı response body’ye koyar ve cookie’yi yedek olarak set eder.
- src/components/mavenforms/app-shell.tsx:32-49 localStorage’da token yoksa gereksiz /me çağrısı yapmaz.

Bulut ortamında yalnızca cookie’ye güvenilecek bir auth düzeltmesi yapılmamalıdır. Preview/proxy ortamlarında cookie sorunları yaşandığı için Bearer token akışı bilinçli olarak kullanılmaktadır.

### 3.3 Veritabanı

prisma/schema.prisma SQLite kullanır:

~~~
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
~~~

Worklog’da kayıtlı demo seed:

- e-posta: demo@mavenforms.com
- parola: demo1234
- kullanıcı: user_demo
- workspace: MavenForms Demo

Bu bilgiler production için güvenli varsayım değildir. Cloud DB’nin seed edilmiş olup olmadığı ayrıca kontrol edilmelidir.

## 4. Localde kesin gözlenen hata

Dependency kurulumu sonrasında Prisma Client üretilmeden uygulama çalıştırıldığında şu hata tekrar üretildi:

~~~
Failed to load external module @prisma/client...
Cannot find module '.prisma/client/default'
~~~

Bu durumda:

- POST /api/auth/login -> 500
- GET /api/auth/me -> 500
- GET /api/branding?public=true -> 500

Bu, frontend ağ hatası değil; route modülü yüklenirken Prisma Client bulunamadığı için oluşan server-side hatadır.

Local çözüm:

1. bun install --frozen-lockfile
2. bunx prisma generate
3. Next dev server restart
4. Login ve /me testlerinin tekrarı

Local doğrulama sonucu:

- POST /api/auth/login -> 200
- GET /api/auth/me + Bearer token -> 200
- / -> 200
- bun run lint -> exit 0
- git diff --check -> exit 0

Bu bulgu cloud’un da aynı nedenle bozuk olduğunu kanıtlamaz; cloud build’de ilk kontrol edilmesi gereken noktadır.

## 5. Bu çalışma alanında yapılan local düzeltmeler

### package.json

Mevcut ilgili scriptler:

~~~
"dev": "next dev -p 3000",
"build": "next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/",
"start": "NODE_ENV=production bun .next/standalone/server.js 2>&1 | tee server.log",
"postinstall": "prisma generate"
~~~

Notlar:

- postinstall eklendi; dependency kurulumu sonrasında Prisma Client otomatik üretilmelidir.
- dev script’inden tee kaldırıldı; local Bun ortamında tee bulunmadığı gözlendi.
- start script’inde tee hâlâ var. Cloud launcher bun run start kullanıyorsa bu ayrıca doğrulanmalıdır.

### .env

Mevcut local değer:

~~~
DATABASE_URL=file:../db/custom.db
~~~

Bu değer, schema dosyasının konumuna göre local db/custom.db dosyasını hedefleyecek şekilde ayarlanmış ve localde doğrulanmıştır.

Önceki değer Linux sandbox yoluydu:

~~~
DATABASE_URL=file:/home/z/my-project/db/custom.db
~~~

Cloud ortamında bu yolu körlemesine kullanma. Cloud runtime’ın gerçek DB yolu ve provider environment variable override davranışı doğrulanmalıdır. .zscripts/start.sh paket içindeki varsayılan DB için /app/db/custom.db kullanmayı amaçlıyor.

## 6. Cloud deployment modeli

### 6.1 Build script varsayımları

.zscripts/build.sh şu sıraya ve varsayımlara dayanır:

1. Kaynak proje yolu /home/z/my-project
2. bun install
3. bun run build
4. .next/standalone/server.js oluşması
5. Standalone çıktının next-service-dist/ altına kopyalanması
6. .next/static ve public klasörlerinin ayrıca kopyalanması
7. db içeriğinin pakete alınması veya boş DB oluşturulması
8. Caddyfile ve start.sh dosyalarının pakete alınması
9. /tmp/build_fullstack_$BUILD_ID.tar.gz paketinin oluşturulması

İlk kontrol edilmesi gereken hard-coded değer:

~~~
NEXTJS_PROJECT_DIR="/home/z/my-project"
~~~

Cloud build runner bu yolu kullanmıyorsa script yanlış dizinde çalışabilir veya yanlış proje paketleyebilir.

### 6.2 Beklenen paket yapısı

Build başarılı olsa bile aşağıdakilerin gerçekten paket içinde bulunması gerekir:

~~~
next-service-dist/server.js
next-service-dist/.next/static/...
next-service-dist/node_modules/...
db/custom.db
start.sh
Caddyfile
~~~

next.config.ts içinde output: "standalone" mevcut. Build sonunda server.js yoksa deployment tamamlanmış kabul edilmemelidir.

### 6.3 Runtime script

.zscripts/start.sh:

- çalışma dizinini script’in bulunduğu dizin olarak alır;
- next-service-dist/server.js yoksa Next’i başlatamaz;
- PORT varsayılanını 3000 yapar;
- HOSTNAME varsayılanını 0.0.0.0 yapar;
- DATABASE_URL dışarıdan verilmemişse file:/app/db/custom.db kullanır;
- /app/db/custom.db yoksa başlamayı durdurur;
- bun server.js ile Next standalone sunucusunu arka planda başlatır;
- bir saniye sonra yalnızca process’in yaşayıp yaşamadığını kontrol eder;
- Caddy’yi foreground process olarak çalıştırır.

Kanıtlanması gereken noktalar:

1. Runtime gerçekten /app altında mı?
2. Paket /app altına mı açılıyor?
3. DB /app/db/custom.db olarak mevcut mu?
4. Cloud runtime’da bun PATH içinde mi?
5. Cloud env DATABASE_URL değerini eski Linux path ile override ediyor mu?
6. Next bir saniyeden geç başlarsa readiness yarış durumu oluşuyor mu?
7. Caddy binary mevcut mu?
8. Health check portu 81, 3000 veya platform PORT değerlerinden hangisi?

### 6.4 Reverse proxy

Caddyfile yalnızca :81 dinler ve varsayılan olarak şu proxy’yi kurar:

~~~
cloud/public :81 -> localhost:3000
~~~

Host, X-Forwarded-For, X-Forwarded-Proto ve X-Real-IP upstream’e aktarılır.

XTransformPort query parametresi kullanılırsa Caddy gelen portu dinamik olarak proxy’ler. Bu davranış cloud platformunun gerçek port sözleşmesiyle test edilmelidir.

## 7. Önceliklendirilmiş cloud hipotezleri

Her hipotez tek başına test edilmelidir.

### H1 — Prisma Client cloud build’de üretilmemiş

Belirti:

~~~
Cannot find module '.prisma/client/default'
~~~

Kontrol:

~~~
find . -path '*/node_modules/.prisma/client/*' -maxdepth 8 -type f -print
test -f node_modules/.prisma/client/default.js
~~~

Çözüm yönü:

- bun install tamamlanmalı;
- postinstall çalışmalı veya açıkça bunx prisma generate çalıştırılmalı;
- generate çıktısında hata olmamalı;
- standalone paket generated client ve Prisma engine dosyalarını içermeli.

### H2 — DATABASE_URL yanlış veya boş DB’ye işaret ediyor

Belirti:

- DB hatası ile 500;
- doğru credential ile 401 çünkü kullanıcı seed edilmemiş;
- branding endpoint’inde beklenmedik boş/default sonuç;
- runtime farklı bir SQLite dosyasına yazıyor.

Kontrol:

~~~
printf 'cwd='; pwd
printf 'DATABASE_URL is set: '; test -n "$DATABASE_URL" && echo yes || echo no
ls -lah /app/db 2>/dev/null || true
ls -lah ./db 2>/dev/null || true
~~~

DATABASE_URL değerinin tamamını loglama. Sadece secret içermeyen path bilgisini kontrollü raporla.

Çözüm yönü:

- tek authoritative DB path belirle;
- cloud runtime’ın gerçek absolute path’ini kullan;
- build DB’si ile runtime DB’sini checksum, size ve read-back ile karşılaştır;
- canlı DB’ye accept-data-loss uygulama.

### H3 — Build yanlış proje dizinini paketliyor

Belirti:

- build logunda /home/z/my-project görünmüyor;
- paket içinde beklenen DB veya kaynak yok;
- server.js başka projeye ait veya hiç yok;
- build başarılı görünürken runtime eski/yanlış kod çalıştırıyor.

Kontrol:

~~~
pwd
find . -maxdepth 2 -type f \( -name package.json -o -name next.config.* -o -name schema.prisma \) -print
git rev-parse --short HEAD 2>/dev/null || true
~~~

### H4 — Standalone paket eksik

Belirti:

- next-service-dist/server.js yok;
- / 404 veya 502;
- Caddy localhost:3000 için connection refused veriyor;
- warmup veya health check timeout.

Kontrol:

~~~
find . -maxdepth 4 -type f -name server.js -print
find ./next-service-dist -maxdepth 3 -type f -print 2>/dev/null | sort
~~~

### H5 — Bun, Caddy veya port modeli uyumsuz

Kontrol:

~~~
command -v bun || true
bun --version 2>/dev/null || true
command -v caddy || true
printf 'PORT=%s\n' "$PORT"
ss -lntp 2>/dev/null || netstat -lntp 2>/dev/null || true
~~~

### H6 — Proxy Authorization header’ını düşürüyor

Belirti:

- login 200 ve token dönüyor;
- hemen sonraki /api/auth/me 401;
- browser localStorage’da token var;
- public URL üzerinden dashboard API çağrıları 401.

Kontrol:

1. Login response’undan token’ı güvenli şekilde al.
2. Public URL üzerinden /api/auth/me isteğinde Authorization: Bearer token gönder.
3. Aynı isteği doğrudan localhost:3000’e gönder.
4. Sonuçları karşılaştır.

Çözüm yönü: proxy’nin Authorization header’ını upstream’e aktarmasını sağla. Cookie-only auth’a geri dönme.

### H7 — Cloud DB’de kullanıcı veya workspace seed yok

Belirti:

- Prisma modülü yükleniyor;
- login route 500 değil, doğru credential ile 401 dönüyor;
- tokensız /me 401 dönüyor.

Not: prisma/seed.ts mevcut olsa da build.sh otomatik olarak prisma db seed çalıştırmıyor. database-runtime-build.sh DB’yi kopyalıyor veya şema push ediyor; seed davranışı ayrıca doğrulanmalıdır.

### H8 — start script’inde tee bulunmuyor

Belirti:

~~~
tee: command not found
~~~

Localde dev script’i sırasında bu gözlendi ve dev script’inden kaldırıldı. package.json start script’inde tee hâlâ var.

## 8. Cloud teşhis sırası

### Aşama 0 — Kanıt paketi

Secret göstermeden aşağıdakileri kaydet:

~~~
date -u
pwd
uname -a 2>/dev/null || true
command -v bun || true
bun --version 2>/dev/null || true
node --version 2>/dev/null || true
command -v caddy || true
printf 'PORT=%s\n' "$PORT"
printf 'NODE_ENV=%s\n' "$NODE_ENV"
~~~

Paket yapısı:

~~~
find . -maxdepth 3 -type f \( -name package.json -o -name next.config.* -o -name schema.prisma -o -name server.js -o -name custom.db \) -print | sort
~~~

### Aşama 1 — Build doğrulaması

Build logunda şu olayların sırasını bul:

~~~
bun install
prisma generate / Generated Prisma Client
bun run build
.next/standalone/server.js exists
database-runtime-build completed
package archive completed
~~~

Her adım için exit code ve önemli error satırlarını kaydet. Sadece son build success satırını yeterli kabul etme.

### Aşama 2 — Runtime paket doğrulaması

~~~
test -f ./next-service-dist/server.js
test -f ./db/custom.db
find ./next-service-dist -path '*/.prisma/client/*' -type f -print 2>/dev/null | head -50
~~~

Dosya yoksa route kodunu değiştirmeden önce build/paketleme problemini düzelt.

### Aşama 3 — Proxy olmadan Next testi

~~~
curl -i --max-time 15 http://127.0.0.1:3000/
curl -i --max-time 15 'http://127.0.0.1:3000/api/branding?public=true'
~~~

### Aşama 4 — Auth API testi

Gerçek credential’ı command history’ye yazmadan platform secret injection yöntemini kullan:

~~~
curl -i --max-time 15 \
  -H 'Content-Type: application/json' \
  -X POST 'http://127.0.0.1:3000/api/auth/login' \
  --data '{"email":"<KNOWN_EMAIL>","password":"<KNOWN_PASSWORD>","remember":true}'
~~~

Beklenen sonuç:

- doğru credential -> 200 ve data.token;
- yanlış credential -> 401;
- Prisma/runtime problemi -> 500 ve server logunda gerçek neden.

Token değerini loga veya rapora yazma. Başarılı token ile /me:

~~~
curl -i --max-time 15 \
  -H 'Authorization: Bearer <TOKEN_NOT_TO_BE_LOGGED>' \
  'http://127.0.0.1:3000/api/auth/me'
~~~

Beklenen sonuç 200 ve data.user + data.workspace alanlarıdır.

### Aşama 5 — Caddy ve public URL testi

Runtime iç portu başarılı ama public URL başarısızsa sorun application code’dan çok proxy, port veya header katmanındadır.

~~~
curl -i --max-time 20 'https://<CLOUD_HOST>/api/branding?public=true'
curl -i --max-time 20 'https://<CLOUD_HOST>/'
~~~

Şu matrisi doldur:

| Test | 127.0.0.1:3000 | :81/Caddy | Public URL | Beklenen |
|---|---:|---:|---:|---:|
| / | 200 | 200 | 200 | HTML |
| /api/branding?public=true | 200 | 200 | 200 | JSON |
| doğru login | 200 | 200 | 200 | token |
| Bearer /api/auth/me | 200 | 200 | 200 | user + workspace |
| yanlış login | 401 | 401 | 401 | auth rejection |
| tokensız /me | 401 | 401 | 401 | auth rejection |

Bir sütun diğerlerinden farklıysa kırılma sınırı o katmandadır.

## 9. Düzeltme yönü

### Prisma generated client eksikse

- Build pipeline’da bun install sonrası prisma generate çıktısını zorunlu doğrula.
- package.json postinstall çalışıyor mu kontrol et.
- Gerekirse build script’e açık bunx prisma generate ekle.
- Standalone paketin generated Prisma runtime dosyalarını içerdiğini doğrula.
- Yeniden build et, paket içeriğini incele, runtime’ı yeniden başlat ve HTTP testlerini tekrarla.

### DB path veya DB contents sorunuysa

- Cloud runtime için tek bir absolute path belirle.
- DATABASE_URL’in start.sh default’unu override edip etmediğini kontrol et.
- Paket DB’si ile runtime DB’sinin checksum/size/read-back değerlerini karşılaştır.
- Production verisini silmeden migration/şema uyumluluğunu çöz.
- Demo seed yoksa bunun bilinçli karar mı, paketleme hatası mı olduğunu belirle.

### Proxy Authorization sorunuysa

- Caddy/provider header aktarımını düzelt.
- Public URL üzerinden login -> Bearer /me testini tekrarla.
- Cookie ayarlarını değiştirerek sorunu maskeleme.
- Browser’ın mavenforms_token sakladığını doğrula.

### Port/startup sorunuysa

- Platformun beklediği PORT değerini belirle.
- Next’in aynı portta dinlediğini doğrula.
- Caddy upstream ve health check portunu gerçek runtime sözleşmesine getir.
- Readiness kontrolünü yalnızca startup yarışına dair kanıt varsa ekle.

## 10. Kabul kriterleri

Şu koşulların tamamı sağlanmadan çözüm tamamlandı olarak raporlanmamalıdır:

1. Cloud build logunda prisma generate başarıyla görülüyor.
2. Runtime paketinde next-service-dist/server.js mevcut.
3. Runtime generated Prisma client dosyaları mevcut.
4. DATABASE_URL gerçek ve beklenen DB’ye işaret ediyor.
5. / public URL üzerinden 200 dönüyor.
6. /api/branding?public=true public URL üzerinden 200 dönüyor.
7. Doğru credential ile /api/auth/login public URL üzerinden 200 dönüyor.
8. Login response’unda token var; token değeri rapora yazılmıyor.
9. Aynı token ile public /api/auth/me 200 dönüyor.
10. Yanlış credential 401 dönüyor.
11. Token olmadan /api/auth/me 401 dönüyor.
12. Browser Network logunda login -> /me -> ilk dashboard API çağrısı başarılı.
13. Login sonrası browser login ekranına geri dönmüyor.
14. Yenileme sonrası beklenen oturum davranışı korunuyor.
15. bun run lint başarılı.
16. git diff --check başarılı.
17. Kullanıcı değişiklikleri ve production DB korunuyor.

## 11. Final rapor formatı

~~~
Durum: ÇÖZÜLDÜ / BLOKE / KISMEN DOĞRULANDI

Kök neden:
- [tek cümle]

Değiştirilen dosyalar:
- [tam yol]

Cloud doğrulaması:
- Build: [başarılı/başarısız + kanıt]
- Prisma Client: [mevcut/eksik]
- DB path: [secret göstermeden doğrulama]
- /: [status]
- login: [status]
- /me Bearer: [status]
- Public proxy: [başarılı/başarısız]

Kalan riskler:
- [yalnızca kanıtlanan veya açıkça doğrulanmamış maddeler]
~~~

“Localde çalışıyor” tek başına cloud çözümü olarak yazılmamalıdır.

## 12. Kopyalanabilir ajan görevi

~~~
MavenForms projesinin bulut ortamındaki çalışma/giriş problemini çöz.

Öncelik: Önce kök neden teşhisi, sonra tek ve en küçük düzeltme.

Bilinen gerçekler:
- Next.js 16 + Bun + Prisma 6 + SQLite kullanılıyor.
- next.config.ts standalone output kullanıyor.
- Auth akışı login response token -> localStorage mavenforms_token -> Authorization Bearer -> /api/auth/me şeklinde.
- Caddy :81 üzerinden localhost:3000’e proxy yapıyor.
- .zscripts/build.sh /home/z/my-project varsayımına sahip.
- .zscripts/start.sh next-service-dist/server.js ve varsayılan /app/db/custom.db bekliyor.
- package.json postinstall Prisma generate çalıştırıyor.

Localde kesin gözlenen hata:
Cannot find module '.prisma/client/default'
Bu durumda login, /me ve branding route’ları 500 veriyor. bunx prisma generate ve server restart sonrasında local login ve /me 200 doğrulandı.

İzlenecek sıra:
1. Cloud build logunu, runtime cwd’yi, Bun/Node/Caddy sürümlerini ve PORT’u secret göstermeden kaydet.
2. Build sırasında Prisma generate çıktısını ve exit code’u doğrula.
3. Runtime paketinde server.js, generated Prisma client, Prisma engine ve db/custom.db var mı kontrol et.
4. DATABASE_URL’in gerçek cloud DB’sine işaret ettiğini ve eski Linux path ile override edilmediğini doğrula.
5. Proxy olmadan localhost:3000 üzerinde /, branding, login ve Bearer /me testlerini yap.
6. Aynı testleri Caddy ve gerçek public URL üzerinden yap.
7. Yalnızca doğrulanmış hipotezin kök nedenini düzelt.
8. Production DB’yi resetleme ve accept-data-loss kullanma.
9. Finalde build, Prisma, DB path, login, /me, proxy ve browser akışını ayrı ayrı raporla.

Kabul kriterleri:
- public / 200
- public branding 200
- doğru login 200 + token
- public Bearer /api/auth/me 200
- yanlış login 401
- tokensız /me 401
- browser login sonrası dashboard’a geçiyor ve ilk dashboard API’si 200
- lint ve diff check başarılı
~~~

