import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const source = readFileSync(new URL('../src/app/api/forms/[id]/badges/templates/selection/route.ts', import.meta.url), 'utf8')
assert.match(source, /can\.writeForms/)
assert.match(source, /findBadgeTemplate/)
assert.match(source, /workspaceId: ctx\.workspace\.id/)
assert.match(source, /settingsJson/)
assert.match(source, /form\.badge_template\.select/)
assert.doesNotMatch(source, /payment|invoice|parasut|V4|R-10/i)
console.log('badge-template-selection-route: all assertions passed')
