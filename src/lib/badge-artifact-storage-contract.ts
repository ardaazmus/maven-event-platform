export const BADGE_ARTIFACT_MAX_BYTES = 20_000_000

export type BadgeArtifactScanStatus = 'PENDING' | 'PASSED' | 'FAILED'
export type BadgeArtifactState = 'QUARANTINED' | 'READY' | 'BLOCKED'

export type BadgeArtifactDescriptor = Readonly<{
  artifactId: string
  workspaceId: string
  formId: string
  outputId: string
  storageKey: string
  mimeType: 'application/pdf'
  sizeBytes: number
  sha256: string
  visibility: 'private'
  state: BadgeArtifactState
  downloadable: boolean
}>

export type BadgeArtifactValidationCode =
  | 'OK'
  | 'IDENTIFIER_INVALID'
  | 'STORAGE_KEY_INVALID'
  | 'MIME_INVALID'
  | 'SIZE_INVALID'
  | 'SHA256_INVALID'
  | 'SCAN_STATUS_INVALID'

function isOpaqueIdentifier(value: string) {
  return /^[A-Za-z0-9_-]{1,128}$/u.test(value)
}

function isSafeStorageKey(value: string, workspaceId: string, formId: string, artifactId: string) {
  return new RegExp(`^badge/${workspaceId}/${formId}/${artifactId}/[A-Za-z0-9_-]{1,128}\\.pdf$`, 'u').test(value)
}

function stateForScanStatus(scanStatus: BadgeArtifactScanStatus): BadgeArtifactState {
  if (scanStatus === 'PENDING') return 'QUARANTINED'
  return scanStatus === 'PASSED' ? 'READY' : 'BLOCKED'
}

export function createBadgeArtifactDescriptor(input: Readonly<{
  artifactId: string
  workspaceId: string
  formId: string
  outputId: string
  storageKey: string
  mimeType: string
  sizeBytes: number
  sha256: string
  scanStatus: BadgeArtifactScanStatus
}>): { ok: true; descriptor: BadgeArtifactDescriptor } | { ok: false; code: BadgeArtifactValidationCode } {
  if (![input.artifactId, input.workspaceId, input.formId, input.outputId].every(isOpaqueIdentifier)) {
    return { ok: false, code: 'IDENTIFIER_INVALID' }
  }
  if (!isSafeStorageKey(input.storageKey, input.workspaceId, input.formId, input.artifactId)) {
    return { ok: false, code: 'STORAGE_KEY_INVALID' }
  }
  if (input.mimeType !== 'application/pdf') return { ok: false, code: 'MIME_INVALID' }
  if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes < 1 || input.sizeBytes > BADGE_ARTIFACT_MAX_BYTES) {
    return { ok: false, code: 'SIZE_INVALID' }
  }
  if (!/^[a-f0-9]{64}$/u.test(input.sha256)) return { ok: false, code: 'SHA256_INVALID' }
  if (!['PENDING', 'PASSED', 'FAILED'].includes(input.scanStatus)) return { ok: false, code: 'SCAN_STATUS_INVALID' }

  const state = stateForScanStatus(input.scanStatus)
  return {
    ok: true,
    descriptor: {
      artifactId: input.artifactId,
      workspaceId: input.workspaceId,
      formId: input.formId,
      outputId: input.outputId,
      storageKey: input.storageKey,
      mimeType: 'application/pdf',
      sizeBytes: input.sizeBytes,
      sha256: input.sha256,
      visibility: 'private',
      state,
      downloadable: state === 'READY',
    },
  }
}
