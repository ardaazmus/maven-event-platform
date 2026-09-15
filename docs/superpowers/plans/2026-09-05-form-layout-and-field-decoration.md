# Form Layout ve Alan Dekorasyonu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Form builder’da güvenli Grid/Bento yerleşimi, responsive alan ölçüleri ve form scope ikon/görsellerini public/export çıktılarıyla uyumlu biçimde çalıştırmak.

**Architecture:** Mevcut `FormField.config` JSON sözleşmesi geriye dönük uyumlu şekilde `layout` ve `decoration` alanlarıyla genişletilecek. Canvas ve public renderer aynı normalize edilmiş layout değerlerini kullanacak; medya yalnızca mevcut form-scope picker ve imzalı public URL akışı üzerinden geçecek. Bu mikro faz düz alan listesi üzerinde güvenli Grid/Bento başlangıç düzenlerini, seçili alan için etkileşimli Desktop/Tablet genişliklerini ve cihaz bazlı gerçek canvas önizlemesini teslim eder. Hızlı düzen seçenekleri yardımcı akış olarak ikincildir; ana düzenleme modeli seçili alanın sağ paneldeki kolon kontrolüdür. Kalıcı hiyerarşik container ağacı, serbest masonry ve container seviyesinde responsive kurallar ürün kapsamına alınmamıştır; bu karar mevcut form verisini ve public/export parity’yi korumak içindir.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma JSON alanları, Tailwind CSS, lucide-react, mevcut Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-05-form-layout-and-field-decoration-design.md`

## Global Constraints

- Eski alan config anahtarları ve `sortOrder` korunacak.
- Desktop 12, tablet 6, mobile 1 kolon sınırı uygulanacak; builder cihaz önizlemesi de seçili cihaza göre 12/6/1 grid gösterecek.
- Form medya picker’ı `formId` scope’undan çıkmayacak.
- Public çıktıda internal media ID, admin endpoint ve secret bulunmayacak.
- Sihirbaz alan silmeyecek; yalnızca güvenli layout değerleri yazacak.
- Her görev kendi focused testinden sonra bir önceki faz regresyon testini çalıştıracak.

## Architectural decision gate: form layout interaction model

Bu karar, kullanıcının “Bento görsel olarak güzel; ancak formda responsive davranışı bozmamalı” geri bildirimi sonrasında eklenmiştir. Serbest masonry/Bento, form alanlarının okuma sırasını, hata mesajlarının konumunu ve mobil kullanılabilirliği bozabileceği için form input’larının ana yerleşim modeli olamaz. Bento yalnızca kontrollü satır/kolon veya input dışı görsel içerik bölümlerinde kullanılmalıdır.

Resmi sektör dokümantasyonundan çıkarılan ortak davranışlar:

- [Jotform alan yerleşimi](https://www.jotform.com/help/328-how-to-position-form-elements-in-jotform/): drag/drop, shrink, expand ve “move to a new line”.
- [Tally kolonları](https://tally.so/help/columns): kolon sınırını sürükleyerek resize; mobilde soruların tek kolona düşmesi.
- [Tally görsel ayarları](https://tally.so/help/customize-your-form): upload/link, caption, link ve alt text ayrımı.
- [Typeform görsel yerleşimi](https://help.typeform.com/hc/en-us/articles/360058370272-Where-can-I-find-the-design-tools-to-add-images): arka plan görseli ile soru/alan görselinin ayrılması ve desktop/mobile yerleşimi.

### Seçenek A — Önerilen: kontrollü Grid + inspector + canvas kenar sürükleme

- Form input’ları 12 kolonlu desktop, 6 kolonlu tablet, 1 kolonlu mobil sistemde kalır.
- Kullanıcı alanı seçer; sağ panelde Desktop/Tablet kolon aralığını klavye veya mouse ile değiştirir.
- Canvas’ta yalnızca aynı satırdaki kolon sınırında görünen resize handle sürüklenebilir.
- Alanlar için piksel yüksekliği yerine `auto`, `compact`, `standard`, `tall` semantik yükseklikleri kullanılır; kullanıcı içeriği kesemez.
- `Yeni satır` ve `Tam genişlik` davranışları açık kurallar olarak eklenir.
- Bento hızlı başlangıç olarak kalır; yalnızca geçerli Grid dağılımı üreten bir yardımcıdır.

**Sonuç:** En düşük responsive ve veri kaybı riski; form ürünleriyle en uyumlu yaklaşım. Önerilen seçim budur.

### Seçenek B — Serbest canvas/Bento

- Alanlar piksel veya serbest masonry koordinatlarıyla taşınır.
- Her alan için bağımsız width/height, absolute veya CSS masonry benzeri konumlama uygulanır.
- Mobilde yeniden akış, çakışma çözümü ve okuma sırası için ek algoritma gerekir.

**Sonuç:** Görsel olarak esnek fakat form erişilebilirliği, keyboard order, validation error placement ve embed uyumluluğu açısından yüksek riskli. MavenForms’ın ana form modeli için önerilmez; yalnızca input dışı landing/display blokları için düşünülebilir.

### Seçenek C — Gerçek container tabanlı Bento (iptal edildi)

- `page > section > container > row/grid > field` hiyerarşisi kullanılır.
- Container’lar kendi gap, padding, background ve responsive kurallarını taşır.
- Alanlar container’lar arasında sürüklenir; mobil fallback her container için deterministik tanımlanır.

**Sonuç:** Sayfa oluşturucularda geçerli bir model olsa da bu input-form ürününde zorunlu değildir. Mevcut düz `FormField.config` verisiyle açılması migration, undo/redo, validation/error sırası, public/export parity ve yayınlama doğrulaması riskini artırır. Bu nedenle ürün kapsamından çıkarılmıştır.

**Karar:** Seçenek A ana ürün modelidir. Seçenek B ve C ana ürün kapsamına alınmaz. Bounded Grid/Bento presetleri ve interaktif kolon kontrolü korunur.

### Task 5.1: Canvas’tan kontrollü mouse resize ve satır davranışı (karar sonrası)

**Status:** COMPLETE — canvas Desktop/Tablet resize tutamacı, keyboard parity, `Tam genişlik` kısayolu ve açık `Yeni satırda başlat` davranışı teslim edildi; public/preview/inline/WordPress aynı normalize edilmiş layout sözleşmesini kullanıyor.

**Giriş kapıları:** Seçenek A onayı; Task 1–8 regresyonlarının yeşil olması; mevcut `config.layout` kayıtlarının migration gerektirmeden okunması.

**En küçük adımlar:**

1. [x] Seçili alanın row/column bağlamında yalnızca Desktop/Tablet resize tutamacını göster.
2. [x] Pointer capture ile kolon sınırını sürükle; değeri 1 kolon adımlarına snap et.
3. [x] Drag sırasında Desktop/Tablet değerini canlı güncelle, mobil tutamacını kapat.
4. [x] `Yeni satırda başlat` davranışını açık layout alanı olarak normalize et; `Tam genişlik` mevcut `colSpan=12` kuralı ile korunur.
5. [x] Minimum alan genişliği, taşma ve keyboard accessibility regresyonlarını test et.
6. [x] Public, preview, inline ve WordPress çıktılarında yeni satır semantiğinin aynı sonucunu doğrula.

**Kabul ölçütleri:** Mouse ve keyboard ile aynı sonuç; hiçbir alan çakışmıyor; uzun label/input taşmıyor; mobilde tüm alanlar tek kolon; save/publish sonrası değer korunuyor; public/export/admin arasında layout farkı oluşmuyor.

### Task 5.2: Responsive layout guidance (non-blocking)

**Status:** COMPLETE — dar kolonların alan türüne göre riskli olabileceği kullanıcıya gösteriliyor; kullanıcı seçimini zorla değiştirmiyor.

**Kural:** Paragraf, adres, dosya, matris ve imza gibi geniş içerikli alanlar Desktop’ta 6/12, Tablet’te 3/6 altına düştüğünde öneri gösterilir. Yan ikon/görsel kullanılan çok dar alanlar da ayrıca belirtilir. `Yeni satırda başlat` + `12/12` gibi görünür sonucu değiştirmeyen kombinasyonlar açıklanır.

**Kabul ölçütleri:** Öneri `role=status` ve `aria-live` ile erişilebilir; kaydetme/yayınlama engellenmez; layout değerleri otomatik değiştirilmez; mobil güvenli fallback korunur.

### Task 1: Layout ve decoration tip/normalize sözleşmesi

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/form-document.ts`
- Test: `tests/form-layout-contract.test.mjs`

