import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/public/forms/[slug]/submissions/route.ts', 'utf8')

assert(route.includes('process.env.NODE_ENV === \'production\''), 'public submission must distinguish production secret requirements')
assert(route.includes('status: 503'), 'missing production submission hash secret must fail closed')
assert(!route.includes('process.env.DATABASE_URL ||'), 'database URL must not be reused as a public hash secret')
assert(!route.includes("|| 'mavenforms-local'"), 'known generic fallback must not be used for production hashing')

console.log('public-submission-secret-gate.test: PASS (PUBLIC-SUBMIT-SECURITY-01)')
