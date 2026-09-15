import assert from 'node:assert/strict'
import { validateBadgeUiContract, resolveBadgeUiLayout } from '../src/lib/badge-ui-contract.ts'

const controls = [
  { label: 'Önizlemeyi aç', widthPx: 120, heightPx: 44, tabIndex: 0, focusVisible: true },
  { ariaLabel: 'ZIP indir', widthPx: 44, heightPx: 48, tabIndex: 0, focusVisible: true },
]

assert.deepEqual(resolveBadgeUiLayout(390), { columns: 1, previewFirst: true, horizontalOverflow: false })
assert.deepEqual(resolveBadgeUiLayout(1280), { columns: 2, previewFirst: true, horizontalOverflow: false })
assert.deepEqual(validateBadgeUiContract({ viewportWidth: 390, contentWidth: 390, controls }), {
  ok: true,
  layout: { columns: 1, previewFirst: true, horizontalOverflow: false },
})
assert.deepEqual(validateBadgeUiContract({ viewportWidth: 1280, contentWidth: 1200, controls }).layout, { columns: 2, previewFirst: true, horizontalOverflow: false })
assert.deepEqual(validateBadgeUiContract({ viewportWidth: 390, contentWidth: 391, controls }), { ok: false, code: 'HORIZONTAL_OVERFLOW' })
assert.deepEqual(validateBadgeUiContract({ viewportWidth: 390, contentWidth: 390, controls: [{ ...controls[0], label: '', ariaLabel: '' }] }), { ok: false, code: 'CONTROL_LABEL_REQUIRED', index: 0 })
assert.deepEqual(validateBadgeUiContract({ viewportWidth: 390, contentWidth: 390, controls: [{ ...controls[0], heightPx: 43 }] }), { ok: false, code: 'TOUCH_TARGET_TOO_SMALL', index: 0 })
assert.deepEqual(validateBadgeUiContract({ viewportWidth: 390, contentWidth: 390, controls: [{ ...controls[0], tabIndex: 2 }] }), { ok: false, code: 'KEYBOARD_ORDER_INVALID', index: 0 })
assert.deepEqual(validateBadgeUiContract({ viewportWidth: 390, contentWidth: 390, controls: [{ ...controls[0], focusVisible: false }] }), { ok: false, code: 'FOCUS_NOT_VISIBLE', index: 0 })

console.log('badge-ui-contract: all assertions passed')
