import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const renderer = readFileSync('src/components/mavenforms/public-form-renderer.tsx', 'utf8')

for (const network of ['Instagram', 'LinkedIn', 'X', 'Facebook', 'YouTube']) {
  assert(renderer.includes(`aria-label="${network}"`), `${network} public social link needs an accessible name`)
}

assert.match(renderer, /target="_blank" rel="noopener noreferrer"/, 'social links must retain safe new-tab rel')

console.log('form-ux-public-social-a11y.test: PASS')
