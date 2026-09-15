import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const renderer = readFileSync('src/components/mavenforms/public-form-renderer.tsx','utf8')
assert(renderer.includes('postMessage'), 'must use postMessage')
assert(renderer.includes('referrer') && renderer.includes('origin'), 'must use referrer origin, not *')
assert(!renderer.includes("'*'") || renderer.includes('referrer'), 'must not use hardcoded * without referrer fallback')

const wp = readFileSync('wordpress/mavenforms/mavenforms.php','utf8')
assert(wp.includes('<iframe'), 'must generate iframe')
assert(wp.includes('title='), 'must have title')
assert(wp.includes('loading="lazy"'), 'must have loading')
assert(wp.includes('referrerpolicy'), 'must have referrerpolicy')
assert(wp.includes('sanitize_text_field') || wp.includes('esc_attr'), 'must sanitize')
assert(wp.includes('width') && wp.includes('height'), 'must have width/height')

console.log('iframe.test: PASS (AC-PUBLIC-07)')
