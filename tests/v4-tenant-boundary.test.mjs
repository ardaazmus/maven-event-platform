import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const formRoute = readFileSync('src/app/api/forms/[id]/route.ts', 'utf8')
const publicRoute = readFileSync('src/app/api/public/forms/[slug]/route.ts', 'utf8')
const publicDto = readFileSync('src/lib/public-dto.ts', 'utf8')
const documentRoute = readFileSync('src/app/api/invoices/[id]/documents/[documentId]/route.ts', 'utf8')
const providerConfig = readFileSync('src/lib/payment-provider-public-config.ts', 'utf8')
const schema = readFileSync('prisma/schema.prisma', 'utf8')
const releaseModule = readFileSync('src/lib/release-module.ts', 'utf8')

assert.match(formRoute, /where:\s*\{\s*id,\s*workspaceId: ctx\.workspace\.id\b/, 'internal form reads must bind the active workspace')
assert(publicRoute.includes("status !== 'published'"), 'public form reads must reject unpublished forms')
assert(publicRoute.includes('containsForbiddenKeys') && publicRoute.includes('version.schemaJson'), 'public form reads must use the validated published snapshot')
assert(publicDto.includes('FORBIDDEN_PUBLIC_KEYS'), 'public DTO must define a forbidden-key boundary')
assert(publicDto.includes("'workspaceId'"), 'public DTO must reject workspace identifiers')
assert(documentRoute.includes('workspaceId: ctx.workspace.id'), 'private documents must bind the active workspace')
assert(providerConfig.includes('PUBLIC_PROVIDER_CONFIG_KEYS'), 'provider public config must be allowlisted')
assert(schema.includes('model PaymentProviderConnection') && schema.includes('workspaceId        String'), 'provider connections must be workspace scoped')
assert(schema.includes('@@unique([workspaceId, provider, mode])'), 'provider connections must be unique within a workspace and mode')
assert(releaseModule.includes('participant_notifications'), 'tenant feature modules must remain explicitly gated')

console.log('v4-tenant-boundary.test: PASS (tenant/public/private boundary contract)')
