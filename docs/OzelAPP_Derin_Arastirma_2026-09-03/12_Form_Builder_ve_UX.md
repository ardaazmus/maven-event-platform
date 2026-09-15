# 12 — Form Builder ve UX Derin Araştırması

**Erişim tarihi:** 3 Eylül 2026  
**Rakip kullanımı:** Jotform, Tally ve Google Forms yalnız UX örneğidir; güvenlik veya mimari otoritesi değildir.

## Bilgi mimarisi

Desktop düzeni: sol palette/templates, orta canvas, sağ contextual inspector; üst barda undo/redo, autosave durumu, breakpoint preview, Preview ve Publish. Kanonik form ağacı `Page → Container → Grid/Columns → Block` olmalıdır. “Bento” yeni bir veri primitive’i değil, erişilebilir ve responsive grid preset’idir; aksi halde renderer ve migration sayısı gereksiz artar.

Form seçildiğinde bağlam başlığı ve seçim korunarak `Form | Overview/Stats | Responses | Settings` sekmeleri kullanılır. Responses desktop’ta filtre/sort ve sticky-header tablo; mobile’da önemli alanları gösteren kart/drawer veya tablonun kendi yatay scroll alanıdır.

## Drag/drop ve erişilebilirlik

Drag yalnız handle’dan başlatılır, görünür drop indicator ve geçerli hedef vardır. WCAG 2.2 AA 2.5.7 gereği dragging kullanan işlev, dragging olmadan single-pointer alternatife sahip olmalıdır: “öncesine/sonrasına/kolona taşı” menüsü/butonları. Aynı operasyon klavyeyle yapılır; focus işlem sonrası taşınan blokta kalır ve ekran okuyucuya konum duyurulur.

Her alanın kalıcı label’ı, yardım/format talimatı ve ilişkilendirilmiş hata mesajı bulunur. Renk/ikon tek hata kanalı değildir. Focus ring kontrastlı ve kesilmemiştir; hover/active/focus/disabled/error/loading/skeleton/empty durumları tasarım sisteminde token/component seviyesinde tanımlıdır. Disabled kontrol nedenini metinle açıklar.

## Autosave, undo ve versioning

Autosave debounce edilmiş draft patch + revision number + optimistic concurrency kullanır. Görünür durumlar: `Saving`, `Saved`, `Offline`, `Conflict`, `Error`. Undo/redo kısa ömürlü kullanıcı komut stack’idir; durable revision history ayrı kayıt ve restore eylemidir. Publish immutable snapshot oluşturur, draft çalışması devam eder. Preview ya seçilmiş draft revision’ı izole tokenla ya da published snapshot’ı açar; kullanıcı hangisini gördüğünü açıkça bilir.

## Responsive ve mobil editör

Breakpoint ikonları sabit cihaz tasarımları değil preview genişlikleridir; gerçek renderer fluid olmalıdır. 320 CSS px’de bilgi/işlev kaybı olmamalıdır. Columns mobile’da deterministik tek kolona iner; sıra kaynak DOM sırasına göre anlamlıdır. Mobile editor canvas + bottom sheet/drawer inspector kullanabilir. İleri grid resizing desktop’a bırakılabilir; tüm içerik/metin/alan ayarları mobile’da erişilebilir kalmalıdır.

## 16:9 medya ve izolasyon

Form kart görseli `aspect-ratio: 16/9`, focal point ve tutarlı crop ile çalışır. Media picker üç açık girişe ayrılır: Library, Upload, URL. Informative görselde alt text zorunlu; decorative seçiminde boş alt bilinçli işaretlenir.

Depolama alanları fiziksel/policy olarak ayrılır: `tenant/forms/{form_id}/media/...` ve `tenant/app-media/...`. Form picker yalnız kendi form scope’unu sorgular; başka form ID’si URL’ye yazılarak sonuç alınamaz. Upload type/size/magic/AV ve lisans/alt metadata’sı taşır. URL import hotlink yerine kontrollü fetch/scan/copy politikasıyla ele alınır.

## Durum ve kabul matrisi

| Alan | Kabul kriteri |
|---|---|
| Drag/drop | Mouse, touch, keyboard ve non-drag menü aynı ağaç sonucunu üretir |
| Autosave | Network kaybı state’i görünür; conflict sessiz overwrite etmez |
| Undo/version | Undo session komutu; revision restore yeni revision yaratır |
| Publish | Snapshot hash/version sabit; draft değişikliği yayını etkilemez |
| Responsive | 320px reflow; kolon sırası anlamlı; yalnız gerekli table scroll |
| Media | Cross-form access negative test; 16:9 crop/focal/alt akışı |
| Accessibility | WCAG 2.2 AA otomatik+manuel keyboard/screen-reader doğrulaması |

## Kaynak kanıtı

| Kaynak | Kurum | URL | Bölüm | Karar |
|---|---|---|---|---|
| WCAG 2.2 SC 2.5.7 Dragging Movements | W3C WAI | https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html | Non-drag alternative | Erişilebilir reorder |
| WCAG 2.2 SC 1.4.10 Reflow | W3C WAI | https://www.w3.org/WAI/WCAG22/Understanding/reflow.html | 320 CSS px | Responsive acceptance |
| SC 3.3.2 Labels or Instructions | W3C WAI | https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html | Input labels/instructions | Field UX |
| SC 3.3.1 Error Identification | W3C WAI | https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html | Textual errors | Error state |
| Form Revision History | Jotform | https://www.jotform.com/help/294-How-to-view-form-revision-history/ | Autosave/revisions | UX karşılaştırması |
| Columns | Tally | https://tally.so/help/columns | Mobile stacking | UX karşılaştırması |
| Use Google Forms | Google | https://support.google.com/docs/answer/6281888?hl=en | Edit/publish | UX karşılaştırması |
| View/manage responses | Google | https://support.google.com/docs/answer/2917686?hl=en | Responses/Sheets | UX karşılaştırması |

## Karar kaydı

**Karar:** Normalize form ağacı, bento preset’i, erişilebilir drag alternatifi, revision+publish snapshot ayrımı ve form-scope medya politikası kullanılacak.  
**Durum:** ACCEPTED  
**Bağlı ana faz:** 8  
**Bağımlılıklar:** Tasarım sistemi, renderer schema, revision store, object/media service ve accessibility QA.  
**Sektörel gerekçe:** Builder karmaşık etkileşim, responsive yeniden akış ve geri alınabilir içerik üretimini birlikte yönetir.  
**Kaynak:** W3C WCAG 2.2; Jotform/Tally/Google Forms resmi UX dokümanları.  
**Teknik gerekçe:** Tek kanonik ağaç ve snapshot renderer editör/public drift’ini azaltır.  
**Güvenlik etkisi:** Form-scope media ve immutable publish cross-form/taslak sızıntısını engeller.  
**Maliyet/karmaşıklık:** Yüksek; keyboard DnD, revision/conflict, responsive ve a11y QA gerekir.  
**Yanlış uygulanırsa risk:** Veri kaybı, erişilemez editör, bozuk mobil form, CSS çakışması ve media tenant ihlali.  
**Minimum uygulanabilir çözüm:** Page/container/grid/block tree + non-drag reorder + autosave/revision + publish snapshot + 320px renderer.  
**İleride genişletme yolu:** Gelişmiş bento presets, collaborative editing ve template marketplace; faz sırasını değiştirmeden.

RESEARCH COMPLETE — READY FOR ARCHITECTURE REVIEW
