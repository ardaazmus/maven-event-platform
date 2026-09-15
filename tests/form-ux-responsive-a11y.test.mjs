import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const shell = read('src/components/mavenforms/app-shell.tsx')
const forms = read('src/components/mavenforms/views/forms-list-view.tsx')
const builder = read('src/components/mavenforms/views/form-builder-view.tsx')
const submissions = read('src/components/mavenforms/views/submissions-view.tsx')
const settings = read('src/components/mavenforms/views/settings-view.tsx')

assert.match(shell, /<main className="min-h-0 min-w-0 flex-1 overflow-auto">/, 'app shell main must allow flex children to shrink')
assert.match(forms, /<div className="flex min-w-0 h-\[calc\(100vh-4rem\)\]">/, 'forms workspace root must shrink on narrow viewports')
assert.match(forms, /<div className="min-w-0 flex-1 flex flex-col overflow-hidden">/, 'forms content column must not force horizontal overflow')
assert.match(builder, /<div className="[^\"]*min-w-0[^\"]*flex-col[^\"]*h-\[calc\(100vh-4rem\)\]">/, 'builder root must shrink beside responsive panels')
assert.match(builder, /aria-label=\{`Önizleme: \$\{d\.id\}`\}/, 'builder device preview controls need accessible names')
assert.match(submissions, /<div className="min-w-0 flex-1">/, 'submissions main must remain shrinkable')
assert.match(submissions, /overflow-x-auto/, 'wide response table must scroll inside its own container')
assert.match(settings, /overflow-hidden rounded-lg bg-muted\/50/, 'settings navigation must stay contained when wrapping')
assert.match(forms, /overflow-y-auto p-4 lg:p-6/, 'forms content must keep a bounded vertical scroll region')

console.log('form-ux-responsive-a11y.test: PASS')
