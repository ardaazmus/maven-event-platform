import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const builder = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')
const appearance = readFileSync('src/components/mavenforms/views/appearance-panel.tsx', 'utf8')
const forms = readFileSync('src/components/mavenforms/views/forms-list-view.tsx', 'utf8')

assert.match(builder, /formDetailTab === 'theme' \? 'appearance'/, 'legacy theme navigation must resolve to the unified appearance workspace')
assert.doesNotMatch(builder, /id: 'theme', label: 'Tema'/, 'builder must not expose a competing visible theme tab')
assert.match(builder, /<AppearancePanel[\s\S]*themePanel=\{<ThemePanel form=\{form\} \/>\}/, 'appearance workspace must receive the existing theme editor')
assert.doesNotMatch(forms, /id: 'theme', label: 'Form teması'/, 'form management menu must not expose a duplicate theme action')
assert.match(appearance, /Tema ve stil/, 'appearance workspace must name the unified theme section')
assert.match(appearance, /themePanel\?: ReactNode/, 'appearance workspace must accept the existing theme editor')
assert.match(appearance, /\{themePanel\}/, 'appearance workspace must render the theme editor')

console.log('FORM-UX-65 appearance/theme unification checks passed')
