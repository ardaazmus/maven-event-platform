import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const settings = readFileSync('src/components/mavenforms/views/settings-view.tsx', 'utf8')
const start = settings.indexOf('SectionCard title="SMTP Ayarları"')
const end = settings.indexOf('SectionCard title="E-posta Şablonları"')
assert.ok(start >= 0 && end > start)
const smtpSection = settings.slice(start, end)

assert.match(smtpSection, /disabled[\s\S]*title="SMTP yapılandırması bu sürümde saklanmıyor"/)
assert.match(smtpSection, /SMTP ayarları bu sürümde kalıcı olarak saklanmıyor/)
assert.doesNotMatch(smtpSection, /onClick=/)

console.log('settings-smtp-save-truth: PASS')
