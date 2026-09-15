import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/views/submissions-view.tsx', 'utf8')

assert.match(
  src,
  /const defaultFormId = \(publishedWithSubs \|\| published \|\| forms\[0\]\)\.id[\s\S]*setSelectedForm\(current => current \|\| defaultFormId\)/,
  'default selection must not overwrite an existing local sidebar selection'
)
assert.match(
  src,
  /\}, \[forms, selectedFormId\]\)/,
  'global selectedFormId changes may enter the screen, but local selection must not retrigger the sync effect'
)
assert.match(
  src,
  /onClick=\{\(\) => \{ setSelectedFormId\(form\.id, 'submissions'\); setSelectedForm\(form\.id\); setPage\(1\) \}\}/,
  'sidebar form buttons must update the local selected form'
)
assert.match(src, /setSummary\(null\)[\s\S]*setSubmissions\(\[\]\)[\s\S]*setSelected\(null\)/, 'switching forms must clear stale visible data')

console.log('form-ux-submissions-form-switch.test: PASS')
