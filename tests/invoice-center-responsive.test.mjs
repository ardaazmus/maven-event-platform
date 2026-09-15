import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const view = readFileSync('src/components/mavenforms/views/invoice-center-view.tsx', 'utf8')
assert(view.includes('flex flex-col gap-3'), 'toolbar must stack on narrow viewports')
assert(view.includes('sm:flex-row'), 'toolbar may become horizontal only at the small breakpoint')
assert(view.includes('flex flex-wrap gap-2'), 'status/action groups must wrap instead of overflow')
assert(!view.match(/w-\[(?:[4-9]\d{2,}|1\d{3,})px\]/), 'invoice center must not introduce fixed large widths')

const submissions = readFileSync('src/components/mavenforms/views/submissions-view.tsx', 'utf8')
assert(submissions.includes('className="flex flex-wrap gap-1"'), 'response actions must wrap instead of overflow')
assert(submissions.includes('aria-label="Yanıtlarda ara"'), 'response search needs an accessible label')

console.log('invoice-center-responsive.test: PASS (R-04A)')
