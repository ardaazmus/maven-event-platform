# ADR-0002 PostgreSQL hedef ve shadow migration

- Hedef: tek PostgreSQL cluster, modül başına sahipli şema; cross-module write yok, okuma API/read model üzerinden.
- Shadow rehearsal: hedef şema çıkar → boş Postgres'e migrate → SQLite sayım/hash ile karşılaştır → restore provası → rapor.
- Kural: Postgres geçişi bitmeden canlı finans açılmaz (D-03).
- Bu fazda DB touch yok; rehearsal ayrı packet ve ayrı ortamda yapılır.
