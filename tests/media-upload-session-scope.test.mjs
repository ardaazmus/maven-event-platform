import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  MEDIA_UPLOAD_PURPOSES,
  normalizeMediaUploadScope,
} from '../src/lib/media.ts'

assert.deepEqual(MEDIA_UPLOAD_PURPOSES, ['form_media', 'workspace_settings'])
assert.deepEqual(normalizeMediaUploadScope({ workspaceId: 'workspace-1', formId: 'form-1', purpose: 'form_media' }), {
  workspaceId: 'workspace-1', formId: 'form-1', purpose: 'form_media',
})
assert.deepEqual(normalizeMediaUploadScope({ workspaceId: 'workspace-1', formId: null, purpose: 'workspace_settings' }), {
  workspaceId: 'workspace-1', formId: null, purpose: 'workspace_settings',
})
assert.equal(normalizeMediaUploadScope({ workspaceId: 'workspace-1', formId: null, purpose: 'form_media' }), null)
assert.equal(normalizeMediaUploadScope({ workspaceId: 'workspace-1', formId: 'form-1', purpose: 'workspace_settings' }), null)
assert.equal(normalizeMediaUploadScope({ workspaceId: '', formId: 'form-1', purpose: 'form_media' }), null)

const formRoute = readFileSync('src/app/api/forms/[id]/media/route.ts', 'utf8')
const globalRoute = readFileSync('src/app/api/media/route.ts', 'utf8')
assert(formRoute.includes("purpose: 'form_media'"), 'form purpose must be server-owned')
assert(globalRoute.includes("purpose: 'workspace_settings'"), 'global purpose must be server-owned')
assert(formRoute.includes('asset.formId && asset.formId !== id'), 'cross-form attach must be denied')
assert(formRoute.includes("asset.scanStatus !== 'clean'"), 'unclean media must not attach')
assert(!formRoute.includes('body.storageKey') && !globalRoute.includes('body.storageKey'), 'client cannot choose storage path')

console.log('media-upload-session-scope.test: PASS (R10-V4-06)')
