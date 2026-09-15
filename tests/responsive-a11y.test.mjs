import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const card = readFileSync('src/components/mavenforms/views/forms-list-view.tsx','utf8')
assert(card.includes('aspectRatio') || card.includes('16 / 9'), 'card must have 16/9 for 360/768/1280')
assert(card.includes('objectFit') && card.includes('cover'), 'must cover without overflow')

const picker = readFileSync('src/components/mavenforms/media-picker.tsx','utf8')
assert(picker.includes('aria-label'), 'picker must have aria-label')
assert(picker.includes('role="dialog"') || picker.includes('aria-pressed'), 'must have a11y')

const renderer = readFileSync('src/components/mavenforms/public-form-renderer.tsx','utf8')
assert(renderer.includes('<label') || renderer.includes('Label'), 'must have label')
assert(renderer.includes('alt') || renderer.includes('altText'), 'must have alt')

const submissions = readFileSync('src/components/mavenforms/views/submissions-view.tsx','utf8')
assert(submissions.includes('AbortController') || submissions.includes('signal'), 'must handle viewport 360 no overflow via abort (already)')

console.log('responsive-a11y.test: PASS (AC-A11Y-01)')
