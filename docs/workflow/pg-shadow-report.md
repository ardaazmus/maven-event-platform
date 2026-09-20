# PG Shadow Rehearsal Raporu (R5 / F1-26 + F1-27)

Yontem (ADR-0002): repo semasi ve dev DB degismedi. `prisma/schema.prisma` temp kopyasinda
`provider sqlite -> postgresql` cevrilip bos Postgres'e (`mf-pg-shadow`, 127.0.0.1:5433,
trust auth, parola yok) `prisma db push` uygulandi.

## F1-26 tablo karsilastirma

- Komut: `bun scripts/pg-shadow-migrate.mjs` exit 0
- SQLite: 73 tablo, PG: 73 tablo, eksik: 0
- Kritik tablolar tek tek dogrulandi: Event, Person, Registration, Order, Payment,
  Invoice, Ticket, InventoryHold, OutboxEvent, CheckoutIntent, ProgramSession

## F1-27 kolon envanter + restore

- Komut: `bun scripts/pg-shadow-compare.mjs` exit 0
- Normalize kolon envanter hash (tablo + kolon adi + tip + nullability):
  SQLite `3952500017f5d76a` = PG `3952500017f5d76a` (ESIT)
- Restore provasi: pg_dump 153KB -> DROP SCHEMA (0 tablo) -> pg_restore (73 tablo) PASS

## Sinirlar

- Shadow PG bostur; satir-verisi tasmasi (seed kopyalama) bu rehearsal'in disindadir,
  ayri packet ister (tip esleme + PII redaksiyonu gerekir).
- Kesinti karari: Postgres cutover icin bu rapor on sarttir, yeterli degildir.
  Canli SQLite akisi rehearsal boyunca degismedi.
