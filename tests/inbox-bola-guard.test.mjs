import assert from 'node:assert'
import { readFileSync } from 'node:fs'

// Yeni inbox GET uclari: auth ilk, workspace filtresi zorunlu, istemci scope guvenilmez.
const routes = [
  'src/app/api/registrations/route.ts',
  'src/app/api/orders/route.ts',
  'src/app/api/payments/route.ts',
  'src/app/api/checkin/route.ts',
  'src/app/api/invoice-requests/route.ts',
  'src/app/api/events/[id]/holds/route.ts',
  'src/app/api/events/[id]/occurrences/route.ts',
  'src/app/api/webhooks/events/route.ts',
  'src/app/api/events/[id]/readiness/route.ts',
  'src/app/api/events/[id]/bindings/route.ts',
  'src/app/api/invoices/[id]/documents/route.ts',
  'src/app/api/events/[id]/abstracts/route.ts',
  'src/app/api/events/[id]/program/route.ts',
  'src/app/api/events/[id]/sponsors/route.ts',
  'src/app/api/events/[id]/surveys/route.ts',
  'src/app/api/events/[id]/leads/route.ts',
]

for (const file of routes) {
  const source = readFileSync(file, 'utf8')
  const getBlock = source.slice(source.indexOf('export async function GET'))
  assert(getBlock.length > 0, `${file} GET tasimali`)

  // Auth veri erisiminden once
  const authAt = getBlock.indexOf('getSessionFromCookie()')
  const dbAt = getBlock.indexOf('db.')
  assert(authAt !== -1 && dbAt !== -1 && authAt < dbAt, `${file} auth veriden once olmali`)

  // Workspace filtresi (dogrudan veya scope helper uzerinden)
  const scoped = getBlock.includes('ctx.workspace.id') || getBlock.includes('assertEventReadable')
  assert(scoped, `${file} workspace scope tasimali`)

  // Istemci workspace/tenant id guvenilmez
  assert(!getBlock.includes('params.get(\'workspaceId\')') && !getBlock.includes('body?.workspaceId'), `${file} istemci scope okumamali`)
}

console.log(`inbox-bola-guard.test: PASS (${routes.length} inbox ucu scope kilitli)`)