**Interfaces:**
- Produces `FieldLayout`, `FieldDecoration`, `normalizeFieldLayout(value)` and `normalizeFieldDecoration(value)`.

- [x] Step 1: Add failing contract assertions for defaults, clamping and invalid positions.
- [x] Step 2: Run `node tests/form-layout-contract.test.mjs` and verify failure.
- [x] Step 3: Implement bounded types and pure normalizers without changing legacy keys.
- [x] Step 4: Run focused test and `node scripts/run-tests.mjs`.

### Task 2: Field API persistence gate

**Files:**
- Modify: `src/app/api/forms/[id]/fields/route.ts`
- Modify: `src/app/api/forms/[id]/fields/[fieldId]/route.ts`
- Test: `tests/form-layout-api.test.mjs`

**Interfaces:**
- Consumes the Task 1 normalizers.
- Produces sanitized `config.layout` and `config.decoration` in GET/POST/PATCH responses.

- [x] Step 1: Add route-contract tests requiring normalization before persistence.
- [x] Step 2: Run the focused test and verify failure.
- [x] Step 3: Normalize only the new nested keys and preserve unrelated config.
- [x] Step 4: Run focused API tests and full regression runner.

### Task 3: Canvas responsive grid renderer

**Files:**
- Modify: `src/components/mavenforms/builder/canvas.tsx`
- Test: `tests/builder-layout-renderer.test.mjs`

