import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { PDFDocument } from 'pdf-lib'
import { executeBadgeGeneration } from '../src/lib/badge-generation-execution.ts'
import { readReadyBadgePdfArtifact } from '../src/lib/badge-artifact-storage.ts'

const root = await mkdtemp(`${tmpdir()}\\mavenforms-badge-execution-`)
try {
  const pdf = await PDFDocument.create()
  pdf.addPage([300, 180])
  const backgroundPdfBytes = await pdf.save()
  const job = {
    jobId: 'job-1',
    workspaceId: 'workspace-1',
    formId: 'form-1',
    templateVersionId: 'version-1',
    snapshotHash: 'snapshot-hash-1',
    printProfileId: 'profile-1',
    surface: 'FORM_DETAIL',
    selectionMode: 'SINGLE',
    faceMode: 'SINGLE_FACE',
    batchJob: { jobId: 'job-1', workspaceId: 'workspace-1', formId: 'form-1', templateVersionId: 'version-1', snapshotHash: 'snapshot-hash-1', printProfileId: 'profile-1', selectionMode: 'SELECTED', eligibleSubmissionIds: ['submission-1'], idempotencyKey: 'job-1:version-1:snapshot-hash-1:profile-1' },
    rendererRequired: true,
    outputExportEnabled: false,
  }
  const snapshot = {
    snapshotId: 'snapshot-1',
    workspaceId: 'workspace-1',
    formId: 'form-1',
    submissionId: 'submission-1',
    formVersionId: 'version-1',
    capturedAtMs: 1,
    values: { firstName: 'Ada', lastName: 'Lovelace', title: 'Speaker', eventName: 'Demo', eventDate: '2026-09-09' },
  }
  const baseFace = {
    backgroundAssetId: 'template-1',
    pageWidthPt: 300,
    pageHeightPt: 180,
    safeArea: { xPt: 10, yPt: 10, widthPt: 280, heightPt: 160 },
    textPlacements: [{ key: 'firstName', box: { xPt: 20, yPt: 100, widthPt: 100, heightPt: 30 }, maxChars: 40, maxLines: 1 }],
  }
  const result = await executeBadgeGeneration({
    job,
    template: { templateId: 'template-1', versionId: 'version-1', workspaceId: 'workspace-1', formId: 'form-1', pageCount: 1, visibility: 'private', validationStatus: 'VALIDATED' },
    snapshot,
    badgeInstanceId: 'badge-instance-1',
    artifactId: 'artifact-1',
    outputId: 'output-1',
    backgroundPdfBytes,
    faces: [baseFace],
    rootDir: root,
  })
  assert.equal(result.ok, true)
  assert.equal(result.output.state, 'QUARANTINED')
  assert.equal(result.output.downloadable, false)
  assert.equal(result.output.artifact.visibility, 'private')
  assert.deepEqual(await readReadyBadgePdfArtifact({ descriptor: result.output.artifact, rootDir: root }), { ok: false, code: 'NOT_READY' })

  const scopeMismatch = await executeBadgeGeneration({
    job,
    template: { templateId: 'template-1', versionId: 'version-1', workspaceId: 'workspace-1', formId: 'form-1', pageCount: 1, visibility: 'private', validationStatus: 'VALIDATED' },
    snapshot: { ...snapshot, formId: 'other-form' },
    badgeInstanceId: 'badge-instance-2', artifactId: 'artifact-2', outputId: 'output-2', backgroundPdfBytes, faces: [baseFace], rootDir: root,
  })
  assert.deepEqual(scopeMismatch, { ok: false, stage: 'SNAPSHOT_SCOPE_INVALID', code: 'SCOPE_MISMATCH' })
} finally {
  await rm(root, { recursive: true, force: true })
}

console.log('badge-generation-execution: all assertions passed (quarantine enforced)')
