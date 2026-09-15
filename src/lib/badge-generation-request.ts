const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/u
export const BADGE_GENERATION_MAX_SUBMISSIONS = 500

export type BadgeGenerationRequest = Readonly<{
  templateId: string
  templateVersionId: string
  selectionMode: 'SINGLE' | 'SELECTED' | 'ALL'
  submissionIds: ReadonlyArray<string>
  faceMode?: 'SINGLE_FACE' | 'DUAL_FACE'
}>

export type BadgeGenerationRequestError = 'IDENTIFIER_INVALID' | 'SELECTION_MODE_INVALID' | 'SELECTION_EMPTY' | 'SELECTION_DUPLICATE' | 'SELECTION_TOO_LARGE'

export function validateBadgeGenerationRequest(input: BadgeGenerationRequest): { ok: true; request: BadgeGenerationRequest } | { ok: false; code: BadgeGenerationRequestError } {
  if (![input.templateId, input.templateVersionId].every(value => SAFE_ID.test(value))) return { ok: false, code: 'IDENTIFIER_INVALID' }
  if (!['SINGLE', 'SELECTED', 'ALL'].includes(input.selectionMode)) return { ok: false, code: 'SELECTION_MODE_INVALID' }
  const ids = input.submissionIds.map(id => id.trim())
  if (!ids.length && input.selectionMode !== 'ALL') return { ok: false, code: 'SELECTION_EMPTY' }
  if (ids.some(id => !SAFE_ID.test(id))) return { ok: false, code: 'IDENTIFIER_INVALID' }
  if (new Set(ids).size !== ids.length) return { ok: false, code: 'SELECTION_DUPLICATE' }
  if (ids.length > BADGE_GENERATION_MAX_SUBMISSIONS) return { ok: false, code: 'SELECTION_TOO_LARGE' }
  if (input.selectionMode === 'SINGLE' && ids.length !== 1) return { ok: false, code: 'SELECTION_EMPTY' }
  if (input.faceMode && !['SINGLE_FACE', 'DUAL_FACE'].includes(input.faceMode)) return { ok: false, code: 'IDENTIFIER_INVALID' }
  return { ok: true, request: { ...input, submissionIds: ids } }
}
