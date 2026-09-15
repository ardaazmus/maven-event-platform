import assert from 'node:assert'

const base = 'http://127.0.0.1:3000'
async function login(email,password){
  const r = await fetch(base+'/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password})})
  const j = await r.json()
  return { status:r.status, token:j.data?.token }
}
async function get(path, token){
  const h = token ? { Authorization:`Bearer ${token}` } : {}
  const r = await fetch(base+path, { headers:h })
  return r
}

// 1. IDOR cross-workspace (viewer cannot PATCH other form's submission) — already 403/404
const owner = await login('demo@mavenforms.com','demo1234')
const viewer = await login('viewer_test@mavenforms.com','viewer1234')
assert(owner.status===200 && viewer.status===200, 'logins 200')

// Get a submission from owner's form
const subsRes = await get('/api/forms/form_event_reg/submissions?pageSize=1', owner.token)
assert(subsRes.status===200, 'owner subs 200')
const subsJson = await subsRes.json()
const subId = subsJson.data[0]?.id
assert(subId, 'has subId')

// Viewer trying to PATCH owner's submission via wrong form -> should be 403 or 404 (not 200)
const patchRes = await fetch(base+`/api/forms/form_survey/submissions/${subId}`, { method:'PATCH', headers:{'Content-Type':'application/json', Authorization:`Bearer ${viewer.token}`}, body: JSON.stringify({status:'approved'})})
assert([403,404].includes(patchRes.status), `viewer IDOR should 403/404 got ${patchRes.status}`)

// 2. Public forbidden keys
const pubRes = await fetch(base+'/api/public/forms/tekno-zirvesi-2026')
const pubJson = await pubRes.json()
const pubStr = JSON.stringify(pubJson)
assert(!pubStr.includes('workspaceId') && !pubStr.includes('ownerId') && !pubStr.includes('internal'), 'public no leakage')

// 3. Draft public 403
const draftPub = await fetch(base+'/api/public/forms/webinar-ai')
assert(draftPub.status===403, 'draft public 403')

console.log('security-regression.test: PASS (AC-SEC-01)')
