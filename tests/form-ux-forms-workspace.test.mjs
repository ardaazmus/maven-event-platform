import assert from 'node:assert/strict'
import fs from 'node:fs'

const forms = fs.readFileSync('src/components/mavenforms/views/forms-list-view.tsx', 'utf8')

assert.match(forms, /function FocusedFormWorkspace\(/, 'forms page must have one selected-form workspace')
assert.match(forms, /\/api\/forms\/\$\{focusedForm\.id\}\/summary/s, 'selected form statistics must use its server id')
assert.match(forms, /\/api\/forms\/\$\{focusedForm\.id\}\/submissions\?page=1&pageSize=4/s, 'selected form recent responses must use its server id')
assert.match(forms, /<iframe[\s\S]*\/forms\/\$\{encodeURIComponent\(form\.slug\)\}\?embed=1/s, 'selected published form must be visible in the forms workspace')
assert.match(forms, /sandbox="allow-forms allow-scripts allow-same-origin allow-popups"/s, 'live preview iframe must keep a restricted sandbox')
assert.match(forms, /onOpenResponses/, 'selected workspace must expose a response action')
assert.match(forms, /onSelectSettingsTab/, 'selected workspace must expose the form settings menu')
assert.match(forms, /className="[^"]*min-w-0[^"]*"/, 'workspace columns must be allowed to shrink responsively')

console.log('form-ux-forms-workspace.test: PASS')
