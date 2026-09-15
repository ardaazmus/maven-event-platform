import assert from 'node:assert'
import { readFileSync, existsSync } from 'node:fs'
import { MEDIA_ROOT, mediaStoragePath, isPublicMediaPath } from '../src/lib/media.ts'

// AC-MEDIA-STORAGE-01: storage/media/.gitkeep exists, public/ not used
assert(existsSync('storage/media/.gitkeep'), 'storage/media/.gitkeep must exist')
const gitignore = readFileSync('.gitignore','utf8')
assert(gitignore.includes('/storage/media/*'), '.gitignore must ignore storage/media/*')
assert(gitignore.includes('!/storage/media/.gitkeep'), 'must keep .gitkeep')
assert(!isPublicMediaPath(MEDIA_ROOT), 'MEDIA_ROOT must not be public/')
assert(!isPublicMediaPath('storage/media'), 'storage/media is not public')

// MEDIA_ROOT contract
assert(typeof MEDIA_ROOT === 'string' && MEDIA_ROOT.length>0, 'MEDIA_ROOT defined')
const p1 = mediaStoragePath('ws_1', null, 'asset1')
assert(p1.includes('workspaces/ws_1/global/asset1/original'), 'global path')
const p2 = mediaStoragePath('ws_1', 'form_1', 'asset2')
assert(p2.includes('workspaces/ws_1/forms/form_1/asset2/original'), 'form path')
assert(!p1.includes('public/'), 'no public in storage path')

console.log('storage.test: PASS (AC-MEDIA-STORAGE-01)')
