import assert from 'node:assert'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { evaluateTenantModuleAccess } from '../src/lib/tenant-entitlement.ts'
import { V1_MODULE_DECISIONS } from '../src/lib/release-module.ts'

// F9-R2: tenant son kapı kilidi (unit + static).

// Entitlement kararları: eşleşme + askı + liste-dışı + kapalı
const base = { tenantId: 't1', requestedTenantId: 't1', status: 'active', enabledModules: ['manual_invoices'], module: 'manual_invoices' }
assert.deepStrictEqual(
  evaluateTenantModuleAccess(base),
  { module: 'manual_invoices', enabled: true, reason: 'version_entitlement', scope: 'tenant' },
  'eslesen tenant izinli',
)
assert.strictEqual(evaluateTenantModuleAccess({ ...base, requestedTenantId: 't2' }).enabled, false, 'tenant uyusmazligi red')
assert.strictEqual(evaluateTenantModuleAccess({ ...base, requestedTenantId: 't2' }).reason, 'security_gate', 'uyusmazlik security_gate')
assert.strictEqual(evaluateTenantModuleAccess({ ...base, status: 'suspended' }).reason, 'tenant_suspended', 'aski kapali')
assert.strictEqual(
  evaluateTenantModuleAccess({ ...base, module: 'support_break_glass' }).reason,
  'security_gate',
  'liste-disi modul kapali',
)
assert.strictEqual(
  evaluateTenantModuleAccess({ ...base, module: 'online_payments' }).reason,
  'admin_disabled',
  'acilmamis modul kapali',
)

// V1 karar matrisi: 3 açık modül, karar server-owned
assert.strictEqual(V1_MODULE_DECISIONS.length, 10, 'V1 10 modul karari tasimali')
assert.deepStrictEqual(
  V1_MODULE_DECISIONS.filter((d) => d.enabled).map((d) => d.module).sort(),
  ['manual_payment_tracking', 'participant_notifications', 'registration_forms'],
  'V1 yalniz 3 modul acik',
)

// Freeze: SaaS açılmaz, provisioning yüzeyi yok
const adr = readFileSync('docs/adr/0007-f9-freeze.md', 'utf8')
assert(adr.includes('AÇILMAZ'), 'freeze kaydi olmali')
assert(adr.includes('RLS'), 'RLS durusu olmali')
const registry = JSON.parse(readFileSync('docs/workflow/evidence-registry.json', 'utf8'))
const freeze = registry.capabilities.find((c) => c.id === 'F9-freeze')
assert(freeze && freeze.state === 'LOCAL_PASS', 'registry freeze LOCAL_PASS olmali')
const apiDirs = readdirSync('src/app/api')
assert(!apiDirs.includes('tenants'), 'tenant provisioning ucu olmamali')
assert(!apiDirs.includes('billing'), 'tenant billing ucu olmamali')

// RLS rehearsal mevcut ve shadow-only (bu oturumda docker yok → UNVERIFIED, kod kilitli)
assert(existsSync('scripts/pg-rls-rehearse.mjs'), 'RLS rehearsal scripti olmali')
const rls = readFileSync('scripts/pg-rls-rehearse.mjs', 'utf8')
assert(rls.includes('mf-pg-shadow'), 'rehearsal shadow container kullanmali')
assert(rls.includes('ROW LEVEL SECURITY'), 'rehearsal RLS acmali')
assert(rls.includes("current_setting('app.ws'"), 'rehearsal ws ayrim politikasi tasimali')

console.log('f9-tenant-gate: PASS')
