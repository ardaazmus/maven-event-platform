#!/usr/bin/env node
// M00.5 — reliable test runner (ponytail: no framework, just bun <file>)
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const files = [
  'tests/policy.test.mjs',
  'tests/public-forbidden.test.mjs',
  'tests/outbox.test.mjs',
]

let totalAssertions = 0
let failed = false

for (const f of files) {
  const src = readFileSync(f, 'utf8')
  // Count assert(...) occurrences as approximation (also assert.ok etc not used)
  const assertCount = (src.match(/\bassert\s*\(/g) || []).length
  console.log(`▶ ${f} — static asserts: ${assertCount}`)
  if (assertCount === 0) {
    console.error(`✗ ${f} — 0 assertion → failure (M00.5)`)
    failed = true
    continue
  }
  // Run via bun <file> (not bun test) — avoids 0-tests harness bug
  const res = spawnSync('bun', [f], { encoding: 'utf8' })
  const out = (res.stdout || '') + (res.stderr || '')
  const hasEPERM = /EPERM/i.test(out)
  const hasDiscoveryWarning = /Ran 0 tests/i.test(out) // bun test harness 0-tests
  console.log(out.trim().split('\n').slice(-5).join('\n'))
  console.log(`  exit:${res.status} EPERM:${hasEPERM} discovery0:${hasDiscoveryWarning}`)
  if (hasEPERM) {
    console.error(`✗ ${f} — EPERM detected → failure`)
    failed = true
    continue
  }
  if (res.status !== 0) {
    console.error(`✗ ${f} — exit ${res.status} → failure`)
    failed = true
    continue
  }
  // If file was run via bun test harness and reported 0 tests, treat as failure
  // (our spawn uses bun <file>, so this should not happen, but guard)
  if (hasDiscoveryWarning) {
    console.error(`✗ ${f} — 0 tests reported → failure`)
    failed = true
    continue
  }
  // Ensure no process.exit(0) masking: check src for process.exit(0) without condition
  if (/process\.exit\s*\(\s*0\s*\)/.test(src) && !/if.*process\.exit/.test(src)) {
    console.error(`✗ ${f} — process.exit(0) masking → failure`)
    failed = true
    continue
  }
  // Ensure no try/catch swallowing assert: naive check for catch that doesn't rethrow
  // (allow catch in outbox worker, but not around assert)
  const assertInCatch = /catch\s*\([^)]*\)\s*\{[^}]*assert/.test(src)
  if (assertInCatch) {
    console.warn(`⚠ ${f} — assert inside catch (check not swallowed)`)
  }
  totalAssertions += assertCount
  console.log(`✓ ${f} — ${assertCount} assertions PASS`)
}

console.log(`\nTotal assertions: ${totalAssertions}`)
if (totalAssertions === 0) {
  console.error('✗ total 0 assertions → failure')
  failed = true
}
if (failed) {
  console.error('TEST RUNNER: BLOCKED')
  process.exit(1)
}
console.log('TEST RUNNER: PASSED')
