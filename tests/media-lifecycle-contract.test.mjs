import assert from 'node:assert/strict'
import { evaluateMediaAssetLifecycle } from '../src/lib/media-lifecycle-contract.ts'

const activeFormUse = [{ kind: 'form_appearance', active: true }]
const inactiveUse = [{ kind: 'form_appearance', active: false }]

assert.deepEqual(
  evaluateMediaAssetLifecycle({ action: 'replace', state: 'ready', visibility: 'published', dependencies: activeFormUse }),
  { action: 'replace', allowed: true, code: 'REPLACE_AS_NEW_VERSION', strategy: 'new_version', dependencyCount: 1, preserveSource: true },
)
assert.deepEqual(
  evaluateMediaAssetLifecycle({ action: 'archive', state: 'ready', visibility: 'private', dependencies: activeFormUse }),
  { action: 'archive', allowed: false, code: 'ACTIVE_DEPENDENCIES', strategy: 'blocked', dependencyCount: 1, preserveSource: true },
)
assert.deepEqual(
  evaluateMediaAssetLifecycle({ action: 'delete', state: 'ready', visibility: 'private', dependencies: inactiveUse }),
  { action: 'delete', allowed: false, code: 'RETENTION_REQUIRED', strategy: 'blocked', dependencyCount: 0, preserveSource: true },
)
assert.deepEqual(
  evaluateMediaAssetLifecycle({ action: 'delete', state: 'quarantine', visibility: 'private', dependencies: [] }),
  { action: 'delete', allowed: true, code: 'DELETE_ALLOWED', strategy: 'hard_delete', dependencyCount: 0, preserveSource: false },
)
assert.deepEqual(
  evaluateMediaAssetLifecycle({ action: 'delete', state: 'rejected', visibility: 'published', dependencies: [] }),
  { action: 'delete', allowed: false, code: 'PUBLISHED_ASSET', strategy: 'blocked', dependencyCount: 0, preserveSource: true },
)
assert.deepEqual(
  evaluateMediaAssetLifecycle({ action: 'archive', state: 'archived', visibility: 'private', dependencies: [] }),
  { action: 'archive', allowed: false, code: 'ALREADY_ARCHIVED', strategy: 'blocked', dependencyCount: 0, preserveSource: true },
)

console.log('media-lifecycle-contract.test: PASS (R10-V4-10)')
