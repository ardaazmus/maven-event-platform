export const BADGE_UI_DESKTOP_MIN_WIDTH = 1024
export const BADGE_UI_MIN_TOUCH_TARGET = 44

export type BadgeUiLayout = Readonly<{
  columns: 1 | 2
  previewFirst: true
  horizontalOverflow: false
}>

export type BadgeUiControl = Readonly<{
  label?: string
  ariaLabel?: string
  widthPx: number
  heightPx: number
  tabIndex: number
  focusVisible: boolean
}>

export type BadgeUiValidationCode =
  | 'VIEWPORT_INVALID'
  | 'HORIZONTAL_OVERFLOW'
  | 'CONTROL_LABEL_REQUIRED'
  | 'TOUCH_TARGET_TOO_SMALL'
  | 'KEYBOARD_ORDER_INVALID'
  | 'FOCUS_NOT_VISIBLE'
  | 'CONTROLS_REQUIRED'

export function resolveBadgeUiLayout(viewportWidth: number): BadgeUiLayout | { ok: false; code: 'VIEWPORT_INVALID' } {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return { ok: false, code: 'VIEWPORT_INVALID' }
  return {
    columns: viewportWidth >= BADGE_UI_DESKTOP_MIN_WIDTH ? 2 : 1,
    previewFirst: true,
    horizontalOverflow: false,
  }
}

export function validateBadgeUiContract(input: Readonly<{
  viewportWidth: number
  contentWidth: number
  controls: ReadonlyArray<BadgeUiControl>
}>): { ok: true; layout: BadgeUiLayout } | { ok: false; code: BadgeUiValidationCode; index?: number } {
  const layout = resolveBadgeUiLayout(input.viewportWidth)
  if ('code' in layout) return layout
  if (!Number.isFinite(input.contentWidth) || input.contentWidth <= 0 || input.contentWidth > input.viewportWidth) return { ok: false, code: 'HORIZONTAL_OVERFLOW' }
  if (!input.controls.length) return { ok: false, code: 'CONTROLS_REQUIRED' }

  for (const [index, control] of input.controls.entries()) {
    if (!(control.label?.trim() || control.ariaLabel?.trim())) return { ok: false, code: 'CONTROL_LABEL_REQUIRED', index }
    if (!Number.isFinite(control.widthPx) || !Number.isFinite(control.heightPx) || control.widthPx < BADGE_UI_MIN_TOUCH_TARGET || control.heightPx < BADGE_UI_MIN_TOUCH_TARGET) return { ok: false, code: 'TOUCH_TARGET_TOO_SMALL', index }
    if (!Number.isInteger(control.tabIndex) || control.tabIndex > 0) return { ok: false, code: 'KEYBOARD_ORDER_INVALID', index }
    if (!control.focusVisible) return { ok: false, code: 'FOCUS_NOT_VISIBLE', index }
  }

  return { ok: true, layout }
}
