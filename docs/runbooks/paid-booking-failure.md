# Paid-booking failure recovery (F5)

Booking başarılı ama ödeme sonradan disputed/başarısız olursa order otomatik tamamlandı sayılmaz.

1. Hold `booked` kalır; release YOK (early-release koruması).
2. Ödeme `disputed` işlenir; allocation değişmez.
3. Operasyon task açılır: finance + floor planner bilgilendirilir.
4. Karar: reassignment (başka order) veya refund onayı.
5. Reversal/refund ayrı immutable hareketle yazılır; kayıt editlenmez.
6. Alarm: `booked` + ödemesiz order 24 saati aşarsa bildirim.
