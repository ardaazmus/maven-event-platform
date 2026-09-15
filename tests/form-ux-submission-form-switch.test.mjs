import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const store = readFileSync('src/lib/store.ts', 'utf8')
const submissions = readFileSync('src/components/mavenforms/views/submissions-view.tsx', 'utf8')

assert.match(store, /setSelectedFormId: \(formId: string \| null, tab\?: string\) => void/)
assert.match(store, /setSelectedFormId: \(formId, tab = 'submissions'\) => set\(\{ selectedFormId: formId, formDetailTab: tab \}\)/)
assert.match(submissions, /const \{ selectedFormId, setSelectedFormId, setView, user \} = useApp\(\)/)
assert.match(submissions, /onClick=\{\(\) => \{ setSelectedFormId\(form\.id, 'submissions'\); setSelectedForm\(form\.id\); setPage\(1\) \}\}/)
assert.match(submissions, /useEffect\(\(\) => \{\s*if \(selectedFormId\) \{\s*setSelectedForm\(selectedFormId\)/s)

console.log('form-ux-submission-form-switch: all assertions passed')
