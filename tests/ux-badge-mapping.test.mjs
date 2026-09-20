import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const view = readFileSync('src/components/mavenforms/views/badge-studio-view.tsx', 'utf8')
const mapping = readFileSync('src/lib/badge-field-mapping.ts', 'utf8')

// Panel sabitlerden uretilir (sapma yok)
assert(view.includes('BADGE_PERSON_FIELD_KEYS') && view.includes('BADGE_CONTEXT_FIELD_KEYS'), 'panel kontrat sabitlerini import etmeli')
assert(view.includes('Adım 2/7'), 'adim gostergesi olmali')
assert(view.includes('data-testid="badge-mapping-panel"'), 'panel test kimligi tasimali')

// 7 anahtar kontratta mevcut
for (const key of ['firstName', 'lastName', 'title', 'company', 'eventName', 'eventDate', 'registrationType']) {
  assert(mapping.includes(`'${key}'`), `kontrat anahtari olmali: ${key}`)
}

// Kapali kategoriler yazili
assert(view.includes('e-posta') && view.includes('jeton'), 'kapali kategoriler yazmali')

// Esleme mutation yok
assert(!view.includes('createBadgePersonFieldMapping'), 'esleme yazimi olmamali (salt liste)')

// Effect-ici senkron reset yok (lint borcu kilidi)
assert(!view.match(/if \(!selectedFormId\) \{\s+set\w+\(/), 'senkron effect reseti olmamali')
assert(view.includes('if (!selectedFormId) return'), 'erken-cikis guard seklinde olmali')

// Kontrat yasak desenleri gercekten kapsar
const low = mapping.toLowerCase()
for (const blocked of ['email', 'phone', 'payment', 'password', 'secret', 'token', 'admin']) {
  assert(low.includes(blocked), `yasak deseni kapsanmali: ${blocked}`)
}

console.log('ux-badge-mapping.test: PASS (allowlist paneli kilitli)')
