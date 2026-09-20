import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import assert from 'node:assert'
import { Database } from 'bun:sqlite'

// R5 karsilastirma + restore provasi. Repo ve dev DB degismez.
const psql = (sql, extra = []) => execFileSync('docker', ['exec', 'mf-pg-shadow', 'psql', '-U', 'postgres', '-tA', ...extra, '-c', sql], { encoding: 'utf8' }).trim().split('\n').map((s) => s.trim()).filter(Boolean)

// 1. Kolon envanteri: SQLite PRAGMA vs PG information_schema (tip lehcesi normalize)
const lite = new Database('db/custom.db', { readonly: true })
const liteTables = lite.query(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '_prisma_migrations' ORDER BY 1`).all().map((r) => r.name)
const liteInv = []
for (const t of liteTables) {
  const cols = lite.query(`PRAGMA table_info("${t}")`).all()
    .map((c) => `${c.name}:${c.type.toUpperCase().includes('INT') ? 'INT' : c.type.toUpperCase().includes('CHAR') || c.type.toUpperCase().includes('TEXT') || c.type.toUpperCase().includes('CLOB') ? 'TEXT' : c.type.toUpperCase().includes('REAL') || c.type.toUpperCase().includes('FLOA') || c.type.toUpperCase().includes('DOUB') ? 'REAL' : 'OTHER'}:${c.notnull ? 'NN' : 'N'}`)
    .sort()
  liteInv.push(`${t}(${cols.join(',')})`)
}
lite.close()
const normPgType = (t) => {
  t = t.toUpperCase()
  if (['INTEGER', 'BIGINT', 'SMALLINT'].includes(t)) return 'INT'
  if (t.includes('CHARACTER') || t === 'TEXT') return 'TEXT'
  if (['DOUBLE PRECISION', 'REAL'].includes(t)) return 'REAL'
  if (t.startsWith('TIMESTAMP')) return 'OTHER'
  return 'OTHER'
}
const pgTables = psql(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1`)
const pgInv = []
for (const t of pgTables) {
  const cols = psql(`SELECT column_name||'|'||data_type||'|'||is_nullable FROM information_schema.columns WHERE table_name='${t}' ORDER BY 1`)
    .map((line) => {
      const [n, ty, nul] = line.split('|')
      return `${n}:${normPgType(ty)}:${nul === 'NO' ? 'NN' : 'N'}`
    })
    .sort()
  pgInv.push(`${t}(${cols.join(',')})`)
}
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16)

// Ana karsilastirma: tablo + kolon-adi + normalize tip + nullability.
// PK karsilastirmasi lehce-farkina duyarli oldugundan disinda tutulur.
const liteHash = hash([...liteInv].sort().join('\n'))
const pgHash = hash([...pgInv].sort().join('\n'))
console.log(`kolon-envanter: SQLite:${liteTables.length} PG:${pgTables.length} hash-lite:${liteHash} hash-pg:${pgHash}`)
assert(liteHash === pgHash, 'kolon envanter hash esit degil')

// 2. Restore provasi: pg_dump -> DROP SCHEMA -> restore -> tablo seti dogrula
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-restore-'))
const dump = path.join(tmp, 'shadow.sql')
const dumpSql = execFileSync('docker', ['exec', 'mf-pg-shadow', 'pg_dump', '-U', 'postgres', '-Fp', 'postgres'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
fs.writeFileSync(dump, dumpSql)
assert(fs.statSync(dump).size > 10000, 'dump bos')
execFileSync('docker', ['exec', 'mf-pg-shadow', 'psql', '-U', 'postgres', '-c', 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'], { encoding: 'utf8' })
const afterDrop = psql(`SELECT count(*) FROM pg_tables WHERE schemaname='public'`)[0]
assert(afterDrop === '0', `drop sonrasi tablo kalmis: ${afterDrop}`)
execFileSync('docker', ['exec', '-i', 'mf-pg-shadow', 'psql', '-U', 'postgres', '-d', 'postgres'], { input: dumpSql, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
const afterRestore = psql(`SELECT count(*) FROM pg_tables WHERE schemaname='public'`)[0]
assert(Number(afterRestore) === pgTables.length, `restore sayisi tutmadi: ${afterRestore} vs ${pgTables.length}`)
console.log(`restore: dump ${(fs.statSync(dump).size / 1024).toFixed(0)}KB -> drop(0 tablo) -> restore(${afterRestore} tablo) PASS`)
fs.rmSync(tmp, { recursive: true, force: true })
console.log('pg-shadow-compare: PASS')
