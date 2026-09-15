import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const api = readFileSync('src/app/api/forms/route.ts','utf8')
assert(api.includes('coverMediaId'), 'API must expose coverMediaId')
assert(api.includes('coverImageUrl'), 'should keep deprecated coverImageUrl for migration')
assert(api.includes('settings.coverMediaId'), 'must read from settings.coverMediaId')

const card = readFileSync('src/components/mavenforms/views/forms-list-view.tsx','utf8')
assert(card.includes('aspectRatio'), 'card must have aspectRatio 16/9')
assert(card.includes('16 / 9') || card.includes('16/9'), 'must be 16/9')
assert(card.includes('objectFit') && card.includes('cover'), 'must use object-fit cover')
assert(card.includes('coverMediaId'), 'card must prefer coverMediaId')
assert(card.includes('/api/media/'), 'card must use private media URL for coverMediaId')
assert(card.includes('alt'), 'must have alt text')
assert(card.includes('onError'), 'must have broken image fallback')

console.log('card-cover.test: PASS (AC-MEDIA-CARD-01)')