**Interfaces:**
- Consumes `field.config.layout`.
- Produces a CSS-grid canvas with safe span classes/styles, selected-device preview (desktop/tablet/mobile) and no horizontal overflow.

- [x] Step 1: Add renderer contract tests for grid template, mobile fallback and height tokens.
- [x] Step 2: Implement the smallest grid wrapper and field placement style.
- [x] Step 3: Preserve existing field selection, reorder, duplicate and delete actions.
- [x] Step 4: Run TypeScript, focused tests and browser canvas smoke check.

### Task 4: Grid/Bento wizard in the left palette

**Files:**
- Modify: `src/components/mavenforms/builder/field-palette.tsx`
- Modify: `src/components/mavenforms/views/form-builder-view.tsx`
- Test: `tests/builder-layout-wizard.test.mjs`

**Interfaces:**
- Consumes field list and `onUpdate` batch callback.
- Produces explicit Grid/Bento preset commands with no destructive field mutation; the guide remains collapsible so per-field layout editing is the primary workflow.

- [x] Step 1: Add preset contract tests for equal, asymmetric and bento layouts.
- [x] Step 2: Implement compact preview buttons and apply-to-all-fields behavior.
- [x] Step 3: Apply one batch update and keep current selection.
- [x] Step 4: Verify preset behavior in desktop and mobile browser views.

### Task 5: Width/height controls in properties panel

**Files:**
- Modify: `src/components/mavenforms/builder/properties-panel.tsx`
- Test: `tests/builder-field-layout-controls.test.mjs`

**Interfaces:**
- Consumes a selected `FormField`.
- Produces normalized `config.layout` updates via existing `onUpdate`; Desktop/Tablet values are adjusted with keyboard-accessible range controls and Mobile remains a safe 1/1 fallback.

