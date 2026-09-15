import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync('src/components/mavenforms/views/settings-view.tsx', 'utf8')

assert.match(source, /min-width: 1280px/, 'settings navigation breakpoint must support medium-wide screens')
assert.match(source, /xl:flex-row/, 'settings layout must become a row at the supported breakpoint')
assert.match(source, /xl:w-56/, 'settings navigation must have a bounded readable width')
assert.match(source, /xl:flex-col/, 'settings navigation must become vertical at the supported breakpoint')
assert.match(source, /const settingsGroups = \[/, 'settings navigation must use explicit groups')
for (const label of ['Kişisel', 'Çalışma alanı', 'Güvenlik ve veri', 'Plan ve kullanım']) {
  assert.match(source, new RegExp(label), `${label} settings group must remain visible`)
}
assert.match(source, /settingsGroups\.map/, 'settings navigation must render the explicit groups')
assert(source.includes('role="group" aria-labelledby={`settings-group-${group.id}`}'), 'settings groups must be labelled for assistive technology')
assert(source.includes('id={`settings-group-${group.id}`}'), 'settings group headings must provide stable labels')
for (const id of ['account', 'workspace', 'branding', 'security', 'email', 'ldap', 'appearance', 'notifications', 'billing', 'system']) {
  assert.match(source, new RegExp(`id: '${id}'`), `${id} settings section must remain available`)
}

console.log('FORM-UX-44 settings navigation checks passed')
