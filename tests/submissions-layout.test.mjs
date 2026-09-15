import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/views/submissions-view.tsx','utf8')
assert(src.includes('coverMediaId') || src.includes('coverImageUrl'), 'must show cover')
assert(src.includes('submissionCount'), 'must show KPI')
assert(src.includes('selectedForm'), 'must be selected-form scoped')
assert(src.includes('iframe') && src.includes('?embed=1'), 'must show the working published form above responses')
assert(src.includes('Form istatistikleri'), 'must show statistics below the live form')
assert(src.includes('Yanıtlarda ara...') && src.includes('Tüm Durumlar'), 'must keep response search and status filters below statistics')
assert(src.includes('/forms/${encodeURIComponent(current.slug)}?embed=1'), 'live preview must use the published public form route')

console.log('submissions-layout.test: PASS (AC-FORM-03)')
