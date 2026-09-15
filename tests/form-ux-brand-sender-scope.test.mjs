import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync('src/components/mavenforms/views/settings-view.tsx', 'utf8')
const emailStart = source.indexOf('function EmailSettings()')
const brandingStart = source.indexOf('function BrandingSettings()')
const email = source.slice(emailStart, brandingStart)
const appearanceStart = source.indexOf('function AppearanceSettings(')
const branding = source.slice(appearanceStart, brandingStart)

assert.match(email, /Gönderen Adı/, 'SMTP sender identity must remain editable')
assert.match(email, /E-posta alıcısının göreceği gönderen adı/, 'SMTP sender scope must be explained')
assert.match(branding, /Uygulama markası/, 'application brand scope must be explicit')
assert.match(branding, /SMTP gönderen kimliğinden bağımsız/, 'brand must be explicitly independent from sender identity')

console.log('FORM-UX-47 brand sender scope checks passed')
