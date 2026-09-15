import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const settings = readFileSync('src/components/mavenforms/views/settings-view.tsx', 'utf8')

assert.match(settings, /Test E-postası Gönder/)
assert.match(settings, /disabled[\s\S]*title="SMTP gönderimi bu sürümde etkin değil"/)
assert.match(settings, /Gerçek e-posta gönderimi henüz etkin değil/)

console.log('settings-test-email-truth: PASS')
