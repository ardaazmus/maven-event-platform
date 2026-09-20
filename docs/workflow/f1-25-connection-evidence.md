# F1-25A — Shadow Postgres Bağlantı Kanıtı (2026-09-18)

Tamamlayıcı kanıt raporu: F1-25 zaten 2026-09-17'de LOCAL_PASS almıştı
(`scripts/pg-probe.mjs` değişimiyle); bu rapor bağlantının 2026-09-18'de
de ayakta olduğunu bağımsız gözlemle kilitler. Zincir onarımı geri alındı:
F1-25 ve F1-26 kayıtları aslına döndürüldü, F1-25A yalnız ek kanıttır.

## Gözlem (unsandboxed, 2026-09-18)

```text
docker inspect mf-pg-shadow:
image=postgres:16 status=running started=2026-09-17T21:09:45Z

node scripts/pg-probe.mjs:
pg-probe: PASS (127.0.0.1:5433, postgres 16.15 (Debian 16.15-1.pgdg13+2), trust auth, parola yok)
```

Koşullar F1-25 acceptance ile aynıdır: yalnız localhost (127.0.0.1:5433),
trust auth, parola yok; 5432'deki paralel projenin Postgres'ine dokunulmaz.
Canlı SQLite akışı ve uygulama kodu değişmedi.

## Zincir durumu

- `F1-25` LOCAL_PASS (2026-09-17), `F1-26` LOCAL_PASS, `F1-27` LOCAL_PASS;
  zincir oynamadı, bu rapor ek kanıttır.
- Kapanış gözlemi (2026-09-18): container `running`, prob PASS, trust auth.
