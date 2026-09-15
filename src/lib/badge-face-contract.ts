export const BADGE_FACE_MODES = ['SINGLE_FACE', 'DUAL_FACE'] as const
export type BadgeFaceMode = (typeof BADGE_FACE_MODES)[number]

export type BadgeFaceRenderPlan =
  | Readonly<{
      ok: true
      mode: 'SINGLE_FACE'
      pageCount: 1
      faces: readonly ['front']
      frontAssetId: string
    }>
  | Readonly<{
      ok: true
      mode: 'DUAL_FACE'
      pageCount: 2
      faces: readonly ['front', 'back']
      frontAssetId: string
      backAssetId: string
    }>

export type BadgeFaceValidationCode =
  | 'OK'
  | 'FRONT_REQUIRED'
  | 'BACK_NOT_ALLOWED'
  | 'BACK_ASSET_REQUIRED'
  | 'MODE_INVALID'

export function buildBadgeFaceRenderPlan(input: Readonly<{
  mode: BadgeFaceMode
  frontAssetId: string
  backAssetId?: string | null
}>): BadgeFaceRenderPlan | { ok: false; code: BadgeFaceValidationCode } {
  const frontAssetId = input.frontAssetId.trim()
  const backAssetId = input.backAssetId?.trim() || null

  if (!frontAssetId) return { ok: false, code: 'FRONT_REQUIRED' }
  if (!BADGE_FACE_MODES.includes(input.mode)) return { ok: false, code: 'MODE_INVALID' }

  if (input.mode === 'SINGLE_FACE') {
    return backAssetId ? { ok: false, code: 'BACK_NOT_ALLOWED' } : {
      ok: true,
      mode: 'SINGLE_FACE',
      pageCount: 1,
      faces: ['front'],
      frontAssetId,
    }
  }

  if (!backAssetId) return { ok: false, code: 'BACK_ASSET_REQUIRED' }
  return {
    ok: true,
    mode: 'DUAL_FACE',
    pageCount: 2,
    faces: ['front', 'back'],
    frontAssetId,
    backAssetId,
  }
}
