import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync('src/components/mavenforms/views/settings-view.tsx', 'utf8')

assert.match(source, /Henüz doğrulanmış yedek yok/, 'backup status must not imply an unverified successful backup')
assert.match(source, /Yedekleme özelliği henüz bağlı değil/, 'backup availability must be explicit')
assert.doesNotMatch(source, /3 saat önce|125 MB/, 'fixture backup time and size must be removed')
assert.match(source, /Otomatik yedekleme \(yakında\)/, 'automatic backup must remain clearly unavailable')
assert.match(source, /Şimdi yedekleme \(yakında\)/, 'manual backup must remain clearly unavailable')

console.log('FORM-UX-51 backup status checks passed')
