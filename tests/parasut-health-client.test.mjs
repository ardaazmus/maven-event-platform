import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildParasutCompanyHealthRequest,
  buildParasutMeRequest,
  classifyParasutHealthResponse,
  parseParasutCompanies,
} from '../src/lib/providers/parasut-health-client.ts'

const clientSource = readFileSync('src/lib/providers/parasut-health-client.ts', 'utf8')
const routeSource = readFileSync('src/app/api/integrations/parasut/health/route.ts', 'utf8')

assert.match(clientSource, /https:\/\/api\.parasut\.com\/me/)
assert.match(clientSource, /include=companies/)
assert.match(clientSource, /api\.parasut\.com\/v4/)
assert.match(routeSource, /decryptParasutCredential/)
assert.match(routeSource, /evaluateParasutHealth/)
assert.match(routeSource, /workspaceId: ctx\.workspace\.id/)
assert.match(routeSource, /export async function POST/)
assert.doesNotMatch(routeSource, /NextResponse\.json\([^\n]*(accessToken|refreshToken|credentialsEnvelope)/)

const meRequest = buildParasutMeRequest('access-token')
assert.equal(meRequest.url, 'https://api.parasut.com/me?include=companies')
assert.equal(meRequest.headers.Authorization, 'Bearer access-token')
assert.equal(meRequest.headers.Accept, 'application/vnd.api+json')

const companyRequest = buildParasutCompanyHealthRequest('123', 'access-token')
assert.equal(companyRequest.url, 'https://api.parasut.com/v4/123/contacts?page%5Bsize%5D=1')
assert.equal(companyRequest.headers.Authorization, 'Bearer access-token')
assert.throws(() => buildParasutCompanyHealthRequest('company-123', 'access-token'), /company id/)

assert.deepEqual(parseParasutCompanies({
  included: [
    { type: 'companies', id: '123', attributes: { name: 'MavenForms' } },
    { type: 'users', id: '7', attributes: { name: 'ignored' } },
    { type: 'companies', id: '123', attributes: { name: 'duplicate' } },
    { type: 'companies', id: 'bad', attributes: { name: 'ignored' } },
  ],
}), [{ id: '123', name: 'MavenForms' }])

assert.deepEqual(classifyParasutHealthResponse(401), { kind: 'authentication', retryable: false })
assert.deepEqual(classifyParasutHealthResponse(429), { kind: 'rate_limited', retryable: true })
assert.deepEqual(classifyParasutHealthResponse(503), { kind: 'unavailable', retryable: true })
assert.deepEqual(classifyParasutHealthResponse(422), { kind: 'unknown', retryable: false })

console.log('parasut health client contract tests: PASS')
