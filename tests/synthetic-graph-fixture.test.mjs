import assert from 'node:assert/strict'
import { createSyntheticGraphFixture, isValidSyntheticGraphFixture } from '../src/lib/synthetic-graph-fixture.ts'

const result = createSyntheticGraphFixture('run-1')
assert.equal(result.ok, true)
if (!result.ok) throw new Error('synthetic graph should be valid')

const { graph } = result
assert.equal(isValidSyntheticGraphFixture(graph), true)
assert.equal(graph.source, 'synthetic')
assert.equal(graph.networkSample, '192.0.2.10')
assert.equal(graph.user.email, 'participant-run-1@test.invalid')
assert.equal(graph.submission.email, graph.user.email)
assert.equal(graph.payment.submissionId, graph.submission.id)
assert.equal(graph.invoice.paymentOrderId, graph.payment.id)
assert.equal(graph.edges.length, 5)
assert.equal(graph.edges[1].from, graph.form.id)
assert.equal(graph.edges[1].to, graph.submission.id)
assert.equal(graph.edges[3].from, graph.submission.id)
assert.equal(graph.edges[4].to, graph.invoice.id)
assert.equal(JSON.stringify(graph).includes('example.com'), false)
assert.equal(JSON.stringify(graph).includes('apiKey'), false)
assert.equal(JSON.stringify(graph).includes('cardNumber'), false)
assert.equal(isValidSyntheticGraphFixture({ ...graph, source: 'live' }), false)
assert.equal(isValidSyntheticGraphFixture({ ...graph, payment: { ...graph.payment, workspaceId: 'other-workspace' } }), false)
assert.deepEqual(createSyntheticGraphFixture('../live'), { ok: false, reason: 'seed_invalid' })
assert.deepEqual(createSyntheticGraphFixture({ seed: 'run-1' }), { ok: false, reason: 'seed_invalid' })

console.log('synthetic-graph-fixture.test: PASS (R10-V4-20)')
