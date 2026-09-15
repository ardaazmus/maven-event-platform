# Form Layout ve Alan Dekorasyonu Tasarım Sözleşmesi

## Amaç

Form builder içinde alanların güvenli ve responsive biçimde genişlik/yükseklik ayarı almasını, mevcut alanlara uygulanabilen 12 kolonlu Grid ve bounded Bento düzenlerini görsel bir sihirbazla sunmayı ve her alanın form scope medya klasöründen ikon/görsel taşımasını sağlamak.

## Mevcut durum ve sınırlar

- `src/lib/form-document.ts` versioned node tree ve 12 kolon doğrulaması içeriyor; ancak mevcut canvas halen `fields.map(...)` ile tek dikey akış oluşturuyor.
- `FormField.config` JSON olarak saklanıyor. İlk uygulama mevcut formları bozmamak için alan layout/dekorasyon verisini bu yapı içinde taşır.
- `FormVersion.schemaJson` publish snapshot kaynağıdır; public DTO yalnızca güvenli allowlist çıktısı üretir.
- Form medyası `formId` scope’u ile seçilir. Global marka medyası form alanlarına açılmaz.
- Ödeme, fatura, mail ve mevcut public güvenlik akışları bu çalışmanın kapsamı dışındadır.

## Veri sözleşmesi

```ts
type FieldLayout = {
  colSpan?: number       // desktop: 1..12, default 12
  tabletColSpan?: number // tablet: 1..6, default min(colSpan, 6)
  mobileColSpan?: 1     // mobile: always one column in v1
  height?: 'auto' | 'compact' | 'standard' | 'tall'
}

type FieldDecoration = {
  source: 'builtin' | 'media'
  iconName?: string
  mediaAssetId?: string | null
  position: 'top' | 'left' | 'right'
  size: 'sm' | 'md' | 'lg'
  altText?: string
  decorative?: boolean
}
```

`FieldConfig` içine yalnızca `layout?: FieldLayout` ve `decoration?: FieldDecoration` eklenir. Bilinmeyen eski config anahtarları korunur. Geçersiz değerler UI ve API normalizasyonunda varsayılanlara döner; public renderer ham kullanıcı CSS’i çalıştırmaz.

## Yerleşim modeli

- Desktop 12 kolon; tablet 6 kolon; mobile tek kolon.
- Canvas, seçili alanları `grid` içinde gösterir; alan sırası `sortOrder` ile korunur.
- Sihirbaz mevcut alanları silmez, yalnızca layout değerlerini günceller.
- Bento presetleri yalnızca izin verilen kolon span dizilerini üretir; serbest grid CSS kabul edilmez.
- Yükseklik piksel yerine dört token ile sınırlıdır: `auto`, `compact`, `standard`, `tall`.
- `min-width: 0`, güvenli overflow ve uzun label wrapping kuralları tüm public/export renderer’larda zorunludur.

## Sihirbaz davranışı

Sol panelde `Yerleşim` bölümü bulunur. Grid ve bounded Bento presetleri küçük görsel önizleme ile listelenir. Uygulama kapsamı açıkça belirtilir: `Tüm alanlar` veya `Seçili alanlar`. Presetler yeni container oluşturmaz; yalnızca mevcut düz alanların güvenli layout değerlerini günceller. İlk sürümde preset uygulaması undo/redo kapsamındaki tek bir işlem gibi davranır.

## Alan ikon/görsel davranışı

- Built-in ikonlar lucide ailesinden seçilir.
- Upload ve seçim yalnızca `MediaPicker formId={formId}` üzerinden yapılır.
- Public renderer media ID göstermez; yayınlanmış güvenli media URL’sini kullanır.
- `top` konumu blok üstünde, `left/right` konumları alan kontrolüyle aynı satırda görünür.
- Dekoratif görsellerde `alt=""` ve `aria-hidden` kullanılır; anlamlı görselde alt metin zorunludur.
- Dosya temizleme ve public token akışları mevcut media güvenlik sözleşmesini değiştirmez.

## Kabul kriterleri

1. Eski form alanları migration olmadan tek kolon ve aynı sırada görünür.
2. Grid/Bento presetleri alan kaybı olmadan uygulanır ve yeniden yüklemede korunur.
3. Public, preview, inline ve WordPress render’larında kolon taşması oluşmaz.
4. Mobilde hiçbir alan yatay scroll oluşturmaz; alanlar tek kolon fallback’e iner.
5. Form scope dışındaki media ID’leri API ve UI tarafından kabul edilmez.
6. Icon/görsel seçimi public çıktıda internal ID, admin URL veya secret üretmez.
7. TypeScript, mevcut test runner, layout sözleşme testleri ve production build geçer.
