# F1-24A — Postgres Shadow Rehearsal Ortam Probu (2026-09-18)

Sonuç: **PASS** — `mf-pg-shadow` (postgres:16) 127.0.0.1:5433 üzerinde
yanıt veriyor (trust auth, parola yok). Shadow planı başlatılabilir;
bu fazda DB'ye dokunulmadı.

## Prob

Komut: `node scripts/pg-probe.mjs` (`scripts/pg-probe.mjs`: yalnız localhost
Postgres 127.0.0.1:5433 TCP + `mf-pg-shadow` container sürüm okuması, trust auth).

Çıktı:

```text
pg-probe: PASS (127.0.0.1:5433, postgres 16.15 (Debian 16.15-1.pgdg13+2), trust auth, parola yok)
```

Düzeltme kaydı: ilk prob sandbox ağ kısıtı altında koşup `5433 kapalı`
döndürmüştü; unsandboxed tekrar prob PASS verdi. `docker ps` container'ı
doğruluyor (`mf-pg-shadow`, Up). İlk EXTERNAL_DEPENDENCY hükmü sandbox
artefaktıydı; işbu düzeltme geçerlidir.

## Karar

- `prisma/schema.prisma` datasource bu fazda `sqlite` kalır; migration/seed yok.
- `docs/adr/0002-postgres-hedef.md` kuralı korunur: Postgres geçişi bitmeden
  canlı finans açılmaz (D-03); shadow rehearsal F1-25+ zincirinde, boş
  Postgres üzerinde yapılır.
- Bu rapor ortam prob kaydıdır; mutabakat/saha kanıtı değildir.
- Kapanış probu (2026-09-18, unsandboxed): `pg-probe: PASS`, postgres 16.15,
  `mf-pg-shadow` Up 7h+, trust auth.
