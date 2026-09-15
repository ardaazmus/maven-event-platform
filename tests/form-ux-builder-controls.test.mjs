import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')

assert.match(source, /<button\s+type="button"[\s\S]*aria-label=\{`Önizleme: \$\{d\.id\}`\}[\s\S]*aria-pressed=\{device === d\.id\}/, 'device controls must be semantic pressed buttons')
assert.match(source, /<button\s+type="button"\s+key=\{t\.id\}[\s\S]*onClick=\{\(\) => setActiveTab\(t\.id\)\}[\s\S]*aria-current=\{activeTab === t\.id \? 'page' : undefined\}/, 'builder tabs must expose their active state')
assert.match(source, /const workspaceGroups = \[/, 'builder workspace registry must remain present')
assert.match(source, /const tabs = workspaceGroups\.flatMap\(\(group\) => group\.tabs\)/, 'builder tab lookup must derive from grouped workspaces')
assert.match(source, /role="tablist" aria-label="Form çalışma alanları"/, 'builder workspace navigation must have a named tablist')
assert.match(source, /id: 'submissions', label: 'Yanıtlar'/, 'responses tab must remain available')

console.log('FORM-UX-40 builder control checks passed')
