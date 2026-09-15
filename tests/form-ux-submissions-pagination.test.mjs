import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const apiClient = readFileSync('src/lib/api-client.ts', 'utf8')
const submissionsView = readFileSync('src/components/mavenforms/views/submissions-view.tsx', 'utf8')

assert.match(apiClient, /export async function apiWithMeta<T, M>/, 'API client must expose an envelope-preserving helper')
assert.match(apiClient, /meta: payload\.meta as M/, 'envelope helper must preserve response metadata')
assert.match(submissionsView, /import \{ api, apiWithMeta \} from '@\/lib\/api-client'/, 'submissions view must use the metadata-preserving helper')
assert.match(submissionsView, /apiWithMeta<Submission\[\], SubmissionPageMeta>/, 'submissions view must type the paginated response')
assert.match(submissionsView, /setTotalPages\(Math\.max\(1, response\.meta\?\.totalPages \|\| 1\)\)/, 'pagination must use server totalPages metadata')
assert.doesNotMatch(submissionsView, /The API returns data directly, not \{data, meta\}/, 'stale array-only response workaround must be removed')

console.log('form-ux-submissions-pagination.test: PASS')
