import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import assert from 'node:assert'
import { Database } from 'bun:sqlite'

// R5 shadow migrate: repo semasi ve dev DB degismez. Temp kopya + bos Postgres.
const PG_URL = 'postgresql://postgres@127.0.0.1:5433/postgres'
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-shadow-'))
const shadowSchema = path.join(tmp, 'schema.prisma')

const src = fs.readFileSync('prisma/schema.prisma', 'utf8')
assert(src.includes('provider = "sqlite"'), 'kaynak sema sqlite olmali')
fs.writeFileSync(shadowSchema, src.replace('provider = "sqlite"', 'provider = "postgresql"'))
console.log('shadow schema yazildi (temp, repo disi)')

const push = spawnSync('bun', ['x', 'prisma', 'db', 'push', '--schema', shadowSchema, '--skip-generate', '--accept-data-loss'], {
  encoding: 'utf8',
  env: { ...process.env, DATABASE_URL: PG_URL },
  timeout: 240000,
})
const pushOut = (push.stdout || '') + (push.stderr || '')
if (push.status !== 0) {
  console.error(pushOut.slice(-2000))
  throw new Error(`db push exit ${push.status}`)
}
console.log('db push OK')

const psql = (sql) => execFileSync('docker', ['exec', 'mf-pg-shadow', 'psql', '-U', 'postgres', '-tAc', sql], { encoding: 'utf8' }).trim().split('\n').map((s) => s.trim()).filter(Boolean)
const pgTables = new Set(psql(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1`))
assert(pgTables.size > 50, `PG tablo sayisi dusuk: ${pgTables.size}`)

const lite = new Database('db/custom.db', { readonly: true })
const liteTables = new Set(lite.query(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '_prisma_migrations'`).all().map((r) => r.name))
lite.close()

const missing = [...liteTables].filter((t) => !pgTables.has(t))
assert(missing.length === 0, `PG'de eksik tablolar: ${missing.join(',')}`)
for (const critical of ['Event', 'Person', 'Registration', 'Order', 'Payment', 'Invoice', 'Ticket', 'InventoryHold', 'OutboxEvent', 'CheckoutIntent', 'ProgramSession']) {
  assert(pgTables.has(critical), `kritik tablo yok: ${critical}`)
}
console.log(`tablo karsilastirma PASS (SQLite:${liteTables.size} PG:${pgTables.size}, eksik:0)`)
fs.rmSync(tmp, { recursive: true, force: true })
console.log('pg-shadow-migrate: PASS')
