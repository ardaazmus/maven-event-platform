import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const picker = readFileSync('src/components/mavenforms/media-picker.tsx', 'utf8')
assert(picker.includes('Yeni yükle'), 'selected media must keep a direct upload action')
assert(picker.includes('htmlFor={uploadInputId}'), 'upload action must target the shared file input')
assert(picker.includes('formId ? `/api/forms/${formId}/media?scope=${scope}`'), 'form media must stay form-scoped')
console.log('media-upload-trigger.test: PASS (AC-MEDIA-UPLOAD-01)')
