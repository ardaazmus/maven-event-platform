import assert from 'node:assert/strict'
import { authorizeInternalWorkerSecret, parseInternalWorkerLimit } from '../src/lib/internal-worker-auth.ts'

assert.equal(authorizeInternalWorkerSecret('worker-secret', 'worker-secret'), true)
assert.equal(authorizeInternalWorkerSecret('worker-secret', 'wrong-secret'), false)
assert.equal(authorizeInternalWorkerSecret('worker-secret', null), false)
assert.equal(authorizeInternalWorkerSecret('worker-secret', 'worker-secret-extra'), false)

assert.equal(parseInternalWorkerLimit(null), 10)
assert.equal(parseInternalWorkerLimit('1'), 1)
assert.equal(parseInternalWorkerLimit('50'), 50)
assert.equal(parseInternalWorkerLimit('0'), null)
assert.equal(parseInternalWorkerLimit('51'), null)
assert.equal(parseInternalWorkerLimit('1.5'), null)
assert.equal(parseInternalWorkerLimit('abc'), null)

console.log('internal-worker-auth.test: PASS (MAIL-13L)')
