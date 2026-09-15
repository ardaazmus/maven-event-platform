import assert from 'node:assert'
import { normalizeFieldDecoration, normalizeFieldLayout } from '../src/lib/form-document.ts'

assert.deepStrictEqual(normalizeFieldLayout({ colSpan: 18, tabletColSpan: 0, height: 'invalid' }), {
  colSpan: 12,
  tabletColSpan: 1,
  mobileColSpan: 1,
  height: 'auto',
  breakBefore: false,
})
assert.deepStrictEqual(normalizeFieldLayout({ colSpan: 4 }), {
  colSpan: 4,
  tabletColSpan: 4,
  mobileColSpan: 1,
  height: 'auto',
  breakBefore: false,
})
assert.strictEqual(normalizeFieldLayout({ breakBefore: true }).breakBefore, true)
assert.deepStrictEqual(normalizeFieldDecoration({ source: 'media', position: 'bottom', size: 'xl', mediaAssetId: ' asset-1 ', altText: 'a'.repeat(200) }), {
  source: 'media',
  position: 'top',
  size: 'md',
  mediaAssetId: 'asset-1',
  altText: 'a'.repeat(160),
  decorative: false,
})
assert.strictEqual(normalizeFieldDecoration(null), null)

console.log('form-layout-contract.test: PASS (AC-LAYOUT-01)')
