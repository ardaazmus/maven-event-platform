export type BadgeExportFaceMode = 'SINGLE_FACE' | 'DUAL_FACE'
export type BadgeExportEntryStatus = 'SUCCEEDED' | 'FAILED'

export type BadgeExportEntryInput = Readonly<{
  submissionId: string
  artifactId: string
  filename?: string
  status: BadgeExportEntryStatus
  errorCode?: string
}>

export type BadgeExportManifestEntry = Readonly<{
  submissionId: string
  artifactId: string
  filename?: string
  status: BadgeExportEntryStatus
  errorCode?: string
}>

export type BadgeExportPackage = Readonly<{
  combinedPdfName: 'combined-front.pdf' | 'combined-duplex.pdf'
  zipName: string
  filesInZip: ReadonlyArray<string>
  exportable: boolean
  manifest: Readonly<{
    jobId: string
    workspaceId: string
    formId: string
    templateVersionId: string
    printProfileId: string
    faceMode: BadgeExportFaceMode
    total: number
    succeeded: number
    failed: number
    entries: ReadonlyArray<BadgeExportManifestEntry>
  }>
}>

export type BadgeExportValidationCode =
  | 'OK'
  | 'IDENTIFIER_INVALID'
  | 'FACE_MODE_INVALID'
  | 'NO_ENTRIES'
  | 'DUPLICATE_SUBMISSION'
  | 'DUPLICATE_FILENAME'
  | 'SUCCESS_FILENAME_REQUIRED'
  | 'FILENAME_INVALID'
  | 'ERROR_CODE_INVALID'

function isSafeIdentifier(value: string) {
  return Boolean(value.trim()) && !/[\\/:\s]/u.test(value)
}

function isSafeFilename(value: string) {
  return Boolean(value.trim()) && value.toLowerCase().endsWith('.pdf') && !/[\\/:*?"<>|\u0000-\u001f]/u.test(value)
}

function filenameCollisionKey(value: string) {
  return value.normalize('NFC').toLocaleLowerCase('en-US')
}

function isSafeErrorCode(value: string) {
  return /^[A-Z0-9_:-]{1,64}$/u.test(value)
}

export function buildBadgeExportPackage(input: Readonly<{
  jobId: string
  workspaceId: string
  formId: string
  templateVersionId: string
  printProfileId: string
  faceMode: BadgeExportFaceMode
  entries: ReadonlyArray<BadgeExportEntryInput>
}>): { ok: true; package: BadgeExportPackage } | { ok: false; code: BadgeExportValidationCode; value?: string } {
  if (![input.jobId, input.workspaceId, input.formId, input.templateVersionId, input.printProfileId].every(isSafeIdentifier)) return { ok: false, code: 'IDENTIFIER_INVALID' }
  if (input.faceMode !== 'SINGLE_FACE' && input.faceMode !== 'DUAL_FACE') return { ok: false, code: 'FACE_MODE_INVALID' }
  if (!input.entries.length) return { ok: false, code: 'NO_ENTRIES' }

  const submissions = new Set<string>()
  const filenames = new Set<string>()
  const entries: BadgeExportManifestEntry[] = []
  const filesInZip: string[] = []

  for (const entry of input.entries) {
    if (![entry.submissionId, entry.artifactId].every(isSafeIdentifier)) return { ok: false, code: 'IDENTIFIER_INVALID' }
    if (submissions.has(entry.submissionId)) return { ok: false, code: 'DUPLICATE_SUBMISSION', value: entry.submissionId }
    submissions.add(entry.submissionId)
    if (entry.status === 'SUCCEEDED') {
      if (!entry.filename) return { ok: false, code: 'SUCCESS_FILENAME_REQUIRED', value: entry.artifactId }
      if (!isSafeFilename(entry.filename)) return { ok: false, code: 'FILENAME_INVALID', value: entry.filename }
      const collisionKey = filenameCollisionKey(entry.filename)
      if (filenames.has(collisionKey)) return { ok: false, code: 'DUPLICATE_FILENAME', value: entry.filename }
      filenames.add(collisionKey)
      filesInZip.push(entry.filename)
    }
    if (entry.errorCode && !isSafeErrorCode(entry.errorCode)) return { ok: false, code: 'ERROR_CODE_INVALID', value: entry.errorCode }
    entries.push({
      submissionId: entry.submissionId,
      artifactId: entry.artifactId,
      ...(entry.filename ? { filename: entry.filename } : {}),
      status: entry.status,
      ...(entry.errorCode ? { errorCode: entry.errorCode } : {}),
    })
  }

  const succeeded = entries.filter(entry => entry.status === 'SUCCEEDED').length
  return {
    ok: true,
    package: {
      combinedPdfName: input.faceMode === 'SINGLE_FACE' ? 'combined-front.pdf' : 'combined-duplex.pdf',
      zipName: `badge-export-${input.jobId}.zip`,
      filesInZip,
      exportable: succeeded > 0,
      manifest: {
        jobId: input.jobId,
        workspaceId: input.workspaceId,
        formId: input.formId,
        templateVersionId: input.templateVersionId,
        printProfileId: input.printProfileId,
        faceMode: input.faceMode,
        total: entries.length,
        succeeded,
        failed: entries.length - succeeded,
        entries,
      },
    },
  }
}
