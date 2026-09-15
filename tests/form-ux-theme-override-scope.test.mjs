import assert from 'node:assert/strict'
import fs from 'node:fs'

const appearance = fs.readFileSync('src/components/mavenforms/views/appearance-panel.tsx', 'utf8')
const renderer = fs.readFileSync('src/components/mavenforms/public-form-renderer.tsx', 'utf8')

assert.match(appearance, /Bu renkler yalnızca formun header bölümünü özelleştirir/, 'appearance color scope must be explained')
assert.match(appearance, /Genel form renkleri, yazı tipi ve köşe yuvarlaklığı Tema ve stil bölümünden yönetilir/, 'theme scope must be explained')
assert.match(appearance, /update\('headerBgColor'/, 'header background color update must remain intact')
assert.match(appearance, /update\('headerTextColor'/, 'header text color update must remain intact')
assert.match(renderer, /backgroundColor: app\.headerBgColor/, 'public header must keep appearance background override')
assert.match(renderer, /color: app\.headerTextColor/, 'public header must keep appearance text override')
assert.match(renderer, /themeTokens\.primary/, 'public form must keep theme token rendering')

console.log('form-ux-theme-override-scope.test: PASS')
