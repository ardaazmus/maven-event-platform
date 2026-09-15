import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/forms/[id]/badges/artifacts/[artifactId]/route.ts', 'utf8')
assert.match(route, /getSessionFromCookie/)
assert.match(route, /can\.readSubmissions/)
assert.match(route, /workspaceId: ctx\.workspace\.id/)
assert.match(route, /readBadgeArtifactManifest/)
assert.match(route, /authorizeBadgeArtifactDelivery/)
assert.match(route, /readReadyBadgePdfArtifact/)
assert.match(route, /application\/pdf/)
assert.match(route, /Cache-Control': 'private, no-store'/)
assert.match(route, /X-Content-Type-Options/) 
assert.doesNotMatch(route, /publicUrl|provider|email|qrPayload|secret/i)

console.log('badge-artifact-download-route: all assertions passed')
