import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/app/api/internal/workers/badge-scan/route.ts', import.meta.url), 'utf8')
assert.match(source, /MAVENFORMS_BADGE_SCAN_WORKER_SECRET/)
assert.match(source, /authorizeInternalWorkerSecret/)
assert.match(source, /x-mavenforms-worker-secret/)
assert.match(source, /readBadgeArtifactManifest/)
assert.match(source, /persistBadgeArtifactScan/)
assert.match(source, /SCAN_PASSED.*SCAN_FAILED/s)
assert.match(source, /invalid_scan_request/)
assert.match(source, /scan_transition_rejected/)
assert.doesNotMatch(source, /JSON\.stringify\([^)]*(?:bytes|storageKey|secret)/i)
assert.match(source, /workspaceId.*formId.*artifactId/s)

console.log('badge-scan-worker-route: all assertions passed (private transition only)')
