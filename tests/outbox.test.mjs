import assert from 'node:assert'
import { enqueue, getOutbox, clearOutbox, processOutboxOnce } from '../src/lib/outbox.ts'

clearOutbox()
const e1 = enqueue('form1','sub1','email', { formId:'form1' })
assert(e1.status==='queued', 'queued')
assert(getOutbox().length===1, '1 queued')

// idempotent worker: success
await processOutboxOnce(async (ev)=>{ /* success */ })
assert(getOutbox()[0].status==='sent', 'sent after success')

// failed then retry
clearOutbox()
enqueue('form1','sub2','webhook', {})
await processOutboxOnce(async (ev)=>{ throw new Error('fail') })
assert(getOutbox()[0].status==='failed', 'failed after 1 attempt')
assert(getOutbox()[0].attempts===1, 'attempts 1')
// 5th failure → dead
for(let i=0;i<4;i++){ getOutbox()[0].status='failed'; getOutbox()[0].nextAttemptAt=0; await processOutboxOnce(async()=>{throw new Error('fail')}) }
assert(getOutbox()[0].status==='dead', 'dead after 5')

console.log('outbox.test: PASS')
