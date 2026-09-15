export const BADGE_FLIP_EDGES = ['LONG_EDGE', 'SHORT_EDGE'] as const
export type BadgeFlipEdge = (typeof BADGE_FLIP_EDGES)[number]
export type BadgeFaceMode = 'SINGLE_FACE' | 'DUAL_FACE'
export type BadgePrintOrientation = 'portrait' | 'landscape'

export type BadgePrintProfile = Readonly<{
  id: string
  widthPt: number
  heightPt: number
  bleedPt: number
  safeArea: Readonly<{ xPt: number; yPt: number; widthPt: number; heightPt: number }>
  orientation: BadgePrintOrientation
}>

export type BadgePreviewPage = Readonly<{
  face: 'front' | 'back'
  order: 1 | 2
  assetId: string
}>

export type BadgePrintPreviewPlan = Readonly<{
  printProfileId: string
  pages: ReadonlyArray<BadgePreviewPage>
  flipEdge: BadgeFlipEdge | null
  flipEdgeLabel: string | null
}>

export type BadgePrintPreviewValidationCode =
  | 'OK'
  | 'FACE_CONFIGURATION_INVALID'
  | 'PRINT_PROFILE_REQUIRED'
  | 'PRINT_DIMENSION_INVALID'
  | 'SAFE_AREA_INVALID'
  | 'ORIENTATION_MISMATCH'
  | 'FLIP_EDGE_REQUIRED'
  | 'FLIP_EDGE_NOT_ALLOWED'

function isPositive(value: number) {
  return Number.isFinite(value) && value > 0
}

function isSafeAreaValid(profile: BadgePrintProfile) {
  const safeArea = profile.safeArea
  return [safeArea.xPt, safeArea.yPt, safeArea.widthPt, safeArea.heightPt].every(Number.isFinite) &&
    safeArea.widthPt > 0 &&
    safeArea.heightPt > 0 &&
    safeArea.xPt >= 0 &&
    safeArea.yPt >= 0 &&
    safeArea.xPt + safeArea.widthPt <= profile.widthPt &&
    safeArea.yPt + safeArea.heightPt <= profile.heightPt
}

export function buildBadgePrintPreviewPlan(input: Readonly<{
  mode: BadgeFaceMode
  frontAssetId: string
  backAssetId?: string | null
  printProfile: BadgePrintProfile
  flipEdge?: BadgeFlipEdge | null
}>): { ok: true; plan: BadgePrintPreviewPlan } | { ok: false; code: BadgePrintPreviewValidationCode } {
  const frontAssetId = input.frontAssetId.trim()
  const backAssetId = input.backAssetId?.trim() || null
  if (!frontAssetId || (input.mode === 'DUAL_FACE' && !backAssetId) || (input.mode === 'SINGLE_FACE' && backAssetId) || (input.mode !== 'SINGLE_FACE' && input.mode !== 'DUAL_FACE')) {
    return { ok: false, code: 'FACE_CONFIGURATION_INVALID' }
  }
  const profile = input.printProfile

  if (!profile.id.trim()) return { ok: false, code: 'PRINT_PROFILE_REQUIRED' }
  if (!isPositive(profile.widthPt) || !isPositive(profile.heightPt) || !Number.isFinite(profile.bleedPt) || profile.bleedPt < 0 || profile.bleedPt * 2 >= Math.min(profile.widthPt, profile.heightPt)) {
    return { ok: false, code: 'PRINT_DIMENSION_INVALID' }
  }
  if (!isSafeAreaValid(profile)) return { ok: false, code: 'SAFE_AREA_INVALID' }
  if ((profile.orientation === 'portrait' && profile.widthPt > profile.heightPt) || (profile.orientation === 'landscape' && profile.widthPt < profile.heightPt)) {
    return { ok: false, code: 'ORIENTATION_MISMATCH' }
  }

  const flipEdge = input.flipEdge ?? null
  if (input.mode === 'SINGLE_FACE' && flipEdge) return { ok: false, code: 'FLIP_EDGE_NOT_ALLOWED' }
  if (input.mode === 'DUAL_FACE' && !flipEdge) return { ok: false, code: 'FLIP_EDGE_REQUIRED' }
  const requiredBackAssetId = backAssetId as string

  return {
    ok: true,
    plan: {
      printProfileId: profile.id,
      pages: input.mode === 'SINGLE_FACE'
        ? [{ face: 'front', order: 1, assetId: frontAssetId }]
        : [
            { face: 'front', order: 1, assetId: frontAssetId },
            { face: 'back', order: 2, assetId: requiredBackAssetId },
          ],
      flipEdge,
      flipEdgeLabel: flipEdge === 'LONG_EDGE' ? 'Uzun kenardan çevir' : flipEdge === 'SHORT_EDGE' ? 'Kısa kenardan çevir' : null,
    },
  }
}
