# UI/UX Rakip + TR Araştırma Notu — Maven Event Management (2026-09-17)

Amaç: F9-08 ölü-eylem düzeltmelerine webfetch kanıtlı UX girdisi üretmek.
Bu not araştırma/plan girdisidir; canlı provider, staging veya saha kanıtı değildir.

## Fetch ile doğrulanan birincil kaynaklar (200 OK)

- Cvent — Event Registration Examples (kayıt sayfası netliği, hero + tarih/mekân odağı):
  `https://www.cvent.com/en/blog/events/event-registration-examples`
- Eventbrite — How to Make Your Event Checkout a Breeze (checkout'ta yalnız kritik
  soru; ek bilgi kayıt-sonrasına; iade politikası gibi SSS sayfada):
  `https://www.eventbrite.com/blog/event-checkout-ds00/`
- Seats.io — Submit hold token (seçim → süreli hold; kesin booking için hold token
  şart; `holdTokenInputName` veya `chart.holdToken`):
  `https://docs.seats.io/docs/tutorial/submit-hold-token`

## TR kararları (Maven Event Management akışı için)

### K-01 Kayıt checkout'u tek soru seti değildir; tipe göre dallanır

Cvent ilgisiz widget/page'i katılımcıya göstermez, Eventbrite kritik-olmayan soruyu
kayıt sonrasına iter. Karar: Maven kayıt akışı registration-type bazında koşullu
adım gösterir; ilgisiz adım atlanır, gizlenen adımın nedeni operatöre görünür.
Dayanak: master plan `02` madde 1 (başvuru/kişi/kayıt farklıdır).

### K-02 Sipariş, ödeme ve dağıtım (allocation) ayrı adımlardır

Cvent offline ödemede detay girişi ile dağıtımı ayırır. Karar: ödeme UI'ında
"ödeme alındı" rozeti, mutabakat/dağıtım tamamlanmadan basılmaz; manuel kayıtta
ara durum "kayıt alındı / mutabakat bekliyor" dürüst etiketiyle gösterilir.
Dayanak: master plan `02` madde 2-3.

### K-03 Hold süreli ve görünürdür; erken release yasaktır

Seats.io hold → token ile book → release zinciri. Karar: envanter/koltuk UI'ında
hold süresi geri sayımla gösterilir; süre dolmadan release eylemi sunulmaz;
double-booking riski taşıyan kısayol butonu konulmaz.
Dayanak: master plan `02` madde 6.

### K-04 Ölü eylem ya gizlenir ya dürüst etiketlenir

Cvent kuralı (ilgili değilse gösterme) + `UI-OLU-EYLEM-ENVANTERI.md` kuralı.
Karar: işlevsiz buton yalın sunulmaz; ya koşullu gizlenir ya `(yakında)` +
tek cümlelik açıklama taşır; "connected/bağlı" iddiası kanıtsız basılmaz.

### K-05 Badge çıktıdır, check-in harekettir

Karar: badge ekranı "çıktı önizlemesi", check-in ekranı "kapı/zaman/operatör
kaydı" olarak ayrılır; badge basımı check-in kanıtı gibi gösterilmez.
Dayanak: master plan `02` madde 5.

### K-06 Fatura durumu tek rozet değildir

Karar: fatura UI'ında kısmi tahsilat, iptal/iade/credit-note ilişkileri ayrı
satırlarda gösterilir; ödeme-öncesi fatura ve kısmi ödeme normal akış olarak
çizilir, istisna rengi almaz. Dayanak: master plan `02` madde 4.

## Dürüst-etiket kuralı

Bu nottaki hiçbir karar canlı davranış, provider özelliği veya saha kabulü
iddia etmez; her kararın dayanağı yukarıdaki URL veya `02_SEKTOR_ARASTIRMASI.md`
madde numarasıdır. Dış bağımlılık gerektiren iddia yoktur.

## Revizyon kaydı

F9-08 `bun` check ile yazılmıştı; yürütme ortamında `bun` binary'si yok ve
kurulum için ağ çıkışı da kapalı. Test node-uyumlu düz assert betiğidir, bu
yüzden F9-08A revizyonu check'i `node tests/ui-ux-research.test.mjs` olarak
sabitler; karar içeriği değişmemiştir.

