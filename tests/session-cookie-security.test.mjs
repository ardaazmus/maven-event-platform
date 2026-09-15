import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const auth = readFileSync('src/lib/auth.ts', 'utf8')
const middleware = readFileSync('src/middleware.ts', 'utf8')
const policy = readFileSync('docs/SESSION-POLICY.md', 'utf8')

assert(auth.includes("secure: process.env.NODE_ENV === 'production'"), 'session cookie must be Secure in production and HTTP-only in local development')
assert(!auth.includes('secure: false'), 'session cookie must not retain an unconditional insecure setting')
assert(auth.includes('httpOnly: true') && auth.includes("sameSite: 'lax'"), 'session cookie baseline protections must remain')
assert(middleware.includes("res.headers.set('Strict-Transport-Security'"), 'production responses must set HSTS')
assert(middleware.includes("if (process.env.NODE_ENV === 'production')"), 'HSTS must not be enabled as an uncontrolled local HTTP requirement')
assert(middleware.includes("matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']"), 'HSTS middleware must cover application routes while excluding static assets')
assert(policy.includes('Strict-Transport-Security') && policy.includes('HTTPS/TLS'), 'session policy must document HSTS deployment requirements')

console.log('session-cookie-security.test: PASS (R-07C)')
