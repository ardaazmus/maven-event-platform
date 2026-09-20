import assert from 'node:assert'
import { readFileSync, existsSync } from 'node:fs'

const report = readFileSync('docs/workflow/YOL-HARITASI-GERCEKLESME-2026-09-17.md', 'utf8')
for (const id of ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7']) {
  assert(report.includes(id), `raporda ${id} olmali`)
}
assert(report.includes('YAPILDI') && report.includes('YAPILMADI'), 'iki durum da yazilmali')
for (const p of ['F1-20', 'F1-21', 'F1-22', 'F1-23', 'F1-27']) {
  assert(report.includes(`artifacts/workflow/${p}/verified.json`), `${p} receipt referansi olmali`)
}
assert(report.includes('EXTERNAL_DEPENDENCY'), 'dis bagimlilik durumu yazilmali')

console.log('roadmap-truth.test: PASS')
