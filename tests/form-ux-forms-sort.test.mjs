import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const formsList = readFileSync('src/components/mavenforms/views/forms-list-view.tsx', 'utf8')

assert.match(formsList, /const \[sortBy, setSortBy\] = useState/, 'forms list needs persistent sort state')
assert.match(formsList, /const displayForms = forms\.filter[\s\S]*?\.sort\(/, 'forms list needs filtered deterministic client sorting')
assert.match(formsList, /Güncellenme|Güncelleme/, 'sort menu must expose update ordering')
assert.match(formsList, /Oluşturulma/, 'sort menu must expose creation ordering')
assert.match(formsList, /Yanıt sayısı/, 'sort menu must expose response ordering')
assert.match(formsList, /Başlık/, 'sort menu must expose title ordering')
assert.strictEqual((formsList.match(/displayForms\.map/g) || []).length, 2, 'grid and table must use the same sorted list')

console.log('form-ux-forms-sort.test: PASS')
