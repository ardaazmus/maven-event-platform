# Receipt: EF-ROOT-UX-04-EVENTBAR-CTA

- Packet: EF-ROOT-UX-04-EVENTBAR-CTA
- Faz: FAZ-1 (KRITIK ROOT EVENT-FIRST UI GATE)
- Amac: EventBar no-event durumunda kullaniciyi Yeni Etkinlik akisina tasi.
- Degisen dosyalar:
  - src/components/mavenforms/event-bar.tsx (no-event yanina erisilebilir Yeni Etkinlik butonu -> setView('events'); secim/yukleniyor/hata metinleri aynen korunur; mutation yok)
  - tests/ef-root-ux-eventbar.test.mjs (yeni sozlesme testi)
- Korunan eski davranis:
  - GET /api/events + labelled select + yukleniyor/hata/secim-yok durumlari korunur (ux-shell-event-bar PASS).
  - Bar yalniz GET yapar; POST/method eklenmedi.
- Calistirilan kontroller:
  - node tests/ef-root-ux-eventbar.test.mjs -> PASS
  - node tests/ux-shell-event-bar.test.mjs -> PASS
- Sonuc: LOCAL_PASS (verify kaniti artifacts/workflow/EF-ROOT-UX-04-EVENTBAR-CTA/verified.json)
- Kanit sinifi: SOURCE_CONFIRMED + LOCAL_PASS
- Kalan dis bagimlilik: yok.
- Acik risk: yok.
- Siradaki packet: EF-ROOT-UX-05-LIVE-SMOKE
