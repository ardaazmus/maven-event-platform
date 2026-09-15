import assert from 'node:assert'
import { optionalEnv, validateEnv } from '../src/lib/env.ts'

assert(optionalEnv.includes('PAYMENT_LIVE_ENABLED'), 'live payment release gate must be part of the environment contract')

let r = validateEnv({ DATABASE_URL: 'file:./db/custom.db' })
assert(r.ok === true, 'valid env should ok')

r = validateEnv({})
assert(r.ok === false && r.missing.includes('DATABASE_URL'), 'missing DATABASE_URL should fail')

r = validateEnv({ DATABASE_URL: '' })
assert(r.ok === false, 'empty should fail')

console.log('env.test: PASS (PAY-06D-54)')
