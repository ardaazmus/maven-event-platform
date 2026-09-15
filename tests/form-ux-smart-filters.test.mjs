import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync('src/components/mavenforms/views/forms-list-view.tsx', 'utf8')

assert.match(source, /const \[smartFilter, setSmartFilter\] = useState<'today' \| 'active' \| null>\(null\)/, 'supported smart filters must have explicit state')
assert.match(source, /todaySubmissionCount > 0/, 'today smart filter must use existing response data')
assert.match(source, /submissionCount >= 10/, 'active smart filter must use existing response data')
assert.match(source, /setSmartFilter\(\(current\) => current === 'today' \? null : 'today'\)/, 'today smart filter must be actionable')
assert.match(source, /setSmartFilter\(\(current\) => current === 'active' \? null : 'active'\)/, 'active smart filter must be actionable')
assert.match(source, /Ücretli formlar.*Kurulum bekliyor/s, 'unsupported paid filter must be truthful')

console.log('FORM-UX-48 smart filter checks passed')
