# ADR-0001 F0 kanonik kararlar

- D-01: MavenForms kod tabanı çekirdek temelidir; Form root aggregate değildir.
- D-02: Tek şirket iç pilot önce gelir.
- D-03: PostgreSQL + modüler monolit ilk deploymenttır.
- D-04: Event/Person/Registration core otoritesidir.
- D-05: Floor Editor geometry/inventory otoritesidir.
- D-06: Order, Payment, Allocation ve Invoice ayrıdır.
- D-07: Manuel ödeme ve manuel fatura kontrolü canlı ödemeden önce gelir.
- D-08: Hosted iyzico ilk kart yoludur; banka vPOS sonra adapter olarak gelir.
- D-09: Paraşüt otomasyonu manuel fallback'i kaldırmaz.
- D-10: Multi-Tenant en sondur; isolation hygiene baştan sürer.

Değişiklik nedeni ve migration etkisi bu dosyada izlenir.
