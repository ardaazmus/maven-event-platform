import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')

assert.match(
  source,
  /<div className="flex min-h-0 min-w-0 flex-col h-\[calc\(100vh-4rem\)\]">/,
  'Builder root must reserve a bounded flex column for nested scrolling',
)
assert.match(
  source,
  /<div className="flex shrink-0 items-center gap-3 p-3 border-b border-border bg-background\/80 backdrop-blur">/,
  'Builder toolbar must not shrink into the tab strip',
)
assert.match(
  source,
  /<div className="shrink-0 border-b border-border bg-muted\/30">/,
  'Grouped builder tabs must retain a non-shrinking bounded strip',
)
assert.match(
  source,
  /role="tablist" aria-label="Form çalışma alanları"/,
  'Builder workspace tabs must have an accessible name',
)
assert.ok(
  (source.match(/role="tablist"/g) || []).length >= 2,
  'Grouped builder navigation must expose workspace and child tablists',
)
assert.ok(
  (source.match(/overflow-x-auto/g) || []).length >= 2,
  'Workspace and child tabs must own horizontal overflow independently',
)
assert.match(
  source,
  /<ScrollArea className="min-h-0 flex-1">/,
  'Active builder content must own the remaining vertical space',
)

console.log('FORM-UX-08 layout contract: PASS')
