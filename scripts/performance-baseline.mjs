#!/usr/bin/env node
// ponytail: minimal perf baseline — p95/TTFB via fetch loop, no k6
const base = process.env.BASE || 'http://127.0.0.1:3000'
async function hit(path, opts={}){
  const t0 = Date.now()
  const r = await fetch(base+path, opts)
  const t1 = Date.now()
  return { status:r.status, ms:t1-t0 }
}
const results=[]
for(let i=0;i<20;i++){
  results.push(await hit('/api/branding?public=true'))
  results.push(await hit('/api/public/forms/tekno-zirvesi-2026'))
}
const ms = results.map(r=>r.ms).sort((a,b)=>a-b)
const p95 = ms[Math.floor(ms.length*0.95)]
const err = results.filter(r=>r.status!==200).length
console.log(JSON.stringify({ count:results.length, p95_ms:p95, error_rate:err/results.length, max_ms:Math.max(...ms) }))
// thresholds owner decides; fail only if p95>2000 or err>0.05
if(p95>2000 || err/results.length>0.05) process.exit(1)
