import { execFileSync } from 'node:child_process'
import assert from 'node:assert'

// RLS rehearsal, shadow-only: default-deny + cross-tenant negatif, sonunda temizlik.
const psql = (sql, role) => {
  const setup = role ? `SET ROLE ${role}; ` : ''
  return execFileSync('docker', ['exec', 'mf-pg-shadow', 'psql', '-U', 'postgres', '-tA', '-c', `${setup}${sql}`], { encoding: 'utf8' }).trim()
}
const q = (sql, role) => psql(sql, role).split('\n').map((s) => s.trim()).filter((s) => s && s !== 'SET')

execFileSync('docker', ['exec', 'mf-pg-shadow', 'psql', '-U', 'postgres', '-c', `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='app_user') THEN CREATE ROLE app_user NOLOGIN; END IF; END $$; GRANT USAGE ON SCHEMA public TO app_user; GRANT SELECT, INSERT, DELETE ON "Event" TO app_user;`], { encoding: 'utf8' })
// Idempotent: onceki basarisiz kostan kalinti varsa temizle
execFileSync('docker', ['exec', 'mf-pg-shadow', 'psql', '-U', 'postgres', '-c', `DELETE FROM "Event" WHERE id IN ('rls-a','rls-b'); DELETE FROM "Workspace" WHERE id IN ('ws-a','ws-b');`], { encoding: 'utf8' })
execFileSync('docker', ['exec', 'mf-pg-shadow', 'psql', '-U', 'postgres', '-c', `ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS ws_isolation ON "Event"; CREATE POLICY ws_isolation ON "Event" USING ("workspaceId" = current_setting('app.ws', true));`], { encoding: 'utf8' })

q(`INSERT INTO "Workspace" (id, name, slug, "updatedAt") VALUES ('ws-a','RLS A','rls-a', now()), ('ws-b','RLS B','rls-b', now()) ON CONFLICT DO NOTHING`)
q(`INSERT INTO "Event" (id, "workspaceId", title, "createdById", "updatedAt") VALUES ('rls-a','ws-a','RLS A','rls-t', now()), ('rls-b','ws-b','RLS B','rls-t', now())`)
const as = (ws) => ws ? q(`SET app.ws='${ws}'; SELECT count(*) FROM "Event";`, 'app_user')[0] : q(`SELECT count(*) FROM "Event";`, 'app_user')[0]
assert(as(null) === '0', `ayarsiz 0 olmali, got ${as(null)}`)
assert(as('ws-a') === '1', `ws-a 1 olmali, got ${as('ws-a')}`)
assert(as('ws-b') === '1', `ws-b 1 olmali, got ${as('ws-b')}`)
assert(as('ws-other') === '0', `yanlis ws 0 olmali, got ${as('ws-other')}`)

q(`DELETE FROM "Event" WHERE id IN ('rls-a','rls-b')`)
q(`DELETE FROM "Workspace" WHERE id IN ('ws-a','ws-b')`)
execFileSync('docker', ['exec', 'mf-pg-shadow', 'psql', '-U', 'postgres', '-c', `DROP POLICY ws_isolation ON "Event"; ALTER TABLE "Event" DISABLE ROW LEVEL SECURITY;`], { encoding: 'utf8' })
assert(q(`SELECT count(*) FROM "Event" WHERE id IN ('rls-a','rls-b')`)[0] === '0', 'temizlik dogrulanamadi')
console.log('pg-rls-rehearse: PASS (default-deny + cross-tenant 404-esdegeri + temizlik)')
