import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync('src/components/mavenforms/views/settings-view.tsx', 'utf8')
const securityStart = source.indexOf('function SecuritySettings()')
const systemStart = source.indexOf('function SystemSettings()')
const security = source.slice(securityStart, systemStart)
const system = source.slice(systemStart)

assert.match(security, /Denetim ve veri saklama/, 'audit retention must be owned by security/data settings')
assert.match(security, /Audit log saklama/, 'audit retention control must remain available')
assert.match(system, /Dosya yükleme limiti \(MB\)/, 'file limit must state its MB unit')
assert.match(system, /placeholder="MB"/, 'file limit must expose a unit cue')
assert.doesNotMatch(system, /Audit log saklama/, 'audit retention must not remain under form defaults')

console.log('FORM-UX-45 settings ownership checks passed')
