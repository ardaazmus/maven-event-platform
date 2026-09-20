# ADR-0004 F6 canlı kapılar (EXTERNAL_DEPENDENCY)

Aşağıdakiler merchant/provider hesabı, staging ve mutabakat erişimi olmadan açılamaz:

- 6.3 provider refund + settlement reconciliation (canlı rapor gerekir)
- 6.4 sınırlı canlı canary (merchant evidence gerekir)
- 6.5 banka sanal POS adapter (aynı provider contract + ayrı UAT gerekir)
- F7 Paraşüt UAT + mali müşavir kabulü (ayrı hesap ve onay gerekir)

Yerel karşılık hazır: CheckoutIntent server-priced (F6-03), webhook imza/inbox sözleşmesi (F6-04), manuel reversal/refund kaydı (F2-11). Canlı iddia yok.
