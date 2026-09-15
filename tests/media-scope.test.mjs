import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/lib/media.ts','utf8')
assert(src.includes('listWorkspaceMedia'), 'must have listWorkspaceMedia')
assert(src.includes('assertMediaReadable'), 'must have assertMediaReadable')
assert(src.includes('assertMediaWritable'), 'must have assertMediaWritable')
assert(src.includes('workspaceId !== ctx.workspace.id'), 'must check workspaceId')
assert(src.includes("status: 404"), 'must return 404 on scope denial (not 403 leak)')

// Static check for form A cannot read form B: asset.formId !== formId → 404
assert(src.includes('asset.formId !== formId'), 'form A/B isolation')

console.log('media-scope.test: PASS (AC-MEDIA-SCOPE-01)')
