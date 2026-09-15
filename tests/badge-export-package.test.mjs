import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { exportBadgeArtifacts } from '../src/lib/badge-export-package.ts'
import { persistBadgeArtifactScan, storeBadgePdfArtifact } from '../src/lib/badge-artifact-storage.ts'

const rootDir = await mkdtemp(path.join(process.cwd(), 'tmp', 'badge-export-'))
try {
  const first = await PDFDocument.create()
  first.addPage([200, 120])
  const firstBytes = await first.save({ useObjectStreams: true })
  const second = await PDFDocument.create()
  second.addPage([200, 120])
  const secondBytes = await second.save({ useObjectStreams: true })
  const one = await storeBadgePdfArtifact({ rootDir, scope: { workspaceId: 'workspace-1', formId: 'form-1', artifactId: 'artifact-1', outputId: 'output-1' }, filename: 'Ada-Yilmaz-Event-1.pdf', bytes: firstBytes })
  const two = await storeBadgePdfArtifact({ rootDir, scope: { workspaceId: 'workspace-1', formId: 'form-1', artifactId: 'artifact-2', outputId: 'output-2' }, filename: 'Bora-Kaya-Event-2.pdf', bytes: secondBytes })
  const readyOne = await persistBadgeArtifactScan({ rootDir, descriptor: one.descriptor, event: 'SCAN_PASSED' })
  const readyTwo = await persistBadgeArtifactScan({ rootDir, descriptor: two.descriptor, event: 'SCAN_PASSED' })
  const exported = await exportBadgeArtifacts({ jobId: 'job-1', workspaceId: 'workspace-1', formId: 'form-1', templateVersionId: 'template-1', printProfileId: 'profile-1', faceMode: 'SINGLE_FACE', entries: [
    { submissionId: 'submission-1', descriptor: readyOne.descriptor, filename: 'Ada-Yilmaz-Event-1.pdf', rootDir },
    { submissionId: 'submission-2', descriptor: readyTwo.descriptor, filename: 'Bora-Kaya-Event-2.pdf', rootDir },
  ] })
  assert.equal(exported.ok, true)
  assert.equal(exported.output.package.combinedPdfName, 'combined-front.pdf')
  assert.equal((await PDFDocument.load(exported.output.combinedPdfBytes)).getPageCount(), 2)
  assert.equal(new TextDecoder().decode(exported.output.zipBytes.slice(0, 4)), 'PK\u0003\u0004')
  assert.ok(new TextDecoder().decode(exported.output.zipBytes).includes('manifest.json'))
  assert.deepEqual(await exportBadgeArtifacts({ jobId: 'job-2', workspaceId: 'workspace-1', formId: 'form-1', templateVersionId: 'template-1', printProfileId: 'profile-1', faceMode: 'SINGLE_FACE', entries: [{ submissionId: 'submission-3', descriptor: one.descriptor, filename: 'not-ready.pdf', rootDir }] }), { ok: false, code: 'ARTIFACT_NOT_READY', value: 'artifact-1' })
} finally {
  await rm(rootDir, { recursive: true, force: true })
}

console.log('badge-export-package: all assertions passed')
