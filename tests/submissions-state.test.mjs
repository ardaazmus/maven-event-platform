import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/views/submissions-view.tsx','utf8')
assert(src.includes('AbortController'), 'must use AbortController')
assert(src.includes('setPage(1)'), 'must reset page on form change')
assert(src.includes('signal'), 'must pass signal to api')
assert(src.includes('selectedForm') && src.includes('useEffect'), 'must have effect for selectedForm')
assert(src.includes('clearTimeout(timer)') && src.includes('ctrl.abort()'), 'request effect must cancel only its own request')
assert(src.includes('signal?.aborted'), 'aborted requests must not show an error toast')
assert(!src.includes('abortRef.current'), 'must not use a shared abort ref that races search requests')

console.log('submissions-state.test: PASS (AC-FORM-02)')
