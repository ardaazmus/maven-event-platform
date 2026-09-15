import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/components/mavenforms/views/form-builder-view.tsx', import.meta.url), 'utf8')

assert.match(source, /api<BadgeSubmissionOption\[\]>\(/, 'badge panel must model the unwrapped submissions response')
assert.match(source, /Array\.isArray\(submissionData\)/, 'badge panel must guard the API response shape before filtering')
assert.match(source, /\(Array\.isArray\(submissionData\) \? submissionData : \[\]\)\.filter\(submission => Boolean\(submission\.id\)\)/, 'badge panel must filter the unwrapped submission list')
assert.doesNotMatch(source, /submissionData\.submissions\.filter\(/, 'badge panel must not read a missing nested submissions property')

console.log('badge-ui-submission-options: PASS')
