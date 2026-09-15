import assert from 'node:assert'
import { readFileSync, existsSync } from 'node:fs'

const php = readFileSync('wordpress/mavenforms/mavenforms.php','utf8')
assert(php.includes('check_admin_referer'), 'must check nonce')
assert(php.includes('manage_options'), 'must check capability')
assert(php.includes('sanitize_text_field') || php.includes('esc_attr'), 'must sanitize')
assert(php.includes('esc_url'), 'must esc_url')
assert(!php.includes("MAVENFORMS_DEFAULT_BASE', 'https://example.com')") || php.includes('base URL not configured'), 'example.com must not be production fallback')
assert(php.includes('preg_match') && php.includes('https://'), 'must validate https')
assert(php.includes('add_shortcode'), 'must have shortcode')
assert(php.includes('register_block_type'), 'must have block')

assert(existsSync('wordpress/mavenforms/block.js'), 'block.js must exist')
const js = readFileSync('wordpress/mavenforms/block.js','utf8')
assert(js.includes('registerBlockType'), 'block.js must register')
assert(js.includes('mavenforms/form'), 'must be mavenforms/form')

const blockJson = readFileSync('wordpress/mavenforms/block.json','utf8')
assert(blockJson.includes('mavenforms/form'), 'block.json name')

console.log('wordpress.test: PASS (AC-PUBLIC-09)')