- [x] Step 1: Add tests for width, tablet width, mobile fallback and height token controls.
- [x] Step 2: Add a `Düzen` tab using existing Button/Input/Select conventions.
- [x] Step 3: Ensure controls never write out-of-range values.
- [x] Step 4: Run focused tests and lint the panel.

### Task 6: Built-in and form-media decorations

**Files:**
- Modify: `src/components/mavenforms/builder/properties-panel.tsx`
- Modify: `src/components/mavenforms/builder/canvas.tsx`
- Modify: `src/components/mavenforms/media-picker.tsx` only if the existing form scope contract needs an adapter
- Test: `tests/builder-field-decoration.test.mjs`

**Interfaces:**
- Consumes `MediaPicker(formId)` and built-in icon registry.
- Produces `config.decoration` with explicit source, position, size and alt semantics.

- [x] Step 1: Add tests proving form scope is passed and raw external media IDs are not accepted.
- [x] Step 2: Add built-in icon selection and media selection UI.
- [x] Step 3: Render top/left/right decoration in canvas without disturbing field controls.
- [x] Step 4: Verify keyboard focus and active/hover states.

### Task 7: Public/preview/export renderer alignment

**Files:**
- Modify: `src/components/mavenforms/public-form-renderer.tsx`
- Modify: `src/lib/public-dto.ts`
- Test: `tests/public-form-layout.test.mjs`

**Interfaces:**
- Consumes sanitized field config.
- Produces identical responsive layout and safe decoration output for public and preview forms.

- [x] Step 1: Add tests for no internal IDs, one-column mobile fallback and decoration alt behavior.
- [x] Step 2: Implement shared normalized layout styles in the public renderer.
- [x] Step 3: Keep public media token generation and sanitizer allowlist unchanged except for safe decoration fields.
- [x] Step 4: Run public route tests and browser preview interaction check.

### Task 8: Regression, accessibility and release gate

**Files:**
- Test: `tests/form-layout-release-gate.test.mjs`
- Verify: `src/components/mavenforms/views/form-builder-view.tsx`, WordPress embed route, public form route

- [x] Step 1: Run `node scripts/run-tests.mjs`.
- [x] Step 2: Run `node node_modules/typescript/bin/tsc --noEmit`.
- [x] Step 3: Run targeted ESLint and `bun run build`.
- [x] Step 4: Verify `/api/ready` and browser preview at desktop/mobile-sized viewports.
- [x] Step 5: Confirm no unrelated payment, invoice, mail or media-scope regression.

### Task 9: Gerçek container tabanlı Bento ağacı

**Status:** CANCELLED — artık roadmap’de uygulanacak veya release’i bloke edecek bir görev değildir.

**Karar:** Builder düz alan listesi + normalize edilmiş responsive Grid düzeni olarak kalır. Bounded `Grid/Bento` presetleri yalnızca mevcut alanlara güvenli span dağılımı yapan yardımcılar olarak korunur.

**Gerekçe:** Container’lar page-builder ürünlerinde kullanılabilir; ancak bu ürünün input formunda zorunlu değildir. İç içe ağaç; migration, keyboard/read order, validation/error yerleşimi, undo/redo, public/preview/embed/WordPress eşitliği ve mobil fallback riskini artırır. Özelliği iptal etmek mevcut alan genişliği/yüksekliği ayarını kaybettirmez.

**Kapsam dışı:** İç içe container blokları, serbest masonry/absolute yerleşim, container seviyesinde responsive kurallar, container taşıma/silme sözleşmesi ve bu modeli zorunlu kılan release kapıları.

**Korunan çözüm:** Desktop/Tablet interaktif kolon resize, keyboard eşdeğeri, semantik yükseklik token’ları, mobilde 1/1 fallback, `Yeni satırda başlat`, bounded Grid/Bento presetleri ve public/preview/inline/WordPress parity.
