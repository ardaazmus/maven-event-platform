export type BadgeEntrySurface = 'FORM_DETAIL' | 'SUBMISSION_SELECTION'

export type BadgeEntrySurfaceDecision = Readonly<{
  surface: BadgeEntrySurface
  visibility: 'VISIBLE' | 'DISABLED' | 'HIDDEN'
  action: 'CREATE_BADGE' | null
  reason: 'READY' | 'AUTH_REQUIRED' | 'BADGE_READ_FORBIDDEN' | 'FORM_NOT_PUBLISHED' | 'SCOPE_REQUIRED' | 'SELECTION_REQUIRED'
}>

export function resolveBadgeEntrySurface(input: Readonly<{
  surface: BadgeEntrySurface
  authenticated: boolean
  canReadBadge: boolean
  formStatus: 'draft' | 'published' | 'paused' | 'archived'
  workspaceMatchesForm: boolean
  eligibleSubmissionCount: number
}>): BadgeEntrySurfaceDecision {
  if (!input.authenticated) return { surface: input.surface, visibility: 'HIDDEN', action: null, reason: 'AUTH_REQUIRED' }
  if (!input.canReadBadge) return { surface: input.surface, visibility: 'HIDDEN', action: null, reason: 'BADGE_READ_FORBIDDEN' }
  if (!input.workspaceMatchesForm) return { surface: input.surface, visibility: 'HIDDEN', action: null, reason: 'SCOPE_REQUIRED' }
  if (input.formStatus !== 'published') return { surface: input.surface, visibility: 'DISABLED', action: null, reason: 'FORM_NOT_PUBLISHED' }
  if (!Number.isSafeInteger(input.eligibleSubmissionCount) || input.eligibleSubmissionCount < 1) {
    return { surface: input.surface, visibility: 'DISABLED', action: null, reason: 'SELECTION_REQUIRED' }
  }
  return { surface: input.surface, visibility: 'VISIBLE', action: 'CREATE_BADGE', reason: 'READY' }
}
