import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const startRoute = readFileSync('src/app/api/integrations/parasut/oauth/start/route.ts', 'utf8')
const callbackRoute = readFileSync('src/app/api/integrations/parasut/oauth/callback/route.ts', 'utf8')
const serverHelper = readFileSync('src/lib/parasut-oauth-server.ts', 'utf8')

assert.match(schema, /model ParasutConnection\s*\{/, 'Paraşüt connection model must exist')
assert.match(schema, /model ParasutOAuthTransaction\s*\{/, 'OAuth transaction model must exist')
assert.match(schema, /stateHash\s+String\s+@unique/, 'only a hash of state may be persisted')
assert.match(schema, /credentialsEnvelope\s+String\?/, 'provider tokens must use an encrypted envelope')
assert.doesNotMatch(schema, /clientSecret\s+String|accessToken\s+String|refreshToken\s+String|authorizationCode\s+String/, 'plaintext provider secrets/code must not be schema fields')

assert.match(startRoute, /manageIntegrations/, 'start must require integration capability')
assert.match(startRoute, /mfaEnabled/, 'start must require MFA')
assert.match(serverHelper, /assertParasutSameOrigin|Origin/, 'start must check same-origin mutation protection')
assert.match(startRoute, /authorizationUrl/, 'start returns only authorization URL metadata')
assert.doesNotMatch(startRoute, /clientSecret.*json|accessToken.*json|refreshToken.*json/, 'start response must not expose secrets')

assert.match(callbackRoute, /stateHash/, 'callback must look up hashed state')
assert.match(callbackRoute, /updateMany/, 'callback must atomically consume state')
assert.match(callbackRoute, /encryptParasutCredential/, 'callback must encrypt token set before persistence')
assert.match(callbackRoute, /NextResponse\.redirect|status:\s*303/, 'callback must clear code from browser with redirect')
assert.doesNotMatch(callbackRoute, /console\.(log|error).*?(code|token|secret)/i, 'callback must not log provider secrets')

console.log('parasut oauth route contract tests: PASS')
