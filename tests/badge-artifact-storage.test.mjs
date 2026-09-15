import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { applyBadgeArtifactScan, persistBadgeArtifactScan, readBadgeArtifactManifest, readReadyBadgePdfArtifact, storeBadgePdfArtifact } from '../src/lib/badge-artifact-storage.ts'

const rootDir = await mkdtemp(path.join(process.cwd(), 'tmp', 'badge-artifact-'))
try {
  const document = await PDFDocument.create()
  document.addPage([120, 80])
  const bytes = await document.save({ useObjectStreams: true })
  const stored = await storeBadgePdfArtifact({
    rootDir,
    scope: { workspaceId: 'workspace-1', formId: 'form-1', artifactId: 'artifact-1', outputId: 'output-1' },
    bytes,
  })
  assert.equal(stored.ok, true)
  assert.equal(stored.descriptor.state, 'QUARANTINED')
  assert.equal((await readBadgeArtifactManifest({ rootDir, scope: { workspaceId: 'workspace-1', formId: 'form-1', artifactId: 'artifact-1' }})).ok, true)
  assert.equal((await readReadyBadgePdfArtifact({ rootDir, descriptor: stored.descriptor })).code, 'NOT_READY')

  const ready = await persistBadgeArtifactScan({ rootDir, descriptor: stored.descriptor, event: 'SCAN_PASSED' })
  assert.equal(ready.ok, true)
  const read = await readReadyBadgePdfArtifact({ rootDir, descriptor: ready.descriptor })
  assert.equal(read.ok, true)
  assert.deepEqual(read.bytes, bytes)
  assert.deepEqual(applyBadgeArtifactScan(ready.descriptor, 'SCAN_FAILED'), { ok: false, code: 'SCAN_TRANSITION_INVALID' })
  assert.deepEqual(await storeBadgePdfArtifact({ rootDir, scope: { workspaceId: 'workspace-1', formId: 'form-1', artifactId: 'artifact-1', outputId: 'output-1' }, bytes }), { ok: false, code: 'WRITE_CONFLICT' })
  assert.deepEqual(await storeBadgePdfArtifact({ rootDir, scope: { workspaceId: '../escape', formId: 'form-1', artifactId: 'artifact-2', outputId: 'output-2' }, bytes }), { ok: false, code: 'IDENTIFIER_INVALID' })
  assert.deepEqual(await storeBadgePdfArtifact({ rootDir, scope: { workspaceId: 'workspace-1', formId: 'form-1', artifactId: 'artifact-2', outputId: 'output-2' }, bytes: new Uint8Array([1, 2, 3]) }), { ok: false, code: 'PDF_REQUIRED' })
} finally {
  await rm(rootDir, { recursive: true, force: true })
}

console.log('badge-artifact-storage: all assertions passed')
