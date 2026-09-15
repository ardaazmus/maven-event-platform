import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')

assert(src.includes('navigator.clipboard.writeText(tag)'), 'merge tags must copy through the browser clipboard')
assert(src.includes('Merge Tag kopyalandı'), 'merge tag copy must provide success feedback')
assert(src.includes('etiketini kopyala'), 'merge tags must have accessible copy labels')
assert(src.includes('Kopyalandı'), 'copied state must be visible in the control')

console.log('merge-tag-copy.test: PASS (AC-MERGE-TAG-COPY-01)')
