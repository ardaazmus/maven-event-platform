import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const forms = readFileSync('src/components/mavenforms/views/forms-list-view.tsx', 'utf8')
const builder = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')

for (const id of ['settings', 'appearance', 'logic', 'notifications', 'embed', 'payment', 'integrations', 'reports', 'submissions']) {
  assert(forms.includes(`id: '${id}'`), `form settings menu must include ${id}`)
}
assert(forms.includes('Görünüm ve tema'), 'form settings menu must expose the unified appearance and theme surface')
assert(forms.includes("selectForm(form.id, 'fields')") && forms.includes("setView('builder')"), 'edit action must enter builder')
assert(forms.includes("selectForm(form.id, 'submissions')") && forms.includes("setView('submissions')"), 'responses action must enter submissions')
assert(forms.includes("tab === 'submissions' ? 'submissions' : `settings:${tab}`"), 'menu must route settings tabs separately from responses')
assert(forms.includes("onClick={(event) => event.stopPropagation()}") && forms.includes("onClick={(e) => e.stopPropagation()}"), 'nested card actions must not trigger card navigation')
assert(builder.includes("setActiveTab(formDetailTab === 'theme' ? 'appearance' : formDetailTab || 'fields')"), 'builder must honor the selected form detail tab and unified theme route')
assert(builder.includes("formDetailTab === 'theme' ? 'appearance'"), 'legacy theme navigation must resolve to appearance')
console.log('FORM-UX-69 form-ux-forms-entry-actions.test: PASS')
