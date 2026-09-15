import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const builder = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')

assert.match(builder, /<Button size="sm" variant="outline" className="gap-1\.5" disabled[^>]*aria-label="Entegrasyon kataloğu yakında"[^>]*>/, 'unwired integration catalog action must be disabled and named')
assert.match(builder, /<Plus className="w-3\.5 h-3\.5" \/> Katalog/, 'integration catalog label must remain visible')
assert.match(builder, /status: 'planned'/, 'planned integration status must remain explicit')

console.log('form-ux-integrations-action.test: PASS')
