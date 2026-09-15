import type { BadgeOutputFieldKey, BadgeProjection } from './badge-field-mapping'

export type BadgeRenderBox = Readonly<{
  xPt: number
  yPt: number
  widthPt: number
  heightPt: number
}>

export type BadgeTextPlacement = Readonly<{
  key: BadgeOutputFieldKey
  box: BadgeRenderBox
  maxChars: number
  maxLines: number
}>

export type BadgeQrPlacement = Readonly<{
  box: BadgeRenderBox
  vector: boolean
  quietZoneModules: number
}>

export type BadgeFrontRenderInput = Readonly<{
  pageWidthPt: number
  pageHeightPt: number
  safeArea: BadgeRenderBox
  backgroundAssetId: string
  textPlacements: ReadonlyArray<BadgeTextPlacement>
  qrPlacement?: BadgeQrPlacement
  values: BadgeProjection
  backPage?: unknown
}>

export type BadgeFrontRenderPlan = Readonly<{
  pageCount: 1
  faces: readonly ['front']
  backgroundAssetId: string
  values: BadgeProjection
  textPlacements: ReadonlyArray<BadgeTextPlacement>
  qrPlacement?: BadgeQrPlacement
}>

export type BadgeFrontRenderValidationCode =
  | 'OK'
  | 'BACKGROUND_REQUIRED'
  | 'DIMENSION_INVALID'
  | 'SAFE_AREA_INVALID'
  | 'BOX_OUTSIDE_SAFE_AREA'
  | 'TEXT_LIMIT_INVALID'
  | 'TEXT_OVERFLOW'
  | 'QR_NOT_VECTOR'
  | 'QR_INVALID'
  | 'BACK_PAGE_NOT_ALLOWED'

function isPositive(value: number) {
  return Number.isFinite(value) && value > 0
}

function isValidBox(box: BadgeRenderBox) {
  return [box.xPt, box.yPt, box.widthPt, box.heightPt].every(Number.isFinite) && box.widthPt > 0 && box.heightPt > 0
}

function isInside(inner: BadgeRenderBox, outer: BadgeRenderBox) {
  return (
    inner.xPt >= outer.xPt &&
    inner.yPt >= outer.yPt &&
    inner.xPt + inner.widthPt <= outer.xPt + outer.widthPt &&
    inner.yPt + inner.heightPt <= outer.yPt + outer.heightPt
  )
}

function hasTextOverflow(value: string, placement: BadgeTextPlacement) {
  const lines = value.split('\n')
  return value.length > placement.maxChars || lines.length > placement.maxLines
}

export function validateBadgeFrontRender(
  input: BadgeFrontRenderInput,
): { ok: true; plan: BadgeFrontRenderPlan } | { ok: false; code: BadgeFrontRenderValidationCode; field?: string } {
  if (!input.backgroundAssetId.trim()) return { ok: false, code: 'BACKGROUND_REQUIRED' }
  if (!isPositive(input.pageWidthPt) || !isPositive(input.pageHeightPt)) return { ok: false, code: 'DIMENSION_INVALID' }
  if (!isValidBox(input.safeArea) || !isInside(input.safeArea, { xPt: 0, yPt: 0, widthPt: input.pageWidthPt, heightPt: input.pageHeightPt })) {
    return { ok: false, code: 'SAFE_AREA_INVALID' }
  }
  if (input.backPage !== undefined) return { ok: false, code: 'BACK_PAGE_NOT_ALLOWED' }

  for (const placement of input.textPlacements) {
    if (!isValidBox(placement.box) || !isInside(placement.box, input.safeArea)) return { ok: false, code: 'BOX_OUTSIDE_SAFE_AREA', field: placement.key }
    if (!Number.isSafeInteger(placement.maxChars) || placement.maxChars <= 0 || !Number.isSafeInteger(placement.maxLines) || placement.maxLines <= 0) {
      return { ok: false, code: 'TEXT_LIMIT_INVALID', field: placement.key }
    }
    const value = input.values[placement.key]
    if (value && hasTextOverflow(value, placement)) return { ok: false, code: 'TEXT_OVERFLOW', field: placement.key }
  }

  if (input.qrPlacement) {
    if (!isValidBox(input.qrPlacement.box) || !isInside(input.qrPlacement.box, input.safeArea)) return { ok: false, code: 'BOX_OUTSIDE_SAFE_AREA', field: 'qr' }
    if (!input.qrPlacement.vector) return { ok: false, code: 'QR_NOT_VECTOR' }
    if (!Number.isSafeInteger(input.qrPlacement.quietZoneModules) || input.qrPlacement.quietZoneModules < 4) return { ok: false, code: 'QR_INVALID' }
  }

  return {
    ok: true,
    plan: {
      pageCount: 1,
      faces: ['front'],
      backgroundAssetId: input.backgroundAssetId,
      values: input.values,
      textPlacements: input.textPlacements,
      ...(input.qrPlacement ? { qrPlacement: input.qrPlacement } : {}),
    },
  }
}
