export type BadgeEntrySurface = 'FORM_DETAIL' | 'SUBMISSION_SELECTION'
export type BadgeEntrySelectionMode = 'SINGLE' | 'SELECTED' | 'ALL'

export type BadgeEntryContext = Readonly<{
  surface: BadgeEntrySurface
  selectionMode: BadgeEntrySelectionMode
  workspaceId: string
  formId: string
  formStatus: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'
  authenticated: boolean
  userId: string
  canReadBadge: boolean
  selectedSubmissionIds: ReadonlyArray<string>
  eligibleSubmissionIds: ReadonlyArray<string>
}>

export type BadgeEntry = Readonly<{
  surface: BadgeEntrySurface
  selectionMode: BadgeEntrySelectionMode
  workspaceId: string
  formId: string
  submissionIds: ReadonlyArray<string>
}>

export type BadgeEntryValidationCode =
  | 'AUTH_REQUIRED'
  | 'BADGE_READ_FORBIDDEN'
  | 'SCOPE_REQUIRED'
  | 'FORM_NOT_PUBLISHED'
  | 'SELECTION_MODE_INVALID'
  | 'SELECTION_REQUIRED'
  | 'SELECTION_DUPLICATE'
  | 'SELECTION_TOO_LARGE'
  | 'SELECTION_OUTSIDE_ELIGIBLE'

const MAX_ENTRY_SELECTIONS = 500

function isSafeIdentifier(value: string) {
  return Boolean(value.trim()) && !/[\\/:\s]/u.test(value)
}

function normalizeIds(ids: ReadonlyArray<string>) {
  const normalized = ids.map(id => id.trim())
  if (normalized.some(id => !isSafeIdentifier(id))) return { ok: false as const, code: 'SCOPE_REQUIRED' as const }
  if (new Set(normalized).size !== normalized.length) return { ok: false as const, code: 'SELECTION_DUPLICATE' as const }
  return { ok: true as const, ids: normalized }
}

export function createBadgeEntry(input: BadgeEntryContext): { ok: true; entry: BadgeEntry } | { ok: false; code: BadgeEntryValidationCode } {
  if (!input.authenticated || !input.userId.trim()) return { ok: false, code: 'AUTH_REQUIRED' }
  if (!input.canReadBadge) return { ok: false, code: 'BADGE_READ_FORBIDDEN' }
  if (!isSafeIdentifier(input.workspaceId) || !isSafeIdentifier(input.formId)) return { ok: false, code: 'SCOPE_REQUIRED' }
  if (input.formStatus !== 'PUBLISHED') return { ok: false, code: 'FORM_NOT_PUBLISHED' }
  if (!['FORM_DETAIL', 'SUBMISSION_SELECTION'].includes(input.surface) || !['SINGLE', 'SELECTED', 'ALL'].includes(input.selectionMode)) return { ok: false, code: 'SELECTION_MODE_INVALID' }

  const selected = normalizeIds(input.selectedSubmissionIds)
  const eligible = normalizeIds(input.eligibleSubmissionIds)
  if (!selected.ok) return selected
  if (!eligible.ok) return eligible

  const ids = input.selectionMode === 'ALL' ? eligible.ids : selected.ids
  if (!ids.length) return { ok: false, code: 'SELECTION_REQUIRED' }
  if (ids.length > MAX_ENTRY_SELECTIONS) return { ok: false, code: 'SELECTION_TOO_LARGE' }
  if (input.selectionMode === 'SINGLE' && ids.length !== 1) return { ok: false, code: 'SELECTION_REQUIRED' }
  if (input.selectionMode !== 'ALL' && ids.some(id => !eligible.ids.includes(id))) return { ok: false, code: 'SELECTION_OUTSIDE_ELIGIBLE' }

  return {
    ok: true,
    entry: {
      surface: input.surface,
      selectionMode: input.selectionMode,
      workspaceId: input.workspaceId,
      formId: input.formId,
      submissionIds: ids,
    },
  }
}
