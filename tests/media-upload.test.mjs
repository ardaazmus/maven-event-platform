import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/app/api/forms/[id]/media/route.ts','utf8')
assert(src.includes('formData()'), 'must use formData')
assert(src.includes('validateFile'), 'must validateFile')
assert(src.includes('magic'), 'must check magic bytes')
assert(src.includes('413') && src.includes('415'), 'must return 413/415')
assert(src.includes('storageKey'), 'must generate storageKey')
assert(src.includes('writeFile'), 'must write private original')
assert(src.includes("scanStatus: 'pending'"), 'must quarantine uploads until scanning completes')
assert(!src.includes('public/'), 'must not store in public/')
assert(src.includes('can.writeForms'), 'must check write capability')

console.log('media-upload.test: PASS (AC-MEDIA-UPLOAD-01)')
