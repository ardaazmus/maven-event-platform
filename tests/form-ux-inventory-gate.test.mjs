import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (file) => fs.readFileSync(file, 'utf8')
const exists = (file) => fs.existsSync(file)

const status = read('STATUS.md')
const shell = read('src/components/mavenforms/app-shell.tsx')
const forms = read('src/components/mavenforms/views/forms-list-view.tsx')
const builder = read('src/components/mavenforms/views/form-builder-view.tsx')
const submissions = read('src/components/mavenforms/views/submissions-view.tsx')
const publicPage = read('src/app/forms/[slug]/page.tsx')
const media = read('src/components/mavenforms/media-picker.tsx')
const mediaSourceField = read('src/components/mavenforms/media-source-field.tsx')
const publicRenderer = read('src/components/mavenforms/public-form-renderer.tsx')

const routeFiles = [
  'src/app/page.tsx',
  'src/app/forms/[slug]/page.tsx',
  'src/app/api/forms/route.ts',
  'src/app/api/forms/[id]/route.ts',
  'src/app/api/forms/[id]/publish/route.ts',
  'src/app/api/forms/[id]/preview/route.ts',
  'src/app/api/forms/[id]/summary/route.ts',
  'src/app/api/forms/[id]/submissions/route.ts',
  'src/app/api/forms/[id]/media/route.ts',
  'src/app/api/media/route.ts',
  'src/app/api/public/forms/[slug]/route.ts',
  'src/app/api/public/forms/[slug]/submissions/route.ts',
]

for (const route of routeFiles) {
  assert.equal(exists(route), true, `critical route missing: ${route}`)
}

assert.match(shell, /view === 'forms'.*<FormsListView/s, 'forms navigation must render a real view')
assert.match(shell, /view === 'builder'.*<FormBuilderView/s, 'builder navigation must render a real view')
assert.match(shell, /view === 'submissions'.*<SubmissionsView/s, 'submissions navigation must render a real view')
assert.match(shell, /view === 'settings'.*<SettingsView/s, 'settings navigation must render a real view')

assert.match(forms, /\/api\/forms\?/s, 'form list must load forms from the server')
assert.match(forms, /\/api\/forms\/\$\{focusedForm\.id\}\/summary/s, 'selected form must load statistics')
assert.match(forms, /\/api\/forms\/\$\{focusedForm\.id\}\/submissions/s, 'selected form must load recent responses')
assert.match(forms, /selectForm\(form\.id, action\.slice\('settings:'\.length\)\)/s, 'form settings menu must route to builder settings tabs')

assert.match(submissions, /\/api\/forms\/\$\{selectedForm\}\/summary/s, 'response workspace must load selected form statistics')
assert.match(submissions, /iframe[\s\S]*\/forms\/\$\{encodeURIComponent\(current\.slug\)\}\?embed=1/s, 'response workspace must render the published live form above responses')
assert.match(submissions, /Yanıtlarda ara\.\.\./s, 'response workspace must keep search above the response table')

assert.match(builder, /\/api\/forms\/\$\{form\.id\}\/publish/s, 'builder publish action must call the server route')
assert.match(builder, /\/api\/forms\/\$\{form\.id\}\/fields/s, 'builder field actions must call the server route')
assert.match(builder, /setActiveTab\('preview'\)/s, 'builder preview control must change the active surface')
assert.match(builder, /<MediaSourceField/s, 'builder media controls must use the shared media source field')
assert.match(mediaSourceField, /<MediaPicker/s, 'shared media source field must use the shared media picker')
assert.match(mediaSourceField, /aria-pressed={source === 'library'}/s, 'media source mode must be explicit')

assert.match(publicPage, /query\.preview === '1'/s, 'draft preview must be an explicit authenticated mode')
assert.match(publicPage, /sanitizePublicForm/s, 'public preview must use a sanitized DTO')
assert.match(publicPage, /publishedVersionId/s, 'anonymous public page must require a published snapshot')
assert.match(publicPage, /<PublicFormRenderer form=\{snapshot\}/s, 'public page must render the published snapshot')
assert.match(publicRenderer, /\/api\/public\/forms\/\$\{form\.slug\}\/submissions/s, 'public submit must use the public write endpoint')

assert.match(media, /htmlFor=\{uploadInputId\}/s, 'media picker must expose a labeled upload action')
assert.match(media, /\/api\/media/s, 'media picker must persist through the media API')

assert.match(status, /FORM-UX-00/s, 'status must record the pre-V4 UI/UX gate')
assert.match(status, /V4-00.*HELD_BY_R10_AND_PRODUCT_ORDER/s, 'V4 must remain held by the R-10 and product-order gates')
assert.match(status, /R-10.*NO-GO\/BLOCKED/s, 'R-10 release block must remain active')

console.log('form-ux-inventory-gate.test: PASS')
