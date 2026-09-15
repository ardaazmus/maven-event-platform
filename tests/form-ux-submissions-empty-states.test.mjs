import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync('src/components/mavenforms/views/submissions-view.tsx', 'utf8')

assert.match(source, /const \[loadError, setLoadError\] = useState<string \| null>\(null\)/, 'submissions must retain a load error state')
assert.match(source, /setLoadError\(null\)/, 'a new request must clear the previous load error')
assert.match(source, /Veri yüklenemedi/, 'load failure must be distinguishable in the content area')
assert.match(source, /Tekrar dene/, 'load failure must expose a retry action')
assert.match(source, /Filtreye uygun yanıt yok/, 'filtered empty state must be distinguishable')
assert.match(source, /Henüz yanıt alınmadı/, 'no-submission state must remain available')

console.log('FORM-UX-46 submissions empty-state checks passed')
