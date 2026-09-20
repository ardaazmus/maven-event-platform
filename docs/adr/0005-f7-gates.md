# ADR-0005 F7 otomasyon kapıları (EXTERNAL_DEPENDENCY)

- F7A Paraşüt connection/read-only: sandbox hesap + staging health bekler.
- F7B contact/product eşleme: muhasebe örnek seti bekler.
- F7C sales invoice create/job: gerçek hesap kanıtı bekler (canlı değil).
- F7D e-Fatura/e-Arşiv: mali müşavir kabulü bekler.
- F7E iptal/iade/credit: uçtan uca ledger mutabakatı bekler.
- Kural (D-09): otomasyon manuel fallback'i kaldırmaz; F3 manuel akış korunur.
