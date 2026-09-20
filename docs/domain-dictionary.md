# Kanonik domain sözlüğü (F0 dondurma)

- Organization: Veri ve politika kapsamı. Workspace 1:1 map ile başlar.
- Event: Ürün/operasyon üst kimliği. Form merkez değildir.
- EventOccurrence: Tarih/saat/timezone/venue kapsamı.
- Person: Tek gerçek kişi; registration/contact/credential buna bağlanır.
- Registration: Kişinin event başvurusu; form snapshot + answers + status history.
- Order: Alacak/borç ve müşteri bağlamı; item toplamı snapshot.
- Payment: Tahsilat/çıkış hareketi; confirmed hareket güncellenmez, reversal ile düzeltilir.
- PaymentAllocation: Ödemenin sipariş/faturaya dağılımı; toplam net tutarı aşamaz.
- Invoice: Mali belge iş akışı; PDF varlığı yasal düzenleme değildir.
- InventoryHold: Süreli/tokenlı ayırma; TTL dolunca release.
- Credential: QR/badge kimliği; check-in hareketi değildir.
- CheckInEvent: Giriş/çıkış hareketi; kapı/cihaz/operatör taşır.
