import assert from 'node:assert/strict'
import fs from 'node:fs'

const sidebar = fs.readFileSync('src/components/mavenforms/sidebar.tsx', 'utf8')
const forms = fs.readFileSync('src/components/mavenforms/views/forms-list-view.tsx', 'utf8')

assert.match(sidebar, /mavenforms:new-event/, 'event-first primary action must remain wired')
assert.doesNotMatch(sidebar, /mavenforms:new-form/, 'sidebar primary action must not open the form dialog')
assert.doesNotMatch(forms, /<Button className="w-full gap-2" onClick=\{\(\) => setNewFormOpen\(true\)\}>[\s\S]*Yeni Form/, 'folder panel must not duplicate the global create action')
assert.match(forms, /setNewFormOpen\(true\)/, 'empty-state and dialog open paths must remain available')
assert.match(forms, /<Dialog open=\{newFormOpen\}/, 'new form dialog must remain wired')

console.log('FORM-UX-43 single create action checks passed')
